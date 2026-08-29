"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import {
  useDeleteSavedFilter,
  useSaveFilter,
  useSavedFilters,
} from "@/hooks/useSearch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
        className="flex h-10 items-center gap-1.5 rounded-lg border border-input bg-surface px-3 text-sm font-medium text-foreground shadow-soft hover:bg-surface-muted"
        aria-haspopup="true"
        aria-expanded={open}
      >
        Saved filters
        {filters.length > 0 && (
          <span className="rounded-full bg-surface-muted px-1.5 text-xs text-muted-foreground">
            {filters.length}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border bg-surface p-3 shadow-popover">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Save current filters
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSave();
                }}
                placeholder="Filter name"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={
                  !name.trim() ||
                  !hasValues(currentFilters) ||
                  saveFilter.isPending
                }
              >
                Save
              </Button>
            </div>
            {!hasValues(currentFilters) && (
              <p className="mt-1 text-xs text-muted-foreground">
                Set at least one filter to save.
              </p>
            )}
          </div>

          <div className="border-t pt-2">
            {isLoading ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                Loading...
              </p>
            ) : filters.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">
                No saved filters yet.
              </p>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {filters.map((filter) => (
                  <li
                    key={filter.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-muted"
                  >
                    <button
                      type="button"
                      onClick={() => handleApply(filter)}
                      className="flex-1 truncate text-left text-sm text-foreground"
                    >
                      {filter.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(filter.id)}
                      disabled={deleteFilter.isPending}
                      aria-label={`Delete ${filter.name}`}
                      className="ml-2 rounded p-1 text-muted-foreground hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
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
