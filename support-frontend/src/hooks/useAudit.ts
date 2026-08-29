/**
 * Audit-log data hook using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "@/lib/auditApi";
import type { AuditLogFilters } from "@/types/audit";

export function useAuditLogs(
  page = 1,
  pageSize = 50,
  filters: AuditLogFilters = {}
) {
  return useQuery({
    queryKey: ["audit-logs", page, pageSize, filters],
    queryFn: () => listAuditLogs(page, pageSize, filters),
  });
}
