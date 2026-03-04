-- Add first_name and last_name to profiles for display and editing on profile page
ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "first_name" varchar(128),
  ADD COLUMN IF NOT EXISTS "last_name" varchar(128);
