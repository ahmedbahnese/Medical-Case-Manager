# الوصول الخارجي عبر VPS وWindows 7

هذا المسار يربط تطبيق BSCH الذي يعمل على `Windows 7` داخل المستشفى برابط HTTPS ثابت عبر VPS خارجي، من دون فتح منفذ وارد في راوتر المستشفى ومن دون تثبيت أي برنامج على أجهزة المستخدمين.

```text
Browser على بيانات الهاتف
        |
        | HTTPS :443
        v
VPS + Caddy + public DNS
        |
        | SSH reverse tunnel (outbound من المستشفى)
        v
Windows 7: localhost:8080
```

## المتطلبات

يحتاج التنفيذ إلى VPS يعمل بنظام Ubuntu حديث، وعنوان عام ثابت أو DNS ثابت للـVPS، ونطاق أو نطاق فرعي يشير بسجل `A` إلى عنوان الـVPS. يمكن استخدام نطاق فرعي مجاني مثل DuckDNS بدل شراء دومين، لكن يجب تحديث عنوانه إذا تغيّر عنوان الـVPS.

على جهاز Windows 7 نحتاج إلى PuTTY/Plink متوافق مع النظام، ومفتاح SSH بصيغة `.ppk`. لا تضع المفتاح الخاص أو ملف `tunnel-config.bat` في GitHub.

## إعداد VPS

1. سجّل الدخول إلى Ubuntu عبر SSH.
2. انسخ مجلد `deploy/vps` إلى الـVPS أو انسخ السكربت يدويًا.
3. شغّل:

```bash
sudo APP_DOMAIN=app.example.com bash deploy/vps/setup-vps.sh
```

4. أضف سجل DNS من النوع `A`:

```text
app.example.com  ->  PUBLIC_IP_OF_VPS
```

5. أنشئ مفتاحًا مخصصًا للنفق، مثلًا على جهاز إداري موثوق:

```bash
ssh-keygen -t ed25519 -f hospital-tunnel
```

إذا كان إصدار PuTTY القديم لا يدعم Ed25519، أنشئ RSA 4096 بدلًا منه، ثم حوّل المفتاح إلى `.ppk` باستخدام PuTTYgen.

6. أضف المفتاح العام إلى:

```text
/home/hospital-tunnel/.ssh/authorized_keys
```

ثم اضبط الملكية والصلاحيات:

```bash
sudo chown -R hospital-tunnel:hospital-tunnel /home/hospital-tunnel/.ssh
sudo chmod 700 /home/hospital-tunnel/.ssh
sudo chmod 600 /home/hospital-tunnel/.ssh/authorized_keys
```

لا تفتح المنفذ `18080` في UFW. يجب أن يستمع محليًا داخل الـVPS فقط، بينما يفتح Caddy المنفذين 80 و443.

## إعداد Windows 7

1. ثبّت Plink في مسار ثابت، مثل `C:\Program Files\PuTTY\plink.exe`.
2. أنشئ مجلدات `C:\BSCH\keys` و`C:\BSCH\logs`.
3. ضع المفتاح الخاص في `C:\BSCH\keys\hospital-tunnel.ppk`.
4. انسخ `tunnel-config.example.bat` إلى `tunnel-config.bat`، ثم عدّل `VPS_HOST` و`VPS_USER` ومسارات Plink والمفتاح.
5. اختبر التطبيق محليًا أولًا على Windows:

```text
http://127.0.0.1:8080
```

6. شغّل `start-tunnel.bat`. سيبقى مفتوحًا ويعيد الاتصال كل 10 ثوانٍ عند انقطاع الإنترنت أو إعادة تشغيل الـVPS.
7. بعد نجاح الاختبار، شغّل `install-tunnel-task.bat` بصلاحية Administrator لتثبيت مهمة تعمل عند بدء Windows.
8. افتح الرابط العام عبر HTTPS وتحقق من صفحة الدخول.

## إعدادات أمنية إلزامية

استخدم حساب SSH منفصلًا للنفق ولا تستخدم `root`. لا تضع كلمة مرور SSH في السكربت. استخدم مفتاحًا خاصًا بصلاحيات قراءة للمستخدم الإداري فقط. غيّر كلمات مرور التطبيق الافتراضية، واستخدم `SESSION_SECRET` طويلًا وعشوائيًا. لا تفتح PostgreSQL/SQLite أو منفذ التطبيق الداخلي للعامة.

هذا النفق يوفّر النقل الآمن، لكنه لا يضيف نظام هوية للمستخدمين. يجب أن تبقى مصادقة التطبيق وصلاحياته مفعّلة، ومن الأفضل إضافة طبقة دخول ثانية على الـVPS إذا كان الرابط سيُستخدم خارج شبكة موثوقة.

## اختبار الاتصال

على الـVPS:

```bash
sudo ss -ltnp | grep -E ':443|:18080'
curl -I https://app.example.com
```

على Windows راجع:

```text
C:\BSCH\logs\tunnel.log
```

المنفذ `18080` يجب أن يظهر على عنوان loopback فقط. إذا ظهر على `0.0.0.0` فهناك إعداد SSH خاطئ ويجب إيقاف النفق قبل المتابعة.

## استكشاف الأعطال

إذا ظهر `Connection refused` في Plink، تأكد من تشغيل خادم BSCH على `127.0.0.1:8080`. إذا ظهر `Unable to open connection`، تحقق من DNS والجدار الناري والمنفذ 22. إذا فتح الرابط ولم تظهر الواجهة، تحقق من أن Caddy يعمل وأن `reverse_proxy` يشير إلى `127.0.0.1:18080`. إذا رفض Plink المفتاح، تأكد من أن المفتاح العام موجود في `authorized_keys` وأن المفتاح الخاص بصيغة PuTTY الصحيحة.

لا تستخدم Cloudflare Quick Tunnel كرابط إنتاجي؛ الروابط العشوائية مخصصة للاختبار ولا تضمن الاستمرارية. هذا التصميم يجعل الرابط ثابتًا من جهة DNS، لكن الموقع لن يكون متاحًا أثناء توقف تطبيق Windows أو انقطاع الإنترنت في المستشفى أو توقف الـVPS.
