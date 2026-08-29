"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/charts/ChartCard";
import type { Velocity } from "@/types/dashboard";

interface VelocityChartProps {
  velocity: Velocity;
}

/**
 * Grouped bar chart comparing created vs completed volume between the current
 * period and the immediately preceding one, so a manager can read momentum at
 * a glance.
 */
export function VelocityChart({ velocity }: VelocityChartProps) {
  const data = [
    {
      period: "Previous",
      created: velocity.previous_period.created,
      completed: velocity.previous_period.completed,
    },
    {
      period: "Current",
      created: velocity.current_period.created,
      completed: velocity.current_period.completed,
    },
  ];

  return (
    <ChartCard title="Velocity (Current vs Previous)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Legend />
          <Bar
            dataKey="created"
            name="Created"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="completed"
            name="Completed"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
