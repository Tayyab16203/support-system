"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useAuditLogs } from "@/hooks/useAudit";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Select } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog, AuditLogFilters } from "@/types/audit";

const PAGE_SIZE = 50;

/** Action identifiers the backend emits (see AuditEvents). */
const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All actions" },
  { value: "ticket.created", label: "Ticket created" },
  { value: "ticket.updated", label: "Ticket updated" },
  { value: "ticket.status_changed", label: "Ticket status changed" },
  { value: "ticket.deleted", label: "Ticket deleted" },
  { value: "project.created", label: "Project created" },
  { value: "project.updated", label: "Project updated" },
  { value: "project.deleted", label: "Project deleted" },
  { value: "file.uploaded", label: "File uploaded" },
  { value: "file.deleted", label: "File deleted" },
  { value: "bulk.status_changed", label: "Bulk status change" },
  { value: "bulk.assigned", label: "Bulk assign" },
  { value: "bulk.deleted", label: "Bulk delete" },
];

const RESOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All resources" },
  { value: "ticket", label: "Ticket" },
  { value: "project", label: "Project" },
  { value: "attachment", label: "Attachment" },
  { value: "user", label: "User" },
];

type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

/** Color the action badge by the kind of action for quick scanning. */
function actionTone(action: string): BadgeTone {
  if (action.includes("deleted")) return "danger";
  if (action.includes("created") || action.includes("uploaded"))
    return "success";
  if (action.startsWith("bulk")) return "warning";
  return "info";
}

/** Render a value in a compact, human-readable way. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : `${value.length}`;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/** Turn a snake_case key into a readable label ("file_name" -> "File name"). */
function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type ChangeEntry = { old?: unknown; new?: unknown };

/** A single "Field: old → new" line for change sets. */
function ChangeRow({ field, change }: { field: string; change: ChangeEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="font-medium text-foreground">{humanizeKey(field)}:</span>
      <span className="text-muted-foreground line-through">
        {formatValue(change.old)}
      </span>
      <span className="text-muted-foreground">→</span>
      <span className="text-foreground">{formatValue(change.new)}</span>
    </div>
  );
}

function MetadataCell({ log }: { log: AuditLog }) {
  const metadata = log.metadata ?? {};

  // Change sets ({ changes: { field: { old, new } } }) render as diff lines.
  if (
    "changes" in metadata &&
    metadata.changes &&
    typeof metadata.changes === "object"
  ) {
    const changes = metadata.changes as Record<string, ChangeEntry>;
    const fields = Object.keys(changes);
    if (fields.length === 0) {
      return <span className="text-muted-foreground">No changes</span>;
    }
    return (
      <div className="space-y-0.5 text-xs">
        {fields.map((field) => (
          <ChangeRow key={field} field={field} change={changes[field]} />
        ))}
      </div>
    );
  }

  // Everything else renders as "Label: value" pairs.
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== null && value !== undefined && value !== ""
  );
  if (entries.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="space-y-0.5 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-foreground">
            {humanizeKey(key)}:
          </span>
          <span className="text-foreground">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAuditPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const { data, isLoading, error } = useAuditLogs(page, PAGE_SIZE, filters);

  function updateFilter(key: keyof AuditLogFilters, value: string) {
    setPage(1);
    setFilters((prev) => {
      const next = { ...prev };
      if (value) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  // Non-admins should never see this page (Sidebar hides it, but guard anyway).
  if (!authLoading && !isAdmin) {
    return (
      <EmptyState
        title="Access denied"
        description="You do not have permission to view this page."
      />
    );
  }

  const logs = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground">
          A record of every create, update, and delete across tickets,
          projects, and files. Mirrored to AWS CloudWatch.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-surface p-4 shadow-soft">
        <FormField label="Action" className="min-w-[12rem]">
          <Select
            value={filters.action ?? ""}
            onChange={(e) => updateFilter("action", e.target.value)}
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Resource" className="min-w-[12rem]">
          <Select
            value={filters.resource_type ?? ""}
            onChange={(e) => updateFilter("resource_type", e.target.value)}
          >
            {RESOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>

        {(filters.action || filters.resource_type) && (
          <Button
            variant="outline"
            onClick={() => {
              setFilters({});
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <EmptyState
          icon={ScrollText}
          title="Failed to load audit log"
          description="Something went wrong. Please try again."
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries"
          description="No audit entries match these filters."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-surface-muted">
                <tr>
                  <Th>When</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Resource</Th>
                  <Th>IP</Th>
                  <Th>Details</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="align-top transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div>
                          <div className="font-medium text-foreground">
                            {log.actor.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {log.actor.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={actionTone(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="capitalize">{log.resource_type}</div>
                      <div className="font-mono text-[11px] text-muted-foreground/70">
                        {log.resource_id}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {log.ip_address ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <MetadataCell log={log} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {totalPages} · {pagination.total} entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  );
}
