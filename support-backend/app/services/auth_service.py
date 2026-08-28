"""Authentication service: proxies login/logout to Cognito server-side."""

from typing import Union

from botocore.exceptions import ClientError

from app.core.exceptions import IntegrationError, UnauthorizedError
from app.core.logging import get_logger
from app.integrations.aws.cognito_admin import cognito_admin
from app.schemas.auth import ChallengeResponse, TokenResponse

logger = get_logger(__name__)


class AuthService:
    """Business logic for authentication.

    The frontend never talks to Cognito directly; it calls these endpoints
    and the backend performs the Cognito calls with app credentials.
    """

    @staticmethod
    def _to_token_response(cognito_result: dict) -> TokenResponse:
        """Map a Cognito AuthenticationResult into our TokenResponse schema."""
        auth = cognito_result["AuthenticationResult"]
        return TokenResponse(
            access_token=auth["AccessToken"],
            id_token=auth["IdToken"],
            refresh_token=auth.get("RefreshToken"),
            expires_in=auth.get("ExpiresIn", 3600),
        )

    async def login(
        self, email: str, password: str
    ) -> Union[TokenResponse, ChallengeResponse]:
        """Authenticate a user with email + password.

        Args:
            email: The user's email.
            password: The user's password.

        Returns:
            A TokenResponse on success, or a ChallengeResponse when Cognito
            requires a follow-up step such as setting a new password.

        Raises:
            UnauthorizedError: If the credentials are invalid.
            IntegrationError: If Cognito fails unexpectedly.
        """
        try:
            result = await cognito_admin.initiate_auth(email, password)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in (
                "NotAuthorizedException",
                "UserNotFoundException",
                "UserNotConfirmedException",
            ):
                raise UnauthorizedError(
                    message="Incorrect email or password."
                ) from exc
            logger.error("cognito_login_failed", exc_info=exc)
            raise IntegrationError(message="Login failed. Please try again.") from exc

        challenge = result.get("ChallengeName")
        if challenge:
            # e.g. NEW_PASSWORD_REQUIRED — the client must complete it.
            return ChallengeResponse(challenge=challenge, session=result["Session"])

        return self._to_token_response(result)

    async def respond_new_password(
        self, email: str, new_password: str, session: str
    ) -> TokenResponse:
        """Complete the NEW_PASSWORD_REQUIRED challenge and return tokens.

        Args:
            email: The user's email.
            new_password: The new permanent password.
            session: The challenge session from the login response.

        Returns:
            The authentication tokens.

        Raises:
            UnauthorizedError: If the session is invalid or the password is rejected.
            IntegrationError: If Cognito fails unexpectedly.
        """
        try:
            result = await cognito_admin.respond_to_new_password_challenge(
                email, new_password, session
            )
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in (
                "NotAuthorizedException",
                "InvalidPasswordException",
                "CodeMismatchException",
                "ExpiredCodeException",
            ):
                raise UnauthorizedError(
                    message="Could not set the new password. Please try logging in again."
                ) from exc
            logger.error("cognito_new_password_failed", exc_info=exc)
            raise IntegrationError(
                message="Could not set the new password. Please try again."
            ) from exc

        return self._to_token_response(result)

    async def forgot_password(self, email: str) -> None:
        """Start the self-service password reset (Cognito emails a code).

        Works for any user, including admins. To avoid leaking which emails
        are registered, an unknown user is treated as success (no error).

        Args:
            email: The user's email.

        Raises:
            IntegrationError: If Cognito fails unexpectedly.
        """
        try:
            await cognito_admin.forgot_password(email)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            # Don't reveal whether the account exists / is confirmed.
            if code in ("UserNotFoundException", "InvalidParameterException"):
                logger.info("cognito_forgot_password_noop", exc_info=exc)
                return
            if code == "LimitExceededException":
                raise IntegrationError(
                    message="Too many attempts. Please try again later."
                ) from exc
            logger.error("cognito_forgot_password_failed", exc_info=exc)
            raise IntegrationError(
                message="Could not start password reset. Please try again."
            ) from exc

    async def confirm_forgot_password(
        self, email: str, code: str, new_password: str
    ) -> None:
        """Complete the password reset with the emailed code and a new password.

        Args:
            email: The user's email.
            code: The confirmation code Cognito emailed to the user.
            new_password: The new permanent password.

        Raises:
            UnauthorizedError: If the code is wrong/expired or the password is rejected.
            IntegrationError: If Cognito fails unexpectedly.
        """
        try:
            await cognito_admin.confirm_forgot_password(email, code, new_password)
        except ClientError as exc:
            code_name = exc.response.get("Error", {}).get("Code", "")
            if code_name in (
                "CodeMismatchException",
                "ExpiredCodeException",
                "InvalidPasswordException",
                "UserNotFoundException",
            ):
                raise UnauthorizedError(
                    message="Invalid code or password. Please try again."
                ) from exc
            if code_name == "LimitExceededException":
                raise IntegrationError(
                    message="Too many attempts. Please try again later."
                ) from exc
            logger.error("cognito_confirm_forgot_password_failed", exc_info=exc)
            raise IntegrationError(
                message="Could not reset the password. Please try again."
            ) from exc

    async def logout(self, access_token: str) -> None:
        """Revoke the user's tokens via Cognito global sign-out.

        Best-effort: an already-invalid token is treated as success.

        Args:
            access_token: The user's current access token.
        """
        try:
            await cognito_admin.global_sign_out(access_token)
        except ClientError as exc:
            # If the token is already invalid/expired, the user is effectively
            # logged out — don't surface an error.
            logger.info("cognito_logout_noop", exc_info=exc)
