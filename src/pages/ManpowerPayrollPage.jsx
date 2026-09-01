import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Wallet, Plus, Trash2, Pencil, BadgeCheck, ArrowRight, ArrowLeft, Printer, Coins, CalendarDays, Users,
} from 'lucide-react'
import {
  C, F, EmptyState, Modal as FKModal, ModalSection, TextArea, TextField, CurrencyField, NumberField,
  Select as FKSelect, DateField as FKDateField, GRID, SuccessView, ConfirmDialog,
} from '../components/ui/FormKit.jsx'
import { canTab, cardVisible, isGM, tabOffices } from '../lib/permissions.js'
import PageSkeleton from '../components/ui/Skeleton.jsx'
import BackButton from '../components/BackButton.jsx'
import { MpStats, MpBadge, MpSearch, mpMatch, mpRowHover } from '../lib/manpowerUi.jsx'
import { printManpowerPayroll } from '../lib/manpowerDocsPrint.js'
import { splitHours, countAbsents } from './ManpowerTimesheetsPage.jsx'

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nm0 = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const iso = d => { const x = new Date(d); return isNaN(x) ? '' : x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') }
const fmtD = d => d ? iso(d) || '—' : '—'
const monthKey = d => String(d || '').slice(0, 7)

export const PR_STATUS = {
  draft: { ar: 'مسودّة', en: 'Draft', c: 'var(--tx3)' },
  approved: { ar: 'معتمد', en: 'Approved', c: C.blue },
  paid: { ar: 'مصروف', en: 'Paid', c: '#27a046' },
}

/* حسبة صفّ العامل — نموذج كشوف رواتب المكتب الحقيقية: أجرٌ بالساعة، وأجر
   إضافيٍّ ثابت للساعة (لا مضاعف)، وعقوبة غيابٍ يومية فوق ضياع الأجر، وسلفة. */
export const payrollLineCalc = (l, penaltyRate) => {
  const basic = n(l.basic_hours) * n(l.wage_rate)
  const ot = n(l.ot_hours) * n(l.ot_wage)
  const penalty = n(l.absent_days) * n(penaltyRate)
  const net = basic + ot - penalty - n(l.advance)
  return { basic, ot, penalty, net }
}
export const payrollTotals = (lines, penaltyRate) => {
  const t = { hours: 0, ot: 0, absents: 0, basic: 0, otPay: 0, penalties: 0, advances: 0, net: 0 }
  ;(lines || []).forEach(l => {
    const c = payrollLineCalc(l, penaltyRate)
    t.hours += n(l.basic_hours); t.ot += n(l.ot_hours); t.absents += n(l.absent_days)
    t.basic += c.basic; t.otPay += c.ot; t.penalties += c.penalty; t.advances += n(l.advance); t.net += c.net
  })
  return t
}

export default function ManpowerPayrollPage({ sb, toast, user, lang = 'ar', emptyIcon }) {
  const T = (ar, en) => lang === 'en' ? en : ar
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  const [rows, setRows] = useState(null)
  const [sheets, setSheets] = useState([])
  const [contracts, setContracts] = useState([])
  const [rateCard, setRateCard] = useState([])
  const [invoices, setInvoices] = useState([])
  const [branches, setBranches] = useState([])
  const [usersById, setUsersById] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [detailsRow, setDetailsRow] = useState(null)
  const [delRow, setDelRow] = useState(null)
  const [q, setQ] = useState('')

  const canView = canTab(user, 'manpower_payroll')
  const canCreate = isGM(user) || canTab(user, 'manpower_payroll', 'create')
  const canEdit = isGM(user) || canTab(user, 'manpower_payroll', 'edit')
  const canDelete = isGM(user) || canTab(user, 'manpower_payroll', 'delete')
  const canApprove = isGM(user) || canTab(user, 'manpower_payroll', 'approve')
  const canPay = isGM(user) || canTab(user, 'manpower_payroll', 'pay')
  const canPrint = isGM(user) || canTab(user, 'manpower_payroll', 'print')
  // الأرباح وتقسيم الشركاء أرقامٌ سيادية — تُحجب عمّن لا يملك صلاحيتها
  const canPnl = isGM(user) || canTab(user, 'manpower_payroll', 'view_pnl')
  const officeScope = tabOffices(user, 'manpower_payroll')

  const load = useCallback(async () => {
    let prQ = sb.from('manpower_payrolls').select('*').order('month', { ascending: false }).limit(300)
    let tsQ = sb.from('manpower_timesheets').select('*').eq('status', 'approved').order('period_from', { ascending: false }).limit(500)
    let invQ = sb.from('manpower_invoices').select('id,branch_id,period_from,total,vat_amount,status').limit(500)
    if (officeScope) { prQ = prQ.in('branch_id', officeScope); tsQ = tsQ.in('branch_id', officeScope); invQ = invQ.in('branch_id', officeScope) }
    const [pr, ts, ct, rc, inv, b, u] = await Promise.all([
      prQ, tsQ,
      sb.from('manpower_contracts').select('id,contract_no,client_name,branch_id').limit(500),
      sb.from('manpower_rate_card').select('position_ar,position_en,wage_rate,ot_wage_rate').not('is_active', 'is', false),
      invQ,
      sb.from('branches').select('id,name_ar,branch_code').is('deleted_at', null).eq('is_active', true).order('name_ar'),
      sb.from('users').select('id,person:persons(name_ar,name_en)'),
    ])
    setRows(pr.data || []); setSheets(ts.data || []); setContracts(ct.data || [])
    setRateCard(rc.data || []); setInvoices(inv.data || [])
    setBranches((b.data || []).filter(x => !officeScope || officeScope.includes(x.id)))
    const map = {}; (u.data || []).forEach(x => { map[x.id] = x.person?.name_ar || x.person?.name_en || '' }); setUsersById(map)
    setDetailsRow(prev => prev ? (pr.data || []).find(r => r.id === prev.id) || prev : prev)
  }, [sb])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('manpower-payroll-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_payrolls' }, () => load()).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb, load])

  const branchLabel = id => { const b = branches.find(x => x.id === id); return b ? (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') : '—' }

  const setStatus = async (r, status) => {
    const patch = { status }
    if (status === 'approved') { patch.approved_by = user?.id || null; patch.approved_at = new Date().toISOString() }
    if (status === 'paid') patch.paid_at = new Date().toISOString()
    const { error } = await sb.from('manpower_payrolls').update(patch).eq('id', r.id)
    if (error) toast?.(T('تعذّر التحديث: ', 'Update failed: ') + error.message)
    else { toast?.(T('تم تحديث الحالة', 'Status updated')); load() }
  }

  if (!canView) return null

  const header = (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('الرواتب والأرباح', 'Payroll & P&L')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>
            {T('مسير رواتب العمال شهرياً من كشوف الدوام المعتمدة — يُطبع بتوقيع استلامٍ لكل عامل — وحساب أرباح الشهر وتقسيم الشركاء', "The monthly payroll register built from approved timesheets — printed with a per-worker signature column — plus the month's P&L and partner split")}
          </div>
        </div>
        {canCreate && <div className="page-cta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setEditRow(null); setShowModal(true) }} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            {T('كشف رواتب جديد', 'New payroll')}<Plus size={16} strokeWidth={2.2} />
          </button>
        </div>}
      </div>
    </div>
  )

  if (rows === null) return <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>{header}<PageSkeleton variant="table" cards={4} columns={7} rows={6} /></div>

  /* ═══════════════ التفاصيل ═══════════════ */
  if (detailsRow) {
    const r = detailsRow
    const st = PR_STATUS[r.status] || PR_STATUS.draft
    const tot = payrollTotals(r.lines, r.absence_penalty_rate)
    const remainder = r.revenue != null ? n(r.revenue) - tot.net - n(r.manager_profit) : null
    const partners = Array.isArray(r.partners) ? r.partners.filter(x => x?.name) : []
    const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
    const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
    const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
    const cell = (label, value, opts = {}) => (
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: opts.color || 'var(--tx1)', fontWeight: 600, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</span>
      </div>
    )
    const tblTh = { padding: '9px 10px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textAlign: 'center', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
    const tblTd = { padding: '9px 10px', fontSize: 12.5, fontWeight: 500, color: 'var(--tx1)', textAlign: 'center', borderBottom: '1px solid var(--bd)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
    const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

    return (
      <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <BackButton onClick={() => setDetailsRow(null)} label={T('رجوع', 'Back')} isAr={dir === 'rtl'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)' }}>{T('كشف رواتب ', 'Payroll ')}{monthKey(r.month)}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }}>{r.payroll_no} · {branchLabel(r.branch_id)}</div>
          </div>
          <MpBadge st={st} lang={lang} />
          {canApprove && r.status === 'draft' && <button onClick={() => setStatus(r, 'approved')} className="btn-primary-modal"
            style={{ height: 36, padding: '0 14px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <BadgeCheck size={14} strokeWidth={2.2} />{T('اعتماد الكشف', 'Approve')}</button>}
          {canPay && r.status === 'approved' && <button onClick={() => setStatus(r, 'paid')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #27a04655', background: 'transparent', color: '#27a046', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Coins size={13} />{T('تسجيل الصرف', 'Mark paid')}</button>}
          {canPrint && <>
            <button onClick={() => printManpowerPayroll(r, { lang: 'ar', showPnl: canPnl, branchName: branchLabel(r.branch_id) })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة المسير — عربي', 'Print register — Arabic')}</button>
            <button onClick={() => printManpowerPayroll(r, { lang: 'en', showPnl: canPnl, branchName: '' })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة المسير — إنجليزي', 'Print register — English')}</button>
          </>}
          {canEdit && r.status === 'draft' && <button onClick={() => { setEditRow(r); setShowModal(true) }}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Pencil size={13} />{T('تعديل', 'Edit')}</button>}
          {canDelete && r.status === 'draft' && <button onClick={() => setDelRow(r)}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Trash2 size={13} />{T('حذف', 'Delete')}</button>}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {cardVisible(user, 'manpower_payroll', 'header') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('ملخّص الكشف', 'Sheet Summary')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
              {cell(T('عدد العمال', 'Workers'), nm0((r.lines || []).length))}
              {cell(T('ساعات أساسية', 'Basic hours'), nm0(tot.hours), { color: '#27a046' })}
              {cell(T('ساعات إضافية', 'OT hours'), nm0(tot.ot), { color: '#d99f2b' })}
              {cell(T('أيام الغياب', 'Absent days'), nm0(tot.absents), { color: tot.absents ? '#e5534b' : 'var(--tx3)' })}
              {cell(T('إجمالي الرواتب', 'Gross salaries'), nm(tot.basic + tot.otPay))}
              {cell(T('خصوم الغياب', 'Absence penalties'), nm(tot.penalties), { color: '#e5534b' })}
              {cell(T('السُلف', 'Advances'), nm(tot.advances), { color: '#e5534b' })}
              {cell(T('صافي الرواتب', 'Net payable'), nm(tot.net), { color: C.gold })}
            </div>
            <div style={{ padding: '0 22px 16px', display: 'flex', gap: 14, fontSize: 11, color: 'var(--tx4)', flexWrap: 'wrap' }}>
              <span>{T('أنشأه', 'Created by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.created_by] || '—'}</b></span>
              {r.approved_at && <span>{T('اعتمده', 'Approved by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.approved_by] || '—'}</b> · {fmtD(r.approved_at)}</span>}
              {r.paid_at && <span>{T('صُرف في', 'Paid on')}: {fmtD(r.paid_at)}</span>}
            </div>
          </div>}

          {cardVisible(user, 'manpower_payroll', 'workers') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('رواتب العمال', 'Worker Salaries')}</span></div>
            <div style={{ padding: '10px 16px 16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={tblTh}>#</th><th style={{ ...tblTh, textAlign: 'start' }}>{T('العامل', 'Worker')}</th>
                  <th style={tblTh}>{T('المهنة', 'Trade')}</th>
                  <th style={tblTh}>{T('ساعات', 'Basic hr')}</th><th style={tblTh}>{T('إضافي', 'OT hr')}</th><th style={tblTh}>{T('غياب', 'Abs')}</th>
                  <th style={tblTh}>{T('الأجر/س', 'Rate/hr')}</th><th style={tblTh}>{T('الأساسي', 'Basic')}</th><th style={tblTh}>{T('الإضافي', 'OT pay')}</th>
                  <th style={tblTh}>{T('خصم غياب', 'Penalty')}</th><th style={tblTh}>{T('سلفة', 'Advance')}</th><th style={tblTh}>{T('الصافي', 'Net')}</th>
                </tr></thead>
                <tbody>
                  {(r.lines || []).map((l, i) => {
                    const c = payrollLineCalc(l, r.absence_penalty_rate)
                    return (
                      <tr key={i}>
                        <td style={tblTd}>{i + 1}</td>
                        <td style={{ ...tblTd, textAlign: 'start', fontWeight: 600 }}>{l.name}{l.iqama ? <span style={{ color: 'var(--tx4)', fontSize: 10.5, direction: 'ltr' }}> · {l.iqama}</span> : null}</td>
                        <td style={tblTd}>{l.trade || '—'}</td>
                        <td style={tblTd}>{nm0(l.basic_hours)}</td>
                        <td style={{ ...tblTd, color: '#d99f2b' }}>{nm0(l.ot_hours)}</td>
                        <td style={{ ...tblTd, color: n(l.absent_days) ? '#e5534b' : 'var(--tx5)' }}>{n(l.absent_days) || '·'}</td>
                        <td style={tblTd}>{nm(l.wage_rate)}</td>
                        <td style={tblTd}>{nm(c.basic)}</td>
                        <td style={{ ...tblTd, color: '#d99f2b' }}>{nm(c.ot)}</td>
                        <td style={{ ...tblTd, color: c.penalty ? '#e5534b' : 'var(--tx5)' }}>{c.penalty ? nm(c.penalty) : '·'}</td>
                        <td style={{ ...tblTd, color: n(l.advance) ? '#e5534b' : 'var(--tx5)' }}>{n(l.advance) ? nm(l.advance) : '·'}</td>
                        <td style={{ ...tblTd, color: C.gold, fontWeight: 600 }}>{nm(c.net)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>}

          {/* ── الأرباح وتقسيم الشركاء — بصلاحية view_pnl وحدها ── */}
          {canPnl && cardVisible(user, 'manpower_payroll', 'pnl') && r.revenue != null && <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: remainder >= 0 ? '#27a046' : '#e5534b' }} />
              <span style={cardTitle}>{T('أرباح الشهر', "Month P&L")}</span>
            </div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
              {cell(T('إيراد الشهر (قبل الضريبة)', 'Revenue (excl. VAT)'), nm(r.revenue), { color: '#27a046' })}
              {cell(T('صافي الرواتب', 'Net salaries'), nm(tot.net), { color: '#e5867a' })}
              {n(r.manager_profit) > 0 && cell(T('ربح الإدارة', 'Manager profit') + (n(r.manager_rate) ? ' (' + nm(r.manager_rate) + T('/ساعة', '/hr') + ')' : ''), nm(r.manager_profit), { color: C.blue })}
              {cell(T('المتبقي للتوزيع', 'Remainder'), nm(remainder), { color: remainder >= 0 ? '#27a046' : '#e5534b' })}
              {partners.map((x, i) => <React.Fragment key={i}>{cell(x.name + ' — ' + nm0(x.share_pct) + '%', nm(remainder > 0 ? remainder * n(x.share_pct) / 100 : 0), { color: C.gold })}</React.Fragment>)}
            </div>
          </div>}
        </div>

        {showModal && <PayrollModal sb={sb} T={T} lang={lang} user={user} branches={branches} sheets={sheets} contracts={contracts}
          rateCard={rateCard} invoices={invoices} canPnl={canPnl} editRow={editRow} existing={rows}
          onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
        <ConfirmDialog open={!!delRow} danger lang={lang}
          title={T('حذف كشف الرواتب', 'Delete payroll')} itemName={delRow?.payroll_no}
          message={T('سيُحذف الكشف نهائياً. كشوف الدوام لا تتأثر.', 'The payroll will be permanently deleted. Timesheets are unaffected.')}
          onCancel={() => setDelRow(null)}
          onConfirm={async () => {
            const { error } = await sb.from('manpower_payrolls').delete().eq('id', delRow.id)
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
  const stats = [
    { l: T('إجمالي الكشوف', 'Total payrolls'), v: nm0(rows.length), c: C.gold },
    { l: T('بانتظار الاعتماد', 'Awaiting approval'), v: nm0(rows.filter(r => r.status === 'draft').length), c: '#d99f2b' },
    { l: T('صافي رواتب آخر كشف', 'Latest net payable'), v: nm(rows.length ? payrollTotals(rows[0].lines, rows[0].absence_penalty_rate).net : 0), c: C.blue },
    { l: T('المصروفة', 'Paid out'), v: nm0(rows.filter(r => r.status === 'paid').length), c: '#27a046' },
  ]
  const shown = rows.filter(r => mpMatch(q, [r.payroll_no, monthKey(r.month), branchLabel(r.branch_id)]))

  return (
    <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
      {header}
      <MpStats stats={stats} dir={dir} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <MpSearch value={q} onChange={setQ} placeholder={T('ابحث برقم الكشف أو الشهر أو المكتب…', 'Search by payroll no., month or branch…')} />
      </div>

      {!shown.length ? (
        <EmptyState icon={emptyIcon || <Wallet size={22} color={C.gold} />} title={T('لا كشوف رواتب بعد', 'No payrolls yet')}
          desc={sheets.length ? T('أنشئ كشف الشهر من كشوف الدوام المعتمدة عبر الزر أعلاه', "Build the month's payroll from approved timesheets above") : T('اعتمد كشوف دوام أولاً — كشف الرواتب يُبنى عليها', 'Approve timesheets first — the payroll is built on them')} />
      ) : (
        <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>{T('رقم الكشف', 'Payroll no.')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الشهر', 'Month')}</th>
                <th style={th}>{T('المكتب', 'Branch')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('العمال', 'Workers')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('صافي الرواتب', 'Net payable')}</th>
                {canPnl && <th style={{ ...th, textAlign: 'center' }}>{T('المتبقي للتوزيع', 'Remainder')}</th>}
                <th style={{ ...th, textAlign: 'center' }}>{T('الحالة', 'Status')}</th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  const st = PR_STATUS[r.status] || PR_STATUS.draft
                  const tot = payrollTotals(r.lines, r.absence_penalty_rate)
                  const rem = r.revenue != null ? n(r.revenue) - tot.net - n(r.manager_profit) : null
                  return (
                    <tr key={r.id} onClick={() => setDetailsRow(r)} style={{ cursor: 'pointer', transition: 'background .12s' }} {...mpRowHover}>
                      <td style={{ ...td, fontFamily: 'monospace', color: C.gold, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{r.payroll_no}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{monthKey(r.month)}</td>
                      <td style={td}>{branchLabel(r.branch_id)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{nm0((r.lines || []).length)}</td>
                      <td style={{ ...td, textAlign: 'center', color: C.gold, fontWeight: 600 }}>{nm(tot.net)}</td>
                      {canPnl && <td style={{ ...td, textAlign: 'center', color: rem == null ? 'var(--tx4)' : rem >= 0 ? '#27a046' : '#e5534b', fontWeight: 600 }}>{rem == null ? '—' : nm(rem)}</td>}
                      <td style={{ ...td, textAlign: 'center' }}><MpBadge st={st} lang={lang} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <PayrollModal sb={sb} T={T} lang={lang} user={user} branches={branches} sheets={sheets} contracts={contracts}
        rateCard={rateCard} invoices={invoices} canPnl={canPnl} editRow={editRow} existing={rows}
        onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
    </div>
  )
}

/* ═══════════════ نافذة إنشاء / تعديل كشف رواتب ═══════════════ */
function PayrollModal({ sb, T, lang, user, branches, sheets, contracts, rateCard, invoices, canPnl, editRow, existing, onClose, onSaved }) {
  const today = new Date()
  const defaultMonth = iso(new Date(today.getFullYear(), today.getMonth(), 1))
  const [f, setF] = useState(() => editRow ? {
    month: editRow.month, branch_id: editRow.branch_id,
    timesheet_ids: Array.isArray(editRow.timesheet_ids) ? editRow.timesheet_ids : [],
    absence_penalty_rate: String(editRow.absence_penalty_rate ?? 55),
    lines: (editRow.lines || []).map(l => ({ ...l, basic_hours: String(l.basic_hours ?? ''), ot_hours: String(l.ot_hours ?? ''), absent_days: String(l.absent_days ?? ''), wage_rate: String(l.wage_rate ?? ''), ot_wage: String(l.ot_wage ?? ''), advance: String(l.advance ?? '') })),
    revenue: editRow.revenue == null ? '' : String(editRow.revenue),
    manager_rate: String(editRow.manager_rate ?? 1), manager_profit: String(editRow.manager_profit ?? ''),
    partners: (Array.isArray(editRow.partners) && editRow.partners.length ? editRow.partners : [{ name: '', share_pct: '' }]).map(x => ({ name: x.name || '', share_pct: String(x.share_pct ?? '') })),
    notes: editRow.notes || '',
  } : {
    month: defaultMonth, branch_id: user?.primary_branch_id || null,
    timesheet_ids: [], absence_penalty_rate: '55', lines: [],
    revenue: '', manager_rate: '1', manager_profit: '',
    partners: [{ name: '', share_pct: '' }], notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [savedRow, setSavedRow] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setLine = (i, k, v) => setF(p => { const a = p.lines.slice(); a[i] = { ...a[i], [k]: v }; return { ...p, lines: a } })

  /* كشوف الشهر المعتمدة — الكشف يدخل بشهر بداية فترته */
  const monthSheets = useMemo(() => (sheets || []).filter(s => monthKey(s.period_from) === monthKey(f.month)), [sheets, f.month])
  /* مسير قائم لنفس الشهر والمكتب — تحذير لا منع: قد يُقصد مسير تكميلي */
  const dupPayroll = useMemo(() => (existing || []).find(r => r.id !== editRow?.id
    && monthKey(r.month) === monthKey(f.month)
    && (r.branch_id || null) === (f.branch_id || null)), [existing, editRow, f.month, f.branch_id])
  const contractLabel = id => { const c = (contracts || []).find(x => x.id === id); return c ? c.contract_no + ' — ' + (c.client_name || '') : '—' }

  /* أجر المهنة المقترح من بطاقة الأسعار (تكلفة داخلية) — يُكتب فوقه لعاملٍ بعينه */
  const wageOf = trade => {
    const rc = (rateCard || []).find(x => x.position_ar === trade || x.position_en === trade)
    return { wage: rc?.wage_rate ?? '', ot: rc?.ot_wage_rate ?? 5 }
  }

  /* توليد صفوف العمال من الكشوف المحدّدة — يجمع ساعات العامل الواحد عبر
     كشوفٍ عدة (اسم + إقامة)، فلا يتكرّر عاملٌ عمل على عقدين في الشهر نفسه. */
  const buildLines = (ids) => {
    const byKey = new Map()
    ;(sheets || []).filter(s => ids.includes(s.id)).forEach(s => {
      ;(s.lines || []).forEach(l => {
        const split = splitHours(l.days, s.hours_per_day)
        const abs = countAbsents(l.days)
        const key = (l.worker_name || '').trim() + '|' + (l.iqama || '')
        if (!byKey.has(key)) {
          const sug = wageOf(l.trade || l.trade_en)
          byKey.set(key, { worker_id: l.worker_id || null, name: (l.worker_name || '').trim(), iqama: l.iqama || '', trade: l.trade || '', trade_en: l.trade_en || '', basic_hours: 0, ot_hours: 0, absent_days: 0, wage_rate: String(sug.wage), ot_wage: String(sug.ot), advance: '' })
        }
        const row = byKey.get(key)
        row.basic_hours += split.normal; row.ot_hours += split.ot; row.absent_days += abs
      })
    })
    return Array.from(byKey.values()).map(r => ({ ...r, basic_hours: String(r.basic_hours), ot_hours: String(r.ot_hours), absent_days: String(r.absent_days || '') }))
  }
  /* إعادة البناء تحافظ على ما كتبه المستخدم يدوياً (أجر/سلفة/أجر إضافي) —
     الساعات وحدها تُحدَّث من الكشوف، فلا يضيع إدخالٌ بتبديل كشف. */
  const toggleSheet = (id) => setF(p => {
    const ids = p.timesheet_ids.includes(id) ? p.timesheet_ids.filter(x => x !== id) : [...p.timesheet_ids, id]
    const prev = new Map(p.lines.map(l => [(l.name || '').trim() + '|' + (l.iqama || ''), l]))
    const lines = buildLines(ids).map(l => {
      const old = prev.get((l.name || '').trim() + '|' + (l.iqama || ''))
      return old ? { ...l, wage_rate: old.wage_rate, ot_wage: old.ot_wage, advance: old.advance } : l
    })
    return { ...p, timesheet_ids: ids, lines }
  })

  /* إيراد الشهر المقترح: فواتير الشهر (غير الملغاة) قبل الضريبة — لمكتب الكشف وحده */
  const monthRevenue = useMemo(() => (invoices || [])
    .filter(v => v.status !== 'cancelled' && v.status !== 'draft'
      && monthKey(v.period_from) === monthKey(f.month)
      && (!f.branch_id || v.branch_id === f.branch_id))
    .reduce((t, v) => t + n(v.total) - n(v.vat_amount), 0), [invoices, f.month, f.branch_id])

  const activeLines = f.lines.filter(l => (l.name || '').trim() && (n(l.basic_hours) > 0 || n(l.ot_hours) > 0 || n(l.advance) > 0))
  const tot = payrollTotals(activeLines, f.absence_penalty_rate)
  /* ربح الإدارة: معدل/ساعة × إجمالي الساعات — نمط «ريال عن كل ساعة عمل» في كشوف المكتب */
  const managerProfit = f.manager_profit !== '' ? n(f.manager_profit) : n(f.manager_rate) * (tot.hours + tot.ot)
  const canSave = !!f.month && activeLines.length > 0

  const save = async () => {
    if (!canSave || submitting) return
    setSubmitting(true); setErr(null)
    const payload = {
      month: monthKey(f.month) + '-01', branch_id: f.branch_id || null,
      timesheet_ids: f.timesheet_ids,
      absence_penalty_rate: n(f.absence_penalty_rate),
      lines: activeLines.map(l => ({
        worker_id: l.worker_id || null, name: l.name.trim(), iqama: l.iqama || '', trade: l.trade || '', trade_en: l.trade_en || '',
        basic_hours: n(l.basic_hours), ot_hours: n(l.ot_hours), absent_days: n(l.absent_days),
        wage_rate: n(l.wage_rate), ot_wage: n(l.ot_wage), advance: n(l.advance),
      })),
      total_hours: tot.hours, ot_hours: tot.ot,
      basic_total: Math.round(tot.basic * 100) / 100, ot_total: Math.round(tot.otPay * 100) / 100,
      penalties_total: Math.round(tot.penalties * 100) / 100, advances_total: Math.round(tot.advances * 100) / 100,
      net_total: Math.round(tot.net * 100) / 100,
      revenue: f.revenue === '' ? null : n(f.revenue),
      manager_rate: n(f.manager_rate), manager_profit: Math.round(managerProfit * 100) / 100,
      partners: f.partners.filter(x => x.name.trim() && n(x.share_pct) > 0).map(x => ({ name: x.name.trim(), share_pct: n(x.share_pct) })),
      notes: f.notes.trim() || null,
    }
    try {
      if (editRow?.id) {
        const { data, error } = await sb.from('manpower_payrolls').update(payload).eq('id', editRow.id).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      } else {
        const { data, error } = await sb.from('manpower_payrolls').insert({ ...payload, created_by: user?.id || null }).select('*').single()
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

  /* ── الخطوة 1: الشهر والكشوف ── */
  const pgSource = frame(CalendarDays, T('الشهر والمصدر', 'Month & Source'), null,
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 14 }}>
      <div style={row2}>
        <FKDateField label={T('شهر الكشف (اختر أي يوم فيه)', 'Payroll month (pick any day in it)')} value={f.month} onChange={v => setF(p => ({ ...p, month: v, timesheet_ids: [], lines: p.lines.length && editRow ? p.lines : [] }))} />
        <FKSelect label={T('المكتب', 'Branch')} value={f.branch_id} onChange={v => set('branch_id', v)}
          options={(branches || []).map(b => ({ v: b.id, l: (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') }))}
          getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المكتب', 'Pick a branch')} />
      </div>
      {dupPayroll && (
        <div style={{ background: '#d99f2b12', border: '1px solid #d99f2b55', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: '#d99f2b', lineHeight: 1.8 }}>
          {T('⚠ يوجد مسير قائم لهذا الشهر والمكتب: ', '⚠ A payroll register already exists for this month and branch: ')}
          <b style={{ fontFamily: 'monospace', direction: 'ltr' }}>{dupPayroll.payroll_no}</b>
          {T(' — تأكد أنك لا تكرّر صرف الرواتب نفسها.', ' — make sure you are not paying the same salaries twice.')}
        </div>
      )}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.gold }}>{T('كشوف الدوام المعتمدة لهذا الشهر — اختر ما يدخل في الرواتب', "This month's approved timesheets — pick which feed the payroll")}</div>
      <div className="sr-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!monthSheets.length && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('لا كشوف معتمدة في هذا الشهر', 'No approved sheets in this month')}</div>}
        {monthSheets.map(s => {
          const on = f.timesheet_ids.includes(s.id)
          return (
            <button key={s.id} onClick={() => toggleSheet(s.id)}
              style={{ textAlign: 'start', padding: '11px 14px', borderRadius: 11, cursor: 'pointer', fontFamily: F,
                border: '1px solid ' + (on ? C.gold : 'var(--bd)'), background: on ? C.gold + '10' : 'var(--inputBg)',
                display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: '1.5px solid ' + (on ? C.gold : 'var(--tx4)'), background: on ? C.gold : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 600 }}>{on ? '✓' : ''}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx1)', display: 'block' }}>{contractLabel(s.contract_id)}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontVariantNumeric: 'tabular-nums' }}>{s.sheet_no} · {fmtD(s.period_from)} → {fmtD(s.period_to)} · {nm0(s.workers_count)} {T('عامل', 'workers')}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )

  /* ── الخطوة 2: رواتب العمال — شبكة تحرير مباشرة ── */
  const cellIn = { width: 64, height: 30, padding: '0 4px', border: '1px solid var(--bd)', borderRadius: 7, background: 'var(--fk-input-bg)', color: 'var(--tx)', fontFamily: F, fontSize: 11.5, fontWeight: 600, textAlign: 'center', outline: 'none' }
  const gTh = { padding: '6px 5px', fontSize: 10.5, fontWeight: 600, color: 'var(--tx3)', textAlign: 'center', whiteSpace: 'nowrap' }
  const pgWorkers = frame(Users, T('رواتب العمال', 'Worker Salaries'),
    T('الساعات من الكشوف — الأجر مقترح من بطاقة الأسعار ويُكتب فوقه', 'Hours come from the sheets — wages are suggested from the rate card and can be overridden'),
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 10 }}>
      {!f.lines.length ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('اختر كشوف الدوام أولاً', 'Pick the timesheets first')}</div>
      ) : (
        <>
          <div className="sr-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: '3px 4px', minWidth: '100%' }}>
              <thead><tr>
                <th style={{ ...gTh, textAlign: 'start', position: 'sticky', insetInlineStart: 0, background: 'var(--modal-bg)', zIndex: 2, minWidth: 170 }}>{T('العامل', 'Worker')}</th>
                <th style={gTh}>{T('ساعات', 'Basic hr')}</th><th style={gTh}>{T('إضافي', 'OT hr')}</th><th style={gTh}>{T('غياب', 'Abs')}</th>
                <th style={gTh}>{T('الأجر/س', 'Rate/hr')}</th><th style={gTh}>{T('أجر الإضافي/س', 'OT wage/hr')}</th>
                <th style={gTh}>{T('سلفة', 'Advance')}</th><th style={gTh}>{T('الصافي', 'Net')}</th><th style={gTh}></th>
              </tr></thead>
              <tbody>
                {f.lines.map((l, i) => {
                  const c = payrollLineCalc(l, f.absence_penalty_rate)
                  return (
                    <tr key={i}>
                      <td style={{ position: 'sticky', insetInlineStart: 0, background: 'var(--modal-bg)', zIndex: 1, paddingInlineEnd: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>{l.name || '—'}</div>
                        <div style={{ fontSize: 10, color: 'var(--tx4)' }}>{l.trade || '—'}</div>
                      </td>
                      {['basic_hours', 'ot_hours', 'absent_days', 'wage_rate', 'ot_wage', 'advance'].map(k => (
                        <td key={k}><input inputMode="decimal" value={l[k] ?? ''} onChange={e => setLine(i, k, e.target.value)} style={cellIn} /></td>
                      ))}
                      <td style={{ ...gTh, color: C.gold, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{nm(c.net)}</td>
                      <td>
                        <button onClick={() => setF(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} title={T('حذف', 'Remove')}
                          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
            {/* CurrencyField لأن المعدل قد يكون كسرياً (55.5) وNumberField لا يقبل الفاصلة */}
            <CurrencyField label={T('خصم الغياب لليوم', 'Absence penalty / day')} value={f.absence_penalty_rate} onChange={v => set('absence_penalty_rate', v)} />
            <span style={{ marginInlineStart: 'auto', fontSize: 12, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
              {T('إجمالي', 'Gross')}: <b style={{ color: 'var(--tx1)' }}>{nm(tot.basic + tot.otPay)}</b>
              {' · '}{T('خصوم', 'Penalties')}: <b style={{ color: '#e5534b' }}>{nm(tot.penalties)}</b>
              {' · '}{T('سُلف', 'Advances')}: <b style={{ color: '#e5534b' }}>{nm(tot.advances)}</b>
              {' · '}{T('الصافي', 'Net')}: <b style={{ color: C.gold }}>{nm(tot.net)}</b>
            </span>
          </div>
        </>
      )}
    </div>
  )

  /* ── الخطوة 3: الأرباح وتقسيم الشركاء — لمن يملك view_pnl ── */
  const remainder = f.revenue === '' ? null : n(f.revenue) - tot.net - managerProfit
  const setPartner = (i, k, v) => setF(p => { const a = p.partners.slice(); a[i] = { ...a[i], [k]: v }; return { ...p, partners: a } })
  const pgPnl = frame(Coins, T('الأرباح وتقسيم الشركاء', "P&L & Partner Split"),
    T('الإيراد قبل الضريبة — الضريبة تحصيلٌ للهيئة لا يدخل الربح', 'Revenue excl. VAT — VAT is collected for ZATCA and is not profit'),
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={GRID}>
        <CurrencyField label={T('إيراد الشهر (قبل الضريبة)', 'Month revenue (excl. VAT)')} value={f.revenue} onChange={v => set('revenue', v)} />
        <CurrencyField label={T('ربح الإدارة / ساعة', 'Manager profit / hour')} value={f.manager_rate} onChange={v => setF(p => ({ ...p, manager_rate: v, manager_profit: '' }))} />
        <CurrencyField label={T('ربح الإدارة (المحسوب)', 'Manager profit (computed)')} value={String(Math.round(managerProfit * 100) / 100 || '')} onChange={v => set('manager_profit', v)} />
      </div>
      {monthRevenue > 0 && <button onClick={() => set('revenue', String(Math.round(monthRevenue * 100) / 100))}
        style={{ alignSelf: 'flex-start', height: 30, padding: '0 12px', borderRadius: 9, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
        {T('اقتراح من فواتير الشهر: ', 'Suggest from month invoices: ') + nm(monthRevenue)}</button>}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.gold, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{T('الشركاء وحصصهم من المتبقي', 'Partners & shares of the remainder')}</span><span style={{ flex: 1, height: 1, background: 'var(--bd)' }} />
      </div>
      {f.partners.map((x, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}><TextField label={i === 0 ? T('اسم الشريك', 'Partner name') : undefined} value={x.name} onChange={v => setPartner(i, 'name', v)} /></div>
          <div style={{ flex: 1 }}><NumberField label={i === 0 ? T('الحصة %', 'Share %') : undefined} value={x.share_pct} onChange={v => setPartner(i, 'share_pct', v)} min={0} max={100} /></div>
          <div style={{ flex: 1.2, paddingBottom: 10, fontSize: 12.5, fontWeight: 600, color: C.gold, fontVariantNumeric: 'tabular-nums', direction: 'ltr', textAlign: 'center' }}>
            {remainder != null && n(x.share_pct) > 0 ? nm(Math.max(0, remainder) * n(x.share_pct) / 100) : '—'}
          </div>
          {f.partners.length > 1 && <button onClick={() => setF(p => ({ ...p, partners: p.partners.filter((_, j) => j !== i) }))}
            style={{ width: 30, height: 42, borderRadius: 9, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={14} /></button>}
        </div>
      ))}
      {f.partners.length < 6 && <button onClick={() => setF(p => ({ ...p, partners: [...p.partners, { name: '', share_pct: '' }] }))}
        style={{ alignSelf: 'flex-start', height: 30, padding: '0 12px', borderRadius: 9, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Plus size={12} strokeWidth={2.4} />{T('إضافة شريك', 'Add partner')}</button>}
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>{T('المتبقي للتوزيع = الإيراد − الرواتب − ربح الإدارة', 'Remainder = revenue − salaries − manager profit')}</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: remainder == null ? 'var(--tx4)' : remainder >= 0 ? '#27a046' : '#e5534b', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{remainder == null ? '—' : nm(remainder)}</span>
      </div>
      <TextArea label={T('ملاحظات', 'Notes')} value={f.notes} onChange={v => set('notes', v)} rows={2} full />
    </div>
  )

  const pages = [
    { valid: !!f.month, content: pgSource },
    { valid: activeLines.length > 0, content: pgWorkers },
    ...(canPnl ? [{ valid: canSave, error: err, content: pgPnl }] : []),
  ]
  if (!canPnl && pages.length) pages[pages.length - 1] = { ...pages[pages.length - 1], valid: canSave, error: err }

  return (
    <FKModal open onClose={onClose} title={editRow ? T('تعديل كشف الرواتب', 'Edit payroll') : T('كشف رواتب جديد', 'New Payroll')}
      Icon={Wallet} width={1060} height="min(720px, 92vh)" accent={C.gold} lang={lang}
      pages={pages} onSubmit={save} submitting={submitting}
      submitLabel={editRow ? T('حفظ التعديلات', 'Save changes') : T('حفظ الكشف', 'Save payroll')} submitIcon={BadgeCheck}
      success={savedRow ? <SuccessView title={T('حُفظ كشف الرواتب', 'Payroll saved')} code={savedRow.payroll_no} /> : null} />
  )
}
