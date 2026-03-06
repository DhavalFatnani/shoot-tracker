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
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{result.error ?? "Return not found"}</p>
          <Link href="/returns" className="mt-3 inline-block text-sm text-red-600 hover:underline dark:text-red-400">Back to returns</Link>
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

  // Deduplicate by taskId: same task can have multiple RETURN_VERIFY sessions
  const tasksInReturn = (() => {
    const byTask = new Map<string, { taskId: string; taskSerial: number; taskName: string | null; serialCount: number }>();
    for (const s of data.sessions) {
      const existing = byTask.get(s.taskId);
      if (existing) {
        existing.serialCount += s.serialCount;
      } else {
        byTask.set(s.taskId, {
          taskId: s.taskId,
          taskSerial: s.taskSerial,
          taskName: s.taskName,
          serialCount: s.serialCount,
        });
      }
    }
    return Array.from(byTask.values());
  })();

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/returns", label: "Returns" }, { label: data.name ?? formatReturnSerial(data.serial) }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {data.name ?? formatReturnSerial(data.serial)}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formatReturnSerial(data.serial)}</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Created {createdDate}
            {createdByYou ? " · By you" : " · Shoot team"}
            {dispatchedDate ? ` · Dispatched ${dispatchedDate}` : " · Return created (at shoot)"}
            {closedDate ? ` · Closed ${closedDate}` : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {data.closedAt && (
            <span className="inline-flex rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/50 dark:text-teal-200">
              Closed
            </span>
          )}
          {data.dispatchedAt && !data.closedAt && (
            data.totalSerials > 0 && data.verifiedCount === data.totalSerials ? (
              <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                Verified
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
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
              href={`/sessions/scan?taskId=${tasksInReturn[0].taskId}&type=RETURN_VERIFY`}
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
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Units</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.totalSerials}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Serials in this return</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Verified</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {data.verifiedCount} <span className="text-lg font-normal text-zinc-500 dark:text-zinc-400">/ {data.totalSerials}</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {data.closedAt ? "All verified · Return closed" : data.verifiedCount === 0 ? "Return verify scan per task" : "Serials verified by OPS"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tasks</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{tasksInReturn.length}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Tasks in this return</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Created</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{createdDate}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{createdByYou ? "By you" : "Shoot team"}</p>
        </div>
      </div>

      {isOpsOrAdmin && nonReturnableSerials.length > 0 && (
        <NonReturnableAutoDownload nonReturnableSerials={nonReturnableSerials} returnLabel={returnLabel} />
      )}

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-600">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Serial numbers in this return</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {data.serials.length > 0
              ? `All ${data.serials.length} serial(s). After dispatch they move to transit.${nonReturnableSerials.length > 0 ? ` ${nonReturnableSerials.length} non-returnable — CSV auto-downloaded for OPS to share with shoot team.` : ""}`
              : "No serials recorded yet. Serials are added when the return scan session is committed."}
          </p>
        </div>
        {data.serials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">#</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Serial number</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">SKU</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Task</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Non-returnable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
                {data.serials.map((s, idx) => (
                  <tr
                    key={`${s.serialId}-${s.taskId}`}
                    className={`transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50 ${s.returnable === "0" ? "bg-amber-50/80 dark:bg-amber-900/20" : ""}`}
                  >
                    <td className="px-5 py-2.5 text-zinc-500 dark:text-zinc-400">{idx + 1}</td>
                    <td className="px-5 py-2.5 font-mono text-zinc-900 dark:text-zinc-100">{s.serialId}</td>
                    <td className="px-5 py-2.5 text-zinc-600 dark:text-zinc-300">{s.sku ?? "—"}</td>
                    <td className="px-5 py-2.5 text-zinc-600 dark:text-zinc-300">{s.taskName ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      {s.returnable === "0" ? (
                        <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-800 dark:text-amber-100" title="Check with shoot team">
                          Yes{s.nonReturnReason ? ` · ${s.nonReturnReason}` : ""}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No serial numbers in this return yet.</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="border-b border-zinc-200 px-5 py-3 dark:border-zinc-600">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tasks in this return</h2>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            OPS verifies each task via Return verify scan. Open a task to view serials, raise a dispute on a serial row, or start verification.
          </p>
        </div>
        {tasksInReturn.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No tasks in this return.</p>
            <Link href="/returns" className="mt-2 inline-block text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400">
              Back to returns
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
              <tr>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Task</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Units</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-600">
              {tasksInReturn.map((t) => (
                <tr key={t.taskId} className="transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-700/50">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/tasks/${t.taskId}`}
                      className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-indigo-300"
                    >
                      {t.taskName ?? `Task ${formatTaskSerial(t.taskSerial)}`}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{formatTaskSerial(t.taskSerial)}</p>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{t.serialCount}</td>
                  <td className="px-5 py-3.5 text-right">
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
                          href={`/sessions/scan?taskId=${t.taskId}&type=RETURN_VERIFY`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-100 px-3 py-2 text-sm font-medium text-teal-800 transition-colors hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-200 dark:hover:bg-teal-900/70"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                          </svg>
                          Return verify
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">OPS only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href="/returns"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
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
