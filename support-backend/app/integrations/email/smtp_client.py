"""SMTP email transport (e.g. Gmail).

Unlike SES in sandbox mode, SMTP can deliver to any recipient immediately
with no per-address verification. Used when ``settings.email_provider`` is
``"smtp"``. Sending runs in a worker thread so the async event loop is not
blocked by the synchronous ``smtplib`` calls.
"""

import asyncio
import smtplib
from email.message import EmailMessage
from typing import Optional

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class SMTPClient:
    """Sends transactional emails over SMTP with STARTTLS."""

    def __init__(self) -> None:
        self.host = settings.smtp_host
        self.port = settings.smtp_port
        self.username = settings.smtp_username
        self.password = settings.smtp_password
        # Prefer an explicit SMTP sender, then the SES sender, then the login.
        self.from_email = (
            settings.smtp_from_email
            or settings.ses_from_email
            or settings.smtp_username
        )

    @property
    def is_configured(self) -> bool:
        """True when credentials and a sender are present."""
        return bool(self.username and self.password and self.from_email)

    def _send_sync(
        self, to_email: str, subject: str, html_body: str, text_body: Optional[str]
    ) -> None:
        """Blocking send; runs in a thread via :meth:`send_email`."""
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.from_email
        message["To"] = to_email
        # Plain-text part first, then HTML as the preferred alternative.
        message.set_content(text_body or "Please view this email in HTML.")
        message.add_alternative(html_body, subtype="html")

        with smtplib.SMTP(self.host, self.port, timeout=30) as server:
            server.starttls()
            server.login(self.username, self.password)
            server.send_message(message)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
    ) -> bool:
        """Send an HTML email over SMTP.

        Returns:
            True if SMTP accepted the message, False if skipped or failed
            (never raises — notifications are best-effort).
        """
        if not self.is_configured:
            logger.info(
                "smtp_skip_unconfigured",
                extra={"resource": {"to": to_email, "subject": subject}},
            )
            return False

        try:
            await asyncio.to_thread(
                self._send_sync, to_email, subject, html_body, text_body
            )
            logger.info(
                "smtp_email_sent",
                extra={"resource": {"to": to_email, "subject": subject}},
            )
            return True
        except (smtplib.SMTPException, OSError) as exc:
            logger.error(
                "smtp_email_failed",
                extra={"resource": {"to": to_email, "subject": subject}},
                exc_info=exc,
            )
            return False


smtp_client = SMTPClient()
