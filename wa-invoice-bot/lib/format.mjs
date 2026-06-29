// Multi-language WhatsApp message text for each financial event.
// Group feed = Arabic. Client/worker direct = their language (by nationality) + Arabic base.
import { arabicWeekday, arabicDateNum } from './businessDay.mjs'

// ── language by nationality code (DB uses mixed numeric + ISO-3 codes) ──
const SCRIPT_LANG = { '338': 'ur', '340': 'bn', '377': 'hi' } // Pakistani→Urdu, Bangladeshi→Bengali, Indian→Hindi
const ARAB_CODES = new Set(['311', '312', '313', '316', '319', '321', '323', '324', '325', '326',
  'ARE', 'BHR', 'KWT', 'LBY', 'OMN', 'PSE', 'QAT', 'SAU', 'SYR'])
export function languageFor(code) {
  if (!code) return 'en'
  const c = String(code)
  if (SCRIPT_LANG[c]) return SCRIPT_LANG[c]
  if (ARAB_CODES.has(c)) return 'ar'
  return 'en'
}
// What a recipient receives: their language + Arabic base (Arabs get Arabic only).
export function clientLangs(code) {
  const l = languageFor(code)
  return l === 'ar' ? ['ar'] : [l, 'ar']
}

// ── message label dictionary (ar authored; en/hi/ur/bn from translation workflow) ──
const MSG = {
  ar: { new_invoice: 'فاتورة جديدة', new_payment: 'دفعة جديدة', refund_title: 'استرجاع مبلغ', payment_voided_title: 'إلغاء دفعة', payment_edit_title: 'تعديل دفعة', pricing_edit_title: 'تعديل تسعيرة', cancel_title: 'إلغاء فاتورة', ref: 'المرجع', total: 'الإجمالي', paid: 'المدفوع', remaining: 'المتبقي', amount: 'المبلغ', remaining_after: 'المتبقي بعد الدفعة', refunded_amount: 'المبلغ المسترجع', updated_paid: 'المدفوع المحدّث', updated_remaining: 'المتبقي المحدّث', reason: 'السبب', cancelled_amount: 'المبلغ الملغى', method_cash: 'نقداً', method_bank: 'حوالة بنكية', method_pos: 'شبكة', method_cheque: 'شيك', currency: 'ريال', office: 'مكتب حسين', client: 'العميل', service: 'الخدمة', thanks: 'شكراً لتعاملكم معنا', inquiry: 'للإستفسارات أو الشكاوى', thanks_card: 'شكراً لتعاملكم', amount_paid: 'دفعة مستلمة', voided_amount: 'دفعة ملغاة' },
  en: { new_invoice: 'New invoice', new_payment: 'New payment received', refund_title: 'Amount refunded', payment_voided_title: 'Payment cancelled', payment_edit_title: 'Payment amount modified', pricing_edit_title: 'Invoice total modified', cancel_title: 'Invoice cancelled', ref: 'Invoice no', total: 'Total', paid: 'Paid', remaining: 'Remaining', amount: 'Amount', remaining_after: 'Remaining after this payment', refunded_amount: 'Refunded amount', updated_paid: 'Updated paid amount', updated_remaining: 'Updated remaining', reason: 'Reason', cancelled_amount: 'Cancelled amount', method_cash: 'Cash', method_bank: 'Bank transfer', method_pos: 'Card POS', method_cheque: 'Cheque', currency: 'SAR', office: 'Hussain Office', client: 'Client', service: 'Service', thanks: 'Thank you for your business', inquiry: 'For inquiries or complaints', thanks_card: 'Thank you for your business', amount_paid: 'Payment received', voided_amount: 'Cancelled payment' },
  hi: { new_invoice: 'नया बिल', new_payment: 'नया भुगतान प्राप्त', refund_title: 'राशि वापस', payment_voided_title: 'भुगतान रद्द', payment_edit_title: 'भुगतान राशि बदली', pricing_edit_title: 'बिल कुल बदला', cancel_title: 'बिल रद्द', ref: 'संदर्भ', total: 'कुल', paid: 'भुगतान', remaining: 'बकाया', amount: 'राशि', remaining_after: 'इस भुगतान के बाद बकाया', refunded_amount: 'वापस की गई राशि', updated_paid: 'अद्यतन भुगतान', updated_remaining: 'अद्यतन बकाया', reason: 'कारण', cancelled_amount: 'रद्द राशि', method_cash: 'नकद', method_bank: 'बैंक हस्तांतरण', method_pos: 'कार्ड', method_cheque: 'चेक', currency: 'रि.', office: 'हुसैन ऑफिस', client: 'ग्राहक', service: 'सेवा', thanks: 'आपके सहयोग के लिए धन्यवाद', inquiry: 'पूछताछ या शिकायत के लिए', thanks_card: 'आपके सहयोग के लिए धन्यवाद', amount_paid: 'प्राप्त भुगतान', voided_amount: 'रद्द भुगतान' },
  ur: { new_invoice: 'نیا انوائس', new_payment: 'نئی ادائیگی موصول', refund_title: 'رقم واپس', payment_voided_title: 'ادائیگی منسوخ', payment_edit_title: 'ادائیگی میں ترمیم', pricing_edit_title: 'انوائس مجموعہ میں ترمیم', cancel_title: 'انوائس منسوخ', ref: 'حوالہ', total: 'کل', paid: 'ادا شدہ', remaining: 'باقی', amount: 'رقم', remaining_after: 'ادائیگی کے بعد باقی', refunded_amount: 'واپس کی گئی رقم', updated_paid: 'تازہ شدہ ادا شدہ', updated_remaining: 'تازہ شدہ باقی', reason: 'وجہ', cancelled_amount: 'منسوخ رقم', method_cash: 'نقد', method_bank: 'بینک ٹرانسفر', method_pos: 'کارڈ', method_cheque: 'چیک', currency: 'ر.س', office: 'حسین آفس', client: 'کلائنٹ', service: 'خدمت', thanks: 'آپ کے تعاون کا شکریہ', inquiry: 'استفسار یا شکایت کے لیے', thanks_card: 'آپ کے تعاون کا شکریہ', amount_paid: 'موصول ادائیگی', voided_amount: 'منسوخ ادائیگی' },
  bn: { new_invoice: 'নতুন চালান', new_payment: 'নতুন পেমেন্ট', refund_title: 'টাকা ফেরত', payment_voided_title: 'পেমেন্ট বাতিল', payment_edit_title: 'পেমেন্ট সংশোধন', pricing_edit_title: 'চালান মোট সংশোধন', cancel_title: 'চালান বাতিল', ref: 'রেফারেন্স', total: 'মোট', paid: 'পরিশোধিত', remaining: 'বাকি', amount: 'পরিমাণ', remaining_after: 'পেমেন্টের পর বাকি', refunded_amount: 'ফেরত পরিমাণ', updated_paid: 'হালনাগাদ পরিশোধিত', updated_remaining: 'হালনাগাদ বাকি', reason: 'কারণ', cancelled_amount: 'বাতিল পরিমাণ', method_cash: 'নগদ', method_bank: 'ব্যাংক ট্রান্সফার', method_pos: 'কার্ড', method_cheque: 'চেক', currency: 'সৌদি রিয়াল', office: 'হুসাইন অফিস', client: 'গ্রাহক', service: 'সেবা', thanks: 'আপনার সহযোগিতার জন্য ধন্যবাদ', inquiry: 'জিজ্ঞাসা বা অভিযোগের জন্য', thanks_card: 'আপনার সহযোগিতার জন্য ধন্যবাদ', amount_paid: 'প্রাপ্ত পেমেন্ট', voided_amount: 'বাতিল পেমেন্ট' },
}

export const num = v => {
  const n = Math.round((Number(v) || 0) * 100) / 100
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US')
}

const pickWorker = rel => (Array.isArray(rel) ? rel[0]?.worker : rel?.worker)

// Display party with worker-is-client fallback. Returns name, display phone, WhatsApp digits, nationality code.
export function party(inv) {
  const sr = inv.service_request || {}
  const worker = pickWorker(sr.transfer_applications) || pickWorker(sr.ajeer_applications)
    || pickWorker(sr.iqama_renewal_applications) || pickWorker(sr.supplier_payroll_applications)
    || pickWorker(sr.other_applications) || null
  const p = sr.client || worker
  const otherWP = Array.isArray(sr.other_applications) ? sr.other_applications[0]?.worker_phone : sr.other_applications?.worker_phone
  const dg = String(p?.phone || otherWP || '').replace(/\D/g, '')
  const wa = dg ? (dg.startsWith('966') ? dg : '966' + dg.slice(-9)) : ''
  const phone = wa ? '0' + wa.slice(3) : ''
  return { name: p?.name_ar || p?.name_en || '— بدون عميل —', phone, wa, natCode: p?.nationality?.code || null }
}

export const invNo = inv => inv.invoice_no || ''
const totals = inv => ({ total: Number(inv.total_amount || 0), paid: Number(inv.paid_amount || 0), rem: Number(inv.remaining_amount || 0) })
const svcLabel = (inv, lang) => (lang === 'ar' || lang === 'ur')
  ? (inv.service_type?.value_ar || inv.service_type?.value_en || 'خدمة')
  : (inv.service_type?.value_en || inv.service_type?.value_ar || 'Service')

// «العميل-رقم الفاتورة[-lang].pdf» — searchable filename; lang suffix for non-Arabic copies.
export function pdfFileName(inv, lang = 'ar') {
  const base = `${party(inv).name}-${invNo(inv)}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '-').replace(/^-+|-+$/g, '')
  return (base || 'invoice') + (lang && lang !== 'ar' ? '-' + lang : '') + '.pdf'
}

export const formatDayHeader = day => `━━━━ 🗓️ ━━━━\n*فواتير ${arabicWeekday(day)}*\n${arabicDateNum(day)}`

// كل الأحداث المعروفة تُبنى بنفس البطاقة المزخرفة (القروب والعميل سواء).
export function formatEvent(kind, inv, payload = {}, lang = 'ar') {
  if (DECO_TITLE[kind]) return formatDeco(kind, inv, payload, lang)
  return `${invNo(inv)}\n👤 ${party(inv).name}`
}

const noDash = v => String(v ?? '').replace(/-/g, '')

// ── بطاقة الحدث المزخرفة — صيغة موحّدة للقروب وللعميل ──
const DIV_SQ = '▪▪▪▪▪▪▪▪▪'
const DIV_DOT = '· · · · · · ·   · · · · · · ·   · · · · · · ·'
// عنوان الفرع = اسم المدينة + الرقم في كود الفرع (JUB5 → «الجبيل 5»).
function branchLabel(inv) {
  const b = inv.branch || {}
  const city = b.city?.name_ar || ''
  const n = (String(b.branch_code || '').match(/\d+/) || [''])[0]
  return [city, n].filter(Boolean).join(' ') || b.branch_code || ''
}
const localPhone = raw => {
  const dg = String(raw || '').replace(/\D/g, '')
  if (!dg) return ''
  return dg.startsWith('966') ? '0' + dg.slice(3) : (dg.startsWith('0') ? dg : '0' + dg.slice(-9))
}
// الهيكل المشترك للبطاقة المزخرفة (رأس + خدمة + عميل + أسطر المبالغ + تذييل).
function decoCard(inv, lang, titleKey, moneyLines) {
  const M = MSG[lang] || MSG.ar
  const { name, phone } = party(inv)
  const bPhone = localPhone(inv.branch?.phone)
  return [
    `🧾 *${M[titleKey]} — ${branchLabel(inv)}*`,
    DIV_SQ,
    `*${svcLabel(inv, lang)}* | \`${noDash(invNo(inv))}\``,
    ` ${name}${phone ? ' | ' + phone : ''}`,
    DIV_DOT,
    ...moneyLines,
    DIV_DOT,
    DIV_SQ,
    M.inquiry,
    bPhone,
    `${M.thanks_card} 🙏`,
  ].filter(l => l !== '').join('\n')
}
// أسطر الإجمالي/المدفوع/المتبقي (مشتركة بين فاتورة جديدة والدفعة).
const balanceLines = (M, inv) => {
  const { total, paid, rem } = totals(inv), cur = M.currency
  return [`🟡 ${M.total}: ${num(total)} ${cur}`, `🟢 ${M.paid}: ${num(paid)} ${cur}`, `🔴 ${M.remaining}: ${num(rem)} ${cur}`]
}
const PAY_ICONS = { cash: '💵', bank: '🏦', pos: '💳', cheque: '🧾' } // أيقونة الدفعة حسب طريقة الدفع
const DECO_TITLE = { invoice_created: 'new_invoice', payment: 'new_payment', refund: 'refund_title', payment_voided: 'payment_voided_title', payment_edit: 'payment_edit_title', pricing_edit: 'pricing_edit_title', cancelled: 'cancel_title' }
const codeBlock = s => '```' + s + '```'

// أسطر المبالغ في وسط البطاقة — تختلف حسب نوع الحدث، والباقي (الرأس/التذييل) موحّد.
function decoMoneyLines(kind, M, inv, payload) {
  const cur = M.currency
  const { total, paid } = totals(inv)
  const bal = balanceLines(M, inv)
  const methodBlk = () => { const m = M['method_' + payload.method] || ''; return m ? [codeBlock('(' + m + ')')] : [] }
  switch (kind) {
    // فاتورة جديدة: سطر «دفعة مستلمة» يظهر فقط لو فيه دفعة أولى (بدون طريقة — غير متاحة).
    case 'invoice_created':
      return paid > 0 ? [`💵 *${M.amount_paid}: ${num(paid)} ${cur}*`, DIV_DOT, ...bal] : bal
    // دفعة جديدة: المبلغ بارز + الطريقة بأيقونتها.
    case 'payment':
      return [`${PAY_ICONS[payload.method] || '🏦'} *${M.amount_paid}: ${num(payload.amount)} ${cur}*`, ...methodBlk(), DIV_DOT, ...bal]
    // استرجاع مبلغ: المبلغ المسترجع بارز (خارج للعميل).
    case 'refund':
      return [`↩️ *${M.refunded_amount}: ${num(Math.abs(Number(payload.amount || 0)))} ${cur}*`, ...methodBlk(), DIV_DOT, ...bal]
    // إلغاء دفعة: دفعة سابقة أُلغيت.
    case 'payment_voided':
      return [`❌ *${M.voided_amount}: ${num(payload.amount)} ${cur}*`, DIV_DOT, ...bal]
    // تعديل دفعة: المبلغ القديم ← الجديد.
    case 'payment_edit':
      return [`✏️ *${M.payment_edit_title}*`, codeBlock(num(payload.old_amount) + ' ← ' + num(payload.new_amount) + ' ' + cur), DIV_DOT, ...bal]
    // تعديل تسعيرة: الإجمالي القديم ← الجديد.
    case 'pricing_edit':
      return [`✏️ *${M.pricing_edit_title}*`, codeBlock(num(payload.old_total) + ' ← ' + num(payload.new_total) + ' ' + cur), DIV_DOT, ...bal]
    // إلغاء فاتورة: المبلغ الملغى + السبب (بلا أرصدة — الفاتورة لاغية).
    case 'cancelled': {
      const out = [`🛑 *${M.cancelled_amount}: ${num(payload.total ?? total)} ${cur}*`]
      if (Number(payload.paid ?? paid) > 0) out.push(`🟢 ${M.paid}: ${num(payload.paid ?? paid)} ${cur}`)
      if (payload.reason) out.push(`📝 ${M.reason}: ${payload.reason}`)
      return out
    }
    default:
      return bal
  }
}
export function formatDeco(kind, inv, payload = {}, lang = 'ar') {
  const M = MSG[lang] || MSG.ar
  return decoCard(inv, lang, DECO_TITLE[kind] || 'new_invoice', decoMoneyLines(kind, M, inv, payload))
}

// كرت العميل = نفس البطاقة المزخرفة للقروب (تصميم موحّد لكل الأحداث).
export function formatCard(kind, inv, payload = {}, lang = 'ar') {
  return formatDeco(DECO_TITLE[kind] ? kind : 'invoice_created', inv, payload, lang)
}

// ── daily summary (group only, Arabic) ──
const VISA_CODES = new Set(['work_visa', 'work_visa_permanent', 'work_visa_temporary'])
export function summaryKey(sum) {
  const s = sum?.stats || {}
  return { ic: sum?.invoice_count || 0, it: Number(sum?.invoiced_total || 0), cash: s.cash || {}, bank: s.bank || {}, voided: s.voided || {}, cancelled: s.cancelled || {}, svc: (sum?.by_service || []).map(x => (x.code || x.ar) + ':' + x.cnt).join(',') }
}
export function formatSummary(sum, phase) {
  const s = sum?.stats || {}
  const cash = Number(s.cash?.sum || 0), bank = Number(s.bank?.sum || 0)
  const voided = Number(s.voided?.sum || 0), cancelled = Number(s.cancelled?.sum || 0)
  const net = cash + bank - voided
  const tag = phase === 'final' ? 'نهائي' : 'أولي'
  const [Y, Mo, D] = String(sum.business_day).split('-')
  const bySvc = Array.isArray(sum.by_service) ? sum.by_service : []
  return [
    `📊 *ملخّص اليوم — ${arabicWeekday(sum.business_day)} ${D}-${Mo}-${Y}*`,
    codeBlock('(' + tag + ')'),
    DIV_SQ,
    `🧾 عدد الفواتير: ${num(sum.invoice_count)}`,
    ...bySvc.map(x => {
      const name = x.ar || x.en || 'أخرى'
      // التأشيرات: الكمية (عدد التأشيرات) قبل الاسم؛ باقي الخدمات كميتها 1 فيكفي عدد الفواتير.
      return VISA_CODES.has(x.code)
        ? `   • ${num(x.qty)}× ${name}: ${num(x.cnt)}`
        : `   • ${name}: ${num(x.cnt)}`
    }),
    `🟡 إجمالي اليوم: ${num(sum.invoiced_total)} ريال`,
    DIV_DOT,
    `💵 نقداً: ${num(cash)} ريال (${s.cash?.cnt || 0})`,
    `🏦 حوالة بنكية: ${num(bank)} ريال (${s.bank?.cnt || 0})`,
    `❌ ملغاة/مرتجعة: ${num(voided + cancelled)} ريال`,
    DIV_DOT,
    `🟢 *الصافي: ${num(net)} ريال*`,
    DIV_SQ,
  ].join('\n')
}
