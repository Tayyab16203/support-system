"use client";

import { useMemo, useRef, useState } from "react";
import { useAddComment, useComments } from "@/hooks/useActivities";
import { useMentionableUsers } from "@/hooks/useUsers";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { cn, formatDateTime } from "@/lib/utils";
import type { MentionableUser } from "@/lib/usersApi";
import type { Activity } from "@/types/ticket";

interface TicketCommentsProps {
  /** The ticket whose comments are shown. */
  ticketId: string;
}

/** Max number of user suggestions shown in the mention dropdown. */
const MAX_SUGGESTIONS = 6;

/**
 * A detected "@..." token the user is currently typing, located immediately
 * before the caret. `query` is the text after the "@" (used to filter users),
 * and `start` is the index of the "@" so we can splice in the chosen mention.
 */
interface ActiveMention {
  query: string;
  start: number;
}

/**
 * Find the mention the caret is sitting inside, if any. A mention is an "@"
 * that starts the text or follows whitespace, followed by non-whitespace
 * "query" characters up to the caret. Returns null when the caret is not in a
 * mention (e.g. there is a space after the "@", or no "@" precedes it).
 */
function detectActiveMention(value: string, caret: number): ActiveMention | null {
  // Walk backwards from the caret to the nearest "@" or whitespace.
  let i = caret - 1;
  while (i >= 0 && !/\s/.test(value[i]) && value[i] !== "@") {
    i -= 1;
  }
  if (i < 0 || value[i] !== "@") return null;

  // The "@" must be at the start or preceded by whitespace / "(" so we don't
  // trigger on emails typed mid-word (e.g. "foo@bar").
  const before = i > 0 ? value[i - 1] : "";
  if (before && !/\s/.test(before) && before !== "(") return null;

  return { query: value.slice(i + 1, caret), start: i };
}

function CommentItem({ comment }: { comment: Activity }) {
  const author = comment.actor?.name ?? "Someone";
  const initial = author.charAt(0).toUpperCase();

  return (
    <li className="flex gap-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-soft-foreground"
        aria-hidden="true"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">{author}</span>
          <time className="text-xs text-muted-foreground">
            {formatDateTime(comment.created_at)}
          </time>
        </div>
        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-sm text-foreground">
          {comment.comment}
        </p>
      </div>
    </li>
  );
}

export function TicketComments({ ticketId }: TicketCommentsProps) {
  const { data, isLoading, error } = useComments(ticketId);
  const addComment = useAddComment(ticketId);
  const { data: mentionUsers } = useMentionableUsers();

  const [comment, setComment] = useState("");
  const [mention, setMention] = useState<ActiveMention | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const comments = data?.data ?? [];

  // Users matching the active "@query" (by name or email), capped for the UI.
  const suggestions = useMemo<MentionableUser[]>(() => {
    if (!mention || !mentionUsers) return [];
    const q = mention.query.trim().toLowerCase();
    const pool = q
      ? mentionUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        )
      : mentionUsers;
    return pool.slice(0, MAX_SUGGESTIONS);
  }, [mention, mentionUsers]);

  const showDropdown = mention !== null && suggestions.length > 0;

  function syncMentionFromCaret(value: string) {
    const el = textareaRef.current;
    const caret = el ? el.selectionStart ?? value.length : value.length;
    const next = detectActiveMention(value, caret);
    setMention(next);
    setActiveIndex(0);
  }

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setComment(value);
    syncMentionFromCaret(value);
  }

  /** Replace the active "@query" with "@<email> " and move the caret after it. */
  function insertMention(user: MentionableUser) {
    if (!mention) return;
    const before = comment.slice(0, mention.start);
    const after = comment.slice(mention.start + 1 + mention.query.length);
    const token = `@${user.email} `;
    const next = `${before}${token}${after}`;
    setComment(next);
    setMention(null);
    setActiveIndex(0);

    // Restore focus and place the caret right after the inserted token.
    const caret = before.length + token.length;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(caret, caret);
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!showDropdown) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        break;
      case "Enter":
      case "Tab":
        event.preventDefault();
        insertMention(suggestions[activeIndex]);
        break;
      case "Escape":
        event.preventDefault();
        setMention(null);
        break;
      default:
        break;
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed || addComment.isPending) return;
    await addComment.mutateAsync(trimmed);
    setComment("");
    setMention(null);
  }

  return (
    <div className="space-y-4 rounded-xl border bg-surface p-6 shadow-soft">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : error ? (
        <p className="text-sm text-danger">Could not load comments.</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
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
        <div className="relative">
          <Textarea
            id="comment"
            ref={textareaRef}
            value={comment}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onClick={() => syncMentionFromCaret(comment)}
            onBlur={() => {
              // Delay so a click on a suggestion registers before we close.
              window.setTimeout(() => setMention(null), 120);
            }}
            rows={3}
            maxLength={5000}
            placeholder="Add a comment... use @ to mention someone"
            className="resize-y"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls="mention-listbox"
          />

          {showDropdown && (
            <ul
              id="mention-listbox"
              role="listbox"
              className="absolute left-0 right-0 z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-input bg-surface py-1 shadow-lg"
            >
              {suggestions.map((user, index) => (
                <li key={user.id} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    // onMouseDown (not onClick) fires before the textarea's
                    // onBlur, so the insertion isn't cancelled by blur.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(user);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left",
                      index === activeIndex ? "bg-surface-muted" : "bg-transparent"
                    )}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-foreground"
                      aria-hidden="true"
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {user.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {addComment.isError && (
          <p className="mt-1 text-xs text-danger">
            Could not post your comment. Please try again.
          </p>
        )}
        <div className="mt-2 flex justify-end">
          <Button
            type="submit"
            disabled={!comment.trim()}
            isLoading={addComment.isPending}
          >
            Comment
          </Button>
        </div>
      </form>
    </div>
  );
}
