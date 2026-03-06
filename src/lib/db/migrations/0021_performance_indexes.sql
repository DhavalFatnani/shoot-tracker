-- Indexes to speed up common query patterns (list tasks, disputes by task, task serials by serial_id)
CREATE INDEX IF NOT EXISTS idx_disputes_task_id ON disputes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_serials_serial_id ON task_serials(serial_id);
CREATE INDEX IF NOT EXISTS idx_tasks_warehouse_id ON tasks(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_tasks_shoot_team_id ON tasks(shoot_team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
