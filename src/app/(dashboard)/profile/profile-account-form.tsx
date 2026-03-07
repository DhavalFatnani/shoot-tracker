"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/auth-actions";

export function ProfileAccountForm({
  email,
  role,
  initialFirstName,
  initialLastName,
}: {
  email: string | undefined;
  role: string;
  initialFirstName?: string | null;
  initialLastName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateProfile({
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
        });
        if (result.error) {
          setMessage({ type: "error", text: result.error });
        } else {
          setMessage({ type: "success", text: "Profile updated." });
          router.refresh();
        }
      } catch (e) {
        setMessage({ type: "error", text: e instanceof Error ? e.message : "Something went wrong." });
      }
    });
  }

  const initial = (firstName.trim() || lastName.trim() || email || "?").charAt(0).toUpperCase();

  return (
    <div className="section-card overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-600">
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">Account</h2>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
            {initial}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">{email ?? "—"}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-first-name" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                First name
              </label>
              <input
                id="profile-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={128}
                placeholder="First name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <div>
              <label htmlFor="profile-last-name" className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Last name
              </label>
              <input
                id="profile-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={128}
                placeholder="Last name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Role</dt>
              <dd className="mt-1">
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                  {role.replace("_", " ")}
                </span>
              </dd>
            </div>
          </dl>
          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
              {message.text}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
          >
            {pending ? "Saving…" : "Save name"}
          </button>
        </form>
      </div>
    </div>
  );
}
