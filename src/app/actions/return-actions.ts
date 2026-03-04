"use server";

import { getSession } from "@/lib/auth/get-session";
import * as returnService from "@/lib/services/return-service";
import * as returnRepo from "@/lib/repositories/return-repository";
import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

export async function getShootInventory() {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role === "OPS_USER") {
    return { success: false, error: "OPS users cannot access shoot team inventory" };
  }

  try {
    const data = await returnService.getShootTeamInventory(
      session.role,
      session.shootTeamIds
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function commitReturn(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role === "OPS_USER") {
    return { success: false, error: "OPS users cannot create returns" };
  }

  const serialIdsRaw = formData.get("serialIds");
  if (typeof serialIdsRaw !== "string") {
    return { success: false, error: "Missing serialIds" };
  }

  let serialIds: string[];
  try {
    serialIds = JSON.parse(serialIdsRaw) as string[];
  } catch {
    return { success: false, error: "Invalid serialIds format" };
  }

  if (!Array.isArray(serialIds) || serialIds.length === 0) {
    return { success: false, error: "No serials provided" };
  }

  try {
    const result = await returnService.createReturn(
      serialIds,
      session.id,
      session.role,
      session.shootTeamIds
    );
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function listReturns(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const limit = Math.min(50, Math.max(1, Number(formData.get("limit")) || 20));
  const offset = Math.max(0, Number(formData.get("offset")) || 0);

  try {
    const db = getDb();
    // OPS and ADMIN see all returns; SHOOT_USER sees their own + returns for their team's tasks (e.g. admin-created)
    const createdBy = session.role === "SHOOT_USER" ? session.id : undefined;
    const shootTeamIds = session.role === "SHOOT_USER" && session.shootTeamIds.length > 0 ? session.shootTeamIds : undefined;
    const rows = await returnRepo.listReturnsWithSummary(db, { createdBy, shootTeamIds, limit, offset });
    return { success: true, data: rows };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function getReturn(returnId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const db = getDb();
    const data = await returnRepo.getReturnWithSessions(db, returnId);
    if (!data) return { success: false, error: "Return not found" };
    // OPS and ADMIN can view any return; SHOOT_USER if they created it or return involves their team
    if (session.role === "SHOOT_USER") {
      const isCreator = data.createdBy === session.id;
      const isTeamReturn = data.involvedShootTeamIds.some((tid) => session.shootTeamIds.includes(tid));
      if (!isCreator && !isTeamReturn) return { success: false, error: "Forbidden" };
    }
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function dispatchReturn(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role === "OPS_USER") {
    return { success: false, error: "Only shoot team or admin can dispatch returns" };
  }

  const returnId = formData.get("returnId");
  if (typeof returnId !== "string" || !returnId) {
    return { success: false, error: "Missing returnId" };
  }

  try {
    const db = getDb();
    const data = await returnRepo.getReturnWithSessions(db, returnId);
    if (!data) return { success: false, error: "Return not found" };
    if (session.role === "SHOOT_USER") {
      const isCreator = data.createdBy === session.id;
      const isTeamReturn = data.involvedShootTeamIds.some((tid) => session.shootTeamIds.includes(tid));
      if (!isCreator && !isTeamReturn) return { success: false, error: "Only the creator or admin can dispatch this return" };
    }
    const result = await returnService.dispatchReturn(
      returnId,
      session.id,
      session.role,
      data.createdBy
    );
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}
