"use server";

import { getSession } from "@/lib/auth/get-session";
import * as bufferAgingService from "@/lib/services/buffer-aging-service";
import { z } from "zod";
import { AppError } from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

const getBufferListSchema = z.object({
  minDaysInBuffer: z.coerce.number().min(0).optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
});

export async function getBufferAgingList(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const minDaysInBuffer = formData.get("minDaysInBuffer");
  const limit = formData.get("limit");
  const result = getBufferListSchema.safeParse({
    minDaysInBuffer: minDaysInBuffer != null ? Number(minDaysInBuffer) : undefined,
    limit: limit != null ? Number(limit) : undefined,
  });
  if (!result.success) return { success: false, error: "Validation failed" };

  try {
    const data = await bufferAgingService.getBufferAgingList({
      ...result.data,
      role: session.role,
      shootTeamIds: session.shootTeamIds,
      opsWarehouseIds: session.opsWarehouseIds,
    });
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function bulkReturnToWarehouse(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const serialIdsRaw = formData.get("serialIds");
  const warehouseId = formData.get("warehouseId");
  if (typeof serialIdsRaw !== "string" || typeof warehouseId !== "string") {
    return { success: false, error: "Missing serialIds or warehouseId" };
  }
  let serialIds: string[];
  try {
    serialIds = JSON.parse(serialIdsRaw) as string[];
  } catch {
    return { success: false, error: "Invalid serialIds" };
  }

  try {
    const data = await bufferAgingService.bulkReturnToWarehouse(
      serialIds,
      warehouseId,
      session.id,
      session.role
    );
    return { success: true, data };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}
