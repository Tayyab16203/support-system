"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info, TriangleAlert } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Input";

type Step = "request" | "confirm";

function Alert({
  tone,
  children,
}: {
  tone: "info" | "error";
  children: React.ReactNode;
}) {
  const styles =
    tone === "info" ? "bg-info-soft text-info" : "bg-danger-soft text-danger";
  const Icon = tone === "info" ? Info : TriangleAlert;
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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword, confirmForgotPassword } = useAuth();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function errorMessage(err: unknown): string {
    if (err && typeof err === "object" && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    return "Something went wrong. Please try again.";
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await forgotPassword(email);
      setInfo(
        "If that email is registered, we've sent a reset code. Check your inbox."
      );
      setStep("confirm");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await confirmForgotPassword(email, code, newPassword);
      router.push("/login?reset=success");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {step === "request"
            ? "Enter your email and we'll send you a reset code."
            : "Enter the code we emailed you and choose a new password."}
        </p>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="info">{info}</Alert>}

      {step === "request" ? (
        <form className="space-y-4" onSubmit={handleRequest}>
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
          <Button type="submit" className="w-full" isLoading={loading}>
            Send reset code
          </Button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleConfirm}>
          <FormField label="Reset code" htmlFor="code">
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the code from your email"
            />
          </FormField>
          <FormField
            label="New password"
            htmlFor="newPassword"
            hint="At least 8 chars, with an uppercase, lowercase, and number."
          >
            <Input
              id="newPassword"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Choose a new password"
            />
          </FormField>
          <Button type="submit" className="w-full" isLoading={loading}>
            Reset password
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("request");
              setInfo(null);
              setError(null);
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Use a different email
          </button>
        </form>
      )}

      <div className="border-t pt-4 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
