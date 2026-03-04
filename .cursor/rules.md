# ShootTrack – Engineering Rules

Strict rules for all application code. No exceptions.

## Event-sourcing and state

- **All serial movements must create an event entry.** Location changes are recorded in the append-only `events` table only.
- **Serial location must never be mutated directly.** The `serial_current_state` table is a projection maintained by a database trigger on `events`; application code never writes to it.

## Database and transactions

- **All write operations must be wrapped in database transactions.** Use a single transaction per Server Action that mutates data.
- **Use `SELECT FOR UPDATE` during session commit** when locking serials/session scope to prevent concurrent commits.

## Layering

- **No business logic in React components.** Components only render data and call Server Actions; all validation and domain rules live in the service layer.
- **No inline SQL inside UI files.** All data access goes through repositories and services.

## Code quality

- **No TODO placeholders.** Implement fully or do not ship.
- **No commented-out dead code.** Remove it.
- **No `any` types.** Use strict TypeScript everywhere.

## Validation and types

- **All domain validation centralized in service layer.** UI and Server Actions delegate to services.
- **All Zod schemas reusable and colocated properly** (e.g. in `src/lib/validations/`); reuse in both Server Actions and services.
- **Strong typing everywhere.** No magic strings for enums—use TypeScript enums or const objects.

## Errors and tests

- **Use explicit error classes** (e.g. `ConcurrentSessionError`, `InvariantViolationError`, `NotFoundError`, `ForbiddenError`). Map them in Server Actions to user-facing messages.
- **No skipping test cases.** Every test must run; fix or remove flaky tests.
