import { eq, inArray } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { serialCurrentState } from "@/lib/db/schema";
import type { Location } from "@/lib/validations";

export async function upsertLocation(tx: Tx, serialId: string, location: Location) {
  await tx
    .insert(serialCurrentState)
    .values({ serialId, currentLocation: location, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: serialCurrentState.serialId,
      set: { currentLocation: location, updatedAt: new Date() },
    });
}

export async function upsertLocations(tx: Tx, serialIds: string[], location: Location) {
  if (serialIds.length === 0) return;
  const now = new Date();
  await tx
    .insert(serialCurrentState)
    .values(serialIds.map((serialId) => ({ serialId, currentLocation: location, updatedAt: now })))
    .onConflictDoUpdate({
      target: serialCurrentState.serialId,
      set: { currentLocation: location, updatedAt: now },
    });
}

export async function getLocation(db: Database | Tx, serialId: string) {
  const rows = await db.select({ currentLocation: serialCurrentState.currentLocation }).from(serialCurrentState).where(eq(serialCurrentState.serialId, serialId)).limit(1);
  return rows[0] ?? null;
}

export function getLocationsForSerials(db: Database | Tx, serialIds: string[]) {
  if (serialIds.length === 0) return Promise.resolve([]);
  return db.select({ serialId: serialCurrentState.serialId, currentLocation: serialCurrentState.currentLocation }).from(serialCurrentState).where(inArray(serialCurrentState.serialId, serialIds));
}

/** Get current location for serials with row lock (for update). Use in tx to prevent duplicate PICK. */
export function getLocationsForSerialsForUpdate(tx: Tx, serialIds: string[]) {
  if (serialIds.length === 0) return Promise.resolve([]);
  return tx
    .select({ serialId: serialCurrentState.serialId, currentLocation: serialCurrentState.currentLocation })
    .from(serialCurrentState)
    .where(inArray(serialCurrentState.serialId, serialIds))
    .for("update");
}
