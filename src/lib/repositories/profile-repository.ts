import { eq } from "drizzle-orm";
import type { Role } from "@/lib/validations";
import type { Database, Tx } from "@/lib/db/client";
import { profiles, teams, teamMembers } from "@/lib/db/schema";

export async function profileById(db: Database | Tx, userId: string) {
  const rows = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
  return rows[0] ?? null;
}

/** Fetch profile and all teams for the user in a single DB round-trip. */
export async function profileWithTeamsById(
  db: Database | Tx,
  userId: string
): Promise<{
  profile: typeof profiles.$inferSelect;
  teams: { id: string; type: string; warehouseId: string | null }[];
} | null> {
  const rows = await db
    .select({
      profileId: profiles.id,
      role: profiles.role,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
      teamId: teams.id,
      teamType: teams.type,
      warehouseId: teams.warehouseId,
    })
    .from(profiles)
    .leftJoin(teamMembers, eq(profiles.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(profiles.id, userId));

  if (rows.length === 0) return null;
  const first = rows[0]!;
  const profile = {
    id: first.profileId,
    role: first.role,
    firstName: first.firstName,
    lastName: first.lastName,
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
  };
  const teamMap = new Map<string, { id: string; type: string; warehouseId: string | null }>();
  for (const r of rows) {
    if (r.teamId)
      teamMap.set(r.teamId, { id: r.teamId, type: r.teamType ?? "SHOOT", warehouseId: r.warehouseId ?? null });
  }
  return { profile, teams: [...teamMap.values()] };
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

export async function updateProfileNames(
  db: Database | Tx,
  userId: string,
  data: { firstName?: string | null; lastName?: string | null }
) {
  await db
    .update(profiles)
    .set({
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId));
}
