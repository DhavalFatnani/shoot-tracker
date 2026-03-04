"use client";

import Link from "next/link";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  onAction?: () => void;
  actionLabel?: string;
};

const defaultIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

export function EmptyState({ icon = defaultIcon, title, description, action, onAction, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-800/80">
      <div className="mx-auto max-w-sm">
        {icon}
        <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {description && <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>}
        {(action || (onAction && actionLabel)) && (
          <div className="mt-6">
            {action ? (
              <Link href={action.href} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900">
                {action.label}
              </Link>
            ) : (
              <button type="button" onClick={onAction} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900">
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const TASK_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

export function TasksEmptyState({ hasFilters }: { hasFilters?: boolean }) {
  return (
    <EmptyState
      icon={TASK_ICON}
      title="No tasks yet"
      description={hasFilters ? "Try changing filters or search." : "Create your first request to get started."}
      action={hasFilters ? undefined : { href: "/tasks/create", label: "Create request" }}
    />
  );
}

const RETURNS_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

export function ReturnsEmptyState({ canCreate }: { canCreate?: boolean }) {
  return (
    <EmptyState
      icon={RETURNS_ICON}
      title="No returns yet"
      description="Returns are created by the shoot team. OPS verifies each task via Return verify scan."
      action={canCreate ? { href: "/returns/create", label: "Create return" } : undefined}
    />
  );
}
