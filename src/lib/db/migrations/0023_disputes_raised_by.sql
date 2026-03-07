-- Who raised the dispute (for dashboard recent activity and audit)
ALTER TABLE "disputes" ADD COLUMN IF NOT EXISTS "raised_by" uuid REFERENCES "profiles"("id");
