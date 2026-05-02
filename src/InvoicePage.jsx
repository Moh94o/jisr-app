import React, { useEffect, useMemo, useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { DateField, Sel } from './pages/KafalaCalculator.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 60

const num = (v) => Number(v || 0).toLocaleString('en-US')
const flagEmoji = (code) => { if (!code || code.length !== 2) return ''; try { return String.fromCodePoint(...[...code.toUpperCase()].map(c => c.charCodeAt(0) + 127397)) } catch { return '' } }
const fmtGreg = (iso, ar = true) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${yyyy}/${mm}/${dd}`
  } catch { return '—' }
}
const fmtPhone = (phone) => {
  if (!phone) return phone
  const s = String(phone).replace(/[^\d]/g, '')
  if (s.startsWith('966') && s.length === 12) return '0' + s.slice(3)
  return s
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
const fmtShort = (iso) => {
  if (!iso) return '—'
  try { const d = new Date(iso); const y = d.getFullYear() % 100; return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + String(y).padStart(2,'0') } catch { return '—' }
}

const SVC_THEME = {
  work_visa:      { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل',     label_en: 'Work Visa' },
  iqama_issuance: { c: '#27ae60',bg: 'rgba(39,174,96,.12)',   bd: 'rgba(39,174,96,.32)',   label_ar: 'إصدار إقامة',    label_en: 'Iqama Issuance' },
  transfer:       { c: C.orange, bg: 'rgba(243,156,18,.12)',  bd: 'rgba(243,156,18,.32)',  label_ar: 'نقل كفالة',      label_en: 'Transfer' },
  iqama_renewal:  { c: C.cyan,   bg: 'rgba(22,160,133,.12)',  bd: 'rgba(22,160,133,.32)',  label_ar: 'تجديد الإقامة',  label_en: 'Iqama Renewal' },
  ajeer:          { c: C.purple, bg: 'rgba(187,143,206,.12)', bd: 'rgba(187,143,206,.32)', label_ar: 'عقد أجير',       label_en: 'Ajeer Contract' },
  other:          { c: C.gold,   bg: 'rgba(212,160,23,.12)',  bd: 'rgba(212,160,23,.32)',  label_ar: 'الغرفة التجارية', label_en: 'Chamber' },
  general:        { c: C.gray,   bg: 'rgba(149,165,166,.12)', bd: 'rgba(149,165,166,.32)', label_ar: 'خدمات أخرى',     label_en: 'Other Services' },
}

const INV_STATUS_THEME = {
  new:        { c: C.blue,   stamp_ar: 'جديدة',           stamp_en: 'NEW' },
  active:     { c: C.gold,   stamp_ar: 'نشطة',            stamp_en: 'ACTIVE' },
  fully_paid: { c: C.ok,     stamp_ar: 'مدفوعة بالكامل',  stamp_en: 'PAID' },
  cancelled:  { c: C.red,    stamp_ar: 'ملغية',           stamp_en: 'CANCELLED' },
}
// Compute synthetic status from amounts when status_id is missing or generic
const inferPayState = (inv) => {
  const total = Number(inv.total_amount || 0)
  const paid  = Number(inv.paid_amount || 0)
  if (total <= 0)              return 'unpaid'
  if (paid <= 0)               return 'unpaid'
  if (paid >= total)           return 'paid'
  return 'partial'
}
const PAY_THEME = {
  paid:    { c: C.ok,   stamp_ar: 'مسدّدة',     stamp_en: 'PAID' },
  partial: { c: C.gold, stamp_ar: 'جزئي',        stamp_en: 'PARTIAL' },
  unpaid:  { c: C.red,  stamp_ar: 'غير مسدّدة',  stamp_en: 'UNPAID' },
}

/* ─── Tiny bits ─── */
const Pill = ({ count, label, color, money }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 14px', borderRadius: 999,
    background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)',
  }}>
    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: '0 0 6px ' + color }} />
    <span style={{ fontSize: money ? 14 : 18, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>{count}</span>
    <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>{label}</span>
  </div>
)

const StatCard = ({ label, value, sub, color, sup }) => {
  const c = color || C.gold
  return (
    <div style={{
      minWidth: 0, minHeight: 130,
      padding: '14px 18px', borderRadius: 16,
      background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
      border: '1px solid rgba(255,255,255,.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      {/* Subtle top color accent */}
      <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `linear-gradient(90deg, ${c}55, transparent 70%)` }} />
      {/* Faded watermark glow */}
      <div style={{ position: 'absolute', insetInlineStart: -40, top: -40, width: 110, height: 110, borderRadius: '50%', background: `radial-gradient(circle, ${c}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

      {/* Top: label + glowing dot */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.1px' }}>{label}</div>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}aa` }} />
      </div>

      {/* Big value — centered vertically in available space, right-aligned in RTL */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', gap: 5, padding: '6px 0' }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: c, letterSpacing: '-1px', lineHeight: 1, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {sup && <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{sup}</span>}
      </div>

      {/* Bottom: divider + sub aligned right */}
      {sub && (
        <div style={{ position: 'relative', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', fontSize: 11, color: 'var(--tx3)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{sub}</span>
        </div>
      )}
    </div>
  )
}

function Sparkline({ points, width = 360, height = 90 }) {
  if (!points?.length) return null
  const max = Math.max(1, ...points)
  const W = width, H = height
  const px = i => (i / Math.max(1, points.length - 1)) * W
  const py = v => H - (v / max) * (H - 8) - 4
  const linePath = points.map((v, i) => (i === 0 ? 'M' : 'L') + px(i).toFixed(1) + ',' + py(v).toFixed(1)).join(' ')
  const areaPath = linePath + ` L${W},${H} L0,${H} Z`
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="inv-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.42" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#inv-spark-fill)" />
      <path d={linePath} stroke={C.gold} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={px(0)} cy={py(points[0])} r="3.5" fill={C.ok} stroke="#1a1a1a" strokeWidth="2" />
      <circle cx={px(points.length - 1)} cy={py(points[points.length - 1])} r="3.5" fill={C.gold} stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function InvoicePage({ sb, lang, user, branchId, toast }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [page, setPage] = useState(0)

  // Stats
  const [statsAgg, setStatsAgg] = useState({ services: [], statuses: [] })
  const [statsDaily, setStatsDaily] = useState([])
  const [statsTotalCount, setStatsTotalCount] = useState(0)
  const [aging, setAging] = useState([])
  const [dailyCash, setDailyCash] = useState(0)
  const [periodStats, setPeriodStats] = useState({
    cash: { cnt: 0, sum: 0 },
    bank: { cnt: 0, sum: 0 },
    cancelled: { cnt: 0, sum: 0 },
    voided: { cnt: 0, sum: 0 },
  })
  const [weekStats, setWeekStats] = useState({
    cash: { cnt: 0, sum: 0 },
    bank: { cnt: 0, sum: 0 },
    voided: { cnt: 0, sum: 0 },
  })
  const [svcToday, setSvcToday] = useState([])
  const [svcWeek, setSvcWeek] = useState([])

  // Filters
  const [q, setQ] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [payFilter, setPayFilter] = useState('') // paid | partial | unpaid
  const [branchFilter, setBranchFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [paymentPlan, setPaymentPlan] = useState('') // cash | installment
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [advOpen, setAdvOpen] = useState(false)

  // Lookups
  const [branches, setBranches] = useState([])
  const [services, setServices] = useState([])

  const [detail, setDetail] = useState(null)
  const [cancelledStatusId, setCancelledStatusId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([
      sb.from('branches').select('id,branch_code').order('branch_code'),
      sb.from('lookup_items').select('id,code,value_ar,value_en,category:lookup_categories!inner(category_key)').eq('category.category_key', 'service_type'),
      sb.from('lookup_items').select('id,code,category:lookup_categories!inner(category_key)').eq('category.category_key', 'invoice_status').eq('code', 'cancelled').limit(1),
    ]).then(([b, s, st]) => {
      if (!alive) return
      setBranches(b.data || [])
      setServices(s.data || [])
      setCancelledStatusId(st.data?.[0]?.id || null)
    })
    return () => { alive = false }
  }, [sb])

  const cancelInvoice = async (inv) => {
    if (!cancelledStatusId) { toast?.(T('تعذر تحديد حالة "ملغية"','Cannot resolve cancelled status'), 'error'); return }
    if (!window.confirm(T(`هل تريد إلغاء الفاتورة ${inv.invoice_no}؟`, `Cancel invoice ${inv.invoice_no}?`))) return
    setBusyId(inv.id)
    const { error } = await sb.from('invoices').update({ status_id: cancelledStatusId }).eq('id', inv.id)
    setBusyId(null)
    if (error) { toast?.(T('فشل الإلغاء: ','Cancel failed: ') + error.message, 'error'); return }
    toast?.(T('تم إلغاء الفاتورة','Invoice cancelled'), 'delete')
    setRefreshTick(t => t + 1)
  }

  const refundInvoice = async (inv) => {
    if (!window.confirm(T(`هل تريد استرجاع الفاتورة ${inv.invoice_no} (تعطيل جميع المدفوعات)؟`, `Refund invoice ${inv.invoice_no} (void all payments)?`))) return
    setBusyId(inv.id)
    const { error } = await sb.from('payments').update({ is_valid: false }).eq('invoice_id', inv.id).is('deleted_at', null)
    setBusyId(null)
    if (error) { toast?.(T('فشل الاسترجاع: ','Refund failed: ') + error.message, 'error'); return }
    toast?.(T('تم استرجاع الفاتورة','Invoice refunded'), 'delete')
    setRefreshTick(t => t + 1)
  }

  // Aggregations
  useEffect(() => {
    let alive = true
    const todayIso = new Date().toISOString().slice(0, 10)
    Promise.all([
      sb.from('v_invoice_stats').select('*'),
      sb.from('v_invoice_daily').select('*'),
      sb.from('v_invoice_aging').select('*'),
      sb.from('invoices').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      sb.from('payments').select('amount,payment_method:payment_method_id!inner(code)')
        .eq('payment_method.code', 'cash')
        .eq('is_valid', true)
        .is('deleted_at', null)
        .gte('payment_date', todayIso + 'T00:00:00')
        .lte('payment_date', todayIso + 'T23:59:59'),
    ]).then(([s, d, a, c, pc]) => {
      if (!alive) return
      const items = s.data || []
      setStatsAgg({
        services: items.filter(i => i.dim === 'service_type'),
        statuses: items.filter(i => i.dim === 'status'),
      })
      setStatsDaily(d.data || [])
      setAging(a.data || [])
      setStatsTotalCount(c.count || 0)
      setDailyCash((pc.data || []).reduce((s, p) => s + (Number(p.amount) || 0), 0))
    })
    return () => { alive = false }
  }, [sb])

  // Daily + weekly KPI breakdown (cash / bank+pos / cancelled / voided)
  useEffect(() => {
    let alive = true
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6)
    const norm = (x) => ({ cnt: Number(x?.cnt) || 0, sum: Number(x?.sum) || 0 })
    Promise.all([
      sb.rpc('invoice_period_stats', { p_start: todayStart.toISOString() }),
      sb.rpc('invoice_period_stats', { p_start: weekStart.toISOString() }),
    ]).then(([t, w]) => {
      if (!alive) return
      if (t.data) {
        setPeriodStats({
          cash: norm(t.data.cash),
          bank: norm(t.data.bank),
          cancelled: norm(t.data.cancelled),
          voided: norm(t.data.voided),
        })
      }
      if (w.data) {
        setWeekStats({
          cash: norm(w.data.cash),
          bank: norm(w.data.bank),
          voided: norm(w.data.voided),
        })
      }
    })
    return () => { alive = false }
  }, [sb])

  // Service distribution — today AND last 7 days (shown as two separate cards)
  useEffect(() => {
    let alive = true
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6)
    const norm = (rows) => (rows || []).map(s => ({ code: s.code, cnt: Number(s.cnt) || 0, sum: Number(s.sum) || 0 }))
    Promise.all([
      sb.rpc('invoice_period_stats', { p_start: todayStart.toISOString() }),
      sb.rpc('invoice_period_stats', { p_start: weekStart.toISOString() }),
    ]).then(([t, w]) => {
      if (!alive) return
      setSvcToday(norm(t.data?.services))
      setSvcWeek(norm(w.data?.services))
    })
    return () => { alive = false }
  }, [sb])

  // Paged invoice list
  useEffect(() => {
    let alive = true
    setLoading(true); setErr(null)
    let qb = sb
      .from('invoices')
      .select(`
        id, invoice_no, total_amount, paid_amount, remaining_amount, payment_plan, installments_count, created_at,
        service_type:service_type_id(code,value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(id,branch_code),
        agent:agent_id(name_ar,name_en),
        service_request:service_request_id(
          id, request_ref_no, request_date, quantity,
          client:client_id(name_ar,name_en,phone,id_number,nationality:nationality_id(code,name_ar,flag_url)),
          visa_applications(visa_type:visa_type_id(code,value_ar,value_en)),
          transfer_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url))),
          ajeer_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url))),
          iqama_renewal_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url))),
          other_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url)))
        )
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false, nullsFirst: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    if (branchFilter) qb = qb.eq('branch_id', branchFilter)
    if (serviceType) qb = qb.eq('service_type_id', serviceType)
    if (from) qb = qb.gte('created_at', from)
    if (to) qb = qb.lte('created_at', to + 'T23:59:59')
    if (q.trim()) qb = qb.ilike('invoice_no', `%${q.trim()}%`)
    if (payFilter === 'paid')    qb = qb.eq('remaining_amount', 0)
    if (payFilter === 'unpaid')  qb = qb.eq('paid_amount', 0).gt('total_amount', 0)
    if (payFilter === 'partial') qb = qb.gt('paid_amount', 0).gt('remaining_amount', 0)
    if (paymentPlan) qb = qb.eq('payment_plan', paymentPlan)
    if (amountMin)   qb = qb.gte('total_amount', Number(amountMin))
    if (amountMax)   qb = qb.lte('total_amount', Number(amountMax))

    qb.then(({ data, count, error }) => {
      if (!alive) return
      if (error) { setErr(error.message); setLoading(false); return }
      setRows(data || []); setTotal(count || 0); setLoading(false)
    })
    return () => { alive = false }
  }, [sb, page, branchFilter, serviceType, payFilter, from, to, q, paymentPlan, amountMin, amountMax, refreshTick])

  const stats = useMemo(() => {
    const total = statsTotalCount
    const byService = Object.fromEntries(statsAgg.services.map(s => [s.code || 'general', { cnt: Number(s.cnt) || 0, total: Number(s.total) || 0, paid: Number(s.paid) || 0 }]))
    const totalAmt = Object.values(byService).reduce((s, v) => s + v.total, 0)
    const totalPaid = Object.values(byService).reduce((s, v) => s + v.paid, 0)
    const totalRemaining = Math.max(0, totalAmt - totalPaid)

    const days = 14, today = new Date(); today.setHours(0,0,0,0)
    const buckets = new Array(days).fill(0)
    statsDaily.forEach(d => {
      const dt = new Date(d.day); dt.setHours(0,0,0,0)
      const age = Math.round((today - dt) / 86400000)
      if (age >= 0 && age < days) buckets[days - 1 - age] = Number(d.cnt) || 0
    })

    // Pay state buckets — derived from invoices select payload below
    return { total, byService, totalAmt, totalPaid, totalRemaining, sparkline: buckets, aging }
  }, [statsAgg, statsDaily, statsTotalCount, aging])

  // Day grouping
  const grouped = useMemo(() => {
    const days = {}; const order = []
    rows.forEach(r => {
      const k = (r.created_at || '').slice(0, 10) || 'بدون'
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

  if (detail) return <InvoiceDetailPage sb={sb} inv={detail} onBack={() => setDetail(null)} isAr={isAr} T={T} toast={toast} />

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('الفواتير','Invoices')}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('إدارة الفواتير وحالات السداد ومتابعة الأقساط والدفعات','Manage invoices, payment status, installments and payments')}</div>
      </div>

      {/* Stats + Services — Hero + Sidebar + Services (refined layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — big primary KPI: نقدية */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.ok}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          {/* Top — label with dot */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ok, boxShadow: `0 0 10px ${C.ok}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('نقدية','Cash')}</span>
          </div>
          {/* Center — big number with currency */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.ok, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(periodStats.cash.sum)}</span>
          </div>
          {/* Bottom — count badge */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد المقبوضات','Receipts')}</span>
            <span style={{ fontSize: 13, color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(periodStats.cash.cnt)}</span>
          </div>
        </div>

        {/* Sidebar — 2 secondary KPIs stacked, balanced */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 150,
        }}>
          {[
            { label: T('تحويلات بنكية','Bank Transfers'), val: periodStats.bank.sum, cnt: periodStats.bank.cnt, c: C.blue },
            { label: T('فواتير مرتجعة','Voided'), val: periodStats.voided.sum, cnt: periodStats.voided.cnt, c: C.red },
          ].map((s, i) => (
            <div key={i} style={{
              position: 'relative', padding: '12px 16px', flex: 1,
              borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', insetInlineStart: -25, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.c}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{s.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>({num(s.cnt)})</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', direction: 'ltr' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{num(s.val)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Services card — list all main services with mini progress bars */}
        {(() => {
          const MAIN_SVC = ['work_visa', 'transfer', 'iqama_renewal', 'ajeer', 'other', 'general']
          const mergeAll = (svc) => {
            const map = Object.fromEntries(svc.map(s => [s.code, s]))
            return MAIN_SVC.map(code => map[code] || { code, cnt: 0, sum: 0 })
          }
          const todaySvcs = mergeAll(svcToday)
          const todayTotal = todaySvcs.reduce((a, b) => a + b.cnt, 0)
          const max = Math.max(...todaySvcs.map(s => s.cnt), 1)

          return (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الخدمات — اليوم','Services — Today')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(todayTotal)}</span> {T('فاتورة','invoices')}
                </span>
              </div>
              {/* Single stacked bar showing all services */}
              {todayTotal > 0 && (
                <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                  {todaySvcs.filter(s => s.cnt > 0).map(s => {
                    const theme = SVC_THEME[s.code] || SVC_THEME.general
                    const pct = (s.cnt / todayTotal) * 100
                    return <div key={s.code} title={`${theme.label_ar}: ${s.cnt}`} style={{ width: pct + '%', background: theme.c, transition: 'width .3s' }} />
                  })}
                </div>
              )}
              {/* Services labels list (2 columns, no individual bars) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                {todaySvcs.map(s => {
                  const theme = SVC_THEME[s.code] || SVC_THEME.general
                  const isZero = s.cnt === 0
                  return (
                    <div key={s.code} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: isZero ? 0.45 : 1 }}>
                      <span style={{ color: isZero ? 'var(--tx4)' : theme.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(s.cnt)}</span>
                      <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{T(theme.label_ar, theme.label_en)}</span>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            placeholder={T('ابحث برقم الفاتورة…','Search by invoice no…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(branchFilter || serviceType || payFilter || from || to || paymentPlan || amountMin || amountMax)
          const clearAll = () => { setBranchFilter(''); setFrom(''); setTo(''); setServiceType(''); setPayFilter(''); setPaymentPlan(''); setAmountMin(''); setAmountMax(''); setPage(0) }
          return (
        <button onClick={() => setAdvOpen(o => !o)} style={btnFilter(advOpen || hasFilters)}>
          {T('تصفية','Filter')}
          {hasFilters ? (
            <span
              role="button"
              tabIndex={0}
              title={T('مسح الفلاتر','Clear filters')}
              onClick={e => { e.stopPropagation(); clearAll() }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
              style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
          )}
        </button>
          )
        })()}
      </div>

      {/* Advanced filter panel — matches Transfer Calc design */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        const fInp = { height: 42, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 500, outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.18s', width: '100%', boxSizing: 'border-box' }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>{T('المكتب','Branch')}</div>
                <Sel value={branchFilter} onChange={v => { setBranchFilter(v); setPage(0) }} placeholder={T('كل المكاتب','All branches')} options={[{ v: '', l: T('كل المكاتب','All branches') }, ...branches.map(b => ({ v: b.id, l: b.branch_code }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ من','Date From')}</div>
                <DateField value={from} onChange={v => { setFrom(v); setPage(0) }} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('تاريخ إلى','Date To')}</div>
                <DateField value={to} onChange={v => { setTo(v); setPage(0) }} lang={lang} />
              </div>
              <div>
                <div style={fLbl}>{T('نوع الخدمة','Service Type')}</div>
                <Sel value={serviceType} onChange={v => { setServiceType(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...services.map(s => ({ v: s.id, l: isAr ? s.value_ar : (s.value_en || s.value_ar) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('حالة السداد','Pay Status')}</div>
                <Sel value={payFilter} onChange={v => { setPayFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, { v: 'paid', l: T('مسدّدة','Paid') }, { v: 'partial', l: T('جزئي','Partial') }, { v: 'unpaid', l: T('غير مسدّدة','Unpaid') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('خطة الدفع','Payment Plan')}</div>
                <Sel value={paymentPlan} onChange={v => { setPaymentPlan(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, { v: 'cash', l: T('نقد','Cash') }, { v: 'installment', l: T('أقساط','Installments') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('المبلغ من','Amount Min')}</div>
                <input type="number" inputMode="decimal" value={amountMin} onChange={e => { setAmountMin(e.target.value); setPage(0) }} placeholder="0" style={{ ...fInp, textAlign: 'center', direction: 'ltr' }} />
              </div>
              <div>
                <div style={fLbl}>{T('المبلغ إلى','Amount Max')}</div>
                <input type="number" inputMode="decimal" value={amountMax} onChange={e => { setAmountMax(e.target.value); setPage(0) }} placeholder="∞" style={{ ...fInp, textAlign: 'center', direction: 'ltr' }} />
              </div>
            </div>
          </div>
        )
      })()}


      {/* List */}
      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>…</div>}
      {!loading && err && <div style={{ padding: 60, textAlign: 'center', color: C.red, fontSize: 13 }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {T('لا توجد فواتير','No invoices')}
        </div>
      )}

      {!loading && !err && grouped.order.map(dayKey => {
        const dayRows = grouped.days[dayKey]
        const dayTotal = dayRows.reduce((s, r) => s + Number(r.total_amount || 0), 0)
        const dayPaid  = dayRows.reduce((s, r) => s + Number(r.paid_amount || 0), 0)
        return (
          <div key={dayKey} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: dayKey === todayStr ? C.gold : 'var(--tx2)' }}>{dayLabel(dayKey)}</span>
                <span style={{ fontSize: 12, color: 'var(--tx4)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{dayFull(dayKey)}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 16, fontWeight: 600 }}>
                <span>{num(dayRows.length)} {T('فاتورة','invoices')}</span>
                <span style={{ color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(dayTotal)}</span>
                <span style={{ color: C.ok, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {num(dayPaid)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayRows.map((r, idx) => {
                const svc = SVC_THEME[r.service_type?.code || 'general'] || SVC_THEME.general
                const pay = inferPayState(r)
                const payT = PAY_THEME[pay]
                const remaining = Number(r.remaining_amount || 0)
                const total = Number(r.total_amount || 0)
                const paid = Number(r.paid_amount || 0)
                const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0
                // When workerIsClient was checked at request time, client_id stays null but
                // a worker exists on the application table — use the worker as the displayed party.
                // PostgREST returns 1:1 embeds as object (or array depending on schema) — handle both.
                const sr = r.service_request
                const pickWorker = (rel) => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
                const workerFromApp = pickWorker(sr?.transfer_applications)
                                   || pickWorker(sr?.ajeer_applications)
                                   || pickWorker(sr?.iqama_renewal_applications)
                                   || pickWorker(sr?.other_applications)
                                   || null
                const party = sr?.client || workerFromApp
                const partyIsWorker = !sr?.client && !!workerFromApp
                const partyId = party?.id_number || party?.iqama_number
                const phone = party?.phone
                const overdueDays = pay === 'unpaid' ? Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)) : 0
                const shortDate = (() => { try { const d = new Date(r.created_at); return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') } catch { return '' } })()
                const SVC_ICON = {
                  work_visa: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>,
                  transfer: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>,
                  ajeer: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                  iqama_renewal: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
                  other: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>,
                  general: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
                }
                const svcCode = r.service_type?.code || 'general'
                const svcIcon = SVC_ICON[svcCode] || SVC_ICON.general
                return (
                  <div key={r.id} onClick={() => setDetail(r)} className="inv-card"
                    style={{
                      position: 'relative', cursor: 'pointer',
                      borderRadius: 14,
                      background: 'radial-gradient(ellipse at top, rgba(212,160,23,.06) 0%, #222 60%)',
                      border: '1px solid rgba(255,255,255,.05)',
                      boxShadow: '0 4px 14px rgba(0,0,0,.22)',
                      transition: 'all .15s', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = payT.c + '55' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>

                    {/* Padded content */}
                    <div style={{ padding: '16px 22px 14px 18px' }}>
                      {/* Top section: client info + amount, separated by vertical divider */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 200px', gap: 18, alignItems: 'center' }}>

                        {/* Right (client) */}
                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                          {/* Name row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            {(() => { const nat = party?.nationality; const fl = nat?.flag_url; const em = flagEmoji(nat?.code); return fl ? <img src={fl} alt={nat?.name_ar || ''} title={nat?.name_ar || ''} style={{ width: 30, height: 21, objectFit: 'cover', flexShrink: 0, borderRadius: 3 }} /> : (em ? <span title={nat?.name_ar || ''} style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null) })()}
                            <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>{party?.name_ar || party?.name_en || T('— بدون عميل —','— no client —')}</span>
                            {partyIsWorker && (
                              <span title={T('العامل هو العميل','Worker is the client')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(212,160,23,.10)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                {T('العامل هو العميل','worker = client')}
                              </span>
                            )}
                            {(r.agent?.name_ar || r.agent?.name_en) && (
                              <span title={T('الوسيط','Broker')} style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                                {isAr ? (r.agent.name_ar || r.agent.name_en) : (r.agent.name_en || r.agent.name_ar)}
                              </span>
                            )}
                            {overdueDays > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(232,114,101,.14)', border: '1px solid rgba(232,114,101,.4)', fontSize: 10, fontWeight: 700, color: C.red, flexShrink: 0 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                                {T(`متأخرة ${overdueDays} يوم`, `${overdueDays}d overdue`)}
                              </span>
                            )}
                          </div>

                          {/* ID + phone (under name) */}
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            {partyId && (
                              <span title={partyIsWorker ? T('رقم الإقامة','Iqama number') : T('رقم الهوية','ID number')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>
                                <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{partyId}</span>
                              </span>
                            )}
                            {phone && (
                              <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} title={phone} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx3)', direction: 'ltr', textDecoration: 'none', padding: '2px 6px', borderRadius: 5, fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                {phone.replace(/^966/, '0')}
                              </a>
                            )}
                            {r.branch?.branch_code && (
                              <span title={T('المكتب','Branch')} style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                                {r.branch.branch_code}
                              </span>
                            )}
                          </div>

                          {/* Service + INV + branch */}
                          {(() => {
                            const qty = Number(r.service_request?.quantity || 0)
                            const isVisa = r.service_type?.code === 'work_visa'
                            const va = Array.isArray(r.service_request?.visa_applications) ? r.service_request.visa_applications[0] : null
                            const subLabel = va?.visa_type ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
                            const fullLabel = [isAr ? svc.label_ar : svc.label_en, subLabel].filter(Boolean).join(' ')
                            const showQty = isVisa && qty > 0
                            return (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 6, background: svc.bg, border: '1px solid ' + svc.bd, color: svc.c, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800, paddingInlineStart: 8, borderInlineStart: '1px solid ' + svc.bd }}>×{qty}</span>}
                              <span>{fullLabel}</span>
                            </span>
                            {r.service_request?.request_ref_no && (
                              <span title={T('رقم الطلب الرئيسي','Main request no')} style={{ fontSize: 12, color: 'var(--tx2)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <button
                                  title={T('نسخ رقم الطلب','Copy request no')}
                                  onClick={e => { e.stopPropagation(); try { navigator.clipboard?.writeText(r.service_request.request_ref_no); toast?.(T('تم نسخ رقم الطلب','Request no copied')) } catch {} }}
                                  style={{ width: 16, height: 16, padding: 0, borderRadius: 3, background: 'transparent', border: 'none', color: 'currentColor', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s', opacity: 0.75 }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.75' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                                <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontWeight: 700 }}>{r.service_request.request_ref_no}</span>
                              </span>
                            )}
                            <span style={{ fontSize: 12, color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <button
                                title={T('نسخ رقم الفاتورة','Copy invoice no')}
                                onClick={e => { e.stopPropagation(); try { navigator.clipboard?.writeText(r.invoice_no); toast?.(T('تم نسخ رقم الفاتورة','Invoice no copied')) } catch {} }}
                                style={{ width: 16, height: 16, padding: 0, borderRadius: 3, background: 'transparent', border: 'none', color: 'currentColor', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s', opacity: 0.75 }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '0.75' }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              </button>
                              <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontWeight: 700 }}>{r.invoice_no}</span>
                            </span>
                          </div>
                            )
                          })()}
                        </div>

                        {/* Vertical divider */}
                        <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />

                        {/* Left (amount) — structured with header, big value, paid/remaining rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* Date row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('الإجمالي','Total')}</span>
                            <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{shortDate}</span>
                          </div>
                          {/* Big amount */}
                          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{num(total)}</div>
                          {/* Paid / Remaining structured rows */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                              <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('المسدّد','Paid')}</span>
                              <span style={{ color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {num(paid)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                              <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('المتبقي','Remaining')}</span>
                              <span style={{ color: remaining > 0 ? C.warn : C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{remaining > 0 ? '− ' + num(remaining) : '✓'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Progress strip — flush at bottom edge of card */}
                    <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: payT.c, transition: 'width .3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Pagination — Slim split with divider lines */}
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
            .inv-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
            .inv-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
            .inv-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
            .inv-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
            .inv-pg-input::-webkit-outer-spin-button,.inv-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, fontFamily: F }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(total)}</span>
            <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500, fontFamily: F }}>{T('صفحة','Page')} {page+1} {T('من','of')} {totalPages}</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button className="inv-pg-btn" disabled={prevDisabled} onClick={goPrev} aria-label={T('السابق','Prev')}><PrevIco/></button>
            <input className="inv-pg-input" type="number" min={1} max={totalPages} value={page+1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v-1) }}/>
            <button className="inv-pg-btn" disabled={nextDisabled} onClick={goNext} aria-label={T('التالي','Next')}><NextIco/></button>
          </div>
        </div>
      })()}


    </div>
  )
}

/* ═════════════ Full-page detail ═════════════ */
function InvoiceDetailPage({ sb, inv, onBack, isAr, T, toast }) {
  const [data, setData] = useState({ loading: true })
  const [actionModal, setActionModal] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const code = inv.service_type?.code
      const srId = inv.service_request?.id

      const SELECTS = {
        work_visa: `id,visa_number,visa_cost,border_number,wakalah_number,wakalah_date,wakalah_office,visa_used,visa_used_date_check,gender,
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          nationality:nationality_id(name_ar,name_en),
          occupation:occupation_id(name_ar,name_en),
          embassy:embassy_id(name_ar,name_en),
          visa_type:visa_type_id(value_ar,value_en),
          visa_order_kind:visa_order_kind_id(value_ar,value_en),
          wakalah_status:wakalah_status_id(value_ar,value_en)`,
        transfer: `id,reference_number,total_price_initial,total_price_final,discount,office_cost,iqama_expiry_date,
          worker:worker_id(name_ar,name_en,iqama_number,phone),
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          new_occupation:new_occupation_id(name_ar,name_en),
          status:status_id(value_ar,value_en),
          worker_status:worker_status_id(value_ar,value_en)`,
        ajeer: `id,duration_months,start_date,end_date,
          worker:worker_id(name_ar,name_en,iqama_number),
          ajeer_facility:ajeer_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number),
          ajeer_city:ajeer_city_id(name_ar,name_en)`,
        iqama_renewal: `id,duration_months,current_expire_date,new_expire_date,
          worker:worker_id(name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
        iqama_issuance: `id,is_temporary,entry_date,check_date,worker_name_at_entry,
          iqama_status,iqama_number,iqama_expiry,iqama_amount,
          medical_status,medical_amount,
          work_permit_status,work_permit_expiry,work_permit_amount,
          insurance_status,insurance_amount,
          iqama_print_status,iqama_print_amount,iqama_delivery_status,
          contract_authentication_status,all_payment_status,
          worker:worker_id(name_ar,name_en,iqama_number),
          main_facility:main_facility_id(name_ar,unified_number,gosi_number,qiwa_prefix,qiwa_number)`,
        other: `id,description,
          worker:worker_id(name_ar,name_en,iqama_number),
          worker_facility:worker_facility_id(name_ar,unified_number)`,
      }
      const TABLES = { work_visa: 'visa_applications', transfer: 'transfer_applications', ajeer: 'ajeer_applications', iqama_renewal: 'iqama_renewal_applications', iqama_issuance: 'iqama_issuance_applications', other: 'other_applications' }
      const tbl = TABLES[code]
      const sel = SELECTS[code]

      const [insts, pays, det] = await Promise.all([
        sb.from('installments').select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,receipt_no,bank_reference,notes,payment_method:payment_method_id(value_ar,value_en),payment_milestone:payment_milestone_id(value_ar,value_en)').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order'),
        sb.from('payments').select('id,amount,payment_date,is_valid,receipt_no,bank_reference,payment_method:payment_method_id(value_ar,value_en),installment_id').eq('invoice_id', inv.id).is('deleted_at', null).order('payment_date', { ascending: false }),
        (tbl && srId) ? sb.from(tbl).select(sel).eq('service_request_id', srId) : Promise.resolve({ data: [] }),
      ])
      if (alive) setData({ loading: false, insts: insts.data || [], pays: pays.data || [], det: det.data || [], code })
    })()
    return () => { alive = false }
  }, [sb, inv.id, inv.service_type?.code, inv.service_request?.id])

  const svc = SVC_THEME[inv.service_type?.code || 'general'] || SVC_THEME.general
  const pay = inferPayState(inv)
  const payT = PAY_THEME[pay]
  const total = Number(inv.total_amount || 0)
  const paid = Number(inv.paid_amount || 0)
  const remaining = Number(inv.remaining_amount || 0)
  const pct = total ? Math.min(100, Math.round((paid / total) * 100)) : 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const overdueCount = (data.insts || []).filter(i => {
    const insTotal = Number(i.total_amount || 0)
    const insPaid = Number(i.paid_amount || 0)
    return insTotal > insPaid && i.expected_date && i.expected_date < todayStr
  }).length

  const onRecordPayment = () => setActionModal('payment')
  const onRefund        = () => setActionModal('refund')
  const onCancelInv     = () => setActionModal('cancel')
  const onPrint         = () => setActionModal('print')

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} title={T('رجوع','Back')} style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500, transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = C.gold }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          <span>{T('رجوع','Back')}</span>
        </button>
      </div>

      {/* Header — underlined title + tags */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ fontSize: 21, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{T('تفاصيل الفاتورة','Invoice Details')}</div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)' }}>
          {(() => {
            const isVisa = inv.service_type?.code === 'work_visa'
            const va = Array.isArray(inv.service_request?.visa_applications) ? inv.service_request.visa_applications[0] : null
            const sub = va?.visa_type ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
            const qty = Number(inv.service_request?.quantity || 0)
            const full = [isAr ? svc.label_ar : svc.label_en, sub].filter(Boolean).join(' ')
            const showQty = isVisa && qty > 0
            return (
              <span style={{ color: svc.c, fontSize: 12, fontWeight: 700, borderBottom: '1.5px solid ' + svc.c, paddingBottom: 1, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                {showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>×{qty}</span>}
                <span>{full}</span>
              </span>
            )
          })()}
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
            <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 600 }}>#{inv.invoice_no}</span>
            <button
              title={T('نسخ رقم الفاتورة','Copy invoice no')}
              onClick={() => { try { navigator.clipboard?.writeText(inv.invoice_no); toast?.(T('تم نسخ رقم الفاتورة','Invoice no copied')) } catch {} }}
              style={{ width: 19, height: 19, padding: 0, borderRadius: 4, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx4)' }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </span>
          {inv.branch?.branch_code && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span title={T('المكتب','Branch')} style={{ color: C.gold, fontWeight: 700, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
                <span>{inv.branch.branch_code}</span>
              </span>
            </>
          )}
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
          <span style={{ color: 'var(--tx4)' }}>{fmtDateTime(inv.created_at, isAr)}</span>
          {overdueCount > 0 && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(229,134,122,.10)', border: '1px solid ' + C.red, color: C.red, fontSize: 10.5, fontWeight: 800, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{overdueCount} {T(overdueCount === 1 ? 'دفعة متأخرة' : 'دفعات متأخرة', overdueCount === 1 ? 'overdue payment' : 'overdue payments')}</span>
              </span>
            </>
          )}
        </div>
      </div>

      <InvoiceDetailLayout inv={inv} data={data} isAr={isAr} T={T} svc={svc} payT={payT} total={total} paid={paid} remaining={remaining} pct={pct} onRecordPayment={onRecordPayment} onRefund={onRefund} onCancelInv={onCancelInv} onPrint={onPrint} />

      {actionModal && <ActionModal type={actionModal} onClose={() => setActionModal(null)} sb={sb} T={T} isAr={isAr} inv={inv} total={total} paid={paid} remaining={remaining} toast={toast} />}
    </div>
  )
}

const fmtAmt = (v) => {
  const s = String(v ?? '')
  if (!s) return ''
  const [intPart, decPart] = s.split('.')
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${withSep}.${decPart}` : withSep
}
const unfmtAmt = (s) => String(s ?? '').replace(/,/g, '').trim()

const PaymentDetailsForm = ({ T, accent, color, remaining }) => {
  const [paidAmount, setPaidAmount] = useState(String(remaining || ''))
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [transferReference, setTransferReference] = useState('')
  const [transferReceipt, setTransferReceipt] = useState(null)
  const [receiptDrag, setReceiptDrag] = useState(false)
  const [bankAccSearch, setBankAccSearch] = useState('')

  const eff = Number(remaining) || 0
  const p = Number(paidAmount) || 0
  const fieldset = { border: '1.5px solid ' + accent, borderRadius: 12, padding: '14px 14px 12px', position: 'relative' }
  const legend = { position: 'absolute', top: -9, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color, fontFamily: F }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* المبلغ المدفوع */}
      <div style={fieldset}>
        <div style={legend}>{T('المبلغ المدفوع', 'Paid Amount')}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            inputMode="decimal"
            value={fmtAmt(paidAmount)}
            onChange={e => {
              const raw = unfmtAmt(e.target.value)
              if (raw === '') { setPaidAmount(''); return }
              if (!/^\d*\.?\d*$/.test(raw)) return
              let n = Number(raw); if (isNaN(n)) return
              if (n < 0) n = 0
              if (n > eff) n = eff
              setPaidAmount(String(n))
            }}
            placeholder="0.00"
            style={{ width: 160, height: 42, padding: '0 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.05)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', color, fontFamily: F, fontSize: 16, fontWeight: 900, textAlign: 'center', direction: 'ltr', outline: 'none', boxSizing: 'border-box' }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.58)', fontFamily: F }}>{T('ريال', 'SAR')}</span>
        </div>
        {p < eff && eff > 0 && (
          <div style={{ position: 'absolute', bottom: -9, left: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 11, fontWeight: 700, color: C.red, fontFamily: F, direction: 'rtl' }}>
            {T('المتبقي','Remaining')} <span style={{ direction: 'ltr', display: 'inline-block' }}>{fmtAmt((eff - p).toFixed(2))}</span> {T('ريال','SAR')}
          </div>
        )}
        {p >= eff && eff > 0 && (
          <div style={{ position: 'absolute', bottom: -9, left: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 11, fontWeight: 700, color: C.ok, fontFamily: F }}>
            ✓ {T('مدفوع بالكامل', 'Paid in full')}
          </div>
        )}
      </div>

      {/* طريقة الدفع */}
      {p > 0 && (
        <div style={{ ...fieldset, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={legend}>{T('طريقة الدفع', 'Payment Method')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { k: 'cash', l: T('نقداً','Cash'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> },
              { k: 'bank', l: T('حوالة بنكية','Bank Transfer'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg> },
            ].map(o => {
              const on = paymentMethod === o.k
              return (
                <div key={o.k} onClick={() => setPaymentMethod(o.k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 9, border: `1.5px solid ${on ? color : 'rgba(255,255,255,.07)'}`, background: on ? color + '14' : 'linear-gradient(180deg,#2C2C2C 0%,#222 100%)', cursor: 'pointer', transition: '.18s', color: on ? color : 'var(--tx3)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: F }}>{o.l}</span>
                  {o.icon}
                </div>
              )
            })}
          </div>
          {paymentMethod === 'bank' && (
            <>
              <div
                style={{ display: 'flex', gap: 10, alignItems: 'stretch', marginTop: 14 }}
                onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setReceiptDrag(true) }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!receiptDrag) setReceiptDrag(true) }}
                onDragLeave={e => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setReceiptDrag(false) }}
                onDrop={e => { e.preventDefault(); e.stopPropagation(); setReceiptDrag(false); const f = e.dataTransfer.files?.[0]; if (f) setTransferReceipt(f) }}
              >
                <input
                  type="text"
                  value={transferReference}
                  onChange={e => setTransferReference(e.target.value)}
                  placeholder={T('الرقم المرجعي للحوالة', 'Transfer reference')}
                  style={{ flex: 1, height: 42, padding: '0 12px', borderRadius: 9, border: `1px solid ${receiptDrag ? color : (transferReference ? color + '40' : 'rgba(255,255,255,.08)')}`, background: receiptDrag ? color + '14' : 'rgba(0,0,0,.2)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', direction: 'ltr', textAlign: 'center', transition: '.2s' }}
                />
                {!transferReceipt ? (
                  <label htmlFor="payModalReceiptInput" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 14px', height: 42, borderRadius: 9, border: `1px dashed ${receiptDrag ? color : color + '4d'}`, background: receiptDrag ? color + '26' : color + '0d', color, cursor: 'pointer', transition: '.2s', fontFamily: F, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', transform: receiptDrag ? 'scale(1.02)' : 'scale(1)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>{receiptDrag ? T('أفلت الملف هنا','Drop file') : T('إيصال','Receipt')}</span>
                    <input id="payModalReceiptInput" type="file" accept="image/*,application/pdf" onChange={e => setTransferReceipt(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  </label>
                ) : (
                  <div title={transferReceipt.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 12px', height: 42, borderRadius: 9, border: '1px solid rgba(46,160,67,.25)', background: 'rgba(46,160,67,.06)', color: '#2ea043', fontFamily: F, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{transferReceipt.name}</span>
                    <button type="button" onClick={() => setTransferReceipt(null)} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
              </div>
              <input
                value={bankAccSearch}
                onChange={e => setBankAccSearch(e.target.value)}
                placeholder={T('ابحث باسم البنك أو الحساب أو IBAN...', 'Search bank/account/IBAN...')}
                style={{ width: '100%', height: 40, padding: '0 14px', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, fontFamily: F, fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
              />
              <div style={{ padding: '14px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.5)', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 9, background: 'rgba(0,0,0,.12)' }}>
                {T('لا توجد نتائج', 'No results')}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const RefundDetailsForm = ({ T, accent, color, paid }) => {
  const [refundAmount, setRefundAmount] = useState(String(paid || ''))
  const [refundMethod, setRefundMethod] = useState('cash')
  const [transferReference, setTransferReference] = useState('')
  const [transferReceipt, setTransferReceipt] = useState(null)
  const [receiptDrag, setReceiptDrag] = useState(false)
  const [bankAccSearch, setBankAccSearch] = useState('')

  const eff = Number(paid) || 0
  const fieldset = { border: '1.5px solid ' + accent, borderRadius: 12, padding: '14px 14px 12px', position: 'relative' }
  const legend = { position: 'absolute', top: -9, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color, fontFamily: F }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* المبلغ المسترجع */}
      <div style={fieldset}>
        <div style={legend}>{T('المبلغ المسترجع','Refund Amount')}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            inputMode="decimal"
            value={fmtAmt(refundAmount)}
            onChange={e => {
              const raw = unfmtAmt(e.target.value)
              if (raw === '') { setRefundAmount(''); return }
              if (!/^\d*\.?\d*$/.test(raw)) return
              let n = Number(raw); if (isNaN(n)) return
              if (n < 0) n = 0
              if (n > eff) n = eff
              setRefundAmount(String(n))
            }}
            placeholder="0.00"
            style={{ width: 160, height: 42, padding: '0 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.05)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', color, fontFamily: F, fontSize: 16, fontWeight: 900, textAlign: 'center', direction: 'ltr', outline: 'none', boxSizing: 'border-box' }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.58)', fontFamily: F }}>{T('ريال','SAR')}</span>
        </div>
      </div>

      {/* طريقة الاسترجاع */}
      <div style={{ ...fieldset, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={legend}>{T('طريقة الاسترجاع','Refund Method')}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { k: 'cash', l: T('نقداً','Cash'),         icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg> },
            { k: 'bank', l: T('حوالة بنكية','Bank Transfer'), icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v3"/><path d="M12 14v3"/><path d="M16 14v3"/></svg> },
          ].map(o => {
            const on = refundMethod === o.k
            return (
              <div key={o.k} onClick={() => setRefundMethod(o.k)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 9, border: `1.5px solid ${on ? color : 'rgba(255,255,255,.07)'}`, background: on ? color + '14' : 'linear-gradient(180deg,#2C2C2C 0%,#222 100%)', cursor: 'pointer', transition: '.18s', color: on ? color : 'var(--tx3)' }}>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: F }}>{o.l}</span>
                {o.icon}
              </div>
            )
          })}
        </div>
        {refundMethod === 'bank' && (
          <>
            <div
              style={{ display: 'flex', gap: 10, alignItems: 'stretch', marginTop: 14 }}
              onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setReceiptDrag(true) }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!receiptDrag) setReceiptDrag(true) }}
              onDragLeave={e => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setReceiptDrag(false) }}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); setReceiptDrag(false); const f = e.dataTransfer.files?.[0]; if (f) setTransferReceipt(f) }}
            >
              <input
                type="text"
                value={transferReference}
                onChange={e => setTransferReference(e.target.value)}
                placeholder={T('الرقم المرجعي للحوالة', 'Transfer reference')}
                style={{ flex: 1, height: 42, padding: '0 12px', borderRadius: 9, border: `1px solid ${receiptDrag ? color : (transferReference ? color + '40' : 'rgba(255,255,255,.08)')}`, background: receiptDrag ? color + '14' : 'rgba(0,0,0,.2)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', direction: 'ltr', textAlign: 'center', transition: '.2s' }}
              />
              {!transferReceipt ? (
                <label htmlFor="refundModalReceiptInput" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '0 14px', height: 42, borderRadius: 9, border: `1px dashed ${receiptDrag ? color : color + '4d'}`, background: receiptDrag ? color + '26' : color + '0d', color, cursor: 'pointer', transition: '.2s', fontFamily: F, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', transform: receiptDrag ? 'scale(1.02)' : 'scale(1)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>{receiptDrag ? T('أفلت الملف هنا','Drop file') : T('إيصال','Receipt')}</span>
                  <input id="refundModalReceiptInput" type="file" accept="image/*,application/pdf" onChange={e => setTransferReceipt(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                </label>
              ) : (
                <div title={transferReceipt.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 12px', height: 42, borderRadius: 9, border: '1px solid rgba(46,160,67,.25)', background: 'rgba(46,160,67,.06)', color: '#2ea043', fontFamily: F, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{transferReceipt.name}</span>
                  <button type="button" onClick={() => setTransferReceipt(null)} style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}
            </div>
            <input
              value={bankAccSearch}
              onChange={e => setBankAccSearch(e.target.value)}
              placeholder={T('ابحث باسم البنك أو الحساب أو IBAN...', 'Search bank/account/IBAN...')}
              style={{ width: '100%', height: 40, padding: '0 14px', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, fontFamily: F, fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
            />
            <div style={{ padding: '14px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.5)', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 9, background: 'rgba(0,0,0,.12)' }}>
              {T('لا توجد نتائج', 'No results')}
            </div>
          </>
        )}
      </div>

    </div>
  )
}

const ModalDropdown = ({ value, onChange, options, placeholder, accent, color, disabled }) => {
  const opts = (options || []).map(o => typeof o === 'string' ? { v: o, l: o } : o)
  const selectedLabel = (opts.find(o => o.v === value) || {}).l || ''
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 380 })
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const toggle = () => {
    if (disabled) return
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const maxH = Math.min(opts.length * 42 + 4, 320)
      setPos({ top: r.bottom + 6, left: r.left, width: r.width, maxH })
    }
    setOpen(o => !o)
  }
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (popRef.current && !popRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        disabled={disabled}
        style={{ width: '100%', height: 42, padding: '0 32px', borderRadius: 10, border: `1px solid ${open ? color + '66' : 'rgba(255,255,255,.08)'}`, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', color: value ? 'var(--tx)' : 'var(--tx5)', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 14, fontWeight: 500, outline: 'none', position: 'relative', boxSizing: 'border-box', opacity: disabled ? .6 : 1, transition: '.2s' }}
      >
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 400 }}>{selectedLabel || placeholder || '...'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: 'var(--modal-input-bg)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, maxHeight: pos.maxH, display: 'flex', flexDirection: 'column', zIndex: 2000, boxShadow: '0 16px 48px rgba(0,0,0,.75)', overflow: 'hidden', direction: 'rtl', fontFamily: F }}>
          <style>{`.am-sel-pop-scroll{scrollbar-width:none;-ms-overflow-style:none}.am-sel-pop-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
          <div className="am-sel-pop-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {opts.length === 0 && <div style={{ padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--tx5)' }}>—</div>}
            {opts.map(o => {
              const isSel = value === o.v
              return (
                <div
                  key={o.v}
                  onClick={() => { onChange(o.v); setOpen(false) }}
                  style={{ padding: '10px 14px', cursor: 'pointer', position: 'relative', borderBottom: '1px solid rgba(255,255,255,.06)', background: isSel ? color + '14' : 'transparent', transition: '.12s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,.035)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 14, fontWeight: isSel ? 600 : 400, color: isSel ? color : 'rgba(255,255,255,.92)', textAlign: 'center', display: 'block' }}>{o.l}</span>
                  {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }}><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const RefundReasonForm = ({ T, sb, isAr, accent, color }) => {
  const [reasonId, setReasonId] = useState('')
  const [notes, setNotes] = useState('')
  const [reasons, setReasons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sb) { setLoading(false); return }
    let alive = true
    ;(async () => {
      const { data } = await sb
        .from('lookup_items')
        .select('id,value_ar,value_en,sort_order,category:lookup_categories!inner(category_key)')
        .eq('category.category_key', 'refund_reason')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (alive) {
        setReasons(data || [])
        setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [sb])

  const fieldset = { border: '1.5px solid ' + accent, borderRadius: 12, padding: '14px 14px 12px', position: 'relative' }
  const legend = { position: 'absolute', top: -9, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color, fontFamily: F }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={fieldset}>
        <div style={legend}>{T('سبب الاسترجاع','Refund Reason')}</div>
        <ModalDropdown
          value={reasonId}
          onChange={setReasonId}
          options={reasons.map(r => ({ v: r.id, l: isAr ? (r.value_ar || r.value_en) : (r.value_en || r.value_ar) }))}
          placeholder={loading ? T('جاري التحميل…','Loading…') : (reasons.length ? T('— اختر السبب —','— Select reason —') : T('لا توجد أسباب مُعرَّفة','No reasons defined'))}
          accent={accent}
          color={color}
          disabled={loading || reasons.length === 0}
        />
      </div>
      <div style={fieldset}>
        <div style={legend}>{T('ملاحظات إضافية','Additional Notes')}</div>
        <textarea
          rows={4}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={T('تفاصيل إضافية (اختياري)…','Additional details (optional)…')}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.05)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'start', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>
    </div>
  )
}

const CancelReasonForm = ({ T, accent, color }) => {
  const [reason, setReason] = useState('')
  const fieldset = { border: '1.5px solid ' + accent, borderRadius: 12, padding: '14px 14px 12px', position: 'relative' }
  const legend = { position: 'absolute', top: -9, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color, fontFamily: F }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12.5, color: '#e5867a', padding: '10px 14px', borderRadius: 10, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.20)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{T('تنبيه: إلغاء الفاتورة سيعيد جميع الأقساط والدفعات إلى حالتها الأصلية ولا يمكن التراجع.', 'Warning: Cancelling will reset all installments and payments. Cannot be undone.')}</span>
      </div>
      <div style={fieldset}>
        <div style={legend}>{T('سبب الإلغاء','Cancellation Reason')}</div>
        <textarea
          rows={4}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={T('اذكر سبب الإلغاء...','Explain why...')}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,.05)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'start', boxSizing: 'border-box', resize: 'vertical' }}
        />
      </div>
    </div>
  )
}

const ActionModal = ({ type, onClose, sb, T, isAr, inv, total, paid, remaining, toast }) => {
  const [step, setStep] = useState(1)
  const isMultiStep = type === 'payment' || type === 'refund' || type === 'cancel'
  const totalSteps = type === 'refund' ? 3 : (isMultiStep ? 2 : 1)
  const meta = {
    payment: {
      title: T('تسجيل دفعة', 'Record Payment'),
      color: C.ok,
      accent: 'rgba(46,204,113,.35)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
      submit: T('حفظ الدفعة', 'Save Payment'),
    },
    refund: {
      title: T('استرجاع دفعة', 'Refund Payment'),
      color: C.blue,
      accent: 'rgba(93,173,226,.35)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7"/></svg>,
      submit: T('تأكيد الاسترجاع', 'Confirm Refund'),
    },
    cancel: {
      title: T('إلغاء الفاتورة', 'Cancel Invoice'),
      color: C.red,
      accent: 'rgba(229,134,122,.35)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>,
      submit: T('تأكيد الإلغاء', 'Confirm Cancel'),
    },
    print: {
      title: T('طباعة الفاتورة', 'Print Invoice'),
      color: C.gold,
      accent: 'rgba(212,160,23,.35)',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
      submit: T('طباعة', 'Print'),
    },
  }[type]

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16, fontFamily: F }
  const box = { background: 'var(--modal-bg)', borderRadius: 16, width: 540, maxWidth: '95vw', height: 525, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }
  const fieldset = { position: 'relative', borderRadius: 12, border: '1.5px solid ' + meta.accent, padding: '20px 22px' }
  const legend = { position: 'absolute', top: -10, [isAr ? 'right' : 'left']: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 13, fontWeight: 600, color: meta.color, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }
  const inp = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'var(--modal-input-bg)', textAlign: 'center', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }
  const lbl = { fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }

  const onSubmit = () => {
    toast?.(T(meta.title + ' — قريباً', meta.title + ' — coming soon'))
    onClose()
  }

  return (
    <div onClick={onClose} style={overlay} dir={isAr ? 'rtl' : 'ltr'}>
      <div onClick={e => e.stopPropagation()} style={box}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ color: meta.color, flexShrink: 0, display: 'inline-flex' }}>{meta.icon}</span>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2 }}>{meta.title}</div>
            </div>
            <button
              onClick={onClose}
              aria-label={T('إغلاق', 'Close')}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.4)'; e.currentTarget.style.color = '#e5867a' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(180deg,#323232 0%,#262626 100%)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'var(--tx3)' }}
              style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          {isMultiStep && (
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {Array.from({ length: totalSteps }, (_, i) => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i < step ? `linear-gradient(90deg, ${meta.color}, ${meta.color}aa)` : 'rgba(255,255,255,0.06)', transition: '.35s' }} />
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0 }}>
          {(!isMultiStep || step === 1) && (
            <div style={fieldset}>
              <div style={legend}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <span>{T('بيانات الفاتورة', 'Invoice Info')}</span>
              </div>
              <div>
                {(() => {
                  const focusOnPaid = type === 'refund' || type === 'cancel'
                  const rows = focusOnPaid
                    ? [
                        { label: T('رقم الفاتورة','Invoice No'), value: '#' + inv.invoice_no, color: C.gold, mono: true },
                        { label: T('الإجمالي','Total'),          value: num(total),            color: 'var(--tx2)' },
                        { label: T('المتبقي','Remaining'),       value: num(remaining),        color: C.gold },
                      ]
                    : [
                        { label: T('رقم الفاتورة','Invoice No'), value: '#' + inv.invoice_no, color: C.gold, mono: true },
                        { label: T('الإجمالي','Total'),          value: num(total),            color: 'var(--tx2)' },
                        { label: T('المدفوع','Paid'),            value: num(paid),             color: C.ok },
                      ]
                  const focus = focusOnPaid
                    ? { label: T('المدفوع','Paid'),       value: num(paid),       color: C.ok }
                    : { label: T('المتبقي','Remaining'),  value: num(remaining),  color: C.gold }
                  return (
                    <>
                      {rows.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(255,255,255,.08)' }}>
                          <span style={{ fontSize: 12, color: 'var(--tx4)' }}>{s.label}</span>
                          <span style={{ fontSize: 13, color: s.color, fontWeight: 700, direction: 'ltr', fontFamily: s.mono ? 'monospace' : 'inherit', fontVariantNumeric: 'tabular-nums' }}>{s.value}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px', marginTop: 8, borderRadius: 10, background: focus.color + '14', border: '1px solid ' + focus.color + '40' }}>
                        <span style={{ fontSize: 14, color: focus.color, fontWeight: 700, letterSpacing: '.3px' }}>{focus.label}</span>
                        <span style={{ fontSize: 22, color: focus.color, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{focus.value}</span>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}

          {type === 'payment' && step === 2 && (
            <PaymentDetailsForm T={T} accent={meta.accent} color={meta.color} remaining={remaining} />
          )}

          {type === 'refund' && step === 2 && (
            <RefundDetailsForm T={T} accent={meta.accent} color={meta.color} paid={paid} />
          )}

          {type === 'refund' && step === 3 && (
            <RefundReasonForm T={T} sb={sb} isAr={isAr} accent={meta.accent} color={meta.color} />
          )}

          {type === 'cancel' && step === 2 && (
            <CancelReasonForm T={T} accent={meta.accent} color={meta.color} />
          )}

          {type === 'print' && (
            <div style={fieldset}>
              <div style={legend}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/></svg><span>{T('خيارات الطباعة', 'Print Options')}</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: T('شعار المؤسسة', 'Company Logo'), defChecked: true },
                  { label: T('بيانات العميل', 'Client Info'), defChecked: true },
                  { label: T('تفاصيل الأقساط والدفعات', 'Installments & Payments'), defChecked: true },
                  { label: T('ختم وتوقيع', 'Stamp & Signature'), defChecked: false },
                ].map((opt, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" defaultChecked={opt.defChecked} style={{ width: 16, height: 16, accentColor: meta.color }} />
                    <span style={{ color: 'var(--tx2)' }}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <style>{`.am-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:var(--am-c);font-family:${F};font-size:15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.am-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:var(--am-c-bg);display:flex;align-items:center;justify-content:center;transition:.2s;color:var(--am-c)}.am-nav-btn:hover:not(:disabled) .nav-ico{background:var(--am-c);color:#000}.am-back-btn{color:var(--tx3)}.am-back-btn .nav-ico{background:rgba(255,255,255,.06);color:var(--tx3)}.am-back-btn:hover:not(:disabled){color:var(--tx)}.am-back-btn:hover:not(:disabled) .nav-ico{background:rgba(255,255,255,.14);color:var(--tx)}.am-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
        <div style={{ padding: '12px 24px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: 12, '--am-c': meta.color, '--am-c-bg': meta.color + '1a' }}>
          <div style={{ justifySelf: 'start' }}>
            {isMultiStep && step > 1 && (
              <button onClick={() => setStep(s => Math.max(1, s - 1))} className="am-nav-btn am-back-btn">
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
                <span>{T('السابق','Previous')}</span>
              </button>
            )}
          </div>
          <div style={{ justifySelf: 'end' }}>
            {isMultiStep && step < totalSteps ? (
              <button onClick={() => setStep(s => Math.min(totalSteps, s + 1))} className="am-nav-btn">
                <span>{T('التالي','Next')}</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
              </button>
            ) : (
              <button onClick={onSubmit} className="am-nav-btn">
                <span>{meta.submit}</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── shared building blocks ─── */
const cardChrome = { background: 'linear-gradient(180deg,#1f1f1f 0%,#181818 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle  = { fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '.2px' }
const cardSub    = { fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }

const ActionToolbar = ({ T, onRecordPayment, onRefund, onCancelInv, onPrint }) => {
  const btn = (color, bgLight, bdLight) => ({
    height: 40, padding: '0 16px', borderRadius: 11, background: bgLight, border: '1px solid ' + bdLight, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 13, fontWeight: 700, transition: '.18s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)'
  })
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <button onClick={onRecordPayment} style={btn(C.ok, 'rgba(46,204,113,.10)', 'rgba(46,204,113,.32)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        <span>{T('تسجيل دفعة','Record Payment')}</span>
      </button>
      <button onClick={onRefund} style={btn(C.blue, 'rgba(93,173,226,.10)', 'rgba(93,173,226,.30)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7"/></svg>
        <span>{T('استرجاع','Refund')}</span>
      </button>
      <button onClick={onCancelInv} style={btn(C.red, 'rgba(229,134,122,.10)', 'rgba(229,134,122,.30)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        <span>{T('إلغاء','Cancel')}</span>
      </button>
      <button onClick={onPrint} style={btn('rgba(255,255,255,.78)', 'rgba(255,255,255,.04)', 'rgba(255,255,255,.10)')}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span>{T('طباعة','Print')}</span>
      </button>
    </div>
  )
}

const ClientRows = ({ inv, T }) => {
  // When client_id is null but the request has a worker (workerIsClient at create time),
  // fall back to the worker as the displayed party.
  const sr = inv.service_request
  const pickWorker = (rel) => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
  const workerFromApp = pickWorker(sr?.transfer_applications)
                     || pickWorker(sr?.ajeer_applications)
                     || pickWorker(sr?.iqama_renewal_applications)
                     || pickWorker(sr?.other_applications)
                     || null
  const c = sr?.client || workerFromApp
  const isWorker = !sr?.client && !!workerFromApp
  const primary = c?.name_ar || c?.name_en
  const secondary = c?.name_ar && c?.name_en ? c.name_en : null
  const idValue = c?.id_number || c?.iqama_number
  return (
    <>
      {primary && (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'flex-start', minHeight: 28, gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, paddingTop: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {T('الاسم','Name')}
            {isWorker && (
              <span title={T('العامل هو العميل','Worker is the client')} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 4, background: 'rgba(212,160,23,.10)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, fontSize: 9, fontWeight: 700 }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                {T('العامل هو العميل','worker = client')}
              </span>
            )}
          </span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{primary}</div>
            {secondary && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, marginTop: 2, direction: 'ltr' }}>{secondary}</div>}
          </div>
        </div>
      )}
      <Row label={isWorker ? T('الإقامة','Iqama') : T('الهوية','ID')} value={idValue} mono />
      <Row label={T('الجوال','Phone')} value={fmtPhone(c?.phone)} mono />
      {inv.agent && <Row label={T('الوسيط','Agent')} value={inv.agent.name_ar || inv.agent.name_en} />}
    </>
  )
}

const TransactionRows = ({ inv, isAr, T, svc, payT, data }) => {
  const code = data?.code || inv.service_type?.code
  const d = data?.det?.[0]
  const lbl = (o) => o ? (isAr ? o.value_ar || o.name_ar : (o.value_en || o.value_ar || o.name_en || o.name_ar)) : null
  const date = (v) => v ? fmtGreg(v, isAr) : null
  const qty = Number(inv.service_request?.quantity || 0)

  return (
    <>
      {/* Header */}
      <Row label={T('نوع الخدمة','Service')} value={isAr ? svc.label_ar : svc.label_en} color={svc.c} />
      {qty > 0 && <Row label={T('الكمية','Quantity')} value={'×' + qty} mono />}

      {/* Service-specific application details */}
      {data?.loading && (
        <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
      )}
      {!data?.loading && d && (
        <>
          {code === 'work_visa' && (<>
            <SectionLabel label={T('المنشأة','Facility')} color={C.blue} />
            <Row label={T('المنشأة المستفيدة','Beneficiary Facility')} value={d.main_facility?.name_ar || d.main_facility?.unified_number} />
            <Row label={T('الرقم الموحد','Unified Number')} value={d.main_facility?.unified_number} mono />
            <Row label={T('رقم التأمينات','GOSI No')} value={d.main_facility?.gosi_number} mono />
            <Row label={T('رقم قوى','Qiwa No')} value={[d.main_facility?.qiwa_prefix, d.main_facility?.qiwa_number].filter(Boolean).join('-') || null} mono />

            <SectionLabel label={T('بيانات التأشيرة','Visa Info')} color={svc.c} />
            <Row label={T('الجنسية','Nationality')} value={isAr ? d.nationality?.name_ar : (d.nationality?.name_en || d.nationality?.name_ar)} />
            <Row label={T('السفارة','Embassy')} value={isAr ? d.embassy?.name_ar : (d.embassy?.name_en || d.embassy?.name_ar)} />
            <Row label={T('المهنة','Occupation')} value={isAr ? d.occupation?.name_ar : (d.occupation?.name_en || d.occupation?.name_ar)} />

            <SectionLabel label={T('بعد إصدار التأشيرة','After Issuance')} color={C.gold} />
            <Row label={T('رقم التأشيرة','Visa No')} value={d.visa_number} mono />
            <BorderRow T={T} borderNo={d.border_number} visaUsed={d.visa_used} />
            {d.visa_cost && <Row label={T('قيمة التأشيرة','Visa Cost')} value={num(d.visa_cost) + ' ' + T('ر.س','SAR')} mono color={C.gold} />}
            {d.wakalah_number && <Row label={T('رقم الوكالة','Wakalah No')} value={d.wakalah_number} mono />}
            {d.wakalah_date && <Row label={T('تاريخ الوكالة','Wakalah Date')} value={date(d.wakalah_date)} mono />}
            {d.wakalah_office && <Row label={T('مكتب الوكالة','Wakalah Office')} value={d.wakalah_office} />}
            {d.wakalah_status && <Row label={T('حالة الوكالة','Wakalah Status')} value={lbl(d.wakalah_status)} />}
          </>)}
          {code === 'transfer' && (<>
            <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
            <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
            <Row label={T('المنشأة المنقول إليها','Target Facility')} value={d.main_facility?.name_ar || d.main_facility?.unified_number} />
            <Row label={T('المهنة الجديدة','New Occupation')} value={isAr ? d.new_occupation?.name_ar : (d.new_occupation?.name_en || d.new_occupation?.name_ar)} />
            <Row label={T('حالة النقل','Status')} value={lbl(d.status)} />
            <Row label={T('حالة العامل','Worker Status')} value={lbl(d.worker_status)} />
            {d.total_price_initial != null && <Row label={T('السعر الابتدائي','Initial Price')} value={num(d.total_price_initial) + ' ' + T('ر.س','SAR')} mono />}
            {d.total_price_final != null && <Row label={T('السعر النهائي','Final Price')} value={num(d.total_price_final) + ' ' + T('ر.س','SAR')} mono color={C.gold} />}
            {d.discount != null && <Row label={T('الخصم','Discount')} value={num(d.discount) + ' ' + T('ر.س','SAR')} mono />}
            {d.office_cost != null && <Row label={T('رسوم المكتب','Office Cost')} value={num(d.office_cost) + ' ' + T('ر.س','SAR')} mono />}
            {d.iqama_expiry_date && <Row label={T('انتهاء الإقامة','Iqama Expiry')} value={date(d.iqama_expiry_date)} mono />}
            {d.reference_number && <Row label={T('رقم المرجع','Ref No')} value={d.reference_number} mono />}
          </>)}
          {code === 'ajeer' && (<>
            <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
            <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
            <Row label={T('منشأة الأجير','Ajeer Facility')} value={d.ajeer_facility?.name_ar || d.ajeer_facility?.unified_number} />
            <Row label={T('المنشأة المستفيدة','Beneficiary Facility')} value={d.main_facility?.name_ar || d.main_facility?.unified_number} />
            <Row label={T('المدينة','City')} value={isAr ? d.ajeer_city?.name_ar : (d.ajeer_city?.name_en || d.ajeer_city?.name_ar)} />
            {d.duration_months && <Row label={T('المدة','Duration')} value={d.duration_months + ' ' + T('شهر','months')} />}
            {d.start_date && <Row label={T('تاريخ البدء','Start Date')} value={date(d.start_date)} mono />}
            {d.end_date && <Row label={T('تاريخ الانتهاء','End Date')} value={date(d.end_date)} mono />}
          </>)}
          {code === 'iqama_renewal' && (<>
            <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
            <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
            <Row label={T('المنشأة','Facility')} value={d.worker_facility?.name_ar || d.worker_facility?.unified_number} />
            {d.duration_months && <Row label={T('مدة التجديد','Renewal Duration')} value={d.duration_months + ' ' + T('شهر','months')} />}
            {d.current_expire_date && <Row label={T('تاريخ الانتهاء الحالي','Current Expiry')} value={date(d.current_expire_date)} mono />}
            {d.new_expire_date && <Row label={T('تاريخ الانتهاء الجديد','New Expiry')} value={date(d.new_expire_date)} mono color={C.ok} />}
          </>)}
          {code === 'other' && (<>
            <Row label={T('العامل','Worker')} value={d.worker?.name_ar || d.worker?.name_en} />
            <Row label={T('رقم الإقامة','Iqama No')} value={d.worker?.iqama_number} mono />
            <Row label={T('المنشأة','Facility')} value={d.worker_facility?.name_ar || d.worker_facility?.unified_number} />
            <Row label={T('الوصف','Description')} value={d.description} />
          </>)}
        </>
      )}

    </>
  )
}

const FinancialKPIs = ({ total, paid, remaining, pct, payT, T }) => (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, padding: 1, background: 'rgba(255,255,255,.04)' }}>
      <AmountBox label={T('الإجمالي','Total')} value={num(total)} color="#fff" />
      <AmountBox label={T('المسدّد','Paid')} value={num(paid)} color={C.ok} />
      <AmountBox label={T('المتبقي','Remaining')} value={num(remaining)} color={remaining > 0 ? C.warn : C.ok} />
    </div>
    <div style={{ padding: '14px 22px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--tx3)' }}>
        <span>{T('نسبة السداد','Paid')}</span>
        <span style={{ color: payT.c, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${payT.c}, ${payT.c}dd)`, transition: 'width .3s' }} />
      </div>
    </div>
  </>
)

const PaymentRow = ({ p, isAr, T, overflow = 0 }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', opacity: p.is_valid ? 1 : 0.5, gap: 10, flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.is_valid ? C.ok : C.red, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(p.amount)}</span>
      {p.payment_method && <span style={{ fontSize: 10, color: 'var(--tx4)' }}>· {isAr ? p.payment_method.value_ar : (p.payment_method.value_en || p.payment_method.value_ar)}</span>}
      {p.bank_reference && <span style={{ fontSize: 10, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace' }}>· {p.bank_reference}</span>}
      {overflow > 0 && (
        <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 999, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <span>+{num(overflow)} {T('للقسط التالي','to next')}</span>
        </span>
      )}
    </div>
    <span style={{ fontSize: 10.5, color: 'var(--tx3)', direction: 'ltr' }}>{fmtGreg(p.payment_date, isAr)}</span>
  </div>
)

/* ═════ Installment timeline — vertical stepper showing each stage ═════ */
const deriveInstMeta = (ins, T, isAr) => {
  const insTotal = Number(ins.total_amount || 0)
  const insPaid = Number(ins.paid_amount || 0)
  const state = insPaid >= insTotal && insTotal > 0 ? 'paid' : (insPaid > 0 ? 'partial' : 'unpaid')
  const stateC = state === 'paid' ? C.ok : (state === 'partial' ? C.gold : 'rgba(255,255,255,.32)')
  const stateBg = state === 'paid' ? 'rgba(46,204,113,.16)' : (state === 'partial' ? 'rgba(212,160,23,.14)' : 'rgba(255,255,255,.05)')
  const stateLabel = state === 'paid' ? T('مسدّد','Paid') : (state === 'partial' ? T('جزئي','Partial') : T('لم يُسدد','Unpaid'))
  const milestone = ins.payment_milestone
    ? (isAr ? ins.payment_milestone.value_ar : (ins.payment_milestone.value_en || ins.payment_milestone.value_ar))
    : (ins.notes || null)
  return { insTotal, insPaid, state, stateC, stateBg, stateLabel, milestone }
}
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>

const InstallmentTimeline = ({ insts, T, isAr }) => (
  <div style={{ position: 'relative', paddingInlineStart: 22 }}>
    <div style={{ position: 'absolute', insetInlineStart: 13, top: 14, bottom: 14, width: 2, background: 'rgba(255,255,255,.06)' }} />
    {insts.map((ins, i) => { const m = deriveInstMeta(ins, T, isAr); return (
      <div key={ins.id} style={{ position: 'relative', paddingBottom: i === insts.length - 1 ? 0 : 18 }}>
        <span style={{ position: 'absolute', insetInlineStart: -22, top: 4, width: 24, height: 24, borderRadius: '50%', background: m.stateBg, border: '2px solid ' + m.stateC, color: m.stateC, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>{m.state === 'paid' ? <CheckIcon/> : ins.installment_order}</span>
        <div style={{ paddingInlineStart: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 700, marginBottom: 4 }}>{m.milestone || `${T('قسط','Installment')} ${ins.installment_order}`}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, color: 'var(--tx1)', fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(m.insTotal)}</span>
            <span style={{ fontSize: 10, color: m.stateC, fontWeight: 700 }}>· {m.stateLabel}</span>
            {m.state === 'partial' && <span style={{ fontSize: 10, color: 'var(--tx4)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>({num(m.insPaid)} / {num(m.insTotal)})</span>}
          </div>
          <div style={{ marginTop: 4, fontSize: 10, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>{T('التاريخ المتوقع','Expected')}:</span>
            <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', color: ins.expected_date ? 'var(--tx3)' : 'var(--tx4)' }}>{ins.expected_date ? fmtGreg(ins.expected_date, isAr) : '—'}</span>
          </div>
        </div>
      </div>
    )})}
  </div>
)

const InstallmentsWithPayments = ({ data, isAr, T }) => {
  if (data.loading) return (
    <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--tx4)', fontSize: 12 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>
      <span>{T('جاري تحميل الأقساط والدفعات…','Loading installments & payments…')}</span>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
  const insts = (data.insts || []).slice().sort((a, b) => (a.installment_order || 0) - (b.installment_order || 0))
  const pays = (data.pays || []).slice().sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))
  if (!insts.length && !pays.length) return <div style={{ padding: 22, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>{T('لا توجد أقساط ولا دفعات','No installments or payments')}</div>

  return (
    <div style={{ padding: '4px 22px 14px' }}>
      {/* Installments — target breakdown */}
      <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px', margin: '6px 0 4px' }}>
        {T('الأقساط','Installments')} ({insts.length})
      </div>
      {insts.length === 0 ? (
        <div style={{ padding: '6px 0 10px', fontSize: 11, color: 'var(--tx4)' }}>{T('لا توجد أقساط — الفاتورة نقدية','No installments — cash invoice')}</div>
      ) : (
        <InstallmentTimeline insts={insts} isAr={isAr} T={T} />
      )}

      {/* Payments — all actual payments */}
      <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px', margin: '16px 0 4px' }}>
        {T('الدفعات','Payments')} ({pays.length})
      </div>
      {pays.length === 0 ? (
        <div style={{ padding: '6px 0', fontSize: 11, color: 'var(--tx4)' }}>{T('لا توجد دفعات','No payments yet')}</div>
      ) : (
        <div>
          {pays.map(p => <PaymentRow key={p.id} p={p} isAr={isAr} T={T} />)}
        </div>
      )}
    </div>
  )
}

const HeaderChips = ({ inv, isAr, T, svc, payT }) => (
  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
    <span style={{ padding: '4px 12px', borderRadius: 8, background: svc.bg, border: '1px solid ' + svc.bd, color: svc.c, fontSize: 12, fontWeight: 700 }}>{isAr ? svc.label_ar : svc.label_en}</span>
    <span style={{ padding: '4px 12px', borderRadius: 999, border: '1.5px solid ' + payT.c, color: payT.c, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{isAr ? payT.stamp_ar : payT.stamp_en}</span>
    <span style={{ fontSize: 12, color: 'var(--tx3)' }}>{fmtGreg(inv.created_at, isAr)}</span>
    {inv.branch?.branch_code && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', direction: 'ltr', fontWeight: 700 }}>{inv.branch.branch_code}</span>}
  </div>
)

const InvoiceDetailLayout = ({ inv, data, isAr, T, svc, payT, total, paid, remaining, pct, onRecordPayment, onRefund, onCancelInv, onPrint }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardChrome}>
        <div style={cardHeader}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
          <span style={cardTitle}>{T('العميل','Client')}</span>
          {(() => {
            const nat = inv.service_request?.client?.nationality
            if (!nat) return null
            const fl = nat.flag_url
            const em = flagEmoji(nat.code)
            return fl
              ? <img src={fl} alt={nat.name_ar || ''} title={nat.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
              : (em ? <span title={nat.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)
          })()}
        </div>
        <div style={{ padding: '14px 22px' }}><ClientRows inv={inv} T={T} /></div>
      </div>
      <div style={cardChrome}>
        <div style={cardHeader}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
          <span style={cardTitle}>{T('الأقساط والدفعات','Installments & Payments')}</span>
        </div>
        <InstallmentsWithPayments data={data} isAr={isAr} T={T} />
      </div>
      <div style={cardChrome}>
        <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.c }} /><span style={cardTitle}>{T('بيانات المعاملة','Transaction Details')}</span></div>
        <div style={{ padding: '14px 22px' }}><TransactionRows inv={inv} isAr={isAr} T={T} svc={svc} payT={payT} data={data} /></div>
      </div>
    </div>
    <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardChrome}>
        <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('الملخص المالي','Financial Summary')}</span></div>
        <FinancialKPIs total={total} paid={paid} remaining={remaining} pct={pct} payT={payT} T={T} />
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--tx4)' }}>{T('عدد الأقساط','Installments')}</span>
            <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{data.insts?.length || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--tx4)' }}>{T('عدد الدفعات','Payments')}</span>
            <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{data.pays?.length || 0}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <ActionGridButton onClick={onRecordPayment} color={C.ok} bg="rgba(46,204,113,.10)" bd="rgba(46,204,113,.32)" label={T('تسجيل دفعة','Record Payment')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        </ActionGridButton>
        <ActionGridButton onClick={onRefund} color={C.blue} bg="rgba(93,173,226,.10)" bd="rgba(93,173,226,.30)" label={T('استرجاع','Refund')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7"/></svg>
        </ActionGridButton>
        <ActionGridButton onClick={onPrint} color="rgba(255,255,255,.78)" bg="rgba(255,255,255,.04)" bd="rgba(255,255,255,.10)" label={T('طباعة','Print')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        </ActionGridButton>
        <ActionGridButton onClick={onCancelInv} color={C.red} bg="rgba(229,134,122,.10)" bd="rgba(229,134,122,.30)" label={T('إلغاء','Cancel')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
        </ActionGridButton>
      </div>
    </div>
  </div>
)

const ActionGridButton = ({ onClick, color, bg, bd, label, children }) => (
  <button
    onClick={onClick}
    style={{ height: 44, padding: '0 12px', borderRadius: 11, background: bg, border: '1px solid ' + bd, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: F, fontSize: 12.5, fontWeight: 700, transition: '.18s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)' }}
  >
    <span>{label}</span>
    {children}
  </button>
)

const AmountBox = ({ label, value, color }) => (
  <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</div>
  </div>
)

const Section = ({ title, children }) => (
  <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
    <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
    {children}
  </div>
)
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

const BorderRow = ({ T, borderNo, visaUsed }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{T('رقم الحدود','Border No')}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        padding: '2px 8px', borderRadius: 999, fontSize: 9.5, fontWeight: 800, letterSpacing: '.4px',
        background: visaUsed ? 'rgba(46,204,113,.12)' : 'rgba(255,255,255,.04)',
        border: '1px solid ' + (visaUsed ? 'rgba(46,204,113,.32)' : 'rgba(255,255,255,.08)'),
        color: visaUsed ? C.ok : 'var(--tx4)',
      }}>{visaUsed ? T('مستخدمة','Used') : T('لم تستخدم','Not Used')}</span>
      <span style={{ fontSize: 13, color: 'var(--tx2)', fontFamily: 'monospace', direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{borderNo || '—'}</span>
    </div>
  </div>
)

const selS = { padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: 'var(--tx1)', fontSize: 13, fontFamily: F, minWidth: 130 }
const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : C.gold, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
