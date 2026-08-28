"use client";

import { useState } from "react";
import { useAddComment, useComments } from "@/hooks/useActivities";
import { formatDateTime } from "@/lib/utils";
import type { Activity } from "@/types/ticket";

interface TicketCommentsProps {
  /** The ticket whose comments are shown. */
  ticketId: string;
}

function CommentItem({ comment }: { comment: Activity }) {
  const author = comment.actor?.name ?? "Someone";
  const initial = author.charAt(0).toUpperCase();

  return (
    <li className="flex gap-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700"
        aria-hidden="true"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-800">{author}</span>
          <time className="text-xs text-gray-400">
            {formatDateTime(comment.created_at)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          {comment.comment}
        </p>
      </div>
    </li>
  );
}

export function TicketComments({ ticketId }: TicketCommentsProps) {
  const { data, isLoading, error } = useComments(ticketId);
  const addComment = useAddComment(ticketId);
  const [comment, setComment] = useState("");

  const comments = data?.data ?? [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed || addComment.isPending) return;
    await addComment.mutateAsync(trimmed);
    setComment("");
  }

  return (
    <div className="space-y-4 rounded-lg border bg-white p-6">
      <h2 className="text-sm font-semibold text-gray-500">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading comments...</p>
      ) : error ? (
        <p className="text-sm text-red-600">Could not load comments.</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} />
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="border-t pt-4">
        <label htmlFor="comment" className="sr-only">
          Add a comment
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Add a comment..."
          className="w-full resize-y rounded-lg border border-gray-300 p-3 text-sm text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {addComment.isError && (
          <p className="mt-1 text-xs text-red-600">
            Could not post your comment. Please try again.
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!comment.trim() || addComment.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {addComment.isPending ? "Posting..." : "Comment"}
          </button>
        </div>
      </form>
    </div>
  );
}
