"""Project management endpoints."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user, get_client_ip, get_current_user
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
    """List projects.

    Admins see all projects; non-admins only see public ones (private
    projects are hidden from them regardless of the ``is_public`` filter).
    """
    service = ProjectService()
    projects, total = await service.list_projects(
        page=page,
        page_size=page_size,
        is_public=is_public,
        is_admin=user.get("role") == "admin",
    )
    return {
        "data": projects,
        "pagination": build_pagination(total, page, page_size).model_dump(),
    }


@router.post("", status_code=201)
async def create_project(
    payload: ProjectCreate,
    user: dict = Depends(get_admin_user),
    ip_address: Optional[str] = Depends(get_client_ip),
) -> dict:
    """Create a new project (admin only)."""
    service = ProjectService()
    project = await service.create_project(
        payload, actor_id=UUID(str(user["id"])), ip_address=ip_address
    )
    return {"data": project, "message": "Project created"}


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    user: dict = Depends(get_current_user),
) -> dict:
    """Get project by ID.

    A non-admin requesting a private project gets a not-found response, so
    private projects stay hidden from regular users.
    """
    service = ProjectService()
    project = await service.get_project(
        project_id, is_admin=user.get("role") == "admin"
    )
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
    ip_address: Optional[str] = Depends(get_client_ip),
) -> dict:
    """Update a project (admin only)."""
    service = ProjectService()
    project = await service.update_project(
        project_id, payload, actor_id=UUID(str(user["id"])), ip_address=ip_address
    )
    return {"data": project, "message": "Project updated"}


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    user: dict = Depends(get_admin_user),
    ip_address: Optional[str] = Depends(get_client_ip),
) -> None:
    """Delete a project (admin only)."""
    service = ProjectService()
    await service.delete_project(
        project_id, actor_id=UUID(str(user["id"])), ip_address=ip_address
    )
    return None
