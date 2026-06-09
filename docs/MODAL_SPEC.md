# مواصفات النافذة المنبثقة — نمط «عقد إيجار جديد»

مرجع لبناء أي نافذة منبثقة (Modal/Wizard) بنفس النمط.
المصدر: `src/pages/branch/BranchRentCard.jsx` (مكوّن `ContractModal`)
مكوّنات مشتركة: `src/pages/branch/ObligationModalUI.jsx` و `src/pages/KafalaCalculator.jsx` (`DateField` / `CalendarPopup`).

---

## 1) الهيكل العام (الغلاف)

- عرض عبر **Portal** إلى `document.body` (`ReactDOM.createPortal`).
- **الطبقة الخلفية (Overlay):**
  `position:fixed; inset:0; background:rgba(0,0,0,0.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px`
  - **بدون `onClick`** → النقر خارجها لا يغلق (الإغلاق فقط بزر X).
- **البطاقة:**
  `background:var(--modal-bg); border-radius:16; width:600; max-width:95vw; height:560 (ثابت — الخطوتان بنفس الارتفاع); max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 20px 50px rgba(0,0,0,.5); border:1px solid rgba(255,255,255,.06)`
- **غلاف داخلي** `dir="rtl"` + `position:relative` + `font-family:'Cairo','Tajawal',sans-serif`، عمودي بارتفاع 100%.

## 2) الرأس + شريط التقدّم

- الرأس: padding `20px 24px 0`:
  - أيقونة `Building2` 28px ذهبية + العنوان 22px / وزن 600.
  - العنوان: «عقد إيجار جديد» (إضافة) / «تعديل عقد الإيجار» (تعديل) / **مخفي في شاشة النجاح**.
- **زر الإغلاق X:** `34×34; border-radius:9; background:linear-gradient(180deg,#323232,#262626); border:1px solid rgba(255,255,255,.07); hover أحمر`.
  - موضعه **مطلق** `position:absolute; top:18; left:22; z-index:3` — حتى في شاشة النجاح يطفو ولا يأخذ مساحة من التخطيط.
- **شريط التقدّم:** صف من N أعمدة `height:3; border-radius:4`، المكتمل `linear-gradient(90deg,#D4A017,#F0C040)` والباقي `rgba(255,255,255,.06)`، `margin-top:14`. **يختفي في شاشة النجاح**.

## 3) الإطار الذهبي للقسم (Section)

- منطقة المحتوى: padding `24px 24px 6px; flex:1; overflow:hidden; display:flex; flex-direction:column`.
- الإطار: `border:1.5px solid rgba(212,160,23,.35); border-radius:12; padding:22px 20px 20px; position:relative; flex:1; min-height:0; display:flex; flex-direction:column`.
- عنوان القسم محفور في الحافة: `position:absolute; top:-10; right:14; background:var(--modal-bg); padding:0 8px; font-size:13; weight:600; color:#D4A017` + أيقونة `FileText` 12px.
  - «بيانات العقد» (خطوة 1) / «المستندات والجدولة» (خطوة 2).

## 4) الحقول وأنماطها (Design tokens)

- **اللابل (lblS):** `font-size:14; weight:500; color:rgba(255,255,255,.6); margin-bottom:8; text-align:start`. الإلزامي تتبعه نجمة حمراء `<span style="color:#e87265">*</span>`.
- **الإنبوت (fS):** `width:100%; height:42; padding:0 14; border:1px solid rgba(255,255,255,.07); border-radius:10; font-size:14; weight:500; color:var(--tx); background:linear-gradient(180deg,#323232,#262626); text-align:center; box-shadow:0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05); transition:.18s`.
  - نسخة LTR (`fLtr`) = نفسها + `direction:ltr` (للأرقام/الأكواد/التواريخ).
- **حقول الأرقام:** بلا أسهم (`appearance:textfield` + إخفاء spinners عبر CSS).
- **الشبكة:** عمودان `grid-template-columns:1fr 1fr; column-gap:18; row-gap:16` (الحقل العريض `grid-column:1/-1`).

## 5) المكوّنات الخاصة (نفس نافذة فواتير العملاء)

- **التقويم `DateField`** (من `KafalaCalculator.jsx`): إنبوت نصّي `yyyy-mm-dd` + أيقونة تقويم ذهبية تفتح بوب-أب (شهر/سنة عربي، أيام كاملة، اليوم المحدد ذهبي، زرّا «اليوم»/«مسح»). يدعم `min` لتعطيل الأيام قبل تاريخ معيّن.
- **الدروب داون `NiceSel`** (في `ObligationModalUI.jsx`): زر بنفس تدرّج الإنبوت + شيفرون، وقائمة منبثقة عبر Portal، الخيار المحدد ذهبي + علامة صح.
- **منطقة رفع الملف:** صندوق متقطّع `1px dashed rgba(212,160,23,.3)`، **سحب وإفلات** + ضغط، أيقونة رفع (سهم لأعلى فوق صينية) على اليسار (`direction:ltr`). عند الاختيار: صندوق أخضر باسم الملف + الحجم + زر حذف.

## 6) الفوتر + التنقّل + التحقق

- الفوتر: padding `14px 24px 18px; display:flex; justify-content:space-between; align-items:center; position:relative`.
- **أزرار التنقّل (cm-back / cm-next):** ارتفاع 40، نص ذهبي 16px/600، دائرة أيقونة 32px (`rgba(212,160,23,.1)` → ذهبي عند hover). معطّل = `opacity:.5; cursor:not-allowed`.
  - خطوة 1: «التالي» — **معطّل** حتى تكتمل كل حقول الخطوة 1.
  - خطوة 2: «السابق» + «إضافة» (أيقونة +) — معطّل حتى يكتمل (ملف + جدول سداد).
- **رسالة التحقق inline** (لا توستر): متمركزة بدقة `position:absolute; left:0; right:0; top:50%; transform:translateY(-50%)`، حمراء بأيقونة تنبيه. مثال: «أكمل جميع الحقول المطلوبة».

## 7) شاشة النجاح (بعد الحفظ)

- يختفي الرأس/شريط التقدّم/الفوتر، يبقى زر X الطافي → المحتوى **متمركز تماماً**.
- علامة صح خضراء (دائرة 78px) + عنوان 19px («أُضيف عقد الإيجار بنجاح») + بطاقات ملخّص: كل صف لابل (يمين) + قيمة (يسار)، تلوين ذهبي لبطاقة القيمة.
  - الملخّص: المؤجِّر، القيمة الكلية (بلا كسور)، الدورية، الفترة `بداية → نهاية`، عدد الدفعات.
- الإغلاق فقط بـ X → `onSaved` (إعادة تحميل القائمة).

## 8) السلوكيات

- معالج خطوتين (`step` state) + حالة `done` لشاشة النجاح + حالة `err` للتحقق.
- فاصلة آلاف حيّة على المبالغ (تخزين خام `rawNum`، عرض مجمّع `grpNum`).
- تاريخ النهاية ≥ تاريخ البداية (تمرير `min={f.start_date}` لـ `DateField`).
- توليد جدول السداد تلقائياً من الدورية + المدة، وكل صف قابل للتعديل (تاريخ + مبلغ + حذف + «+ دفعة») مع سكرول داخلي وإجمالي (أخضر إذا طابق القيمة، أصفر إذا اختلف، 18px، بلا كسور).
- الحفظ إلى Supabase: `branch_obligations` + الجدول الفرعي `branch_obligation_payments`.

## 9) الألوان المرجعية

- ذهبي `#D4A017` · أخضر `#2ecc71` / `#27a046` · أحمر `#e87265` · أصفر تحذير `#eab308`
- حدود `rgba(255,255,255,.06–.08)` · خلفية الإنبوت `linear-gradient(180deg,#323232,#262626)` · خلفية النافذة `var(--modal-bg)`

---

## القالب الجاهز (انسخه واملأه)

```
ابنِ نافذة منبثقة بنفس نمط «عقد إيجار جديد» (راجع docs/MODAL_SPEC.md):
- العنوان: [____] | الأيقونة: [____]
- عدد الخطوات: [1/2/...] وعناوين الأقسام: [____]
- الخطوة 1 — الحقول: [اسم/نوع/إلزامي؟] (نص/رقم بفاصلة آلاف/تاريخ/دروب داون/...)
- الخطوة 2 (إن وجدت): [دروب داون/رفع ملف/جدول قابل للتعديل/...]
- نفس المواصفات: Portal، ارتفاع ثابت 560، إغلاق بزر X فقط، إطار ذهبي بعنوان محفور،
  حقول fS متوسّطة، أزرار cm-back/cm-next مع تعطيل حتى الاكتمال، تحقق inline متمركز،
  شاشة نجاح بعلامة صح + ملخّص، تقويم DateField ودروب داون NiceSel.
- يحفظ في جدول: [____] (والجدول الفرعي إن وجد: [____]).
```
