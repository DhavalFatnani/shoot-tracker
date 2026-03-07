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
        <div className="section-card rounded-2xl border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
          <h2 className="font-display text-lg font-semibold text-amber-800 dark:text-amber-200">Access restricted</h2>
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
        <h1 className="page-title">Activity logs</h1>
        <p className="page-subtitle mt-1">
          Recent events across all tasks: picks, receipts, returns, sold, and more.
        </p>
      </div>

      <div className="table-wrapper">
        <table className="table table-sticky table-row-hover">
          <thead>
            <tr>
              <th className="table-th">Time</th>
              <th className="table-th">Event</th>
              <th className="table-th">Task</th>
              <th className="table-th">Serial</th>
              <th className="table-th">From → To</th>
              <th className="table-th">Actor</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="table-td py-10 text-center">
                  No activity yet.
                </td>
              </tr>
            )}
            {list.map((row) => (
              <ClickableTableRow key={row.id} href={`/tasks/${row.taskId}`}>
                <td className="table-td whitespace-nowrap">
                  {formatDateTimeIST(row.createdAt)}
                </td>
                <td className="table-td">
                  <span className={`badge ${getEventColor(row.eventType)}`}>
                    {getEventLabel(row.eventType)}
                  </span>
                </td>
                <td className="table-td">
                  <LinkWithStopPropagation
                    href={`/tasks/${row.taskId}`}
                    className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    {row.taskName ?? formatTaskSerial(row.taskSerial)}
                  </LinkWithStopPropagation>
                  <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">
                    {formatTaskSerial(row.taskSerial)}
                  </span>
                </td>
                <td className="table-td font-mono text-xs">
                  {row.serialId}
                </td>
                <td className="table-td text-xs text-slate-500 dark:text-slate-400">
                  {row.fromLocation} → {row.toLocation}
                </td>
                <td className="table-td text-sm text-slate-600 dark:text-slate-300">
                  {row.actorDisplayName}
                </td>
              </ClickableTableRow>
            ))}
          </tbody>
        </table>
      </div>

      {(page > 1 || hasNext) && (
        <nav className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700" aria-label="Pagination">
          <div>
            {page > 1 ? (
              <Link href={`/activity?page=${page - 1}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                ← Previous
              </Link>
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">Previous</span>
            )}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Page {page}</div>
          <div>
            {hasNext ? (
              <Link href={`/activity?page=${page + 1}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Next →
              </Link>
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">Next</span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
