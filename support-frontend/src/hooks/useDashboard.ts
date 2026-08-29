/**
 * Public dashboard data hook using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import { getInsights, getPublicDashboard } from "@/lib/dashboardApi";
import type {
  InsightsFilters,
  PublicDashboardFilters,
} from "@/types/dashboard";

export function usePublicDashboard(filters: PublicDashboardFilters = {}) {
  return useQuery({
    queryKey: ["public-dashboard", filters],
    queryFn: () => getPublicDashboard(filters),
    staleTime: 60_000,
  });
}

/** Protected insights data hook (Step 16). */
export function useInsights(filters: InsightsFilters = {}) {
  return useQuery({
    queryKey: ["insights", filters],
    queryFn: () => getInsights(filters),
    staleTime: 60_000,
  });
}
