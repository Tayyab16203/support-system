/**
 * User-related TypeScript types.
 */

export type UserRole = "admin" | "user";

export interface User {
  id: string;
  cognito_sub: string;
  email: string;
  name: string;
  role: UserRole;
  email_notifications: boolean;
  saved_filters: unknown[];
  created_at: string;
  updated_at: string;
}

export interface AdminUserCreate {
  email: string;
  name: string;
  role: UserRole;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}