"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { ResolveDisputeForm } from "./resolve-dispute-form";
import { RaiseDisputeForm } from "./raise-dispute-form";
import { getDisputeStatusClass, DISPUTE_STATUS_LABELS } from "@/lib/status-colors";
import { formatRelativeTime } from "@/lib/format-date";
import { formatTaskSerial } from "@/lib/format-serials";

export type DisputeWithReporter = {
  id: string;
  taskId: string;
  serialId: string;
  disputeType: string;
  description: string | null;
  status: string;
  raisedBy: string | null;
  resolvedBy: string | null;
  createdAt: Date | string;
  resolvedAt: Date | string | null;
  reporterDisplayName: string;
  resolverDisplayName: string;
};

type TaskOption = { id: string; serial: number };

const PAGE_SIZE = 10;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
] as const;

function disputeIdShort(id: string) {
  return `#DIS-${id.slice(0, 8).toUpperCase()}`;
}

function statusDotClass(status: string): string {
  switch (status) {
    case "OPEN":
      return "bg-red-500";
    case "RESOLVED":
      return "bg-emerald-500";
    default:
      return "bg-slate-400";
  }
}

export function DisputesTable({
  disputes,
  tasks,
  canResolve,
  canRaise,
}: {
  disputes: DisputeWithReporter[];
  tasks: TaskOption[];
  canResolve: boolean;
  canRaise: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [statusFilter, setStatusFilter] = useState<"all" | "OPEN" | "RESOLVED">("all");
  const [page, setPage] = useState(1);
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);

  const taskSerialMap = useMemo(() => new Map(tasks.map((t) => [t.id, t.serial])), [tasks]);

  const filtered = useMemo(() => {
    let list = disputes;
    if (statusFilter !== "all") {
      list = list.filter((d) => d.status === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.serialId.toLowerCase().includes(q) ||
          d.disputeType.toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q) ||
          d.reporterDisplayName.toLowerCase().includes(q) ||
          disputeIdShort(d.id).toLowerCase().includes(q) ||
          (taskSerialMap.get(d.taskId) != null && formatTaskSerial(taskSerialMap.get(d.taskId)!).toLowerCase().includes(q))
      );
    }
    if (sort === "oldest") {
      list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return list;
  }, [disputes, search, sort, statusFilter, taskSerialMap]);

  const openCount = disputes.filter((d) => d.status === "OPEN").length;
  const resolved24hCount = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return disputes.filter((d) => d.status === "RESOLVED" && d.resolvedAt != null && new Date(d.resolvedAt).getTime() >= cutoff).length;
  }, [disputes]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageDisputes = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Critical (Open)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{openCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Resolved (24H)</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{resolved24hCount}</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-md">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400 dark:text-slate-500" aria-hidden>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search disputes by ID, serial, or user..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-12 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { const v = e.target.value; setStatusFilter(v === "OPEN" || v === "RESOLVED" ? v : "all"); setPage(1); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">All</option>
              <option value="OPEN">Open</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target as unknown as "newest" | "oldest"); setPage(1); }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {canRaise && (
            <button type="button" onClick={() => setRaiseModalOpen(true)} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Raise Dispute
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table table-sticky table-row-hover">
          <thead>
            <tr>
              <th className="table-th text-left">Dispute ID</th>
              <th className="table-th text-left">Serial Number</th>
              <th className="table-th text-left">Reason / Task</th>
              <th className="table-th text-left">Reported by</th>
              <th className="table-th text-left">Age</th>
              <th className="table-th text-left">Status</th>
              <th className="table-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageDisputes.length === 0 ? (
              <tr>
                <td colSpan={7} className="table-td py-12 text-center text-slate-500 dark:text-slate-400">
                  {filtered.length === 0 && disputes.length === 0
                    ? "No disputes yet."
                    : "No disputes match your search."}
                </td>
              </tr>
            ) : (
            pageDisputes.map((d) => (
              <tr key={d.id}>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(d.status)}`} aria-hidden />
                    <span className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{disputeIdShort(d.id)}</span>
                  </div>
                </td>
                <td className="table-td font-mono text-sm text-slate-700 dark:text-slate-300">{d.serialId}</td>
                <td className="table-td">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">{d.disputeType.replace(/_/g, " ")}</p>
                    <Link href={`/tasks/${d.taskId}`} className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                      Associated Task: {formatTaskSerial(taskSerialMap.get(d.taskId) ?? 0)}
                    </Link>
                  </div>
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600 dark:bg-slate-600 dark:text-slate-200">
                      {(d.reporterDisplayName || "?").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">{d.reporterDisplayName}</span>
                  </div>
                </td>
                <td className="table-td text-slate-600 dark:text-slate-300">{formatRelativeTime(d.createdAt)}</td>
                <td className="table-td">
                  <div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getDisputeStatusClass(d.status)}`}>
                      {DISPUTE_STATUS_LABELS[d.status] ?? d.status}
                    </span>
                    {d.status === "RESOLVED" && d.resolverDisplayName && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Resolved by {d.resolverDisplayName}</p>
                    )}
                  </div>
                </td>
                <td className="table-td text-right">
                  {d.status === "OPEN" && canResolve ? (
                    <ResolveDisputeForm disputeId={d.id} />
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <nav className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-700" aria-label="Pagination">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {total === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total} active dispute{total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="rounded-full border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:disabled:hover:bg-transparent"
            aria-label="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="rounded-full border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:disabled:hover:bg-transparent"
            aria-label="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Raise dispute modal */}
      {canRaise && tasks.length > 0 && (
        <Dialog.Root open={raiseModalOpen} onOpenChange={setRaiseModalOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg max-h-[90vh] translate-x-[-50%] translate-y-[-50%] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">Raise new dispute</Dialog.Title>
                    <Dialog.Description className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select a task and serial, then choose the dispute type and add details.</Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                  <button type="button" className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label="Close">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-2.72 2.72a.75.75 0 101.06 1.06L10 11.06l2.72 2.72a.75.75 0 101.06-1.06L11.06 10l2.72-2.72a.75.75 0 00-1.06-1.06L10 8.94 7.28 6.22z" />
                    </svg>
                  </button>
                </Dialog.Close>
                </div>
              </div>
              <div className="p-5">
                <RaiseDisputeForm tasks={tasks} onSuccess={() => setRaiseModalOpen(false)} inModal />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
