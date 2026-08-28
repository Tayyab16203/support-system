/**
 * Admin user-management API functions.
 */

import { api } from "@/lib/api";
import type { AdminUserCreate, PaginationMeta, User, UserRole } from "@/types/user";

interface UserListResponse {
  data: User[];
  pagination: PaginationMeta;
}

interface UserResponse {
  data: User;
  message: string;
}

export async function listUsers(page = 1, pageSize = 20): Promise<UserListResponse> {
  return api.get<UserListResponse>("/admin/users", {
    page: String(page),
    page_size: String(pageSize),
  });
}

export async function createUser(payload: AdminUserCreate): Promise<UserResponse> {
  return api.post<UserResponse>("/admin/users", payload);
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UserResponse> {
  return api.patch<UserResponse>(`/admin/users/${userId}/role`, { role });
}

interface ResetPasswordResponse {
  data: { id: string; email: string };
  message: string;
}

export async function adminResetUserPassword(
  userId: string
): Promise<ResetPasswordResponse> {
  return api.post<ResetPasswordResponse>(`/admin/users/${userId}/reset-password`);
}

export async function deleteUser(userId: string): Promise<void> {
  return api.delete(`/admin/users/${userId}`);
}

/** A user eligible to be assigned a ticket (admin-only endpoint). */
export interface AssignableUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function listAssignableUsers(): Promise<AssignableUser[]> {
  const res = await api.get<{ data: AssignableUser[] }>(
    "/admin/users/assignable"
  );
  return res.data;
}