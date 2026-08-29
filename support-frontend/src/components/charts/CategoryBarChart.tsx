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
import { FALLBACK_COLOR } from "@/components/charts/chartColors";
import { formatStatus } from "@/lib/utils";

export interface CategoryDatum {
  /** Raw domain value used for color lookup and labels (e.g. "bug"). */
  key: string;
  count: number;
}

interface CategoryBarChartProps {
  title: string;
  data: CategoryDatum[];
  colors: Record<string, string>;
}

/** Reusable vertical bar chart for a categorical breakdown (type/priority). */
export function CategoryBarChart({ title, data, colors }: CategoryBarChartProps) {
  const hasData = data.some((d) => d.count > 0);
  const chartData = data.map((d) => ({ ...d, label: formatStatus(d.key) }));

  return (
    <ChartCard title={title}>
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          No ticket data for this range.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => [value, "Count"]}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={colors[entry.key] ?? FALLBACK_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
