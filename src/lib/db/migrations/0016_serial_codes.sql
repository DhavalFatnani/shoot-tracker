-- Unique serial codes for tasks and returns (display instead of UUIDs)
CREATE SEQUENCE IF NOT EXISTS task_serial_seq;
CREATE SEQUENCE IF NOT EXISTS return_serial_seq;

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "serial" integer;
ALTER TABLE "returns" ADD COLUMN IF NOT EXISTS "serial" integer;

-- Backfill existing rows (order by created_at)
UPDATE "tasks" SET serial = sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM "tasks") AS sub
WHERE "tasks".id = sub.id AND "tasks".serial IS NULL;

UPDATE "returns" SET serial = sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM "returns") AS sub
WHERE "returns".id = sub.id AND "returns".serial IS NULL;

-- Default for new rows
ALTER TABLE "tasks" ALTER COLUMN "serial" SET DEFAULT nextval('task_serial_seq');
ALTER TABLE "returns" ALTER COLUMN "serial" SET DEFAULT nextval('return_serial_seq');

-- Ensure sequences are ahead of existing data
SELECT setval('task_serial_seq', (SELECT COALESCE(max(serial), 0) + 1 FROM "tasks"));
SELECT setval('return_serial_seq', (SELECT COALESCE(max(serial), 0) + 1 FROM "returns"));

ALTER TABLE "tasks" ALTER COLUMN "serial" SET NOT NULL;
ALTER TABLE "returns" ALTER COLUMN "serial" SET NOT NULL;

ALTER TABLE "tasks" ADD CONSTRAINT tasks_serial_unique UNIQUE ("serial");
ALTER TABLE "returns" ADD CONSTRAINT returns_serial_unique UNIQUE ("serial");
