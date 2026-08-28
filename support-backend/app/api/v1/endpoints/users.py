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


@router.get("/assignable")
async def list_assignable_users(
    admin: dict = Depends(get_admin_user),
) -> dict:
    """List users that a ticket can be assigned to (admin only).

    Returns all users (admins and regular users) in a lightweight shape for
    an assignee picker. Assignment is an admin-only action.
    """
    service = UserService()
    users = await service.list_assignable()
    return {"data": users}


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


@router.post("/{user_id}/reset-password")
async def admin_reset_user_password(
    user_id: UUID,
    admin: dict = Depends(get_admin_user),
) -> dict:
    """Trigger a password reset for a user (admin only).

    Cognito emails the target user a confirmation code, which they complete
    via /auth/confirm-forgot-password. The admin never sees or sets the
    password.
    """
    service = UserService()
    result = await service.admin_reset_password(user_id=user_id)
    return {"data": result, "message": "A password reset code was emailed to the user."}


@router.delete("/{user_id}")
async def delete_user(
    user_id: UUID,
    admin: dict = Depends(get_admin_user),
) -> dict:
    """Permanently delete a user (admin only).

    Removes the user from both Cognito and the database. Rejected if the
    target is the acting admin, the last remaining admin, or a user with
    associated tickets.
    """
    service = UserService()
    result = await service.admin_delete_user(
        user_id=user_id, acting_admin_id=UUID(admin["id"])
    )
    return {"data": result, "message": "User deleted."}


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
