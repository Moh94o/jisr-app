import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FileText, Plus, Trash2, Pencil, Printer, Building2, ClipboardList, Calculator,
  BadgeCheck, ArrowRight, ArrowLeft, Receipt, Users, CalendarDays, Link2, Unlink,
} from 'lucide-react'
import {
  C, F, EmptyState, Modal as FKModal, ModalSection, TextField, TextArea, CurrencyField, NumberField, PhoneField,
  Segmented, Select as FKSelect, DateField as FKDateField, GRID, SuccessView, ConfirmDialog,
} from '../components/ui/FormKit.jsx'
import { canTab, cardVisible, cardActionAllowed, isGM, tabOffices } from '../lib/permissions.js'
import PageSkeleton from '../components/ui/Skeleton.jsx'
import BackButton from '../components/BackButton.jsx'
import { MpStats, MpBadge, MpSearch, mpMatch, mpRowHover } from '../lib/manpowerUi.jsx'
import { printManpowerContract } from '../lib/manpowerDocsPrint.js'
import { splitHours, countAbsents, TS_STATUS } from './ManpowerTimesheetsPage.jsx'
import { CLAIM_STATUS } from './ManpowerClaimsPage.jsx'

const n = v => { const x = parseFloat(String(v ?? '').replace(/,/g, '')); return isNaN(x) ? 0 : x }
const nm = v => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })
const fmtD = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') }

const METHODS = [
  { v: 'hour', ar: 'بالساعة', en: 'Per Hour' },
  { v: 'day', ar: 'باليوم', en: 'Per Day' },
  { v: 'month', ar: 'بالشهر', en: 'Per Month' },
  { v: 'meter', ar: 'بالمتر', en: 'Per Meter' },
  { v: 'lump', ar: 'مقطوعية', en: 'Lump Sum' },
]
export const methodLabel = (v, lang) => { const m = METHODS.find(x => x.v === v); return m ? (lang === 'en' ? m.en : m.ar) : '—' }

/* حالة العقد — مسار واحد لا رجعة فيه إلا بالتعديل اليدوي */
export const CONTRACT_STATUS = {
  draft: { ar: 'مسودّة', en: 'Draft', c: 'var(--tx3)' },
  active: { ar: 'ساري', en: 'Active', c: '#27a046' },
  expired: { ar: 'منتهٍ', en: 'Expired', c: '#d99f2b' },
  closed: { ar: 'مقفل', en: 'Closed', c: 'var(--tx4)' },
}

/* الحالة الفعلية: عقدٌ ساري تجاوز تاريخ نهايته يُعرض «منتهياً» دون انتظار
   تعديلٍ يدوي — القاعدة تبقى كما هي، والعرض يقول الحقيقة. */
const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }
export const effectiveStatus = (c) => (c?.status === 'active' && c?.end_date && c.end_date < todayIso()) ? 'expired' : (c?.status || 'draft')
/* الأيام المتبقية على نهاية العقد — سالبها يعني انقضاءه */
export const daysToEnd = (c) => {
  if (!c?.end_date) return null
  const end = new Date(c.end_date + 'T00:00:00'), now = new Date(todayIso() + 'T00:00:00')
  return Math.round((end - now) / 86400000)
}

const PAYMENT_TERMS = [
  { v: 'net15', ar: 'شهرياً مقابل كشوف دوام معتمدة — تُستحق خلال 15 يوماً', s: 'Monthly against approved timesheets — NET 15' },
  { v: 'net30', ar: 'شهرياً مقابل كشوف دوام معتمدة — تُستحق خلال 30 يوماً', s: 'Monthly against approved timesheets — NET 30' },
  { v: 'early_disc', ar: 'صافي 15 يوماً مع خصم 1٪ للسداد خلال 7 أيام', s: 'NET 15 with 1% discount if settled within 7 days' },
  { v: 'advance_25', ar: 'دفعة مقدمة 25٪ والباقي شهرياً', s: '25% advance, balance invoiced monthly' },
  { v: 'on_delivery', ar: 'عند التسليم', s: 'On delivery' },
]
const payLabel = (v, lang) => { const p = PAYMENT_TERMS.find(x => x.v === v); return p ? (lang === 'en' ? p.s : p.ar) : '—' }

const emptyLine = () => ({ item: '', item_en: '', method: 'hour', unit_price: '', ot_rate: '', qty: '' })

/* القيمة الشهرية التقديرية للعقد — البند الساعيّ × ساعات اليوم × أيام الشهر × العدد.
   تقديرٌ لا التزام: المستخلص وحده يقول ما استُحقّ فعلاً. */
export const contractMonthly = (c) => {
  const hpd = n(c.hours_per_day) || 10, dpm = n(c.days_per_month) || 26
  return (c.lines || []).reduce((t, l) => {
    const q = n(l.qty) || 1, p = n(l.unit_price)
    if (l.method === 'hour') return t + p * hpd * dpm * q
    if (l.method === 'day') return t + p * dpm * q
    if (l.method === 'month') return t + p * q
    return t
  }, 0)
}

export default function ManpowerContractsPage({ sb, toast, user, lang = 'ar', emptyIcon }) {
  const T = (ar, en) => lang === 'en' ? en : ar
  const dir = lang === 'en' ? 'ltr' : 'rtl'
  const [rows, setRows] = useState(null)
  const [branches, setBranches] = useState([])
  const [cities, setCities] = useState([])
  const [rateCard, setRateCard] = useState([])
  const [quotes, setQuotes] = useState([])
  const [claimsByContract, setClaimsByContract] = useState({})
  const [sheetsByContract, setSheetsByContract] = useState({})
  const [pool, setPool] = useState([])
  const [linkWorkerId, setLinkWorkerId] = useState(null)
  const [usersById, setUsersById] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [detailsRow, setDetailsRow] = useState(null)
  const [delRow, setDelRow] = useState(null)
  const [q, setQ] = useState('')

  const canView = canTab(user, 'manpower_contracts')
  const canCreate = isGM(user) || canTab(user, 'manpower_contracts', 'create')
  const canEdit = isGM(user) || canTab(user, 'manpower_contracts', 'edit')
  const canDelete = isGM(user) || canTab(user, 'manpower_contracts', 'delete')
  const canActivate = isGM(user) || canTab(user, 'manpower_contracts', 'activate')
  const canClose = isGM(user) || canTab(user, 'manpower_contracts', 'close')
  const canPrint = isGM(user) || canTab(user, 'manpower_contracts', 'print')
  // نطاق المكاتب — غير المدير العام يرى عقود مكاتبه وحدها
  const officeScope = tabOffices(user, 'manpower_contracts')

  const load = useCallback(async () => {
    let ctQ = sb.from('manpower_contracts').select('*').order('created_at', { ascending: false }).limit(500)
    let qQ = sb.from('manpower_quotes').select('*').order('created_at', { ascending: false }).limit(300)
    let tsQ = sb.from('manpower_timesheets').select('id,contract_id,sheet_no,period_from,period_to,hours_per_day,ot_multiplier,workers_count,normal_hours,ot_hours,absent_days,status,lines').order('period_from', { ascending: false }).limit(500)
    if (officeScope) { ctQ = ctQ.in('branch_id', officeScope); qQ = qQ.in('branch_id', officeScope); tsQ = tsQ.in('branch_id', officeScope) }
    const [ct, b, u, c, rc, q, cl, ts, lp] = await Promise.all([
      ctQ,
      sb.from('branches').select('id,name_ar,branch_code').is('deleted_at', null).eq('is_active', true).order('name_ar'),
      sb.from('users').select('id,person:persons(name_ar,name_en)'),
      sb.from('cities').select('id,name_ar,name_en,sort_order').not('is_active', 'is', false).order('sort_order'),
      sb.from('manpower_rate_card').select('position_ar,position_en,billing_rate,ot_billing_rate').not('is_active','is',false).order('sort_order',{nullsFirst:false}),
      qQ,
      sb.from('manpower_claims').select('id,contract_id,claim_no,period_from,period_to,total,paid_amount,status'),
      tsQ,
      sb.from('manpower_labor_pool').select('id,full_name,id_number,trade,trade_en,phone,status,contract_id').limit(2000),
    ])
    setRows(ct.data || []); setBranches((b.data || []).filter(x => !officeScope || officeScope.includes(x.id))); setCities(c.data || [])
    setRateCard(rc.data || []); setQuotes(q.data || []); setPool(lp.data || [])
    const map = {}; (u.data || []).forEach(x => { map[x.id] = x.person?.name_ar || x.person?.name_en || '' }); setUsersById(map)
    const byC = {}; (cl.data || []).forEach(x => { (byC[x.contract_id] ||= []).push(x) }); setClaimsByContract(byC)
    const byT = {}; (ts.data || []).forEach(x => { (byT[x.contract_id] ||= []).push(x) }); setSheetsByContract(byT)
    setDetailsRow(prev => prev ? (ct.data || []).find(r => r.id === prev.id) || prev : prev)
  }, [sb])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!sb) return
    const ch = sb.channel('manpower-contracts-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_contracts' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_claims' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_timesheets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manpower_labor_pool' }, () => load())
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb, load])

  const branchLabel = id => { const b = branches.find(x => x.id === id); return b ? (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') : '—' }

  if (!canView) return null

  const header = (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('العقود', 'Contracts')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>
            {T('عقود توريد العمالة — تُنشأ من تسعيرة معتمدة أو يدوياً، ويُستخلَص عليها شهرياً', 'Manpower supply contracts — created from an approved quote or manually, then claimed monthly')}
          </div>
        </div>
        {canCreate && <div className="page-cta-row" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => { setEditRow(null); setShowModal(true) }} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            {T('عقد جديد', 'New contract')}<Plus size={16} strokeWidth={2.2} />
          </button>
        </div>}
      </div>
    </div>
  )

  if (rows === null) return <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>{header}<PageSkeleton variant="table" cards={4} columns={8} rows={6} /></div>

  /* ═══════════════ شاشة التفاصيل ═══════════════ */
  if (detailsRow) {
    const r = detailsRow
    const st = CONTRACT_STATUS[effectiveStatus(r)] || CONTRACT_STATUS.draft
    const dLeft = daysToEnd(r)
    const claims = claimsByContract[r.id] || []
    const claimed = claims.reduce((t, x) => t + n(x.total), 0)
    const collected = claims.reduce((t, x) => t + n(x.paid_amount), 0)
    const contractSheets = sheetsByContract[r.id] || []

    /* ── سجل عمال العقد ─────────────────────────────────────────────────
       الحقيقة من كشوف الدوام: كل من سُجّلت له ساعات على هذا العقد، بساعاته
       وغياباته مجموعةً عبر الكشوف. ويُضاف إليهم من رُبط من سجل العمالة
       المتاحة ولم يدخل كشفاً بعد (قيد المباشرة). */
    const roster = (() => {
      const byKey = new Map()
      contractSheets.forEach(s => (s.lines || []).forEach(l => {
        const key = ((l.worker_name || '').trim() + '|' + (l.iqama || '')).trim()
        if (key === '|') return
        if (!byKey.has(key)) byKey.set(key, { worker_id: l.worker_id || null, name: (l.worker_name || '').trim(), iqama: l.iqama || '', trade: l.trade || l.trade_en || '', trade_en: l.trade_en || '', hours: 0, ot: 0, absents: 0, sheets: 0, fromPool: false })
        const w = byKey.get(key)
        const sp = splitHours(l.days, s.hours_per_day)
        w.hours += sp.normal; w.ot += sp.ot; w.absents += countAbsents(l.days); w.sheets += 1
        if (!w.worker_id && l.worker_id) w.worker_id = l.worker_id
      }))
      const seenIds = new Set([...byKey.values()].map(w => w.worker_id).filter(Boolean))
      const seenIqamas = new Set([...byKey.values()].map(w => w.iqama).filter(Boolean))
      ;(pool || []).filter(w => w.contract_id === r.id && !seenIds.has(w.id) && !(w.id_number && seenIqamas.has(w.id_number))).forEach(w => {
        byKey.set('pool:' + w.id, { worker_id: w.id, name: w.full_name, iqama: w.id_number || '', trade: w.trade || w.trade_en || '', trade_en: w.trade_en || '', hours: 0, ot: 0, absents: 0, sheets: 0, fromPool: true })
      })
      return [...byKey.values()].sort((a, b) => b.hours - a.hours)
    })()
    const poolById = new Map((pool || []).map(w => [w.id, w]))

    /* تغطية المهن: المطلوب من بنود العقد الزمنية مقابل المسجَّل فعلاً */
    const coverage = (r.lines || []).filter(l => ['hour', 'day', 'month'].includes(l.method) && n(l.qty) > 0).map(l => {
      const have = roster.filter(w => w.trade === l.item || w.trade === l.item_en || (l.item_en && w.trade_en === l.item_en)).length
      return { item: l.item || l.item_en, need: n(l.qty), have }
    })

    const canLinkWorker = (isGM(user) || canTab(user, 'manpower_pool', 'contact') || canTab(user, 'manpower_pool', 'edit'))
      && cardActionAllowed(user, 'manpower_contracts', 'workers', 'link')
    const linkWorker = async (wid) => {
      if (!wid) return
      const { error } = await sb.from('manpower_labor_pool').update({ contract_id: r.id, status: 'placed' }).eq('id', wid)
      if (error) toast?.(T('تعذّر الربط: ', 'Link failed: ') + error.message)
      else { toast?.(T('رُبط العامل بالعقد', 'Worker linked to the contract')); setLinkWorkerId(null); load() }
    }
    const unlinkWorker = async (wid) => {
      const { error } = await sb.from('manpower_labor_pool').update({ contract_id: null, status: 'available' }).eq('id', wid)
      if (error) toast?.(T('تعذّر فك الربط: ', 'Unlink failed: ') + error.message)
      else { toast?.(T('فُكّ ربط العامل وعاد متاحاً', 'Worker unlinked and available again')); load() }
    }
    const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
    const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
    const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
    const cell = (label, value, opts = {}) => (
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, ...(opts.full ? { gridColumn: '1 / -1' } : {}) }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: opts.color || 'var(--tx1)', fontWeight: 600, lineHeight: 1.5, wordBreak: 'break-word', fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</span>
      </div>
    )
    const byLabel = v => v === 'mcc' ? T('على المكتب', 'By MCC') : T('على العميل', 'By the Client')
    const tblTh = { padding: '9px 12px', fontSize: 11, fontWeight: 600, color: 'var(--tx3)', textAlign: 'center', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
    const tblTd = { padding: '9px 12px', fontSize: 12.5, fontWeight: 500, color: 'var(--tx1)', textAlign: 'center', borderBottom: '1px solid var(--bd)', fontVariantNumeric: 'tabular-nums' }
    const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft

    return (
      <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <BackButton onClick={() => setDetailsRow(null)} label={T('رجوع', 'Back')} isAr={dir === 'rtl'} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)' }}>{r.client_name}</div>
            <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }}>{r.contract_no}</div>
          </div>
          <MpBadge st={st} lang={lang} />
          {/* عدّاد النهاية: تنبيهٌ قبل الانقضاء بشهرٍ وإنذارٌ بعده — العقود تتجدد بإشعار 30 يوماً */}
          {r.status === 'active' && dLeft != null && (dLeft >= 0
            ? <MpBadge st={{ ar: 'متبقٍ ' + dLeft + ' يوماً', en: dLeft + ' days left', c: dLeft <= 30 ? '#d99f2b' : C.blue }} lang={lang} />
            : <MpBadge st={{ ar: 'منقضٍ منذ ' + Math.abs(dLeft) + ' يوماً — جدّده أو أقفله', en: 'Expired ' + Math.abs(dLeft) + ' days ago — renew or close', c: '#e5534b' }} lang={lang} />)}
          {/* الاعتماد يفعّل العقد ويفتح عليه كشوف الدوام — صلاحية مستقلة عن التعديل */}
          {canActivate && r.status === 'draft' && <button onClick={async () => {
            const { error } = await sb.from('manpower_contracts').update({ status: 'active' }).eq('id', r.id)
            if (error) toast?.(T('تعذّر الاعتماد: ', 'Activation failed: ') + error.message)
            else { toast?.(T('تم اعتماد العقد', 'Contract activated')); load() }
          }} className="btn-primary-modal"
            style={{ height: 36, padding: '0 14px', borderRadius: 10, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <BadgeCheck size={14} strokeWidth={2.2} />{T('اعتماد العقد', 'Activate')}</button>}
          {canClose && r.status === 'active' && <button onClick={async () => {
            const { error } = await sb.from('manpower_contracts').update({ status: 'closed' }).eq('id', r.id)
            if (error) toast?.(T('تعذّر الإقفال: ', 'Close failed: ') + error.message)
            else { toast?.(T('تم إقفال العقد', 'Contract closed')); load() }
          }}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx3)', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            {T('إقفال العقد', 'Close contract')}</button>}
          {canPrint && <>
            <button onClick={() => printManpowerContract(r, { quote: quotes.find(q => q.id === r.quote_id), lang: 'ar' })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة — عربي', 'Print — Arabic')}</button>
            <button onClick={() => printManpowerContract(r, { quote: quotes.find(q => q.id === r.quote_id), lang: 'en' })}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Printer size={13} />{T('طباعة — إنجليزي', 'Print — English')}</button>
          </>}
          {canEdit && <button onClick={() => { setEditRow(r); setShowModal(true) }}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Pencil size={13} />{T('تعديل', 'Edit')}</button>}
          {canDelete && <button onClick={() => setDelRow(r)}
            style={{ height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <Trash2 size={13} />{T('حذف', 'Delete')}</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
          {cardVisible(user, 'manpower_contracts', 'client') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('العميل والعقد', 'Client & Contract')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {cell(T('العميل', 'Client'), r.client_name)}
              {cell(T('بالإنجليزي', 'English name'), r.client_name_en)}
              {cell(T('المدينة', 'City'), r.client_location)}
              {cell(T('المسؤول', 'Attn'), r.attn_name)}
              {cell(T('الجوال', 'Mobile'), r.client_phone)}
              {cell(T('المكتب', 'Branch'), branchLabel(r.branch_id))}
              {cell(T('بداية العقد', 'Start date'), fmtD(r.start_date))}
              {cell(T('نهاية العقد', 'End date'), fmtD(r.end_date))}
              {cell(T('التسعيرة المرتبطة', 'Linked quote'), quotes.find(q => q.id === r.quote_id)?.quote_no || '—')}
              {cell(T('الحالة', 'Status'), lang === 'en' ? st.en : st.ar, { color: st.c })}
            </div>
          </div>}

          {cardVisible(user, 'manpower_contracts', 'terms') && <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('الشروط والالتزامات', 'Terms & Obligations')}</span></div>
            <div style={{ padding: '16px 22px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {cell(T('طريقة التسعير', 'Pricing method'), methodLabel(r.pricing_method, lang))}
              {cell(T('ساعات اليوم', 'Hours/day'), nm(r.hours_per_day))}
              {cell(T('أيام الشهر', 'Days/month'), nm(r.days_per_month))}
              {cell(T('ضريبة القيمة المضافة', 'VAT'), nm(r.vat_pct) + '%')}
              {cell(T('خصم الغياب / يوم', 'Absence deduction / day'), nm(r.absence_deduction_rate), { color: '#e5534b' })}
              {cell(T('السداد خلال (يوم)', 'Payment due (days)'), nm(r.payment_due_days))}
              {cell(T('القيمة الشهرية التقديرية', 'Est. monthly value'), nm(contractMonthly(r)), { color: C.gold })}
              {(r.project_name || r.project_name_en) && cell(T('المشروع', 'Project'), lang === 'en' ? (r.project_name_en || r.project_name) : (r.project_name || r.project_name_en))}
              {r.po_number && cell(T('أمر الشراء', 'P.O. No.'), r.po_number)}
              {r.client_vat_no && cell(T('الرقم الضريبي للعميل', 'Client VAT No.'), r.client_vat_no)}
              {r.client_cr_no && cell(T('سجل العميل التجاري', 'Client C.R'), r.client_cr_no)}
              {cell(T('شروط الدفع', 'Payment terms'), payLabel(r.payment_terms_key, lang), { full: true })}
              {r.invoice_terms && cell(T('شروط الفوترة / المستخلصات', 'Billing terms'), r.invoice_terms, { full: true })}
            </div>
          </div>}

          {cardVisible(user, 'manpower_contracts', 'lines') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27a046' }} /><span style={cardTitle}>{T('بنود العقد', 'Contract Items')}</span></div>
            <div style={{ padding: '10px 22px 16px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={tblTh}>{T('البند', 'Item')}</th><th style={tblTh}>{T('بالإنجليزي', 'English')}</th>
                  <th style={tblTh}>{T('طريقة التسعير', 'Basis')}</th><th style={tblTh}>{T('سعر الوحدة', 'Rate')}</th>
                  <th style={tblTh}>{T('سعر الإضافي', 'OT rate')}</th>
                  <th style={tblTh}>{T('العدد', 'Qty')}</th>
                </tr></thead>
                <tbody>
                  {(r.lines || []).map((l, i) => <tr key={i}>
                    <td style={{ ...tblTd, textAlign: 'start' }}>{l.item || '—'}</td>
                    <td style={{ ...tblTd, textAlign: 'start', direction: 'ltr' }}>{l.item_en || '—'}</td>
                    <td style={tblTd}>{methodLabel(l.method, lang)}</td>
                    <td style={{ ...tblTd, color: C.gold, fontWeight: 600 }}>{nm(l.unit_price)}</td>
                    <td style={{ ...tblTd, color: '#d99f2b', fontWeight: 600 }}>{n(l.ot_rate) ? nm(l.ot_rate) : '—'}</td>
                    <td style={tblTd}>{nm(l.qty)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 22px 16px', display: 'flex', gap: 14, fontSize: 11, color: 'var(--tx4)', flexWrap: 'wrap' }}>
              <span>{T('أنشأه', 'Created by')}: <b style={{ color: 'var(--tx2)' }}>{usersById[r.created_by] || '—'}</b></span>
              <span>{T('بتاريخ', 'On')}: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtD(r.created_at)}</span></span>
            </div>
          </div>}

          {/* ── عمال العقد ──────────────────────────────────────────────────
              الحقيقة من كشوف الدوام + من رُبط من سجل العمالة. أشرطة التغطية
              تُري النقص قبل أن يشتكي العميل: مطلوبٌ خمسة نجارين ومسجَّلٌ
              ثلاثة — العجز ظاهرٌ بلا حساب. */}
          {cardVisible(user, 'manpower_contracts', 'workers') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('عمال العقد', 'Contract Workers')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
                {nm(roster.length)} {T('عامل', 'workers')} · {nm(r.workers_total)} {T('مطلوب بالعقد', 'required')}
              </span>
            </div>
            {coverage.length > 0 && (
              <div style={{ padding: '14px 22px 4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {coverage.map((cv, i) => {
                  const pct = cv.need ? Math.min(100, Math.round(cv.have / cv.need * 100)) : 0
                  const full = cv.have >= cv.need
                  return (
                    <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cv.item}</span>
                        <span style={{ fontSize: 11.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: full ? '#27a046' : '#d99f2b' }}>{cv.have} / {cv.need}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 4, background: 'var(--bd2)', overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: full ? '#27a046' : C.gold, transition: 'width .3s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ padding: '10px 22px 6px', overflowX: 'auto' }}>
              {!roster.length ? (
                <div style={{ padding: '10px 0 14px', fontSize: 12.5, color: 'var(--tx4)' }}>
                  {T('لا عمال بعد — سيمتلئ السجل من كشوف الدوام، أو اربط عاملاً من سجل العمالة المتاحة أدناه.', 'No workers yet — the roster fills from timesheets, or link one from the labour pool below.')}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={tblTh}>#</th><th style={{ ...tblTh, textAlign: 'start' }}>{T('العامل', 'Worker')}</th>
                    <th style={tblTh}>{T('الإقامة', 'Iqama')}</th><th style={tblTh}>{T('المهنة', 'Trade')}</th>
                    <th style={tblTh}>{T('ساعات عادية', 'Normal hrs')}</th><th style={tblTh}>{T('إضافي', 'OT')}</th>
                    <th style={tblTh}>{T('غياب', 'Abs')}</th><th style={tblTh}>{T('الكشوف', 'Sheets')}</th><th style={tblTh}></th>
                  </tr></thead>
                  <tbody>
                    {roster.map((w, i) => {
                      const pw = w.fromPool ? poolById.get(w.worker_id) : (w.worker_id ? poolById.get(w.worker_id) : null)
                      return (
                        <tr key={i}>
                          <td style={tblTd}>{i + 1}</td>
                          <td style={{ ...tblTd, textAlign: 'start', fontWeight: 600 }}>
                            {w.name}
                            {w.fromPool && <span style={{ marginInlineStart: 8, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: C.blue + '16', color: C.blue }}>{T('قيد المباشرة', 'Mobilizing')}</span>}
                            {pw?.phone && <span style={{ marginInlineStart: 8, fontSize: 10.5, color: 'var(--tx4)', direction: 'ltr', display: 'inline-block' }}>{pw.phone}</span>}
                          </td>
                          <td style={{ ...tblTd, direction: 'ltr' }}>{w.iqama || '—'}</td>
                          <td style={tblTd}>{w.trade || '—'}</td>
                          <td style={{ ...tblTd, color: '#27a046', fontWeight: 600 }}>{w.hours ? nm(w.hours) : '·'}</td>
                          <td style={{ ...tblTd, color: '#d99f2b' }}>{w.ot ? nm(w.ot) : '·'}</td>
                          <td style={{ ...tblTd, color: w.absents ? '#e5534b' : 'var(--tx5)' }}>{w.absents || '·'}</td>
                          <td style={tblTd}>{w.sheets || '·'}</td>
                          <td style={tblTd}>
                            {canLinkWorker && w.fromPool && (
                              <button onClick={() => unlinkWorker(w.worker_id)} title={T('فك الربط — يعود متاحاً في السجل', 'Unlink — back to the available pool')}
                                style={{ height: 26, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bd)', background: 'transparent', color: 'var(--tx3)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <Unlink size={11} />{T('فك', 'Unlink')}</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            {canLinkWorker && (
              <div style={{ padding: '4px 22px 18px', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240, maxWidth: 420 }}>
                  <FKSelect label={T('ربط عامل من سجل العمالة المتاحة', 'Link a worker from the labour pool')} value={linkWorkerId}
                    onChange={setLinkWorkerId}
                    options={(pool || []).filter(w => w.contract_id !== r.id && w.status !== 'blocked').map(w => ({ v: w.id, l: w.full_name + (w.trade ? ' · ' + w.trade : '') + (w.status === 'placed' ? T(' (على رأس العمل)', ' (placed)') : '') }))}
                    getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر عاملاً', 'Pick a worker')} />
                </div>
                <button onClick={() => linkWorker(linkWorkerId)} disabled={!linkWorkerId}
                  style={{ height: 42, padding: '0 16px', borderRadius: 10, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: linkWorkerId ? C.gold : 'var(--tx4)', fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: linkWorkerId ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Link2 size={14} />{T('ربط بالعقد', 'Link to contract')}</button>
              </div>
            )}
          </div>}

          {/* ── كشوف دوام العقد ── */}
          {cardVisible(user, 'manpower_contracts', 'timesheets') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('كشوف دوام العقد', 'Contract Timesheets')}</span></div>
            {!contractSheets.length ? (
              <div style={{ padding: '16px 22px', fontSize: 12.5, color: 'var(--tx4)' }}>{T('لا كشوف دوام بعد — تُنشأ من تبويب «كشوف الدوام».', 'No timesheets yet — created from the Timesheets tab.')}</div>
            ) : (
              <div style={{ padding: '10px 22px 16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={tblTh}>{T('رقم الكشف', 'Sheet no.')}</th><th style={tblTh}>{T('الفترة', 'Period')}</th>
                    <th style={tblTh}>{T('العمال', 'Workers')}</th><th style={tblTh}>{T('عادي', 'Normal')}</th>
                    <th style={tblTh}>{T('إضافي', 'OT')}</th><th style={tblTh}>{T('غياب', 'Abs')}</th><th style={tblTh}>{T('الحالة', 'Status')}</th>
                  </tr></thead>
                  <tbody>
                    {contractSheets.map(s => (
                      <tr key={s.id}>
                        <td style={{ ...tblTd, fontFamily: 'monospace', color: C.gold, direction: 'ltr' }}>{s.sheet_no}</td>
                        <td style={{ ...tblTd, fontSize: 11.5, color: 'var(--tx3)' }}>{fmtD(s.period_from)} → {fmtD(s.period_to)}</td>
                        <td style={tblTd}>{nm(s.workers_count)}</td>
                        <td style={{ ...tblTd, color: '#27a046' }}>{nm(s.normal_hours)}</td>
                        <td style={{ ...tblTd, color: '#d99f2b' }}>{nm(s.ot_hours)}</td>
                        <td style={{ ...tblTd, color: n(s.absent_days) ? '#e5534b' : 'var(--tx5)' }}>{n(s.absent_days) || '·'}</td>
                        <td style={tblTd}><MpBadge st={TS_STATUS[s.status] || TS_STATUS.draft} lang={lang} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>}

          {/* ── مستخلصات العقد — فوترته الفعلية مقابل المتوقَّع ── */}
          {cardVisible(user, 'manpower_contracts', 'claims') && <div style={{ ...cardChrome, gridColumn: '1 / -1' }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#27a046' }} /><span style={cardTitle}>{T('مستخلصات العقد', 'Contract Claims')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>
                {T('المفوتَر', 'Claimed')}: <b style={{ color: C.gold }}>{nm(claimed)}</b>
                {' · '}{T('المحصَّل', 'Collected')}: <b style={{ color: '#27a046' }}>{nm(collected)}</b>
                {claimed > collected ? <>{' · '}{T('المتبقي', 'Outstanding')}: <b style={{ color: '#e5534b' }}>{nm(claimed - collected)}</b></> : null}
              </span>
            </div>
            {!claims.length ? (
              <div style={{ padding: '16px 22px', fontSize: 12.5, color: 'var(--tx4)' }}>{T('لا مستخلصات بعد — تُنشأ من تبويب «المستخلصات» على كشف دوام معتمد.', 'No claims yet — created from the Claims tab on an approved timesheet.')}</div>
            ) : (
              <div style={{ padding: '10px 22px 16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={tblTh}>{T('رقم المستخلص', 'Claim no.')}</th><th style={tblTh}>{T('الفترة', 'Period')}</th>
                    <th style={tblTh}>{T('الإجمالي', 'Total')}</th><th style={tblTh}>{T('المسدَّد', 'Paid')}</th><th style={tblTh}>{T('الحالة', 'Status')}</th>
                  </tr></thead>
                  <tbody>
                    {claims.map(x => (
                      <tr key={x.id}>
                        <td style={{ ...tblTd, fontFamily: 'monospace', color: C.gold, direction: 'ltr' }}>{x.claim_no}</td>
                        <td style={{ ...tblTd, fontSize: 11.5, color: 'var(--tx3)' }}>{fmtD(x.period_from)} → {fmtD(x.period_to)}</td>
                        <td style={{ ...tblTd, color: C.gold, fontWeight: 600 }}>{nm(x.total)}</td>
                        <td style={{ ...tblTd, color: '#27a046' }}>{nm(x.paid_amount)}</td>
                        <td style={tblTd}><MpBadge st={CLAIM_STATUS[x.status] || CLAIM_STATUS.draft} lang={lang} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>}
        </div>

        {showModal && <ContractModal sb={sb} T={T} lang={lang} user={user} branches={branches} cities={cities}
          rateCard={rateCard} quotes={quotes} editRow={editRow}
          onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
        <ConfirmDialog open={!!delRow} danger lang={lang}
          title={T('حذف العقد', 'Delete contract')} itemName={delRow?.contract_no}
          message={T('سيُحذف العقد وكل مستخلصاته نهائياً. هل أنت متأكد؟', 'The contract and all its claims will be permanently deleted. Are you sure?')}
          onCancel={() => setDelRow(null)}
          onConfirm={async () => {
            const { error } = await sb.from('manpower_contracts').delete().eq('id', delRow.id)
            setDelRow(null)
            if (error) toast?.(T('تعذّر الحذف: ', 'Delete failed: ') + error.message)
            else { toast?.(T('تم حذف العقد', 'Contract deleted')); setDetailsRow(null); load() }
          }} />
      </div>
    )
  }

  /* ═══════════════ القائمة ═══════════════ */
  const th = { padding: '11px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', textAlign: 'start', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }
  const td = { padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--tx1)', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }
  const stats = [
    { l: T('إجمالي العقود', 'Total contracts'), v: rows.length, c: C.gold },
    { l: T('سارية', 'Active'), v: rows.filter(r => effectiveStatus(r) === 'active').length, c: '#27a046' },
    { l: T('منقضية تحتاج قراراً', 'Past end date'), v: rows.filter(r => r.status === 'active' && effectiveStatus(r) === 'expired').length, c: '#e5534b' },
    { l: T('القيمة الشهرية التقديرية', 'Est. monthly value'), v: nm(rows.filter(r => effectiveStatus(r) === 'active').reduce((t, r) => t + contractMonthly(r), 0)), c: C.blue },
  ]
  const shown = rows.filter(r => mpMatch(q, [r.contract_no, r.client_name, r.client_name_en, r.po_number, r.project_name]))

  return (
    <div style={{ fontFamily: F, paddingBottom: 80, direction: dir }}>
      {header}
      <MpStats stats={stats} dir={dir} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <MpSearch value={q} onChange={setQ} placeholder={T('ابحث برقم العقد أو العميل أو المشروع…', 'Search by contract no., client or project…')} />
      </div>

      {!shown.length ? (
        <EmptyState icon={emptyIcon || <FileText size={22} color={C.gold} />} title={T('لا توجد عقود بعد', 'No contracts yet')}
          desc={canCreate ? T('أنشئ أول عقد من الزر أعلاه، أو ابنِه على تسعيرة قائمة', 'Create your first contract above, or build one on an existing quote') : T('لم يُنشأ أي عقد بعد', 'No contracts have been created yet')} />
      ) : (
        <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>{T('رقم العقد', 'Contract no.')}</th>
                <th style={th}>{T('العميل', 'Client')}</th>
                <th style={th}>{T('المكتب', 'Branch')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('البداية', 'Start')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('النهاية', 'End')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('البنود', 'Items')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('شهرياً (تقديري)', 'Monthly (est.)')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('المستخلصات', 'Claims')}</th>
                <th style={{ ...th, textAlign: 'center' }}>{T('الحالة', 'Status')}</th>
              </tr></thead>
              <tbody>
                {shown.map(r => {
                  const st = CONTRACT_STATUS[effectiveStatus(r)] || CONTRACT_STATUS.draft
                  return (
                    <tr key={r.id} onClick={() => setDetailsRow(r)} style={{ cursor: 'pointer', transition: 'background .12s' }} {...mpRowHover}>
                      <td style={{ ...td, fontFamily: 'monospace', color: C.gold, direction: 'ltr', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{r.contract_no}</td>
                      <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.client_name}</td>
                      <td style={td}>{branchLabel(r.branch_id)}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)' }}>{fmtD(r.start_date)}</td>
                      <td style={{ ...td, textAlign: 'center', color: 'var(--tx3)' }}>{fmtD(r.end_date)}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{nm((r.lines || []).length)}</td>
                      <td style={{ ...td, textAlign: 'center', color: C.gold, fontWeight: 600 }}>{nm(contractMonthly(r))}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{nm((claimsByContract[r.id] || []).length)}</td>
                      <td style={{ ...td, textAlign: 'center' }}><MpBadge st={st} lang={lang} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && <ContractModal sb={sb} T={T} lang={lang} user={user} branches={branches} cities={cities}
        rateCard={rateCard} quotes={quotes} editRow={editRow}
        onClose={() => { setShowModal(false); setEditRow(null) }} onSaved={load} />}
    </div>
  )
}

/* ═══════════════ نافذة إنشاء / تعديل عقد ═══════════════ */
function ContractModal({ sb, T, lang, user, branches, cities, rateCard, quotes, editRow, onClose, onSaved }) {
  const [f, setF] = useState(() => editRow ? {
    branch_id: editRow.branch_id, quote_id: editRow.quote_id || null,
    client_name: editRow.client_name || '', client_name_en: editRow.client_name_en || '',
    client_location: editRow.client_location || '', attn_name: editRow.attn_name || '',
    client_phone: String(editRow.client_phone || '').replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '').slice(-9),
    start_date: editRow.start_date || null, end_date: editRow.end_date || null,
    pricing_method: editRow.pricing_method || 'hour',
    hours_per_day: String(editRow.hours_per_day ?? 10), days_per_month: String(editRow.days_per_month ?? 26),
    ot_multiplier: String(editRow.ot_multiplier ?? 1.5), vat_pct: String(editRow.vat_pct ?? 15),
    absence_deduction_rate: String(editRow.absence_deduction_rate ?? 43.5), payment_due_days: String(editRow.payment_due_days ?? 45),
    project_name: editRow.project_name || '', project_name_en: editRow.project_name_en || '',
    po_number: editRow.po_number || '', client_vat_no: editRow.client_vat_no || '',
    client_cr_no: editRow.client_cr_no || '', client_address: editRow.client_address || '',
    payment_terms_key: editRow.payment_terms_key || 'net15',
    invoice_terms: editRow.invoice_terms || '', invoice_terms_en: editRow.invoice_terms_en || '',
    status: editRow.status || 'draft',
    lines: (editRow.lines?.length ? editRow.lines : [emptyLine()]).map(l => ({ ...l, unit_price: String(l.unit_price ?? ''), ot_rate: String(l.ot_rate ?? ''), qty: String(l.qty ?? '') })),
  } : {
    branch_id: user?.primary_branch_id || null, quote_id: null,
    client_name: '', client_name_en: '', client_location: '', attn_name: '', client_phone: '',
    start_date: null, end_date: null, pricing_method: 'hour',
    hours_per_day: '10', days_per_month: '26', ot_multiplier: '1.5', vat_pct: '15',
    absence_deduction_rate: '43.5', payment_due_days: '45',
    project_name: '', project_name_en: '', po_number: '', client_vat_no: '', client_cr_no: '', client_address: '',
    payment_terms_key: 'net15', invoice_terms: '', invoice_terms_en: '', status: 'draft',
    lines: [emptyLine()],
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [savedRow, setSavedRow] = useState(null)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setLine = (i, k, v) => setF(p => { const a = p.lines.slice(); a[i] = { ...a[i], [k]: v }; return { ...p, lines: a } })

  /* اختيار مهنة يجلب اسمها الإنجليزي من جدول المهن، وسعرها المقترح من بطاقة الأسعار
     — والمستخدم يكتب فوق السعر متى شاء، فبطاقة الأسعار مرجعٌ لا قيد. */
  const pickTrade = (i, nameAr) => setF(p => {
    const rc = (rateCard || []).find(x => x.position_ar === nameAr)
    const a = p.lines.slice()
    // السعر وسعر الإضافي يُقترحان من البطاقة ولا يُفرضان — عقدٌ بعينه قد يُسعَّر خلافها
    a[i] = { ...a[i], item: nameAr, item_en: rc?.position_en || '',
      unit_price: String(rc?.billing_rate ?? a[i].unit_price ?? ''),
      ot_rate: String(rc?.ot_billing_rate ?? a[i].ot_rate ?? '') }
    return { ...p, lines: a }
  })

  /* نسخ بيانات تسعيرة إلى العقد — العميل وشروطه وبنوده، فلا يُعاد إدخال ما أُدخل */
  const fromQuote = (qid) => setF(p => {
    const q = (quotes || []).find(x => x.id === qid)
    if (!q) return { ...p, quote_id: qid }
    return {
      ...p, quote_id: qid,
      branch_id: q.branch_id || p.branch_id,
      client_name: q.client_name || '', client_name_en: q.client_name_en || '',
      client_location: q.client_location || '', attn_name: q.attn_name || '',
      client_phone: String(q.client_phone || '').replace(/\D/g, '').slice(-9),
      start_date: q.start_date || p.start_date,
      pricing_method: q.pricing_method || 'hour',
      hours_per_day: String(q.hours_per_day ?? 10), days_per_month: String(q.days_per_month ?? 26),
      payment_terms_key: q.payment_terms_key || 'net15',
      invoice_terms: q.invoice_terms || '', invoice_terms_en: q.invoice_terms_en || '',
      lines: (q.revenue_lines || []).length
        ? q.revenue_lines.map(l => ({ item: l.item || '', item_en: l.item_en || '', method: l.method || 'hour', unit_price: String(l.unit_price ?? ''), ot_rate: String((rateCard || []).find(x => x.position_ar === l.item)?.ot_billing_rate ?? ''), qty: String((q.professions || []).find(pr => pr.name === l.item)?.qty ?? '') }))
        : p.lines,
    }
  })

  const activeLines = f.lines.filter(l => l.item && n(l.unit_price) > 0)
  const monthly = contractMonthly({ ...f, lines: activeLines })
  const canSave = f.client_name.trim().length > 0 && activeLines.length > 0

  const save = async () => {
    if (!canSave || submitting) return
    setSubmitting(true); setErr(null)
    const payload = {
      branch_id: f.branch_id || null, quote_id: f.quote_id || null,
      client_name: f.client_name.trim(), client_name_en: f.client_name_en.trim() || null,
      client_location: f.client_location.trim() || null, attn_name: f.attn_name.trim() || null,
      client_phone: f.client_phone.trim() || null,
      start_date: f.start_date || null, end_date: f.end_date || null,
      pricing_method: f.pricing_method || 'hour',
      hours_per_day: n(f.hours_per_day) || 10, days_per_month: n(f.days_per_month) || 26,
      ot_multiplier: n(f.ot_multiplier) || 1.5, vat_pct: n(f.vat_pct),
      absence_deduction_rate: n(f.absence_deduction_rate), payment_due_days: Math.max(0, Math.round(n(f.payment_due_days))) || 45,
      project_name: f.project_name.trim() || null, project_name_en: f.project_name_en.trim() || null,
      po_number: f.po_number.trim() || null, client_vat_no: f.client_vat_no.trim() || null,
      client_cr_no: f.client_cr_no.trim() || null, client_address: f.client_address.trim() || null,
      payment_terms_key: f.payment_terms_key || 'net15',
      invoice_terms: f.invoice_terms.trim() || null, invoice_terms_en: f.invoice_terms_en.trim() || null,
      status: f.status || 'draft',
      lines: activeLines.map(l => ({ item: l.item.trim(), item_en: (l.item_en || '').trim(), method: l.method || f.pricing_method, unit_price: n(l.unit_price), ot_rate: n(l.ot_rate) || null, qty: n(l.qty) })),
      workers_total: activeLines.reduce((t, l) => t + n(l.qty), 0),
    }
    try {
      if (editRow?.id) {
        const { data, error } = await sb.from('manpower_contracts').update(payload).eq('id', editRow.id).select('*').single()
        if (error) throw error
        await onSaved?.(); setSavedRow(data)
      } else {
        const { data, error } = await sb.from('manpower_contracts').insert({ ...payload, created_by: user?.id || null }).select('*').single()
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

  /* ── الخطوة 1: العميل والعقد ── */
  const pgClient = frame(Building2, T('العميل والعقد', 'Client & Contract'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FKSelect label={T('بناءً على تسعيرة (اختياري)', 'Build on a quote (optional)')} value={f.quote_id} onChange={fromQuote}
        options={(quotes || []).map(q => ({ v: q.id, l: q.quote_no + ' — ' + (q.client_name || '') }))}
        getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر تسعيرة لنسخ بياناتها', 'Pick a quote to copy its data')} full />
      <div style={row2}>
        <TextField label={T('اسم العميل / المنشأة', 'Client / Company')} req value={f.client_name} onChange={v => set('client_name', v)} placeholder={T('بالعربي', 'In Arabic')} />
        <TextField label={T('اسم العميل / المنشأة', 'Client / Company')} value={f.client_name_en} onChange={v => set('client_name_en', v)} dir="ltr" placeholder={T('بالإنجليزي', 'In English')} />
      </div>
      <div style={row2}>
        <TextField label={T('اسم المسؤول', 'Contact person')} value={f.attn_name} onChange={v => set('attn_name', v)} />
        <PhoneField label={T('جوال المسؤول', 'Contact mobile')} value={f.client_phone} onChange={v => set('client_phone', v)} />
      </div>
      <div style={row2}>
        <FKSelect label={T('المدينة', 'City')} value={f.client_location} onChange={v => set('client_location', v)}
          options={(cities || []).map(c => ({ v: lang === 'en' ? (c.name_en || c.name_ar) : c.name_ar, l: lang === 'en' ? (c.name_en || c.name_ar) : c.name_ar }))}
          getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المدينة', 'Pick a city')} />
        <FKSelect label={T('المكتب', 'Branch')} value={f.branch_id} onChange={v => set('branch_id', v)}
          options={(branches || []).map(b => ({ v: b.id, l: (b.name_ar || '') + (b.branch_code ? ' (' + b.branch_code + ')' : '') }))}
          getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المكتب', 'Pick a branch')} />
      </div>
      <div style={row2}>
        <FKDateField label={T('بداية العقد', 'Start date')} value={f.start_date} onChange={v => set('start_date', v)} />
        <FKDateField label={T('نهاية العقد', 'End date')} value={f.end_date} onChange={v => set('end_date', v)} />
      </div>
    </div>
  )

  /* ── الخطوة 2: بنود العقد — لكل مهنة سعرها العادي وسعر ساعتها الإضافية ── */
  const lineCols = [
    { k: 'item', label: T('المهنة', 'Trade'), flex: 3, min: 0 },
    { k: 'qty', label: T('العدد', 'Qty'), flex: 1, min: 74 },
    { k: 'price', label: T('السعر', 'Rate'), flex: 1.3, min: 104 },
    { k: 'ot', label: T('سعر الإضافي', 'OT rate'), flex: 1.3, min: 104 },
  ]
  const pgLines = frame(ClipboardList, T('بنود العقد', 'Contract Items'), null,
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        {lineCols.map(c => <div key={c.k} style={{ flex: c.flex, minWidth: c.min, fontSize: 11, fontWeight: 600, color: 'var(--tx4)', textAlign: 'center' }}>{c.label}</div>)}
        {f.lines.length > 1 && <div style={{ width: 30, flexShrink: 0 }} />}
      </div>
      <div className="sr-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingInlineEnd: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {f.lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 3, minWidth: 0 }}>
              <FKSelect value={l.item} onChange={v => pickTrade(i, v)}
                options={(rateCard || []).filter(o => o.position_ar).map(o => ({ v: o.position_ar, l: lang === 'en' ? (o.position_en || o.position_ar) : o.position_ar }))}
                getKey={o => o.v} getLabel={o => o.l} placeholder={T('اختر المهنة', 'Pick a trade')} />
            </div>
            <div style={{ flex: 1, minWidth: 74 }}>
              <NumberField value={l.qty} onChange={v => setLine(i, 'qty', v)} min={0} placeholder={T('العدد', 'Qty')} />
            </div>
            <div style={{ flex: 1.3, minWidth: 104 }}>
              <CurrencyField value={l.unit_price} onChange={v => setLine(i, 'unit_price', v)} />
            </div>
            <div style={{ flex: 1.3, minWidth: 104 }}>
              <CurrencyField value={l.ot_rate} onChange={v => setLine(i, 'ot_rate', v)} />
            </div>
            {f.lines.length > 1 && <button onClick={() => setF(p => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} title={T('حذف', 'Remove')}
              style={{ width: 30, height: 42, borderRadius: 9, border: '1px solid var(--bd)', background: 'transparent', color: '#e5534b', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trash2 size={14} /></button>}
          </div>
        ))}
        {f.lines.length < 20 && <button onClick={() => setF(p => ({ ...p, lines: [...p.lines, { ...emptyLine(), method: p.pricing_method }] }))}
          style={{ alignSelf: 'flex-start', height: 32, padding: '0 12px', borderRadius: 9, border: '1px dashed ' + C.gold + '80', background: 'transparent', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Plus size={13} strokeWidth={2.4} />{T('إضافة بند', 'Add item')}</button>}
      </div>
    </div>
  )

  /* ── الخطوة 3: بيانات الفوترة الرسمية — تظهر على الفاتورة الضريبية والمستخلص ── */
  const pgBilling = frame(Receipt, T('بيانات الفوترة الرسمية', 'Official Billing Data'),
    T('تُطبع على الفاتورة الضريبية والمستخلص — اتركها فارغة إن لم تتوفر', 'Printed on the tax invoice and claim — leave blank if unavailable'),
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={row2}>
        <TextField label={T('اسم المشروع', 'Project name')} value={f.project_name} onChange={v => set('project_name', v)} placeholder={T('بالعربي', 'In Arabic')} />
        <TextField label={T('اسم المشروع', 'Project name')} value={f.project_name_en} onChange={v => set('project_name_en', v)} dir="ltr" placeholder={T('بالإنجليزي', 'In English')} />
      </div>
      <div style={row2}>
        <TextField label={T('رقم أمر الشراء', 'P.O. number')} value={f.po_number} onChange={v => set('po_number', v)} dir="ltr" />
        <TextField label={T('الرقم الضريبي للعميل', 'Client VAT No.')} value={f.client_vat_no} onChange={v => set('client_vat_no', v)} dir="ltr" />
      </div>
      <div style={row2}>
        <TextField label={T('السجل التجاري للعميل', 'Client C.R')} value={f.client_cr_no} onChange={v => set('client_cr_no', v)} dir="ltr" />
        <TextField label={T('عنوان الفوترة', 'Billing address')} value={f.client_address} onChange={v => set('client_address', v)} />
      </div>
    </div>
  )

  /* ── الخطوة 4: التسعير والشروط ── */
  const canSetStatus = isGM(user) || canTab(user, 'manpower_contracts', 'activate')
  const pgTerms = frame(Calculator, T('التسعير والشروط', 'Pricing & Terms'), null,
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Segmented label={T('طريقة التسعير', 'Pricing method')} value={f.pricing_method} onChange={v => set('pricing_method', v)} full
        options={METHODS.map(m => ({ v: m.v, l: lang === 'en' ? m.en : m.ar }))} />
      <div style={GRID}>
        {(f.pricing_method === 'hour') && <NumberField label={T('عدد الساعات باليوم', 'Hours per day')} value={f.hours_per_day} onChange={v => set('hours_per_day', v)} min={1} max={24} />}
        {(f.pricing_method === 'hour' || f.pricing_method === 'day') && <NumberField label={T('أيام العمل بالشهر', 'Working days / month')} value={f.days_per_month} onChange={v => set('days_per_month', v)} min={1} max={31} />}
        <NumberField label={T('ضريبة القيمة المضافة %', 'VAT %')} value={f.vat_pct} onChange={v => set('vat_pct', v)} min={0} max={100} />
        {/* خصم السكن والإعاشة عن كل يوم غياب — يُخصم من المستخلص قبل الضريبة */}
        <CurrencyField label={T('خصم الغياب لليوم (ر.س)', 'Absence deduction / day (SAR)')} value={f.absence_deduction_rate} onChange={v => set('absence_deduction_rate', v)} />
        <NumberField label={T('السداد خلال (يوم)', 'Payment due (days)')} value={f.payment_due_days} onChange={v => set('payment_due_days', v)} min={0} max={365} />
      </div>
      <FKSelect label={T('شروط الدفع', 'Payment terms')} value={f.payment_terms_key} onChange={v => set('payment_terms_key', v)}
        options={PAYMENT_TERMS.map(p => ({ v: p.v, l: lang === 'en' ? p.s : p.ar }))} getKey={o => o.v} getLabel={o => o.l} searchable={false} full />
      <div style={row2}>
        <TextArea label={T('شروط الفوترة / المستخلصات', 'Billing terms')} value={f.invoice_terms} onChange={v => set('invoice_terms', v)} rows={2} full={false} placeholder={T('بالعربي', 'In Arabic')} />
        <TextArea label={T('شروط الفوترة / المستخلصات', 'Billing terms')} value={f.invoice_terms_en} onChange={v => set('invoice_terms_en', v)} rows={2} dir="ltr" full={false} placeholder={T('بالإنجليزي', 'In English')} />
      </div>
      {/* حالة العقد صلاحية اعتمادٍ مستقلة — من لا يملكها يحفظ العقد بحالته الراهنة */}
      {canSetStatus && <Segmented label={T('حالة العقد', 'Contract status')} value={f.status} onChange={v => set('status', v)} full
        options={Object.entries(CONTRACT_STATUS).map(([k, s]) => ({ v: k, l: lang === 'en' ? s.en : s.ar, c: s.c }))} />}
      <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>{T('القيمة الشهرية التقديرية', 'Estimated monthly value')}</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: C.gold, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{nm(monthly)}</span>
      </div>
    </div>
  )

  const pages = [
    { valid: f.client_name.trim().length > 0, content: pgClient },
    { valid: activeLines.length > 0, content: pgLines },
    { content: pgBilling },
    { valid: canSave, error: err, content: pgTerms },
  ]

  return (
    <FKModal open onClose={onClose} title={editRow ? T('تعديل العقد', 'Edit contract') : T('عقد توريد عمالة جديد', 'New Manpower Contract')}
      Icon={FileText} width={940} height="min(720px, 92vh)" accent={C.gold} lang={lang}
      pages={pages} onSubmit={save} submitting={submitting}
      submitLabel={editRow ? T('حفظ التعديلات', 'Save changes') : T('حفظ العقد', 'Save contract')} submitIcon={BadgeCheck}
      success={savedRow ? <SuccessView title={T('تم حفظ العقد بنجاح', 'Contract saved')} code={savedRow.contract_no} /> : null} />
  )
}
