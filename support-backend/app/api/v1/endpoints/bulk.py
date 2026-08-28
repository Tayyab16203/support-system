"""Bulk operation endpoints for tickets."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user, get_current_project, get_current_user
from app.schemas.ticket import BulkAssign, BulkDelete, BulkStatusChange
from app.services.bulk_service import BulkService

router = APIRouter()


@router.post("/status")
async def bulk_status_change(
    payload: BulkStatusChange,
    user: dict = Depends(get_current_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Change the status of multiple tickets in the current project."""
    service = BulkService()
    result = await service.bulk_status_change(
        ticket_ids=payload.ticket_ids,
        new_status=payload.status.value,
        user_id=user["id"],
        project_id=project_id,
    )
    return {"data": result}


@router.post("/assign")
async def bulk_assign(
    payload: BulkAssign,
    user: dict = Depends(get_admin_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Assign multiple tickets to a user (admin only).

    Assignment is admin-only, mirroring the single-ticket update rule.
    """
    service = BulkService()
    result = await service.bulk_assign(
        ticket_ids=payload.ticket_ids,
        assignee_id=payload.assigned_to,
        user_id=user["id"],
        project_id=project_id,
    )
    return {"data": result}


@router.post("/delete")
async def bulk_delete(
    payload: BulkDelete,
    user: dict = Depends(get_admin_user),
    project_id: UUID = Depends(get_current_project),
) -> dict:
    """Delete multiple tickets in the current project (admin only)."""
    service = BulkService()
    result = await service.bulk_delete(
        ticket_ids=payload.ticket_ids,
        user_id=user["id"],
        project_id=project_id,
    )
    return {"data": result}
