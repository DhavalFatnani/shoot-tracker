import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { profileById } from "@/lib/repositories/profile-repository";
import { teamIdsByUserId } from "@/lib/repositories/team-repository";
import { teamsByIds } from "@/lib/repositories/team-repository";
import { getDb } from "@/lib/db/client";
import type { Role } from "@/lib/validations";

const LAST_ROLE_COOKIE = "x-last-role";
const VALID_ROLES = ["ADMIN", "OPS_USER", "SHOOT_USER"] as const;

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
    // If we have a user but the first DB/profile fetch failed (e.g. transient error), retry once
    // so the role doesn't randomly switch to Shoot when the DB hiccups.
    if (user) {
      try {
        const db = getDb();
        const [profile, teamIds] = await Promise.all([
          profileById(db, user.id),
          teamIdsByUserId(db, user.id),
        ]);
        if (profile) {
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
        }
      } catch {
        // Retry also failed; use minimal session so user stays in the app.
      }
      // Use last known role from cookie so admins/ops don't appear as Shoot when DB fails
      let role: Role = "SHOOT_USER";
      try {
        const cookieStore = await cookies();
        const lastRole = cookieStore.get(LAST_ROLE_COOKIE)?.value;
        if (lastRole && VALID_ROLES.includes(lastRole as (typeof VALID_ROLES)[number])) {
          role = lastRole as Role;
        }
      } catch {
        // Cookie read failed; keep SHOOT_USER
      }
      return {
        id: user.id,
        email: user.email ?? undefined,
        role,
        teamIds: [],
        shootTeamIds: [],
        opsWarehouseIds: [],
      };
    }
    return null;
  }
}
