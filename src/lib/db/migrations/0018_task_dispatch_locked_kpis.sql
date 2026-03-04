-- Lock Received, Sold, Not Found, QC Fail at task dispatch (OPS)
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_received" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_sold" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_not_found" integer;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "dispatch_qc_fail" integer;
