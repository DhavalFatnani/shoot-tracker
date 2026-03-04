-- Add new values to task_serial_status enum
ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'PICKED';
ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'QC_FAIL';

-- Add new columns to task_serials table
ALTER TABLE task_serials ADD COLUMN IF NOT EXISTS order_id varchar(256);
ALTER TABLE task_serials ADD COLUMN IF NOT EXISTS qc_fail_reason varchar(512);