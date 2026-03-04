import { eq, and, inArray, sql } from "drizzle-orm";
import type { TaskSerialStatus } from "@/lib/validations";
import type { Database, Tx } from "@/lib/db/client";
import { taskSerials } from "@/lib/db/schema";

export function taskSerialsByTaskId(db: Database | Tx, taskId: string) {
  return db.select().from(taskSerials).where(eq(taskSerials.taskId, taskId));
}

/** Count task_serials with status REQUESTED for the given task IDs (for pending-action KPI). */
export async function countRequestedSerialsForTaskIds(db: Database | Tx, taskIds: string[]): Promise<number> {
  if (taskIds.length === 0) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(taskSerials)
    .where(and(inArray(taskSerials.taskId, taskIds), eq(taskSerials.status, "REQUESTED")));
  return rows[0]?.count ?? 0;
}

export async function taskSerialCountsByStatus(db: Database | Tx, taskId: string): Promise<Map<TaskSerialStatus, number>> {
  const rows = await db
    .select({ status: taskSerials.status, count: sql<number>`count(*)::int` })
    .from(taskSerials)
    .where(eq(taskSerials.taskId, taskId))
    .groupBy(taskSerials.status);
  const map = new Map<TaskSerialStatus, number>();
  for (const r of rows) {
    map.set(r.status as TaskSerialStatus, r.count);
  }
  return map;
}

export async function insertTaskSerials(
  tx: Tx,
  taskId: string,
  serialIds: string[],
  status: TaskSerialStatus = "REQUESTED",
  returnOverrides?: Map<string, string>
) {
  if (serialIds.length === 0) return;
  await tx.insert(taskSerials).values(
    serialIds.map((serialId) => {
      const nonReturnReason = returnOverrides?.get(serialId);
      return {
        taskId,
        serialId,
        status,
        returnable: nonReturnReason ? "0" : "1",
        nonReturnReason: nonReturnReason ?? null,
      };
    })
  );
}

export async function updateTaskSerialStatus(
  tx: Tx,
  taskId: string,
  serialId: string,
  status: TaskSerialStatus
) {
  await tx
    .update(taskSerials)
    .set({ status })
    .where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.serialId, serialId)));
}

export async function updateTaskSerialStatuses(
  tx: Tx,
  taskId: string,
  updates: { serialId: string; status: TaskSerialStatus }[]
) {
  for (const u of updates) {
    await updateTaskSerialStatus(tx, taskId, u.serialId, u.status);
  }
}

export async function getTaskSerial(db: Database | Tx, taskId: string, serialId: string) {
  const rows = await db.select().from(taskSerials).where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.serialId, serialId))).limit(1);
  return rows[0] ?? null;
}
