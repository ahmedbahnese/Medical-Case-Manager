# وثيقة التسليم النهائي — Final Project Handover

## Project Summary

**System Name:** BSCH — نظام إدارة الحالات الطبية  
**Client:** مستشفى الأطفال التخصصي بالبحيرة  
**Repository:** https://github.com/ahmedbahnese/Medical-Case-Manager  
**Version:** Production Release 1.0  
**Date:** July 2026  

---

## System Overview

BSCH is a full-stack, Arabic-first hospital case management system for a children's specialty hospital. It runs entirely locally within the hospital's network with no cloud dependency, serving all hospital computers through a single Windows server.

### Core Features
- Patient admission and case management
- Real-time department occupancy tracking
- Artificial respiration / ventilator monitoring
- Patient waiting queue management (reception & servo queues)
- Shift-based daily reporting (PDF, Word, Excel, Print)
- Occupancy reports and discharge history
- Mass casualty incident reports
- Role-based access control (founder + named users with custom permissions)
- Full audit log of all system actions
- In-app database backup and restore
- Progressive Web App (PWA) — installable on Android, iPhone, Windows

---

## Folder Structure

```
Medical-Case-Manager/
├── artifacts/
│   ├── api-server/          Backend (Express + PostgreSQL)
│   │   ├── src/
│   │   │   ├── index.ts     Server entry point
│   │   │   ├── app.ts       Express app setup
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts  Session auth middleware
│   │   │   ├── routes/      All API route handlers
│   │   │   └── lib/
│   │   │       └── db-init.ts  Schema creation + seeding
│   │   └── dist/            Built output (run: pnpm build)
│   └── bsch/                Frontend (React + Vite)
│       ├── src/
│       │   ├── pages/       One file per page
│       │   ├── components/  Shared UI components
│       │   ├── lib/         Utilities (pdf-export, word-export, constants)
│       │   └── contexts/    React contexts (settings)
│       └── dist/public/     Built output (run: pnpm build)
├── lib/
│   ├── db/                  Drizzle ORM schema
│   ├── api-zod/             Shared Zod validation schemas
│   └── api-client-react/    React Query API hooks
├── docs/                    Documentation
├── scripts/                 Windows .bat utilities
├── SCHEMA.sql               PostgreSQL schema export
├── Dockerfile               Docker build file
├── docker-compose.yml       Docker Compose stack
└── .env.example             Environment variables template
```

---

## Dependencies

### Runtime Dependencies
- Node.js 20 LTS
- PostgreSQL 14+
- pnpm 9+

### Key npm Packages (Backend)
- `express@5` — HTTP server
- `drizzle-orm` — Type-safe ORM
- `pino` / `pino-http` — Structured logging
- `cors` — Cross-origin requests
- `cookie-parser` — Session cookies

### Key npm Packages (Frontend)
- `react@19` — UI framework
- `vite@7` — Build tool
- `@tanstack/react-query@5` — Data fetching
- `shadcn/ui` + `@radix-ui/*` — Component library
- `tailwindcss@4` — Styling
- `wouter` — Routing
- `zod` — Validation
- `lucide-react` — Icons

---

## Configuration

All configuration is in environment variables (see `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `PORT` | Yes | 8080 | API server port |
| `SESSION_SECRET` | Yes | — | Cookie signing secret |
| `FOUNDER_PASSWORD` | No | bsch2024 | Fallback password (overridden by DB) |
| `BASE_PATH` | No | / | Frontend base URL path |

---

## Default Credentials

| Access | Value | Where to change |
|--------|-------|----------------|
| Login password | `bsch2024` | الإعدادات → كلمة مرور الدخول |
| Settings password | `@Bahnasy` | Hardcoded in frontend settings.tsx |

**⚠️ Change the login password immediately after first deployment.**

---

## How to Run

### Development
```bash
pnpm install
# Terminal 1: API
PORT=8080 DATABASE_URL=... pnpm --filter @workspace/api-server run dev
# Terminal 2: Frontend
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/bsch run dev
```

### Production
```bash
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/bsch run build
PORT=8080 NODE_ENV=production node artifacts/api-server/dist/index.mjs
```

### Docker
```bash
docker compose up -d
```

---

## Known Limitations

1. **Password storage**: Passwords are stored in plaintext in the `settings` table. For high-security environments, consider adding bcrypt hashing.
2. **Session security**: Sessions use a simple string cookie. For internet-facing deployments, add proper HTTPS and consider JWT or signed sessions.
3. **Single server**: The application is designed for one hospital server. Horizontal scaling requires session sharing (e.g., Redis).
4. **Logo storage**: Hospital logo is stored as base64 in the database; very large logos may increase backup size.

---

## Support & Maintenance

- **Source code**: All code is in the GitHub repository with full history
- **Database**: PostgreSQL — standard, well-supported database with extensive tooling
- **Updates**: Use `scripts/Update.bat` (Windows) or `git pull + pnpm install + rebuild` (Linux/Mac)
- **Backups**: See docs/BACKUP.md for automated backup setup
- **Logs**: API server logs to stdout in JSON format; view with `pnpm --filter @workspace/api-server run dev` in development

---

## GitHub Repository

**URL:** https://github.com/ahmedbahnese/Medical-Case-Manager

To contribute or update:
1. Clone the repository
2. Create a feature branch
3. Make changes
4. Build and test locally
5. Push and create a Pull Request
