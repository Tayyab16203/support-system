"""HTML/text email templates for ticket notifications.

Each builder returns a ``RenderedEmail`` (subject, html_body, text_body) ready
to hand to :meth:`SESClient.send_email`. Templates are intentionally
dependency-free (no Jinja) — notification volume is low and the markup is
simple, so plain f-strings keep things transparent and fast.
"""

from html import escape
from typing import NamedTuple, Optional

from app.config import settings

# Human-readable labels for the internal status enum values.
STATUS_LABELS: dict[str, str] = {
    "pending": "Pending",
    "in_progress": "In Progress",
    "paused": "Paused",
    "in_review": "In Review",
    "completed": "Completed",
}


class RenderedEmail(NamedTuple):
    """A fully rendered email ready to send."""

    subject: str
    html_body: str
    text_body: str


def _status_label(status: str) -> str:
    """Map an internal status value to its display label."""
    return STATUS_LABELS.get(status, status.replace("_", " ").title())


def _ticket_url(ticket_id: str) -> str:
    """Build a link to the ticket detail page in the frontend."""
    base = settings.app_url.rstrip("/")
    return f"{base}/tickets/{ticket_id}"


def _layout(heading: str, body_html: str, ticket_id: str) -> str:
    """Wrap content in a shared responsive HTML layout with a CTA button."""
    url = escape(_ticket_url(ticket_id))
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#1e293b;padding:20px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:600;">Support System</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">{escape(heading)}</h1>
              {body_html}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:8px;background-color:#2563eb;">
                    <a href="{url}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View Ticket</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You are receiving this because you are involved with this ticket.
                Manage your email preferences in your account settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _actor_prefix(actor_name: Optional[str]) -> str:
    """Render the acting user's name, falling back to "Someone"."""
    return escape(actor_name) if actor_name else "Someone"


def status_changed_email(
    *,
    ticket_id: str,
    ticket_title: str,
    old_status: str,
    new_status: str,
    actor_name: Optional[str] = None,
) -> RenderedEmail:
    """Build the email sent when a ticket's status changes.

    Attributes the change to ``actor_name`` (Jira-style "X changed …") so
    recipients know who acted.
    """
    title = escape(ticket_title)
    actor = _actor_prefix(actor_name)
    old_label = _status_label(old_status)
    new_label = _status_label(new_status)

    body_html = (
        f'<p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">'
        f"<strong>{actor}</strong> changed the status of "
        f"<strong>{title}</strong>.</p>"
        f'<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">'
        f'<span style="color:#64748b;">{escape(old_label)}</span> '
        f'&rarr; <strong style="color:#0f172a;">{escape(new_label)}</strong></p>'
    )
    text_body = (
        f'{actor_name or "Someone"} changed the status of "{ticket_title}" '
        f"from {old_label} to {new_label}.\n\n"
        f"View the ticket: {_ticket_url(ticket_id)}"
    )
    return RenderedEmail(
        subject=f"[Ticket] Status updated: {ticket_title}",
        html_body=_layout("Ticket status updated", body_html, ticket_id),
        text_body=text_body,
    )


def assigned_email(
    *,
    ticket_id: str,
    ticket_title: str,
    assignee_name: str,
    actor_name: Optional[str] = None,
) -> RenderedEmail:
    """Build the email sent to a user when a ticket is assigned to them.

    Attributes the assignment to ``actor_name`` ("X assigned this ticket to
    you"), matching the requested Jira-like behavior.
    """
    title = escape(ticket_title)
    name = escape(assignee_name)
    actor = _actor_prefix(actor_name)

    body_html = (
        f'<p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">'
        f"Hi {name}, <strong>{actor}</strong> assigned a ticket to you.</p>"
        f'<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">'
        f"<strong>{title}</strong></p>"
    )
    text_body = (
        f'Hi {assignee_name}, {actor_name or "someone"} assigned the ticket '
        f'"{ticket_title}" to you.\n\nView the ticket: {_ticket_url(ticket_id)}'
    )
    return RenderedEmail(
        subject=f"[Ticket] Assigned to you: {ticket_title}",
        html_body=_layout("A ticket was assigned to you", body_html, ticket_id),
        text_body=text_body,
    )


def completed_email(
    *,
    ticket_id: str,
    ticket_title: str,
    actor_name: Optional[str] = None,
) -> RenderedEmail:
    """Build the email sent when a ticket is completed."""
    title = escape(ticket_title)
    actor = _actor_prefix(actor_name)

    body_html = (
        f'<p style="margin:0;font-size:14px;color:#334155;line-height:1.6;">'
        f"<strong>{actor}</strong> marked <strong>{title}</strong> as "
        f'<strong style="color:#16a34a;">Completed</strong>.</p>'
    )
    text_body = (
        f'{actor_name or "Someone"} marked "{ticket_title}" as Completed.\n\n'
        f"View the ticket: {_ticket_url(ticket_id)}"
    )
    return RenderedEmail(
        subject=f"[Ticket] Completed: {ticket_title}",
        html_body=_layout("Ticket completed", body_html, ticket_id),
        text_body=text_body,
    )


def ticket_created_email(
    *,
    ticket_id: str,
    ticket_title: str,
    ticket_type: str,
    priority: str,
    actor_name: Optional[str] = None,
) -> RenderedEmail:
    """Build the email sent to admins when a new ticket is created."""
    title = escape(ticket_title)
    actor = _actor_prefix(actor_name)
    type_label = _status_label(ticket_type)
    priority_label = _status_label(priority)

    body_html = (
        f'<p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">'
        f"<strong>{actor}</strong> created a new ticket.</p>"
        f'<p style="margin:0 0 4px;font-size:14px;color:#0f172a;line-height:1.6;">'
        f"<strong>{title}</strong></p>"
        f'<p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">'
        f"{escape(type_label)} &middot; {escape(priority_label)} priority</p>"
    )
    text_body = (
        f'{actor_name or "Someone"} created a new ticket: "{ticket_title}" '
        f"({type_label}, {priority_label} priority).\n\n"
        f"View the ticket: {_ticket_url(ticket_id)}"
    )
    return RenderedEmail(
        subject=f"[Ticket] New ticket created: {ticket_title}",
        html_body=_layout("A new ticket was created", body_html, ticket_id),
        text_body=text_body,
    )


def _detail_row(label: str, value: str) -> str:
    """Render a single label/value line used in owner-facing summaries."""
    return (
        f'<p style="margin:0 0 4px;font-size:13px;color:#334155;line-height:1.6;">'
        f'<span style="color:#64748b;">{escape(label)}:</span> '
        f"<strong>{escape(value)}</strong></p>"
    )


def owner_ticket_created_email(
    *,
    ticket_id: str,
    ticket_title: str,
    ticket_type: str,
    priority: str,
    status: str,
    assignee_name: Optional[str] = None,
) -> RenderedEmail:
    """Confirmation sent to the ticket creator right after they open a ticket.

    Unlike :func:`ticket_created_email` (which alerts admins), this reassures
    the owner that their ticket was received and tells them its current status
    and who it is assigned to.
    """
    title = escape(ticket_title)
    type_label = _status_label(ticket_type)
    priority_label = _status_label(priority)
    status_label = _status_label(status)
    assignee = assignee_name or "Not assigned yet"

    body_html = (
        f'<p style="margin:0 0 16px;font-size:14px;color:#334155;line-height:1.6;">'
        f"Your ticket has been received. We'll keep you posted here as it "
        f"progresses.</p>"
        f'<p style="margin:0 0 12px;font-size:14px;color:#0f172a;line-height:1.6;">'
        f"<strong>{title}</strong></p>"
        + _detail_row("Type", type_label)
        + _detail_row("Priority", priority_label)
        + _detail_row("Status", status_label)
        + _detail_row("Assigned to", assignee)
    )
    text_body = (
        f'Your ticket "{ticket_title}" has been received.\n'
        f"Type: {type_label}\n"
        f"Priority: {priority_label}\n"
        f"Status: {status_label}\n"
        f"Assigned to: {assignee}\n\n"
        f"Track it here: {_ticket_url(ticket_id)}"
    )
    return RenderedEmail(
        subject=f"[Ticket] We received your ticket: {ticket_title}",
        html_body=_layout("Your ticket was created", body_html, ticket_id),
        text_body=text_body,
    )


# Human-readable labels for updatable ticket fields (used in owner update emails).
FIELD_LABELS: dict[str, str] = {
    "title": "Title",
    "description": "Description",
    "type": "Type",
    "priority": "Priority",
    "status": "Status",
    "tags": "Tags",
}


def _field_label(field: str) -> str:
    """Map an internal field name to its display label."""
    return FIELD_LABELS.get(field, field.replace("_", " ").title())


def _format_field_value(field: str, value: object) -> str:
    """Present a changed field value for display (enum labels, lists, blanks)."""
    if value is None or value == "":
        return "—"
    if isinstance(value, (list, tuple, set)):
        items = [str(v) for v in value]
        return ", ".join(items) if items else "—"
    text = str(value)
    if field in ("status", "type", "priority"):
        return _status_label(text)
    if field == "description" and len(text) > 140:
        return text[:137] + "..."
    return text


def ticket_updated_email(
    *,
    ticket_id: str,
    ticket_title: str,
    changes: dict[str, dict[str, object]],
    actor_name: Optional[str] = None,
) -> RenderedEmail:
    """Email the owner when one or more ticket fields change.

    ``changes`` maps each changed field to ``{"old": ..., "new": ...}``.
    Attributes the change to ``actor_name`` so the owner knows who acted.
    """
    title = escape(ticket_title)
    actor = _actor_prefix(actor_name)

    rows_html: list[str] = []
    text_lines: list[str] = []
    for field, change in changes.items():
        label = _field_label(field)
        old_val = _format_field_value(field, change.get("old"))
        new_val = _format_field_value(field, change.get("new"))
        rows_html.append(
            f'<p style="margin:0 0 8px;font-size:14px;color:#334155;line-height:1.6;">'
            f"<strong>{escape(label)}</strong>: "
            f'<span style="color:#64748b;">{escape(old_val)}</span> '
            f'&rarr; <strong style="color:#0f172a;">{escape(new_val)}</strong></p>'
        )
        text_lines.append(f"{label}: {old_val} -> {new_val}")

    body_html = (
        f'<p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">'
        f"<strong>{actor}</strong> updated <strong>{title}</strong>.</p>"
        + "".join(rows_html)
    )
    text_body = (
        f'{actor_name or "Someone"} updated "{ticket_title}".\n'
        + "\n".join(text_lines)
        + f"\n\nView the ticket: {_ticket_url(ticket_id)}"
    )
    return RenderedEmail(
        subject=f"[Ticket] Updated: {ticket_title}",
        html_body=_layout("Ticket updated", body_html, ticket_id),
        text_body=text_body,
    )


def _comment_excerpt(comment: str, limit: int = 400) -> str:
    """Trim a comment body for inclusion in an email, collapsing whitespace."""
    text = " ".join((comment or "").split())
    if len(text) > limit:
        return text[: limit - 1] + "…"
    return text


def _quote_block(comment: str) -> str:
    """Render a comment body as a quoted block for HTML emails."""
    return (
        f'<blockquote style="margin:0 0 4px;padding:12px 16px;'
        f"border-left:3px solid #cbd5e1;background-color:#f8fafc;"
        f'border-radius:0 8px 8px 0;font-size:14px;color:#334155;line-height:1.6;'
        f'white-space:pre-wrap;">{escape(comment)}</blockquote>'
    )


def comment_added_email(
    *,
    ticket_id: str,
    ticket_title: str,
    comment: str,
    actor_name: Optional[str] = None,
) -> RenderedEmail:
    """Build the email sent to a ticket's stakeholders when a comment is added.

    Goes to the creator and assignee (minus the commenter). Attributes the
    comment to ``actor_name`` so recipients know who wrote it.
    """
    title = escape(ticket_title)
    actor = _actor_prefix(actor_name)
    excerpt = _comment_excerpt(comment)

    body_html = (
        f'<p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">'
        f"<strong>{actor}</strong> commented on <strong>{title}</strong>.</p>"
        + _quote_block(excerpt)
    )
    text_body = (
        f'{actor_name or "Someone"} commented on "{ticket_title}":\n\n'
        f"{excerpt}\n\n"
        f"View the ticket: {_ticket_url(ticket_id)}"
    )
    return RenderedEmail(
        subject=f"[Ticket] New comment: {ticket_title}",
        html_body=_layout("New comment on a ticket", body_html, ticket_id),
        text_body=text_body,
    )


def comment_mention_email(
    *,
    ticket_id: str,
    ticket_title: str,
    comment: str,
    mentioned_name: str,
    actor_name: Optional[str] = None,
) -> RenderedEmail:
    """Build the email sent to a user who was @mentioned in a comment.

    Distinct from :func:`comment_added_email` so the mentioned person sees a
    clear "you were mentioned" message rather than a generic new-comment note.
    """
    title = escape(ticket_title)
    actor = _actor_prefix(actor_name)
    name = escape(mentioned_name)
    excerpt = _comment_excerpt(comment)

    body_html = (
        f'<p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">'
        f"Hi {name}, <strong>{actor}</strong> mentioned you in a comment on "
        f"<strong>{title}</strong>.</p>"
        + _quote_block(excerpt)
    )
    text_body = (
        f'Hi {mentioned_name}, {actor_name or "someone"} mentioned you in a '
        f'comment on "{ticket_title}":\n\n'
        f"{excerpt}\n\n"
        f"View the ticket: {_ticket_url(ticket_id)}"
    )
    return RenderedEmail(
        subject=f"[Ticket] You were mentioned: {ticket_title}",
        html_body=_layout("You were mentioned in a comment", body_html, ticket_id),
        text_body=text_body,
    )
