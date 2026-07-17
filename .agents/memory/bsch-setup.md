---
name: BSCH project setup
description: Key setup details, workflow env vars, schema changes, and current feature inventory for the BSCH medical case management system.
---

## Workflows
- Active API server: `artifacts/api-server: API Server` on port 8080
- Active frontend: `artifacts/bsch: web` on port 18429
- Old manual "API Server" and "BSCH Frontend" workflows are stale duplicates — do NOT start them

## Auth
- Login password: `bsch2024` (env `FOUNDER_PASSWORD`; also stored in settings DB; auth route reads DB first)
- Settings page password: `@Bahnasy` (hardcoded in settings.tsx)

## DB Changes Made
- 6 departments seeded: ICU-HIGH (cap 10), ICU-MED (cap 6), PICU (cap 12), INC-A (13), INC-B (13), INC-C (17)
- `artificial_respiration` enum extended: now `high_frequency, vent, cpap, hfnc, standby, box, no` (7 values)
- `supervisors` key added to settings table

## Key Architecture
- Frontend: `artifacts/bsch/src/` — React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui
- Backend: `artifacts/api-server/src/` — Express 5 + TypeScript
- DB ORM: `lib/db/src/schema/` — Drizzle + PostgreSQL
- API hooks: `lib/api-client-react/src/generated/` (Orval)
- Zod schemas: `lib/api-zod/src/generated/api.ts` (Orval-generated)
- API helpers: `artifacts/bsch/src/lib/api.ts`

## Settings Context
- `artifacts/bsch/src/contexts/settings-context.tsx` — loads from `/api/settings?_=timestamp` (cache-busted)
- Exports: `useAppSettings()` → settings object, `useSettingsActions()` → { refreshSettings }
- Wrapped in App.tsx via `<SettingsProvider>`
- Also caches to localStorage for instant display on page load

## Constants
- `artifacts/bsch/src/lib/constants.ts` — LABELS object, INCUBATOR_TYPES (includes picu), getBedType(), deptTypeToCaseType(), formatDateAr(), calcStayLabel()
- INCUBATOR_TYPES includes: incubator_a, incubator_b, incubator_c, picu, incubator

## Respiration Options (7 total, in order)
high_frequency (تردد عالي HFO) | vent (فنت VENT) | cpap (سباب CPAP) | standby (استاندباي) | hfnc (HFNC) | box (بوكس / نيزل كانيولا) | no (هواء الغرفة)

## Add Case Fix
- `incubator_a/b/c` departmentType must be mapped to `"incubator"` caseType before submitting
- Fixed in add-case.tsx with inline ternary: `deptType.startsWith("incubator") ? "incubator" : deptType`
- Also available as `deptTypeToCaseType()` in constants.ts

## Pages Inventory
- dashboard.tsx — dept grid directly (6 dept cards), KPI strip, group dialog
- department.tsx — case table + Excel/Word/print export, print header
- add-case.tsx — multi-step form, fixed caseType mapping
- case-detail.tsx — inline editing with UpdateCaseBody
- waiting-cases.tsx — full-page redesign: inline add form, table view, admit creates active case
- respiration.tsx — ventilation report with inline editing, Excel export, font slider
- print-reports.tsx — multi-dept report, inline mode editing, Excel export
- occupancy-report.tsx — 3-shift bayan: columns = الأقسام|الإجمالي|مشغول|فارغ|استاندباي|معطل, activeShift logic, waiting cases per shift
- settings.tsx — hospital name, logo, supervisors list, login pw, theme color picker

## API Notes
- `UpdateCaseBody` does NOT include mobe/ventilationStartDate/ventilationEndDate/dischargeReason — these go via `extraData = req.body as any`
- `/api/settings` GET returns all non-password keys; POST requires `password: "@Bahnasy"` + key + value
- `/api/cases` accepts filter `{ status: "active" }` as query param

## Outstanding (not yet done)
- Point 9 (Smart Import with offline LLM): very large feature, not implemented
