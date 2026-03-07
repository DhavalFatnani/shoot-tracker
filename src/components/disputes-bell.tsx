"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOpenDisputesCount } from "@/app/actions/dashboard-actions";

/** When alwaysShowLink is true, the bell link is always visible (e.g. dashboard header); badge only when count > 0. */
export function DisputesBell({ alwaysShowLink = false }: { alwaysShowLink?: boolean } = {}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    getOpenDisputesCount().then((r) => {
      if (r.success) setCount(r.count);
    });
  }, []);

  if (!alwaysShowLink && (count === null || count === 0)) return null;

  return (
    <Link
      href="/disputes"
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      aria-label={count != null && count > 0 ? `${count} open dispute${count !== 1 ? "s" : ""}` : "Open disputes"}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count != null && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
