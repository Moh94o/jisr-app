import React, { useEffect, useMemo, useState } from 'react'

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
    return `${yyyy}/${mm}/${dd}`
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
  work_visa:      { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل',  label_en: 'Work Visa' },
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

const SVC_ICON = {
  work_visa: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>,
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
export default function TransactionsPage({ sb, lang, user, branchId, toast }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [statsAgg, setStatsAgg] = useState({ services: [], statuses: [] })
  const [statsDaily, setStatsDaily] = useState([])
  const [statsTotalCount, setStatsTotalCount] = useState(0)
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

  // Paged list
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
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
    if (serviceType) qb = qb.eq('service_type_id', serviceType)
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
  }, [sb, page, branchFilter, branchId, serviceType, status, q, from, to])

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

  if (detail) return <TransactionDetailPage sb={sb} sr={detail} onBack={() => setDetail(null)} isAr={isAr} T={T} toast={toast} />

  /* ─────── Render ─────── */
  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('المعاملات','Transactions')}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('سجل الطلبات الرئيسية ومتابعة حالتها بحسب الخدمة والمكتب','Main service requests log — tracked by service type, branch and status')}</div>
      </div>

      {/* Stats — Hero KPI + Sidebar (statuses) + Services card */}
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
                <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontWeight: 700 }}>{r.request_ref_no}</span>
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
function TransactionDetailPage({ sb, sr, onBack, isAr, T, toast }) {
  const [data, setData] = useState({ loading: true })

  useEffect(() => {
    let alive = true
    ;(async () => {
      const code = sr.service_type?.code

      const SELECTS = {
        work_visa: `id,visa_number,visa_cost,border_number,wakalah_number,wakalah_date,wakalah_office,wakalah_price_1,wakalah_price_2,visa_used,gender,
          main_facility:main_facility_id(name_ar,unified_number),
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
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} title={T('رجوع','Back')} style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500, transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = C.gold }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          <span>{T('رجوع','Back')}</span>
        </button>
      </div>

      {/* Header — title + service tag + ref + branch + date + status */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ fontSize: 21, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{T('تفاصيل المعاملة','Transaction Details')}</div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)' }}>
          <span style={{ color: svc.c, fontSize: 12, fontWeight: 700, borderBottom: '1.5px solid ' + svc.c, paddingBottom: 1 }}>{isAr ? svc.label_ar : svc.label_en}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
            <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 600 }}>#{sr.request_ref_no}</span>
            <button
              title={T('نسخ رقم الطلب','Copy ref no')}
              onClick={() => { try { navigator.clipboard?.writeText(sr.request_ref_no); toast?.(T('تم نسخ رقم الطلب','Ref no copied')) } catch {} }}
              style={{ width: 19, height: 19, padding: 0, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx4)' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </span>
          {sr.branch?.branch_code && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span title={T('المكتب','Branch')} style={{ color: C.gold, fontWeight: 700, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
                <span>{sr.branch.branch_code}</span>
              </span>
            </>
          )}
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
          <span style={{ color: 'var(--tx4)' }}>{fmtDateTime(sr.request_date, isAr)}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
          <span style={{ padding: '3px 10px', borderRadius: 999, border: '1.5px solid ' + st.c, color: st.c, fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px' }}>{isAr ? st.stamp_ar : st.stamp_en}</span>
          {Number(sr.quantity || 1) > 1 && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ color: 'var(--tx3)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>×{sr.quantity}</span>
            </>
          )}
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

          {/* Application Details card (service-specific) */}
          {data.loading && (
            <div style={cardChrome}>
              <div style={{ padding: '18px 22px', textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
            </div>
          )}
          {!data.loading && data.det.map((d, idx) => (
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
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: st.c, boxShadow: `0 0 12px ${st.c}aa` }} />
                <span style={{ fontSize: 22, fontWeight: 800, color: st.c, letterSpacing: '-.3px' }}>{isAr ? st.stamp_ar : st.stamp_en}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                {T('آخر تحديث','Last update')} <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtGreg(sr.request_date)}</span>
              </div>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Row label={T('نوع الخدمة','Service')} value={isAr ? svc.label_ar : svc.label_en} color={svc.c} />
              <Row label={T('الكمية','Quantity')} value={'×' + Number(sr.quantity || 1)} mono />
              {sr.branch?.branch_code && <Row label={T('المكتب','Branch')} value={sr.branch.branch_code} mono />}
              <Row label={T('تاريخ الطلب','Request Date')} value={fmtGreg(sr.request_date)} mono />
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
                  {(iv.payment_plan || iv.installments_count > 0) && (
                    <div style={{ marginTop: 12, fontSize: 11, color: 'var(--tx4)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{iv.payment_plan === 'installment' ? T('أقساط','Installments') : T('نقد','Cash')}</span>
                      {iv.installments_count > 0 && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{iv.installments_count} {T('قسط','installments')}</span>}
                    </div>
                  )}
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

const AmountBox = ({ label, value, color }) => (
  <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</div>
  </div>
)

const cardChrome = { background: 'linear-gradient(180deg,#1f1f1f 0%,#181818 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle  = { fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '.2px' }

const selS = { padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: 'var(--tx1)', fontSize: 13, fontFamily: F, minWidth: 130 }
const btnFilter = (active) => ({ padding: '11px 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8 })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : C.gold, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
