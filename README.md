# BSCH — نظام إدارة الحالات الطبية

**Hospital Case Management System** for مستشفى الأطفال التخصصي بالبحيرة

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue)](https://postgresql.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev)
[![License](https://img.shields.io/badge/License-Private-red)]()

---

## Features / المميزات

- 🏥 **Patient Management** — Admission, tracking, discharge with full history
- 🛏️ **Department Occupancy** — Real-time bed tracking across all wards
- 🫁 **Respiration Monitoring** — Ventilator and breathing support tracking
- ⏳ **Waiting Queue** — Pre-admission management for reception and servo
- 📋 **Reports** — Daily shift reports, occupancy charts, incident reports
- 📄 **Export** — PDF, Word, Excel, and print-optimized layouts
- 🔐 **Access Control** — Role-based permissions for staff
- 📱 **PWA** — Installable on Android, iPhone, and Windows
- 🌐 **LAN Access** — Serve entire hospital from one Windows PC
- 🗄️ **Backup** — Built-in backup/restore system

---

## Quick Start

### Using Docker (fastest)

```bash
cp .env.example .env
# Edit .env with your values
docker compose up -d
```

Open: **http://localhost**  
Password: **bsch2024** (change immediately)

### Using Windows

1. Install [Node.js 20 LTS](https://nodejs.org) and [PostgreSQL 16](https://postgresql.org)
2. `pnpm install`
3. Edit `.env` with your database credentials
4. `pnpm --filter @workspace/api-server run build`
5. `scripts\StartServer.bat`

See [docs/INSTALL.md](docs/INSTALL.md) for complete instructions.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/INSTALL.md](docs/INSTALL.md) | Full installation guide (Windows, Linux, Docker) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment options |
| [docs/BACKUP.md](docs/BACKUP.md) | Backup & restore procedures |
| [docs/UPDATE.md](docs/UPDATE.md) | How to update the system |
| [docs/API.md](docs/API.md) | REST API reference |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture overview |
| [docs/DATABASE.md](docs/DATABASE.md) | Database schema and tables |
| [docs/HANDOVER.md](docs/HANDOVER.md) | Complete project handover document |
| [SCHEMA.sql](SCHEMA.sql) | Database schema SQL export |

---

## Project Structure

```
Medical-Case-Manager/
├── artifacts/api-server/   ← Express.js REST API
├── artifacts/bsch/         ← React frontend (Vite + Tailwind)
├── lib/                    ← Shared libraries (ORM, Zod, React Query)
├── electron/               ← Electron desktop app wrapper
├── scripts/                ← Windows .bat utilities
├── docs/                   ← Full documentation
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Tech Stack

- **Backend:** Node.js + Express.js v5 + Drizzle ORM
- **Database:** PostgreSQL 14+
- **Frontend:** React 19 + Vite + shadcn/ui + Tailwind CSS 4
- **Language:** TypeScript throughout
- **Monorepo:** pnpm workspaces

---

## Hospital Network Setup

Install on **one Windows PC**. All other hospital computers access via browser:

```
http://192.168.x.x:8080
```

No installation needed on client machines.

---

## License

Private — all rights reserved.
