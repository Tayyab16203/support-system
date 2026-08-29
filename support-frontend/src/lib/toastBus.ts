/**
 * A tiny, framework-agnostic event bus for toast notifications.
 *
 * The React Query client is created outside of the React tree (in
 * QueryProvider) and therefore can't call the `useToast()` hook directly.
 * This bus lets non-React code (like the global MutationCache handlers)
 * request a toast, which the ToastProvider then renders once it has
 * subscribed.
 */

import type { ToastVariant } from "@/components/ui/Toast";

export interface ToastRequest {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

type Listener = (request: ToastRequest) => void;

const listeners = new Set<Listener>();

/**
 * Register a listener that receives every emitted toast request.
 * Returns an unsubscribe function.
 */
export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Emit a toast request to every subscribed listener. */
export function emitToast(request: ToastRequest): void {
  listeners.forEach((listener) => listener(request));
}
