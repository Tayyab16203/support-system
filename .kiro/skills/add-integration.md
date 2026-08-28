---
name: Add Integration
description: Skill for adding new external integrations (Jira, Discord, SES, or any new third-party service)
---

# Skill: Add External Integration

## When to Use

Use this skill when:
- Adding a new third-party integration (Jira, Discord, SES, Slack, etc.)
- Modifying an existing integration's behavior
- Adding new event triggers to existing integrations
- Debugging integration failures

## Integration Module Structure

Every integration follows the same pattern:

```
backend/app/integrations/{service_name}/
├── __init__.py
├── client.py      # Low-level API client (HTTP calls)
└── service.py     # Business logic (when to call, what to send)
```

### client.py — API Client

- Handles HTTP communication with the external service
- Uses `httpx.AsyncClient` (NEVER `requests`)
- Accepts configuration via constructor (base_url, credentials)
- Methods map 1:1 to API operations
- Returns raw response data (dict/list)
- Handles retries and timeouts
- Raises specific exceptions on failure

```python
import httpx
from app.config import settings

class JiraClient:
    def __init__(self):
        self.base_url = settings.jira_base_url
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            auth=(settings.jira_email, settings.jira_api_token),
            timeout=30.0
        )

    async def create_issue(self, project_key: str, summary: str, description: str, issue_type: str = "Task") -> dict:
        """Create a Jira issue. Returns issue data with key."""
        payload = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "description": description,
                "issuetype": {"name": issue_type}
            }
        }
        response = await self.client.post("/rest/api/3/issue", json=payload)
        response.raise_for_status()
        return response.json()
```

### service.py — Business Logic

- Decides WHEN to call the client
- Maps internal domain objects to external API formats
- Handles graceful failures (log + continue, never block main flow)
- Called from ticket_service or other services via BackgroundTasks

```python
from app.integrations.jira.client import JiraClient
from app.core.logging import logger

class JiraService:
    def __init__(self):
        self.client = JiraClient()

    async def sync_ticket_to_jira(self, ticket: Ticket, project: Project) -> Optional[str]:
        """Create/update Jira issue from internal ticket. Returns jira_key or None."""
        if not project.jira_project_key:
            return None  # Project not configured for Jira

        try:
            result = await self.client.create_issue(
                project_key=project.jira_project_key,
                summary=ticket.title,
                description=ticket.description,
            )
            return result["key"]
        except Exception as e:
            logger.error(f"Jira sync failed for ticket {ticket.id}: {e}")
            return None  # Graceful failure — don't block ticket creation
```

## Implementation Steps

### 1. Create the Integration Module

```
backend/app/integrations/{new_service}/
├── __init__.py
├── client.py
└── service.py
```

### 2. Add Configuration

In `backend/app/config.py`:
```python
class Settings(BaseSettings):
    # ... existing settings ...
    new_service_api_key: str = ""
    new_service_base_url: str = ""
```

In `.env.example`:
```env
NEW_SERVICE_API_KEY=
NEW_SERVICE_BASE_URL=
```

### 3. Implement Client (client.py)

- Use `httpx.AsyncClient`
- Set reasonable timeout (30s default)
- Add type hints to all methods
- Handle HTTP errors explicitly

### 4. Implement Service (service.py)

- Import and use the client
- Add conditional checks (is integration configured for this project?)
- Wrap ALL external calls in try/except
- Log errors but NEVER raise — integrations must not block main operations
- Return meaningful result (success/failure indicator)

### 5. Wire into Ticket Service

In `backend/app/services/ticket_service.py`:
```python
from fastapi import BackgroundTasks

async def create_ticket(self, data: TicketCreate, user: User, background_tasks: BackgroundTasks):
    ticket = await self.repo.create(data)

    # Trigger integrations (non-blocking)
    background_tasks.add_task(self.jira_service.sync_ticket_to_jira, ticket, project)
    background_tasks.add_task(self.discord_service.notify_ticket_created, ticket, project)

    return ticket
```

### 6. Add Tests

```python
# tests/integrations/test_new_service.py
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_integration_graceful_failure():
    """Integration failure should not raise, just log."""
    service = NewService()
    with patch.object(service.client, 'api_method', side_effect=Exception("API down")):
        result = await service.do_something(ticket, project)
        assert result is None  # Graceful failure
```

## Rules

1. **MUST use BackgroundTasks** — Integration calls happen AFTER the main response is sent
2. **MUST handle failures gracefully** — Log the error, return None, never raise
3. **MUST be conditional** — Check if the project has the integration configured before calling
4. **MUST use httpx.AsyncClient** — Never use synchronous `requests` library
5. **MUST log all failures** — Use structured logging with context (ticket_id, project_id, error)
6. **MUST write to audit log** — Record integration events (success and failure)
7. **MUST respect per-project configuration** — Jira key and Discord webhook come from the project record, not global config
8. **MUST set timeouts** — Default 30s, never wait indefinitely for external services

## Per-Project Configuration

Integrations are configured per project in the `projects` table:

| Field | Integration | Description |
|-------|-------------|-------------|
| jira_project_key | Jira | The Jira project key (e.g., "ALPHA") |
| discord_webhook_url | Discord | The Discord channel webhook URL |
| email_enabled | SES | Whether to send emails for this project |

Global credentials (API tokens, base URLs) are in `.env`. Per-project configuration is in the database.

## Adding a Completely New Integration

If adding a service not yet in the codebase (e.g., Slack):

1. Create `backend/app/integrations/slack/__init__.py`
2. Create `backend/app/integrations/slack/client.py` (Slack API calls)
3. Create `backend/app/integrations/slack/service.py` (business logic)
4. Add config to `backend/app/config.py` (global creds)
5. Add column to `projects` table if per-project config needed (e.g., `slack_webhook_url`)
6. Update `docs/DATABASE_SCHEMA.md`
7. Wire into ticket_service via BackgroundTasks
8. Add tests with mocked client
9. Update `docs/ARCHITECTURE.md` integration section
