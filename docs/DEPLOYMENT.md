# دليل النشر — BSCH Deployment Guide

## Option 1: Docker Compose (Recommended for servers)

The easiest and most reliable production deployment. Manages the database and app
together with automatic restarts.

### Prerequisites
- Docker Desktop (Windows/Mac) or Docker Engine + Docker Compose (Linux)

### Setup

```bash
# 1. Copy and configure environment
cp .env.example .env
```

Edit `.env` — these values are required:

```env
DB_PASSWORD=generate_a_strong_password_here
SESSION_SECRET=generate_a_long_random_string_here
APP_PORT=80
FOUNDER_PASSWORD=bsch2024
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
# 2. Build and start
docker compose up -d --build

# 3. Verify it is running
docker compose ps
docker compose logs -f app

# 4. Stop
docker compose down
```

**Access:** `http://YOUR_SERVER_IP` (or `http://localhost` if on the same machine)

### Management Commands

```bash
# View logs
docker compose logs -f app
docker compose logs -f db

# Restart app only (after code changes)
docker compose up -d --build app

# Full stop and clean up
docker compose down

# Remove all data (DESTRUCTIVE)
docker compose down -v
```

---

## Option 2: Windows Local Server (Hospital LAN)

Run the system on a Windows PC that serves all hospital computers over the local network.

### Setup

1. Follow the full installation in `docs/INSTALL.md`
2. Set `PORT=80` in `.env` (so hospital computers can access without specifying a port)
   - If port 80 is blocked, use `PORT=8080`
3. Double-click **StartServer.bat**

### Network Access

Find the server's local IP address:
```cmd
ipconfig
```
Look for **IPv4 Address** under your network adapter — e.g. `192.168.1.100`

Hospital computers open: `http://192.168.1.100` (or `http://192.168.1.100:8080`)

**No installation needed on client computers** — any web browser works.

### Run as Windows Service (auto-start on boot)

Install [NSSM](https://nssm.cc) (Non-Sucking Service Manager):

```cmd
nssm install BSCH "node" "--enable-source-maps C:\path\to\Medical-Case-Manager\artifacts\api-server\dist\index.mjs"
nssm set BSCH AppDirectory "C:\path\to\Medical-Case-Manager"
nssm set BSCH AppEnvironmentExtra PORT=80 NODE_ENV=production DATABASE_URL=postgresql://bsch_user:password@localhost:5432/bsch_db SESSION_SECRET=your_secret
nssm set BSCH AppRestartDelay 5000
nssm start BSCH
```

To stop/remove:
```cmd
nssm stop BSCH
nssm remove BSCH confirm
```

### Windows Firewall

Allow the application port through Windows Defender Firewall:

```cmd
netsh advfirewall firewall add rule name="BSCH Server" dir=in action=allow protocol=TCP localport=8080
```

---

## Option 3: Linux VPS / Cloud Server

```bash
# 1. Clone and configure
git clone https://github.com/ahmedbahnese/Medical-Case-Manager.git
cd Medical-Case-Manager
cp .env.example .env
nano .env

# 2. Install dependencies and build
pnpm install
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/bsch run build

# 3. Run with PM2 (persistent process manager)
npm install -g pm2
pm2 start "node --enable-source-maps artifacts/api-server/dist/index.mjs" \
  --name bsch \
  --env production

# 4. Auto-start on reboot
pm2 startup
pm2 save

# 5. View logs
pm2 logs bsch
```

### Nginx Reverse Proxy (optional — for port 80 + HTTPS)

```nginx
# /etc/nginx/sites-available/bsch
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/bsch /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**Linux Firewall:**
```bash
sudo ufw allow 8080/tcp   # or port 80 if using Nginx
```

---

## SSL / HTTPS

For any internet-facing deployment, add HTTPS:

| Method | Best for |
|--------|----------|
| **Nginx + Let's Encrypt (Certbot)** | Linux VPS with a domain name |
| **Cloudflare Tunnel** | Any server, zero config, free |
| **Caddy** | Automatic HTTPS with minimal config |

For **hospital LAN** deployments (no internet access), HTTP on the local network is generally acceptable as the traffic stays within the hospital network.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | Yes | — | API server listen port |
| `NODE_ENV` | Yes | — | `production` for deployments |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | — | Cookie signing secret (32+ chars) |
| `FOUNDER_PASSWORD` | No | `bsch2024` | Fallback founder password |
| `SETTINGS_PASSWORD` | No | `@Bahnasy` | Password to change sensitive settings |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `DB_PASSWORD` | Docker | — | PostgreSQL container password |
| `APP_PORT` | Docker | `80` | Host port to expose |
