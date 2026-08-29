/**
 * User data hooks using React Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminResetUserPassword,
  createUser,
  deleteUser,
  listAssignableUsers,
  listMentionableUsers,
  listUsers,
  updateUserRole,
} from "@/lib/usersApi";
import type { AdminUserCreate, UserRole } from "@/types/user";

export function useUsers(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["users", page, pageSize],
    queryFn: () => listUsers(page, pageSize),
  });
}

/**
 * Users that can be assigned to a ticket (admin-only endpoint).
 * Pass `enabled: false` for non-admins so the request isn't made.
 */
export function useAssignableUsers(enabled = true) {
  return useQuery({
    queryKey: ["assignable-users"],
    queryFn: listAssignableUsers,
    enabled,
  });
}

/**
 * Users that can be @mentioned in a comment (non-admin endpoint, available to
 * every authenticated user). Cached broadly since the list rarely changes.
 */
export function useMentionableUsers(enabled = true) {
  return useQuery({
    queryKey: ["mentionable-users"],
    queryFn: listMentionableUsers,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { entity: "User", action: "create" },
    mutationFn: (payload: AdminUserCreate) => createUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { entity: "User", successMessage: "User role updated" },
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAdminResetPassword() {
  return useMutation({
    meta: { entity: "User", successMessage: "Password reset email sent" },
    mutationFn: (userId: string) => adminResetUserPassword(userId),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { entity: "User", action: "delete" },
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}