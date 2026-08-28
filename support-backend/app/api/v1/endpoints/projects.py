"""Project management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user, get_current_user

router = APIRouter()


@router.get("")
async def list_projects(
    page: int = 1,
    page_size: int = 20,
    user: dict = Depends(get_current_user),
) -> dict:
    """List all projects.

    TODO: Step 4 — Implement with ProjectService.
    """
    return {
        "data": [],
        "pagination": {"total": 0, "page": page, "page_size": page_size, "total_pages": 0},
    }


@router.post("", status_code=201)
async def create_project(
    user: dict = Depends(get_admin_user),
) -> dict:
    """Create a new project (admin only).

    TODO: Step 4 — Accept ProjectCreate schema, call ProjectService.
    """
    return {"data": {}, "message": "Project created"}


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    """Get project by ID.

    TODO: Step 4 — Implement with ProjectService.
    """
    return {"data": {}, "message": "Success"}


@router.put("/{project_id}")
async def update_project(
    project_id: UUID,
    user: dict = Depends(get_admin_user),
) -> dict:
    """Update a project (admin only).

    TODO: Step 4 — Accept ProjectUpdate schema, call ProjectService.
    """
    return {"data": {}, "message": "Project updated"}


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    user: dict = Depends(get_admin_user),
) -> None:
    """Delete a project (admin only).

    TODO: Step 4 — Implement with ProjectService.
    """
    return None
