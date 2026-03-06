"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getSerialTimeline } from "@/app/actions/serial-actions";
import { listTasksForSerial } from "@/app/actions/task-actions";
import { formatTaskSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";

const EVENT_COLORS: Record<string, string> = {
  PICK: "bg-blue-100 text-blue-700",
  RECEIPT: "bg-emerald-100 text-emerald-700",
  RETURN_TO_WH: "bg-teal-100 text-teal-700",
  RETURN_TO_BUFFER: "bg-amber-100 text-amber-700",
  MARK_SOLD: "bg-purple-100 text-purple-700",
  MARK_LOST: "bg-red-100 text-red-700",
  REQUEST: "bg-slate-100 text-slate-700",
};

export function SerialTimelineForm({ canRaiseDispute }: { canRaiseDispute: boolean }) {
  const [serialId, setSerialId] = useState("");
  const [events, setEvents] = useState<{ eventType: string; fromLocation: string; toLocation: string; createdAt: Date | string | null }[]>([]);
  const [serialSku, setSerialSku] = useState("");
  const [displaySerialId, setDisplaySerialId] = useState("");
  const [tasksForSerial, setTasksForSerial] = useState<{ taskId: string; serial: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("serialId", serialId);
    startTransition(async () => {
      const result = await getSerialTimeline(serialId);
      if (result.success && result.data) {
        const d = result.data as { events: typeof events; serialId: string; sku: string };
        setEvents(d.events);
        setSerialSku(d.sku);
        setDisplaySerialId(d.serialId);
        if (canRaiseDispute) {
          const fd = new FormData();
          fd.set("serialId", d.serialId);
          listTasksForSerial(fd).then((r) => {
            if (r.success && r.data) setTasksForSerial(r.data);
            else setTasksForSerial([]);
          });
        } else {
          setTasksForSerial([]);
        }
      } else {
        setError(result.error ?? "Failed");
        setEvents([]);
        setSerialSku("");
        setDisplaySerialId("");
        setTasksForSerial([]);
      }
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 max-w-sm">
            <label htmlFor="serial-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Serial ID</label>
            <input
              id="serial-search"
              type="text"
              value={serialId}
              onChange={(e) => setSerialId(e.target.value)}
              placeholder="e.g. 0000043569"
              disabled={pending}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !serialId.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-60 dark:focus:ring-offset-zinc-800"
          >
            {pending ? (
              <>
                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading…
              </>
            ) : (
              "Search"
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {displaySerialId && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-slate-900 dark:text-zinc-100">Serial:</span>
              <span className="font-mono text-slate-700 dark:text-zinc-300">{displaySerialId}</span>
              {serialSku && (
                <>
                  <span className="text-slate-300 dark:text-zinc-500">|</span>
                  <span className="font-medium text-slate-900 dark:text-zinc-100">SKU:</span>
                  <span className="text-slate-700 dark:text-zinc-300">{serialSku}</span>
                </>
              )}
            </div>
            {canRaiseDispute && tasksForSerial.length > 0 && (
              <Link
                href={`/tasks/${tasksForSerial[0].taskId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                Raise dispute {tasksForSerial.length > 1 ? `(Task ${formatTaskSerial(tasksForSerial[0].serial)})` : ""}
              </Link>
            )}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Event</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">From</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">To</th>
                <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((ev, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENT_COLORS[ev.eventType] ?? "bg-slate-100 text-slate-600"}`}>
                      {ev.eventType}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{ev.fromLocation}</td>
                  <td className="px-5 py-3 text-slate-700">{ev.toLocation}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDateTimeIST(ev.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
