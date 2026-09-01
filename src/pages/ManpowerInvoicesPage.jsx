import React, { useState, useEffect, useCallback } from 'react'
import {
  FileText, Plus, Trash2, Pencil, BadgeCheck, ArrowRight, ArrowLeft, Printer, Coins, Receipt, Building2, CalendarDays,
} from 'lucide-react'
import {
  C, F, EmptyState, Modal as FKModal, ModalSection, TextArea, TextField, CurrencyField, NumberField,
  Segmented, Select as FKSelect, DateField as FKDateField, GRID, SuccessView, ConfirmDialog,
} from '../components/ui/FormKit.jsx'
import { canTab, cardVisible, cardActionAllowed, isGM, tabOffices } from '../lib/permissions.js'
import PageSkeleton from '../components/ui/Skeleton.jsx'
import BackButton from '../components/BackButton.jsx'
import { MpStats, MpBadge, MpSearch, mpMatch, mpRowHover } from '../lib/manpowerUi.jsx'
import { printManpowerInvoice } from '../lib/manpowerDocsPrint.js'
import { lineOtRate } from './ManpowerTimesheetsPage.jsx'

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nm0 = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const iso = d => { const x = new Date(d); return isNaN(x) ? '' : x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') }
const fmtD = d => d ? iso(d) || '—' : '—'

export const INV_STATUS = {
  draft: { ar: 'مسودّة', en: 'Draft', c: 'var(--tx3)' },
  issued: { ar: 'صادرة', en: 'Issued', c: '#d99f2b' },
  partial: { ar: 'مسدَّدة جزئياً', en: 'Partially paid', c: C.blue },
  paid: { ar: 'مسدَّدة', en: 'Paid', c: '#27a046' },
  cancelled: { ar: 'ملغاة', en: 'Cancelled', c: '#e5534b' },
}

/* طرق السداد — نفس مفردات سندات القبض في النظام */
const PAY_METHODS = [
  { v: 'transfer', ar: 'تحويل بنكي', en: 'Bank transfer' },
  { v: 'cash', ar: 'نقداً', en: 'Cash' },
  { v: 'cheque', ar: 'شيك', en: 'Cheque' },
  { v: 'pos', ar: 'شبكة (مدى)', en: 'POS (mada)' },
]
const payMethodLabel = (v, lang) => { const m = PAY_METHODS.find(x => x.v === v); return m ? (lang === 'en' ? m.en : m.ar) : v || '—' }

/* حسبة الفاتورة — نفس منطق المستخلص: عادي + إضافي − خصم + تسوية ثم الضريبة */
export const invoiceTotals = (lines, deduction, vatPct, adjustment = 0) => {
  const subtotal = (lines || []).reduce((t, l) => t + n(l.normal_units) * n(l.unit_price), 0)
  const otAmount = (lines || []).reduce((t, l) => t + n(l.ot_units) * lineOtRate(l, l.ot_multiplier), 0)
  const net = Math.max(0, subtotal + otAmount - n(deduction) + n(adjustment))
  const vat = net * (n(vatPct) / 100)
  return { subtotal, otAmount, net, vat, total: net + vat }
}

export default function ManpowerInvoicesPage({ sb, toast, user, lang = 'ar', emptyIcon }) {
  const T = (ar, en) => lang === 'en' ? en : ar
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  const [rows, setRows] = useState(null)
  const [payments, setPayments] = useState({})
  const [contracts, setContracts] = useState([])
  const [branches, setBranches] = useState([])
  const [banks, setBanks] = useState([])
  const [usersById, setUsersById] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [detailsRow, setDetailsRow] = useState(null)
  const [delRow, setDelRow] = useState(null)
  const [payRow, setPayRow] = useState(null)
  const [cancelRow, setCancelRow] = useState(null)
  const [q, setQ] = useState('')

  const canView = canTab(user, 'manpower_invoices')
  const canCreate = isGM(user) || canTab(user, 'manpower_invoices', 'create')
  const canEdit = isGM(user) || canTab(user, 'manpower_invoices', 'edit')
  const canDelete = isGM(user) || canTab(user, 'manpower_invoices', 'delete')
  const canIssue = isGM(user) || canTab(user, 'manpower_invoices', 'issue')
  const canPay = isGM(user) || canTab(user, 'manpower_invoices', 'pay')
  const canCancel = isGM(user) || canTab(user, 'manpower_invoices', 'cancel')
  const canPrint = isGM(user) || canTab(user, 'manpower_invoices', 'print')
  // نطاق المكاتب — غير المدير العام يرى فواتير مكاتبه وحدها
  const officeScope = tabOffices(user, 'manpower_invoices')

  const load = useCallback(async () => {
    let invQ = sb.from('manpower_invoices').select('*').order('created_at', { ascending: false }).limit(500)
    let ctQ = sb.from('manpower_contracts').select('id,contract_no,client_name,client_name_en,branch_id,payment_due_days').limit(500)
    if (officeScope) { invQ = invQ.in('branch_id', officeScope); ctQ = ctQ.in('branch_id', officeScope) }
    const [inv, pay, ct, b, u, ba] = await Promise.all([
      invQ,
      sb.from('manpower_invoice_payments').select('*').order('paid_on', { ascending: false }).limit(2000),
      ctQ,
      sb.from('branches').select('id,name_ar,branch_code').is('deleted_at', null).eq('is_active', true).order('name_ar'),
      sb.from('users').select('id,person:persons(name_ar,name_en)'),
      sb.from('bank_accounts').select('branch_id,bank_name,bank_name_en,account_name,account_name_en,account_number,iban,is_primary').is('deleted_at', null).eq('is_active', true),
    ])
    setRows(inv.data || [])
    const byInv = {}; (pay.data || []).forEach(p => { (byInv[p.invoice_id] ||= []).push(p) }); setPayments(byInv)
    setContracts(ct.data || [])
    setBranches((b.data || []).filter(x => !officeScope || officeScope.includes(x.id)))
    setBanks(ba.data || [])
    const map = {}; (u.data || []).forEach(x => { map[x.id] = x.person?.name_ar || x.person?.name_en || '' }); setUsersById(map)
    setDetailsRow(prev => prev ? (inv.data || []).find(r => r.id === prev.id) || prev : prev)
  }, [sb])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('manpower-invoices-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_invoices' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_invoice_payments' }, () => load())
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb, load])

  const branchLabel = id => { const b = branches.find(x => x.id === id); return b ? (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') : '—' }
  /* حساب الفرع الرئيسي — يُطبع في جدول البنك على الفاتورة */
  const bankOf = branchId => {
    const list = banks.filter(x => x.branch_id === branchId)
    return list.find(x => x.is_primary) || list[0] || banks.find(x => x.is_primary) || banks[0] || null
  }
  const isOverdue = r => (r.status === 'issued' || r.status === 'partial') && r.due_date && r.due_date < iso(new Date())

  const setStatus = async (r, status) => {
    const patch = { status }
    if (status === 'issued') patch.issued_at = new Date().toISOString()
    const { error } = await sb.from('manpower_invoices').update(patch).eq('id', r.id)
    if (error) toast?.(T('تعذّر التحديث: ', 'Update failed: ') + error.message)
    else { toast?.(T('تم تحديث الحالة', 'Status updated')); load() }
  }

  if (!canView) return null

  const header = (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('فواتير توريد العمالة', 'Manpower Invoices')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>
            {T('الفاتورة الضريبية الرسمية — تُصدر من مستخلص معتمد أو يدوياً، وتُسدَّد على دفعات', 'The official tax invoice — issued from an approved claim or manually, settled in payments')}
          </div>
        </div>
        {canCreate && <div className="page-cta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setEditRow(null); setShowModal(true) }} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            {T('فاتورة يدوية', 'Manual invoice')}<Plus size={16} strokeWidth={2.2} />
          </button>
        </div>}
      </div>
    </div>
  )

  if (rows === null) return <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>{header}<PageSkeleton variant="table" cards={4} columns={8} rows={6} /></div>

  /* ═══════════════ التفاصيل ═══════════════ */
  if (detailsRow) {
    const r = detailsRow
    const st = INV_STATUS[r.status] || INV_STATUS.draft
    const pays = payments[r.id] || []
    const remaining = Math.max(0, n(r.total) - n(r.paid_amount))
    const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
    const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
    const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
    const cell = (label, value, opts = {}) => (
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: opts.color || 'var(--tx1)', fontWeight: 600, lineHeight: 1.5, wordBreak: 'break-word', fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</span>
      </div>
    )
    const tblTh = { padding: '9px 12px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textAlign: 'center', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
    const tblTd = { padding: '9px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--tx1)', textAlign: 'center', borderBottom: '1px solid var(--bd)', fontVariantNumeric: 'tabular-nums' }
    const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

    return (
      <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <BackButton onClick={() => setDetailsRow(null)} label={T('رجوع', 'Back')} isAr={dir === 'rtl'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)' }}>{r.client_name}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }}>{r.invoice_no} · {fmtD(r.invoice_date)}</div>
          </div>
          <MpBadge st={st} lang={lang} />
          {isOverdue(r) && <MpBadge st={{ ar: 'متأخرة عن الاستحقاق', en: 'Overdue', c: '#e5534b' }} lang={lang} />}
          {/* الإصدار يحوّل المسودّة وثيقةً رسمية — بعدها لا تعديل ولا حذف */}
          {canIssue && r.status === 'draft' && <button onClick={() => setStatus(r, 'issued')} className="btn-primary-modal"
            style={{ height: 36, padding: '0 14px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <BadgeCheck size={14} strokeWidth={2.2} />{T('إصدار الفاتورة', 'Issue invoice')}</button>}
          {canPay && (r.status === 'issued' || r.status === 'partial') && <button onClick={() => setPayRow(r)} className="btn-primary-modal"
            style={{ height: 36, padding: '0 14px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Coins size={14} strokeWidth={2.2} />{T('تسجيل دفعة', 'Record payment')}</button>}
          {canPrint && r.status !== 'draft' && r.status !== 'cancelled' && <>
            <button onClick={() => printManpowerInvoice(r, { bank: bankOf(r.branch_id), lang: 'ar' })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة — عربي', 'Print — Arabic')}</button>
            <button onClick={() => printManpowerInvoice(r, { bank: bankOf(r.branch_id), lang: 'en' })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة — إنجليزي', 'Print — English')}</button>
          </>}
          {canEdit && r.status === 'draft' && <button onClick={() => { setEditRow(r); setShowModal(true) }}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Pencil size={13} />{T('تعديل', 'Edit')}</button>}
          {canCancel && (r.status === 'issued' || r.status === 'partial') && <button onClick={() => setCancelRow(r)}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #e5534b55', background: 'transparent', color: '#e5534b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            {T('إلغاء الفاتورة', 'Cancel invoice')}</button>}
          {canDelete && r.status === 'draft' && <button onClick={() => setDelRow(r)}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Trash2 size={13} />{T('حذف', 'Delete')}</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {cardVisible(user, 'manpower_invoices', 'client') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('العميل والفاتورة', 'Client & Invoice')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {cell(T('العميل', 'Client'), r.client_name)}
              {cell(T('بالإنجليزي', 'English name'), r.client_name_en)}
              {cell(T('المكتب', 'Branch'), branchLabel(r.branch_id))}
              {cell(T('العقد', 'Contract'), contracts.find(c => c.id === r.contract_id)?.contract_no || '—')}
              {cell(T('الفترة', 'Period'), fmtD(r.period_from) + ' → ' + fmtD(r.period_to))}
              {cell(T('تاريخ الاستحقاق', 'Due date'), fmtD(r.due_date), { color: isOverdue(r) ? '#e5534b' : undefined })}
              {r.po_number && cell(T('أمر الشراء', 'P.O. No.'), r.po_number)}
              {r.client_vat_no && cell(T('الرقم الضريبي', 'VAT No.'), r.client_vat_no)}
              {(r.project_name || r.project_name_en) && cell(T('المشروع', 'Project'), lang === 'en' ? (r.project_name_en || r.project_name) : (r.project_name || r.project_name_en), { full: true })}
            </div>
            <div style={{ padding: '0 22px 16px', display: 'flex', gap: 14, fontSize: 11, color: 'var(--tx4)', flexWrap: 'wrap' }}>
              <span>{T('أنشأها', 'Created by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.created_by] || '—'}</b></span>
              {r.issued_at && <span>{T('صدرت في', 'Issued')}: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtD(r.issued_at)}</span></span>}
            </div>
          </div>}

          {cardVisible(user, 'manpower_invoices', 'financial') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27a046' }} /><span style={cardTitle}>{T('الملخص المالي', 'Financial Summary')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {cell(T('الوحدات العادية', 'Normal'), nm(r.subtotal), { color: '#27a046' })}
              {cell(T('الوقت الإضافي', 'Overtime'), nm(r.ot_amount), { color: '#d99f2b' })}
              {n(r.deduction) > 0 && cell(T('الخصم', 'Deduction'), nm(r.deduction) + (r.deduction_note ? ' (' + r.deduction_note + ')' : ''), { color: '#e5534b' })}
              {n(r.adjustment) !== 0 && cell(T('تسوية', 'Adjustment'), (n(r.adjustment) > 0 ? '+' : '') + nm(r.adjustment), { color: C.blue })}
              {cell(T('الضريبة', 'VAT ') + nm0(r.vat_pct) + '%', nm(r.vat_amount))}
              {cell(T('الإجمالي', 'Total'), nm(r.total), { color: C.gold })}
              {cell(T('المسدَّد', 'Paid'), nm(r.paid_amount), { color: '#27a046' })}
              {cell(T('المتبقي', 'Remaining'), nm(remaining), { color: remaining > 0 ? '#e5534b' : '#27a046' })}
            </div>
          </div>}

          {cardVisible(user, 'manpower_invoices', 'lines') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('بنود الفاتورة', 'Invoice Items')}</span></div>
            <div style={{ padding: '10px 22px 16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={tblTh}>{T('البند', 'Item')}</th><th style={tblTh}>{T('العمال', 'Workers')}</th>
                  <th style={tblTh}>{T('سعر الوحدة', 'Rate')}</th>
                  <th style={tblTh}>{T('وحدات عادية', 'Normal units')}</th>
                  <th style={tblTh}>{T('وحدات إضافية', 'OT units')}</th>
                  <th style={tblTh}>{T('المبلغ', 'Amount')}</th>
                </tr></thead>
                <tbody>
                  {(r.lines || []).map((l, i) => {
                    const otr = lineOtRate(l, l.ot_multiplier)
                    const amt = n(l.normal_units) * n(l.unit_price) + n(l.ot_units) * otr
                    return (
                      <tr key={i}>
                        <td style={{ ...tblTd, textAlign: 'start' }}>{l.item}{l.item_en ? <span style={{ color: 'var(--tx4)', fontSize: 11, direction: 'ltr' }}> · {l.item_en}</span> : null}</td>
                        <td style={tblTd}>{nm0(l.workers)}</td>
                        <td style={tblTd}>{nm(l.unit_price)}</td>
                        <td style={{ ...tblTd, color: '#27a046' }}>{nm(l.normal_units)}</td>
                        <td style={{ ...tblTd, color: '#d99f2b' }}>{nm(l.ot_units)} <span style={{ fontSize: 10, color: 'var(--tx4)' }}>@{nm(otr)}</span></td>
                        <td style={{ ...tblTd, color: C.gold, fontWeight: 600 }}>{nm(amt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>}

          {cardVisible(user, 'manpower_invoices', 'payments') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27a046' }} /><span style={cardTitle}>{T('الدفعات', 'Payments')}</span>
              {canPay && (r.status === 'issued' || r.status === 'partial') && <button onClick={() => setPayRow(r)}
                style={{ marginInlineStart: 'auto', height: 30, padding: '0 12px', borderRadius: 9, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={12} strokeWidth={2.4} />{T('دفعة جديدة', 'New payment')}</button>}
            </div>
            {!pays.length ? (
              <div style={{ padding: '16px 22px', fontSize: 12.5, color: 'var(--tx4)' }}>{T('لا دفعات مسجّلة بعد.', 'No payments recorded yet.')}</div>
            ) : (
              <div style={{ padding: '10px 22px 16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={tblTh}>{T('التاريخ', 'Date')}</th><th style={tblTh}>{T('المبلغ', 'Amount')}</th>
                    <th style={tblTh}>{T('الطريقة', 'Method')}</th><th style={tblTh}>{T('المرجع', 'Ref')}</th>
                    <th style={tblTh}>{T('سجّلها', 'By')}</th><th style={tblTh}></th>
                  </tr></thead>
                  <tbody>
                    {pays.map(p => (
                      <tr key={p.id}>
                        <td style={tblTd}>{fmtD(p.paid_on)}</td>
                        <td style={{ ...tblTd, color: '#27a046', fontWeight: 600 }}>{nm(p.amount)}</td>
                        <td style={tblTd}>{payMethodLabel(p.method, lang)}</td>
                        <td style={{ ...tblTd, direction: 'ltr' }}>{p.ref_no || '—'}</td>
                        <td style={tblTd}>{usersById[p.created_by] || '—'}</td>
                        <td style={tblTd}>
                          {canPay && cardActionAllowed(user, 'manpower_invoices', 'payments', 'delete_payment') && r.status !== 'cancelled' && (
                            <button onClick={async () => {
                              const { error } = await sb.from('manpower_invoice_payments').delete().eq('id', p.id)
                              if (error) toast?.(T('تعذّر الحذف: ', 'Delete failed: ') + error.message)
                              else { toast?.(T('حُذفت الدفعة', 'Payment deleted')); load() }
                            }} title={T('حذف الدفعة', 'Delete payment')}
                              style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={12} /></button>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>}
        </div>

        {payRow && <PaymentModal sb={sb} T={T} lang={lang} user={user} row={payRow} toast={toast}
          onClose={() => setPayRow(null)} onSaved={load} />}
        {showModal && <InvoiceModal sb={sb} T={T} lang={lang} user={user} branches={branches} contracts={contracts} editRow={editRow}
          onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
        <ConfirmDialog open={!!cancelRow} danger lang={lang}
          title={T('إلغاء الفاتورة', 'Cancel invoice')} itemName={cancelRow?.invoice_no}
          message={T('ستُلغى الفاتورة وتبقى في السجل بحالتها الملغاة. هل أنت متأكد؟', 'The invoice will be cancelled but kept on record. Are you sure?')}
          onCancel={() => setCancelRow(null)}
          onConfirm={async () => { const row = cancelRow; setCancelRow(null); await setStatus(row, 'cancelled') }} />
        <ConfirmDialog open={!!delRow} danger lang={lang}
          title={T('حذف الفاتورة', 'Delete invoice')} itemName={delRow?.invoice_no}
          message={T('ستُحذف المسودّة نهائياً. هل أنت متأكد؟', 'The draft will be permanently deleted. Are you sure?')}
          onCancel={() => setDelRow(null)}
          onConfirm={async () => {
            const { error } = await sb.from('manpower_invoices').delete().eq('id', delRow.id)
            setDelRow(null)
            if (error) toast?.(T('تعذّر الحذف: ', 'Delete failed: ') + error.message)
            else { toast?.(T('تم الحذف', 'Deleted')); setDetailsRow(null); load() }
          }} />
      </div>
    )
  }

  /* ═══════════════ القائمة ═══════════════ */
  const th = { padding: '11px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', textAlign: 'start', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
  const td = { padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--tx1)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }
  const active = rows.filter(r => r.status !== 'cancelled' && r.status !== 'draft')
  const outstanding = active.reduce((t, r) => t + Math.max(0, n(r.total) - n(r.paid_amount)), 0)
  const stats = [
    { l: T('إجمالي الفواتير', 'Total invoices'), v: nm0(rows.length), c: C.gold },
    { l: T('المستحق غير المسدَّد', 'Outstanding'), v: nm(outstanding), c: '#e5534b' },
    { l: T('المحصَّل', 'Collected'), v: nm(active.reduce((t, r) => t + n(r.paid_amount), 0)), c: '#27a046' },
    { l: T('متأخرة عن الاستحقاق', 'Overdue'), v: nm0(rows.filter(isOverdue).length), c: '#d99f2b' },
  ]
  const shown = rows.filter(r => mpMatch(q, [r.invoice_no, r.client_name, r.client_name_en, r.po_number, branchLabel(r.branch_id)]))

  return (
    <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
      {header}
      <MpStats stats={stats} dir={dir} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <MpSearch value={q} onChange={setQ} placeholder={T('ابحث برقم الفاتورة أو العميل أو أمر الشراء…', 'Search by invoice no., client or P.O.…')} />
      </div>

      {!shown.length ? (
        <EmptyState icon={emptyIcon || <FileText size={22} color={C.gold} />} title={T('لا توجد فواتير بعد', 'No invoices yet')}
          desc={T('تُصدر الفواتير من المستخلصات المعتمدة في تبويب «المستخلصات»، أو يدوياً من الزر أعلاه', 'Invoices are issued from approved claims in the Claims tab, or manually from the button above')} />
      ) : (
        <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>{T('رقم الفاتورة', 'Invoice no.')}</th>
                <th style={th}>{T('العميل', 'Client')}</th>
                <th style={th}>{T('المكتب', 'Branch')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الفترة', 'Period')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الإجمالي', 'Total')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('المسدَّد', 'Paid')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الاستحقاق', 'Due')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الحالة', 'Status')}</th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  const st = INV_STATUS[r.status] || INV_STATUS.draft
                  return (
                    <tr key={r.id} onClick={() => setDetailsRow(r)} style={{ cursor: 'pointer', transition: 'background .12s' }} {...mpRowHover}>
                      <td style={{ ...td, fontFamily: 'monospace', color: C.gold, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{r.invoice_no}</td>
                      <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.client_name}</td>
                      <td style={td}>{branchLabel(r.branch_id)}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>{fmtD(r.period_from)} → {fmtD(r.period_to)}</td>
                      <td style={{ ...td, textAlign: 'center', color: C.gold, fontWeight: 600 }}>{nm(r.total)}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#27a046' }}>{nm(r.paid_amount)}</td>
                      <td style={{ ...td, textAlign: 'center', color: isOverdue(r) ? '#e5534b' : 'var(--tx3)', fontWeight: isOverdue(r) ? 600 : 500 }}>{fmtD(r.due_date)}</td>
                      <td style={{ ...td, textAlign: 'center' }}><MpBadge st={st} lang={lang} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <InvoiceModal sb={sb} T={T} lang={lang} user={user} branches={branches} contracts={contracts} editRow={editRow}
        onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
    </div>
  )
}

/* ═══════════════ نافذة تسجيل دفعة ═══════════════ */
function PaymentModal({ sb, T, lang, user, row, toast, onClose, onSaved }) {
  const remaining = Math.max(0, n(row.total) - n(row.paid_amount))
  const [f, setF] = useState({ paid_on: iso(new Date()), amount: String(remaining || ''), method: 'transfer', ref_no: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = n(f.amount) > 0 && !!f.paid_on

  const save = async () => {
    if (!valid || busy) return
    setBusy(true); setErr(null)
    const { error } = await sb.from('manpower_invoice_payments').insert({
      invoice_id: row.id, paid_on: f.paid_on, amount: n(f.amount),
      method: f.method, ref_no: f.ref_no.trim() || null, notes: f.notes.trim() || null,
      created_by: user?.id || null,
    })
    setBusy(false)
    if (error) { setErr(T('تعذّر الحفظ: ', 'Save failed: ') + error.message); return }
    setDone(true); await onSaved?.()
  }

  return (
    <FKModal open onClose={onClose} title={T('تسجيل دفعة — ', 'Record payment — ') + (row.invoice_no || '')} Icon={Coins}
      width={620} accent={C.gold} lang={lang} onSubmit={save} submitting={busy}
      submitLabel={T('حفظ الدفعة', 'Save payment')} submitIcon={BadgeCheck}
      success={done ? <SuccessView title={T('سُجّلت الدفعة بنجاح', 'Payment recorded')} code={nm(f.amount)} /> : null}
      pages={[{ valid, error: err, content: (
        <ModalSection Icon={Coins} label={T('الدفعة', 'Payment')} style={{ marginTop: 0 }}
          hint={T('المتبقي على الفاتورة: ', 'Remaining balance: ') + nm(remaining)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={GRID}>
              <CurrencyField label={T('المبلغ', 'Amount')} req value={f.amount} onChange={v => set('amount', v)} />
              <FKDateField label={T('تاريخ السداد', 'Payment date')} value={f.paid_on} onChange={v => set('paid_on', v)} />
            </div>
            <Segmented label={T('طريقة السداد', 'Method')} value={f.method} onChange={v => set('method', v)} full
              options={PAY_METHODS.map(m => ({ v: m.v, l: lang === 'en' ? m.en : m.ar }))} />
            <div style={GRID}>
              <TextField label={T('رقم المرجع / الحوالة', 'Reference no.')} value={f.ref_no} onChange={v => set('ref_no', v)} dir="ltr" />
              <TextField label={T('ملاحظات', 'Notes')} value={f.notes} onChange={v => set('notes', v)} />
            </div>
          </div>
        </ModalSection>
      ) }]} />
  )
}

/* ═══════════════ نافذة فاتورة يدوية / تعديل مسودّة ═══════════════
   للفواتير خارج سياق المستخلص (خدمة لمرة واحدة، تصحيح…). فاتورة المستخلص
   تُصدر من تبويب المستخلصات بضغطة زر ولا تمرّ من هنا. */
function InvoiceModal({ sb, T, lang, user, branches, contracts, editRow, onClose, onSaved }) {
  const emptyLine = () => ({ item: '', item_en: '', workers: '', normal_units: '', ot_units: '', unit_price: '', ot_rate: '', ot_multiplier: 1.5 })
  const [f, setF] = useState(() => editRow ? {
    branch_id: editRow.branch_id, contract_id: editRow.contract_id || null,
    client_name: editRow.client_name || '', client_name_en: editRow.client_name_en || '',
    client_vat_no: editRow.client_vat_no || '', client_cr_no: editRow.client_cr_no || '', client_address: editRow.client_address || '',
    po_number: editRow.po_number || '', project_name: editRow.project_name || '', project_name_en: editRow.project_name_en || '',
    invoice_date: editRow.invoice_date || iso(new Date()), due_date: editRow.due_date || null,
    period_from: editRow.period_from || null, period_to: editRow.period_to || null,
    deduction: String(editRow.deduction ?? ''), deduction_note: editRow.deduction_note || '',
    // اتجاه التسوية حالةٌ مستقلة عن مبلغها — إشارة السالب على الرقم تضيع مع كل كتابة
    adj_minus: n(editRow.adjustment) < 0,
    adjustment: n(editRow.adjustment) ? String(Math.abs(n(editRow.adjustment))) : '',
    adjustment_note: editRow.adjustment_note || '',
    vat_pct: String(editRow.vat_pct ?? 15), notes: editRow.notes || '',
    lines: (editRow.lines?.length ? editRow.lines : [emptyLine()]).map(l => ({ ...l, workers: String(l.workers ?? ''), normal_units: String(l.normal_units ?? ''), ot_units: String(l.ot_units ?? ''), unit_price: String(l.unit_price ?? ''), ot_rate: String(l.ot_rate ?? '') })),
  } : {
    branch_id: user?.primary_branch_id || null, contract_id: null,
    client_name: '', client_name_en: '', client_vat_no: '', client_cr_no: '', client_address: '',
    po_number: '', project_name: '', project_name_en: '',
    invoice_date: iso(new Date()), due_date: null, period_from: null, period_to: null,
    deduction: '', deduction_note: '', adj_minus: false, adjustment: '', adjustment_note: '',
    vat_pct: '15', notes: '', lines: [emptyLine()],
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [savedRow, setSavedRow] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setLine = (i, k, v) => setF(p => { const a = p.lines.slice(); a[i] = { ...a[i], [k]: v }; return { ...p, lines: a } })

  const activeLines = f.lines.filter(l => l.item && n(l.unit_price) > 0 && (n(l.normal_units) > 0 || n(l.ot_units) > 0))
  const signedAdj = (f.adj_minus ? -1 : 1) * n(f.adjustment)
  const tot = invoiceTotals(activeLines, f.deduction, f.vat_pct, signedAdj)
  const canSave = f.client_name.trim().length > 0 && activeLines.length > 0

  const save = async () => {
    if (!canSave || submitting) return
    setSubmitting(true); setErr(null)
    const payload = {
      branch_id: f.branch_id || null, contract_id: f.contract_id || null,
      client_name: f.client_name.trim(), client_name_en: f.client_name_en.trim() || null,
      client_vat_no: f.client_vat_no.trim() || null, client_cr_no: f.client_cr_no.trim() || null, client_address: f.client_address.trim() || null,
      po_number: f.po_number.trim() || null, project_name: f.project_name.trim() || null, project_name_en: f.project_name_en.trim() || null,
      invoice_date: f.invoice_date || iso(new Date()), due_date: f.due_date || null,
      period_from: f.period_from || null, period_to: f.period_to || null,
      lines: activeLines.map(l => ({
        item: l.item.trim(), item_en: (l.item_en || '').trim(), workers: n(l.workers),
        normal_units: n(l.normal_units), ot_units: n(l.ot_units),
        unit_price: n(l.unit_price), ot_rate: n(l.ot_rate) || null, ot_multiplier: n(l.ot_multiplier) || 1.5,
      })),
      subtotal: Math.round(tot.subtotal * 100) / 100,
      ot_amount: Math.round(tot.otAmount * 100) / 100,
      deduction: n(f.deduction), deduction_note: f.deduction_note.trim() || null,
      adjustment: signedAdj, adjustment_note: f.adjustment_note.trim() || null,
      vat_pct: n(f.vat_pct),
      vat_amount: Math.round(tot.vat * 100) / 100,
      total: Math.round(tot.total * 100) / 100,
      notes: f.notes.trim() || null,
    }
    try {
      if (editRow?.id) {
        const { data, error } = await sb.from('manpower_invoices').update(payload).eq('id', editRow.id).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      } else {
        const { data, error } = await sb.from('manpower_invoices').insert({ ...payload, created_by: user?.id || null }).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      }
      setSubmitting(false)
    } catch (e) { setSubmitting(false); setErr(T('تعذّر الحفظ: ', 'Save failed: ') + (e?.message || e)) }
  }

  const row2 = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }
  const frame = (Icon, label, hint, children) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ModalSection flex Icon={Icon} label={label} hint={hint} style={{ marginTop: 0 }}>{children}</ModalSection>
    </div>
  )

  const pgClient = frame(Building2, T('العميل والفاتورة', 'Client & Invoice'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={row2}>
        <TextField label={T('اسم العميل', 'Client name')} req value={f.client_name} onChange={v => set('client_name', v)} placeholder={T('بالعربي', 'In Arabic')} />
        <TextField label={T('اسم العميل', 'Client name')} value={f.client_name_en} onChange={v => set('client_name_en', v)} dir="ltr" placeholder={T('بالإنجليزي', 'In English')} />
      </div>
      <div style={row2}>
        <FKSelect label={T('المكتب', 'Branch')} value={f.branch_id} onChange={v => set('branch_id', v)}
          options={(branches || []).map(b => ({ v: b.id, l: (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') }))}
          getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المكتب', 'Pick a branch')} />
        <FKSelect label={T('العقد (اختياري)', 'Contract (optional)')} value={f.contract_id} onChange={v => set('contract_id', v)}
          options={(contracts || []).map(c => ({ v: c.id, l: c.contract_no + ' — ' + (c.client_name || '') }))}
          getKey={o => o.v} getLabel={o => o.l} placeholder={T('بلا عقد', 'No contract')} />
      </div>
      <div style={row2}>
        <FKDateField label={T('تاريخ الفاتورة', 'Invoice date')} value={f.invoice_date} onChange={v => set('invoice_date', v)} />
        <FKDateField label={T('تاريخ الاستحقاق', 'Due date')} value={f.due_date} onChange={v => set('due_date', v)} />
      </div>
      <div style={row2}>
        <FKDateField label={T('الفترة من', 'Period from')} value={f.period_from} onChange={v => set('period_from', v)} />
        <FKDateField label={T('الفترة إلى', 'Period to')} value={f.period_to} onChange={v => set('period_to', v)} />
      </div>
      <div style={row2}>
        <TextField label={T('الرقم الضريبي للعميل', 'Client VAT No.')} value={f.client_vat_no} onChange={v => set('client_vat_no', v)} dir="ltr" />
        <TextField label={T('رقم أمر الشراء', 'P.O. number')} value={f.po_number} onChange={v => set('po_number', v)} dir="ltr" />
      </div>
    </div>
  )

  const pgLines = frame(Receipt, T('بنود الفاتورة', 'Invoice Items'), null,
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 10 }}>
      <div className="sr-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingInlineEnd: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {f.lines.map((l, i) => {
          const amt = n(l.normal_units) * n(l.unit_price) + n(l.ot_units) * lineOtRate(l, l.ot_multiplier)
          return (
            <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: C.gold }}>{l.item || T('بند', 'Item') + ' ' + (i + 1)}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11.5, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
                  {T('المبلغ', 'Amount')}: <b style={{ color: C.gold }}>{nm(amt)}</b>
                </span>
                {f.lines.length > 1 && <button onClick={() => setF(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} title={T('حذف', 'Remove')}
                  style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <TextField label={T('البند / المهنة', 'Item / trade')} value={l.item} onChange={v => setLine(i, 'item', v)} />
                <TextField label={T('بالإنجليزي', 'In English')} value={l.item_en} onChange={v => setLine(i, 'item_en', v)} dir="ltr" />
                <NumberField label={T('عدد العمال', 'Workers')} value={l.workers} onChange={v => setLine(i, 'workers', v)} min={0} />
              </div>
              {/* الوحدات ساعاتٌ قد تكون كسرية (1547.5) — CurrencyField يقبل الفاصلة، وNumberField لا */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                <CurrencyField label={T('سعر الوحدة', 'Rate')} value={l.unit_price} onChange={v => setLine(i, 'unit_price', v)} />
                <CurrencyField label={T('وحدات عادية', 'Normal units')} unit={T('ساعة', 'hr')} value={l.normal_units} onChange={v => setLine(i, 'normal_units', v)} />
                <CurrencyField label={T('وحدات إضافية', 'OT units')} unit={T('ساعة', 'hr')} value={l.ot_units} onChange={v => setLine(i, 'ot_units', v)} />
                <CurrencyField label={T('سعر الإضافي', 'OT rate')} value={l.ot_rate} onChange={v => setLine(i, 'ot_rate', v)} />
              </div>
            </div>
          )
        })}
      </div>
      <button onClick={() => setF(p => ({ ...p, lines: [...p.lines, emptyLine()] }))}
        style={{ alignSelf: 'flex-start', height: 32, padding: '0 12px', borderRadius: 9, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Plus size={13} strokeWidth={2.4} />{T('إضافة بند', 'Add item')}</button>
    </div>
  )

  const readout = (label, value, color) => (
    <div style={{ flex: 1, minWidth: 130, background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
      <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: color || 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{value}</span>
    </div>
  )

  const pgTotals = frame(Coins, T('الملخص المالي', 'Financial Summary'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={GRID}>
        <CurrencyField label={T('الخصم', 'Deduction')} value={f.deduction} onChange={v => set('deduction', v)} />
        <TextField label={T('بيان الخصم', 'Deduction note')} value={f.deduction_note} onChange={v => set('deduction_note', v)} />
        <NumberField label={T('ضريبة القيمة المضافة %', 'VAT %')} value={f.vat_pct} onChange={v => set('vat_pct', v)} min={0} max={100} />
      </div>
      <div style={GRID}>
        <Segmented label={T('اتجاه التسوية', 'Adjustment direction')} value={f.adj_minus ? 'minus' : 'plus'}
          onChange={v => set('adj_minus', v === 'minus')}
          options={[{ v: 'plus', l: T('إضافة', 'Add'), c: '#27a046' }, { v: 'minus', l: T('خصم', 'Deduct'), c: '#e5534b' }]} />
        <CurrencyField label={T('مبلغ التسوية', 'Adjustment amount')} value={f.adjustment} onChange={v => set('adjustment', v)} />
        <TextField label={T('سبب التسوية', 'Adjustment note')} value={f.adjustment_note} onChange={v => set('adjustment_note', v)} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {readout(T('الوحدات العادية', 'Normal'), nm(tot.subtotal), '#27a046')}
        {readout(T('الوقت الإضافي', 'Overtime'), nm(tot.otAmount), '#d99f2b')}
        {readout(T('الصافي قبل الضريبة', 'Net before VAT'), nm(tot.net))}
        {readout(T('الضريبة', 'VAT'), nm(tot.vat))}
        {readout(T('الإجمالي', 'Total'), nm(tot.total), C.gold)}
      </div>
      <TextArea label={T('ملاحظات', 'Notes')} value={f.notes} onChange={v => set('notes', v)} rows={2} full />
    </div>
  )

  const pages = [
    { valid: f.client_name.trim().length > 0, content: pgClient },
    { valid: activeLines.length > 0, content: pgLines },
    { valid: canSave, error: err, content: pgTotals },
  ]

  return (
    <FKModal open onClose={onClose} title={editRow ? T('تعديل الفاتورة', 'Edit invoice') : T('فاتورة توريد عمالة يدوية', 'Manual Manpower Invoice')}
      Icon={FileText} width={940} height="min(720px, 92vh)" accent={C.gold} lang={lang}
      pages={pages} onSubmit={save} submitting={submitting}
      submitLabel={editRow ? T('حفظ التعديلات', 'Save changes') : T('حفظ الفاتورة', 'Save invoice')} submitIcon={BadgeCheck}
      success={savedRow ? <SuccessView title={T('حُفظت الفاتورة', 'Invoice saved')} code={savedRow.invoice_no} /> : null} />
  )
}
