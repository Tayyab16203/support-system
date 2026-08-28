/**
 * Attachment data hooks using React Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAttachment, listAttachments } from "@/lib/uploadsApi";

export function useAttachments(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["attachments", ticketId],
    queryFn: () => listAttachments(ticketId as string),
    enabled: Boolean(ticketId),
  });
}

export function useDeleteAttachment(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) => deleteAttachment(attachmentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["attachments", ticketId] });
    },
  });
}
