import { eq, and, inArray, sql, desc } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { disputes } from "@/lib/db/schema";

export async function disputeById(db: Database | Tx, disputeId: string) {
  const rows = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
  return rows[0] ?? null;
}

export function disputesByTaskId(db: Database | Tx, taskId: string) {
  return db.select().from(disputes).where(eq(disputes.taskId, taskId));
}

/** All disputes for the given task IDs (single query for disputes page). */
export function disputesByTaskIds(db: Database | Tx, taskIds: string[]) {
  if (taskIds.length === 0) return Promise.resolve([]);
  return db.select().from(disputes).where(inArray(disputes.taskId, taskIds));
}

/** Recent disputes across given task IDs, ordered by createdAt desc (for dashboard activity). */
export async function listRecentDisputes(
  db: Database | Tx,
  options: { taskIds: string[]; limit: number }
) {
  const { taskIds, limit } = options;
  if (taskIds.length === 0) return [];
  return db
    .select()
    .from(disputes)
    .where(inArray(disputes.taskId, taskIds))
    .orderBy(desc(disputes.createdAt))
    .limit(limit);
}

export function openDisputesByTaskId(db: Database | Tx, taskId: string) {
  return db.select().from(disputes).where(and(eq(disputes.taskId, taskId), eq(disputes.status, "OPEN")));
}

export async function countOpenDisputesForTaskIds(db: Database | Tx, taskIds: string[]): Promise<number> {
  if (taskIds.length === 0) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(disputes)
    .where(and(inArray(disputes.taskId, taskIds), eq(disputes.status, "OPEN")));
  return rows[0]?.count ?? 0;
}

export async function createDispute(
  tx: Tx,
  row: { taskId: string; serialId: string; disputeType: string; description?: string; raisedBy?: string }
) {
  const [d] = await tx.insert(disputes).values({ ...row, status: "OPEN" }).returning({ id: disputes.id });
  return d!.id;
}

export async function resolveDispute(
  tx: Tx,
  disputeId: string,
  fields?: { resolutionComment?: string; resolutionPhotoUrl?: string; resolvedBy?: string }
) {
  await tx
    .update(disputes)
    .set({
      status: "RESOLVED",
      resolvedAt: new Date(),
      ...(fields?.resolutionComment ? { resolutionComment: fields.resolutionComment } : {}),
      ...(fields?.resolutionPhotoUrl ? { resolutionPhotoUrl: fields.resolutionPhotoUrl } : {}),
      ...(fields?.resolvedBy ? { resolvedBy: fields.resolvedBy } : {}),
    })
    .where(eq(disputes.id, disputeId));
}
