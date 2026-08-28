"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";

export function Navbar() {
  const router = useRouter();
  const { profile, logout } = useAuth();

  const initials = (profile?.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 bg-white border-b">
      <div className="flex items-center justify-between h-16 px-6">
        <h1 className="text-lg font-semibold text-gray-900 lg:hidden">
          Support System
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">{profile?.name ?? "User"}</span>
            {profile?.role && (
              <span
                className={
                  profile.role === "admin"
                    ? "rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                }
              >
                {profile.role === "admin" ? "Admin" : "User"}
              </span>
            )}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
            <span className="text-xs font-medium text-white">{initials}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}