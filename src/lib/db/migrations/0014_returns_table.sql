-- Return tasks: created by shoot team; OPS does return verify per task
CREATE TABLE IF NOT EXISTS "returns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "created_by" uuid NOT NULL REFERENCES "profiles"("id"),
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "return_id" uuid REFERENCES "returns"("id");
