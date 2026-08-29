"use client";

import {
  CheckCircle2,
  Clock,
  FilePlus2,
  Inbox,
  Target,
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

  const { data, isLoading, isError, refetch, isFetching } = useInsights(filters);

  const summary = data?.summary;
  const velocity = data?.velocity;
  const topType = data?.top_types?.[0];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            My Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your personal activity: tickets you created, work assigned to you,
            and what you have completed.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <select
            aria-label="Project filter"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <DateRangePicker value={range} onChange={setRange} />
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

interface TopTypesCardProps {
  data: { type: string; count: number; percentage: number }[];
  highlight: string | null;
}

/** Ranked breakdown of the user's ticket types with a share bar per row. */
function TopTypesCard({ data, highlight }: TopTypesCardProps) {
  const rows = data.filter((d) => d.count > 0);

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700">
        My Tickets by Type
      </h2>
      {rows.length === 0 ? (
        <p className="mt-4 flex h-60 items-center justify-center text-sm text-gray-400">
          No tickets for this range.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {rows.map((row) => (
            <li key={row.type} className="flex items-center gap-4">
              <span className="w-32 shrink-0 text-sm font-medium text-gray-700">
                {formatStatus(row.type)}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={
                    row.type === highlight
                      ? "h-full rounded-full bg-blue-600"
                      : "h-full rounded-full bg-blue-300"
                  }
                  style={{ width: `${row.percentage}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-right text-sm text-gray-500">
                {row.count} · {row.percentage}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border bg-white shadow-sm"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-lg border bg-white shadow-sm"
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
    <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-sm font-medium text-red-700">
        Unable to load your dashboard.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Retry
      </button>
    </div>
  );
}
