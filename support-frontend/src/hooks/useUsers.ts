/**
 * User data hooks using React Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminResetUserPassword,
  createUser,
  deleteUser,
  listAssignableUsers,
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

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AdminUserCreate) => createUser(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      updateUserRole(userId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: (userId: string) => adminResetUserPassword(userId),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}