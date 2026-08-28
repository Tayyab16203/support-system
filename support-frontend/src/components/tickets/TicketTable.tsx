"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateTicket } from "@/hooks/useTickets";
import { useAssignableUsers } from "@/hooks/useUsers";
import type { TicketSortField } from "@/lib/ticketsApi";
import { formatDateTime, formatStatus } from "@/lib/utils";
import type {
  Priority,
  Ticket,
  TicketStatus,
  TicketType,
} from "@/types/ticket";

interface TicketTableProps {
  tickets: Ticket[];
  /** Active sort field. */
  sortBy: TicketSortField;
  /** Active sort direction. */
  sortOrder: "asc" | "desc";
  /** Toggle/set sort when a sortable header is clicked. */
  onSort: (field: TicketSortField) => void;
  /** Called when the user requests deletion of a ticket. */
  onDelete: (ticket: Ticket) => void;
  /** IDs of the currently selected tickets (for bulk operations). */
  selectedIds: Set<string>;
  /** Toggle selection of a single ticket. */
  onToggleSelect: (ticketId: string) => void;
  /** Select or clear all tickets on the current page. */
  onToggleSelectAll: (select: boolean) => void;
}

/** Checkbox that supports the indeterminate ("some selected") visual state. */
function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate) && !checked;
    }
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
  );
}

const STATUS_STYLES: Record<TicketStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  in_review: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-gray-100 text-gray-600",
};

const STATUS_VALUES: TicketStatus[] = [
  "pending",
  "in_progress",
  "paused",
  "in_review",
  "completed",
];

const TYPE_VALUES: TicketType[] = [
  "technical_error",
  "bug",
  "feature",
  "remove",
];

interface ColumnDef {
  label: string;
  field?: TicketSortField;
  align?: "right";
}

const COLUMNS: ColumnDef[] = [
  { label: "Title", field: "title" },
  { label: "Type" },
  { label: "Priority", field: "priority" },
  { label: "Status", field: "status" },
  { label: "Assigned" },
  { label: "Created", field: "created_at" },
  { label: "Actions", align: "right" },
];

function SortIndicator({ active, order }: { active: boolean; order: "asc" | "desc" }) {
  if (!active) return <span className="text-gray-300"> ↕</span>;
  return <span> {order === "asc" ? "↑" : "↓"}</span>;
}

export function TicketTable({
  tickets,
  sortBy,
  sortOrder,
  onSort,
  onDelete,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}: TicketTableProps) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const updateTicket = useUpdateTicket();
  // Assignment is admin-only, so only admins load the assignable-users list.
  const { data: assignableUsers, isLoading: usersLoading } =
    useAssignableUsers(isAdmin);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const selectedOnPage = tickets.filter((t) => selectedIds.has(t.id)).length;
  const allSelected = tickets.length > 0 && selectedOnPage === tickets.length;
  const someSelected = selectedOnPage > 0 && !allSelected;

  /** Apply an inline field update, keeping the row disabled while in flight. */
  async function applyUpdate(
    ticket: Ticket,
    payload: Parameters<typeof updateTicket.mutateAsync>[0]["payload"]
  ) {
    setPendingId(ticket.id);
    try {
      await updateTicket.mutateAsync({ ticketId: ticket.id, payload });
    } finally {
      setPendingId(null);
    }
  }

  function handleStatusChange(ticket: Ticket, status: TicketStatus) {
    if (status === ticket.status) return;
    void applyUpdate(ticket, { status });
  }

  function handleTypeChange(ticket: Ticket, type: TicketType) {
    if (type === ticket.type) return;
    void applyUpdate(ticket, { type });
  }

  function handleAssigneeChange(ticket: Ticket, value: string) {
    const nextAssignee = value || null;
    if (nextAssignee === (ticket.assigned_to ?? null)) return;
    void applyUpdate(ticket, { assigned_to: nextAssignee });
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b bg-gray-50">
        <tr>
          <th className="w-10 px-4 py-3 text-left">
            <SelectCheckbox
              ariaLabel="Select all tickets on this page"
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(checked) => onToggleSelectAll(checked)}
            />
          </th>
          {COLUMNS.map((col) => (
            <th
              key={col.label}
              className={`px-4 py-3 font-medium text-gray-600 ${
                col.align === "right" ? "text-right" : "text-left"
              }`}
            >
              {col.field ? (
                <button
                  type="button"
                  onClick={() => onSort(col.field as TicketSortField)}
                  className="font-medium text-gray-600 hover:text-gray-900"
                >
                  {col.label}
                  <SortIndicator active={sortBy === col.field} order={sortOrder} />
                </button>
              ) : (
                col.label
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y">
        {tickets.map((ticket) => {
          const rowPending = pendingId === ticket.id;
          return (
            <tr
              key={ticket.id}
              onClick={() => router.push(`/tickets/${ticket.id}`)}
              className={`cursor-pointer hover:bg-gray-50 ${
                selectedIds.has(ticket.id) ? "bg-blue-50" : ""
              }`}
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <SelectCheckbox
                  ariaLabel={`Select ticket ${ticket.title}`}
                  checked={selectedIds.has(ticket.id)}
                  onChange={() => onToggleSelect(ticket.id)}
                />
              </td>
              <td className="px-4 py-3">
                <span className="font-medium text-blue-600">{ticket.title}</span>
              </td>
              {/* Inline type editing (available to all users). */}
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <select
                  value={ticket.type}
                  disabled={rowPending}
                  onChange={(e) =>
                    handleTypeChange(ticket, e.target.value as TicketType)
                  }
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                >
                  {TYPE_VALUES.map((t) => (
                    <option key={t} value={t}>
                      {formatStatus(t)}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[ticket.priority]}`}
                >
                  {formatStatus(ticket.priority)}
                </span>
              </td>
              {/* Inline status editing (available to all users). */}
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <select
                  value={ticket.status}
                  disabled={rowPending}
                  onChange={(e) =>
                    handleStatusChange(ticket, e.target.value as TicketStatus)
                  }
                  className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${STATUS_STYLES[ticket.status]}`}
                >
                  {STATUS_VALUES.map((s) => (
                    <option key={s} value={s}>
                      {formatStatus(s)}
                    </option>
                  ))}
                </select>
              </td>
              {/* Inline assignee editing for admins; read-only text otherwise. */}
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                {isAdmin ? (
                  <select
                    value={ticket.assigned_to ?? ""}
                    disabled={rowPending || usersLoading}
                    onChange={(e) => handleAssigneeChange(ticket, e.target.value)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {(assignableUsers ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-gray-600">
                    {ticket.assigned_to_user?.name ?? "Unassigned"}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {formatDateTime(ticket.created_at)}
              </td>
              <td
                className="px-4 py-3 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => router.push(`/tickets/${ticket.id}/edit`)}
                  className="mr-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(ticket)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
