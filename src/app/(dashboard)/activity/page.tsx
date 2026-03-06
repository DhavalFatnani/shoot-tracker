import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { LinkWithStopPropagation } from "@/components/ui/link-with-stop-propagation";
import { listActivityLogs } from "@/app/actions/activity-actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatTaskSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";
import { getEventLabel, getEventColor } from "@/lib/activity-event-labels";

const PAGE_SIZE = 30;

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  if (session.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Activity" }]} />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">Access restricted</h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Activity logs are only available to admins. Use the task detail page to view activity for your tasks.
          </p>
          <Link href="/dashboard" className="mt-3 inline-block text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const formData = new FormData();
  formData.set("limit", String(PAGE_SIZE + 1));
  formData.set("offset", String(offset));

  const result = await listActivityLogs(formData);
  const rows = result.success && result.data ? result.data : [];
  const hasNext = rows.length > PAGE_SIZE;
  const list = rows.slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Activity" }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Activity logs
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Recent events across all tasks: picks, receipts, returns, sold, and more.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
            <tr>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Time</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Event</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Task</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Serial</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">From → To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  No activity yet.
                </td>
              </tr>
            )}
            {list.map((row) => (
              <ClickableTableRow key={row.id} href={`/tasks/${row.taskId}`}>
                <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                  {formatDateTimeIST(row.createdAt)}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getEventColor(row.eventType)}`}>
                    {getEventLabel(row.eventType)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <LinkWithStopPropagation
                    href={`/tasks/${row.taskId}`}
                    className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    {row.taskName ?? formatTaskSerial(row.taskSerial)}
                  </LinkWithStopPropagation>
                  <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatTaskSerial(row.taskSerial)}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-zinc-700 dark:text-zinc-300 text-xs">
                  {row.serialId}
                </td>
                <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400 text-xs">
                  {row.fromLocation} → {row.toLocation}
                </td>
              </ClickableTableRow>
            ))}
          </tbody>
        </table>
      </div>

      {(page > 1 || hasNext) && (
        <nav className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700" aria-label="Pagination">
          <div>
            {page > 1 ? (
              <Link href={`/activity?page=${page - 1}`} className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400">
                ← Previous
              </Link>
            ) : (
              <span className="text-sm text-zinc-400 dark:text-zinc-500">Previous</span>
            )}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Page {page}</div>
          <div>
            {hasNext ? (
              <Link href={`/activity?page=${page + 1}`} className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400">
                Next →
              </Link>
            ) : (
              <span className="text-sm text-zinc-400 dark:text-zinc-500">Next</span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
