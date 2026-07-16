---
name: BSCH project setup
description: Key decisions and env requirements for the BSCH medical case management system.
---

## Workflow env vars (critical)
Both workflows must inject env vars manually — the artifact-managed workflows are not registered in the platform:
- **API Server**: `PORT=8080 DATABASE_URL=${DATABASE_URL:-placeholder} pnpm --filter @workspace/api-server run dev`
- **BSCH Frontend**: `PORT=18429 BASE_PATH=/ pnpm --filter @workspace/bsch run dev`

**Why:** The vite.config.ts and api-server/src/index.ts both throw if PORT or BASE_PATH are missing. The artifact.toml has the ports but they aren't injected automatically without the platform artifact registration.

## DB schema additions (require migration push)
New fields added to `medical_cases`: `mobe`, `ventilationStartDate`, `ventilationEndDate`, `dischargeReason` (enum).
New tables: `settings` (key/value), `incident_reports` (with casesJson TEXT), `audit_logs`.
Schema has been pushed. Run `pnpm --filter @workspace/db run push` again after any schema changes.

## Seeded departments (already in DB)
6 departments seeded: ICU-HIGH, ICU-MED, PICU, INC-A, INC-B, INC-C (Arabic names).

## Founder login password
Default: `bsch2024` (env var `FOUNDER_PASSWORD`, falls back to `bsch2024`). NOT `@Bahnasy` — that is for the settings page only.

## Settings password
Default settings page password: `@Bahnasy` (hardcoded in frontend and checked server-side).

## New API routes (plain fetch, not codegen)
Settings: GET/POST `/api/settings`, POST `/api/settings/verify-password`
Incident reports: CRUD `/api/incident-reports`
Audit logs: GET `/api/audit-logs`
Backups: GET/POST `/api/backups`, GET `/api/backups/:id/download`, DELETE `/api/backups/:id`

**Why:** New endpoints use plain `fetch` via `artifacts/bsch/src/lib/api.ts` to avoid needing a codegen re-run.

## TypeScript notes
- `typeof fn()` in type positions is invalid — use a named interface instead.
- Many `TS7006` implicit-any errors in pages are non-blocking (Vite resolves from source).
- `TS6305` project-reference errors are non-blocking for dev (Vite doesn't need pre-built .d.ts).
