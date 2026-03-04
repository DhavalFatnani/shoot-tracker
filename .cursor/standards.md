# ShootTrack – Standards

## Folder structure boundaries

- **src/lib/db**: Drizzle schema, client, and migrations. No business logic.
- **src/lib/domain**: Types, invariants, balance equations. Pure functions only.
- **src/lib/repositories**: One repository per aggregate; all DB access (read/write) through repos. Transactions are passed in.
- **src/lib/services**: One service per aggregate or flow (e.g. TaskService, SessionService). Services call repos and domain; never expose DB client.
- **src/lib/validations**: Zod schemas, colocated by domain (serial, task, session, etc.). Reused in Server Actions and services.
- **src/lib/errors**: Custom error classes. No business logic.
- **app/**: Next.js App Router routes. Server Actions in `actions/` or colocated with the route. No inline SQL or business rules in components.

## Naming conventions

- **Files**: kebab-case (e.g. `session-service.ts`, `task-serial-repository.ts`).
- **Components / types**: PascalCase.
- **Functions / variables**: camelCase.
- **Database enums**: UPPER_SNAKE (e.g. `OPEN`, `SHOOT_USER`).

## Service layer pattern

- Services receive validated input (e.g. from Zod parse in Server Actions). They orchestrate repositories and domain functions.
- Each mutation runs in a single transaction. Use `db.transaction()` and pass `tx` to all repos involved.
- Services do not catch and swallow errors; let explicit error classes bubble to the action layer for mapping to user messages.

## Repository pattern usage

- Repositories accept an optional transaction client. When provided, use it; otherwise use the default db client (read-only or single-statement use only when appropriate).
- No business logic in repositories—only CRUD and queries. Validation and invariants live in domain/services.

## Error handling structure

- Define explicit classes in `src/lib/errors` (e.g. `ConcurrentSessionError`, `InvariantViolationError`, `NotFoundError`, `ForbiddenError`).
- Server Actions catch these and return structured results or throw with a user-facing message. Never expose internal errors to the client.

## Logging structure

- Use a structured logger. Log at the service boundary: session start/commit, task creation/closure, dispute creation/resolution.
- Do not log PII in plain text; log IDs and action types.

## Testing expectations

- **Vitest**: Unit tests for domain (invariants, balance). Integration tests for services/repos (with test DB or mocks) and for RLS/role behavior.
- **Playwright**: E2E for critical flows (login, create request, session commit, dispute resolve, buffer aging).
- **No skipped tests.** Fix or remove any test that is skipped.

## API design standards

- **Server Actions only for mutations.** GET data via Server Components (async component that calls services/repos) or via Server Actions that return data. No REST API for app-to-app; use actions and RLS.

## Server Action conventions

- Parse input with Zod at the top of the action. Call a single service method. Return `{ success: true, data }` or `{ success: false, error: string }` (or throw with a message). Never put business logic inside the action beyond parsing and delegation.

## Transaction management rules

- One transaction per mutating Server Action. Start transaction, run all repo writes inside it, commit. On any error, rollback and return or throw.
- Session commit must use SELECT FOR UPDATE within the same transaction before inserting events.

## Schema reset (Phase 1.0)

- **Option A only**: A migration drops all ShootTrack objects (RLS policies, triggers, tables in dependency order, enums). The `auth` schema is never touched.
- Run the reset only in dev/staging or with explicit confirmation. Document in this file: schema reset is destructive and must be run only when intended.
