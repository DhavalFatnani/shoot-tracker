/**
 * Centralized status colors and labels for tasks, task serials, and disputes.
 * Use with Badge or inline: className={TASK_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"}
 */

export const TASK_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  PICKING_PENDING: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  PICKING: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  IN_TRANSIT: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  RETURN_PENDING: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
  COLLECTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  RECEIVING: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  RETURNING: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
  VERIFYING: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-200",
  CLOSED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

/** User-facing labels for task statuses (filters, badges, lists) */
export const TASK_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  PICKING_PENDING: "Ready to pick",
  PICKING: "Pick in progress",
  IN_TRANSIT: "In transit",
  ACTIVE: "Active",
  RETURN_PENDING: "Return pending",
  COLLECTED: "Collected",
  RECEIVING: "Receiving",
  RETURNING: "Returning",
  VERIFYING: "Verifying",
  CLOSED: "Closed",
};

export function getTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status;
}

/** Use when verify scan is already closed but task is not yet closed (shows "Task closure pending" instead of "Verifying"). */
/** When hasReceivedSerials is true and status is PICKING, show "Receiving" (receive scan has run; "Pick in progress" is wrong). */
export function getTaskStatusDisplayLabel(status: string, verifyScanClosed?: boolean, hasReceivedSerials?: boolean): string {
  if (status === "VERIFYING" && verifyScanClosed) return "Task closure pending";
  if (status === "PICKING" && hasReceivedSerials) return "Receiving";
  return getTaskStatusLabel(status);
}

export const TASK_SERIAL_STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  PICKED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  PACKED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  DISPATCHED: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
  IN_TRANSIT: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
  RECEIVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  SOLD: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  NOT_FOUND: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
  QC_FAIL: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200",
  RETURNED: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-200",
  BUFFERED: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  RETURN_CREATED: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  RETURN_IN_TRANSIT: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
};

export const DISPUTE_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  REJECTED: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

/** Single map for task + serial statuses (task detail uses both in one object in some places) */
export const STATUS_COLORS: Record<string, string> = {
  ...TASK_STATUS_COLORS,
  ...TASK_SERIAL_STATUS_COLORS,
};

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

const DEFAULT_STATUS_CLASS = "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

export function getTaskStatusClass(status: string): string {
  return TASK_STATUS_COLORS[status] ?? DEFAULT_STATUS_CLASS;
}

export function getTaskSerialStatusClass(status: string): string {
  return TASK_SERIAL_STATUS_COLORS[status] ?? DEFAULT_STATUS_CLASS;
}

export function getDisputeStatusClass(status: string): string {
  return DISPUTE_STATUS_COLORS[status] ?? DEFAULT_STATUS_CLASS;
}

export function getStatusClass(status: string): string {
  return STATUS_COLORS[status] ?? DEFAULT_STATUS_CLASS;
}
