"use client";

import { buildCsv, downloadCsv } from "@/lib/csv";
import { getTaskStatusDisplayLabel } from "@/lib/status-colors";
import { formatTaskSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";

type TaskRow = { id: string; name: string | null; serial: number; shootReason: string | null; status: string; createdAt: Date | string };

export function TasksCsvDownload({
  tasks,
  receivedTaskIds,
}: {
  tasks: TaskRow[];
  receivedTaskIds: string[];
}) {
  const receivedSet = new Set(receivedTaskIds);
  function handleDownload() {
    const headers = ["Task name", "Task code", "Reason", "Status", "Created"];
    const rows = tasks.map((t) => [
      t.name ?? formatTaskSerial(t.serial),
      formatTaskSerial(t.serial),
      t.shootReason === "INHOUSE_SHOOT" ? "Inhouse" : t.shootReason === "AGENCY_SHOOT" ? "Agency" : t.shootReason === "INFLUENCER_FITS" ? "Influencer" : t.shootReason ?? "",
      getTaskStatusDisplayLabel(t.status, false, receivedSet.has(t.id)),
      formatDateTimeIST(t.createdAt),
    ]);
    const csv = buildCsv(headers, rows);
    downloadCsv(csv, `tasks-${new Date().toISOString().slice(0, 10)}.csv`);
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={tasks.length === 0}
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Download CSV
    </button>
  );
}
