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


cognito_admin = CognitoAdmin()
