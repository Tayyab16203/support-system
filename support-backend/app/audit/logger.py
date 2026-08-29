"""Audit logger for recording all system actions.

Every meaningful mutation (ticket/project/user/file/bulk) is recorded through
:class:`AuditLogger`, which writes to two sinks:

1. The ``audit_logs`` table in Supabase — the queryable source of truth that
   backs the admin audit-trail viewer.
2. AWS CloudWatch Logs — a durable, tamper-resistant secondary sink for
   long-term retention and CloudWatch Logs Insights queries.

Audit logging is deliberately best-effort: a failure to persist an audit
record must never fail the underlying business operation. Both sinks are
wrapped so exceptions are logged and swallowed.
"""

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from app.core.logging import get_logger
from app.db.repositories.audit_repo import AuditRepo
from app.integrations.aws.cloudwatch import cloudwatch_client

logger = get_logger(__name__)


class AuditLogger:
    """Records audit events to the database and CloudWatch.

    The logger is stateless and cheap to instantiate; services can create one
    per call or hold a shared instance.
    """

    def __init__(self) -> None:
        self.repo = AuditRepo()
        self.cloudwatch = cloudwatch_client

    async def log(
        self,
        actor_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        project_id: Optional[UUID] = None,
        metadata: Optional[dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> None:
        """Record an audit event to the DB and CloudWatch (best-effort).

        Args:
            actor_id: The user who performed the action.
            action: The action identifier (see :class:`AuditEvents`).
            resource_type: The kind of resource affected (ticket/project/...).
            resource_id: The affected resource's ID.
            project_id: The associated project, if any.
            metadata: Extra structured context to store with the event.
            ip_address: The originating request IP, if known.
        """
        metadata = metadata or {}
        created_at = datetime.now(timezone.utc).isoformat()

        # 1) Persist to the audit_logs table (source of truth).
        await self._write_db(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            project_id=project_id,
            metadata=metadata,
            ip_address=ip_address,
        )

        # 2) Mirror to CloudWatch as a structured JSON event.
        await self._write_cloudwatch(
            {
                "timestamp": created_at,
                "actor_id": str(actor_id),
                "action": action,
                "resource_type": resource_type,
                "resource_id": str(resource_id),
                "project_id": str(project_id) if project_id else None,
                "metadata": metadata,
                "ip_address": ip_address,
            }
        )

        # 3) Structured application log line (captured by the JSON formatter).
        logger.info(
            f"audit:{action}",
            extra={
                "event": action,
                "actor": str(actor_id),
                "resource": f"{resource_type}:{resource_id}",
                "project": str(project_id) if project_id else None,
            },
        )

    async def _write_db(
        self,
        actor_id: UUID,
        action: str,
        resource_type: str,
        resource_id: UUID,
        project_id: Optional[UUID],
        metadata: dict[str, Any],
        ip_address: Optional[str],
    ) -> None:
        """Insert the audit row, swallowing any failure."""
        try:
            await self.repo.create(
                {
                    "actor_id": str(actor_id),
                    "action": action,
                    "resource_type": resource_type,
                    "resource_id": str(resource_id),
                    "project_id": str(project_id) if project_id else None,
                    "metadata": metadata,
                    "ip_address": ip_address,
                }
            )
        except Exception as exc:  # noqa: BLE001 — audit must never break a request.
            logger.warning(
                "audit_db_write_failed",
                extra={"event": action, "actor": str(actor_id)},
                exc_info=exc,
            )

    async def _write_cloudwatch(self, event: dict[str, Any]) -> None:
        """Push the event to CloudWatch, swallowing any failure."""
        try:
            await self.cloudwatch.put_log_event(event)
        except Exception as exc:  # noqa: BLE001 — audit must never break a request.
            logger.warning(
                "audit_cloudwatch_write_failed",
                extra={"event": event.get("action", "unknown")},
                exc_info=exc,
            )


# Shared instance for convenient import across services.
audit_logger = AuditLogger()
