/**
 * Runs when the Node.js runtime starts.
 * Note: TZ cannot be set on Vercel (reserved). All date/time display uses IST via
 * src/lib/format-date.ts with explicit timeZone: "Asia/Kolkata" in every formatter.
 */
export async function register() {
  // Reserved on Vercel: process.env.TZ. IST is enforced in format-date.ts instead.
}
