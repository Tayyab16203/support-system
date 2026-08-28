"""Email notification service via AWS SES.

Actor-aware, recipient-based notifications modeled on Jira: an event is
attributed to the user who caused it (the "actor"), and everyone *involved*
with the ticket is notified — except the actor, who already knows what they
did. Recipients are de-duplicated by email.

Events and their recipients:
  * ticket created   -> all admins (minus the actor)
  * status changed   -> creator + assignee (minus the actor)
  * ticket completed -> creator + assignee (minus the actor)
  * ticket assigned  -> the new assignee (unless self-assigned)

All public methods are best-effort and never raise: they run inside FastAPI
``BackgroundTasks`` where an exception would be lost or noisy.

Two opt-outs gate every send:
  * ``project.email_enabled`` — a project-level kill switch.
  * ``user.email_notifications`` — a per-recipient unsubscribe flag.

If SES has no configured sender (``SES_FROM_EMAIL`` empty), sends are no-ops.
"""

from typing import Optional
from uuid import UUID

from app.core.logging import get_logger
from app.db.repositories.project_repo import ProjectRepo
from app.db.repositories.ticket_repo import TicketRepo
from app.db.repositories.user_repo import UserRepo
from app.integrations.aws import email_templates
from app.integrations.aws.email_templates import RenderedEmail
from app.integrations.email import sender as email_sender

logger = get_logger(__name__)


class NotificationService:
    """Business logic for actor-aware ticket email notifications."""

    def __init__(self) -> None:
        self.ticket_repo = TicketRepo()
        self.user_repo = UserRepo()
        self.project_repo = ProjectRepo()

    # -- public event handlers ---------------------------------------------

    async def notify_ticket_created(
        self, ticket_id: UUID, actor_id: UUID
    ) -> None:
        """Email all admins that a new ticket was created."""
        ticket = await self._load_ticket(ticket_id)
        if ticket is None or not await self._project_email_enabled(ticket):
            return

        actor_name = await self._resolve_name(actor_id)
        email = email_templates.ticket_created_email(
            ticket_id=str(ticket_id),
            ticket_title=ticket.get("title", "a ticket"),
            ticket_type=str(ticket.get("type", "")),
            priority=str(ticket.get("priority", "")),
            actor_name=actor_name,
        )

        admins = await self.user_repo.list_admins()
        recipients = self._eligible_recipients(admins, exclude_actor=actor_id)
        await self._broadcast(recipients, email, ticket_id, "created")

    async def notify_status_changed(
        self,
        ticket_id: UUID,
        old_status: str,
        new_status: str,
        actor_id: UUID,
    ) -> None:
        """Email the creator and assignee that the status changed.

        A move to ``completed`` is delivered by :meth:`notify_ticket_completed`
        (a dedicated template), so this skips that transition to avoid two
        emails for one change.
        """
        if new_status == "completed":
            return

        ticket = await self._load_ticket(ticket_id)
        if ticket is None or not await self._project_email_enabled(ticket):
            return

        actor_name = await self._resolve_name(actor_id)
        email = email_templates.status_changed_email(
            ticket_id=str(ticket_id),
            ticket_title=ticket.get("title", "your ticket"),
            old_status=old_status,
            new_status=new_status,
            actor_name=actor_name,
        )

        recipients = self._stakeholders(ticket, exclude_actor=actor_id)
        await self._broadcast(recipients, email, ticket_id, "status_changed")

    async def notify_ticket_completed(
        self, ticket_id: UUID, actor_id: UUID
    ) -> None:
        """Email the creator and assignee that the ticket was completed."""
        ticket = await self._load_ticket(ticket_id)
        if ticket is None or not await self._project_email_enabled(ticket):
            return

        actor_name = await self._resolve_name(actor_id)
        email = email_templates.completed_email(
            ticket_id=str(ticket_id),
            ticket_title=ticket.get("title", "your ticket"),
            actor_name=actor_name,
        )

        recipients = self._stakeholders(ticket, exclude_actor=actor_id)
        await self._broadcast(recipients, email, ticket_id, "completed")

    async def notify_ticket_assigned(
        self, ticket_id: UUID, assignee_id: UUID, actor_id: UUID
    ) -> None:
        """Email the newly assigned user, unless they assigned it to themselves."""
        if str(assignee_id) == str(actor_id):
            return

        ticket = await self._load_ticket(ticket_id)
        if ticket is None or not await self._project_email_enabled(ticket):
            return

        assignee = await self.user_repo.get_by_id(assignee_id)
        if not assignee:
            return
        recipient = assignee.get("email")
        if not recipient or not self._user_allows(assignee):
            return

        actor_name = await self._resolve_name(actor_id)
        email = email_templates.assigned_email(
            ticket_id=str(ticket_id),
            ticket_title=ticket.get("title", "a ticket"),
            assignee_name=assignee.get("name") or "there",
            actor_name=actor_name,
        )
        await self._send(recipient, email, ticket_id, "assigned")

    # -- recipient resolution ----------------------------------------------

    def _stakeholders(self, ticket: dict, exclude_actor: UUID) -> list[dict]:
        """Collect the creator + assignee user records, minus the actor.

        Uses the nested relations already embedded on the ticket
        (``created_by_user`` / ``assigned_to_user``), so no extra queries.
        """
        candidates: list[Optional[dict]] = [
            ticket.get("created_by_user"),
            ticket.get("assigned_to_user"),
        ]
        return self._eligible_recipients(
            [c for c in candidates if c], exclude_actor=exclude_actor
        )

    def _eligible_recipients(
        self, users: list[dict], exclude_actor: UUID
    ) -> list[dict]:
        """Filter users to those who should actually receive an email.

        Drops the actor, anyone without an email, anyone who opted out, and
        de-duplicates by lowercased email so a person who is both creator and
        assignee is emailed once.
        """
        seen: set[str] = set()
        eligible: list[dict] = []
        actor = str(exclude_actor)
        for user in users:
            if str(user.get("id")) == actor:
                continue
            email = (user.get("email") or "").strip()
            if not email or not self._user_allows(user):
                continue
            key = email.lower()
            if key in seen:
                continue
            seen.add(key)
            eligible.append(user)
        return eligible

    @staticmethod
    def _user_allows(user: dict) -> bool:
        """Whether the user has email notifications enabled (defaults to on)."""
        return user.get("email_notifications", True) is not False

    async def _resolve_name(self, user_id: Optional[UUID]) -> Optional[str]:
        """Resolve a user id to a display name for actor attribution."""
        if not user_id:
            return None
        try:
            user = await self.user_repo.get_by_id(UUID(str(user_id)))
        except (ValueError, TypeError):
            return None
        return user.get("name") if user else None

    # -- infrastructure ----------------------------------------------------

    async def _load_ticket(self, ticket_id: UUID) -> Optional[dict]:
        """Fetch the ticket with its related user records (creator/assignee)."""
        return await self.ticket_repo.get_with_relations(ticket_id)

    async def _project_email_enabled(self, ticket: dict) -> bool:
        """Look up the ticket's project and check its email kill switch."""
        project_id = ticket.get("project_id")
        if not project_id:
            return False
        try:
            project = await self.project_repo.get_by_id(UUID(str(project_id)))
        except (ValueError, TypeError):
            return False
        if not project:
            return False
        return project.get("email_enabled", True) is not False

    async def _broadcast(
        self,
        recipients: list[dict],
        email: RenderedEmail,
        ticket_id: UUID,
        event: str,
    ) -> None:
        """Send one rendered email to every eligible recipient."""
        for user in recipients:
            recipient = user.get("email")
            if recipient:
                await self._send(recipient, email, ticket_id, event)

    async def _send(
        self,
        recipient: str,
        email: RenderedEmail,
        ticket_id: UUID,
        event: str,
    ) -> None:
        """Dispatch a rendered email and log the outcome."""
        sent = await email_sender.send_email(
            to_email=recipient,
            subject=email.subject,
            html_body=email.html_body,
            text_body=email.text_body,
        )
        logger.info(
            "notification_dispatched",
            extra={
                "resource": {
                    "ticket_id": str(ticket_id),
                    "event": event,
                    "sent": sent,
                }
            },
        )
