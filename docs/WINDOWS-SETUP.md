# BSCH — Windows Server Setup Guide

نظام إدارة الحالات الطبية — دليل التثبيت على Windows

---

## متطلبات النظام

| المكوّن | الإصدار المطلوب | رابط التحميل |
|--------|--------------|-------------|
| Windows | 10 / 11 / Server 2019+ | — |
| Node.js | 20 LTS | https://nodejs.org |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/mysql/ |

---

## الخطوة 1 — تثبيت MySQL

1. تحميل MySQL 8 Community Server من الرابط أعلاه.
2. تشغيل المثبت واختيار **Server Only**.
3. تعيين كلمة مرور الـ root.
4. إنشاء قاعدة البيانات والمستخدم:

```sql
-- افتح MySQL Workbench أو Command Line وشغّل:
CREATE DATABASE bsch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bsch_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON bsch_db.* TO 'bsch_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## الخطوة 2 — تثبيت التطبيق

### الطريقة أ — المثبت (NSIS Installer) — موصى به

1. شغّل ملف `BSCH-Setup-1.0.0.exe`.
2. اتبع خطوات المثبت، اختر مجلد التثبيت.
3. سيُنشئ المثبت:
   - اختصاراً على سطح المكتب
   - اختصاراً في قائمة Start

### الطريقة ب — النسخة المحمولة (Portable)

1. انسخ ملف `BSCH-Portable-1.0.0.exe` إلى أي مجلد.
2. شغّله مباشرة — لا يحتاج تثبيت.

---

## الخطوة 3 — إعداد بيانات الاتصال بقاعدة البيانات

عند تشغيل التطبيق لأول مرة، إذا كانت بيانات الاتصال مختلفة عن الافتراضية، أنشئ الملف:

```
%APPDATA%\BSCH\bsch.config.json
```

مثال على محتوى الملف:

```json
{
  "DB_HOST": "127.0.0.1",
  "DB_PORT": "3306",
  "DB_USER": "bsch_user",
  "DB_PASSWORD": "your_strong_password",
  "DB_NAME": "bsch_db"
}
```

**القيم الافتراضية** (إذا لم يُنشأ الملف):
- Host: `127.0.0.1`
- Port: `3306`
- User: `bsch_user`
- Password: `bsch_password`
- Database: `bsch_db`

---

## تشغيل التطبيق

- افتح التطبيق من اختصار سطح المكتب أو من قائمة Start.
- التطبيق **لا يبدأ تلقائياً** مع Windows — يُشغَّل يدوياً عند الحاجة.
- عند فتح التطبيق، يبدأ الخادم الداخلي تلقائياً في الخلفية.
- تظهر شاشة التحميل حتى يكتمل الاتصال بقاعدة البيانات.

---

## الوصول من أجهزة المستشفى الأخرى

لا يزال بإمكانك استخدام BSCH من أي جهاز آخر في نفس الشبكة:

1. على الجهاز الرئيسي (الذي يشغّل BSCH)، ابحث عن IP الجهاز:
   ```cmd
   ipconfig
   ```
2. من الأجهزة الأخرى، افتح المتصفح وادخل:
   ```
   http://192.168.x.x:8080
   ```
   (استبدل `192.168.x.x` بـ IP الجهاز الرئيسي)

---

## بناء التطبيق من المصدر (للمطورين)

```bash
# 1. تثبيت الاعتمادات
pnpm install

# 2. بناء الخادم والواجهة
pnpm build:prod

# 3. بناء مثبت Windows (يتطلب electron-builder)
cd electron
npm install
npm run build-win
```

الملفات الناتجة في `electron/dist-electron/`:
- `BSCH-Setup-1.0.0.exe` — المثبت الكامل
- `BSCH-Portable-1.0.0.exe` — النسخة المحمولة

---

## استكشاف الأخطاء

| المشكلة | الحل |
|--------|------|
| "تعذر الاتصال بالخادم" | تأكد من تشغيل MySQL وصحة بيانات `bsch.config.json` |
| الصفحة لا تفتح | افتح `http://localhost:8080` في المتصفح للتحقق |
| خطأ في كلمة المرور | كلمة المرور الافتراضية: `bsch2024` |
| نسيت كلمة مرور الإعدادات | حدّثها مباشرة في جدول `settings` في MySQL |
