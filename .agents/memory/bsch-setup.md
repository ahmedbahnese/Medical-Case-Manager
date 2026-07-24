---
name: BSCH project setup
description: Workflow env vars, key files, routes, and frontend page inventory for BSCH medical case manager
---

## Workflows
- `API Server` — the real running API (port 8080 assigned by env `PORT`)
- `BSCH Frontend` — Vite dev server on port 18429
- The artifact-prefixed workflow names are not registered in this imported project; restart the two names above.
**Why:** The imported project exposes legacy workflow names even though artifact manifests exist.
**How to apply:** Use the exact visible workflow names for restarts and health checks.

## Access Control
- The imported project has authenticated sessions and named-user page permissions; private access details are intentionally omitted from this note.
- Founder-only pages include settings, audit log, and backup.

## Key API Routes
- `/api/departments` — GET (list), POST (add), PATCH /:id, DELETE /:id
- `/api/settings` — GET and protected update endpoint
- `/api/auth/*` — authentication and session endpoints
- `/api/auth/me` — GET (returns permissions for named users)
- `/api/cases` — GET, POST, PATCH /:id, DELETE /:id
- `/api/waiting-cases` — GET, POST, PATCH /:id
- Body size limit: 5MB (for logo uploads — was 100kb default, caused 413 errors)

## Database Tables (7)
departments, medical_cases, waiting_cases, settings, audit_logs, incident_reports, (users if any)

## Frontend Key Pages
- `settings.tsx` — sections: hospital name, logo, departments CRUD, supervisors, theme, and named-user permissions
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
