// ─── سلسلة الرجوع الذكية (cross-page navigation trail) ──────────────────────
// عند القفز من سياق لآخر (ملف عميل → فاتورة، فاتورة → عامل، معاملة → منشأة…)
// نحفظ بالضبط «من أين جاء المستخدم»، فيعود زر الرجوع في صفحة الوجهة إلى ذلك
// السياق نفسه مفتوحاً — لا إلى قائمة صفحة الوجهة. تعمل كمكدس، فسلاسل القفزات
// تنحلّ خطوة خطوة (عميل → فاتورة → عامل → رجوع → فاتورة → رجوع → ملف العميل).
//
// نقاط الربط:
//  • App.jsx يبلّغ عن الصفحة الحالية (navReportPg) ويعالج حدث
//    'app-navigate-restore' الذي يعيد فتح موقع محفوظ (pg + event/hash).
//  • كل صفحة لديها تفاصيل/ملف مفتوح تسجّله عبر navSetHere({event, detail, hash, label})
//    — event/hash هو طريقة إعادة فتحه، وlabel ما يظهر على زر الرجوع.
//  • معالجات التنقّل العابر في App.jsx تستدعي navPushFrom(targetPg, {kind, id})
//    قبل تبديل الصفحة مباشرة.
//  • صفحات التفاصيل تمرّر navKind/navId إلى <BackButton> — حين يشير رأس
//    السلسلة إلى هذه التفاصيل بعينها يتحوّل الزر إلى «الرجوع إلى …» الذهبي.

let stack = []
let here = null        // التفاصيل المفتوحة حالياً: {event?, detail?, hash?, label:{ar,en}}
let pageLabel = null   // تسمية اختيارية تسجّلها الصفحات ذات العناوين الديناميكية (تبويبات المعاملات)
let currentPg = null
let pendingPg = null   // تبديل صفحة برمجي (قفزة/استرجاع) → لا تُمسح السلسلة
const MAX = 25

// تسميات القوائم الرئيسية — تُستخدم حين لا توجد تفاصيل مفتوحة في صفحة المصدر.
const PG_LABELS = {
  home: { ar: 'الرئيسية', en: 'Home' },
  facilities: { ar: 'المنشآت', en: 'Facilities' },
  workers: { ar: 'العمالة الدائمة', en: 'Permanent Workforce' },
  temp_workers: { ar: 'العمالة المؤقتة', en: 'Temporary Workforce' },
  work_visas: { ar: 'تأشيرات العمل', en: 'Work Visas' },
  visa_grid: { ar: 'جدول إصدار التأشيرات', en: 'Visa Issuance Grid' },
  invoices: { ar: 'الفواتير', en: 'Invoices' },
  deposits: { ar: 'الإيداعات', en: 'Deposits' },
  payments: { ar: 'سدادات الخدمات', en: 'Service Payments' },
  ext_payments: { ar: 'السدادات الخارجية', en: 'External Payments' },
  transfer_calc: { ar: 'حسبة نقل الكفالات', en: 'Transfer Calc' },
  renewal_calc: { ar: 'حسبة تجديد الإقامات', en: 'Renewal Calc' },
  admin_clients: { ar: 'العملاء', en: 'Clients' },
  admin_agents: { ar: 'الوسطاء', en: 'Agents' },
}

export function navSetHere(sub) { here = sub || null }
export function navSetPageLabel(l) { pageLabel = l || null }

// يُستدعى من App.jsx عند كل تغيّر للصفحة: التنقّل اليدوي (القائمة الجانبية…)
// يقطع السلسلة؛ التنقّل البرمجي (قفزة مدفوعة أو استرجاع) يُبقيها.
export function navReportPg(pg) {
  if (pg === currentPg) return
  if (pendingPg === pg) pendingPg = null
  else stack = []
  currentPg = pg
}

// تُستدعى قبل القفزة العابرة مباشرة: تحفظ الموقع الحالي (التفاصيل المفتوحة إن
// وُجدت، وإلا الصفحة نفسها) وتَسِم القفزة بوجهتها كي يعرف زر رجوع الوجهة أنها له.
export function navPushFrom(targetPg, to) {
  if (currentPg) {
    const loc = here
      ? { pg: currentPg, ...here, to }
      : { pg: currentPg, label: pageLabel || PG_LABELS[currentPg] || null, to }
    stack.push(loc)
    if (stack.length > MAX) stack.shift()
  }
  pendingPg = targetPg
}

// رأس السلسلة فقط إن كان يخصّ هذه التفاصيل بعينها (النوع + المعرّف) —
// وإلا فهو أثر قديم من إغلاق محلي ويُتجاهل بلا ضرر.
export function navPeekFor(kind, id) {
  const top = stack[stack.length - 1]
  if (!top || !top.to || top.to.kind !== kind) return null
  if (top.to.id != null && id != null && String(top.to.id) !== String(id)) return null
  return top
}

// تنفيذ الرجوع: إخراج الموقع من السلسلة وإطلاق حدث الاسترجاع الذي يعالجه App.jsx.
export function navBack(kind, id) {
  const top = navPeekFor(kind, id)
  if (!top) return false
  stack.pop()
  pendingPg = top.pg
  try { window.dispatchEvent(new CustomEvent('app-navigate-restore', { detail: top })) } catch { /* ignore */ }
  return true
}

export function navClear() { stack = []; here = null; pageLabel = null }
