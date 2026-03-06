"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LinkWithStopPropagation } from "@/components/ui/link-with-stop-propagation";
import { getTaskStatusClass, getTaskStatusDisplayLabel } from "@/lib/status-colors";
import { formatTaskSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { exportMultiTaskData } from "@/app/actions/task-actions";
import { TasksEmptyState } from "@/components/empty-state";

type TaskRow = { id: string; name: string | null; serial: number; shootReason: string | null; status: string; createdAt: Date | string };

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
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-4 py-2 dark:border-zinc-600 dark:bg-zinc-800/50">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">
            {selectedIds.size} task{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={handleMultiTaskDownload}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
                  aria-label="Select all tasks on this page"
                  className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-700"
                />
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Task</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Reason</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Status</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Created</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8">
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
                className="cursor-pointer transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50"
              >
                <td className="w-10 px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(t.id)}
                    onChange={() => toggleSelection(t.id)}
                    aria-label={`Select task ${formatTaskSerial(t.serial)}`}
                    className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-700"
                  />
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.name ?? `Task ${formatTaskSerial(t.serial)}`}</p>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{formatTaskSerial(t.serial)}</p>
                </td>
                <td className="px-5 py-3.5">
                  {t.shootReason ? (
                    <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      {t.shootReason === "INHOUSE_SHOOT" ? "Inhouse" : t.shootReason === "AGENCY_SHOOT" ? "Agency" : t.shootReason === "INFLUENCER_FITS" ? "Influencer" : t.shootReason}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTaskStatusClass(t.status === "PICKING" && receivedSet.has(t.id) ? "RECEIVING" : t.status)}`}>
                    {getTaskStatusDisplayLabel(t.status, false, receivedSet.has(t.id))}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">{formatDateTimeIST(t.createdAt)}</td>
                <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <LinkWithStopPropagation
                    href={`/tasks/${t.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 transition duration-200 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    View
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
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
