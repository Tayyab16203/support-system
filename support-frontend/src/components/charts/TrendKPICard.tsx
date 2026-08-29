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
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon ? (
          <span className="text-gray-300" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight text-gray-900">
          {value}
          {suffix ? (
            <span className="ml-1 text-base font-medium text-gray-400">
              {suffix}
            </span>
          ) : null}
        </p>

        {hasChange ? (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              isGood && "bg-green-50 text-green-700",
              isBad && "bg-red-50 text-red-700",
              isFlat && "bg-gray-100 text-gray-500"
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
