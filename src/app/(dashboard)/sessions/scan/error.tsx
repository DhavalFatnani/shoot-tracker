"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ScanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-slate-800">Something went wrong</h2>
      <p className="max-w-md text-sm text-slate-600">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Link
          href="/sessions/scan"
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Back to Scan
        </Link>
      </div>
    </div>
  );
}
