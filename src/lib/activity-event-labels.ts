/** Event type display labels and colors for activity / timeline UIs */
export const ACTIVITY_EVENT_COLORS: Record<string, string> = {
  PICK: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  RECEIPT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  RETURN_TO_WH: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  RETURN_TO_BUFFER: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  MARK_SOLD: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
  MARK_LOST: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
  REQUEST: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  ADMIN_REVERT: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200",
};

export const ACTIVITY_EVENT_LABELS: Record<string, string> = {
  PICK: "Picked",
  RECEIPT: "Received",
  RETURN_TO_WH: "Return verified",
  RETURN_TO_BUFFER: "Return to buffer",
  MARK_SOLD: "Marked sold",
  MARK_LOST: "Marked lost",
  REQUEST: "Requested",
  ADMIN_REVERT: "Reverted",
};

export function getEventLabel(eventType: string): string {
  return ACTIVITY_EVENT_LABELS[eventType] ?? eventType;
}

export function getEventColor(eventType: string): string {
  return ACTIVITY_EVENT_COLORS[eventType] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}

/** Task timeline step circle colors (created, picked, dispatched, etc.). */
const TASK_TIMELINE_ENTRY_CLASS: Record<string, string> = {
  created: "bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200",
  pick: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200",
  receipt: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
  "return-scan": "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200",
  "return-verify": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200",
  dispatched: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200",
  closed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200",
};

export function getTaskTimelineEntryClass(entryType: string): string {
  return TASK_TIMELINE_ENTRY_CLASS[entryType] ?? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300";
}
