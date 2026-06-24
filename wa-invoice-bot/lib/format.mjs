// Multi-language WhatsApp message text for each financial event.
// Group feed = Arabic. Client/worker direct = their language (by nationality) + Arabic base.
import { arabicDate, arabicWeekday, arabicDateNum } from './businessDay.mjs'

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
  ar: { new_invoice: 'فاتورة جديدة', new_payment: 'دفعة جديدة', refund_title: 'استرجاع مبلغ', payment_voided_title: 'إلغاء دفعة', payment_edit_title: 'تعديل دفعة', pricing_edit_title: 'تعديل تسعيرة', cancel_title: 'إلغاء فاتورة', ref: 'المرجع', total: 'الإجمالي', paid: 'المدفوع', remaining: 'المتبقي', amount: 'المبلغ', remaining_after: 'المتبقي بعد الدفعة', refunded_amount: 'المبلغ المسترجع', updated_paid: 'المدفوع المحدّث', updated_remaining: 'المتبقي المحدّث', reason: 'السبب', cancelled_amount: 'المبلغ الملغى', method_cash: 'نقداً', method_bank: 'حوالة بنكية', method_pos: 'شبكة', method_cheque: 'شيك', currency: 'ريال', office: 'مكتب حسين', client: 'العميل', service: 'الخدمة', thanks: 'شكراً لتعاملكم معنا' },
  en: { new_invoice: 'New invoice', new_payment: 'New payment received', refund_title: 'Amount refunded', payment_voided_title: 'Payment cancelled', payment_edit_title: 'Payment amount modified', pricing_edit_title: 'Invoice total modified', cancel_title: 'Invoice cancelled', ref: 'Invoice no', total: 'Total', paid: 'Paid', remaining: 'Remaining', amount: 'Amount', remaining_after: 'Remaining after this payment', refunded_amount: 'Refunded amount', updated_paid: 'Updated paid amount', updated_remaining: 'Updated remaining', reason: 'Reason', cancelled_amount: 'Cancelled amount', method_cash: 'Cash', method_bank: 'Bank transfer', method_pos: 'Card POS', method_cheque: 'Cheque', currency: 'SAR', office: 'Hussain Office', client: 'Client', service: 'Service', thanks: 'Thank you for your business' },
  hi: { new_invoice: 'नया बिल', new_payment: 'नया भुगतान प्राप्त', refund_title: 'राशि वापस', payment_voided_title: 'भुगतान रद्द', payment_edit_title: 'भुगतान राशि बदली', pricing_edit_title: 'बिल कुल बदला', cancel_title: 'बिल रद्द', ref: 'संदर्भ', total: 'कुल', paid: 'भुगतान', remaining: 'बकाया', amount: 'राशि', remaining_after: 'इस भुगतान के बाद बकाया', refunded_amount: 'वापस की गई राशि', updated_paid: 'अद्यतन भुगतान', updated_remaining: 'अद्यतन बकाया', reason: 'कारण', cancelled_amount: 'रद्द राशि', method_cash: 'नकद', method_bank: 'बैंक हस्तांतरण', method_pos: 'कार्ड', method_cheque: 'चेक', currency: 'रि.', office: 'हुसैन ऑफिस', client: 'ग्राहक', service: 'सेवा', thanks: 'आपके सहयोग के लिए धन्यवाद' },
  ur: { new_invoice: 'نیا انوائس', new_payment: 'نئی ادائیگی موصول', refund_title: 'رقم واپس', payment_voided_title: 'ادائیگی منسوخ', payment_edit_title: 'ادائیگی میں ترمیم', pricing_edit_title: 'انوائس مجموعہ میں ترمیم', cancel_title: 'انوائس منسوخ', ref: 'حوالہ', total: 'کل', paid: 'ادا شدہ', remaining: 'باقی', amount: 'رقم', remaining_after: 'ادائیگی کے بعد باقی', refunded_amount: 'واپس کی گئی رقم', updated_paid: 'تازہ شدہ ادا شدہ', updated_remaining: 'تازہ شدہ باقی', reason: 'وجہ', cancelled_amount: 'منسوخ رقم', method_cash: 'نقد', method_bank: 'بینک ٹرانسفر', method_pos: 'کارڈ', method_cheque: 'چیک', currency: 'ر.س', office: 'حسین آفس', client: 'کلائنٹ', service: 'خدمت', thanks: 'آپ کے تعاون کا شکریہ' },
  bn: { new_invoice: 'নতুন চালান', new_payment: 'নতুন পেমেন্ট', refund_title: 'টাকা ফেরত', payment_voided_title: 'পেমেন্ট বাতিল', payment_edit_title: 'পেমেন্ট সংশোধন', pricing_edit_title: 'চালান মোট সংশোধন', cancel_title: 'চালান বাতিল', ref: 'রেফারেন্স', total: 'মোট', paid: 'পরিশোধিত', remaining: 'বাকি', amount: 'পরিমাণ', remaining_after: 'পেমেন্টের পর বাকি', refunded_amount: 'ফেরত পরিমাণ', updated_paid: 'হালনাগাদ পরিশোধিত', updated_remaining: 'হালনাগাদ বাকি', reason: 'কারণ', cancelled_amount: 'বাতিল পরিমাণ', method_cash: 'নগদ', method_bank: 'ব্যাংক ট্রান্সফার', method_pos: 'কার্ড', method_cheque: 'চেক', currency: 'সৌদি রিয়াল', office: 'হুসাইন অফিস', client: 'গ্রাহক', service: 'সেবা', thanks: 'আপনার সহযোগিতার জন্য ধন্যবাদ' },
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

export function formatEvent(kind, inv, payload = {}, lang = 'ar') {
  const M = MSG[lang] || MSG.ar
  const { name, phone } = party(inv)
  const no = invNo(inv)
  const { total, paid, rem } = totals(inv)
  const cur = M.currency
  const who = `👤 ${name}${phone ? ' | ' + phone : ''}`
  const refLine = `${M.ref}: ${no}`
  const method = c => M['method_' + c] || ''
  const join = a => a.filter(Boolean).join('\n')

  switch (kind) {
    case 'invoice_created':
      return join([`🆕 ${M.new_invoice}`, `${svcLabel(inv, lang)} | ${refLine}`, who,
        `${M.total}: ${num(total)} | ${M.paid}: ${num(paid)} | ${M.remaining}: ${num(rem)} ${cur}`])
    case 'payment':
      return join([`💵 ${M.new_payment}`, refLine, who,
        `${M.amount}: ${num(payload.amount)} ${method(payload.method)}`.trim(),
        `${M.remaining_after}: ${num(rem)} ${cur}`])
    case 'refund':
      return join([`↩️ ${M.refund_title}`, refLine, who,
        `${M.refunded_amount}: ${num(Math.abs(Number(payload.amount || 0)))} ${method(payload.method)}`.trim(),
        `${M.paid}: ${num(paid)} | ${M.remaining}: ${num(rem)} ${cur}`])
    case 'payment_voided':
      return join([`⚠️ ${M.payment_voided_title}`, refLine, who,
        `${M.amount}: ${num(payload.amount)} ${cur}`,
        `${M.updated_paid}: ${num(paid)} | ${M.remaining}: ${num(rem)} ${cur}`])
    case 'payment_edit':
      return join([`✏️ ${M.payment_edit_title}`, refLine, who,
        `${M.amount}: ${num(payload.old_amount)} ← ${num(payload.new_amount)} ${cur}`,
        `${M.updated_paid}: ${num(paid)} | ${M.remaining}: ${num(rem)} ${cur}`])
    case 'pricing_edit':
      return join([`✏️ ${M.pricing_edit_title}`, refLine, who,
        `${M.total}: ${num(payload.old_total)} ← ${num(payload.new_total)} ${cur}`,
        `${M.updated_remaining}: ${num(rem)} ${cur}`])
    case 'cancelled':
      return join([`🛑 ${M.cancel_title}`, refLine, who,
        `${M.cancelled_amount}: ${num(payload.total ?? total)} ${cur}`,
        payload.reason ? `${M.reason}: ${payload.reason}` : ''])
    default:
      return join([no, who])
  }
}

// ── formal client card (the chosen design) ──
const noDash = v => String(v ?? '').replace(/-/g, '')
const LINE = '─────────────────'
const CARD_ICON = '🧾'
const THANKS_ICON = '🙏'
const fmtDateOnly = iso => { try { const d = new Date(iso); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` } catch { return '' } }
const TITLE_KEY = { invoice_created: 'new_invoice', payment: 'new_payment', refund: 'refund_title', payment_voided: 'payment_voided_title', payment_edit: 'payment_edit_title', pricing_edit: 'pricing_edit_title', cancelled: 'cancel_title' }

function cardBody(kind, M, inv, payload) {
  const { total, paid, rem } = totals(inv)
  const cur = M.currency
  const money = v => `${num(v)} ${cur}`
  const mth = c => M['method_' + c] || ''
  switch (kind) {
    case 'invoice_created': return [`${M.total}: ${money(total)}`, `${M.paid}: ${money(paid)}`, `${M.remaining}: ${money(rem)}`]
    case 'payment': return [`${M.amount}: ${num(payload.amount)} ${mth(payload.method)}`.trim(), `${M.paid}: ${money(paid)}`, `${M.remaining}: ${money(rem)}`]
    case 'refund': return [`${M.refunded_amount}: ${money(Math.abs(Number(payload.amount || 0)))}`, `${M.paid}: ${money(paid)}`, `${M.remaining}: ${money(rem)}`]
    case 'payment_voided': return [`${M.payment_voided_title}: ${money(payload.amount)}`, `${M.paid}: ${money(paid)}`, `${M.remaining}: ${money(rem)}`]
    case 'payment_edit': return [`${M.amount}: ${num(payload.old_amount)} ← ${money(payload.new_amount)}`, `${M.paid}: ${money(paid)}`, `${M.remaining}: ${money(rem)}`]
    case 'pricing_edit': return [`${M.total}: ${num(payload.old_total)} ← ${money(payload.new_total)}`, `${M.remaining}: ${money(rem)}`]
    case 'cancelled': return [`${M.cancelled_amount}: ${money(payload.total ?? total)}`, payload.reason ? `${M.reason}: ${payload.reason}` : '']
    default: return [`${M.total}: ${money(total)}`]
  }
}

export function formatCard(kind, inv, payload = {}, lang = 'ar') {
  const M = MSG[lang] || MSG.ar
  const branch = inv.branch?.branch_code || ''
  const title = M[TITLE_KEY[kind]] || M.new_invoice
  return [
    `*${[`${CARD_ICON} ${title}`, branch].filter(Boolean).join(' — ')}*`,
    LINE,
    fmtDateOnly(inv.created_at),
    `${M.client} : ${party(inv).name}`,
    `${M.service} : ${svcLabel(inv, lang)}`,
    noDash(invNo(inv)),
    LINE,
    ...cardBody(kind, M, inv, payload).filter(Boolean),
    LINE,
    `${M.thanks} ${THANKS_ICON}`,
  ].join('\n')
}

// ── daily summary (group only, Arabic) ──
export function summaryKey(sum) {
  const s = sum?.stats || {}
  return { ic: sum?.invoice_count || 0, it: Number(sum?.invoiced_total || 0), cash: s.cash || {}, bank: s.bank || {}, voided: s.voided || {}, cancelled: s.cancelled || {} }
}
export function formatSummary(sum, phase) {
  const s = sum?.stats || {}
  const cash = Number(s.cash?.sum || 0), bank = Number(s.bank?.sum || 0)
  const voided = Number(s.voided?.sum || 0), cancelled = Number(s.cancelled?.sum || 0)
  const net = cash + bank - voided
  const tag = phase === 'final' ? 'نهائي' : 'أولي'
  return [
    `📊 ملخّص حركة اليوم — ${arabicDate(sum.business_day)} (${tag})`,
    `عدد الفواتير: ${num(sum.invoice_count)} | إجمالي اليوم: ${num(sum.invoiced_total)} ر.س`,
    '———',
    `مستلم نقداً: ${num(cash)} (${s.cash?.cnt || 0})`,
    `حوالة/شبكة: ${num(bank)} (${s.bank?.cnt || 0})`,
    `ملغاة/مرتجعة: ${num(voided + cancelled)}`,
    `الصافي: ${num(net)} ر.س`,
  ].join('\n')
}
