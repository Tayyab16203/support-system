# Support System - Architecture Document

## System Overview

```mermaid
graph TB
    subgraph "Frontend (Vercel)"
        NEXT[Next.js 14 App Router]
        NEXT --> AUTH_UI[Auth Pages]
        NEXT --> TICKET_UI[Ticket Pages]
        NEXT --> DASH_UI[Dashboard]
        NEXT --> ADMIN_UI[Admin Panel]
    end

    subgraph "Backend (AWS)"
        API[FastAPI Server]
        API --> SERVICES[Service Layer]
        SERVICES --> REPOS[Repository Layer]
    end

    subgraph "AWS Services"
        COGNITO[AWS Cognito]
        S3[AWS S3]
        SES[AWS SES]
        CW[CloudWatch]
        CT[CloudTrail]
    end

    subgraph "External Integrations"
        JIRA[Jira Cloud]
        DISCORD[Discord Webhooks]
    end

    subgraph "Database"
        SUPA[Supabase PostgreSQL]
    end

    NEXT -->|REST API| API
    NEXT -->|Auth Flow| COGNITO
    API -->|Verify JWT| COGNITO
    API -->|File Upload| S3
    API -->|Send Email| SES
    API -->|Audit Logs| CW
    API -->|Audit Trail| CT
    API -->|Create Issues| JIRA
    API -->|Send Notifications| DISCORD
    API -->|CRUD| SUPA
    NEXT -->|Presigned URL Upload| S3
```

---

## Component Breakdown

### Frontend (Next.js 14)

| Component | Responsibility |
|-----------|---------------|
| `(auth)/` route group | Login, Signup pages — public, minimal layout |
| `(protected)/` route group | Dashboard, Tickets, Admin — requires auth, full app layout |
| `(public)/` route group | Public insights dashboard — no auth, read-only |
| `components/ui/` | Reusable primitives (Button, Input, Modal, Badge, Toast) |
| `components/charts/` | KPI cards, Recharts wrappers |
| `components/tickets/` | TicketForm, TicketTable, TicketTimeline, BulkActionBar |
| `components/search/` | SearchBar, FilterPanel, SavedFilters |
| `components/layout/` | Sidebar, Navbar, ProjectSelector |
| `lib/api.ts` | Authenticated fetch wrapper for backend API |
| `lib/cognito.ts` | AWS Amplify/Cognito configuration |
| `providers/` | AuthProvider, QueryProvider (React Query) |
| `middleware.ts` | Route protection based on auth state |

### Backend (FastAPI)

| Layer | Responsibility |
|-------|---------------|
| `api/v1/endpoints/` | HTTP handlers — request parsing, response formatting |
| `schemas/` | Pydantic request/response models with validation |
| `services/` | Business logic — orchestrates repos + integrations |
| `db/repositories/` | Data access — Supabase queries, pagination |
| `integrations/` | External service clients (Jira, Discord, AWS) |
| `core/` | Cross-cutting: security, exceptions, logging, middleware |
| `audit/` | Audit event logging to DB + CloudWatch |
| `models/` | Domain models and enums |

### Architecture Pattern

```
Request → Endpoint (Router) → Service → Repository → Supabase
                                  ↓
                           Integrations (Background)
                           ├── Jira (create/transition)
                           ├── Discord (webhook)
                           ├── SES (email)
                           └── Audit (CloudWatch + DB)
```

---

## Data Flow Diagrams

### Ticket Creation Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant N as Next.js
    participant F as FastAPI
    participant DB as Supabase
    participant S3 as AWS S3
    participant J as Jira
    participant D as Discord
    participant E as AWS SES

    U->>N: Fill ticket form + attach files
    N->>S3: Upload files via presigned URL
    S3-->>N: Upload complete
    N->>F: POST /api/v1/tickets (with attachment keys)
    F->>F: Validate JWT (Cognito)
    F->>DB: Insert ticket record
    F->>DB: Insert attachment records
    F->>DB: Insert activity (ticket.created)
    F->>DB: Insert audit log
    F-->>N: 201 Created (ticket response)
    
    Note over F: Background Tasks (non-blocking)
    F->>J: Create Jira issue
    J-->>F: Return issue key
    F->>DB: Update ticket.jira_key
    F->>D: Send Discord embed
    F->>E: Send confirmation email to creator
    
    N-->>U: Redirect to ticket detail page
```

### Authentication Model: Admin-Only User Creation

Public self-signup is **disabled** (`AllowAdminCreateUserOnly = true` on the
Cognito pool). Users are created only by admins.

- **First admin:** created once via `bootstrap_admin.py` (Cognito user with a
  permanent password + Supabase row with `role=admin`).
- **All other users:** created by an admin via `POST /admin/users`. Cognito
  emails a temporary password; the user sets a permanent one on first login.
- **Admins can create admins** by selecting `role=admin` at creation time.

### Login Flow

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js
    participant C as AWS Cognito
    participant F as FastAPI
    participant DB as Supabase

    U->>N: Enter email + password
    N->>C: Authenticate (Amplify SDK)
    alt First login (admin-invited user)
        C-->>N: Challenge: NEW_PASSWORD_REQUIRED
        N->>U: Prompt for new permanent password
        U->>N: Submit new password
        N->>C: confirmSignIn(newPassword)
    end
    C-->>N: JWT tokens (access + refresh + id)
    N->>N: Store tokens (Amplify, localStorage)
    N->>F: POST /auth/me with Bearer token
    F->>C: Fetch JWKS (cached)
    F->>F: Verify token signature + expiry + client_id
    F->>DB: Get or create user (by cognito_sub)
    F-->>N: User profile (incl. role)
    N->>N: Set profile + isAdmin in AuthProvider

    Note over N,C: Token refresh happens automatically via Amplify
```

### Admin Creates User Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant N as Next.js (/admin/users)
    participant F as FastAPI
    participant C as AWS Cognito
    participant DB as Supabase
    participant NU as New User

    A->>N: Fill form (email, name, role)
    N->>F: POST /admin/users (Bearer admin token)
    F->>F: get_admin_user (403 if not admin)
    F->>C: admin_create_user (invite email + temp password)
    C->>NU: Email with temporary password
    F->>DB: Insert user row with assigned role
    F-->>N: 201 Created
    Note over NU: New user logs in -> NEW_PASSWORD_REQUIRED -> sets password
```

### File Upload Flow

```mermaid
sequenceDiagram
    participant U as User
    participant N as Next.js
    participant F as FastAPI
    participant S3 as AWS S3
    participant DB as Supabase

    U->>N: Select file(s) to upload
    N->>F: POST /api/v1/uploads/presigned-url
    Note over F: Validates file type, size, auth
    F->>S3: Generate presigned PUT URL
    S3-->>F: Presigned URL (expires in 15min)
    F-->>N: { upload_url, s3_key }
    N->>S3: PUT file directly to S3
    S3-->>N: 200 OK
    N->>F: POST /api/v1/uploads/confirm
    F->>DB: Create attachment record
    F->>DB: Create activity (file_uploaded)
    F-->>N: Attachment metadata
    N-->>U: Show file preview
```

### Status Change Flow (with Integrations)

```mermaid
sequenceDiagram
    participant U as User
    participant F as FastAPI
    participant DB as Supabase
    participant J as Jira
    participant D as Discord
    participant E as AWS SES
    participant CW as CloudWatch

    U->>F: PATCH /api/v1/tickets/{id} (status: in_progress)
    F->>DB: Update ticket status
    F->>DB: Insert activity (status_changed, old→new)
    F->>DB: Insert audit log
    F-->>U: 200 Updated ticket
    
    Note over F: Background Tasks
    F->>J: Transition Jira issue (To Do → In Progress)
    F->>D: Send status change embed
    F->>E: Email creator "Your ticket is now In Progress"
    F->>CW: Push structured log event
```

---

## Integration Patterns

### Jira Integration

```
┌─────────────────────────────────────────────────┐
│ integrations/jira/                              │
├─────────────────────────────────────────────────┤
│ client.py  → Low-level REST API calls (httpx)   │
│              - create_issue()                    │
│              - transition_issue()                │
│              - get_issue()                       │
├─────────────────────────────────────────────────┤
│ service.py → Business logic                     │
│              - sync_ticket_to_jira()            │
│              - sync_status_to_jira()            │
│              - map_status_to_transition()        │
└─────────────────────────────────────────────────┘

Status Mapping:
  pending      → To Do
  in_progress  → In Progress
  paused       → On Hold
  in_review    → In Review
  completed    → Done
```

### Discord Integration

```
┌─────────────────────────────────────────────────┐
│ integrations/discord/                           │
├─────────────────────────────────────────────────┤
│ client.py  → Webhook HTTP calls                 │
│              - send_embed()                      │
├─────────────────────────────────────────────────┤
│ service.py → Message construction               │
│              - notify_ticket_created()           │
│              - notify_status_changed()           │
│              - build_embed() (color by priority) │
└─────────────────────────────────────────────────┘

Embed Colors:
  critical → Red (#FF0000)
  high     → Orange (#FF8C00)
  medium   → Yellow (#FFD700)
  low      → Green (#00C853)
```

### AWS SES (Email)

```
┌─────────────────────────────────────────────────┐
│ integrations/aws/ses.py                         │
├─────────────────────────────────────────────────┤
│ - send_template_email()                         │
│ - Templates: status_changed, assigned,          │
│   completed                                     │
│ - Respects user.email_notifications flag        │
└─────────────────────────────────────────────────┘
```

---

## Audit Logging Architecture

```mermaid
graph LR
    subgraph "Application Layer"
        SVC[Services]
    end

    subgraph "Audit System"
        AL[AuditLogger]
    end

    subgraph "Storage"
        DB[(Supabase audit_logs)]
        CW[CloudWatch Logs]
        CT[CloudTrail]
    end

    SVC -->|log event| AL
    AL -->|insert| DB
    AL -->|put_log_event| CW
    AL -->|API calls| CT
```

### Audit Event Structure

```json
{
  "actor_id": "uuid",
  "action": "ticket.status_changed",
  "resource_type": "ticket",
  "resource_id": "uuid",
  "project_id": "uuid",
  "metadata": {
    "old_status": "pending",
    "new_status": "in_progress"
  },
  "ip_address": "1.2.3.4",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### CloudWatch Log Format

```json
{
  "level": "INFO",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "support-system",
  "event": "ticket.status_changed",
  "actor": "user@email.com",
  "resource": "ticket:uuid",
  "project": "project-name",
  "details": {}
}
```

---

## Multi-Tenant / Multi-Project Design

```mermaid
graph TD
    REQ[Incoming Request] --> MW[Middleware]
    MW -->|Extract project_id| CTX[Request Context]
    CTX --> EP[Endpoint]
    EP --> SVC[Service]
    SVC -->|Filter by project_id| REPO[Repository]
    REPO -->|WHERE project_id = ?| DB[(Supabase)]
```

### How it Works

1. **Project Context Injection:** Middleware extracts `X-Project-ID` header or gets it from the user's active project
2. **Dependency Injection:** `get_current_project()` FastAPI dependency provides project_id to all endpoints
3. **Repository Scoping:** All queries include `project_id` filter automatically
4. **Admin Override:** Admin users can query across all projects (for dashboard aggregation)

### Data Isolation

- Tickets belong to a project
- Attachments belong to a ticket (transitive project scope)
- Activities belong to a ticket (transitive project scope)
- Audit logs are tagged with project_id
- S3 keys are namespaced: `{project_id}/{ticket_id}/...`
- Jira + Discord configs are per-project

---

## Security Architecture

```
┌────────────────────────────────────────────────────────┐
│ Security Layers                                         │
├────────────────────────────────────────────────────────┤
│ 1. AWS Cognito (Identity + Token issuance)             │
│ 2. JWT Verification (every request)                    │
│ 3. Role-based access (admin vs user)                   │
│ 4. Project-level authorization                         │
│ 5. Input validation (Pydantic schemas)                 │
│ 6. File type/size validation (uploads)                 │
│ 7. Rate limiting (public endpoints)                    │
│ 8. CORS configuration (allowed origins)                │
│ 9. Audit trail (all mutations logged)                  │
└────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Vercel"
        FE[Next.js Frontend<br/>SSR + Static]
    end

    subgraph "AWS"
        ALB[Application Load Balancer]
        ECS[ECS Fargate<br/>FastAPI Container]
        COG[Cognito User Pool]
        S3B[S3 Bucket<br/>File Storage]
        SES_S[SES<br/>Email]
        CW_S[CloudWatch<br/>Logs]
    end

    subgraph "Supabase"
        PG[(PostgreSQL Database)]
    end

    subgraph "External"
        JIRA_S[Jira Cloud]
        DISC_S[Discord]
    end

    FE -->|HTTPS| ALB
    ALB --> ECS
    ECS --> COG
    ECS --> S3B
    ECS --> SES_S
    ECS --> CW_S
    ECS --> PG
    ECS --> JIRA_S
    ECS --> DISC_S
    FE --> COG
    FE -->|Presigned URL| S3B
```
