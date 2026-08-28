# Support System - Build Sequence

## Overview

This document defines the step-by-step build order for the Support System. Each step builds on the previous one — follow this sequence to avoid writing orphaned code.

---

## Phase 1: Foundation

> Without these, nothing else works.

### Step 1 — Project Setup & Boilerplate

**What to do:**
- Create monorepo with `frontend/` and `backend/` folders
- Initialize Next.js 14 (App Router + TailwindCSS + TypeScript)
- Initialize FastAPI (pyproject.toml, uvicorn, pydantic-settings)
- Set up Docker Compose for local dev
- Create full folder structure with empty placeholder files
- Add `.env.example` for both projects
- Add health check endpoint (`GET /health`)
- Configure CORS middleware

**Key Files:**
- `frontend/package.json`
- `backend/pyproject.toml`
- `backend/app/main.py`
- `backend/app/config.py`
- `docker-compose.yml`

**Done When:** Both servers start locally. Health check returns 200. Next.js shows placeholder page.

---

### Step 2 — Database (Supabase)

**What to do:**
- Create all tables: users, projects, tickets, attachments, activities, audit_logs
- Add indexes (project_id, status, full-text search)
- Set up supabase-py client in FastAPI
- Build `BaseRepository` with generic CRUD (create, get_by_id, list, update, delete)
- Build `TicketRepo`, `ProjectRepo`, `UserRepo`, `ActivityRepo`, `AuditRepo`
- Add pagination helper

**Key Files:**
- `docs/DATABASE_SCHEMA.md` (SQL migrations)
- `backend/app/integrations/supabase/client.py`
- `backend/app/db/repositories/base_repo.py`
- `backend/app/db/repositories/ticket_repo.py`

**Done When:** All repos can CRUD data in Supabase. Tests pass.

---

### Step 3 — Authentication (AWS Cognito)

**What to do:**
- Backend: JWKS fetch + cache, JWT verification
- Backend: `get_current_user` dependency
- Backend: Get-or-create user in Supabase on first login
- Backend: Role-based access (admin/user)
- Frontend: AWS Amplify v6 configuration
- Frontend: AuthProvider with login/logout/getSession
- Frontend: Login & Signup pages
- Frontend: `middleware.ts` for route protection

**Key Files:**
- `backend/app/integrations/aws/cognito.py`
- `backend/app/core/security.py`
- `backend/app/dependencies.py`
- `frontend/src/lib/cognito.ts`
- `frontend/src/providers/AuthProvider.tsx`
- `frontend/src/app/(auth)/login/page.tsx`
- `frontend/src/middleware.ts`

**Done When:** User signs up, logs in, accesses protected page. 401 on invalid token.

---

## Phase 2: Core Features

> The actual ticket system functionality.

### Step 4 — Project Management (Multi-Project)

**What to do:**
- Backend: Project CRUD endpoints (admin-only create/edit/delete, all users list)
- Backend: ProjectService with validation
- Backend: Project context dependency (extract from header/token)
- Frontend: Admin projects page (table + forms)
- Frontend: ProjectSelector component in sidebar
- Frontend: Persist selected project in localStorage

**Key Files:**
- `backend/app/api/v1/endpoints/projects.py`
- `backend/app/services/project_service.py`
- `backend/app/db/repositories/project_repo.py`
- `frontend/src/app/(protected)/admin/projects/page.tsx`
- `frontend/src/components/layout/ProjectSelector.tsx`

**Done When:** Admin creates projects. User switches between them. Non-admin can't access admin page.

---

### Step 5 — Ticket CRUD & Add Ticket Page

**What to do:**
- Backend: TicketService (create, read, update, delete, list)
- Backend: Enums — Type, Priority, Status
- Backend: Schemas — TicketCreate, TicketUpdate, TicketResponse
- Frontend: `/tickets/new` page (Title, Description, Type, Priority)
- Frontend: Form validation (title required min 5 chars, description required)
- Status defaults to "pending"

**Key Files:**
- `backend/app/api/v1/endpoints/tickets.py`
- `backend/app/services/ticket_service.py`
- `backend/app/schemas/ticket.py`
- `frontend/src/app/(protected)/tickets/new/page.tsx`
- `frontend/src/components/tickets/TicketForm.tsx`

**Done When:** User creates ticket, sees it on detail page. Validation works.

---

### Step 6 — File Upload (S3)

**What to do:**
- Backend: S3 presigned URL generation (upload + download)
- Backend: Attachment CRUD endpoints (get URL, confirm, list, delete)
- Backend: File type validation (jpg, png, gif, webp, mp4, webm) + size limit (50MB)
- Frontend: Drag-and-drop upload with progress bar
- Frontend: Image/video preview in ticket detail
- Frontend: Delete attachment button

**Key Files:**
- `backend/app/integrations/aws/s3.py`
- `backend/app/api/v1/endpoints/uploads.py`
- `backend/app/services/upload_service.py`
- `frontend/src/components/tickets/FileUpload.tsx`

**Done When:** User uploads images/videos, sees preview, can delete.

---

### Step 7 — Activity Timeline

**What to do:**
- Backend: ActivityService — auto-log on every ticket mutation
- Backend: Comment endpoint (add text comments)
- Backend: List activities for a ticket (paginated, chronological)
- Frontend: TicketTimeline component (icons, colors per action type)
- Frontend: Comment input box at bottom of timeline

**Key Files:**
- `backend/app/services/activity_service.py`
- `backend/app/db/repositories/activity_repo.py`
- `backend/app/schemas/activity.py`
- `frontend/src/components/tickets/TicketTimeline.tsx`
- `frontend/src/app/(protected)/tickets/[id]/page.tsx`

**Done When:** Create/update/comment/upload → all appear in timeline.

---

### Step 8 — All Tickets Page

**What to do:**
- Backend: List endpoint with filters (status, type, priority, assignee, date) + pagination + sort
- Frontend: Ticket table with sortable columns (Title, Type, Priority, Status, Assigned, Created)
- Frontend: Filter bar (dropdowns + date range)
- Frontend: Inline status dropdown (fires API call + activity)
- Frontend: Delete with confirmation modal
- Frontend: Click row → ticket detail

**Key Files:**
- `frontend/src/app/(protected)/tickets/page.tsx`
- `frontend/src/components/tickets/TicketTable.tsx`
- `frontend/src/components/tickets/FilterBar.tsx`

**Done When:** User sees all tickets, filters, sorts, changes status inline, deletes.

---

## Phase 3: Power Features

> Makes the system efficient for daily use.

### Step 9 — Search & Saved Filters

**What to do:**
- Backend: Full-text search using PostgreSQL `tsvector` on tickets(title, description)
- Backend: Search endpoint (query + all filters)
- Backend: Saved filters CRUD (per user, stored in users.saved_filters or separate table)
- Frontend: Debounced search bar at top of tickets page
- Frontend: "Save filter" button + saved filters dropdown
- Frontend: Delete saved filter

**Key Files:**
- `backend/app/api/v1/endpoints/search.py`
- `backend/app/services/search_service.py`
- `frontend/src/components/search/SearchBar.tsx`
- `frontend/src/components/search/SavedFilters.tsx`

**Done When:** Search finds relevant tickets. User saves and loads filter combos.

---

### Step 10 — Bulk Operations

**What to do:**
- Backend: Bulk endpoints — status change, assign, delete (accepts array of ticket_ids)
- Backend: BulkService — validates permissions, applies changes, logs per-ticket activities
- Frontend: Checkbox column + "select all"
- Frontend: BulkActionBar (appears when selected, shows count + buttons)
- Frontend: Confirmation modal for delete

**Key Files:**
- `backend/app/api/v1/endpoints/bulk.py`
- `backend/app/services/bulk_service.py`
- `frontend/src/components/tickets/BulkActionBar.tsx`

**Done When:** Select tickets, bulk change status, bulk delete works.

---

## Phase 4: Integrations

> Connect to external services. Core system works without these.

### Step 11 — Jira Integration

**What to do:**
- Backend: Jira httpx client (create_issue, transition_issue, get_issue)
- Backend: JiraService — map ticket → Jira fields, map status → transition
- Backend: On ticket create → create Jira issue, store jira_key
- Backend: On status change → transition Jira issue
- Backend: BackgroundTasks (non-blocking), graceful failure
- Frontend: Show Jira key + link on ticket detail

**Key Files:**
- `backend/app/integrations/jira/client.py`
- `backend/app/integrations/jira/service.py`

**Done When:** Ticket creates Jira issue. Status change transitions Jira. Link shown on ticket.

---

### Step 12 — Discord Integration

**What to do:**
- Backend: Discord webhook client (send rich embeds)
- Backend: DiscordService — templates per event, color-coded by priority
- Backend: Per-project webhook URL (from project settings)
- Backend: BackgroundTasks, graceful failure

**Key Files:**
- `backend/app/integrations/discord/client.py`
- `backend/app/integrations/discord/service.py`

**Done When:** Ticket creation/status change → Discord embed appears in channel.

---

### Step 13 — Email Notifications (AWS SES)

**What to do:**
- Backend: SES client for templated emails
- Backend: NotificationService — determine recipients + template
- Backend: Templates: status_changed, assigned, completed
- Backend: Respect unsubscribe flag (user.email_notifications)
- Backend: BackgroundTasks

**Key Files:**
- `backend/app/integrations/aws/ses.py`
- `backend/app/services/notification_service.py`

**Done When:** Status change → creator gets email. Unsubscribed users don't get emails.

---

## Phase 5: Audit & Observability

> Track everything for accountability.

### Step 14 — Audit Logging (CloudTrail + CloudWatch)

**What to do:**
- Backend: AuditLogger — writes to audit_logs table + CloudWatch
- Backend: Audit events for all mutations (ticket, project, bulk, upload)
- Backend: Structured JSON logging format
- Backend: CloudWatch log group/stream setup
- Frontend: Audit log viewer in admin panel (table, filterable)

**Key Files:**
- `backend/app/audit/logger.py`
- `backend/app/audit/events.py`
- `backend/app/core/logging.py`
- `frontend/src/app/(protected)/admin/audit/page.tsx`

**Done When:** All actions logged in DB + CloudWatch. Admin can view audit trail.

---

## Phase 6: Dashboard & Analytics

> Needs data in the system to be meaningful.

### Step 15 — Public Dashboard & KPIs

**What to do:**
- Backend: Dashboard endpoint — totals by status/type/priority, over time, avg resolution time
- Frontend: `/insights` public page (no auth)
- Frontend: KPI cards (Total, Pending, In Progress, Paused, In Review, Completed)
- Frontend: Charts — Pie (status), Bar (type), Bar (priority), Line (over time)
- Frontend: Project filter dropdown (public projects only)

**Key Files:**
- `backend/app/api/v1/endpoints/dashboard.py`
- `backend/app/services/dashboard_service.py`
- `frontend/src/app/(public)/insights/page.tsx`
- `frontend/src/components/charts/`

**Done When:** Visit `/insights` without login → see KPIs and charts.

---

### Step 16 — Project Insights (Protected Analytics)

**What to do:**
- Backend: Advanced metrics — velocity, avg time per status, team workload, trends
- Frontend: `/dashboard` protected page
- Frontend: Date range picker
- Frontend: Trend indicators (↑↓ with %)
- Frontend: Project comparison + team workload charts

**Key Files:**
- `frontend/src/app/(protected)/dashboard/page.tsx`
- `frontend/src/components/charts/VelocityChart.tsx`
- `frontend/src/components/charts/WorkloadChart.tsx`

**Done When:** Managers see velocity, trends, team workload with date filtering.

---

## Phase 7: Polish

> Final production-readiness pass.

### Step 17 — Final Polish & E2E

**What to do:**
- Frontend: Toast notification system
- Frontend: Loading skeletons for all pages
- Frontend: Responsive design (mobile sidebar collapse)
- Frontend: Error boundaries with retry
- Backend: Global exception handler (consistent error format)
- Backend: Rate limiting on public endpoints
- Backend: Input sanitization
- Full E2E flow test

**Done When:** Complete walkthrough works. Error states handled. Mobile-friendly.

---

## Dependency Table

| Step | Depends On | Can Parallel With |
|------|-----------|-------------------|
| 1. Setup | Nothing | — |
| 2. Database | Step 1 | — |
| 3. Auth | Steps 1-2 | — |
| 4. Projects | Steps 1-3 | — |
| 5. Tickets | Steps 1-4 | — |
| 6. File Upload | Step 5 | Step 7 |
| 7. Timeline | Step 5 | Step 6 |
| 8. All Tickets | Steps 5-7 | — |
| 9. Search | Step 8 | Step 10 |
| 10. Bulk Ops | Step 8 | Step 9 |
| 11. Jira | Step 5 | Steps 12, 13 |
| 12. Discord | Step 5 | Steps 11, 13 |
| 13. Email (SES) | Step 5 | Steps 11, 12 |
| 14. Audit | Steps 5-13 | — |
| 15. Dashboard | Steps 5+ (needs data) | — |
| 16. Insights | Step 15 | — |
| 17. Polish | Everything | — |

---

## Estimated Timeline

| Phase | Steps | Estimated Duration |
|-------|-------|-------------------|
| Foundation | 1-3 | 1-2 weeks |
| Core Features | 4-8 | 2-3 weeks |
| Power Features | 9-10 | 1 week |
| Integrations | 11-13 | 1-2 weeks |
| Audit | 14 | 3-4 days |
| Dashboard | 15-16 | 1 week |
| Polish | 17 | 3-5 days |
| **Total** | | **7-10 weeks** |

---

## Future Enhancements (Post-MVP)

| Feature | Priority | Notes |
|---------|----------|-------|
| CSV/PDF Export | Medium | Tickets + dashboard reports |
| Supabase Realtime | Low | Requires paid tier |
| SLA Tracking | Medium | Configurable per project |
| Canned Responses | Low | Templates for common issues |
| Knowledge Base | Low | Tag resolved tickets as docs |
| Bidirectional Jira Sync | Medium | Webhooks from Jira |
| Mobile App | Low | React Native or PWA |
