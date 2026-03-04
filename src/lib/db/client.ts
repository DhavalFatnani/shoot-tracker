import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> };

function initDb() {
  if (globalForDb._db) return globalForDb._db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Set it in Vercel Environment Variables.");
  }
  // Keep 1 connection per serverless instance to avoid exhausting pooler (MaxClientsInSessionMode).
  // If using Supabase/Neon pooler, prefer the Transaction-mode URL so the pooler can multiplex.
  const client = postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  globalForDb._db = drizzle(client, { schema });
  return globalForDb._db;
}

export const getDb = () => initDb();

export type Database = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
