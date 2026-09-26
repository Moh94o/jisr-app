// مزامنة إجمالي الفاتورة مع أي تغيير في التسعير (من محرّر تسعير الفاتورة أو من تعديل تسعيرة
// الحسبة المرتبطة). يحدّث total_amount + حالة السداد ويعيد توزيع جدول الدفعات بحيث يساوي مجموعها
// الإجمالي الجديد ولا تقل أي دفعة عن مسدّدها — وremaining_amount عمود محسوب فيتحدّث تلقائياً.
// نفس منطق applyInvoicePricing في InvoicePage، مُستخرَج ليُشارَك مع صفحة الحسبة (App.jsx).

const r2 = n => Math.round((Number(n) || 0) * 100) / 100

// حالة السداد المشتقّة من (المدفوع/الإجمالي) — لا نمسّ الملغاة.
async function invoiceStatusPatch(sb, statusCode, paid, total) {
  if (statusCode === 'cancelled') return {}
  const { data } = await sb.from('lookup_items')
    .select('id,code,category:lookup_categories!inner(category_key)')
    .eq('category.category_key', 'invoice_status')
  const map = {}; (data || []).forEach(r => { map[r.code] = r.id })
  const want = (total > 0 && paid >= total - 0.005) ? 'fully_paid' : 'active'
  return map[want] ? { status_id: map[want] } : {}
}

// توزيع جدول الدفعات على إجمالي جديد — دالة صافية (بلا قاعدة بيانات) كي يستعملها
// المحرّر لمعاينة الأثر قبل الحفظ، ويستعملها الحفظ نفسه فلا يفترق العرض عن الكتابة.
// كل دفعة تبدأ من مسدّدها (أرضية) ثم يُوزَّع الفرق بنسبة متبقّي كل دفعة؛ فإن كانت
// كلها مسدّدة استوعبت آخرُ دفعة الزيادة بالكامل.
export function redistributeInstallments(rows, newTotal) {
  const list = (Array.isArray(rows) ? rows : []).slice()
    .sort((a, b) => (Number(a.installment_order) || 0) - (Number(b.installment_order) || 0))
  const total = r2(newTotal)
  if (!list.length) return []
  const paidArr = list.map(r => r2(r.paid_amount))
  if (list.length === 1) {
    const only = list[0]
    const to = total >= paidArr[0] - 0.005 ? total : r2(only.total_amount)
    return [{ id: only.id, order: only.installment_order, paid: paidArr[0], from: r2(only.total_amount), to }]
  }
  const floorSum = r2(paidArr.reduce((s, v) => s + v, 0))
  let extra = r2(total - floorSum); if (extra < 0) extra = 0
  const remArr = list.map((r, i) => Math.max(0, r2((Number(r.total_amount) || 0) - paidArr[i])))
  const remSum = r2(remArr.reduce((s, v) => s + v, 0))
  const weights = remSum > 0.005 ? remArr.map(v => v / remSum) : list.map((_, i) => i === list.length - 1 ? 1 : 0)
  const out = []
  let acc = 0
  for (let i = 0; i < list.length; i++) {
    const add = i === list.length - 1 ? r2(extra - acc) : r2(extra * weights[i])
    acc = r2(acc + add)
    out.push({ id: list[i].id, order: list[i].installment_order, paid: paidArr[i], from: r2(list[i].total_amount), to: r2(paidArr[i] + add) })
  }
  return out
}

// يضبط فاتورة على إجمالي جديد. options: { newLines } لكتابة pricing_breakdown، { logEntry } لإلحاق سجلّ التسعير.
export async function syncInvoicePricing(sb, invoiceId, newTotal, { newLines, logEntry } = {}) {
  if (!invoiceId) return
  const nowIso = new Date().toISOString()
  const total = r2(newTotal)
  const { data: invFresh, error: readErr } = await sb.from('invoices')
    .select('paid_amount, pricing_log, status:status_id(code)').eq('id', invoiceId).maybeSingle()
  // بلا هذا الفحص يُكتب pricing_log من الصفر (يُمحى السجلّ) وتُشتقّ الحالة من مدفوع = 0.
  if (readErr) throw readErr
  const curPaid = Number(invFresh?.paid_amount) || 0
  const patch = { total_amount: total, last_activity_at: nowIso }
  if (newLines) patch.pricing_breakdown = newLines
  if (logEntry) {
    const log = Array.isArray(invFresh?.pricing_log) ? invFresh.pricing_log : []
    patch.pricing_log = [...log, { at: nowIso, ...logEntry }]
  }
  const stPatch = await invoiceStatusPatch(sb, invFresh?.status?.code, curPaid, total)
  const { error } = await sb.from('invoices').update({ ...patch, ...stPatch }).eq('id', invoiceId)
  if (error) throw error
  // مزامنة جدول الدفعات مع الإجمالي الجديد — بنفس دالة المعاينة المستعملة في المحرّر.
  const { data: insRows } = await sb.from('installments')
    .select('id,total_amount,paid_amount,installment_order,visa_application_id').eq('invoice_id', invoiceId).is('deleted_at', null).order('installment_order')
  if (Array.isArray(insRows) && insRows.length) {
    const sumT = insRows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
    const visaOf = Object.fromEntries(insRows.map(r => [r.id, r.visa_application_id || null]))
    let after = insRows.map(r => ({ id: r.id, to: r2(r.total_amount), paid: r2(r.paid_amount) }))
    if (Math.abs(r2(total - sumT)) > 0.005) {
      after = []
      for (const row of redistributeInstallments(insRows, total)) {
        if (r2(row.to) !== r2(row.from)) {
          const { error: insErr } = await sb.from('installments').update({ total_amount: r2(row.to) }).eq('id', row.id)
          if (insErr) throw insErr
        }
        after.push({ id: row.id, to: r2(row.to), paid: r2(row.paid) })
      }
    }
    await dropEmptyInstallments(sb, invoiceId, after.map(r => ({ ...r, visa: visaOf[r.id] })), nowIso)
  }
}

// دفعة صار مبلغها 0 ولا مسدَّد عليها (مثلاً «متبقي» بعد خفض الإجمالي) لا معنى لبقائها
// في الجدول — تُحذف حذفاً ناعماً ويُحدَّث عدد الدفعات. تبقى دفعة واحدة على الأقل، ولا
// تُحذف دفعة تشير إليها مدفوعات قائمة (كي لا تتيتّم حركة نقدية).
async function dropEmptyInstallments(sb, invoiceId, rows, nowIso) {
  const empty = rows.filter(r => !r.visa && r.to <= 0.005 && r.paid <= 0.005)
  if (!empty.length) return
  const { data: refPays } = await sb.from('payments').select('installment_id')
    .in('installment_id', empty.map(r => r.id)).is('deleted_at', null)
  const referenced = new Set((refPays || []).map(p => p.installment_id))
  let drop = empty.filter(r => !referenced.has(r.id)).map(r => r.id)
  if (drop.length >= rows.length) drop = drop.slice(0, rows.length - 1)
  if (!drop.length) return
  const { error } = await sb.from('installments').update({ deleted_at: nowIso }).in('id', drop)
  if (error) throw error
  const live = rows.length - drop.length
  await sb.from('invoices').update({ installments_count: live > 1 ? live : 0 }).eq('id', invoiceId)
}
