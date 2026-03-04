import { eq, desc, or, inArray, and, ilike, sql } from "drizzle-orm";
import type { TaskStatus } from "@/lib/validations";
import type { Database, Tx } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";

export async function taskById(db: Database | Tx, taskId: string) {
  const rows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return rows[0] ?? null;
}

export function listTasks(
  db: Database | Tx,
  options: {
    shootTeamIds: string[];
    opsWarehouseIds: string[];
    isAdmin: boolean;
    status?: TaskStatus;
    limit: number;
    offset: number;
    q?: string;
  }
) {
  const { shootTeamIds, opsWarehouseIds, isAdmin, status, limit, offset, q } = options;
  const conditions: ReturnType<typeof eq>[] = [];
  if (!isAdmin) {
    if (shootTeamIds.length > 0 || opsWarehouseIds.length > 0) {
      const teamCond =
        shootTeamIds.length > 0 && opsWarehouseIds.length > 0
          ? or(inArray(tasks.shootTeamId, shootTeamIds), inArray(tasks.warehouseId, opsWarehouseIds))
          : shootTeamIds.length > 0
            ? inArray(tasks.shootTeamId, shootTeamIds)
            : inArray(tasks.warehouseId, opsWarehouseIds);
      conditions.push(teamCond!);
    } else {
      conditions.push(eq(tasks.id, "00000000-0000-0000-0000-000000000000"));
    }
  }
  if (status) {
    conditions.push(eq(tasks.status, status));
  }
  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(tasks.name, term),
        sql`${tasks.id} IN (SELECT task_id FROM task_serials WHERE serial_id ILIKE ${term})`
      )!
    );
  }
  const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
  return db.select().from(tasks).where(where).orderBy(desc(tasks.createdAt)).limit(limit).offset(offset);
}

export async function createTask(
  tx: Tx,
  row: { name?: string; shootReason?: string; shootTeamId: string; warehouseId: string; createdBy: string }
) {
  const shootReason = (row.shootReason ?? "INHOUSE_SHOOT") as "INHOUSE_SHOOT" | "AGENCY_SHOOT" | "INFLUENCER_FITS";
  const [task] = await tx
    .insert(tasks)
    .values({ ...row, shootReason, serial: sql`nextval('task_serial_seq')` })
    .returning({ id: tasks.id });
  return task!.id;
}

export async function closeTask(tx: Tx, taskId: string) {
  await tx.update(tasks).set({ status: "CLOSED", closedAt: new Date() }).where(eq(tasks.id, taskId));
}

export async function updateTaskStatus(tx: Tx, taskId: string, status: string) {
  await tx.update(tasks).set({ status: status as (typeof tasks.$inferSelect)["status"] }).where(eq(tasks.id, taskId));
}
