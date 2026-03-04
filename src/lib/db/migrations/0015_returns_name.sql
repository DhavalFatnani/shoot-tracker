-- Return task name: display name for a return (like task name)
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "name" varchar(256);
