# BSCH — Backup & Recovery Guide

---

## Backup Methods

BSCH provides two levels of backup:

| Method | Where | Granularity | Best For |
|--------|-------|-------------|---------|
| **In-App JSON Backup** | BSCH Backup page | Full DB snapshot | Quick restore, daily operations |
| **MySQL Dump** | Command line / MySQL Workbench | Full MySQL backup | Disaster recovery, migrations |

---

## Method 1 — In-App JSON Backup (Recommended for Daily Use)

### Create a Backup

1. Open BSCH → navigate to **النسخ الاحتياطية**
2. Click **إنشاء نسخة احتياطية**
3. Enter a descriptive name (e.g. `نسخة 2026-07-26`)
4. Click **حفظ**

The backup is stored in the `backups` table in MySQL (JSON blob of all cases, departments, and settings).

### Download a Backup File

1. On the Backup page, find the backup in the list
2. Click **تحميل** (Download)
3. A `.json` file is saved to your Downloads folder
4. **Store this file on an external drive or USB** — if MySQL fails, you can restore from this file

### Restore from a Backup

> ⚠️ **Restoring overwrites all current data.** Create a fresh backup before restoring.

**Via API (application must be running):**
```bash
curl -X POST http://localhost:8080/api/backups/1/restore \
  -H "Cookie: bsch_session=<session_cookie>"
```

**Via the app:**
1. Go to النسخ الاحتياطية
2. Select the backup to restore
3. Click **استعادة** and confirm

### Delete Old Backups

Old backups take up database space. Delete them from the Backup page after downloading the JSON file.

---

## Method 2 — MySQL Full Dump (Disaster Recovery)

### Create a MySQL Dump

**Using Command Line:**
```bash
mysqldump -u bsch_user -p bsch_db > bsch_backup_2026-07-26.sql
```

**Using MySQL Workbench:**
1. Server → Data Export
2. Select `bsch_db`
3. Export to Self-Contained File
4. Click Start Export

### Restore from MySQL Dump

```bash
mysql -u bsch_user -p bsch_db < bsch_backup_2026-07-26.sql
```

Or via MySQL Workbench: Server → Data Import → Import from Self-Contained File

---

## Backup Schedule Recommendation

| Frequency | Method | Storage Location |
|-----------|--------|----------------|
| **Daily** | In-App JSON backup | Network drive or USB |
| **Weekly** | MySQL full dump | USB + offsite (cloud/external) |
| **Before any update** | Both methods | Local + external |

---

## Automating Daily Backups

### Windows Task Scheduler (MySQL Dump)

1. Create a batch file `C:\BSCH\daily_backup.bat`:
```bat
@echo off
set DATE_STR=%date:~10,4%-%date:~4,2%-%date:~7,2%
set BACKUP_DIR=C:\BSCH\Backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" ^
  -u bsch_user -pyour_password bsch_db ^
  > "%BACKUP_DIR%\bsch_%DATE_STR%.sql"
echo Backup completed: bsch_%DATE_STR%.sql
```

2. Open Task Scheduler → Create Basic Task
3. Trigger: **Daily at 2:00 AM**
4. Action: Run `C:\BSCH\daily_backup.bat`

### Auto-Cleanup (keep last 30 days)

Add to the batch file:
```bat
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @file"
```

---

## Recovery Scenarios

### Scenario 1 — Accidental Data Deletion

1. **Don't close the app** — wait before any new data is entered
2. Go to النسخ الاحتياطية and restore the most recent backup
3. Verify the data was recovered

### Scenario 2 — MySQL Service Crash

1. Open **Services** (services.msc)
2. Find **MySQL80** and click **Start**
3. BSCH should reconnect automatically on next launch

### Scenario 3 — Full Machine Failure / Reinstall

1. Install Windows fresh
2. Install MySQL 8 and create `bsch_db` + `bsch_user` (see WINDOWS-SETUP.md)
3. Install BSCH via the installer
4. Restore data using a MySQL dump:
   ```bash
   mysql -u bsch_user -p bsch_db < bsch_backup_2026-07-26.sql
   ```
5. Alternatively, restore from JSON via the app (if you have a `.json` backup file):
   - Place the JSON file somewhere accessible
   - Use the API: `POST /api/backups` (create entry) + `POST /api/backups/:id/restore`

### Scenario 4 — Corrupted Database

```bash
# Check and repair MySQL tables
mysqlcheck -u bsch_user -p --auto-repair bsch_db

# If that fails, restore from last good dump
mysql -u bsch_user -p bsch_db < last_good_backup.sql
```

---

## Backup File Format

The JSON backup file (`bsch_backup_YYYY-MM-DD.json`) contains:

```json
{
  "version": "1.0",
  "exportedAt": "2026-07-26T10:00:00.000Z",
  "data": {
    "departments": [...],
    "medical_cases": [...],
    "waiting_cases": [...],
    "settings": [...],
    "incident_reports": [...]
  }
}
```

> Note: `audit_logs` and `backups` tables are **not** included in the JSON export (audit logs are append-only; backups are large and self-referential).

---

## Critical Files to Back Up

| File | Location | Why |
|------|----------|-----|
| `bsch.config.json` | `%APPDATA%\BSCH\` | DB credentials |
| MySQL dump | `C:\BSCH\Backups\` | Full data recovery |
| JSON backups | Downloaded to disk | Quick in-app restore |
| Uploaded logo | In `settings` table | Included in MySQL dump |
