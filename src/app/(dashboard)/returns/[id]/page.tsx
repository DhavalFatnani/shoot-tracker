import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { getReturn } from "@/app/actions/return-actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatTaskSerial, formatReturnSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";
import { ReturnDispatchButton } from "./return-dispatch-button";
import { NonReturnableAutoDownload } from "./non-returnable-auto-download";
import { ReturnDetailCsvDownload } from "./return-detail-csv-download";

export default async function ReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return null;

  const { id } = await params;
  const result = await getReturn(id);

  if (!result.success || !result.data) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/returns", label: "Returns" }, { label: "Return" }]} />
        <div className="card border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{result.error ?? "Return not found"}</p>
          <Link href="/returns" className="mt-3 inline-block text-sm font-semibold text-red-600 hover:underline dark:text-red-400">Back to returns</Link>
        </div>
      </div>
    );
  }

  const data = result.data;
  const createdDate = formatDateTimeIST(data.createdAt);
  const dispatchedDate = data.dispatchedAt ? formatDateTimeIST(data.dispatchedAt) : null;
  const closedDate = data.closedAt ? formatDateTimeIST(data.closedAt) : null;
  const isOpsOrAdmin = session.role === "OPS_USER" || session.role === "ADMIN";
  const isShootOrAdmin = session.role === "SHOOT_USER" || session.role === "ADMIN";
  const createdByYou = data.createdBy === session.id;
  const isTeamReturn = data.involvedShootTeamIds.some((tid) => session.shootTeamIds.includes(tid));
  const canDispatch =
    isShootOrAdmin && !data.dispatchedAt && (session.role === "ADMIN" || createdByYou || isTeamReturn);
  const nonReturnableSerials = data.serials.filter((s) => s.returnable === "0");
  const returnLabel = data.name ?? formatReturnSerial(data.serial);

  // One row per task; serial count = unique serials for that task (not scan + verify summed)
  const tasksInReturn = (() => {
    const byTask = new Map<string, { taskId: string; taskSerial: number; taskName: string | null; serialCount: number }>();
    for (const s of data.sessions) {
      if (byTask.has(s.taskId)) continue;
      const uniqueCount = data.uniqueSerialCountByTaskId[s.taskId] ?? 0;
      byTask.set(s.taskId, {
        taskId: s.taskId,
        taskSerial: s.taskSerial,
        taskName: s.taskName,
        serialCount: uniqueCount,
      });
    }
    return Array.from(byTask.values());
  })();

  return (
    <div className="page-container space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/returns", label: "Returns" }, { label: data.name ?? formatReturnSerial(data.serial) }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="page-header">
          <h1 className="page-title">
            {data.name ?? formatReturnSerial(data.serial)}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatReturnSerial(data.serial)}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Created {createdDate}
            {createdByYou ? " · By you" : data.createdByName ? ` · By ${data.createdByName}` : " · Shoot team"}
            {dispatchedDate ? ` · Dispatched ${dispatchedDate}` : " · Return created (at shoot)"}
            {closedDate ? ` · Closed ${closedDate}` : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.closedAt && (
            <span className="badge bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
              Closed
            </span>
          )}
          {data.dispatchedAt && !data.closedAt && (
            data.totalSerials > 0 && data.verifiedCount === data.totalSerials ? (
              <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                Verified
              </span>
            ) : (
              <span className="badge bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                In transit
              </span>
            )
          )}
          <ReturnDetailCsvDownload
            returnLabel={returnLabel}
            serial={data.serial}
            name={data.name}
            totalSerials={data.totalSerials}
            taskCount={tasksInReturn.length}
            verifiedCount={data.verifiedCount}
            createdAt={data.createdAt}
            dispatchedAt={data.dispatchedAt}
            closedAt={data.closedAt}
          />
          {canDispatch && <ReturnDispatchButton returnId={data.id} />}
          {isOpsOrAdmin && !data.closedAt && tasksInReturn.length > 0 && (
            <Link
              href={`/sessions/scan?taskId=${tasksInReturn[0].taskId}&type=RETURN_VERIFY&autoStart=1`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Return verify scan
            </Link>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Units</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{data.totalSerials}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Serials in this return</p>
        </div>
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Verified</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data.verifiedCount} <span className="text-lg font-normal text-slate-500 dark:text-slate-400">/ {data.totalSerials}</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {data.closedAt ? "All verified · Return closed" : data.verifiedCount === 0 ? "Return verify scan per task" : "Serials verified by OPS"}
          </p>
        </div>
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tasks</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{tasksInReturn.length}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Tasks in this return</p>
        </div>
        <div className="section-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{createdDate}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{createdByYou ? "By you" : "Shoot team"}</p>
        </div>
      </div>

      {isOpsOrAdmin && nonReturnableSerials.length > 0 && (
        <NonReturnableAutoDownload nonReturnableSerials={nonReturnableSerials} returnLabel={returnLabel} />
      )}

      <div className="section-card">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Serial numbers in this return</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {data.serials.length > 0
              ? `All ${data.serials.length} serial(s). After dispatch they move to transit.${nonReturnableSerials.length > 0 ? ` ${nonReturnableSerials.length} non-returnable — CSV auto-downloaded for OPS to share with shoot team.` : ""}`
              : "No serials recorded yet. Serials are added when the return scan session is committed."}
          </p>
        </div>
        {data.serials.length > 0 ? (
          <div className="table-wrapper">
            <table className="table table-sticky table-row-hover w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Serial number</th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Task</th>
                  <th className="table-th">Non-returnable</th>
                </tr>
              </thead>
              <tbody>
                {data.serials.map((s, idx) => (
                  <tr
                    key={s.serialId}
                    className={s.returnable === "0" ? "bg-amber-50/80 dark:bg-amber-900/20" : ""}
                  >
                    <td className="table-td">{idx + 1}</td>
                    <td className="table-td font-mono font-medium text-slate-900 dark:text-slate-100">{s.serialId}</td>
                    <td className="table-td">{s.sku ?? "—"}</td>
                    <td className="table-td">{s.taskName ?? "—"}</td>
                    <td className="table-td">
                      {s.returnable === "0" ? (
                        <span className="badge bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100" title="Check with shoot team">
                          Yes{s.nonReturnReason ? ` · ${s.nonReturnReason}` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No serial numbers in this return yet.</p>
          </div>
        )}
      </div>

      {/* Scan sessions: who scanned, when, what type */}
      {data.sessions.length > 0 && (
        <div className="section-card">
          <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Scan sessions</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Who scanned, session type, and when it was committed.
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.sessions.map((s) => (
              <div key={s.sessionId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    {(s.startedByName ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {s.startedByName ?? "Unknown user"}
                  </span>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  s.sessionType === "RETURN_SCAN"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    : s.sessionType === "RETURN_VERIFY"
                      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                }`}>
                  {s.sessionType === "RETURN_SCAN" ? "Return scan" : s.sessionType === "RETURN_VERIFY" ? "Return verify" : s.sessionType}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {s.taskName ?? formatTaskSerial(s.taskSerial)}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {s.serialCount} serial{s.serialCount !== 1 ? "s" : ""}
                </span>
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                  {s.committedAt ? formatDateTimeIST(s.committedAt) : formatDateTimeIST(s.startedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tasks in this return</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            OPS verifies each task via Return verify scan. Open a task to view serials, raise a dispute on a serial row, or start verification.
          </p>
        </div>
        {tasksInReturn.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No tasks in this return.</p>
            <Link href="/returns" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Back to returns
            </Link>
          </div>
        ) : (
          <div className="table-wrapper">
          <table className="table table-sticky table-row-hover w-full text-left text-sm">
            <thead>
              <tr>
                <th className="table-th">Task</th>
                <th className="table-th">Units</th>
                <th className="table-th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {tasksInReturn.map((t) => (
                <tr key={t.taskId}>
                  <td className="table-td">
                    <Link
                      href={`/tasks/${t.taskId}`}
                      className="font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      {t.taskName ?? `Task ${formatTaskSerial(t.taskSerial)}`}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatTaskSerial(t.taskSerial)}</p>
                  </td>
                  <td className="table-td">{t.serialCount}</td>
                  <td className="table-td text-right">
                    {isOpsOrAdmin ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/tasks/${t.taskId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:hover:bg-amber-900/70"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                          Raise dispute
                        </Link>
                        <Link
                          href={`/sessions/scan?taskId=${t.taskId}&type=RETURN_VERIFY&autoStart=1`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-2 text-sm font-medium text-indigo-800 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:hover:bg-indigo-900/70"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                          Return verify
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">OPS only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div className="form-actions flex gap-3">
        <Link
          href="/returns"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          Back to returns
        </Link>
      </div>
    </div>
  );
}
