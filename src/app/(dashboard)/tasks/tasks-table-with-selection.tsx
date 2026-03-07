"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LinkWithStopPropagation } from "@/components/ui/link-with-stop-propagation";
import { getTaskStatusClass, getTaskStatusDisplayLabel } from "@/lib/status-colors";
import { formatTaskSerial } from "@/lib/format-serials";
import { formatRelativeTime } from "@/lib/format-date";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { exportMultiTaskData } from "@/app/actions/task-actions";
import { TasksEmptyState } from "@/components/empty-state";

type TaskRow = { id: string; name: string | null; serial: number; shootReason: string | null; status: string; createdAt: Date | string; unitCount?: number };

export function TasksTableWithSelection({
  tasks,
  receivedTaskIds,
  hasFilters,
}: {
  tasks: TaskRow[];
  receivedTaskIds: string[];
  hasFilters: boolean;
}) {
  const router = useRouter();
  const receivedSet = useMemo(() => new Set(receivedTaskIds), [receivedTaskIds]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const allSelected = tasks.length > 0 && selectedIds.size === tasks.length;
  const someSelected = selectedIds.size > 0;

  function toggleSelection(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(tasks.map((t) => t.id)));
  }

  async function handleMultiTaskDownload() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setPending(true);
    try {
      const result = await exportMultiTaskData(ids);
      if (result.success && result.data) {
        const headers = ["Task name", "Task code", "Serial ID", "SKU", "Status"];
        const rows = result.data.map((r) => [r.taskName, r.taskCode, r.serialId, r.sku, r.status]);
        const csv = buildCsv(headers, rows);
        downloadCsv(csv, `multi-task-data-${new Date().toISOString().slice(0, 10)}.csv`);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {selectedIds.size} task{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={handleMultiTaskDownload}
            disabled={pending}
            className="btn-secondary disabled:opacity-50"
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
            {pending ? "Preparing…" : "Download selected (CSV)"}
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
                  aria-label="Select all tasks on this page"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                />
              </th>
              <th className="table-th">TASK ID</th>
              <th className="table-th">NAME</th>
              <th className="table-th">UNITS</th>
              <th className="table-th">STATUS</th>
              <th className="table-th">CREATED</th>
              <th className="table-th px-5 py-3.5 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8">
                  <TasksEmptyState hasFilters={hasFilters} />
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <tr
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/tasks/${t.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/tasks/${t.id}`);
                  }
                }}
                className="cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
              >
                <td className="w-10 px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelection(t.id)}
                    aria-label={`Select task ${formatTaskSerial(t.serial)}`}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
                  />
                </td>
                <td className="table-td">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">#{formatTaskSerial(t.serial)}</span>
                </td>
                <td className="table-td">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{t.name ?? `Task ${formatTaskSerial(t.serial)}`}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {t.shootReason === "INHOUSE_SHOOT" ? "Inhouse" : t.shootReason === "AGENCY_SHOOT" ? "Agency" : t.shootReason === "INFLUENCER_FITS" ? "Influencer" : t.shootReason ?? "—"}
                  </p>
                </td>
                <td className="table-td tabular-nums text-slate-600 dark:text-slate-300">{t.unitCount ?? "—"}</td>
                <td className="table-td">
                  <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${getTaskStatusClass(t.status === "PICKING" && receivedSet.has(t.id) ? "RECEIVING" : t.status)}`}>
                    {getTaskStatusDisplayLabel(t.status, false, receivedSet.has(t.id))}
                  </span>
                </td>
                <td className="table-td text-slate-600 dark:text-slate-300">{formatRelativeTime(t.createdAt)}</td>
                <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <LinkWithStopPropagation
                    href={`/tasks/${t.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    aria-label={`View task ${formatTaskSerial(t.serial)}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                    </svg>
                  </LinkWithStopPropagation>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
