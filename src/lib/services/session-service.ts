import { eq, and, sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import { sessionItems } from "@/lib/db/schema";
import * as sessionRepo from "@/lib/repositories/session-repository";
import * as sessionItemRepo from "@/lib/repositories/session-item-repository";
import * as taskRepo from "@/lib/repositories/task-repository";
import * as taskSerialRepo from "@/lib/repositories/task-serial-repository";
import * as serialStateRepo from "@/lib/repositories/serial-current-state-repository";
import * as eventRepo from "@/lib/repositories/event-repository";
import * as disputeRepo from "@/lib/repositories/dispute-repository";
import * as returnRepo from "@/lib/repositories/return-repository";
import * as returnService from "@/lib/services/return-service";
import { canSerialBeInSession } from "@/lib/domain/invariants";
import { getLocationForTaskSerialStatus } from "@/lib/domain/task-serial-location";
import type { StartSessionInput, AddScanInput, CommitSessionInput, CancelSessionInput, Role } from "@/lib/validations";
import {
  NotFoundError,
  ForbiddenError,
  InvariantViolationError,
  ConcurrentSessionError,
} from "@/lib/errors";

const SESSION_TYPE_FROM_TO: Record<
  string,
  { from: "WH_" | "TRANSIT" | "SHOOT_ACTIVE" | "SHOOT_BUFFER"; to: "WH_" | "TRANSIT" | "SHOOT_ACTIVE" | "SHOOT_BUFFER" }
> = {
  PICK: { from: "WH_", to: "TRANSIT" },
  RECEIPT: { from: "TRANSIT", to: "SHOOT_ACTIVE" },
  RETURN_SCAN: { from: "SHOOT_ACTIVE", to: "SHOOT_BUFFER" },
  RETURN_VERIFY: { from: "TRANSIT", to: "WH_" },
};

export async function startSession(input: StartSessionInput, userId: string, _userRole: Role) {
  const db = getDb();
  const task = await taskRepo.taskById(db, input.taskId);
  if (!task) throw new NotFoundError("Task", input.taskId);
  if (task.status === "CLOSED") {
    throw new InvariantViolationError("Cannot start a scan session for a closed task.");
  }
  const { from, to } = SESSION_TYPE_FROM_TO[input.type] ?? { from: "WH_", to: "TRANSIT" };

  const TASK_STATUS_ON_START: Record<string, string> = {
    PICK: "PICKING",
    RECEIPT: "RECEIVING",
    RETURN_SCAN: "RETURNING",
    RETURN_VERIFY: "VERIFYING",
  };
  const newTaskStatus = TASK_STATUS_ON_START[input.type];

  let sessionId: string;
  await db.transaction(async (tx) => {
    let returnId: string | null = null;
    if (input.type === "RETURN_VERIFY") {
      returnId = await returnRepo.returnIdByTaskId(tx, input.taskId);
    }
    sessionId = await sessionRepo.createSession(tx, {
      taskId: input.taskId,
      type: input.type,
      fromLocation: from,
      toLocation: to,
      startedBy: userId,
      returnId: returnId ?? undefined,
    });
    if (newTaskStatus) {
      await taskRepo.updateTaskStatus(tx, input.taskId, newTaskStatus);
    }
  });
  return { sessionId: sessionId! };
}

export async function addScan(input: AddScanInput, userId: string) {
  const db = getDb();
  const session = await sessionRepo.sessionById(db, input.sessionId);
  if (!session) throw new NotFoundError("Session", input.sessionId);
  if (session.status !== "OPEN") throw new InvariantViolationError("Session is not open");

  const existing = await sessionItemRepo.getSessionItem(db, input.sessionId, input.serialId);
  if (existing) {
    return { ok: false, error: "DUPLICATE", message: "Serial already scanned in this session" };
  }

  const openSessionsWithSerial = await sessionRepo.openSessionIdsContainingSerial(db, input.serialId);
  const inOther = openSessionsWithSerial.some((r) => r.sessionId !== input.sessionId);
  if (!canSerialBeInSession(inOther)) {
    throw new ConcurrentSessionError(input.serialId);
  }

  const location = await serialStateRepo.getLocation(db, input.serialId);
  const expectedFrom = session.fromLocation;

  let scanOk =
    location?.currentLocation === expectedFrom ||
    (session.type === "RETURN_SCAN" &&
      (location?.currentLocation === "SHOOT_ACTIVE" || location?.currentLocation === "SHOOT_BUFFER"));

  // Backwards-compatibility: during the DISPATCHED -> IN_TRANSIT migration we updated task_serials.status
  // but some older serials may still have currentLocation = WH_ even though they are IN_TRANSIT for the task.
  // For RECEIPT sessions we treat such serials as valid to unblock receipt scanning on legacy data.
  if (
    !scanOk &&
    session.type === "RECEIPT" &&
    expectedFrom === "TRANSIT" &&
    location?.currentLocation === "WH_"
  ) {
    const taskSerial = await taskSerialRepo.getTaskSerial(db, session.taskId, input.serialId);
    if (taskSerial && taskSerial.status === "IN_TRANSIT") {
      scanOk = true;
    }
  }

  await db.transaction(async (tx) => {
    await sessionItemRepo.insertSessionItem(tx, {
      sessionId: input.sessionId,
      serialId: input.serialId,
      scanStatus: scanOk ? "OK" : "ERROR",
      errorReason: scanOk ? undefined : `Expected at ${expectedFrom}, current: ${location?.currentLocation ?? "unknown"}`,
    });
  });

  const errorReason = scanOk ? undefined : `Expected at ${expectedFrom}, current: ${location?.currentLocation ?? "unknown"}`;
  return { ok: true, scanStatus: scanOk ? "OK" : "ERROR", errorReason };
}

export async function commitSession(input: CommitSessionInput, userId: string) {
  const db = getDb();
  const session = await sessionRepo.sessionById(db, input.sessionId);
  if (!session) throw new NotFoundError("Session", input.sessionId);
  if (session.status !== "OPEN") throw new InvariantViolationError("Session is not open");

  await db.transaction(async (tx) => {
    const items = await tx
      .select()
      .from(sessionItems)
      .where(eq(sessionItems.sessionId, input.sessionId))
      .for("update");

    const eventTypeMap: Record<string, "PICK" | "RECEIPT" | "RETURN_TO_WH" | "RETURN_TO_BUFFER"> = {
      PICK: "PICK",
      RECEIPT: "RECEIPT",
      RETURN_SCAN: "RETURN_TO_BUFFER",
      RETURN_VERIFY: "RETURN_TO_WH",
    };
    const eventType = eventTypeMap[session.type] ?? "PICK";

    const events = items
      .filter((i) => i.scanStatus === "OK")
      .map((i) => ({
        serialId: i.serialId,
        eventType,
        fromLocation: session.fromLocation,
        toLocation: session.toLocation,
        taskId: session.taskId,
        sessionId: session.id,
        createdBy: userId,
      }));

    if (session.type !== "PICK") {
      await eventRepo.insertEvents(tx, events);
    }

    const newSerialStatus =
      session.type === "PICK"
        ? "PACKED"
        : session.type === "RECEIPT"
          ? "RECEIVED"
          : session.type === "RETURN_SCAN"
            ? "RETURN_IN_TRANSIT"
            : "RETURNED";
    for (const i of items) {
      if (i.scanStatus === "OK") {
        await taskSerialRepo.updateTaskSerialStatus(tx, session.taskId, i.serialId, newSerialStatus as "PACKED" | "RECEIVED" | "RETURN_IN_TRANSIT" | "RETURNED");
        const location = getLocationForTaskSerialStatus(newSerialStatus as "RECEIVED" | "RETURN_IN_TRANSIT" | "RETURNED");
        if (location) await serialStateRepo.upsertLocation(tx, i.serialId, location);
      } else if (session.type === "PICK") {
        await taskSerialRepo.updateTaskSerialStatus(tx, session.taskId, i.serialId, "NOT_FOUND");
        const notFoundLocation = getLocationForTaskSerialStatus("NOT_FOUND");
        if (notFoundLocation) await serialStateRepo.upsertLocation(tx, i.serialId, notFoundLocation);
      }
    }

    await sessionRepo.commitSession(tx, input.sessionId);

    // Revert task status: if no other open session, revert to stable state; else match remaining open session
    const openSessions = await sessionRepo.openSessionsByTaskId(tx, session.taskId);
    const TASK_STATUS_ON_START: Record<string, string> = {
      PICK: "PICKING",
      RECEIPT: "RECEIVING",
      RETURN_SCAN: "RETURNING",
      RETURN_VERIFY: "VERIFYING",
    };
    const TASK_STATUS_ON_COMMIT: Record<string, string> = {
      PICK: "PICKING_PENDING",
      RECEIPT: "COLLECTED",
      RETURN_SCAN: "COLLECTED",
      RETURN_VERIFY: "COLLECTED",
    };
    if (openSessions.length === 0) {
      const revertStatus = TASK_STATUS_ON_COMMIT[session.type];
      if (revertStatus) {
        await taskRepo.updateTaskStatus(tx, session.taskId, revertStatus);
      }
    } else {
      const remaining = openSessions[0];
      const matchStatus = TASK_STATUS_ON_START[remaining.type];
      if (matchStatus) {
        await taskRepo.updateTaskStatus(tx, session.taskId, matchStatus);
      }
    }

    // If this was a return verify, close the return when all its serials are now RETURNED
    if (session.type === "RETURN_VERIFY") {
      const returnId = session.returnId ?? (await returnRepo.returnIdByTaskId(tx, session.taskId));
      if (returnId) {
        await returnService.closeReturnIfFullyVerified(tx, returnId);
      }
    }
  });
}

export async function cancelSession(input: CancelSessionInput) {
  const db = getDb();
  const session = await sessionRepo.sessionById(db, input.sessionId);
  if (!session) throw new NotFoundError("Session", input.sessionId);
  if (session.status !== "OPEN") throw new InvariantViolationError("Session is not open");

  await db.transaction(async (tx) => {
    await sessionRepo.cancelSession(tx, input.sessionId);
  });
}
