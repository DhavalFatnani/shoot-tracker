import { createClient } from "@/lib/supabase/server";
import { profileById } from "@/lib/repositories/profile-repository";
import { teamIdsByUserId } from "@/lib/repositories/team-repository";
import { teamsByIds } from "@/lib/repositories/team-repository";
import { getDb } from "@/lib/db/client";
import type { Role } from "@/lib/validations";

export interface SessionUser {
  id: string;
  email?: string;
  role: Role;
  teamIds: string[];
  shootTeamIds: string[];
  opsWarehouseIds: string[];
}

export async function getSession(): Promise<SessionUser | null> {
  let user: { id: string; email?: string | null } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
    if (!user) return null;

    const db = getDb();
    const [profile, teamIds] = await Promise.all([
      profileById(db, user.id),
      teamIdsByUserId(db, user.id),
    ]);
    if (!profile) {
      return {
        id: user.id,
        email: user.email ?? undefined,
        role: "SHOOT_USER" as Role,
        teamIds: [],
        shootTeamIds: [],
        opsWarehouseIds: [],
      };
    }

    const teams = await teamsByIds(db, teamIds);
    type TeamRow = { id: string; type: string; warehouseId: string | null };
    const shootTeamIds = (teams as TeamRow[]).filter((t: TeamRow) => t.type === "SHOOT").map((t: TeamRow) => t.id);
    const opsWarehouseIds = (teams as TeamRow[]).filter((t: TeamRow) => t.type === "OPS" && t.warehouseId).map((t: TeamRow) => t.warehouseId!);

    return {
      id: user.id,
      email: user.email ?? undefined,
      role: profile.role as Role,
      teamIds,
      shootTeamIds,
      opsWarehouseIds,
    };
  } catch {
    // Do not return a session with a guessed role — return null so the app redirects to sign-in.
    // Otherwise (e.g. DB or profile fetch failure) every user would appear as Shoot.
    return null;
  }
}
