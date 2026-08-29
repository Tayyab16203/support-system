"""Parse @mentions out of free-text comment bodies.

Comments are plain text typed into a textarea (no rich mention picker), so a
mention is written as ``@`` immediately followed by the mentioned person's
email address, e.g. ``@jane@example.com``. Matching on email keeps mentions
unambiguous — display names are not unique, but emails are.

The parser is deliberately conservative: it only accepts the common email
shape (``local@domain.tld``) so ordinary prose containing an ``@`` (or a
trailing ``@`` with no address) is ignored.
"""

import re

# ``@`` followed by a plausible email. The leading ``(?<![^\s(])`` guard keeps
# the ``@`` from matching mid-word (e.g. inside an already-written address),
# allowing a mention only at the start of the text or after whitespace / "(".
_MENTION_RE = re.compile(
    r"(?<![^\s(])@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})"
)


def parse_mention_emails(text: str) -> list[str]:
    """Extract mentioned email addresses from comment text.

    Args:
        text: The raw comment body.

    Returns:
        A list of unique, lowercased email addresses in first-seen order.
        Empty when the text has no valid mentions.
    """
    if not text:
        return []

    seen: set[str] = set()
    emails: list[str] = []
    for match in _MENTION_RE.finditer(text):
        email = match.group(1).strip().lower()
        if email and email not in seen:
            seen.add(email)
            emails.append(email)
    return emails
