"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LinkWithStopPropagation } from "@/components/ui/link-with-stop-propagation";
import { formatReturnSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { ReturnsEmptyState } from "@/components/empty-state";

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

export function ReturnsTableWithSelection({
  returns: returnsList,
  canCreate,
}: {
  returns: ReturnRow[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allSelected = returnsList.length > 0 && selectedIds.size === returnsList.length;
  const someSelected = selectedIds.size > 0;

  function toggleSelection(returnId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(returnId)) next.delete(returnId);
      else next.add(returnId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(returnsList.map((r) => r.id)));
  }

  function handleSelectedDownload() {
    const selected = returnsList.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return;
    const headers = ["Return code", "Name", "Status", "Units", "Tasks", "Verified", "Created", "Dispatched", "Closed"];
    const rows = selected.map((r) => {
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
    downloadCsv(csv, `returns-selected-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <>
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800/50">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {selectedIds.size} return{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={handleSelectedDownload}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download selected (CSV)
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
            <tr>
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all returns on this page"
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Return</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Name</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Status</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Units</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Tasks</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Created</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
            {returnsList.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8">
                  <ReturnsEmptyState canCreate={canCreate} />
                </td>
              </tr>
            )}
            {returnsList.map((r) => {
              const allVerified = r.totalSerials > 0 && r.verifiedCount === r.totalSerials;
              const status = r.closedAt
                ? "Closed"
                : allVerified
                  ? "Verified"
                  : r.dispatchedAt
                    ? "In transit"
                    : "Return created";
              const statusClass = r.closedAt
                ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
                : allVerified
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                  : r.dispatchedAt
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                    : "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200";
              return (
                <tr
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/returns/${r.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/returns/${r.id}`);
                    }
                  }}
                  className="cursor-pointer transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50"
                >
                  <td className="w-10 px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelection(r.id)}
                      aria-label={`Select return ${formatReturnSerial(r.serial)}`}
                      className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-700"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-zinc-900 dark:text-zinc-100">{formatReturnSerial(r.serial)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">
                    {r.name ?? formatReturnSerial(r.serial)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{r.totalSerials}</td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{r.taskCount}</td>
                  <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">
                    {formatDateTimeIST(r.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <LinkWithStopPropagation
                      href={`/returns/${r.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 transition duration-200 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                    >
                      View
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </LinkWithStopPropagation>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
