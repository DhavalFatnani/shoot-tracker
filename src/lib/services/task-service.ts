import { eq, and, inArray } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import * as taskRepo from "@/lib/repositories/task-repository";
import * as taskSerialRepo from "@/lib/repositories/task-serial-repository";
import * as serialRegistryRepo from "@/lib/repositories/serial-registry-repository";
import * as serialStateRepo from "@/lib/repositories/serial-current-state-repository";
import * as disputeRepo from "@/lib/repositories/dispute-repository";
import * as teamRepo from "@/lib/repositories/team-repository";
import * as eventRepo from "@/lib/repositories/event-repository";
import {
  computeTaskSerialCounts,
  isTaskBalanceSatisfied,
  getBalanceViolation,
} from "@/lib/domain/balance";
import { canAddSerialToRequest } from "@/lib/domain/invariants";
import { getLocationForTaskSerialStatus } from "@/lib/domain/task-serial-location";
import type { CreateRequestInput, Role } from "@/lib/validations";
import { SHOOT_REASON_LABELS } from "@/lib/validations";
import type { ShootReason } from "@/lib/validations";
import { NotFoundError, ForbiddenError, InvariantViolationError } from "@/lib/errors";
import { tasks, taskSerials, sessions, sessionItems, events, disputes } from "@/lib/db/schema";

export async function createRequest(
  input: CreateRequestInput,
  userId: string,
  userRole: Role,
  userShootTeamIds: string[]
) {
  if (userRole !== "ADMIN" && !userShootTeamIds.includes(input.shootTeamId)) {
    throw new ForbiddenError("You cannot create a request for this team");
  }

  const db = getDb();
  const skuMap = new Map(
    (input.serials ?? []).map((s) => [s.serial_id, s.sku])
  );

  const [registryRows, stateRows] = await Promise.all([
    serialRegistryRepo.serialRegistryByIds(db, input.serialIds),
    serialStateRepo.getLocationsForSerials(db, input.serialIds),
  ]);
  const registryMap = new Map(registryRows.map((r) => [r.serialId, r]));
  const stateMap = new Map(stateRows.map((r) => [r.serialId, r.currentLocation]));

  const needsRegistration: string[] = [];
  const eligible: string[] = [];
  const ineligible: string[] = [];

  for (const serialId of input.serialIds) {
    const reg = registryMap.get(serialId);
    const location = stateMap.get(serialId) ?? null;

    if (!reg) {
      needsRegistration.push(serialId);
    } else if (reg.isActive !== "1") {
      ineligible.push(serialId);
    } else if (!canAddSerialToRequest(location as "WH_" | "SHOOT_BUFFER" | "SOLD" | "LOST" | "TRANSIT" | "SHOOT_ACTIVE")) {
      ineligible.push(serialId);
    } else {
      eligible.push(serialId);
    }
  }

  let taskId: string;
  await db.transaction(async (tx) => {
    for (const serialId of needsRegistration) {
      const sku = skuMap.get(serialId) ?? "UNKNOWN";
      await serialRegistryRepo.upsertSerialRegistry(tx, {
        serialId,
        sku,
        homeWarehouseId: input.warehouseId,
      });
      await serialStateRepo.upsertLocation(tx, serialId, "WH_");
    }

    const allEligible = [...eligible, ...needsRegistration];
    if (allEligible.length === 0) {
      throw new InvariantViolationError(
        "No serials eligible for request. All provided serials are inactive or in a non-eligible location."
      );
    }

    const team = await teamRepo.teamById(tx, input.shootTeamId);
    const teamName = team?.name ?? "Team";
    const reasonLabel = SHOOT_REASON_LABELS[input.shootReason as ShootReason] ?? input.shootReason;
    const dateStr = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
    const taskName = `${reasonLabel} · ${teamName} · ${allEligible.length} units · ${dateStr}`;

    const nonReturnMap = new Map(
      (input.nonReturnSerials ?? []).map((s) => [s.serial_id, s.reason])
    );

    taskId = await taskRepo.createTask(tx, {
      name: taskName,
      shootReason: input.shootReason,
      shootTeamId: input.shootTeamId,
      warehouseId: input.warehouseId,
      createdBy: userId,
    });
    await taskSerialRepo.insertTaskSerials(tx, taskId!, allEligible, "REQUESTED", nonReturnMap);

    // Record request-level events so serial timeline shows when each serial was added to this task.
    const requestEvents = allEligible.map((serialId) => {
      const originalLocation = stateMap.get(serialId) ?? "WH_";
      const nonReturnReason = nonReturnMap.get(serialId);
      return {
        serialId,
        eventType: "REQUEST" as const,
        fromLocation: originalLocation as "WH_" | "SHOOT_BUFFER" | "TRANSIT" | "SHOOT_ACTIVE" | "SOLD" | "LOST",
        toLocation: originalLocation as "WH_" | "SHOOT_BUFFER" | "TRANSIT" | "SHOOT_ACTIVE" | "SOLD" | "LOST",
        taskId: taskId!,
        sessionId: undefined,
        createdBy: userId,
        metadata: {
          shootReason: input.shootReason,
          teamName,
          requestName: taskName,
          returnable: nonReturnReason ? false : true,
          nonReturnReason: nonReturnReason ?? null,
        },
      };
    });
    await eventRepo.insertEvents(tx, requestEvents);
  });

  return {
    taskId: taskId!,
    requested: eligible.length + needsRegistration.length,
    autoRegistered: needsRegistration.length,
    skipped: ineligible,
  };
}

export async function closeTask(taskId: string, userId: string, userRole: Role, userTeamIds: string[]) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can close a task");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);
  if (task.status === "CLOSED") {
    throw new InvariantViolationError("Task is already closed.");
  }

  const countsMap = await taskSerialRepo.taskSerialCountsByStatus(db, taskId);
  const counts = computeTaskSerialCounts(countsMap);
  if (!isTaskBalanceSatisfied(counts)) {
    const msg = getBalanceViolation(counts);
    throw new InvariantViolationError(`Task balance not satisfied: ${msg}`);
  }

  const openDisputes = await disputeRepo.openDisputesByTaskId(db, taskId);
  if (openDisputes.length > 0) {
    throw new InvariantViolationError(`Cannot close task: ${openDisputes.length} open dispute(s)`);
  }

  await db.transaction(async (tx) => {
    await taskRepo.closeTask(tx, taskId);
  });
}

export async function getTask(taskId: string, _userId: string, _userRole: Role) {
  const db = getDb();
  const [task, serials, countsMap] = await Promise.all([
    taskRepo.taskById(db, taskId),
    taskSerialRepo.taskSerialsByTaskId(db, taskId),
    taskSerialRepo.taskSerialCountsByStatus(db, taskId),
  ]);
  if (!task) throw new NotFoundError("Task", taskId);
  const serialIds = serials.map((s) => s.serialId);
  const registryRows = serialIds.length > 0 ? await serialRegistryRepo.serialRegistryByIds(db, serialIds) : [];
  const skuBySerialId = new Map(registryRows.map((r) => [r.serialId, r.sku]));
  const taskSerialsWithSku = serials.map((s) => ({ ...s, sku: skuBySerialId.get(s.serialId) ?? "" }));
  const counts = computeTaskSerialCounts(countsMap);
  return {
    task,
    taskSerials: taskSerialsWithSku,
    balance: counts,
    balanceSatisfied: isTaskBalanceSatisfied(counts),
  };
}

export async function listTasks(
  userId: string,
  userRole: Role,
  shootTeamIds: string[],
  opsWarehouseIds: string[],
  options: { status?: "OPEN" | "PICKING_PENDING" | "PICKING" | "IN_TRANSIT" | "ACTIVE" | "RETURN_PENDING" | "COLLECTED" | "RECEIVING" | "RETURNING" | "VERIFYING" | "CLOSED"; limit?: number; offset?: number; q?: string }
) {
  const db = getDb();
  const teamIds = Array.isArray(shootTeamIds) ? shootTeamIds : [];
  const warehouseIds = Array.isArray(opsWarehouseIds) ? opsWarehouseIds : [];
  return taskRepo.listTasks(db, {
    isAdmin: userRole === "ADMIN",
    shootTeamIds: teamIds,
    opsWarehouseIds: warehouseIds,
    status: options.status,
    limit: options.limit ?? 20,
    offset: options.offset ?? 0,
    q: options.q,
  });
}

/** Tasks that contain this serial and are visible to the user (for serial timeline "Raise dispute"). */
export async function listTasksForSerial(
  serialId: string,
  userId: string,
  userRole: Role,
  shootTeamIds: string[],
  opsWarehouseIds: string[]
): Promise<{ taskId: string; serial: number }[]> {
  const db = getDb();
  const [serialTaskIds, visibleTasks] = await Promise.all([
    taskSerialRepo.getTaskIdsBySerialId(db, serialId),
    taskRepo.listTasks(db, {
      isAdmin: userRole === "ADMIN",
      shootTeamIds,
      opsWarehouseIds,
      limit: 500,
      offset: 0,
    }),
  ]);
  const idSet = new Set(serialTaskIds.map((r) => r.taskId));
  return visibleTasks.filter((t) => idSet.has(t.id)).map((t) => ({ taskId: t.id, serial: t.serial }));
}

/**
 * Mark a serial as SOLD with an order ID
 * Only OPS_USER and ADMIN can perform this action
 * Serial must be in PICKED status
 */
export async function markSerialSold(
  taskId: string,
  serialId: string,
  orderId: string,
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can mark serials as sold");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);
  if (task.status === "CLOSED") {
    throw new InvariantViolationError("Task is closed. Cannot update serials.");
  }

  const taskSerial = await taskSerialRepo.getTaskSerial(db, taskId, serialId);
  if (!taskSerial) throw new NotFoundError("Serial", serialId);
  if (taskSerial.status !== "PACKED" && taskSerial.status !== "REQUESTED") {
    throw new InvariantViolationError(`Serial must be in REQUESTED or PACKED status, current: ${taskSerial.status}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(taskSerials)
      .set({ status: "SOLD", orderId })
      .where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.serialId, serialId)));

    const location = getLocationForTaskSerialStatus("SOLD");
    if (location) await serialStateRepo.upsertLocation(tx, serialId, location);

    await eventRepo.insertEvents(tx, [{
      serialId,
      eventType: "MARK_SOLD",
      fromLocation: taskSerial.status === "PACKED" ? "SHOOT_ACTIVE" : "WH_",
      toLocation: "SOLD",
      taskId,
      sessionId: undefined,
      createdBy: userId,
      metadata: { orderId },
    }]);
  });

  return { success: true };
}

/**
 * Mark a serial as NOT_FOUND
 * Only OPS_USER and ADMIN can perform this action
 * Serial must be in PICKED status
 */
export async function markSerialNotFound(
  taskId: string,
  serialId: string,
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can mark serials as not found");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);
  if (task.status === "CLOSED") {
    throw new InvariantViolationError("Task is closed. Cannot update serials.");
  }

  const taskSerial = await taskSerialRepo.getTaskSerial(db, taskId, serialId);
  if (!taskSerial) throw new NotFoundError("Serial", serialId);
  if (taskSerial.status !== "PACKED" && taskSerial.status !== "REQUESTED") {
    throw new InvariantViolationError(`Serial must be in REQUESTED or PACKED status, current: ${taskSerial.status}`);
  }

  await db.transaction(async (tx) => {
    await taskSerialRepo.updateTaskSerialStatus(tx, taskId, serialId, "NOT_FOUND");
    const location = getLocationForTaskSerialStatus("NOT_FOUND");
    if (location) await serialStateRepo.upsertLocation(tx, serialId, location);
  });

  return { success: true };
}

/**
 * Mark a serial as QC_FAIL with a reason
 * Only OPS_USER and ADMIN can perform this action
 * Serial must be in PICKED status
 */
export async function markSerialQcFail(
  taskId: string,
  serialId: string,
  reason: string,
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can mark serials as QC fail");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);
  if (task.status === "CLOSED") {
    throw new InvariantViolationError("Task is closed. Cannot update serials.");
  }

  const taskSerial = await taskSerialRepo.getTaskSerial(db, taskId, serialId);
  if (!taskSerial) throw new NotFoundError("Serial", serialId);
  if (taskSerial.status !== "PACKED" && taskSerial.status !== "REQUESTED") {
    throw new InvariantViolationError(`Serial must be in REQUESTED or PACKED status, current: ${taskSerial.status}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(taskSerials)
      .set({ status: "QC_FAIL", qcFailReason: reason })
      .where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.serialId, serialId)));

    const location = getLocationForTaskSerialStatus("QC_FAIL");
    if (location) await serialStateRepo.upsertLocation(tx, serialId, location);
  });

  return { success: true };
}

/**
 * Bulk dispatch all PACKED serials to IN_TRANSIT
 * Sets task status to IN_TRANSIT and dispatch_time
 * Only OPS_USER and ADMIN can perform this action
 */
export async function bulkDispatch(
  taskId: string,
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can dispatch serials");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);
  if (task.status === "CLOSED") {
    throw new InvariantViolationError("Task is closed. Cannot dispatch.");
  }

  const packedSerials = await db
    .select({ serialId: taskSerials.serialId })
    .from(taskSerials)
    .where(
      and(
        eq(taskSerials.taskId, taskId),
        inArray(taskSerials.status, ["PACKED", "PICKED"])
      )
    );

  if (packedSerials.length === 0) {
    throw new InvariantViolationError("No PACKED/PICKED serials to dispatch. Serials must go through a pick scan first.");
  }

  const serialIds = packedSerials.map(s => s.serialId);

  // Lock counts at dispatch (current counts for this task)
  const countsMap = await taskSerialRepo.taskSerialCountsByStatus(db, taskId);
  const receivedLock =
    (countsMap.get("RECEIVED") ?? 0) + (countsMap.get("RETURN_CREATED") ?? 0);
  const soldLock = countsMap.get("SOLD") ?? 0;
  const notFoundLock = countsMap.get("NOT_FOUND") ?? 0;
  const qcFailLock = countsMap.get("QC_FAIL") ?? 0;
  const pendingActionLock = countsMap.get("REQUESTED") ?? 0;
  const packedLock = (countsMap.get("PACKED") ?? 0) + (countsMap.get("PICKED") ?? 0);

  await db.transaction(async (tx) => {
    // Lock and validate: every serial must be at WH_ before we can emit PICK (WH_ → TRANSIT).
    // Prevents duplicate PICK when bulkDispatch is called again (e.g. double-click) or after revert.
    const currentStates = await serialStateRepo.getLocationsForSerialsForUpdate(tx, serialIds);
    const stateBySerial = new Map(currentStates.map((r) => [r.serialId, r.currentLocation]));
    const notAtWh = serialIds.filter((id) => stateBySerial.get(id) !== "WH_");
    if (notAtWh.length > 0) {
      const at = notAtWh.map((id) => `${id}@${stateBySerial.get(id) ?? "?"}`).join(", ");
      throw new InvariantViolationError(
        `Cannot dispatch: serial(s) not at warehouse (already picked?). ${at}`
      );
    }

    await tx
      .update(tasks)
      .set({
        status: "IN_TRANSIT",
        dispatchTime: new Date(),
        dispatchReceived: receivedLock,
        dispatchSold: soldLock,
        dispatchNotFound: notFoundLock,
        dispatchQcFail: qcFailLock,
        dispatchPendingAction: pendingActionLock,
        dispatchPacked: packedLock,
      })
      .where(eq(tasks.id, taskId));

    await tx
      .update(taskSerials)
      .set({ status: "IN_TRANSIT" })
      .where(
        and(
          eq(taskSerials.taskId, taskId),
          inArray(taskSerials.status, ["PACKED", "PICKED"]),
          inArray(taskSerials.serialId, serialIds)
        )
      );

    const transitLocation = getLocationForTaskSerialStatus("IN_TRANSIT");
    if (transitLocation) {
      for (const id of serialIds) {
        await serialStateRepo.upsertLocation(tx, id, transitLocation);
      }
    }

    await eventRepo.insertEvents(
      tx,
      serialIds.map(serialId => ({
        serialId,
        eventType: "PICK",
        fromLocation: "WH_",
        toLocation: "TRANSIT",
        taskId,
        sessionId: undefined,
        createdBy: userId,
      }))
    );
  });

  return { success: true, dispatched: serialIds.length };
}

/**
 * Mark task as received (shoot has received the items)
 * Requires SHOOT_USER or ADMIN. Task must be IN_TRANSIT.
 */
export async function markReceivedTask(
  taskId: string,
  userId: string,
  userRole: Role,
  userShootTeamIds: string[]
) {
  if (userRole !== "ADMIN" && userRole !== "SHOOT_USER") {
    throw new ForbiddenError("Only Shoot or ADMIN can mark task as received");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);
  if (userRole === "SHOOT_USER" && !userShootTeamIds.includes(task.shootTeamId)) {
    throw new ForbiddenError("You cannot mark this task as received");
  }
  if (task.status !== "IN_TRANSIT") {
    throw new InvariantViolationError(`Task must be IN_TRANSIT to mark received, current: ${task.status}`);
  }

  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ status: "COLLECTED" }).where(eq(tasks.id, taskId));
  });

  return { success: true };
}

/**
 * Admin: revert a serial back to REQUESTED status (undo any action)
 * Clears orderId and qcFailReason. Creates a REVERT event for audit trail.
 */
export async function adminRevertSerial(
  taskId: string,
  serialId: string,
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN") {
    throw new ForbiddenError("Only ADMIN can revert serial status");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);

  const taskSerial = await taskSerialRepo.getTaskSerial(db, taskId, serialId);
  if (!taskSerial) throw new NotFoundError("Serial", serialId);

  if (taskSerial.status === "REQUESTED") {
    throw new InvariantViolationError("Serial is already in REQUESTED status");
  }

  const previousStatus = taskSerial.status;

  await db.transaction(async (tx) => {
    await tx
      .update(taskSerials)
      .set({ status: "REQUESTED", orderId: null, qcFailReason: null })
      .where(and(eq(taskSerials.taskId, taskId), eq(taskSerials.serialId, serialId)));

    const location = getLocationForTaskSerialStatus("REQUESTED");
    if (location) await serialStateRepo.upsertLocation(tx, serialId, location);

    await eventRepo.insertEvents(tx, [{
      serialId,
      eventType: "ADMIN_REVERT",
      fromLocation: "WH_",
      toLocation: "WH_",
      taskId,
      sessionId: undefined,
      createdBy: userId,
      metadata: { previousStatus, revertedTo: "REQUESTED" },
    }]);
  });

  return { success: true, previousStatus };
}

/**
 * Admin: reopen a CLOSED task
 */
export async function adminReopenTask(
  taskId: string,
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN") {
    throw new ForbiddenError("Only ADMIN can reopen tasks");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);

  if (task.status !== "CLOSED") {
    throw new InvariantViolationError(`Task is not CLOSED, current status: ${task.status}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({ status: "PICKING_PENDING", closedAt: null })
      .where(eq(tasks.id, taskId));
  });

  return { success: true };
}

/**
 * Admin: update task metadata (name, shoot reason)
 */
export async function adminUpdateTask(
  taskId: string,
  updates: { name?: string; shootReason?: string },
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN") {
    throw new ForbiddenError("Only ADMIN can update tasks");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);

  const setValues: Record<string, unknown> = {};
  if (updates.name !== undefined) setValues.name = updates.name;
  if (updates.shootReason !== undefined) setValues.shootReason = updates.shootReason;

  if (Object.keys(setValues).length === 0) {
    throw new InvariantViolationError("No fields to update");
  }

  await db.transaction(async (tx) => {
    await tx.update(tasks).set(setValues).where(eq(tasks.id, taskId));
  });

  return { success: true };
}

/**
 * Admin: delete a task and all related data.
 * Reverts inventory: every serial that was on the task is set back to WH_.
 * Deletes sessions, session_items, events, disputes. task_serials and task_comments cascade.
 */
export async function adminDeleteTask(
  taskId: string,
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN") {
    throw new ForbiddenError("Only ADMIN can delete tasks");
  }

  const db = getDb();
  const task = await taskRepo.taskById(db, taskId);
  if (!task) throw new NotFoundError("Task", taskId);

  await db.transaction(async (tx) => {
    const taskSessions = await tx.select({ id: sessions.id }).from(sessions).where(eq(sessions.taskId, taskId));
    const sessionIds = taskSessions.map((s) => s.id);

    // Collect serials that were on this task (before task delete cascades task_serials)
    const rows = await tx.select({ serialId: taskSerials.serialId }).from(taskSerials).where(eq(taskSerials.taskId, taskId));
    const serialIds = [...new Set(rows.map((r) => r.serialId))];

    // Delete in FK order: events reference sessions, session_items reference sessions
    await tx.delete(events).where(eq(events.taskId, taskId));
    if (sessionIds.length > 0) {
      await tx.delete(sessionItems).where(inArray(sessionItems.sessionId, sessionIds));
    }
    await tx.delete(sessions).where(eq(sessions.taskId, taskId));
    await tx.delete(disputes).where(eq(disputes.taskId, taskId));
    await tx.delete(tasks).where(eq(tasks.id, taskId));

    // Revert inventory: put every serial from this task back at warehouse
    for (const serialId of serialIds) {
      await serialStateRepo.upsertLocation(tx, serialId, "WH_");
    }
  });

  return { success: true };
}
