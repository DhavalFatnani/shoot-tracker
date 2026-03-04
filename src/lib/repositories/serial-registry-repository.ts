import { eq, inArray } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { serialRegistry } from "@/lib/db/schema";

export async function serialRegistryById(db: Database | Tx, serialId: string) {
  const rows = await db.select().from(serialRegistry).where(eq(serialRegistry.serialId, serialId)).limit(1);
  return rows[0] ?? null;
}

export function serialRegistryByIds(db: Database | Tx, serialIds: string[]) {
  if (serialIds.length === 0) return Promise.resolve([]);
  return db.select().from(serialRegistry).where(inArray(serialRegistry.serialId, serialIds));
}

export async function upsertSerialRegistry(
  tx: Tx,
  row: { serialId: string; sku: string; homeWarehouseId: string; isActive?: string }
) {
  await tx
    .insert(serialRegistry)
    .values({
      serialId: row.serialId,
      sku: row.sku,
      homeWarehouseId: row.homeWarehouseId,
      isActive: row.isActive ?? "1",
    })
    .onConflictDoUpdate({
      target: serialRegistry.serialId,
      set: {
        sku: row.sku,
        homeWarehouseId: row.homeWarehouseId,
        isActive: row.isActive ?? "1",
        syncedAt: new Date(),
      },
    });
}
