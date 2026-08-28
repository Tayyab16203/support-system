"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  useUsers,
  useCreateUser,
  useAdminResetPassword,
  useDeleteUser,
} from "@/hooks/useUsers";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/user";

export default function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading, profile } = useAuth();
  const { data, isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const resetPassword = useAdminResetPassword();
  const deleteUser = useDeleteUser();
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleResetPassword(userId: string, userEmail: string) {
    const confirmed = window.confirm(
      `Send a password reset code to ${userEmail}? They will receive an email with a code to set a new password.`
    );
    if (!confirmed) return;

    setResettingId(userId);
    setFormError(null);
    setSuccess(null);
    try {
      await resetPassword.mutateAsync(userId);
      setSuccess(`A password reset code was emailed to ${userEmail}.`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to reset password";
      setFormError(message);
    } finally {
      setResettingId(null);
    }
  }

  async function handleDelete(userId: string, userEmail: string) {
    const confirmed = window.confirm(
      `Permanently delete ${userEmail}? This removes their account and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(userId);
    setFormError(null);
    setSuccess(null);
    try {
      await deleteUser.mutateAsync(userId);
      setSuccess(`User ${userEmail} was deleted.`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to delete user";
      setFormError(message);
    } finally {
      setDeletingId(null);
    }
  }

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Non-admins should never see this page (Sidebar hides it, but guard anyway)
  if (!authLoading && !isAdmin) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-gray-600">
        You do not have permission to view this page.
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    try {
      await createUser.mutateAsync({ email, name, role });
      setSuccess(`User ${email} created. An invite email was sent.`);
      setName("");
      setEmail("");
      setRole("user");
      setShowForm(false);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to create user";
      setFormError(message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-600">
            Create and manage users. Admins can create both users and admins.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {formError && !showForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-6 sm:grid-cols-2"
        >
          {formError && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={createUser.isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createUser.isPending ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">Failed to load users.</div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === "admin"
                          ? "rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                          : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                      }
                    >
                      {u.role === "admin" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleResetPassword(u.id, u.email)}
                        disabled={resettingId === u.id}
                        className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {resettingId === u.id ? "Sending..." : "Reset Password"}
                      </button>
                      {u.id !== profile?.id && (
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          disabled={deletingId === u.id}
                          className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === u.id ? "Deleting..." : "Delete"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}