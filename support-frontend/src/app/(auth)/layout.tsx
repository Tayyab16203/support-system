import { Suspense } from "react";
import { LifeBuoy, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { GuestGuard } from "@/components/layout/GuestGuard";

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: "Fast ticket triage",
    description: "Create, assign, and resolve issues without the busywork.",
  },
  {
    icon: Sparkles,
    title: "Clear insights",
    description: "Live dashboards keep every project on track.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description: "Role-based access and a full audit trail on every action.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Branding panel (desktop only) */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 60%, white 0, transparent 45%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <LifeBuoy className="h-6 w-6" />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            Support System
          </span>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Everything your team needs to support customers.
            </h2>
            <p className="mt-3 max-w-md text-primary-foreground/80">
              One clean workspace for tickets, projects, and analytics across
              every product you run.
            </p>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                  <item.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-primary-foreground/75">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Support System
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Support System
            </span>
          </div>
          <div className="rounded-2xl border bg-surface p-8 shadow-card">
            <Suspense fallback={null}>
              <GuestGuard>{children}</GuestGuard>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
