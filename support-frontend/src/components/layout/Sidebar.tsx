"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  FolderOpen,
  BarChart3,
  Users,
  ScrollText,
  LifeBuoy,
  X,
  Plus,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { ProjectSelector } from "@/components/layout/ProjectSelector";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/tickets", label: "Tickets", icon: Ticket },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/projects", label: "Projects", icon: FolderOpen, adminOnly: true },
      { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText, adminOnly: true },
    ],
  },
  {
    title: "Insights",
    items: [{ href: "/insights", label: "Public Insights", icon: BarChart3 }],
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm animate-fade-in lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-surface transition-transform duration-200 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0 animate-slide-in-left" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 flex-shrink-0 items-center justify-between border-b px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">
              Support
            </span>
          </Link>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b py-2">
          <ProjectSelector />
        </div>

        {/* Primary CTA */}
        <div className="px-3 pt-3">
          <Link
            href="/tickets/new"
            onClick={onClose}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </Link>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section, i) => {
            const items = section.items.filter(
              (item) => !item.adminOnly || isAdmin
            );
            if (items.length === 0) return null;
            return (
              <div key={i} className="space-y-1">
                {section.title && (
                  <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section.title}
                  </p>
                )}
                {items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-soft text-primary-soft-foreground"
                          : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
