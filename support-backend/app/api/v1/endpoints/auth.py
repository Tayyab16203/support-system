"""Authentication endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas.user import UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.post("/me")
async def get_me(user: dict = Depends(get_current_user)) -> dict:
    """Get the current authenticated user's profile.

    On first call after signup, this creates the user record in the DB.
    """
    return {"data": user, "message": "Success"}


@router.patch("/me")
async def update_me(
    payload: UserUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    """Update the current user's profile (name, notification preference)."""
    service = UserService()
    updated = await service.update_profile(
        user_id=UUID(user["id"]),
        name=payload.name,
        email_notifications=payload.email_notifications,
    )
    return {"data": updated, "message": "Profile updated"}
