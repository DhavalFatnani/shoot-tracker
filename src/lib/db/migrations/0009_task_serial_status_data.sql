-- Phase 2: Data migration and defaults (runs in separate transaction after enum values are committed)
-- Migrate existing task status: OPEN -> PICKING_PENDING
UPDATE tasks SET status = 'PICKING_PENDING'::task_status WHERE status = 'OPEN';

-- Migrate existing task_serials: PICKED -> PACKED
UPDATE task_serials SET status = 'PACKED'::task_serial_status WHERE status = 'PICKED';

-- Migrate DISPATCHED -> IN_TRANSIT or RECEIVED based on serial_current_state
UPDATE task_serials ts
SET status = (CASE
  WHEN scs.current_location IN ('SHOOT_ACTIVE', 'SHOOT_BUFFER') THEN 'RECEIVED'
  ELSE 'IN_TRANSIT'
END)::task_serial_status
FROM serial_current_state scs
WHERE ts.serial_id = scs.serial_id AND ts.status = 'DISPATCHED';

-- Any remaining DISPATCHED (no serial_current_state) -> IN_TRANSIT
UPDATE task_serials SET status = 'IN_TRANSIT'::task_serial_status WHERE status = 'DISPATCHED';

-- Migrate BUFFERED -> RETURN_IN_TRANSIT
UPDATE task_serials SET status = 'RETURN_IN_TRANSIT'::task_serial_status WHERE status = 'BUFFERED';

-- Set default task status to PICKING_PENDING for new tasks
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'PICKING_PENDING'::task_status;
