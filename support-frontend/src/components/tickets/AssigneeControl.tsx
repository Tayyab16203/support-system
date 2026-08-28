"use client";

import { useAuth } from "@/hooks/useAuth";
import { useUpdateTicket } from "@/hooks/useTickets";
import { useAssignableUsers } from "@/hooks/useUsers";
import { formatStatus } from "@/lib/utils";
import type { Ticket } from "@/types/ticket";

interface AssigneeControlProps {
  ticket: Ticket;
}

/**
 * Shows the current assignee. Admins get a dropdown to assign the ticket to
 * another admin or a user (or unassign it); non-admins see read-only text.
 * The assignment change is recorded on the activity timeline by the backend.
 */
export function AssigneeControl({ ticket }: AssigneeControlProps) {
  const { isAdmin } = useAuth();
  const updateTicket = useUpdateTicket();
  // Only admins may fetch the assignable-users list (admin-only endpoint).
  const { data: users, isLoading } = useAssignableUsers(isAdmin);

  const currentName = ticket.assigned_to_user?.name ?? "Unassigned";

  if (!isAdmin) {
    return <span className="text-sm text-gray-800">{currentName}</span>;
  }

  async function handleChange(value: string) {
    const nextAssignee = value || null;
    if (nextAssignee === (ticket.assigned_to ?? null)) return;
    await updateTicket.mutateAsync({
      ticketId: ticket.id,
      payload: { assigned_to: nextAssignee },
    });
  }

  return (
    <select
      value={ticket.assigned_to ?? ""}
      disabled={updateTicket.isPending || isLoading}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
    >
      <option value="">Unassigned</option>
      {(users ?? []).map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} ({formatStatus(u.role)})
        </option>
      ))}
    </select>
  );
}
