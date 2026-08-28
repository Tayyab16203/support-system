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
