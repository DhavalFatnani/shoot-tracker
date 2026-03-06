import { getSession } from "@/lib/auth/get-session";
import Link from "next/link";
import { listReturns } from "@/app/actions/return-actions";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ReturnsTableWithSelection } from "./returns-table-with-selection";

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
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <ReturnsTableWithSelection returns={returnsList} canCreate={canCreate} />

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
