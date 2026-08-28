/**
 * Project management API functions.
 */

import { api } from "@/lib/api";
import type {
  PaginationMeta,
  Project,
  ProjectCreate,
  ProjectUpdate,
} from "@/types/project";

interface ProjectListResponse {
  data: Project[];
  pagination: PaginationMeta;
}

interface ProjectResponse {
  data: Project;
  message: string;
}

export async function listProjects(
  page = 1,
  pageSize = 100
): Promise<ProjectListResponse> {
  return api.get<ProjectListResponse>("/projects", {
    page: String(page),
    page_size: String(pageSize),
  });
}

export async function getProject(projectId: string): Promise<ProjectResponse> {
  return api.get<ProjectResponse>(`/projects/${projectId}`);
}

export async function createProject(
  payload: ProjectCreate
): Promise<ProjectResponse> {
  return api.post<ProjectResponse>("/projects", payload);
}

export async function updateProject(
  projectId: string,
  payload: ProjectUpdate
): Promise<ProjectResponse> {
  return api.put<ProjectResponse>(`/projects/${projectId}`, payload);
}

export async function deleteProject(projectId: string): Promise<void> {
  return api.delete(`/projects/${projectId}`);
}

export async function getProjectTicketCount(projectId: string): Promise<number> {
  const res = await api.get<{ data: { count: number } }>(
    `/projects/${projectId}/ticket-count`
  );
  return res.data.count;
}
