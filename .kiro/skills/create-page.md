---
name: Create Page
description: Skill for creating new Next.js App Router pages with proper patterns (loading, error states, auth, responsive design)
---

# Skill: Create Next.js Page

## When to Use

Use this skill when:
- Adding a new page to the frontend
- Creating a new route in the Next.js App Router
- Building a page with data fetching, forms, or tables

## Page Structure

Every page follows this file structure:

```
frontend/src/app/(route-group)/page-name/
├── page.tsx       # Main page component
├── loading.tsx    # Loading skeleton (optional but recommended)
└── error.tsx      # Error boundary (optional but recommended)
```

## Route Groups

| Group | Auth | Layout | Purpose |
|-------|------|--------|---------|
| `(auth)` | No | Minimal (centered card) | Login, Signup, Forgot Password |
| `(protected)` | Yes | Full app (sidebar + navbar) | Dashboard, Tickets, Admin |
| `(public)` | No | Clean (navbar only, no sidebar) | Public insights page |

## Implementation Steps

### Step 1: Create the Page File

```typescript
// frontend/src/app/(protected)/new-page/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchResources } from "@/lib/api";
import { ResourceTable } from "@/components/resources/ResourceTable";
import type { Resource } from "@/types/resource";

export default function NewPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["resources", page],
    queryFn: () => fetchResources({ page }),
  });

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="space-y-6">
      <PageHeader title="Resources" description="Manage your resources" />
      <ResourceTable data={data.data} pagination={data.pagination} onPageChange={setPage} />
    </div>
  );
}
```

### Step 2: Create Loading State

```typescript
// frontend/src/app/(protected)/new-page/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
```

### Step 3: Create Error Boundary

```typescript
// frontend/src/app/(protected)/new-page/error.tsx
"use client";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-gray-600">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
```

### Step 4: Add Types (if new data type)

```typescript
// frontend/src/types/resource.ts
export interface Resource {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResourceCreate {
  name: string;
  description?: string;
}
```

### Step 5: Add API Functions

```typescript
// In frontend/src/lib/api.ts
export async function fetchResources(params: { page?: number; page_size?: number }) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));

  return fetchWithAuth(`/resources?${searchParams.toString()}`);
}

export async function createResource(data: ResourceCreate) {
  return fetchWithAuth("/resources", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

### Step 6: Create Components

Place in `frontend/src/components/{feature}/`:

```typescript
// frontend/src/components/resources/ResourceTable.tsx
"use client";

import type { Resource } from "@/types/resource";

interface ResourceTableProps {
  data: Resource[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function ResourceTable({ data, pagination, onPageChange }: ResourceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">{item.name}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(item.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Page Types and Patterns

### List Page (All Tickets, Projects)
- Table with sortable columns
- Filter bar above table
- Pagination at bottom
- Click row → navigate to detail
- Optional: bulk selection checkboxes

### Detail Page (Ticket Detail)
- Header with title + action buttons (Edit, Delete)
- Info section with fields displayed as badges/text
- Tabs or sections for related data (Timeline, Attachments)
- Back button to return to list

### Form Page (Add Ticket, Edit Project)
- Heading describing the action
- Form fields with labels and validation messages
- Submit button (with loading state)
- Cancel button (navigates back)
- Success → redirect to detail or list page

### Dashboard Page
- KPI cards row at top
- Charts grid below (2-3 column on desktop, stacked on mobile)
- Filter controls (date range, project selector)

## Responsive Design Rules

- Mobile-first approach (default styles = mobile)
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Tables → card layout on mobile (or horizontal scroll)
- Sidebar collapses on mobile (hamburger menu)
- Form inputs stack vertically on mobile, grid on desktop
- KPI cards: 1 column on mobile, 2 on tablet, 4 on desktop

```typescript
// Responsive grid example
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <KPICard title="Total" value={150} />
  <KPICard title="Pending" value={20} />
  <KPICard title="In Progress" value={35} />
  <KPICard title="Completed" value={75} />
</div>
```

## Checklist for Every New Page

- [ ] Page file created at correct route path
- [ ] `"use client"` directive added if using hooks/event handlers
- [ ] Loading skeleton created (`loading.tsx`)
- [ ] Error boundary created (`error.tsx`)
- [ ] Types defined in `frontend/src/types/`
- [ ] API functions added to `frontend/src/lib/api.ts`
- [ ] Components created in `frontend/src/components/{feature}/`
- [ ] Responsive design (works on mobile, tablet, desktop)
- [ ] Loading state shown while data fetches
- [ ] Error state with retry button
- [ ] Empty state when no data (not just blank page)
- [ ] Toast notifications for success/error on mutations
- [ ] Auth check (page only accessible if logged in, for protected routes)
- [ ] Project scoping (if page shows project-specific data)

## Navigation

After creating a new page, add it to the sidebar navigation:

```typescript
// In frontend/src/components/layout/Sidebar.tsx
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/new-page", label: "New Page", icon: NewIcon },  // Add here
];
```

## Client vs Server Components

| Scenario | Component Type | Directive |
|----------|---------------|-----------|
| Static content, no interactivity | Server (default) | None needed |
| Uses useState, useEffect, event handlers | Client | `"use client"` |
| Uses React Query (useQuery, useMutation) | Client | `"use client"` |
| Form with validation | Client | `"use client"` |
| Renders data passed as props only | Server (default) | None needed |

Prefer server components where possible. Push `"use client"` to the lowest component that needs it.
