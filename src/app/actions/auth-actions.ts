"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/get-session";
import { getDb } from "@/lib/db/client";
import { upsertProfile } from "@/lib/repositories/profile-repository";
import type { Role } from "@/lib/validations";

function isConnectError(e: unknown): boolean {
  if (e instanceof Error && "cause" in e) {
    const c = (e as Error & { cause?: unknown }).cause;
    return (
      (c instanceof Error &&
        ("code" in c ? (c as Error & { code?: string }).code === "UND_ERR_CONNECT_TIMEOUT" : false)) ||
      (typeof c === "object" && c !== null && "code" in c && (c as { code: string }).code === "UND_ERR_CONNECT_TIMEOUT")
    );
  }
  return false;
}

export async function signIn(formData: { email: string; password: string }) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    return { error: error?.message ?? null };
  } catch (e) {
    if (isConnectError(e))
      return { error: "Connection timed out. Check your network and try again." };
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Send a password reset email. Does not reveal whether the email exists.
 * redirectTo should be the full URL of your reset-password page (e.g. origin + "/reset-password").
 */
export async function requestPasswordReset(email: string, redirectTo: string) {
  const trimmed = email?.trim();
  if (!trimmed) return { error: "Email is required" };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    if (isConnectError(e))
      return { error: "Connection timed out. Check your network and try again." };
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  role: Role;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden: only admins can create users." };
  }

  try {
    const admin = createAdminClient();
    const { data, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });
    if (createError) return { error: createError.message };

    const db = getDb();
    await db.transaction(async (tx) => {
      await upsertProfile(tx, data.user.id, input.role);
    });

    return { error: null, userId: data.user.id };
  } catch (e) {
    if (isConnectError(e))
      return { error: "Connection timed out. Check your network and try again." };
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function adminListUsers() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden", users: [] };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) return { error: error.message, users: [] };

    const db = getDb();
    const { profiles } = await import("@/lib/db/schema");
    const profileRows = await db.select().from(profiles);
    const roleMap = new Map(profileRows.map((p) => [p.id, p.role]));

    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      role: roleMap.get(u.id) ?? "SHOOT_USER",
      createdAt: u.created_at,
    }));

    return { error: null, users };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong.", users: [] };
  }
}

export async function adminUpdateUserRole(input: { userId: string; role: Role }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden: only admins can change roles." };
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await upsertProfile(tx, input.userId, input.role);
    });
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function adminDeleteUser(input: { userId: string }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { error: "Forbidden: only admins can delete users." };
  }

  if (input.userId === session.id) {
    return { error: "You cannot delete your own account." };
  }

  try {
    const db = getDb();
    const { teamMembers, profiles, returns } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    await db.transaction(async (tx) => {
      // Reassign returns created by this user to the admin performing the delete,
      // so the profiles FK is satisfied before we delete the profile.
      await tx
        .update(returns)
        .set({ createdBy: session.id })
        .where(eq(returns.createdBy, input.userId));
      await tx.delete(teamMembers).where(eq(teamMembers.userId, input.userId));
      await tx.delete(profiles).where(eq(profiles.id, input.userId));
    });

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(input.userId);
    if (error) return { error: error.message };

    return { error: null };
  } catch (e) {
    if (isConnectError(e))
      return { error: "Connection timed out. Check your network and try again." };
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
