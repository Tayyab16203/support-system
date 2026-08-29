"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LifeBuoy } from "lucide-react";
import { KPICard } from "@/components/charts/KPICard";
import { OverTimeLineChart } from "@/components/charts/OverTimeLineChart";
import { PriorityBarChart } from "@/components/charts/PriorityBarChart";
import { StatusPieChart } from "@/components/charts/StatusPieChart";
import { TypeBarChart } from "@/components/charts/TypeBarChart";
import { usePublicDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";

export default function PublicInsightsPage() {
  const { isAuthenticated } = useAuth();
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              Support System
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Home
            </Link>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<LayoutDashboard className="h-4 w-4" />}
                >
                  <span className="hidden sm:inline">Back to dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Support Insights
            </h1>
            <p className="mt-1 text-muted-foreground">
              Public metrics across our open support projects.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="project-filter"
              className="text-sm text-muted-foreground"
            >
              Project
            </label>
            <Select
              id="project-filter"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-56"
            >
              <option value="">All public projects</option>
              {projectOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

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
                accentClassName="text-warning"
              />
              <KPICard
                label="In Progress"
                value={summary.in_progress}
                accentClassName="text-info"
              />
              <KPICard
                label="Paused"
                value={summary.paused}
                accentClassName="text-warning"
              />
              <KPICard
                label="In Review"
                value={summary.in_review}
                accentClassName="text-primary"
              />
              <KPICard
                label="Completed"
                value={summary.completed}
                accentClassName="text-success"
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
            className="h-24 animate-pulse rounded-xl border bg-surface shadow-soft"
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
        Unable to load dashboard metrics.
      </p>
      <div className="mt-4 flex justify-center">
        <Button variant="danger" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
