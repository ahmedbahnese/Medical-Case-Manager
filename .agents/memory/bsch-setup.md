---
name: BSCH project setup
description: Key facts about the BSCH medical case management monorepo — build env, schema, routes, and page inventory.
---

## Build

- Frontend (`artifacts/bsch`): Vite; requires `PORT` AND `BASE_PATH` env vars at build time:
  `PORT=18429 BASE_PATH=/ pnpm --filter @workspace/bsch run build`
- API server (`artifacts/api-server`): esbuild via `build.mjs`, no extra env vars needed.
- `api-client-react` has no `build` script — it's used as a source reference via project references.

## Managed workflows

- `artifacts/bsch: web` — the correct frontend workflow (port 18429)
- `API Server` — the correct API workflow (port 8080)
- The old `BSCH Frontend` and `artifacts/api-server: API Server` workflows fail with port conflicts; ignore them.

## Word export

All Word export uses the HTML-blob-as-.doc trick (opens in Word natively for Arabic RTL).
Shared utility: `artifacts/bsch/src/lib/word-export.ts` → `exportWordDoc(htmlBody, filename)`.

## Print / CSS

- `.no-print` hides elements on print; `.print-area hidden` becomes visible on print.
- Main interactive cards (table views in respiration.tsx etc.) must have `no-print` so print uses only the dedicated `print-area` div.
- Sidebar dark-navy theme: `--sidebar: 222 47% 13%` with light text `--sidebar-foreground: 210 40% 92%`.

## Page inventory

| Page | Key state |
|---|---|
| `dashboard.tsx` | KPI strip has `no-print`; GroupCasesDialog shows 10-col table (no status) |
| `waiting-cases.tsx` | EditWaitingCaseDialog, selection checkboxes, Word export; servo fix via `useQueryClient().invalidateQueries()` |
| `respiration.tsx` | Main Card has `no-print`; Word + Excel export |
| `occupancy-report.tsx` | Word export button added |
| `print-reports.tsx` | `includeServo`/`includeReception` state controls waiting list in print + Word |
| `bulk-import.tsx` | Parser in `artifacts/api-server/src/routes/cases.ts` → `parseArabicCasesText` |

## Smart import parser fixes (cases.ts)

- Arabic digit prefixes (١٢٣): use `[\u0660-\u0669\d]+` in strip regex
- HFNC separated from CPAP: `respHFNC = /\bHFNC\b/i`, maps to `"hfnc"`
- Same-line age: `inlinAgeMatch = /^(.{3,40})[،,]\s*(.{2,20})$/` splits name + age

## GitHub remote

`origin` = `https://github.com/ahmedbahnese/Medical-Case-Manager`. Push requires user to configure GitHub credentials — auto-push from agent timed out.

## Pre-existing TS errors

`TS6305` (api-client-react not built) and several `TS7006`/`TS2345` in respiration.tsx, print-reports.tsx exist in the original code; Vite dev mode ignores them. Production build succeeds despite them.
