import { getDb } from "@/lib/db/client";
import * as eventRepo from "@/lib/repositories/event-repository";
import * as taskRepo from "@/lib/repositories/task-repository";
import * as sessionRepo from "@/lib/repositories/session-repository";
import * as profileRepo from "@/lib/repositories/profile-repository";
import type { Role } from "@/lib/validations";

/** Task-level timeline entry (Created, Picked, Dispatched, etc.). */
export type TaskTimelineEntry = {
  id: string;
  at: Date;
  type: string;
  label: string;
  detail?: string;
  by?: string | null;
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  PICK: "Picked",
  RECEIPT: "Received",
  RETURN_SCAN: "Return scan",
  RETURN_VERIFY: "Return verify",
};

/** Task lifecycle timeline: created, picked, dispatched, received, return scan/verify, closed. */
export async function getTaskTimeline(taskId: string): Promise<TaskTimelineEntry[]> {
  const db = getDb();
  const [task, committed] = await Promise.all([
    taskRepo.taskById(db, taskId),
    sessionRepo.committedSessionsByTaskId(db, taskId),
  ]);
  if (!task) return [];

  const userIds = [
    task.createdBy,
    ...committed.map((s) => s.startedBy),
  ].filter(Boolean);
  const displayNames = await profileRepo.getDisplayNamesByIds(db, userIds);

  const entries: TaskTimelineEntry[] = [];

  if (task.createdAt) {
    entries.push({
      id: `created-${task.id}`,
      at: task.createdAt,
      type: "created",
      label: "Created",
      by: displayNames.get(task.createdBy) ?? null,
    });
  }

  for (const s of committed) {
    if (s.committedAt) {
      const label = SESSION_TYPE_LABELS[s.type] ?? s.type;
      const userName = displayNames.get(s.startedBy) ?? null;
      entries.push({
        id: `session-${s.id}`,
        at: s.committedAt,
        type: s.type.toLowerCase().replace(/_/g, "-"),
        label,
        detail: userName ? `by ${userName}` : undefined,
        by: userName,
      });
    }
  }

  if (task.dispatchTime) {
    entries.push({
      id: `dispatch-${task.id}`,
      at: task.dispatchTime,
      type: "dispatched",
      label: "Dispatched",
      detail: "Sent to shoot",
    });
  }

  if (task.closedAt) {
    entries.push({
      id: `closed-${task.id}`,
      at: task.closedAt,
      type: "closed",
      label: "Closed",
    });
  }

  entries.sort((a, b) => a.at.getTime() - b.at.getTime());
  return entries;
}

export type TaskActivityRow = {
  id: string;
  serialId: string;
  eventType: string;
  fromLocation: string;
  toLocation: string;
  createdBy: string;
  createdAt: Date;
};

export async function getTaskActivity(taskId: string, limit: number = 50): Promise<TaskActivityRow[]> {
  const db = getDb();
  const rows = await eventRepo.getEventsByTaskId(db, taskId, limit);
  return rows.map((r) => ({
    id: r.id,
    serialId: r.serialId,
    eventType: r.eventType,
    fromLocation: r.fromLocation,
    toLocation: r.toLocation,
    createdBy: r.createdBy,
    createdAt: r.createdAt,
  }));
}

export type ActivityLogRow = {
  id: string;
  taskId: string;
  taskSerial: number;
  taskName: string | null;
  serialId: string;
  eventType: string;
  fromLocation: string;
  toLocation: string;
  createdBy: string;
  actorDisplayName: string;
  createdAt: Date;
};

export async function getActivityLogs(
  userRole: Role,
  shootTeamIds: string[],
  opsWarehouseIds: string[],
  options: { limit?: number; offset?: number }
): Promise<ActivityLogRow[]> {
  const db = getDb();
  const limit = Math.min(100, Math.max(1, options.limit ?? 30));
  const offset = Math.max(0, options.offset ?? 0);

  const visibleTasks = await taskRepo.listTasks(db, {
    isAdmin: userRole === "ADMIN",
    shootTeamIds,
    opsWarehouseIds,
    limit: 500,
    offset: 0,
  });
  const taskIds = visibleTasks.map((t) => t.id);
  if (taskIds.length === 0) return [];

  const eventRows = await eventRepo.listRecentEvents(db, { taskIds, limit, offset });
  if (eventRows.length === 0) return [];

  const uniqueTaskIds = [...new Set(eventRows.map((e) => e.taskId).filter(Boolean))] as string[];
  const createdByIds = [...new Set(eventRows.map((e) => e.createdBy))];
  const [taskRows, actorNames] = await Promise.all([
    taskRepo.tasksByIds(db, uniqueTaskIds),
    profileRepo.getDisplayNamesByIds(db, createdByIds),
  ]);
  const taskMap = new Map(uniqueTaskIds.map((id, i) => [id, taskRows[i]]));

  return eventRows.map((e) => {
    const task = e.taskId ? taskMap.get(e.taskId) : null;
    return {
      id: e.id,
      taskId: e.taskId ?? "",
      taskSerial: task?.serial ?? 0,
      taskName: task?.name ?? null,
      serialId: e.serialId,
      eventType: e.eventType,
      fromLocation: e.fromLocation,
      toLocation: e.toLocation,
      createdBy: e.createdBy,
      actorDisplayName: actorNames.get(e.createdBy) ?? "—",
      createdAt: e.createdAt,
    };
  });
}
