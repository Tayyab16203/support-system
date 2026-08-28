"""Activity timeline service."""

from typing import Any, Optional
from uuid import UUID

from app.core.logging import get_logger

logger = get_logger(__name__)


class ActivityService:
    """Business logic for activity timeline tracking.

    TODO: Step 7 — Implement with ActivityRepo.
    """

    async def log_activity(
        self,
        ticket_id: UUID,
        actor_id: UUID,
        action_type: str,
        old_value: Optional[dict[str, Any]] = None,
        new_value: Optional[dict[str, Any]] = None,
        comment: Optional[str] = None,
    ) -> dict:
        """Log an activity event for a ticket."""
        return {}

    async def list_activities(
        self, ticket_id: UUID, page: int = 1, page_size: int = 50
    ) -> tuple[list[dict], int]:
        """List activities for a ticket in chronological order."""
        return [], 0

    async def add_comment(self, ticket_id: UUID, actor_id: UUID, comment: str) -> dict:
        """Add a comment to a ticket."""
        return await self.log_activity(
            ticket_id=ticket_id,
            actor_id=actor_id,
            action_type="commented",
            comment=comment,
        )
