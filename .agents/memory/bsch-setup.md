---
name: BSCH project setup
description: Workflow env vars, schema additions, routes, and feature implementation notes.
---

## Workflows
- `artifacts/api-server: API Server` — port 8080, manages DB routes. Must be running first.
- `artifacts/bsch: web` — port 18429, BASE_PATH=/. Vite dev server.
- Old workflows "API Server" and "BSCH Frontend" are stale — do NOT start them.

## Database
- PostgreSQL via Replit-managed DATABASE_URL
- Schema: `lib/db/src/schema/` — cases, departments, waiting-cases, settings tables
- 6 departments seeded: ICU-HIGH (cap 10), ICU-MED (cap 6), PICU (cap 12), INC-A (13), INC-B (13), INC-C (17)
- Drizzle ORM — push schema with: `pnpm --filter @workspace/db run push`

## Auth
- Login password: `bsch2024` (env FOUNDER_PASSWORD, but now also reads from settings DB)
- Settings page password: `@Bahnasy` (hardcoded in frontend, SETTINGS_PASSWORD)
- Cookie-based session (no DB), cookie name: `bsch_session`
- Auth route now reads login password from settings table first, then env var fallback

## Key File Locations
- Frontend pages: `artifacts/bsch/src/pages/`
- API routes: `artifacts/api-server/src/routes/`
- DB schema: `lib/db/src/schema/`
- Generated API client: `lib/api-client-react/src/generated/api.ts`
- Zod schemas: `lib/api-zod/src/generated/api.ts`
- Constants/helpers: `artifacts/bsch/src/lib/constants.ts`

## Implemented Features (July 2026)
- Multi-dept checkbox selection in print-reports.tsx and respiration.tsx
- Inline editing of ventilationStartDate, ventilationEndDate, artificialRespiration in daily report and respiration report
- Excel export in both reports
- "طوارئ" tab rename (was "سيرفو (تحويلات)")
- Department capacities updated in DB
- Settings page: login password now saved to DB and used by auth route
- artificialRespiration labels updated: standby → "استاندباي / بوكس", no → "هواء الغرفة"
- getBedType() helper: returns "محضن" for incubator types, "سرير" for ICU/PICU

## Pending
- Smart Import AI — user requested offline AI for text extraction; not implemented
- Occupancy report — user will send screenshot to match
- Better page colors (partially done via constants)

## Schema Notes
- `artificialRespiration` enum values: high_frequency, vent, cpap, standby, no
- Extra fields (mobe, ventilationStartDate, ventilationEndDate, dischargeReason, admissionDate) handled via `extraData = req.body as any` in the update route — they bypass Zod but are stored in DB
- Zod UpdateCaseBody does NOT include mobe/ventilationStart/End — these go through extraData path
- TypeScript errors in bsch (implicit any, TS6305) are PRE-EXISTING — the app runs fine via Vite/esbuild

## API Patterns
- apiGet/apiPost/apiPatch/apiDelete in `artifacts/bsch/src/lib/api.ts`
- Orval-generated hooks: `useGetCases`, `useGetDepartments`, `useUpdateCase`, etc.
- Both can be used; plain apiGet is useful when hooks have type restrictions
