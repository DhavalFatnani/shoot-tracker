-- Phase 1: Add enum values only (PostgreSQL requires commit before using new values)
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'PICKING_PENDING';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'COLLECTED';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'RECEIVING';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'RETURNING';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'VERIFYING';

ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'RETURN_IN_TRANSIT';

-- Add dispatch_time column (does not use new enum values)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMPTZ;
