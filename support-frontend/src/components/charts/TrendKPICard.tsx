import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TrendKPICardProps {
  label: string;
  value: number | string;
  /** Percentage change vs the previous period (e.g. 12.5 or -8.6). */
  change?: number;
  /** When true, a downward trend is treated as good (green). */
  invertColors?: boolean;
  icon?: ReactNode;
  suffix?: string;
}

/**
 * KPI card with an optional trend indicator (arrow + percentage).
 *
 * The trend chip colors green for improvement and red for regression. Set
 * `invertColors` for metrics where a decrease is desirable.
 */
export function TrendKPICard({
  label,
  value,
  change,
  invertColors = false,
  icon,
  suffix,
}: TrendKPICardProps) {
  const hasChange = typeof change === "number";
  const isUp = hasChange && change! > 0;
  const isDown = hasChange && change! < 0;
  const isFlat = hasChange && change === 0;

  // Positive change is "good" unless colors are inverted.
  const isGood = invertColors ? isDown : isUp;
  const isBad = invertColors ? isUp : isDown;

  return (
    <div className="rounded-xl border bg-surface p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span className="text-muted-foreground/50" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {value}
          {suffix ? (
            <span className="ml-1 text-base font-medium text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </p>

        {hasChange ? (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              isGood && "bg-success-soft text-success",
              isBad && "bg-danger-soft text-danger",
              isFlat && "bg-surface-muted text-muted-foreground"
            )}
          >
            {isUp ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : isDown ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {Math.abs(change!)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
