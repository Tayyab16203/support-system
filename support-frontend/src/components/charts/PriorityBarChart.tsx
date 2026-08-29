import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { PRIORITY_COLORS } from "@/components/charts/chartColors";
import type { PriorityBreakdown } from "@/types/dashboard";

interface PriorityBarChartProps {
  data: PriorityBreakdown[];
}

/** Bar chart of ticket counts by priority. */
export function PriorityBarChart({ data }: PriorityBarChartProps) {
  return (
    <CategoryBarChart
      title="Tickets by Priority"
      colors={PRIORITY_COLORS}
      data={data.map((d) => ({ key: d.priority, count: d.count }))}
    />
  );
}
