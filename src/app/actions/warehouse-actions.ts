"use server";

import { getSession } from "@/lib/auth/get-session";
import { getDb } from "@/lib/db/client";
import * as warehouseRepo from "@/lib/repositories/warehouse-repository";

export async function adminListWarehouses() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden", warehouses: [] };
  }
  try {
    const db = getDb();
    const warehouses = await warehouseRepo.listWarehouses(db);
    return { error: null, warehouses };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to list warehouses", warehouses: [] };
  }
}

export async function adminCreateWarehouse(input: { code: string; name: string }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  const code = input.code?.trim();
  const name = input.name?.trim();
  if (!code || !name) return { error: "Code and name are required" };
  try {
    const db = getDb();
    const id = await db.transaction(async (tx) =>
      warehouseRepo.createWarehouse(tx, { code, name })
    );
    return { error: null, warehouseId: id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create warehouse" };
  }
}

export async function adminUpdateWarehouse(
  warehouseId: string,
  input: { code?: string; name?: string }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  const updates: { code?: string; name?: string } = {};
  if (input.code !== undefined) updates.code = input.code.trim();
  if (input.name !== undefined) updates.name = input.name.trim();
  if (Object.keys(updates).length === 0) return { error: "No updates" };
  try {
    const db = getDb();
    await db.transaction(async (tx) => warehouseRepo.updateWarehouse(tx, warehouseId, updates));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update warehouse" };
  }
}

export async function adminDeleteWarehouse(warehouseId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  try {
    const db = getDb();
    await db.transaction(async (tx) => warehouseRepo.deleteWarehouse(tx, warehouseId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete warehouse" };
  }
}
