# دليل التثبيت — BSCH Installation Guide

## المتطلبات / Requirements

| Component | Minimum Version | Notes |
|-----------|----------------|-------|
| Node.js   | 20 LTS         | https://nodejs.org |
| pnpm      | 9+             | `npm install -g pnpm` |
| PostgreSQL | 14+           | https://postgresql.org |
| Git       | 2.x            | https://git-scm.com |

---

## تثبيت على Windows / Windows Installation

### 1. تثبيت المتطلبات / Install Prerequisites

1. Install **Node.js 20 LTS** from https://nodejs.org
2. Install **pnpm**: open Command Prompt as Administrator and run:
   ```
   npm install -g pnpm
   ```
3. Install **PostgreSQL 16** from https://postgresql.org/download/windows/
   - Remember the password you set for the `postgres` superuser
4. Install **Git** from https://git-scm.com

### 2. استنساخ المستودع / Clone the Repository

```cmd
git clone https://github.com/ahmedbahnese/Medical-Case-Manager.git
cd Medical-Case-Manager
```

### 3. إنشاء قاعدة البيانات / Create Database

Open **pgAdmin** or **psql** and run:

```sql
CREATE USER bsch_user WITH PASSWORD 'your_strong_password';
CREATE DATABASE bsch_db OWNER bsch_user;
GRANT ALL PRIVILEGES ON DATABASE bsch_db TO bsch_user;
```

### 4. إعداد المتغيرات البيئية / Environment Setup

Copy the example file and edit it:
```cmd
copy .env.example .env
notepad .env
```

Fill in these values:
```
DATABASE_URL=postgresql://bsch_user:your_strong_password@localhost:5432/bsch_db
SESSION_SECRET=any_long_random_string_here
PORT=8080
```

### 5. تثبيت التبعيات / Install Dependencies

```cmd
pnpm install
```

### 6. بناء التطبيق / Build the Application

```cmd
pnpm --filter @workspace/api-server run build
```

```cmd
set BASE_PATH=/
pnpm --filter @workspace/bsch run build
```

### 7. تشغيل الخادم / Start the Server

```cmd
scripts\StartServer.bat
```

Or manually:
```cmd
set PORT=8080
set NODE_ENV=production
node --enable-source-maps artifacts\api-server\dist\index.mjs
```

Open your browser to: **http://localhost:8080**

Default password: **bsch2024** (change immediately in Settings)

---

## تثبيت على Linux / Ubuntu Linux Installation

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

### 2. Database Setup

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

---

## تثبيت بـ Docker / Docker Installation

```bash
cp .env.example .env
# Edit .env with your values

docker compose up -d
```

Application will be available at **http://localhost:80**

---

## أول تسجيل دخول / First Login

- Open http://localhost:8080 in your browser
- Enter the default password: **bsch2024**
- Go to **الإعدادات → كلمة مرور الدخول** and change the password immediately
