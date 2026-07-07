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

// يضبط فاتورة على إجمالي جديد. options: { newLines } لكتابة pricing_breakdown، { logEntry } لإلحاق سجلّ التسعير.
export async function syncInvoicePricing(sb, invoiceId, newTotal, { newLines, logEntry } = {}) {
  if (!invoiceId) return
  const nowIso = new Date().toISOString()
  const total = r2(newTotal)
  const { data: invFresh } = await sb.from('invoices')
    .select('paid_amount, pricing_log, status:status_id(code)').eq('id', invoiceId).maybeSingle()
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
  // مزامنة جدول الدفعات مع الإجمالي الجديد:
  //  • دفعة واحدة → تُضبط على الإجمالي مباشرة (ما لم تقل عن مسدّدها).
  //  • دفعات متعددة → كل دفعة تبدأ من مسدّدها (أرضية) ثم يُوزَّع الفرق (الإجمالي الجديد − مجموع المسدّد)
  //    بنسبة متبقّي كل دفعة؛ فإن كانت كلها مسدّدة استوعبت آخرُ دفعة الزيادة بالكامل.
  const { data: insRows } = await sb.from('installments')
    .select('id,total_amount,paid_amount,installment_order').eq('invoice_id', invoiceId).is('deleted_at', null).order('installment_order')
  if (Array.isArray(insRows) && insRows.length) {
    const sumT = insRows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
    const delta = r2(total - sumT)
    if (Math.abs(delta) > 0.005) {
      if (insRows.length === 1) {
        const only = insRows[0]
        if (total >= Number(only.paid_amount) - 0.005) await sb.from('installments').update({ total_amount: total }).eq('id', only.id)
      } else {
        const rows = insRows.slice().sort((a, b) => (Number(a.installment_order) || 0) - (Number(b.installment_order) || 0))
        const paidArr = rows.map(r => r2(Number(r.paid_amount) || 0))
        const floorSum = r2(paidArr.reduce((s, v) => s + v, 0))
        let extra = r2(total - floorSum); if (extra < 0) extra = 0
        const remArr = rows.map((r, i) => Math.max(0, r2((Number(r.total_amount) || 0) - paidArr[i])))
        const remSum = r2(remArr.reduce((s, v) => s + v, 0))
        const weights = remSum > 0.005 ? remArr.map(v => v / remSum) : rows.map((_, i) => i === rows.length - 1 ? 1 : 0)
        const newTotals = paidArr.slice()
        let acc = 0
        for (let i = 0; i < rows.length; i++) {
          const add = i === rows.length - 1 ? r2(extra - acc) : r2(extra * weights[i])
          acc = r2(acc + add)
          newTotals[i] = r2(newTotals[i] + add)
        }
        for (let i = 0; i < rows.length; i++) {
          if (r2(newTotals[i]) !== r2(Number(rows[i].total_amount) || 0)) await sb.from('installments').update({ total_amount: r2(newTotals[i]) }).eq('id', rows[i].id)
        }
      }
    }
  }
}
