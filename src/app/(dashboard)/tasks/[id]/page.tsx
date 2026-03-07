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
import { formatDateIST } from "@/lib/format-date";
import { TaskTimelineSidebar } from "./task-timeline-sidebar";
import { TaskDetailCsvDownload } from "./task-detail-csv-download";

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
        <Link href="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition duration-200 hover:text-indigo-700 dark:text-indigo-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Tasks
        </Link>
        <div className="card border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
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

  const hasReturnableItems = balance.received > 0 || balance.returned > 0 || balance.returnInTransit > 0;
  const returnVerified = timeline.some((e) => e.type === "return-verify");
  const readyToClose = balanceSatisfied && (!hasReturnableItems || returnVerified);

  const statusMessage = readyToClose
    ? { label: "Ready to close", class: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200" }
    : balance.returnInTransit > 0
      ? { label: "Return on the way", class: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200" }
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

  const hasReceived = balance.received > 0 || timeline.some((e) => e.type === "receipt");
  const displayStatus = task.status === "PICKING" && hasReceived ? "RECEIVING" : task.status;
  const serialsScanned = taskSerials.filter((ts) => ["RECEIVED", "SOLD", "PACKED", "PICKED", "DISPATCHED", "IN_TRANSIT", "NOT_FOUND", "QC_FAIL", "RETURNED", "BUFFERED", "RETURN_IN_TRANSIT", "RETURN_CREATED"].includes(ts.status)).length;
  const serialsPending = taskSerials.length - serialsScanned;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
      <main className="min-w-0 flex-1 space-y-5">
        {/* Breadcrumbs: TASKS > TSK-xxxx */}
        <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/tasks", label: "Tasks" }, { label: `TSK-${task.serial}` }]} />

        {/* Task header: icon + title + status pill + subtitle */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Task #{formatTaskSerial(task.serial)}
                </h1>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getTaskStatusClass(displayStatus)}`}>
                  {getTaskStatusDisplayLabel(task.status, timeline.some((e) => e.type === "return-verify"), hasReceived)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {task.name ?? shootReasonLabel ?? "Inventory movement session"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <TaskDetailCsvDownload taskId={task.id} taskLabel={taskLabel} />
            {(session.role === "ADMIN" || session.role === "SHOOT_USER") && balance.received > 0 && task.status !== "CLOSED" && (
              <Link
                href={`/returns/create?taskId=${task.id}`}
                className="btn btn-secondary"
              >
                Create return
              </Link>
            )}
            {task.status === "IN_TRANSIT" && (session.role === "ADMIN" || session.role === "SHOOT_USER") && (
              <MarkReceivedButton taskId={task.id} />
            )}
            {(session.role === "ADMIN" || session.role === "OPS_USER") && task.status !== "CLOSED" && (
              <CloseTaskButton taskId={task.id} disabled={!readyToClose || disputes.some((d) => d.status === "OPEN")} />
            )}
          </div>
        </div>

        {/* Info cards: Request date, Type, Status, Assignee */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Request date</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatDateIST(task.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{shootReasonLabel ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</p>
            <span className={`mt-0.5 inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${statusMessage.class}`}>{statusMessage.label}</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Assignee</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 dark:bg-slate-600 dark:text-slate-400">UN</span>
              <span className="text-sm font-medium italic text-slate-500 dark:text-slate-400">Unassigned</span>
            </div>
          </div>
        </div>

        {session.role === "ADMIN" && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <AdminTaskActions
              taskId={task.id}
              taskStatus={task.status}
              currentName={task.name ?? null}
              currentShootReason={task.shootReason ?? "INHOUSE_SHOOT"}
            />
          </div>
        )}

        {/* Balance: KPIs are the balance buckets; hint + status from same logic */}
        <div className="section-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Balance
              </h2>
              <span
                className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${readyToClose ? "bg-indigo-100 text-indigo-800 ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:ring-indigo-800" : "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800"}`}
              >
                {balanceHint}
              </span>
            </div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusMessage.class}`}>
              {statusMessage.label}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Units by bucket; sum = total when balanced.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{balance.requested}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total units</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-slate-600 dark:text-slate-300">{balance.pendingAction}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{balance.packed}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Packed</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{balance.inTransit}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">In transit</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{balance.received}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Received</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{balance.returnInTransit}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Return in transit</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{balance.returned}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Returned</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{balance.sold}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Sold</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{balance.notFound}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Not found</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{balance.qcFail}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">QC fail</p>
            </div>
          </div>
          {task.dispatchTime != null &&
            (task.dispatchPendingAction != null || task.dispatchPacked != null) && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Locked at dispatch</p>
                <div className="mt-1.5 flex flex-wrap gap-3 text-sm">
                  <span className="text-slate-700 dark:text-slate-300">Pending action <strong>{task.dispatchPendingAction ?? 0}</strong></span>
                  <span className="text-slate-700 dark:text-slate-300">Packed <strong>{task.dispatchPacked ?? 0}</strong></span>
                </div>
              </div>
            )}
        </div>

        {/* Serials & Inventory */}
        <div className="section-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">Serials &amp; Inventory</h2>
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Displaying {taskSerials.length}/{taskSerials.length} items
              </p>
              {task.status !== "CLOSED" ? (
                <Link
                  href={`/sessions/scan?taskId=${task.id}`}
                  className="btn btn-primary"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5z" clipRule="evenodd" />
                    <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4z" />
                  </svg>
                  Open scan
                </Link>
              ) : (
                <span className="btn btn-secondary cursor-default opacity-70">Task closed</span>
              )}
            </div>
          </div>
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-700">
            <SerialActions taskId={task.id} taskSerials={taskSerials} userRole={session.role} taskStatus={task.status} />
          </div>
          <div className="table-wrapper rounded-none border-0">
            <table className="table table-sticky table-row-hover w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="table-th">SERIAL NUMBER</th>
                  <th className="table-th">MODEL / DESCRIPTION</th>
                  <th className="table-th">STATUS</th>
                  <th className="table-th">RETURN</th>
                  {(session.role === "ADMIN" || session.role === "OPS_USER") && (
                    <th className="table-th text-right">ACTIONS</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {taskSerials.map((ts: { taskId: string; serialId: string; status: string; sku?: string; returnable?: string; nonReturnReason?: string | null; orderId?: string | null; qcFailReason?: string | null }) => (
                  <tr
                    key={`${ts.taskId}-${ts.serialId}`}
                    className={(ts.status === "PACKED" || ts.status === "PICKED") ? "bg-indigo-50/40 dark:bg-indigo-900/10" : ""}
                  >
                    <td className="table-td">
                      <Link href={`/serials/timeline?serial=${encodeURIComponent(ts.serialId)}`} className="font-mono text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                        #{ts.serialId}
                      </Link>
                    </td>
                    <td className="table-td">{ts.sku ?? "—"}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${["RECEIVED", "SOLD"].includes(ts.status) ? "bg-emerald-500" : ["REQUESTED", "PICKED", "PACKED"].includes(ts.status) ? "bg-amber-500" : "bg-indigo-500"}`} aria-hidden />
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getTaskSerialStatusClass(ts.status)}`}>
                          {ts.status}
                        </span>
                      </div>
                      {ts.status === "SOLD" && ts.orderId && (
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Order: {ts.orderId}</span>
                      )}
                      {ts.status === "QC_FAIL" && ts.qcFailReason && (
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{ts.qcFailReason}</span>
                      )}
                    </td>
                    <td className="table-td">
                      {ts.returnable === "0" ? (
                        <span className="group relative inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                          Non-returnable
                          {ts.nonReturnReason && (
                            <span className="pointer-events-none absolute -top-8 left-0 z-10 hidden whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-xs text-white group-hover:block dark:bg-slate-700">
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
                      <td className="table-td text-right">
                        <SerialRowActions serial={ts} taskId={task.id} userRole={session.role} taskStatus={task.status} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/30">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Total items: {taskSerials.length} &middot; Scanned: {serialsScanned} &middot; Pending: {serialsPending}
            </p>
          </div>
        </div>

        {/* Disputes */}
        {disputes.length > 0 && (
          <div className="section-card">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-600">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Disputes</h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{disputes.length} open or resolved</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-600">
              {disputes.map((d) => (
                <div key={d.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${getDisputeStatusClass(d.status)}`}>
                      {d.status}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-medium text-slate-900 dark:text-slate-100">{d.serialId}</p>
                      <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{d.description ?? d.disputeType}</p>
                    </div>
                  </div>
                  {d.status === "OPEN" && (session.role === "OPS_USER" || session.role === "ADMIN") && (
                    <>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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
                        <a href={d.resolutionPhotoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-medium text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400">
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
        <TaskCommentsTrigger taskId={task.id} initialComments={comments} currentUserId={session.id} currentUserDisplayName={[session.firstName, session.lastName].filter(Boolean).join(" ") || null} />
        <TaskTimelineSidebar timeline={timeline} />
      </aside>
    </div>
  );
}
