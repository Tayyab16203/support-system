"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useAuditLogs } from "@/hooks/useAudit";
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

/** Color the action badge by the kind of action for quick scanning. */
function actionBadgeClass(action: string): string {
  if (action.includes("deleted")) {
    return "bg-red-100 text-red-700";
  }
  if (action.includes("created") || action.includes("uploaded")) {
    return "bg-green-100 text-green-700";
  }
  if (action.startsWith("bulk")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-blue-100 text-blue-700";
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
      <span className="font-medium text-gray-700">{humanizeKey(field)}:</span>
      <span className="text-gray-400 line-through">
        {formatValue(change.old)}
      </span>
      <span className="text-gray-400">→</span>
      <span className="text-gray-900">{formatValue(change.new)}</span>
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
      return <span className="text-gray-400">No changes</span>;
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
    return <span className="text-gray-400">—</span>;
  }
  return (
    <div className="space-y-0.5 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-wrap items-center gap-1">
          <span className="font-medium text-gray-700">{humanizeKey(key)}:</span>
          <span className="text-gray-900">{formatValue(value)}</span>
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
      <div className="rounded-lg border bg-white p-8 text-center text-gray-600">
        You do not have permission to view this page.
      </div>
    );
  }

  const logs = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-600">
          A record of every create, update, and delete across tickets,
          projects, and files. Mirrored to AWS CloudWatch.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Action
          <select
            value={filters.action ?? ""}
            onChange={(e) => updateFilter("action", e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">
          Resource
          <select
            value={filters.resource_type ?? ""}
            onChange={(e) => updateFilter("resource_type", e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {RESOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {(filters.action || filters.resource_type) && (
          <button
            type="button"
            onClick={() => {
              setFilters({});
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading audit log...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Failed to load audit log.
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit entries match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    When
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Actor
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 align-top">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div>
                          <div className="font-medium text-gray-900">
                            {log.actor.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {log.actor.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="capitalize">{log.resource_type}</div>
                      <div className="font-mono text-[11px] text-gray-400">
                        {log.resource_id}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
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
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pagination.page} of {totalPages} · {pagination.total} entries
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
