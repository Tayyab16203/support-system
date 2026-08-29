"use client";

import { cn } from "@/lib/utils";

export interface DateRange {
  /** ISO date (yyyy-MM-dd) or "" for the backend default. */
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Quick presets rendered as pills (label + number of days back). */
  presets?: { label: string; days: number }[];
}

const DEFAULT_PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

/** Return an ISO yyyy-MM-dd string for `today - days`. */
function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Compact date-range control with quick presets and explicit from/to inputs.
 *
 * Emitting empty strings lets the backend apply its own defaults (last 30
 * days), so a freshly reset picker still returns sensible data.
 */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
}: DateRangePickerProps) {
  const applyPreset = (days: number) => {
    onChange({ from: daysAgoIso(days), to: todayIso() });
  };

  const activePreset = presets.find(
    (p) => value.from === daysAgoIso(p.days) && value.to === todayIso()
  );
  const hasRange = Boolean(value.from || value.to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border bg-surface p-0.5 shadow-soft">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activePreset?.label === preset.label
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-surface-muted"
            )}
          >
            {preset.label}
          </button>
        ))}
        {hasRange && (
          <button
            type="button"
            onClick={() => onChange({ from: "", to: "" })}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted"
          >
            All time
          </button>
        )}
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-lg border bg-surface px-2 py-1 shadow-soft">
        <input
          type="date"
          aria-label="Start date"
          value={value.from}
          max={value.to || todayIso()}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="bg-transparent text-sm text-foreground focus:outline-none"
        />
        <span className="text-muted-foreground">→</span>
        <input
          type="date"
          aria-label="End date"
          value={value.to}
          min={value.from || undefined}
          max={todayIso()}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="bg-transparent text-sm text-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
