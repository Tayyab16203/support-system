"use client";

import {
  CheckCircle2,
  Clock,
  FilePlus2,
  Filter,
  Inbox,
  Target,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AvgTimeChart } from "@/components/charts/AvgTimeChart";
import { BusiestDaysChart } from "@/components/charts/BusiestDaysChart";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/charts/DateRangePicker";
import { TrendKPICard } from "@/components/charts/TrendKPICard";
import { VelocityChart } from "@/components/charts/VelocityChart";
import { useInsights } from "@/hooks/useDashboard";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { formatStatus } from "@/lib/utils";

export default function DashboardPage() {
  const [projectId, setProjectId] = useState<string>("");
  const [range, setRange] = useState<DateRange>({ from: "", to: "" });

  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];

  const filters = useMemo(
    () => ({
      projectId: projectId || undefined,
      dateFrom: range.from || undefined,
      dateTo: range.to || undefined,
    }),
    [projectId, range.from, range.to]
  );

  const { data, isLoading, isError, refetch, isFetching } =
    useInsights(filters);

  const summary = data?.summary;
  const velocity = data?.velocity;
  const topType = data?.top_types?.[0];

  const hasFilters = Boolean(projectId || range.from || range.to);
  const activeProjectName =
    projects.find((p) => p.id === projectId)?.name ?? null;

  function clearFilters() {
    setProjectId("");
    setRange({ from: "", to: "" });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              My Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your personal activity: tickets you created, work assigned to you,
              and what you have completed.
            </p>
          </div>

          {isFetching && !isLoading && (
            <span className="inline-flex items-center gap-2 self-start rounded-full border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
              Updating…
            </span>
          )}
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border bg-surface p-3 shadow-soft">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  Filters
                </span>
              </div>
              <Select
                aria-label="Project filter"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full sm:w-52"
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <DateRangePicker value={range} onChange={setRange} />
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                leftIcon={<X className="h-4 w-4" />}
                className="self-start lg:self-auto"
              >
                Clear
              </Button>
            )}
          </div>

          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              {activeProjectName && (
                <FilterChip
                  label={`Project: ${activeProjectName}`}
                  onRemove={() => setProjectId("")}
                />
              )}
              {(range.from || range.to) && (
                <FilterChip
                  label={`Dates: ${range.from || "…"} → ${range.to || "today"}`}
                  onRemove={() => setRange({ from: "", to: "" })}
                />
              )}
            </div>
          )}
        </div>
      </header>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading || !data || !summary || !velocity ? (
        <LoadingState />
      ) : (
        <div
          className={
            isFetching ? "space-y-6 opacity-60 transition-opacity" : "space-y-6"
          }
        >
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <TrendKPICard
              label="Created by Me"
              value={summary.created}
              change={velocity.trend.created_change}
              icon={<FilePlus2 className="h-5 w-5" />}
            />
            <TrendKPICard
              label="Assigned to Me"
              value={summary.assigned}
              icon={<Inbox className="h-5 w-5" />}
            />
            <TrendKPICard
              label="Completed by Me"
              value={summary.completed}
              change={velocity.trend.completed_change}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <TrendKPICard
              label="Completion Rate"
              value={summary.completion_rate}
              suffix="%"
              icon={<Target className="h-5 w-5" />}
            />
            <TrendKPICard
              label="Avg Resolution"
              value={summary.avg_resolution_hours}
              suffix="hrs"
              invertColors
              icon={<Clock className="h-5 w-5" />}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <VelocityChart velocity={velocity} />
            <AvgTimeChart data={data.avg_time_per_status} />
            <BusiestDaysChart data={data.busiest_days} />
            <TopTypesCard
              data={data.top_types}
              highlight={topType?.type ?? null}
            />
          </section>
        </div>
      )}
    </div>
  );
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

/** A removable pill summarizing one active dashboard filter. */
function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-soft-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="rounded-full p-0.5 hover:bg-primary/10"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

interface TopTypesCardProps {
  data: { type: string; count: number; percentage: number }[];
  highlight: string | null;
}

/** Ranked breakdown of the user's ticket types with a share bar per row. */
function TopTypesCard({ data, highlight }: TopTypesCardProps) {
  const rows = data.filter((d) => d.count > 0);

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">
        My Tickets by Type
      </h2>
      {rows.length === 0 ? (
        <p className="mt-4 flex h-60 items-center justify-center text-sm text-muted-foreground">
          No tickets for this range.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((row) => (
            <li key={row.type} className="flex items-center gap-4">
              <span className="w-32 shrink-0 text-sm font-medium text-foreground">
                {formatStatus(row.type)}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={
                    row.type === highlight
                      ? "h-full rounded-full bg-primary"
                      : "h-full rounded-full bg-primary/40"
                  }
                  style={{ width: `${row.percentage}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-sm text-muted-foreground">
                {row.count} · {row.percentage}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border bg-surface shadow-soft"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-xl border bg-surface shadow-soft"
          />
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  onRetry: () => void;
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft p-8 text-center">
      <p className="text-sm font-medium text-danger">
        Unable to load your dashboard.
      </p>
      <div className="mt-4 flex justify-center">
        <Button variant="danger" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
