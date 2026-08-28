/**
 * Ticket-related TypeScript types.
 */

export type TicketStatus = "pending" | "in_progress" | "paused" | "in_review" | "completed";
export type TicketType = "technical_error" | "bug" | "feature" | "remove";
export type Priority = "critical" | "high" | "medium" | "low";

export interface Ticket {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: TicketType;
  priority: Priority;
  status: TicketStatus;
  jira_key: string | null;
  created_by: UserSummary;
  assigned_to: UserSummary | null;
  attachments_count: number;
  activities_count: number;
  created_at: string;
  updated_at: string;
}

export interface TicketCreate {
  title: string;
  description: string;
  type: TicketType;
  priority: Priority;
  assigned_to?: string;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  type?: TicketType;
  priority?: Priority;
  status?: TicketStatus;
  assigned_to?: string | null;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
}
