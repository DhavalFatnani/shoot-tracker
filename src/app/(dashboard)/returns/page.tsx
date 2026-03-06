import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { LinkWithStopPropagation } from "@/components/ui/link-with-stop-propagation";
import { listReturns } from "@/app/actions/return-actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReturnsEmptyState } from "@/components/empty-state";
import { formatReturnSerial } from "@/lib/format-serials";
import { formatDateTimeIST } from "@/lib/format-date";

const PAGE_SIZE = 20;

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const formData = new FormData();
  formData.set("limit", String(PAGE_SIZE + 1));
  formData.set("offset", String(offset));

  const result = await listReturns(formData);
  const rawRows = result.success && result.data ? result.data : [];
  const hasNext = rawRows.length > PAGE_SIZE;
  const returnsList = rawRows.slice(0, PAGE_SIZE);
  const canCreate = session.role === "SHOOT_USER" || session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Returns" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Returns</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {returnsList.length === 0 && !hasNext
              ? "Returns created by shoot team. OPS verifies via Return verify scan per task."
              : `${returnsList.length} return${returnsList.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {canCreate && (
          <Link
            href="/returns/create"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-950"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create return
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/75 dark:border-zinc-600 dark:bg-zinc-700/50">
            <tr>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Return</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Name</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Status</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Units</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Tasks</th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Created</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-600">
            {returnsList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8">
                  <ReturnsEmptyState canCreate={canCreate} />
                </td>
              </tr>
            )}
            {returnsList.map((r) => {
              const allVerified = r.totalSerials > 0 && r.verifiedCount === r.totalSerials;
              const status = r.closedAt
                ? "Closed"
                : allVerified
                  ? "Verified"
                  : r.dispatchedAt
                    ? "In transit"
                    : "Return created";
              const statusClass = r.closedAt
                ? "bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200"
                : allVerified
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                  : r.dispatchedAt
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                    : "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200";
              return (
              <ClickableTableRow key={r.id} href={`/returns/${r.id}`}>
                <td className="px-5 py-3.5">
                  <span className="text-zinc-900 dark:text-zinc-100">{formatReturnSerial(r.serial)}</span>
                </td>
                <td className="px-5 py-3.5 text-zinc-700 dark:text-zinc-300">
                  {r.name ?? formatReturnSerial(r.serial)}
                </td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                    {status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{r.totalSerials}</td>
                <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-300">{r.taskCount}</td>
                <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">
                  {formatDateTimeIST(r.createdAt)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <LinkWithStopPropagation
                    href={`/returns/${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 transition duration-200 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    View
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </LinkWithStopPropagation>
                </td>
              </ClickableTableRow>
            );
            })}
          </tbody>
        </table>
      </div>

      {(page > 1 || hasNext) && (
        <nav className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-700" aria-label="Pagination">
          <div>
            {page > 1 ? (
              <Link href={`/returns?page=${page - 1}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                ← Previous
              </Link>
            ) : (
              <span className="text-sm text-zinc-400 dark:text-zinc-500">Previous</span>
            )}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">Page {page}</div>
          <div>
            {hasNext ? (
              <Link href={`/returns?page=${page + 1}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
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
