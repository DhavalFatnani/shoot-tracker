-- Add QC_FAIL to location_enum for serials marked as QC fail (distinct from SHOOT_ACTIVE)
ALTER TYPE location_enum ADD VALUE IF NOT EXISTS 'QC_FAIL';
