"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getSerialTimeline } from "@/app/actions/serial-actions";
import { listTasksForSerial } from "@/app/actions/task-actions";
import { formatTaskSerial } from "@/lib/format-serials";
import { formatDateTimeIST, formatRelativeTime } from "@/lib/format-date";
import { buildCsv, downloadCsv } from "@/lib/csv";

type TimelineEvent = {
  eventType: string;
  fromLocation: string;
  toLocation: string;
  taskId?: string | null;
  createdAt: Date | string | null;
};

const LOCATION_LABELS: Record<string, string> = {
  WH_: "Warehouse",
  TRANSIT: "In transit",
  SHOOT_ACTIVE: "At shoot",
  SHOOT_BUFFER: "Buffer",
  SOLD: "Sold",
  LOST: "Lost",
  QC_FAIL: "QC fail",
};

const EVENT_CONFIG: Record<
  string,
  { title: string; icon: "check" | "package" | "return" | "buffer" | "dollar" | "alert" | "revert" | "request"; bg: string; description: (e: TimelineEvent) => string }
> = {
  REQUEST: {
    title: "Added to task",
    icon: "request",
    bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    description: (e) => `Serial requested for task. From ${LOCATION_LABELS[e.fromLocation] ?? e.fromLocation} to task.`,
  },
  PICK: {
    title: "Dispatch initiated",
    icon: "package",
    bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    description: (e) => `Picked and dispatched. From ${LOCATION_LABELS[e.fromLocation] ?? e.fromLocation} to ${LOCATION_LABELS[e.toLocation] ?? e.toLocation}.`,
  },
  RECEIPT: {
    title: "Warehouse receipt",
    icon: "check",
    bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    description: (e) => `Received and checked in. From ${LOCATION_LABELS[e.fromLocation] ?? e.fromLocation} to ${LOCATION_LABELS[e.toLocation] ?? e.toLocation}.`,
  },
  RETURN_TO_WH: {
    title: "Return to warehouse",
    icon: "return",
    bg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    description: (e) => `Return verified and checked into warehouse.`,
  },
  RETURN_TO_BUFFER: {
    title: "Return to buffer",
    icon: "buffer",
    bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    description: (e) => `Moved to buffer. From ${LOCATION_LABELS[e.fromLocation] ?? e.fromLocation} to ${LOCATION_LABELS[e.toLocation] ?? e.toLocation}.`,
  },
  MARK_SOLD: {
    title: "Marked sold",
    icon: "dollar",
    bg: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
    description: () => `Serial marked as sold.`,
  },
  MARK_LOST: {
    title: "Marked lost",
    icon: "alert",
    bg: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
    description: () => `Serial marked as not found / lost.`,
  },
  ADMIN_REVERT: {
    title: "Admin revert",
    icon: "revert",
    bg: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    description: (e) => `Status reverted by admin. From ${LOCATION_LABELS[e.fromLocation] ?? e.fromLocation} to ${LOCATION_LABELS[e.toLocation] ?? e.toLocation}.`,
  },
};

const CURRENT_STATE_LABELS: Record<string, string> = {
  WH_: "In warehouse",
  TRANSIT: "In transit",
  SHOOT_ACTIVE: "At shoot",
  SHOOT_BUFFER: "In buffer",
  SOLD: "Sold",
  LOST: "Lost",
  QC_FAIL: "QC fail",
};

const CURRENT_STATE_TAG_CLASS: Record<string, string> = {
  WH_: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  TRANSIT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  SHOOT_ACTIVE: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200",
  SHOOT_BUFFER: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  SOLD: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200",
  LOST: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200",
  QC_FAIL: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

function EventIcon({ type }: { type: string }) {
  const config = EVENT_CONFIG[type];
  const iconClass = "h-5 w-5";
  const circleClass = config ? config.bg : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
  if (!config) {
    return (
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${circleClass}`}>
        <span className="text-xs font-bold">?</span>
      </span>
    );
  }
  const icons = {
    check: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    package: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    return: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
    buffer: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    dollar: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    alert: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    revert: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    request: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  };
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${circleClass}`}>
      {icons[config.icon] ?? icons.request}
    </span>
  );
}

export function SerialTimelineForm({ canRaiseDispute }: { canRaiseDispute: boolean }) {
  const [serialId, setSerialId] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [serialSku, setSerialSku] = useState("");
  const [displaySerialId, setDisplaySerialId] = useState("");
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [tasksForSerial, setTasksForSerial] = useState<{ taskId: string; serial: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const raw = serialId.trim();
    startTransition(async () => {
      try {
        const result = await getSerialTimeline(raw);
        if (result.success && result.data) {
          const d = result.data as {
            events: TimelineEvent[];
            serialId: string;
            sku: string;
            currentLocation?: string | null;
          };
          setEvents(d.events ?? []);
          setSerialSku(d.sku ?? "");
          setDisplaySerialId(d.serialId ?? "");
          setCurrentLocation(d.currentLocation ?? null);
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
          setCurrentLocation(null);
          setTasksForSerial([]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setEvents([]);
        setSerialSku("");
        setDisplaySerialId("");
        setCurrentLocation(null);
        setTasksForSerial([]);
      }
    });
  }

  function handleDownloadCsv() {
    const headers = ["Event", "From", "To", "Time"];
    const rows = events.map((ev) => {
      const config = EVENT_CONFIG[ev.eventType];
      const title = config?.title ?? ev.eventType;
      return [title, ev.fromLocation, ev.toLocation, formatDateTimeIST(ev.createdAt)];
    });
    const csv = buildCsv(headers, rows);
    downloadCsv(csv, `serial-timeline-${displaySerialId}-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-6">
      {/* Lookup serial number */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Lookup serial number
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-0 flex-1 max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400 dark:text-slate-500" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm12 12a2 2 0 002-2v-4a2 2 0 00-2-2H6v4a2 2 0 002 2zM6 8a2 2 0 012-2h4a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              type="text"
              value={serialId}
              onChange={(e) => setSerialId(e.target.value)}
              placeholder="Scan or type serial (e.g. 0000123456 or 1234567890)"
              disabled={pending}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-12 pr-3 text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
              aria-label="Serial ID"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !serialId.trim()}
            className="btn btn-primary"
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
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                Trace Serial
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200" role="alert">
          {error}
        </div>
      )}

      {displaySerialId && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          {/* Serial Status panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">Serial Status</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current state</p>
                <span className={`mt-0.5 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${currentLocation ? (CURRENT_STATE_TAG_CLASS[currentLocation] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300") : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"}`}>
                  {currentLocation ? CURRENT_STATE_LABELS[currentLocation] ?? currentLocation : "—"}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Serial ID</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">{displaySerialId}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">SKU</p>
                <p className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{serialSku || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Product overview</p>
                <div className="mt-1.5 flex items-start gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{serialSku || "Serialized item"}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Serial: {displaySerialId}</p>
                  </div>
                </div>
              </div>
              {canRaiseDispute && tasksForSerial.length > 0 && (
                <Link
                  href={`/tasks/${tasksForSerial[0].taskId}`}
                  className="btn btn-secondary mt-2 w-full justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Raise dispute{tasksForSerial.length > 1 ? ` (Task ${formatTaskSerial(tasksForSerial[0].serial)})` : ""}
                </Link>
              )}
            </div>
          </div>

          {/* Lifecycle Events */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-card)] dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">Lifecycle Events</h2>
              {events.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100 px-5 dark:divide-slate-700">
              {events.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">No events recorded for this serial.</div>
              ) : (
                events.map((ev, i) => {
                  const config = EVENT_CONFIG[ev.eventType];
                  const title = config?.title ?? ev.eventType;
                  const description = config?.description(ev) ?? `${ev.fromLocation} → ${ev.toLocation}`;
                  return (
                    <div key={i} className="flex gap-4 py-4">
                      <EventIcon type={ev.eventType} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{description}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            LOC: {LOCATION_LABELS[ev.toLocation] ?? ev.toLocation}
                          </span>
                          {ev.taskId && (
                            <Link
                              href={`/tasks/${ev.taskId}`}
                              className="inline-flex items-center gap-0.5 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                            >
                              Task
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </Link>
                          )}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {ev.createdAt ? formatRelativeTime(ev.createdAt) : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {events.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Technical log export
                </p>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Download Full History (CSV)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
