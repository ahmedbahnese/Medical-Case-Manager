# BSCH — Deployment Guide

BSCH is designed as a **local Windows desktop application**. This guide covers the recommended deployment topologies.

---

## Topology 1 — Single Hospital Machine (Standard)

The most common setup: one Windows PC runs both the app and serves all other hospital workstations over LAN.

```
┌──────────────────────────────────────┐
│        Hospital Server PC            │
│                                      │
│   BSCH Electron App                  │
│   ├── MySQL 8 (localhost)            │
│   └── Express API (port 8080)        │
│                                      │
└────────────┬─────────────────────────┘
             │ LAN (Hospital WiFi/Ethernet)
    ┌────────┴────────┐
    │  Nurse Station  │  → browser http://192.168.x.x:8080
    │  Doctor PC      │  → browser http://192.168.x.x:8080
    │  Admin Tablet   │  → browser http://192.168.x.x:8080
    └─────────────────┘
```

### Setup Steps

1. **Install MySQL 8** on the server PC (see `docs/WINDOWS-SETUP.md`)
2. **Install BSCH** using the NSIS installer
3. **Find the server IP:**
   ```cmd
   ipconfig
   ```
   Note the IPv4 address (e.g. `192.168.1.50`)
4. **Open port 8080** in Windows Firewall:
   ```powershell
   netsh advfirewall firewall add rule name="BSCH API" dir=in action=allow protocol=TCP localport=8080
   ```
5. **From other machines:** Open browser → `http://192.168.1.50:8080`

---

## Topology 2 — Dedicated Server (No Electron UI)

For hospitals that want to run BSCH as a headless service on a dedicated server:

```bash
# On the Windows Server, run directly:
node artifacts/api-server/dist/index.mjs
```

Or create a Windows Service using NSSM:
```cmd
nssm install BSCH "C:\Program Files\nodejs\node.exe" "C:\BSCH\api-server\dist\index.mjs"
nssm set BSCH AppEnvironmentExtra PORT=8080 DB_HOST=127.0.0.1 DB_USER=bsch_user DB_PASSWORD=pw DB_NAME=bsch_db
nssm set BSCH Start SERVICE_AUTO_START
nssm start BSCH
```

---

## Topology 3 — Remote MySQL (Enterprise)

If your hospital already has a MySQL server on the network:

1. Create `%APPDATA%\BSCH\bsch.config.json`:
```json
{
  "DB_HOST": "192.168.1.100",
  "DB_PORT": "3306",
  "DB_USER": "bsch_user",
  "DB_PASSWORD": "your_password",
  "DB_NAME": "bsch_db"
}
```
2. Ensure the BSCH machine can reach the MySQL server on port 3306
3. Launch the BSCH app normally

---

## Auto-Start on Windows Boot

BSCH **does not** auto-start by default. To enable auto-start:

### Method A — Startup Folder (Simple)
1. Press `Win + R` → type `shell:startup`
2. Copy the BSCH desktop shortcut into that folder

### Method B — Task Scheduler (Recommended)
```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\<User>\AppData\Local\Programs\BSCH\BSCH.exe"
$trigger = New-ScheduledTaskTrigger -AtLogOn
Register-ScheduledTask -TaskName "BSCH Autostart" -Action $action -Trigger $trigger -RunLevel Highest
```

---

## Production Security Checklist

- [ ] Change `founder_password` from `bsch2024` → strong password (Settings page)
- [ ] Change `settings_password` from `@Bahnasy` → strong password (Settings page)
- [ ] Change MySQL `bsch_user` password to a strong value
- [ ] Enable Windows Firewall — allow port 8080 from LAN only (block from internet)
- [ ] Set up daily database backups (see `docs/BACKUP.md`)
- [ ] Store `bsch.config.json` with restricted file permissions

---

## Updating BSCH

1. Create a backup from the BSCH Backup page
2. Download the backup JSON file to a safe location
3. Close the BSCH application
4. Run the new `BSCH-Setup-x.x.x.exe` installer (upgrades in-place)
5. Launch BSCH — tables are migrated automatically on startup
6. Verify data is intact

---

## Uninstalling BSCH

1. Use Windows Control Panel → Programs → Uninstall
2. The database is **not deleted** (MySQL is separate software)
3. App data in `%APPDATA%\BSCH\` is **not deleted** — remove manually if needed

---

## Monitoring & Logs

| Location | Contents |
|----------|----------|
| `%APPDATA%\BSCH\logs\` | API server logs (pino format) |
| BSCH Audit Log page | All user actions (in-database) |
| MySQL General Log | Low-level query log (disabled by default) |

To enable MySQL query logging:
```sql
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = 'C:/ProgramData/MySQL/bsch-queries.log';
```
