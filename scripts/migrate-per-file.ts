/**
 * Custom migration runner that runs each migration file in its own transaction.
 * Required for PostgreSQL enum migrations: new enum values must be committed before use.
 *
 * Usage: npx tsx scripts/migrate-per-file.ts
 * For self-signed DB certs: DATABASE_SSL_ACCEPT_SELF_SIGNED=1 npx tsx scripts/migrate-per-file.ts
 * (Or NODE_TLS_REJECT_UNAUTHORIZED=0 as a fallback.)
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const MIGRATIONS_DIR = path.join(process.cwd(), "src/lib/db/migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta/_journal.json");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8"));
  // For self-signed DB certs: pg may read sslmode from the URL and ignore our ssl object.
  // So we use NODE_TLS_REJECT_UNAUTHORIZED=0 when DATABASE_SSL_ACCEPT_SELF_SIGNED=1 so TLS verification is skipped.
  const acceptSelfSigned = process.env.DATABASE_SSL_ACCEPT_SELF_SIGNED === "1";
  if (acceptSelfSigned && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    console.warn("DATABASE_SSL_ACCEPT_SELF_SIGNED=1: setting NODE_TLS_REJECT_UNAUTHORIZED=0 for this run (pg may ignore ssl.rejectUnauthorized from URL).");
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
  const clientConfig: { connectionString: string; ssl?: { rejectUnauthorized: false } } = { connectionString };
  if (acceptSelfSigned) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }
  const client = new Client(clientConfig);
  await client.connect();

  try {
    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    const { rows } = await client.query(
      "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1"
    );
    const lastApplied = rows[0] ? Number(rows[0].created_at) : 0;

    for (const entry of journal.entries) {
      const migrationPath = path.join(MIGRATIONS_DIR, `${entry.tag}.sql`);
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
      }

      const sql = fs.readFileSync(migrationPath, "utf-8");
      const folderMillis = entry.when;

      if (folderMillis <= lastApplied) {
        console.log(`  [skip] ${entry.tag} (already applied)`);
        continue;
      }

      console.log(`  [run] ${entry.tag}...`);
      await client.query("BEGIN");
      try {
        const statements = sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements) {
          if (stmt.trim()) await client.query(stmt);
        }
        const hash = crypto.createHash("sha256").update(sql).digest("hex");
        await client.query(
          'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)',
          [hash, folderMillis]
        );
        await client.query("COMMIT");
        console.log(`  [ok] ${entry.tag}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }

    console.log("Migrations complete.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
