/**
 * Backfill the returns table from committed RETURN_SCAN sessions that have no return_id
 * (e.g. created before migration 0014).
 *
 * Groups sessions by same user + same commit minute, creates one return per group,
 * and links those sessions to the new return.
 *
 * Run: npx tsx scripts/backfill-returns.ts
 * Dry run (no writes): npx tsx scripts/backfill-returns.ts --dry-run
 */
import "dotenv/config";
import { eq, and, isNull } from "drizzle-orm";
import { getDb } from "../src/lib/db/client";
import { sessions, returns, sessionItems } from "../src/lib/db/schema";

const DRY_RUN = process.argv.includes("--dry-run");

function roundToMinute(ms: number): number {
  return Math.floor(ms / 60_000) * 60_000;
}

async function main() {
  const db = getDb();

  const orphanSessions = await db
    .select({
      id: sessions.id,
      taskId: sessions.taskId,
      startedBy: sessions.startedBy,
      startedAt: sessions.startedAt,
      committedAt: sessions.committedAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.type, "RETURN_SCAN"),
        eq(sessions.status, "COMMITTED"),
        isNull(sessions.returnId)
      )
    )
    .orderBy(sessions.committedAt);

  if (orphanSessions.length === 0) {
    console.log("No RETURN_SCAN sessions with return_id NULL found. Nothing to backfill.");
    return;
  }

  // Group by (startedBy, committedAt rounded to minute)
  const groups = new Map<string, typeof orphanSessions>();
  for (const s of orphanSessions) {
    const committedMs = s.committedAt ? new Date(s.committedAt).getTime() : 0;
    const key = `${s.startedBy}@${roundToMinute(committedMs)}`;
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  console.log(`Found ${orphanSessions.length} orphan RETURN_SCAN session(s) in ${groups.size} group(s).`);

  for (const [, groupSessions] of groups) {
    const startedBy = groupSessions[0].startedBy;
    const minStartedAt = groupSessions.reduce(
      (min, s) => (s.startedAt < min ? s.startedAt : min),
      groupSessions[0].startedAt
    );

    // Count items per session for logging
    let totalUnits = 0;
    for (const s of groupSessions) {
      const items = await db
        .select({ sessionId: sessionItems.sessionId })
        .from(sessionItems)
        .where(eq(sessionItems.sessionId, s.id));
      totalUnits += items.length;
    }

    console.log(
      `  Group: ${groupSessions.length} session(s), ${totalUnits} unit(s), startedBy ${startedBy.slice(0, 8)}..., minStartedAt ${minStartedAt.toISOString()}`
    );

    if (DRY_RUN) {
      console.log("  [dry-run] Would create 1 return and link session ids:", groupSessions.map((s) => s.id.slice(0, 8) + "...").join(", "));
      continue;
    }

    await db.transaction(async (tx) => {
      const [returnRow] = await tx
        .insert(returns)
        .values({
          createdBy: startedBy,
          createdAt: minStartedAt,
        })
        .returning({ id: returns.id });
      const returnId = returnRow!.id;

      for (const s of groupSessions) {
        await tx.update(sessions).set({ returnId }).where(eq(sessions.id, s.id));
      }
      console.log(`  Created return ${returnId.slice(0, 8)}... and linked ${groupSessions.length} session(s).`);
    });
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
