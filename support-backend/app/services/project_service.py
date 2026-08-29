"""Project business logic service."""

from typing import Any, Optional
from uuid import UUID

from app.audit import AuditEvents, ResourceTypes, audit_logger
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

    async def create_project(
        self,
        data: ProjectCreate,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
    ) -> dict:
        """Create a new project.

        Args:
            data: Validated project creation payload.
            actor_id: The admin performing the action (for audit logging).
            ip_address: The originating request IP (for audit logging).

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

        project_id = project.get("id")
        if actor_id and project_id:
            await audit_logger.log(
                actor_id=actor_id,
                action=AuditEvents.PROJECT_CREATED,
                resource_type=ResourceTypes.PROJECT,
                resource_id=UUID(str(project_id)),
                project_id=UUID(str(project_id)),
                metadata={"name": project.get("name")},
                ip_address=ip_address,
            )
        return project

    async def list_projects(
        self,
        page: int = 1,
        page_size: int = 20,
        is_public: Optional[bool] = None,
        is_admin: bool = False,
    ) -> tuple[list[dict], int]:
        """List projects with pagination and an optional public filter.

        Private (non-public) projects are admin-only. For non-admin callers the
        result is always restricted to public projects, regardless of the
        ``is_public`` filter they pass.

        Args:
            page: Page number (1-indexed).
            page_size: Items per page.
            is_public: Optional filter on the public flag (admins only; ignored
                for non-admins, who are always restricted to public projects).
            is_admin: Whether the caller has the admin role.

        Returns:
            Tuple of (projects list, total count).
        """
        filters: dict[str, Any] = {}
        if not is_admin:
            # Non-admins may only ever see public projects.
            filters["is_public"] = True
        elif is_public is not None:
            filters["is_public"] = is_public

        return await self.repo.list(
            filters=filters or None,
            page=page,
            page_size=page_size,
            order_by="name",
            order_desc=False,
        )

    async def get_project(self, project_id: UUID, is_admin: bool = False) -> dict:
        """Get a single project by ID.

        Private (non-public) projects are admin-only. A non-admin requesting a
        private project gets the same not-found error as a missing project, so
        the existence of private projects is not leaked.

        Args:
            project_id: UUID of the project.
            is_admin: Whether the caller has the admin role.

        Returns:
            The project record.

        Raises:
            ProjectNotFoundError: If no project exists with the given ID, or the
                project is private and the caller is not an admin.
        """
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise ProjectNotFoundError(project_id=str(project_id))
        if not is_admin and not project.get("is_public"):
            raise ProjectNotFoundError(project_id=str(project_id))
        return project

    async def is_visible_to(self, project_id: UUID, is_admin: bool) -> bool:
        """Check whether a project is visible to a caller of the given role.

        Admins can see every project; non-admins can only see public ones.
        Used to gate access to a project's tickets and related resources.

        Args:
            project_id: UUID of the project.
            is_admin: Whether the caller has the admin role.

        Returns:
            True if the caller may access the project, False otherwise.
        """
        project = await self.repo.get_by_id(project_id)
        if not project:
            return False
        if is_admin:
            return True
        return bool(project.get("is_public"))

    async def update_project(
        self,
        project_id: UUID,
        data: ProjectUpdate,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
    ) -> dict:
        """Update a project.

        Args:
            project_id: UUID of the project to update.
            data: Validated partial update payload.
            actor_id: The admin performing the action (for audit logging).
            ip_address: The originating request IP (for audit logging).

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

        if actor_id:
            changed_fields = {
                field: {"old": existing.get(field), "new": value}
                for field, value in update_data.items()
                if existing.get(field) != value
            }
            await audit_logger.log(
                actor_id=actor_id,
                action=AuditEvents.PROJECT_UPDATED,
                resource_type=ResourceTypes.PROJECT,
                resource_id=project_id,
                project_id=project_id,
                metadata={"changes": changed_fields},
                ip_address=ip_address,
            )
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

    async def delete_project(
        self,
        project_id: UUID,
        actor_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Delete a project.

        Deleting a project cascades to all of its tickets (and their
        attachments/activities) via the ``ON DELETE CASCADE`` foreign key.
        The frontend warns the admin of the ticket count before confirming.

        Args:
            project_id: UUID of the project to delete.
            actor_id: The admin performing the action (for audit logging).
            ip_address: The originating request IP (for audit logging).

        Raises:
            ProjectNotFoundError: If the project does not exist.
        """
        existing = await self.repo.get_by_id(project_id)
        if not existing:
            raise ProjectNotFoundError(project_id=str(project_id))

        await self.repo.delete(project_id)
        logger.info("project_deleted", extra={"project_id": str(project_id)})

        if actor_id:
            await audit_logger.log(
                actor_id=actor_id,
                action=AuditEvents.PROJECT_DELETED,
                resource_type=ResourceTypes.PROJECT,
                resource_id=project_id,
                project_id=project_id,
                metadata={"name": existing.get("name")},
                ip_address=ip_address,
            )
