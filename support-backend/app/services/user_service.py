"""User business logic service."""

from typing import Any, Optional
from uuid import UUID

from postgrest.exceptions import APIError

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.db.repositories.activity_repo import ActivityRepo
from app.db.repositories.attachment_repo import AttachmentRepo
from app.db.repositories.audit_repo import AuditRepo
from app.db.repositories.ticket_repo import TicketRepo
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

    async def admin_reset_password(self, user_id: UUID) -> dict:
        """Admin-initiated password reset for a user.

        Triggers Cognito to email the target user a confirmation code, which
        they complete via /auth/confirm-forgot-password. The admin never sees
        or sets the password.

        Args:
            user_id: UUID of the user to reset.

        Returns:
            A minimal dict identifying the affected user.

        Raises:
            NotFoundError: If no user with this ID exists.
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(message="User not found.")

        await cognito_admin.admin_reset_user_password(user["email"])
        return {"id": str(user_id), "email": user["email"]}

    async def admin_delete_user(self, user_id: UUID, acting_admin_id: UUID) -> dict:
        """Permanently delete a user (admin only).

        Guards against unsafe deletes:
          - A user must exist.
          - Admins cannot delete their own account.
          - The last remaining admin cannot be deleted.
          - A user currently assigned to any ticket (active work) cannot be
            deleted; those assignments must be reassigned or closed first.

        When the user is not actively assigned, their historical references
        (created tickets, comments/activities, uploaded attachments, audit
        entries) are repointed to a reserved "Deleted User" placeholder so the
        NOT NULL foreign keys stay valid and the records remain intact without
        being falsely attributed to a real person. The user is then removed
        from both the database and Cognito.

        Args:
            user_id: UUID of the user to delete.
            acting_admin_id: UUID of the admin performing the delete.

        Returns:
            A minimal dict identifying the deleted user.

        Raises:
            NotFoundError: If no user with this ID exists.
            ForbiddenError: If deleting self or the last admin.
            ConflictError: If the user is actively assigned to tickets.
        """
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundError(message="User not found.")

        if user_id == acting_admin_id:
            raise ForbiddenError(message="You cannot delete your own account.")

        if user.get("role") == "admin":
            admins = await self.repo.list_admins()
            if len(admins) <= 1:
                raise ForbiddenError(
                    message="Cannot delete the last remaining admin."
                )

        ticket_repo = TicketRepo()

        # Rule 1: active work blocks deletion.
        active_count = await ticket_repo.count_active_assignments(user_id)
        if active_count > 0:
            raise ConflictError(
                message=(
                    f"This user is actively assigned to {active_count} "
                    "ticket(s). Reassign or close those tickets before "
                    "deleting the user."
                )
            )

        # Rule 2: participation-only. Move historical references onto the
        # reserved placeholder so the NOT NULL foreign keys remain valid.
        placeholder = await self.repo.get_or_create_placeholder()
        placeholder_id = UUID(placeholder["id"])

        await ticket_repo.reassign_created_by(user_id, placeholder_id)
        await ActivityRepo().reassign_actor(user_id, placeholder_id)
        await AttachmentRepo().reassign_uploader(user_id, placeholder_id)
        await AuditRepo().reassign_actor(user_id, placeholder_id)

        # Delete the DB row. If any reference was missed, the FK violation is
        # surfaced as a clear conflict rather than a generic 500. Cognito is
        # only cleared after the DB delete succeeds, so we never end up with a
        # user gone from Cognito but still present in the database.
        try:
            await self.repo.delete(user_id)
        except APIError as exc:
            if exc.code == "23503":  # PostgreSQL foreign_key_violation
                raise ConflictError(
                    message=(
                        "This user still has associated records and cannot be "
                        "deleted. Please try again or contact support."
                    )
                ) from exc
            raise

        await cognito_admin.delete_user(user["email"])

        logger.info("admin_deleted_user", extra={"user_id": str(user_id)})
        return {"id": str(user_id), "email": user["email"]}

    async def list_assignable(self) -> list[dict]:
        """List users eligible to be a ticket assignee.

        There is no per-project membership model, so every user (admins and
        regular users) is assignable. Returns a trimmed shape (id, name,
        email, role) ordered by name for use in an assignee picker.
        """
        return await self.repo.list_assignable()

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
