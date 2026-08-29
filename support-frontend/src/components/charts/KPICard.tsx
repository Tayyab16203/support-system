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
    <div className="rounded-xl border bg-surface p-6 shadow-soft">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn("mt-2 text-3xl font-bold text-foreground", accentClassName)}
      >
        {value}
        {suffix ? (
          <span className="ml-1 text-base font-medium text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}
