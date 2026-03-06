-- Lock Pending action and Packed at task dispatch (shown in "Locked at dispatch")
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_pending_action" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_packed" integer;
