import { and, eq, inArray } from "drizzle-orm";
import type { Database, Tx } from "@/lib/db/client";
import { teams, teamMembers } from "@/lib/db/schema";

export type TeamType = "SHOOT" | "OPS";

export async function teamById(db: Database | Tx, teamId: string) {
  const rows = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return rows[0] ?? null;
}

export function teamsByUserId(db: Database | Tx, userId: string) {
  return db
    .select()
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(eq(teamMembers.userId, userId));
}

export function teamIdsByUserId(db: Database | Tx, userId: string): Promise<string[]> {
  return db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId))
    .then((rows) => rows.map((r) => r.teamId));
}

export function teamsByIds(db: Database | Tx, teamIds: string[]) {
  if (teamIds.length === 0) return Promise.resolve([]);
  return db.select().from(teams).where(inArray(teams.id, teamIds));
}

export function listAllTeams(db: Database | Tx) {
  return db.select().from(teams);
}

export async function createTeam(
  tx: Tx,
  row: { name: string; type: TeamType; warehouseId?: string | null }
) {
  const [inserted] = await tx
    .insert(teams)
    .values({
      name: row.name,
      type: row.type,
      warehouseId: row.warehouseId ?? null,
    })
    .returning({ id: teams.id });
  return inserted!.id;
}

export async function updateTeam(
  tx: Tx,
  teamId: string,
  updates: { name?: string; type?: TeamType; warehouseId?: string | null }
) {
  await tx.update(teams).set(updates).where(eq(teams.id, teamId));
}

export async function deleteTeam(tx: Tx, teamId: string) {
  await tx.delete(teams).where(eq(teams.id, teamId));
}

export async function listTeamMembers(db: Database | Tx, teamId: string) {
  const rows = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
  return rows;
}

export async function addTeamMember(tx: Tx, teamId: string, userId: string) {
  await tx.insert(teamMembers).values({ teamId, userId }).onConflictDoNothing();
}

export async function removeTeamMember(tx: Tx, teamId: string, userId: string) {
  await tx
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}

/** Replace all team memberships for a user (used by admin to assign warehouses/shoot teams). */
export async function setUserTeams(tx: Tx, userId: string, teamIds: string[]) {
  await tx.delete(teamMembers).where(eq(teamMembers.userId, userId));
  for (const teamId of teamIds) {
    await tx.insert(teamMembers).values({ teamId, userId }).onConflictDoNothing();
  }
}

/** Batch: for each userId return list of team names (for admin user list). */
export async function getTeamNamesByUserIds(
  db: Database | Tx,
  userIds: string[]
): Promise<Record<string, string[]>> {
  if (userIds.length === 0) return {};
  const members = await db
    .select({ userId: teamMembers.userId, teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(inArray(teamMembers.userId, userIds));
  const teamIds = [...new Set(members.map((m) => m.teamId))];
  const teamRows = teamIds.length > 0 ? await db.select().from(teams).where(inArray(teams.id, teamIds)) : [];
  const teamNameMap = new Map(teamRows.map((t) => [t.id, t.name]));
  const result: Record<string, string[]> = {};
  for (const uid of userIds) result[uid] = [];
  for (const m of members) {
    const name = teamNameMap.get(m.teamId);
    if (name) result[m.userId].push(name);
  }
  return result;
}
