# BSCH — نظام إدارة الحالات الطبية
# Hospital Case Management System — Windows Desktop Edition

نظام متكامل لإدارة حالات المرضى في غرف الحضانة والعناية المركزة
مستشفى الأطفال التخصصي بالبحيرة — إصدار Windows Desktop (Electron)

---

## المكدس التقني (Stack)

- **Monorepo:** pnpm workspaces، Node.js 20، TypeScript 5.9
- **Backend:** Express 5 + Drizzle ORM
- **Database:** **PostgreSQL** (Replit built-in — `DATABASE_URL` env var)
- **Validation:** Zod (`zod/v4`)، `drizzle-zod`
- **Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui
- **Desktop Packaging:** Electron 32 + electron-builder (NSIS installer + Portable)
- **Routing:** Wouter

---

## بنية المشروع

```
artifacts/
  api-server/          ← Express 5 backend
    src/routes/        ← جميع مسارات API
    src/lib/db-init.ts ← إنشاء الجداول + بيانات أولية (MySQL-compatible)
    build.mjs          ← esbuild bundler (يُدمج mysql2 في الحزمة)
  bsch/                ← React + Vite frontend
lib/
  db/src/schema/       ← مخططات Drizzle (mysql-core)
electron/
  main.js              ← Electron main process (يُشغّل الخادم تلقائياً)
  bsch.config.example.json ← مثال على إعدادات قاعدة البيانات
docs/
  WINDOWS-SETUP.md     ← دليل التثبيت الكامل على Windows
```

---

## بناء تطبيق Windows

```bash
# 1. تثبيت الاعتمادات
pnpm install

# 2. بناء الخادم والواجهة (إنتاج)
pnpm build:prod

# 3. بناء مُثبِّت Windows
cd electron
npm install
npm run build-win
# → electron/dist-electron/BSCH-Setup-1.0.0.exe  (مثبّت NSIS)
# → electron/dist-electron/BSCH-Portable-1.0.0.exe  (محمول)
```

---

## إعداد قاعدة البيانات (MySQL)

متغيرات البيئة المطلوبة (يُعينها Electron تلقائياً من bsch.config.json):

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `DB_HOST` | `127.0.0.1` | عنوان MySQL |
| `DB_PORT` | `3306` | منفذ MySQL |
| `DB_USER` | `bsch_user` | اسم المستخدم |
| `DB_PASSWORD` | `bsch_password` | كلمة المرور |
| `DB_NAME` | `bsch_db` | اسم قاعدة البيانات |

إعداد MySQL (مرة واحدة):
```sql
CREATE DATABASE bsch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bsch_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON bsch_db.* TO 'bsch_user'@'localhost';
FLUSH PRIVILEGES;
```

ملف الإعداد للتطبيق المثبَّت: `%APPDATA%\BSCH\bsch.config.json`

---

## تشغيل Electron (تطوير)

```bash
pnpm build:prod       # بناء الخادم والواجهة أولاً
cd electron
npm install
npm start             # يفتح نافذة Electron + يشغّل الخادم الداخلي
```

---

## نقاط حادة (Gotchas)

- **MySQL بدلاً من PostgreSQL:** كل مخططات Drizzle تستخدم `mysql-core`؛ لا تستخدم `pg-core` أو `pg`.
- **لا يوجد `.returning()` في MySQL:** كل routes تستخدم نمط `$returningId()` + SELECT بعدها.
- **لا يوجد `ilike` في MySQL:** الاستعلامات تستخدم `like` (LIKE حساس بالحالة بالافتراضي في utf8mb4).
- **mysql2 مُدمج في bundle:** لا يحتاج تثبيت منفصل عند التغليف.
- **`PORT` إلزامي:** `api-server/src/index.ts` يرمي خطأ إن لم يُضبط.
- **الخادم لا يعمل على Replit:** يتطلب MySQL — التطبيق مُصمَّم للتشغيل على Windows.
- **icon.ico:** يجب وضع ملف ICO في `electron/` قبل البناء للحصول على أيقونة مخصصة.
- **`TS6305` errors:** ظاهرة طبيعية — تختفي بعد تشغيل `pnpm run typecheck:libs`.

---

## User preferences

_لا توجد تفضيلات مسجلة بعد._
