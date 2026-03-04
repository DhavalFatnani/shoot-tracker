import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const globalForDb = globalThis as unknown as { _db?: ReturnType<typeof drizzle> };

if (!globalForDb._db) {
  const client = postgres(connectionString, {
    max: 10,
    prepare: false,
  });
  globalForDb._db = drizzle(client, { schema });
}

export const getDb = () => globalForDb._db!;

export type Database = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
