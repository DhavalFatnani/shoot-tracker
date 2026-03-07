"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth-actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "";
      const { error: err } = await requestPasswordReset(email, redirectTo);
      if (err) {
        setError(err);
        return;
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200" role="status">
        If an account exists for that email, we&apos;ve sent a password reset link. Check your inbox and follow the link to set a new password.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="form-group">
        <label htmlFor="forgot-email" className="label">Email</label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input"
        />
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200" role="alert">
          {error}
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        <Link href="/sign-in" className="font-medium text-indigo-600 transition duration-200 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
