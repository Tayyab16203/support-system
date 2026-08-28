"""Jira REST API client."""

from typing import Any

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class JiraClient:
    """Low-level Jira REST API client using httpx.

    TODO: Step 11 - Implement with httpx.AsyncClient.
    """

    def __init__(self) -> None:
        self.base_url = settings.jira_base_url
        self.email = settings.jira_email
        self.api_token = settings.jira_api_token

    @property
    def is_configured(self) -> bool:
        """Check if Jira credentials are configured."""
        return bool(self.base_url and self.email and self.api_token)

    async def create_issue(
        self, project_key: str, summary: str, description: str, issue_type: str = "Task"
    ) -> dict[str, Any]:
        """Create a Jira issue."""
        return {}

    async def transition_issue(self, issue_key: str, transition_id: str) -> None:
        """Transition a Jira issue to a new status."""
        pass

    async def get_issue(self, issue_key: str) -> dict[str, Any]:
        """Get a Jira issue by key."""
        return {}
