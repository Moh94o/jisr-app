// ───────────────────────────────────────────────────────────────────────────
// نموذج تسعير الفاتورة — مصدر واحد لتحرير التسعيرة مهما كان نوع الفاتورة
// ───────────────────────────────────────────────────────────────────────────
// كل فاتورة — عاديّة أو مبنيّة على حسبة (نقل الكفالة / تجديد الإقامة) — تُحرَّر هنا
// كقائمة «بنود» موحّدة: رسوم موجبة وخصومات. ما يختلف بين الأنواع محصور في مُحوِّل
// (adapter) واحد لكل نوع يجيب عن ثلاثة أسئلة:
//   • من أين تُبنى بنود التحرير؟  buildPricingLines
//   • كيف تُعرض للعميل؟           pricingPrintModel  (كرت التسعير والفاتورة المطبوعة)
//   • أين تُكتب عند الحفظ؟        savePricingEdit في invoicePricingSave.js
// أمّا الحساب والتحقّق والفرق فموحّد للجميع — فلا يتكرّر منطق التسعير.
//
// هذا الملف **صافٍ بلا استيرادات** عن قصد: تستورده طباعةُ الفاتورة التي يشغّلها بوت
// الواتساب في Node بلا متصفّح، فأي اعتماد على supabase أو localStorage يكسره هناك.
//
// قواعد الحساب الموحّدة:
//   الإجمالي الابتدائي = مجموع بنود الرسوم المحتسبة
//   إجمالي الحسبة      = الابتدائي − خصومات الحسبة (أبشر/المكتب)
//   الإجمالي النهائي   = إجمالي الحسبة − خصومات الفاتورة (خصم المدير)
// في الفاتورة العاديّة لا توجد خصومات حسبة، فالنهائي = الابتدائي − الخصومات.

export const r2 = n => Math.round((Number(n) || 0) * 100) / 100
const numOf = v => Number(v) || 0

// ─────────────────────────── أسباب التعديل ───────────────────────────
// تصنيف إلزامي لكل تعديل تسعير — يُحفظ في pricing_log ويُعرض في سجلّ الكرت،
// فيمكن لاحقاً تمييز «تصحيح خطأ» عن «بند مستجد» عن «خصم تجاري».
export const PRICING_REASONS = [
  { code: 'correction',   ar: 'تصحيح خطأ إدخال', en: 'Data-entry correction' },
  { code: 'missing_item', ar: 'بند مستجد',        en: 'Newly added item' },
  { code: 'removed_item', ar: 'إلغاء بند',        en: 'Removed item' },
  { code: 'discount',     ar: 'خصم تجاري',        en: 'Commercial discount' },
]
export const reasonLabel = (code, T) => {
  const r = PRICING_REASONS.find(x => x.code === code)
  return r ? T(r.ar, r.en) : (code || '')
}

// ─────────────────────────── نوع التسعيرة ───────────────────────────
// الفاتورة المرتبطة بحسبة معتمدة تُحرَّر عبر الحسبة (فتنعكس على صفحتها وطباعتها)،
// وما عداها يُحرَّر كبنود حرّة في pricing_breakdown.
export const pricingShape = (svcCode, tc) =>
  (tc?.id && svcCode === 'transfer') ? 'transfer'
    : (tc?.id && svcCode === 'iqama_renewal') ? 'renewal'
      : 'plain'

// سطر خصم في pricing_breakdown — بعلم discount (نفس علم قالب الطباعة) أو بعنوانه.
export const isDiscountLine = l =>
  !!l && (l.discount === true || l._discount === true || ['خصم', 'الخصم', 'Discount'].includes(String(l.label || '').trim()))

// حقول الرسوم لكل نوع حسبة. counted=false يعني بنداً يُعرض ويُحفظ لكنه لا يدخل
// مجموع الإجمالي مباشرةً (في التجديد: الإقامة/الرخصة/التأمين ممثَّلة عبر «الزائد
// الحكومي» وتغطية المكتب، فجمعها مرّة أخرى ازدواج).
const TRANSFER_FEES = [
  { field: 'transfer_fee',      ar: 'رسوم نقل الكفالة', en: 'Sponsorship Transfer Fee' },
  { field: 'iqama_renewal_fee', ar: 'تجديد الإقامة',     en: 'Iqama Renewal' },
  { field: 'late_fine_amount',  ar: 'غرامة تأخير التجديد', en: 'Renewal Late Fine' },
  { field: 'work_permit_fee',   ar: 'رخصة العمل',        en: 'Work Permit' },
  { field: 'prof_change_fee',   ar: 'تغيير المهنة',      en: 'Change Occupation' },
  { field: 'medical_fee',       ar: 'التأمين الطبي',     en: 'Medical Insurance' },
  { field: 'office_fee',        ar: 'رسوم المكتب',       en: 'Office Fees' },
]
const RENEWAL_FEES = [
  { field: 'iqama_renewal_fee', ar: 'تجديد الإقامة',      en: 'Iqama Renewal', counted: false, hintAr: 'يحدّد تغطية المكتب — لا يُجمع في الإجمالي', hintEn: 'Feeds office cover — not summed into the total' },
  { field: 'work_permit_fee',   ar: 'رخصة العمل',         en: 'Work Permit',   counted: false, hintAr: 'يحدّد تغطية المكتب — لا يُجمع في الإجمالي', hintEn: 'Feeds office cover — not summed into the total' },
  { field: 'medical_fee',       ar: 'التأمين الطبي',      en: 'Medical Insurance', counted: false, hintAr: 'يحدّد تغطية المكتب — لا يُجمع في الإجمالي', hintEn: 'Feeds office cover — not summed into the total' },
  { field: 'gov_excess',        ar: 'الزائد عن الحدود الحكومية', en: 'Gov Excess' },
  { field: 'late_fine_amount',  ar: 'غرامة تأخير التجديد', en: 'Renewal Late Fine' },
  { field: 'prof_change_fee',   ar: 'تغيير المهنة',       en: 'Change Occupation' },
  { field: 'office_fee',        ar: 'رسوم المكتب',        en: 'Office Fees' },
]
// تجديد الإقامة بنموذج 'flat': كل الرسوم تدخل الإجمالي بقيمتها الكاملة ولا وجود
// لـ«الزائد عن الحدود الحكومية». وبنموذج 'cover' القديم يبقى الجدول كما صدرت به الحسبة.
const RENEWAL_FEES_FLAT = [
  { field: 'iqama_renewal_fee', ar: 'تجديد الإقامة',      en: 'Iqama Renewal' },
  { field: 'late_fine_amount',  ar: 'غرامة تأخير التجديد', en: 'Renewal Late Fine' },
  { field: 'work_permit_fee',   ar: 'رخصة العمل',         en: 'Work Permit' },
  { field: 'prof_change_fee',   ar: 'تغيير المهنة',       en: 'Change Occupation' },
  { field: 'medical_fee',       ar: 'التأمين الطبي',      en: 'Medical Insurance' },
  { field: 'office_fee',        ar: 'رسوم المكتب',        en: 'Office Fees' },
]
export const isFlatRenewal = tc => tc?.pricing_model === 'flat'
export const quoteFeeFields = (shape, tc = null) => shape === 'transfer' ? TRANSFER_FEES
  : shape === 'renewal' ? (isFlatRenewal(tc) ? RENEWAL_FEES_FLAT : RENEWAL_FEES) : []

// أسماء الخصومات — مطابقة لما يعرضه كرت التسعير في صفحة الفاتورة لكل نوع، كي لا
// يختلف اسم البند بين الكرت والمحرّر (كان مصدر لبس: «خصم إضافي» في المحرّر مقابل
// «خصم المكتب» في الكرت لنفس العمود).
const QUOTE_DISCOUNTS = {
  transfer: [
    { field: 'absher_discount', ar: 'خصم أبشر',  en: 'Absher Discount' },
    { field: 'manual_discount', ar: 'خصم المكتب', en: 'Office Discount' },
  ],
  renewal: [
    { field: 'absher_discount', ar: 'خصم أبشر',   en: 'Absher Discount' },
    { field: 'manual_discount', ar: 'خصم إضافي',  en: 'Extra Discount' },
  ],
}
const MANAGER_DISCOUNT = { ar: 'خصم المدير', en: 'Manager Discount' }

let seq = 0
const nextKey = p => `${p}_${++seq}`

const mkLine = o => ({
  key: o.key || nextKey(o.src || 'ln'),
  src: o.src,                       // quote_fee | quote_extra | quote_discount | invoice_line | invoice_discount
  field: o.field ?? null,           // اسم عمود الحسبة (لبنود الحسبة)
  label: o.label ?? '',
  amount: o.amount ?? '',           // نصّ (CurrencyField)
  kind: o.kind || 'fee',            // fee | discount
  counted: o.counted !== false,     // يدخل في مجموع الإجمالي
  labelLocked: !!o.labelLocked,     // بنود الحسبة الثابتة لا يتغيّر اسمها
  removable: !!o.removable,
  hint: o.hint || '',
})

// ─────────────────────── بناء بنود المحرّر ───────────────────────
// plain: من pricing_breakdown — وإن كانت فارغة (فواتير قديمة بإجمالي فقط) نولّد
//        بنداً واحداً من الإجمالي الحالي كي تصير الفاتورة قابلة للتفصيل والإضافة.
// حسبة: كل حقول الرسوم تُعرض ولو كانت صفراً (كان إخفاؤها يمنع استدراك بند نُسي)،
//        ثم البنود الإضافية (extras) قابلة للإضافة والحذف، ثم الخصومات.
export function buildPricingLines({ inv, tc, shape, T, isAr }) {
  const invTotal = numOf(inv?.total_amount)
  if (shape === 'plain') {
    const bd = Array.isArray(inv?.pricing_breakdown) ? inv.pricing_breakdown : []
    if (bd.length) {
      return bd.map(l => mkLine({
        src: isDiscountLine(l) ? 'invoice_discount' : 'invoice_line',
        kind: isDiscountLine(l) ? 'discount' : 'fee',
        label: l.label || '',
        amount: String(Math.abs(numOf(l.amount))),
        removable: true,
      }))
    }
    const svcLabel = (isAr ? inv?.service_type?.value_ar : (inv?.service_type?.value_en || inv?.service_type?.value_ar))
      || T('قيمة الخدمة', 'Service amount')
    return [mkLine({ src: 'invoice_line', kind: 'fee', label: svcLabel, amount: String(invTotal), removable: true })]
  }

  const fees = quoteFeeFields(shape, tc).map(f => mkLine({
    src: 'quote_fee', field: f.field, kind: 'fee',
    label: T(f.ar, f.en), amount: String(numOf(tc?.[f.field])),
    counted: f.counted !== false, labelLocked: true, removable: false,
    hint: f.hintAr ? T(f.hintAr, f.hintEn) : '',
  }))
  const extras = (Array.isArray(tc?.extras) ? tc.extras : []).map(e => mkLine({
    src: 'quote_extra', kind: 'fee',
    label: e?.name || T('بند إضافي', 'Extra'), amount: String(numOf(e?.amount)), removable: true,
  }))
  const discs = (QUOTE_DISCOUNTS[shape] || []).map(d => mkLine({
    src: 'quote_discount', field: d.field, kind: 'discount',
    label: T(d.ar, d.en), amount: String(numOf(tc?.[d.field])), labelLocked: true, removable: false,
  }))
  // خصم المدير = ما خُصم على الفاتورة بعد اعتماد الحسبة (إجمالي الحسبة − إجمالي الفاتورة).
  const managerDisc = Math.max(0, r2(numOf(tc?.total_amount) - invTotal))
  discs.push(mkLine({
    src: 'invoice_discount', field: null, kind: 'discount',
    label: T(MANAGER_DISCOUNT.ar, MANAGER_DISCOUNT.en), amount: String(managerDisc), labelLocked: true, removable: false,
  }))
  return [...fees, ...extras, ...discs]
}

// بند جديد يضيفه المستخدم — رسم أو خصم. بنود الخصم تُسمّى «خصم» ابتداءً كي تكون
// صالحة فور إضافتها (لا اسم فارغ يوقف الحفظ) ويبقى الاسم قابلاً للتغيير.
export const newPricingLine = (kind, shape, label = '') => mkLine({
  src: kind === 'discount' ? 'invoice_discount' : (shape === 'plain' ? 'invoice_line' : 'quote_extra'),
  kind, label, amount: '', removable: true,
})

// ─────────────────── نموذج العرض (الطباعة) ───────────────────
// الفاتورة المطبوعة تُسلَّم للعميل، فيلزمها شرطان: أن تُطابق كرت التسعير في الشاشة،
// وأن يتوازن جدولها (مجموع الرسوم − مجموع الخصومات = إجمالي الفاتورة).
// فواتير الحسبة (نقل/تجديد) تُبنى من الحسبة نفسها كالكرت — لا من لقطة pricing_breakdown
// المحفوظة وقت الإنشاء؛ تلك اللقطة لا تتحدّث عند تعديل الحسبة فكانت تطبع بنوداً قديمة
// وخصماً وهمياً يبتلع الفرق (تحقّقنا من فاتورة تجديد مُعدَّلة على الإنتاج).
// التسميات تُعاد بالعربية القانونية كما تتوقّعها fmtPriceLabel في invoicePrint فتُترجَم للغة الطباعة.
const GENERIC_DISCOUNTS = ['خصم', 'الخصم', 'Discount']
export function pricingPrintModel({ inv, tc, svcCode }) {
  const total = r2(inv?.total_amount)
  const shape = pricingShape(svcCode, tc)
  const fees = [], discounts = []
  const push = (arr, label, amount) => { const a = r2(amount); if (a > 0.005) arr.push({ label, amount: a }) }
  // اسم سطر الخصم العام — «خصم أبشر» في تغيير المهنة/خروج وعودة (الخصم اليدوي فيهما رصيد أبشر)، وإلا «خصم المكتب».
  const genericDisc = (svcCode === 'profession_change' || svcCode === 'exit_reentry_visa') ? 'خصم أبشر' : 'خصم المكتب'

  if (shape === 'transfer' || shape === 'renewal') {
    const feeOrder = [
      ...(shape === 'transfer' ? [['رسوم نقل الكفالة', 'transfer_fee']] : []),
      ['تجديد الإقامة', 'iqama_renewal_fee'],
      ['غرامة تأخير التجديد', 'late_fine_amount'],
      ['رخصة العمل', 'work_permit_fee'],
      ['رسم تغيير المهنة', 'prof_change_fee'],
      ['التأمين الطبي', 'medical_fee'],
    ]
    feeOrder.forEach(([label, f]) => push(fees, label, tc?.[f]))
    ;(Array.isArray(tc?.extras) ? tc.extras : []).forEach(e => push(fees, e?.name || 'بند إضافي', e?.amount))
    push(fees, 'رسوم المكتب', tc?.office_fee)
    if (shape === 'renewal') {
      // نموذج 'flat': لا تغطية إطلاقاً — الرسوم تُطبع كاملةً ورسوم المكتب بند ظاهر.
      // نموذج 'cover' القديم: تغطية المكتب للرسوم الحكومية تُعرض «خصم المكتب» (العمود المجمّد).
      const cover = isFlatRenewal(tc) ? 0 : (tc?.office_cover != null ? numOf(tc.office_cover)
        : Math.max(0, r2(numOf(tc?.iqama_renewal_fee) + numOf(tc?.work_permit_fee) + numOf(tc?.medical_fee) - numOf(tc?.gov_excess))))
      push(discounts, 'خصم المكتب', cover)
      push(discounts, 'خصم أبشر', tc?.absher_discount)
      push(discounts, 'خصم إضافي', tc?.manual_discount)
    } else {
      push(discounts, 'خصم أبشر', tc?.absher_discount)
      push(discounts, 'خصم المكتب', tc?.manual_discount)
    }
    push(discounts, 'خصم المدير', r2(numOf(tc?.total_amount) - total))
  } else {
    for (const l of (Array.isArray(inv?.pricing_breakdown) ? inv.pricing_breakdown : [])) {
      const amt = r2(Math.abs(numOf(l?.amount)))
      if (amt <= 0.005) continue
      const label = String(l?.label || '').trim()
      if (isDiscountLine(l) || numOf(l?.amount) < 0) {
        discounts.push({ label: (!label || GENERIC_DISCOUNTS.includes(label)) ? genericDisc : label, amount: amt })
      } else fees.push({ label, amount: amt })
    }
  }
  const subtotal = r2(fees.reduce((s, l) => s + l.amount, 0))
  // موازنة الجدول: أي فرق متبقٍّ (فواتير قديمة لم يُفصَّل خصمها) يظهر سطر خصم عاماً،
  // فلا يُسلَّم للعميل جدولٌ لا يُجمع على الإجمالي.
  const residual = r2(subtotal - discounts.reduce((s, l) => s + l.amount, 0) - total)
  if (residual > 0.005) discounts.push({ label: genericDisc, amount: residual })
  return { shape, fees, discounts, subtotal, total }
}

// عدد التأشيرات على بند التأشيرة — فاتورة تأشيرات العمل تحمل بنداً واحداً بقيمة كل
// التأشيرات مجتمعةً، فبدون العدد يبدو السطر سعراً لتأشيرة واحدة. تُرجع العدد (أو صفراً إن
// لم ينطبق) ليُعرض بشارة «×N» الذهبية نفسها المستعملة في كرت الخدمة — في الكرت والطباعة.
export const visaLineQty = (label, svcCode, qty) => {
  const n = Number(qty) || 0
  if (n < 1 || !/^work_visa/.test(String(svcCode || ''))) return 0
  return /تأشيرة|تاشيرة|visa/i.test(String(label || '')) ? n : 0
}

// بنود فعّالة: يُسقط بنداً أضافه المستخدم ثم تركه صفراً — كي لا يُحفظ سطر «خصم ٠»
// ولا يُسجَّل تعديل لا أثر له. البنود الأصلية تبقى ولو صُفِّرت (تصفيرها تعديل مقصود).
export function effectivePricingLines(lines, initial) {
  const keys = new Set((Array.isArray(initial) ? initial : []).map(l => l.key))
  return (Array.isArray(lines) ? lines : []).filter(l => keys.has(l.key) || r2(l.amount) > 0.005)
}

// ─────────────────────────── الحساب ───────────────────────────
export function computePricingTotals(lines) {
  const arr = Array.isArray(lines) ? lines : []
  const sum = f => r2(arr.filter(f).reduce((s, l) => s + numOf(l.amount), 0))
  const subtotal = sum(l => l.kind === 'fee' && l.counted !== false)
  const quoteDiscount = sum(l => l.kind === 'discount' && l.src === 'quote_discount')
  const invoiceDiscount = sum(l => l.kind === 'discount' && l.src !== 'quote_discount')
  const quoteTotal = Math.max(0, r2(subtotal - quoteDiscount))
  const total = Math.max(0, r2(quoteTotal - invoiceDiscount))
  return { subtotal, quoteDiscount, invoiceDiscount, discount: r2(quoteDiscount + invoiceDiscount), quoteTotal, total }
}

// صحّة البنود: كل بند باسم، وبند رسوم واحد على الأقل، ومبالغ غير سالبة.
export function validatePricingLines(lines) {
  const arr = Array.isArray(lines) ? lines : []
  if (!arr.length) return 'empty'
  if (!arr.some(l => l.kind === 'fee')) return 'no_fee'
  if (arr.some(l => !String(l.label || '').trim())) return 'no_label'
  if (arr.some(l => numOf(l.amount) < 0)) return 'negative'
  return null
}
export const pricingLineError = (code, T) => ({
  empty:    T('أضف بنداً واحداً على الأقل', 'Add at least one item'),
  no_fee:   T('لا بدّ من بند رسوم واحد على الأقل', 'At least one fee item is required'),
  no_label: T('أكمل اسم كل بند', 'Every item needs a label'),
  negative: T('لا يُقبل مبلغ سالب — استعمل بند خصم', 'Negative amounts are not allowed — use a discount item'),
}[code] || '')

// ─────────────────────────── الفرق (للسجل) ───────────────────────────
// المقارنة بالمفتاح لا بالترتيب — فحذف بندٍ من الوسط لا يُظهر كل ما بعده «متغيّراً»
// كما كانت المقارنة القديمة بالفهرس. الناتج بصيغة PricingChanges نفسها.
export function pricingDiff(before, after) {
  const A = Array.isArray(before) ? before : []
  const B = Array.isArray(after) ? after : []
  const byKey = arr => Object.fromEntries(arr.map(l => [l.key, l]))
  const a = byKey(A), b = byKey(B)
  const out = []
  const signed = l => l.kind === 'discount' ? -numOf(l.amount) : numOf(l.amount)
  for (const l of A) {
    const n = b[l.key]
    if (!n) { out.push({ label: l.label || '—', from: signed(l), to: null }); continue }
    const oL = String(l.label || '').trim(), nL = String(n.label || '').trim()
    if (r2(signed(l)) !== r2(signed(n)) || oL !== nL) {
      out.push({ label: nL || oL || '—', from: signed(l), to: signed(n), ...(oL !== nL ? { fromLabel: oL } : {}) })
    }
  }
  for (const l of B) if (!a[l.key]) out.push({ label: String(l.label || '').trim() || '—', from: null, to: signed(l) })
  return out
}

// بنود pricing_breakdown من بنود المحرّر (الخصم يُحفظ سالباً بعلم discount).
export const linesToBreakdown = lines => (Array.isArray(lines) ? lines : []).map(l => (
  l.kind === 'discount'
    ? { label: String(l.label || '').trim(), amount: -r2(numOf(l.amount)), discount: true }
    : { label: String(l.label || '').trim(), amount: r2(numOf(l.amount)) }
))
