"""AWS Cognito integration for JWT token verification.

Verifies Cognito-issued JWTs by:
1. Fetching the User Pool's public JWKS keys (cached).
2. Matching the token's `kid` header to a key.
3. Verifying signature, expiry, issuer, and token use.

No AWS access keys are required for verification — it uses the public
JWKS endpoint. AWS keys are only needed for other services (S3, SES).
"""

import time
from typing import Any, Optional

import httpx
from jose import jwt
from jose.exceptions import JWTError

from app.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.logging import get_logger

logger = get_logger(__name__)


class CognitoVerifier:
    """Verifies AWS Cognito JWT tokens against the pool's JWKS."""

    def __init__(self) -> None:
        self.region = settings.aws_region
        self.user_pool_id = settings.cognito_user_pool_id
        self.client_id = settings.cognito_app_client_id
        self._jwks: Optional[list[dict[str, Any]]] = None
        self._jwks_fetched_at: float = 0.0
        self._jwks_ttl = 3600  # Re-fetch keys hourly

    @property
    def issuer(self) -> str:
        """The expected token issuer URL for this user pool."""
        return f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"

    @property
    def jwks_url(self) -> str:
        """The JWKS endpoint URL for this user pool."""
        return f"{self.issuer}/.well-known/jwks.json"

    async def _get_jwks(self) -> list[dict[str, Any]]:
        """Fetch and cache the JWKS keys from Cognito."""
        now = time.time()
        if self._jwks is not None and (now - self._jwks_fetched_at) < self._jwks_ttl:
            return self._jwks

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(self.jwks_url)
            response.raise_for_status()
            data = response.json()

        self._jwks = data.get("keys", [])
        self._jwks_fetched_at = now
        return self._jwks

    async def verify_token(self, token: str) -> dict[str, Any]:
        """Verify a Cognito JWT access token and return its claims.

        Args:
            token: The JWT access token (without the 'Bearer ' prefix).

        Returns:
            Decoded token claims (sub, username, email, etc.).

        Raises:
            UnauthorizedError: If the token is invalid, expired, or untrusted.
        """
        if not self.user_pool_id or not self.client_id:
            raise UnauthorizedError(
                message="Cognito is not configured on the server.",
            )

        try:
            # Decode the header to find which key signed this token
            headers = jwt.get_unverified_header(token)
            kid = headers.get("kid")
            if not kid:
                raise UnauthorizedError(message="Token missing key ID (kid).")

            # Find the matching public key
            keys = await self._get_jwks()
            key = next((k for k in keys if k["kid"] == kid), None)
            if key is None:
                # Key may have rotated — force refresh once
                self._jwks = None
                keys = await self._get_jwks()
                key = next((k for k in keys if k["kid"] == kid), None)
            if key is None:
                raise UnauthorizedError(message="Token signed with an unknown key.")

            # Verify signature (Cognito access tokens don't carry `aud`)
            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=self.issuer,
                options={"verify_aud": False},
            )

            # Validate token use
            token_use = claims.get("token_use")
            if token_use not in ("access", "id"):
                raise UnauthorizedError(message="Invalid token use.")

            # Validate the token was issued for our app client
            # (access tokens: client_id, id tokens: aud)
            token_client = claims.get("client_id") or claims.get("aud")
            if token_client != self.client_id:
                raise UnauthorizedError(message="Token was not issued for this app.")

            return claims

        except UnauthorizedError:
            raise
        except JWTError as e:
            logger.info(f"JWT verification failed: {e}")
            raise UnauthorizedError(message="Invalid or expired token.") from e
        except Exception as e:
            logger.error(f"Unexpected error verifying token: {e}")
            raise UnauthorizedError(message="Token verification failed.") from e


# Module-level singleton
cognito_verifier = CognitoVerifier()
