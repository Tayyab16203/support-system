/**
 * Search and saved-filter hooks using React Query.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteSavedFilter,
  getSavedFilters,
  saveFilter,
  searchTickets,
  type SearchParams,
} from "@/lib/searchApi";
import { useProjectContext } from "@/providers/ProjectProvider";
import type { SavedFilterValues } from "@/types/search";

/**
 * Full-text search over tickets in the current project.
 *
 * The query is disabled until there are at least 2 characters (the backend
 * rejects shorter queries) and a project is selected. Callers should pass an
 * already-debounced query string to avoid a request per keystroke.
 */
export function useSearch(params: SearchParams) {
  const { selectedProjectId } = useProjectContext();
  const trimmed = params.q.trim();
  return useQuery({
    queryKey: ["search", selectedProjectId, { ...params, q: trimmed }],
    queryFn: () => searchTickets({ ...params, q: trimmed }),
    enabled: Boolean(selectedProjectId) && trimmed.length >= 2,
  });
}

export function useSavedFilters() {
  return useQuery({
    queryKey: ["saved-filters"],
    queryFn: getSavedFilters,
  });
}

export function useSaveFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      filters,
    }: {
      name: string;
      filters: SavedFilterValues;
    }) => saveFilter(name, filters),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
    },
  });
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (filterId: string) => deleteSavedFilter(filterId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
    },
  });
}
