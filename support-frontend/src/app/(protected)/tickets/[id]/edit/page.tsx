"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  TicketForm,
  type TicketFormValues,
} from "@/components/tickets/TicketForm";
import { useTicket, useUpdateTicket } from "@/hooks/useTickets";

function errorMessage(err: unknown): string {
  return err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : "Something went wrong while saving the ticket.";
}

export default function EditTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const ticketId = params?.id;

  const { data, isLoading, error } = useTicket(ticketId);
  const updateTicket = useUpdateTicket();
  const [serverError, setServerError] = useState<string | null>(null);

  const ticket = data?.data;

  async function handleSubmit(values: TicketFormValues) {
    if (!ticketId) return;
    setServerError(null);
    try {
      await updateTicket.mutateAsync({
        ticketId,
        payload: {
          title: values.title,
          description: values.description,
          type: values.type,
          priority: values.priority,
          status: values.status,
        },
      });
      router.push(`/tickets/${ticketId}`);
    } catch (err: unknown) {
      setServerError(errorMessage(err));
    }
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => router.push(`/tickets/${ticketId}`)}
          className="mb-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to ticket
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Ticket</h1>
      </div>

      <TicketForm
        mode="edit"
        initialValues={{
          title: ticket.title,
          description: ticket.description,
          type: ticket.type,
          priority: ticket.priority,
          status: ticket.status,
        }}
        onSubmit={handleSubmit}
        isSubmitting={updateTicket.isPending}
        onCancel={() => router.push(`/tickets/${ticketId}`)}
        serverError={serverError}
      />
    </div>
  );
}
