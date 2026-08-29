/**
 * Audit-log TypeScript types.
 */

import type { PaginationMeta } from "@/types/user";

/** Basic profile of the user who performed an audited action. */
export interface AuditActor {
  id: string;
  name: string;
  email: string;
}

/** A single audit-log entry as returned by the backend. */
export interface AuditLog {
  id: string;
  actor_id: string;
  actor: AuditActor | null;
  action: string;
  resource_type: string;
  resource_id: string;
  project_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

/** Optional filters for the audit-log list request. */
export interface AuditLogFilters {
  action?: string;
  resource_type?: string;
  actor_id?: string;
  project_id?: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  pagination: PaginationMeta;
}
