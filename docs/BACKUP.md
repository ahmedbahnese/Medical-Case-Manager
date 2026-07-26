# دليل النسخ الاحتياطي والاستعادة — Backup & Restore Guide

## النسخ الاحتياطي من داخل التطبيق / In-App Backup

BSCH includes a built-in JSON backup system available to the founder at **النسخ الاحتياطي** (Backup page).

- Exports all cases, departments, waiting cases, settings, and incident reports as a JSON file
- Backups are stored in the database and can be downloaded
- **Recommended:** take an in-app backup before any major update or configuration change

To restore an in-app backup: go to the Backup page → Upload backup → Restore.

---

## النسخ الاحتياطي لقاعدة البيانات / Database Backup

### Windows — Using the provided script

Double-click **`Backup.bat`** in the project root.

- Reads connection settings from `.env`
- Saves SQL dumps to `backups\bsch_backup_YYYYMMDD_HHMMSS.sql`
- Automatically keeps the last 30 backups

### Windows — Manual

```cmd
pg_dump -h localhost -p 5432 -U bsch_user -d bsch_db -F plain -f backups\bsch_backup.sql
```

### Linux / Mac — Manual

```bash
pg_dump -h localhost -U bsch_user -d bsch_db -F plain \
  -f backups/bsch_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Docker

```bash
docker exec bsch_db pg_dump -U bsch_user -d bsch_db -F plain \
  > backups/bsch_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## جدولة النسخ الاحتياطي التلقائي / Automated Backups

### Windows Task Scheduler

1. Open **Task Scheduler** → Create Basic Task
2. Name: `BSCH Daily Backup`
3. Trigger: Daily at **02:00 AM**
4. Action: Start a program
   - Program: full path to `Backup.bat` (e.g. `C:\Medical-Case-Manager\Backup.bat`)
5. Finish

### Linux cron

```bash
crontab -e
```

Add this line (backup daily at 2 AM, keep 30 days):
```
0 2 * * * cd /path/to/Medical-Case-Manager && pg_dump -h localhost -U bsch_user -d bsch_db -F plain > backups/bsch_$(date +\%Y\%m\%d_\%H\%M\%S).sql && find backups/ -name "bsch_*.sql" -mtime +30 -delete
```

---

## استعادة النسخة الاحتياطية / Restore

> ⚠️ **WARNING: Restore will overwrite all current data. Always create a backup of the current state first.**

### Windows — Using the provided script

Double-click **`Restore.bat`** in the project root.
- Lists available backups
- Prompts for confirmation before overwriting

### Windows — Manual

```cmd
psql -h localhost -p 5432 -U bsch_user -d bsch_db -f backups\bsch_backup_YYYYMMDD_HHMMSS.sql
```

### Linux / Mac — Manual

```bash
psql -h localhost -U bsch_user -d bsch_db \
  -f backups/bsch_backup_YYYYMMDD_HHMMSS.sql
```

### Docker

```bash
# Copy backup file into container
docker cp ./backups/bsch_backup.sql bsch_db:/tmp/backup.sql

# Restore inside container
docker exec -it bsch_db psql -U bsch_user -d bsch_db -f /tmp/backup.sql
```

---

## استراتيجية النسخ الاحتياطي الموصى بها / Recommended Backup Strategy

| Frequency | Type | Retention | Storage |
|-----------|------|-----------|---------|
| Daily | Database SQL dump (`Backup.bat`) | 30 days | Local server |
| Weekly | In-app JSON backup (downloaded) | 12 weeks | USB drive or cloud |
| Before every update | In-app JSON backup | Until next update | USB drive |
| Monthly | Full server/system backup | 12 months | Off-site |

**Store copies off-site** — external USB drive, network share, or cloud storage (Google Drive, OneDrive) — in addition to local backups. The server itself is not a backup.

---

## التحقق من النسخة الاحتياطية / Verify Backup Integrity

Always verify backups can be restored by testing to a separate database:

```bash
# Create a test database
createdb -U bsch_user bsch_test

# Test restore
psql -U bsch_user -d bsch_test -f backups/bsch_backup.sql

# Verify data
psql -U bsch_user -d bsch_test -c "SELECT COUNT(*) FROM medical_cases;"
psql -U bsch_user -d bsch_test -c "SELECT COUNT(*) FROM departments;"

# Clean up test database
dropdb -U bsch_user bsch_test
```

A valid backup should restore without errors and show non-zero counts.
