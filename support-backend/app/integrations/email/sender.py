"""Email transport selector.

Routes outgoing mail to the transport chosen by ``settings.email_provider``:

  * ``"smtp"`` -> Gmail/SMTP (no sandbox; delivers to any recipient)
  * anything else -> AWS SES (default)

The notification service calls :func:`send_email` and stays unaware of which
backend actually delivers the message.
"""

from typing import Optional

from app.config import settings
from app.integrations.aws.ses import ses_client
from app.integrations.email.smtp_client import smtp_client


def _use_smtp() -> bool:
    """Whether SMTP is the selected transport."""
    return settings.email_provider.strip().lower() == "smtp"


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> bool:
    """Send an email via the configured transport (best-effort, never raises)."""
    client = smtp_client if _use_smtp() else ses_client
    return await client.send_email(
        to_email=to_email,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
    )
