import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number | string;
  accentClassName?: string;
  suffix?: string;
}

/** A single KPI metric card (label + large value). */
export function KPICard({ label, value, accentClassName, suffix }: KPICardProps) {
  return (
    <div className="bg-white rounded-lg border p-6 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={cn("mt-2 text-3xl font-bold text-gray-900", accentClassName)}>
        {value}
        {suffix ? <span className="ml-1 text-base font-medium text-gray-400">{suffix}</span> : null}
      </p>
    </div>
  );
}
