# دليل النشر — BSCH Deployment Guide

## Option 1: Docker Compose (Recommended)

The easiest production deployment. Requires Docker Desktop or Docker Engine.

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env: set DB_PASSWORD, SESSION_SECRET

# 2. Build and start
docker compose up -d --build

# 3. View logs
docker compose logs -f app

# 4. Stop
docker compose down
```

Access at: **http://YOUR_SERVER_IP**

---

## Option 2: Windows Local Server (Hospital LAN)

This configuration serves all hospital computers over the local network.

### Setup

1. Install prerequisites (see INSTALL.md)
2. Build the application
3. Edit `.env`, set `PORT=80` (or 8080 if port 80 is in use)
4. Run `scripts\StartServer.bat`

### Network Access

- Find the server's local IP: open Command Prompt → `ipconfig`
  Look for **IPv4 Address** under your network adapter (e.g., `192.168.1.100`)
- All other hospital computers access via: `http://192.168.1.100` (or with port: `http://192.168.1.100:8080`)
- **No installation needed on client computers** — just a web browser

### Run as Windows Service (auto-start)

Install [NSSM](https://nssm.cc) to run the server as a Windows service:

```cmd
nssm install BSCH "node" "--enable-source-maps C:\path\to\Medical-Case-Manager\artifacts\api-server\dist\index.mjs"
nssm set BSCH AppEnvironmentExtra PORT=80 NODE_ENV=production DATABASE_URL=postgresql://bsch_user:password@localhost:5432/bsch_db
nssm start BSCH
```

---

## Option 3: Linux VPS / Cloud Server

```bash
# 1. Build
pnpm install
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/bsch run build

# 2. Use PM2 to keep running
npm install -g pm2
pm2 start "node --enable-source-maps artifacts/api-server/dist/index.mjs" \
  --name bsch \
  --env production

# 3. Auto-start on reboot
pm2 startup
pm2 save

# 4. Nginx reverse proxy (optional, for port 80)
# /etc/nginx/sites-available/bsch
# server {
#     listen 80;
#     location / { proxy_pass http://localhost:8080; }
# }
```

---

## SSL / HTTPS

For production internet-facing deployments, add HTTPS via:
- **Nginx + Let's Encrypt** (Certbot)
- **Cloudflare Tunnel** (zero config)
- **Caddy** (automatic HTTPS)

For hospital LAN use, HTTP on the local network is generally acceptable.

---

## Firewall

Allow the application port through the firewall:

**Windows Defender Firewall:**
```cmd
netsh advfirewall firewall add rule name="BSCH Server" dir=in action=allow protocol=TCP localport=8080
```

**Linux (ufw):**
```bash
sudo ufw allow 8080/tcp
```
