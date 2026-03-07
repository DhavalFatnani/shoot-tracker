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

/** Count of task_serials (units) per task for the given task IDs. Returns taskId -> count. */
export async function countSerialsByTaskIds(db: Database | Tx, taskIds: string[]): Promise<Map<string, number>> {
  if (taskIds.length === 0) return new Map();
  const rows = await db
    .select({ taskId: taskSerials.taskId, count: sql<number>`count(*)::int` })
    .from(taskSerials)
    .where(inArray(taskSerials.taskId, taskIds))
    .groupBy(taskSerials.taskId);
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.taskId, r.count);
  }
  return map;
}

/** Task IDs (from the given list) that have at least one serial RECEIVED or RETURN_CREATED (for display: don't show "Pick in progress"). */
export async function taskIdsWithReceivedSerials(db: Database | Tx, taskIds: string[]): Promise<string[]> {
  if (taskIds.length === 0) return [];
  const rows = await db
    .selectDistinct({ taskId: taskSerials.taskId })
    .from(taskSerials)
    .where(and(inArray(taskSerials.taskId, taskIds), inArray(taskSerials.status, ["RECEIVED", "RETURN_CREATED"])));
  return rows.map((r) => r.taskId);
}

/** Serial IDs that are marked non-returnable for this task (for return-verify: highlight for OPS). */
export async function nonReturnableSerialIdsForTask(db: Database | Tx, taskId: string): Promise<string[]> {
  const rows = await db
    .select({ serialId: taskSerials.serialId })
    .from(taskSerials)
    .where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.returnable, "0")));
  return rows.map((r) => r.serialId);
}

/** Non-returnable serials with their reasons (for auto-dispute on return). */
export async function nonReturnableSerialsWithReason(
  db: Database | Tx,
  taskId: string,
  serialIds: string[]
): Promise<{ serialId: string; reason: string | null }[]> {
  if (serialIds.length === 0) return [];
  const rows = await db
    .select({ serialId: taskSerials.serialId, nonReturnReason: taskSerials.nonReturnReason })
    .from(taskSerials)
    .where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.returnable, "0"), inArray(taskSerials.serialId, serialIds)));
  return rows.map((r) => ({ serialId: r.serialId, reason: r.nonReturnReason }));
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
  const unique = [...new Set(serialIds)];
  await tx.insert(taskSerials).values(
    unique.map((serialId) => {
      const nonReturnReason = returnOverrides?.get(serialId);
      return {
        taskId,
        serialId,
        status,
        returnable: nonReturnReason ? "0" : "1",
        nonReturnReason: nonReturnReason ?? null,
      };
    })
  ).onConflictDoNothing();
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
  if (updates.length === 0) return;
  const byStatus = new Map<TaskSerialStatus, string[]>();
  for (const u of updates) {
    const list = byStatus.get(u.status) ?? [];
    list.push(u.serialId);
    byStatus.set(u.status, list);
  }
  for (const [status, serialIds] of byStatus) {
    await tx
      .update(taskSerials)
      .set({ status })
      .where(and(eq(taskSerials.taskId, taskId), inArray(taskSerials.serialId, serialIds)));
  }
}

export async function getTaskSerial(db: Database | Tx, taskId: string, serialId: string) {
  const rows = await db.select().from(taskSerials).where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.serialId, serialId))).limit(1);
  return rows[0] ?? null;
}

/** Task IDs that contain this serial (for timeline "Raise dispute" link). */
export async function getTaskIdsBySerialId(db: Database | Tx, serialId: string): Promise<{ taskId: string }[]> {
  return db.select({ taskId: taskSerials.taskId }).from(taskSerials).where(eq(taskSerials.serialId, serialId));
}
