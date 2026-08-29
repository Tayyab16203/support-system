"use client";

import { useMemo, useState } from "react";
import { KPICard } from "@/components/charts/KPICard";
import { OverTimeLineChart } from "@/components/charts/OverTimeLineChart";
import { PriorityBarChart } from "@/components/charts/PriorityBarChart";
import { StatusPieChart } from "@/components/charts/StatusPieChart";
import { TypeBarChart } from "@/components/charts/TypeBarChart";
import { usePublicDashboard } from "@/hooks/useDashboard";

export default function PublicInsightsPage() {
  const [projectId, setProjectId] = useState<string>("");

  const { data, isLoading, isError, refetch } = usePublicDashboard(
    projectId ? { projectId } : {}
  );

  // The unfiltered response lists every public project, so we derive the
  // filter dropdown options from `by_project` without a second request.
  const projectOptions = useMemo(
    () =>
      (data?.by_project ?? []).map((p) => ({
        id: p.project_id,
        name: p.project_name,
      })),
    [data?.by_project]
  );

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Support System Insights
            </h1>
            <p className="text-gray-600">
              Public metrics across our open support projects.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="project-filter" className="text-sm text-gray-600">
              Project
            </label>
            <select
              id="project-filter"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All public projects</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </header>

        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading || !summary ? (
          <LoadingState />
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <KPICard label="Total" value={summary.total_tickets} />
              <KPICard
                label="Pending"
                value={summary.pending}
                accentClassName="text-amber-500"
              />
              <KPICard
                label="In Progress"
                value={summary.in_progress}
                accentClassName="text-blue-500"
              />
              <KPICard
                label="Paused"
                value={summary.paused}
                accentClassName="text-purple-500"
              />
              <KPICard
                label="In Review"
                value={summary.in_review}
                accentClassName="text-cyan-500"
              />
              <KPICard
                label="Completed"
                value={summary.completed}
                accentClassName="text-green-500"
              />
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KPICard
                label="Avg Resolution Time"
                value={summary.avg_resolution_hours}
                suffix="hrs"
              />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <StatusPieChart summary={summary} />
              <OverTimeLineChart data={data.over_time} />
              <TypeBarChart data={data.by_type} />
              <PriorityBarChart data={data.by_priority} />
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border bg-white shadow-sm"
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
    <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <p className="text-sm font-medium text-red-700">
        Unable to load dashboard metrics.
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
