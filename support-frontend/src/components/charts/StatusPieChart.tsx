"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import { FALLBACK_COLOR, STATUS_COLORS } from "@/components/charts/chartColors";
import { formatStatus } from "@/lib/utils";
import type { DashboardSummary } from "@/types/dashboard";

interface StatusPieChartProps {
  summary: DashboardSummary;
}

/** Pie chart of ticket counts by status. */
export function StatusPieChart({ summary }: StatusPieChartProps) {
  const data = [
    { status: "pending", value: summary.pending },
    { status: "in_progress", value: summary.in_progress },
    { status: "paused", value: summary.paused },
    { status: "in_review", value: summary.in_review },
    { status: "completed", value: summary.completed },
  ].filter((entry) => entry.value > 0);

  return (
    <ChartCard title="Tickets by Status">
      {data.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(entry) => formatStatus(String(entry.status))}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] ?? FALLBACK_COLOR}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [value, formatStatus(name)]}
            />
            <Legend formatter={(value: string) => formatStatus(value)} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      No ticket data for this range.
    </div>
  );
}
