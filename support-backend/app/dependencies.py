"""Shared FastAPI dependencies for injection."""

from typing import Optional
from uuid import UUID

from fastapi import Depends, Header, Request

from app.core.exceptions import (
    ForbiddenError,
    ProjectNotFoundError,
    UnauthorizedError,
    ValidationError,
)
from app.core.security import verify_cognito_token
from app.services.project_service import ProjectService
from app.services.user_service import UserService


def get_client_ip(request: Request) -> Optional[str]:
    """Best-effort extraction of the originating client IP for audit logging.

    Honors the ``X-Forwarded-For`` header (first hop) when the app runs behind
    a proxy/load balancer, falling back to the direct socket peer. Returns None
    if the IP cannot be determined.

    Args:
        request: The incoming request (injected by FastAPI).

    Returns:
        The client IP string, or None.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # The left-most entry is the original client.
        return forwarded.split(",")[0].strip() or None
    if request.client:
        return request.client.host
    return None


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
    user: dict = Depends(get_current_user),
) -> UUID:
    """Resolve and authorize the current project from the X-Project-ID header.

    Private (non-public) projects are admin-only. A non-admin that supplies a
    private (or non-existent) project id gets a not-found error, so private
    projects are hidden and their tickets/activities/comments are unreachable.
    This is the single chokepoint every project-scoped ticket route depends on.

    Args:
        x_project_id: The 'X-Project-ID' header value.
        user: The authenticated user (injected), used for the visibility check.

    Returns:
        The project UUID.

    Raises:
        ValidationError: If the header is missing or not a valid UUID.
        ProjectNotFoundError: If the project does not exist or is not visible
            to the caller (private project requested by a non-admin).
    """
    if not x_project_id:
        raise ValidationError(message="X-Project-ID header is required.")

    try:
        project_id = UUID(x_project_id)
    except ValueError as e:
        raise ValidationError(message="X-Project-ID must be a valid UUID.") from e

    is_admin = user.get("role") == "admin"
    if not await ProjectService().is_visible_to(project_id, is_admin=is_admin):
        raise ProjectNotFoundError(project_id=str(project_id))

    return project_id


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
