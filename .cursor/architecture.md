# ShootTrack – Architecture

## Event-sourcing design

- **Source of truth**: The append-only `events` table. Every serial movement is recorded as an event (event_type, from_location, to_location, task_id, session_id, created_by, created_at).
- **No updates or deletes on events.** Corrections are expressed as new events or via disputes, not by mutating history.

## Projection table (serial_current_state) strategy

- **serial_current_state** is a read-optimized projection: one row per serial with `current_location` and `updated_at`.
- **Maintained by a database trigger** on `events` INSERT: for each new event, UPSERT `serial_current_state` setting `current_location = to_location`, `updated_at = now()`.
- **Application code never writes to serial_current_state.** All location updates flow through event insertion.

## Session lifecycle

- **States**: OPEN → COMMITTED or CANCELLED. Sessions do not transition back to OPEN.
- **One session type per session** (PICK, RECEIPT, RETURN_SCAN, RETURN_VERIFY). Type and from_location/to_location are fixed at session start.
- **Commit**: In a single transaction, validate (e.g. serial not in another open session), lock relevant rows with SELECT FOR UPDATE, insert events, update task_serials and session status. Rollback fully on any error.

## Task balance equations

- **R = D + S + N** (requested = dispatched + sold + not_found).
- **D = RET + B** (dispatched = returned + buffered).
- **Closure blocked** until both equations are satisfied. Only OPS or ADMIN can close a task.

## Dispute generation rules

- When **RETURN_VERIFY** detects a mismatch (e.g. expected vs actual count or serial), create a dispute (task_id, serial_id, dispute_type, description, status OPEN).
- Task closure is blocked while any dispute for that task is OPEN. Resolve disputes (OPS/ADMIN) before closing.

## Multi-warehouse return handling

- Return destination is the **warehouse linked to the OPS team** performing the return. Task is tied to a warehouse; return sessions send serials to that warehouse (TRANSIT → WH_ for that warehouse).
- Document which warehouse_id applies per task/team in service logic and RLS.

## Concurrency locking strategy

- A **serial cannot be in two OPEN sessions** at once. Before adding a serial to a session or committing, check that it is not already in another open session.
- **Session commit**: In one transaction, use SELECT FOR UPDATE on the serials (or session_items) involved, re-validate “serial not in another open session,” then insert events and update state. Rollback on failure.

## RLS enforcement model

- **Row-level security is enabled on all ShootTrack tables.** Policies use `auth.uid()` and join to `profiles` (role) and `team_members` (team membership).
- **ADMIN**: sees all rows (tasks, teams, disputes, etc.).
- **SHOOT_USER**: sees tasks where `shoot_team_id` is in the user’s teams; same for related task_serials, sessions, disputes.
- **OPS_USER**: sees tasks where `warehouse_id` is in the user’s OPS teams’ warehouse_id; same for related data.
- Never trust frontend role or team state; every Server Action must enforce role/team server-side (via RLS and/or explicit checks).

## Role and team visibility boundaries

- **profiles.role**: ADMIN | SHOOT_USER | OPS_USER. Stored in `public.profiles`, linked to `auth.users(id)`.
- **teams**: type = SHOOT or OPS; OPS teams may have warehouse_id.
- **team_members**: user_id, team_id. Users see only data scoped to their teams (and admins see all).

## Separation of domain / service / UI layers

- **Domain**: Pure invariants and balance logic (e.g. `canAddSerialToRequest`, `isTaskBalanceSatisfied`). No DB or HTTP.
- **Service**: Orchestration, transactions, calls to repositories and domain. One service per aggregate/flow (TaskService, SessionService, etc.).
- **UI**: Presentation only. Fetches data via Server Components or Server Actions; no business logic or SQL.
