"use client";

import { useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { useAttachments, useDeleteAttachment } from "@/hooks/useUploads";
import { ConfirmDialog } from "@/components/ui/Modal";
import { formatFileSize } from "@/lib/utils";
import type { Attachment } from "@/types/ticket";

interface AttachmentListProps {
  /** The ticket whose attachments are shown. */
  ticketId: string;
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

function isVideo(contentType: string): boolean {
  return contentType.startsWith("video/");
}

export function AttachmentList({ ticketId }: AttachmentListProps) {
  const { data: attachments, isLoading } = useAttachments(ticketId);
  const deleteAttachment = useDeleteAttachment(ticketId);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteAttachment.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading attachments...</p>
    );
  }

  if (!attachments || attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">No attachments yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="group relative overflow-hidden rounded-lg border bg-surface-muted"
          >
            <a
              href={attachment.download_url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {isImage(attachment.content_type) && attachment.download_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.download_url}
                  alt={attachment.file_name}
                  className="h-32 w-full object-cover"
                />
              ) : isVideo(attachment.content_type) && attachment.download_url ? (
                <video
                  src={attachment.download_url}
                  controls
                  className="h-32 w-full bg-black object-contain"
                />
              ) : (
                <div className="flex h-32 w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-6 w-6" />
                  {attachment.content_type}
                </div>
              )}
            </a>

            <div className="flex items-center justify-between gap-2 border-t bg-surface px-2 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {attachment.file_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(attachment)}
                aria-label={`Delete ${attachment.file_name}`}
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete attachment?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.file_name}" from storage. This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        isLoading={deleteAttachment.isPending}
      />
    </>
  );
}
