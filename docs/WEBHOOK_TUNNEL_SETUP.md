# تشغيل Webhooks من داخل المستشفى عبر نفق HTTPS

## المراجع الرسمية

- Meta WhatsApp Webhooks: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview
- Meta Groups API: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups
- Telegram Bot API: https://core.telegram.org/bots/api

النظام يبقى داخل شبكة المستشفى، ولا يتم فتح منفذ دخول مباشر إلى جهاز قاعدة البيانات. يجب تشغيل نفق HTTPS صادر من جهاز الخادم إلى عنوان عام موثوق.

## المسارات المطلوبة

```text
GET  /api/webhooks/whatsapp
POST /api/webhooks/whatsapp
POST /api/webhooks/telegram
```

## المتطلبات

- اسم نطاق أو عنوان HTTPS ثابت من مزود النفق.
- تثبيت أداة النفق على جهاز تشغيل BSCH.
- تشغيل خادم BSCH على المنفذ المحلي المستخدم في `BSCH_PORT` أو المنفذ الافتراضي 8080.
- عدم مشاركة Access Token أو Bot Token في المحادثات أو ملفات Git.

## Cloudflare Tunnel (المسار المقترح)

1. إنشاء Tunnel من حساب Cloudflare وربطه باسم نطاق المؤسسة.
2. توجيه الخدمة إلى:

```text
http://127.0.0.1:8080
```

3. تشغيل النفق كخدمة Windows مع إعادة التشغيل تلقائيًا.
4. استخدام عنوان HTTPS الناتج في Meta Webhooks وTelegram Bot API.
5. في إعدادات المؤسس استخدم:

```text
WhatsApp Verify Token = قيمة عشوائية من اختيار المؤسسة
Telegram Webhook Secret = قيمة عشوائية من اختيار المؤسسة
```

6. اختبار المسارات من خارج شبكة المستشفى قبل تشغيل الرسائل الحقيقية.

## إعداد Meta WhatsApp

- Webhook URL:

```text
https://DOMAIN/api/webhooks/whatsapp
```

- Verify Token: نفس القيمة المحفوظة في إعدادات المؤسس.
- تفعيل حقل `messages`.
- إدخال Phone Number ID وAccess Token وGroup ID في إعدادات المؤسس.

## إعداد Telegram

بعد تشغيل النفق، يتم استدعاء `setWebhook` مرة واحدة باستخدام:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://DOMAIN/api/webhooks/telegram&secret_token=<WEBHOOK_SECRET>
```

يُفضّل استخدام POST JSON بدل query string في الإنتاج حتى لا يظهر الرمز في سجلات المتصفح.

## ملاحظات أمنية

- الـWebhook لا يعرض بيانات المرضى.
- يتم رفض Telegram إذا كان `X-Telegram-Bot-Api-Secret-Token` غير صحيح.
- يتم التحقق من WhatsApp Verify Token أثناء تسجيل الـWebhook.
- لا تضع الرموز السرية في GitHub أو ملفات المشروع.
- يجب تقييد عنوان النفق على مسارات API فقط إن كان مزود النفق يسمح بذلك.
- يجب الاحتفاظ بنسخة احتياطية من قاعدة SQLite قبل تفعيل التكامل.
