import { getDb } from "@/lib/db/client";
import * as eventRepo from "@/lib/repositories/event-repository";
import * as serialRegistryRepo from "@/lib/repositories/serial-registry-repository";
import { serialIdSchema } from "@/lib/validations";
import { ValidationError } from "@/lib/errors";

export async function getSerialTimeline(serialId: string, limit: number = 100) {
  const parsed = serialIdSchema.safeParse(serialId);
  if (!parsed.success) {
    throw new ValidationError("Invalid serial ID", parsed.error.flatten());
  }
  const db = getDb();
  const [events, registry] = await Promise.all([
    eventRepo.getEventsBySerialId(db, parsed.data, limit),
    serialRegistryRepo.serialRegistryById(db, parsed.data),
  ]);
  return { events, serialId: parsed.data, sku: registry?.sku ?? "" };
}
