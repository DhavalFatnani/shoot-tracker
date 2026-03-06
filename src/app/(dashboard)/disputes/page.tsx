import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { listTasks } from "@/app/actions/task-actions";
import { listDisputesByTask } from "@/app/actions/dispute-actions";
import { ResolveDisputeForm } from "./resolve-dispute-form";
import { RaiseDisputeForm } from "./raise-dispute-form";
import { getDisputeStatusClass } from "@/lib/status-colors";
import { formatTaskSerial } from "@/lib/format-serials";

export default async function DisputesPage() {
  const session = await getSession();
  if (!session) return null;

  const formData = new FormData();
  const tasksResult = await listTasks(formData);
  const tasks = tasksResult.success && tasksResult.data ? tasksResult.data : [];
  const disputesByTask: { taskId: string; taskSerial: number; disputes: any[] }[] = [];
  for (const t of tasks) {
    const fd = new FormData();
    fd.set("taskId", t.id);
    const dr = await listDisputesByTask(fd);
    if (dr.success && dr.data && dr.data.length > 0) {
      disputesByTask.push({ taskId: t.id, taskSerial: t.serial, disputes: dr.data });
    }
  }

  const totalDisputes = disputesByTask.reduce((sum, g) => sum + g.disputes.length, 0);
  const canResolve = session.role === "OPS_USER" || session.role === "ADMIN";
  const canRaise = session.role === "OPS_USER" || session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Disputes</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {totalDisputes} dispute{totalDisputes !== 1 ? "s" : ""} across {disputesByTask.length} task{disputesByTask.length !== 1 ? "s" : ""}
        </p>
      </div>
      {canRaise && tasks.length > 0 && (
        <RaiseDisputeForm tasks={tasks.map((t) => ({ id: t.id, serial: t.serial }))} />
      )}
      {disputesByTask.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <svg className="mx-auto h-10 w-10 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-3 text-sm font-semibold text-zinc-900">No disputes</h3>
          <p className="mt-1 text-sm text-zinc-500">All tasks are clean.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputesByTask.map(({ taskId, taskSerial, disputes }) => (
            <div key={taskId} className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-600">
                <Link href={`/tasks/${taskId}`} className="text-sm font-semibold text-teal-600 hover:text-teal-500 transition dark:text-teal-400">
                  Task {formatTaskSerial(taskSerial)}
                </Link>
                <span className="text-xs text-zinc-500">{disputes.length} dispute{disputes.length !== 1 ? "s" : ""}</span>
              </div>
              <ul className="divide-y divide-zinc-100">
                {disputes.map((d: any) => (
                  <li key={d.id} className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getDisputeStatusClass(d.status)}`}>
                        {d.status}
                      </span>
                      <span className="font-mono text-xs text-zinc-700">{d.serialId}</span>
                      <span className="text-sm text-zinc-500">{d.description ?? d.disputeType}</span>
                    </div>

                    {d.status === "RESOLVED" && (d.resolutionComment || d.resolutionPhotoUrl) && (
                      <div className="mt-2 rounded-lg bg-emerald-50 p-3">
                        {d.resolutionComment && (
                          <p className="text-sm text-emerald-800">{d.resolutionComment}</p>
                        )}
                        {d.resolutionPhotoUrl && (
                          <a href={d.resolutionPhotoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-teal-600 underline hover:text-teal-500">
                            View resolution photo
                          </a>
                        )}
                      </div>
                    )}

                    {d.status === "OPEN" && canResolve && (
                      <>
                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                          Suggested: Open the task above to verify the serial and update status (Mark Sold / Not found / QC fail) if needed, then document how it was resolved below.
                        </p>
                        <div className="mt-3">
                          <ResolveDisputeForm disputeId={d.id} />
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
