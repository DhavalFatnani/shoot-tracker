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
    });
  }

  const initial = (firstName.trim() || lastName.trim() || email || "?").charAt(0).toUpperCase();

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-600">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Account</h2>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xl font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">
            {initial}
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{email ?? "—"}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-first-name" className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                First name
              </label>
              <input
                id="profile-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={128}
                placeholder="First name"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="profile-last-name" className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                Last name
              </label>
              <input
                id="profile-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={128}
                placeholder="Last name"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Role</dt>
              <dd className="mt-1">
                <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-sm font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
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
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus:ring-offset-zinc-900"
          >
            {pending ? "Saving…" : "Save name"}
          </button>
        </form>
      </div>
    </div>
  );
}
