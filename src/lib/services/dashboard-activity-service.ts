import { getDb } from "@/lib/db/client";
import * as eventRepo from "@/lib/repositories/event-repository";
import * as disputeRepo from "@/lib/repositories/dispute-repository";
import * as profileRepo from "@/lib/repositories/profile-repository";
import * as taskRepo from "@/lib/repositories/task-repository";
import { formatTaskSerial } from "@/lib/format-serials";
import type { Role } from "@/lib/validations";

export type DashboardActivityItem = {
  id: string;
  type: "Dispatch" | "Return" | "Dispute";
  description: string;
  userDisplayName: string;
  createdAt: Date;
  status: "SUCCESS" | "ACTIVE" | "OPEN" | "RESOLVED";
  taskId: string;
};

function eventTypeToActivityType(eventType: string): "Dispatch" | "Return" {
  if (eventType === "RETURN_TO_WH" || eventType === "RETURN_TO_BUFFER") return "Return";
  return "Dispatch";
}

function eventDescription(
  eventType: string,
  taskSerial: number,
  serialId: string
): string {
  const taskCode = formatTaskSerial(taskSerial);
  switch (eventType) {
    case "PICK":
      return `Task #${taskCode} scanned for dispatch`;
    case "RECEIPT":
      return `Task #${taskCode} received`;
    case "RETURN_TO_WH":
    case "RETURN_TO_BUFFER":
      return `Inbound return verified for Serial #${serialId}`;
    case "MARK_SOLD":
      return `Serial #${serialId} marked sold`;
    case "MARK_LOST":
      return `Serial #${serialId} marked not found`;
    case "REQUEST":
      return `Task #${taskCode} created`;
    case "ADMIN_REVERT":
      return `Serial #${serialId} reverted`;
    default:
      return `Task #${taskCode} · ${eventType}`;
  }
}

export async function getDashboardRecentActivity(
  userRole: Role,
  shootTeamIds: string[],
  opsWarehouseIds: string[],
  limit: number = 10
): Promise<DashboardActivityItem[]> {
  const db = getDb();
  const isAdmin = userRole === "ADMIN";
  const opts = {
    isAdmin,
    shootTeamIds,
    opsWarehouseIds,
    limit: 300,
    offset: 0,
  };

  const visibleTasks = await taskRepo.listTasks(db, opts);
  const taskIds = visibleTasks.map((t) => t.id);
  if (taskIds.length === 0) return [];

  const [eventRows, disputeRows] = await Promise.all([
    eventRepo.listRecentEvents(db, { taskIds, limit: 30, offset: 0 }),
    disputeRepo.listRecentDisputes(db, { taskIds, limit: 30 }),
  ]);

  const taskIdsNeeded = [
    ...new Set([
      ...eventRows.map((e) => e.taskId).filter(Boolean),
      ...disputeRows.map((d) => d.taskId),
    ]),
  ] as string[];
  const userIds = [
    ...new Set([
      ...eventRows.map((e) => e.createdBy),
      ...disputeRows.map((d) => d.raisedBy).filter(Boolean),
    ]),
  ] as string[];

  const [taskRows, displayNames] = await Promise.all([
    taskRepo.tasksByIds(db, taskIdsNeeded),
    profileRepo.getDisplayNamesByIds(db, userIds),
  ]);
  const taskMap = new Map(
    taskIdsNeeded.map((id, i) => [id, taskRows[i]])
  );

  const items: DashboardActivityItem[] = [];

  for (const e of eventRows) {
    const task = e.taskId ? taskMap.get(e.taskId) : null;
    const taskSerial = task?.serial ?? 0;
    items.push({
      id: `event-${e.id}`,
      type: eventTypeToActivityType(e.eventType),
      description: eventDescription(e.eventType, taskSerial, e.serialId),
      userDisplayName: displayNames.get(e.createdBy) ?? "—",
      createdAt: e.createdAt,
      status: "SUCCESS",
      taskId: e.taskId ?? "",
    });
  }

  for (const d of disputeRows) {
    items.push({
      id: `dispute-${d.id}`,
      type: "Dispute",
      description: `New dispute raised: ${d.description?.trim() || d.disputeType}`,
      userDisplayName: d.raisedBy ? (displayNames.get(d.raisedBy) ?? "—") : "—",
      createdAt: d.createdAt,
      status: d.status === "RESOLVED" ? "RESOLVED" : "OPEN",
      taskId: d.taskId,
    });
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, limit);
}
