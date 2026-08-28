"""Audit logger for recording all system actions."""

from typing import Any, Optional
from uuid import UUID

from app.core.logging import get_logger

logger = get_logger(__name__)


class AuditLogger:
    """Records audit events to DB and CloudWatch.

    TODO: Step 14 - Implement with AuditRepo and CloudWatchClient.
    """

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
        """Record an audit event."""
        logger.info(
            f"Audit: {action} on {resource_type}:{resource_id} by {actor_id}",
            extra={
                "event": action,
                "actor": str(actor_id),
                "resource": f"{resource_type}:{resource_id}",
            },
        )
