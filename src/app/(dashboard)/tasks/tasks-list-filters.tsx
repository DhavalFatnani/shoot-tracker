"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/ui/filter-bar";
import { Tabs, type TabItem } from "@/components/ui/tabs";

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

  const tabItems: TabItem[] = statusOptions.map((opt) => ({
    href: `/tasks?${buildQuery({ status: opt.value, page: 1 })}`,
    label: opt.label,
  }));
  const currentHref = `/tasks?${buildQuery({ status, page: 1 })}`;

  return (
    <FilterBar>
      <div className="min-w-0 flex-1">
        <Tabs items={tabItems} currentHref={currentHref} />
      </div>
      <form method="get" action="/tasks" className="flex min-w-0 flex-1 max-w-md shrink-0 gap-2 sm:items-center" onSubmit={handleSearch}>
        <input type="hidden" name="status" value={status} />
        <div className="relative flex-1">
          <label htmlFor="tasks-search" className="sr-only">
            Search tasks
          </label>
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400 dark:text-slate-500" aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            id="tasks-search"
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search task name, serial, or assignee..."
            disabled={isPending}
            autoComplete="off"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-12 pr-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            aria-label="Search tasks"
          />
        </div>
        <button type="submit" disabled={isPending} className="btn btn-primary shrink-0">
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
    </FilterBar>
  );
}
