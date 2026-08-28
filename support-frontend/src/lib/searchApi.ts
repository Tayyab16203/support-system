/**
 * Search and saved-filter API functions.
 *
 * Search is scoped to the currently selected project; the shared api client
 * attaches the X-Project-ID header automatically. Saved filters are per-user
 * and do not require a project context.
 */

import { api } from "@/lib/api";
import type { PaginationMeta } from "@/types/project";
import type {
  SavedFilter,
  SavedFilterValues,
  SearchResult,
} from "@/types/search";

export interface SearchParams {
  q: string;
  status?: string;
  type?: string;
  priority?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResponse {
  data: SearchResult[];
  pagination: PaginationMeta;
}

export interface SavedFiltersResponse {
  data: SavedFilter[];
}

export interface SavedFilterResponse {
  data: SavedFilter;
  message: string;
}

export async function searchTickets(
  params: SearchParams
): Promise<SearchResponse> {
  const query: Record<string, string> = {
    q: params.q,
    page: String(params.page ?? 1),
    page_size: String(params.pageSize ?? 20),
  };
  if (params.status) query.status = params.status;
  if (params.type) query.type = params.type;
  if (params.priority) query.priority = params.priority;

  return api.get<SearchResponse>("/search", query);
}

export async function getSavedFilters(): Promise<SavedFiltersResponse> {
  return api.get<SavedFiltersResponse>("/search/filters");
}

export async function saveFilter(
  name: string,
  filters: SavedFilterValues
): Promise<SavedFilterResponse> {
  return api.post<SavedFilterResponse>("/search/filters", { name, filters });
}

export async function deleteSavedFilter(filterId: string): Promise<void> {
  return api.delete(`/search/filters/${filterId}`);
}
