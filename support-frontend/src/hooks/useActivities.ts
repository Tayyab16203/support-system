/**
 * Activity timeline data hooks using React Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addComment, listActivities, listComments } from "@/lib/activitiesApi";

export function useActivities(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["activities", ticketId],
    queryFn: () => listActivities(ticketId as string),
    enabled: Boolean(ticketId),
  });
}

export function useComments(ticketId: string | undefined) {
  return useQuery({
    queryKey: ["comments", ticketId],
    queryFn: () => listComments(ticketId as string),
    enabled: Boolean(ticketId),
  });
}

export function useAddComment(ticketId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { entity: "Comment", successMessage: "Comment added" },
    mutationFn: (comment: string) => addComment(ticketId as string, comment),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
    },
  });
}
