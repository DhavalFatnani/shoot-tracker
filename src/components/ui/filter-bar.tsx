"use client";

import { cn } from "@/lib/utils";

type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
};

export function FilterBar({ children, className }: FilterBarProps) {
  return <div className={cn("filter-bar", className)}>{children}</div>;
}

type FilterBarSegmentsProps = {
  label?: string;
  children: React.ReactNode;
};

export function FilterBarSegments({ label, children }: FilterBarSegmentsProps) {
  return (
    <div className="min-w-0 flex-1">
      {label && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
      )}
      <div className="segment-control inline-flex flex-wrap gap-1 p-1">
        {children}
      </div>
    </div>
  );
}

