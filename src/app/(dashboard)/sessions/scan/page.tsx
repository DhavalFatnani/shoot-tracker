import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { taskById } from "@/lib/repositories/task-repository";
import { returnIdByTaskId } from "@/lib/repositories/return-repository";
import { getDb } from "@/lib/db/client";
import { ScanSessionUI } from "./scan-session-ui";
import { listTasks, getNonReturnableSerialsForTask } from "@/app/actions/task-actions";
import { listReturns } from "@/app/actions/return-actions";
import { getTaskStatusClass, getTaskStatusLabel } from "@/lib/status-colors";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatTaskSerial, formatReturnSerial } from "@/lib/format-serials";

const VALID_SESSION_TYPES = ["PICK", "RECEIPT", "RETURN_SCAN", "RETURN_VERIFY"] as const;

export default async function ScanSessionPage({ searchParams }: { searchParams: Promise<{ taskId?: string; type?: string; autoStart?: string }> }) {
  const { taskId, type, autoStart } = await searchParams;
  const defaultSessionType = type && VALID_SESSION_TYPES.includes(type as (typeof VALID_SESSION_TYPES)[number]) ? type : undefined;
  const shouldAutoStart = autoStart === "1" && !!taskId && !!defaultSessionType;
  const session = await getSession();
  if (!session) return null;

  const isReturnType = type === "RETURN_VERIFY" || type === "RETURN_SCAN";

  let task: Awaited<ReturnType<typeof taskById>> | null = null;
  let nonReturnableSerialIds: string[] = [];
  let tasksForPicker: { id: string; name: string | null; status: string; serial: number }[] = [];
  let returnsForPicker: { id: string; serial: number; name: string | null; totalSerials: number; closedAt: Date | null }[] = [];
  let hasReturn = true;

  if (taskId) {
    const db = getDb();
    const [taskResult, nonReturnableResult, returnId] = await Promise.all([
      taskById(db, taskId),
      isReturnType ? getNonReturnableSerialsForTask(taskId) : Promise.resolve(null),
      isReturnType ? returnIdByTaskId(db, taskId) : Promise.resolve("skip"),
    ]);
    task = taskResult;
    nonReturnableSerialIds = nonReturnableResult?.success && nonReturnableResult.data ? nonReturnableResult.data : [];
    hasReturn = returnId !== null;
  } else {
    const formData = new FormData();
    formData.set("limit", "50");
    const [tasksResult, returnsResult] = await Promise.all([
      listTasks(formData),
      listReturns(formData),
    ]);
    if (tasksResult.success && tasksResult.data?.tasks) {
      tasksForPicker = tasksResult.data.tasks
        .filter((t) => t.status !== "CLOSED")
        .map((t) => ({
          id: t.id,
          name: t.name ?? null,
          status: t.status,
          serial: t.serial,
        }));
    }
    if (returnsResult.success && returnsResult.data) {
      returnsForPicker = returnsResult.data
        .filter((r) => !r.closedAt)
        .map((r) => ({
          id: r.id,
          serial: r.serial,
          name: r.name,
          totalSerials: r.totalSerials,
          closedAt: r.closedAt,
        }));
    }
  }

  const taskClosed = task != null && task.status === "CLOSED";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/tasks", label: "Tasks" }, { label: task ? `${task.name ?? formatTaskSerial(task.serial)}` : "Scan session" }]} />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Scan session</h1>
        {task ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Task {formatTaskSerial(task.serial)} &middot; {getTaskStatusLabel(task.status)}
          </p>
        ) : !taskId && tasksForPicker.length > 0 ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select a task to start a scan session.</p>
        ) : !taskId ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">No tasks available. Create a task first or open one from the Tasks list.</p>
        ) : null}
      </div>

      {!taskId && tasksForPicker.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Choose a task</h2>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {tasksForPicker.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/sessions/scan?taskId=${t.id}`}
                  className="flex items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100">{t.name ?? formatTaskSerial(t.serial)}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTaskStatusClass(t.status)}`}>
                    {getTaskStatusLabel(t.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!taskId && returnsForPicker.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Open returns</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Select a return to start return processing.</p>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {returnsForPicker.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/returns/${r.id}`}
                  className="flex items-center justify-between px-5 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <div>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {r.name ?? formatReturnSerial(r.serial)}
                    </span>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {r.totalSerials} serial{r.totalSerials !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Open
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {taskId && task && taskClosed && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">Task closed</h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Scan sessions are not available for closed tasks. Select another task or go back to the task list.
          </p>
          <Link
            href="/sessions/scan"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 underline hover:no-underline dark:text-amber-200"
          >
            Choose a task
          </Link>
        </div>
      )}
      {taskId && task && !taskClosed && isReturnType && !hasReturn && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">No return raised</h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            A return must be created before starting a return scan or return verify session. Ask the shoot team to create a return first.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/returns/create?taskId=${task.id}`}
              className="btn btn-primary"
            >
              Create return
            </Link>
            <Link
              href={`/tasks/${task.id}`}
              className="btn btn-secondary"
            >
              Back to task
            </Link>
          </div>
        </div>
      )}
      {taskId && task && !taskClosed && (!isReturnType || hasReturn) && (
        <ScanSessionUI
          taskId={taskId}
          userRole={session.role}
          defaultSessionType={defaultSessionType}
          nonReturnableSerialIds={nonReturnableSerialIds}
          taskDisplayName={task.name ?? formatTaskSerial(task.serial)}
          taskSerial={formatTaskSerial(task.serial)}
          autoStart={shouldAutoStart}
        />
      )}
    </div>
  );
}
