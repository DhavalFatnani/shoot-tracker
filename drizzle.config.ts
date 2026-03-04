import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// For DB servers with self-signed certs (e.g. local/dev), set DATABASE_SSL_ACCEPT_SELF_SIGNED=1
const sslConfig =
  process.env.DATABASE_SSL_ACCEPT_SELF_SIGNED === "1"
    ? { rejectUnauthorized: false }
    : undefined;

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ...(sslConfig && { ssl: sslConfig }),
  },
});
