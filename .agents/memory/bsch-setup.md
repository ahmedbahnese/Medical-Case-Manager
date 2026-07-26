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

## Key MySQL migration patterns
- No `.returning()` in MySQL — routes use `$returningId()` + SELECT, or pre-check then mutate
- No `ilike` — use `like` (MySQL LIKE is case-insensitive for utf8mb4_unicode_ci)
- `addColumnSafe()` helper in db-init.ts catches errno 1060 (duplicate column) for migrations
- Seed data uses `.onDuplicateKeyUpdate({ set: { id: sql\`id\` } })` as no-op on conflict

## Electron (Windows Desktop)
- `electron/main.js` — spawns api-server as child process, shows splash while waiting
- DB config read from `%APPDATA%\BSCH\bsch.config.json` (created by user on first run)
- Builds: NSIS installer + Portable via electron-builder in `electron/dist-electron/`
- Build sequence: `pnpm build:prod` → `cd electron && npm run build-win`

## Build notes
- TypeScript typecheck requires `pnpm run typecheck:libs` first to build lib declarations
- esbuild bundles produce: `artifacts/api-server/dist/index.mjs` (2.8MB, includes mysql2)
- Frontend: `artifacts/bsch/dist/public/` (served by Express in production)
