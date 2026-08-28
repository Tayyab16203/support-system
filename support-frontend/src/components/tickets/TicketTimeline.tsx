"use client";

import { useActivities } from "@/hooks/useActivities";
import { formatDateTime, formatStatus } from "@/lib/utils";
import type { Activity, ActivityActionType } from "@/types/ticket";

interface TicketTimelineProps {
  /** The ticket whose activity timeline is shown. */
  ticketId: string;
}

interface ActionStyle {
  /** Emoji icon rendered inside the timeline node. */
  icon: string;
  /** Tailwind classes for the timeline node background/text. */
  node: string;
}

const ACTION_STYLES: Record<ActivityActionType, ActionStyle> = {
  created: { icon: "✚", node: "bg-green-100 text-green-700" },
  status_changed: { icon: "⇄", node: "bg-blue-100 text-blue-700" },
  updated: { icon: "✎", node: "bg-amber-100 text-amber-700" },
  commented: { icon: "💬", node: "bg-gray-100 text-gray-700" },
  file_uploaded: { icon: "📎", node: "bg-purple-100 text-purple-700" },
  file_deleted: { icon: "🗑", node: "bg-red-100 text-red-700" },
  assigned: { icon: "👤", node: "bg-indigo-100 text-indigo-700" },
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
  const actorName = activity.actor?.name ?? "Someone";

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      <span
        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${style.node}`}
        aria-hidden="true"
      >
        {style.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800">
          <span className="font-medium">{actorName}</span>{" "}
          {describeActivity(activity)}
        </p>

        <time className="mt-1 block text-xs text-gray-400">
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
    <div className="space-y-4 rounded-lg border bg-white p-6">
      <h2 className="text-sm font-semibold text-gray-500">Activity</h2>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading activity...</p>
      ) : error ? (
        <p className="text-sm text-red-600">Could not load the timeline.</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-gray-500">No activity yet.</p>
      ) : (
        <ol className="relative ml-1 before:absolute before:left-4 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:-translate-x-1/2 before:bg-gray-200">
          {activities.map((activity) => (
            <TimelineEntry key={activity.id} activity={activity} />
          ))}
        </ol>
      )}
    </div>
  );
}
