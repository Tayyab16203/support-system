"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { FALLBACK_COLOR, STATUS_COLORS } from "@/components/charts/chartColors";
import { formatStatus } from "@/lib/utils";
import type { AvgTimePerStatus } from "@/types/dashboard";

interface AvgTimeChartProps {
  data: AvgTimePerStatus;
}

// Render statuses in their natural lifecycle order when present.
const STATUS_ORDER = ["pending", "in_progress", "paused", "in_review", "completed"];

/**
 * Bar chart of the average hours a ticket dwells in each status, reconstructed
 * from status-change history. Statuses with no measured time are omitted.
 */
export function AvgTimeChart({ data }: AvgTimeChartProps) {
  const chartData = STATUS_ORDER.filter((status) => status in data).map(
    (status) => ({
      status,
      label: formatStatus(status),
      hours: data[status],
    })
  );

  return (
    <ChartCard title="Avg Time in Status (hours)">
      {chartData.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          Not enough status history for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => [`${value} hrs`, "Avg time"]}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] ?? FALLBACK_COLOR}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
