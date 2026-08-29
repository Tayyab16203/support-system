"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  TicketForm,
  type TicketFormValues,
} from "@/components/tickets/TicketForm";
import { useTicket, useUpdateTicket } from "@/hooks/useTickets";
import { useToast } from "@/providers/ToastProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/Spinner";

function errorMessage(err: unknown): string {
  return err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : "Something went wrong while saving the ticket.";
}

export default function EditTicketPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
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
      toast.success("Ticket updated");
      router.push(`/tickets/${ticketId}`);
    } catch (err: unknown) {
      setServerError(errorMessage(err));
    }
  }

  if (isLoading) {
    return <LoadingState label="Loading ticket..." />;
  }

  if (error || !ticket) {
    return (
      <EmptyState
        title="Ticket not found"
        description="This ticket could not be loaded. It may have been deleted."
        action={
          <Button
            variant="outline"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/tickets")}
          >
            Back to tickets
          </Button>
        }
      />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <button
          onClick={() => router.push(`/tickets/${ticketId}`)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to ticket
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Edit ticket
        </h1>
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
