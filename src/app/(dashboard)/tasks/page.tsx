import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { listTasks } from "@/app/actions/task-actions";
import { TasksListFilters } from "./tasks-list-filters";
import { getTaskStatusClass, getTaskStatusLabel } from "@/lib/status-colors";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TasksEmptyState } from "@/components/empty-state";
import { formatTaskSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PICKING_PENDING", label: "Ready to pick" },
  { value: "PICKING", label: "Pick in progress" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "COLLECTED", label: "Collected" },
  { value: "CLOSED", label: "Closed" },
] as const;

type SearchParams = { status?: string; page?: string; q?: string };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const status = params.status ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const q = (params.q ?? "").trim();
  const offset = (page - 1) * PAGE_SIZE;

  const formData = new FormData();
  formData.set("limit", String(PAGE_SIZE + 1));
  formData.set("offset", String(offset));
  if (status) formData.set("status", status);
  if (q) formData.set("q", q);

  const result = await listTasks(formData);
  const rawTasks = result.success && result.data ? result.data : [];
  const hasNext = rawTasks.length > PAGE_SIZE;
  const tasks = rawTasks.slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Tasks" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            {q ? " matching search" : ""}
          </p>
        </div>
        {session.role !== "OPS_USER" && (
          <Link
            href="/tasks/create"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create request
          </Link>
        )}
      </div>

      <TasksListFilters status={status} page={page} q={q} statusOptions={STATUS_OPTIONS} />

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
            <tr>
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
                <td colSpan={5} className="px-5 py-8">
                  <TasksEmptyState hasFilters={!!(q || status)} />
                </td>
              </tr>
            )}
            {tasks.map((t) => (
              <ClickableTableRow key={t.id} href={`/tasks/${t.id}`}>
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.name ?? `Task ${formatTaskSerial(t.serial)}`}</p>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{formatTaskSerial(t.serial)}</p>
                </td>
                <td className="px-5 py-3.5">
                  {t.shootReason ? (
                    <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                      {t.shootReason === "INHOUSE_SHOOT" ? "Inhouse" : t.shootReason === "AGENCY_SHOOT" ? "Agency" : t.shootReason === "INFLUENCER_FITS" ? "Influencer" : t.shootReason}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getTaskStatusClass(t.status)}`}>
                    {getTaskStatusLabel(t.status)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">{formatDateTimeIST(t.createdAt)}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/tasks/${t.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 transition duration-200 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    View
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
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
              <Link
                href={`/tasks?${new URLSearchParams({
                  ...(status && { status }),
                  ...(q && { q }),
                  page: String(page - 1),
                }).toString()}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                ← Previous
              </Link>
            ) : (
              <span className="text-sm text-zinc-400 dark:text-zinc-500">Previous</span>
            )}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Page {page}</div>
          <div>
            {hasNext ? (
              <Link
                href={`/tasks?${new URLSearchParams({
                  ...(status && { status }),
                  ...(q && { q }),
                  page: String(page + 1),
                }).toString()}`}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
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
