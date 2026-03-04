import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { serialCurrentState, serialRegistry, taskSerials, tasks } from "@/lib/db/schema";
import type { Role } from "@/lib/validations";
import { ForbiddenError } from "@/lib/errors";

type BufferAgingOptions = {
  minDaysInBuffer?: number;
  limit?: number;
  role: Role;
  shootTeamIds: string[];
  opsWarehouseIds: string[];
};

export async function getBufferAgingList(options: BufferAgingOptions) {
  const db = getDb();
  const minDays = options.minDaysInBuffer ?? 0;
  const limit = options.limit ?? 100;

  const rows = await db
    .select({
      serialId: serialCurrentState.serialId,
      currentLocation: serialCurrentState.currentLocation,
      updatedAt: serialCurrentState.updatedAt,
    })
    .from(serialCurrentState)
    .where(eq(serialCurrentState.currentLocation, "SHOOT_BUFFER"))
    .limit(limit * 2);

  const withDays = rows.map((r) => ({
    ...r,
    daysInBuffer: Math.floor((Date.now() - r.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
  }));

  const filtered = minDays > 0 ? withDays.filter((r) => r.daysInBuffer >= minDays) : withDays;
  let limited = filtered.slice(0, limit);

  if (limited.length === 0) return { items: [] };

  let serialIds = limited.map((r) => r.serialId);

  if (options.role === "SHOOT_USER" && options.shootTeamIds.length > 0) {
    const teamSerials = await db
      .selectDistinct({ serialId: taskSerials.serialId })
      .from(taskSerials)
      .innerJoin(tasks, eq(taskSerials.taskId, tasks.id))
      .where(inArray(tasks.shootTeamId, options.shootTeamIds));
    const allowedSet = new Set(teamSerials.map((r) => r.serialId));
    limited = limited.filter((r) => allowedSet.has(r.serialId));
    serialIds = limited.map((r) => r.serialId);
  } else if (options.role === "OPS_USER" && options.opsWarehouseIds.length > 0) {
    const whSerials = await db
      .select({ serialId: serialRegistry.serialId })
      .from(serialRegistry)
      .where(inArray(serialRegistry.homeWarehouseId, options.opsWarehouseIds));
    const allowedSet = new Set(whSerials.map((r) => r.serialId));
    limited = limited.filter((r) => allowedSet.has(r.serialId));
    serialIds = limited.map((r) => r.serialId);
  }

  if (serialIds.length === 0) return { items: [] };

  const regRows = await db.select({ serialId: serialRegistry.serialId, sku: serialRegistry.sku }).from(serialRegistry).where(inArray(serialRegistry.serialId, serialIds));
  const skuMap = new Map(regRows.map((r) => [r.serialId, r.sku]));

  return {
    items: limited.map((r) => ({
      serialId: r.serialId,
      sku: skuMap.get(r.serialId) ?? "",
      currentLocation: r.currentLocation,
      updatedAt: r.updatedAt,
      daysInBuffer: r.daysInBuffer,
    })),
  };
}

export async function bulkReturnToWarehouse(
  serialIds: string[],
  _warehouseId: string,
  _userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can bulk return");
  }
  return { accepted: serialIds.length, message: "Create a RETURN_VERIFY session to process returns" };
}

export async function escalateBufferSerials(_serialIds: string[], _userId: string, userRole: Role) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can escalate");
  }
  return { accepted: 0, message: "Escalation creates disputes or tasks; implement as needed" };
}
