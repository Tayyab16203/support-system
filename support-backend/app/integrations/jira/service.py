"""Jira integration business logic."""

from typing import Optional

from app.core.logging import get_logger
from app.integrations.jira.client import JiraClient

logger = get_logger(__name__)

STATUS_MAP = {
    "pending": "To Do",
    "in_progress": "In Progress",
    "paused": "On Hold",
    "in_review": "In Review",
    "completed": "Done",
}


class JiraService:
    """Business logic for Jira integration.

    TODO: Step 11 - Implement full sync logic.
    """

    def __init__(self) -> None:
        self.client = JiraClient()

    async def sync_ticket_to_jira(
        self, title: str, description: str, project_key: str
    ) -> Optional[str]:
        """Create a Jira issue from an internal ticket. Returns jira_key or None."""
        if not self.client.is_configured or not project_key:
            return None
        try:
            result = await self.client.create_issue(
                project_key=project_key, summary=title, description=description
            )
            return result.get("key")
        except Exception as e:
            logger.error(f"Jira sync failed: {e}")
            return None

    async def sync_status_to_jira(self, jira_key: str, new_status: str) -> None:
        """Transition a Jira issue when internal ticket status changes."""
        if not self.client.is_configured or not jira_key:
            return
        try:
            jira_status = STATUS_MAP.get(new_status)
            if jira_status:
                await self.client.transition_issue(jira_key, jira_status)
        except Exception as e:
            logger.error(f"Jira status sync failed for {jira_key}: {e}")
