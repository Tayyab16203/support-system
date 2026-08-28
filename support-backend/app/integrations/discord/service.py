"""Discord integration business logic."""

from app.core.logging import get_logger
from app.integrations.discord.client import DiscordClient

logger = get_logger(__name__)

PRIORITY_COLORS = {
    "critical": 0xFF0000,
    "high": 0xFF8C00,
    "medium": 0xFFD700,
    "low": 0x00C853,
}


class DiscordService:
    """Business logic for Discord webhook notifications.

    TODO: Step 12 - Implement full notification logic.
    """

    def __init__(self) -> None:
        self.client = DiscordClient()

    async def notify_ticket_created(
        self, webhook_url: str, title: str, ticket_type: str, priority: str, creator: str
    ) -> None:
        """Send notification when a new ticket is created."""
        embed = {
            "title": f"New Ticket: {title}",
            "color": PRIORITY_COLORS.get(priority, 0x808080),
            "fields": [
                {"name": "Type", "value": ticket_type, "inline": True},
                {"name": "Priority", "value": priority, "inline": True},
                {"name": "Created By", "value": creator, "inline": True},
            ],
        }
        await self.client.send_embed(webhook_url, embed)

    async def notify_status_changed(
        self, webhook_url: str, title: str, old_status: str, new_status: str, actor: str
    ) -> None:
        """Send notification when ticket status changes."""
        embed = {
            "title": f"Status Updated: {title}",
            "description": f"{old_status} -> {new_status}",
            "color": 0x4A90D9,
            "fields": [{"name": "Changed By", "value": actor, "inline": True}],
        }
        await self.client.send_embed(webhook_url, embed)
