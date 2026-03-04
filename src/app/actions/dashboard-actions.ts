"use server";

import { getSession } from "@/lib/auth/get-session";
import { getDb } from "@/lib/db/client";
import * as taskRepo from "@/lib/repositories/task-repository";
import * as taskSerialRepo from "@/lib/repositories/task-serial-repository";
import * as disputeRepo from "@/lib/repositories/dispute-repository";
import { getBufferAgingList } from "@/lib/services/buffer-aging-service";

export type DashboardKpis = {
  pickingPending: number;
  packed: number;
  inTransit: number;
  /** Serials still in REQUESTED status across visible tasks (pending pick / pending action KPI). */
  pendingAction: number;
  openDisputes: number;
  bufferCount: number;
};

export async function getDashboardKpis(): Promise<{ success: true; data: DashboardKpis } | { success: false; error: string }> {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const db = getDb();
  const isAdmin = session.role === "ADMIN";
  const opts = {
    isAdmin,
    shootTeamIds: session.shootTeamIds,
    opsWarehouseIds: session.opsWarehouseIds,
    limit: 500,
    offset: 0,
  };

  // Task status enum: OPEN, PICKING_PENDING, PICKING, IN_TRANSIT, ... (no PACKED — that's a serial status)
  const [pickingPending, inPicking, inTransit, allTasks] = await Promise.all([
    taskRepo.listTasks(db, { ...opts, status: "PICKING_PENDING" }),
    taskRepo.listTasks(db, { ...opts, status: "PICKING" }),
    taskRepo.listTasks(db, { ...opts, status: "IN_TRANSIT" }),
    taskRepo.listTasks(db, opts),
  ]);

  const taskIds = allTasks.map((t) => t.id);
  const [openDisputes, pendingAction] = await Promise.all([
    disputeRepo.countOpenDisputesForTaskIds(db, taskIds),
    taskSerialRepo.countRequestedSerialsForTaskIds(db, taskIds),
  ]);

  let bufferCount = 0;
  if (session.role === "SHOOT_USER" || session.role === "ADMIN") {
    const buffer = await getBufferAgingList({
      role: session.role,
      shootTeamIds: session.shootTeamIds,
      opsWarehouseIds: session.opsWarehouseIds,
      limit: 500,
    });
    bufferCount = buffer.items?.length ?? 0;
  }

  return {
    success: true,
    data: {
      pickingPending: pickingPending.length,
      packed: inPicking.length, // "Ready to dispatch" proxy: tasks in PICKING (serials may be packed)
      inTransit: inTransit.length,
      pendingAction,
      openDisputes,
      bufferCount,
    },
  };
}

export async function getOpenDisputesCount(): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const result = await getDashboardKpis();
  if (!result.success) return { success: false, error: result.error };
  return { success: true, count: result.data.openDisputes };
}
