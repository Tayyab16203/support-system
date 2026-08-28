---
inclusion: auto
description: Tech stack decisions and constraints for the Support System
---

# Support System - Tech Stack & Decisions

## Technology Choices

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.x | React framework (App Router, SSR for public dashboard) |
| TypeScript | 5.x | Type safety |
| TailwindCSS | 3.x | Utility-first styling |
| Recharts | 2.x | Dashboard charts and KPI visualizations |
| TanStack React Query | 5.x | Server state management, caching, mutations |
| AWS Amplify | 6.x | Cognito authentication SDK |
| Zod | 3.x | Form validation (client-side) |
| clsx + tailwind-merge | latest | Conditional class merging |
| Lucide React | latest | Icon library |
| date-fns | 3.x | Date formatting and manipulation |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | Web framework |
| Uvicorn | 0.27+ | ASGI server |
| Pydantic | 2.x | Data validation and settings |
| pydantic-settings | 2.x | Environment configuration |
| supabase-py | 2.x | Supabase client (PostgREST + Auth) |
| boto3 | 1.34+ | AWS SDK (S3, SES, CloudWatch, Cognito) |
| httpx | 0.27+ | Async HTTP client (Jira, Discord) |
| python-jose[cryptography] | 3.3+ | JWT token verification |
| python-multipart | 0.0.6+ | File upload handling |

### Infrastructure & Services

| Service | Purpose | Why Chosen |
|---------|---------|-----------|
| Supabase | PostgreSQL database | Free tier, managed Postgres, built-in REST API, easy setup |
| AWS Cognito | Authentication | Managed user pools, JWT tokens, integrates with AWS ecosystem |
| AWS S3 | File storage | Scalable, presigned URLs for direct upload, cost-effective |
| AWS SES | Email notifications | Integrates with Cognito, reliable delivery, templates |
| AWS CloudWatch | Application logging | Structured logs, metrics, alerting, pairs with CloudTrail |
| AWS CloudTrail | Audit trail | Infrastructure-level audit, compliance-grade logging |
| Jira Cloud | Issue tracking | Team uses Jira for project management |
| Discord | Notifications | Team communication channel for support alerts |

### Development & Deployment

| Tool | Purpose |
|------|---------|
| Docker Compose | Local development environment |
| Vercel | Frontend deployment (SSR + Edge) |
| AWS ECS/Fargate | Backend deployment (containerized) |
| GitHub Actions | CI/CD pipeline |
| ESLint | Frontend linting |
| Prettier | Frontend formatting |
| Ruff | Python linting + formatting (replaces flake8 + black + isort) |
| Mypy | Python type checking |
| Pytest | Backend testing |
| Vitest | Frontend testing |

---

## Why These Choices

### Next.js over Vite+React
- Public dashboard benefits from SSR (SEO, faster first paint)
- App Router provides clean file-based routing with layouts
- Built-in middleware for route protection
- API routes available if needed for BFF patterns
- Vercel deployment is seamless

### FastAPI over Django/Express
- Native async support (critical for calling Jira, Discord, AWS in parallel)
- Pydantic integration provides automatic request validation and OpenAPI docs
- Lightweight — no ORM overhead (we use Supabase client directly)
- Python ecosystem has excellent AWS SDK (boto3)
- Type hints give IDE support comparable to TypeScript

### Supabase over raw PostgreSQL / DynamoDB
- Free tier sufficient for development and small-scale production
- Managed PostgreSQL with built-in connection pooling
- PostgREST for simple queries, direct Postgres connection for complex ones
- Dashboard for visual DB management
- Easy to migrate to raw Postgres later if needed

### AWS Cognito over Auth0 / Supabase Auth
- Already using AWS for S3, SES, CloudWatch — keeps everything in one ecosystem
- Free tier: 50,000 MAU
- Integrates natively with other AWS services
- Custom JWT claims for role-based access

### Recharts over Chart.js / Tremor
- React-first library (declarative components)
- Good TypeScript support
- Responsive out of the box
- Lightweight, no Canvas dependency
- Sufficient for KPI dashboards

### httpx over requests/aiohttp
- Async-first (critical for non-blocking integration calls)
- API compatible with requests (easy to learn)
- HTTP/2 support
- Built-in timeout handling

### Ruff over Black + Flake8 + isort
- Single tool replaces three (linting + formatting + import sorting)
- 10-100x faster than alternatives (written in Rust)
- Compatible with existing Black formatting
- Growing community adoption

---

## Constraints & Limitations

### Supabase Free Tier
- 500 MB database storage
- 1 GB file storage (but we use S3 for files)
- 2 GB bandwidth
- No realtime subscriptions on free tier (skipped for now)
- Limited to 2 projects
- **Mitigation:** Use S3 for all file storage. Monitor DB size. Upgrade when needed.

### AWS Free Tier
- Cognito: 50,000 MAU free
- S3: 5 GB storage, 20,000 GET, 2,000 PUT requests/month
- SES: 62,000 emails/month (when sent from EC2)
- CloudWatch: 5 GB log ingestion, 5 GB log storage
- **Mitigation:** Monitor usage via AWS Cost Explorer. Set billing alerts.

### No Realtime (for now)
- Supabase Realtime requires paid plan
- Dashboard and ticket list won't auto-refresh
- Users need to manually refresh or use polling
- **Future:** Upgrade Supabase plan and add Realtime subscriptions

---

## Package Preferences

When adding new dependencies, follow these rules:

1. **Pin exact versions** in `package.json` and `pyproject.toml` (no `^` or `~`)
2. **Prefer well-known, actively maintained packages** with >1000 GitHub stars
3. **Avoid packages with similar names** (potential typosquatting)
4. **Check last publish date** — avoid packages not updated in >1 year
5. **Minimize dependencies** — if something can be done in 20 lines of code, don't add a package

### Banned Patterns
- No `moment.js` → use `date-fns`
- No `axios` → use native `fetch` with a thin wrapper (or React Query's built-in)
- No `lodash` (full) → use native JS methods or `lodash-es` for specific functions
- No CSS-in-JS libraries → TailwindCSS only
- No `requests` (Python) → use `httpx`
- No SQLAlchemy → use `supabase-py` client directly

---

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=us-east-1
NEXT_PUBLIC_S3_BUCKET=support-system-uploads
NEXT_PUBLIC_S3_REGION=us-east-1
```

### Backend (.env)

```env
# Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJxxxxxxxxx (service_role key)

# AWS General
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxxxx

# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxx

# AWS S3
S3_BUCKET_NAME=support-system-uploads

# AWS SES
SES_FROM_EMAIL=support@yourdomain.com

# AWS CloudWatch
CLOUDWATCH_LOG_GROUP=/support-system/api
CLOUDWATCH_LOG_STREAM=production

# Jira (optional per project, but global credentials)
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=bot@yourcompany.com
JIRA_API_TOKEN=xxxxx

# Discord (configured per project in DB, no global env needed)

# App
APP_ENV=development
APP_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
```

---

## API Versioning Strategy

- All endpoints prefixed with `/api/v1/`
- Version in URL path (not headers)
- When breaking changes needed → create `/api/v2/` alongside v1
- Deprecate v1 with 6-month notice via `Deprecation` header
- Never remove a v1 endpoint without migrating all consumers
