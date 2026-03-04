"use client";

import Link from "next/link";

export type BreadcrumbItem = { href?: string; label: string };

function Chevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <Chevron />}
          {item.href ? (
            <Link href={item.href} className="transition-colors duration-200 hover:text-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 rounded dark:hover:text-teal-400 dark:focus:ring-offset-zinc-900">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
