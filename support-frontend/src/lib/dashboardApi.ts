/**
 * Public dashboard API functions.
 *
 * The public dashboard requires no authentication. The shared API client
 * simply omits the Authorization header when no token is present.
 */

import { api } from "@/lib/api";
import type {
  Insights,
  InsightsFilters,
  InsightsResponse,
  PublicDashboard,
  PublicDashboardFilters,
  PublicDashboardResponse,
} from "@/types/dashboard";

export async function getPublicDashboard(
  filters: PublicDashboardFilters = {}
): Promise<PublicDashboard> {
  const params: Record<string, string> = {};
  if (filters.projectId) params.project_id = filters.projectId;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;

  const response = await api.get<PublicDashboardResponse>(
    "/dashboard/public",
    params
  );
  return response.data;
}

/**
 * Protected insights API function (Step 16).
 *
 * Requires authentication; the shared API client attaches the bearer token.
 */
export async function getInsights(
  filters: InsightsFilters = {}
): Promise<Insights> {
  const params: Record<string, string> = {};
  if (filters.projectId) params.project_id = filters.projectId;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;

  const response = await api.get<InsightsResponse>("/dashboard/insights", params);
  return response.data;
}
