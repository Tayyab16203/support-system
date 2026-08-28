"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useBulkDelete,
  useDeleteTicket,
  useTickets,
} from "@/hooks/useTickets";
import { useSearch } from "@/hooks/useSearch";
import { useProjectContext } from "@/providers/ProjectProvider";
import { BulkActionBar } from "@/components/tickets/BulkActionBar";
import { FilterBar } from "@/components/tickets/FilterBar";
import { TicketTable } from "@/components/tickets/TicketTable";
import { SearchBar } from "@/components/search/SearchBar";
import { SavedFilters } from "@/components/search/SavedFilters";
import type { TicketFilters, TicketSortField } from "@/lib/ticketsApi";
import type { SavedFilterValues } from "@/types/search";
import type { Ticket } from "@/types/ticket";

const PAGE_SIZE = 20;

/** Filter fields the FilterBar controls (everything except pagination/sort). */
type FilterState = Omit<
  TicketFilters,
  "page" | "pageSize" | "sortBy" | "sortOrder"
>;

export default function TicketsPage() {
  const { selectedProject } = useProjectContext();

  const [filters, setFilters] = useState<FilterState>({});
  const [sortBy, setSortBy] = useState<TicketSortField>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // A search is "active" once the debounced query passes the backend minimum.
  const isSearching = searchQuery.trim().length >= 2;

  const query = useMemo<TicketFilters>(
    () => ({ ...filters, page, pageSize: PAGE_SIZE, sortBy, sortOrder }),
    [filters, page, sortBy, sortOrder]
  );

  const ticketsQuery = useTickets(query);
  // Search reuses the same status/type/priority filters as the list view.
  const searchResultsQuery = useSearch({
    q: searchQuery,
    status: filters.status,
    type: filters.type,
    priority: filters.priority,
    page,
    pageSize: PAGE_SIZE,
  });
  const deleteTicket = useDeleteTicket();
  const bulkDelete = useBulkDelete();

  // Swap the data source based on whether a search is in progress.
  const active = isSearching ? searchResultsQuery : ticketsQuery;
  // Memoized so its reference is stable across renders (the effect below and
  // select-all depend on it).
  const tickets = useMemo(() => active.data?.data ?? [], [active.data]);
  const pagination = active.data?.pagination;
  const isLoading = active.isLoading;
  const error = active.error;

  // Drop selections for tickets no longer present in the current view (e.g.
  // after paging, filtering, or a delete). Keeps the selection consistent
  // with what the user can actually see and act on.
  useEffect(() => {
    const visible = new Set(tickets.map((t) => t.id));
    setSelectedIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((id) => visible.has(id))
      );
      return next.size === prev.size ? prev : next;
    });
  }, [tickets]);

  function toggleSelect(ticketId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  }

  function toggleSelectAll(select: boolean) {
    setSelectedIds(select ? new Set(tickets.map((t) => t.id)) : new Set());
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await bulkDelete.mutateAsync(ids);
    setBulkDeleteOpen(false);
    clearSelection();
  }

  function handleFilterChange(patch: Partial<FilterState>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1); // Any filter change resets to the first page.
  }

  function handleReset() {
    setFilters({});
    setPage(1);
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    setPage(1); // New query starts from the first page.
  }

  function handleApplySavedFilter(saved: SavedFilterValues) {
    setFilters((prev) => ({
      ...prev,
      status: saved.status,
      type: saved.type,
      priority: saved.priority,
    }));
    setPage(1);
  }

  function handleSort(field: TicketSortField) {
    if (field === sortBy) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteTicket.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  const currentFilterValues: SavedFilterValues = {
    status: filters.status,
    type: filters.type,
    priority: filters.priority,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Tickets</h1>
          {selectedProject && (
            <p className="text-sm text-gray-600">{selectedProject.name}</p>
          )}
        </div>
        <Link
          href="/tickets/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Ticket
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={searchQuery} onDebouncedChange={handleSearchChange} />
        <SavedFilters
          currentFilters={currentFilterValues}
          onApply={handleApplySavedFilter}
        />
      </div>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
      />

      {isSearching && (
        <p className="text-sm text-gray-500">
          Showing results for{" "}
          <span className="font-medium text-gray-700">
            &ldquo;{searchQuery}&rdquo;
          </span>
        </p>
      )}

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            {isSearching ? "Searching..." : "Loading tickets..."}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            {isSearching ? "Search failed." : "Failed to load tickets."}
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {isSearching
              ? "No tickets match your search."
              : "No tickets match the current filters."}
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onDelete={setDeleteTarget}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />
        )}
      </div>

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          onClear={clearSelection}
          onRequestDelete={() => setBulkDeleteOpen(true)}
        />
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {pagination.page} of {pagination.total_pages} ·{" "}
            {pagination.total} tickets
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage((p) => Math.min(pagination.total_pages, p + 1))
              }
              disabled={page >= pagination.total_pages}
              className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete ticket?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget.title}</span>. This
              action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteTicket.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteTicket.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Delete {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "ticket" : "tickets"}?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete the selected{" "}
              {selectedIds.size === 1 ? "ticket" : "tickets"}. This action
              cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setBulkDeleteOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDelete.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDelete.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
