-- DESTRUCTIVE: Drops all ShootTrack objects. Do NOT run in production.
-- Run only in dev/staging or with explicit confirmation.
-- Keeps auth schema untouched.

-- 1. Drop trigger(s) and function (projection)
-- Trigger may be named differently (e.g. by Supabase/Drizzle)
DROP TRIGGER IF EXISTS sync_serial_current_state_on_event ON public.events;
DROP TRIGGER IF EXISTS tr_events_sync_serial_current_state ON public.events;
DROP FUNCTION IF EXISTS public.sync_serial_current_state() CASCADE;

-- 2. Drop tables (dependency order: drop tables that reference others first)
-- session_items -> sessions; events -> sessions,tasks; serial_current_state may -> sessions; disputes -> tasks
DROP TABLE IF EXISTS public.session_items;
DROP TABLE IF EXISTS public.events;
DROP TABLE IF EXISTS public.serial_current_state;
DROP TABLE IF EXISTS public.disputes;
DROP TABLE IF EXISTS public.sessions;
DROP TABLE IF EXISTS public.task_serials;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.team_members;
DROP TABLE IF EXISTS public.teams;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.serial_registry;
DROP TABLE IF EXISTS public.warehouses;

-- 3. Drop enums
DROP TYPE IF EXISTS public.dispute_status;
DROP TYPE IF EXISTS public.event_type;
DROP TYPE IF EXISTS public.session_status;
DROP TYPE IF EXISTS public.session_type;
DROP TYPE IF EXISTS public.task_serial_status;
DROP TYPE IF EXISTS public.task_status;
DROP TYPE IF EXISTS public.location_enum;
DROP TYPE IF EXISTS public.role_enum;
DROP TYPE IF EXISTS public.team_type;
