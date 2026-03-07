import { getSession } from "@/lib/auth/get-session";
import { listTasks } from "@/app/actions/task-actions";
import { listDisputesForTaskIds } from "@/app/actions/dispute-actions";
import { DisputesTable } from "./disputes-table";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default async function DisputesPage() {
  const session = await getSession();
  if (!session) return null;

  const formData = new FormData();
  const tasksResult = await listTasks(formData);
  const data = tasksResult.success && tasksResult.data ? tasksResult.data : null;
  const tasks = data?.tasks ?? [];
  const taskIds = tasks.map((t) => t.id);
  const disputesResult =
    taskIds.length > 0
      ? await listDisputesForTaskIds((() => {
          const fd = new FormData();
          fd.set("taskIds", JSON.stringify(taskIds));
          return fd;
        })())
      : { success: true as const, data: [] as Awaited<ReturnType<typeof listDisputesForTaskIds>>["data"] };
  const allDisputes = disputesResult.success && disputesResult.data ? disputesResult.data : [];

  const canResolve = session.role === "OPS_USER" || session.role === "ADMIN";
  const canRaise = session.role === "OPS_USER" || session.role === "ADMIN";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ href: "/dashboard", label: "Dashboard" }, { label: "Disputes" }]} />
      <div>
        <h1 className="page-title">Disputes</h1>
        <p className="page-subtitle mt-1">
          Manage and resolve inventory discrepancies and shipping conflicts.
        </p>
      </div>

      <DisputesTable
        disputes={allDisputes}
        tasks={tasks.map((t) => ({ id: t.id, serial: t.serial }))}
        canResolve={canResolve}
        canRaise={canRaise}
      />
    </div>
  );
}
