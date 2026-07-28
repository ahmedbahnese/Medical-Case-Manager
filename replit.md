# BSCH — نظام إدارة الحالات الطبية
# Hospital Case Management System

نظام متكامل لإدارة حالات المرضى في غرف الحضانة والعناية المركزة  
مستشفى الأطفال التخصصي بالبحيرة

---

## Running on Replit

Two services run in parallel:

| Workflow | Command | Port |
|----------|---------|------|
| **BSCH Frontend** | `pnpm --filter @workspace/bsch run dev` | 18429 |
| **API Server** | `pnpm --filter @workspace/api-server run dev` | 8080 |

Both are managed by Replit workflows. After `pnpm install` they start automatically.

**Database:** Replit built-in PostgreSQL — set via `DATABASE_URL` env var (auto-provided).  
**Session:** Requires `SESSION_SECRET` env var (set in Replit Secrets).  
**Login:** Default password is `bsch2024` (stored in `settings` table key `login_password`).

---

## Tech Stack

- **Monorepo:** pnpm workspaces, Node.js 20, TypeScript 5.9
- **Backend:** Express 5 + Drizzle ORM (pg-core / node-postgres)
- **Database:** PostgreSQL 14+ (Replit built-in)
- **Validation:** Zod (v4), drizzle-zod
- **Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui + Wouter
- **PWA:** Service worker, installable on Android/iOS/Windows

---

## Project Structure

```
artifacts/
  api-server/          ← Express 5 backend (REST API)
    src/routes/        ← API route handlers
    src/lib/db-init.ts ← PostgreSQL DDL + seed data
    build.mjs          ← esbuild bundler
  bsch/                ← React + Vite frontend
    src/pages/         ← Login, Dashboard, Patients, Reports, Settings, …
    public/            ← PWA icons, service worker (sw.js), manifest.json
lib/
  db/src/schema/       ← Drizzle schema (pg-core)
  api-spec/            ← OpenAPI spec + codegen
docs/                  ← Installation, deployment, backup, API reference
scripts/               ← Windows .bat utilities (StartServer.bat, etc.)
```

---

## Auth

- Login endpoint: `POST /api/auth/founder-login`
- Password checked against `settings` table key `login_password`, then `FOUNDER_PASSWORD` env var, then default `bsch2024`
- Session cookie: `bsch_session`, HttpOnly, SameSite=Lax, 24h

---

## Hospital LAN / Production

In production (`NODE_ENV=production`), the API server also serves the compiled React SPA — one port (8080) for everything.  
Set `FRONTEND_DIR` to the path of `artifacts/bsch/dist/public`.

---

## User preferences

_لا توجد تفضيلات مسجلة بعد._
