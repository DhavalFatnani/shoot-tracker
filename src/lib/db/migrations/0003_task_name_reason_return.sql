-- Add shoot_reason enum
DO $$ BEGIN
  CREATE TYPE "shoot_reason" AS ENUM ('INHOUSE_SHOOT', 'AGENCY_SHOOT', 'INFLUENCER_FITS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add name and shoot_reason to tasks
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "name" varchar(256);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "shoot_reason" "shoot_reason" NOT NULL DEFAULT 'INHOUSE_SHOOT';

-- Add returnable and non_return_reason to task_serials
ALTER TABLE "task_serials" ADD COLUMN IF NOT EXISTS "returnable" varchar(1) NOT NULL DEFAULT '1';
ALTER TABLE "task_serials" ADD COLUMN IF NOT EXISTS "non_return_reason" varchar(512);
