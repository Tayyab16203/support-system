/**
 * Shared color palettes for dashboard charts, keyed by domain value so a
 * given status/type/priority always renders in the same color.
 */

export const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  paused: "#a855f7",
  in_review: "#06b6d4",
  completed: "#22c55e",
};

export const TYPE_COLORS: Record<string, string> = {
  technical_error: "#ef4444",
  bug: "#f97316",
  feature: "#3b82f6",
  remove: "#6b7280",
};

export const PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

/** Fallback color for any value missing from a palette. */
export const FALLBACK_COLOR = "#94a3b8";
