import { getDb } from "@/lib/db/client";
import * as disputeRepo from "@/lib/repositories/dispute-repository";
import * as taskRepo from "@/lib/repositories/task-repository";
import type { Role } from "@/lib/validations";
import { NotFoundError, ForbiddenError, InvariantViolationError } from "@/lib/errors";

export async function listDisputesByTask(taskId: string) {
  const db = getDb();
  return disputeRepo.disputesByTaskId(db, taskId);
}

export async function createDispute(
  input: { taskId: string; serialId: string; disputeType: string; description?: string },
  userId: string,
  userRole: Role
) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can create disputes");
  }
  const db = getDb();
  const task = await taskRepo.taskById(db, input.taskId);
  if (!task) throw new NotFoundError("Task", input.taskId);
  if (task.status === "CLOSED") {
    throw new InvariantViolationError("Cannot raise a dispute on a closed task.");
  }
  const id = await db.transaction(async (tx) => {
    return disputeRepo.createDispute(tx, input);
  });
  return id;
}

export async function resolveDispute(
  disputeId: string,
  userId: string,
  userRole: Role,
  options?: { comment?: string; photoUrl?: string }
) {
  if (userRole !== "ADMIN" && userRole !== "OPS_USER") {
    throw new ForbiddenError("Only OPS or ADMIN can resolve disputes");
  }
  const db = getDb();
  const dispute = await disputeRepo.disputeById(db, disputeId);
  if (!dispute) throw new NotFoundError("Dispute", disputeId);
  await db.transaction(async (tx) => {
    await disputeRepo.resolveDispute(tx, disputeId, {
      resolutionComment: options?.comment,
      resolutionPhotoUrl: options?.photoUrl,
      resolvedBy: userId,
    });
  });
}
