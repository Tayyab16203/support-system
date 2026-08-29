/**
 * Dashboard and analytics TypeScript types.
 */

export interface DashboardSummary {
  total_tickets: number;
  pending: number;
  in_progress: number;
  paused: number;
  in_review: number;
  completed: number;
  avg_resolution_hours: number;
}

export interface TypeBreakdown {
  type: string;
  count: number;
}

export interface PriorityBreakdown {
  priority: string;
  count: number;
}

export interface OverTimeData {
  date: string;
  created: number;
  completed: number;
}

export interface PublicDashboard {
  summary: DashboardSummary;
  by_type: TypeBreakdown[];
  by_priority: PriorityBreakdown[];
  over_time: OverTimeData[];
  by_project: ProjectBreakdown[];
}

export interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  total: number;
  completed: number;
}

/** Response envelope for the public dashboard endpoint. */
export interface PublicDashboardResponse {
  data: PublicDashboard;
}

/** Optional filters for the public dashboard query. */
export interface PublicDashboardFilters {
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/* ------------------------------------------------------------------ */
/* Protected insights (Step 16)                                        */
/* ------------------------------------------------------------------ */

export interface VelocityPeriod {
  created: number;
  completed: number;
}

export interface VelocityTrend {
  created_change: number;
  completed_change: number;
}

export interface Velocity {
  current_period: VelocityPeriod;
  previous_period: VelocityPeriod;
  trend: VelocityTrend;
}

/** Average hours spent in each status. Keys are ticket statuses. */
export type AvgTimePerStatus = Record<string, number>;

/** Headline personal counts for the logged-in user. */
export interface PersonalSummary {
  created: number;
  assigned: number;
  completed: number;
  open_assigned: number;
  completion_rate: number;
  avg_resolution_hours: number;
}

export interface BusiestDay {
  day: string;
  avg_created: number;
}

export interface TopType {
  type: string;
  count: number;
  percentage: number;
}

export interface Insights {
  summary: PersonalSummary;
  velocity: Velocity;
  avg_time_per_status: AvgTimePerStatus;
  busiest_days: BusiestDay[];
  top_types: TopType[];
}

/** Response envelope for the protected insights endpoint. */
export interface InsightsResponse {
  data: Insights;
}

/** Optional filters for the insights query. */
export interface InsightsFilters {
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}
