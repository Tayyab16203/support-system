"use client";

import { format, parseISO } from "date-fns";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import type { OverTimeData } from "@/types/dashboard";

interface OverTimeLineChartProps {
  data: OverTimeData[];
}

/** Format an ISO date (yyyy-MM-dd) into a short "MMM d" axis label. */
function formatAxisDate(value: string): string {
  try {
    return format(parseISO(value), "MMM d");
  } catch {
    return value;
  }
}

/** Line chart of tickets created vs completed over time. */
export function OverTimeLineChart({ data }: OverTimeLineChartProps) {
  return (
    <ChartCard title="Tickets Over Time">
      {data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          No ticket data for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatAxisDate}
              tick={{ fontSize: 12 }}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip labelFormatter={(label: string) => formatAxisDate(label)} />
            <Legend />
            <Line
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
