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
from app.core.mentions import parse_mention_emails
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
        """Email admins about the new ticket and confirm receipt to the owner.

        Admins get an alert (minus the actor). The ticket owner (creator) also
        gets a confirmation that their ticket was received, including its
        current status and assignee — the first of the running updates they
        receive for the lifetime of the ticket.
        """
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

        # Confirm to the owner that their ticket was received.
        assignee = ticket.get("assigned_to_user") or {}
        owner_email = await self._notify_owner(
            ticket,
            email_templates.owner_ticket_created_email(
                ticket_id=str(ticket_id),
                ticket_title=ticket.get("title", "your ticket"),
                ticket_type=str(ticket.get("type", "")),
                priority=str(ticket.get("priority", "")),
                status=str(ticket.get("status", "")),
                assignee_name=assignee.get("name"),
            ),
            ticket_id,
            "created_owner",
        )

        # Alert admins (the owner already got their own confirmation above, so
        # exclude them from the admin broadcast to avoid a duplicate).
        admins = await self.user_repo.list_admins()
        exclude = {owner_email} if owner_email else set()
        recipients = [
            u
            for u in self._eligible_recipients(admins, exclude_actor=actor_id)
            if (u.get("email") or "").strip().lower() not in exclude
        ]
        await self._broadcast(recipients, email, ticket_id, "created")

    async def notify_ticket_updated(
        self,
        ticket_id: UUID,
        changes: dict[str, dict],
        actor_id: UUID,
    ) -> None:
        """Email the owner (and other stakeholders) about field changes.

        Covers edits that are not already delivered by a dedicated template
        (status/assignment/completion): title, description, type, priority,
        and tags. ``changes`` maps each changed field to ``{"old", "new"}``.
        The owner is always notified — even when they made the change.
        """
        if not changes:
            return

        ticket = await self._load_ticket(ticket_id)
        if ticket is None or not await self._project_email_enabled(ticket):
            return

        actor_name = await self._resolve_name(actor_id)
        email = email_templates.ticket_updated_email(
            ticket_id=str(ticket_id),
            ticket_title=ticket.get("title", "your ticket"),
            changes=changes,
            actor_name=actor_name,
        )

        owner_email = await self._notify_owner(ticket, email, ticket_id, "updated")
        exclude = {owner_email} if owner_email else None
        recipients = self._stakeholders(
            ticket, exclude_actor=actor_id, exclude_emails=exclude
        )
        await self._broadcast(recipients, email, ticket_id, "updated")

    async def notify_owner_assignee_changed(
        self,
        ticket_id: UUID,
        old_assignee_name: Optional[str],
        new_assignee_name: Optional[str],
        actor_id: UUID,
    ) -> None:
        """Tell the owner who their ticket is now assigned to (or unassigned).

        The new assignee gets their own dedicated "assigned to you" email via
        :meth:`notify_ticket_assigned`; this keeps the *owner* informed of the
        change too, using readable names. Only the owner is emailed here.
        """
        ticket = await self._load_ticket(ticket_id)
        if ticket is None or not await self._project_email_enabled(ticket):
            return

        actor_name = await self._resolve_name(actor_id)
        email = email_templates.ticket_updated_email(
            ticket_id=str(ticket_id),
            ticket_title=ticket.get("title", "your ticket"),
            changes={
                "assignee": {
                    "old": old_assignee_name or "Unassigned",
                    "new": new_assignee_name or "Unassigned",
                }
            },
            actor_name=actor_name,
        )
        await self._notify_owner(ticket, email, ticket_id, "assignee_changed")

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

        # The owner is always notified about their ticket (even if they made
        # the change); other stakeholders are notified minus the actor and
        # minus the owner (already emailed) to avoid duplicates.
        owner_email = await self._notify_owner(
            ticket, email, ticket_id, "status_changed"
        )
        exclude = {owner_email} if owner_email else None
        recipients = self._stakeholders(
            ticket, exclude_actor=actor_id, exclude_emails=exclude
        )
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

        # Owner always hears about completion of their own ticket.
        owner_email = await self._notify_owner(ticket, email, ticket_id, "completed")
        exclude = {owner_email} if owner_email else None
        recipients = self._stakeholders(
            ticket, exclude_actor=actor_id, exclude_emails=exclude
        )
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

    async def notify_comment_added(
        self, ticket_id: UUID, actor_id: UUID, comment: str
    ) -> None:
        """Email stakeholders and @mentioned users when a comment is posted.

        Recipients:
          * anyone @mentioned in the comment body (by email) gets a dedicated
            "you were mentioned" email — minus the commenter themselves;
          * the ticket creator and assignee get a generic "new comment" email,
            minus the commenter and minus anyone already emailed as a mention
            (so a mentioned stakeholder is not emailed twice).

        Like every handler here this is best-effort and honors both the
        project kill switch and each recipient's unsubscribe flag.
        """
        ticket = await self._load_ticket(ticket_id)
        if ticket is None or not await self._project_email_enabled(ticket):
            return

        actor_name = await self._resolve_name(actor_id)
        ticket_title = ticket.get("title", "a ticket")

        # 1) Mentioned users first, so we can exclude them from the generic
        #    stakeholder broadcast below and avoid duplicate emails.
        mentioned_emails = await self._notify_mentioned(
            ticket_id=ticket_id,
            ticket_title=ticket_title,
            comment=comment,
            actor_id=actor_id,
            actor_name=actor_name,
        )

        # 2) Creator + assignee (minus the commenter, minus mentioned people).
        email = email_templates.comment_added_email(
            ticket_id=str(ticket_id),
            ticket_title=ticket_title,
            comment=comment,
            actor_name=actor_name,
        )
        recipients = self._stakeholders(
            ticket, exclude_actor=actor_id, exclude_emails=mentioned_emails or None
        )
        await self._broadcast(recipients, email, ticket_id, "comment")

    async def _notify_mentioned(
        self,
        ticket_id: UUID,
        ticket_title: str,
        comment: str,
        actor_id: UUID,
        actor_name: Optional[str],
    ) -> set[str]:
        """Email each @mentioned user with the dedicated mention template.

        Parses ``@email`` tokens out of the comment, resolves them to users,
        drops the commenter and opted-out users, and sends one mention email
        each. Returns the set of lowercased emails that were notified so the
        caller can skip them in the general stakeholder broadcast.
        """
        emails = parse_mention_emails(comment)
        if not emails:
            return set()

        users = await self.user_repo.list_by_emails(emails)
        recipients = self._eligible_recipients(users, exclude_actor=actor_id)
        notified: set[str] = set()
        for user in recipients:
            recipient = (user.get("email") or "").strip()
            if not recipient:
                continue
            email = email_templates.comment_mention_email(
                ticket_id=str(ticket_id),
                ticket_title=ticket_title,
                comment=comment,
                mentioned_name=user.get("name") or "there",
                actor_name=actor_name,
            )
            await self._send(recipient, email, ticket_id, "comment_mention")
            notified.add(recipient.lower())
        return notified

    # -- recipient resolution ----------------------------------------------

    async def _notify_owner(
        self,
        ticket: dict,
        email: RenderedEmail,
        ticket_id: UUID,
        event: str,
    ) -> Optional[str]:
        """Send an email to the ticket's owner (creator), even if they acted.

        The owner (``created_by``) is always kept in the loop on their own
        ticket — unlike stakeholders, they are NOT excluded when they are the
        actor. Their per-user unsubscribe (``email_notifications``) is still
        honored; the project kill switch is checked by the calling handler.

        Returns the owner's lowercased email when a send was attempted, so the
        caller can exclude it from any follow-up stakeholder broadcast and
        avoid a duplicate email.
        """
        owner = ticket.get("created_by_user")
        if not owner:
            return None
        recipient = (owner.get("email") or "").strip()
        if not recipient or not self._user_allows(owner):
            return None
        await self._send(recipient, email, ticket_id, event)
        return recipient.lower()

    def _stakeholders(
        self,
        ticket: dict,
        exclude_actor: UUID,
        exclude_emails: Optional[set[str]] = None,
    ) -> list[dict]:
        """Collect the creator + assignee user records, minus the actor.

        Uses the nested relations already embedded on the ticket
        (``created_by_user`` / ``assigned_to_user``), so no extra queries.
        ``exclude_emails`` (lowercased) drops recipients already emailed
        elsewhere (e.g. the owner via :meth:`_notify_owner`).
        """
        candidates: list[Optional[dict]] = [
            ticket.get("created_by_user"),
            ticket.get("assigned_to_user"),
        ]
        eligible = self._eligible_recipients(
            [c for c in candidates if c], exclude_actor=exclude_actor
        )
        if exclude_emails:
            eligible = [
                u
                for u in eligible
                if (u.get("email") or "").strip().lower() not in exclude_emails
            ]
        return eligible

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
