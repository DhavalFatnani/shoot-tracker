-- Indexes on events for common queries
CREATE INDEX IF NOT EXISTS events_serial_id_idx ON public.events (serial_id);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events (created_at);
CREATE INDEX IF NOT EXISTS events_session_id_idx ON public.events (session_id);

--> statement-breakpoint
-- Projection trigger: on events INSERT, upsert serial_current_state
CREATE OR REPLACE FUNCTION public.sync_serial_current_state()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.serial_current_state (serial_id, current_location, updated_at)
  VALUES (NEW.serial_id, NEW.to_location, NOW())
  ON CONFLICT (serial_id) DO UPDATE SET
    current_location = EXCLUDED.current_location,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--> statement-breakpoint
DROP TRIGGER IF EXISTS sync_serial_current_state_on_event ON public.events;
CREATE TRIGGER sync_serial_current_state_on_event
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.sync_serial_current_state();

--> statement-breakpoint
-- RLS: enable on all tables
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.serial_current_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_serials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
-- profiles: users read/update own row
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

--> statement-breakpoint
-- warehouses: read by authenticated; write by service (admin uses service role in app)
CREATE POLICY warehouses_select_authenticated ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY warehouses_all_service ON public.warehouses FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint
-- teams / team_members: read by authenticated
CREATE POLICY teams_select_authenticated ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY teams_all_service ON public.teams FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY team_members_select_authenticated ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY team_members_all_service ON public.team_members FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint
-- serial_registry, serial_current_state: read by authenticated (app enforces team visibility in service layer)
CREATE POLICY serial_registry_select_authenticated ON public.serial_registry FOR SELECT TO authenticated USING (true);
CREATE POLICY serial_registry_all_service ON public.serial_registry FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY serial_current_state_select_authenticated ON public.serial_current_state FOR SELECT TO authenticated USING (true);
CREATE POLICY serial_current_state_all_service ON public.serial_current_state FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint
-- events: insert by authenticated; read by authenticated (service layer filters by team)
CREATE POLICY events_select_authenticated ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY events_insert_authenticated ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY events_all_service ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint
-- tasks: admin sees all; shoot/ops see by team (via policy using profiles + team_members)
CREATE POLICY tasks_select_admin ON public.tasks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid() AND tm.team_id = tasks.shoot_team_id)
    OR EXISTS (SELECT 1 FROM public.team_members tm JOIN public.teams t ON t.id = tm.team_id WHERE tm.user_id = auth.uid() AND t.type = 'OPS' AND t.warehouse_id = tasks.warehouse_id)
  );
CREATE POLICY tasks_all_service ON public.tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint
-- task_serials, sessions, session_items: same visibility as parent task
CREATE POLICY task_serials_select_via_task ON public.task_serials FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tasks tk JOIN public.profiles p ON p.id = auth.uid() WHERE tk.id = task_serials.task_id AND (p.role = 'ADMIN' OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid() AND (tm.team_id = tk.shoot_team_id OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = tm.team_id AND t.type = 'OPS' AND t.warehouse_id = tk.warehouse_id)))))
  );
CREATE POLICY task_serials_all_service ON public.task_serials FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY sessions_select_via_task ON public.sessions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tasks tk JOIN public.profiles p ON p.id = auth.uid() WHERE tk.id = sessions.task_id AND (p.role = 'ADMIN' OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid() AND (tm.team_id = tk.shoot_team_id OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = tm.team_id AND t.type = 'OPS' AND t.warehouse_id = tk.warehouse_id)))))
  );
CREATE POLICY sessions_all_service ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY session_items_select_via_session ON public.session_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sessions s JOIN public.tasks tk ON tk.id = s.task_id JOIN public.profiles p ON p.id = auth.uid() WHERE s.id = session_items.session_id AND (p.role = 'ADMIN' OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid() AND (tm.team_id = tk.shoot_team_id OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = tm.team_id AND t.type = 'OPS' AND t.warehouse_id = tk.warehouse_id)))))
  );
CREATE POLICY session_items_all_service ON public.session_items FOR ALL TO service_role USING (true) WITH CHECK (true);

--> statement-breakpoint
-- disputes: same as tasks
CREATE POLICY disputes_select_via_task ON public.disputes FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tasks tk JOIN public.profiles p ON p.id = auth.uid() WHERE tk.id = disputes.task_id AND (p.role = 'ADMIN' OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.user_id = auth.uid() AND (tm.team_id = tk.shoot_team_id OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = tm.team_id AND t.type = 'OPS' AND t.warehouse_id = tk.warehouse_id)))))
  );
CREATE POLICY disputes_all_service ON public.disputes FOR ALL TO service_role USING (true) WITH CHECK (true);
