"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { accent: string; icon: React.ReactNode }
> = {
  default: {
    accent: "bg-foreground",
    icon: <Info className="h-5 w-5 text-foreground" />,
  },
  success: {
    accent: "bg-success",
    icon: <CheckCircle2 className="h-5 w-5 text-success" />,
  },
  error: {
    accent: "bg-danger",
    icon: <XCircle className="h-5 w-5 text-danger" />,
  },
  info: { accent: "bg-info", icon: <Info className="h-5 w-5 text-info" /> },
};

interface ToastViewportProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

/** Fixed, stacked container that renders active toasts (top-right). */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4">
      {toasts.map((toast) => {
        const style = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl border bg-surface p-4 shadow-popover animate-slide-in-right"
          >
            <span
              className={cn(
                "w-1 shrink-0 self-stretch rounded-full",
                style.accent
              )}
            />
            <span className="mt-0.5 shrink-0">{style.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
