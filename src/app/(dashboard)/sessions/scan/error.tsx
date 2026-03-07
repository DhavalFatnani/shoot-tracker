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
    <div className="page-container flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="section-card w-full max-w-md p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="form-actions mt-6 justify-center">
          <Button variant="outline" onClick={() => reset()}>Try again</Button>
          <Link href="/sessions/scan" className="btn btn-secondary">Back to Scan</Link>
        </div>
      </div>
    </div>
  );
}
