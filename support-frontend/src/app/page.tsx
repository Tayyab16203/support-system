import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock,
  FolderKanban,
  LifeBuoy,
  Mail,
  MessageSquare,
  Paperclip,
  PauseCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

/**
 * Public marketing / documentation landing page.
 *
 * Explains what the Support System does, how the ticket lifecycle works, how
 * email (SES/SMTP) notifications fire, and the full feature set. Fully static
 * and public — no auth required — with entry points to sign in and to the
 * public insights dashboard.
 */

const FEATURES = [
  {
    icon: FolderKanban,
    title: "Multi-project workspaces",
    description:
      "Group tickets by product or team. Each project has its own members, settings, and a per-project email kill switch.",
  },
  {
    icon: ClipboardList,
    title: "Full ticket lifecycle",
    description:
      "Track work from Pending through In Progress, Paused, In Review, and Completed, with type and priority on every ticket.",
  },
  {
    icon: Bell,
    title: "Email notifications",
    description:
      "Actor-aware emails via AWS SES or SMTP keep creators, assignees, and admins in the loop on every meaningful change.",
  },
  {
    icon: MessageSquare,
    title: "Comments & @mentions",
    description:
      "Discuss on the ticket timeline. Mention a teammate by email and they get their own notification.",
  },
  {
    icon: Paperclip,
    title: "File attachments",
    description:
      "Attach screenshots and files backed by S3 with secure, expiring download links.",
  },
  {
    icon: Search,
    title: "Search & saved filters",
    description:
      "Find tickets fast with full-text search, rich filters, and reusable saved filter sets.",
  },
  {
    icon: BarChart3,
    title: "Dashboards & insights",
    description:
      "A personal dashboard plus public insights with status, type, priority, velocity, and resolution-time charts.",
  },
  {
    icon: ShieldCheck,
    title: "Roles & audit trail",
    description:
      "Admin and user roles with Cognito-backed auth, and a complete audit log of every action taken.",
  },
];

const LIFECYCLE = [
  {
    status: "Pending",
    icon: ClipboardList,
    tone: "text-warning",
    description:
      "A new ticket is created with a title, description, type, and priority. Admins are notified and the creator gets a confirmation email.",
  },
  {
    status: "In Progress",
    icon: Clock,
    tone: "text-info",
    description:
      "The ticket is assigned and work begins. The assignee is emailed, and the creator is kept informed of the status change.",
  },
  {
    status: "Paused",
    icon: PauseCircle,
    tone: "text-warning",
    description:
      "Work is temporarily on hold (blocked or waiting on input). Stakeholders see the change on the timeline and by email.",
  },
  {
    status: "In Review",
    icon: Search,
    tone: "text-primary",
    description:
      "The work is done and awaiting verification. Reviewers can comment, request changes, or approve.",
  },
  {
    status: "Completed",
    icon: CheckCircle2,
    tone: "text-success",
    description:
      "The ticket is resolved. A completion email goes to the creator and assignee, and resolution time is recorded for analytics.",
  },
];

const EMAIL_EVENTS = [
  {
    icon: ClipboardList,
    title: "Ticket created",
    recipients: "All admins + a confirmation to the ticket owner",
  },
  {
    icon: Clock,
    title: "Status changed",
    recipients: "Ticket creator and assignee",
  },
  {
    icon: CheckCircle2,
    title: "Ticket completed",
    recipients: "Ticket creator and assignee",
  },
  {
    icon: Users,
    title: "Ticket assigned",
    recipients: "The newly assigned user (unless self-assigned)",
  },
  {
    icon: ClipboardList,
    title: "Ticket updated",
    recipients: "Owner + stakeholders (title, description, type, priority, tags)",
  },
  {
    icon: MessageSquare,
    title: "Comment added",
    recipients: "Creator and assignee on the ticket",
  },
  {
    icon: AtSign,
    title: "@mention in a comment",
    recipients: "Each mentioned teammate gets their own email",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold tracking-tight">
              Support System
            </span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/insights"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            >
              Insights
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, hsl(var(--primary)) 0, transparent 40%), radial-gradient(circle at 85% 30%, hsl(var(--primary)) 0, transparent 45%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Multi-project support ticket management
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Everything your team needs to support customers, in one clean
            workspace.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Create, assign, and resolve tickets across every project. Automatic
            email updates, live dashboards, comments, attachments, and a full
            audit trail — without the busywork.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
            >
              Sign in to your workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/insights"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-surface px-6 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-surface-muted"
            >
              <BarChart3 className="h-4 w-4" />
              View public insights
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Built for real support workflows
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every feature below ships in the box.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-surface p-6 shadow-soft transition-shadow hover:shadow-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Ticket lifecycle */}
      <section className="border-y bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              How a ticket flows
            </h2>
            <p className="mt-3 text-muted-foreground">
              Each ticket carries a type (technical error, bug, feature, or
              removal) and a priority (critical, high, medium, low) as it moves
              through five stages.
            </p>
          </div>
          <ol className="mt-12 space-y-4">
            {LIFECYCLE.map((stage, i) => (
              <li
                key={stage.status}
                className="flex items-start gap-4 rounded-2xl border bg-surface p-5 shadow-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <stage.icon className={`h-5 w-5 ${stage.tone}`} />
                    <h3 className="text-base font-semibold">{stage.status}</h3>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Email notifications */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Mail className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight">
              Email notifications that keep everyone in sync
            </h2>
            <p className="mt-3 text-muted-foreground">
              Notifications are actor-aware: an event is attributed to whoever
              caused it, and everyone involved with the ticket is emailed —
              except the actor, who already knows what they did. Recipients are
              de-duplicated so nobody gets the same message twice.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Delivered through <strong>AWS SES</strong> by default, or{" "}
                  <strong>SMTP</strong> (e.g. Gmail) by setting{" "}
                  <code className="rounded bg-surface-muted px-1 py-0.5 text-xs">
                    EMAIL_PROVIDER
                  </code>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>
                  Two opt-outs gate every send: a per-project{" "}
                  <strong>email kill switch</strong> and a per-user{" "}
                  <strong>unsubscribe</strong> flag.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <span>
                  Sending is best-effort in the background, so it never blocks
                  or breaks the request that triggered it.
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-surface p-6 shadow-card">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Events that send email
            </h3>
            <ul className="mt-4 divide-y">
              {EMAIL_EVENTS.map((e) => (
                <li key={e.title} className="flex items-start gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <e.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.recipients}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-surface-muted/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to jump in?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Accounts are provisioned by an administrator. Sign in to reach your
            workspace, or explore the public metrics first.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/insights"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-surface px-6 text-sm font-medium text-foreground shadow-soft transition-colors hover:bg-surface-muted"
            >
              View public insights
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-primary" />
            <span>Support System</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Support System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
