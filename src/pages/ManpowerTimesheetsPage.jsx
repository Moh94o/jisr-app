import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CalendarDays, Plus, Trash2, Pencil, BadgeCheck, ArrowRight, ArrowLeft, FileText,
} from 'lucide-react'
import {
  C, F, EmptyState, Modal as FKModal, ModalSection, TextField, NumberField, CurrencyField,
  Select as FKSelect, DateField as FKDateField, GRID, SuccessView, ConfirmDialog,
} from '../components/ui/FormKit.jsx'
import { canTab, cardVisible, isGM, tabOffices } from '../lib/permissions.js'
import PageSkeleton from '../components/ui/Skeleton.jsx'
import BackButton from '../components/BackButton.jsx'
import { MpStats, MpBadge, MpSearch, mpMatch, mpRowHover } from '../lib/manpowerUi.jsx'
import { printManpowerTimesheet } from '../lib/manpowerDocsPrint.js'
import { Printer } from 'lucide-react'

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const iso = d => { const x = new Date(d); return isNaN(x) ? '' : x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') }
const fmtD = d => d ? iso(d) || '—' : '—'

export const TS_STATUS = {
  draft: { ar: 'مسودّة', en: 'Draft', c: 'var(--tx3)' },
  submitted: { ar: 'مُقدَّم', en: 'Submitted', c: '#d99f2b' },
  approved: { ar: 'معتمد', en: 'Approved', c: '#27a046' },
}

/* نهاية الأسبوع السعودية: الجمعة (5) والسبت (6) — ساعاتها كلها وقتٌ إضافي */
const isWeekend = dstr => { const d = new Date(dstr + 'T00:00:00'); const w = d.getDay(); return w === 5 || w === 6 }

/* كل أيام الفترة، لبناء أعمدة الشبكة */
export const daysBetween = (from, to) => {
  if (!from || !to) return []
  const a = new Date(from + 'T00:00:00'), b = new Date(to + 'T00:00:00')
  if (isNaN(a) || isNaN(b) || b < a) return []
  const out = []
  for (let d = new Date(a); d <= b && out.length < 62; d.setDate(d.getDate() + 1)) out.push(iso(d))
  return out
}

/* خلية اليوم إمّا ساعات وإمّا رمز — كما في كشوف المكتب الورقية الحقيقية:
   A/غ غائب · F/ج جمعة (راحة) · H/ع عطلة رسمية. الرموز صفر ساعات، وA وحدها
   تُعدّ غياباً يُخصم عنه. */
export const DAY_CODES = { A: 'A', F: 'F', H: 'H', 'غ': 'A', 'ج': 'F', 'ع': 'H' }
export const dayCode = v => { const s = String(v ?? '').trim(); return DAY_CODES[s.toUpperCase()] || DAY_CODES[s] || null }

/* الساعات تُقسم عادياً وإضافياً: حتى حدّ ساعات اليوم عادي، وما زاد إضافي —
   بسعر الإضافي المستقل للمهنة (لا مضاعف). عمل الجمعة يُحتسب بالسعر العادي
   كما في عقودنا («يُحتسب بالسعر نفسه»)، فلا يُقلب إضافياً. */
export const splitHours = (days, hoursPerDay) => {
  const hpd = n(hoursPerDay) || 10
  let normal = 0, ot = 0
  Object.values(days || {}).forEach(v => {
    if (dayCode(v)) return
    const h = n(v)
    if (h <= 0) return
    normal += Math.min(h, hpd)
    ot += Math.max(0, h - hpd)
  })
  return { normal, ot }
}

/* أيام الغياب — تُخصم من فاتورة العميل (سكن/إعاشة) ومن راتب العامل معاً */
export const countAbsents = (days) => Object.values(days || {}).filter(v => dayCode(v) === 'A').length

/* سعر الساعة الإضافية للصف: سعره المستقل إن وُجد، وإلا السعر × المضاعف */
export const lineOtRate = (l, otx) => n(l.ot_rate) || n(l.unit_price) * (n(otx) || 1.5)

export const sheetTotals = (sheet) => {
  const hpd = n(sheet.hours_per_day) || 10
  let normal = 0, ot = 0, amount = 0, absents = 0
  ;(sheet.lines || []).forEach(l => {
    const s = splitHours(l.days, hpd)
    normal += s.normal; ot += s.ot; absents += countAbsents(l.days)
    amount += s.normal * n(l.unit_price) + s.ot * lineOtRate(l, sheet.ot_multiplier)
  })
  return { normal, ot, amount, absents, workers: (sheet.lines || []).length }
}

export default function ManpowerTimesheetsPage({ sb, toast, user, lang = 'ar', emptyIcon }) {
  const T = (ar, en) => lang === 'en' ? en : ar
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  const [rows, setRows] = useState(null)
  const [contracts, setContracts] = useState([])
  const [pool, setPool] = useState([])
  const [usersById, setUsersById] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [detailsRow, setDetailsRow] = useState(null)
  const [delRow, setDelRow] = useState(null)
  const [q, setQ] = useState('')

  const canView = canTab(user, 'manpower_timesheets')
  const canCreate = isGM(user) || canTab(user, 'manpower_timesheets', 'create')
  const canEdit = isGM(user) || canTab(user, 'manpower_timesheets', 'edit')
  const canDelete = isGM(user) || canTab(user, 'manpower_timesheets', 'delete')
  const canApprove = isGM(user) || canTab(user, 'manpower_timesheets', 'approve')
  const canPrint = isGM(user) || canTab(user, 'manpower_timesheets', 'print')
  // نطاق المكاتب — غير المدير العام يرى كشوف مكاتبه وحدها، كسائر صفحات النظام
  const officeScope = tabOffices(user, 'manpower_timesheets')

  const load = useCallback(async () => {
    let tsQ = sb.from('manpower_timesheets').select('*').order('period_from', { ascending: false }).limit(500)
    let ctQ = sb.from('manpower_contracts').select('*').order('created_at', { ascending: false }).limit(500)
    if (officeScope) { tsQ = tsQ.in('branch_id', officeScope); ctQ = ctQ.in('branch_id', officeScope) }
    const [ts, ct, u, lp] = await Promise.all([
      tsQ, ctQ,
      sb.from('users').select('id,person:persons(name_ar,name_en)'),
      sb.from('manpower_labor_pool').select('id,full_name,trade,trade_en,phone,status,id_number').limit(2000),
    ])
    setRows(ts.data || []); setContracts(ct.data || []); setPool(lp.data || [])
    const map = {}; (u.data || []).forEach(x => { map[x.id] = x.person?.name_ar || x.person?.name_en || '' }); setUsersById(map)
    setDetailsRow(prev => prev ? (ts.data || []).find(r => r.id === prev.id) || prev : prev)
  }, [sb])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('manpower-timesheets-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_timesheets' }, () => load()).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb, load])

  const contractOf = id => contracts.find(c => c.id === id)
  const contractLabel = id => { const c = contractOf(id); return c ? c.contract_no + ' — ' + (c.client_name || '') : '—' }

  const setStatus = async (row, status) => {
    const patch = { status }
    if (status === 'approved') { patch.approved_by = user?.id || null; patch.approved_at = new Date().toISOString() }
    const { error } = await sb.from('manpower_timesheets').update(patch).eq('id', row.id)
    if (error) toast?.(T('تعذّر التحديث: ', 'Update failed: ') + error.message)
    else { toast?.(T('تم تحديث الحالة', 'Status updated')); load() }
  }

  if (!canView) return null

  const header = (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('كشوف الدوام', 'Timesheets')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>
            {T('ساعات كل عامل يوماً بيوم على العقد — الكشف المعتمد هو أساس المستخلص', "Each worker's hours day by day on the contract — the approved sheet is the basis of the claim")}
          </div>
        </div>
        {canCreate && <div className="page-cta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setEditRow(null); setShowModal(true) }} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            {T('كشف دوام جديد', 'New timesheet')}<Plus size={16} strokeWidth={2.2} />
          </button>
        </div>}
      </div>
    </div>
  )

  if (rows === null) return <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>{header}<PageSkeleton variant="table" cards={4} columns={7} rows={6} /></div>

  /* ═══════════════ التفاصيل ═══════════════ */
  if (detailsRow) {
    const r = detailsRow
    const st = TS_STATUS[r.status] || TS_STATUS.draft
    const tot = sheetTotals(r)
    const days = daysBetween(r.period_from, r.period_to)
    const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
    const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
    const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
    const cell = (label, value, opts = {}) => (
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: opts.color || 'var(--tx1)', fontWeight: 600, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</span>
      </div>
    )
    const gTh = { padding: '7px 6px', fontSize: 10.5, fontWeight: 600, color: 'var(--tx3)', textAlign: 'center', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
    const gTd = { padding: '7px 6px', fontSize: 12, fontWeight: 500, color: 'var(--tx1)', textAlign: 'center', borderBottom: '1px solid var(--bd)', fontVariantNumeric: 'tabular-nums' }
    const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

    return (
      <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <BackButton onClick={() => setDetailsRow(null)} label={T('رجوع', 'Back')} isAr={dir === 'rtl'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)' }}>{contractLabel(r.contract_id)}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }}>{r.sheet_no} · {fmtD(r.period_from)} → {fmtD(r.period_to)}</div>
          </div>
          <MpBadge st={st} lang={lang} />
          {canEdit && r.status !== 'approved' && <button onClick={() => { setEditRow(r); setShowModal(true) }}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Pencil size={13} />{T('تعديل', 'Edit')}</button>}
          {canApprove && r.status === 'draft' && <button onClick={() => setStatus(r, 'submitted')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #d99f2b55', background: 'transparent', color: '#d99f2b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{T('تقديم', 'Submit')}</button>}
          {canApprove && r.status === 'submitted' && <button onClick={() => setStatus(r, 'approved')}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid #27a04655', background: 'transparent', color: '#27a046', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <BadgeCheck size={13} />{T('اعتماد', 'Approve')}</button>}
          {canPrint && <button onClick={() => printManpowerTimesheet(r, { contract: contractOf(r.contract_id), lang, dayList: daysBetween(r.period_from, r.period_to), splitFn: splitHours, absentFn: countAbsents })}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Printer size={13} />{T('طباعة الكشف', 'Print sheet')}</button>}
          {canDelete && r.status !== 'approved' && <button onClick={() => setDelRow(r)}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Trash2 size={13} />{T('حذف', 'Delete')}</button>}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {cardVisible(user, 'manpower_timesheets', 'summary') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('ملخّص الساعات', 'Hours Summary')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
              {cell(T('عدد العمال', 'Workers'), nm(tot.workers))}
              {cell(T('ساعات عادية', 'Normal hours'), nm(tot.normal), { color: '#27a046' })}
              {cell(T('ساعات إضافية', 'Overtime hours'), nm(tot.ot), { color: '#d99f2b' })}
              {cell(T('أيام الغياب', 'Absent days'), nm(tot.absents), { color: tot.absents ? '#e5534b' : 'var(--tx3)' })}
              {cell(T('ساعات اليوم', 'Hours/day'), nm(r.hours_per_day))}
              {cell(T('القيمة المستحقّة', 'Amount due'), nm(tot.amount), { color: C.gold })}
            </div>
            <div style={{ padding: '0 22px 16px', display: 'flex', gap: 14, fontSize: 11, color: 'var(--tx4)', flexWrap: 'wrap' }}>
              <span>{T('أنشأه', 'Created by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.created_by] || '—'}</b></span>
              {r.approved_at && <span>{T('اعتمده', 'Approved by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.approved_by] || '—'}</b> · {fmtD(r.approved_at)}</span>}
            </div>
          </div>}

          {cardVisible(user, 'manpower_timesheets', 'grid') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('شبكة الدوام', 'Attendance Grid')}</span></div>
            <div style={{ padding: '10px 16px 16px', overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                <thead><tr>
                  <th style={{ ...gTh, textAlign: 'start', position: 'sticky', insetInlineStart: 0, background: 'var(--card-bg)', minWidth: 160 }}>{T('العامل', 'Worker')}</th>
                  {days.map(d => <th key={d} style={{ ...gTh, color: isWeekend(d) ? '#d99f2b' : 'var(--tx3)', minWidth: 34 }}>{d.slice(8)}</th>)}
                  <th style={{ ...gTh, color: '#27a046' }}>{T('عادي', 'Normal')}</th>
                  <th style={{ ...gTh, color: '#d99f2b' }}>{T('إضافي', 'OT')}</th>
                  <th style={{ ...gTh, color: '#e5534b' }}>{T('غياب', 'Abs')}</th>
                  <th style={{ ...gTh, color: C.gold }}>{T('المبلغ', 'Amount')}</th>
                </tr></thead>
                <tbody>
                  {(r.lines || []).map((l, i) => {
                    const s = splitHours(l.days, r.hours_per_day)
                    const abs = countAbsents(l.days)
                    const amt = s.normal * n(l.unit_price) + s.ot * lineOtRate(l, r.ot_multiplier)
                    return (
                      <tr key={i}>
                        <td style={{ ...gTd, textAlign: 'start', position: 'sticky', insetInlineStart: 0, background: 'var(--card-bg)', fontWeight: 600 }}>
                          {l.worker_name}<div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{l.trade} · {nm(l.unit_price)}{n(l.ot_rate) ? ' / ' + nm(l.ot_rate) : ''}</div>
                        </td>
                        {days.map(d => {
                          const code = dayCode(l.days?.[d])
                          const h = code ? 0 : n(l.days?.[d])
                          return <td key={d} style={{ ...gTd,
                            color: code === 'A' ? '#e5534b' : code ? 'var(--tx4)' : h ? (isWeekend(d) ? '#d99f2b' : 'var(--tx1)') : 'var(--tx5)',
                            fontWeight: code === 'A' ? 600 : 500,
                            background: isWeekend(d) ? 'var(--bd2)' : 'transparent' }}>{code || h || '·'}</td>
                        })}
                        <td style={{ ...gTd, color: '#27a046', fontWeight: 600 }}>{nm(s.normal)}</td>
                        <td style={{ ...gTd, color: '#d99f2b', fontWeight: 600 }}>{nm(s.ot)}</td>
                        <td style={{ ...gTd, color: abs ? '#e5534b' : 'var(--tx5)', fontWeight: 600 }}>{abs || '·'}</td>
                        <td style={{ ...gTd, color: C.gold, fontWeight: 600 }}>{nm(amt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>}
        </div>

        {showModal && <TimesheetModal sb={sb} T={T} lang={lang} user={user} contracts={contracts} pool={pool} editRow={editRow}
          onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
        <ConfirmDialog open={!!delRow} danger lang={lang}
          title={T('حذف كشف الدوام', 'Delete timesheet')} itemName={delRow?.sheet_no}
          message={T('سيُحذف الكشف نهائياً. المستخلصات المبنية عليه لا تُحذف.', 'The sheet will be permanently deleted. Claims built on it are not deleted.')}
          onCancel={() => setDelRow(null)}
          onConfirm={async () => {
            const { error } = await sb.from('manpower_timesheets').delete().eq('id', delRow.id)
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
    { l: T('إجمالي الكشوف', 'Total sheets'), v: rows.length, c: C.gold },
    { l: T('بانتظار الاعتماد', 'Awaiting approval'), v: rows.filter(r => r.status === 'submitted').length, c: '#d99f2b' },
    { l: T('معتمدة', 'Approved'), v: rows.filter(r => r.status === 'approved').length, c: '#27a046' },
    { l: T('ساعات معتمدة', 'Approved hours'), v: nm(rows.filter(r => r.status === 'approved').reduce((t, r) => { const s = sheetTotals(r); return t + s.normal + s.ot }, 0)), c: C.blue },
  ]
  const shown = rows.filter(r => mpMatch(q, [r.sheet_no, contractLabel(r.contract_id)]))

  return (
    <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
      {header}
      <MpStats stats={stats} dir={dir} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <MpSearch value={q} onChange={setQ} placeholder={T('ابحث برقم الكشف أو العقد أو العميل…', 'Search by sheet no., contract or client…')} />
      </div>

      {!shown.length ? (
        <EmptyState icon={emptyIcon || <CalendarDays size={22} color={C.gold} />} title={T('لا توجد كشوف دوام بعد', 'No timesheets yet')}
          desc={contracts.length ? T('أنشئ كشفاً على عقد ساري من الزر أعلاه', 'Create a sheet on an active contract from the button above') : T('أنشئ عقداً أولاً — كل كشف دوام يقوم على عقد', 'Create a contract first — every timesheet sits on a contract')} />
      ) : (
        <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>{T('رقم الكشف', 'Sheet no.')}</th>
                <th style={th}>{T('العقد', 'Contract')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('من', 'From')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('إلى', 'To')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('العمال', 'Workers')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('عادي', 'Normal')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('إضافي', 'OT')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('المستحق', 'Amount')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الحالة', 'Status')}</th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  const st = TS_STATUS[r.status] || TS_STATUS.draft
                  const tot = sheetTotals(r)
                  return (
                    <tr key={r.id} onClick={() => setDetailsRow(r)} style={{ cursor: 'pointer', transition: 'background .12s' }} {...mpRowHover}>
                      <td style={{ ...td, fontFamily: 'monospace', color: C.gold, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{r.sheet_no}</td>
                      <td style={{ ...td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{contractLabel(r.contract_id)}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)' }}>{fmtD(r.period_from)}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)' }}>{fmtD(r.period_to)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{nm(tot.workers)}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#27a046' }}>{nm(tot.normal)}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#d99f2b' }}>{nm(tot.ot)}</td>
                      <td style={{ ...td, textAlign: 'center', color: C.gold, fontWeight: 600 }}>{nm(tot.amount)}</td>
                      <td style={{ ...td, textAlign: 'center' }}><MpBadge st={st} lang={lang} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <TimesheetModal sb={sb} T={T} lang={lang} user={user} contracts={contracts} pool={pool} editRow={editRow}
        onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
    </div>
  )
}

/* ═══════════════ نافذة إنشاء / تعديل كشف دوام ═══════════════ */
function TimesheetModal({ sb, T, lang, user, contracts, pool, editRow, onClose, onSaved }) {
  const today = new Date()
  const monthStart = iso(new Date(today.getFullYear(), today.getMonth(), 1))
  const monthEnd = iso(new Date(today.getFullYear(), today.getMonth() + 1, 0))

  const [f, setF] = useState(() => editRow ? {
    contract_id: editRow.contract_id, branch_id: editRow.branch_id,
    period_from: editRow.period_from, period_to: editRow.period_to,
    hours_per_day: String(editRow.hours_per_day ?? 10), ot_multiplier: String(editRow.ot_multiplier ?? 1.5),
    lines: (editRow.lines || []).map(l => ({ ...l, unit_price: String(l.unit_price ?? ''), days: l.days || {} })),
    notes: editRow.notes || '',
  } : {
    contract_id: null, branch_id: user?.primary_branch_id || null,
    period_from: monthStart, period_to: monthEnd,
    hours_per_day: '10', ot_multiplier: '1.5', lines: [], notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [savedRow, setSavedRow] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const contract = contracts.find(c => c.id === f.contract_id)
  const days = useMemo(() => daysBetween(f.period_from, f.period_to), [f.period_from, f.period_to])

  /* اختيار العقد ينسخ ساعاته ومعامل إضافيّه، ويقترح صفوف العمال من بنوده:
     كل بند بعدده يصير صفوفاً فارغة الأسماء يملؤها المستخدم من سجل العمالة. */
  const pickContract = (id) => setF(p => {
    const c = contracts.find(x => x.id === id)
    if (!c) return { ...p, contract_id: id }
    const seeded = []
    ;(c.lines || []).forEach(l => {
      const q = Math.max(1, Math.round(n(l.qty)) || 1)
      for (let i = 0; i < Math.min(q, 40); i++) {
        seeded.push({ worker_id: null, worker_name: '', iqama: '', trade: l.item || '', trade_en: l.item_en || '', unit_price: String(l.unit_price ?? ''), ot_rate: String(l.ot_rate ?? ''), days: {} })
      }
    })
    return {
      ...p, contract_id: id, branch_id: c.branch_id || p.branch_id,
      hours_per_day: String(c.hours_per_day ?? 10), ot_multiplier: String(c.ot_multiplier ?? 1.5),
      lines: p.lines.length ? p.lines : seeded,
    }
  })

  const setLine = (i, k, v) => setF(p => { const a = p.lines.slice(); a[i] = { ...a[i], [k]: v }; return { ...p, lines: a } })
  /* الخلية تقبل ساعاتٍ أو رمزاً: A/غ غائب · F/ج جمعة · H/ع عطلة.
     الرقم يُحفظ نصاً كما كُتب — تطبيعه فوراً يبتلع الفاصلة أثناء كتابة «8.5». */
  const setDay = (i, d, v) => setF(p => {
    const a = p.lines.slice()
    const dd = { ...(a[i].days || {}) }
    const code = dayCode(v)
    const raw = String(v ?? '').trim()
    if (code) dd[d] = code
    else if (raw === '') delete dd[d]
    else if (/^(\d+\.?\d*|\.\d*)$/.test(raw)) { if (n(raw) > 0 || raw.includes('.')) dd[d] = raw; else delete dd[d] }
    a[i] = { ...a[i], days: dd }
    return { ...p, lines: a }
  })
  /* اختيار عامل من السجل يملأ الاسم والمهنة ورقم الإقامة — وسعر الوحدة يبقى من بند العقد */
  const pickWorker = (i, wid) => setF(p => {
    const w = (pool || []).find(x => x.id === wid)
    const a = p.lines.slice()
    a[i] = { ...a[i], worker_id: wid || null, worker_name: w?.full_name || a[i].worker_name, iqama: w?.id_number || a[i].iqama || '', trade: w?.trade || a[i].trade, trade_en: w?.trade_en || a[i].trade_en }
    return { ...p, lines: a }
  })

  const named = f.lines.filter(l => (l.worker_name || '').trim() && n(l.unit_price) > 0)
  const tot = sheetTotals({ ...f, lines: named })
  const canSave = !!f.contract_id && !!f.period_from && !!f.period_to && named.length > 0

  const save = async () => {
    if (!canSave || submitting) return
    setSubmitting(true); setErr(null)
    const payload = {
      contract_id: f.contract_id, branch_id: f.branch_id || null,
      period_from: f.period_from, period_to: f.period_to,
      hours_per_day: n(f.hours_per_day) || 10, ot_multiplier: n(f.ot_multiplier) || 1.5,
      lines: named.map(l => ({
        worker_id: l.worker_id || null, worker_name: l.worker_name.trim(), iqama: l.iqama || '',
        trade: l.trade || '', trade_en: l.trade_en || '', unit_price: n(l.unit_price),
        ot_rate: n(l.ot_rate) || null, days: l.days || {},
      })),
      workers_count: named.length, normal_hours: tot.normal, ot_hours: tot.ot,
      absent_days: tot.absents,
      notes: f.notes.trim() || null,
    }
    try {
      if (editRow?.id) {
        const { data, error } = await sb.from('manpower_timesheets').update(payload).eq('id', editRow.id).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      } else {
        const { data, error } = await sb.from('manpower_timesheets').insert({ ...payload, created_by: user?.id || null }).select('*').single()
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

  const pgHeader = frame(FileText, T('العقد والفترة', 'Contract & Period'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FKSelect label={T('العقد', 'Contract')} req value={f.contract_id} onChange={pickContract}
        options={(contracts || []).map(c => ({ v: c.id, l: c.contract_no + ' — ' + (c.client_name || '') }))}
        getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر العقد', 'Pick a contract')} full />
      <div style={row2}>
        <FKDateField label={T('من تاريخ', 'From')} value={f.period_from} onChange={v => set('period_from', v)} />
        <FKDateField label={T('إلى تاريخ', 'To')} value={f.period_to} onChange={v => set('period_to', v)} />
      </div>
      <div style={GRID}>
        <NumberField label={T('ساعات اليوم العادية', 'Normal hours/day')} value={f.hours_per_day} onChange={v => set('hours_per_day', v)} min={1} max={24} />
        {/* CurrencyField لأن NumberField لا يقبل الكسور — و1.5 هو القيمة المعتادة */}
        <CurrencyField label={T('معامل الإضافي (للصفوف بلا سعر إضافي)', 'OT multiplier (rows without an OT rate)')} unit="×" value={f.ot_multiplier} onChange={v => set('ot_multiplier', v)} />
      </div>
      {contract && (
        <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'var(--tx3)', lineHeight: 1.8 }}>
          {T('بنود العقد', 'Contract items')}: <b style={{ color: 'var(--tx2)' }}>{(contract.lines || []).map(l => `${l.item} × ${nm(l.qty)}`).join(' · ') || '—'}</b>
          <br />{T('عدد أيام الفترة', 'Days in period')}: <b style={{ color: 'var(--tx2)' }}>{days.length}</b>
          {' · '}{T(`ما زاد على ${nm(f.hours_per_day)} ساعات في اليوم يُحتسب إضافياً — وعمل الجمعة بالسعر العادي`, `Hours above ${nm(f.hours_per_day)}/day count as overtime — Friday work bills at the normal rate`)}
        </div>
      )}
    </div>
  )

  const cellIn = { width: 34, height: 28, padding: 0, border: '1px solid var(--bd)', borderRadius: 6, background: 'var(--fk-input-bg)', color: 'var(--tx)', fontFamily: F, fontSize: 11.5, fontWeight: 600, textAlign: 'center', outline: 'none' }
  const gTh = { padding: '6px 4px', fontSize: 10, fontWeight: 600, color: 'var(--tx3)', textAlign: 'center', whiteSpace: 'nowrap' }

  const pgGrid = frame(CalendarDays, T('شبكة الدوام', 'Attendance Grid'),
    days.length ? T('اكتب ساعات كل يوم — أو رمزاً: A/غ غائب · F/ج جمعة · H/ع عطلة', 'Type each day’s hours — or a code: A absent · F Friday · H holiday') : null,
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 10 }}>
      {!f.contract_id ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('اختر العقد أولاً', 'Pick a contract first')}</div>
      ) : (
        <>
          <div className="sr-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: '3px 4px' }}>
              <thead><tr>
                <th style={{ ...gTh, textAlign: 'start', position: 'sticky', insetInlineStart: 0, background: 'var(--modal-bg)', zIndex: 2, minWidth: 200 }}>{T('العامل', 'Worker')}</th>
                {days.map(d => <th key={d} style={{ ...gTh, color: isWeekend(d) ? '#d99f2b' : 'var(--tx3)' }}>{d.slice(8)}</th>)}
                <th style={{ ...gTh, color: '#27a046' }}>{T('عادي', 'N')}</th>
                <th style={{ ...gTh, color: '#d99f2b' }}>{T('إضافي', 'OT')}</th>
                <th style={gTh}></th>
              </tr></thead>
              <tbody>
                {f.lines.map((l, i) => {
                  const s = splitHours(l.days, f.hours_per_day)
                  return (
                    <tr key={i}>
                      <td style={{ position: 'sticky', insetInlineStart: 0, background: 'var(--modal-bg)', zIndex: 1, paddingInlineEnd: 6 }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          <div style={{ flex: 1, minWidth: 130 }}>
                            <FKSelect value={l.worker_id} onChange={v => pickWorker(i, v)}
                              options={(pool || []).map(w => ({ v: w.id, l: w.full_name + (w.trade ? ' · ' + w.trade : '') }))}
                              getKey={o => o.v} getLabel={o => o.l} placeholder={l.worker_name || T('اختر عاملاً', 'Pick a worker')} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{nm(l.unit_price)}</span>
                        </div>
                      </td>
                      {days.map(d => {
                        const code = dayCode(l.days?.[d])
                        return (
                          <td key={d}>
                            <input value={l.days?.[d] ?? ''} onChange={e => setDay(i, d, e.target.value)}
                              style={{ ...cellIn,
                                color: code === 'A' ? '#e5534b' : code ? 'var(--tx4)' : 'var(--tx)',
                                background: code === 'A' ? 'rgba(229,83,75,.10)' : isWeekend(d) ? 'rgba(217,159,43,.10)' : 'var(--fk-input-bg)' }} />
                          </td>
                        )
                      })}
                      <td style={{ ...gTh, color: '#27a046', fontSize: 11.5 }}>{nm(s.normal)}</td>
                      <td style={{ ...gTh, color: '#d99f2b', fontSize: 11.5 }}>{nm(s.ot)}</td>
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
            <button onClick={() => setF(p => ({ ...p, lines: [...p.lines, { worker_id: null, worker_name: '', iqama: '', trade: '', trade_en: '', unit_price: String(n(contract?.lines?.[0]?.unit_price) || ''), ot_rate: String(n(contract?.lines?.[0]?.ot_rate) || ''), days: {} }] }))}
              style={{ height: 32, padding: '0 12px', borderRadius: 9, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} strokeWidth={2.4} />{T('إضافة عامل', 'Add worker')}</button>
            <span style={{ marginInlineStart: 'auto', fontSize: 12, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
              {T('عادي', 'Normal')}: <b style={{ color: '#27a046' }}>{nm(tot.normal)}</b>
              {' · '}{T('إضافي', 'OT')}: <b style={{ color: '#d99f2b' }}>{nm(tot.ot)}</b>
              {' · '}{T('غياب', 'Abs')}: <b style={{ color: tot.absents ? '#e5534b' : 'var(--tx3)' }}>{nm(tot.absents)}</b>
              {' · '}{T('المستحق', 'Amount')}: <b style={{ color: C.gold }}>{nm(tot.amount)}</b>
            </span>
          </div>
        </>
      )}
    </div>
  )

  const pages = [
    { valid: !!f.contract_id && !!f.period_from && !!f.period_to, content: pgHeader },
    { valid: canSave, error: err, content: pgGrid },
  ]

  return (
    <FKModal open onClose={onClose} title={editRow ? T('تعديل كشف الدوام', 'Edit timesheet') : T('كشف دوام جديد', 'New Timesheet')}
      Icon={CalendarDays} width={1100} height="min(720px, 92vh)" accent={C.gold} lang={lang}
      pages={pages} onSubmit={save} submitting={submitting}
      submitLabel={editRow ? T('حفظ التعديلات', 'Save changes') : T('حفظ الكشف', 'Save sheet')} submitIcon={BadgeCheck}
      success={savedRow ? <SuccessView title={T('تم حفظ كشف الدوام', 'Timesheet saved')} code={savedRow.sheet_no} /> : null} />
  )
}
