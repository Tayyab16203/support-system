"""Bulk operation endpoints for tickets."""

from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user, get_current_user

router = APIRouter()


@router.post("/status")
async def bulk_status_change(
    user: dict = Depends(get_current_user),
) -> dict:
    """Change status of multiple tickets.

    TODO: Step 10 — Accept BulkStatusChange schema, call BulkService.
    """
    return {"data": {"success_count": 0, "failure_count": 0, "failures": []}}


@router.post("/assign")
async def bulk_assign(
    user: dict = Depends(get_current_user),
) -> dict:
    """Assign multiple tickets to a user.

    TODO: Step 10 — Accept BulkAssign schema, call BulkService.
    """
    return {"data": {"success_count": 0, "failure_count": 0, "failures": []}}


@router.post("/delete")
async def bulk_delete(
    user: dict = Depends(get_admin_user),
) -> dict:
    """Delete multiple tickets (admin only).

    TODO: Step 10 — Accept BulkDelete schema, call BulkService.
    """
    return {"data": {"success_count": 0, "failure_count": 0, "failures": []}}
