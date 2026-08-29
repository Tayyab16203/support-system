import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

/** Card wrapper providing a consistent title + surface for a chart. */
export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      <div className="mt-4 h-72 w-full">{children}</div>
    </div>
  );
}
