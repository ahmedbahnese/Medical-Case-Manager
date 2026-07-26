# BSCH — Build Instructions

## Prerequisites (Development Machine)

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20 LTS | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Git | any | https://git-scm.com |

> **Windows-only target:** The Electron app only runs on Windows. You can build on Windows or Linux/macOS for cross-compilation, but test on Windows.

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd bsch
pnpm install
```

This installs all workspace packages (464 packages) including:
- API server dependencies
- Frontend dependencies
- Drizzle ORM + mysql2
- Electron + electron-builder

---

## 2. Build the API Server

```bash
pnpm --filter @workspace/api-server run build
```

**What this does:**
- Runs `esbuild` via `artifacts/api-server/build.mjs`
- Bundles Express + Drizzle + **mysql2** into a single `dist/index.mjs`
- Also emits worker files for pino logging

**Output:** `artifacts/api-server/dist/`
```
dist/
  index.mjs          ← Main server bundle (~2.8MB, includes mysql2)
  index.mjs.map      ← Source map
  pino-worker.mjs    ← Pino logging worker
  pino-file.mjs
  pino-pretty.mjs
  thread-stream-worker.mjs
```

---

## 3. Build the Frontend

```bash
pnpm --filter @workspace/bsch run build
```

**What this does:**
- Runs `vite build`
- Outputs to `artifacts/bsch/dist/public/`

**Output:** `artifacts/bsch/dist/public/`
```
public/
  index.html
  assets/
    index-*.css    (~115KB gzipped: ~19KB)
    index-*.js     (~763KB gzipped: ~220KB)
```

---

## 4. Build the Electron App (Windows Installer)

```bash
# Navigate to electron directory
cd electron

# Install electron-builder dependencies
npm install

# Build for Windows (creates installer + portable)
npm run build-win
```

> **Cross-compilation:** Building Windows targets on Linux requires Wine. On macOS use a Windows CI runner. Native Windows build is recommended.

**Output:** `electron/dist-electron/`
```
dist-electron/
  BSCH-Setup-1.0.0.exe      ← NSIS installer (~80-120MB)
  BSCH-Portable-1.0.0.exe   ← Standalone portable exe
  win-unpacked/              ← Unpacked directory (for testing)
```

---

## 5. Combined Production Build

Both steps at once (from repo root):

```bash
pnpm build:prod
```

This runs the API server build and frontend build in order.

---

## TypeScript Checking

```bash
# Build lib declarations first (required)
pnpm run typecheck:libs

# Then check the API server
pnpm --filter @workspace/api-server run typecheck

# Check everything
pnpm run typecheck
```

---

## Development Mode (API + Frontend — requires MySQL)

```bash
# Terminal 1: API server (hot-reload)
PORT=8080 DB_HOST=127.0.0.1 DB_USER=bsch_user DB_PASSWORD=yourpw DB_NAME=bsch_db \
  pnpm --filter @workspace/api-server run dev

# Terminal 2: Frontend (Vite HMR)
PORT=18429 BASE_PATH=/ pnpm --filter @workspace/bsch run dev
```

> The API server will fail to start if MySQL is not running and accessible.

---

## Electron Development Mode

```bash
# 1. Build both first
pnpm build:prod

# 2. Start Electron (it spawns the built API server)
cd electron
npm install
npm start
```

---

## Build Artifacts Summary

| Artifact | Command | Output location |
|----------|---------|----------------|
| API bundle | `pnpm --filter @workspace/api-server run build` | `artifacts/api-server/dist/` |
| Frontend | `pnpm --filter @workspace/bsch run build` | `artifacts/bsch/dist/public/` |
| NSIS Installer | `cd electron && npm run build-win` | `electron/dist-electron/BSCH-Setup-1.0.0.exe` |
| Portable EXE | `cd electron && npm run build-win` | `electron/dist-electron/BSCH-Portable-1.0.0.exe` |

---

## Common Build Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Cannot find module 'mysql2'` | mysql2 not bundled | Check `artifacts/api-server/build.mjs` — mysql2 must NOT be in the `external` array |
| `TS6305: Output file not built` | Lib types not built | Run `pnpm run typecheck:libs` first |
| `icon.ico not found` | Missing icon file | Place a valid ICO file at `electron/icon.ico` |
| `wine not found` | Cross-compiling Win on Linux | Install `wine` or build on a Windows machine |
| `ENOENT dist/index.mjs` | API not built before Electron | Run `pnpm build:prod` before `npm run build-win` |
