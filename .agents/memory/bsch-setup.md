---
name: BSCH project setup
description: Stack overview, database config, and key architectural decisions for the BSCH Hospital Case Management System.
---

# BSCH project setup

## Database
- **MySQL 8** (converted from PostgreSQL)
- Drizzle ORM with `drizzle-orm/mysql-core` — all schema files in `lib/db/src/schema/`
- Connection via `mysql2` using individual env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- mysql2 is **bundled by esbuild** (not external) — works in the Electron packaged app
- Replit's DATABASE_URL is PostgreSQL and is **ignored** by the app — MySQL creds must be set separately

## Key MySQL migration patterns
- No `.returning()` in MySQL — routes use `$returningId()` + SELECT, or pre-check then mutate
- No `ilike` — use `like` (MySQL LIKE is case-insensitive for utf8mb4_unicode_ci)
- `addColumnSafe()` helper in db-init.ts catches errno 1060 (duplicate column) for migrations
- ENUM extension uses `MODIFY COLUMN` in a try/catch (idempotent, safe to re-run)
- Seed data uses `.onDuplicateKeyUpdate({ set: { id: sql\`id\` } })` as no-op on conflict

## Department types (lib/db/src/schema/departments.ts)
- `intensive_care_high`, `intensive_care_medium`, `picu`, `incubator_a`, `incubator_b`, `incubator_c`, `internal`
- "الداخلي" (internal) added — seeded always via onDuplicateKeyUpdate with code "INTERNAL"

## Waiting cases care types (lib/db/src/schema/waiting-cases.ts)
- `intensive_care_high`, `intensive_care_medium`, `picu`, `incubator`, `internal`

## Discharge reasons (lib/db/src/schema/cases.ts)
- `improved`, `request`, `transferred`, `death`, `internal_transfer`
- `transfer_destination` TEXT column added — stores hospital name (external) or dept name (internal)
- `internal_transfer` = case moved to another dept within same hospital; new case created in target dept

## Discharge / Transfer dialog (artifacts/bsch/src/pages/case-detail.tsx)
- 4 mode buttons: تحسن | تحويل | خروج حسب الطلب | وفاة
- "تحويل" expands to: داخل المستشفى (dept dropdown) | خارج المستشفى (hospital name input)
- Internal transfer: creates new active case in target dept + discharges current with reason=internal_transfer
- External transfer: discharges with reason=transferred + saves hospital name in transferDestination

## Electron (Windows Desktop)
- `electron/main.js` — spawns api-server as child process, shows splash while waiting
- DB config read from `%APPDATA%\BSCH\bsch.config.json` (created by user on first run)
- Builds: NSIS installer + Portable via electron-builder in `electron/dist-electron/`
- Build sequence: `pnpm build:prod` → `cd electron && npm run build-win`

## Build notes
- TypeScript typecheck requires `pnpm run typecheck:libs` first to build lib declarations
- esbuild bundles produce: `artifacts/api-server/dist/index.mjs` (2.8MB, includes mysql2)
- Frontend: `artifacts/bsch/dist/public/` (served by Express in production)
