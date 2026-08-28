"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeleteTicket, useTickets } from "@/hooks/useTickets";
import { useProjectContext } from "@/providers/ProjectProvider";
import { formatDateTime, formatStatus } from "@/lib/utils";
import type { Priority, Ticket, TicketStatus } from "@/types/ticket";

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

export default function TicketsPage() {
  const router = useRouter();
  const { selectedProject } = useProjectContext();
  const { data, isLoading, error } = useTickets();
  const deleteTicket = useDeleteTicket();
  const tickets = data?.data ?? [];

  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteTicket.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
          {selectedProject && (
            <p className="text-sm text-gray-600">{selectedProject.name}</p>
          )}
        </div>
        <Link
          href="/tickets/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Ticket
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading tickets...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Failed to load tickets.
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No tickets yet. Create your first ticket to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Priority
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {ticket.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatStatus(ticket.type)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[ticket.priority]}`}
                    >
                      {formatStatus(ticket.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[ticket.status]}`}
                    >
                      {formatStatus(ticket.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDateTime(ticket.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/tickets/${ticket.id}/edit`)}
                      className="mr-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(ticket)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete ticket?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget.title}</span>. This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteTicket.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteTicket.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
