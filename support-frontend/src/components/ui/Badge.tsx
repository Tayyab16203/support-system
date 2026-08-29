import { cn, formatStatus } from "@/lib/utils";
import type { Priority, TicketStatus, TicketType } from "@/types/ticket";

type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  /** Show a leading dot indicator. */
  dot?: boolean;
}

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

const DOT_TONES: Record<BadgeTone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/** A small pill-shaped label. */
export function Badge({ tone = "neutral", children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_TONES[tone])} />}
      {children}
    </span>
  );
}

/** Map domain values to badge tones so colors stay consistent app-wide. */
const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
  pending: "neutral",
  in_progress: "info",
  paused: "warning",
  in_review: "primary",
  completed: "success",
};

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

const TYPE_TONE: Record<TicketType, BadgeTone> = {
  technical_error: "danger",
  bug: "warning",
  feature: "primary",
  remove: "neutral",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot>
      {formatStatus(status)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{formatStatus(priority)}</Badge>;
}

export function TypeBadge({ type }: { type: TicketType }) {
  return <Badge tone={TYPE_TONE[type]}>{formatStatus(type)}</Badge>;
}
