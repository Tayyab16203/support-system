"""Discord webhook client."""

from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class DiscordClient:
    """Discord webhook client for sending rich embeds.

    TODO: Step 12 - Implement with httpx.AsyncClient.
    """

    async def send_embed(self, webhook_url: str, embed: dict[str, Any]) -> bool:
        """Send a rich embed to a Discord webhook URL."""
        if not webhook_url:
            return False
        try:
            logger.info("Discord: Would send embed to webhook")
            return True
        except Exception as e:
            logger.error(f"Discord webhook failed: {e}")
            return False
