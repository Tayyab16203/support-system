"""Ticket repository for data access."""

from typing import Any, Optional
from uuid import UUID

from app.db.repositories.base_repo import BaseRepository
from app.integrations.supabase.client import get_supabase_client


class TicketRepo(BaseRepository):
    """Data access layer for tickets with project scoping and full-text search."""

    table_name = "tickets"

    async def list_by_project(
        self,
        project_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        ticket_type: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[UUID] = None,
        created_by: Optional[UUID] = None,
        order_by: str = "created_at",
        order_desc: bool = True,
    ) -> tuple[list[dict], int]:
        """List tickets filtered by project with optional additional filters.

        Args:
            project_id: Project UUID to filter by.
            page: Page number.
            page_size: Items per page.
            status: Optional status filter.
            ticket_type: Optional type filter.
            priority: Optional priority filter.
            assigned_to: Optional assignee filter.
            created_by: Optional creator filter.
            order_by: Sort column.
            order_desc: Sort direction.

        Returns:
            Tuple of (tickets list, total count).
        """
        offset = (page - 1) * page_size

        query = (
            self._table()
            .select("*, created_by_user:users!tickets_created_by_fkey(id, name, email)", count="exact")
            .eq("project_id", str(project_id))
        )

        if status:
            query = query.eq("status", status)
        if ticket_type:
            query = query.eq("type", ticket_type)
        if priority:
            query = query.eq("priority", priority)
        if assigned_to:
            query = query.eq("assigned_to", str(assigned_to))
        if created_by:
            query = query.eq("created_by", str(created_by))

        query = query.order(order_by, desc=order_desc)
        query = query.range(offset, offset + page_size - 1)

        response = query.execute()
        total = response.count if response.count is not None else 0
        return response.data or [], total

    async def get_with_relations(self, ticket_id: UUID) -> Optional[dict]:
        """Get a ticket with related user data.

        Args:
            ticket_id: UUID of the ticket.

        Returns:
            Ticket dict with nested user info, or None.
        """
        response = (
            self._table()
            .select(
                "*, "
                "created_by_user:users!tickets_created_by_fkey(id, name, email), "
                "assigned_to_user:users!tickets_assigned_to_fkey(id, name, email)"
            )
            .eq("id", str(ticket_id))
            .limit(1)
            .execute()
        )
        return response.data[0] if response.data else None

    async def search_fulltext(
        self,
        query: str,
        project_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        ticket_type: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> tuple[list[dict], int]:
        """Full-text search on tickets using PostgreSQL tsvector.

        Args:
            query: Search query string.
            project_id: Project to search within.
            page: Page number.
            page_size: Items per page.
            status: Optional status filter.
            ticket_type: Optional type filter.
            priority: Optional priority filter.

        Returns:
            Tuple of (matching tickets, total count).
        """
        offset = (page - 1) * page_size

        # Apply pagination (.range) on the select builder BEFORE filter methods,
        # since filter methods return a different builder type in supabase-py.
        db_query = (
            self._table()
            .select("*", count="exact")
            .range(offset, offset + page_size - 1)
            .eq("project_id", str(project_id))
            .text_search("search_vector", query, options={"config": "english"})
        )

        if status:
            db_query = db_query.eq("status", status)
        if ticket_type:
            db_query = db_query.eq("type", ticket_type)
        if priority:
            db_query = db_query.eq("priority", priority)

        response = db_query.execute()
        total = response.count if response.count is not None else 0
        return response.data or [], total

    async def count_by_status(self, project_id: Optional[UUID] = None) -> dict[str, int]:
        """Count tickets grouped by status.

        Args:
            project_id: Optional project filter. If None, counts across all projects.

        Returns:
            Dict of status -> count.
        """
        statuses = ["pending", "in_progress", "paused", "in_review", "completed"]
        counts: dict[str, int] = {}

        for status in statuses:
            query = self._table().select("id", count="exact").eq("status", status)
            if project_id:
                query = query.eq("project_id", str(project_id))
            response = query.execute()
            counts[status] = response.count if response.count is not None else 0

        return counts