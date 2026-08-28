"""Activity repository for data access."""

from uuid import UUID

from app.db.repositories.base_repo import BaseRepository


class ActivityRepo(BaseRepository):
    """Data access layer for activity timeline entries."""

    table_name = "activities"

    async def list_by_ticket(
        self, ticket_id: UUID, page: int = 1, page_size: int = 50
    ) -> tuple[list[dict], int]:
        """List activities for a specific ticket in chronological order.

        Args:
            ticket_id: UUID of the ticket.
            page: Page number.
            page_size: Items per page.

        Returns:
            Tuple of (activities list, total count).
        """
        offset = (page - 1) * page_size

        response = (
            self._table()
            .select("*, actor:users!activities_actor_id_fkey(id, name, email)", count="exact")
            .eq("ticket_id", str(ticket_id))
            .order("created_at", desc=False)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        total = response.count if response.count is not None else 0
        return response.data or [], total

    async def get_latest_for_ticket(self, ticket_id: UUID, limit: int = 5) -> list[dict]:
        """Get the most recent activities for a ticket.

        Args:
            ticket_id: UUID of the ticket.
            limit: Max number of activities to return.

        Returns:
            List of recent activity dicts.
        """
        response = (
            self._table()
            .select("*, actor:users!activities_actor_id_fkey(id, name, email)")
            .eq("ticket_id", str(ticket_id))
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []