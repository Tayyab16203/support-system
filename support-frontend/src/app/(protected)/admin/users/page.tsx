"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  useUsers,
  useCreateUser,
  useAdminResetPassword,
  useDeleteUser,
} from "@/hooks/useUsers";
import { useToast } from "@/providers/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input, Select } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@/types/user";

function errorMessage(err: unknown, fallback: string): string {
  return err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : fallback;
}

export default function AdminUsersPage() {
  const { isAdmin, isLoading: authLoading, profile } = useAuth();
  const { data, isLoading, error } = useUsers();
  const toast = useToast();
  const createUser = useCreateUser();
  const resetPassword = useAdminResetPassword();
  const deleteUser = useDeleteUser();
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleResetPassword(userId: string, userEmail: string) {
    const confirmed = window.confirm(
      `Send a password reset code to ${userEmail}? They will receive an email with a code to set a new password.`
    );
    if (!confirmed) return;

    setResettingId(userId);
    try {
      await resetPassword.mutateAsync(userId);
      toast.success("Reset code sent", `Emailed to ${userEmail}.`);
    } catch (err: unknown) {
      toast.error("Reset failed", errorMessage(err, "Failed to reset password"));
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
    try {
      await deleteUser.mutateAsync(userId);
      toast.success("User deleted", `${userEmail} was removed.`);
    } catch (err: unknown) {
      toast.error("Delete failed", errorMessage(err, "Failed to delete user"));
    } finally {
      setDeletingId(null);
    }
  }

  // Non-admins should never see this page (Sidebar hides it, but guard anyway)
  if (!authLoading && !isAdmin) {
    return (
      <EmptyState
        title="Access denied"
        description="You do not have permission to view this page."
      />
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      await createUser.mutateAsync({ email, name, role });
      toast.success("User created", `An invite email was sent to ${email}.`);
      setName("");
      setEmail("");
      setRole("user");
      setShowForm(false);
    } catch (err: unknown) {
      setFormError(errorMessage(err, "Failed to create user"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Users
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage users. Admins can create both users and admins.
          </p>
        </div>
        <Button
          variant={showForm ? "outline" : "primary"}
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Cancel" : "Add User"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-4 rounded-xl border bg-surface p-6 shadow-soft sm:grid-cols-2"
        >
          {formError && (
            <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger sm:col-span-2">
              {formError}
            </div>
          )}
          <FormField label="Full Name">
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
            />
          </FormField>
          <FormField label="Email">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </FormField>
          <FormField label="Role">
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          <div className="flex items-end">
            <Button
              type="submit"
              className="w-full"
              isLoading={createUser.isPending}
            >
              Create user
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <EmptyState
          icon={Users}
          title="Failed to load users"
          description="Something went wrong. Please try again."
        />
      ) : !data || data.data.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-surface-muted">
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Created</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((u) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={u.role === "admin" ? "primary" : "neutral"}>
                        {u.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(u.id, u.email)}
                          isLoading={resettingId === u.id}
                        >
                          Reset Password
                        </Button>
                        {u.id !== profile?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-danger/40 text-danger hover:bg-danger-soft"
                            onClick={() => handleDelete(u.id, u.email)}
                            isLoading={deletingId === u.id}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
