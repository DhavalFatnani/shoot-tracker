"use client";

import { useState } from "react";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { exportMultiTaskData } from "@/app/actions/task-actions";

export function TaskDetailCsvDownload({ taskId, taskLabel }: { taskId: string; taskLabel: string }) {
  const [pending, setPending] = useState(false);
  async function handleDownload() {
    setPending(true);
    try {
      const result = await exportMultiTaskData([taskId]);
      if (result.success && result.data) {
        const headers = ["Task name", "Task code", "Serial ID", "SKU", "Status"];
        const rows = result.data.map((r) => [r.taskName, r.taskCode, r.serialId, r.sku, r.status]);
        const csv = buildCsv(headers, rows);
        const safeLabel = taskLabel.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "");
        downloadCsv(csv, `task-${safeLabel}-${new Date().toISOString().slice(0, 10)}.csv`);
      }
    } finally {
      setPending(false);
    }
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {pending ? (
        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      {pending ? "Preparing…" : "Download CSV"}
    </button>
  );
}
