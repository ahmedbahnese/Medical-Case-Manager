# دليل النسخ الاحتياطي والاستعادة — Backup & Restore Guide

## النسخ الاحتياطي التلقائي من التطبيق / In-App Backup

BSCH includes a built-in backup system accessible from **الإعدادات → النسخ الاحتياطي**.

- Creates a full JSON export of all cases, departments, waiting cases, and settings
- Backups are stored in the database and can be downloaded as JSON files
- Recommended: take a backup before any major update

---

## النسخ الاحتياطي لقاعدة البيانات / Database Backup

### Windows (using the provided script)

```cmd
scripts\Backup.bat
```

Backups are saved to the `backups\` directory as `.sql` files.

### Manual PostgreSQL Backup

```bash
pg_dump -h localhost -U bsch_user -d bsch_db -F plain -f backup_$(date +%Y%m%d).sql
```

### Automated Daily Backup (Windows Task Scheduler)

1. Open **Task Scheduler**
2. Create Basic Task → name: "BSCH Daily Backup"
3. Trigger: Daily at 2:00 AM
4. Action: Start a program → `C:\path\to\Medical-Case-Manager\scripts\Backup.bat`

### Automated Daily Backup (Linux cron)

```bash
# Edit crontab
crontab -e

# Add this line (backup at 2:00 AM daily, keep 30 days)
0 2 * * * pg_dump -h localhost -U bsch_user -d bsch_db -F plain > /backups/bsch_$(date +\%Y\%m\%d).sql && find /backups -name "bsch_*.sql" -mtime +30 -delete
```

---

## استعادة النسخة الاحتياطية / Restore

### Windows

```cmd
scripts\Restore.bat
```

### Manual PostgreSQL Restore

```bash
# WARNING: This will overwrite existing data!
psql -h localhost -U bsch_user -d bsch_db -f backup_20240101.sql
```

### Docker Restore

```bash
# Copy backup file into the container
docker cp ./backup.sql bsch_db:/tmp/backup.sql

# Restore
docker exec -it bsch_db psql -U bsch_user -d bsch_db -f /tmp/backup.sql
```

---

## استراتيجية النسخ الاحتياطي الموصى بها / Recommended Backup Strategy

| Frequency | Type | Retention |
|-----------|------|-----------|
| Daily     | Database SQL dump | 30 days |
| Weekly    | In-app JSON backup (downloaded) | 12 weeks |
| Monthly   | Full server backup | 12 months |

Store copies **off-site** (external drive, USB, cloud storage) in addition to local backups.

---

## التحقق من النسخة الاحتياطية / Verify Backup

Always verify backups can be restored:

```bash
# Test restore to a separate database
createdb bsch_test
psql -U bsch_user -d bsch_test -f backup.sql
psql -U bsch_user -d bsch_test -c "SELECT COUNT(*) FROM medical_cases;"
dropdb bsch_test
```
