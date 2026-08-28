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