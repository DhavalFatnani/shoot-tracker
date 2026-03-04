-- Return created state: serials stay at shoot until return dispatch
ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'RETURN_CREATED';

-- When shoot team dispatches the return, serials move to transit
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamp with time zone;
