import { CategoryBarChart } from "@/components/charts/CategoryBarChart";
import { TYPE_COLORS } from "@/components/charts/chartColors";
import type { TypeBreakdown } from "@/types/dashboard";

interface TypeBarChartProps {
  data: TypeBreakdown[];
}

/** Bar chart of ticket counts by type. */
export function TypeBarChart({ data }: TypeBarChartProps) {
  return (
    <CategoryBarChart
      title="Tickets by Type"
      colors={TYPE_COLORS}
      data={data.map((d) => ({ key: d.type, count: d.count }))}
    />
  );
}
