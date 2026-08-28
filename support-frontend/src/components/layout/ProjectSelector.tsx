"use client";

import { FolderOpen } from "lucide-react";
import { useProjectContext } from "@/providers/ProjectProvider";

export function ProjectSelector() {
  const { projects, selectedProjectId, selectProject, isLoading } =
    useProjectContext();

  if (isLoading) {
    return (
      <div className="px-4 py-3">
        <div className="h-9 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-gray-400">No projects yet.</div>
    );
  }

  return (
    <div className="px-4 py-3">
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400">
        Project
      </label>
      <div className="relative">
        <FolderOpen className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          value={selectedProjectId ?? ""}
          onChange={(e) => selectProject(e.target.value)}
          className="block w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
