"""Security utilities: Cognito JWT verification entry point."""

from typing import Any

from app.integrations.aws.cognito import cognito_verifier


async def verify_cognito_token(token: str) -> dict[str, Any]:
    """Verify a Cognito JWT token and return its claims.

    Delegates to the CognitoVerifier singleton.

    Args:
        token: The JWT access token from the Authorization header.

    Returns:
        Decoded token claims (sub, email, etc.).

    Raises:
        UnauthorizedError: If token is invalid, expired, or unverifiable.
    """
    return await cognito_verifier.verify_token(token)
