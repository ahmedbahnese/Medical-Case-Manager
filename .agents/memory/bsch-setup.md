---
name: BSCH project setup
description: Schema, routes, env vars, and critical mysql→pg migration that was needed to make the codebase consistent.
---

## DB Connection
- `lib/db/src/index.ts` — uses pg (node-postgres) + drizzle-orm/node-postgres
- Supports both `DATABASE_URL` (single URL) and `DB_HOST/PORT/USER/PASSWORD/NAME` vars
- The `DATABASE_URL` takes precedence; individual vars are the fallback

## Schema — IMPORTANT: was mysql-core, now pg-core
- ALL schema files in `lib/db/src/schema/` use **drizzle-orm/pg-core** (`pgTable`, `serial`, `integer`, `text`, `boolean`, `timestamp`)
- Previously they incorrectly used `mysql-core` (mysqlTable, mysqlEnum, int autoincrement) — this was a latent bug
- ENUM columns are stored as **TEXT** (not pgEnum) for flexibility — enum values enforced at app layer via TS const arrays
- `departments.code` and `settings.key` have `.unique()` on the Drizzle field (needed for `onConflictDoUpdate`)

## db-init.ts — PostgreSQL DDL
- Uses plain PostgreSQL SQL (no backticks, no ENGINE=InnoDB, no AUTO_INCREMENT)
- `SERIAL PRIMARY KEY`, `BOOLEAN`, `TIMESTAMPTZ`, `TEXT`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` for migrations (PostgreSQL 9.6+)
- **ENUM→TEXT migration**: early DB setups used pgEnum types; db-init.ts now runs `ALTER TABLE t ALTER COLUMN c TYPE TEXT USING c::TEXT` for all known ENUM columns (wrapped in try/catch — silently ignores if already TEXT)
- Seeding uses `onConflictDoUpdate` (not `onDuplicateKeyUpdate`)

## Auth Route
- Login endpoint: `POST /api/auth/founder-login` (not `/api/auth/login`)
- Password lookup: checks `settings` table key `login_password` first, falls back to `FOUNDER_PASSWORD` env var, then hardcoded default `bsch2024`
- Session cookie: `bsch_session`, HttpOnly, SameSite=Lax, 24h expiry
- Named user login: same endpoint, checks named_passwords JSON in settings table

## Security Headers (added in app.ts)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-XSS-Protection: 1; mode=block`
- `X-Powered-By` removed
- API routes get `Cache-Control: no-store, no-cache, must-revalidate`

## Frontend Pages (from Vite dev server)
Login, Dashboard, Add Case, Department, Waiting Cases, Search, Respiration, Discharge History, Audit Log, Incident Report, Print Reports, Occupancy Report, Settings, Backup, Bulk Import
