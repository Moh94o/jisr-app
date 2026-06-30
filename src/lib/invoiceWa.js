// Browser port of the WhatsApp invoice-card message (wa-invoice-bot/lib/format.mjs)
// and the print-data fetch (wa-invoice-bot/lib/invoiceData.mjs). Keeps the card's
// «نسخ رسالة الواتساب» + «طباعة» buttons byte-for-byte identical to what the bot
// posts to the group / renders as the PDF. Arabic only (group feed = Arabic).

const num = v => { const n = Math.round((Number(v) || 0) * 100) / 100; return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('en-US') }
const noDash = v => String(v ?? '').replace(/-/g, '')
const pickWorker = rel => (Array.isArray(rel) ? rel[0]?.worker : rel?.worker)

const M = {
  new_invoice: 'فاتورة جديدة', payment_title: 'دفعة مستلمة', refund_title: 'استرجاع مبلغ', cancel_title: 'إلغاء فاتورة',
  total: 'الإجمالي', paid: 'المدفوع', remaining: 'المتبقي',
  amount_paid: 'دفعة مستلمة', amount_received: 'المبلغ المستلم', amount_refunded: 'المبلغ المسترد', amount_void: 'المبلغ الملغى',
  pay_method: 'طريقة الدفع', refund_method: 'طريقة الاسترجاع', currency: 'ريال',
}
const DIV_SQ = '▪▪▪▪▪▪▪▪▪'
const DIV_DOT = '· · · · · · ·   · · · · · · ·   · · · · · · ·'

function party(inv) {
  const sr = inv.service_request || {}
  const worker = pickWorker(sr.transfer_applications) || pickWorker(sr.ajeer_applications)
    || pickWorker(sr.iqama_renewal_applications) || pickWorker(sr.supplier_payroll_applications)
    || pickWorker(sr.other_applications) || null
  const p = sr.client || worker
  const otherWP = Array.isArray(sr.other_applications) ? sr.other_applications[0]?.worker_phone : sr.other_applications?.worker_phone
  const dg = String(p?.phone || otherWP || '').replace(/\D/g, '')
  const wa = dg ? (dg.startsWith('966') ? dg : '966' + dg.slice(-9)) : ''
  const phone = wa ? '0' + wa.slice(3) : ''
  return { name: p?.name_ar || p?.name_en || '— بدون عميل —', phone }
}
// عنوان الفرع = اسم المدينة + الرقم في كود الفرع (JUB5 → «الجبيل 5»).
function branchLabel(inv) {
  const b = inv.branch || {}
  const city = b.city?.name_ar || ''
  const n = (String(b.branch_code || '').match(/\d+/) || [''])[0]
  return [city, n].filter(Boolean).join(' ') || b.branch_code || ''
}
const svcLabel = inv => inv.service_type?.value_ar || inv.service_type?.value_en || 'خدمة'

// بطاقة حركة اليوم — تُرسل للقروب لتلخيص ما صار على الفاتورة في يوم العمل (يبدأ 5 فجراً).
// `day` (اختياري) يحمل حركة ذلك اليوم فقط: المبلغ المستلم + طريقة الدفع، والاسترجاع/الإلغاء إن وقعا اليوم.
// بدونه ترجع للصيغة القديمة (إجمالي المدفوع بلا طريقة).
export function buildInvoiceWaMessage(inv, day = null) {
  const { name, phone } = party(inv)
  const total = Number(inv.total_amount || 0), paid = Number(inv.paid_amount || 0), rem = Number(inv.remaining_amount || 0)
  const cur = M.currency
  const bal = [`🟡 ${M.total}: ${num(total)} ${cur}`, `🟢 ${M.paid}: ${num(paid)} ${cur}`, `🔴 ${M.remaining}: ${num(rem)} ${cur}`]
  const methods = arr => (Array.isArray(arr) ? arr.filter(Boolean) : []).join('، ')

  let title, money
  if (day) {
    const m = []
    if (day.cancelledToday) {
      title = M.cancel_title
      m.push(`❌ *${M.cancel_title}*`)
      if (day.cancelledAmt > 0) m.push(`💸 ${M.amount_void}: ${num(day.cancelledAmt)} ${cur}`)
    } else {
      if (day.received > 0) {
        m.push(`💵 *${M.amount_received}: ${num(day.received)} ${cur}*`)
        const ms = methods(day.recvMethods)
        if (ms) m.push(`💳 ${M.pay_method}: ${ms}`)
      }
      if (day.refunded > 0) {
        m.push(`↩️ *${M.amount_refunded}: ${num(day.refunded)} ${cur}*`)
        const ms = methods(day.refundMethods)
        if (ms) m.push(`💳 ${M.refund_method}: ${ms}`)
      }
      title = (day.refunded > 0 && day.received <= 0) ? M.refund_title
        : day.createdToday ? M.new_invoice
        : day.received > 0 ? M.payment_title
        : M.new_invoice
    }
    money = m.length ? [...m, DIV_DOT, ...bal] : bal
  } else {
    title = M.new_invoice
    money = paid > 0 ? [`💵 *${M.amount_paid}: ${num(paid)} ${cur}*`, DIV_DOT, ...bal] : bal
  }

  return [
    `🧾 *${title} — ${branchLabel(inv)}*`,
    DIV_SQ,
    `*${svcLabel(inv)}* | \`${noDash(inv.invoice_no || '')}\``,
    ` ${name}${phone ? ' | ' + phone : ''}`,
    DIV_DOT,
    ...money,
    DIV_DOT,
  ].filter(l => l !== '').join('\n')
}

// ── per-service `data` for buildInvoiceDoc (port of bot's fetchInvoiceData) ──
const VISA = new Set(['work_visa', 'work_visa_permanent', 'work_visa_temporary'])
const baseSvcCode = c => (VISA.has(c) ? 'work_visa' : c)
const SELECTS = {
  work_visa: `id,visa_number,visa_cost,border_number,worker_name,wakalah_number,wakalah_date,wakalah_office,visa_used,visa_used_date_check,gender,file_number,
    main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
    nationality:nationality_id(name_ar,name_en),
    occupation:occupation_id(name_ar,name_en),
    embassy:embassy_id(name_ar,name_en),
    visa_type:visa_type_id(value_ar,value_en),
    visa_order_kind:visa_order_kind_id(value_ar,value_en),
    wakalah_status:wakalah_status_id(value_ar,value_en)`,
  transfer: `id,reference_number,total_price_initial,total_price_final,discount,office_cost,iqama_expiry_date,
    worker:worker_id(name_ar,name_en,iqama_number,phone),
    main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
    new_occupation:new_occupation_id(name_ar,name_en),
    status:status_id(value_ar,value_en),
    worker_status:worker_status_id(value_ar,value_en)`,
  iqama_renewal: `id,duration_months,current_expire_date,new_expire_date,
    worker:worker_id(name_ar,name_en,iqama_number),
    worker_facility:worker_facility_id(name_ar,unified_number)`,
  iqama_issuance: `id,is_temporary,entry_date,check_date,worker_name_at_entry,
    iqama_status,iqama_number,iqama_expiry,iqama_amount,
    medical_status,medical_amount,
    work_permit_status,work_permit_expiry,work_permit_amount,
    insurance_status,insurance_amount,
    iqama_print_status,iqama_print_amount,iqama_delivery_status,
    contract_authentication_status,all_payment_status,
    worker:worker_id(name_ar,name_en,iqama_number),
    main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number)`,
  other: `id,description,details,
    worker:worker_id(id,name_ar,name_en,iqama_number),
    worker_facility:worker_facility_id(name_ar,unified_number)`,
}
const TABLES = { work_visa: 'visa_applications', transfer: 'transfer_applications', iqama_renewal: 'iqama_renewal_applications', iqama_issuance: 'iqama_issuance_applications', other: 'other_applications' }

// Assembles the `data` object buildInvoiceDoc() needs — same shape the bot's PDF uses.
export async function fetchInvoicePrintData(sb, inv) {
  const code = inv.service_type?.code
  const srId = inv.service_request?.id
  const tbl = TABLES[baseSvcCode(code)] || 'other_applications'
  const sel = SELECTS[baseSvcCode(code)] || SELECTS.other
  const branchId = inv.branch?.id

  const [insts, pays, det, banks] = await Promise.all([
    sb.from('installments').select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,receipt_no,bank_reference,notes,visa_application_id,visa_application:visa_application_id(border_number,file_number,gender,nationality:nationality_id(name_ar,name_en),occupation:occupation_id(name_ar,name_en),embassy:embassy_id(name_ar,name_en)),payment_method:payment_method_id(value_ar,value_en),payment_milestone:payment_milestone_id(value_ar,value_en)').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order'),
    sb.from('payments').select('id,amount,payment_date,is_valid,receipt_no,bank_reference,notes,payment_method:payment_method_id(value_ar,value_en,code),installment_id,creator:created_by(person:person_id(name_ar,name_en))').eq('invoice_id', inv.id).is('deleted_at', null).order('payment_date', { ascending: false }),
    (tbl && srId) ? sb.from(tbl).select(sel).eq('service_request_id', srId) : Promise.resolve({ data: [] }),
    branchId ? sb.from('bank_account_branches').select('account_purpose,bank_accounts!inner(bank_name,bank_name_en,account_name,account_name_en,account_number,iban,swift_code,is_active,deleted_at)').eq('branch_id', branchId).is('bank_accounts.deleted_at', null) : Promise.resolve({ data: [] }),
  ])

  const officeAccounts = (() => {
    const seen = new Set(), out = []
    for (const r of (banks?.data || [])) {
      const a = r.bank_accounts
      if (!a || a.is_active === false) continue
      if (!String(r.account_purpose || '').includes('التحويلات الواردة')) continue
      const k = (a.account_number || '') + '|' + (a.iban || '')
      if (seen.has(k)) continue
      seen.add(k); out.push(a)
    }
    return out
  })()

  return { loading: false, insts: insts.data || [], pays: pays.data || [], det: det.data || [], code, quote: null, officeAccounts, passports: {} }
}
