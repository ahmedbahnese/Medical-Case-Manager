# دليل ربط WhatsApp وTelegram وإرسال تقييمات الانتظار

## أولاً: ما الذي يفعله التكامل؟

عند تفعيل خيار **الإرسال التلقائي** من إعدادات المؤسس، ينشئ النظام رسالة تقييم من بيانات الحالة الجديدة ويرسلها إلى:

- مجموعة موظفي WhatsApp عبر WhatsApp Business Platform الرسمي.
- مجموعة أو قناة Telegram من خلال Bot API الرسمي.

يمكن أيضًا إرسال الحالة يدويًا من زر الإرسال الموجود بجوار الحالة في قائمة الانتظار.

> لا تضع Access Token أو Bot Token داخل GitHub أو في رسائل WhatsApp. احفظهما فقط في إعدادات المؤسس على جهاز المستشفى.

## ثانياً: تجهيز عنوان HTTPS من جهاز المستشفى

يجب أن يكون جهاز تشغيل النظام متصلًا بالإنترنت، مع نفق HTTPS صادر إلى خادم النفق، بدل فتح منفذ مباشر على شبكة المستشفى.

المسارات:

```text
GET  https://DOMAIN/api/webhooks/whatsapp
POST https://DOMAIN/api/webhooks/whatsapp
POST https://DOMAIN/api/webhooks/telegram
```

استخدم دليل النفق الموجود في:

```text
docs/WEBHOOK_TUNNEL_SETUP.md
```

## ثالثاً: إنشاء WhatsApp الرسمي

1. ادخل إلى Meta for Developers وأنشئ أو اختر تطبيقًا من نوع Business.
2. أضف منتج **WhatsApp**.
3. أنشئ أو اربط WhatsApp Business Account ورقم هاتف المؤسسة.
4. من WhatsApp > API احصل على:
   - Phone Number ID.
   - Access Token دائم أو System User Token مناسب للإنتاج.
5. من WhatsApp > Configuration ضع:

```text
Callback URL:
https://DOMAIN/api/webhooks/whatsapp

Verify Token:
القيمة التي تختارها أنت وتضعها في إعدادات المؤسس
```

6. فعّل Webhook field باسم `messages`.
7. أدخل المجموعة المستقبلة في إعدادات المؤسس في حقل **WhatsApp Group ID** بعد التأكد من دعم الحساب الرسمي للمجموعات وإضافة الرقم الرسمي للمجموعة.
8. اختبر إرسال رسالة من زر الإرسال اليدوي قبل تفعيل الإرسال التلقائي.

### ملاحظات WhatsApp

- استخدام WhatsApp Groups API الرسمي يخضع لأهلية حساب المؤسسة وقيود Meta.
- لا تستخدم WhatsApp Web أو حلول QR غير رسمية؛ فهي قد تؤدي إلى إيقاف الرقم.
- يجب أن يكون الرقم الرسمي والمجموعة مؤهلين في حساب Meta نفسه.
- راجع توثيق Meta الرسمي: https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview

## رابعاً: إنشاء Telegram Bot

1. افتح Telegram وابحث عن `@BotFather`.
2. أرسل `/newbot`.
3. اختر اسمًا للبوت ثم Username ينتهي بـ `bot`.
4. احتفظ بالـ Bot Token الذي يرسله BotFather.
5. أضف البوت إلى مجموعة الموظفين أو القناة.
6. امنح البوت صلاحية إرسال الرسائل، ويفضل جعله Administrator في القناة.
7. للحصول على Chat ID:
   - أضف البوت إلى المجموعة.
   - أرسل رسالة اختبار داخل المجموعة.
   - افتح:

```text
https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
```

   - ابحث عن `message.chat.id`، وغالبًا يكون رقم المجموعة سالبًا.
8. سجّل Webhook:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://DOMAIN/api/webhooks/telegram&secret_token=<WEBHOOK_SECRET>
```

9. ضع Bot Token وChat ID وWebhook Secret في إعدادات المؤسس.
10. اختبر زر الإرسال اليدوي ثم فعّل الإرسال التلقائي.

### مراجع Telegram الرسمية

- Bot API: https://core.telegram.org/bots/api
- `setWebhook`: https://core.telegram.org/bots/api#setwebhook
- `getUpdates`: https://core.telegram.org/bots/api#getupdates

## خامساً: إعدادات المؤسس داخل النظام

من الإعدادات:

1. افتح **تكامل تقييمات الانتظار مع WhatsApp وTelegram**.
2. فعّل القناة المطلوبة.
3. أدخل WhatsApp Phone Number ID وGroup ID أو Telegram Chat ID.
4. أدخل الرموز السرية في الحقول المخصصة.
5. فعّل:

```text
إرسال تقييم الحالة تلقائيًا إلى المجموعات عند إضافتها لقائمة الانتظار
```

6. عدّل نص التقييم عند الحاجة. المتغيرات المتاحة:

```text
{{hospitalName}}
{{patientName}}
{{age}}
{{address}}
{{diagnosis}}
{{transferSource}}
{{phone}}
{{nationalId}}
{{careType}}
```

7. اضغط **حفظ إعدادات الرسائل**.

## سادساً: اختبار آمن قبل التشغيل الفعلي

1. عطّل الإرسال التلقائي.
2. فعّل قناة واحدة فقط.
3. أنشئ حالة اختبار ببيانات غير حقيقية.
4. استخدم زر الإرسال اليدوي.
5. تأكد من وصول الرسالة إلى المجموعة الصحيحة.
6. احذف حالة الاختبار أو غيّر حالتها حسب سياسة المستشفى.
7. فعّل الإرسال التلقائي بعد نجاح الاختبار.

## رسالة الفشل والتشخيص

إذا لم تصل الرسالة:

- راجع أن القناة مفعلة.
- راجع Phone Number ID أو Chat ID.
- تأكد من صلاحيات البوت أو الرقم الرسمي داخل المجموعة.
- تأكد من أن النفق يعمل وأن عنوان HTTPS يمكن الوصول إليه من خارج شبكة المستشفى.
- راجع إعدادات Verify Token وWebhook Secret.
- أعد الاختبار يدويًا قبل استخدام الإرسال التلقائي.
