import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

/** Card wrapper providing a consistent title + surface for a chart. */
export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="rounded-xl border bg-surface p-6 shadow-soft">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-4 h-72 w-full">{children}</div>
    </div>
  );
}
