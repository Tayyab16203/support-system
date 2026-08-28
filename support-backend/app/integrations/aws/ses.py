"""AWS SES integration for email notifications."""

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SESClient:
    """AWS SES client for sending templated emails.

    TODO: Step 13 - Implement with boto3.
    """

    def __init__(self) -> None:
        self.from_email = settings.ses_from_email
        self.region = settings.aws_region

    async def send_email(self, to_email: str, subject: str, html_body: str) -> bool:
        """Send an email via SES."""
        logger.info(f"SES: Would send email to {to_email}: {subject}")
        return True
