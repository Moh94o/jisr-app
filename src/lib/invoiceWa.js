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
  amount_paid: 'دفعة مستلمة', amount_received: 'المبالغ المستلمة اليوم', amount_refunded: 'المبلغ المسترد', amount_void: 'المبلغ الملغى',
  pay_method: 'طريقة الدفع', refund_method: 'طريقة الاسترجاع', currency: 'ريال',
}
const DIV_SQ = '▪▪▪▪▪▪▪▪▪'
const DIV_DOT = '· · · · · · ·   · · · · · · ·   · · · · · · ·'
// الخدمات الصفرية (بلا عمود مالي على الفاتورة): لا تُعرض لها الأرصدة (إجمالي/مدفوع/متبقٍّ) في رسالة الواتساب.
const ZERO_INVOICE_SVCS = new Set(['supplier_payroll', 'documents', 'external_transfer_approval'])
const moLbl = n => (n >= 3 && n <= 10) ? 'أشهر' : 'شهر'

// اسم نوع المستند من قيمته المخزّنة — أنواع الأدمن (docTypesConfig) أولاً ثم الأنواع الثابتة.
const DOC_TYPE_STATIC = { commercial_register: 'السجل التجاري', resident_file: 'ملف مقيم', iqama_copy: 'صورة إقامة', contract: 'عقد عمل', salary_cert: 'تعريف بالراتب', other: 'أخرى' }
function docTypeName(v) {
  if (!v) return ''
  try {
    if (typeof localStorage !== 'undefined') {
      const r = JSON.parse(localStorage.getItem('docTypesConfig') || 'null')
      if (Array.isArray(r)) { const f = r.find(d => d && d.value === v); if (f) return f.label }
    }
  } catch { /* تجاهل */ }
  return DOC_TYPE_STATIC[v] || String(v)
}

// الخدمات الصفرية: بدل الأرصدة نعرض بنود الطلب — رواتب سبلاير (إجمالي الرواتب + المدة)، المستندات (نوع المستند).
function zeroSvcLines(inv) {
  const code = inv.service_type?.code
  const sr = inv.service_request || {}
  if (code === 'documents') {
    const raw = sr.other_applications
    const oa = Array.isArray(raw) ? raw[0] : raw
    const t = docTypeName(oa?.details?.doc_type)
    return t ? [`نوع المستند: ${t}`] : []
  }
  if (code !== 'supplier_payroll') return []
  const raw = sr.supplier_payroll_applications
  const sp = Array.isArray(raw) ? raw[0] : raw
  if (!sp) return []
  const out = []
  const totalSal = Number(sp.total_amount || 0)
  const months = Number(sp.unpaid_salaries_count || 0)
  if (totalSal > 0) out.push(`إجمالي الرواتب المطلوبة: ${num(totalSal)} ${M.currency}`)
  if (months > 0) out.push(`المدة: ${months} ${moLbl(months)}`)
  return out
}

function party(inv) {
  const sr = inv.service_request || {}
  const worker = pickWorker(sr.transfer_applications) || pickWorker(sr.ajeer_applications)
    || pickWorker(sr.iqama_renewal_applications) || pickWorker(sr.supplier_payroll_applications)
    || pickWorker(sr.other_applications) || null
  // نقل الكفالة وتجديد الإقامة: نعرض العامل الفعلي لا العميل. اسمه يأتي أولاً من الحسبة المرتبطة
  // (worker_name — نفس مصدر بطاقة الفاتورة)، ثم من سجل العامل، وإلا نسقط للعميل.
  const code = inv.service_type?.code
  const isWorkerSvc = code === 'transfer' || code === 'iqama_renewal'
  const tcRaw = code === 'transfer' ? inv.transfer_calculation : (code === 'iqama_renewal' ? inv.iqama_renewal_calculation : null)
  const tc = Array.isArray(tcRaw) ? tcRaw.find(x => x && !x.deleted_at) : (tcRaw && !tcRaw.deleted_at ? tcRaw : null)
  const tcWorkerName = isWorkerSvc ? String(tc?.worker_name || '').trim() : ''
  const tcPhone = isWorkerSvc ? String(tc?.phone || '').trim() : ''
  // اللابل «اسم العامل» يُوضع فقط حين نعرض عاملاً فعليًا (سجل عامل أو اسم من الحسبة)؛
  // إن سقطنا إلى العميل نعرض اسمه بلا لابل كباقي الخدمات — لا نُسمّي العميل «اسم العامل».
  const isWorker = isWorkerSvc && !!(worker || tcWorkerName)
  const p = isWorker ? worker : (sr.client || worker)
  const otherWP = Array.isArray(sr.other_applications) ? sr.other_applications[0]?.worker_phone : sr.other_applications?.worker_phone
  const spWP = Array.isArray(sr.supplier_payroll_applications) ? sr.supplier_payroll_applications[0]?.worker_phone : sr.supplier_payroll_applications?.worker_phone
  // جوال العامل من سجله ثم من الحسبة (tc.phone) — لا نُلصق جوال العميل باسم العامل.
  // رواتب سبلاير: جوال العامل المُدخل في الطلب (worker_phone) — يظهر بجانب الاسم.
  const dg = String((isWorker ? (worker?.phone || tcPhone) : (spWP || p?.phone || otherWP)) || '').replace(/\D/g, '')
  const wa = dg ? (dg.startsWith('966') ? dg : '966' + dg.slice(-9)) : ''
  const phone = wa ? '0' + wa.slice(3) : ''
  const name = (isWorker
    ? ((worker ? (worker.name_ar || worker.name_en) : '') || tcWorkerName)
    : (p?.name_ar || p?.name_en)) || '— بدون عميل —'
  return { name, phone, isWorker }
}
// عنوان الفرع = اسم المدينة + الرقم في كود الفرع (JUB5 → «الجبيل 5»).
function branchLabel(inv) {
  const b = inv.branch || {}
  const city = b.city?.name_ar || ''
  const n = (String(b.branch_code || '').match(/\d+/) || [''])[0]
  return [city, n].filter(Boolean).join(' ') || b.branch_code || ''
}
// تأشيرات العمل: يُعرض سطر الخدمة بصيغة «الكمية x نوع التأشيرة» (مثال: «3 x تأشيرة دائمة»).
// الكمية = عدد صفوف التأشيرات الفعلية (كبطاقة الفاتورة)، لا service_request.quantity الذي قد يبقى 1
// رغم أن الطلب يحزم عدة تأشيرات.
const svcLabel = inv => {
  const code = inv.service_type?.code
  const visaApps = inv.service_request?.visa_applications
  const qty = (Array.isArray(visaApps) ? visaApps.length : 0) || Number(inv.service_request?.quantity || 0) || 1
  if (code === 'work_visa_permanent') return `${qty} x تأشيرة دائمة`
  if (code === 'work_visa_temporary') return `${qty} x تأشيرة مؤقتة`
  return inv.service_type?.value_ar || inv.service_type?.value_en || 'خدمة'
}

// خدمات ذات حقل «السبب» (خروج نهائي، الموافقة للنقل الخارجي، طباعة الإقامة): نصّ السبب
// المُدخل في الطلب (other_applications.details) يظهر سطراً مستقلاً أسفل الأرصدة في رسالة الواتساب.
const REASON_KEY = { final_exit_visa: 'reason', external_transfer_approval: 'reason', iqama_print: 'print_reason' }
function reasonLine(inv) {
  const key = REASON_KEY[inv.service_type?.code]
  if (!key) return []
  const raw = inv.service_request?.other_applications
  const oa = Array.isArray(raw) ? raw[0] : raw
  const txt = String(oa?.details?.[key] || '').trim()
  return txt ? [` السبب: ${txt}`] : []
}

// أسطر إضافية أسفل الأرصدة:
//   • الوسيط + جواله — لأي خدمة يوجد بها وسيط (وليس نقل الكفالة فقط).
//   • المدة (المتوقعة/التجديد) وفائدة المكتب — خاصّة بنقل الكفالة وتجديد الإقامة فقط.
function calcExtra(inv) {
  const code = inv.service_type?.code
  const isTransfer = code === 'transfer'
  const isRenewal = code === 'iqama_renewal'
  const out = []
  // الوسيط — يُقرأ من الفاتورة مباشرة أو من وسطاء الطلب، ويظهر لكل الخدمات التي لها وسيط.
  const ag = inv.agent || (Array.isArray(inv.service_request?.service_request_agents) ? inv.service_request.service_request_agents[0]?.agent : null)
  if (ag) {
    const nm = ag.name_ar || ag.name_en || ''
    const dg = String(ag.phone || '').replace(/\D/g, '')
    const ph = dg ? (dg.startsWith('966') ? '0' + dg.slice(3) : (dg.startsWith('0') ? dg : '0' + dg.slice(-9))) : ''
    if (nm) out.push(` الوسيط: ${nm}${ph ? ' | ' + ph : ''}`)
  }
  // المدة والفائدة خاصّتان بنقل الكفالة وتجديد الإقامة (تُقرآن من حساب النقل/التجديد).
  if (isTransfer || isRenewal) {
    const tcRaw = isTransfer ? inv.transfer_calculation : inv.iqama_renewal_calculation
    const tc = Array.isArray(tcRaw) ? tcRaw.find(x => x && !x.deleted_at) : (tcRaw && !tcRaw.deleted_at ? tcRaw : null)
    const months = Number(tc?.expected_duration_months || tc?.billed_renewal_months || tc?.renewal_months || 0)
    if (months > 0) out.push(`${isRenewal ? ' مدة التجديد' : ' المدة المتوقعة'}: ${months} شهر`)
    const officeNet = tc ? (tc.office_fee_net != null ? Number(tc.office_fee_net) : Number(tc.office_fee || 0)) : 0
    if (officeNet > 0) out.push(` الفائدة: ${num(officeNet)} ${M.currency}`)
  }
  return out
}

// بطاقة حركة اليوم — تُرسل للقروب لتلخيص ما صار على الفاتورة في يوم العمل (يبدأ 5 فجراً).
// `day` (اختياري) يحمل حركة ذلك اليوم فقط: المبلغ المستلم + طريقة الدفع، والاسترجاع/الإلغاء إن وقعا اليوم.
// بدونه ترجع للصيغة القديمة (إجمالي المدفوع بلا طريقة).
export function buildInvoiceWaMessage(inv, day = null) {
  const { name, phone, isWorker } = party(inv)
  const total = Number(inv.total_amount || 0), paid = Number(inv.paid_amount || 0), rem = Number(inv.remaining_amount || 0)
  const cur = M.currency
  // الخدمات الصفرية: نستبدل الأرصدة (إجمالي/مدفوع/متبقٍّ) ببنود الطلب (رواتب سبلاير: إجمالي الرواتب + المدة).
  const isZero = ZERO_INVOICE_SVCS.has(inv.service_type?.code)
  const bal = isZero
    ? zeroSvcLines(inv)
    : [`🟡 ${M.total}: ${num(total)} ${cur}`, `🟢 ${M.paid}: ${num(paid)} ${cur}`, `🔴 ${M.remaining}: ${num(rem)} ${cur}`]
  const methods = arr => (Array.isArray(arr) ? arr.filter(Boolean) : []).join('، ')
  const updateDate = (inv.last_activity_at || inv.created_at) ? String(inv.last_activity_at || inv.created_at).slice(0, 10) : ''
  const updateLine = updateDate ? ` ${updateDate}` : ''

  // فاتورة ملغاة: صيغة إلغاء خاصة (❌❌❌) — المبلغ الملغى + السبب، ثم الأرصدة والأسطر الإضافية كما هي.
  // تُفعَّل بحالة الفاتورة (ملغاة) أو بوقوع الإلغاء اليوم (بطاقة حركة اليوم للقروب).
  // الخدمات الصفرية: لا تُلغى فاتورتها بل تُلغى المعاملة نفسها، فنقرأ الإلغاء من حالة الطلب (service_request).
  const sr = inv.service_request || {}
  const srCancelled = isZero && sr.status?.code === 'cancelled'
  const isCancelled = inv.status?.code === 'cancelled' || srCancelled || !!(day && day.cancelledToday)
  if (isCancelled) {
    const clog = Array.isArray(inv.cancel_log) ? inv.cancel_log : []
    const lastCancel = clog.length ? clog[clog.length - 1] : null
    const reason = ((srCancelled ? sr.cancelled_reason : null) || lastCancel?.reason || '').trim()
    const voidAmt = (day && day.cancelledAmt > 0) ? day.cancelledAmt : paid
    const cancelDate = (srCancelled && sr.cancelled_at) ? String(sr.cancelled_at).slice(0, 10)
      : lastCancel?.at ? String(lastCancel.at).slice(0, 10)
      : (updateDate || (inv.created_at ? String(inv.created_at).slice(0, 10) : ''))
    const extraC = calcExtra(inv)
    const partyLabelC = isWorker ? 'اسم العامل: ' : ''
    // الخدمات الصفرية: بنود الطلب (الرواتب/المدة) أولاً ثم سبب الإلغاء أسفلها (بلا مبلغ ملغى).
    // غيرها: المبلغ الملغى + السبب ثم الأرصدة كالمعتاد.
    const cancelBody = isZero
      ? [...bal, ...(bal.length ? [DIV_DOT] : []), reason || 'اذكر السبب هنا']
      : [`💸 ${M.amount_void}: ${num(voidAmt)} ${cur}`, reason || 'اذكر السبب هنا', ...(bal.length ? [DIV_DOT, ...bal] : [])]
    return [
      `❌❌❌  *${M.cancel_title}— ${branchLabel(inv)}* | \`${noDash(inv.invoice_no || '')}\` ❌❌❌`,
      cancelDate ? ` ${cancelDate}` : '',
      DIV_SQ,
      `*${svcLabel(inv)}*`,
      ` ${partyLabelC}${name}${phone ? ' | ' + phone : ''}`,
      DIV_DOT,
      ...cancelBody,
      ...(extraC.length ? [DIV_DOT, ...extraC] : []),
      DIV_SQ,
    ].filter(l => l !== '').join('\n')
  }

  let title, money
  if (day) {
    const m = []
    if (day.cancelledToday) {
      title = M.cancel_title
      m.push(`❌ *${M.cancel_title}*`)
      if (day.cancelledAmt > 0) m.push(`💸 ${M.amount_void}: ${num(day.cancelledAmt)} ${cur}`)
    } else {
      if (day.received > 0) {
        const bd = Array.isArray(day.recvBreakdown) ? day.recvBreakdown : []
        if (bd.length > 1) {
          // أكثر من طريقة في نفس اليوم (نقد + حوالة) → إجمالي المقبوض ثم سطر لكل طريقة (المبلغ + العدد).
          m.push(`💵 *${M.amount_received}: ${num(day.received)} ${cur}*`)
          for (const b of bd) m.push(` ${b.method}: ${num(b.amount)} ${cur} (${b.count})`)
        } else {
          // طريقة واحدة → المبلغ مع الطريقة وعدد دفعاتها بين قوسين.
          const b = bd[0]
          m.push(`💵 *${M.amount_received}: ${num(day.received)} ${cur}*${b ? ` (${b.method} ${b.count})` : ''}`)
        }
        // تاريخ آخر تحديث — أسفل سطر المبالغ المستلمة مباشرة.
        if (updateLine) m.push(updateLine)
      }
      if (day.refunded > 0) {
        const ms = methods(day.refundMethods)
        m.push(`↩️ *${M.amount_refunded}: ${num(day.refunded)} ${cur}*${ms ? ' (' + ms + ')' : ''}`)
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

  const extra = calcExtra(inv)
  const reason = reasonLine(inv)
  const issueDate = inv.created_at ? String(inv.created_at).slice(0, 10) : ''
  // نقل الكفالة يعرض العامل → نسبق سطر الطرف بـ «اسم العامل:» فقط حين يوجد عامل فعلي (لا عند السقوط للعميل).
  const partyLabel = isWorker ? 'اسم العامل: ' : ''
  return [
    `🧾 *فاتورة — ${branchLabel(inv)}* | \`${noDash(inv.invoice_no || '')}\``,
    issueDate ? ` ${issueDate}` : '',
    DIV_SQ,
    `*${svcLabel(inv)}*`,
    ` ${partyLabel}${name}${phone ? ' | ' + phone : ''}`,
    ...(money.length ? [DIV_DOT, ...money] : []),
    ...(extra.length ? [DIV_DOT, ...extra] : []),
    ...(reason.length ? [DIV_DOT, ...reason] : []),
    DIV_SQ,
  ].filter(l => l !== '').join('\n')
}

// ── ملخص حركة يوم العمل الكامل (يبدأ وينتهي 5 فجراً بتوقيت الرياض) ──
// يُنسخ من زر الواتساب أعلى صفحة الفواتير بعد ما يخلص الموظف إرسال فواتير اليوم:
// عدد الفواتير الجديدة + الخدمات (الكمية x النوع — المبلغ) + المقبوضات (نقد/تحويلات)
// + المسترد والملغى. نفس أرقام كروت الإحصاء (invoice_period_stats) ونفس صيغة رسالة الفاتورة.
export function buildDaySummaryWaMessage({ dateStr, newCount = 0, services = [], cash, bank, refunded, cancelled, oldPays }) {
  const cur = M.currency
  const invLbl = n => (n >= 3 && n <= 10) ? 'فواتير' : 'فاتورة'
  const visaLbl = n => (n >= 3 && n <= 10) ? 'تأشيرات' : 'تأشيرة'
  const payLbl = n => (n >= 3 && n <= 10) ? 'دفعات' : 'دفعة'
  // سطر الخدمة: عدد الفواتير x الاسم، وخدمات التأشيرات تُظهر إجمالي التأشيرات بين قوسين
  // (الفاتورة الواحدة قد تحمل حتى 4 تأشيرات — العدد وحده لا يكفي).
  const svcLines = services.filter(s => (s.invCnt || 0) > 0)
    .map(s => ` ${s.invCnt} x ${s.label}${s.showQty ? ` (${s.qty} ${visaLbl(s.qty)})` : ''} — ${num(s.sum)} ${cur}`)
  const receivedTotal = (cash?.sum || 0) + (bank?.sum || 0)
  const recv = []
  if (receivedTotal > 0) {
    recv.push(`💵 *${M.amount_received}: ${num(receivedTotal)} ${cur}*`)
    if ((cash?.sum || 0) > 0 || (cash?.cnt || 0) > 0) recv.push(` نقدًا: ${num(cash.sum)} ${cur} (${cash.cnt})`)
    if ((bank?.sum || 0) > 0 || (bank?.cnt || 0) > 0) recv.push(` تحويلات بنكية: ${num(bank.sum)} ${cur} (${bank.cnt})`)
    // دفعات اليوم على فواتير صادرة أيامًا سابقة — تُحسب ضمن المقبوضات لا ضمن الفواتير الجديدة.
    if ((oldPays?.cnt || 0) > 0) recv.push(` 💳 منها دفعات على فواتير سابقة: ${num(oldPays.sum)} ${cur} (${oldPays.cnt} ${payLbl(oldPays.cnt)})`)
  }
  const neg = []
  if ((refunded?.sum || 0) > 0) neg.push(`↩️ ${M.amount_refunded}: ${num(refunded.sum)} ${cur} (${refunded.cnt})`)
  if ((cancelled?.cnt || 0) > 0) neg.push(`❌ فواتير ملغاة: ${cancelled.cnt} — ${num(cancelled.sum)} ${cur}`)
  const empty = !newCount && !svcLines.length && !recv.length && !neg.length
  return [
    `📊 *ملخص حركة اليوم* | \`${dateStr}\``,
    ' يوم العمل يبدأ 5:00 فجراً بتوقيت الرياض',
    DIV_SQ,
    `🧾 *الفواتير الجديدة: ${num(newCount)} ${invLbl(newCount)}*`,
    ...(empty ? [' لا توجد حركة مسجّلة اليوم'] : []),
    ...(svcLines.length ? [DIV_DOT, ...svcLines] : []),
    ...(recv.length ? [DIV_DOT, ...recv] : []),
    ...(neg.length ? [DIV_DOT, ...neg] : []),
    DIV_SQ,
  ].join('\n')
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

  const [insts, pays, det, banks, calcQ] = await Promise.all([
    sb.from('installments').select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,receipt_no,bank_reference,notes,visa_application_id,visa_application:visa_application_id(border_number,file_number,gender,nationality:nationality_id(name_ar,name_en),occupation:occupation_id(name_ar,name_en),embassy:embassy_id(name_ar,name_en)),payment_method:payment_method_id(value_ar,value_en),payment_milestone:payment_milestone_id(value_ar,value_en)').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order'),
    sb.from('payments').select('id,amount,payment_date,is_valid,receipt_no,bank_reference,notes,payment_method:payment_method_id(value_ar,value_en,code),installment_id,creator:created_by(person:person_id(name_ar,name_en))').eq('invoice_id', inv.id).is('deleted_at', null).order('payment_date', { ascending: false }),
    (tbl && srId) ? sb.from(tbl).select(sel).eq('service_request_id', srId) : Promise.resolve({ data: [] }),
    branchId ? sb.from('bank_account_branches').select('account_purpose,bank_accounts!inner(bank_name,bank_name_en,account_name,account_name_en,account_number,iban,swift_code,is_active,deleted_at)').eq('branch_id', branchId).is('bank_accounts.deleted_at', null) : Promise.resolve({ data: [] }),
    // حسبة النقل/التجديد المرتبطة — تُغذّي أشهر البنود وقسم المعاملة في الطباعة (نفس جلب صفحة التفاصيل).
    baseSvcCode(code) === 'transfer' ? sb.from('transfer_calculation').select('*').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
      : baseSvcCode(code) === 'iqama_renewal' ? sb.from('iqama_renewal_calculation').select('*').eq('invoice_id', inv.id).is('deleted_at', null).maybeSingle()
      : Promise.resolve({ data: null }),
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

  return { loading: false, insts: insts.data || [], pays: pays.data || [], det: det.data || [], code, quote: calcQ?.data?.quote_no || null, tc: calcQ?.data || null, officeAccounts, passports: {} }
}
