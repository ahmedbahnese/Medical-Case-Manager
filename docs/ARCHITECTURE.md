# هندسة المشروع — Project Architecture

## Overview

BSCH is a full-stack web application organized as a **pnpm monorepo** with the following packages:

```
Medical-Case-Manager/
├── artifacts/
│   ├── api-server/          ← Express.js REST API (Node.js)
│   └── bsch/                ← React frontend (Vite + Tailwind)
├── lib/
│   ├── db/                  ← Drizzle ORM schema (shared)
│   ├── api-zod/             ← Zod validation schemas (shared)
│   └── api-client-react/    ← React Query hooks (shared)
├── docs/                    ← Documentation
├── scripts/                 ← Windows .bat utilities
├── SCHEMA.sql               ← Database schema export
├── Dockerfile               ← Production Docker build
├── docker-compose.yml       ← Docker Compose stack
└── .env.example             ← Environment variable template
```

---

## Technology Stack

| Layer        | Technology              | Purpose |
|-------------|------------------------|---------|
| Frontend    | React 19 + Vite 7      | UI framework |
| UI Library  | shadcn/ui + Tailwind 4 | Components + styling |
| Routing     | Wouter                 | Client-side routing |
| State       | TanStack Query v5      | Server state + caching |
| Backend     | Express.js v5          | REST API |
| ORM         | Drizzle ORM            | Type-safe database access |
| Database    | PostgreSQL 14+         | Persistent storage |
| Validation  | Zod                    | Schema validation (shared) |
| Logging     | Pino                   | Structured JSON logging |

---

## Data Flow

```
Browser
  │
  ├── React (TanStack Query)
  │     └── api-client-react hooks
  │           └── fetch() → HTTP
  │
  └── Express API (/api/*)
        ├── Auth middleware (session cookie)
        ├── Zod validation
        ├── Drizzle ORM
        └── PostgreSQL
```

---

## Authentication Model

- **Cookie-based session**: `bsch_session` HTTP-only cookie
- **Founder session**: cookie value = `"founder"`
- **Named user session**: cookie value = `"user:<name>"`
- **Permissions**: stored in `settings` table under key `named_passwords` as JSON
- **Auth middleware**: applied globally to all `/api/*` routes except `/api/health`, `/api/auth/*`

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Login | Password entry |
| `/dashboard` | Dashboard | Stats + department overview |
| `/departments/:id` | Department | Cases in a department |
| `/add-case` | Add Case | New patient form |
| `/case/:id` | Case Detail | Patient record (editable) |
| `/waiting-cases` | Waiting Cases | Pre-admission queue |
| `/artificial-respiration` | Respiration | Ventilator tracking |
| `/bulk-import` | Bulk Import | Text-based batch entry |
| `/occupancy-report` | Occupancy | Bed occupancy chart |
| `/print-reports` | Daily Report | Shift summary PDF |
| `/incident-report` | Incidents | Mass-casualty reports |
| `/advanced-search` | Search | Patient search |
| `/discharge-history` | History | Discharged patients |
| `/audit-log` | Audit Log | System activity log |
| `/backup` | Backup | Data backup/restore |
| `/settings` | Settings | System configuration |

---

## Shared Libraries

### `@workspace/db`
- Drizzle ORM schema definitions for all tables
- Database connection singleton

### `@workspace/api-zod`
- Zod schemas for all API request/response shapes
- Shared between frontend and backend for type safety

### `@workspace/api-client-react`
- TanStack Query hooks for all API endpoints
- Type-safe wrappers around the Zod schemas

---

## Build Process

```
pnpm install                              # Install all workspace deps
pnpm --filter @workspace/api-server build # Bundle API with esbuild → dist/index.mjs
pnpm --filter @workspace/bsch build       # Bundle frontend with Vite → dist/public/
```

The API server bundle includes all dependencies (esbuild bundles everything).
The frontend build outputs static HTML/JS/CSS that can be served by any static host.

---

## PWA Support

The frontend is configured as a Progressive Web App:
- `public/manifest.json` — app manifest (name, icons, theme)
- `public/sw.js` — service worker (offline static assets, network-first API)
- Installable on Android, iOS, and Windows via browser "Add to Home Screen"

---

## Hospital Network Topology

```
Internet / LAN
      │
      ▼
Windows Server PC (Hospital)
  ├── PostgreSQL (localhost:5432)
  └── Node.js API Server (0.0.0.0:8080)
        └── Serves both API and static frontend

Hospital Computers (any OS, any browser)
  └── http://192.168.x.x:8080
```

All client computers access the system via a web browser — no installation needed.
