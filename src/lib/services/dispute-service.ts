import { getDb } from "@/lib/db/client";
import * as disputeRepo from "@/lib/repositories/dispute-repository";
import * as taskRepo from "@/lib/repositories/task-repository";
import * as profileRepo from "@/lib/repositories/profile-repository";
import type { Role } from "@/lib/validations";
import { NotFoundError, ForbiddenError, InvariantViolationError } from "@/lib/errors";

export async function listDisputesByTask(taskId: string) {
  const db = getDb();
  return disputeRepo.disputesByTaskId(db, taskId);
}

/** List disputes for multiple task IDs (for disputes page). Ordered by createdAt desc, with reporter and resolver display names. */
export async function listDisputesForTaskIds(taskIds: string[]) {
  if (taskIds.length === 0) return [];
  const db = getDb();
  const rows = await disputeRepo.disputesByTaskIds(db, taskIds);
  const sorted = [...rows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const raisedByIds = [...new Set(sorted.map((d) => d.raisedBy).filter(Boolean))] as string[];
  const resolvedByIds = [...new Set(sorted.map((d) => d.resolvedBy).filter(Boolean))] as string[];
  const [reporterNames, resolverNames] = await Promise.all([
    profileRepo.getDisplayNamesByIds(db, raisedByIds),
    profileRepo.getDisplayNamesByIds(db, resolvedByIds),
  ]);
  return sorted.map((d) => ({
    ...d,
    reporterDisplayName: d.raisedBy ? (reporterNames.get(d.raisedBy) ?? "—") : "—",
    resolverDisplayName: d.resolvedBy ? (resolverNames.get(d.resolvedBy) ?? "—") : "—",
  }));
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
    return disputeRepo.createDispute(tx, { ...input, raisedBy: userId });
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
