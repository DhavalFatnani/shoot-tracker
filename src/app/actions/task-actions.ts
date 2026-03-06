"use server";

import { getSession } from "@/lib/auth/get-session";
import * as taskService from "@/lib/services/task-service";
import { createRequestSchema, closeTaskSchema, getTaskSchema, listTasksSchema } from "@/lib/validations";
import { AppError } from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

export async function createRequest(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role === "OPS_USER") {
    return { success: false, error: "OPS users cannot create requests. Only shoot team members and admins can." };
  }

  const serialIdsRaw = formData.get("serialIds");
  const serialsRaw = formData.get("serials");
  const warehouseId = formData.get("warehouseId");
  if (typeof serialIdsRaw !== "string" || typeof warehouseId !== "string") {
    return { success: false, error: "Missing serialIds or warehouseId" };
  }
  let serialIds: string[];
  try {
    serialIds = JSON.parse(serialIdsRaw) as string[];
  } catch {
    return { success: false, error: "Invalid serialIds" };
  }

  let serials: { serial_id: string; sku: string }[] | undefined;
  if (typeof serialsRaw === "string" && serialsRaw.trim()) {
    try {
      serials = JSON.parse(serialsRaw) as { serial_id: string; sku: string }[];
    } catch {
      serials = undefined;
    }
  }

  const shootReason = formData.get("shootReason") as string | null;

  let nonReturnSerials: { serial_id: string; reason: string }[] | undefined;
  const nonReturnRaw = formData.get("nonReturnSerials");
  if (typeof nonReturnRaw === "string" && nonReturnRaw.trim()) {
    try {
      nonReturnSerials = JSON.parse(nonReturnRaw) as { serial_id: string; reason: string }[];
    } catch {
      nonReturnSerials = undefined;
    }
  }

  const shootTeamId = session.shootTeamIds[0];
  if (!shootTeamId && session.role !== "ADMIN") {
    return { success: false, error: "You are not assigned to any shoot team. Contact your admin." };
  }

  const resolvedShootTeamId = shootTeamId ?? formData.get("shootTeamId");
  if (typeof resolvedShootTeamId !== "string" || !resolvedShootTeamId) {
    return { success: false, error: "No shoot team could be resolved. Admins must select a team." };
  }

  const result = createRequestSchema.safeParse({
    serialIds,
    serials,
    shootReason: shootReason ?? "INHOUSE_SHOOT",
    nonReturnSerials,
    warehouseId,
    shootTeamId: resolvedShootTeamId,
  });
  if (!result.success) {
    return { success: false, error: "Validation failed" };
  }

  try {
    const data = await taskService.createRequest(
      result.data,
      session.id,
      session.role,
      session.shootTeamIds
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function closeTask(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") return { success: false, error: "Missing taskId" };
  const result = closeTaskSchema.safeParse({ taskId });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    await taskService.closeTask(result.data.taskId, session.id, session.role, session.teamIds);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function getTask(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") return { success: false, error: "Missing taskId" };
  const result = getTaskSchema.safeParse({ taskId });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    const data = await taskService.getTask(result.data.taskId, session.id, session.role);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/** List serials for a task (for dropdowns e.g. Raise new dispute). Uses same visibility as getTask. */
export async function listTaskSerials(formData: FormData) {
  const res = await getTask(formData);
  if (!res.success || !res.data) return { success: false, error: res.error ?? "Failed", data: [] as { serialId: string; status: string; sku?: string }[] };
  return { success: true, data: res.data.taskSerials };
}

/** Tasks that contain this serial (for serial timeline "Raise dispute"). Uses same visibility as listTasks. */
export async function listTasksForSerial(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized", data: [] as { taskId: string; serial: number }[] };
  const serialId = formData.get("serialId");
  if (typeof serialId !== "string" || !serialId.trim()) return { success: false, error: "Missing serialId", data: [] };
  try {
    const data = await taskService.listTasksForSerial(
      serialId.trim(),
      session.id,
      session.role,
      session.shootTeamIds ?? [],
      session.opsWarehouseIds ?? []
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e), data: [] };
  }
}

export async function listTasks(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const status = formData.get("status") as string | null;
  const limit = formData.get("limit");
  const offset = formData.get("offset");
  const q = formData.get("q") as string | null;
  const result = listTasksSchema.safeParse({
    status: status ?? undefined,
    limit: limit != null ? Number(limit) : undefined,
    offset: offset != null ? Number(offset) : undefined,
    q: (typeof q === "string" && q.trim()) ? q.trim() : undefined,
  });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    const data = await taskService.listTasks(
      session.id,
      session.role,
      session.shootTeamIds ?? [],
      session.opsWarehouseIds ?? [],
      {
        status: result.data.status,
        limit: result.data.limit,
        offset: result.data.offset,
        q: result.data.q,
      }
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Mark a serial as sold with an order ID
 */
export async function markSerialSold(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN" && session.role !== "OPS_USER") {
    return { success: false, error: "Only OPS or ADMIN can mark serials as sold" };
  }

  const taskId = formData.get("taskId");
  const serialId = formData.get("serialId");
  const orderId = formData.get("orderId");
  if (typeof taskId !== "string" || typeof serialId !== "string" || typeof orderId !== "string") {
    return { success: false, error: "Missing taskId, serialId, or orderId" };
  }

  if (!orderId.trim()) {
    return { success: false, error: "Order ID is required" };
  }

  try {
    await taskService.markSerialSold(taskId, serialId, orderId, session.id, session.role);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Mark a serial as not found
 */
export async function markSerialNotFound(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN" && session.role !== "OPS_USER") {
    return { success: false, error: "Only OPS or ADMIN can mark serials as not found" };
  }

  const taskId = formData.get("taskId");
  const serialId = formData.get("serialId");
  if (typeof taskId !== "string" || typeof serialId !== "string") {
    return { success: false, error: "Missing taskId or serialId" };
  }

  try {
    await taskService.markSerialNotFound(taskId, serialId, session.id, session.role);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Mark a serial as QC fail with a reason
 */
export async function markSerialQcFail(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN" && session.role !== "OPS_USER") {
    return { success: false, error: "Only OPS or ADMIN can mark serials as QC fail" };
  }

  const taskId = formData.get("taskId");
  const serialId = formData.get("serialId");
  const reason = formData.get("reason");
  if (typeof taskId !== "string" || typeof serialId !== "string" || typeof reason !== "string") {
    return { success: false, error: "Missing taskId, serialId, or reason" };
  }

  if (!reason.trim()) {
    return { success: false, error: "QC fail reason is required" };
  }

  try {
    await taskService.markSerialQcFail(taskId, serialId, reason, session.id, session.role);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Mark task as received (shoot has received the items)
 * Requires SHOOT_USER or ADMIN. Task must be IN_TRANSIT.
 */
export async function markReceivedTask(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN" && session.role !== "SHOOT_USER") {
    return { success: false, error: "Only Shoot or ADMIN can mark task as received" };
  }

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") {
    return { success: false, error: "Missing taskId" };
  }

  try {
    await taskService.markReceivedTask(taskId, session.id, session.role, session.shootTeamIds);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Bulk dispatch all PACKED serials
 */
export async function bulkDispatch(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN" && session.role !== "OPS_USER") {
    return { success: false, error: "Only OPS or ADMIN can dispatch serials" };
  }

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") {
    return { success: false, error: "Missing taskId" };
  }

  try {
    const result = await taskService.bulkDispatch(taskId, session.id, session.role);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Admin: revert a serial back to REQUESTED
 */
export async function adminRevertSerial(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN") {
    return { success: false, error: "Only ADMIN can revert serial status" };
  }

  const taskId = formData.get("taskId");
  const serialId = formData.get("serialId");
  if (typeof taskId !== "string" || typeof serialId !== "string") {
    return { success: false, error: "Missing taskId or serialId" };
  }

  try {
    const result = await taskService.adminRevertSerial(taskId, serialId, session.id, session.role);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Admin: reopen a CLOSED task
 */
export async function adminReopenTask(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN") {
    return { success: false, error: "Only ADMIN can reopen tasks" };
  }

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") {
    return { success: false, error: "Missing taskId" };
  }

  try {
    await taskService.adminReopenTask(taskId, session.id, session.role);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Admin: delete a task and all related data
 */
export async function adminDeleteTask(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN") {
    return { success: false, error: "Only ADMIN can delete tasks" };
  }

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") {
    return { success: false, error: "Missing taskId" };
  }

  try {
    await taskService.adminDeleteTask(taskId, session.id, session.role);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/**
 * Admin: update task metadata
 */
export async function adminUpdateTask(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN") {
    return { success: false, error: "Only ADMIN can update tasks" };
  }

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") {
    return { success: false, error: "Missing taskId" };
  }

  const name = formData.get("name");
  const shootReason = formData.get("shootReason");

  const updates: { name?: string; shootReason?: string } = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof shootReason === "string" && shootReason.trim()) updates.shootReason = shootReason.trim();

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "No fields to update" };
  }

  try {
    await taskService.adminUpdateTask(taskId, updates, session.id, session.role);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}
