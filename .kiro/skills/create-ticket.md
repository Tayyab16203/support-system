---
name: Create Ticket Feature
description: Skill for creating or modifying ticket-related code (backend endpoints, services, repos, frontend forms, tables)
---

# Skill: Create / Modify Ticket Features

## When to Use

Use this skill when:
- Adding new ticket-related functionality (new fields, new status, new type)
- Modifying ticket CRUD operations
- Adding ticket filtering, sorting, or pagination logic
- Building ticket UI components (form, table, detail, timeline)
- Implementing ticket status transitions
- Adding bulk operations on tickets

## Context Files

Always review these before making ticket changes:
- `backend/app/schemas/ticket.py` — Request/response models
- `backend/app/services/ticket_service.py` — Business logic
- `backend/app/db/repositories/ticket_repo.py` — Data access
- `backend/app/api/v1/endpoints/tickets.py` — HTTP handlers
- `frontend/src/types/ticket.ts` — TypeScript types
- `frontend/src/components/tickets/` — UI components
- `docs/API_SPEC.md` — API contract
- `docs/DATABASE_SCHEMA.md` — Table structure

## Implementation Steps

### Backend Changes

1. **Schema** (`backend/app/schemas/ticket.py`)
   - Add/update Pydantic models (TicketCreate, TicketUpdate, TicketResponse)
   - Include proper validation (min/max length, enum checks)
   - Add new fields to response model if needed

2. **Repository** (`backend/app/db/repositories/ticket_repo.py`)
   - Add/update data access methods
   - Ensure all queries filter by `project_id` (multi-tenant)
   - Handle pagination (offset, limit, total count)

3. **Service** (`backend/app/services/ticket_service.py`)
   - Implement business logic
   - Call activity_service to log changes (ALWAYS)
   - Trigger integrations via BackgroundTasks:
     - Jira sync (if project has jira_project_key)
     - Discord notification (if project has discord_webhook_url)
     - Email notification (if status changed and email_enabled)
   - Call audit logger for audit trail

4. **Endpoint** (`backend/app/api/v1/endpoints/tickets.py`)
   - Thin handler: validate input → call service → return response
   - Include `get_current_user` dependency
   - Include `get_current_project` dependency
   - Use proper HTTP status codes (201 for create, 204 for delete)

### Frontend Changes

5. **Types** (`frontend/src/types/ticket.ts`)
   - Update TypeScript interfaces to match backend response

6. **API** (`frontend/src/lib/api.ts`)
   - Add/update API call functions

7. **Components** (`frontend/src/components/tickets/`)
   - Update form, table, or detail components
   - Include loading and error states
   - Validate inputs client-side with Zod

8. **Hooks** (`frontend/src/hooks/useTickets.ts`)
   - Update React Query queries/mutations

### Database (if schema change)

9. **Migration** — Update `docs/DATABASE_SCHEMA.md` and create migration SQL
10. **Apply** — Run migration in Supabase SQL editor

## Required Side Effects

Every ticket mutation MUST trigger:

| Action | Activity Log | Audit Log | Jira | Discord | Email |
|--------|:---:|:---:|:---:|:---:|:---:|
| Create | ✅ | ✅ | ✅ | ✅ | ✅ (confirmation) |
| Update fields | ✅ | ✅ | ❌ | ❌ | ❌ |
| Status change | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assign | ✅ | ✅ | ❌ | ✅ | ✅ (to assignee) |
| Delete | ❌ | ✅ | ❌ | ❌ | ❌ |
| Comment | ✅ | ✅ | ❌ | ❌ | ❌ |
| File upload | ✅ | ✅ | ❌ | ❌ | ❌ |

## Validation Rules

- `title`: required, min 5 chars, max 200 chars
- `description`: required, min 10 chars
- `type`: must be one of: technical_error, bug, feature, remove
- `priority`: must be one of: critical, high, medium, low
- `status`: must be one of: pending, in_progress, paused, in_review, completed
- `assigned_to`: must be a valid user UUID (or null)
- `project_id`: must be a valid project the user has access to

## Status Transition Rules

```
pending → in_progress, paused, completed
in_progress → paused, in_review, completed
paused → in_progress, completed
in_review → in_progress, completed
completed → (no transitions, terminal state — unless admin reopens)
```

## Testing Requirements

- Unit test for service logic (mock repo + integrations)
- Integration test for endpoint (mock Supabase, test HTTP responses)
- Test validation errors return 400 with proper error format
- Test that activities are created on mutations
- Test project scoping (can't access other project's tickets)
- Frontend: test form submission and validation display

## Example: Adding a New Ticket Field

If you need to add a field (e.g., `due_date`):

1. Add column to `tickets` table in Supabase
2. Update `docs/DATABASE_SCHEMA.md`
3. Add to `TicketCreate`, `TicketUpdate`, `TicketResponse` schemas
4. Update repository if field needs special handling
5. Update service if field has business rules
6. Add to frontend `Ticket` type
7. Add input to `TicketForm` component
8. Add column to `TicketTable` component
9. Update API spec documentation
