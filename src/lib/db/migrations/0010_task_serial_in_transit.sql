-- Add IN_TRANSIT to task_serial_status (required for DISPATCHED -> IN_TRANSIT migration)
ALTER TYPE task_serial_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';
