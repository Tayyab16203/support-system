"""Audit log repository for data access."""

from typing import Optional
from uuid import UUID

from app.db.repositories.base_repo import BaseRepository


class AuditRepo(BaseRepository):
    """Data access layer for audit logs."""

    table_name = "audit_logs"

    async def list_with_filters(
        self,
        page: int = 1,
        page_size: int = 50,
        actor_id: Optional[UUID] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        project_id: Optional[UUID] = None,
    ) -> tuple[list[dict], int]:
        """List audit logs with optional filters.

        Args:
            page: Page number.
            page_size: Items per page.
            actor_id: Filter by actor.
            action: Filter by action type.
            resource_type: Filter by resource type.
            project_id: Filter by project.

        Returns:
            Tuple of (audit logs list, total count).
        """
        offset = (page - 1) * page_size

        query = (
            self._table()
            .select("*, actor:users!audit_logs_actor_id_fkey(id, name, email)", count="exact")
        )

        if actor_id:
            query = query.eq("actor_id", str(actor_id))
        if action:
            query = query.eq("action", action)
        if resource_type:
            query = query.eq("resource_type", resource_type)
        if project_id:
            query = query.eq("project_id", str(project_id))

        query = query.order("created_at", desc=True)
        query = query.range(offset, offset + page_size - 1)

        response = query.execute()
        total = response.count if response.count is not None else 0
        return response.data or [], total