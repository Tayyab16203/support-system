"""Activity timeline service."""

from typing import Any, Optional
from uuid import UUID

from app.core.logging import get_logger
from app.db.repositories.activity_repo import ActivityRepo

logger = get_logger(__name__)

# Valid activity action types (mirrors ActivityActionType schema / DB constraint).
VALID_ACTION_TYPES = {
    "created",
    "status_changed",
    "updated",
    "commented",
    "file_uploaded",
    "file_deleted",
    "assigned",
}


class ActivityService:
    """Business logic for the ticket activity timeline.

    Every ticket mutation (create, status change, update, assignment, file
    upload/delete) is recorded as an activity so the ticket detail page can
    render a chronological history. Comments are stored as activities of type
    ``commented``.

    Logging is best-effort: a failure to record an activity must never break
    the primary mutation, so :meth:`log_activity` swallows and logs errors.
    """

    def __init__(self) -> None:
        self.repo = ActivityRepo()

    async def log_activity(
        self,
        ticket_id: UUID,
        actor_id: UUID,
        action_type: str,
        old_value: Optional[dict[str, Any]] = None,
        new_value: Optional[dict[str, Any]] = None,
        comment: Optional[str] = None,
    ) -> dict:
        """Log an activity event for a ticket.

        Args:
            ticket_id: The ticket the activity belongs to.
            actor_id: The user who performed the action.
            action_type: One of the supported activity action types.
            old_value: Prior state (e.g. ``{"status": "pending"}``), if any.
            new_value: New state (e.g. ``{"status": "in_progress"}``), if any.
            comment: Free-text comment (only for ``commented`` activities).

        Returns:
            The created activity record, or an empty dict if logging failed.
        """
        if action_type not in VALID_ACTION_TYPES:
            logger.warning(
                "activity_invalid_action_type",
                extra={"resource": {"action_type": action_type, "ticket_id": str(ticket_id)}},
            )
            return {}

        record: dict[str, Any] = {
            "ticket_id": str(ticket_id),
            "actor_id": str(actor_id),
            "action_type": action_type,
            "old_value": old_value,
            "new_value": new_value,
            "comment": comment,
        }

        try:
            created = await self.repo.create(record)
            logger.info(
                "activity_logged",
                extra={
                    "resource": {
                        "activity_id": created.get("id"),
                        "ticket_id": str(ticket_id),
                        "action_type": action_type,
                    }
                },
            )
            return created
        except Exception as exc:  # noqa: BLE001 — logging must not break mutations.
            logger.error(
                "activity_log_failed",
                extra={
                    "resource": {"ticket_id": str(ticket_id), "action_type": action_type},
                    "error": str(exc),
                },
            )
            return {}

    async def list_activities(
        self,
        ticket_id: UUID,
        page: int = 1,
        page_size: int = 50,
        exclude_comments: bool = False,
    ) -> tuple[list[dict], int]:
        """List activities for a ticket in chronological order.

        Args:
            ticket_id: The ticket whose timeline to fetch.
            page: Page number (1-indexed).
            page_size: Items per page (capped at 100).
            exclude_comments: If True, omit ``commented`` entries so the
                activity timeline shows events only (comments live in their
                own section).

        Returns:
            Tuple of (activities list, total count).
        """
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        return await self.repo.list_by_ticket(
            ticket_id=ticket_id,
            page=page,
            page_size=page_size,
            exclude_comments=exclude_comments,
        )

    async def list_comments(
        self, ticket_id: UUID, page: int = 1, page_size: int = 50
    ) -> tuple[list[dict], int]:
        """List a ticket's comments (``commented`` activities) chronologically.

        Args:
            ticket_id: The ticket whose comments to fetch.
            page: Page number (1-indexed).
            page_size: Items per page (capped at 100).

        Returns:
            Tuple of (comment activities list, total count).
        """
        page = max(page, 1)
        page_size = min(max(page_size, 1), 100)
        return await self.repo.list_by_ticket(
            ticket_id=ticket_id,
            page=page,
            page_size=page_size,
            only_comments=True,
        )

    async def add_comment(self, ticket_id: UUID, actor_id: UUID, comment: str) -> dict:
        """Add a comment to a ticket's timeline.

        Args:
            ticket_id: The ticket to comment on.
            actor_id: The commenting user.
            comment: The comment text (validated by the schema layer).

        Returns:
            The created activity record.
        """
        return await self.log_activity(
            ticket_id=ticket_id,
            actor_id=actor_id,
            action_type="commented",
            comment=comment,
        )
