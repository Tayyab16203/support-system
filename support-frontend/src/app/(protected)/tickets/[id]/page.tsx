"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useDeleteTicket, useTicket } from "@/hooks/useTickets";
import { AssigneeControl } from "@/components/tickets/AssigneeControl";
import { AttachmentList } from "@/components/tickets/AttachmentList";
import { FileUpload } from "@/components/tickets/FileUpload";
import { TicketComments } from "@/components/tickets/TicketComments";
import { TicketTimeline } from "@/components/tickets/TicketTimeline";
import { formatDateTime, formatStatus } from "@/lib/utils";
import type { Priority, TicketStatus } from "@/types/ticket";

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

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ticketId = params?.id;

  const { data, isLoading, error } = useTicket(ticketId);
  const deleteTicket = useDeleteTicket();
  const [showDelete, setShowDelete] = useState(false);

  const ticket = data?.data;

  async function handleDelete() {
    if (!ticketId) return;
    await deleteTicket.mutateAsync(ticketId);
    router.push("/tickets");
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-8 text-center text-red-600">
          Ticket not found or could not be loaded.
        </div>
        <button
          onClick={() => router.push("/tickets")}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to tickets
        </button>
      </div>
    );
  }

  const creatorName = ticket.created_by_user?.name ?? "Unknown";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/tickets")}
            className="mb-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to tickets
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Created by{" "}
            <span className="font-medium text-gray-700">{creatorName}</span> ·{" "}
            {formatDateTime(ticket.created_at)}
          </p>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>

      {/* Two-column layout: ticket details on the left, activity timeline on the right. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left / main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              label={formatStatus(ticket.status)}
              className={STATUS_STYLES[ticket.status]}
            />
            <Badge
              label={formatStatus(ticket.priority)}
              className={PRIORITY_STYLES[ticket.priority]}
            />
            <Badge
              label={formatStatus(ticket.type)}
              className="bg-gray-100 text-gray-600"
            />
            {ticket.jira_key && (
              <Badge
                label={ticket.jira_key}
                className="bg-indigo-100 text-indigo-700"
              />
            )}
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-500">Description</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-800">
              {ticket.description}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Created by
              </dt>
              <dd className="mt-1 text-sm text-gray-800">{creatorName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Assigned to
              </dt>
              <dd className="mt-1">
                <AssigneeControl ticket={ticket} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Created
              </dt>
              <dd className="mt-1 text-sm text-gray-800">
                {formatDateTime(ticket.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-gray-500">
                Last updated
              </dt>
              <dd className="mt-1 text-sm text-gray-800">
                {formatDateTime(ticket.updated_at)}
              </dd>
            </div>
          </dl>

          <div className="space-y-4 rounded-lg border bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-500">Attachments</h2>
            <FileUpload ticketId={ticket.id} />
            <AttachmentList ticketId={ticket.id} />
          </div>
        </div>

        {/* Right column: activity timeline (events only) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <TicketTimeline ticketId={ticket.id} />
          </div>
        </div>
      </div>

      {/* Comments — a separate section at the bottom of the page. */}
      <TicketComments ticketId={ticket.id} />

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete ticket?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-medium">{ticket.title}</span>. This action
              cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
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
