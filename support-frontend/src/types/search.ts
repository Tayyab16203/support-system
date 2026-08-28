/**
 * Search and saved-filter TypeScript types.
 */

import type { Priority, Ticket, TicketStatus, TicketType } from "@/types/ticket";

/** The subset of filters that can be saved and searched on. */
export interface SavedFilterValues {
  status?: TicketStatus;
  type?: TicketType;
  priority?: Priority;
}

/** Marked-up excerpts returned by the search API (contain <mark> tags). */
export interface SearchHighlight {
  title: string;
  description: string;
}

/** A single search result: a ticket plus relevance + highlight metadata. */
export interface SearchResult extends Ticket {
  relevance_score: number;
  highlight: SearchHighlight;
}

/** A user's saved filter combination. */
export interface SavedFilter {
  id: string;
  name: string;
  filters: SavedFilterValues;
}
