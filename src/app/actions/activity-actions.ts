"use server";

import { getSession } from "@/lib/auth/get-session";
import * as activityService from "@/lib/services/activity-service";
import { AppError } from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

export async function getTaskActivity(taskId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const data = await activityService.getTaskActivity(taskId, 80);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

/** Task-level timeline: created, picked, dispatched, received, return scan/verify, closed. */
export async function getTaskTimeline(taskId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const data = await activityService.getTaskTimeline(taskId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function listActivityLogs(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const limit = Math.min(100, Math.max(1, Number(formData.get("limit")) || 30));
  const offset = Math.max(0, Number(formData.get("offset")) || 0);

  try {
    const data = await activityService.getActivityLogs(
      session.role,
      session.shootTeamIds,
      session.opsWarehouseIds,
      { limit, offset }
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}
