# BSCH Mobile — Android وiPhone

تمت إضافة مصدر تطبيق هاتف أصلي يفتح نفس واجهة BSCH الحالية، لذلك تظهر كل الصفحات والوظائف وفق صلاحيات الحساب التي يرسلها الخادم. المؤسس يستطيع من الهاتف إرسال الرسائل وبدء المكالمات، بينما لا يستطيع أي حساب آخر استخدام أدوات المؤسس.

## Android

المصدر موجود في `android-founder/`، ويستخدم WebView مع:

- HTTP داخل شبكة المستشفى.
- صلاحية `RECORD_AUDIO`.
- تمرير جلسة تسجيل الدخول وملفات تعريف الارتباط نفسها.
- User-Agent مميز `BSCH-Mobile-App`.
- واجهة لتغيير عنوان السيرفر من الهاتف.

يتطلب البناء Android Studio أو Android SDK وJDK 17. من داخل مجلد `android-founder`:

```bash
./gradlew assembleDebug
```

## iPhone / iPad

المصدر موجود في `ios-mobile/BSCHMobile/`، ويحتاج Xcode على macOS لإنشاء مشروع iOS أو إضافته إلى مشروع Xcode جديد. يستخدم `WKWebView` ويدعم:

- HTTP المحلي عبر App Transport Security.
- طلب إذن الميكروفون.
- `WKMediaCaptureType.microphone` للمكالمات الصوتية.
- حفظ عنوان السيرفر.
- Portrait وLandscape.

لا يمكن إنشاء ملف `.ipa` موقّع داخل بيئة Linux الحالية؛ يتطلب ذلك macOS وحساب Apple Developer أو تشغيل Xcode Cloud. بعد فتح المصدر في Xcode، يجب اختيار Bundle Identifier `com.bsch.mobile` ثم البناء على جهاز iPhone أو TestFlight.

## الاتصال عبر HTTP

هذا التطبيق الأصلي هو الحل المطلوب للاتصال من `http://192.168.x.x`؛ فقيود المتصفح العادي على HTTP لا تنطبق بالطريقة نفسها على صلاحية WebView الأصلية. يجب أن يكون الهاتف والسيرفر على نفس شبكة المستشفى، وأن يسمح جدار Windows بالمنفذ، وأن يكون السيرفر مربوطًا على `0.0.0.0` بدل `127.0.0.1`.

## TURN

التطبيق لا يلغي الحاجة إلى TURN في الشبكات المقيدة. إذا كان الهاتف والسيرفر والعملاء خلف NAT أو جدار ناري معقد، يجب إعداد TURN في الواجهة عبر متغيرات `VITE_TURN_URL` و`VITE_TURN_USERNAME` و`VITE_TURN_CREDENTIAL`.
