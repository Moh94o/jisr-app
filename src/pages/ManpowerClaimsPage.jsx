import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Receipt, Plus, Trash2, Pencil, BadgeCheck, ArrowRight, ArrowLeft, FileText, CalendarDays, Coins, Printer,
} from 'lucide-react'
import {
  C, F, EmptyState, Modal as FKModal, ModalSection, TextArea, TextField, CurrencyField, NumberField,
  Segmented, Select as FKSelect, DateField as FKDateField, GRID, SuccessView, ConfirmDialog,
} from '../components/ui/FormKit.jsx'
import { canTab, cardVisible, isGM, tabOffices } from '../lib/permissions.js'
import PageSkeleton from '../components/ui/Skeleton.jsx'
import BackButton from '../components/BackButton.jsx'
import { MpStats, MpBadge, MpSearch, mpMatch, mpRowHover } from '../lib/manpowerUi.jsx'
import { splitHours, countAbsents, lineOtRate } from './ManpowerTimesheetsPage.jsx'
import { printManpowerClaim } from '../lib/manpowerDocsPrint.js'

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nm0 = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const iso = d => { const x = new Date(d); return isNaN(x) ? '' : x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') }
const fmtD = d => d ? iso(d) || '—' : '—'

export const CLAIM_STATUS = {
  draft: { ar: 'مسودّة', en: 'Draft', c: 'var(--tx3)' },
  submitted: { ar: 'مُقدَّم للعميل', en: 'Submitted', c: '#d99f2b' },
  approved: { ar: 'معتمد', en: 'Approved', c: C.blue },
  paid: { ar: 'مدفوع', en: 'Paid', c: '#27a046' },
}

/* حسبة المستخلص — كما في مستندات المكتب الحقيقية: البنود العادية بسعرها،
   والإضافية بسعر الإضافي المستقل، ثم خصم الغياب، ثم التسوية المرحّلة (+/−)،
   ثم الضريبة على الصافي. الضريبة بعد الخصم لأن الخصم يقلّل قيمة التوريد نفسها. */
export const claimTotals = (lines, deductions, vatPct, adjustment = 0) => {
  const subtotal = (lines || []).reduce((t, l) => t + n(l.normal_units) * n(l.unit_price), 0)
  const otAmount = (lines || []).reduce((t, l) => t + n(l.ot_units) * lineOtRate(l, l.ot_multiplier), 0)
  const net = Math.max(0, subtotal + otAmount - n(deductions) + n(adjustment))
  const vat = net * (n(vatPct) / 100)
  return { subtotal, otAmount, net, vat, total: net + vat }
}

/* إجمالي غيابات الكشف — أساس خصم السكن والإعاشة في المستخلص */
export const sheetAbsents = (sheet) => (sheet?.lines || []).reduce((t, l) => t + countAbsents(l.days), 0)

/* بنود المستخلص من كشف دوام معتمد — تُجمَع صفوف العمال بالمهنة وسعر الوحدة،
   فالعميل يفوتَر على المهنة لا على اسم العامل. */
export const linesFromSheet = (sheet) => {
  const hpd = n(sheet.hours_per_day) || 10
  const otx = n(sheet.ot_multiplier) || 1.5
  const byKey = {}
  ;(sheet.lines || []).forEach(l => {
    const s = splitHours(l.days, hpd)
    const key = (l.trade || '—') + '|' + n(l.unit_price)
    byKey[key] ||= { item: l.trade || '—', item_en: l.trade_en || '', workers: 0, normal_units: 0, ot_units: 0, unit_price: n(l.unit_price), ot_rate: n(l.ot_rate) || null, ot_multiplier: otx }
    byKey[key].workers += 1
    byKey[key].normal_units += s.normal
    byKey[key].ot_units += s.ot
  })
  return Object.values(byKey)
}

export default function ManpowerClaimsPage({ sb, toast, user, lang = 'ar', emptyIcon }) {
  const T = (ar, en) => lang === 'en' ? en : ar
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  const [rows, setRows] = useState(null)
  const [contracts, setContracts] = useState([])
  const [sheets, setSheets] = useState([])
  const [banks, setBanks] = useState([])
  const [usersById, setUsersById] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [detailsRow, setDetailsRow] = useState(null)
  const [delRow, setDelRow] = useState(null)
  const [q, setQ] = useState('')

  const canView = canTab(user, 'manpower_claims')
  const canCreate = isGM(user) || canTab(user, 'manpower_claims', 'create')
  const canEdit = isGM(user) || canTab(user, 'manpower_claims', 'edit')
  const canDelete = isGM(user) || canTab(user, 'manpower_claims', 'delete')
  const canSubmit = isGM(user) || canTab(user, 'manpower_claims', 'submit')
  const canApprove = isGM(user) || canTab(user, 'manpower_claims', 'approve')
  const canPay = isGM(user) || canTab(user, 'manpower_claims', 'pay')
  const canPrint = isGM(user) || canTab(user, 'manpower_claims', 'print')
  // إصدار الفاتورة صلاحية وحدة الفواتير لا المستخلصات — دور «المُفوتِر» قد لا يحرّر مستخلصات
  const canInvoice = isGM(user) || canTab(user, 'manpower_invoices', 'create')
  // نطاق المكاتب — غير المدير العام يرى مستخلصات مكاتبه وحدها
  const officeScope = tabOffices(user, 'manpower_claims')

  const load = useCallback(async () => {
    let clQ = sb.from('manpower_claims').select('*').order('period_from', { ascending: false }).limit(500)
    let ctQ = sb.from('manpower_contracts').select('*').order('created_at', { ascending: false }).limit(500)
    let tsQ = sb.from('manpower_timesheets').select('*').eq('status', 'approved').order('period_from', { ascending: false }).limit(500)
    if (officeScope) { clQ = clQ.in('branch_id', officeScope); ctQ = ctQ.in('branch_id', officeScope); tsQ = tsQ.in('branch_id', officeScope) }
    const [cl, ct, ts, u, ba] = await Promise.all([
      clQ, ctQ, tsQ,
      sb.from('users').select('id,person:persons(name_ar,name_en)'),
      sb.from('bank_accounts').select('branch_id,bank_name,bank_name_en,account_name,account_name_en,account_number,iban,is_primary').is('deleted_at', null).eq('is_active', true),
    ])
    setRows(cl.data || []); setContracts(ct.data || []); setSheets(ts.data || []); setBanks(ba.data || [])
    const map = {}; (u.data || []).forEach(x => { map[x.id] = x.person?.name_ar || x.person?.name_en || '' }); setUsersById(map)
    setDetailsRow(prev => prev ? (cl.data || []).find(r => r.id === prev.id) || prev : prev)
  }, [sb])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('manpower-claims-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_claims' }, () => load()).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb, load])

  const contractOf = id => contracts.find(c => c.id === id)
  const contractLabel = id => { const c = contractOf(id); return c ? c.contract_no + ' — ' + (c.client_name || '') : '—' }
  /* حساب الفرع الرئيسي — جدول البنك في خطاب المستخلص المطبوع */
  const bankOf = branchId => {
    const list = banks.filter(x => x.branch_id === branchId)
    return list.find(x => x.is_primary) || list[0] || banks.find(x => x.is_primary) || banks[0] || null
  }

  const setStatus = async (row, status) => {
    const now = new Date().toISOString()
    const patch = { status }
    if (status === 'submitted') patch.submitted_at = now
    if (status === 'approved') patch.approved_at = now
    if (status === 'paid') { patch.paid_at = now; patch.paid_amount = n(row.total) }
    const { error } = await sb.from('manpower_claims').update(patch).eq('id', row.id)
    if (error) toast?.(T('تعذّر التحديث: ', 'Update failed: ') + error.message)
    else { toast?.(T('تم تحديث الحالة', 'Status updated')); load() }
  }

  /* إصدار فاتورة ضريبية من مستخلص معتمد — لقطة كاملة: البنود والخصم والتسوية
     والضريبة تُنسخ كما اعتُمدت، وبيانات الفوترة الرسمية من العقد. فاتورةٌ
     واحدة للمستخلص الواحد، وترقيمها MAC-XXXXXX من القاعدة. */
  const issueInvoice = async (r) => {
    if (r.invoice_id) { toast?.(T('لهذا المستخلص فاتورة قائمة', 'This claim already has an invoice')); return }
    const c = contractOf(r.contract_id)
    const today = new Date()
    const due = new Date(today); due.setDate(due.getDate() + (n(c?.payment_due_days) || 45))
    const payload = {
      branch_id: r.branch_id || c?.branch_id || null, contract_id: r.contract_id, claim_id: r.id,
      client_name: c?.client_name || '—', client_name_en: c?.client_name_en || null,
      client_vat_no: c?.client_vat_no || null, client_cr_no: c?.client_cr_no || null, client_address: c?.client_address || null,
      po_number: c?.po_number || null, project_name: c?.project_name || null, project_name_en: c?.project_name_en || null,
      invoice_date: iso(today), due_date: iso(due),
      period_from: r.period_from, period_to: r.period_to,
      lines: r.lines || [],
      subtotal: n(r.subtotal), ot_amount: n(r.ot_amount),
      deduction: n(r.deductions),
      deduction_note: n(r.deduction_rate) && n(r.absent_days) ? `${n(r.deduction_rate)} × ${n(r.absent_days)}` : null,
      adjustment: n(r.adjustment), adjustment_note: r.adjustment_note || null,
      vat_pct: n(r.vat_pct) || n(c?.vat_pct) || 15, vat_amount: n(r.vat_amount), total: n(r.total),
      status: 'issued', issued_at: new Date().toISOString(),
      created_by: user?.id || null,
    }
    const { data, error } = await sb.from('manpower_invoices').insert(payload).select('id,invoice_no').single()
    if (error) { toast?.(T('تعذّر إصدار الفاتورة: ', 'Invoice issue failed: ') + error.message); return }
    // فشل الربط لا يلغي الفاتورة الصادرة — لكنه يُقال صراحةً كي لا تُصدر ثانية
    const { error: linkErr } = await sb.from('manpower_claims').update({ invoice_id: data.id }).eq('id', r.id)
    if (linkErr) toast?.(T('صدرت الفاتورة ' + (data.invoice_no || '') + ' لكن تعذّر ربطها بالمستخلص: ', 'Invoice ' + (data.invoice_no || '') + ' issued but linking to the claim failed: ') + linkErr.message)
    else toast?.(T('صدرت الفاتورة ', 'Invoice issued ') + (data.invoice_no || ''))
    load()
  }

  if (!canView) return null

  const header = (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('المستخلصات', 'Progress Claims')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>
            {T('مطالبة دورية على العقد مبنيّة على كشف دوام معتمد — عادي وإضافي وخصومات وضريبة', 'A periodic claim on the contract built from an approved timesheet — normal, overtime, deductions and VAT')}
          </div>
        </div>
        {canCreate && <div className="page-cta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setEditRow(null); setShowModal(true) }} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            {T('مستخلص جديد', 'New claim')}<Plus size={16} strokeWidth={2.2} />
          </button>
        </div>}
      </div>
    </div>
  )

  if (rows === null) return <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>{header}<PageSkeleton variant="table" cards={4} columns={8} rows={6} /></div>

  /* ═══════════════ التفاصيل ═══════════════ */
  if (detailsRow) {
    const r = detailsRow
    const st = CLAIM_STATUS[r.status] || CLAIM_STATUS.draft
    const c = contractOf(r.contract_id)
    const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
    const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
    const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
    const cell = (label, value, opts = {}) => (
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: opts.color || 'var(--tx1)', fontWeight: 600, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</span>
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
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)' }}>{c?.client_name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }}>{r.claim_no} · {fmtD(r.period_from)} → {fmtD(r.period_to)}</div>
          </div>
          <MpBadge st={st} lang={lang} />
          {canEdit && r.status === 'draft' && <button onClick={() => { setEditRow(r); setShowModal(true) }}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Pencil size={13} />{T('تعديل', 'Edit')}</button>}
          {canSubmit && r.status === 'draft' && <button onClick={() => setStatus(r, 'submitted')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #d99f2b55', background: 'transparent', color: '#d99f2b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{T('تقديم للعميل', 'Submit')}</button>}
          {canApprove && r.status === 'submitted' && <button onClick={() => setStatus(r, 'approved')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.blue + '55', background: 'transparent', color: C.blue, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <BadgeCheck size={13} />{T('اعتماد', 'Approve')}</button>}
          {canPay && r.status === 'approved' && <button onClick={() => setStatus(r, 'paid')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #27a04655', background: 'transparent', color: '#27a046', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Coins size={13} />{T('تسجيل السداد', 'Mark paid')}</button>}
          {/* الفاتورة الضريبية تُصدر من المستخلص المعتمد — الوثيقة الرسمية للعميل */}
          {canInvoice && (r.status === 'approved' || r.status === 'paid') && !r.invoice_id && <button onClick={() => issueInvoice(r)} className="btn-primary-modal"
            style={{ height: 36, padding: '0 14px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <FileText size={13} />{T('إصدار فاتورة', 'Issue invoice')}</button>}
          {r.invoice_id && <MpBadge st={{ ar: 'صدرت فاتورتها', en: 'Invoiced', c: '#27a046' }} lang={lang} />}
          {canPrint && r.status !== 'draft' && <>
            <button onClick={() => printManpowerClaim(r, { contract: contractOf(r.contract_id), sheet: sheets.find(s => s.id === r.timesheet_id), bank: bankOf(r.branch_id), lang: 'ar', splitFn: splitHours, absentFn: countAbsents })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة — عربي', 'Print — Arabic')}</button>
            <button onClick={() => printManpowerClaim(r, { contract: contractOf(r.contract_id), sheet: sheets.find(s => s.id === r.timesheet_id), bank: bankOf(r.branch_id), lang: 'en', splitFn: splitHours, absentFn: countAbsents })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة — إنجليزي', 'Print — English')}</button>
          </>}
          {canDelete && r.status === 'draft' && <button onClick={() => setDelRow(r)}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Trash2 size={13} />{T('حذف', 'Delete')}</button>}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {cardVisible(user, 'manpower_claims', 'header') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('العقد والفترة', 'Contract & Period')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 8 }}>
              {cell(T('العقد', 'Contract'), contractLabel(r.contract_id), { full: true })}
              {cell(T('من', 'From'), fmtD(r.period_from))}
              {cell(T('إلى', 'To'), fmtD(r.period_to))}
              {cell(T('كشف الدوام', 'Timesheet'), sheets.find(s => s.id === r.timesheet_id)?.sheet_no || '—')}
              {cell(T('قُدّم في', 'Submitted'), fmtD(r.submitted_at))}
              {cell(T('اعتُمد في', 'Approved'), fmtD(r.approved_at))}
              {cell(T('سُدّد في', 'Paid'), fmtD(r.paid_at))}
            </div>
            {r.notes && <div style={{ padding: '0 22px 16px' }}>{cell(T('ملاحظات', 'Notes'), r.notes, { full: true })}</div>}
            <div style={{ padding: '0 22px 16px', display: 'flex', gap: 14, fontSize: 11, color: 'var(--tx4)', flexWrap: 'wrap' }}>
              <span>{T('أنشأه', 'Created by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.created_by] || '—'}</b></span>
              <span>{T('بتاريخ', 'On')}: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtD(r.created_at)}</span></span>
            </div>
          </div>}

          {cardVisible(user, 'manpower_claims', 'lines') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('بنود المستخلص', 'Claim Items')}</span></div>
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

          {cardVisible(user, 'manpower_claims', 'financial') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27a046' }} /><span style={cardTitle}>{T('الملخص المالي', 'Financial Summary')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
              {cell(T('الوحدات العادية', 'Normal'), nm(r.subtotal), { color: '#27a046' })}
              {cell(T('الوقت الإضافي', 'Overtime'), nm(r.ot_amount), { color: '#d99f2b' })}
              {cell(T('خصم الغياب', 'Absence deduction'),
                nm(r.deductions) + (n(r.deduction_rate) && n(r.absent_days) ? ' (' + nm(r.deduction_rate) + ' × ' + nm0(r.absent_days) + ')' : ''),
                { color: '#e5534b' })}
              {n(r.adjustment) !== 0 && cell(T('تسوية', 'Adjustment'), (n(r.adjustment) > 0 ? '+' : '') + nm(r.adjustment), { color: C.blue })}
              {cell(T('الضريبة', 'VAT'), nm(r.vat_amount))}
              {cell(T('الإجمالي', 'Total'), nm(r.total), { color: C.gold })}
              {cell(T('المسدَّد', 'Paid'), nm(r.paid_amount), { color: n(r.paid_amount) >= n(r.total) && n(r.total) > 0 ? '#27a046' : 'var(--tx3)' })}
            </div>
            {r.adjustment_note && <div style={{ padding: '0 22px 16px', fontSize: 11.5, color: 'var(--tx3)' }}>{T('سبب التسوية', 'Adjustment note')}: {r.adjustment_note}</div>}
          </div>}
        </div>

        {showModal && <ClaimModal sb={sb} T={T} lang={lang} user={user} contracts={contracts} sheets={sheets} claims={rows} editRow={editRow}
          onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
        <ConfirmDialog open={!!delRow} danger lang={lang}
          title={T('حذف المستخلص', 'Delete claim')} itemName={delRow?.claim_no}
          message={T('سيُحذف المستخلص نهائياً. كشف الدوام لا يُحذف.', 'The claim will be permanently deleted. Its timesheet is not deleted.')}
          onCancel={() => setDelRow(null)}
          onConfirm={async () => {
            const { error } = await sb.from('manpower_claims').delete().eq('id', delRow.id)
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
  const outstanding = rows.filter(r => r.status !== 'paid').reduce((t, r) => t + n(r.total) - n(r.paid_amount), 0)
  const stats = [
    { l: T('إجمالي المستخلصات', 'Total claims'), v: nm0(rows.length), c: C.gold },
    { l: T('بانتظار الاعتماد', 'Awaiting approval'), v: nm0(rows.filter(r => r.status === 'submitted').length), c: '#d99f2b' },
    { l: T('المستحق غير المسدَّد', 'Outstanding'), v: nm(outstanding), c: '#e5534b' },
    { l: T('المحصّل', 'Collected'), v: nm(rows.reduce((t, r) => t + n(r.paid_amount), 0)), c: '#27a046' },
  ]
  const shown = rows.filter(r => { const c = contractOf(r.contract_id); return mpMatch(q, [r.claim_no, c?.client_name, c?.client_name_en, c?.contract_no]) })

  return (
    <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
      {header}
      <MpStats stats={stats} dir={dir} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <MpSearch value={q} onChange={setQ} placeholder={T('ابحث برقم المستخلص أو العميل أو العقد…', 'Search by claim no., client or contract…')} />
      </div>

      {!shown.length ? (
        <EmptyState icon={emptyIcon || <Receipt size={22} color={C.gold} />} title={T('لا توجد مستخلصات بعد', 'No claims yet')}
          desc={sheets.length ? T('أنشئ مستخلصاً من كشف دوام معتمد', 'Create a claim from an approved timesheet') : T('اعتمد كشف دوام أولاً — المستخلص يُبنى عليه', 'Approve a timesheet first — the claim is built on it')} />
      ) : (
        <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>{T('رقم المستخلص', 'Claim no.')}</th>
                <th style={th}>{T('العقد / العميل', 'Contract / Client')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الفترة', 'Period')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('عادي', 'Normal')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('إضافي', 'OT')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الضريبة', 'VAT')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الإجمالي', 'Total')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الحالة', 'Status')}</th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  const st = CLAIM_STATUS[r.status] || CLAIM_STATUS.draft
                  return (
                    <tr key={r.id} onClick={() => setDetailsRow(r)} style={{ cursor: 'pointer', transition: 'background .12s' }} {...mpRowHover}>
                      <td style={{ ...td, fontFamily: 'monospace', color: C.gold, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{r.claim_no}</td>
                      <td style={{ ...td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{contractLabel(r.contract_id)}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)', fontSize: 12 }}>{fmtD(r.period_from)} → {fmtD(r.period_to)}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#27a046' }}>{nm(r.subtotal)}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#d99f2b' }}>{nm(r.ot_amount)}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)' }}>{nm(r.vat_amount)}</td>
                      <td style={{ ...td, textAlign: 'center', color: C.gold, fontWeight: 600 }}>{nm(r.total)}</td>
                      <td style={{ ...td, textAlign: 'center' }}><MpBadge st={st} lang={lang} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <ClaimModal sb={sb} T={T} lang={lang} user={user} contracts={contracts} sheets={sheets} claims={rows} editRow={editRow}
        onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
    </div>
  )
}

/* ═══════════════ نافذة إنشاء / تعديل مستخلص ═══════════════ */
function ClaimModal({ sb, T, lang, user, contracts, sheets, claims, editRow, onClose, onSaved }) {
  const [f, setF] = useState(() => editRow ? {
    contract_id: editRow.contract_id, timesheet_id: editRow.timesheet_id || null, branch_id: editRow.branch_id,
    period_from: editRow.period_from, period_to: editRow.period_to,
    deductions: String(editRow.deductions ?? ''), vat_pct: String(editRow.vat_pct ?? 15),
    absent_days: String(editRow.absent_days ?? ''), deduction_rate: String(editRow.deduction_rate ?? ''),
    // اتجاه التسوية حالةٌ مستقلة عن مبلغها — إشارة السالب على الرقم تضيع مع كل كتابة
    adj_minus: n(editRow.adjustment) < 0,
    adjustment: n(editRow.adjustment) ? String(Math.abs(n(editRow.adjustment))) : '',
    adjustment_note: editRow.adjustment_note || '',
    lines: (editRow.lines || []).map(l => ({ ...l, normal_units: String(l.normal_units ?? ''), ot_units: String(l.ot_units ?? ''), unit_price: String(l.unit_price ?? ''), ot_rate: String(l.ot_rate ?? '') })),
    notes: editRow.notes || '',
  } : {
    contract_id: null, timesheet_id: null, branch_id: user?.primary_branch_id || null,
    period_from: null, period_to: null, deductions: '', vat_pct: '15',
    absent_days: '', deduction_rate: '', adj_minus: false, adjustment: '', adjustment_note: '',
    lines: [], notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [savedRow, setSavedRow] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setLine = (i, k, v) => setF(p => { const a = p.lines.slice(); a[i] = { ...a[i], [k]: v }; return { ...p, lines: a } })

  /* الكشوف المعتمدة التي لم يُبنَ عليها مستخلص بعد — كشفٌ واحد لمستخلص واحد */
  const usedSheetIds = new Set((claims || []).filter(c => c.id !== editRow?.id).map(c => c.timesheet_id).filter(Boolean))
  const availableSheets = (sheets || []).filter(s => !usedSheetIds.has(s.id) && (!f.contract_id || s.contract_id === f.contract_id))
  /* تحذير لا منع: مستخلص آخر على العقد نفسه يغطي جزءاً من هذه الفترة —
     الفوترة المزدوجة أخطر خطأ في المطالبات وأصعبه تراجعاً أمام العميل */
  const overlapClaim = (claims || []).find(c => c.id !== editRow?.id && c.contract_id === f.contract_id
    && f.period_from && f.period_to && c.period_from && c.period_to
    && c.period_from <= f.period_to && c.period_to >= f.period_from)

  /* اختيار الكشف يبني البنود ويثبّت الفترة — المستخلص لا يخترع أرقاماً، ينقلها.
     خصم الغياب يُحتسب آلياً: غيابات الكشف × معدل الخصم اليومي في العقد
     (سكن/إعاشة) — ويبقى قابلاً للتعديل لحالةٍ بعينها. */
  const pickSheet = (sid) => setF(p => {
    const s = (sheets || []).find(x => x.id === sid)
    if (!s) return { ...p, timesheet_id: sid }
    const c = contracts.find(x => x.id === s.contract_id)
    const absents = sheetAbsents(s)
    const dedRate = n(c?.absence_deduction_rate)
    return {
      ...p, timesheet_id: sid, contract_id: s.contract_id, branch_id: s.branch_id || p.branch_id,
      period_from: s.period_from, period_to: s.period_to,
      vat_pct: String(c?.vat_pct ?? p.vat_pct ?? 15),
      absent_days: String(absents), deduction_rate: String(dedRate || ''),
      deductions: absents && dedRate ? String(Math.round(absents * dedRate * 100) / 100) : p.deductions,
      lines: linesFromSheet(s).map(l => ({ ...l, normal_units: String(l.normal_units), ot_units: String(l.ot_units), unit_price: String(l.unit_price), ot_rate: String(l.ot_rate ?? '') })),
    }
  })

  const activeLines = f.lines.filter(l => l.item && n(l.unit_price) > 0 && (n(l.normal_units) > 0 || n(l.ot_units) > 0))
  const signedAdj = (f.adj_minus ? -1 : 1) * n(f.adjustment)
  const tot = claimTotals(activeLines, f.deductions, f.vat_pct, signedAdj)
  const canSave = !!f.contract_id && !!f.period_from && !!f.period_to && activeLines.length > 0

  const save = async () => {
    if (!canSave || submitting) return
    setSubmitting(true); setErr(null)
    const payload = {
      contract_id: f.contract_id, timesheet_id: f.timesheet_id || null, branch_id: f.branch_id || null,
      period_from: f.period_from, period_to: f.period_to,
      lines: activeLines.map(l => ({
        item: l.item, item_en: l.item_en || '', workers: n(l.workers),
        normal_units: n(l.normal_units), ot_units: n(l.ot_units),
        unit_price: n(l.unit_price), ot_rate: n(l.ot_rate) || null, ot_multiplier: n(l.ot_multiplier) || 1.5,
      })),
      subtotal: Math.round(tot.subtotal * 100) / 100,
      ot_amount: Math.round(tot.otAmount * 100) / 100,
      deductions: n(f.deductions),
      absent_days: n(f.absent_days), deduction_rate: n(f.deduction_rate) || null,
      adjustment: signedAdj, adjustment_note: f.adjustment_note.trim() || null,
      vat_pct: n(f.vat_pct),
      vat_amount: Math.round(tot.vat * 100) / 100,
      total: Math.round(tot.total * 100) / 100,
      notes: f.notes.trim() || null,
    }
    try {
      if (editRow?.id) {
        const { data, error } = await sb.from('manpower_claims').update(payload).eq('id', editRow.id).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      } else {
        const { data, error } = await sb.from('manpower_claims').insert({ ...payload, created_by: user?.id || null }).select('*').single()
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

  const pgSource = frame(CalendarDays, T('المصدر والفترة', 'Source & Period'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FKSelect label={T('العقد', 'Contract')} req value={f.contract_id} onChange={v => set('contract_id', v)}
        options={(contracts || []).map(c => ({ v: c.id, l: c.contract_no + ' — ' + (c.client_name || '') }))}
        getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر العقد', 'Pick a contract')} full />
      <FKSelect label={T('كشف الدوام المعتمد', 'Approved timesheet')} value={f.timesheet_id} onChange={pickSheet}
        options={availableSheets.map(s => ({ v: s.id, l: s.sheet_no + ' · ' + fmtD(s.period_from) + ' → ' + fmtD(s.period_to) }))}
        getKey={o => o.v} getLabel={o => o.l}
        placeholder={availableSheets.length ? T('اختر كشفاً لبناء البنود منه', 'Pick a sheet to build the items') : T('لا توجد كشوف معتمدة متاحة', 'No approved sheets available')} full />
      <div style={row2}>
        <FKDateField label={T('من تاريخ', 'From')} value={f.period_from} onChange={v => set('period_from', v)} />
        <FKDateField label={T('إلى تاريخ', 'To')} value={f.period_to} onChange={v => set('period_to', v)} />
      </div>
      {overlapClaim && (
        <div style={{ background: '#d99f2b12', border: '1px solid #d99f2b55', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#d99f2b', lineHeight: 1.8 }}>
          {T('⚠ يوجد مستخلص على هذا العقد يتقاطع مع الفترة نفسها: ', '⚠ Another claim on this contract overlaps the same period: ')}
          <b style={{ fontFamily: 'monospace', direction: 'ltr' }}>{overlapClaim.claim_no}</b>
          {' (' + fmtD(overlapClaim.period_from) + ' → ' + fmtD(overlapClaim.period_to) + ')'}
          {T(' — تأكد أنك لا تفوتر الفترة مرتين.', ' — make sure you are not billing the period twice.')}
        </div>
      )}
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'var(--tx3)', lineHeight: 1.8 }}>
        {T('الكشف المعتمد يملأ البنود والفترة تلقائياً. تستطيع إنشاء مستخلص بلا كشف وتكتب البنود يدوياً.',
          'An approved sheet fills the items and period automatically. You may also create a claim without a sheet and enter the items manually.')}
      </div>
    </div>
  )

  const pgLines = frame(Receipt, T('بنود المستخلص', 'Claim Items'), null,
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 10 }}>
      <div className="sr-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingInlineEnd: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!f.lines.length && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('اختر كشف دوام أو أضف بنداً', 'Pick a timesheet or add an item')}</div>}
        {f.lines.map((l, i) => {
          const amt = n(l.normal_units) * n(l.unit_price) + n(l.ot_units) * lineOtRate(l, l.ot_multiplier)
          return (
            <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: C.gold }}>{l.item || T('بند', 'Item') + ' ' + (i + 1)}</span>
                {n(l.workers) > 0 && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', padding: '2px 8px', borderRadius: 6, background: 'var(--bd2)' }}>{nm0(l.workers)} {T('عامل', 'workers')}</span>}
                <span style={{ marginInlineStart: 'auto', fontSize: 11.5, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
                  {T('المبلغ', 'Amount')}: <b style={{ color: C.gold }}>{nm(amt)}</b>
                </span>
                <button onClick={() => setF(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} title={T('حذف', 'Remove')}
                  style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
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
      <button onClick={() => setF(p => ({ ...p, lines: [...p.lines, { item: T('بند يدوي', 'Manual item'), item_en: '', workers: 0, normal_units: '', ot_units: '', unit_price: '', ot_multiplier: 1.5 }] }))}
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

  /* خصم الغياب: الأيام × المعدل — يُعاد حسابه عند تعديل أيّهما، ويُكتب فوقه متى لزم */
  const setDeductionPart = (k, v) => setF(p => {
    const next = { ...p, [k]: v }
    const days = n(k === 'absent_days' ? v : next.absent_days)
    const rate = n(k === 'deduction_rate' ? v : next.deduction_rate)
    if (days && rate) next.deductions = String(Math.round(days * rate * 100) / 100)
    return next
  })
  const pgTotals = frame(Coins, T('الملخص المالي', 'Financial Summary'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={GRID}>
        <NumberField label={T('أيام الغياب', 'Absent days')} value={f.absent_days} onChange={v => setDeductionPart('absent_days', v)} min={0} />
        <CurrencyField label={T('خصم الغياب لليوم', 'Deduction / day')} value={f.deduction_rate} onChange={v => setDeductionPart('deduction_rate', v)} />
        <CurrencyField label={T('إجمالي الخصم', 'Total deduction')} value={f.deductions} onChange={v => set('deductions', v)} />
        <NumberField label={T('ضريبة القيمة المضافة %', 'VAT %')} value={f.vat_pct} onChange={v => set('vat_pct', v)} min={0} max={100} />
      </div>
      {/* تسويةٌ مرحّلة: مبلغٌ فات من شهرٍ سابق يُضاف هنا أو يُخصم، بملاحظةٍ تُطبع على الوثيقة */}
      <div style={GRID}>
        <Segmented label={T('اتجاه التسوية', 'Adjustment direction')} value={f.adj_minus ? 'minus' : 'plus'}
          onChange={v => set('adj_minus', v === 'minus')}
          options={[{ v: 'plus', l: T('إضافة للمستخلص', 'Add'), c: '#27a046' }, { v: 'minus', l: T('خصم منه', 'Deduct'), c: '#e5534b' }]} />
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
    { valid: !!f.contract_id && !!f.period_from && !!f.period_to, content: pgSource },
    { valid: activeLines.length > 0, content: pgLines },
    { valid: canSave, error: err, content: pgTotals },
  ]

  return (
    <FKModal open onClose={onClose} title={editRow ? T('تعديل المستخلص', 'Edit claim') : T('مستخلص جديد', 'New Progress Claim')}
      Icon={Receipt} width={940} height="min(720px, 92vh)" accent={C.gold} lang={lang}
      pages={pages} onSubmit={save} submitting={submitting}
      submitLabel={editRow ? T('حفظ التعديلات', 'Save changes') : T('حفظ المستخلص', 'Save claim')} submitIcon={BadgeCheck}
      success={savedRow ? <SuccessView title={T('تم حفظ المستخلص', 'Claim saved')} code={savedRow.claim_no} /> : null} />
  )
}
