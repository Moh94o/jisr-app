// ═══════════════════════════════════════════════════════════════════════════
// محرّر تسعير الفاتورة — نافذة واحدة لكل أنواع الفواتير
// ═══════════════════════════════════════════════════════════════════════════
// حلّت محلّ أربع نوافذ منفصلة (تسعير عام · نقل الكفالة · تجديد الإقامة · خصم):
// الشكل واحد والسجلّ واحد ومسار الكتابة واحد (savePricingEdit → syncInvoicePricing)،
// وما يختلف بين الأنواع محصور في نموذج التسعير (lib/invoicePricingModel.js).
//
// الخطوات:
//   ١) البنود    — كل بنود الرسوم قابلة للتعديل، وإضافة بند مستجدّ، وحذف بند مُدخَل خطأً.
//                  بنود الحسبة تظهر كلها ولو كانت صفراً (كان إخفاؤها يمنع استدراك بند نُسي).
//   ٢) الخصومات  — كل ما يخفّض الإجمالي كبنود صريحة (أبشر/المكتب/المدير أو خصم حرّ).
//   ٣) السبب     — تصنيف إلزامي + تفصيل، يُحفظان في سجلّ التسعير.
//   ٤) الأثر     — قبل الحفظ: الإجمالي والمدفوع والمتبقي والحالة وتوزيع الدفعات.
//   ٥) الفائض    — تظهر فقط إن هبط الإجمالي دون المدفوع: استرداد الآن أو رصيد للعميل.

import React, { useMemo, useState } from 'react'
import { Wallet, Percent, Plus, Trash2, CheckCircle2, FileText, AlertTriangle, RotateCcw } from 'lucide-react'
import {
  Modal, ModalSection, ScrollBox, SuccessView, TextField, CurrencyField, TextArea,
  Select as FKSelect, Segmented, GRID,
} from './ui/FormKit.jsx'
import { fieldEditable, can as canPerm } from '../lib/permissions.js'
import { redistributeInstallments } from '../lib/invoicePricingSync.js'
import {
  pricingShape, buildPricingLines, newPricingLine, computePricingTotals,
  validatePricingLines, pricingLineError, effectivePricingLines, PRICING_REASONS, r2,
} from '../lib/invoicePricingModel.js'
import { savePricingEdit } from '../lib/invoicePricingSave.js'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#B07D00'
const GREEN = '#27a046'
const RED = '#e87265'
const num = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })

// سطر «من → إلى» في لوحة الأثر.
const DeltaRow = ({ label, from, to, color, money = true, T }) => {
  const changed = money ? r2(from) !== r2(to) : String(from) !== String(to)
  const fmt = v => money ? num(v) : v
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 24 }}>
      <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
        {changed && <span style={{ fontSize: 11.5, color: 'var(--tx5)', textDecoration: 'line-through' }}>{fmt(from)}</span>}
        <span style={{ fontSize: 13, color: changed ? (color || 'var(--tx)') : 'var(--tx3)', fontWeight: 600 }}>{fmt(to)}</span>
      </span>
    </div>
  )
}

export default function InvoicePricingEditor({
  sb, T, isAr, inv, tc = null, svcCode = null, paid = 0, insts = [], user,
  mode = 'edit', onClose, onSaved,
}) {
  const shape = pricingShape(svcCode, tc)
  // صلاحيتان متمايزتان: pricing_total يسمح بتغيير المبالغ، وpricing_breakdown يسمح
  // بإعادة تركيب البنود (تسمية/إضافة/حذف). فقدانهما معاً يجعل النافذة للعرض فقط.
  const canEditAmounts = fieldEditable(user, 'invoices', 'pricing_total') || fieldEditable(user, 'invoices', 'pricing_breakdown')
  const canEditStructure = fieldEditable(user, 'invoices', 'pricing_breakdown')
  const readOnly = !canEditAmounts
  const canRefund = canPerm(user, 'invoices.refund')

  const initial = useMemo(() => buildPricingLines({ inv, tc, shape, T, isAr }), [])
  const [lines, setLines] = useState(() => (
    mode === 'discount' && shape === 'plain'
      ? [...initial, newPricingLine('discount', shape, T('خصم', 'Discount'))]
      : initial
  ))
  const [page, setPage] = useState(mode === 'discount' ? 1 : 0)
  const [reasonKind, setReasonKind] = useState(mode === 'discount' ? 'discount' : '')
  const [reason, setReason] = useState('')
  const [surplusMode, setSurplusMode] = useState('credit')   // credit | refund
  const [refundMethod, setRefundMethod] = useState('cash')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  const totals = computePricingTotals(lines)
  const totalsBefore = computePricingTotals(initial)
  const oldTotal = r2(inv?.total_amount)
  const paidV = r2(paid)
  const surplus = Math.max(0, r2(paidV - totals.total))
  const feeLines = lines.filter(l => l.kind === 'fee')
  const discLines = lines.filter(l => l.kind === 'discount')

  const setLine = (key, patch) => { setErr(''); setLines(p => p.map(l => l.key === key ? { ...l, ...patch } : l)) }
  const addLine = kind => { setErr(''); setLines(p => [...p, newPricingLine(kind, shape, kind === 'discount' ? T('خصم', 'Discount') : '')]) }
  const removeLine = key => { setErr(''); setLines(p => p.filter(l => l.key !== key)) }
  const resetLines = () => { setErr(''); setLines(initial) }

  const lineErr = validatePricingLines(lines)
  // «تغيّر شيء؟» على البنود الفعّالة — فبندٌ أُضيف وتُرك صفراً لا يُعدّ تغييراً.
  const sig = ls => JSON.stringify(ls.map(l => [l.key, String(l.label || '').trim(), r2(l.amount)]))
  const dirty = sig(initial) !== sig(effectivePricingLines(lines, initial))
  const surplusOk = surplus <= 0.005 || surplusMode === 'credit' || (surplusMode === 'refund' && canRefund)

  // معاينة توزيع الدفعات على الإجمالي الجديد — نفس دالة الكتابة، فما تراه هو ما يُحفظ.
  // عند استرداد الفائض تنخفض أرضية المسدّد أولاً، فنعاين على الأرضية بعد الاسترداد.
  const instPreview = useMemo(() => {
    const rows = (Array.isArray(insts) ? insts : []).map(r => ({
      id: r.id, installment_order: r.installment_order,
      total_amount: r.total_amount, paid_amount: r.paid_amount,
      label: r.payment_milestone ? (isAr ? r.payment_milestone.value_ar : (r.payment_milestone.value_en || r.payment_milestone.value_ar)) : null,
    }))
    if (!rows.length) return []
    let scoped = rows
    if (surplus > 0.005 && surplusMode === 'refund') {
      let left = surplus
      scoped = rows.slice().sort((a, b) => (b.installment_order || 0) - (a.installment_order || 0)).map(r => {
        const p = r2(r.paid_amount)
        if (left <= 0.005 || p <= 0.005) return r
        const take = Math.min(left, p); left = r2(left - take)
        return { ...r, paid_amount: r2(p - take) }
      })
    }
    const byId = Object.fromEntries(scoped.map(r => [r.id, r]))
    return redistributeInstallments(scoped, totals.total).map(x => ({ ...x, label: byId[x.id]?.label || null }))
  }, [insts, totals.total, surplus, surplusMode, isAr])

  const statusOf = (t, p) => (t > 0 && p >= t - 0.005) ? T('مسدّدة بالكامل', 'Fully paid') : T('نشطة', 'Active')

  // سبب التعديل — إلزامي. رسالته تُعرض في التذييل وفي تنبيه قابل للنقر على صفحة الأثر،
  // لأن المدير العام يتجاوز تحقّق «التالي» فيصل للخطوة الأخيرة والسبب ناقص.
  const reasonOk = !!reasonKind && String(reason).trim().length >= 3
  const reasonMsg = !reasonKind ? T('اختر تصنيف التعديل في خطوة «سبب التعديل»', 'Pick a category in the “Reason” step')
    : String(reason).trim().length < 3 ? T('اكتب تفصيل سبب التعديل (3 أحرف فأكثر)', 'Write the reason details (3+ characters)') : ''

  const save = async () => {
    if (saving || !inv?.id) return
    if (lineErr) { setErr(pricingLineError(lineErr, T)); return }
    if (!dirty) { setErr(T('لم تُغيّر أي بند بعد', 'Nothing has changed yet')); return }
    if (!reasonKind || String(reason).trim().length < 3) { setErr(T('اختر سبب التعديل واكتب تفصيله', 'Pick a reason and describe it')); return }
    if (!surplusOk) { setErr(T('لا تملك صلاحية الاسترداد — اختر إبقاء الفائض رصيداً', 'You lack refund permission — keep the surplus as credit')); return }
    setErr(''); setSaving(true)
    try {
      await savePricingEdit({
        sb, inv, tc, shape, lines, initial, reasonKind, reason: String(reason).trim(), user, T, isAr,
        surplus: surplus > 0.005 ? { mode: surplusMode, amount: surplus, method: refundMethod } : null,
      })
      onSaved?.(); setDone(true)
    } catch (e) {
      const m = String(e?.message || '')
      setErr(m === 'quote_expired' ? T('انتهت صلاحية الحسبة', 'Quote expired')
        : m === 'no_payment_method' ? T('تعذّر تحديد طريقة الاسترداد', 'Cannot resolve the refund method')
          : T('تعذّر الحفظ', 'Save failed'))
    } finally { setSaving(false) }
  }

  /* ─────────────────────────── صفّ بند ─────────────────────────── */
  const lineRow = l => (
    <div key={l.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <TextField value={l.label} onChange={v => setLine(l.key, { label: v })}
          placeholder={T('اسم البند', 'Item label')} disabled={!canEditStructure || l.labelLocked} />
        {l.hint && <div style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600, marginTop: 3, paddingInlineStart: 2 }}>{l.hint}</div>}
      </div>
      <div style={{ width: 132, flexShrink: 0 }}>
        <CurrencyField value={l.amount} onChange={v => setLine(l.key, { amount: v })} unit={T('ريال', 'SAR')} disabled={!canEditAmounts} />
      </div>
      {(l.removable && canEditStructure) ? (
        <button type="button" onClick={() => removeLine(l.key)} title={T('حذف البند', 'Remove item')}
          style={{ flexShrink: 0, width: 38, height: 42, borderRadius: 9, border: '1px solid rgba(232,114,101,.3)', background: 'rgba(232,114,101,.08)', color: RED, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={14} />
        </button>
      ) : <div style={{ flexShrink: 0, width: 38, height: 42 }} />}
    </div>
  )

  const addBtn = (label, onClick, color) => (
    <button type="button" onClick={onClick}
      style={{ height: 36, padding: '0 14px', borderRadius: 9, border: `1px dashed ${color}66`, background: `${color}0f`, color, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <Plus size={14} /> <span>{label}</span>
    </button>
  )

  const totalStrip = (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, padding: '11px 14px', background: 'var(--inputBg)', borderRadius: 11, border: '1px solid var(--bd)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{T('الإجمالي الابتدائي', 'Subtotal')}</span>
        <span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(totals.subtotal)}</span>
      </div>
      {totals.discount > 0.005 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>{T('مجموع الخصومات', 'Total discounts')}</span>
          <span style={{ fontSize: 12.5, color: GREEN, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>−{num(totals.discount)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3, paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
        <span style={{ fontSize: 14, color: GOLD, fontWeight: 600 }}>{T('الإجمالي النهائي', 'Final Total')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
          {r2(oldTotal) !== r2(totals.total) && <span style={{ fontSize: 12, color: 'var(--tx5)', textDecoration: 'line-through' }}>{num(oldTotal)}</span>}
          <span style={{ fontSize: 18, color: GOLD, fontWeight: 600 }}>{num(totals.total)}</span>
        </span>
      </div>
    </div>
  )

  /* ─────────────────────────── الصفحات ─────────────────────────── */
  const pageLines = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: F }}>
      <ModalSection Icon={Wallet} label={T('بنود الرسوم', 'Fee items')} flex style={{ marginTop: 6 }}>
        <ScrollBox fill style={{ paddingInlineEnd: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feeLines.map(lineRow)}
          </div>
        </ScrollBox>
        {canEditAmounts && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexShrink: 0 }}>
            {dirty
              ? <button type="button" onClick={resetLines}
                  style={{ height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx4)', fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={13} /> <span>{T('استرجاع الأصل', 'Reset')}</span>
                </button>
              : <span />}
            {canEditStructure ? addBtn(T('إضافة بند', 'Add item'), () => addLine('fee'), GOLD) : <span />}
          </div>
        )}
      </ModalSection>
      {totalStrip}
    </div>
  )

  const pageDiscounts = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, fontFamily: F }}>
      <ModalSection Icon={Percent} label={T('الخصومات', 'Discounts')} flex style={{ marginTop: 6 }}>
        <ScrollBox fill style={{ paddingInlineEnd: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {discLines.length ? discLines.map(lineRow) : (
              <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: 'var(--tx5)', fontWeight: 600 }}>
                {T('لا خصومات على هذه الفاتورة', 'No discounts on this invoice')}
              </div>
            )}
          </div>
        </ScrollBox>
        {canEditStructure && shape === 'plain' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, flexShrink: 0 }}>
            {addBtn(T('إضافة خصم', 'Add discount'), () => addLine('discount'), GREEN)}
          </div>
        )}
      </ModalSection>
      {totalStrip}
    </div>
  )

  const pageReason = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      <ModalSection Icon={FileText} label={T('سبب التعديل', 'Reason')} style={{ marginTop: 6 }}>
        <div style={GRID}>
          <FKSelect full req label={T('التصنيف', 'Category')} value={reasonKind}
            onChange={v => { setErr(''); setReasonKind(v) }}
            options={PRICING_REASONS.map(r => ({ v: r.code, l: T(r.ar, r.en) }))}
            getKey={o => o.v} getLabel={o => o.l} searchable={false}
            placeholder={T('اختر سبب التعديل', 'Pick a reason')} />
          <TextArea full req rows={2} label={T('التفصيل', 'Details')} value={reason}
            onChange={v => { setErr(''); setReason(v) }}
            placeholder={T('مثال: أُدخل رسم التأمين مرتين', 'e.g. medical fee was entered twice')} />
        </div>
      </ModalSection>
      {totalStrip}
    </div>
  )

  const pageImpact = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      {!reasonOk && (
        <div onClick={() => setPage(2)} title={T('اذهب لخطوة السبب', 'Go to the reason step')}
          style={{ marginTop: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px', borderRadius: 10, background: 'var(--accent-soft)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 600, lineHeight: 1.7 }}>
          <AlertTriangle size={15} strokeWidth={2.2} style={{ flexShrink: 0 }} />
          <span>{reasonMsg} — {T('اضغط هنا للرجوع', 'tap to go back')}</span>
        </div>
      )}
      <ModalSection Icon={Wallet} label={T('أثر التعديل', 'Impact')} style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <DeltaRow T={T} label={T('الإجمالي', 'Total')} from={oldTotal} to={totals.total} color={GOLD} />
          <DeltaRow T={T} label={T('مجموع الخصومات', 'Discounts')} from={totalsBefore.discount} to={totals.discount} color={GREEN} />
          <DeltaRow T={T} label={T('المدفوع', 'Paid')} from={paidV} to={r2(paidV - (surplus > 0.005 && surplusMode === 'refund' ? surplus : 0))} color={GREEN} />
          <DeltaRow T={T} label={T('المتبقي', 'Remaining')}
            from={r2(oldTotal - paidV)}
            to={r2(totals.total - (paidV - (surplus > 0.005 && surplusMode === 'refund' ? surplus : 0)))}
            color={RED} />
          <DeltaRow T={T} money={false} label={T('الحالة', 'Status')}
            from={statusOf(oldTotal, paidV)}
            to={statusOf(totals.total, surplus > 0.005 && surplusMode === 'refund' ? totals.total : paidV)} color={GOLD} />
        </div>

        {instPreview.some(r => r2(r.from) !== r2(r.to)) && (
          <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>{T('توزيع الدفعات بعد التعديل', 'Installments after the edit')}</div>
            <ScrollBox maxHeight={96}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {instPreview.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600 }}>
                      {T('دفعة', 'Installment')} {r.order}{r.label ? ` · ${r.label}` : ''}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                      {r2(r.from) !== r2(r.to) && <span style={{ fontSize: 11, color: 'var(--tx5)', textDecoration: 'line-through' }}>{num(r.from)}</span>}
                      <span style={{ fontSize: 12, color: r2(r.from) !== r2(r.to) ? GOLD : 'var(--tx3)', fontWeight: 600 }}>{num(r.to)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </ScrollBox>
          </div>
        )}
      </ModalSection>
    </div>
  )

  // خطوة الفائض — تظهر فقط حين يهبط الإجمالي الجديد دون المدفوع.
  const pageSurplus = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
        <ModalSection Icon={AlertTriangle} label={T('فائض مدفوع', 'Overpayment')} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 9, lineHeight: 1.7 }}>
            {T('الإجمالي الجديد أقل من المدفوع بـ', 'The new total is below the paid amount by')}{' '}
            <span style={{ color: RED, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(surplus)}</span>{' '}
            {T('ريال — اختر مصير الفائض.', 'SAR — choose what happens to it.')}
          </div>
          <div style={GRID}>
            <Segmented full label={T('مصير الفائض', 'Surplus handling')} value={surplusMode} onChange={v => { setErr(''); setSurplusMode(v) }}
              options={[
                { v: 'credit', l: T('رصيد للعميل', 'Keep as credit') },
                { v: 'refund', l: T('استرداد الآن', 'Refund now'), c: GREEN },
              ]} />
            {surplusMode === 'refund' && (
              <Segmented full label={T('طريقة الاسترداد', 'Refund method')} value={refundMethod} onChange={setRefundMethod}
                options={[{ v: 'cash', l: T('نقداً', 'Cash') }, { v: 'bank', l: T('تحويل بنكي', 'Bank transfer') }]} />
            )}
          </div>
          {surplusMode === 'refund' && !canRefund && (
            <div style={{ marginTop: 8, fontSize: 11, color: RED, fontWeight: 600 }}>
              {T('لا تملك صلاحية الاسترداد — اختر «رصيد للعميل».', 'You lack refund permission — pick “Keep as credit”.')}
            </div>
          )}
        </ModalSection>
    </div>
  )

  // لا حفظ بلا تغيير فعليّ — يمنع قيداً فارغاً في سجلّ التسعير.
  const saveOk = !readOnly && !lineErr && dirty && reasonOk && surplusOk
  // رسالة «لماذا الزر مقفل» — لازمة لأن المدير العام يتجاوز تحقّق «التالي» (gmFree في FormKit)
  // فيصل للخطوة الأخيرة بخطوةٍ ناقصة، ويبقى «حفظ التسعير» مقفلاً بلا سبب ظاهر.
  const blockMsg = err
    || (lineErr ? pricingLineError(lineErr, T) : '')
    || (!dirty ? T('لم تُغيّر أي بند بعد', 'Nothing has changed yet') : '')
    || (readOnly ? T('لا تملك صلاحية تعديل التسعير', 'You cannot edit pricing') : '')
    || reasonMsg
    || (!surplusOk ? T('لا تملك صلاحية الاسترداد — اختر إبقاء الفائض رصيداً', 'You lack refund permission — keep the surplus as credit') : '')
  // في خطوة السبب نفسها لا نكرّر رسالتها (الحقل أمام المستخدم وزر «التالي» مقفل).
  const stepMsg = err || (lineErr ? pricingLineError(lineErr, T) : '') || (!dirty ? T('لم تُغيّر أي بند بعد', 'Nothing has changed yet') : '')
  const pages = [
    { title: T('البنود', 'Items'), content: pageLines, valid: !lineErr, error: err || (lineErr ? pricingLineError(lineErr, T) : '') || undefined },
    { title: T('الخصومات', 'Discounts'), content: pageDiscounts, valid: !lineErr, error: err || (lineErr ? pricingLineError(lineErr, T) : '') || undefined },
    { title: T('سبب التعديل', 'Reason'), content: pageReason, valid: reasonOk, error: stepMsg || undefined },
    { title: T('أثر التعديل', 'Impact'), content: pageImpact, valid: surplus > 0.005 ? true : saveOk, error: blockMsg || undefined },
    ...(surplus > 0.005 ? [{ title: T('فائض مدفوع', 'Overpayment'), content: pageSurplus, valid: saveOk, error: blockMsg || undefined }] : []),
  ]

  return (
    <Modal open onClose={onClose} title={T('تعديل التسعير', 'Edit pricing')} Icon={Wallet}
      width={600} height="min(660px, 92vh)" accent={GOLD}
      success={done ? <SuccessView title={T('تم حفظ التعديلات', 'Changes saved')} /> : undefined}
      page={Math.min(page, pages.length - 1)}
      onNext={() => setPage(p => Math.min(pages.length - 1, p + 1))} onBack={() => setPage(p => Math.max(0, p - 1))}
      pages={pages} onSubmit={save} submitting={saving} submitIcon={CheckCircle2}
      submitLabel={T('حفظ التسعير', 'Save pricing')} />
  )
}
