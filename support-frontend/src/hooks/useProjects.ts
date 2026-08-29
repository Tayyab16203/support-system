/**
 * Project data hooks using React Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  deleteProject,
  getProjectTicketCount,
  listProjects,
  updateProject,
} from "@/lib/projectsApi";
import type { ProjectCreate, ProjectUpdate } from "@/types/project";

export function useProjects(page = 1, pageSize = 100) {
  return useQuery({
    queryKey: ["projects", page, pageSize],
    queryFn: () => listProjects(page, pageSize),
  });
}

export function useProjectTicketCount(projectId: string | null) {
  return useQuery({
    queryKey: ["project-ticket-count", projectId],
    queryFn: () => getProjectTicketCount(projectId as string),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { entity: "Project", action: "create" },
    mutationFn: (payload: ProjectCreate) => createProject(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      payload,
    }: {
      projectId: string;
      payload: ProjectUpdate;
    }) => updateProject(projectId, payload),
    meta: { entity: "Project", action: "update" },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { entity: "Project", action: "delete" },
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
