"use server";

import { getSession } from "@/lib/auth/get-session";
import { getDb } from "@/lib/db/client";
import * as teamRepo from "@/lib/repositories/team-repository";
import * as warehouseRepo from "@/lib/repositories/warehouse-repository";

export type TeamType = "SHOOT" | "OPS";

export async function adminListTeams() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden", teams: [] };
  }
  try {
    const db = getDb();
    const teams = await teamRepo.listAllTeams(db);
    return { error: null, teams };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to list teams", teams: [] };
  }
}

export async function adminListWarehouses() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden", warehouses: [] };
  }
  try {
    const db = getDb();
    const warehouses = await warehouseRepo.listWarehouses(db);
    return { error: null, warehouses };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to list warehouses", warehouses: [] };
  }
}

export async function adminCreateTeam(input: {
  name: string;
  type: TeamType;
  warehouseId?: string | null;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  const name = input.name?.trim();
  if (!name) return { error: "Name is required" };
  try {
    const db = getDb();
    const id = await db.transaction(async (tx) =>
      teamRepo.createTeam(tx, {
        name,
        type: input.type,
        warehouseId: input.warehouseId ?? null,
      })
    );
    return { error: null, teamId: id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create team" };
  }
}

export async function adminUpdateTeam(
  teamId: string,
  input: { name?: string; type?: TeamType; warehouseId?: string | null }
) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  const updates: { name?: string; type?: TeamType; warehouseId?: string | null } = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.type !== undefined) updates.type = input.type;
  if (input.warehouseId !== undefined) updates.warehouseId = input.warehouseId ?? null;
  if (Object.keys(updates).length === 0) return { error: "No updates" };
  try {
    const db = getDb();
    await db.transaction(async (tx) => teamRepo.updateTeam(tx, teamId, updates));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update team" };
  }
}

export async function adminDeleteTeam(teamId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  try {
    const db = getDb();
    await db.transaction(async (tx) => teamRepo.deleteTeam(tx, teamId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete team" };
  }
}

export async function adminListTeamMembers(teamId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden", userIds: [] };
  }
  try {
    const db = getDb();
    const rows = await teamRepo.listTeamMembers(db, teamId);
    return { error: null, userIds: rows.map((r) => r.userId) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to list members", userIds: [] };
  }
}

export async function adminAddTeamMember(teamId: string, userId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  try {
    const db = getDb();
    await db.transaction(async (tx) => teamRepo.addTeamMember(tx, teamId, userId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add member" };
  }
}

export async function adminRemoveTeamMember(teamId: string, userId: string) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  try {
    const db = getDb();
    await db.transaction(async (tx) => teamRepo.removeTeamMember(tx, teamId, userId));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to remove member" };
  }
}

export type UserTeamRow = { id: string; name: string; type: string; warehouseId: string | null; warehouseName: string | null };

/** Get a user's teams with warehouse names (for admin "Assign warehouse / shoot team" UI). */
export async function adminGetUserTeams(userId: string): Promise<{ error: string | null; teams: UserTeamRow[] }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden", teams: [] };
  }
  try {
    const db = getDb();
    const teamIds = await teamRepo.teamIdsByUserId(db, userId);
    if (teamIds.length === 0) return { error: null, teams: [] };
    const teamRows = await teamRepo.teamsByIds(db, teamIds);
    const warehouses = await warehouseRepo.listWarehouses(db);
    const whMap = new Map(warehouses.map((w) => [w.id, w.name]));
    const teams: UserTeamRow[] = (teamRows as { id: string; name: string; type: string; warehouseId: string | null }[]).map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      warehouseId: t.warehouseId,
      warehouseName: t.warehouseId ? whMap.get(t.warehouseId) ?? null : null,
    }));
    return { error: null, teams };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to load teams", teams: [] };
  }
}

/** Set a user's team memberships (replaces all). Used to assign OPS user to warehouses / Shoot user to shoot teams. */
export async function adminSetUserTeams(userId: string, teamIds: string[]): Promise<{ error: string | null }> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden" };
  }
  try {
    const db = getDb();
    await db.transaction(async (tx) => teamRepo.setUserTeams(tx, userId, teamIds));
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update assignments" };
  }
}
