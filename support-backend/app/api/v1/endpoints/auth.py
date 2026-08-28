"""Authentication endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.schemas.auth import (
    ConfirmForgotPasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    NewPasswordRequest,
)
from app.schemas.user import UserUpdate
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter()


@router.post("/login")
async def login(payload: LoginRequest) -> dict:
    """Authenticate with email + password (server-side, proxied to Cognito).

    Returns tokens on success, or a challenge (e.g. new password required)
    that the client completes via /auth/new-password.
    """
    service = AuthService()
    result = await service.login(payload.email, payload.password)
    return {"data": result.model_dump(), "message": "Success"}


@router.post("/new-password")
async def set_new_password(payload: NewPasswordRequest) -> dict:
    """Complete a NEW_PASSWORD_REQUIRED challenge and return tokens."""
    service = AuthService()
    result = await service.respond_new_password(
        payload.email, payload.new_password, payload.session
    )
    return {"data": result.model_dump(), "message": "Success"}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest) -> dict:
    """Start a self-service password reset. Cognito emails a confirmation code.

    Available to all users, including admins. Always returns success to avoid
    revealing whether an email is registered.
    """
    service = AuthService()
    await service.forgot_password(payload.email)
    return {
        "message": "If that email is registered, a reset code has been sent."
    }


@router.post("/confirm-forgot-password")
async def confirm_forgot_password(payload: ConfirmForgotPasswordRequest) -> dict:
    """Complete a password reset with the emailed code and a new password."""
    service = AuthService()
    await service.confirm_forgot_password(
        payload.email, payload.code, payload.new_password
    )
    return {"message": "Password has been reset. You can now log in."}


@router.post("/logout")
async def logout(payload: LogoutRequest) -> dict:
    """Revoke the current session's tokens via Cognito global sign-out."""
    service = AuthService()
    await service.logout(payload.access_token)
    return {"message": "Logged out"}


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
