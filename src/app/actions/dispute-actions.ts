"use server";

import { getSession } from "@/lib/auth/get-session";
import * as disputeService from "@/lib/services/dispute-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { AppError } from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

const resolveDisputeSchema = z.object({ disputeId: z.string().uuid() });
const raiseDisputeSchema = z.object({
  taskId: z.string().uuid(),
  serialId: z.string().min(1),
  disputeType: z.string().min(1).max(64),
  description: z.string().max(1024).optional(),
});

export async function listDisputesByTask(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") return { success: false, error: "Missing taskId" };

  try {
    const data = await disputeService.listDisputesByTask(taskId);
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function resolveDispute(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const disputeId = formData.get("disputeId");
  const comment = formData.get("comment");
  const photoUrl = formData.get("photoUrl");
  if (typeof disputeId !== "string") return { success: false, error: "Missing disputeId" };
  const result = resolveDisputeSchema.safeParse({ disputeId });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    await disputeService.resolveDispute(result.data.disputeId, session.id, session.role, {
      comment: typeof comment === "string" ? comment : undefined,
      photoUrl: typeof photoUrl === "string" ? photoUrl : undefined,
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function raiseDispute(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const taskId = formData.get("taskId");
  const serialId = formData.get("serialId");
  const disputeType = formData.get("disputeType");
  const description = formData.get("description");

  const parsed = raiseDisputeSchema.safeParse({
    taskId,
    serialId,
    disputeType,
    description: typeof description === "string" && description.trim() ? description : undefined,
  });
  if (!parsed.success) {
    return { success: false, error: "Validation failed" };
  }

  try {
    const id = await disputeService.createDispute(parsed.data, session.id, session.role);
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function uploadDisputePhoto(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== "ADMIN" && session.role !== "OPS_USER") {
    return { success: false, error: "Only OPS or ADMIN can upload dispute photos" };
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File)) return { success: false, error: "No file provided" };

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `disputes/${crypto.randomUUID()}.${ext}`;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from("dispute-photos")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) return { success: false, error: error.message };

    const { data: urlData } = supabase.storage
      .from("dispute-photos")
      .getPublicUrl(path);

    return { success: true, url: urlData.publicUrl };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}
