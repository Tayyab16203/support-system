"""AWS Cognito admin operations (create/delete users) via boto3.

Unlike token verification (which uses only public JWKS), these operations
require AWS credentials with Cognito permissions.
"""

from typing import Any

import boto3

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CognitoAdmin:
    """Admin-side Cognito operations using boto3."""

    def __init__(self) -> None:
        self.user_pool_id = settings.cognito_user_pool_id
        self._client: Any = None

    @property
    def client(self) -> Any:
        """Lazily create the boto3 Cognito client."""
        if self._client is None:
            self._client = boto3.client(
                "cognito-idp",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id or None,
                aws_secret_access_key=settings.aws_secret_access_key or None,
            )
        return self._client

    async def create_user(self, email: str, name: str) -> str:
        """Create a Cognito user as an admin (sends invite email with temp password).

        Args:
            email: The new user's email (also their username).
            name: The new user's display name.

        Returns:
            The Cognito sub (unique ID) of the created user.
        """
        response = self.client.admin_create_user(
            UserPoolId=self.user_pool_id,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": name},
            ],
            DesiredDeliveryMediums=["EMAIL"],
        )
        attrs = {a["Name"]: a["Value"] for a in response["User"]["Attributes"]}
        return attrs.get("sub", "")

    async def delete_user(self, email: str) -> None:
        """Delete a Cognito user by email/username.

        Args:
            email: The user's email (username).
        """
        self.client.admin_delete_user(UserPoolId=self.user_pool_id, Username=email)

    async def set_permanent_password(self, email: str, password: str) -> None:
        """Set a permanent password for a user (used for bootstrap admin).

        Args:
            email: The user's email (username).
            password: The permanent password to set.
        """
        self.client.admin_set_user_password(
            UserPoolId=self.user_pool_id,
            Username=email,
            Password=password,
            Permanent=True,
        )

    async def initiate_auth(self, email: str, password: str) -> dict:
        """Authenticate a user with email + password (server-side).

        Uses the ADMIN_USER_PASSWORD_AUTH flow so the backend performs the
        Cognito call directly; the frontend never talks to Cognito.

        Args:
            email: The user's email (username).
            password: The user's password.

        Returns:
            The raw Cognito response. On success it contains
            ``AuthenticationResult`` with tokens; if a challenge is required
            (e.g. NEW_PASSWORD_REQUIRED) it contains ``ChallengeName`` and
            ``Session`` instead.
        """
        return self.client.admin_initiate_auth(
            UserPoolId=self.user_pool_id,
            ClientId=settings.cognito_app_client_id,
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={"USERNAME": email, "PASSWORD": password},
        )

    async def respond_to_new_password_challenge(
        self, email: str, new_password: str, session: str
    ) -> dict:
        """Complete the NEW_PASSWORD_REQUIRED challenge.

        Args:
            email: The user's email (username).
            new_password: The new permanent password.
            session: The challenge session returned by ``initiate_auth``.

        Returns:
            The raw Cognito response, containing ``AuthenticationResult``.
        """
        return self.client.admin_respond_to_auth_challenge(
            UserPoolId=self.user_pool_id,
            ClientId=settings.cognito_app_client_id,
            ChallengeName="NEW_PASSWORD_REQUIRED",
            Session=session,
            ChallengeResponses={
                "USERNAME": email,
                "NEW_PASSWORD": new_password,
            },
        )

    async def admin_reset_user_password(self, email: str) -> None:
        """Admin-initiated password reset for another user.

        Resets the target user's password and triggers Cognito to email them
        a confirmation code, which they complete via the normal
        confirm-forgot-password flow. The admin never sets the password.

        Args:
            email: The target user's email (username).
        """
        self.client.admin_reset_user_password(
            UserPoolId=self.user_pool_id,
            Username=email,
        )

    async def forgot_password(self, email: str) -> dict:
        """Start the self-service password reset flow.

        Cognito sends a confirmation code to the user's verified email.
        Works for any user, including admins.

        Args:
            email: The user's email (username).

        Returns:
            The raw Cognito response, containing ``CodeDeliveryDetails``.
        """
        return self.client.forgot_password(
            ClientId=settings.cognito_app_client_id,
            Username=email,
        )

    async def confirm_forgot_password(
        self, email: str, code: str, new_password: str
    ) -> None:
        """Complete the password reset using the emailed confirmation code.

        Args:
            email: The user's email (username).
            code: The confirmation code Cognito emailed to the user.
            new_password: The new permanent password.
        """
        self.client.confirm_forgot_password(
            ClientId=settings.cognito_app_client_id,
            Username=email,
            ConfirmationCode=code,
            Password=new_password,
        )

    async def global_sign_out(self, access_token: str) -> None:
        """Sign a user out of all sessions by revoking their tokens.

        Args:
            access_token: The user's current access token.
        """
        self.client.global_sign_out(AccessToken=access_token)


cognito_admin = CognitoAdmin()
