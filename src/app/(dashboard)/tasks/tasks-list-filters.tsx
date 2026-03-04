"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type StatusOption = { value: string; label: string };

export function TasksListFilters({
  status,
  q,
  statusOptions,
}: {
  status: string;
  page: number;
  q: string;
  statusOptions: readonly StatusOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function buildQuery(updates: { status?: string; q?: string; page?: number }) {
    const next = new URLSearchParams(searchParams.toString());
    if (updates.status !== undefined) {
      if (updates.status) next.set("status", updates.status);
      else next.delete("status");
    }
    if (updates.q !== undefined) {
      if (updates.q) next.set("q", updates.q);
      else next.delete("q");
    }
    if (updates.page !== undefined) {
      if (updates.page > 1) next.set("page", String(updates.page));
      else next.delete("page");
    }
    return next.toString();
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const qInput = form.querySelector<HTMLInputElement>('input[name="q"]');
    const statusInput = form.querySelector<HTMLInputElement>('input[name="status"]');
    const qVal = qInput?.value?.trim() ?? "";
    const statusVal = statusInput?.value ?? "";
    startTransition(() => {
      router.push(`/tasks?${buildQuery({ q: qVal, status: statusVal || undefined, page: 1 })}`);
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Status</p>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => {
              const href = `/tasks?${buildQuery({ status: opt.value, page: 1 })}`;
              const active = status === opt.value;
              return (
                <Link
                  key={opt.value || "all"}
                  href={href}
                  prefetch={true}
                  className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-teal-600 text-white shadow-sm dark:bg-teal-500"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                  }`}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
        </div>

        <form method="get" action="/tasks" className="flex shrink-0 gap-2 sm:items-end" onSubmit={handleSearch}>
          <input type="hidden" name="status" value={status} />
          <div className="relative flex-1 sm:w-64">
            <label htmlFor="tasks-search" className="sr-only">
              Search tasks
            </label>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              id="tasks-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Task name or serial…"
              disabled={isPending}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-500 transition focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-800"
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching…
              </>
            ) : (
              "Search"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
