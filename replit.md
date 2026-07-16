# BSCH — نظام إدارة الحالات الطبية

نظام متكامل لإدارة حالات المرضى في غرف الحضانة والعناية المركزة بمستشفى الأطفال المتخصص بالبحيرة.

---

## تشغيل النظام

| الخدمة | الأمر |
|---|---|
| API Server (dev) | `PORT=8080 DATABASE_URL=... pnpm --filter @workspace/api-server run dev` |
| Frontend (dev) | `PORT=18429 BASE_PATH=/ pnpm --filter @workspace/bsch run dev` |
| تطبيق مخطط DB | `pnpm --filter @workspace/db run push` |
| Typecheck كامل | `pnpm run typecheck` |
| Build كامل | `pnpm run build` |
| إعادة توليد API hooks | `pnpm --filter @workspace/api-spec run codegen` |

> **متطلب:** يجب ضبط `DATABASE_URL` (Postgres connection string) قبل تشغيل `db push`.

---

## المكدس التقني (Stack)

- **Monorepo:** pnpm workspaces، Node.js 24، TypeScript 5.9
- **Backend:** Express 5
- **Database:** PostgreSQL + Drizzle ORM
- **Validation:** Zod (`zod/v4`)، `drizzle-zod`
- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui
- **Toast notifications:** Sonner (`<Toaster>` في `layout.tsx`)
- **Routing:** Wouter
- **API codegen:** Orval (OpenAPI → React Query hooks + Zod schemas)

---

## بنية المشروع

```
artifacts/
  api-server/          ← Express 5 backend (منفذ 8080)
    src/routes/        ← جميع مسارات API
  bsch/                ← React + Vite frontend (منفذ 18429)
    src/
      pages/           ← جميع صفحات التطبيق (14 صفحة)
      components/      ← مكونات مشتركة (layout, confirm-dialog, ui/...)
      lib/             ← api.ts (fetch helpers)، constants.ts (labels/translate)
lib/
  db/src/schema/       ← مخططات Drizzle لقاعدة البيانات
  api-client-react/    ← React Query hooks (مولّدة بـ Orval)
  api-zod/             ← Zod schemas (مولّدة بـ Orval)
  api-spec/            ← OpenAPI spec
```

---

## مخطط قاعدة البيانات

### جداول قائمة (محدَّثة)

| الجدول | التعديلات المضافة |
|---|---|
| `medical_cases` | `mobe` (text)، `ventilation_start_date`، `ventilation_end_date`، `discharge_reason` (enum: improved/request/transferred/death) |

### جداول جديدة

| الجدول | الوصف |
|---|---|
| `settings` | مفاتيح/قيم لإعدادات المستشفى (اسم، شعار base64، كلمة المرور) |
| `incident_reports` | تقارير الحوادث مع بيانات الحالات (JSON blob في `cases_json`) |
| `audit_logs` | سجل كل إجراء يقوم به المستخدم في النظام |

> **تنبيه:** بعد إعداد `DATABASE_URL` يجب تشغيل:
> ```
> pnpm --filter @workspace/db run push
> ```

---

## مسارات API

### قديمة (محدَّثة)

| المسار | التحديثات |
|---|---|
| `GET/POST/PATCH /api/cases` | حقول جديدة (mobe، ventilationDates، dischargeReason)، كتابة audit log، تدفق الصرف |
| `GET/POST/PATCH /api/waiting-cases` | تدفق قبول كامل (اختيار قسم → إنشاء حالة طبية)، سبب الخروج |
| `GET/DELETE /api/backups/:id` | تحميل backup كـ JSON file، حذف backup |

### جديدة

| المسار | الوصف |
|---|---|
| `GET /api/settings` | جلب جميع الإعدادات |
| `POST /api/settings` | تحديث إعداد (يتطلب كلمة مرور) |
| `POST /api/settings/verify-password` | التحقق من كلمة مرور الإعدادات |
| `GET/POST /api/incident-reports` | قائمة + إنشاء تقرير حادث |
| `GET/PATCH/DELETE /api/incident-reports/:id` | عرض + تعديل + حذف تقرير |
| `GET /api/audit-logs` | سجل العمليات (محدود بـ limit query param) |

---

## صفحات الواجهة الأمامية

| الصفحة | المسار | الوصف |
|---|---|---|
| تسجيل الدخول | `/` | كلمة مرور المؤسس |
| لوحة التحكم | `/dashboard` | KPI cards، بطاقات الأقسام، CSV export، font-size slider |
| إضافة حالة | `/add-case` | اختيار: إدخال يدوي أو استيراد ذكي |
| استيراد جماعي | `/bulk-import` | 3 خطوات: إدخال → مراجعة (جدول قابل للتعديل) → تم |
| حالات الانتظار | `/waiting-cases` | تبويبات سيرفو/استقبال، قبول مع اختيار قسم |
| تفاصيل الحالة | `/case/:id` | تعديل inline، تصريح مع تأكيد، حذف مع تأكيد |
| البحث | `/search` | بحث بالاسم/رقم الملف/رقم قومي، فلتر قسم |
| التقرير اليومي | `/print-reports` | وقت/تاريخ قابل للتعديل، فلتر قسم، قوائم انتظار، طباعة |
| تقرير الإشغال | `/occupancy-report` | تاريخ/وقت قابل للتعديل، جدول كامل، شعار في الهيدر |
| النسخ الاحتياطية | `/backup` | قائمة + تحميل + حذف مع تأكيد |
| تقرير الحوادث | `/incident-report` | إدخال بيانات + طباعة مطابقة للنموذج Word، يحفظ الحالات في الانتظار |
| الإعدادات | `/settings` | محمي بكلمة مرور (`@Bahnasy`)، اسم المستشفى، رفع شعار، تغيير الوضع |
| سجل التصريح | `/discharge-history` | آخر 30 يوم، إعادة قبول خلال 24 ساعة، بحث |
| سجل العمليات | `/audit-log` | محمي بكلمة مرور، جميع إجراءات النظام |

---

## قرارات معمارية

- **Toast:** تم التبديل من `@radix-ui/react-toast` إلى **Sonner** — `<Toaster>` في `layout.tsx`، الاستخدام: `toast.success()` / `toast.error()`.
- **Plain fetch بدلاً من codegen:** الـ endpoints الجديدة تستخدم helpers في `lib/api.ts` (`apiGet`, `apiPost`, إلخ) بدلاً من إعادة تشغيل Orval.
- **كلمة مرور الإعدادات:** `@Bahnasy` (افتراضية، قابلة للتغيير من صفحة الإعدادات).
- **الشعار:** مخزن كـ base64 في جدول `settings` بالمفتاح `logo`.
- **`ConfirmDialog`:** مكوّن مشترك يغلّف `AlertDialog` لجميع الإجراءات الإتلافية.
- **Audit log:** كل `create/update/delete/discharge` في routes يستدعي `logAction()` من `audit-logs.ts`.

---

## نقاط حادة (Gotchas)

- **`PORT` و`BASE_PATH` إلزاميان:** `vite.config.ts` و`api-server/src/index.ts` يرميان خطأ إن لم يُضبطا.
- **`db push` قبل التشغيل الإنتاجي:** الجداول الأربعة الجديدة والأعمدة الجديدة على `medical_cases` لا تُنشأ تلقائياً.
- **Sonner فقط:** لا تستخدم `useToast` من `@/components/ui/use-toast` في الصفحات الجديدة — استورد `toast` من `"sonner"` مباشرة.
- **`typeof fn()` في TypeScript:** غير مسموح في type positions — استخدم interface مسماة بدلاً منها.
- **`TS6305` errors:** تحذيرات project-reference لا تؤثر على Vite dev server (يحل المصادر مباشرة).

---

## User preferences

_لا توجد تفضيلات مسجلة بعد._
