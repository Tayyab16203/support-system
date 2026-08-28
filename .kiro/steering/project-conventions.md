---
inclusion: auto
description: Project conventions and coding standards for the Support System
---

# Support System - Project Conventions

## Project Overview

This is a multi-project support ticket system built with:
- **Frontend:** Next.js 14 (App Router) + TailwindCSS + TypeScript
- **Backend:** FastAPI + Python 3.11+ + Pydantic v2
- **Database:** Supabase (PostgreSQL)
- **Cloud Services:** AWS (Cognito, S3, SES, CloudWatch, CloudTrail)
- **Integrations:** Jira REST API, Discord Webhooks

Reference documentation:
- #[[file:docs/IMPLEMENTATION_PLAN.md]]
- #[[file:docs/ARCHITECTURE.md]]
- #[[file:docs/API_SPEC.md]]
- #[[file:docs/DATABASE_SCHEMA.md]]

---

## Coding Standards - Frontend (TypeScript / Next.js)

### File Naming
- Components: PascalCase (`TicketForm.tsx`, `KPICard.tsx`)
- Pages: `page.tsx` (Next.js App Router convention)
- Hooks: camelCase with `use` prefix (`useTickets.ts`, `useAuth.ts`)
- Utilities: camelCase (`api.ts`, `utils.ts`)
- Types: camelCase file, PascalCase exports (`ticket.ts` exports `Ticket`, `TicketCreate`)

### Component Patterns
- Use functional components with TypeScript interfaces for props
- Define prop types with `interface` (not `type`) for component props
- Export components as named exports (not default) except for page components
- Colocate component-specific types in the same file
- Use `"use client"` directive only when needed (event handlers, hooks, browser APIs)

```typescript
// Good
interface TicketFormProps {
  projectId: string;
  onSuccess: (ticket: Ticket) => void;
}

export function TicketForm({ projectId, onSuccess }: TicketFormProps) { ... }
```

### State Management
- Use React Query (TanStack Query) for server state
- Use React Context for auth and global app state
- Use `useState` / `useReducer` for local component state
- No Redux — keep it simple

### Styling
- Use TailwindCSS utility classes exclusively
- No CSS modules or styled-components
- Extract repeated patterns into reusable components (not utility classes)
- Use `cn()` helper (clsx + tailwind-merge) for conditional classes

### Imports
- Use absolute imports with `@/` prefix (configured in tsconfig)
- Group imports: React → Next.js → libraries → local components → types

```typescript
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { TicketTable } from "@/components/tickets/TicketTable";
import type { Ticket } from "@/types/ticket";
```

---

## Coding Standards - Backend (Python / FastAPI)

### File Naming
- All files: snake_case (`ticket_service.py`, `base_repo.py`)
- Classes: PascalCase (`TicketService`, `BaseRepository`)
- Functions/methods: snake_case (`create_ticket`, `get_by_id`)
- Constants: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `ALLOWED_CONTENT_TYPES`)

### Architecture Pattern (Layered)
Always follow: **Endpoint → Service → Repository**

```
Endpoint (thin handler)
  ↓ receives request, calls service, returns response
Service (business logic)
  ↓ orchestrates repos + integrations, applies rules
Repository (data access)
  ↓ talks to Supabase, returns domain objects
```

- Endpoints should NEVER contain business logic or direct DB calls
- Services should NEVER import from `fastapi` (no Request, Response, etc.)
- Repositories should NEVER contain business logic

### Type Hints
- ALL function signatures must have full type hints (params + return)
- Use `Optional[T]` for nullable parameters
- Use Pydantic models for request/response validation

```python
# Good
async def create_ticket(self, data: TicketCreate, user_id: UUID) -> Ticket:
    ...

# Bad
async def create_ticket(self, data, user_id):
    ...
```

### Async
- ALL endpoint handlers must be `async def`
- ALL service methods must be `async def`
- ALL repository methods must be `async def`
- Use `httpx.AsyncClient` for external API calls (never `requests`)

### Error Handling
- Raise custom exceptions from services (never raw HTTPException)
- Map exceptions to HTTP responses in a global exception handler
- Always log errors with context (user_id, resource_id, action)

```python
# In services:
raise TicketNotFoundError(ticket_id=ticket_id)

# In core/exceptions.py:
class TicketNotFoundError(AppException):
    status_code = 404
    error_code = "TICKET_NOT_FOUND"
```

### Dependencies
- Use FastAPI's `Depends()` for all shared logic (auth, project context, DB)
- Never instantiate services/repos inside endpoints — inject them

---

## API Response Format

All API responses follow this consistent format:

```python
# Success (single resource)
{"data": {...}, "message": "Success"}

# Success (list)
{"data": [...], "pagination": {"total": N, "page": 1, "page_size": 20, "total_pages": M}}

# Error
{"error": "ERROR_CODE", "message": "Human-readable message", "details": {...}}
```

---

## Git Conventions

### Branch Naming
```
feature/{step-number}-{short-description}
fix/{issue-description}
refactor/{what-is-being-refactored}
```

Examples:
- `feature/step-5-ticket-crud`
- `fix/search-pagination-bug`
- `refactor/move-auth-to-middleware`

### Commit Messages
Format: `type(scope): description`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`

```
feat(tickets): add ticket creation endpoint with validation
fix(auth): handle expired token refresh correctly
docs(api): update search endpoint response format
test(bulk): add tests for bulk status change
chore(deps): update fastapi to 0.110.0
```

### PR Guidelines
- One PR per implementation step (from BUILD_SEQUENCE.md)
- PR title = commit type format
- PR description = what changed + what was tested
- Keep PRs focused — don't mix features

---

## Error Handling Patterns

### Frontend
- Use error boundaries (`error.tsx`) for page-level errors
- Use try/catch in API calls with toast notifications for user feedback
- Show inline validation errors on forms
- Always provide a retry mechanism for failed operations

### Backend
- Custom exception hierarchy (`AppException` → specific exceptions)
- Global exception handler in `main.py` converts to consistent format
- Log all 5xx errors with full context to CloudWatch
- Never expose stack traces to clients

---

## Testing Conventions

### Frontend
- Use Vitest for unit tests
- Use React Testing Library for component tests
- Test user interactions, not implementation details
- File naming: `ComponentName.test.tsx`

### Backend
- Use pytest with pytest-asyncio
- Use httpx `AsyncClient` for endpoint tests
- Mock external services (Supabase, S3, Jira, Discord, SES)
- File naming: `test_module_name.py`
- Fixtures in `conftest.py`

---

## Security Checklist

When writing code, always verify:
- [ ] All endpoints have proper auth dependency (`get_current_user`)
- [ ] Admin-only endpoints check `user.role == "admin"`
- [ ] Tickets are scoped to the current project (no cross-project leaks)
- [ ] File uploads validate content_type and file_size
- [ ] User input is validated via Pydantic schemas
- [ ] Secrets are in `.env`, never hardcoded
- [ ] Audit log is written for all mutations
