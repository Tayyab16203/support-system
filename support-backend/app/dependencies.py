"""Shared FastAPI dependencies for injection."""

from typing import Optional
from uuid import UUID

from fastapi import Depends, Header

from app.core.exceptions import ForbiddenError, UnauthorizedError, ValidationError
from app.core.security import verify_cognito_token
from app.services.user_service import UserService


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> dict:
    """Extract and verify the current user from the Authorization header.

    Verifies the Cognito JWT, then loads (or creates) the matching user
    record from the database.

    Args:
        authorization: The 'Authorization: Bearer <token>' header.

    Returns:
        The authenticated user record from the database.

    Raises:
        UnauthorizedError: If the header is missing or the token is invalid.
    """
    if not authorization:
        raise UnauthorizedError(message="Authorization header required.")

    if not authorization.startswith("Bearer "):
        raise UnauthorizedError(message="Authorization header must be a Bearer token.")

    token = authorization.removeprefix("Bearer ").strip()
    claims = await verify_cognito_token(token)

    user_service = UserService()
    user = await user_service.get_or_create_from_claims(claims)
    return user


async def get_current_project(
    x_project_id: Optional[str] = Header(None),
) -> UUID:
    """Extract the current project ID from the X-Project-ID header.

    Args:
        x_project_id: The 'X-Project-ID' header value.

    Returns:
        The project UUID.

    Raises:
        ValidationError: If the header is missing or not a valid UUID.
    """
    if not x_project_id:
        raise ValidationError(message="X-Project-ID header is required.")

    try:
        return UUID(x_project_id)
    except ValueError as e:
        raise ValidationError(message="X-Project-ID must be a valid UUID.") from e


async def get_admin_user(
    user: dict = Depends(get_current_user),
) -> dict:
    """Require the current user to have the admin role.

    Args:
        user: The authenticated user (injected).

    Returns:
        The user record if they are an admin.

    Raises:
        ForbiddenError: If the user is not an admin.
    """
    if user.get("role") != "admin":
        raise ForbiddenError(message="Admin access required.")
    return user
