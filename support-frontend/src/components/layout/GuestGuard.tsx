"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

interface GuestGuardProps {
  children: React.ReactNode;
}

/**
 * Guard for the auth pages (login / signup / forgot-password).
 *
 * If a valid session already exists we never want to show these pages — the
 * user is bounced to wherever they were headed (?from=) or the dashboard.
 * While the session is resolving we render a lightweight spinner so we don't
 * flash the login form to an already-authenticated user.
 */
export function GuestGuard({ children }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    const from = searchParams.get("from");
    // Only honor internal paths to avoid open-redirects.
    const target = from && from.startsWith("/") ? from : "/dashboard";
    router.replace(target);
  }, [isLoading, isAuthenticated, router, searchParams]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
