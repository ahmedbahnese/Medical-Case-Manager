# دليل التحديث — Update Guide

## قبل أي تحديث / Before Every Update

1. **Take a database backup** — see `docs/BACKUP.md` or run `Backup.bat`
2. Notify users that the system will be briefly unavailable
3. Stop the server

---

## Windows Update (الطريقة الأسهل)

Double-click **`Update.bat`** in the project root.

This script automatically:
1. Optionally creates a database backup
2. Pulls the latest code from GitHub
3. Installs/updates dependencies
4. Rebuilds the API server and frontend
5. Prompts you to restart the server

---

## Manual Update (Windows)

```cmd
REM 1. Stop the server (Ctrl+C or use StopServer.bat)

REM 2. Pull latest changes
git pull origin main

REM 3. Install/update dependencies
pnpm install

REM 4. Rebuild API server
pnpm --filter @workspace/api-server run build

REM 5. Rebuild frontend
set BASE_PATH=/
set NODE_ENV=production
pnpm --filter @workspace/bsch run build

REM 6. Start server
StartServer.bat
```

---

## Manual Update (Linux)

```bash
# 1. Stop the server
pm2 stop bsch

# 2. Pull latest changes
git pull origin main

# 3. Install/update dependencies
pnpm install

# 4. Rebuild
pnpm --filter @workspace/api-server run build
BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/bsch run build

# 5. Restart
pm2 restart bsch
```

---

## Docker Update

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart (zero-downtime possible with --no-deps)
docker compose up -d --build app

# Or full rebuild:
docker compose down
docker compose up -d --build
```

---

## Database Migrations

After pulling a new version, the application automatically applies `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migrations at startup. No manual migration step is needed for column additions.

For more complex schema changes (new tables, enum changes), run the migration files in `migrations/` in order:

```bash
# Apply all pending migrations
psql -h localhost -U bsch_user -d bsch_db -f migrations/002_add_report_fields_to_departments.sql
psql -h localhost -U bsch_user -d bsch_db -f migrations/003_add_medical_report_to_waiting_cases.sql
```

---

## After Updating

1. Open the application and verify it loads correctly
2. Check **سجل العمليات** (Audit Log) for any errors
3. Verify that existing data is intact
4. Notify users the system is back online

---

## Rollback (التراجع عن التحديث)

If an update causes problems:

### Option 1 — Git rollback + rebuild

```bash
# View recent commits
git log --oneline -10

# Revert to a specific commit
git checkout <commit-hash>

# Rebuild
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/bsch run build
```

### Option 2 — Restore database backup

If data was affected, restore the backup taken before the update:

```bash
# Windows
Restore.bat

# Linux
psql -U bsch_user -d bsch_db -f backups/bsch_backup_YYYYMMDD_HHMMSS.sql
```

### Option 3 — Docker rollback

```bash
# Roll back to previous image (if you tagged it)
docker compose down
docker tag bsch_app bsch_app_backup
git checkout <previous-commit>
docker compose up -d --build
```
