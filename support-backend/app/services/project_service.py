"""Project business logic service."""

from typing import Any, Optional
from uuid import UUID

from app.core.exceptions import ConflictError, ProjectNotFoundError
from app.core.logging import get_logger
from app.db.repositories.project_repo import ProjectRepo
from app.db.repositories.ticket_repo import TicketRepo
from app.schemas.project import ProjectCreate, ProjectUpdate

logger = get_logger(__name__)


class ProjectService:
    """Business logic for project operations."""

    def __init__(self) -> None:
        self.repo = ProjectRepo()

    async def create_project(self, data: ProjectCreate) -> dict:
        """Create a new project.

        Args:
            data: Validated project creation payload.

        Returns:
            The created project record.

        Raises:
            ConflictError: If a project with the same name already exists.
        """
        existing = await self.repo.get_by_name(data.name)
        if existing:
            raise ConflictError(
                message=f"A project named '{data.name}' already exists."
            )

        project = await self.repo.create_returning(
            data.model_dump(exclude_none=True), lookup_field="name"
        )
        logger.info("project_created", extra={"project_id": project.get("id")})
        return project

    async def list_projects(
        self,
        page: int = 1,
        page_size: int = 20,
        is_public: Optional[bool] = None,
    ) -> tuple[list[dict], int]:
        """List projects with pagination and an optional public filter.

        Args:
            page: Page number (1-indexed).
            page_size: Items per page.
            is_public: Optional filter on the public flag.

        Returns:
            Tuple of (projects list, total count).
        """
        filters: dict[str, Any] = {}
        if is_public is not None:
            filters["is_public"] = is_public

        return await self.repo.list(
            filters=filters or None,
            page=page,
            page_size=page_size,
            order_by="name",
            order_desc=False,
        )

    async def get_project(self, project_id: UUID) -> dict:
        """Get a single project by ID.

        Args:
            project_id: UUID of the project.

        Returns:
            The project record.

        Raises:
            ProjectNotFoundError: If no project exists with the given ID.
        """
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id=str(project_id))
        return project

    async def update_project(self, project_id: UUID, data: ProjectUpdate) -> dict:
        """Update a project.

        Args:
            project_id: UUID of the project to update.
            data: Validated partial update payload.

        Returns:
            The updated project record.

        Raises:
            ProjectNotFoundError: If the project does not exist.
            ConflictError: If renaming to a name owned by another project.
        """
        existing = await self.repo.get_by_id(project_id)
        if not existing:
            raise ProjectNotFoundError(project_id=str(project_id))

        update_data = data.model_dump(exclude_unset=True)

        # Guard against renaming into another project's name.
        new_name = update_data.get("name")
        if new_name and new_name != existing.get("name"):
            clash = await self.repo.get_by_name(new_name)
            if clash and str(clash.get("id")) != str(project_id):
                raise ConflictError(
                    message=f"A project named '{new_name}' already exists."
                )

        if not update_data:
            return existing

        project = await self.repo.update(project_id, update_data)
        logger.info("project_updated", extra={"project_id": str(project_id)})
        return project

    async def get_ticket_count(self, project_id: UUID) -> int:
        """Count how many tickets belong to a project.

        Lets an admin see how many tickets a delete would cascade before
        confirming.

        Args:
            project_id: UUID of the project.

        Returns:
            The number of tickets in the project.

        Raises:
            ProjectNotFoundError: If the project does not exist.
        """
        existing = await self.repo.get_by_id(project_id)
        if not existing:
            raise ProjectNotFoundError(project_id=str(project_id))

        return await TicketRepo().count_by_project(project_id)

    async def delete_project(self, project_id: UUID) -> None:
        """Delete a project.

        Deleting a project cascades to all of its tickets (and their
        attachments/activities) via the ``ON DELETE CASCADE`` foreign key.
        The frontend warns the admin of the ticket count before confirming.

        Args:
            project_id: UUID of the project to delete.

        Raises:
            ProjectNotFoundError: If the project does not exist.
        """
        existing = await self.repo.get_by_id(project_id)
        if not existing:
            raise ProjectNotFoundError(project_id=str(project_id))

        await self.repo.delete(project_id)
        logger.info("project_deleted", extra={"project_id": str(project_id)})
