// ───────────────────────────────────────────────────────────────────────────
// كتابة تعديل التسعير — الجانب غير الصافي من نموذج التسعير
// ───────────────────────────────────────────────────────────────────────────
// مفصول عن invoicePricingModel.js عمداً: ذاك نموذج صافٍ بلا استيرادات تستعمله أيضاً
// طباعةُ الفاتورة في بوت الواتساب (Node بلا متصفّح)، وهذا يلمس supabase وإعدادات
// التسعير (localStorage) فلا يصحّ أن يدخل شجرةَ استيراد الطباعة.

import { syncInvoicePricing } from './invoicePricingSync.js'
import { computeRenewalDerived } from './renewalDerived.js'
import { getIqamaRenewalPricingConfig } from './kafalaPricing.js'
import { r2, computePricingTotals, pricingDiff, linesToBreakdown, effectivePricingLines } from './invoicePricingModel.js'

const numOf = v => Number(v) || 0

// ─────────────────────────── الحفظ ───────────────────────────
// استرداد الفائض: حين يهبط الإجمالي دون المدفوع، يُسجَّل الفرق كدفعة سالبة ويُفكّ
// من الدفعات المسدّدة (الأحدث أولاً) — تماماً كمسار «استرجاع» في صفحة الفاتورة.
// invoices.paid_amount يضبطه محفّز قاعدة البيانات من مجموع الدفعات، فلا نكتبه هنا.
async function refundSurplus({ sb, inv, amount, method, note, user }) {
  const amt = r2(amount)
  if (!(amt > 0.005)) return
  const { data: pm } = await sb.from('lookup_items')
    .select('id,code,category:lookup_categories!inner(category_key)').eq('category.category_key', 'payment_method')
  const map = {}; (pm || []).forEach(r => { map[r.code] = r.id })
  const pmId = method === 'bank' ? (map.bank_transfer || map.bank) : map.cash
  if (!pmId) throw new Error('no_payment_method')
  const { data: rows } = await sb.from('installments')
    .select('id,paid_amount,installment_order').eq('invoice_id', inv.id).is('deleted_at', null)
    .order('installment_order', { ascending: false })
  let left = amt
  const deAllocs = []
  for (const it of rows || []) {
    if (left <= 0.005) break
    const p = r2(it.paid_amount)
    if (p <= 0.005) continue
    const take = Math.min(left, p)
    deAllocs.push({ id: it.id, newPaid: r2(p - take), empty: take >= p - 0.005 })
    left = r2(left - take)
  }
  const { data: payRow, error } = await sb.from('payments').insert({
    invoice_id: inv.id,
    installment_id: deAllocs[0]?.id || null,
    service_request_id: inv.service_request?.id || null,
    branch_id: inv.branch_id || inv.branch?.id || null,
    amount: -amt, payment_method_id: pmId, bank_reference: null, bank_account_id: null,
    is_valid: true, notes: note || null, created_by: user?.id || null,
  }).select('id').single()
  if (error) throw error
  for (const a of deAllocs) {
    await sb.from('installments').update({ paid_amount: a.newPaid, ...(a.empty ? { paid_date: null } : {}) }).eq('id', a.id)
  }
  return payRow?.id || null
}

const invokeQuoteFn = async (sb, body) => {
  const { data, error } = await sb.functions.invoke('update-quotation', { body })
  let res = data
  if (error) { try { res = await error.context.json() } catch { /* تجاهل قراءة جسم الخطأ */ } }
  if (!res?.ok) throw new Error(res?.detail || res?.error || 'update_failed')
  return res
}

// يكتب تعديل التسعير كاملاً ويحافظ على اتساق كل ما يتفرّع عن الإجمالي:
//   1) استرداد الفائض (إن طُلب) — قبل كل شيء كي تنخفض أرضية الدفعات.
//   2) كتابة الحسبة (نقل/تجديد) إن كانت الفاتورة مبنيّة عليها.
//   3) syncInvoicePricing: الإجمالي + البنود + السجلّ + حالة السداد + توزيع الدفعات.
export async function savePricingEdit({ sb, inv, tc, shape, lines: rawLines, initial, reasonKind, reason, user, T, isAr, surplus }) {
  const lines = effectivePricingLines(rawLines, initial)
  const totals = computePricingTotals(lines)
  const changes = pricingDiff(initial, lines)
  const oldTotal = r2(inv?.total_amount)
  const byName = user?.person?.name_ar || user?.person?.name_en || null
  // زيادة الخصم في هذا التعديل — تُحفظ باسم discount كي يظل «سجل الخصم» في كرت
  // التسعير وحساب «قبل الخصم» يعملان كما كانا قبل توحيد المحرّرات. تُكتب فقط حين
  // يكون سبب التعديل خصماً تجارياً — فتصحيح خصم أبشر مثلاً ليس «خصماً» بهذا المعنى.
  const discBefore = computePricingTotals(initial).discount
  const discDelta = reasonKind === 'discount' ? r2(totals.discount - discBefore) : 0
  const logEntry = {
    by: user?.id || null, by_name: byName,
    total: { from: oldTotal, to: totals.total },
    changes, reason: String(reason || '').trim() || null, reason_kind: reasonKind || null,
    ...(discDelta > 0.005 ? { discount: discDelta } : {}),
  }

  if (surplus?.mode === 'refund' && surplus.amount > 0.005) {
    await refundSurplus({
      sb, inv, amount: surplus.amount, method: surplus.method || 'cash', user,
      note: `${T('استرداد فائض بعد تعديل التسعير', 'Surplus refund after pricing edit')}${reason ? ` — ${reason}` : ''}`,
    })
  }

  if (shape === 'transfer' || shape === 'renewal') {
    const feeVals = {}
    lines.filter(l => l.src === 'quote_fee').forEach(l => { feeVals[l.field] = r2(l.amount) })
    lines.filter(l => l.src === 'quote_discount').forEach(l => { feeVals[l.field] = r2(l.amount) })
    const extras = lines.filter(l => l.src === 'quote_extra')
      .map(l => ({ name: String(l.label || '').trim(), amount: r2(l.amount) }))
    const oldExtras = (Array.isArray(tc?.extras) ? tc.extras : []).map(e => ({ name: e?.name || '', amount: r2(e?.amount) }))
    const extrasChanged = JSON.stringify(oldExtras) !== JSON.stringify(extras)
    let newQuoteTotal = totals.quoteTotal

    if (shape === 'transfer') {
      // الحسبة تُكتب عبر update-quotation (الكاتب المُعتمد) — والخادم يعيد حساب الإجمالي.
      if (extrasChanged) await invokeQuoteFn(sb, { action: 'update_extras', id: tc.id, extras })
      const adj = await invokeQuoteFn(sb, { action: 'adjust_fees', id: tc.id, fees: feeVals })
      newQuoteTotal = r2(adj?.row?.total_amount)
    } else {
      // التجديد: لا edge function — تُكتب الحسبة مباشرةً مع قيد تدقيق لكل حقل تغيّر.
      const now = new Date().toISOString()
      const patch = {}, auditRows = []
      const setPatch = (k, v) => {
        const oldV = (tc[k] === undefined ? null : tc[k])
        if (JSON.stringify(oldV) !== JSON.stringify(v)) {
          patch[k] = v
          auditRows.push({ quotation_id: tc.id, field_name: k, old_value: oldV, new_value: v, source: 'employee', changed_by: user?.id || null, changed_at: now })
        }
      }
      Object.entries(feeVals).forEach(([k, v]) => setPatch(k, v))
      if (extrasChanged) setPatch('extras', extras)
      patch.subtotal = totals.subtotal
      patch.total_amount = totals.quoteTotal
      Object.assign(patch, computeRenewalDerived({ ...tc, ...patch }, getIqamaRenewalPricingConfig(tc.branch_id || null)))
      patch.updated_at = now; patch.updated_by = user?.id || null
      const { error } = await sb.from('iqama_renewal_calculation').update(patch).eq('id', tc.id).is('deleted_at', null)
      if (error) throw error
      if (auditRows.length) await sb.from('iqama_renewal_calculation_audit').insert(auditRows)
      newQuoteTotal = r2(patch.total_amount)
    }
    // الإجمالي النهائي = إجمالي الحسبة (كما أعادته الكتابة) − خصومات الفاتورة.
    const finalTotal = Math.max(0, r2(newQuoteTotal - totals.invoiceDiscount))
    logEntry.total.to = finalTotal
    await syncInvoicePricing(sb, inv.id, finalTotal, { logEntry })
    return { total: finalTotal }
  }

  await syncInvoicePricing(sb, inv.id, totals.total, { newLines: linesToBreakdown(lines), logEntry })
  return { total: totals.total }
}
