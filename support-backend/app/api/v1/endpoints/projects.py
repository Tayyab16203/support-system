"""Project management endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user, get_current_user
from app.schemas.common import build_pagination
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter()


@router.get("")
async def list_projects(
    page: int = 1,
    page_size: int = 20,
    is_public: Optional[bool] = None,
    user: dict = Depends(get_current_user),
) -> dict:
    """List all projects (any authenticated user)."""
    service = ProjectService()
    projects, total = await service.list_projects(
        page=page, page_size=page_size, is_public=is_public
    )
    return {
        "data": projects,
        "pagination": build_pagination(total, page, page_size).model_dump(),
    }


@router.post("", status_code=201)
async def create_project(
    payload: ProjectCreate,
    user: dict = Depends(get_admin_user),
) -> dict:
    """Create a new project (admin only)."""
    service = ProjectService()
    project = await service.create_project(payload)
    return {"data": project, "message": "Project created"}


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    """Get project by ID."""
    service = ProjectService()
    project = await service.get_project(project_id)
    return {"data": project, "message": "Success"}


@router.get("/{project_id}/ticket-count")
async def get_project_ticket_count(
    project_id: UUID,
    user: dict = Depends(get_admin_user),
) -> dict:
    """Get the number of tickets in a project (admin only).

    Used to warn an admin how many tickets a delete would cascade.
    """
    service = ProjectService()
    count = await service.get_ticket_count(project_id)
    return {"data": {"count": count}, "message": "Success"}


@router.put("/{project_id}")
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    user: dict = Depends(get_admin_user),
) -> dict:
    """Update a project (admin only)."""
    service = ProjectService()
    project = await service.update_project(project_id, payload)
    return {"data": project, "message": "Project updated"}


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    user: dict = Depends(get_admin_user),
) -> None:
    """Delete a project (admin only)."""
    service = ProjectService()
    await service.delete_project(project_id)
    return None
