"use client";

import { FolderOpen } from "lucide-react";
import { useProjectContext } from "@/providers/ProjectProvider";

export function ProjectSelector() {
  const { projects, selectedProjectId, selectProject, isLoading } =
    useProjectContext();

  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-muted-foreground">
        No projects yet.
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
        Active Project
      </label>
      <div className="relative">
        <FolderOpen className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={selectedProjectId ?? ""}
          onChange={(e) => selectProject(e.target.value)}
          className="block w-full appearance-none rounded-lg border border-input bg-surface py-2 pl-9 pr-8 text-sm font-medium text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
