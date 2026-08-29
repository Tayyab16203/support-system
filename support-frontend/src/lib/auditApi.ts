/**
 * Admin audit-log API functions.
 */

import { api } from "@/lib/api";
import type { AuditLogFilters, AuditLogListResponse } from "@/types/audit";

export async function listAuditLogs(
  page = 1,
  pageSize = 50,
  filters: AuditLogFilters = {}
): Promise<AuditLogListResponse> {
  const params: Record<string, string> = {
    page: String(page),
    page_size: String(pageSize),
  };
  if (filters.action) params.action = filters.action;
  if (filters.resource_type) params.resource_type = filters.resource_type;
  if (filters.actor_id) params.actor_id = filters.actor_id;
  if (filters.project_id) params.project_id = filters.project_id;

  return api.get<AuditLogListResponse>("/admin/audit", params);
}
