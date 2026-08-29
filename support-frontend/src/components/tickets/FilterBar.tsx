"use client";

import { useAuth } from "@/hooks/useAuth";
import { useUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { TicketFilters } from "@/lib/ticketsApi";
import type { Priority, TicketStatus, TicketType } from "@/types/ticket";

interface FilterBarProps {
  /** The active filter values (excluding pagination/sort). */
  filters: TicketFilters;
  /** Called with a partial update whenever a control changes. */
  onChange: (patch: Partial<TicketFilters>) => void;
  /** Clears all filters back to their empty state. */
  onReset: () => void;
}

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "paused", label: "Paused" },
  { value: "in_review", label: "In Review" },
  { value: "completed", label: "Completed" },
];

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "technical_error", label: "Technical Error" },
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature" },
  { value: "remove", label: "Remove" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

/** Convert a date-only input value (YYYY-MM-DD) into an ISO datetime, or undefined. */
function toIsoStart(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function toIsoEnd(value: string): string | undefined {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : undefined;
}

/** Extract the YYYY-MM-DD portion of an ISO string for date input display. */
function isoToDateInput(value: string | undefined): string {
  return value ? value.slice(0, 10) : "";
}

function FilterLabel({
  children,
  control,
}: {
  children: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {children}
      {control}
    </label>
  );
}

export function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  const { isAdmin } = useAuth();
  // The users list is admin-only, so only fetch/show the assignee filter for admins.
  const { data: usersData } = useUsers(1, 100);
  const users = isAdmin ? usersData?.data ?? [] : [];

  const hasActiveFilters = Boolean(
    filters.status ||
      filters.type ||
      filters.priority ||
      filters.assignedTo ||
      filters.dateFrom ||
      filters.dateTo
  );

  return (
    <div className="grid grid-cols-2 items-end gap-3 rounded-xl border bg-surface p-4 shadow-soft sm:flex sm:flex-wrap">
      <FilterLabel
        control={
          <Select
            value={filters.status ?? ""}
            onChange={(e) =>
              onChange({
                status: (e.target.value || undefined) as
                  | TicketStatus
                  | undefined,
              })
            }
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
      >
        Status
      </FilterLabel>

      <FilterLabel
        control={
          <Select
            value={filters.type ?? ""}
            onChange={(e) =>
              onChange({
                type: (e.target.value || undefined) as TicketType | undefined,
              })
            }
          >
            <option value="">All</option>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
      >
        Type
      </FilterLabel>

      <FilterLabel
        control={
          <Select
            value={filters.priority ?? ""}
            onChange={(e) =>
              onChange({
                priority: (e.target.value || undefined) as
                  | Priority
                  | undefined,
              })
            }
          >
            <option value="">All</option>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
      >
        Priority
      </FilterLabel>

      {isAdmin && users.length > 0 && (
        <FilterLabel
          control={
            <Select
              value={filters.assignedTo ?? ""}
              onChange={(e) =>
                onChange({ assignedTo: e.target.value || undefined })
              }
            >
              <option value="">Anyone</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          }
        >
          Assignee
        </FilterLabel>
      )}

      <FilterLabel
        control={
          <Input
            type="date"
            value={isoToDateInput(filters.dateFrom)}
            onChange={(e) => onChange({ dateFrom: toIsoStart(e.target.value) })}
          />
        }
      >
        From
      </FilterLabel>

      <FilterLabel
        control={
          <Input
            type="date"
            value={isoToDateInput(filters.dateTo)}
            onChange={(e) => onChange({ dateTo: toIsoEnd(e.target.value) })}
          />
        }
      >
        To
      </FilterLabel>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="col-span-2 sm:col-auto sm:ml-auto"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
