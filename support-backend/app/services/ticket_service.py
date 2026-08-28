"""Ticket business logic service."""

from typing import Any, Optional
from uuid import UUID

from app.core.exceptions import ForbiddenError, TicketNotFoundError
from app.core.logging import get_logger
from app.db.repositories.ticket_repo import TicketRepo
from app.schemas.ticket import TicketCreate, TicketUpdate

logger = get_logger(__name__)


class TicketService:
    """Business logic for ticket operations.

    Tickets are always scoped to a project. Every read/update/delete verifies
    the target ticket belongs to the caller's current project to prevent
    cross-project data leaks.

    Later steps extend this service with side effects (activity timeline,
    audit logging, Jira/Discord/SES integrations) via BackgroundTasks.
    """

    def __init__(self) -> None:
        self.repo = TicketRepo()

    async def create(
        self, data: TicketCreate, user_id: UUID, project_id: UUID
    ) -> dict:
        """Create a new ticket in the given project.

        Args:
            data: Validated ticket creation payload.
            user_id: UUID of the authenticated creator.
            project_id: UUID of the current project (from context).

        Returns:
            The created ticket with related user data.
        """
        record: dict[str, Any] = data.model_dump(exclude_none=True)
        record["project_id"] = str(project_id)
        record["created_by"] = str(user_id)
        record["status"] = "pending"  # New tickets always start as pending.

        # Enum fields serialize to their string values for storage.
        record["type"] = data.type.value
        record["priority"] = data.priority.value
        if data.assigned_to is not None:
            record["assigned_to"] = str(data.assigned_to)

        created = await self.repo.create(record)
        ticket_id = created.get("id")
        logger.info(
            "ticket_created",
            extra={"resource": {"ticket_id": ticket_id, "project_id": str(project_id)}},
        )

        # Re-fetch with related user data for a complete response.
        if ticket_id:
            full = await self.repo.get_with_relations(UUID(str(ticket_id)))
            if full:
                return full
        return created

    async def get_by_id(self, ticket_id: UUID, project_id: UUID) -> dict:
        """Get a single ticket by ID, scoped to the current project.

        Args:
            ticket_id: UUID of the ticket.
            project_id: UUID of the current project (from context).

        Returns:
            The ticket record with related user data.

        Raises:
            TicketNotFoundError: If the ticket does not exist or belongs to
                another project.
        """
        ticket = await self.repo.get_with_relations(ticket_id)
        if not ticket or str(ticket.get("project_id")) != str(project_id):
            raise TicketNotFoundError(ticket_id=str(ticket_id))
        return ticket

    async def list_by_project(
        self,
        project_id: UUID,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        ticket_type: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[UUID] = None,
        created_by: Optional[UUID] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> tuple[list[dict], int]:
        """List tickets for a project with filters, pagination, and sorting.

        Args:
            project_id: UUID of the current project.
            page: Page number (1-indexed).
            page_size: Items per page (capped at 100).
            status: Optional status filter.
            ticket_type: Optional type filter.
            priority: Optional priority filter.
            assigned_to: Optional assignee filter.
            created_by: Optional creator filter.
            sort_by: Sort column.
            sort_order: 'asc' or 'desc'.

        Returns:
            Tuple of (tickets list, total count).
        """
        page_size = min(max(page_size, 1), 100)
        page = max(page, 1)

        return await self.repo.list_by_project(
            project_id=project_id,
            page=page,
            page_size=page_size,
            status=status,
            ticket_type=ticket_type,
            priority=priority,
            assigned_to=assigned_to,
            created_by=created_by,
            order_by=sort_by,
            order_desc=sort_order.lower() != "asc",
        )

    async def update(
        self, ticket_id: UUID, data: TicketUpdate, user_id: UUID, project_id: UUID
    ) -> dict:
        """Update a ticket (partial), scoped to the current project.

        Args:
            ticket_id: UUID of the ticket to update.
            data: Validated partial update payload.
            user_id: UUID of the acting user.
            project_id: UUID of the current project.

        Returns:
            The updated ticket with related user data.

        Raises:
            TicketNotFoundError: If the ticket does not exist or belongs to
                another project.
        """
        existing = await self.repo.get_by_id(ticket_id)
        if not existing or str(existing.get("project_id")) != str(project_id):
            raise TicketNotFoundError(ticket_id=str(ticket_id))

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_by_id(ticket_id, project_id)

        # Serialize enum values to their string form.
        if data.type is not None:
            update_data["type"] = data.type.value
        if data.priority is not None:
            update_data["priority"] = data.priority.value
        if data.status is not None:
            update_data["status"] = data.status.value
        # assigned_to may be explicitly set to None to unassign.
        if "assigned_to" in update_data and data.assigned_to is not None:
            update_data["assigned_to"] = str(data.assigned_to)

        await self.repo.update(ticket_id, update_data)
        logger.info(
            "ticket_updated",
            extra={
                "resource": {"ticket_id": str(ticket_id), "project_id": str(project_id)}
            },
        )
        return await self.get_by_id(ticket_id, project_id)

    async def delete(
        self, ticket_id: UUID, user: dict, project_id: UUID
    ) -> None:
        """Delete a ticket, scoped to the current project.

        Only the creator or an admin may delete a ticket.

        Args:
            ticket_id: UUID of the ticket to delete.
            user: The acting user record.
            project_id: UUID of the current project.

        Raises:
            TicketNotFoundError: If the ticket does not exist or belongs to
                another project.
            ForbiddenError: If the user is neither the creator nor an admin.
        """
        existing = await self.repo.get_by_id(ticket_id)
        if not existing or str(existing.get("project_id")) != str(project_id):
            raise TicketNotFoundError(ticket_id=str(ticket_id))

        is_admin = user.get("role") == "admin"
        is_creator = str(existing.get("created_by")) == str(user.get("id"))
        if not (is_admin or is_creator):
            raise ForbiddenError(
                message="Only the ticket creator or an admin can delete this ticket."
            )

        await self.repo.delete(ticket_id)
        logger.info(
            "ticket_deleted",
            extra={
                "resource": {"ticket_id": str(ticket_id), "project_id": str(project_id)}
            },
        )
