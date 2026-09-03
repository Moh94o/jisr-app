// WhatsApp message text for each financial event — office group only, in Arabic.
// The direct-to-client card and its en/hi/ur/bn translations were REMOVED 2026-09-03:
// the bot no longer messages clients, so only the Arabic group feed remains. Nothing in
// this module may be given a recipient other than the office group.
import { arabicWeekday, arabicDateNum } from './businessDay.mjs'

// ── message label dictionary ──
const M = { new_invoice: 'فاتورة جديدة', new_payment: 'دفعة جديدة', refund_title: 'استرجاع مبلغ', payment_voided_title: 'إلغاء دفعة', payment_edit_title: 'تعديل دفعة', pricing_edit_title: 'تعديل تسعيرة', cancel_title: 'إلغاء فاتورة', ref: 'المرجع', total: 'الإجمالي', paid: 'المدفوع', remaining: 'المتبقي', amount: 'المبلغ', remaining_after: 'المتبقي بعد الدفعة', refunded_amount: 'المبلغ المسترجع', updated_paid: 'المدفوع المحدّث', updated_remaining: 'المتبقي المحدّث', reason: 'السبب', cancelled_amount: 'المبلغ الملغى', method_cash: 'نقداً', method_bank: 'حوالة بنكية', method_pos: 'شبكة', method_cheque: 'شيك', currency: 'ريال', office: 'مكتب حسين', client: 'العميل', service: 'الخدمة', thanks: 'شكراً لتعاملكم معنا', inquiry: 'للإستفسارات أو الشكاوى', thanks_card: 'شكراً لتعاملكم', amount_paid: 'المبلغ المستلم اليوم', voided_amount: 'دفعة ملغاة', discount: 'الخصم', total_before: 'الإجمالي قبل الخصم', total_after: 'الإجمالي بعد الخصم' }

export const num = v => {
  const n = Math.round((Number(v) || 0) * 100) / 100
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US')
}

const pickWorker = rel => (Array.isArray(rel) ? rel[0]?.worker : rel?.worker)

// Display party with worker-is-client fallback. Returns the name + display phone shown on
// the group card. (It deliberately no longer returns a dialable WhatsApp id.)
export function party(inv) {
  const sr = inv.service_request || {}
  const worker = pickWorker(sr.transfer_applications) || pickWorker(sr.ajeer_applications)
    || pickWorker(sr.iqama_renewal_applications) || pickWorker(sr.supplier_payroll_applications)
    || pickWorker(sr.other_applications) || null
  // نقل الكفالة وتجديد الإقامة: نعرض العامل (اسمه وجواله) لا العميل عند اختلافهما؛ باقي الخدمات تُبقي العميل أولاً.
  const isWorkerSvc = inv.service_type?.code === 'transfer' || inv.service_type?.code === 'iqama_renewal'
  const p = isWorkerSvc ? (worker || sr.client) : (sr.client || worker)
  const otherWP = Array.isArray(sr.other_applications) ? sr.other_applications[0]?.worker_phone : sr.other_applications?.worker_phone
  const dg = String(p?.phone || otherWP || '').replace(/\D/g, '')
  const phone = dg ? '0' + (dg.startsWith('966') ? dg.slice(3) : dg.slice(-9)) : ''
  return { name: p?.name_ar || p?.name_en || '— بدون عميل —', phone }
}

export const invNo = inv => inv.invoice_no || ''
const totals = inv => ({ total: Number(inv.total_amount || 0), paid: Number(inv.paid_amount || 0), rem: Number(inv.remaining_amount || 0) })
const svcLabel = inv => inv.service_type?.value_ar || inv.service_type?.value_en || 'خدمة'

// «العميل-رقم الفاتورة.pdf» — searchable filename.
export function pdfFileName(inv) {
  const base = `${party(inv).name}-${invNo(inv)}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '-').replace(/^-+|-+$/g, '')
  return (base || 'invoice') + '.pdf'
}

export const formatDayHeader = day => `━━━━ 🗓️ ━━━━\n*فواتير ${arabicWeekday(day)}*\n${arabicDateNum(day)}`

// كل الأحداث المعروفة تُبنى بنفس البطاقة المزخرفة في قروب المكتب.
export function formatEvent(kind, inv, payload = {}) {
  if (DECO_TITLE[kind]) return formatDeco(kind, inv, payload)
  return `${invNo(inv)}\n👤 ${party(inv).name}`
}

const noDash = v => String(v ?? '').replace(/-/g, '')

// ── بطاقة الحدث المزخرفة — قروب المكتب ──
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
// خدمات ذات حقل «السبب» (خروج نهائي، الموافقة للنقل الخارجي، طباعة الإقامة): نصّ السبب
// المُدخل في الطلب (other_applications.details) يظهر سطراً مستقلاً أسفل الأرصدة.
const REASON_KEY = { final_exit_visa: 'reason', external_transfer_approval: 'reason', iqama_print: 'print_reason' }
function reasonLine(inv) {
  const key = REASON_KEY[inv.service_type?.code]
  if (!key) return []
  const raw = inv.service_request?.other_applications
  const oa = Array.isArray(raw) ? raw[0] : raw
  const txt = String(oa?.details?.[key] || '').trim()
  return txt ? [` السبب: ${txt}`] : []
}
// نقل الكفالة وتجديد الإقامة: أسطر إضافية أسفل الأرصدة — الوسيط + جواله (نقل فقط)،
// المدة (المتوقعة/التجديد)، وفائدة المكتب (صافي الرسوم المكتبية بعد الخصم).
function calcExtra(inv) {
  const code = inv.service_type?.code
  const isTransfer = code === 'transfer'
  const isRenewal = code === 'iqama_renewal'
  if (!isTransfer && !isRenewal) return []
  const tcRaw = isTransfer ? inv.transfer_calculation : inv.iqama_renewal_calculation
  const tc = Array.isArray(tcRaw) ? tcRaw.find(x => x && !x.deleted_at) : (tcRaw && !tcRaw.deleted_at ? tcRaw : null)
  const out = []
  // الوسيط خاص بنقل الكفالة فقط — تجديد الإقامة لا يمرّ بوسيط.
  if (isTransfer) {
    const ag = inv.agent || (Array.isArray(inv.service_request?.service_request_agents) ? inv.service_request.service_request_agents[0]?.agent : null)
    if (ag) {
      const nm = ag.name_ar || ag.name_en || ''
      const ph = localPhone(ag.phone)
      if (nm) out.push(` الوسيط: ${nm}${ph ? ' | ' + ph : ''}`)
    }
  }
  const months = Number(tc?.expected_duration_months || tc?.billed_renewal_months || tc?.renewal_months || 0)
  if (months > 0) out.push(`${isRenewal ? ' مدة التجديد' : ' المدة المتوقعة'}: ${months} شهر`)
  const officeNet = tc ? (tc.office_fee_net != null ? Number(tc.office_fee_net) : Number(tc.office_fee || 0)) : 0
  if (officeNet > 0) out.push(` الفائدة: ${num(officeNet)} ريال`)
  return out
}
// تعديل التسعير بعد الإصدار — إن حمل pricing_log قيداً غيّر الإجمالي (وليس خصماً)، نُظهر سطراً
// يُنبّه القروب أن سعر الفاتورة عُدِّل، مع الإجمالي قبل أول تعديل.
function pricingEditLine(inv) {
  const log = Array.isArray(inv.pricing_log) ? inv.pricing_log : []
  const edits = log.filter(e => e && !(Number(e?.discount) > 0) && e.total && Number(e.total.from) !== Number(e.total.to))
  if (!edits.length) return []
  const orig = Number(edits[0].total.from) || 0
  return [orig > 0 ? `✏️ تم تعديل التسعير (الإجمالي السابق: ${num(orig)} ريال)` : '✏️ تم تعديل التسعير']
}
// الهيكل المشترك للبطاقة المزخرفة (رأس + خدمة + عميل + أسطر المبالغ + تذييل).
function decoCard(inv, titleKey, moneyLines) {
  const { name, phone } = party(inv)
  const bPhone = localPhone(inv.branch?.phone)
  // تعديل التسعير يظهر أولاً ضمن الأسطر الإضافية (إلا على بطاقة الإلغاء).
  const extra = [...(titleKey === 'cancel_title' ? [] : pricingEditLine(inv)), ...calcExtra(inv)]
  // السبب لا يُعرض على بطاقة الإلغاء (سطر السبب هناك = سبب الإلغاء، لا سبب الخدمة).
  const reason = titleKey === 'cancel_title' ? [] : reasonLine(inv)
  const issueDate = inv.created_at ? ` ${String(inv.created_at).slice(0, 10)}` : ''
  const updateLine = (inv.last_activity_at || inv.created_at) ? ` ${String(inv.last_activity_at || inv.created_at).slice(0, 10)}` : ''
  // نقل الكفالة وتجديد الإقامة يعرضان العامل → نسبق سطر الطرف بـ «اسم العامل:».
  const partyLabel = (inv.service_type?.code === 'transfer' || inv.service_type?.code === 'iqama_renewal') ? 'اسم العامل: ' : ''
  const money = Array.isArray(moneyLines) ? moneyLines : []
  return [
    `🧾 *${M[titleKey]} — ${branchLabel(inv)}* | \`${noDash(invNo(inv))}\``,
    issueDate,
    DIV_SQ,
    `*${svcLabel(inv)}*`,
    ` ${partyLabel}${name}${phone ? ' | ' + phone : ''}`,
    DIV_DOT,
    money[0] || '',
    updateLine,
    ...money.slice(1),
    DIV_DOT,
    ...(extra.length || reason.length ? [...extra, ...reason, DIV_SQ] : [DIV_SQ]),
    M.inquiry,
    bPhone,
    `${M.thanks_card} 🙏`,
  ].filter(l => l !== '').join('\n')
}
// الخصم المطبَّق على الفاتورة — خصم المدير العام من pricing_log، أو أسطر الخصم في بنود التسعير.
// نفس اشتقاق كرت «الخصم» في صفحة الفاتورة، كي تُبيّن البطاقة أن الفاتورة نالت خصماً.
function invoiceDiscount(inv) {
  const log = (Array.isArray(inv.pricing_log) ? inv.pricing_log : []).filter(e => Number(e?.discount) > 0)
  const bd = Array.isArray(inv.pricing_breakdown) ? inv.pricing_breakdown : []
  const isDisc = l => l && (l.discount === true || ['خصم', 'الخصم', 'Discount'].includes(String(l.label || '').trim()))
  const lineDisc = bd.filter(isDisc).reduce((s, l) => s + Math.abs(Number(l.amount) || 0), 0)
  const logDisc = log.reduce((s, e) => s + (Number(e.discount) || 0), 0)
  const amt = logDisc > 0.005 ? logDisc : lineDisc
  return amt > 0.005 ? Math.round(amt * 100) / 100 : 0
}
// أسطر الإجمالي/المدفوع/المتبقي (مشتركة بين فاتورة جديدة والدفعة).
// فاتورة نالت خصماً: نُظهر «قبل الخصم» + «الخصم» + «بعد الخصم» بدل سطر الإجمالي الواحد.
const balanceLines = inv => {
  const { total, paid, rem } = totals(inv), cur = M.currency
  const disc = invoiceDiscount(inv)
  const totalLines = disc > 0
    ? [`🟡 ${M.total_before}: ${num(Math.round((total + disc) * 100) / 100)} ${cur}`, `🏷️ ${M.discount}: ${num(disc)} ${cur}`, `🟡 ${M.total_after}: ${num(total)} ${cur}`]
    : [`🟡 ${M.total}: ${num(total)} ${cur}`]
  return [...totalLines, `🟢 ${M.paid}: ${num(paid)} ${cur}`, `🔴 ${M.remaining}: ${num(rem)} ${cur}`]
}
const PAY_ICONS = { cash: '💵', bank: '🏦', pos: '💳', cheque: '🧾' } // أيقونة الدفعة حسب طريقة الدفع
const DECO_TITLE = { invoice_created: 'new_invoice', payment: 'new_payment', refund: 'refund_title', payment_voided: 'payment_voided_title', payment_edit: 'payment_edit_title', pricing_edit: 'pricing_edit_title', cancelled: 'cancel_title' }
const codeBlock = s => '```' + s + '```'

// أسطر المبالغ في وسط البطاقة — تختلف حسب نوع الحدث، والباقي (الرأس/التذييل) موحّد.
function decoMoneyLines(kind, inv, payload) {
  const cur = M.currency
  const { total, paid } = totals(inv)
  const bal = balanceLines(inv)
  const mtxt = M['method_' + payload.method] || ''
  const inlM = mtxt ? ' (' + mtxt + ')' : ''
  switch (kind) {
    // فاتورة جديدة: سطر «المبلغ المستلم» يظهر فقط لو فيه دفعة أولى (بدون طريقة — غير متاحة).
    case 'invoice_created':
      return paid > 0 ? [`💵 *${M.amount_paid}: ${num(paid)} ${cur}*`, DIV_DOT, ...bal] : bal
    // دفعة جديدة: المبلغ بارز + الطريقة بين قوسين في نفس السطر.
    case 'payment':
      return [`💵 *${M.amount_paid}: ${num(payload.amount)} ${cur}*${inlM}`, DIV_DOT, ...bal]
    // استرجاع مبلغ: المبلغ المسترجع بارز (خارج للعميل).
    case 'refund':
      return [`↩️ *${M.refunded_amount}: ${num(Math.abs(Number(payload.amount || 0)))} ${cur}*${inlM}`, DIV_DOT, ...bal]
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
export function formatDeco(kind, inv, payload = {}) {
  return decoCard(inv, DECO_TITLE[kind] || 'new_invoice', decoMoneyLines(kind, inv, payload))
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
