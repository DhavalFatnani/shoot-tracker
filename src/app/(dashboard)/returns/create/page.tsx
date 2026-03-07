import { getSession } from "@/lib/auth/get-session";
import { getShootTeamInventory } from "@/lib/services/return-service";
import { CreateReturnUI } from "./create-return-ui";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function CreateReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ taskId?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { taskId } = await searchParams;

  if (session.role === "OPS_USER") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">Access restricted</h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Only shoot team members and admins can create returns. OPS users perform return verification from the task detail page.
          </p>
        </div>
      </div>
    );
  }

  let inventory: Awaited<ReturnType<typeof getShootTeamInventory>> = [];
  let fetchError: string | null = null;
  try {
    inventory = await getShootTeamInventory(session.role, session.shootTeamIds, taskId ?? null);
  } catch (e) {
    fetchError = e instanceof Error ? e.message : "Failed to load inventory";
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { href: "/returns", label: "Returns" }, { label: "Create return" }]} />
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">Create Return</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {taskId
            ? "Serials received for this task. Scan items to return to the warehouse."
            : "View serials currently with the shoot team and scan items to return to the warehouse."}
        </p>
      </div>

      {fetchError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{fetchError}</p>
        </div>
      ) : (
        <CreateReturnUI initialInventory={inventory} taskId={taskId ?? null} />
      )}
    </div>
  );
}
