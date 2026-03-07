import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { listTasks } from "@/app/actions/task-actions";
import { TasksListFilters } from "./tasks-list-filters";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TasksTableWithSelection } from "./tasks-table-with-selection";

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
  try {
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
    const data = result.success && result.data ? result.data : null;
    const rawTasks = data?.tasks ?? [];
    const receivedTaskIds = data?.receivedTaskIds ?? [];
    const hasNext = rawTasks.length > PAGE_SIZE;
    const tasks = rawTasks.slice(0, PAGE_SIZE);

    return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Tasks" }]} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle mt-1">
            Manage and track inventory movement sessions.
          </p>
        </div>
        {session.role !== "OPS_USER" && (
          <Link href="/tasks/create" className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create Request
          </Link>
        )}
      </div>

      <TasksListFilters status={status} page={page} q={q} statusOptions={STATUS_OPTIONS} />

      <TasksTableWithSelection tasks={tasks} receivedTaskIds={receivedTaskIds} hasFilters={!!(q || status)} />

      <nav className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-700" aria-label="Pagination">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + tasks.length}
          {!hasNext && page === 1 && tasks.length > 0 && ` of ${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
        </p>
        {(page > 1 || hasNext) && (
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link
                href={`/tasks?${new URLSearchParams({
                  ...(status && { status }),
                  ...(q && { q }),
                  page: String(page - 1),
                }).toString()}`}
                className="btn btn-secondary rounded-lg px-3 py-2 text-sm"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">Previous</span>
            )}
            <span className={`rounded-lg px-3 py-2 text-sm font-medium ${page === 1 ? "bg-indigo-600 text-white dark:bg-indigo-500" : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
              {page}
            </span>
            {hasNext && (
              <Link
                href={`/tasks?${new URLSearchParams({
                  ...(status && { status }),
                  ...(q && { q }),
                  page: String(page + 1),
                }).toString()}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {page + 1}
              </Link>
            )}
            {hasNext ? (
              <Link
                href={`/tasks?${new URLSearchParams({
                  ...(status && { status }),
                  ...(q && { q }),
                  page: String(page + 1),
                }).toString()}`}
                className="btn btn-secondary rounded-lg px-3 py-2 text-sm"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">Next</span>
            )}
          </div>
        )}
      </nav>
    </div>
    );
  } catch (e) {
    console.error("Tasks page error:", e);
    return (
      <div className="space-y-6">
        <div className="card rounded-xl border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <h1 className="text-lg font-semibold text-red-800 dark:text-red-200">Something went wrong</h1>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            We couldn’t load the tasks list. Please try again.
          </p>
          <a href="/tasks" className="mt-4 inline-block text-sm font-semibold text-red-600 hover:underline dark:text-red-400">
            Reload tasks
          </a>
        </div>
      </div>
    );
  }
}
