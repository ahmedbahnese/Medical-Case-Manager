# دليل التثبيت — BSCH Installation Guide

## المتطلبات / Requirements

| Component | Minimum Version | Download |
|-----------|----------------|----------|
| Node.js   | 20 LTS         | https://nodejs.org |
| pnpm      | 9+             | `npm install -g pnpm` |
| PostgreSQL | 14+           | https://postgresql.org |
| Git       | 2.x            | https://git-scm.com |

---

## Windows — Step by Step

### 1. Install Prerequisites

1. Download and install **Node.js 20 LTS** from https://nodejs.org
2. Open **Command Prompt as Administrator** and install pnpm:
   ```cmd
   npm install -g pnpm
   ```
3. Download and install **PostgreSQL 16** from https://www.postgresql.org/download/windows/
   - During setup, note the password you set for the `postgres` superuser
   - Add PostgreSQL `bin` directory to PATH (e.g. `C:\Program Files\PostgreSQL\16\bin`)
4. Download and install **Git** from https://git-scm.com

### 2. Clone the Repository

```cmd
git clone https://github.com/ahmedbahnese/Medical-Case-Manager.git
cd Medical-Case-Manager
```

### 3. Create the Database

Open **pgAdmin** or **psql** and run:

```sql
CREATE USER bsch_user WITH PASSWORD 'your_strong_password';
CREATE DATABASE bsch_db OWNER bsch_user;
GRANT ALL PRIVILEGES ON DATABASE bsch_db TO bsch_user;
```

### 4. Configure Environment

```cmd
copy .env.example .env
notepad .env
```

Set these values at minimum:

```env
DATABASE_URL=postgresql://bsch_user:your_strong_password@localhost:5432/bsch_db
SESSION_SECRET=any_long_random_string_at_least_32_characters
PORT=8080
FOUNDER_PASSWORD=bsch2024

REM Also set these for Backup.bat / Restore.bat:
DB_HOST=localhost
DB_PORT=5432
DB_USER=bsch_user
DB_PASSWORD=your_strong_password
DB_NAME=bsch_db
```

### 5. Install Dependencies

```cmd
pnpm install
```

### 6. Build the Application

```cmd
pnpm --filter @workspace/api-server run build
```

```cmd
set BASE_PATH=/
pnpm --filter @workspace/bsch run build
```

Or run both at once:
```cmd
pnpm run build:prod
```

### 7. Start the Server

Double-click **StartServer.bat** in the project root, or run:

```cmd
node --enable-source-maps artifacts\api-server\dist\index.mjs
```

Open your browser: **http://localhost:8080**

Default password: **bsch2024** — change immediately in **الإعدادات**

---

## Linux / Ubuntu — Step by Step

### 1. Install Prerequisites

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
npm install -g pnpm

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Git
sudo apt install -y git
```

### 2. Create the Database

```bash
sudo -u postgres psql <<EOF
CREATE USER bsch_user WITH PASSWORD 'your_strong_password';
CREATE DATABASE bsch_db OWNER bsch_user;
GRANT ALL PRIVILEGES ON DATABASE bsch_db TO bsch_user;
EOF
```

### 3. Clone & Configure

```bash
git clone https://github.com/ahmedbahnese/Medical-Case-Manager.git
cd Medical-Case-Manager
cp .env.example .env
nano .env
```

Set `DATABASE_URL`, `SESSION_SECRET`, and `PORT` at minimum.

### 4. Install & Build

```bash
pnpm install
pnpm --filter @workspace/api-server run build
BASE_PATH=/ pnpm --filter @workspace/bsch run build
```

### 5. Start

```bash
PORT=8080 NODE_ENV=production node --enable-source-maps artifacts/api-server/dist/index.mjs
```

To keep the server running after logout, use PM2:

```bash
npm install -g pm2
pm2 start "node --enable-source-maps artifacts/api-server/dist/index.mjs" \
  --name bsch --env production
pm2 startup
pm2 save
```

---

## Docker — Quickest Setup

Requires Docker Desktop (Windows/Mac) or Docker Engine (Linux).

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env: set DB_PASSWORD and SESSION_SECRET

# 2. Start everything (database + app)
docker compose up -d --build

# 3. Check logs
docker compose logs -f app
```

Application is available at **http://localhost** (port 80).

See `docs/DEPLOYMENT.md` for production Docker configuration.

---

## Opening in VS Code

```bash
# Clone and open
git clone https://github.com/ahmedbahnese/Medical-Case-Manager.git
cd Medical-Case-Manager
code .

# Install recommended extensions when prompted, then:
pnpm install
```

The workspace includes TypeScript IntelliSense across all packages.
Use the integrated terminal to run build and start commands.

Recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense, PostgreSQL.

---

## First Login

1. Open **http://localhost:8080** in your browser
2. Enter the password: **bsch2024**
3. Go to **الإعدادات → كلمة مرور الدخول** and change the password immediately
4. Set the hospital name under **الإعدادات → اسم المستشفى**
