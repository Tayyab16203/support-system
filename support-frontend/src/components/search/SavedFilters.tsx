"use client";

import { useEffect, useRef, useState } from "react";
import {
  useDeleteSavedFilter,
  useSaveFilter,
  useSavedFilters,
} from "@/hooks/useSearch";
import type { SavedFilter, SavedFilterValues } from "@/types/search";

interface SavedFiltersProps {
  /** The currently active filter values (used when saving a new filter). */
  currentFilters: SavedFilterValues;
  /** Called when the user applies a saved filter. */
  onApply: (filters: SavedFilterValues) => void;
}

/** True when the filter object has at least one active value to save. */
function hasValues(filters: SavedFilterValues): boolean {
  return Boolean(filters.status || filters.type || filters.priority);
}

/**
 * Dropdown for saving the current filter combination and applying or deleting
 * previously saved ones. Saved filters are stored per user on the backend.
 */
export function SavedFilters({ currentFilters, onApply }: SavedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useSavedFilters();
  const saveFilter = useSaveFilter();
  const deleteFilter = useDeleteSavedFilter();

  const filters = data?.data ?? [];

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || !hasValues(currentFilters)) return;
    await saveFilter.mutateAsync({ name: trimmed, filters: currentFilters });
    setName("");
  }

  function handleApply(filter: SavedFilter) {
    onApply(filter.filters);
    setOpen(false);
  }

  async function handleDelete(filterId: string) {
    await deleteFilter.mutateAsync(filterId);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Saved filters
        {filters.length > 0 && (
          <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">
            {filters.length}
          </span>
        )}
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border bg-white p-3 shadow-lg">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Save current filters
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave();
                }}
                placeholder="Filter name"
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  !name.trim() ||
                  !hasValues(currentFilters) ||
                  saveFilter.isPending
                }
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Save
              </button>
            </div>
            {!hasValues(currentFilters) && (
              <p className="mt-1 text-xs text-gray-400">
                Set at least one filter to save.
              </p>
            )}
          </div>

          <div className="border-t pt-2">
            {isLoading ? (
              <p className="py-2 text-center text-sm text-gray-400">Loading...</p>
            ) : filters.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">
                No saved filters yet.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {filters.map((filter) => (
                  <li
                    key={filter.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50"
                  >
                    <button
                      type="button"
                      onClick={() => handleApply(filter)}
                      className="flex-1 truncate text-left text-sm text-gray-700"
                    >
                      {filter.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(filter.id)}
                      disabled={deleteFilter.isPending}
                      aria-label={`Delete ${filter.name}`}
                      className="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.35 9m-4.78 0L9.26 9M4.5 5.79l14.74.001M8.6 5.79V4.2a1.2 1.2 0 0 1 1.2-1.2h4.4a1.2 1.2 0 0 1 1.2 1.2v1.59"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
