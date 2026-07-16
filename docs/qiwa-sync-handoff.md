# مزامنة قوى — الوضع الحالي وملف التسليم (Handoff)

آخر تحديث: 2026-07-16. اكتب هذا الملف للمحادثة الجديدة عشان تكمل بدون ما تعيد الاكتشاف.

## ما هي المزامنة

- **زر (bookmarklet)** مصدره [`src/pages/qiwaSyncBookmarklet.js`](../src/pages/qiwaSyncBookmarklet.js). المستخدم يسحبه لشريط الإشارات في المتصفح، ويضغطه وهو داخل قوى (qiwa.sa) وهو مسجّل دخول. الزر يقرأ بيانات قوى باستخدام كوكيز الجلسة ويكتبها في Supabase.
- يُسحب الزر من صفحة `SbcFacilities.jsx` (حوالي سطر 2689، عبر `buildQiwaBookmarklet`).
- **قاعدة البيانات (prod):** مشروع Supabase `gcvshzutdslmdkwqwteh` (jisr-website).
- **الجداول:** `qiwa_companies`, `qiwa_groups`, `qiwa_sessions`, `qiwa_wp_laborers`, `qiwa_wp_requests`, `qiwa_visa_requests`, `qiwa_visa_border_numbers`, `qiwa_contracts`, `qiwa_transfer_requests`, `qiwa_monthly_reports`.
- **الربط بصفحة المنشأة:** [`SbcFacilities.jsx:3309`](../src/pages/SbcFacilities.jsx) — تطابق `qiwa_companies.cr_number == facility.cr_number`. **بدون `cr_number` لا تظهر كروت قوى.**

## المشكلة الجوهرية: تقسيم CORS بين نطاقات قوى

قوى تقسّم واجهاتها على subdomains، كل واحد له CORS allowlist خاص. **تشغيلة واحدة من origin واحد لا تصل لكل شيء:**

| النطاق (origin) | ما يتاح منه |
|---|---|
| `auth.qiwa.sa` / `dashboard.qiwa.sa` | قائمة المنشآت (`/context/workspaces-v2/new`)، سياق المنشأة النشطة (`/context/company`)، criteria/indicators/nitaqat، absher، visa-proxy |
| `establishment-information.qiwa.sa` | **`establishment-file-api.qiwa.sa`** (تفاصيل كل منشأة: `cr_number`، العنوان، الترخيص، المخالفات، رصيد التأشيرات، سكن العمال) — CORS محصور بهذا الأصل **فقط** |
| `working-permits.qiwa.sa` | working-permits-api (لكن نفس البيانات متاحة على `api.qiwa.sa` وهو اللي نستخدمه) |

**النتيجة:**
- من auth/dashboard: تحصل القائمة + تفاصيل **المنشأة النشطة فقط** (وفيها `cr_number` لها هي). لكن `establishment-file-api` يفشل (CORS) → باقي المنشآت بلا `cr_number`.
- من establishment-information: `establishment-file-api` يشتغل، لكن **قائمة المنشآت تفشل** (CORS) → ترجع 0 منشأة.

## الوضع الحالي (نهاية جلسة 2026-07-16)

- `qiwa_companies`: **220 صف** (القائمة تزامنت)، لكن **`cr_number = 0` للكل** — لأن التفاصيل تُلتقط للمنشأة النشطة فقط، ومسح الملفات ما نجح بعد.
- لذلك **لا تظهر بيانات قوى في أي صفحة منشأة** (تطابق cr_number يفشل).
- استعلام التحقق:
  ```sql
  select count(*) total,
    count(*) filter (where cr_number is not null) with_cr,
    count(*) filter (where est_file_raw is not null) with_estfile
  from public.qiwa_companies;
  ```

## اللي انبنى في هذه الجلسة

1. **توسعة endpoints + أعمدة** (ترحيل `qiwa_sync_extend_2026_07_16`): سياق الحساب `/context`، `/api/v1/nitaqat-indicator`، `/api/establishment-group/eligibility`، تفاصيل establishment-file (وإصلاح bug أعمدة `addr_*` — كانت تُقرأ من endpoint خطأ فتطلع null؛ المصدر الصحيح `/financial-information/general`)، سكن العمال، الحساب المالي، العقوبات، حصة الاستقدام، سياسة العمل، وجدول جديد `qiwa_visa_border_numbers` (تفصيل كل تأشيرة داخل الطلب، N+1).
2. **مسح شامل لملفات كل المنشآت** — يلفّ على كل المنشآت (من قائمة قاعدة البيانات) ويكتب `cr_number` + تفاصيل الملف لكل واحدة، عشان كل المنشآت تطابق بعد مزامنة واحدة. يفحص الوصول أولاً (probe) ويتخطّى بتنبيه لو غير متاح.
3. **كلا المسحين (الملفات + العمّال) يقرأ القائمة من قاعدة البيانات** (لا من جلب نفس التشغيل)، عشان يشتغلان من establishment-information.qiwa.sa حيث القائمة محجوبة.
4. **الرسالة النهائية تعرض نتيجة المسح** بوضوح: `✅ قائمة: N · ملفات X/Y` أو تنبيه واضح. تبقى 30 ثانية.

## العائق المتبقي / الخطوة التالية للتحقق

المستخدم زامن (على الأرجح من establishment-information) وطلعت «0 منشأة» و`cr_number` لسه 0. الرسالة الجديدة تفرّق بين حالتين:

- **الأرجح: الزر القديم من الكاش.** الرسالة الجديدة تبدأ بـ `✅ قائمة:`؛ لو طلعت `✅ 0 منشأة` (الصيغة القديمة) → المستخدم لسه على الزر القديم، **لازم يسحب الزر من جديد** بعد ما يخلّص نشر Netlify.
- **أو: establishment-file غير متاح فعلاً من هناك** → الرسالة تقول `⚠️ ملف المنشآت غير متاح من هذا الموقع` (يستبعده أن التقاطات المستخدم اليدوية أثبتت أنه يشتغل من establishment-information).

**الخطوة التالية:** المستخدم يسحب الزر من جديد، يزامن من `establishment-information.qiwa.sa`، ويقول الرسالة النهائية بالضبط. لو `ملفات X/220` → نجح؛ تحقق بالاستعلام أعلاه.

## الحل الجذري الموصى به (للمحادثة الجديدة)

رقصة CORS في العميل هشّة. الزر **يلتقط أصلاً JWT قوى** في `qiwa_sessions.access_token`. الحل المتين: **جلب من طرف الخادم** (Netlify/Supabase edge function، أو جهاز muqeem-bot تحت PM2) يستدعي `api.qiwa.sa` و `establishment-file-api.qiwa.sa` مباشرة بالـ JWT المخزّن — **بلا CORS من الخادم**.

- تحذير: عمر JWT ~5 دقائق (`exp`). فإما ينفّذ المسح فوراً بعد الالتقاط وبسرعة (تزامن)، أو نطبّق تحديث توكن.
- الفائدة: التقاط واحد من العميل → مسح خادمي كامل لكل الـ220 منشأة بموثوقية.

## مراجع ومعرّفات

- الزر: `src/pages/qiwaSyncBookmarklet.js` (يُبنى عبر `buildQiwaBookmarklet`، يُصغّر، يُسحب من `SbcFacilities.jsx`).
- تطابق المنشأة↔قوى: `SbcFacilities.jsx:3309`.
- مشروع Supabase prod: `gcvshzutdslmdkwqwteh`.
- النشر: push إلى `main` → Netlify يبني تلقائياً (`netlify.toml`).
- commits الجلسة: `67bbf6a`, `359a137`, `eaa0cb1`, `55fef50`.
- فحص بناء الزر محلياً: استورد `buildQiwaBookmarklet`، فُكّ `decodeURIComponent` بعد إزالة `javascript:`، ثم `node --check`.
