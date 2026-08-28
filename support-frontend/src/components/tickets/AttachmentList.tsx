"use client";

import { useState } from "react";
import { useAttachments, useDeleteAttachment } from "@/hooks/useUploads";
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
    return <p className="text-sm text-gray-500">Loading attachments...</p>;
  }

  if (!attachments || attachments.length === 0) {
    return <p className="text-sm text-gray-500">No attachments yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="group relative overflow-hidden rounded-lg border bg-gray-50"
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
                <div className="flex h-32 w-full items-center justify-center text-sm text-gray-400">
                  {attachment.content_type}
                </div>
              )}
            </a>

            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-700">
                  {attachment.file_name}
                </p>
                <p className="text-[11px] text-gray-500">
                  {formatFileSize(attachment.file_size)}
                </p>
              </div>
              <button
                onClick={() => setDeleteTarget(attachment)}
                className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete attachment?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget.file_name}</span> from
              storage. This action cannot be undone.
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
                disabled={deleteAttachment.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteAttachment.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
