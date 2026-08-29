/**
 * API client for communicating with the FastAPI backend.
 * Attaches the access token (issued by our backend) to every request.
 */

import { clearTokens, getAccessToken } from "@/lib/authTokens";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

/**
 * Paths that should NOT trigger the global "session expired" redirect on a
 * 401. These are the unauthenticated auth endpoints where a 401 simply means
 * "wrong credentials" rather than "your session ended".
 */
const AUTH_PATHS = [
  "/auth/login",
  "/auth/new-password",
  "/auth/forgot-password",
  "/auth/confirm-forgot-password",
];

/**
 * Handle an expired/invalid session: wipe stored tokens and send the user to
 * the login page with a notice, preserving where they were so we could return
 * them after re-auth. Runs only in the browser.
 */
function handleSessionExpired(): void {
  if (typeof window === "undefined") return;
  clearTokens();
  const { pathname, search } = window.location;
  // Avoid a redirect loop if we're already on an auth page.
  if (pathname.startsWith("/login")) return;
  const from = encodeURIComponent(pathname + search);
  window.location.href = `/login?session=expired&from=${from}`;
}

interface ApiError {
  error: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * The currently selected project ID, persisted by ProjectProvider.
 * Ticket-scoped endpoints require it via the X-Project-ID header.
 */
function getSelectedProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("selectedProjectId");
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getAccessToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Attach the current project context unless the caller already set it.
    if (!headers["X-Project-ID"]) {
      const projectId = getSelectedProjectId();
      if (projectId) {
        headers["X-Project-ID"] = projectId;
      }
    }

    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "UNKNOWN_ERROR",
        message: `Request failed with status ${response.status}`,
        details: {},
      }));

      // A 401 on any authenticated endpoint means the session is gone or
      // expired. Clear tokens and bounce to login — except on the auth
      // endpoints themselves, where a 401 is just "bad credentials".
      if (response.status === 401 && !AUTH_PATHS.some((p) => path.startsWith(p))) {
        handleSessionExpired();
      }

      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : "";
    return this.request<T>(`${path}${searchParams}`);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }

  async delete(path: string): Promise<void> {
    return this.request<void>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE);