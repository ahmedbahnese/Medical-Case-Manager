# دليل التحديث — Update Guide

## قبل التحديث / Before Updating

1. **Take a database backup** (see BACKUP.md)
2. Notify users that the system will be briefly unavailable
3. Stop the server

---

## التحديث على Windows / Windows Update

```cmd
scripts\Update.bat
```

This script automatically:
1. Pulls latest code from GitHub
2. Installs/updates dependencies
3. Rebuilds API server and frontend
4. Prompts you to restart the server

---

## التحديث اليدوي / Manual Update

```bash
# 1. Pull latest changes
git pull origin main

# 2. Update dependencies
pnpm install

# 3. Rebuild API server
pnpm --filter @workspace/api-server run build

# 4. Rebuild frontend
BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/bsch run build

# 5. Restart server
# Windows: scripts\StartServer.bat
# Linux: pm2 restart bsch
```

---

## تحديث Docker / Docker Update

```bash
# Pull latest code
git pull origin main

# Rebuild and restart containers
docker compose down
docker compose up -d --build
```

---

## بعد التحديث / After Updating

1. Verify the server started successfully
2. Open the application and confirm it loads
3. Check the audit log for any errors
4. Notify users the system is back online

---

## Rollback (التراجع عن التحديث)

If the update causes problems:

```bash
# Check git log for previous version
git log --oneline -10

# Revert to a specific commit
git checkout <commit-hash>

# Rebuild
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/bsch run build

# Restart server
```

Or restore from the database backup taken before the update.
