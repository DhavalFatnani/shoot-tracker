/**
 * Bootstrap the first admin user.
 * Run: npx tsx scripts/seed-admin.ts
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL from .env
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

const roleEnum = pgEnum("role_enum", ["ADMIN", "SHOOT_USER", "OPS_USER"]);
const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];

if (!EMAIL || !PASSWORD) {
  console.error("Usage: npx tsx scripts/seed-admin.ts <email> <password>");
  process.exit(1);
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log(`Creating admin user: ${EMAIL}`);

  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error("Supabase error:", error.message);
    process.exit(1);
  }

  console.log(`Auth user created: ${data.user.id}`);

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(sql);

  await db
    .insert(profiles)
    .values({ id: data.user.id, role: "ADMIN" })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { role: "ADMIN", updatedAt: new Date() },
    });

  console.log(`Profile set to ADMIN`);
  console.log("Done. You can now sign in at /sign-in");

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
