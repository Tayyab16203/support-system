"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketForm, type TicketFormValues } from "@/components/tickets/TicketForm";
import { useCreateTicket } from "@/hooks/useTickets";
import { uploadFile } from "@/lib/uploadsApi";
import { useProjectContext } from "@/providers/ProjectProvider";

function errorMessage(err: unknown): string {
  return err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : "Something went wrong while creating the ticket.";
}

export default function NewTicketPage() {
  const router = useRouter();
  const { selectedProject, isLoading: projectsLoading } = useProjectContext();
  const createTicket = useCreateTicket();
  const [serverError, setServerError] = useState<string | null>(null);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  async function handleSubmit(values: TicketFormValues) {
    setServerError(null);
    try {
      const result = await createTicket.mutateAsync({
        title: values.title,
        description: values.description,
        type: values.type,
        priority: values.priority,
      });

      const ticketId = result.data.id;

      // Upload any staged attachments now that the ticket exists.
      if (stagedFiles.length > 0) {
        setUploadingAttachments(true);
        try {
          for (const file of stagedFiles) {
            await uploadFile(ticketId, file);
          }
        } catch (uploadErr: unknown) {
          // The ticket was created; surface the upload issue but still
          // navigate so the user can retry uploads from the detail page.
          setServerError(
            `Ticket created, but an attachment failed to upload: ${errorMessage(
              uploadErr
            )}`
          );
        } finally {
          setUploadingAttachments(false);
        }
      }

      router.push(`/tickets/${ticketId}`);
    } catch (err: unknown) {
      setServerError(errorMessage(err));
    }
  }

  const isSubmitting = createTicket.isPending || uploadingAttachments;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Ticket</h1>
        <p className="text-sm text-gray-600">
          {selectedProject
            ? `New ticket in ${selectedProject.name}.`
            : "Select a project to create a ticket."}
        </p>
      </div>

      {!projectsLoading && !selectedProject ? (
        <div className="rounded-lg border bg-white p-8 text-center text-gray-500">
          No project selected. Choose a project from the sidebar first.
        </div>
      ) : (
        <TicketForm
          onSubmit={handleSubmit}
          onFilesChange={setStagedFiles}
          isSubmitting={isSubmitting}
          onCancel={() => router.push("/tickets")}
          serverError={serverError}
        />
      )}
    </div>
  );
}
