import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { getTask } from "@/app/actions/task-actions";
import { getTaskTimeline } from "@/app/actions/activity-actions";
import { listDisputesByTask } from "@/app/actions/dispute-actions";
import { listComments } from "@/app/actions/comment-actions";
import { CloseTaskButton } from "./close-task-button";
import { MarkReceivedButton } from "./mark-received-button";
import { SerialActions, SerialRowActions } from "./serial-actions";
import { TaskCommentsTrigger } from "./task-comments-trigger";
import { ResolveDisputeForm } from "@/app/(dashboard)/disputes/resolve-dispute-form";
import { AdminTaskActions } from "./admin-task-actions";
import { getTaskStatusClass, getTaskSerialStatusClass, getDisputeStatusClass, getTaskStatusDisplayLabel } from "@/lib/status-colors";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatTaskSerial } from "@/lib/format-serials";
import { TaskTimelineSidebar } from "./task-timeline-sidebar";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const formData = new FormData();
  formData.set("taskId", id);
  const [taskResult, timelineResult, disputesResult, commentsResult] = await Promise.all([
    getTask(formData),
    getTaskTimeline(id),
    listDisputesByTask(formData),
    listComments(id),
  ]);

  if (!taskResult.success || !taskResult.data) {
    return (
      <div className="space-y-4">
        <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 transition duration-200 hover:text-teal-700 dark:text-teal-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Tasks
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-200">{taskResult.error ?? "Task not found"}</p>
        </div>
      </div>
    );
  }

  const { task, taskSerials, balance, balanceSatisfied } = taskResult.data;
  const timeline = timelineResult.success && timelineResult.data ? timelineResult.data : [];
  const disputes: { id: string; serialId: string; status: string; description: string | null; disputeType: string; resolutionComment?: string | null; resolutionPhotoUrl?: string | null }[] = disputesResult.success && disputesResult.data ? disputesResult.data : [];
  const comments = commentsResult.success && commentsResult.data ? commentsResult.data : [];

  const taskLabel = task.name ?? `Task ${formatTaskSerial(task.serial)}`;
  const shootReasonLabel = task.shootReason === "INHOUSE_SHOOT" ? "Inhouse Shoot" : task.shootReason === "AGENCY_SHOOT" ? "Agency Shoot" : task.shootReason === "INFLUENCER_FITS" ? "Influencer Fits" : task.shootReason;

  const statusMessage = balanceSatisfied
    ? { label: "Ready to close", class: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200" }
    : balance.inTransit === 0 && balance.received === 0 && balance.sold === 0 && balance.notFound === 0
      ? { label: "Awaiting dispatch", class: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" }
      : { label: "In progress", class: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" };

  const balanceSum =
    balance.packed + balance.inTransit + balance.received + balance.sold + balance.notFound + balance.qcFail + balance.returnInTransit + balance.returned;
  const balanceHint = balanceSatisfied
    ? "All accounted for"
    : balanceSum < balance.requested
      ? `${balance.requested - balanceSum} not yet accounted for`
      : "Count mismatch";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
      <main className="min-w-0 flex-1 space-y-4">
        {/* Breadcrumbs + back */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/tasks", label: "Tasks" }, { label: taskLabel }]} />
          <Link
            href="/tasks"
            className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← All tasks
          </Link>
        </div>

        {/* Header card */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {task.name ?? `Task ${formatTaskSerial(task.serial)}`}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                {formatTaskSerial(task.serial)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getTaskStatusClass(task.status)}`}>
                  {getTaskStatusDisplayLabel(task.status, timeline.some((e) => e.type === "return-verify"))}
                </span>
                {task.shootReason && (
                  <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-200">
                    {shootReasonLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {(session.role === "ADMIN" || session.role === "SHOOT_USER") && balance.received > 0 && task.status !== "CLOSED" && (
                <Link
                  href={`/returns/create?taskId=${task.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-900/50"
                >
                  Create return
                </Link>
              )}
              {task.status === "IN_TRANSIT" && (session.role === "ADMIN" || session.role === "SHOOT_USER") && (
                <MarkReceivedButton taskId={task.id} />
              )}
              {(session.role === "ADMIN" || session.role === "OPS_USER") && task.status !== "CLOSED" && (
                <CloseTaskButton taskId={task.id} disabled={!balanceSatisfied || disputes.some((d) => d.status === "OPEN")} />
              )}
            </div>
          </div>
          {session.role === "ADMIN" && (
            <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-600">
              <AdminTaskActions
                taskId={task.id}
                taskStatus={task.status}
                currentName={task.name ?? null}
                currentShootReason={task.shootReason ?? "INHOUSE_SHOOT"}
              />
            </div>
          )}
        </div>

        {/* Balance: KPIs are the balance buckets; hint + status from same logic */}
        <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Balance
              </h2>
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${balanceSatisfied ? "bg-teal-100 text-teal-800 ring-teal-200 dark:bg-teal-900/40 dark:text-teal-200 dark:ring-teal-800" : "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800"}`}
              >
                {balanceHint}
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMessage.class}`}>
              {statusMessage.label}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Units by bucket; sum = total when balanced.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-600 dark:bg-zinc-800/50">
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{balance.requested}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total units</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-zinc-600 dark:text-zinc-300">{balance.pendingAction}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pending</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-teal-600 dark:text-teal-400">{balance.packed}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Packed</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{balance.inTransit}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">In transit</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{balance.received}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Received</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{balance.returnInTransit}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Return in transit</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{balance.returned}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Returned</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{balance.sold}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sold</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{balance.notFound}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Not found</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{balance.qcFail}</p>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">QC fail</p>
            </div>
          </div>
          {task.dispatchTime != null &&
            (task.dispatchPendingAction != null || task.dispatchPacked != null) && (
              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Locked at dispatch</p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Pending action <strong>{task.dispatchPendingAction ?? 0}</strong></span>
                  <span className="text-zinc-700 dark:text-zinc-300">Packed <strong>{task.dispatchPacked ?? 0}</strong></span>
                </div>
              </div>
            )}
        </div>

        {/* Serials */}
        <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Serials</h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {taskSerials.length} unit{taskSerials.length !== 1 ? "s" : ""} · Serial number ↔ SKU
                </p>
              </div>
              {task.status !== "CLOSED" ? (
                <Link
                  href={`/sessions/scan?taskId=${task.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-500 dark:bg-teal-500 dark:hover:bg-teal-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5z" clipRule="evenodd" />
                    <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4z" />
                  </svg>
                  Open scan
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Task closed
                </span>
              )}
            </div>
          </div>
          <div className="border-b border-zinc-100 px-4 py-2 dark:border-zinc-600">
            <SerialActions taskId={task.id} taskSerials={taskSerials} userRole={session.role} taskStatus={task.status} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-600 dark:bg-zinc-700/30">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Serial</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">SKU</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Return</th>
                  {(session.role === "ADMIN" || session.role === "OPS_USER") && (
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
                {taskSerials.map((ts: { taskId: string; serialId: string; status: string; sku?: string; returnable?: string; nonReturnReason?: string | null; orderId?: string | null; qcFailReason?: string | null }) => (
                  <tr
                    key={`${ts.taskId}-${ts.serialId}`}
                    className={`transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-700/30 ${(ts.status === "PACKED" || ts.status === "PICKED") ? "bg-teal-50/40 dark:bg-teal-900/10" : ""}`}
                  >
                    <td className="px-4 py-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">{ts.serialId}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{ts.sku ?? "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${getTaskSerialStatusClass(ts.status)}`}>
                          {ts.status}
                        </span>
                        {ts.status === "SOLD" && ts.orderId && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">Order: {ts.orderId}</span>
                        )}
                        {ts.status === "QC_FAIL" && ts.qcFailReason && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{ts.qcFailReason}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {ts.returnable === "0" ? (
                        <span className="group relative inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          Non-returnable
                          {ts.nonReturnReason && (
                            <span className="pointer-events-none absolute -top-8 left-0 z-10 hidden whitespace-nowrap rounded-lg bg-zinc-800 px-2 py-1 text-xs text-white group-hover:block dark:bg-zinc-700">
                              {ts.nonReturnReason}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
                          Returnable
                        </span>
                      )}
                    </td>
                    {(session.role === "ADMIN" || session.role === "OPS_USER") && (
                      <td className="px-4 py-2">
                        <SerialRowActions serial={ts} taskId={task.id} userRole={session.role} taskStatus={task.status} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disputes */}
        {disputes.length > 0 && (
          <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-600">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Disputes</h2>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{disputes.length} open or resolved</p>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-600">
              {disputes.map((d) => (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getDisputeStatusClass(d.status)}`}>
                      {d.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">{d.serialId}</p>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{d.description ?? d.disputeType}</p>
                    </div>
                  </div>
                  {d.status === "OPEN" && (session.role === "OPS_USER" || session.role === "ADMIN") && (
                    <>
                      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Verify the serial, update status above if needed, then resolve below.
                      </p>
                      <div className="mt-2">
                        <ResolveDisputeForm disputeId={d.id} />
                      </div>
                    </>
                  )}
                  {d.status === "RESOLVED" && (d.resolutionComment || d.resolutionPhotoUrl) && (
                    <div className="mt-2 rounded-lg bg-emerald-50 p-2 dark:bg-emerald-900/20">
                      {d.resolutionComment && (
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">{d.resolutionComment}</p>
                      )}
                      {d.resolutionPhotoUrl && (
                        <a href={d.resolutionPhotoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-teal-600 underline hover:text-indigo-500 dark:text-teal-400">
                          View resolution photo
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-72 lg:min-w-[18rem] lg:pl-5">
        <TaskCommentsTrigger taskId={task.id} initialComments={comments} currentUserId={session.id} />
        <TaskTimelineSidebar timeline={timeline} />
      </aside>
    </div>
  );
}
