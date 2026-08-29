"""Activity repository for data access."""

from uuid import UUID

from app.db.repositories.base_repo import BaseRepository


class ActivityRepo(BaseRepository):
    """Data access layer for activity timeline entries."""

    table_name = "activities"

    async def list_by_ticket(
        self,
        ticket_id: UUID,
        page: int = 1,
        page_size: int = 50,
        exclude_comments: bool = False,
        only_comments: bool = False,
        order_desc: bool = False,
    ) -> tuple[list[dict], int]:
        """List activities for a specific ticket.

        Args:
            ticket_id: UUID of the ticket.
            page: Page number.
            page_size: Items per page.
            exclude_comments: If True, omit ``commented`` activities (the
                activity timeline shows events only).
            only_comments: If True, return ``commented`` activities only (the
                comments section).
            order_desc: Sort newest-first when True, else oldest-first.

        Returns:
            Tuple of (activities list, total count).
        """
        offset = (page - 1) * page_size

        query = (
            self._table()
            .select("*, actor:users!activities_actor_id_fkey(id, name, email)", count="exact")
            .eq("ticket_id", str(ticket_id))
        )

        if only_comments:
            query = query.eq("action_type", "commented")
        elif exclude_comments:
            query = query.neq("action_type", "commented")

        response = (
            query.order("created_at", desc=order_desc)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        total = response.count if response.count is not None else 0
        return response.data or [], total

    async def reassign_actor(self, from_user_id: UUID, to_user_id: UUID) -> None:
        """Repoint activity authorship from one user to another.

        Used when hard-deleting a user so the NOT NULL ``actor_id`` foreign key
        stays valid while preserving the timeline entries.

        Args:
            from_user_id: The departing user.
            to_user_id: The user (placeholder) to inherit the activities.
        """
        self._table().update({"actor_id": str(to_user_id)}).eq(
            "actor_id", str(from_user_id)
        ).execute()

    async def fetch_status_changes(self, ticket_ids: list[UUID]) -> list[dict]:
        """Fetch status-change activities for a set of tickets.

        Used by the protected insights dashboard to reconstruct how long each
        ticket spent in each status. Only ``status_changed`` activities are
        returned, ordered oldest-first per ticket so the service can walk
        consecutive transitions and measure the gaps between them.

        Args:
            ticket_ids: Tickets to fetch transitions for. An empty list short
                -circuits to ``[]`` without querying.

        Returns:
            List of activity dicts with keys: ticket_id, old_value, new_value,
            created_at (ascending by created_at).
        """
        if not ticket_ids:
            return []

        response = (
            self._table()
            .select("ticket_id, old_value, new_value, created_at")
            .in_("ticket_id", [str(tid) for tid in ticket_ids])
            .eq("action_type", "status_changed")
            .order("created_at", desc=False)
            .execute()
        )
        return response.data or []

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