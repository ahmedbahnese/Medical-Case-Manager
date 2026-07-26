# BSCH — Project Handover Package
## نظام إدارة الحالات الطبية — مستشفى الأطفال التخصصي بالبحيرة

**Version:** 1.0.0  
**Date:** July 2026  
**Status:** Production Ready (Pending Windows Build)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start](#2-quick-start)
3. [Folder Structure](#3-folder-structure)
4. [Database Documentation](#4-database-documentation)
5. [API Documentation](#5-api-documentation)
6. [Build Instructions](#6-build-instructions)
7. [Installation Guide](#7-installation-guide)
8. [Deployment Guide](#8-deployment-guide)
9. [Dependency List](#9-dependency-list)
10. [Backup & Recovery Guide](#10-backup--recovery-guide)
11. [Production Release Summary](#11-production-release-summary)
12. [Outstanding Tasks](#12-outstanding-tasks)

---

## 1. Project Overview

BSCH is a **self-contained Windows desktop hospital case management system** for specialized pediatric units (ICU, PICU, Incubators, NICU). It is packaged as an Electron application that bundles a Node.js/Express API server with a React frontend, connecting to a locally installed MySQL 8 database.

### Key Characteristics
- **Offline-first:** Runs entirely on a local hospital Windows machine — no internet or cloud required.
- **LAN-accessible:** Other hospital workstations can reach the system via browser at `http://<server-ip>:8080`.
- **Self-contained installer:** Single `.exe` installs the full application; MySQL must be installed separately.
- **Arabic interface:** Full RTL Arabic UI built with Tailwind + shadcn/ui.

### System Architecture

```
┌─────────────────────────────────────────────────┐
│                  Electron App                   │
│  ┌────────────┐    ┌────────────────────────┐   │
│  │  Browser   │    │   API Server Process   │   │
│  │  Window    │───▶│  Express 5 + Drizzle   │   │
│  │  (React)   │    │  Port 8080             │   │
│  └────────────┘    └───────────┬────────────┘   │
└──────────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    MySQL 8 Database     │
                    │    bsch_db (local)      │
                    └─────────────────────────┘
```

---

## 2. Quick Start

### Prerequisites
- Windows 10/11 or Windows Server 2019+
- MySQL 8.0+ installed and running
- `bsch_db` database and `bsch_user` created (see [Installation Guide](#7-installation-guide))

### First Run
1. Install BSCH via `BSCH-Setup-1.0.0.exe`
2. Create `%APPDATA%\BSCH\bsch.config.json` with your MySQL credentials
3. Launch BSCH from the desktop shortcut
4. Login with password: **`bsch2024`** (change this immediately in Settings)

---

## 3. Folder Structure

See [`docs/FOLDER-STRUCTURE.md`](docs/FOLDER-STRUCTURE.md) for the complete annotated tree.

---

## 4. Database Documentation

See [`docs/DATABASE.md`](docs/DATABASE.md) for all table schemas, relationships, enums, and seed data.

---

## 5. API Documentation

See [`docs/API.md`](docs/API.md) for all REST endpoints, request/response shapes, and auth requirements.

---

## 6. Build Instructions

See [`docs/BUILD.md`](docs/BUILD.md) for full build steps (API server, frontend, Electron packaging).

---

## 7. Installation Guide

See [`docs/WINDOWS-SETUP.md`](docs/WINDOWS-SETUP.md) for complete Windows installation instructions.

---

## 8. Deployment Guide

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for production deployment and LAN setup.

---

## 9. Dependency List

See [`docs/DEPENDENCIES.md`](docs/DEPENDENCIES.md) for all packages with versions and licenses.

---

## 10. Backup & Recovery Guide

See [`docs/BACKUP.md`](docs/BACKUP.md) for backup procedures, restore steps, and scheduling.

---

## 11. Production Release Summary

See [`docs/RELEASE.md`](docs/RELEASE.md) for the final release notes and changelog.

---

## 12. Outstanding Tasks

| # | Task | Priority |
|---|------|----------|
| #2 | Windows setup script (PowerShell auto-installer for MySQL + bsch_db) | High |
| #3 | Custom hospital icon (.ico) for installer and taskbar | Medium |
| #4 | End-to-end smoke test against MySQL 8 | High |

---

## Support & Contacts

- **Source Code:** This repository (GitHub)
- **Documentation:** `/docs/` folder in this repository
- **Config file (production):** `%APPDATA%\BSCH\bsch.config.json`
- **Logs (production):** `%APPDATA%\BSCH\logs\`
