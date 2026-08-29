"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBulkAssign, useBulkStatusChange } from "@/hooks/useTickets";
import { useAssignableUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/Button";
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

const bulkSelectClass =
  "rounded-lg border border-input bg-surface px-2 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50";

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
    <div className="sticky bottom-4 z-40 flex flex-wrap items-center gap-3 rounded-xl border bg-surface px-4 py-3 shadow-popover">
      <span className="text-sm font-semibold text-foreground">
        {count} selected
      </span>

      <div className="h-5 w-px bg-border" />

      {/* Change status — available to all users. */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Status
        <select
          defaultValue=""
          disabled={busy}
          onChange={(e) => {
            void handleStatus(e.target.value);
            e.target.value = "";
          }}
          className={bulkSelectClass}
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
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Assign
          <select
            defaultValue=""
            disabled={busy}
            onChange={(e) => {
              void handleAssign(e.target.value);
              e.target.value = "";
            }}
            className={bulkSelectClass}
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
        <Button
          variant="danger"
          size="sm"
          disabled={busy}
          onClick={onRequestDelete}
          leftIcon={<Trash2 className="h-4 w-4" />}
        >
          Delete
        </Button>
      )}

      {feedback && (
        <span className="text-sm text-muted-foreground">{feedback}</span>
      )}

      <div className="ml-auto">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
