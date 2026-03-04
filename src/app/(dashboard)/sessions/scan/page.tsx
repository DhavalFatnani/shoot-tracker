import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { taskById } from "@/lib/repositories/task-repository";
import { getDb } from "@/lib/db/client";
import { ScanSessionUI } from "./scan-session-ui";
import { listTasks } from "@/app/actions/task-actions";
import { getTaskStatusClass, getTaskStatusLabel } from "@/lib/status-colors";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatTaskSerial } from "@/lib/format-serials";

const VALID_SESSION_TYPES = ["PICK", "RECEIPT", "RETURN_SCAN", "RETURN_VERIFY"] as const;

export default async function ScanSessionPage({ searchParams }: { searchParams: Promise<{ taskId?: string; type?: string }> }) {
  const { taskId, type } = await searchParams;
  const defaultSessionType = type && VALID_SESSION_TYPES.includes(type as (typeof VALID_SESSION_TYPES)[number]) ? type : undefined;
  const session = await getSession();
  if (!session) return null;

  const task = taskId ? await taskById(getDb(), taskId) : null;

  let tasksForPicker: { id: string; name: string | null; status: string; serial: number }[] = [];
  if (!taskId) {
    const formData = new FormData();
    formData.set("limit", "50");
    const result = await listTasks(formData);
    if (result.success && result.data) {
      tasksForPicker = result.data
        .filter((t) => t.status !== "CLOSED")
        .map((t) => ({
          id: t.id,
          name: t.name ?? null,
          status: t.status,
          serial: t.serial,
        }));
    }
  }

  const taskClosed = task != null && task.status === "CLOSED";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/tasks", label: "Tasks" }, { label: task ? `${task.name ?? formatTaskSerial(task.serial)}` : "Scan session" }]} />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Scan session</h1>
        {task ? (
          <p className="mt-1 text-sm text-zinc-500">
            Task {formatTaskSerial(task.serial)} &middot; {getTaskStatusLabel(task.status)}
          </p>
        ) : !taskId && tasksForPicker.length > 0 ? (
          <p className="mt-1 text-sm text-zinc-500">Select a task to start a scan session.</p>
        ) : !taskId ? (
          <p className="mt-1 text-sm text-zinc-500">No tasks available. Create a task first or open one from the Tasks list.</p>
        ) : null}
      </div>

      {!taskId && tasksForPicker.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">Choose a task</h2>
          </div>
          <ul className="divide-y divide-zinc-100">
            {tasksForPicker.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/sessions/scan?taskId=${t.id}`}
                  className="flex items-center justify-between px-5 py-3 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{t.name ?? formatTaskSerial(t.serial)}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTaskStatusClass(t.status)}`}>
                    {getTaskStatusLabel(t.status)}
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
      {taskId && task && !taskClosed && (
        <ScanSessionUI taskId={taskId} userRole={session.role} defaultSessionType={defaultSessionType} />
      )}
    </div>
  );
}
