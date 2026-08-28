"""Project business logic service."""

from uuid import UUID

from app.core.logging import get_logger

logger = get_logger(__name__)


class ProjectService:
    """Business logic for project operations.

    TODO: Step 4 — Implement full CRUD with ProjectRepo and AuditLogger.
    """

    async def create(self, data: dict, user_id: UUID) -> dict:
        """Create a new project."""
        return {}

    async def get_by_id(self, project_id: UUID) -> dict:
        """Get a project by ID."""
        return {}

    async def list_all(self, page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
        """List all projects with pagination."""
        return [], 0

    async def update(self, project_id: UUID, data: dict) -> dict:
        """Update a project."""
        return {}

    async def delete(self, project_id: UUID) -> None:
        """Delete a project."""
        pass
