-- Backfill serial_current_state for existing RECEIVED task_serials so they show in Create Return (Shoot Team Inventory).
-- Before we synced status→location on RECEIPT commit, only task_serials.status was set to RECEIVED; location stayed TRANSIT/WH_.

-- 1) Insert serial_current_state for any RECEIVED serial that has no row yet
INSERT INTO serial_current_state (serial_id, current_location, updated_at)
SELECT ts.serial_id, 'SHOOT_ACTIVE', now()
FROM task_serials ts
WHERE ts.status = 'RECEIVED'
  AND NOT EXISTS (SELECT 1 FROM serial_current_state scs WHERE scs.serial_id = ts.serial_id)
ON CONFLICT (serial_id) DO NOTHING;
--> statement-breakpoint
-- 2) Update existing rows: RECEIVED serials that are not yet at shoot → SHOOT_ACTIVE (leave SHOOT_BUFFER as-is)
UPDATE serial_current_state scs
SET current_location = 'SHOOT_ACTIVE', updated_at = now()
FROM task_serials ts
WHERE ts.serial_id = scs.serial_id
  AND ts.status = 'RECEIVED'
  AND scs.current_location NOT IN ('SHOOT_ACTIVE', 'SHOOT_BUFFER');
