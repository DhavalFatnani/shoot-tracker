import { eq, desc, and, inArray } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import type { EventType, Location } from "@/lib/validations";
import { events } from "@/lib/db/schema";

export interface InsertEventRow {
  serialId: string;
  eventType: EventType;
  fromLocation: Location;
  toLocation: Location;
  taskId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export async function insertEvents(tx: Tx, rows: InsertEventRow[]) {
  if (rows.length === 0) return;
  await tx.insert(events).values(
    rows.map((r) => ({
      serialId: r.serialId,
      eventType: r.eventType,
      fromLocation: r.fromLocation,
      toLocation: r.toLocation,
      taskId: r.taskId ?? null,
      sessionId: r.sessionId ?? null,
      metadata: r.metadata ?? null,
      createdBy: r.createdBy,
    }))
  );
}

export function getEventsBySerialId(db: Database | Tx, serialId: string, limit: number = 100) {
  return db.select().from(events).where(eq(events.serialId, serialId)).orderBy(desc(events.createdAt)).limit(limit);
}

export function getEventsByTaskId(db: Database | Tx, taskId: string, limit: number = 100) {
  return db
    .select()
    .from(events)
    .where(eq(events.taskId, taskId))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

/** Recent events for given task IDs (for activity log). Returns empty if taskIds is empty. */
export async function listRecentEvents(
  db: Database | Tx,
  options: { taskIds: string[]; limit: number; offset: number }
) {
  const { taskIds, limit, offset } = options;
  if (taskIds.length === 0) return [];
  return db
    .select()
    .from(events)
    .where(inArray(events.taskId, taskIds))
    .orderBy(desc(events.createdAt))
    .limit(limit)
    .offset(offset);
}
