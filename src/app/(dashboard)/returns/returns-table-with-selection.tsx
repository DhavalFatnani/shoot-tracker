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
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {selectedIds.size} return{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button type="button" onClick={handleSelectedDownload} className="btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download selected (CSV)
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="table-wrapper">
        <table className="table table-sticky table-row-hover">
          <thead>
            <tr>
              <th className="w-10 px-3 py-3.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all returns on this page"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </th>
              <th className="table-th">Return</th>
              <th className="table-th">Name</th>
              <th className="table-th">Status</th>
              <th className="table-th">Units</th>
              <th className="table-th">Tasks</th>
              <th className="table-th">Created</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
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
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200"
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
                  className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                >
                  <td className="w-10 px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleSelection(r.id)}
                      aria-label={`Select return ${formatReturnSerial(r.serial)}`}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                    />
                  </td>
                  <td className="table-td">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{formatReturnSerial(r.serial)}</span>
                  </td>
                  <td className="table-td text-slate-700 dark:text-slate-300">
                    {r.name ?? formatReturnSerial(r.serial)}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${statusClass}`}>
                      {status}
                    </span>
                  </td>
                  <td className="table-td">{r.totalSerials}</td>
                  <td className="table-td">{r.taskCount}</td>
                  <td className="table-td">
                    {formatDateTimeIST(r.createdAt)}
                  </td>
                  <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <LinkWithStopPropagation
                      href={`/returns/${r.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition duration-200 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
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
