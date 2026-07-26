---
name: BSCH PWA and Hospital LAN setup
description: PWA icons, service worker, install prompt, production static serving, Express 5 wildcard fix, hospital LAN config.
---

## Icons
- Generated with ImageMagick `magick` from SVG source: `artifacts/bsch/public/icons/`
- Sizes: icon-32.png, icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png, apple-touch-icon.png (180×180)
- Maskable variant uses full-bleed teal (#0f766e) background (no rounded corners) so Android adaptive icon clips safely
- favicon.svg updated to teal (#0f766e) medical cross (was red/orange)

## Service Worker
- `artifacts/bsch/public/sw.js` — CACHE_VERSION constant; bump it to force cache invalidation on deploy
- Strategies: API (/api/*) → network-only; navigation → network-first + offline.html fallback; static assets → cache-first auto-caching
- Push notification handler + notificationclick handler ready (no server-side VAPID wired yet)
- SKIP_WAITING message handler for the SW update flow

## SW Update Detection
- `main.tsx` fires `CustomEvent('sw-update-available', { detail: { waiting } })` when a new SW is found waiting
- `useSwUpdateToast()` hook in `pwa-install-prompt.tsx` listens for that event and shows a Sonner toast with "تحديث الآن" action
- Clicking the action posts `{ type: 'SKIP_WAITING' }` to the waiting SW; `controllerchange` then triggers `window.location.reload()`

## Install Prompt
- `PwaInstallPrompt` component: Android/Windows uses `beforeinstallprompt`; iOS shows manual Share→Add to Home Screen instructions
- Dismissal stored in localStorage key `bsch-pwa-install-dismissed`
- Added to `layout.tsx` via import + `<PwaInstallPrompt />` after the Toaster

## Production Static Serving (Hospital LAN)
- `artifacts/api-server/src/app.ts` serves the React SPA in `NODE_ENV=production`
- **Why:** hospital staff access the system from any device on the LAN via one URL/port (8080); no separate frontend server needed in production
- Frontend dir resolution: `FRONTEND_DIR` env var → `<cwd>/public` (Docker) → `<dist>/../../../bsch/dist/public` (local monorepo)
- `StartServer.bat` sets `FRONTEND_DIR=artifacts\bsch\dist\public` so local Windows installs find the built frontend
- **Express 5 wildcard:** `app.get("/{*splat}", ...)` — the old `app.get("*", ...)` syntax throws a PathError in Express 5 / path-to-regexp v8

## Network Guide
- `docs/NETWORK.md` — LAN topology, firewall rule (port 8080), static IP, hostname tricks, NSSM Windows service, PWA install per platform
- `StartServer.bat` now runs `ipconfig | findstr "IPv4"` on startup and prints the LAN URL(s) for staff to use
