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
