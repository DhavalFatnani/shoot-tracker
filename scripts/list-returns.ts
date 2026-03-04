/**
 * List all returns with total serial (unit) counts.
 * Run: npx tsx scripts/list-returns.ts
 */
import "dotenv/config";
import { getDb } from "../src/lib/db/client";
import * as returnRepo from "../src/lib/repositories/return-repository";

async function main() {
  const db = getDb();
  const rows = await returnRepo.listReturns(db, { limit: 50, offset: 0 });
  console.log("Returns in DB:", rows.length);
  for (const r of rows) {
    const detail = await returnRepo.getReturnWithSessions(db, r.id);
    const total = detail?.totalSerials ?? 0;
    console.log(`  ${r.id.slice(0, 8)}... | created ${r.createdAt.toISOString()} | ${total} unit(s)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
