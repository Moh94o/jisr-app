import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarPopup } from './KafalaCalculator.jsx'
import BackButton from '../components/BackButton'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 60

const num = (v) => Number(v || 0).toLocaleString('en-US')
const flagEmoji = (code) => { if (!code || code.length !== 2) return ''; try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + 127397)) } catch { return '' } }
const fmtPhone = (phone) => {
  if (!phone) return phone
  const s = String(phone).replace(/[^\d]/g, '')
  if (s.startsWith('966') && s.length === 12) return '0' + s.slice(3)
  return s
}
const fmtGreg = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${yyyy}-${mm}-${dd}`
  } catch { return '—' }
}
const fmtDateTime = (iso, ar = true) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    const h24 = d.getHours()
    const mn = String(d.getMinutes()).padStart(2, '0')
    const period = ar ? (h24 < 12 ? 'ص' : 'م') : (h24 < 12 ? 'AM' : 'PM')
    const h12 = ((h24 + 11) % 12) + 1
    const hh = String(h12).padStart(2, '0')
    return `${yyyy}/${mm}/${dd} · ${hh}:${mn} ${period}`
  } catch { return '—' }
}

/* ─────── Service-type theme ─────── */
const SVC_THEME = {
  work_visa:            { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل',         label_en: 'Work Visa' },
  work_visa_permanent:  { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل دائمة',   label_en: 'Permanent Work Visa' },
  work_visa_temporary:  { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل مؤقتة',   label_en: 'Temporary Work Visa' },
  iqama_issuance: { c: '#27ae60',bg: 'rgba(39,174,96,.12)',   bd: 'rgba(39,174,96,.32)',   label_ar: 'إصدار إقامة', label_en: 'Iqama Issuance' },
  transfer:       { c: C.orange, bg: 'rgba(243,156,18,.12)',  bd: 'rgba(243,156,18,.32)',  label_ar: 'نقل كفالة',   label_en: 'Transfer' },
  ajeer:          { c: C.purple, bg: 'rgba(187,143,206,.12)', bd: 'rgba(187,143,206,.32)', label_ar: 'أجير',        label_en: 'Ajeer' },
  iqama_renewal:  { c: C.cyan,   bg: 'rgba(22,160,133,.12)',  bd: 'rgba(22,160,133,.32)',  label_ar: 'تجديد إقامة', label_en: 'Iqama Renewal' },
  other:          { c: C.gray,   bg: 'rgba(149,165,166,.12)', bd: 'rgba(149,165,166,.32)', label_ar: 'خدمة أخرى',   label_en: 'Other' },
  general:        { c: '#7f8c8d',bg: 'rgba(127,140,141,.12)', bd: 'rgba(127,140,141,.32)', label_ar: 'خدمة عامة',   label_en: 'General' },
}
const STATUS_THEME = {
  new:         { c: C.blue,   stamp_ar: 'جديد',         stamp_en: 'NEW' },
  in_progress: { c: C.gold,   stamp_ar: 'قيد التنفيذ',  stamp_en: 'IN PROGRESS' },
  done:        { c: C.ok,     stamp_ar: 'منجز',         stamp_en: 'DONE' },
  cancelled:   { c: C.red,    stamp_ar: 'ملغي',         stamp_en: 'CANCELLED' },
  on_hold:     { c: C.purple, stamp_ar: 'معلق',         stamp_en: 'ON HOLD' },
}

const SVC_ICON_WORK_VISA = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>
const SVC_ICON = {
  work_visa: SVC_ICON_WORK_VISA,
  work_visa_permanent: SVC_ICON_WORK_VISA,
  work_visa_temporary: SVC_ICON_WORK_VISA,
  iqama_issuance: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6M7 16h4"/><path d="m17 14 2 2 3-3"/></svg>,
  transfer: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>,
  ajeer: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  iqama_renewal: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
  other: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>,
  general: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
}

/* ─────── Sparkline ─────── */
function Sparkline({ points, color = C.gold, height = 80 }) {
  if (!points?.length) return null
  const max = Math.max(1, ...points)
  const W = 360, H = height
  const px = i => (i / Math.max(1, points.length - 1)) * W
  const py = v => H - (v / max) * (H - 8) - 4
  const linePath = points.map((v, i) => (i === 0 ? 'M' : 'L') + px(i).toFixed(1) + ',' + py(v).toFixed(1)).join(' ')
  const areaPath = linePath + ` L${W},${H} L0,${H} Z`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="tx-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.42" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#tx-spark-fill)" />
      <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={px(0)} cy={py(points[0])} r="3.5" fill={C.ok} stroke="#1a1a1a" strokeWidth="2" />
      <circle cx={px(points.length - 1)} cy={py(points[points.length - 1])} r="3.5" fill={color} stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function TransactionsPage({ sb, lang, user, branchId, toast, lockedService, lockedLabel }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [statsAgg, setStatsAgg] = useState({ services: [], statuses: [] })
  const [statsDaily, setStatsDaily] = useState([])
  const [statsTotalCount, setStatsTotalCount] = useState(0)
  const [typeStats, setTypeStats] = useState(null) // per-type overview (locked pages only)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // Filters
  const [q, setQ] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [status, setStatus] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [advOpen, setAdvOpen] = useState(false)

  const [detail, setDetail] = useState(null)

  // Lookups
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])
  const [statuses, setStatuses] = useState([])

  // When locked to a single request type, resolve its service_type lookup id.
  const lockedServiceId = useMemo(() => (lockedService ? (services.find(s => s.code === lockedService)?.id || null) : null), [lockedService, services])

  useEffect(() => {
    let alive = true
    Promise.all([
      sb.from('branches').select('id,branch_code').order('branch_code'),
      sb.from('lookup_items').select('id,code,value_ar,value_en,category:lookup_categories!inner(category_key)').in('category.category_key', ['service_type', 'request_status']),
    ]).then(([b, l]) => {
      if (!alive) return
      setBranches(b.data || [])
      const items = l.data || []
      setServices(items.filter(i => i.category?.category_key === 'service_type'))
      setStatuses(items.filter(i => i.category?.category_key === 'request_status'))
    })
    return () => { alive = false }
  }, [sb])

  // Server-side aggregations (independent of paged list)
  useEffect(() => {
    let alive = true
    Promise.all([
      sb.from('v_service_request_stats').select('*'),
      sb.from('v_service_request_daily').select('*'),
      sb.from('service_requests').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    ]).then(([s, d, c]) => {
      if (!alive) return
      const items = s.data || []
      setStatsAgg({
        services: items.filter(i => i.dim === 'service_type'),
        statuses: items.filter(i => i.dim === 'status'),
      })
      setStatsDaily(d.data || [])
      setStatsTotalCount(c.count || 0)
    })
    return () => { alive = false }
  }, [sb])

  // Per-type overview stats (locked pages) — scoped to the single request type + branch,
  // independent of the in-page status/date/search filters so the KPI strip stays stable.
  useEffect(() => {
    if (!lockedService) { setTypeStats(null); return }
    if (!lockedServiceId) { setTypeStats(null); return }
    let alive = true
    const effBranch = branchFilter || branchId
    let qb = sb.from('service_requests')
      .select('id,request_date,status:status_id(code)', { count: 'exact' })
      .is('deleted_at', null)
      .eq('service_type_id', lockedServiceId)
      .limit(5000)
    if (effBranch) qb = qb.eq('branch_id', effBranch)
    qb.then(({ data, count }) => {
      if (!alive) return
      const list = data || []
      const todayStr = new Date().toISOString().slice(0, 10)
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6); weekAgo.setHours(0, 0, 0, 0)
      let today = 0, week = 0
      const byStatus = {}
      list.forEach(r => {
        const dStr = (r.request_date || '').slice(0, 10)
        if (dStr === todayStr) today++
        const dt = r.request_date ? new Date(r.request_date) : null
        if (dt && dt >= weekAgo) week++
        const code = r.status?.code || 'new'
        byStatus[code] = (byStatus[code] || 0) + 1
      })
      setTypeStats({ total: count ?? list.length, today, week, byStatus })
    })
    return () => { alive = false }
  }, [sb, lockedService, lockedServiceId, branchFilter, branchId])

  // Paged list
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
    // Wait until the service-type lookup resolves the locked code's id before querying,
    // otherwise the first render would briefly show every type.
    if (lockedService && !lockedServiceId) return () => { alive = false }
    let qb = sb
      .from('service_requests')
      .select(`
        id, request_ref_no, request_date, paid_date, quantity, note,
        client:client_id(id,name_ar,name_en,phone,id_number,nationality:nationality_id(code,name_ar,flag_url)),
        service_type:service_type_id(code,value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(id,branch_code)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('request_date', { ascending: false, nullsFirst: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    const effectiveBranch = branchFilter || branchId
    if (effectiveBranch) qb = qb.eq('branch_id', effectiveBranch)
    const effectiveServiceType = lockedServiceId || serviceType
    if (effectiveServiceType) qb = qb.eq('service_type_id', effectiveServiceType)
    if (status) qb = qb.eq('status_id', status)
    if (from) qb = qb.gte('request_date', from)
    if (to) qb = qb.lte('request_date', to + 'T23:59:59')
    if (q.trim()) qb = qb.ilike('request_ref_no', `%${q.trim()}%`)

    qb.then(({ data, count, error }) => {
      if (!alive) return
      if (error) { setErr(error.message); setLoading(false); return }
      setRows(data || []); setTotal(count || 0); setLoading(false)
    })
    return () => { alive = false }
  }, [sb, page, branchFilter, branchId, serviceType, lockedServiceId, lockedService, status, q, from, to])

  /* ─────── Stats (from server-side aggregation views) ─────── */
  const stats = useMemo(() => {
    const total = statsTotalCount
    const byService = Object.fromEntries(statsAgg.services.map(s => [s.code, Number(s.cnt) || 0]))
    const byStatus  = Object.fromEntries(statsAgg.statuses.map(s => [s.code, Number(s.cnt) || 0]))

    // 14-day sparkline from daily view
    const days = 14, today = new Date(); today.setHours(0,0,0,0)
    const buckets = new Array(days).fill(0)
    statsDaily.forEach(d => {
      const dt = new Date(d.day); dt.setHours(0,0,0,0)
      const age = Math.round((today - dt) / 86400000)
      if (age >= 0 && age < days) buckets[days - 1 - age] = Number(d.cnt) || 0
    })

    // This-week & today counts derived from sparkline buckets
    const todayCnt = buckets[buckets.length - 1] || 0
    const weekCnt  = buckets.slice(-7).reduce((a, b) => a + b, 0)

    // Monthly trend
    const now = new Date()
    const thisMonth = statsDaily.filter(d => { const dt = new Date(d.day); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear() }).reduce((s, d) => s + Number(d.cnt || 0), 0)
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = statsDaily.filter(d => { const dt = new Date(d.day); return dt.getMonth() === lastMonthDate.getMonth() && dt.getFullYear() === lastMonthDate.getFullYear() }).reduce((s, d) => s + Number(d.cnt || 0), 0)
    const trend = lastMonth ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : (thisMonth ? 100 : 0)

    return { total, byService, byStatus, sparkline: buckets, todayCnt, weekCnt, thisMonth, trend }
  }, [statsAgg, statsDaily, statsTotalCount])

  /* ─────── Day-grouped rendering ─────── */
  const grouped = useMemo(() => {
    const days = {}; const order = []
    rows.forEach(r => {
      const k = (r.request_date || '').slice(0, 10) || 'بدون'
      if (!days[k]) { days[k] = []; order.push(k) }
      days[k].push(r)
    })
    return { days, order }
  }, [rows])
  const todayStr = new Date().toISOString().slice(0,10)
  const dayNames = [T('الأحد','Sun'), T('الاثنين','Mon'), T('الثلاثاء','Tue'), T('الأربعاء','Wed'), T('الخميس','Thu'), T('الجمعة','Fri'), T('السبت','Sat')]
  const monthNames = [T('يناير','Jan'),T('فبراير','Feb'),T('مارس','Mar'),T('أبريل','Apr'),T('مايو','May'),T('يونيو','Jun'),T('يوليو','Jul'),T('أغسطس','Aug'),T('سبتمبر','Sep'),T('أكتوبر','Oct'),T('نوفمبر','Nov'),T('ديسمبر','Dec')]
  const dayLabel = (k) => k === todayStr ? T('اليوم','Today') : (() => { try { const d = new Date(k + 'T12:00:00'); return dayNames[d.getDay()] } catch { return k } })()
  const dayFull  = (k) => { try { const d = new Date(k + 'T12:00:00'); return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') } catch { return k } }
  const totalPages = Math.max(1, Math.ceil(total / PAGE))

  if (detail) return <TransactionDetailPage sb={sb} sr={detail} onBack={() => setDetail(null)} isAr={isAr} T={T} toast={toast} user={user} />

  /* ─────── Render ─────── */
  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{lockedLabel || T('المعاملات','Transactions')}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{lockedService ? T(`جميع طلبات «${lockedLabel}» ومتابعة حالتها`, `All “${lockedLabel}” requests — tracked by status and branch`) : T('سجل الطلبات الرئيسية ومتابعة حالتها بحسب الخدمة والمكتب','Main service requests log — tracked by service type, branch and status')}</div>
      </div>

      {/* Stats — Hero KPI + Sidebar (statuses) + Services card (hidden on per-type pages, where cross-type stats would be misleading) */}
      {!lockedService && (
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — Today's transactions count, big */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          {/* Top — label with dot */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('معاملات اليوم','Today')}</span>
          </div>
          {/* Center — big number */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.todayCnt)}</span>
            <span style={{ fontSize: 14, color: 'var(--tx4)', fontWeight: 600 }}>/ {num(stats.weekCnt)} {T('أسبوع','wk')}</span>
          </div>
          {/* Bottom — totals */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('إجمالي السجلات','Total records')}</span>
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
          </div>
        </div>

        {/* Sidebar — 2 status KPIs stacked */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 150,
        }}>
          {[
            { code: 'new', label: T('جديد','New'), c: C.blue },
            { code: 'in_progress', label: T('قيد التنفيذ','In Progress'), c: C.gold },
          ].map((s, i) => {
            const cnt = stats.byStatus[s.code] || 0
            const li = statuses.find(x => x.code === s.code)
            const isActive = status === li?.id
            return (
              <div key={s.code}
                onClick={() => { setStatus(isActive ? '' : (li?.id || '')); setPage(0) }}
                style={{
                  position: 'relative', padding: '12px 16px', flex: 1,
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
                  overflow: 'hidden', cursor: 'pointer',
                  background: isActive ? `${s.c}10` : 'transparent',
                  transition: '.15s',
                }}>
                <div style={{ position: 'absolute', insetInlineStart: -25, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.c}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{s.label}</span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', direction: 'ltr' }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{num(cnt)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Services card — distribution with stacked bar + 2-col labels */}
        {(() => {
          const MAIN_SVC = ['work_visa', 'transfer', 'iqama_renewal', 'ajeer', 'other', 'general']
          const totalSvc = MAIN_SVC.reduce((a, code) => a + (stats.byService[code] || 0), 0)
          return (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الخدمات','Services')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(totalSvc)}</span> {T('سجل','records')}
                </span>
              </div>
              {totalSvc > 0 && (
                <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                  {MAIN_SVC.filter(code => (stats.byService[code] || 0) > 0).map(code => {
                    const theme = SVC_THEME[code] || SVC_THEME.general
                    const cnt = stats.byService[code] || 0
                    const pct = (cnt / totalSvc) * 100
                    return <div key={code} title={`${theme.label_ar}: ${cnt}`} style={{ width: pct + '%', background: theme.c, transition: 'width .3s' }} />
                  })}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                {MAIN_SVC.map(code => {
                  const theme = SVC_THEME[code] || SVC_THEME.general
                  const cnt = stats.byService[code] || 0
                  const isZero = cnt === 0
                  const li = services.find(s => s.code === code)
                  const isActive = serviceType && services.find(s => s.id === serviceType)?.code === code
                  return (
                    <div key={code}
                      onClick={() => { if (li) { setServiceType(isActive ? '' : li.id); setPage(0) } }}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: isZero ? 0.45 : 1, cursor: li ? 'pointer' : 'default', color: isActive ? theme.c : undefined, transition: '.15s' }}>
                      <span style={{ color: isZero ? 'var(--tx4)' : theme.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(cnt)}</span>
                      <span style={{ color: isActive ? theme.c : 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{T(theme.label_ar, theme.label_en)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>
      )}

      {/* Per-type stats — overview card + status-breakdown card */}
      {lockedService && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 24 }}>

          {/* Overview — total (big) + today / this-week */}
          <div style={{
            position: 'relative', padding: '18px 22px', borderRadius: 16,
            background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
            border: '1px solid rgba(255,255,255,.05)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflow: 'hidden', minHeight: 150,
          }}>
            <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
              <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{T('إجمالي الطلبات','Total requests')}</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 8, direction: 'ltr' }}>
              <span style={{ fontSize: 44, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(typeStats?.total || 0)}</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('اليوم','Today')}</span>
                <span style={{ fontSize: 18, color: '#fff', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(typeStats?.today || 0)}</span>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,.06)', margin: '0 4px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('هذا الأسبوع','This week')}</span>
                <span style={{ fontSize: 18, color: '#fff', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(typeStats?.week || 0)}</span>
              </div>
            </div>
          </div>

          {/* Status breakdown — stacked bar + clickable status counts */}
          {(() => {
            const ST = [
              { code: 'new',         label: T('جديد','New'),          c: C.blue },
              { code: 'in_progress', label: T('قيد التنفيذ','In progress'), c: C.gold },
              { code: 'done',        label: T('منجز','Done'),         c: C.ok },
              { code: 'cancelled',   label: T('ملغي','Cancelled'),    c: C.red },
            ]
            const totalSt = ST.reduce((a, s) => a + (typeStats?.byStatus?.[s.code] || 0), 0)
            return (
              <div style={{
                borderRadius: 16,
                background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
                border: '1px solid rgba(255,255,255,.05)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
                padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{T('الحالات','Statuses')}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('اضغط للتصفية','Click to filter')}</span>
                </div>
                <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                  {totalSt > 0 && ST.filter(s => (typeStats?.byStatus?.[s.code] || 0) > 0).map(s => {
                    const cnt = typeStats?.byStatus?.[s.code] || 0
                    return <div key={s.code} title={`${s.label}: ${cnt}`} style={{ width: (cnt / totalSt * 100) + '%', background: s.c, transition: 'width .3s' }} />
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 14px' }}>
                  {ST.map(s => {
                    const cnt = typeStats?.byStatus?.[s.code] || 0
                    const li = statuses.find(x => x.code === s.code)
                    const isActive = li && status === li.id
                    return (
                      <div key={s.code}
                        onClick={li ? () => { setStatus(isActive ? '' : (li.id || '')); setPage(0) } : undefined}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderRadius: 9, cursor: li ? 'pointer' : 'default', background: isActive ? s.c + '12' : 'transparent', border: `1px solid ${isActive ? s.c + '40' : 'transparent'}`, transition: '.15s', opacity: cnt === 0 && !isActive ? 0.55 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: isActive ? s.c : 'var(--tx2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                        </div>
                        <span style={{ fontSize: 15, color: s.c, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{num(cnt)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder={T('ابحث برقم الطلب أو رقم الإقامة…','Search by ref or iqama no…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', padding: '11px 38px 11px 14px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: 'var(--tx1)', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        <button onClick={() => setAdvOpen(o => !o)} style={btnFilter(advOpen)}>
          {T('تصفية','Filter')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
        </button>
      </div>

      {/* Advanced filter panel */}
      {advOpen && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', padding: 14, borderRadius: 14, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
          <select value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(0) }} style={selS}>
            <option value="">{T('كل المكاتب','All branches')}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_code}</option>)}
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(0) }} style={selS}>
            <option value="">{T('كل الحالات','All statuses')}</option>
            {statuses.map(s => <option key={s.id} value={s.id}>{isAr ? s.value_ar : (s.value_en || s.value_ar)}</option>)}
          </select>
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0) }} style={selS} />
          <input type="date" value={to}   onChange={e => { setTo(e.target.value); setPage(0) }} style={selS} />
          {(branchFilter || status || from || to || serviceType || q) && (
            <button onClick={() => { setBranchFilter(''); setStatus(''); setFrom(''); setTo(''); setServiceType(''); setQ(''); setPage(0) }} style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(232,114,101,.1)', border: '1px solid rgba(232,114,101,.25)', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>{T('مسح الكل','Clear')}</button>
          )}
        </div>
      )}

      {/* List */}
      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>…</div>}
      {!loading && err && <div style={{ padding: 60, textAlign: 'center', color: C.red, fontSize: 13 }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {T('لا توجد سجلات','No records')}
        </div>
      )}

      {!loading && !err && grouped.order.map(dayKey => {
        const dayRows = grouped.days[dayKey]
        // Per-day status breakdown
        const dayDone = dayRows.filter(r => r.status?.code === 'done').length
        const dayInProg = dayRows.filter(r => r.status?.code === 'in_progress').length
        return (
          <div key={dayKey} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: dayKey === todayStr ? C.gold : 'var(--tx2)' }}>{dayLabel(dayKey)}</span>
                <span style={{ fontSize: 12, color: 'var(--tx4)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{dayFull(dayKey)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 16, fontWeight: 600 }}>
                <span>{num(dayRows.length)} {T('طلب','requests')}</span>
                {dayInProg > 0 && <span style={{ color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>· {num(dayInProg)} {T('قيد التنفيذ','in prog')}</span>}
                {dayDone > 0 && <span style={{ color: C.ok, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>✓ {num(dayDone)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayRows.map(r => <TransactionCard key={r.id} r={r} isAr={isAr} T={T} onClick={() => setDetail(r)} />)}
            </div>
          </div>
        )
      })}

      {/* Pagination — Slim split with divider line */}
      {!loading && total > PAGE && (() => {
        const goPrev = () => { setPage(p => Math.max(0, p - 1)); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const goNext = () => { setPage(p => p + 1); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const goTo = n => { setPage(Math.max(0, Math.min(totalPages - 1, n))); document.querySelector('.dash-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }
        const PrevIco = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        const NextIco = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        const prevDisabled = page === 0
        const nextDisabled = page + 1 >= totalPages
        const fromN = (page*PAGE)+1
        const toN = Math.min(total,(page+1)*PAGE)
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,.06)', margin: '4px 4px 14px' }}>
          <style>{`
            .tx-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
            .tx-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
            .tx-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
            .tx-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
            .tx-pg-input::-webkit-outer-spin-button,.tx-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: F }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(total)}</span>
            <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500, fontFamily: F }}>{T('صفحة','Page')} {page+1} {T('من','of')} {totalPages}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button className="tx-pg-btn" disabled={prevDisabled} onClick={goPrev} aria-label={T('السابق','Prev')}><PrevIco/></button>
            <input className="tx-pg-input" type="number" min={1} max={totalPages} value={page+1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v-1) }}/>
            <button className="tx-pg-btn" disabled={nextDisabled} onClick={goNext} aria-label={T('التالي','Next')}><NextIco/></button>
          </div>
        </div>
      })()}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Transaction card — mirrors the invoice card layout
   ═══════════════════════════════════════════════════════════════════════ */
function TransactionCard({ r, isAr, T, onClick }) {
  const svc = SVC_THEME[r.service_type?.code || 'general'] || SVC_THEME.general
  const st  = STATUS_THEME[r.status?.code || 'new'] || STATUS_THEME.new
  const phone = r.client?.phone
  const qty = Number(r.quantity || 1)
  const shortDate = (() => { try { const d = new Date(r.request_date); return d.toLocaleDateString(isAr ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' }) } catch { return '' } })()

  return (
    <div onClick={onClick} className="tx-card"
      style={{
        position: 'relative', cursor: 'pointer',
        borderRadius: 14,
        background: `radial-gradient(ellipse at top, ${svc.c}0a 0%, #222 60%)`,
        border: '1px solid rgba(255,255,255,.05)',
        boxShadow: '0 4px 14px rgba(0,0,0,.22)',
        transition: 'all .15s', overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = st.c + '55' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>

      <div style={{ padding: '16px 22px 14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 200px', gap: 18, alignItems: 'center' }}>

          {/* Right (client) */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {(() => { const nat = r.client?.nationality; const fl = nat?.flag_url; const em = flagEmoji(nat?.code); return fl ? <img src={fl} alt={nat?.name_ar || ''} title={nat?.name_ar || ''} style={{ width: 30, height: 21, objectFit: 'cover', flexShrink: 0, borderRadius: 3 }} /> : (em ? <span title={nat?.name_ar || ''} style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null) })()}
              <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>{r.client?.name_ar || r.client?.name_en || T('— بدون عميل —','— no client —')}</span>
              {qty > 1 && (
                <span title={T('عدد الوحدات','Quantity')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  ×{qty}
                </span>
              )}
            </div>

            {/* ID + phone */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {r.client?.id_number && (
                <span title={T('رقم الهوية','ID number')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>
                  <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{r.client.id_number}</span>
                </span>
              )}
              {phone && (
                <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} title={phone} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx3)', direction: 'ltr', textDecoration: 'none', padding: '2px 6px', borderRadius: 5, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {fmtPhone(phone)}
                </a>
              )}
            </div>

            {/* Service + Ref + Branch */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: svc.bg, border: '1px solid ' + svc.bd, color: svc.c, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {SVC_ICON[r.service_type?.code || 'general'] || SVC_ICON.general}
                {isAr ? svc.label_ar : svc.label_en}
              </span>
              <span style={{ fontSize: 12, color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontWeight: 700 }}>{['TXN', r.branch?.branch_code, String(r.request_ref_no || '').slice(-6)].filter(Boolean).join('-')}</span>
              </span>
              {r.branch?.branch_code && (
                <span title={T('المكتب','Branch')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                  {r.branch.branch_code}
                </span>
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />

          {/* Left (status + date) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('الحالة','Status')}</span>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{shortDate}</span>
            </div>
            {/* Status stamp — outlined like invoice's amount area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.c, boxShadow: `0 0 8px ${st.c}aa`, flexShrink: 0 }} />
              <span style={{ fontSize: 22, fontWeight: 800, color: st.c, letterSpacing: '-.3px', lineHeight: 1, fontFamily: F }}>{isAr ? st.stamp_ar : st.stamp_en}</span>
            </div>
            {/* Sub rows: quantity + ref short */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('الكمية','Quantity')}</span>
                <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>×{qty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('الخدمة','Service')}</span>
                <span style={{ color: svc.c, fontWeight: 700, fontSize: 10 }}>{isAr ? svc.label_ar : svc.label_en}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status strip — flush at bottom edge */}
      <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
        <div style={{ height: '100%', width: '100%', background: st.c, opacity: 0.7 }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Full-page detail — service-specific details + linked invoice + sidebar
   ═══════════════════════════════════════════════════════════════════════ */
function TransactionDetailPage({ sb, sr, onBack, isAr, T, toast, user }) {
  const [data, setData] = useState({ loading: true })
  // Facility-picker state — search across name / unified / GOSI / HRSD numbers; selecting one
  // updates main_facility_id on every visa_application linked to this service request.
  const [facQuery, setFacQuery] = useState('')
  const [facResults, setFacResults] = useState([])
  const [facSearching, setFacSearching] = useState(false)
  const [facSaving, setFacSaving] = useState(false)
  const [facEditing, setFacEditing] = useState(false)
  const [stagedFacility, setStagedFacility] = useState(null)
  const [visaCardSaving, setVisaCardSaving] = useState({})
  // Iqama-issuance follow-up (one row in iqama_issuance_applications linked to this visa)
  const [iqamaRow, setIqamaRow] = useState(null)
  const [iqamaForm, setIqamaForm] = useState({ worker_name_at_entry: '', work_permit_expiry: '', insurance_expiry: '', iqama_number: '', iqama_expiry: '', iqama_delivery_date: '' })
  const [iqamaCardSaving, setIqamaCardSaving] = useState({})
  const [iqamaAttachments, setIqamaAttachments] = useState([])
  const [iqamaUploading, setIqamaUploading] = useState({})
  // Visa-issuance + wakalah form state (visa_applications fields + PDF attachments).
  const [visaForm, setVisaForm] = useState({ visa_number: '', border_number: '', wakalah_office: '', wakalah_date: '' })
  const [visaAttachments, setVisaAttachments] = useState([])
  const [uploading, setUploading] = useState({})

  // Hydrate the visa/wakalah form from the first visa_application whenever the data reloads.
  useEffect(() => {
    const d = data.det?.[0]
    if (!d) return
    setVisaForm({
      visa_number: d.visa_number || '',
      border_number: d.border_number || '',
      wakalah_office: d.wakalah_office || '',
      wakalah_date: d.wakalah_date || '',
    })
  }, [data.det])

  // Load any PDF attachments previously uploaded against the visa_applications of this request.
  useEffect(() => {
    const ids = (data.det || []).map(d => d.id).filter(Boolean)
    if (!ids.length) { setVisaAttachments([]); return }
    let alive = true
    ;(async () => {
      const { data: rows } = await sb.from('attachments')
        .select('id,entity_id,file_name,file_url,notes,size_bytes,created_at')
        .eq('entity_type', 'visa_application')
        .in('entity_id', ids)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (alive) setVisaAttachments(rows || [])
    })()
    return () => { alive = false }
  }, [data.det, sb])

  // Load (if exists) the iqama_issuance_applications row linked to the first visa and hydrate the form.
  useEffect(() => {
    const visaId = data.det?.[0]?.id
    if (!visaId) { setIqamaRow(null); return }
    let alive = true
    ;(async () => {
      const { data: rows } = await sb.from('iqama_issuance_applications')
        .select('id,worker_name_at_entry,work_permit_expiry,insurance_expiry,iqama_number,iqama_expiry,iqama_delivery_date')
        .eq('visa_application_id', visaId)
        .is('deleted_at', null)
        .limit(1)
      const row = rows?.[0] || null
      if (!alive) return
      setIqamaRow(row)
      if (row) {
        setIqamaForm({
          worker_name_at_entry: row.worker_name_at_entry || '',
          work_permit_expiry: row.work_permit_expiry || '',
          insurance_expiry: row.insurance_expiry || '',
          iqama_number: row.iqama_number || '',
          iqama_expiry: row.iqama_expiry || '',
          iqama_delivery_date: row.iqama_delivery_date || '',
        })
      }
    })()
    return () => { alive = false }
  }, [data.det, sb])

  // Load attachments scoped to the iqama-issuance row (medical exam, Muqeem file, iqama photo).
  useEffect(() => {
    if (!iqamaRow?.id) { setIqamaAttachments([]); return }
    let alive = true
    ;(async () => {
      const { data: rows } = await sb.from('attachments')
        .select('id,entity_id,file_name,file_url,notes,size_bytes,created_at')
        .eq('entity_type', 'iqama_issuance_application')
        .eq('entity_id', iqamaRow.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (alive) setIqamaAttachments(rows || [])
    })()
    return () => { alive = false }
  }, [iqamaRow?.id, sb])

  useEffect(() => {
    const q = facQuery.trim()
    if (q.length < 2) { setFacResults([]); setFacSearching(false); return }
    setFacSearching(true)
    const t = setTimeout(async () => {
      const pattern = `%${q.replace(/[%,]/g, '')}%`
      const { data: rows } = await sb.from('facilities')
        .select('id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number')
        .or(`name_ar.ilike.${pattern},name_en.ilike.${pattern},unified_number.ilike.${pattern},gosi_number.ilike.${pattern},hrsd_number.ilike.${pattern}`)
        .is('deleted_at', null)
        .limit(15)
      setFacResults(rows || [])
      setFacSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [facQuery, sb])

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Normalize work_visa_permanent / work_visa_temporary down to 'work_visa' so the SELECTS/TABLES
      // lookups hit the same query path for every visa variant.
      const rawCode = sr.service_type?.code
      const code = /^work_visa(_|$)/.test(rawCode || '') ? 'work_visa' : rawCode

      const SELECTS = {
        work_visa: `id,visa_number,visa_cost,border_number,wakalah_number,wakalah_date,wakalah_office,wakalah_price_1,wakalah_price_2,visa_used,gender,file_number,
          main_facility:main_facility_id(id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number),
          nationality:nationality_id(name_ar,name_en),
          occupation:occupation_id(name_ar,name_en),
          embassy:embassy_id(name_ar,name_en),
          visa_type:visa_type_id(value_ar,value_en),
          visa_order_kind:visa_order_kind_id(value_ar,value_en),
          wakalah_status:wakalah_status_id(value_ar,value_en)`,
        transfer: `id,reference_number,total_price_initial,total_price_final,discount,office_cost,iqama_expiry_date,worker_gender,worker_absher_balance,
          worker:worker_id(name_ar,name_en,iqama_number,phone),
          main_facility:main_facility_id(name_ar,unified_number),
          new_occupation:new_occupation_id(name_ar,name_en),
          status:status_id(value_ar,value_en),
          worker_status:worker_status_id(value_ar,value_en)`,
        ajeer: `id,duration_months,start_date,end_date,
          worker:worker_id(name_ar,name_en,iqama_number),
          ajeer_facility:ajeer_facility_id(name_ar,unified_number),
          main_facility:main_facility_id(name_ar,unified_number),
          ajeer_city:ajeer_city_id(name_ar,name_en)`,
        iqama_renewal: `id,duration_months,current_expire_date,new_expire_date,
          worker:worker_id(name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
        iqama_issuance: `id,is_temporary,entry_date,check_date,worker_name_at_entry,
          iqama_3m_status,iqama_3m_expiry,
          medical_status,medical_amount,
          work_permit_status,work_permit_expiry,work_permit_amount,
          insurance_status,insurance_amount,
          iqama_status,iqama_number,iqama_expiry,iqama_amount,
          iqama_print_status,iqama_print_amount,iqama_delivery_status,
          contract_authentication_status,all_payment_status,notes,
          worker:worker_id(name_ar,name_en,iqama_number),
          main_facility:main_facility_id(name_ar,unified_number),
          visa_application:visa_application_id(id,visa_number,border_number)`,
        other: `id,description,
          worker:worker_id(name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
      }
      const TABLES = { work_visa: 'visa_applications', transfer: 'transfer_applications', ajeer: 'ajeer_applications', iqama_renewal: 'iqama_renewal_applications', iqama_issuance: 'iqama_issuance_applications', other: 'other_applications' }
      const tbl = TABLES[code]
      const sel = SELECTS[code]

      const [det, inv, agents, fees] = await Promise.all([
        tbl ? sb.from(tbl).select(sel).eq('service_request_id', sr.id) : Promise.resolve({ data: [] }),
        sb.from('invoices').select('id,invoice_no,total_amount,paid_amount,remaining_amount,status:status_id(code,value_ar,value_en),payment_plan,installments_count').eq('service_request_id', sr.id).is('deleted_at', null),
        sb.from('service_request_agents').select('commission_amount,agent:agent_id(name_ar,name_en,phone)').eq('service_request_id', sr.id),
        code === 'transfer' ? sb.from('transfer_application_fees').select('id,amount,is_official,bank_note,sadad_no,payment_date,fee_kind:fee_kind_id(value_ar,value_en,code),status:status_id(value_ar,value_en),transfer_application_id').is('deleted_at', null) : Promise.resolve({ data: [] }),
      ])

      const detIds = (det.data || []).map(d => d.id)
      const filteredFees = (fees.data || []).filter(f => detIds.includes(f.transfer_application_id))

      if (alive) setData({ loading: false, code, det: det.data || [], inv: inv.data || [], agents: agents.data || [], fees: filteredFees })
    })()
    return () => { alive = false }
  }, [sb, sr.id, sr.service_type?.code])

  const svc = SVC_THEME[sr.service_type?.code || 'general'] || SVC_THEME.general
  const st  = STATUS_THEME[sr.status?.code || 'new'] || STATUS_THEME.new

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 60, color: 'var(--tx2)' }}>
      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
      </div>

      {/* Header — title + service tag + ref + branch + date + status (matches InvoiceDetailPage header) */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.95)', letterSpacing: '-.3px' }}>{T('تفاصيل المعاملة','Transaction Details')}</div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', fontSize: 13, color: 'var(--tx3)' }}>
          {(() => {
            const qty = data.code === 'work_visa' ? ((data.det || []).length || Number(sr.quantity || 0)) : Number(sr.quantity || 0)
            const showQty = data.code === 'work_visa' && qty > 0
            return (
              <span style={{ color: svc.c, fontSize: 14, fontWeight: 800, borderBottom: '2px solid ' + svc.c, paddingBottom: 2, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                {showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>×{qty}</span>}
                <span>{isAr ? svc.label_ar : svc.label_en}</span>
              </span>
            )
          })()}
          <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
            <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>#{['TXN', sr.branch?.branch_code, String(sr.request_ref_no || '').slice(-6)].filter(Boolean).join('-')}</span>
            <button
              title={T('نسخ رقم الطلب','Copy ref no')}
              onClick={() => { try { navigator.clipboard?.writeText(sr.request_ref_no); toast?.(T('تم نسخ رقم الطلب','Ref no copied')) } catch {} }}
              style={{ width: 22, height: 22, padding: 0, borderRadius: 5, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx4)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </span>
          {sr.branch?.branch_code && (
            <>
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
              <span title={T('المكتب','Branch')} style={{ color: C.gold, fontWeight: 700, fontSize: 13.5, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span>{sr.branch.branch_code}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
              </span>
            </>
          )}
          <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
          <span style={{ color: 'var(--tx4)', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
            <span style={{ direction: 'ltr' }}>{(() => {
              const d = sr.request_date ? new Date(sr.request_date) : null
              if (!d || isNaN(d)) return '—'
              const p = n => String(n).padStart(2, '0')
              return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`
            })()}</span>
          </span>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        {/* Left column — content cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Client card */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
              <span style={cardTitle}>{T('العميل','Client')}</span>
              {(() => {
                const nat = sr.client?.nationality
                if (!nat) return null
                const fl = nat.flag_url
                const em = flagEmoji(nat.code)
                return fl
                  ? <img src={fl} alt={nat.name_ar || ''} title={nat.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                  : (em ? <span title={nat.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)
              })()}
            </div>
            <div style={{ padding: '14px 22px' }}>
              <ClientRows sr={sr} T={T} />
            </div>
          </div>

          {/* Invoice Details card — mirrors InvoicePage's "بيانات الفاتورة" card with service info,
              quantity and visa file distribution. Shown only for work-visa transactions. */}
          {!data.loading && data.code === 'work_visa' && data.det.length > 0 && (() => {
            const det = data.det
            const qty = det.length || Number(sr.quantity || 0)
            const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || '—'
            const occOf = r => (isAr ? r.occupation?.name_ar : (r.occupation?.name_en || r.occupation?.name_ar)) || ''
            const embOf = r => (isAr ? r.embassy?.name_ar : (r.embassy?.name_en || r.embassy?.name_ar)) || ''
            const genOf = r => r.gender === 'female' ? T('أنثى','Female') : r.gender === 'male' ? T('ذكر','Male') : ''
            const single = det.length === 1 ? det[0] : null
            const renderSingleDist = (s) => {
              const sub = [embOf(s), occOf(s), genOf(s)].filter(Boolean).join(' · ')
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px' }}>
                    <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{T('ملف واحد','One File')}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr' }}>1 {T('تأشيرة','visa')}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                    <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: svc.c + '1a', border: '1px solid ' + svc.c + '40', color: svc.c, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>1</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{natOf(s)}</div>
                      {sub && <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
                    </div>
                  </div>
                </>
              )
            }
            return (
              <div style={cardChrome}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.c }} />
                  <span style={cardTitle}>{T('بيانات الطلب','Request Details')}</span>
                </div>
                <div style={{ padding: '14px 22px' }}>
                  <Row label={T('نوع الخدمة','Service')} value={isAr ? svc.label_ar : svc.label_en} color={svc.c} />
                  {qty > 0 && <Row label={T('الكمية','Quantity')} value={'×' + qty} mono />}
                  <SectionLabel label={single && single.file_number != null ? T('بيانات التأشيرات وتوزيع الملفات','Visa Details & File Distribution') : T('بيانات التأشيرات','Visa Details')} color={single?.file_number != null ? C.cyan : svc.c} />
                  {single ? (
                    single.file_number != null ? renderSingleDist(single) : (
                      <>
                        <Row label={T('الجنسية','Nationality')} value={natOf(single)} />
                        <Row label={T('السفارة','Embassy')} value={embOf(single)} />
                        <Row label={T('المهنة','Occupation')} value={occOf(single)} />
                        {genOf(single) && <Row label={T('الجنس','Gender')} value={genOf(single)} />}
                      </>
                    )
                  ) : (() => {
                    const withFile = det.filter(r => r && r.file_number != null)
                    const showFiles = withFile.length > 0
                    const list = showFiles ? withFile : det
                    const byFile = {}
                    list.forEach(r => { const fn = r.file_number != null ? r.file_number : 0; (byFile[fn] = byFile[fn] || []).push(r) })
                    const fileNos = Object.keys(byFile).map(Number).sort((a, b) => a - b)
                    const arOrd = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر']
                    const enOrd = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth']
                    const fileLabel = idx => fileNos.length === 1 ? T('ملف واحد','One File') : T(`الملف ${arOrd[idx] || idx + 1}`,`${enOrd[idx] || 'File ' + (idx + 1)} File`)
                    let n = 0
                    return fileNos.map((fn, idx) => {
                      const items = byFile[fn]
                      return (
                        <div key={fn} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                          {showFiles && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px' }}>
                              <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{fileLabel(idx)}</span>
                              <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr' }}>{items.length} {T('تأشيرة','visas')}</span>
                            </div>
                          )}
                          {items.map((r, i) => {
                            n++
                            const sub = [embOf(r), occOf(r), genOf(r)].filter(Boolean).join(' · ')
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: svc.c + '1a', border: '1px solid ' + svc.c + '40', color: svc.c, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{natOf(r)}</div>
                                  {sub && <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            )
          })()}

          {/* Facility picker — pick the establishment the visa will be issued from. Picking from
              the search dropdown stages the selection; the user clicks "Save & Confirm" at the
              bottom of the card to commit (updates main_facility_id on every visa_application). */}
          {!data.loading && data.code === 'work_visa' && (() => {
            const current = data.det?.[0]?.main_facility || null
            const displayed = stagedFacility || current
            const isStaged = !!stagedFacility && stagedFacility.id !== current?.id
            const showSearch = !displayed || facEditing
            const stageFacility = (f) => {
              if (!f?.id) return
              // Clicking the current facility while a different one is staged → un-stage.
              if (current?.id === f.id) { setStagedFacility(null); setFacQuery(''); setFacResults([]); setFacEditing(false); return }
              setStagedFacility({ id: f.id, name_ar: f.name_ar, name_en: f.name_en, unified_number: f.unified_number, cr_number: f.cr_number, gosi_number: f.gosi_number, hrsd_number: f.hrsd_number })
              setFacQuery(''); setFacResults([]); setFacEditing(false)
            }
            const saveStagedFacility = async () => {
              if (!stagedFacility?.id || facSaving) return
              setFacSaving(true)
              const f = stagedFacility
              const { error } = await sb.from('visa_applications')
                .update({ main_facility_id: f.id })
                .eq('service_request_id', sr.id)
              setFacSaving(false)
              if (error) { toast?.(T('تعذر تحديث المنشأة','Could not update facility'), 'error'); return }
              setData(prev => ({ ...prev, det: (prev.det || []).map(d => ({ ...d, main_facility_id: f.id, main_facility: { ...f } })) }))
              setStagedFacility(null)
              toast?.(T('تم حفظ المنشأة','Facility saved'))
            }
            const matchLabel = (f) => {
              const q = facQuery.trim().toLowerCase()
              if (!q) return null
              if ((f.unified_number || '').toLowerCase().includes(q)) return T('الرقم الموحد','Unified')
              if ((f.gosi_number || '').toLowerCase().includes(q)) return T('التأمينات','GOSI')
              if ((f.hrsd_number || '').toLowerCase().includes(q)) return T('الموارد البشرية','HRSD')
              return null
            }
            const copyVal = (val, label) => {
              if (!val) return
              try { navigator.clipboard?.writeText(String(val)); toast?.(T(`تم نسخ ${label}`, `${label} copied`)) } catch {}
            }
            const NumRow = ({ label, value }) => value ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
                <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 800, letterSpacing: '.4px', minWidth: 86 }}>{label}</span>
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--tx2)', fontFamily: 'monospace', fontWeight: 700, direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'end' }}>{value}</span>
                <button
                  title={T('نسخ','Copy')}
                  onClick={() => copyVal(value, label)}
                  style={{ width: 22, height: 22, padding: 0, borderRadius: 5, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s', flexShrink: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.gold }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx4)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
            ) : null
            return (
              <div style={cardChrome}>
                <style>{`.tx-fac-results{scrollbar-width:none;-ms-overflow-style:none}.tx-fac-results::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
                <div style={cardHeader}>
                  <StepBadge n={1} c={C.gold} />
                  <span style={cardTitle}>{T('تحديد المنشأة','Select Facility')}</span>
                  {facSaving && <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('جارٍ الحفظ…','Saving…')}</span>}
                </div>
                <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {displayed && !facEditing && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 12, background: isStaged ? 'rgba(212,160,23,.10)' : 'rgba(212,160,23,.06)', border: '1px solid ' + (isStaged ? 'rgba(212,160,23,.5)' : 'rgba(212,160,23,.28)') }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, background: C.gold + '22', border: '1px solid ' + C.gold + '55', color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          {isStaged ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10.5, color: isStaged ? C.gold : 'var(--tx4)', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 3 }}>{isStaged ? T('بانتظار الحفظ','Pending save') : T('المنشأة الحالية','Current Facility')}</div>
                          <div style={{ fontSize: 14, color: 'var(--tx1)', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(isAr ? displayed.name_ar : (displayed.name_en || displayed.name_ar)) || '—'}</div>
                        </div>
                        {isStaged && (
                        <button
                          onClick={() => { setFacEditing(true); setFacQuery(''); setFacResults([]) }}
                          style={{ flexShrink: 0, height: 28, padding: '0 11px', borderRadius: 8, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, cursor: 'pointer', fontFamily: F, fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.22)' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          <span>{T('تغيير','Change')}</span>
                        </button>
                        )}
                      </div>
                      {(displayed.unified_number || displayed.cr_number || displayed.gosi_number || displayed.hrsd_number) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <NumRow label={T('الرقم الموحد','UN')} value={displayed.unified_number} />
                          <NumRow label={T('السجل التجاري','CR')} value={displayed.cr_number} />
                          <NumRow label={T('التأمينات','GOSI')} value={displayed.gosi_number} />
                          <NumRow label={T('الموارد البشرية','HRSD')} value={displayed.hrsd_number} />
                        </div>
                      )}
                    </div>
                  )}

                  {showSearch && (
                    <>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none', display: 'inline-flex' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                        </span>
                        <input
                          type="text"
                          value={facQuery}
                          onChange={e => setFacQuery(e.target.value)}
                          autoFocus={facEditing}
                          placeholder={T('ابحث بالاسم، الرقم الموحد، رقم التأمينات، أو رقم الموارد البشرية…','Search by name, Unified, GOSI, or HRSD number…')}
                          style={{ width: '100%', height: 40, padding: displayed ? '0 38px 0 38px' : '0 14px 0 38px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx1)', fontFamily: F, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }}
                          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)' }}
                          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}
                        />
                        {displayed && (
                          <button
                            onClick={() => { setFacEditing(false); setFacQuery(''); setFacResults([]) }}
                            title={T('إلغاء','Cancel')}
                            style={{ position: 'absolute', top: '50%', insetInlineEnd: 8, transform: 'translateY(-50%)', width: 26, height: 26, padding: 0, borderRadius: 6, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s' }}
                            onMouseEnter={e => { e.currentTarget.style.color = C.red }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx4)' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                      {facQuery.trim().length >= 2 && (
                        <div className="tx-fac-results" style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(0,0,0,.18)', maxHeight: 320, overflowY: 'auto' }}>
                          {facSearching && <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('جارٍ البحث…','Searching…')}</div>}
                          {!facSearching && facResults.length === 0 && <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('لا توجد نتائج','No results')}</div>}
                          {!facSearching && facResults.map(f => {
                            const isCurrent = current?.id === f.id
                            const isStagedPick = stagedFacility?.id === f.id && !isCurrent
                            const match = matchLabel(f)
                            return (
                              <div
                                key={f.id}
                                onClick={() => stageFacility(f)}
                                style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.04)', cursor: 'pointer', transition: '.15s', background: isStagedPick ? 'rgba(212,160,23,.12)' : (isCurrent ? 'rgba(212,160,23,.06)' : 'transparent'), position: 'relative' }}
                                onMouseEnter={e => { if (!isCurrent && !isStagedPick) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                                onMouseLeave={e => { if (!isCurrent && !isStagedPick) e.currentTarget.style.background = 'transparent' }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, color: (isCurrent || isStagedPick) ? C.gold : 'var(--tx2)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{(isAr ? f.name_ar : (f.name_en || f.name_ar)) || '—'}</span>
                                  {(isCurrent || isStagedPick) && (
                                    <span style={{ flexShrink: 0, color: C.gold, display: 'inline-flex', alignItems: 'center' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    </span>
                                  )}
                                </div>
                                <div style={{ marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr' }}>
                                  {f.unified_number && <span><span style={{ color: 'var(--tx4)' }}>UN </span><span style={{ color: 'var(--tx3)', fontFamily: 'monospace' }}>{f.unified_number}</span></span>}
                                  {f.gosi_number && <span><span style={{ color: 'var(--tx4)' }}>GOSI </span><span style={{ color: 'var(--tx3)', fontFamily: 'monospace' }}>{f.gosi_number}</span></span>}
                                  {f.hrsd_number && <span><span style={{ color: 'var(--tx4)' }}>HRSD </span><span style={{ color: 'var(--tx3)', fontFamily: 'monospace' }}>{f.hrsd_number}</span></span>}
                                  {match && <span style={{ marginInlineStart: 'auto', fontSize: 9.5, color: C.cyan, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(22,160,133,.12)' }}>{T('مطابقة:','match:')} {match}</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                  {isStaged
                    ? <SaveBtn T={T} dirty={isStaged} saving={facSaving} onClick={saveStagedFacility} />
                    : (displayed && !facEditing && <QiwaSubscriptionBox sb={sb} sr={sr} T={T} toast={toast} user={user} />)}
                </div>
              </div>
            )
          })()}

          {/* Visa Issuance + Wakalah cards — collect the post-issuance data and attach the visa
              PDF / commercial-registry PDF. Text/date inputs only update the form state; the
              "Save & Confirm" button at the bottom of each card persists them to
              visa_applications. File uploads still happen on selection. */}
          {!data.loading && data.code === 'work_visa' && data.det.length > 0 && (() => {
            const firstId = data.det[0]?.id
            const uploadPdf = async (file, kind) => {
              if (!firstId || !file) return
              if (file.type && !/pdf/i.test(file.type)) { toast?.(T('الملف يجب أن يكون PDF','File must be a PDF'), 'error'); return }
              setUploading(u => ({ ...u, [kind]: true }))
              try {
                const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
                const path = `visa-applications/${firstId}/${kind}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
                const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
                if (upErr) throw upErr
                const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                const { data: row, error: insErr } = await sb.from('attachments').insert({
                  entity_type: 'visa_application', entity_id: firstId,
                  file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
                  mime_type: file.type || null, size_bytes: file.size || null,
                  notes: kind,
                }).select('id,entity_id,file_name,file_url,notes,size_bytes,created_at').single()
                if (insErr) throw insErr
                setVisaAttachments(prev => [row, ...prev])
                toast?.(T('تم رفع الملف','File uploaded'))
              } catch (e) { toast?.(T('تعذر رفع الملف','Upload failed'), 'error') }
              finally { setUploading(u => ({ ...u, [kind]: false })) }
            }
            const filesOf = (kind) => visaAttachments.filter(a => a.notes === kind)
            const setVF = (field, v) => setVisaForm(f => ({ ...f, [field]: v }))

            const visaCardFields = {
              2: ['visa_number', 'border_number'],
              3: ['wakalah_office', 'wakalah_date'],
            }
            const isVisaCardDirty = (n) => visaCardFields[n].some(f => (visaForm[f] || '') !== (data.det?.[0]?.[f] || ''))
            const saveVisaCard = async (n) => {
              if (!firstId) return
              const dirty = visaCardFields[n].filter(f => (visaForm[f] || '') !== (data.det?.[0]?.[f] || ''))
              if (dirty.length === 0) return
              setVisaCardSaving(s => ({ ...s, [n]: true }))
              try {
                const updates = {}
                for (const f of dirty) updates[f] = visaForm[f] || null
                const { error } = await sb.from('visa_applications').update(updates).eq('service_request_id', sr.id)
                if (error) { toast?.(T('تعذر الحفظ','Save failed'), 'error'); return }
                setData(prev => ({ ...prev, det: prev.det.map(d => ({ ...d, ...updates })) }))
                toast?.(T('تم الحفظ','Saved'))
              } finally {
                setVisaCardSaving(s => ({ ...s, [n]: false }))
              }
            }

            return (
              <>
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <StepBadge n={2} c={C.blue} />
                    <span style={cardTitle}>{T('إصدار التأشيرة','Visa Issuance')}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <EditField label={T('رقم التأشيرة','Visa No.')} value={visaForm.visa_number}
                        onChange={v => setVF('visa_number', v)} mono placeholder="—" />
                      <EditField label={T('رقم الحدود','Border No.')} value={visaForm.border_number}
                        onChange={v => setVF('border_number', v)} mono placeholder="—" />
                    </div>
                    <AttachField T={T} label={T('ملف التأشيرة (PDF)','Visa file (PDF)')}
                      files={filesOf('visa_pdf')} isUploading={!!uploading.visa_pdf}
                      onPick={f => uploadPdf(f, 'visa_pdf')} />
                    <SaveBtn T={T} dirty={isVisaCardDirty(2)} saving={!!visaCardSaving[2]} onClick={() => saveVisaCard(2)} />
                  </div>
                </div>

                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <StepBadge n={3} c={C.purple} />
                    <span style={cardTitle}>{T('الوكالة','Wakalah')}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <AttachField T={T} label={T('ملف السجل التجاري (PDF)','Commercial Registry (PDF)')}
                      files={filesOf('cr_pdf')} isUploading={!!uploading.cr_pdf}
                      onPick={f => uploadPdf(f, 'cr_pdf')} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <EditField label={T('مكتب التوكيل','Wakalah Office')} value={visaForm.wakalah_office}
                        onChange={v => setVF('wakalah_office', v)} placeholder="—" />
                      <EditField label={T('تاريخ الوكالة','Wakalah Date')} value={visaForm.wakalah_date}
                        onChange={v => setVF('wakalah_date', v)} type="date" mono />
                    </div>
                    <SaveBtn T={T} dirty={isVisaCardDirty(3)} saving={!!visaCardSaving[3]} onClick={() => saveVisaCard(3)} />
                  </div>
                </div>
              </>
            )
          })()}

          {/* Iqama-issuance follow-up cards — populate `iqama_issuance_applications` (linked by
              visa_application_id). The row is created on first edit (auto-upsert). Each card owns
              a specific step in the post-visa lifecycle. */}
          {!data.loading && data.code === 'work_visa' && data.det.length > 0 && (() => {
            const visa = data.det[0]
            const visaId = visa?.id
            if (!visaId) return null

            const ensureRow = async () => {
              if (iqamaRow?.id) return iqamaRow.id
              const { data: row, error } = await sb.from('iqama_issuance_applications').insert({
                visa_application_id: visaId,
                service_request_id: sr.id,
                main_facility_id: visa.main_facility_id || null,
              }).select('id,worker_name_at_entry,work_permit_expiry,insurance_expiry,iqama_number,iqama_expiry,iqama_delivery_date').single()
              if (error || !row) { toast?.(T('تعذر إنشاء سجل الإقامة','Could not create iqama record'), 'error'); return null }
              setIqamaRow(row)
              return row.id
            }

            // Per-card field map: each step card's manual-entry fields.
            const cardFields = {
              4: ['worker_name_at_entry'],
              5: ['work_permit_expiry'],
              6: ['insurance_expiry'],
              7: ['iqama_number', 'iqama_expiry'],
              8: ['iqama_delivery_date'],
            }
            const isCardDirty = (n) => cardFields[n].some(f => (iqamaForm[f] || '') !== (iqamaRow?.[f] || ''))
            const saveCard = async (n) => {
              const dirty = cardFields[n].filter(f => (iqamaForm[f] || '') !== (iqamaRow?.[f] || ''))
              if (dirty.length === 0) return
              setIqamaCardSaving(s => ({ ...s, [n]: true }))
              try {
                const rowId = await ensureRow()
                if (!rowId) return
                const updates = {}
                for (const f of dirty) updates[f] = iqamaForm[f] || null
                const { error } = await sb.from('iqama_issuance_applications').update(updates).eq('id', rowId)
                if (error) { toast?.(T('تعذر الحفظ','Save failed'), 'error'); return }
                setIqamaRow(r => ({ ...(r || { id: rowId }), ...updates }))
                toast?.(T('تم الحفظ','Saved'))
              } finally {
                setIqamaCardSaving(s => ({ ...s, [n]: false }))
              }
            }

            const uploadIqamaFile = async (file, kind, allowImage) => {
              if (!file) return
              const accept = allowImage ? /(pdf|image)/i : /pdf/i
              if (file.type && !accept.test(file.type)) {
                toast?.(allowImage ? T('الملف يجب أن يكون PDF أو صورة','File must be a PDF or image') : T('الملف يجب أن يكون PDF','File must be a PDF'), 'error')
                return
              }
              setIqamaUploading(u => ({ ...u, [kind]: true }))
              try {
                const rowId = await ensureRow()
                if (!rowId) return
                const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
                const path = `iqama-issuance/${rowId}/${kind}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
                const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
                if (upErr) throw upErr
                const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
                const { data: row, error: insErr } = await sb.from('attachments').insert({
                  entity_type: 'iqama_issuance_application', entity_id: rowId,
                  file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
                  mime_type: file.type || null, size_bytes: file.size || null,
                  notes: kind,
                }).select('id,entity_id,file_name,file_url,notes,size_bytes,created_at').single()
                if (insErr) throw insErr
                setIqamaAttachments(prev => [row, ...prev])
                toast?.(T('تم رفع الملف','File uploaded'))
              } catch (e) { toast?.(T('تعذر رفع الملف','Upload failed'), 'error') }
              finally { setIqamaUploading(u => ({ ...u, [kind]: false })) }
            }

            const filesOf = (kind) => iqamaAttachments.filter(a => a.notes === kind)

            const setF = (field, v) => setIqamaForm(f => ({ ...f, [field]: v }))

            return (
              <>
                {/* Medical Exam */}
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <StepBadge n={4} c={C.cyan} />
                    <span style={cardTitle}>{T('الفحص الطبي','Medical Exam')}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <EditField label={T('اسم العامل','Worker Name')} value={iqamaForm.worker_name_at_entry}
                      onChange={v => setF('worker_name_at_entry', v)} placeholder="—" />
                    <AttachField T={T} label={T('صورة الفحص الطبي','Medical Exam File')}
                      files={filesOf('medical_exam')} isUploading={!!iqamaUploading.medical_exam}
                      onPick={f => uploadIqamaFile(f, 'medical_exam', true)} allowImage />
                    <SaveBtn T={T} dirty={isCardDirty(4)} saving={!!iqamaCardSaving[4]} onClick={() => saveCard(4)} />
                  </div>
                </div>

                {/* Work Permit */}
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <StepBadge n={5} c={C.blue} />
                    <span style={cardTitle}>{T('رخصة العمل','Work Permit')}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <EditField label={T('تاريخ الانتهاء','Expiry Date')} value={iqamaForm.work_permit_expiry}
                      onChange={v => setF('work_permit_expiry', v)} type="date" mono />
                    <SaveBtn T={T} dirty={isCardDirty(5)} saving={!!iqamaCardSaving[5]} onClick={() => saveCard(5)} />
                  </div>
                </div>

                {/* Medical Insurance */}
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <StepBadge n={6} c={C.ok} />
                    <span style={cardTitle}>{T('التأمين الطبي','Medical Insurance')}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <EditField label={T('تاريخ انتهاء التأمين','Insurance Expiry')} value={iqamaForm.insurance_expiry}
                      onChange={v => setF('insurance_expiry', v)} type="date" mono />
                    <SaveBtn T={T} dirty={isCardDirty(6)} saving={!!iqamaCardSaving[6]} onClick={() => saveCard(6)} />
                  </div>
                </div>

                {/* Iqama Issuance */}
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <StepBadge n={7} c={C.gold} />
                    <span style={cardTitle}>{T('إصدار الإقامة','Iqama Issuance')}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <EditField label={T('رقم الإقامة','Iqama No.')} value={iqamaForm.iqama_number}
                        onChange={v => setF('iqama_number', v)} mono placeholder="—" />
                      <EditField label={T('تاريخ الانتهاء','Expiry Date')} value={iqamaForm.iqama_expiry}
                        onChange={v => setF('iqama_expiry', v)} type="date" mono />
                    </div>
                    <AttachField T={T} label={T('ملف مقيم (PDF)','Muqeem File (PDF)')}
                      files={filesOf('iqama_pdf')} isUploading={!!iqamaUploading.iqama_pdf}
                      onPick={f => uploadIqamaFile(f, 'iqama_pdf', false)} />
                    <SaveBtn T={T} dirty={isCardDirty(7)} saving={!!iqamaCardSaving[7]} onClick={() => saveCard(7)} />
                  </div>
                </div>

                {/* Iqama Delivery */}
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <StepBadge n={8} c={C.purple} />
                    <span style={cardTitle}>{T('توصيل الإقامة','Iqama Delivery')}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <EditField label={T('تاريخ الوصول','Arrival Date')} value={iqamaForm.iqama_delivery_date}
                      onChange={v => setF('iqama_delivery_date', v)} type="date" mono />
                    <AttachField T={T} label={T('صورة الإقامة','Iqama Photo')}
                      files={filesOf('iqama_photo')} isUploading={!!iqamaUploading.iqama_photo}
                      onPick={f => uploadIqamaFile(f, 'iqama_photo', true)} allowImage />
                    <SaveBtn T={T} dirty={isCardDirty(8)} saving={!!iqamaCardSaving[8]} onClick={() => saveCard(8)} />
                  </div>
                </div>
              </>
            )
          })()}

          {/* Application Details card — kept only for non-work-visa services since the work-visa case
              is already covered by the "بيانات الفاتورة" card above (nationality, embassy, occupation,
              gender, and file distribution). */}
          {data.loading && (
            <div style={cardChrome}>
              <div style={{ padding: '18px 22px', textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
            </div>
          )}
          {!data.loading && data.code !== 'work_visa' && data.det.map((d, idx) => (
            <div key={d.id || idx} style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.c }} />
                <span style={cardTitle}>{T('تفاصيل الطلب','Application')}{data.det.length > 1 ? ` (${idx + 1}/${data.det.length})` : ''}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, color: svc.c, fontWeight: 700, padding: '2px 9px', borderRadius: 6, background: svc.bg, border: '1px solid ' + svc.bd }}>{isAr ? svc.label_ar : svc.label_en}</span>
              </div>
              <div style={{ padding: '14px 22px' }}>
                <ApplicationDetails code={data.code} d={d} isAr={isAr} T={T} />
              </div>
            </div>
          ))}

          {/* Transfer fees card */}
          {!data.loading && data.code === 'transfer' && data.fees.length > 0 && (
            <div style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                <span style={cardTitle}>{T('رسوم النقل','Transfer Fees')}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{data.fees.length}</span>
              </div>
              <div style={{ padding: '6px 22px 14px' }}>
                {data.fees.map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.04)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{isAr ? f.fee_kind?.value_ar : (f.fee_kind?.value_en || f.fee_kind?.value_ar) || f.fee_kind?.code}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: f.is_official ? 'rgba(46,204,113,.12)' : 'rgba(243,156,18,.12)', color: f.is_official ? C.ok : C.warn, fontWeight: 700 }}>{f.is_official ? T('رسمي','Official') : T('غير رسمي','Unofficial')}</span>
                      {f.status && <span style={{ fontSize: 10, color: 'var(--tx4)' }}>{isAr ? f.status.value_ar : (f.status.value_en || f.status.value_ar)}</span>}
                    </div>
                    <span style={{ fontSize: 13, color: C.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{num(f.amount)} {T('ر.س','SAR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes card */}
          {sr.note && (
            <div style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.4)' }} />
                <span style={cardTitle}>{T('ملاحظات','Notes')}</span>
              </div>
              <div style={{ padding: '14px 22px', fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sr.note}</div>
            </div>
          )}
        </div>

        {/* Right column — sticky sidebar */}
        <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Status summary card */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.c }} />
              <span style={cardTitle}>{T('حالة الطلب','Request Status')}</span>
            </div>
            <div style={{ padding: '18px 22px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: st.c, boxShadow: `0 0 12px ${st.c}aa` }} />
                <span style={{ fontSize: 22, fontWeight: 800, color: st.c, letterSpacing: '-.3px' }}>{isAr ? st.stamp_ar : st.stamp_en}</span>
              </div>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label={T('نوع الخدمة','Service')} value={isAr ? svc.label_ar : svc.label_en} color={svc.c} />
              <Row label={T('الكمية','Quantity')} value={'×' + Number(sr.quantity || 1)} mono />
              <Row label={T('آخر تحديث','Last update')} value={fmtGreg(sr.request_date)} mono />
              {sr.paid_date && <Row label={T('تاريخ السداد','Paid Date')} value={fmtGreg(sr.paid_date)} mono color={C.ok} />}
            </div>
          </div>

          {/* Linked invoice card */}
          {!data.loading && data.inv.length > 0 && data.inv.map(iv => {
            const total = Number(iv.total_amount || 0)
            const paid = Number(iv.paid_amount || 0)
            const remaining = Number(iv.remaining_amount || 0)
            const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0
            const payC = remaining <= 0 && total > 0 ? C.ok : (paid > 0 ? C.gold : C.red)
            return (
              <div key={iv.id} style={cardChrome}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                  <span style={cardTitle}>{T('الفاتورة','Invoice')}</span>
                  <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.gold, fontWeight: 700, fontFamily: 'monospace', direction: 'ltr' }}>#{iv.invoice_no}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, padding: 1, background: 'rgba(255,255,255,.04)' }}>
                  <AmountBox label={T('الإجمالي','Total')} value={num(total)} color="#fff" />
                  <AmountBox label={T('المسدّد','Paid')} value={num(paid)} color={C.ok} />
                  <AmountBox label={T('المتبقي','Remaining')} value={num(remaining)} color={remaining > 0 ? C.warn : C.ok} />
                </div>
                <div style={{ padding: '14px 22px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--tx3)' }}>
                    <span>{T('نسبة السداد','Paid')}</span>
                    <span style={{ color: payC, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${payC}, ${payC}dd)`, transition: 'width .3s' }} />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Agents card */}
          {!data.loading && data.agents.length > 0 && (
            <div style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />
                <span style={cardTitle}>{T('الوسطاء','Agents')}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{data.agents.length}</span>
              </div>
              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.agents.map((a, i) => (
                  <Row key={i} label={a.agent?.name_ar || a.agent?.name_en} value={a.commission_amount ? num(a.commission_amount) + ' ' + T('ر.س','SAR') : '—'} mono color={C.gold} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─────── Service-specific row groups ─────── */
function ApplicationDetails({ code, d, isAr, T }) {
  const lbl = (o) => o ? (isAr ? o.value_ar || o.name_ar : (o.value_en || o.value_ar || o.name_en || o.name_ar)) : null
  const date = (v) => v ? fmtGreg(v) : null

  if (code === 'work_visa') return (<>
    <Row label={T('المنشأة المستفيدة','Beneficiary Facility')} value={d.main_facility?.name_ar || d.main_facility?.unified_number} />
    <Row label={T('الرقم الموحد','Unified Number')} value={d.main_facility?.unified_number} mono />
    <Row label={T('الجنسية','Nationality')} value={isAr ? d.nationality?.name_ar : (d.nationality?.name_en || d.nationality?.name_ar)} />
    <Row label={T('المهنة','Occupation')} value={isAr ? d.occupation?.name_ar : (d.occupation?.name_en || d.occupation?.name_ar)} />
    <Row label={T('السفارة','Embassy')} value={lbl(d.embassy)} />
    <Row label={T('نوع التأشيرة','Visa Type')} value={lbl(d.visa_type)} />
    <Row label={T('الترتيب','Order Kind')} value={lbl(d.visa_order_kind)} />
    <Row label={T('رقم التأشيرة','Visa No')} value={d.visa_number} mono />
    <Row label={T('قيمة التأشيرة','Visa Cost')} value={d.visa_cost ? num(d.visa_cost) + ' ' + T('ر.س','SAR') : null} mono color={C.gold} />
    <Row label={T('رقم الحدود','Border No')} value={d.border_number} mono />
    <Row label={T('رقم الوكالة','Wakalah No')} value={d.wakalah_number} mono />
    <Row label={T('تاريخ الوكالة','Wakalah Date')} value={date(d.wakalah_date)} mono />
    <Row label={T('مكتب الوكالة','Wakalah Office')} value={d.wakalah_office} />
    <Row label={T('حالة الوكالة','Wakalah Status')} value={lbl(d.wakalah_status)} />
    <Row label={T('استُخدمت','Visa Used')} value={d.visa_used ? T('نعم','Yes') : T('لا','No')} color={d.visa_used ? C.ok : 'var(--tx2)'} />
  </>)

  if (code === 'transfer') return (<>
    <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
    <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
    <Row label={T('المنشأة المنقول إليها','Target Facility')} value={d.main_facility?.name_ar || d.main_facility?.unified_number} />
    <Row label={T('المهنة الجديدة','New Occupation')} value={isAr ? d.new_occupation?.name_ar : (d.new_occupation?.name_en || d.new_occupation?.name_ar)} />
    <Row label={T('حالة النقل','Status')} value={lbl(d.status)} />
    <Row label={T('حالة العامل','Worker Status')} value={lbl(d.worker_status)} />
    <Row label={T('السعر الابتدائي','Initial Price')} value={d.total_price_initial ? num(d.total_price_initial) + ' ' + T('ر.س','SAR') : null} mono />
    <Row label={T('السعر النهائي','Final Price')} value={d.total_price_final ? num(d.total_price_final) + ' ' + T('ر.س','SAR') : null} mono color={C.gold} />
    <Row label={T('الخصم','Discount')} value={d.discount ? num(d.discount) + ' ' + T('ر.س','SAR') : null} mono />
    <Row label={T('رسوم المكتب','Office Cost')} value={d.office_cost ? num(d.office_cost) + ' ' + T('ر.س','SAR') : null} mono />
    <Row label={T('انتهاء الإقامة','Iqama Expiry')} value={date(d.iqama_expiry_date)} mono />
    <Row label={T('رقم المرجع','Ref No')} value={d.reference_number} mono />
    <Row label={T('رصيد أبشر','Absher Balance')} value={d.worker_absher_balance ? num(d.worker_absher_balance) + ' ' + T('ر.س','SAR') : null} mono />
  </>)

  if (code === 'ajeer') return (<>
    <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
    <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
    <Row label={T('منشأة الأجير','Ajeer Facility')} value={d.ajeer_facility?.name_ar || d.ajeer_facility?.unified_number} />
    <Row label={T('المنشأة المستفيدة','Beneficiary Facility')} value={d.main_facility?.name_ar || d.main_facility?.unified_number} />
    <Row label={T('المدينة','City')} value={isAr ? d.ajeer_city?.name_ar : (d.ajeer_city?.name_en || d.ajeer_city?.name_ar)} />
    <Row label={T('المدة','Duration')} value={d.duration_months ? d.duration_months + ' ' + T('شهر','months') : null} />
    <Row label={T('تاريخ البدء','Start Date')} value={date(d.start_date)} mono />
    <Row label={T('تاريخ الانتهاء','End Date')} value={date(d.end_date)} mono />
  </>)

  if (code === 'iqama_renewal') return (<>
    <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
    <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
    <Row label={T('المنشأة','Facility')} value={d.worker_facility?.name_ar || d.worker_facility?.unified_number} />
    <Row label={T('مدة التجديد','Renewal Duration')} value={d.duration_months ? d.duration_months + ' ' + T('شهر','months') : null} />
    <Row label={T('تاريخ الانتهاء الحالي','Current Expiry')} value={date(d.current_expire_date)} mono />
    <Row label={T('تاريخ الانتهاء الجديد','New Expiry')} value={date(d.new_expire_date)} mono color={C.ok} />
  </>)

  if (code === 'other') return (<>
    <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
    <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
    <Row label={T('المنشأة','Facility')} value={d.worker_facility?.name_ar || d.worker_facility?.unified_number} />
    <Row label={T('الوصف','Description')} value={d.description} />
  </>)

  return <div style={{ fontSize: 12, color: 'var(--tx4)' }}>{T('لا توجد تفاصيل لعرضها','No details to display')}</div>
}

const ClientRows = ({ sr, T }) => {
  const c = sr.client
  const primary = c?.name_ar || c?.name_en
  const secondary = c?.name_ar && c?.name_en ? c.name_en : null
  return (
    <>
      {primary && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'flex-start', minHeight: 28, gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, paddingTop: 2 }}>{T('الاسم','Name')}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{primary}</div>
            {secondary && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, marginTop: 2, direction: 'ltr' }}>{secondary}</div>}
          </div>
        </div>
      )}
      <Row label={T('الهوية','ID')} value={c?.id_number} mono />
      <Row label={T('الجوال','Phone')} value={fmtPhone(c?.phone)} mono />
    </>
  )
}

const Row = ({ label, value, mono, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 13, color: color || 'var(--tx2)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontFamily: mono ? 'monospace' : F, direction: mono ? 'ltr' : undefined, fontWeight: 600 }}>{value || '—'}</span>
  </div>
)

const SectionLabel = ({ label, color = C.gold }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 6px', marginTop: 4 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}aa` }} />
    <span style={{ fontSize: 10.5, color: color, fontWeight: 700, letterSpacing: '.6px' }}>{label}</span>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
  </div>
)

const AmountBox = ({ label, value, color }) => (
  <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</div>
  </div>
)

// "Save & Confirm" button used at the bottom of each iqama-issuance step card. The cards
// no longer auto-save on blur / calendar pick / etc.; the user types or picks, then clicks
// the button to persist the change.
function SaveBtn({ T, dirty, saving, onClick }) {
  const disabled = !dirty || saving
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(212,160,23,.15)' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = 'transparent' }}
      style={{
        height: 38, padding: '0 20px', borderRadius: 9,
        background: 'transparent',
        border: '1px solid ' + (disabled ? 'rgba(255,255,255,.08)' : 'rgba(212,160,23,.5)'),
        color: disabled ? 'var(--tx4)' : C.gold,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: F, fontSize: 12.5, fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        alignSelf: 'flex-end', minWidth: 150,
        transition: '.15s', boxShadow: 'none',
      }}
    >
      {saving ? (
        <span>{T('جارٍ الحفظ…','Saving…')}</span>
      ) : (
        <>
          <span>{T('حفظ وتأكيد','Save & Confirm')}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </>
      )}
    </button>
  )
}

// Qiwa subscription add-on shown after the facility is saved. The checkbox expands the form
// (SADAD number + amount). Submitting inserts a row in transaction_fees with status='pending'
// so it appears in the Payments page until the office pays it. The component fetches any
// existing fee on mount so the pending/paid badge survives reloads.
function QiwaSubscriptionBox({ sb, sr, T, toast, user }) {
  const [open, setOpen] = useState(false)
  const [existing, setExisting] = useState(null) // { status } | null — fee row, if any
  const [loading, setLoading] = useState(true)
  const [sadad, setSadad] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await sb.from('transaction_fees')
        .select('id,status').eq('service_request_id', sr.id).eq('fee_label_ar', 'اشتراك قوى')
        .is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!alive) return
      setExisting(data || null); setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, sr.id])
  const canSubmit = sadad.trim().length > 0 && Number(amount) > 0 && !saving
  const submit = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      const { data, error } = await sb.from('transaction_fees').insert({
        service_request_id: sr.id,
        fee_label_ar: 'اشتراك قوى',
        fee_label_en: 'Qiwa Subscription',
        amount: Number(amount),
        sadad_no: sadad.trim(),
        status: 'pending',
        // Marker so PaymentsPage only lists items explicitly sent for payment via this flow
        // (and not auto-generated / legacy rows in transaction_fees).
        notes: 'manual_pay_request',
        created_by: user?.id || null,
      }).select('id,status').single()
      if (error) throw error
      toast?.(T('تمت إضافة اشتراك قوى للمدفوعات', 'Qiwa subscription added to Payments'))
      setExisting(data); setOpen(false)
    } catch (e) {
      toast?.(T('تعذرت الإضافة: ' + (e.message || ''), 'Could not add: ' + (e.message || '')), 'error')
    } finally { setSaving(false) }
  }
  if (loading) return null
  if (existing) {
    const isPaid = existing.status === 'paid'
    const c = isPaid ? C.ok : C.warn
    return (
      <div style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', borderRadius: 9, background: `${c}1f`, border: `1px solid ${c}66`, color: c, fontFamily: F, fontSize: 12.5, fontWeight: 800 }}>
        {isPaid
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        <span>{T(isPaid ? 'تم السداد' : 'في انتظار السداد', isPaid ? 'Paid' : 'Pending payment')}</span>
      </div>
    )
  }
  return (
    <div style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', padding: '10px 14px', borderRadius: 9, background: open ? 'rgba(212,160,23,.10)' : 'transparent', border: '1px solid ' + (open ? 'rgba(212,160,23,.4)' : 'rgba(212,160,23,.25)'), transition: '.15s', boxSizing: 'border-box' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(212,160,23,.06)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}>
        <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid ' + (open ? C.gold : 'rgba(212,160,23,.5)'), background: open ? C.gold : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}>
          {open && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
        </span>
        <input type="checkbox" checked={open} onChange={e => setOpen(e.target.checked)} style={{ display: 'none' }} />
        <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: open ? C.gold : C.gold }}>{T('إضافة اشتراك قوى','Add Qiwa subscription')}</span>
      </label>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(212,160,23,.25)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px' }}>{T('رقم السداد','SADAD No')}</label>
              <input type="text" value={sadad} onChange={e => setSadad(e.target.value.replace(/[^\d]/g, ''))} placeholder="—"
                style={{ height: 38, padding: '0 12px', borderRadius: 8, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx1)', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, direction: 'ltr', textAlign: 'center', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.5)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px' }}>{T('المبلغ (ريال)','Amount (SAR)')}</label>
              <input type="text" inputMode="decimal" value={amount}
                onChange={e => { const v = e.target.value.replace(/[^\d.]/g, ''); if (/^\d*\.?\d*$/.test(v)) setAmount(v) }}
                placeholder="0.00"
                style={{ height: 38, padding: '0 12px', borderRadius: 8, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.08)', color: C.gold, fontFamily: F, fontSize: 14, fontWeight: 800, direction: 'ltr', textAlign: 'center', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.5)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }} />
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = 'rgba(212,160,23,.15)' }}
            onMouseLeave={e => { if (canSubmit) e.currentTarget.style.background = 'transparent' }}
            style={{
              height: 38, padding: '0 20px', borderRadius: 9,
              background: 'transparent',
              border: '1px solid ' + (canSubmit ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.08)'),
              color: canSubmit ? C.gold : 'var(--tx4)',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: F, fontSize: 12.5, fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              alignSelf: 'flex-end', minWidth: 160, transition: '.15s', boxShadow: 'none',
            }}>
            <span>{saving ? T('جارٍ الإضافة…','Adding…') : T('تأكيد وسداد','Confirm & Pay')}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}

// Small numbered badge used in card headers to mark the post-payment workflow steps:
// 1) facility → 2) visa issuance → 3) wakalah → 4) medical exam → 5) work permit →
// 6) medical insurance → 7) iqama issuance → 8) iqama delivery.
function StepBadge({ n, c }) {
  return (
    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: c + '1f', border: '1px solid ' + c + '66', color: c, fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
  )
}

// Stable module-scope components for the step cards. Defining these at module scope (rather
// than inside an IIFE) keeps the function reference stable across re-renders, so inputs don't
// get remounted and don't lose focus on every keystroke.
const fmtFileSize = b => !b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`

function DatePickerInput({ value, onChange }) {
  const wrapRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value])
  const handleType = t => {
    let v = t.replace(/[^0-9-]/g, '')
    if (v.length > 4 && v[4] !== '-') v = v.slice(0,4) + '-' + v.slice(4)
    if (v.length > 7 && v[7] !== '-') v = v.slice(0,7) + '-' + v.slice(7)
    v = v.slice(0, 10)
    if (v.length >= 7) {
      const m = parseInt(v.slice(5, 7), 10)
      if (m > 12) v = v.slice(0, 5) + '12' + v.slice(7)
      else if (m === 0) v = v.slice(0, 5) + '01' + v.slice(7)
    }
    if (v.length >= 10) {
      const d = parseInt(v.slice(8, 10), 10)
      if (d > 31) v = v.slice(0, 8) + '31'
      else if (d === 0) v = v.slice(0, 8) + '01'
    }
    setText(v)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) || v === '') onChange(v)
  }
  const openPicker = () => {
    if (!open && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }
  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={text}
        onChange={e => handleType(e.target.value)}
        placeholder="yyyy-mm-dd"
        style={{ width: '100%', height: 38, padding: '0 38px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx1)', fontFamily: 'monospace', fontSize: 13, outline: 'none', boxSizing: 'border-box', direction: 'ltr', textAlign: 'center', fontVariantNumeric: 'tabular-nums', letterSpacing: '.5px' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="calendar"
        style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28, border: 'none', background: open ? 'rgba(212,160,23,.14)' : 'transparent', cursor: 'pointer', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 7, transition: '.15s' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
      {open && anchor && (<>
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
        <CalendarPopup value={value} onPick={onChange} onClose={() => setOpen(false)} anchor={anchor} lang="ar" />
      </>)}
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text', mono = false, placeholder = '' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px' }}>{label}</span>
      {type === 'date' ? (
        <DatePickerInput value={value} onChange={onChange} />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx1)', fontFamily: mono ? 'monospace' : F, fontSize: 13, outline: 'none', boxSizing: 'border-box', direction: mono ? 'ltr' : undefined, fontVariantNumeric: mono ? 'tabular-nums' : undefined }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}
        />
      )}
    </div>
  )
}

function AttachField({ T, label, files, isUploading, onPick, allowImage = false, hint }) {
  const accept = allowImage ? 'application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp' : 'application/pdf,.pdf'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px' }}>{label}</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: '1px dashed rgba(212,160,23,.32)', background: 'rgba(212,160,23,.04)', cursor: isUploading ? 'wait' : 'pointer', transition: '.15s' }}
        onMouseEnter={e => { if (!isUploading) e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
        onMouseLeave={e => { if (!isUploading) e.currentTarget.style.background = 'rgba(212,160,23,.04)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span style={{ fontSize: 12, color: isUploading ? 'var(--tx4)' : C.gold, fontWeight: 700, flex: 1 }}>{isUploading ? T('جارٍ الرفع…','Uploading…') : (hint || (allowImage ? T('انقر لاختيار صورة أو PDF','Click to choose image or PDF') : T('انقر لاختيار ملف PDF','Click to choose a PDF')))}</span>
        <input type="file" accept={accept} disabled={isUploading} onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} style={{ display: 'none' }} />
      </label>
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map(a => (
            <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.04)', textDecoration: 'none', transition: '.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.35)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.04)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name || '—'}</span>
              {a.size_bytes && <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, fontFamily: 'monospace' }}>{fmtFileSize(a.size_bytes)}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

const cardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle  = { fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '.2px' }

const selS = { padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: 'var(--tx1)', fontSize: 13, fontFamily: F, minWidth: 130 }
const btnFilter = (active) => ({ padding: '11px 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8 })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : C.gold, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
