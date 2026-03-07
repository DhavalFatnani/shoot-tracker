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
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns</h1>
          <p className="page-subtitle mt-1">
            {returnsList.length === 0 && !hasNext
              ? "Returns created by shoot team. OPS verifies via Return verify scan per task."
              : `${returnsList.length} return${returnsList.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {canCreate && (
          <Link href="/returns/create" className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create return
          </Link>
        )}
      </div>

      <ReturnsTableWithSelection returns={returnsList} canCreate={canCreate} />

      {(page > 1 || hasNext) && (
        <nav className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700" aria-label="Pagination">
          <div>
            {page > 1 ? (
              <Link href={`/returns?page=${page - 1}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                ← Previous
              </Link>
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">Previous</span>
            )}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Page {page}</div>
          <div>
            {hasNext ? (
              <Link href={`/returns?page=${page + 1}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                Next →
              </Link>
            ) : (
              <span className="text-sm text-slate-400 dark:text-slate-500">Next</span>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
