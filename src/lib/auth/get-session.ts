import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { profileWithTeamsById } from "@/lib/repositories/profile-repository";
import { getDb } from "@/lib/db/client";
import type { Role } from "@/lib/validations";

const LAST_ROLE_COOKIE = "x-last-role";
const VALID_ROLES = ["ADMIN", "OPS_USER", "SHOOT_USER"] as const;

export interface SessionUser {
  id: string;
  email?: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  teamIds: string[];
  shootTeamIds: string[];
  opsWarehouseIds: string[];
}

function buildSessionFromProfileWithTeams(
  user: { id: string; email?: string | null },
  data: { profile: { role: string; firstName?: string | null; lastName?: string | null }; teams: { id: string; type: string; warehouseId: string | null }[] }
): SessionUser {
  const { profile, teams } = data;
  const teamIds = teams.map((t) => t.id);
  const shootTeamIds = teams.filter((t) => t.type === "SHOOT").map((t) => t.id);
  const opsWarehouseIds = teams.filter((t) => t.type === "OPS" && t.warehouseId).map((t) => t.warehouseId!);
  return {
    id: user.id,
    email: user.email ?? undefined,
    role: profile.role as Role,
    firstName: profile.firstName ?? undefined,
    lastName: profile.lastName ?? undefined,
    teamIds,
    shootTeamIds,
    opsWarehouseIds,
  };
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  let user: { id: string; email?: string | null } | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ?? null;
    if (!user) return null;

    const db = getDb();
    const profileData = await profileWithTeamsById(db, user.id);
    if (!profileData) {
      return {
        id: user.id,
        email: user.email ?? undefined,
        role: "SHOOT_USER" as Role,
        firstName: undefined,
        lastName: undefined,
        teamIds: [],
        shootTeamIds: [],
        opsWarehouseIds: [],
      };
    }
    return buildSessionFromProfileWithTeams(user, profileData);
  } catch {
    if (user) {
      try {
        const db = getDb();
        const profileData = await profileWithTeamsById(db, user.id);
        if (profileData) return buildSessionFromProfileWithTeams(user, profileData);
      } catch {
        // Retry failed
      }
      let role: Role = "SHOOT_USER";
      try {
        const cookieStore = await cookies();
        const lastRole = cookieStore.get(LAST_ROLE_COOKIE)?.value;
        if (lastRole && VALID_ROLES.includes(lastRole as (typeof VALID_ROLES)[number])) {
          role = lastRole as Role;
        }
      } catch {
        // ignore
      }
      return {
        id: user.id,
        email: user.email ?? undefined,
        role,
        firstName: undefined,
        lastName: undefined,
        teamIds: [],
        shootTeamIds: [],
        opsWarehouseIds: [],
      };
    }
    return null;
  }
});
