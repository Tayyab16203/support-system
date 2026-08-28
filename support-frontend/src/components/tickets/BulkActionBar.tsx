"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  useBulkAssign,
  useBulkStatusChange,
} from "@/hooks/useTickets";
import { useAssignableUsers } from "@/hooks/useUsers";
import type { BulkResult } from "@/lib/ticketsApi";
import { formatStatus } from "@/lib/utils";
import type { TicketStatus } from "@/types/ticket";

interface BulkActionBarProps {
  /** IDs of the tickets currently selected. */
  selectedIds: string[];
  /** Clear the current selection. */
  onClear: () => void;
  /** Open the confirmation modal for bulk delete (admin only). */
  onRequestDelete: () => void;
}

const STATUS_VALUES: TicketStatus[] = [
  "pending",
  "in_progress",
  "paused",
  "in_review",
  "completed",
];

/** Summarize a bulk result into a short user-facing message. */
function resultMessage(result: BulkResult): string {
  const parts = [`${result.success_count} updated`];
  if (result.failure_count > 0) {
    parts.push(`${result.failure_count} failed`);
  }
  return parts.join(", ");
}

/**
 * Floating bar that appears when one or more tickets are selected. Shows the
 * selection count and batch actions: change status (all users), assign and
 * delete (admins only). Assign/delete are hidden for non-admins to match the
 * backend's admin-only rules.
 */
export function BulkActionBar({
  selectedIds,
  onClear,
  onRequestDelete,
}: BulkActionBarProps) {
  const { isAdmin } = useAuth();
  const { data: users } = useAssignableUsers(isAdmin);
  const bulkStatus = useBulkStatusChange();
  const bulkAssign = useBulkAssign();

  const [feedback, setFeedback] = useState<string | null>(null);

  const count = selectedIds.length;
  const busy = bulkStatus.isPending || bulkAssign.isPending;

  async function handleStatus(status: string) {
    if (!status) return;
    setFeedback(null);
    try {
      const result = await bulkStatus.mutateAsync({
        ticketIds: selectedIds,
        status: status as TicketStatus,
      });
      setFeedback(resultMessage(result));
    } catch {
      setFeedback("Status change failed.");
    }
  }

  async function handleAssign(assignedTo: string) {
    if (!assignedTo) return;
    setFeedback(null);
    try {
      const result = await bulkAssign.mutateAsync({
        ticketIds: selectedIds,
        assignedTo,
      });
      setFeedback(resultMessage(result));
    } catch {
      setFeedback("Assignment failed.");
    }
  }

  return (
    <div className="sticky bottom-4 z-40 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <span className="text-sm font-medium text-gray-900">
        {count} selected
      </span>

      <div className="h-5 w-px bg-gray-200" />

      {/* Change status — available to all users. */}
      <label className="flex items-center gap-2 text-sm text-gray-600">
        Status
        <select
          defaultValue=""
          disabled={busy}
          onChange={(e) => {
            void handleStatus(e.target.value);
            e.target.value = "";
          }}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="" disabled>
            Change to…
          </option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {formatStatus(s)}
            </option>
          ))}
        </select>
      </label>

      {/* Assign — admins only. */}
      {isAdmin && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Assign
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              void handleAssign(e.target.value);
              e.target.value = "";
            }}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="" disabled>
              Assign to…
            </option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Delete — admins only. */}
      {isAdmin && (
        <button
          type="button"
          disabled={busy}
          onClick={onRequestDelete}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Delete
        </button>
      )}

      {feedback && (
        <span className="text-sm text-gray-500">{feedback}</span>
      )}

      <div className="ml-auto">
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
