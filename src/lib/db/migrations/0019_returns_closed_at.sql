-- Close return when all serials have been verified (RETURN_VERIFY)
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;
