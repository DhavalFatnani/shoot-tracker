import { getTaskTimelineEntryClass } from "@/lib/activity-event-labels";

export type TimelineEntry = {
  id: string;
  at: Date;
  type: string;
  label: string;
  detail?: string;
};

export function TaskTimelineSidebar({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <div className="w-full shrink-0">
      <div className="sticky top-4 rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-600">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Task timeline
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Created, picked, dispatched, received, closed.
          </p>
        </div>
        {timeline.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
            No timeline events yet.
          </div>
        ) : (
          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-3 py-2">
            <ul className="relative space-y-0">
              {timeline.map((entry, i) => (
                <li key={entry.id} className="relative flex gap-2.5 pb-4 last:pb-0">
                  {i < timeline.length - 1 && (
                    <span className="absolute left-[10px] top-4 h-full w-px bg-zinc-200 dark:bg-zinc-600" aria-hidden />
                  )}
                  <span
                    className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${getTaskTimelineEntryClass(entry.type)}`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 pt-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{entry.label}</p>
                    {entry.detail && (
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{entry.detail}</p>
                    )}
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(entry.at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
