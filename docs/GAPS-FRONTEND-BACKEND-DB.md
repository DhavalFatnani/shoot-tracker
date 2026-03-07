# Gaps: Frontend, Backend, and Database

This document lists identified gaps and inconsistencies between the web app’s frontend, backend (actions, services, repositories), and database (schema, enums, storage). **All listed gaps have been addressed** as of the last update.

---

## 1. Dispute status: REJECTED not in DB — **FIXED**

| Layer   | State |
|--------|--------|
| **DB** | `dispute_status` enum has only `OPEN`, `RESOLVED`. |
| **Frontend** | Previously showed `REJECTED` in status colors and table; **removed**. UI now only uses OPEN and RESOLVED to match the DB. |

**Fix:** Removed `REJECTED` from `src/lib/status-colors.ts` (DISPUTE_STATUS_COLORS, DISPUTE_STATUS_LABELS) and from `statusDotClass` in `disputes-table.tsx`.

---

## 2. Dispute “Resolved by” not shown in UI — **FIXED**

| Layer   | State |
|--------|--------|
| **Backend** | `dispute-service.listDisputesForTaskIds` now returns `resolverDisplayName` (via `getDisplayNamesByIds` for `resolvedBy`). |
| **Frontend** | Disputes table shows “Resolved by {name}” under the status pill for RESOLVED disputes. |

**Fix:** Added resolver display names in dispute service; extended `DisputeWithReporter` type; display “Resolved by” in the Status column for resolved rows.

---

## 3. Activity logs: “Who” (createdBy) not displayed — **FIXED**

| Layer   | State |
|--------|--------|
| **Backend** | `activity-service.getActivityLogs` now returns `actorDisplayName` for each row (via `getDisplayNamesByIds` for `createdBy`). |
| **Frontend** | Activity page table has an “Actor” column showing the display name. |

**Fix:** Added `actorDisplayName` to `ActivityLogRow` and activity service; added “Actor” column to the activity logs table.

---

## 4. Supabase storage bucket for dispute photos — **FIXED**

| Layer   | State |
|--------|--------|
| **Docs** | Required bucket `dispute-photos` is documented in `docs/SUPABASE-STORAGE.md`. README references it. |

**Fix:** Created `docs/SUPABASE-STORAGE.md` with bucket name, purpose, and setup notes. Added a step in README “Getting Started” pointing to that doc.

---

## 5. Disputes page: Filter and KPI placeholders — **FIXED**

| Area | State |
|------|--------|
| **KPI cards** | Removed “Awaiting Info” and “Processing” (hardcoded 0). Only “Critical (Open)” and “Resolved (24H)” are shown. |
| **Filter** | Replaced placeholder Filter button with a **Status** dropdown: All, Open, Resolved (client-side filter on existing list). |

**Fix:** Two KPI cards removed; status filter dropdown added; Sort-by kept.

---

## 6. Task list: “Received” vs backend

No structural gap. Backend and frontend are aligned.

---

## 7. Schema and referential integrity — **FIXED**

| Item | State |
|------|--------|
| **tasks.createdBy** | Documented in schema as soft reference (no FK) to allow historical records if profile is removed. |
| **disputes.resolvedBy** | Documented in schema as soft reference (no FK). |

**Fix:** Added JSDoc comments in `src/lib/db/schema/tables.ts` for `tasks.createdBy` and `disputes.resolvedBy`.

---

## 8–10. Task status, Serial timeline, Dashboard KPIs

No gaps. These areas remain aligned across frontend, backend, and DB.

---

## Summary

| # | Gap | Status |
|---|-----|--------|
| 1 | Dispute REJECTED in UI only | **Fixed** — removed from frontend |
| 2 | Resolved by not shown | **Fixed** — service + table |
| 3 | Activity “who” not shown | **Fixed** — Actor column |
| 4 | dispute-photos bucket | **Fixed** — documented |
| 5 | Disputes Filter / placeholder KPIs | **Fixed** — status filter, 2 KPIs only |
| 6 | Task list receivedTaskIds | Aligned |
| 7 | createdBy/resolvedBy no FK | **Fixed** — documented as soft refs |
| 8–10 | Task status, Serial timeline, Dashboard | Aligned |

---

*Last updated after implementing all fixes. Re-validate after schema or API changes.*
