"""AWS SES integration for email notifications."""

from typing import Any, Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SESClient:
    """AWS SES client for sending transactional emails.

    Emails are sent from ``settings.ses_from_email``. If that address is not
    configured the client treats sending as a no-op (returns ``False``) so the
    system runs cleanly in local/dev environments without SES set up.

    Sending is best-effort: SES failures are logged and swallowed rather than
    raised, because notifications are scheduled via BackgroundTasks and must
    never break the originating request.
    """

    def __init__(self) -> None:
        self.from_email = settings.ses_from_email
        self.region = settings.aws_region
        self._client: Any = None

    @property
    def client(self) -> Any:
        """Lazily create the boto3 SES client."""
        if self._client is None:
            self._client = boto3.client(
                "ses",
                region_name=self.region,
                aws_access_key_id=settings.aws_access_key_id or None,
                aws_secret_access_key=settings.aws_secret_access_key or None,
            )
        return self._client

    @property
    def is_configured(self) -> bool:
        """True when a sender address is set and email can be dispatched."""
        return bool(self.from_email)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """Send an HTML email via SES.

        Args:
            to_email: Recipient email address.
            subject: Email subject line.
            html_body: HTML body content.
            text_body: Optional plain-text fallback rendered for clients that
                do not display HTML.

        Returns:
            True if SES accepted the message, False if sending was skipped or
            failed (never raises).
        """
        if not self.is_configured:
            logger.info(
                "ses_skip_unconfigured",
                extra={"resource": {"to": to_email, "subject": subject}},
            )
            return False

        body: dict[str, Any] = {"Html": {"Data": html_body, "Charset": "UTF-8"}}
        if text_body:
            body["Text"] = {"Data": text_body, "Charset": "UTF-8"}

        try:
            response = self.client.send_email(
                Source=self.from_email,
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": body,
                },
            )
            logger.info(
                "ses_email_sent",
                extra={
                    "resource": {
                        "to": to_email,
                        "subject": subject,
                        "message_id": response.get("MessageId"),
                    }
                },
            )
            return True
        except (BotoCoreError, ClientError) as exc:
            # Notifications are non-critical: log and swallow so the caller
            # (a background task) never surfaces the failure to the user.
            logger.error(
                "ses_email_failed",
                extra={"resource": {"to": to_email, "subject": subject}},
                exc_info=exc,
            )
            return False


ses_client = SESClient()
