import type { Database } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import * as serialRegistryRepo from "@/lib/repositories/serial-registry-repository";
import * as warehouseRepo from "@/lib/repositories/warehouse-repository";
import { importSerialsBodySchema } from "@/lib/validations";
import type { ImportSerialsBody } from "@/lib/validations";
import { NotFoundError, ValidationError } from "@/lib/errors";

export async function importSerialsFromCsv(input: ImportSerialsBody): Promise<{ imported: number; skipped: string[] }> {
  const parsed = importSerialsBodySchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError("Invalid import data", parsed.error.flatten());
  }
  const { serials, warehouseId } = parsed.data;

  const db = getDb();
  const warehouse = await warehouseRepo.warehouseById(db, warehouseId);
  if (!warehouse) {
    throw new NotFoundError("Warehouse", warehouseId);
  }

  const skipped: string[] = [];
  await db.transaction(async (tx) => {
    for (const row of serials) {
      try {
        await serialRegistryRepo.upsertSerialRegistry(tx, {
          serialId: row.serial_id,
          sku: row.sku,
          homeWarehouseId: warehouseId,
        });
      } catch {
        skipped.push(row.serial_id);
      }
    }
  });

  return { imported: serials.length - skipped.length, skipped };
}
