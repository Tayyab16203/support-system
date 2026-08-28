"""User business logic service."""

from typing import Any, Optional
from uuid import UUID

from app.core.exceptions import ConflictError
from app.core.logging import get_logger
from app.db.repositories.user_repo import UserRepo
from app.integrations.aws.cognito_admin import cognito_admin

logger = get_logger(__name__)


class UserService:
    """Business logic for user operations."""

    def __init__(self) -> None:
        self.repo = UserRepo()

    async def admin_create_user(self, email: str, name: str, role: str = "user") -> dict:
        """Create a user via Cognito (admin) and persist to the database.

        Args:
            email: New user's email.
            name: New user's display name.
            role: Role to assign ("admin" or "user").

        Returns:
            The created user record.

        Raises:
            ConflictError: If a user with this email already exists.
        """
        existing = await self.repo.get_by_email(email)
        if existing:
            raise ConflictError(message=f"A user with email '{email}' already exists.")

        # Create in Cognito (sends invite email with temp password)
        cognito_sub = await cognito_admin.create_user(email=email, name=name)

        # Persist to DB with the assigned role
        return await self.repo.create(
            {
                "cognito_sub": cognito_sub,
                "email": email,
                "name": name,
                "role": role,
            }
        )

    async def list_users(
        self, page: int = 1, page_size: int = 20
    ) -> tuple[list[dict], int]:
        """List all users with pagination."""
        return await self.repo.list(page=page, page_size=page_size)

    async def update_role(self, user_id: UUID, role: str) -> dict:
        """Update a user's role."""
        return await self.repo.update(user_id, {"role": role})

    async def get_or_create_from_claims(self, claims: dict[str, Any]) -> dict:
        """Get or create a user from verified Cognito token claims.

        Args:
            claims: Verified JWT claims containing sub, email, name.

        Returns:
            The user record.
        """
        cognito_sub = claims.get("sub", "")
        # Access tokens use "username"; id tokens carry "email"/"name"
        email = claims.get("email") or claims.get("username") or f"{cognito_sub}@unknown"
        name = claims.get("name") or claims.get("email") or "User"

        return await self.repo.get_or_create(
            cognito_sub=cognito_sub, email=email, name=name
        )

    async def get_by_id(self, user_id: UUID) -> Optional[dict]:
        """Get a user by ID."""
        return await self.repo.get_by_id(user_id)

    async def update_profile(
        self,
        user_id: UUID,
        name: Optional[str] = None,
        email_notifications: Optional[bool] = None,
    ) -> dict:
        """Update a user's profile fields.

        Args:
            user_id: UUID of the user.
            name: New display name (optional).
            email_notifications: Notification preference (optional).

        Returns:
            The updated user record.
        """
        update_data: dict[str, Any] = {}
        if name is not None:
            update_data["name"] = name
        if email_notifications is not None:
            update_data["email_notifications"] = email_notifications

        if not update_data:
            existing = await self.repo.get_by_id(user_id)
            return existing or {}

        return await self.repo.update(user_id, update_data)
