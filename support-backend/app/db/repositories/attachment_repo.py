"""Attachment repository for data access."""

from typing import Optional
from uuid import UUID

from app.db.repositories.base_repo import BaseRepository


class AttachmentRepo(BaseRepository):
    """Data access layer for ticket attachments."""

    table_name = "attachments"

    async def list_by_ticket(self, ticket_id: UUID) -> list[dict]:
        """List all attachments for a ticket with uploader info.

        Args:
            ticket_id: UUID of the parent ticket.

        Returns:
            List of attachment dicts (chronological), each with nested uploader.
        """
        response = (
            self._table()
            .select(
                "*, uploaded_by_user:users!attachments_uploaded_by_fkey(id, name, email)"
            )
            .eq("ticket_id", str(ticket_id))
            .order("uploaded_at", desc=False)
            .execute()
        )
        return response.data or []

    async def reassign_uploader(self, from_user_id: UUID, to_user_id: UUID) -> None:
        """Repoint attachment ownership from one user to another.

        Used when hard-deleting a user so the NOT NULL ``uploaded_by`` foreign
        key stays valid while preserving the attachment records.

        Args:
            from_user_id: The departing user.
            to_user_id: The user (placeholder) to inherit the attachments.
        """
        self._table().update({"uploaded_by": str(to_user_id)}).eq(
            "uploaded_by", str(from_user_id)
        ).execute()

    async def get_with_relations(self, attachment_id: UUID) -> Optional[dict]:
        """Get a single attachment with uploader info.

        Args:
            attachment_id: UUID of the attachment.

        Returns:
            Attachment dict with nested uploader, or None.
        """
        response = (
            self._table()
            .select(
                "*, uploaded_by_user:users!attachments_uploaded_by_fkey(id, name, email)"
            )
            .eq("id", str(attachment_id))
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None
