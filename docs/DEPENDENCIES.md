# BSCH — Dependency List

All packages used in the project, organized by workspace. Versions are from the pnpm catalog and individual package.json files.

---

## API Server (`artifacts/api-server`)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `express` | 5.x | HTTP server framework | MIT |
| `drizzle-orm` | 0.44.x | Type-safe ORM | Apache-2.0 |
| `mysql2` | 3.x | MySQL driver (bundled via esbuild) | MIT |
| `zod` | 3.x (v4 API) | Request/response validation | MIT |
| `pino` | 9.x | Structured JSON logging | MIT |
| `pino-pretty` | 11.x | Human-readable log formatting (dev) | MIT |
| `cookie-parser` | 1.x | Session cookie parsing | MIT |
| `express-session` | 1.x | Server-side session management | MIT |
| `cors` | 2.x | Cross-origin resource sharing | MIT |
| `typescript` | 5.9.x | Type system | Apache-2.0 |
| `tsx` | 4.x | TypeScript runner (dev) | MIT |
| `esbuild` | 0.25.x | Production bundler | MIT |

---

## Frontend (`artifacts/bsch`)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `react` | 19.x | UI framework | MIT |
| `react-dom` | 19.x | DOM renderer | MIT |
| `vite` | 7.x | Build tool + dev server | MIT |
| `@vitejs/plugin-react` | 4.x | Vite React plugin (Babel) | MIT |
| `tailwindcss` | 4.x | Utility-first CSS framework | MIT |
| `@tailwindcss/vite` | 4.x | Vite plugin for Tailwind v4 | MIT |
| `wouter` | 3.x | Lightweight React router | ISC |
| `@tanstack/react-query` | 5.x | Server state management | MIT |
| `sonner` | 1.x | Toast notification library | MIT |
| `lucide-react` | 0.x | Icon library | ISC |
| `zod` | 3.x (v4 API) | Client-side schema validation | MIT |
| `@radix-ui/react-*` | various | Accessible component primitives | MIT |
| `class-variance-authority` | 0.x | Component variant styling | Apache-2.0 |
| `clsx` | 2.x | Conditional class names | MIT |
| `tailwind-merge` | 2.x | Merge Tailwind classes safely | MIT |
| `date-fns` | 3.x | Date formatting and manipulation | MIT |
| `typescript` | 5.9.x | Type system | Apache-2.0 |

---

## Database Library (`lib/db`)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `drizzle-orm` | 0.44.x | ORM core + mysql-core dialect | Apache-2.0 |
| `mysql2` | 3.x | MySQL 8 driver | MIT |
| `drizzle-kit` | 0.30.x | Schema introspection + migrations (dev) | Apache-2.0 |
| `drizzle-zod` | 0.7.x | Auto-generate Zod schemas from Drizzle | MIT |

---

## Electron Desktop App (`electron/`)

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `electron` | 32.x | Desktop app framework | MIT |
| `electron-builder` | 25.x | Windows installer packaging | MIT |

**Electron-builder targets:**
- `nsis` — Windows NSIS installer (.exe)
- `portable` — Single-file portable .exe

---

## Root / Dev Tooling

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| `typescript` | 5.9.x | TypeScript compiler | Apache-2.0 |
| `prettier` | 3.x | Code formatter | MIT |
| `pnpm` | 9.x | Package manager | MIT |

---

## System Requirements

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| Windows | 10 (64-bit) | 11 or Server 2022 |
| RAM | 4 GB | 8 GB |
| Disk | 500 MB free | 2 GB free |
| MySQL | 8.0 | 8.0.35+ |
| Node.js | Not required (bundled in Electron) | — |

---

## License Summary

All dependencies use permissive licenses (MIT, Apache-2.0, ISC). No GPL or LGPL dependencies are included. The project itself is proprietary (hospital internal use).

---

## Security Notes

- `pnpm-workspace.yaml` enforces `minimumReleaseAge: 1440` — packages published less than 24 hours ago cannot be installed (protects against supply chain attacks)
- All dependencies should be audited before major version upgrades: `pnpm audit`
- mysql2 is bundled into the esbuild output — update it when security advisories are issued
