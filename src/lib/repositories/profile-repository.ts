import { eq } from "drizzle-orm";
import type { Role } from "@/lib/validations";
import type { Database, Tx } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

export async function profileById(db: Database | Tx, userId: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertProfile(tx: Tx, userId: string, role: Role) {
  await tx
    .insert(profiles)
    .values({ id: userId, role })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { role, updatedAt: new Date() },
    });
}
