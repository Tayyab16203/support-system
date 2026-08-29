"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Input";

function Alert({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-danger-soft text-danger";
  const Icon = tone === "success" ? CheckCircle2 : TriangleAlert;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg p-3 text-sm ${styles}`}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const sessionExpired = searchParams.get("session") === "expired";
  const { login, completeNewPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.newPasswordRequired) {
        setNeedsNewPassword(true);
      } else {
        const from = searchParams.get("from");
        router.push(from && from.startsWith("/") ? from : "/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await completeNewPassword(newPassword);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set password");
    } finally {
      setLoading(false);
    }
  }

  if (needsNewPassword) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Set a new password
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your account requires a new password. Please choose one to continue.
          </p>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <form className="space-y-4" onSubmit={handleNewPassword}>
          <FormField
            label="New password"
            htmlFor="newPassword"
            hint="At least 8 chars, with an uppercase, lowercase, and number."
          >
            <Input
              id="newPassword"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter a new password"
            />
          </FormField>
          <Button type="submit" className="w-full" isLoading={loading}>
            Set password & continue
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your support workspace.
        </p>
      </div>

      {resetSuccess && !error && (
        <Alert tone="success">
          Password reset successful. Sign in with your new password.
        </Alert>
      )}
      {sessionExpired && !error && (
        <Alert tone="error">
          Your session has expired. Please sign in again to continue.
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <form className="space-y-4" onSubmit={handleLogin}>
        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </FormField>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary-hover"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <Button type="submit" className="w-full" isLoading={loading}>
          Sign in
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
