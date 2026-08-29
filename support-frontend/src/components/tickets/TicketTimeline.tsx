"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { formatDateTime, formatStatus } from "@/lib/utils";
import type { Activity, ActivityActionType } from "@/types/ticket";

interface TicketTimelineProps {
  /** The ticket whose activity timeline is shown. */
  ticketId: string;
}

interface ActionStyle {
  icon: LucideIcon;
  /** Tailwind classes for the timeline node background/text. */
  node: string;
}

const ACTION_STYLES: Record<ActivityActionType, ActionStyle> = {
  created: { icon: Plus, node: "bg-success-soft text-success" },
  status_changed: { icon: ArrowLeftRight, node: "bg-info-soft text-info" },
  updated: { icon: Pencil, node: "bg-warning-soft text-warning" },
  commented: {
    icon: MessageSquare,
    node: "bg-surface-muted text-muted-foreground",
  },
  file_uploaded: { icon: Paperclip, node: "bg-primary-soft text-primary" },
  file_deleted: { icon: Trash2, node: "bg-danger-soft text-danger" },
  assigned: { icon: UserPlus, node: "bg-primary-soft text-primary" },
};

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "none";
  if (typeof value === "string") return formatStatus(value);
  return String(value);
}

/** Build a human-readable summary line for an activity entry. */
function describeActivity(activity: Activity): string {
  const { action_type, old_value, new_value } = activity;

  switch (action_type) {
    case "created":
      return "created this ticket";
    case "status_changed":
      return `changed status from ${stringifyValue(
        old_value?.status
      )} to ${stringifyValue(new_value?.status)}`;
    case "assigned": {
      // The backend stores resolved names alongside the ids in the JSON.
      const toName = new_value?.assigned_to_name as string | undefined;
      const fromName = old_value?.assigned_to_name as string | undefined;
      if (new_value?.assigned_to) {
        return fromName
          ? `reassigned this ticket from ${fromName} to ${toName ?? "someone"}`
          : `assigned this ticket to ${toName ?? "someone"}`;
      }
      return "unassigned this ticket";
    }
    case "updated": {
      const fields = new_value ? Object.keys(new_value) : [];
      return fields.length > 0
        ? `updated ${fields.join(", ")}`
        : "updated this ticket";
    }
    case "file_uploaded":
      return `uploaded ${stringifyValue(new_value?.file_name)}`;
    case "file_deleted":
      return `deleted ${stringifyValue(old_value?.file_name)}`;
    case "commented":
      return "commented";
    default:
      return "updated this ticket";
  }
}

function TimelineEntry({ activity }: { activity: Activity }) {
  const style = ACTION_STYLES[activity.action_type] ?? ACTION_STYLES.updated;
  const Icon = style.icon;
  const actorName = activity.actor?.name ?? "Someone";

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <span
        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.node}`}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <span className="font-medium">{actorName}</span>{" "}
          {describeActivity(activity)}
        </p>

        <time className="mt-1 block text-xs text-muted-foreground">
          {formatDateTime(activity.created_at)}
        </time>
      </div>
    </li>
  );
}

export function TicketTimeline({ ticketId }: TicketTimelineProps) {
  const { data, isLoading, error } = useActivities(ticketId);
  const activities = data?.data ?? [];

  return (
    <div className="space-y-4 rounded-xl border bg-surface p-6 shadow-soft">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Activity
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading activity...</p>
      ) : error ? (
        <p className="text-sm text-danger">Could not load the timeline.</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="relative ml-1 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:-translate-x-1/2 before:bg-border">
          {activities.map((activity) => (
            <TimelineEntry key={activity.id} activity={activity} />
          ))}
        </ol>
      )}
    </div>
  );
}
