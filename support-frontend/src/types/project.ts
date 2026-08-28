/**
 * Project-related TypeScript types.
 */

export interface Project {
  id: string;
  name: string;
  description: string | null;
  jira_project_key: string | null;
  discord_webhook_url: string | null;
  is_public: boolean;
  email_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  jira_project_key?: string;
  discord_webhook_url?: string;
  is_public?: boolean;
  email_enabled?: boolean;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  jira_project_key?: string;
  discord_webhook_url?: string;
  is_public?: boolean;
  email_enabled?: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
