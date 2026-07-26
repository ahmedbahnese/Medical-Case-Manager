---
name: BSCH project setup
description: Workflow env vars, key files, routes, frontend page inventory, and Replit-independence changes for BSCH medical case manager
---

## Workflows
- `artifacts/api-server: API Server` — the active API workflow (port 8080 via PORT env var)
- `artifacts/bsch: web` — the active frontend workflow (port 18429 via PORT env var)
- Old "API Server" and "BSCH Frontend" workflows are failed/inactive — ignore them.
**Why:** The platform registered artifact-managed workflows which supersede the old imported ones.
**How to apply:** Always restart/check the artifact-managed workflows, never the legacy ones.

## Replit Independence (completed)
- Removed `@replit/connectors-sdk` from root `package.json`
- Removed `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-runtime-error-modal` from `pnpm-workspace.yaml` catalog and from `artifacts/mockup-sandbox/package.json` + `vite.config.ts`
- Removed all platform-specific esbuild/rollup/tailwind/lightningcss overrides from `pnpm-workspace.yaml` (those were linux-x64-only and broke cross-platform builds)
- Project now builds cleanly on any platform with `pnpm install && pnpm run build:prod`
**Why:** User requested the project be fully independent from Replit for use outside (VS Code, Windows).

## Access Control
- Founder session: cookie `bsch_session=founder`
- Named user session: cookie `bsch_session=user:<name>`
- `GET /api/auth/me` returns `{ isAuthenticated, isFounder, name, pagePermissions? }` for named users
  - If user has `pagePermissions: [{ href, access: "none"|"view"|"edit" }]`, use that
  - Otherwise falls back to legacy `{ canEdit, allowedPages }`
- Founder-only pages: settings, audit log, backup (`founderOnly: true` in NAV_GROUPS)

## Named Password / User Structure (settings.tsx)
```typescript
interface PagePermission { href: string; access: "none" | "view" | "edit"; }
interface NamedPassword {
  name: string; password: string;
  canEdit?: boolean; allowedPages?: string[]; // legacy
  pagePermissions?: PagePermission[];          // new format
}
```
- Stored as JSON in `named_passwords` setting key
- `migrateUserToPagePerms(np)` converts legacy → new format
- Settings page has inline edit form with per-page permission 3-button grid

## Department Report Fields
- `reportFieldsJson: string` (JSON array of field keys) stored per department
- 11 available fields: fileNumber, age, diagnosis, admissionDate, stayDays, status, artificialRespiration, mobe, parentName, parentPhone, nationalId
- `getActiveFields(rfJson?)` in department.tsx returns field descriptors with getText renderers
- buildDeptHtml and exportToExcelFormatted both accept optional `reportFieldsJson` param

## Waiting Cases File Upload
- `medicalReportData` (base64) and `medicalReportName` must be explicitly passed in `AddForm.handleSubmit`
- View report button appears in CasesTable row when `c.medicalReportData` truthy
- Admission dialog groups departments: compatible ones (by careType) shown first with label

## TS Error Baseline
- TS6305 (api-client-react dist not built) and TS7006 (implicit any) are pre-existing — do not fix unless asked.

## Production Artifacts Generated
- `SCHEMA.sql` — complete current schema (updated with all columns including report_fields_json, medical_report*)
- `migrations/001_initial_schema.sql` — full initial schema
- `migrations/002_add_report_fields_to_departments.sql`
- `migrations/003_add_medical_report_to_waiting_cases.sql`
- `StartServer.bat`, `StopServer.bat`, `Backup.bat`, `Restore.bat`, `Update.bat` — root-level Windows scripts
- `Dockerfile` — multi-stage, non-root user, healthcheck
- `docker-compose.yml` — requires DB_PASSWORD and SESSION_SECRET from .env
- `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/INSTALL.md`, `docs/DEPLOYMENT.md`, `docs/UPDATE.md`, `docs/BACKUP.md` — all updated
- `.env.example` — complete with all vars including SETTINGS_PASSWORD, LOG_LEVEL, DB_* for bat scripts
