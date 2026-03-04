import { eq, and } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { sessionItems } from "@/lib/db/schema";

export function sessionItemsBySessionId(db: Database | Tx, sessionId: string) {
  return db.select().from(sessionItems).where(eq(sessionItems.sessionId, sessionId));
}

export async function getSessionItem(db: Database | Tx, sessionId: string, serialId: string) {
  const rows = await db.select().from(sessionItems).where(and(eq(sessionItems.sessionId, sessionId), eq(sessionItems.serialId, serialId))).limit(1);
  return rows[0] ?? null;
}

export async function insertSessionItem(
  tx: Tx,
  row: { sessionId: string; serialId: string; scanStatus: string; errorReason?: string }
) {
  await tx.insert(sessionItems).values({
    sessionId: row.sessionId,
    serialId: row.serialId,
    scanStatus: row.scanStatus,
    errorReason: row.errorReason ?? null,
  });
}
