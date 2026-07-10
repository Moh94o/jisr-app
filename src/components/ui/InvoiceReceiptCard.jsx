// كرت «الفواتير والخدمات» الموحّد — شكل إيصال ورقي بحافة سفلية مسنّنة (التصميم
// المعتمد لصفحتي تفاصيل المنشأة وتفاصيل العامل). يقرأ صف v_facility_invoices /
// v_worker_invoices كما هو: الخدمة + المكتب + العامل + المبالغ + رقم الفاتورة.
import React from 'react'
import { C } from './FormKit'

const F = 'Cairo, Tajawal, sans-serif'
const num = (v) => Math.round(Number(v) || 0).toLocaleString('en-US')
// مسار الحافة المسنّنة: 20 سنّاً على عرض 100 وحدة (preserveAspectRatio=none يمدّه).
const ZIGZAG = 'M0 0 L0 3 ' + Array.from({ length: 20 }, (_, i) => `L${i * 5 + 2.5} 7 L${(i + 1) * 5} 3`).join(' ') + ' L100 0 Z'

const Row = ({ label, value, color, mono, icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontSize: 11 }}>
    <span style={{ color: 'var(--tx4)', flexShrink: 0 }}>{label}</span>
    <span style={{ fontWeight: 600, color: color || 'var(--tx1)', fontFamily: mono ? 'ui-monospace, monospace' : undefined, direction: mono ? 'ltr' : undefined, display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
      {value}
      {icon && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>}
    </span>
  </div>
)

export default function InvoiceReceiptCard({ r, workerName, onOpen, T }) {
  const cancelled = r.invoice_status === 'cancelled'
  const rem = Number(r.remaining_amount) || 0
  const paidUp = !!r.invoice_id && rem <= 0 && !cancelled
  const date = String(r.invoice_created_at || r.sr_created_at || '').slice(0, 10)
  const name = workerName || r.worker_name || null
  const clickable = !!r.invoice_id && !!onOpen
  const bottom = cancelled
    ? { l: T('الحالة', 'Status'), v: T('ملغاة', 'Cancelled'), c: C.red }
    : paidUp
      ? { l: T('الحالة', 'Status'), v: T('مدفوعة', 'Paid'), c: C.ok }
      : r.invoice_id
        ? { l: T('المتبقي', 'Due'), v: num(rem), c: C.red, mono: true }
        : null
  return (
    <div onClick={clickable ? () => onOpen(r.invoice_id) : undefined}
      title={clickable ? T('عرض تفاصيل الفاتورة', 'View invoice') : ''}
      style={{ position: 'relative', cursor: clickable ? 'pointer' : 'default', opacity: cancelled ? .75 : 1, fontFamily: F }}
      onMouseEnter={e => { if (clickable) e.currentTarget.firstElementChild.style.borderColor = 'rgba(176,125,0,.5)' }}
      onMouseLeave={e => { e.currentTarget.firstElementChild.style.borderColor = 'var(--bd)' }}>
      <div style={{ position: 'relative', background: 'var(--inputBg)', border: '1px solid var(--bd)', borderBottom: 'none', borderRadius: '10px 10px 0 0', overflow: 'hidden', transition: 'border-color .15s' }}>
        {cancelled && (
          <div aria-hidden="true" style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', transform: 'translate(-50%, -50%) rotate(-16deg)', fontSize: 26, fontWeight: 600, letterSpacing: 2, color: 'rgba(192,57,43,.14)', border: '3px solid rgba(192,57,43,.18)', borderRadius: 10, padding: '2px 22px', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1 }}>{T('ملغاة', 'Cancelled')}</div>
        )}
        {/* رأس الإيصال: الخدمة ثم المكتب والتاريخ */}
        <div style={{ textAlign: 'center', padding: '9px 12px 7px', borderBottom: '1px dashed rgba(176,125,0,.4)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service_ar || T('خدمة', 'Service')}</div>
          {(r.branch_code || date) && (
            <div style={{ fontSize: 9.5, color: 'var(--tx4)', fontFamily: 'ui-monospace, monospace', direction: 'ltr', marginTop: 2 }}>
              {[r.branch_code, date].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        {/* أسطر الإيصال */}
        <div style={{ padding: '8px 14px 4px' }}>
          {name && <Row label={T('العامل', 'Worker')} value={name} />}
          {r.invoice_no
            ? <Row label={T('رقم الفاتورة', 'Invoice no')} value={r.invoice_no} color={cancelled ? C.red : C.gold} mono icon={clickable} />
            : <Row label={T('المرجع', 'Ref')} value={r.request_ref_no || '—'} color={'var(--tx3)'} mono />}
          {r.invoice_id && <Row label={T('الإجمالي', 'Total')} value={num(r.total_amount)} color={C.gold} mono />}
          {r.invoice_id && <Row label={T('المدفوع', 'Paid')} value={num(r.paid_amount)} color={C.ok} mono />}
        </div>
        {/* سطر المتبقي/الحالة المؤكّد */}
        {bottom ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '4px 14px 0', padding: '6px 0 8px', borderTop: '1px dashed rgba(176,125,0,.4)', fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{bottom.l}</span>
            <span style={{ fontWeight: 600, color: bottom.c, fontFamily: bottom.mono ? 'ui-monospace, monospace' : undefined, direction: bottom.mono ? 'ltr' : undefined }}>{bottom.v}</span>
          </div>
        ) : (
          <div style={{ margin: '4px 14px 0', padding: '6px 0 8px', borderTop: '1px dashed rgba(176,125,0,.4)', fontSize: 11, color: 'var(--tx5)', textAlign: 'center' }}>{T('بدون فاتورة', 'No invoice')}</div>
        )}
      </div>
      <svg width="100%" height="7" preserveAspectRatio="none" viewBox="0 0 100 7" style={{ display: 'block' }} aria-hidden="true">
        <path d={ZIGZAG} fill="var(--inputBg)" stroke="var(--bd)" strokeWidth="0.5" />
      </svg>
    </div>
  )
}
