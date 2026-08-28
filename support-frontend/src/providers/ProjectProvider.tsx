"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/types/project";

const STORAGE_KEY = "selectedProjectId";

interface ProjectContextType {
  /** All projects available to the current user. */
  projects: Project[];
  /** The currently selected project, or null if none. */
  selectedProject: Project | null;
  /** The currently selected project ID, or null. */
  selectedProjectId: string | null;
  /** Select a project by ID (persisted to localStorage). */
  selectProject: (projectId: string) => void;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const { data, isLoading } = useProjects();
  const projects = useMemo(() => data?.data ?? [], [data]);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Restore the persisted selection once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedProjectId(stored);
    }
  }, []);

  // Once projects load, make sure the selection is valid. If not, fall back
  // to the first available project.
  useEffect(() => {
    if (projects.length === 0) return;

    const isValid =
      selectedProjectId != null &&
      projects.some((p) => p.id === selectedProjectId);

    if (!isValid) {
      const fallback = projects[0].id;
      setSelectedProjectId(fallback);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, fallback);
      }
    }
  }, [projects, selectedProjectId]);

  function selectProject(projectId: string): void {
    setSelectedProjectId(projectId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, projectId);
    }
  }

  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        selectedProjectId,
        selectProject,
        isLoading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
