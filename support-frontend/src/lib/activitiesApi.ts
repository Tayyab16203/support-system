/**
 * Activity timeline API functions.
 *
 * Activities are scoped to a ticket (and, via the ticket, to the current
 * project). The shared api client attaches the X-Project-ID header
 * automatically.
 */

import { api } from "@/lib/api";
import type { PaginationMeta } from "@/types/project";
import type { Activity } from "@/types/ticket";

export interface ActivityListResponse {
  data: Activity[];
  pagination: PaginationMeta;
}

export interface ActivityResponse {
  data: Activity;
  message: string;
}

export async function listActivities(
  ticketId: string,
  page = 1,
  pageSize = 50
): Promise<ActivityListResponse> {
  return api.get<ActivityListResponse>(`/tickets/${ticketId}/activities`, {
    page: String(page),
    page_size: String(pageSize),
  });
}

export async function listComments(
  ticketId: string,
  page = 1,
  pageSize = 50
): Promise<ActivityListResponse> {
  return api.get<ActivityListResponse>(`/tickets/${ticketId}/comments`, {
    page: String(page),
    page_size: String(pageSize),
  });
}

export async function addComment(
  ticketId: string,
  comment: string
): Promise<ActivityResponse> {
  return api.post<ActivityResponse>(`/tickets/${ticketId}/comments`, {
    comment,
  });
}
