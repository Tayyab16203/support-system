"""Bulk operations service."""

from typing import Any, Optional
from uuid import UUID

from app.core.logging import get_logger
from app.db.repositories.ticket_repo import TicketRepo
from app.db.repositories.user_repo import UserRepo
from app.services.activity_service import ActivityService

logger = get_logger(__name__)


class BulkService:
    """Business logic for bulk ticket operations.

    Each operation is applied per-ticket so that a failure on one ticket does
    not abort the whole batch. Every ticket is scoped to the caller's current
    project (tickets belonging to another project are treated as failures) to
    prevent cross-project mutations, and each successful change is recorded on
    the ticket's activity timeline just like the single-ticket flows.

    Results are aggregated into a summary:
    ``{"success_count", "failure_count", "failures": [{"ticket_id", "reason"}]}``.
    """

    def __init__(self) -> None:
        self.repo = TicketRepo()
        self.user_repo = UserRepo()
        self.activity = ActivityService()

    @staticmethod
    def _summary(successes: list[str], failures: list[dict[str, str]]) -> dict[str, Any]:
        """Build the standard bulk-operation result summary."""
        return {
            "success_count": len(successes),
            "failure_count": len(failures),
            "failures": failures,
        }

    async def _load_scoped(
        self, ticket_id: UUID, project_id: UUID
    ) -> Optional[dict]:
        """Load a ticket only if it belongs to the current project.

        Returns the ticket record, or None if it does not exist or is scoped to
        a different project.
        """
        existing = await self.repo.get_by_id(ticket_id)
        if not existing or str(existing.get("project_id")) != str(project_id):
            return None
        return existing

    async def bulk_status_change(
        self,
        ticket_ids: list[UUID],
        new_status: str,
        user_id: UUID,
        project_id: UUID,
    ) -> dict[str, Any]:
        """Change the status of multiple tickets within the current project.

        Args:
            ticket_ids: Tickets to update.
            new_status: The target status (already validated by the schema).
            user_id: The acting user (recorded as the activity actor).
            project_id: The caller's current project for scoping.

        Returns:
            A bulk-operation result summary.
        """
        successes: list[str] = []
        failures: list[dict[str, str]] = []

        for ticket_id in ticket_ids:
            existing = await self._load_scoped(ticket_id, project_id)
            if existing is None:
                failures.append(
                    {"ticket_id": str(ticket_id), "reason": "Ticket not found"}
                )
                continue

            old_status = existing.get("status")
            if old_status == new_status:
                # No-op: still count as success, skip the redundant activity.
                successes.append(str(ticket_id))
                continue

            try:
                await self.repo.update(ticket_id, {"status": new_status})
            except Exception as exc:  # noqa: BLE001 — isolate per-ticket failures.
                logger.error(
                    "bulk_status_change_failed",
                    extra={
                        "resource": {"ticket_id": str(ticket_id)},
                        "error": str(exc),
                    },
                )
                failures.append(
                    {"ticket_id": str(ticket_id), "reason": "Update failed"}
                )
                continue

            await self.activity.log_activity(
                ticket_id=ticket_id,
                actor_id=user_id,
                action_type="status_changed",
                old_value={"status": old_status},
                new_value={"status": new_status},
            )
            successes.append(str(ticket_id))

        logger.info(
            "bulk_status_change",
            extra={
                "resource": {
                    "project_id": str(project_id),
                    "success_count": len(successes),
                    "failure_count": len(failures),
                }
            },
        )
        return self._summary(successes, failures)

    async def bulk_assign(
        self,
        ticket_ids: list[UUID],
        assignee_id: UUID,
        user_id: UUID,
        project_id: UUID,
    ) -> dict[str, Any]:
        """Assign multiple tickets to a single user within the current project.

        The assignee is resolved once up front: if the user does not exist the
        whole batch fails (nothing to assign to). Otherwise each ticket is
        assigned individually, recording an ``assigned`` activity.

        Args:
            ticket_ids: Tickets to assign.
            assignee_id: The user to assign the tickets to.
            user_id: The acting user (recorded as the activity actor).
            project_id: The caller's current project for scoping.

        Returns:
            A bulk-operation result summary.
        """
        successes: list[str] = []
        failures: list[dict[str, str]] = []

        assignee = await self.user_repo.get_by_id(assignee_id)
        if not assignee:
            # The assignee is invalid for the entire request; fail every ticket.
            failures = [
                {"ticket_id": str(tid), "reason": "Assignee not found"}
                for tid in ticket_ids
            ]
            return self._summary(successes, failures)
        assignee_name = assignee.get("name")

        for ticket_id in ticket_ids:
            existing = await self._load_scoped(ticket_id, project_id)
            if existing is None:
                failures.append(
                    {"ticket_id": str(ticket_id), "reason": "Ticket not found"}
                )
                continue

            old_assignee = existing.get("assigned_to")
            if str(old_assignee) == str(assignee_id):
                # Already assigned to this user: success, skip redundant activity.
                successes.append(str(ticket_id))
                continue

            try:
                await self.repo.update(ticket_id, {"assigned_to": str(assignee_id)})
            except Exception as exc:  # noqa: BLE001 — isolate per-ticket failures.
                logger.error(
                    "bulk_assign_failed",
                    extra={
                        "resource": {"ticket_id": str(ticket_id)},
                        "error": str(exc),
                    },
                )
                failures.append(
                    {"ticket_id": str(ticket_id), "reason": "Assignment failed"}
                )
                continue

            await self.activity.log_activity(
                ticket_id=ticket_id,
                actor_id=user_id,
                action_type="assigned",
                old_value={
                    "assigned_to": old_assignee,
                    "assigned_to_name": await self._resolve_user_name(old_assignee),
                },
                new_value={
                    "assigned_to": str(assignee_id),
                    "assigned_to_name": assignee_name,
                },
            )
            successes.append(str(ticket_id))

        logger.info(
            "bulk_assign",
            extra={
                "resource": {
                    "project_id": str(project_id),
                    "assignee_id": str(assignee_id),
                    "success_count": len(successes),
                    "failure_count": len(failures),
                }
            },
        )
        return self._summary(successes, failures)

    async def bulk_delete(
        self, ticket_ids: list[UUID], user_id: UUID, project_id: UUID
    ) -> dict[str, Any]:
        """Delete multiple tickets within the current project (admin-only).

        The admin check is enforced at the endpoint via ``get_admin_user``; this
        method still scopes every ticket to the current project so an admin
        cannot delete tickets belonging to another project through this batch.

        Args:
            ticket_ids: Tickets to delete.
            user_id: The acting admin user.
            project_id: The caller's current project for scoping.

        Returns:
            A bulk-operation result summary.
        """
        successes: list[str] = []
        failures: list[dict[str, str]] = []

        for ticket_id in ticket_ids:
            existing = await self._load_scoped(ticket_id, project_id)
            if existing is None:
                failures.append(
                    {"ticket_id": str(ticket_id), "reason": "Ticket not found"}
                )
                continue

            try:
                await self.repo.delete(ticket_id)
            except Exception as exc:  # noqa: BLE001 — isolate per-ticket failures.
                logger.error(
                    "bulk_delete_failed",
                    extra={
                        "resource": {"ticket_id": str(ticket_id)},
                        "error": str(exc),
                    },
                )
                failures.append(
                    {"ticket_id": str(ticket_id), "reason": "Delete failed"}
                )
                continue

            successes.append(str(ticket_id))

        logger.info(
            "bulk_delete",
            extra={
                "resource": {
                    "project_id": str(project_id),
                    "success_count": len(successes),
                    "failure_count": len(failures),
                }
            },
        )
        return self._summary(successes, failures)

    async def _resolve_user_name(self, user_id: Optional[Any]) -> Optional[str]:
        """Resolve a user id to their display name (None if unset/not found)."""
        if not user_id:
            return None
        try:
            user = await self.user_repo.get_by_id(UUID(str(user_id)))
        except (ValueError, TypeError):
            return None
        return user.get("name") if user else None
