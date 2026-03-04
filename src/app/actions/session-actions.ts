"use server";

import { getSession } from "@/lib/auth/get-session";
import { getDb } from "@/lib/db/client";
import * as taskRepo from "@/lib/repositories/task-repository";
import * as sessionService from "@/lib/services/session-service";
import { startSessionSchema, addScanSchema, commitSessionSchema, cancelSessionSchema } from "@/lib/validations";
import { AppError } from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

export async function startSession(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const taskId = formData.get("taskId");
  const type = formData.get("type");
  if (typeof taskId !== "string" || typeof type !== "string") {
    return { success: false, error: "Missing taskId or type" };
  }
  const result = startSessionSchema.safeParse({ taskId, type });
  if (!result.success) return { success: false, error: "Validation failed" };

  const ALLOWED_TYPES: Record<string, string[]> = {
    SHOOT_USER: ["RECEIPT", "RETURN_SCAN"],
    OPS_USER: ["PICK", "RETURN_VERIFY"],
    ADMIN: ["PICK", "RECEIPT", "RETURN_SCAN", "RETURN_VERIFY"],
  };
  const allowed = ALLOWED_TYPES[session.role] ?? [];
  if (!allowed.includes(result.data.type)) {
    return { success: false, error: `Your role (${session.role}) cannot start a ${result.data.type} session` };
  }

  const task = await taskRepo.taskById(getDb(), result.data.taskId);
  if (task?.status === "CLOSED") {
    return { success: false, error: "Cannot start a scan session for a closed task." };
  }

  try {
    const data = await sessionService.startSession(result.data, session.id, session.role);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function addScan(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const sessionId = formData.get("sessionId");
  const serialId = formData.get("serialId");
  if (typeof sessionId !== "string" || typeof serialId !== "string") {
    return { success: false, error: "Missing sessionId or serialId" };
  }
  const result = addScanSchema.safeParse({ sessionId, serialId });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    const data = await sessionService.addScan(result.data, session.id);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function commitSession(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string") return { success: false, error: "Missing sessionId" };
  const result = commitSessionSchema.safeParse({ sessionId });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    await sessionService.commitSession(result.data, session.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function cancelSession(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string") return { success: false, error: "Missing sessionId" };
  const result = cancelSessionSchema.safeParse({ sessionId });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    await sessionService.cancelSession(result.data);
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}
