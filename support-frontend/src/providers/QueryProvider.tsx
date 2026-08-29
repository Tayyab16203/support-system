"use client";

import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { emitToast } from "@/lib/toastBus";

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Optional per-mutation metadata used to tailor the automatic toast
 * notifications. Set it on a mutation via `useMutation({ meta: { ... } })`.
 */
export interface MutationToastMeta {
  /** Human label of the affected entity, e.g. "Ticket", "Project". */
  entity?: string;
  /** The kind of write, used to phrase the success message. */
  action?: "create" | "update" | "delete";
  /** Override the success toast title entirely. */
  successMessage?: string;
  /** Set to true to suppress the automatic success toast for this mutation. */
  silentSuccess?: boolean;
  /** Set to true to suppress the automatic error toast for this mutation. */
  silentError?: boolean;
}

/** The error shape thrown by our API client (see lib/api.ts). */
interface ApiErrorShape {
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

function readMeta(meta: unknown): MutationToastMeta {
  return (meta as MutationToastMeta | undefined) ?? {};
}

const ACTION_VERB: Record<
  NonNullable<MutationToastMeta["action"]>,
  string
> = {
  create: "created",
  update: "updated",
  delete: "deleted",
};

/** Build the success toast title from mutation meta. */
function successTitle(meta: MutationToastMeta): string {
  if (meta.successMessage) return meta.successMessage;
  if (meta.entity && meta.action) {
    return `${meta.entity} ${ACTION_VERB[meta.action]}`;
  }
  if (meta.entity) return `${meta.entity} saved`;
  return "Done";
}

/** Extract a human-readable message from an unknown thrown error. */
function errorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const api = error as ApiErrorShape;
    if (typeof api.message === "string" && api.message) return api.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Every mutation across the app flows through these handlers, so a
        // toast is shown for backend successes and errors without each hook
        // having to wire it up individually.
        mutationCache: new MutationCache({
          onSuccess: (_data, _variables, _context, mutation) => {
            const meta = readMeta(mutation.meta);
            if (meta.silentSuccess) return;
            emitToast({ title: successTitle(meta), variant: "success" });
          },
          onError: (error, _variables, _context, mutation) => {
            const meta = readMeta(mutation.meta);
            if (meta.silentError) return;
            emitToast({
              title: meta.entity ? `${meta.entity} action failed` : "Request failed",
              description: errorMessage(error),
              variant: "error",
            });
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
