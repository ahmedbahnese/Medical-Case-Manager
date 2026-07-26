# هندسة المشروع — Project Architecture

## Overview

BSCH is a full-stack web application organized as a **pnpm monorepo**. It is a self-contained
hospital case management system serving a React SPA from the same Express API server.

```
Medical-Case-Manager/
├── artifacts/
│   ├── api-server/          ← Express.js REST API (Node.js 20+)
│   └── bsch/                ← React 19 frontend (Vite + Tailwind 4)
├── lib/
│   ├── db/                  ← Drizzle ORM schema (shared)
│   ├── api-zod/             ← Zod validation schemas (shared)
│   ├── api-spec/            ← OpenAPI 3.1 spec + orval codegen config
│   └── api-client-react/    ← TanStack Query hooks (generated + shared)
├── docs/                    ← All documentation
├── migrations/              ← Incremental SQL migration files
├── scripts/                 ← Windows .bat utility scripts (scripts/ dir)
├── electron/                ← Optional desktop wrapper (Electron)
├── SCHEMA.sql               ← Complete current database schema
├── Dockerfile               ← Multi-stage production Docker build
├── docker-compose.yml       ← Full stack (app + PostgreSQL)
├── .env.example             ← Environment variable template
├── StartServer.bat          ← Quick-start for Windows
├── StopServer.bat           ← Stop server on Windows
├── Backup.bat               ← Database backup for Windows
├── Restore.bat              ← Database restore for Windows
└── Update.bat               ← Pull + rebuild + update for Windows
```

---

## Technology Stack

| Layer        | Technology              | Version | Purpose |
|-------------|------------------------|---------|---------|
| Frontend    | React                  | 19      | UI framework |
| UI Library  | shadcn/ui + Tailwind   | 4       | Components + styling |
| Routing     | Wouter                 | 3       | Lightweight client-side routing |
| State       | TanStack Query         | 5       | Server state, caching, mutations |
| Backend     | Express.js             | 5       | REST API |
| ORM         | Drizzle ORM            | latest  | Type-safe database access |
| Database    | PostgreSQL             | 14+     | Persistent data store |
| Validation  | Zod                    | 3       | Schema validation (shared) |
| Logging     | Pino                   | 9       | Structured JSON logging |
| Build (API) | esbuild                | 0.27    | Self-contained bundle |
| Build (FE)  | Vite                   | 7       | Frontend bundler |
| Package mgr | pnpm                   | 10+     | Monorepo workspace |

---

## Data Flow

```
Browser
  │
  ├── React 19 (TanStack Query v5)
  │     └── @workspace/api-client-react hooks
  │           └── fetch() ──→ HTTP Cookie (bsch_session)
  │
  └── Express API (port 8080, /api/*)
        ├── Cookie-based auth middleware
        ├── Zod request validation
        ├── Route handlers
        │     └── Drizzle ORM queries
        └── PostgreSQL
```

The API server also serves the built frontend static files (`./public/`), so only a single
port is needed in production.

---

## Authentication Model

| Concept | Detail |
|---------|--------|
| Cookie name | `bsch_session` |
| Founder session | Cookie value = `"founder"` |
| Named user session | Cookie value = `"user:<name>"` |
| Password storage | Stored in `settings` table (key: `login_password` for founder, `named_passwords` for users) |
| Public routes | `/api/healthz`, `/api/auth/*` — no auth required |
| Protected routes | All other `/api/*` routes — session cookie required |
| Founder-only routes | Settings changes, department delete, backup restore |

Named user permissions are stored as JSON under the `named_passwords` settings key:

```typescript
interface PagePermission {
  href: string;
  access: "none" | "view" | "edit";
}
interface NamedPassword {
  name: string;
  password: string;
  pagePermissions: PagePermission[];
}
```

---

## Frontend Pages

| Route | Page | Auth | Description |
|-------|------|------|-------------|
| `/` | Login | Public | Password entry |
| `/dashboard` | Dashboard | User | Stats + department overview |
| `/departments/:id` | Department | User | Cases in a department |
| `/add-case` | Add Case | Edit | New patient form |
| `/case/:id` | Case Detail | User | Patient record (editable) |
| `/waiting-cases` | Waiting Cases | User | Pre-admission queue |
| `/artificial-respiration` | Respiration | User | Ventilator tracking |
| `/bulk-import` | Bulk Import | Edit | Text-based batch entry |
| `/occupancy-report` | Occupancy | User | Bed occupancy chart |
| `/print-reports` | Daily Report | User | Shift summary (print/PDF) |
| `/incident-report` | Incidents | Edit | Mass-casualty reports |
| `/advanced-search` | Search | User | Patient search |
| `/discharge-history` | History | User | Discharged patients |
| `/audit-log` | Audit Log | Founder | System activity log |
| `/backup` | Backup | Founder | Data backup/restore |
| `/settings` | Settings | Founder | System configuration |

---

## Shared Libraries

### `@workspace/db`
- Drizzle ORM table definitions for all 7 tables
- Database connection singleton (reads `DATABASE_URL` from env)
- Re-exports table objects for use in `api-server`

### `@workspace/api-zod`
- Zod schemas for all API request/response shapes
- Shared between frontend and backend — single source of truth for types

### `@workspace/api-client-react`
- TanStack Query hooks for all API endpoints (generated from OpenAPI spec via orval)
- `custom-fetch.ts` — wraps `fetch` with credentials and base URL

### `@workspace/api-spec`
- `openapi.yaml` — OpenAPI 3.1 spec (authoritative API contract)
- `orval.config.ts` — codegen config for `@workspace/api-client-react`

---

## Build Process

```
pnpm install                              # Install all workspace deps

# Development
pnpm --filter @workspace/api-server dev  # API server with hot reload
pnpm --filter @workspace/bsch dev        # Frontend dev server

# Production build
pnpm --filter @workspace/api-server build  # esbuild → dist/index.mjs (self-contained)
BASE_PATH=/ pnpm --filter @workspace/bsch build  # Vite → dist/public/
```

The API bundle is **fully self-contained** (esbuild bundles all node_modules).
No `node_modules/` is needed at runtime — just `dist/index.mjs`.

---

## Database Schema (Summary)

| Table | Purpose |
|-------|---------|
| `departments` | Hospital ward/unit definitions |
| `medical_cases` | Admitted patient records |
| `waiting_cases` | Pre-admission queue |
| `settings` | Key-value system configuration |
| `audit_logs` | Immutable action history |
| `incident_reports` | Mass-casualty event records |
| `backups` | JSON data snapshots |

See `SCHEMA.sql` for the complete schema and `migrations/` for incremental changes.

---

## PWA Support

The frontend is a Progressive Web App:
- `public/manifest.json` — name, icons, theme color
- `public/sw.js` — service worker (static asset caching, network-first API)
- Installable on Android, iOS, and Windows via browser "Add to Home Screen"

---

## Hospital Network Topology

```
                 LAN / Internet
                      │
                      ▼
         Windows Server PC (Hospital)
           ├── PostgreSQL  (localhost:5432)
           └── Node.js API Server  (0.0.0.0:8080)
                 ├── Serves /api/* (REST)
                 └── Serves /* (static React SPA)

Hospital Computers (any OS, any browser)
  └── http://192.168.x.x:8080
      No installation needed — just a browser
```

---

## Security Considerations

- Session cookies are HTTP-only and signed with `SESSION_SECRET`
- No passwords are stored in plaintext — founder password stored as the setting value which should be changed immediately after setup
- CORS is open by default; for production LAN use, restrict in `artifacts/api-server/src/app.ts`
- The settings password (`SETTINGS_PASSWORD`) gates sensitive configuration changes
- Database access is only from the API server — PostgreSQL should not be publicly exposed
