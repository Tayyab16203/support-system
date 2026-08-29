"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import type { BusiestDay } from "@/types/dashboard";

interface BusiestDaysChartProps {
  data: BusiestDay[];
}

/**
 * Area chart of the average number of tickets created on each weekday,
 * highlighting when demand tends to peak across the week.
 */
export function BusiestDaysChart({ data }: BusiestDaysChartProps) {
  const chartData = data.map((d) => ({ ...d, label: d.day.slice(0, 3) }));
  const hasData = chartData.some((d) => d.avg_created > 0);

  return (
    <ChartCard title="Busiest Days (avg created)">
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          No ticket data for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
          >
            <defs>
              <linearGradient id="busiestFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => [value, "Avg created"]}
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.day ?? ""
              }
            />
            <Area
              type="monotone"
              dataKey="avg_created"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#busiestFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
