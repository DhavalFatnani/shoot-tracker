import { eq, and, desc } from "drizzle-orm";
import type { SessionType, Location } from "@/lib/validations";
import type { Database, Tx } from "@/lib/db/client";
import { sessions, sessionItems } from "@/lib/db/schema";

export async function sessionById(db: Database | Tx, sessionId: string) {
  const rows = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  return rows[0] ?? null;
}

export function openSessionsByTaskId(db: Database | Tx, taskId: string) {
  return db.select().from(sessions).where(and(eq(sessions.taskId, taskId), eq(sessions.status, "OPEN")));
}

/** OPEN sessions for a task started by the given user (for force-exit cleanup). */
export function openSessionsByTaskIdAndStartedBy(db: Database | Tx, taskId: string, startedBy: string) {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.taskId, taskId), eq(sessions.status, "OPEN"), eq(sessions.startedBy, startedBy)));
}

export async function createSession(
  tx: Tx,
  row: {
    taskId: string;
    type: SessionType;
    fromLocation: Location;
    toLocation: Location;
    startedBy: string;
    returnId?: string | null;
  }
) {
  const [s] = await tx.insert(sessions).values(row).returning({ id: sessions.id });
  return s!.id;
}

export async function commitSession(tx: Tx, sessionId: string) {
  await tx
    .update(sessions)
    .set({ status: "COMMITTED", committedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function cancelSession(tx: Tx, sessionId: string) {
  await tx.update(sessions).set({ status: "CANCELLED" }).where(eq(sessions.id, sessionId));
}

export function openSessionIdsContainingSerial(db: Database | Tx, serialId: string) {
  return db
    .selectDistinct({ sessionId: sessions.id })
    .from(sessions)
    .innerJoin(sessionItems, eq(sessions.id, sessionItems.sessionId))
    .where(and(eq(sessions.status, "OPEN"), eq(sessionItems.serialId, serialId)));
}

/** OPEN sessions that contain this serial, with taskId, type, and startedBy (to allow cancelling stale sessions by same user). */
export function openSessionsContainingSerialWithOwner(db: Database | Tx, serialId: string) {
  return db
    .selectDistinct({
      sessionId: sessions.id,
      taskId: sessions.taskId,
      type: sessions.type,
      startedBy: sessions.startedBy,
    })
    .from(sessions)
    .innerJoin(sessionItems, eq(sessions.id, sessionItems.sessionId))
    .where(and(eq(sessions.status, "OPEN"), eq(sessionItems.serialId, serialId)));
}

/** Committed sessions for a task (for task timeline). */
export function committedSessionsByTaskId(db: Database | Tx, taskId: string) {
  return db
    .select({ id: sessions.id, type: sessions.type, committedAt: sessions.committedAt })
    .from(sessions)
    .where(and(eq(sessions.taskId, taskId), eq(sessions.status, "COMMITTED")))
    .orderBy(desc(sessions.committedAt));
}

/** Whether the task has at least one committed RETURN_VERIFY session (return verified). */
export async function taskHasReturnVerify(db: Database | Tx, taskId: string): Promise<boolean> {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(eq(sessions.taskId, taskId), eq(sessions.status, "COMMITTED"), eq(sessions.type, "RETURN_VERIFY"))
    )
    .limit(1);
  return rows.length > 0;
}
