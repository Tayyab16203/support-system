"""Admin user-management endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_admin_user
from app.schemas.user import AdminUserCreate, UserRoleUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("")
async def list_users(
    page: int = 1,
    page_size: int = 20,
    admin: dict = Depends(get_admin_user),
) -> dict:
    """List all users (admin only)."""
    service = UserService()
    users, total = await service.list_users(page=page, page_size=page_size)
    total_pages = max(1, -(-total // page_size))
    return {
        "data": users,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    }


@router.post("", status_code=201)
async def create_user(
    payload: AdminUserCreate,
    admin: dict = Depends(get_admin_user),
) -> dict:
    """Create a new user (admin only).

    Creates the user in Cognito (which emails a temporary password) and
    creates the matching record in the database with the assigned role.
    """
    service = UserService()
    user = await service.admin_create_user(
        email=payload.email, name=payload.name, role=payload.role
    )
    return {"data": user, "message": "User created. An invite email was sent."}


@router.patch("/{user_id}/role")
async def update_user_role(
    user_id: UUID,
    payload: UserRoleUpdate,
    admin: dict = Depends(get_admin_user),
) -> dict:
    """Update a user's role (admin only)."""
    service = UserService()
    user = await service.update_role(user_id=user_id, role=payload.role)
    return {"data": user, "message": "Role updated"}
