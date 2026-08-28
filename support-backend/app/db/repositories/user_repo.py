"""User repository for data access."""

from typing import Any, Optional

from app.db.repositories.base_repo import BaseRepository


class UserRepo(BaseRepository):
    """Data access layer for users."""

    table_name = "users"

    async def get_by_cognito_sub(self, cognito_sub: str) -> Optional[dict]:
        """Find a user by their Cognito sub ID.

        Args:
            cognito_sub: AWS Cognito user sub identifier.

        Returns:
            User dict or None.
        """
        response = (
            self._table()
            .select("*")
            .eq("cognito_sub", cognito_sub)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def get_by_email(self, email: str) -> Optional[dict]:
        """Find a user by email.

        Args:
            email: User email address.

        Returns:
            User dict or None.
        """
        response = (
            self._table()
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def get_or_create(self, cognito_sub: str, email: str, name: str) -> dict:
        """Get existing user or create a new one on first login.

        Args:
            cognito_sub: AWS Cognito sub ID.
            email: User email.
            name: User display name.

        Returns:
            Existing or newly created user dict.
        """
        existing = await self.get_by_cognito_sub(cognito_sub)
        if existing:
            return existing

        return await self.create({
            "cognito_sub": cognito_sub,
            "email": email,
            "name": name,
            "role": "user",
        })

    async def update_saved_filters(self, user_id: str, filters: list[dict[str, Any]]) -> dict:
        """Update the saved_filters JSON field for a user.

        Args:
            user_id: UUID string of the user.
            filters: List of saved filter dicts.

        Returns:
            Updated user dict.
        """
        from uuid import UUID
        return await self.update(UUID(user_id), {"saved_filters": filters})