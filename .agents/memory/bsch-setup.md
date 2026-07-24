---
name: BSCH project setup
description: Workflow env vars, key files, routes, and frontend page inventory for BSCH medical case manager
---

## Workflows
- `artifacts/api-server: API Server` — the real running API (port 8080 assigned by env `PORT`)
- `BSCH Frontend` — Vite dev server on port 18429
- The duplicate "API Server" and "artifacts/bsch: web" workflows always fail (port collision) — ignore them

## Authentication
- Login password: `bsch2024` (stored in settings table as `login_password`; fallback: env `FOUNDER_PASSWORD`)
- Settings page password: `@Bahnasy` (hardcoded in settings.tsx frontend only)
- Named passwords: stored as JSON array in settings table key `named_passwords` = `[{name, password, canEdit?, allowedPages?}]`
- Auth: `POST /api/auth/founder-login` — checks founder password first, then named passwords
- Session cookie: `bsch_session` = `"founder"` (main) or `"user:Name"` (named user)
- `GET /api/auth/me` returns `{ isAuthenticated, isFounder, name, canEdit?, allowedPages? }` — named users get permissions from DB

## User Permissions System
- `canEdit`: boolean (default true). False = view-only user, shown "عرض فقط" badge in sidebar.
- `allowedPages`: string[] of allowed hrefs. Empty array = all non-restricted pages allowed.
- Founder-only pages: `/settings`, `/audit-log`, `/backup` — hidden from non-founders in layout.tsx.
- Layout reads permissions from `useGetMe()` cast as `any`.
- Logout button shows a confirmation dialog with reason selector (not instant logout).

## Key API Routes
- `/api/departments` — GET (list), POST (add), PATCH /:id, DELETE /:id
- `/api/settings` — GET (all), POST {password, key, value}
- `/api/auth/founder-login` — POST {password}
- `/api/auth/me` — GET (returns permissions for named users)
- `/api/cases` — GET, POST, PATCH /:id, DELETE /:id
- `/api/waiting-cases` — GET, POST, PATCH /:id
- Body size limit: 5MB (for logo uploads — was 100kb default, caused 413 errors)

## Database Tables (7)
departments, medical_cases, waiting_cases, settings, audit_logs, incident_reports, (users if any)

## Frontend Key Pages
- `settings.tsx` — unlocked with `@Bahnasy`; sections: hospital name, logo, departments CRUD, supervisors, theme, login password, named passwords with permissions
- `case-detail.tsx` — CaseField component is defined OUTSIDE the main component (critical: was inside causing re-mount on each keystroke)
- `print-reports.tsx` — daily report; filteredCases is empty when selectedDeptIds.size === 0
- `occupancy-report.tsx` — has `print-zoom-70` CSS class for 70% print scaling
- `waiting-cases.tsx` — reception tab renamed "قسم الاستقبال"; unified WaitingCaseActionDialog (edit + action in one dialog); sub-filter buttons for reception by careType

## Waiting Cases Features
- Unified dialog: opens from "تعديل / إجراء" button; editable fields + action section (admit to dept OR exit with reason); both support medical report textarea
- Reception sub-filters: الكل / العناية الكبرى / العناية المتوسطة / البيكيو / الداخلي
- Export: Excel, Word, PDF, Print — all respect care-type filter and selection

## PDF Export Coverage
- `department.tsx` ✓ (existing)
- `print-reports.tsx` ✓ (existing)
- `occupancy-report.tsx` ✓ (existing)
- `waiting-cases.tsx` ✓ (existing)
- `discharge-history.tsx` ✓ (added — Word + PDF + Print buttons in header)
- `respiration.tsx` ✓ (added — PDF button alongside existing Excel + Word + Print)

## Lib Files
- `artifacts/bsch/src/lib/pdf-export.ts` — `exportPDF(htmlBody, title, logoBase64?)` opens print window
- `artifacts/bsch/src/lib/word-export.ts` — `exportWordDoc(htmlBody, filename)` — already has RTL
- `artifacts/bsch/src/contexts/settings-context.tsx` — provides `hospital_name`, `logo_base64`, `supervisors`

## Known Pre-existing TypeScript Errors (not blocking runtime)
- TS6305: api-client-react dist not built — Vite handles at runtime via path alias
- TS7006: implicit any in many pages — pre-existing, not caused by batch 2 changes

## Git
- Repo: `github.com/ahmedbahnese/Medical-Case-Manager`
- Push requires fresh token (Personal Access Token) — use `git remote set-url origin https://TOKEN@github.com/...`
- Last commit: `47a909a` — batch 2 features (dept CRUD, named passwords, case edit fix, PDF)
