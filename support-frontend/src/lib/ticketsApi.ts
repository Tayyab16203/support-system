/**
 * Ticket API functions.
 *
 * All ticket endpoints are scoped to the currently selected project. The
 * shared api client attaches the X-Project-ID header automatically.
 */

import { api } from "@/lib/api";
import type { PaginationMeta } from "@/types/project";
import type {
  Priority,
  Ticket,
  TicketCreate,
  TicketStatus,
  TicketType,
  TicketUpdate,
} from "@/types/ticket";

export interface TicketListResponse {
  data: Ticket[];
  pagination: PaginationMeta;
}

export interface TicketResponse {
  data: Ticket;
  message: string;
}

export interface TicketFilters {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  type?: TicketType;
  priority?: Priority;
  assignedTo?: string;
  createdBy?: string;
  sortBy?: "created_at" | "updated_at" | "priority" | "status";
  sortOrder?: "asc" | "desc";
}

export async function listTickets(
  filters: TicketFilters = {}
): Promise<TicketListResponse> {
  const params: Record<string, string> = {
    page: String(filters.page ?? 1),
    page_size: String(filters.pageSize ?? 20),
  };
  if (filters.status) params.status = filters.status;
  if (filters.type) params.type = filters.type;
  if (filters.priority) params.priority = filters.priority;
  if (filters.assignedTo) params.assigned_to = filters.assignedTo;
  if (filters.createdBy) params.created_by = filters.createdBy;
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.sortOrder) params.sort_order = filters.sortOrder;

  return api.get<TicketListResponse>("/tickets", params);
}

export async function getTicket(ticketId: string): Promise<TicketResponse> {
  return api.get<TicketResponse>(`/tickets/${ticketId}`);
}

export async function createTicket(
  payload: TicketCreate
): Promise<TicketResponse> {
  return api.post<TicketResponse>("/tickets", payload);
}

export async function updateTicket(
  ticketId: string,
  payload: TicketUpdate
): Promise<TicketResponse> {
  return api.patch<TicketResponse>(`/tickets/${ticketId}`, payload);
}

export async function deleteTicket(ticketId: string): Promise<void> {
  return api.delete(`/tickets/${ticketId}`);
}
