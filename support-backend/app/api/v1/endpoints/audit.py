"""Admin audit-log viewer endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.db.repositories.audit_repo import AuditRepo
from app.dependencies import get_admin_user
from app.schemas.common import build_pagination

router = APIRouter()


@router.get("")
async def list_audit_logs(
    page: int = 1,
    page_size: int = Query(50, ge=1, le=200),
    actor_id: Optional[UUID] = None,
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    project_id: Optional[UUID] = None,
    admin: dict = Depends(get_admin_user),
) -> dict:
    """List audit-log entries with optional filters (admin only).

    Supports filtering by actor, action, resource type, and project, returned
    newest-first with pagination. Each entry embeds the acting user's basic
    profile for display.
    """
    page = max(page, 1)
    repo = AuditRepo()
    logs, total = await repo.list_with_filters(
        page=page,
        page_size=page_size,
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        project_id=project_id,
    )
    return {
        "data": logs,
        "pagination": build_pagination(total, page, page_size).model_dump(),
    }
