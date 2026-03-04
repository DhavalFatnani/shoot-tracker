import { eq, asc } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { warehouses } from "@/lib/db/schema";

export async function warehouseById(db: Database | Tx, id: string) {
  const rows = await db.select().from(warehouses).where(eq(warehouses.id, id)).limit(1);
  return rows[0] ?? null;
}

export function listWarehouses(db: Database | Tx) {
  return db.select().from(warehouses).orderBy(asc(warehouses.code));
}

export async function createWarehouse(tx: Tx, row: { code: string; name: string }) {
  const [inserted] = await tx
    .insert(warehouses)
    .values({ code: row.code.trim(), name: row.name.trim() })
    .returning({ id: warehouses.id });
  return inserted!.id;
}

export async function updateWarehouse(tx: Tx, id: string, updates: { code?: string; name?: string }) {
  await tx.update(warehouses).set(updates).where(eq(warehouses.id, id));
}

export async function deleteWarehouse(tx: Tx, id: string) {
  await tx.delete(warehouses).where(eq(warehouses.id, id));
}
