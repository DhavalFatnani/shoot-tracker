"use server";

import { getSession } from "@/lib/auth/get-session";
import { getDb } from "@/lib/db/client";
import * as commentRepo from "@/lib/repositories/task-comment-repository";
import { z } from "zod";
import { AppError } from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

const addCommentSchema = z.object({
  taskId: z.string().uuid(),
  body: z.string().min(1).max(2048),
});

export async function addComment(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const taskId = formData.get("taskId");
  const body = formData.get("body");
  if (typeof taskId !== "string" || typeof body !== "string") {
    return { success: false, error: "Missing taskId or body" };
  }

  const result = addCommentSchema.safeParse({ taskId, body });
  if (!result.success) return { success: false, error: "Comment must be between 1 and 2048 characters" };

  try {
    const db = getDb();
    const id = await commentRepo.insert(db, {
      taskId: result.data.taskId,
      userId: session.id,
      body: result.data.body,
    });
    return { success: true, data: { id } };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function listComments(taskId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const db = getDb();
    const comments = await commentRepo.listByTaskId(db, taskId);
    return { success: true, data: comments };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}
