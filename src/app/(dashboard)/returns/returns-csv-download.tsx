"use client";

import { buildCsv, downloadCsv } from "@/lib/csv";
import { formatReturnSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";

type ReturnRow = {
  id: string;
  serial: number;
  name: string | null;
  totalSerials: number;
  taskCount: number;
  verifiedCount: number;
  createdAt: Date | string;
  closedAt: Date | string | null;
  dispatchedAt: Date | string | null;
};

export function ReturnsCsvDownload({ returns: returnsList }: { returns: ReturnRow[] }) {
  function handleDownload() {
    const headers = ["Return code", "Name", "Status", "Units", "Tasks", "Verified", "Created", "Dispatched", "Closed"];
    const rows = returnsList.map((r) => {
      const allVerified = r.totalSerials > 0 && r.verifiedCount === r.totalSerials;
      const status = r.closedAt ? "Closed" : allVerified ? "Verified" : r.dispatchedAt ? "In transit" : "Return created";
      return [
        formatReturnSerial(r.serial),
        r.name ?? formatReturnSerial(r.serial),
        status,
        r.totalSerials,
        r.taskCount,
        r.verifiedCount,
        formatDateTimeIST(r.createdAt),
        r.dispatchedAt ? formatDateTimeIST(r.dispatchedAt) : "",
        r.closedAt ? formatDateTimeIST(r.closedAt) : "",
      ];
    });
    const csv = buildCsv(headers, rows);
    downloadCsv(csv, `returns-${new Date().toISOString().slice(0, 10)}.csv`);
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={returnsList.length === 0}
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Download CSV
    </button>
  );
}
