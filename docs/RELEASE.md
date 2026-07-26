# BSCH — Production Release Summary
## Version 1.0.0 — July 2026

---

## Release Overview

This is the **initial production release** of BSCH (نظام إدارة الحالات الطبية) as a self-contained Windows desktop application for مستشفى الأطفال التخصصي بالبحيرة.

The release converts an originally web-only hospital case management system into a fully packaged Windows Electron application with a locally bundled Express API server and MySQL database backend.

---

## What's Included

### Core Features

| Feature | Status |
|---------|--------|
| Patient case management (CRUD) | ✅ Complete |
| Department management (ICU, PICU, Incubators, NICU) | ✅ Complete |
| Waiting list (Servo / Reception queues) | ✅ Complete |
| Admission workflow (waiting → admitted) | ✅ Complete |
| Discharge workflow with reason tracking | ✅ Complete |
| Dashboard with KPI cards and occupancy stats | ✅ Complete |
| Daily shift reports (printable) | ✅ Complete |
| Occupancy report (printable, with hospital logo) | ✅ Complete |
| Bulk patient import (CSV/multi-entry) | ✅ Complete |
| Patient search (name, file number, national ID) | ✅ Complete |
| Incident (mass-casualty) reports | ✅ Complete |
| Discharge history with 24h readmission flag | ✅ Complete |
| Database backup & restore (JSON + in-app) | ✅ Complete |
| System settings (hospital name, logo, passwords) | ✅ Complete |
| Audit log (all user actions recorded) | ✅ Complete |
| Arabic RTL full interface | ✅ Complete |
| Windows Electron desktop app (NSIS + Portable) | ✅ Complete |
| LAN access from hospital workstations | ✅ Complete |

---

## Technical Highlights

### Database Migration: PostgreSQL → MySQL

- All 7 Drizzle schema files converted from `pg-core` to `mysql-core`
- MySQL-specific patterns applied throughout:
  - `INT AUTO_INCREMENT` replaces PostgreSQL `SERIAL`
  - Inline `mysqlEnum()` replaces PostgreSQL `pgEnum()`
  - `.onDuplicateKeyUpdate()` replaces `ON CONFLICT DO NOTHING`
  - `addColumnSafe()` helper for zero-downtime column additions
  - All `.returning()` calls removed (not supported by MySQL)
  - `ilike` → `like` (MySQL LIKE is case-insensitive on utf8mb4)

### API Server Bundle

- esbuild bundles the entire Express server + all dependencies (including mysql2) into a **single 2.8MB file** (`dist/index.mjs`)
- No external Node.js installation required on the end user machine (Electron ships its own Node.js runtime)

### Electron App Architecture

- `main.js` spawns the API server as a child process on startup
- Shows a **splash screen** while waiting for the API health check (60 retries × 500ms)
- Reads MySQL credentials from `%APPDATA%\BSCH\bsch.config.json` (falls back to safe defaults)
- **System tray** integration: Open, Relaunch, Quit
- Cleans up the API server process on app close

### Build Output

| File | Size (approx.) | Purpose |
|------|----------------|---------|
| `BSCH-Setup-1.0.0.exe` | ~80-120 MB | Full Windows installer (NSIS) |
| `BSCH-Portable-1.0.0.exe` | ~80-120 MB | Standalone portable executable |

> Size is large because Electron bundles Chromium + Node.js runtime.

---

## Default Credentials

> **Change all of these immediately after first login.**

| Credential | Default Value |
|-----------|--------------|
| Main login password | `bsch2024` |
| Settings page password | `@Bahnasy` |
| MySQL user | `bsch_user` |
| MySQL password | _(set during MySQL setup)_ |

---

## Known Limitations & Pending Work

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1 | **Windows setup script** — no automated MySQL installer script | High | End users must configure MySQL manually. See Task #2. |
| 2 | **Custom hospital icon** — app uses default Electron icon | Medium | Need an `.ico` file converted from the SVG favicon. See Task #3. |
| 3 | **End-to-end test** — no automated test against MySQL 8 | High | Manual testing against a live MySQL instance needed. See Task #4. |
| 4 | **Auto-start on boot** — requires manual setup (Task Scheduler) | Low | Documented in DEPLOYMENT.md |

---

## File Inventory (Repository)

```
HANDOVER.md                      ← Master handover document
.env.example                     ← Environment variable reference
replit.md                        ← Developer notes & architecture
docs/
  API.md                         ← REST API reference
  BACKUP.md                      ← Backup & recovery guide
  BUILD.md                       ← Build instructions
  DATABASE.md                    ← Database schema reference
  DEPENDENCIES.md                ← Full dependency list
  DEPLOYMENT.md                  ← Production deployment guide
  FOLDER-STRUCTURE.md            ← Annotated folder tree
  RELEASE.md                     ← This file
  WINDOWS-SETUP.md               ← End-user installation guide
artifacts/
  api-server/dist/               ← Built API server bundle (gitignored)
  bsch/dist/                     ← Built frontend (gitignored)
electron/
  bsch.config.example.json       ← DB config template for end users
  dist-electron/                 ← Windows installers (gitignored)
```

---

## Quality Gates Passed

- [x] `pnpm install` — 464 packages, zero errors
- [x] `pnpm --filter @workspace/api-server run build` — esbuild success, mysql2 bundled
- [x] `pnpm --filter @workspace/bsch run build` — Vite build success, 2693 modules
- [x] `pnpm run typecheck:libs && pnpm --filter @workspace/api-server run typecheck` — zero TypeScript errors
- [ ] End-to-end test against MySQL 8 (pending — see Task #4)
- [ ] Windows installer smoke test (pending — requires Windows machine)

---

## Next Steps After This Release

1. **Run the end-to-end test checklist** (Task #4) on a Windows machine with MySQL 8
2. **Create the hospital icon** (Task #3) and rebuild the installer
3. **Create the PowerShell setup script** (Task #2) for non-technical deployment
4. **Distribute** `BSCH-Setup-1.0.0.exe` to the hospital IT team
5. **Change default passwords** immediately after installation
6. **Set up daily backup schedule** per `docs/BACKUP.md`
