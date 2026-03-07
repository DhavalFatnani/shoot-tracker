"use server";

import { getSession } from "@/lib/auth/get-session";
import * as serialSyncService from "@/lib/services/serial-sync-service";
import * as serialTimelineService from "@/lib/services/serial-timeline-service";
import { parseInventoryCsv } from "@/lib/csv";
import { importSerialsBodySchema } from "@/lib/validations";
import { ROLE } from "@/lib/validations";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  InvariantViolationError,
  ConcurrentSessionError,
} from "@/lib/errors";

function mapError(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) return e.message;
  return "An error occurred";
}

export async function importSerialsFromCsv(formData: FormData) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.role !== ROLE.ADMIN) return { success: false, error: "Forbidden" };

  const warehouseId = formData.get("warehouseId");
  if (typeof warehouseId !== "string") {
    return { success: false, error: "Missing warehouseId" };
  }

  const csvRaw = formData.get("csv");
  const serialsRaw = formData.get("serials");
  let serials: { serial_id: string; sku: string }[];
  let csvParseErrors: { line: number; message: string }[] = [];

  if (typeof csvRaw === "string" && csvRaw.trim()) {
    const parsed = parseInventoryCsv(csvRaw);
    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      return { success: false, error: "CSV parse failed", details: parsed.errors };
    }
    serials = parsed.rows.map((r) => ({ serial_id: r.serial_id, sku: r.sku }));
    csvParseErrors = parsed.errors;
  } else if (typeof serialsRaw === "string") {
    try {
      serials = JSON.parse(serialsRaw) as { serial_id: string; sku: string }[];
    } catch {
      return { success: false, error: "Invalid serials JSON" };
    }
  } else {
    return { success: false, error: "Missing csv or serials" };
  }

  const result = importSerialsBodySchema.safeParse({ serials, warehouseId });
  if (!result.success) {
    return { success: false, error: "Validation failed", details: result.error.flatten() };
  }

  try {
    const out = await serialSyncService.importSerialsFromCsv(result.data);
    return { success: true, data: { ...out, parseErrors: csvParseErrors } };
  } catch (e) {
    return { success: false, error: mapError(e) };
  }
}

export async function getSerialTimeline(serialId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const { events, serialId: sid, sku, currentLocation } = await serialTimelineService.getSerialTimeline(serialId);
    return { success: true, data: { events, serialId: sid, sku, currentLocation } };
  } catch (e) {
    if (e instanceof ValidationError) return { success: false, error: e.message };
    return { success: false, error: mapError(e) };
  }
}
