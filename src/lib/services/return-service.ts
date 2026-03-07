import { eq, and, inArray, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  taskSerials,
  tasks,
  returns,
  serialCurrentState,
  serialRegistry,
  sessions,
  sessionItems,
  events,
} from "@/lib/db/schema";
import type { Role } from "@/lib/validations";
import { ForbiddenError, InvariantViolationError } from "@/lib/errors";
import * as serialStateRepo from "@/lib/repositories/serial-current-state-repository";
import { getLocationForTaskSerialStatus } from "@/lib/domain/task-serial-location";

export type InventoryItem = {
  taskId: string;
  taskSerial: number;
  taskName: string | null;
  serialId: string;
  sku: string;
  currentLocation: string;
  status: string;
  /** When this serial was received (latest RECEIPT event). Used for aging in Create Return. */
  receivedAt: Date | null;
  /** "1" = returnable, "0" = non-returnable (marked at request creation). */
  returnable?: string;
  nonReturnReason?: string | null;
};

export async function getShootTeamInventory(
  role: Role,
  shootTeamIds: string[],
  taskId?: string | null
): Promise<InventoryItem[]> {
  if (role === "OPS_USER") {
    throw new ForbiddenError("OPS users cannot access shoot team inventory");
  }

  const db = getDb();

  const conditions = [
    eq(taskSerials.status, "RECEIVED"),
    inArray(serialCurrentState.currentLocation, ["SHOOT_ACTIVE", "SHOOT_BUFFER"]),
    ne(tasks.status, "CLOSED"),
    ...(taskId ? [eq(tasks.id, taskId)] : []),
    ...(role === "SHOOT_USER" && shootTeamIds.length > 0
      ? [inArray(tasks.shootTeamId, shootTeamIds)]
      : []),
  ];

  const rows = await db
    .select({
      taskId: taskSerials.taskId,
      taskSerial: tasks.serial,
      taskName: tasks.name,
      serialId: taskSerials.serialId,
      sku: serialRegistry.sku,
      currentLocation: serialCurrentState.currentLocation,
      status: taskSerials.status,
      returnable: taskSerials.returnable,
      nonReturnReason: taskSerials.nonReturnReason,
    })
    .from(taskSerials)
    .innerJoin(tasks, eq(taskSerials.taskId, tasks.id))
    .innerJoin(serialCurrentState, eq(taskSerials.serialId, serialCurrentState.serialId))
    .leftJoin(serialRegistry, eq(taskSerials.serialId, serialRegistry.serialId))
    .where(and(...conditions));

  if (rows.length === 0) return [];

  const keysSet = new Set(rows.map((r) => `${r.taskId}:${r.serialId}`));
  const taskIds = [...new Set(rows.map((r) => r.taskId))];
  const receiptRows = await db
    .select({
      taskId: events.taskId,
      serialId: events.serialId,
      createdAt: events.createdAt,
    })
    .from(events)
    .where(and(eq(events.eventType, "RECEIPT"), inArray(events.taskId, taskIds)));

  const receivedAtByKey = new Map<string, Date>();
  for (const e of receiptRows) {
    if (!e.taskId) continue;
    const key = `${e.taskId}:${e.serialId}`;
    if (!keysSet.has(key)) continue;
    const existing = receivedAtByKey.get(key);
    if (!existing || e.createdAt > existing) receivedAtByKey.set(key, e.createdAt);
  }

  return rows.map((r) => ({
    taskId: r.taskId,
    taskSerial: r.taskSerial,
    taskName: r.taskName,
    serialId: r.serialId,
    sku: r.sku ?? "",
    currentLocation: r.currentLocation,
    status: r.status,
    receivedAt: receivedAtByKey.get(`${r.taskId}:${r.serialId}`) ?? null,
    returnable: r.returnable,
    nonReturnReason: r.nonReturnReason ?? null,
  }));
}

export async function createReturn(
  serialIds: string[],
  userId: string,
  userRole: Role,
  shootTeamIds: string[]
) {
  if (userRole === "OPS_USER") {
    throw new ForbiddenError("OPS users cannot create returns");
  }

  if (serialIds.length === 0) {
    throw new InvariantViolationError("No serials provided for return");
  }

  const db = getDb();

  const inventory = await getShootTeamInventory(userRole, shootTeamIds);
  const inventorySet = new Map(inventory.map((i) => [i.serialId, i]));

  const invalid = serialIds.filter((id) => !inventorySet.has(id));
  if (invalid.length > 0) {
    throw new InvariantViolationError(
      `${invalid.length} serial(s) not eligible for return: ${invalid.slice(0, 5).join(", ")}${invalid.length > 5 ? "..." : ""}`
    );
  }

  const byTask = new Map<string, string[]>();
  for (const serialId of serialIds) {
    const item = inventorySet.get(serialId)!;
    const list = byTask.get(item.taskId) ?? [];
    list.push(serialId);
    byTask.set(item.taskId, list);
  }

  const summary: { taskId: string; taskName: string | null; taskSerial: number; count: number; sessionId: string }[] = [];

  const returnTaskName = `Return ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short", hour12: false })}`;

  let returnId: string | null = null;
  await db.transaction(async (tx) => {
    const [returnRow] = await tx
      .insert(returns)
      .values({ name: returnTaskName, createdBy: userId, serial: sql`nextval('return_serial_seq')` })
      .returning({ id: returns.id });
    returnId = returnRow!.id;

    for (const [taskId, serials] of byTask) {
      const item = inventorySet.get(serials[0])!;

      const [session] = await tx
        .insert(sessions)
        .values({
          taskId,
          returnId,
          type: "RETURN_SCAN",
          fromLocation: "SHOOT_ACTIVE",
          toLocation: "SHOOT_BUFFER",
          status: "COMMITTED",
          startedBy: userId,
          committedAt: new Date(),
        })
        .returning({ id: sessions.id });

      const sessionId = session!.id;

      await tx.insert(sessionItems).values(
        serials.map((serialId) => ({
          sessionId,
          serialId,
          scanStatus: "OK",
        }))
      );

      await tx.insert(events).values(
        serials.map((serialId) => ({
          serialId,
          eventType: "RETURN_TO_BUFFER" as const,
          fromLocation: "SHOOT_ACTIVE" as const,
          toLocation: "SHOOT_BUFFER" as const,
          taskId,
          sessionId,
          createdBy: userId,
        }))
      );

      const returnCreatedLocation = getLocationForTaskSerialStatus("RETURN_CREATED");
      const returnedSet = new Set(serials);

      await tx
        .update(taskSerials)
        .set({ status: "RETURN_CREATED" })
        .where(and(eq(taskSerials.taskId, taskId), inArray(taskSerials.serialId, serials)));
      if (returnCreatedLocation) await serialStateRepo.upsertLocations(tx, serials, returnCreatedLocation);

      const leftBehindIds = inventory
        .filter((i) => i.taskId === taskId && !returnedSet.has(i.serialId))
        .map((i) => i.serialId);
      if (leftBehindIds.length > 0) {
        await serialStateRepo.upsertLocations(tx, leftBehindIds, "SHOOT_BUFFER");
      }

      summary.push({ taskId, taskName: item.taskName, taskSerial: item.taskSerial, count: serials.length, sessionId });
    }
  });

  return { success: true, returnId: returnId!, summary, totalReturned: serialIds.length };
}

/**
 * Bulk return dispatch: move all serials in this return to in-transit (TRANSIT).
 * Only shoot team (creator) or admin. Return must not already be dispatched.
 */
export async function dispatchReturn(returnId: string, userId: string, userRole: Role, _createdBy: string) {
  if (userRole === "OPS_USER") {
    throw new ForbiddenError("Only shoot team or admin can dispatch returns");
  }
  // SHOOT_USER / ADMIN access (creator or team return) is enforced in return-actions.dispatchReturn

  const db = getDb();
  const returnRow = await db.select().from(returns).where(eq(returns.id, returnId)).limit(1);
  const r = returnRow[0];
  if (!r) throw new InvariantViolationError("Return not found");
  if (r.dispatchedAt) {
    throw new InvariantViolationError("Return has already been dispatched");
  }

  const sessionRows = await db
    .select({ sessionId: sessions.id, taskId: sessions.taskId })
    .from(sessions)
    .where(eq(sessions.returnId, returnId));
  const sessionIds = sessionRows.map((s) => s.sessionId);
  const taskIdBySession = new Map(sessionRows.map((s) => [s.sessionId, s.taskId]));
  if (sessionIds.length === 0) {
    throw new InvariantViolationError("Return has no sessions");
  }

  const items = await db
    .select({ sessionId: sessionItems.sessionId, serialId: sessionItems.serialId })
    .from(sessionItems)
    .where(inArray(sessionItems.sessionId, sessionIds));

  const transitLocation = getLocationForTaskSerialStatus("RETURN_IN_TRANSIT");

  await db.transaction(async (tx) => {
    await tx.update(returns).set({ dispatchedAt: new Date() }).where(eq(returns.id, returnId));

    const validItems = items.filter((i) => taskIdBySession.has(i.sessionId));
    if (validItems.length > 0) {
      const pairConditions = validItems.map((item) => {
        const taskId = taskIdBySession.get(item.sessionId)!;
        return sql`(${taskSerials.taskId} = ${taskId} AND ${taskSerials.serialId} = ${item.serialId})`;
      });
      await tx
        .update(taskSerials)
        .set({ status: "RETURN_IN_TRANSIT" })
        .where(sql`${sql.join(pairConditions, sql` OR `)}`);

      if (transitLocation) {
        await serialStateRepo.upsertLocations(tx, validItems.map((i) => i.serialId), transitLocation);
      }
    }
  });

  return { success: true, dispatched: items.length };
}

/**
 * If all serials in this return have task_serials status RETURNED, set return.closedAt.
 * Call after committing a RETURN_VERIFY session (e.g. from session-service).
 */
export async function closeReturnIfFullyVerified(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  returnId: string
): Promise<boolean> {
  const r = await tx.select().from(returns).where(eq(returns.id, returnId)).limit(1);
  const row = r[0];
  if (!row || row.closedAt) return false;

  const sessionRows = await tx
    .select({ sessionId: sessions.id, taskId: sessions.taskId })
    .from(sessions)
    .where(eq(sessions.returnId, returnId));
  const sessionIds = sessionRows.map((s) => s.sessionId);
  const taskIdBySession = new Map(sessionRows.map((s) => [s.sessionId, s.taskId]));
  if (sessionIds.length === 0) return false;

  const items = await tx
    .select({ sessionId: sessionItems.sessionId, serialId: sessionItems.serialId })
    .from(sessionItems)
    .where(inArray(sessionItems.sessionId, sessionIds));

  const pairs = items
    .map((i) => ({ taskId: taskIdBySession.get(i.sessionId), serialId: i.serialId }))
    .filter((p): p is { taskId: string; serialId: string } => p.taskId != null);
  if (pairs.length === 0) return false;

  const pairConditions = pairs.map(
    ({ taskId, serialId }) =>
      sql`(${taskSerials.taskId} = ${taskId} AND ${taskSerials.serialId} = ${serialId})`
  );
  const matchingRows = await tx
    .select({ status: taskSerials.status })
    .from(taskSerials)
    .where(sql`${sql.join(pairConditions, sql` OR `)}`);
  const allReturned =
    matchingRows.length === pairs.length &&
    matchingRows.every((r) => r.status === "RETURNED");
  if (!allReturned) return false;

  await tx.update(returns).set({ closedAt: new Date() }).where(eq(returns.id, returnId));
  return true;
}
