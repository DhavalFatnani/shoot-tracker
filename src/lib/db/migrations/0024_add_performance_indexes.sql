-- Performance indexes for common query patterns.
-- Used by: getReturnWithSessions, returnIdByTaskId, committedSessionsByTaskId,
-- openSessionsByTaskId, listReturnsWithSummary, listReturns, teamsByUserId,
-- teamIdsByUserId, getTeamNamesByUserIds, buffer aging, taskSerialCountsByStatus.

CREATE INDEX IF NOT EXISTS idx_sessions_return_id ON sessions(return_id);
CREATE INDEX IF NOT EXISTS idx_sessions_task_id_status ON sessions(task_id, status);
CREATE INDEX IF NOT EXISTS idx_session_items_session_id ON session_items(session_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_by ON returns(created_by);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_serial_current_state_current_location ON serial_current_state(current_location);
CREATE INDEX IF NOT EXISTS idx_task_serials_task_id_status ON task_serials(task_id, status);
