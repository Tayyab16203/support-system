"""Email notification service via AWS SES."""

from uuid import UUID

from app.core.logging import get_logger

logger = get_logger(__name__)


class NotificationService:
    """Business logic for email notifications.

    TODO: Step 13 — Implement with AWS SES integration.
    """

    async def notify_status_changed(
        self, ticket_id: UUID, old_status: str, new_status: str
    ) -> None:
        """Send email to ticket creator when status changes."""
        logger.info(f"Notification: ticket {ticket_id} status {old_status} -> {new_status}")

    async def notify_ticket_assigned(self, ticket_id: UUID, assignee_id: UUID) -> None:
        """Send email to assignee when ticket is assigned."""
        logger.info(f"Notification: ticket {ticket_id} assigned to {assignee_id}")

    async def notify_ticket_completed(self, ticket_id: UUID) -> None:
        """Send email to ticket creator when ticket is completed."""
        logger.info(f"Notification: ticket {ticket_id} completed")
