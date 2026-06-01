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
    return `${yyyy}-${mm}-${dd}`
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
    const hh = String(d.getHours()).padStart(2, '0')
    const mn = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} · ${hh}:${mn}`
  } catch { return '—' }
}
const fmtShort = (iso) => {
  if (!iso) return '—'
  try { const d = new Date(iso); const y = d.getFullYear() % 100; return String(d.getDate()).padStart(2,'0') + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(y).padStart(2,'0') } catch { return '—' }
}

// Business "day" boundary = 05:00 AM Riyadh (UTC+3) = 02:00 UTC.
// Times before 05:00 Riyadh count as the previous business day.
const riyadhDayStart = () => {
  const now = new Date()
  const ry = new Date(now.getTime() + 3 * 3600 * 1000)
  const Y = ry.getUTCFullYear(), M = ry.getUTCMonth(), D = ry.getUTCDate(), H = ry.getUTCHours()
  const offset = H < 5 ? -1 : 0
  return new Date(Date.UTC(Y, M, D + offset, 2, 0, 0))
}

const SVC_THEME = {
  work_visa:           { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل',     label_en: 'Work Visa' },
  work_visa_permanent: { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة دائمة',   label_en: 'Permanent Visa', label_ar_full: 'تأشيرة عمل دائمة', label_en_full: 'Permanent Work Visa' },
  work_visa_temporary: { c: '#85c1e9',bg: 'rgba(133,193,233,.12)', bd: 'rgba(133,193,233,.32)', label_ar: 'تأشيرة مؤقتة',   label_en: 'Temporary Visa', label_ar_full: 'تأشيرة عمل مؤقتة', label_en_full: 'Temporary Work Visa' },
  iqama_issuance: { c: '#27ae60',bg: 'rgba(39,174,96,.12)',   bd: 'rgba(39,174,96,.32)',   label_ar: 'إصدار إقامة',    label_en: 'Iqama Issuance' },
  transfer:       { c: C.orange, bg: 'rgba(243,156,18,.12)',  bd: 'rgba(243,156,18,.32)',  label_ar: 'نقل كفالة',      label_en: 'Transfer' },
  iqama_renewal:  { c: C.cyan,   bg: 'rgba(22,160,133,.12)',  bd: 'rgba(22,160,133,.32)',  label_ar: 'تجديد الإقامة',  label_en: 'Iqama Renewal' },
  ajeer:          { c: C.purple, bg: 'rgba(187,143,206,.12)', bd: 'rgba(187,143,206,.32)', label_ar: 'عقد أجير',       label_en: 'Ajeer Contract' },
  other:          { c: C.gold,   bg: 'rgba(212,160,23,.12)',  bd: 'rgba(212,160,23,.32)',  label_ar: 'الغرفة التجارية', label_en: 'Chamber' },
  general:        { c: C.gray,   bg: 'rgba(149,165,166,.12)', bd: 'rgba(149,165,166,.32)', label_ar: 'خدمات أخرى',     label_en: 'Other Services' },
}
// Permanent/temporary work-visa share the same application table, detail fields and icon as the legacy work_visa.
const VISA_SVC_CODES = new Set(['work_visa', 'work_visa_permanent', 'work_visa_temporary'])
const baseSvcCode = (code) => (VISA_SVC_CODES.has(code) ? 'work_visa' : code)

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
    const dayStart = riyadhDayStart()
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000)
    Promise.all([
      sb.from('v_invoice_stats').select('*'),
      sb.from('v_invoice_daily').select('*'),
      sb.from('v_invoice_aging').select('*'),
      sb.from('invoices').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      sb.from('payments').select('amount,payment_method:payment_method_id!inner(code)')
        .eq('payment_method.code', 'cash')
        .eq('is_valid', true)
        .is('deleted_at', null)
        .gte('payment_date', dayStart.toISOString())
        .lt('payment_date', dayEnd.toISOString()),
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
    const todayStart = riyadhDayStart()
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000)
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
    const todayStart = riyadhDayStart()
    const weekStart = new Date(todayStart.getTime() - 6 * 24 * 3600 * 1000)
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
        note_public, note_private,
        creator:created_by(person:person_id(name_ar,name_en)),
        payments(amount,is_valid,deleted_at),
        service_type:service_type_id(code,value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(id,branch_code),
        agent:agent_id(name_ar,name_en,id_number,phone,nationality:nationality_id(code,name_ar,flag_url)),
        service_request:service_request_id(
          id, request_ref_no, request_date, quantity,
          client:client_id(name_ar,name_en,phone,id_number,nationality:nationality_id(code,name_ar,flag_url)),
          visa_applications(visa_type:visa_type_id(code,value_ar,value_en)),
          transfer_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url))),
          ajeer_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url))),
          iqama_renewal_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url))),
          other_applications(worker:worker_id(name_ar,name_en,phone,iqama_number,nationality:nationality_id(code,name_ar,flag_url))),
          service_request_agents(agent:agent_id(name_ar,name_en,id_number,phone,nationality:nationality_id(code,name_ar,flag_url)))
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

  // Day grouping — uses 05:00 AM Riyadh business-day boundary
  const businessDayKey = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    return new Date(d.getTime() - 2 * 3600 * 1000).toISOString().slice(0, 10)
  }
  const grouped = useMemo(() => {
    const days = {}; const order = []
    rows.forEach(r => {
      const k = businessDayKey(r.created_at) || 'بدون'
      if (!days[k]) { days[k] = []; order.push(k) }
      days[k].push(r)
    })
    return { days, order }
  }, [rows])
  const todayStr = riyadhDayStart().toISOString().slice(0, 10)
  const dayNames = [T('الأحد','Sun'), T('الاثنين','Mon'), T('الثلاثاء','Tue'), T('الأربعاء','Wed'), T('الخميس','Thu'), T('الجمعة','Fri'), T('السبت','Sat')]
  const monthNames = [T('يناير','Jan'),T('فبراير','Feb'),T('مارس','Mar'),T('أبريل','Apr'),T('مايو','May'),T('يونيو','Jun'),T('يوليو','Jul'),T('أغسطس','Aug'),T('سبتمبر','Sep'),T('أكتوبر','Oct'),T('نوفمبر','Nov'),T('ديسمبر','Dec')]
  const dayLabel = (k) => k === todayStr ? T('اليوم','Today') : (() => { try { const d = new Date(k + 'T12:00:00'); return dayNames[d.getDay()] } catch { return k } })()
  const dayFull  = (k) => { try { const d = new Date(k + 'T12:00:00'); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } catch { return k } }
  const totalPages = Math.max(1, Math.ceil(total / PAGE))

  if (detail) return <InvoiceDetailPage sb={sb} inv={detail} onBack={() => { setDetail(null); setRefreshTick(t => t + 1) }} isAr={isAr} T={T} toast={toast} user={user} />

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
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('نقدًا','Cash')}</span>
          </div>
          {/* Center — big number with currency */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.ok, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(periodStats.cash.sum)}</span>
          </div>
          {/* Bottom — count badge */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد العمليات','Receipts')}</span>
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
            { label: T('مرتجعة أو ملغاة','Refunded / Cancelled'), val: periodStats.voided.sum + periodStats.cancelled.sum, cnt: periodStats.voided.cnt + periodStats.cancelled.cnt, c: C.red },
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
          const MAIN_SVC = ['work_visa_permanent', 'work_visa_temporary', 'transfer', 'iqama_renewal', 'ajeer', 'other', 'general']
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
                  <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(todayTotal)}</span> {T(todayTotal >= 3 && todayTotal <= 10 ? 'خدمات' : 'خدمة','services')}
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
                const cancelled = r.status?.code === 'cancelled'
                const refundedAmt = (r.payments || []).reduce((s, p) => (p.deleted_at == null && p.is_valid && Number(p.amount) < 0) ? s + Math.abs(Number(p.amount)) : s, 0)
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
                const shortDate = (() => { try { const d = new Date(r.created_at); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } catch { return '' } })()
                const SVC_ICON = {
                  work_visa: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h4"/></svg>,
                  transfer: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>,
                  ajeer: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                  iqama_renewal: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>,
                  other: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>,
                  general: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>,
                }
                const svcCode = r.service_type?.code || 'general'
                const svcIcon = SVC_ICON[baseSvcCode(svcCode)] || SVC_ICON.general
                return (
                  <div key={r.id} onClick={() => setDetail(r)} className="inv-card"
                    style={{
                      position: 'relative', cursor: 'pointer',
                      borderRadius: 14,
                      background: cancelled ? 'radial-gradient(ellipse at top, rgba(232,114,101,.06) 0%, #222 60%)' : 'radial-gradient(ellipse at top, rgba(212,160,23,.06) 0%, #222 60%)',
                      border: '1px solid ' + (cancelled ? 'rgba(232,114,101,.28)' : 'rgba(255,255,255,.05)'),
                      boxShadow: '0 4px 14px rgba(0,0,0,.22)',
                      opacity: cancelled ? 0.72 : 1,
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
                            {overdueDays > 0 && !cancelled && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(232,114,101,.14)', border: '1px solid rgba(232,114,101,.4)', fontSize: 10, fontWeight: 700, color: C.red, flexShrink: 0 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
                                {T(`متأخرة ${overdueDays} يوم`, `${overdueDays}d overdue`)}
                              </span>
                            )}
                            {cancelled && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 5, background: 'rgba(232,114,101,.16)', border: '1px solid ' + C.red, fontSize: 10.5, fontWeight: 800, color: C.red, flexShrink: 0, letterSpacing: '.3px' }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                                {T('ملغاة','Cancelled')}
                              </span>
                            )}
                            {refundedAmt > 0 && (
                              <span title={T('مبلغ مسترجع','Refunded amount')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 5, background: 'rgba(232,114,101,.12)', border: '1px solid rgba(232,114,101,.4)', fontSize: 10.5, fontWeight: 700, color: C.red, flexShrink: 0 }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                                {T('استرجاع','Refund')} <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(refundedAmt)}</span>
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
                              <span title={T('المكتب','Branch')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                                {r.branch.branch_code}
                              </span>
                            )}
                          </div>

                          {/* Service + INV + branch */}
                          {(() => {
                            const isVisa = VISA_SVC_CODES.has(r.service_type?.code)
                            const visaApps = Array.isArray(r.service_request?.visa_applications) ? r.service_request.visa_applications : []
                            const qty = isVisa ? (visaApps.length || Number(r.service_request?.quantity || 0)) : Number(r.service_request?.quantity || 0)
                            const va = visaApps[0] || null
                            const subLabel = va?.visa_type ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
                            const fullLabel = [isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en), subLabel].filter(Boolean).join(' ')
                            const showQty = isVisa && qty > 0
                            return (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 6, background: svc.bg, border: '1px solid ' + svc.bd, color: svc.c, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800, paddingInlineStart: 8, borderInlineStart: '1px solid ' + svc.bd }}>×{qty}</span>}
                              <span>{fullLabel}</span>
                            </span>
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
                            <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('الإجمالي','Total')}</span>
                            <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{shortDate}</span>
                          </div>
                          {/* Big amount */}
                          <div style={{ fontSize: 28, fontWeight: 700, color: C.gold, fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{num(total)}</div>
                          {/* Paid / Remaining structured rows */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                              <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{T('المسدّد','Paid')}</span>
                              <span style={{ color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {num(paid)}</span>
                            </div>
                            {remaining > 0 ? (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{T('المتبقي','Remaining')}</span>
                                <span style={{ color: C.red, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{'− ' + num(remaining)}</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 11, color: C.ok, fontWeight: 700 }}>
                                <span>{T('تم السداد بالكامل','Fully Paid')}</span>
                                <span>✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Progress strip — flush at bottom edge of card (full red bar when cancelled) */}
                    <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
                      <div style={{ height: '100%', width: cancelled ? '100%' : `${pct}%`, background: cancelled ? C.red : payT.c, transition: 'width .3s' }} />
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
function InvoiceDetailPage({ sb, inv: invProp, onBack, isAr, T, toast, user }) {
  // Keep a local copy of the invoice so we can re-fetch its totals after a
  // payment/refund/cancel without leaving the detail page. invProp is the
  // original row from the list; once we re-fetch, `inv` becomes the fresh one.
  const [inv, setInv] = useState(invProp)
  useEffect(() => { setInv(invProp) }, [invProp])
  const [data, setData] = useState({ loading: true })
  const [actionModal, setActionModal] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  // Re-fetch the invoice row's totals/status on open and after each action. We
  // only pull the fields that change (paid/remaining/status) and merge into the
  // existing inv so the heavier joined data (service_request, client, branch…) stays.
  // Refetching on mount guarantees the summary matches the DB even when the list
  // row that opened it was stale (e.g. a refund done in a previous visit).
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const { data: row } = await sb.from('invoices')
        .select('id, total_amount, paid_amount, remaining_amount, status_id, status:status_id(code,value_ar,value_en)')
        .eq('id', invProp.id).maybeSingle()
      if (alive && row) setInv(prev => ({ ...prev, ...row }))
    })()
    return () => { alive = false }
  }, [refreshTick, sb, invProp.id])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const code = inv.service_type?.code
      const srId = inv.service_request?.id

      const SELECTS = {
        work_visa: `id,visa_number,visa_cost,border_number,wakalah_number,wakalah_date,wakalah_office,visa_used,visa_used_date_check,gender,file_number,
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
      const tbl = TABLES[baseSvcCode(code)]
      const sel = SELECTS[baseSvcCode(code)]

      const [insts, pays, det] = await Promise.all([
        sb.from('installments').select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,receipt_no,bank_reference,notes,payment_method:payment_method_id(value_ar,value_en),payment_milestone:payment_milestone_id(value_ar,value_en)').eq('invoice_id', inv.id).is('deleted_at', null).order('installment_order'),
        sb.from('payments').select('id,amount,payment_date,is_valid,receipt_no,bank_reference,payment_method:payment_method_id(value_ar,value_en),installment_id,creator:created_by(person:person_id(name_ar,name_en))').eq('invoice_id', inv.id).is('deleted_at', null).order('payment_date', { ascending: false }),
        (tbl && srId) ? sb.from(tbl).select(sel).eq('service_request_id', srId) : Promise.resolve({ data: [] }),
      ])
      if (alive) setData({ loading: false, insts: insts.data || [], pays: pays.data || [], det: det.data || [], code })
    })()
    return () => { alive = false }
    // refreshTick forces a re-fetch after a payment/refund/cancel so installments+payments stay in sync.
  }, [sb, inv.id, inv.service_type?.code, inv.service_request?.id, refreshTick])

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
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} title={T('رجوع','Back')} style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500, transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = C.gold }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          <span>{T('رجوع','Back')}</span>
        </button>
      </div>

      {/* Header — underlined title + tags */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.2px' }}>{T('تفاصيل الفاتورة','Invoice Details')}</div>
          {inv.status?.code === 'cancelled' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 8, background: 'rgba(232,114,101,.16)', border: '1px solid ' + C.red, color: C.red, fontSize: 13, fontWeight: 800, letterSpacing: '.3px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
              {T('فاتورة ملغاة','Cancelled Invoice')}
            </span>
          )}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', fontSize: 13, color: 'var(--tx3)' }}>
          {(() => {
            const isVisa = VISA_SVC_CODES.has(inv.service_type?.code)
            const visaApps = Array.isArray(inv.service_request?.visa_applications) ? inv.service_request.visa_applications : []
            const va = visaApps[0] || null
            const sub = va?.visa_type ? (isAr ? va.visa_type.value_ar : (va.visa_type.value_en || va.visa_type.value_ar)) : null
            const qty = isVisa ? ((data?.det || []).length || visaApps.length || Number(inv.service_request?.quantity || 0)) : Number(inv.service_request?.quantity || 0)
            const full = [isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en), sub].filter(Boolean).join(' ')
            const showQty = isVisa && qty > 0
            return (
              <span style={{ color: svc.c, fontSize: 14, fontWeight: 800, borderBottom: '2px solid ' + svc.c, paddingBottom: 2, display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                {showQty && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>×{qty}</span>}
                <span>{full}</span>
              </span>
            )
          })()}
          <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
            <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>#{inv.invoice_no}</span>
            <button
              title={T('نسخ رقم الفاتورة','Copy invoice no')}
              onClick={() => { try { navigator.clipboard?.writeText(inv.invoice_no); toast?.(T('تم نسخ رقم الفاتورة','Invoice no copied')) } catch {} }}
              style={{ width: 22, height: 22, padding: 0, borderRadius: 5, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s' }}
              onMouseEnter={e => { e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx4)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </span>
          {inv.branch?.branch_code && (
            <>
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
              <span title={T('المكتب','Branch')} style={{ color: C.gold, fontWeight: 700, fontSize: 13.5, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span>{inv.branch.branch_code}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 9h1M9 13h1M9 17h1M14 9h1M14 13h1M14 17h1"/></svg>
              </span>
            </>
          )}
          <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
          <span style={{ color: 'var(--tx4)', fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
            <span style={{ direction: 'ltr' }}>{(() => {
              const d = inv.created_at ? new Date(inv.created_at) : null
              if (!d || isNaN(d)) return '—'
              const p = n => String(n).padStart(2, '0')
              return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`
            })()}</span>
          </span>
          {overdueCount > 0 && (
            <>
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
              <span style={{ padding: '4px 11px', borderRadius: 999, background: 'rgba(229,134,122,.10)', border: '1px solid ' + C.red, color: C.red, fontSize: 11.5, fontWeight: 800, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{overdueCount} {T(overdueCount === 1 ? 'دفعة متأخرة' : 'دفعات متأخرة', overdueCount === 1 ? 'overdue payment' : 'overdue payments')}</span>
              </span>
            </>
          )}
        </div>
      </div>

      <InvoiceDetailLayout inv={inv} data={data} isAr={isAr} T={T} svc={svc} payT={payT} total={total} paid={paid} remaining={remaining} pct={pct} onRecordPayment={onRecordPayment} onRefund={onRefund} onCancelInv={onCancelInv} onPrint={onPrint} />

      {actionModal && <ActionModal type={actionModal} onClose={() => setActionModal(null)} sb={sb} T={T} isAr={isAr} inv={inv} total={total} paid={paid} remaining={remaining} toast={toast} user={user} onSaved={() => setRefreshTick(t => t + 1)} />}
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

// Controlled form — data state (amount, method, transfer ref, receipt, selected bank
// account) lives in ActionModal so it can be submitted. UI-only state (drag, search)
// stays local.
const PaymentDetailsForm = ({ T, accent, color, remaining,
  paidAmount, setPaidAmount,
  paymentMethod, setPaymentMethod,
  transferReference, setTransferReference,
  transferReceipt, setTransferReceipt,
  selBankAccId, setSelBankAccId,
  bankAccounts,
}) => {
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
              {/* Bank account picker: shows the receiving accounts (account_purpose =
                  "التحويلات الواردة") that ActionModal loaded. Filters by search query;
                  when one is picked we show only that card. */}
              {!selBankAccId && (
                <input
                  value={bankAccSearch}
                  onChange={e => setBankAccSearch(e.target.value)}
                  placeholder={T('ابحث باسم البنك أو الحساب أو IBAN...', 'Search bank/account/IBAN...')}
                  style={{ width: '100%', height: 40, padding: '0 14px', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, fontFamily: F, fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
                />
              )}
              {(() => {
                let filtered
                if (selBankAccId) filtered = (bankAccounts || []).filter(a => a.id === selBankAccId)
                else if (bankAccSearch) {
                  const q = bankAccSearch.toLowerCase()
                  filtered = (bankAccounts || []).filter(a =>
                    (a.bank_name || '').toLowerCase().includes(q) ||
                    (a.account_name || '').toLowerCase().includes(q) ||
                    (a.iban || '').toLowerCase().includes(q) ||
                    (a.account_number || '').includes(bankAccSearch)
                  ).slice(0, 1)
                } else filtered = (bankAccounts || []).slice(0, 1)
                if (filtered.length === 0) return (
                  <div style={{ padding: '14px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.5)', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 9, background: 'rgba(0,0,0,.12)' }}>
                    {T('لا توجد نتائج', 'No results')}
                  </div>
                )
                return filtered.map(a => {
                  const sel = selBankAccId === a.id
                  return (
                    <div key={a.id} onClick={() => setSelBankAccId(sel ? '' : a.id)}
                      style={{ padding: '8px 12px 8px 36px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, position: 'relative',
                        border: sel ? '1px solid rgba(212,160,23,.4)' : '1px solid rgba(255,255,255,.06)',
                        background: sel ? 'rgba(212,160,23,.06)' : 'rgba(255,255,255,.03)' }}>
                      {sel && <div style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: sel ? C.gold : 'rgba(255,255,255,.95)' }}>{a.bank_name}</span>
                          {a.is_primary && <span style={{ fontSize: 9, color: C.gold, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.25)' }}>{T('رئيسي','Primary')}</span>}
                          {a.account_name && <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.58)' }}>· {a.account_name}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'monospace' }}>
                          {a.account_number && <span style={{ direction: 'ltr', padding: '1px 6px', borderRadius: 5, background: 'rgba(255,255,255,.04)' }}>{a.account_number}</span>}
                          {a.iban && <span style={{ direction: 'ltr' }}>{a.iban}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </>
          )}
        </div>
      )}
    </div>
  )
}

const RefundDetailsForm = ({ T, accent, color, paid,
  refundAmount, setRefundAmount,
  refundMethod, setRefundMethod,
  transferReference, setTransferReference,
  transferReceipt, setTransferReceipt,
  selBankAccId, setSelBankAccId,
  bankAccounts,
}) => {
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
            {/* Same receiving-account picker as PaymentDetailsForm — banks designated
                for "التحويلات الواردة" via bank_account_branches. */}
            {!selBankAccId && (
              <input
                value={bankAccSearch}
                onChange={e => setBankAccSearch(e.target.value)}
                placeholder={T('ابحث باسم البنك أو الحساب أو IBAN...', 'Search bank/account/IBAN...')}
                style={{ width: '100%', height: 40, padding: '0 14px', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, fontFamily: F, fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', background: 'var(--modal-input-bg)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', outline: 'none', textAlign: 'right', boxSizing: 'border-box' }}
              />
            )}
            {(() => {
              let filtered
              if (selBankAccId) filtered = (bankAccounts || []).filter(a => a.id === selBankAccId)
              else if (bankAccSearch) {
                const q = bankAccSearch.toLowerCase()
                filtered = (bankAccounts || []).filter(a =>
                  (a.bank_name || '').toLowerCase().includes(q) ||
                  (a.account_name || '').toLowerCase().includes(q) ||
                  (a.iban || '').toLowerCase().includes(q) ||
                  (a.account_number || '').includes(bankAccSearch)
                ).slice(0, 1)
              } else filtered = (bankAccounts || []).slice(0, 1)
              if (filtered.length === 0) return (
                <div style={{ padding: '14px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.5)', border: '1px dashed rgba(255,255,255,.1)', borderRadius: 9, background: 'rgba(0,0,0,.12)' }}>
                  {T('لا توجد نتائج', 'No results')}
                </div>
              )
              return filtered.map(a => {
                const sel = selBankAccId === a.id
                return (
                  <div key={a.id} onClick={() => setSelBankAccId(sel ? '' : a.id)}
                    style={{ padding: '8px 12px 8px 36px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, position: 'relative',
                      border: sel ? '1px solid rgba(212,160,23,.4)' : '1px solid rgba(255,255,255,.06)',
                      background: sel ? 'rgba(212,160,23,.06)' : 'rgba(255,255,255,.03)' }}>
                    {sel && <div style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', width: 20, height: 20, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: sel ? C.gold : 'rgba(255,255,255,.95)' }}>{a.bank_name}</span>
                        {a.is_primary && <span style={{ fontSize: 9, color: C.gold, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.25)' }}>{T('رئيسي','Primary')}</span>}
                        {a.account_name && <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.58)' }}>· {a.account_name}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 10, color: 'rgba(255,255,255,.5)', fontFamily: 'monospace' }}>
                        {a.account_number && <span style={{ direction: 'ltr', padding: '1px 6px', borderRadius: 5, background: 'rgba(255,255,255,.04)' }}>{a.account_number}</span>}
                        {a.iban && <span style={{ direction: 'ltr' }}>{a.iban}</span>}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
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

// Controlled form — reasonId/notes are owned by ActionModal; we still load `reasons` here
// so the dropdown can show them. (No need to lift the list itself.)
const RefundReasonForm = ({ T, sb, isAr, accent, color, reasonId, setReasonId, notes, setNotes }) => {
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

// Controlled form — reason is owned by ActionModal so it can include it in the cancel call.
const CancelReasonForm = ({ T, accent, color, reason, setReason }) => {
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

const ActionModal = ({ type, onClose, sb, T, isAr, inv, total, paid, remaining, toast, user, onSaved }) => {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  // When a write succeeds, the modal transforms into an in-place success screen
  // (mirrors the invoice-issuance success view) instead of toasting + closing.
  const [done, setDone] = useState(null)
  const isMultiStep = type === 'payment' || type === 'refund' || type === 'cancel'
  const totalSteps = type === 'refund' ? 3 : (isMultiStep ? 2 : 1)

  // ─── lifted form state (each operation has its own slice) ─────────────────
  // payment
  const [paidAmount, setPaidAmount] = useState(String(remaining || ''))
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [payTransferRef, setPayTransferRef] = useState('')
  const [payTransferReceipt, setPayTransferReceipt] = useState(null)
  const [paySelBankAccId, setPaySelBankAccId] = useState('')
  // refund
  const [refundAmount, setRefundAmount] = useState(String(paid || ''))
  const [refundMethod, setRefundMethod] = useState('cash')
  const [refundTransferRef, setRefundTransferRef] = useState('')
  const [refundTransferReceipt, setRefundTransferReceipt] = useState(null)
  const [refundSelBankAccId, setRefundSelBankAccId] = useState('')
  const [refundReasonId, setRefundReasonId] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  // cancel
  const [cancelReason, setCancelReason] = useState('')

  // ─── lookups loaded on mount ─────────────────────────────────────────────
  // payment_method (cash/bank → id), invoice_status='cancelled' → id, and the
  // receiving-bank accounts for the invoice's branch (account_purpose = "التحويلات الواردة").
  const [payMethodIds, setPayMethodIds] = useState({ cash: null, bank: null })
  const [cancelledStatusId, setCancelledStatusId] = useState(null)
  const [fullyPaidStatusId, setFullyPaidStatusId] = useState(null)
  const [activeStatusId, setActiveStatusId] = useState(null)
  // Receiving accounts for payments + outgoing accounts for refunds. Each form
  // sees only the slice that matches its semantic direction.
  const [incomingBankAccounts, setIncomingBankAccounts] = useState([])
  const [outgoingBankAccounts, setOutgoingBankAccounts] = useState([])
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const branchId = inv?.branch_id || inv?.branch?.id || null
      const baBase = () => {
        const q = sb.from('bank_account_branches')
          .select('id,branch_id,account_purpose,bank_accounts!inner(id,bank_name,account_name,account_number,iban,is_primary,deleted_at)')
          .is('deleted_at', null).eq('is_active', true)
          .is('bank_accounts.deleted_at', null)
        return branchId ? q.eq('branch_id', branchId) : q
      }
      const [pm, statuses, baIn, baOut] = await Promise.all([
        sb.from('lookup_items').select('id,code,category:lookup_categories!inner(category_key)').eq('category.category_key', 'payment_method'),
        // Pull every invoice_status row in one round-trip — we need cancelled +
        // fully_paid + active for the post-write status flips.
        sb.from('lookup_items').select('id,code,category:lookup_categories!inner(category_key)').eq('category.category_key', 'invoice_status'),
        baBase().eq('account_purpose', 'التحويلات الواردة'),
        baBase().eq('account_purpose', 'التحويلات الصادرة'),
      ])
      if (!alive) return
      const pmMap = {}
      ;(pm.data || []).forEach(r => { pmMap[r.code] = r.id })
      setPayMethodIds({ cash: pmMap.cash || null, bank: pmMap.bank || null })
      const stMap = {}
      ;(statuses.data || []).forEach(r => { stMap[r.code] = r.id })
      setCancelledStatusId(stMap.cancelled || null)
      setFullyPaidStatusId(stMap.fully_paid || null)
      setActiveStatusId(stMap.active || null)
      const reshape = (rows) => (rows || []).map(j => ({ ...(j.bank_accounts || {}), _junction_id: j.id, branch_id: j.branch_id, account_purpose: j.account_purpose }))
      setIncomingBankAccounts(reshape(baIn?.data))
      setOutgoingBankAccounts(reshape(baOut?.data))
    })()
    return () => { alive = false }
  }, [sb, inv?.branch_id, inv?.branch?.id])
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

  // ─── onSubmit: actual DB writes per operation type ────────────────────────
  // payment → insert into `payments` (is_valid=true)
  // refund  → invalidate all valid payments on the invoice + store reason/notes
  // cancel  → flip invoice.status_id to "cancelled" + tag notes with the reason
  // print   → no-op (just close)
  //
  // Each branch updates the parent (onSaved) so totals & lists refresh.
  const onSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    let successInfo = null
    try {
      if (type === 'payment') {
        const amt = Number(paidAmount) || 0
        if (amt <= 0) { toast?.(T('أدخل مبلغًا أكبر من صفر', 'Enter an amount greater than zero'), 'error'); return }
        const pmId = paymentMethod === 'bank' ? payMethodIds.bank : payMethodIds.cash
        if (!pmId) { toast?.(T('تعذر تحديد طريقة الدفع', 'Cannot resolve payment method'), 'error'); return }
        const branchId = inv.branch_id || inv.branch?.id || null

        // ─── 1. Re-fetch fresh totals so the over-payment guard isn't fooled by
        //        a stale `remaining` prop (the bug the user just reported).
        const { data: invFresh, error: e0 } = await sb.from('invoices')
          .select('total_amount, paid_amount').eq('id', inv.id).maybeSingle()
        if (e0) throw e0
        const totalNum = Number(invFresh?.total_amount) || 0
        const currentPaid = Number(invFresh?.paid_amount) || 0
        const freshRemaining = totalNum - currentPaid
        if (amt > freshRemaining + 0.005) {
          toast?.(T('المبلغ أكبر من المتبقي على الفاتورة', 'Amount exceeds invoice remaining'), 'error')
          return
        }

        // ─── 2. Fetch unpaid installments (FIFO) and plan the allocation.
        //        We walk through them in installment_order; each gets as much as
        //        it can absorb until the payment is consumed.
        const { data: insts, error: e1 } = await sb.from('installments')
          .select('id, total_amount, paid_amount, installment_order')
          .eq('invoice_id', inv.id).is('deleted_at', null)
          .order('installment_order')
        if (e1) throw e1
        let left = amt
        const allocations = []
        for (const it of insts || []) {
          if (left <= 0.005) break
          const available = Number(it.total_amount) - Number(it.paid_amount)
          if (available <= 0.005) continue
          const take = Math.min(left, available)
          allocations.push({
            id: it.id,
            newPaid: Number(it.paid_amount) + take,
            becomesFull: take >= available - 0.005,
          })
          left -= take
        }

        // ─── 3. Insert the payment row, linked to the FIRST installment we
        //        touched so the join in the list view still works. If the
        //        payment spans multiple installments we still record it as one
        //        row — that's a simplification matching the current UI.
        const firstInstId = allocations[0]?.id || null
        const { error: e2 } = await sb.from('payments').insert({
          invoice_id: inv.id,
          installment_id: firstInstId,
          service_request_id: inv.service_request?.id || null,
          branch_id: branchId,
          amount: amt,
          payment_method_id: pmId,
          bank_reference: paymentMethod === 'bank' ? (payTransferRef || null) : null,
          bank_account_id: paymentMethod === 'bank' ? (paySelBankAccId || null) : null,
          is_valid: true,
          created_by: user?.id || null,
        })
        if (e2) throw e2

        // ─── 4. Update each touched installment. (remaining_amount is generated.)
        const nowIso = new Date().toISOString()
        for (const a of allocations) {
          const { error: eU } = await sb.from('installments').update({
            paid_amount: a.newPaid,
            ...(a.becomesFull ? { paid_date: nowIso } : {}),
          }).eq('id', a.id)
          if (eU) throw eU
        }

        // ─── 5. Roll up to the invoice. If we just settled the last riyal,
        //        flip status to "fully_paid".
        const newInvPaid = currentPaid + amt
        const invPatch = { paid_amount: newInvPaid }
        if (newInvPaid >= totalNum - 0.005 && fullyPaidStatusId) {
          invPatch.status_id = fullyPaidStatusId
        }
        const { error: e3 } = await sb.from('invoices').update(invPatch).eq('id', inv.id)
        if (e3) throw e3

        successInfo = {
          title: T('تم حفظ الدفعة بنجاح', 'Payment saved'),
          desc: T('تمت إضافة الدفعة إلى الفاتورة بنجاح.', 'The payment was added to the invoice successfully.'),
          rows: [
            { label: T('المبلغ المدفوع', 'Amount Paid'), value: num(amt), color: C.ok },
            { label: T('المتبقي', 'Remaining'), value: num(Math.max(0, totalNum - newInvPaid)), color: C.gold },
          ],
        }
      } else if (type === 'refund') {
        // Partial-refund-capable flow:
        //   • Insert a payment row with NEGATIVE amount representing the refund
        //     (the CHECK constraint was relaxed to amount<>0 in the
        //      payments_allow_negative_for_refunds migration so this is legal).
        //   • Walk installments LIFO (most-recently-paid first) and subtract the
        //     refund amount from each paid_amount until consumed.
        //   • Subtract from invoices.paid_amount and flip status to "active"
        //     (or stay fully_paid if a zero-amount refund slipped through).
        // This preserves the original payment history while letting partial
        // refunds work — the user picks any amount up to currentPaid.
        const rAmt = Number(refundAmount) || 0
        if (rAmt <= 0) { toast?.(T('أدخل مبلغ استرجاع أكبر من صفر', 'Enter a refund amount greater than zero'), 'error'); return }

        const { data: invFreshR, error: er0 } = await sb.from('invoices')
          .select('total_amount, paid_amount').eq('id', inv.id).maybeSingle()
        if (er0) throw er0
        const totalNumR = Number(invFreshR?.total_amount) || 0
        const currentPaidR = Number(invFreshR?.paid_amount) || 0
        if (rAmt > currentPaidR + 0.005) {
          toast?.(T('مبلغ الاسترجاع أكبر من المدفوع على الفاتورة', 'Refund amount exceeds invoice paid'), 'error')
          return
        }

        const branchIdR = inv.branch_id || inv.branch?.id || null
        const rpmId = refundMethod === 'bank' ? payMethodIds.bank : payMethodIds.cash
        if (!rpmId) { toast?.(T('تعذر تحديد طريقة الاسترجاع', 'Cannot resolve refund method'), 'error'); return }

        // LIFO walk over paid installments — refund unwinds the latest payment first.
        const { data: instsR, error: er1 } = await sb.from('installments')
          .select('id, total_amount, paid_amount, installment_order')
          .eq('invoice_id', inv.id).is('deleted_at', null)
          .order('installment_order', { ascending: false })
        if (er1) throw er1
        let leftR = rAmt
        const deAllocs = []
        for (const it of instsR || []) {
          if (leftR <= 0.005) break
          const paidNum = Number(it.paid_amount) || 0
          if (paidNum <= 0.005) continue
          const take = Math.min(leftR, paidNum)
          deAllocs.push({
            id: it.id,
            newPaid: paidNum - take,
            becomesEmpty: take >= paidNum - 0.005,
          })
          leftR -= take
        }

        const refundLine = [refundReasonId ? `refund_reason_id:${refundReasonId}` : null, refundNotes || null].filter(Boolean).join(' — ')
        const firstInstIdR = deAllocs[0]?.id || null
        const { error: er2 } = await sb.from('payments').insert({
          invoice_id: inv.id,
          installment_id: firstInstIdR,
          service_request_id: inv.service_request?.id || null,
          branch_id: branchIdR,
          amount: -rAmt,
          payment_method_id: rpmId,
          bank_reference: refundMethod === 'bank' ? (refundTransferRef || null) : null,
          bank_account_id: refundMethod === 'bank' ? (refundSelBankAccId || null) : null,
          is_valid: true,
          notes: refundLine || (isAr ? 'استرجاع' : 'Refund'),
          created_by: user?.id || null,
        })
        if (er2) throw er2

        for (const a of deAllocs) {
          const { error: erU } = await sb.from('installments').update({
            paid_amount: a.newPaid,
            ...(a.becomesEmpty ? { paid_date: null } : {}),
          }).eq('id', a.id)
          if (erU) throw erU
        }

        const newInvPaidR = currentPaidR - rAmt
        const invPatchR = { paid_amount: newInvPaidR }
        // If the invoice was sitting at fully_paid, drop it back to active. We
        // don't touch the status when newInvPaidR === 0 because the original
        // status (new/active) is unknowable here without an extra fetch — leaving
        // it alone is the conservative choice.
        if (newInvPaidR < totalNumR - 0.005 && activeStatusId) {
          invPatchR.status_id = activeStatusId
        }
        const { error: er3 } = await sb.from('invoices').update(invPatchR).eq('id', inv.id)
        if (er3) throw er3

        successInfo = {
          title: T('تم تنفيذ الاسترجاع بنجاح', 'Refund processed'),
          desc: T('تم استرجاع المبلغ المحدد من الفاتورة بنجاح.', 'The selected amount was refunded from the invoice successfully.'),
          rows: [
            { label: T('مبلغ الاسترجاع', 'Refund Amount'), value: num(rAmt), color: C.blue },
            { label: T('المتبقي مدفوعًا', 'Remaining Paid'), value: num(Math.max(0, newInvPaidR)), color: C.ok },
          ],
        }
      } else if (type === 'cancel') {
        // Resolve the cancelled-status id on demand if the modal's lookup effect
        // hasn't resolved yet — otherwise a quick confirm silently no-ops.
        let cid = cancelledStatusId
        if (!cid) {
          const { data: st } = await sb.from('lookup_items')
            .select('id,category:lookup_categories!inner(category_key)')
            .eq('category.category_key', 'invoice_status').eq('code', 'cancelled').maybeSingle()
          cid = st?.id || null
        }
        if (!cid) { toast?.(T('تعذر تحديد حالة الإلغاء', 'Cannot resolve cancelled status'), 'error'); return }
        // The `invoices` table has no notes/reason column today, so cancelReason
        // is collected for the UX but isn't persisted yet. Add a dedicated
        // cancellation_reason column (or a cancellations table) when needed.
        // .select() lets us confirm a row was actually updated — if zero rows come
        // back (e.g. a permission/RLS no-op) we surface an error instead of a false success.
        const { data: upd, error } = await sb.from('invoices').update({ status_id: cid }).eq('id', inv.id).select('id')
        if (error) throw error
        if (!upd || upd.length === 0) { toast?.(T('تعذّر إلغاء الفاتورة — تحقق من الصلاحيات', 'Could not cancel the invoice — check permissions'), 'error'); return }
        successInfo = {
          title: T('تم إلغاء الفاتورة بنجاح', 'Invoice cancelled'),
          desc: T('تم تغيير حالة الفاتورة إلى ملغاة.', 'The invoice status was changed to cancelled.'),
          rows: [],
        }
      }
      // print: nothing to write — just close. Real printing logic stays out of this
      // commit so we can keep the change focused on the persistence work the user asked for.
      onSaved?.()
      if (successInfo) setDone(successInfo)
      else onClose()
    } catch (e) {
      toast?.((isAr ? 'خطأ: ' : 'Error: ') + (e?.message || (isAr ? 'فشلت العملية' : 'Operation failed')), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div onClick={onClose} style={overlay} dir={isAr ? 'rtl' : 'ltr'}>
      <div onClick={e => e.stopPropagation()} style={box}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: F, direction: isAr ? 'rtl' : 'ltr', alignItems: 'center', justifyContent: 'center', padding: '24px 28px', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 74, height: 74, borderRadius: '50%', background: meta.color + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color, boxShadow: '0 0 0 8px ' + meta.color + '14' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: meta.color }}>{done.title}</div>
            {done.desc && <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 380 }}>{done.desc}</div>}
            <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600, textAlign: 'start' }}>{T('رقم الفاتورة', 'Invoice No')}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.gold, direction: 'ltr', fontFamily: 'monospace' }}>#{inv.invoice_no}</span>
                <CopyBtn text={inv.invoice_no} />
              </div>
              {done.rows.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: r.color + '14', border: '1px solid ' + r.color + '40' }}>
                  <span style={{ flex: 1, fontSize: 13, color: r.color, fontWeight: 600, textAlign: 'start' }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: r.color, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{r.value}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} style={{ marginTop: 8, height: 44, padding: '0 28px', borderRadius: 11, background: meta.color + '1f', border: '1px solid ' + meta.color + '73', color: meta.color, cursor: 'pointer', fontFamily: F, fontSize: 14, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{T('تم', 'Done')}</span>
            </button>
          </div>
        ) : (
        <>
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
            <PaymentDetailsForm
              T={T} accent={meta.accent} color={meta.color} remaining={remaining}
              paidAmount={paidAmount} setPaidAmount={setPaidAmount}
              paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
              transferReference={payTransferRef} setTransferReference={setPayTransferRef}
              transferReceipt={payTransferReceipt} setTransferReceipt={setPayTransferReceipt}
              selBankAccId={paySelBankAccId} setSelBankAccId={setPaySelBankAccId}
              bankAccounts={incomingBankAccounts}
            />
          )}

          {type === 'refund' && step === 2 && (
            <RefundDetailsForm
              T={T} accent={meta.accent} color={meta.color} paid={paid}
              refundAmount={refundAmount} setRefundAmount={setRefundAmount}
              refundMethod={refundMethod} setRefundMethod={setRefundMethod}
              transferReference={refundTransferRef} setTransferReference={setRefundTransferRef}
              transferReceipt={refundTransferReceipt} setTransferReceipt={setRefundTransferReceipt}
              selBankAccId={refundSelBankAccId} setSelBankAccId={setRefundSelBankAccId}
              bankAccounts={outgoingBankAccounts}
            />
          )}

          {type === 'refund' && step === 3 && (
            <RefundReasonForm
              T={T} sb={sb} isAr={isAr} accent={meta.accent} color={meta.color}
              reasonId={refundReasonId} setReasonId={setRefundReasonId}
              notes={refundNotes} setNotes={setRefundNotes}
            />
          )}

          {type === 'cancel' && step === 2 && (
            <CancelReasonForm
              T={T} accent={meta.accent} color={meta.color}
              reason={cancelReason} setReason={setCancelReason}
            />
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
              <button onClick={onSubmit} disabled={submitting} className="am-nav-btn">
                <span>{submitting ? T('جارٍ الحفظ…', 'Saving…') : meta.submit}</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
              </button>
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  )
}

/* ─── shared building blocks ─── */
const cardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle  = { fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '.2px' }
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
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
              <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{primary}</span>
              <CopyBtn text={primary} />
            </span>
            {secondary && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, marginTop: 2, direction: 'ltr' }}>{secondary}</div>}
          </div>
        </div>
      )}
      <Row label={isWorker ? T('الإقامة','Iqama') : T('الهوية','ID')} value={idValue} mono copy />
      <Row label={T('الجوال','Phone')} value={fmtPhone(c?.phone)} mono copy />
    </>
  )
}

// Broker/agent rows — mirrors ClientRows so the agent renders in its own card identical to the client card.
const BrokerRows = ({ agent, T }) => {
  const a = agent
  if (!a) return null
  const primary = a.name_ar || a.name_en
  const secondary = a.name_ar && a.name_en ? a.name_en : null
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
      <Row label={T('الهوية','ID')} value={a.id_number} mono copy />
      <Row label={T('الجوال','Phone')} value={fmtPhone(a.phone)} mono copy />
    </>
  )
}

// Work-visa "بيانات المعاملة" card: service header, then every visa listed in full,
// grouped by file. The quantity reflects the real number of visa rows (not the stored
// service_request.quantity, which can be 1 even when the request bundles many visas).
const VisaInfoRows = ({ inv, isAr, T, svc, data }) => {
  const det = data?.det || []
  const qty = det.length || Number(inv.service_request?.quantity || 0)
  const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || '—'
  const occOf = r => (isAr ? r.occupation?.name_ar : (r.occupation?.name_en || r.occupation?.name_ar)) || ''
  const embOf = r => (isAr ? r.embassy?.name_ar : (r.embassy?.name_en || r.embassy?.name_ar)) || ''
  const genOf = r => r.gender === 'female' ? T('أنثى', 'Female') : r.gender === 'male' ? T('ذكر', 'Male') : ''
  const single = det.length === 1 ? det[0] : null
  return (
    <>
      <Row label={T('نوع الخدمة','Service')} value={isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)} color={svc.c} />
      {qty > 0 && <Row label={T('الكمية','Quantity')} value={'×' + qty} mono />}
      {data?.loading && (
        <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
      )}
      {!data?.loading && det.length > 0 && (
        <>
          <SectionLabel label={single ? (single.file_number != null ? T('بيانات التأشيرات وتوزيع الملفات','Visa Details & File Distribution') : T('بيانات التأشيرة','Visa Info')) : T('بيانات التأشيرات','Visa Details')} color={single?.file_number != null ? C.cyan : svc.c} />
          {single ? (
            single.file_number != null ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px' }}>
                  <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{T('ملف واحد','One File')}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr' }}>1 {T('تأشيرة','visa')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: svc.c + '1a', border: '1px solid ' + svc.c + '40', color: svc.c, fontSize: 10.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>1</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 700 }}>{natOf(single)}</div>
                    {(() => { const sub = [embOf(single), occOf(single), genOf(single)].filter(Boolean).join(' · '); return sub ? <div style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2 }}>{sub}</div> : null })()}
                  </div>
                </div>
              </>
            ) : (
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
            const fileLabel = idx => fileNos.length === 1
              ? T('ملف واحد', 'One File')
              : T(`الملف ${arOrd[idx] || idx + 1}`, `${enOrd[idx] || 'File ' + (idx + 1)} File`)
            let n = 0
            return fileNos.map((fn, idx) => {
              const items = byFile[fn]
              return (
                <div key={fn} style={{ marginTop: idx === 0 ? 0 : 6 }}>
                  {showFiles && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px' }}>
                      <span style={{ fontSize: 11.5, color: C.cyan, fontWeight: 700 }}>{fileLabel(idx)}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr' }}>{items.length} {T('تأشيرة', 'visas')}</span>
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
        </>
      )}
    </>
  )
}

// Derives which milestones of a work-visa transaction have been reached.
const deriveVisaMeta = (data) => {
  const d = data?.det?.[0]
  const f = d?.main_facility
  const w = d?.worker
  const hasFacility = !!(f && (f.name_ar || f.unified_number || f.gosi_number || f.qiwa_prefix || f.qiwa_number))
  const hasVisa = !!(d && (d.visa_number || d.border_number || d.visa_cost))
  const hasWakalah = !!(d && (d.wakalah_number || d.wakalah_date || d.wakalah_office || d.wakalah_status))
  const hasIqama = !!(w && (w.name_ar || w.name_en || w.iqama_number || w.iqama_expiry_date))
  return { d, f, w, hasFacility, hasVisa, hasWakalah, hasIqama }
}

// Furthest milestone reached → the status shown on the "بيانات المعاملة" header.
const visaStatusBadge = (data, T) => {
  const { hasFacility, hasVisa, hasWakalah, hasIqama } = deriveVisaMeta(data)
  if (hasIqama) return { label: T('تم إصدار الإقامة','Iqama issued'), color: C.ok }
  if (hasWakalah) return { label: T('تم إصدار الوكالة','PoA issued'), color: C.purple }
  if (hasVisa) return { label: T('تم إصدار التأشيرة','Visa issued'), color: C.gold }
  if (hasFacility) return { label: T('تم تعيين المنشأة','Facility assigned'), color: C.blue }
  return { label: T('جديد','New'), color: C.gray }
}

// Work-visa "بيانات المعاملة" card: facility, visa issuance, authorization, and iqama issuance info.
const VisaExecutionRows = ({ inv, isAr, T, data }) => {
  const date = (v) => v ? fmtGreg(v, isAr) : null
  const lbl = (o) => o ? (isAr ? o.value_ar || o.name_ar : (o.value_en || o.value_ar || o.name_en || o.name_ar)) : null
  if (data?.loading) return <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
  const { d, f, w, hasFacility, hasVisa, hasWakalah, hasIqama } = deriveVisaMeta(data)
  if (!d) return null
  const emptyNote = (ar, en) => <div style={{ fontSize: 11.5, color: 'var(--tx4)', textAlign: 'center', padding: '12px 0', fontWeight: 600 }}>{T(ar, en)}</div>
  return (
    <>
      <SectionLabel label={T('المنشأة','Facility')} color={C.blue} />
      {hasFacility ? (
        <>
          <Row label={T('المنشأة','Facility')} value={f?.name_ar || f?.unified_number} />
          <Row label={T('الرقم الموحد','Unified Number')} value={f?.unified_number} mono />
          <Row label={T('رقم التأمينات','GOSI No')} value={f?.gosi_number} mono />
          <Row label={T('رقم قوى','Qiwa No')} value={[f?.qiwa_prefix, f?.qiwa_number].filter(Boolean).join('-') || null} mono />
        </>
      ) : emptyNote('لم يتم تحديد المنشأة بعد','No facility assigned yet')}

      <SectionLabel label={T('إصدار التأشيرة','Visa Issuance')} color={C.gold} />
      {hasVisa ? (
        <>
          <Row label={T('رقم التأشيرة','Visa No')} value={d.visa_number} mono />
          <BorderRow T={T} borderNo={d.border_number} visaUsed={d.visa_used} visaNo={d.visa_number} />
          {d.visa_cost && <Row label={T('قيمة التأشيرة','Visa Cost')} value={num(d.visa_cost) + ' ' + T('ر.س','SAR')} mono color={C.gold} />}
        </>
      ) : emptyNote('لم يتم إصدار التأشيرة بعد','Visa not issued yet')}

      <SectionLabel label={T('توكيل التأشيرة','Visa Authorization')} color={C.purple} />
      {hasWakalah ? (
        <>
          {d.wakalah_date && <Row label={T('تاريخ الوكالة','Wakalah Date')} value={date(d.wakalah_date)} mono />}
          {d.wakalah_number && <Row label={T('رقم الوكالة','Wakalah No')} value={d.wakalah_number} mono />}
          {d.wakalah_office && <Row label={T('مكتب الوكالة','Wakalah Office')} value={d.wakalah_office} />}
          {d.wakalah_status && <Row label={T('حالة الوكالة','Wakalah Status')} value={lbl(d.wakalah_status)} />}
        </>
      ) : emptyNote('لم يتم توكيل التأشيرة بعد','Visa not authorized yet')}

      <SectionLabel label={T('إصدار الإقامة','Iqama Issuance')} color={C.ok} />
      {hasIqama ? (
        <>
          <Row label={T('اسم العامل','Worker Name')} value={w?.name_ar || w?.name_en} />
          <Row label={T('رقم الإقامة','Iqama No')} value={w?.iqama_number} mono copy />
          <Row label={T('تاريخ انتهاء الإقامة','Iqama Expiry')} value={date(w?.iqama_expiry_date)} mono />
        </>
      ) : emptyNote('لم يتم إصدار الإقامة بعد','Iqama not issued yet')}
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
      <Row label={T('نوع الخدمة','Service')} value={isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)} color={svc.c} />
      {qty > 0 && <Row label={T('الكمية','Quantity')} value={'×' + qty} mono />}

      {/* Service-specific application details */}
      {data?.loading && (
        <div style={{ fontSize: 11, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جاري تحميل التفاصيل…','Loading details…')}</div>
      )}
      {!data?.loading && d && (
        <>
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
            <Row label={T('المنشأة','Facility')} value={d.main_facility?.name_ar || d.main_facility?.unified_number} />
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
      <AmountBox label={T('الإجمالي','Total')} value={num(total)} color={C.gold} />
      <AmountBox label={T('المسدّد','Paid')} value={num(paid)} color={C.ok} />
      <AmountBox label={T('المتبقي','Remaining')} value={num(remaining)} color={remaining > 0 ? C.red : C.ok} />
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

const PaymentRow = ({ p, isAr, T, overflow = 0 }) => {
  const valid = p.is_valid
  const isRefund = Number(p.amount) < 0
  const negative = isRefund || !valid
  const accent = negative ? C.red : C.ok
  const tint = negative ? 'rgba(232,114,101,' : 'rgba(46,204,113,'
  const method = p.payment_method ? (isAr ? p.payment_method.value_ar : (p.payment_method.value_en || p.payment_method.value_ar)) : ''
  const person = p.creator?.person
  const full = (isAr ? (person?.name_ar || person?.name_en) : (person?.name_en || person?.name_ar)) || ''
  const twoNames = full.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
  const [datePart, timePart] = fmtDateTime(p.payment_date, isAr).split(' · ')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', marginBottom: 6, borderRadius: 12, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', opacity: valid ? 1 : 0.6 }}>
      <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tint + '.12)', color: accent, border: '1px solid ' + tint + '.28)' }}>
        {isRefund
          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>}
      </span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, color: isRefund ? C.red : 'var(--tx1)', fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(p.amount)}</span>
          {isRefund && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.red, background: 'rgba(232,114,101,.1)', padding: '2px 8px', borderRadius: 999 }}>{T('استرجاع','Refund')}</span>}
          {method && <span style={{ fontSize: 9.5, fontWeight: 700, color: accent, background: tint + '.1)', padding: '2px 8px', borderRadius: 999 }}>{method}</span>}
          {!valid && <span style={{ fontSize: 9.5, fontWeight: 700, color: C.red, background: 'rgba(232,114,101,.1)', padding: '2px 8px', borderRadius: 999 }}>{T('ملغاة','Voided')}</span>}
          {overflow > 0 && (
            <span style={{ fontSize: 9.5, padding: '2px 8px', borderRadius: 999, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              <span>+{num(overflow)} {T('للقسط التالي','to next')}</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 10, color: 'var(--tx4)' }}>
          {twoNames && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>{twoNames}</span>
            </span>
          )}
          {p.bank_reference && <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{p.bank_reference}</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontSize: 10.5, color: 'var(--tx3)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{datePart}</span>
        {timePart && <span style={{ fontSize: 9.5, color: 'var(--tx4)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{timePart}</span>}
      </div>
    </div>
  )
}

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
            <span style={{ fontSize: 16, color: m.state === 'paid' ? C.ok : (m.state === 'partial' ? C.gold : 'var(--tx1)'), fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(m.insTotal)}</span>
            <span style={{ fontSize: 10, color: m.stateC, fontWeight: 700 }}>· {m.stateLabel}</span>
          </div>
          {m.state === 'partial' && (() => {
            const insRemaining = Math.max(0, m.insTotal - m.insPaid)
            const insPct = m.insTotal ? Math.min(100, Math.round((m.insPaid / m.insTotal) * 100)) : 0
            return (
              <div style={{ marginTop: 6, maxWidth: 250 }}>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                  <div style={{ width: insPct + '%', height: '100%', background: C.ok, borderRadius: 999, transition: 'width .3s' }} />
                </div>
                <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, fontWeight: 700 }}>
                  <span style={{ color: C.ok }}>{T('مدفوع','Paid')} <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(m.insPaid)}</span></span>
                  <span style={{ color: C.gold }}>{T('متبقٍ','Remaining')} <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(insRemaining)}</span></span>
                </div>
              </div>
            )
          })()}
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

// Single-page A4 invoice print, mirroring the transfer-quote print (4 languages,
// gold/cream theme, hidden-iframe printing). Includes every section EXCEPT the
// "بيانات المعاملة" execution card (facility/visa/wakalah/iqama).
const printInvoice = (inv, data, printLang = 'ar') => {
  const rtl = printLang === 'ar' || printLang === 'ur'
  const DICT = {
    'فاتورة': { en: 'Invoice', bn: 'চালান', ur: 'رسید' },
    'رقم الفاتورة': { en: 'Invoice No.', bn: 'চালান নম্বর', ur: 'رسید نمبر' },
    'التاريخ': { en: 'Date', bn: 'তারিখ', ur: 'تاریخ' },
    'المكتب: ': { en: 'Office: ', bn: 'অফিস: ', ur: 'دفتر: ' },
    'العميل': { en: 'Client', bn: 'ক্লায়েন্ট', ur: 'کلائنٹ' },
    'الوسيط': { en: 'Agent', bn: 'এজেন্ট', ur: 'ایجنٹ' },
    'الاسم': { en: 'Name', bn: 'নাম', ur: 'نام' },
    'الهوية': { en: 'ID', bn: 'পরিচয়পত্র', ur: 'شناختی نمبر' },
    'الإقامة': { en: 'Iqama', bn: 'ইকামা', ur: 'اقامہ' },
    'الجوال': { en: 'Phone', bn: 'মোবাইল', ur: 'موبائل' },
    'الجنسية': { en: 'Nationality', bn: 'জাতীয়তা', ur: 'قومیت' },
    'نوع الخدمة': { en: 'Service', bn: 'সেবার ধরন', ur: 'خدمت کی قسم' },
    'الكمية': { en: 'Quantity', bn: 'পরিমাণ', ur: 'تعداد' },
    'السفارة': { en: 'Embassy', bn: 'দূতাবাস', ur: 'سفارت خانہ' },
    'المهنة': { en: 'Occupation', bn: 'পেশা', ur: 'پیشہ' },
    'الأقساط': { en: 'Installments', bn: 'কিস্তি', ur: 'اقساط' },
    'الدفعات': { en: 'Payments', bn: 'পেমেন্ট', ur: 'ادائیگیاں' },
    'البند': { en: 'Item', bn: 'আইটেম', ur: 'آئٹم' },
    'المبلغ': { en: 'Amount', bn: 'পরিমাণ', ur: 'رقم' },
    'المدفوع': { en: 'Paid', bn: 'পরিশোধিত', ur: 'ادا شدہ' },
    'المتبقي': { en: 'Remaining', bn: 'বাকি', ur: 'باقی' },
    'الإجمالي': { en: 'Total', bn: 'মোট', ur: 'کل' },
    'الطريقة': { en: 'Method', bn: 'পদ্ধতি', ur: 'طریقہ' },
    'التاريخ المتوقع': { en: 'Expected Date', bn: 'প্রত্যাশিত তারিখ', ur: 'متوقع تاریخ' },
    'استرجاع': { en: 'Refund', bn: 'ফেরত', ur: 'واپسی' },
    'الجنس': { en: 'Gender', bn: 'লিঙ্গ', ur: 'جنس' },
    'ذكر': { en: 'Male', bn: 'পুরুষ', ur: 'مرد' },
    'أنثى': { en: 'Female', bn: 'মহিলা', ur: 'عورت' },
    'توزيع الملفات': { en: 'File Distribution', bn: 'ফাইল বণ্টন', ur: 'فائل تقسیم' },
    'تأشيرة': { en: 'visas', bn: 'ভিসা', ur: 'ویزے' },
    'ملف واحد': { en: 'One File', bn: 'একটি ফাইল', ur: 'ایک فائل' },
    'ر.س': { en: 'SAR', bn: 'রিয়াল', ur: 'ریال' },
  }
  const T2 = (a, e) => printLang === 'ar' ? a : printLang === 'en' ? (e || a) : (DICT[a]?.[printLang] || e || a)
  const nm = v => Number(v || 0).toLocaleString('en-US')
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const fmtD = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }
  const localize = o => o ? (printLang === 'en' ? (o.value_en || o.value_ar || o.name_en || o.name_ar) : (o.value_ar || o.name_ar || o.value_en || o.name_en)) : ''
  const arOrd = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر']
  const enOrd = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth']
  // "القسط الأول" / "First Installment" (ordinal naming, not a bare number).
  const instOrdLabel = n => printLang === 'ar' ? ('القسط ' + (arOrd[n - 1] || n)) : ((enOrd[n - 1] || ('#' + n)) + ' Installment')

  const sr = inv.service_request || {}
  const code = data?.code || inv.service_type?.code
  const isVisa = baseSvcCode(code) === 'work_visa'
  const pickWorker = rel => Array.isArray(rel) ? rel[0]?.worker : rel?.worker
  const workerFromApp = pickWorker(sr.transfer_applications) || pickWorker(sr.ajeer_applications) || pickWorker(sr.iqama_renewal_applications) || pickWorker(sr.other_applications) || null
  const client = sr.client || workerFromApp
  const isWorker = !sr.client && !!workerFromApp
  const det = data?.det?.[0] || {}
  const agent = inv.agent || sr.service_request_agents?.[0]?.agent || null
  // For work visas the real count is the number of visa rows (the stored quantity can be 1
  // even when the request bundles several visas); other services keep the stored quantity.
  const qty = isVisa ? ((data?.det || []).length || Number(sr.quantity || 0)) : Number(sr.quantity || 0)

  const svcName = printLang === 'en' ? (inv.service_type?.value_en || inv.service_type?.value_ar) : (inv.service_type?.value_ar || inv.service_type?.value_en)
  const officeCode = inv.branch?.branch_code || ''
  const cancelled = inv.status?.code === 'cancelled'
  const clientName = client ? (client.name_ar || client.name_en) : '—'
  const clientId = client?.id_number || client?.iqama_number

  const genLabel = g => g === 'female' ? T2('أنثى', 'Female') : g === 'male' ? T2('ذكر', 'Male') : ''

  // File distribution (no heading) — grouped by file_number, aggregated by nationality·embassy·occupation·gender.
  let fileDistHtml = ''
  if (isVisa) {
    const visaRows = (data?.det || []).filter(r => r && r.file_number != null)
    if (visaRows.length) {
      const byFile = {}
      visaRows.forEach(r => { (byFile[r.file_number] = byFile[r.file_number] || []).push(r) })
      const fileNos = Object.keys(byFile).map(Number).sort((a, b) => a - b)
      const fileLabel = idx => fileNos.length === 1 ? T2('ملف واحد', 'One File') : (printLang === 'ar' ? ('الملف ' + (arOrd[idx] || idx + 1)) : ((enOrd[idx] || ('#' + (idx + 1))) + ' File'))
      const filesHtml = fileNos.map((fn, idx) => {
        const items = byFile[fn]
        const agg = {}
        items.forEach(r => { const k = [localize(r.nationality) || '—', localize(r.embassy) || '', localize(r.occupation) || '', genLabel(r.gender)].join('|'); agg[k] = (agg[k] || 0) + 1 })
        const itemsHtml = Object.entries(agg).map(([k, cnt]) => {
          const label = k.split('|').filter(Boolean).join(' · ')
          return `<div class="fd-item"><span>${esc(label)}</span><span class="fd-x">×${cnt}</span></div>`
        }).join('')
        return `<div class="fd-file"><div class="fd-flabel">${esc(fileLabel(idx))}<span class="fd-count">${items.length} ${T2('تأشيرة', 'visas')}</span></div>${itemsHtml}</div>`
      }).join('')
      fileDistHtml = `<div class="fd">${filesHtml}</div>`
    }
  }

  const insts = (data?.insts || []).slice().sort((a, b) => (a.installment_order || 0) - (b.installment_order || 0))
  const pays = (data?.pays || []).slice().sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''))

  // Party (client/agent) shown as: name, then ID and phone stacked under it (right-aligned in RTL)
  // with a small icon for each — no field labels.
  const idIconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h3M15 12h3M7 16h10"/></svg>`
  const phoneIconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`
  const partyMeta = (id, phone) => {
    const lines = []
    if (id) lines.push(`<div class="meta-line"><span class="meta-icon">${idIconHtml}</span><span class="meta-val">${esc(id)}</span></div>`)
    if (phone) lines.push(`<div class="meta-line"><span class="meta-icon">${phoneIconHtml}</span><span class="meta-val">${esc(fmtPhone(phone))}</span></div>`)
    return lines.length ? `<div class="party-meta">${lines.join('')}</div>` : ''
  }
  // Nationality shown as a flag (image, with emoji fallback) next to the name — replaces the text label.
  const flagHtml = nat => nat?.flag_url ? `<img class="flag" src="${esc(nat.flag_url)}" alt="${esc(nat.name_ar || '')}"/>` : (flagEmoji(nat?.code) ? `<span class="flag-emoji">${flagEmoji(nat.code)}</span>` : '')
  const partyName = (name, nat) => `<div class="party-name"><span>${esc(name)}</span>${flagHtml(nat)}</div>`
  const clientHtml = `${partyName(clientName, client?.nationality)}${partyMeta(clientId, client?.phone)}`
  const svcHtml = `<div class="svc-title"><span class="st">${esc(svcName || '')}</span>${qty > 0 ? `<span class="qty">×${qty}</span>` : ''}</div>`

  // Permanent work visa has a fixed 3-installment milestone sequence used across all such invoices.
  const isPermVisa = code === 'work_visa_permanent'
  const permVisaMilestonesAr = ['إصدار التأشيرة', 'الوكالة', 'إصدار الإقامة']
  const permVisaMilestonesEn = ['Visa Issuance', 'Wakalah', 'Iqama Issuance']
  const instHtml = insts.map((it, i) => {
    const ord = it.installment_order || (i + 1)
    const permLabel = isPermVisa ? (printLang === 'ar' ? permVisaMilestonesAr[ord - 1] : permVisaMilestonesEn[ord - 1]) : null
    const milestone = permLabel || localize(it.payment_milestone) || instOrdLabel(ord)
    const rem = Math.max(0, Number(it.total_amount || 0) - Number(it.paid_amount || 0))
    return `<tr>
      <td class="name">${esc(milestone)}</td>
      <td class="date">${it.expected_date ? fmtD(it.expected_date) : '—'}</td>
      <td class="num">${nm(it.total_amount)}</td>
      <td class="num paid">${nm(it.paid_amount)}</td>
      <td class="num rem">${nm(rem)}</td>
    </tr>`
  }).join('')

  const payHtml = pays.map(p => {
    const refund = Number(p.amount) < 0
    const method = localize(p.payment_method)
    return `<tr>
      <td class="name">${esc(method)}</td>
      <td class="date">${fmtD(p.payment_date)}</td>
      <td class="num ${refund ? 'disc' : ''}">${refund ? `<span class="tag">${T2('استرجاع', 'Refund')}</span> ` : ''}${nm(p.amount)}</td>
    </tr>`
  }).join('')

  const agentHtml = agent ? `<div class="card"><div class="card-h">${T2('الوسيط', 'Agent')}</div>${partyName(agent.name_ar || agent.name_en, agent.nationality)}${partyMeta(agent.id_number, agent.phone)}</div>` : ''

  // Summary card (Total/Paid/Remaining) — shown at the bottom of every printed page.
  const totalsHtml = `<div class="dashed-divider"></div>
<div class="foot">
<div class="totals">
<div class="tot grand"><span class="tl">${T2('الإجمالي', 'Total')}</span><span class="tv">${nm(inv.total_amount)}</span></div>
<div class="tot paid"><span class="tl">${T2('المدفوع', 'Paid')}</span><span class="tv">${nm(inv.paid_amount)}</span></div>
<div class="tot rem"><span class="tl">${T2('المتبقي', 'Remaining')}</span><span class="tv">${nm(inv.remaining_amount)}</span></div>
</div>
</div>`
  const pageNumHtml = (n, total) => `<div class="page-num"><span class="lbl">${T2('صفحة', 'Page')}</span><span class="cur">${n}</span><span class="sep">/</span><span class="tot">${total}</span></div>`

  // Hero header — top row: centered "HUSSAIN · OFFICES" brand eyebrow only.
  // Below: 3-column grid with invoice-no (start), centered title/subtitle, date/office (end).
  const headerHtml = `<div class="header">
<div class="header-top"><div class="eyebrow">HUSSAIN &middot; OFFICES</div></div>
<div class="header-row">
<div class="side-block side-start"><div class="sb-label">${T2('رقم الفاتورة', 'Invoice No.')}</div><div class="sb-value">${esc(inv.invoice_no || '')}</div></div>
<div class="title-center"><div class="title">${T2('فاتورة', 'Invoice')}</div>${svcName ? `<div class="subtitle">${isVisa && qty > 0 ? `<span class="qty">${qty}×</span>` : ''}${esc(svcName)}</div>` : ''}</div>
<div class="side-block side-end"><div class="sb-label">${T2('التاريخ', 'Date')}</div><div class="sb-value">${fmtD(inv.created_at)}</div>${officeCode ? `<div class="sb-sub"><span class="sb-sub-l">${T2('المكتب', 'Office')}</span><span class="sb-sub-v">${esc(officeCode)}</span></div>` : ''}</div>
</div>
</div>
<div class="gold-divider"></div>`
  const decorHtml = `<div class="dots-top"></div><div class="dots-bot"></div>`
  const watermarkHtml = cancelled ? `<div class="cancel-wm">${T2('ملغاة', 'CANCELLED')}</div>` : ''

  const html = `<!DOCTYPE html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${printLang}"><head><meta charset="utf-8"><title>${T2('فاتورة', 'Invoice')} ${esc(inv.invoice_no || '')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
@page{size:A4;margin:0}
html,body{width:210mm;background:#f3ecdd;color:#15130e;font-family:'Cairo','Tajawal',sans-serif}
.page{width:210mm;height:297mm;padding:18mm 18mm;position:relative;background:linear-gradient(180deg,#faf6ec 0%,#f3ecdd 100%);display:flex;flex-direction:column;overflow:hidden}
.dots-top,.dots-bot{position:absolute;left:0;right:0;height:22px;background-image:radial-gradient(circle at 10px 10px,rgba(212,160,23,.32) 1.2px,transparent 1.5px);background-size:20px 20px;opacity:.7;pointer-events:none}
.dots-top{top:0}.dots-bot{bottom:0}
.content{position:relative;z-index:2;direction:${rtl ? 'rtl' : 'ltr'};flex:1;display:flex;flex-direction:column}
.header{display:flex;flex-direction:column;gap:10px;margin-bottom:6px}
.header-top{text-align:center}
.header-row{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:10mm}
.title-center{text-align:center;align-self:start}
.eyebrow{font-size:20px;letter-spacing:5px;color:#D4A017;font-weight:700;font-family:'Playfair Display',serif;white-space:nowrap}
.title{font-size:32px;font-weight:500;color:#15130e;font-family:'Playfair Display','Cairo',serif;letter-spacing:-.8px;line-height:1}
.subtitle{font-size:13.5px;font-weight:600;color:rgba(0,0,0,.55);margin-top:8px;letter-spacing:.3px;font-family:'Cairo','Tajawal',sans-serif}
.subtitle .qty{display:inline-block;margin-inline-end:8px;font-size:14px;font-weight:800;color:#15130e;font-family:'JetBrains Mono',monospace;vertical-align:middle;letter-spacing:.3px}
.side-block{align-self:start;display:flex;flex-direction:column;gap:4px}
.side-start{justify-self:start;text-align:start}
.side-end{justify-self:end;text-align:end}
.sb-label{font-size:10.5px;color:rgba(0,0,0,.55);font-weight:700;letter-spacing:.5px;text-transform:uppercase;font-family:'Cairo','Tajawal',sans-serif}
.sb-value{font-size:12px;color:#D4A017;font-family:'JetBrains Mono',monospace;font-weight:800;direction:ltr;letter-spacing:.4px;white-space:nowrap}
.sb-sub{display:inline-flex;align-items:baseline;gap:6px;margin-top:2px;justify-content:flex-end}
.side-start .sb-sub{justify-content:flex-start}
.sb-sub-l{font-size:10px;color:rgba(0,0,0,.5);font-weight:600;letter-spacing:.5px;text-transform:uppercase}
.sb-sub-v{font-size:11px;color:#D4A017;font-family:'JetBrains Mono',monospace;font-weight:800;direction:ltr;letter-spacing:.4px}
.cancel-wm{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:130px;font-weight:900;color:rgba(192,57,43,.12);letter-spacing:12px;white-space:nowrap;pointer-events:none;z-index:4;font-family:'Cairo',sans-serif}
.corner-left{position:absolute;top:0;left:0;text-align:left}
.corner-right{position:absolute;top:0;right:0;text-align:right}
.mini-label{font-size:9.5px;color:rgba(0,0,0,.55);font-weight:600;letter-spacing:.5px;margin-bottom:3px}
.mini-val{font-size:12px;color:#D4A017;font-family:'JetBrains Mono',monospace;font-weight:700;direction:ltr;letter-spacing:.5px}
.office-line{font-size:9.5px;color:rgba(0,0,0,.55);font-weight:600;letter-spacing:.6px;margin-top:5px}
.office-line .code{color:#D4A017;font-family:'JetBrains Mono',monospace;font-weight:700}
.gold-divider{height:1px;background:linear-gradient(90deg,rgba(212,160,23,.5) 0%,transparent 30%,transparent 70%,rgba(212,160,23,.5) 100%);margin:6px 0 14px}
.row2{display:flex;gap:14px;margin-bottom:14px}
.card{flex:1;border:1px solid rgba(212,160,23,.3);border-radius:10px;padding:12px 14px}
.card.half{flex:1}
.card-h{font-size:11px;color:#D4A017;font-weight:700;letter-spacing:.5px;margin-bottom:9px;text-transform:uppercase}
.kv{display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px dashed rgba(0,0,0,.08);gap:10px}
.kv:last-child{border-bottom:none}
.kv .k{font-size:11px;color:rgba(0,0,0,.55);font-weight:600}
.kv .v{font-size:12.5px;color:#15130e;font-weight:700;text-align:${rtl ? 'left' : 'right'}}
.kv .v.mono{font-family:'JetBrains Mono',monospace;direction:ltr;letter-spacing:.3px}
.sec-head{font-size:12px;color:#D4A017;font-weight:700;letter-spacing:.5px;margin:4px 0 8px}
.sec-head .count{color:rgba(0,0,0,.5);font-weight:600;font-family:'JetBrains Mono',monospace}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
th{font-size:9.5px;color:rgba(0,0,0,.5);font-weight:700;text-align:${rtl ? 'right' : 'left'};padding:6px 14px;border-bottom:1.5px solid rgba(212,160,23,.4);letter-spacing:.4px}
td{font-size:11.5px;color:#15130e;font-weight:600;padding:8px 14px;border-bottom:1px dashed rgba(0,0,0,.1)}
td.num,th.num{font-family:'JetBrains Mono',monospace;text-align:${rtl ? 'left' : 'right'};white-space:nowrap}
td.name{font-weight:700}
td.paid{color:#1f8f4d}
td.rem{color:#c0392b}
td.date{color:rgba(0,0,0,.55);font-size:10.5px;font-family:'JetBrains Mono',monospace;direction:ltr;text-align:${rtl ? 'right' : 'left'}}
td.disc{color:#c0392b}
td .tag{font-size:8.5px;font-weight:700;color:#c0392b;border:1px solid rgba(192,57,43,.4);border-radius:4px;padding:1px 5px;margin-inline-start:5px;font-family:'Cairo',sans-serif}
.fd{margin-top:9px;padding-top:9px;border-top:1px dashed rgba(212,160,23,.3)}
.fd-h{font-size:10px;color:#16a085;font-weight:700;letter-spacing:.4px;margin-bottom:6px}
.fd-file{margin-bottom:6px}
.fd-flabel{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;color:#16a085;font-weight:700;margin-bottom:2px}
.fd-count{font-size:9.5px;color:rgba(0,0,0,.5);font-weight:600;font-family:'JetBrains Mono',monospace}
.fd-item{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;color:#15130e;font-weight:600;padding:2px 0}
.fd-x{font-family:'JetBrains Mono',monospace;font-weight:700;direction:ltr}
.content>.card{margin-bottom:14px}
.party-name{display:flex;align-items:center;gap:9px;font-size:16px;color:#15130e;font-weight:800;letter-spacing:.2px}
.flag{width:26px;height:18px;object-fit:cover;border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,.12);flex-shrink:0}
.flag-emoji{font-size:18px;line-height:1;flex-shrink:0}
.party-meta{display:flex;flex-direction:row;justify-content:space-between;align-items:center;gap:16px;margin-top:8px;font-family:'JetBrains Mono',monospace;font-size:12.5px;color:#15130e;font-weight:700}
.party-meta .meta-line{display:inline-flex;align-items:center;gap:6px}
.party-meta .meta-icon{display:inline-flex;color:rgba(0,0,0,.5);width:13px;height:13px}
.party-meta .meta-icon svg{width:13px;height:13px}
.party-meta .meta-val{direction:ltr;letter-spacing:.3px}
.svc-attrs .sep{color:rgba(212,160,23,.7);font-weight:700}
.svc-title{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.svc-title .st{font-size:18px;font-weight:800;color:#15130e}
.svc-title .qty{font-size:11.5px;font-weight:700;color:#D4A017;border:1px solid rgba(212,160,23,.4);border-radius:6px;padding:2px 9px;font-family:'JetBrains Mono',monospace}
.svc-attrs{margin-top:8px;font-size:13px;color:#15130e;font-weight:600;line-height:1.7}
.svc-attrs .sep{margin:0 7px}
.dashed-divider{border-top:1px dashed rgba(212,160,23,.35);margin:6px 0 14px}
.foot{display:flex;justify-content:flex-end;margin-top:auto}
.totals{display:flex;flex-direction:column;min-width:300px;border:1px solid rgba(212,160,23,.3);border-radius:10px;padding:2px 18px}
.tot{display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:10px 0;border-bottom:1px dashed rgba(0,0,0,.1)}
.tot:last-child{border-bottom:none}
.tot .tl{font-size:12px;letter-spacing:.5px;color:rgba(0,0,0,.55);font-weight:700}
.tot .tv{font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace;direction:ltr}
.tot.grand .tl{color:#D4A017;font-weight:800}
.tot.grand .tv{font-size:26px;color:#D4A017}
.tot.paid .tv{color:#1f8f4d}.tot.rem .tv{color:#c0392b}
.spacer{flex:1;min-height:2mm}
.page-num{position:absolute;bottom:8mm;left:18mm;z-index:3;display:inline-flex;align-items:center;gap:6px;direction:ltr}
.page-num .lbl{font-size:9.5px;color:rgba(0,0,0,.5);font-weight:700;letter-spacing:.6px;font-family:'Cairo','Tajawal',sans-serif;text-transform:uppercase}
.page-num .cur,.page-num .tot{font-family:'JetBrains Mono',monospace;color:#D4A017;font-weight:800;font-size:12px;line-height:1}
.page-num .sep{color:rgba(212,160,23,.65);font-weight:700;font-family:'JetBrains Mono',monospace;font-size:12px;margin:0 1px}
.page1{page-break-after:always}
@media print{html,body{background:#f3ecdd !important}.page1{page-break-after:always}.page2{page-break-after:auto}}
</style></head><body>
<div class="page page1">
${decorHtml}
${watermarkHtml}
<div class="content">
${headerHtml}
<div class="row2">
<div class="card"><div class="card-h">${T2('العميل', 'Client')}</div>${clientHtml}</div>
${agentHtml || `<div class="card" style="border-color:transparent;background:transparent"></div>`}
</div>
${insts.length ? `<div class="sec-head">${T2('الأقساط', 'Installments')} <span class="count">(${insts.length})</span></div>
<table><thead><tr><th style="width:26%">${T2('البند', 'Item')}</th><th class="date" style="width:24%">${T2('التاريخ المتوقع', 'Expected Date')}</th><th class="num" style="width:17%">${T2('المبلغ', 'Amount')}</th><th class="num" style="width:16%">${T2('المدفوع', 'Paid')}</th><th class="num" style="width:17%">${T2('المتبقي', 'Remaining')}</th></tr></thead><tbody>${instHtml}</tbody></table>` : ''}
${pays.length ? `<div class="sec-head">${T2('الدفعات', 'Payments')} <span class="count">(${pays.length})</span></div>
<table><thead><tr><th style="width:30%">${T2('الطريقة', 'Method')}</th><th class="date" style="width:35%">${T2('التاريخ', 'Date')}</th><th class="num" style="width:35%">${T2('المبلغ', 'Amount')}</th></tr></thead><tbody>${payHtml}</tbody></table>` : ''}
<div class="spacer"></div>
${totalsHtml}
</div>
${pageNumHtml(1, 2)}
</div>
<div class="page page2">
${decorHtml}
${watermarkHtml}
<div class="content">
${headerHtml}
<div class="card"><div class="card-h">${T2('الخدمة', 'Service')}</div>${svcHtml}${fileDistHtml}</div>
<div class="spacer"></div>
${totalsHtml}
</div>
${pageNumHtml(2, 2)}
</div>
</body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html); doc.close()
  const cleanup = () => { try { document.body.removeChild(iframe) } catch {} }
  setTimeout(() => {
    try { iframe.contentWindow.focus(); iframe.contentWindow.onafterprint = () => setTimeout(cleanup, 100); iframe.contentWindow.print() }
    catch { cleanup() }
  }, 600)
  setTimeout(cleanup, 60000)
}

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
      {baseSvcCode(data?.code || inv.service_type?.code) === 'work_visa' ? (
        <>
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.c }} /><span style={cardTitle}>{T('بيانات الفاتورة','Invoice Details')}</span></div>
            <div style={{ padding: '14px 22px' }}><VisaInfoRows inv={inv} isAr={isAr} T={T} svc={svc} data={data} /></div>
          </div>
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
              <span style={cardTitle}>{T('بيانات المعاملة','Transaction Details')}</span>
              {!data?.loading && (() => { const st = visaStatusBadge(data, T); return (
                <span style={{ marginInlineStart: 'auto', fontSize: 10.5, fontWeight: 700, color: st.color, background: st.color + '1f', border: '1px solid ' + st.color + '55', padding: '3px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color }} />
                  {st.label}
                </span>
              ) })()}
            </div>
            <div style={{ padding: '14px 22px' }}><VisaExecutionRows inv={inv} isAr={isAr} T={T} data={data} /></div>
          </div>
        </>
      ) : (
        <div style={cardChrome}>
          <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: svc.c }} /><span style={cardTitle}>{T('بيانات الفاتورة','Invoice Details')}</span></div>
          <div style={{ padding: '14px 22px' }}><TransactionRows inv={inv} isAr={isAr} T={T} svc={svc} payT={payT} data={data} /></div>
        </div>
      )}
      {(() => {
        const agent = inv.agent || inv.service_request?.service_request_agents?.[0]?.agent || null
        if (!agent) return null
        const nat = agent.nationality
        const fl = nat?.flag_url
        const em = flagEmoji(nat?.code)
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />
              <span style={cardTitle}>{T('الوسيط','Agent')}</span>
              {fl
                ? <img src={fl} alt={nat?.name_ar || ''} title={nat?.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                : (em ? <span title={nat?.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)}
            </div>
            <div style={{ padding: '14px 22px' }}><BrokerRows agent={agent} T={T} /></div>
          </div>
        )
      })()}
      {(() => {
        const notePublic = (inv.note_public || '').trim()
        const notePrivate = (inv.note_private || '').trim()
        if (!notePublic && !notePrivate) return null
        return (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('ملاحظة','Note')}</span>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notePublic && (
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--tx2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{notePublic}</div>
              )}
              {notePrivate && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: notePublic ? 12 : 0, borderTop: notePublic ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    {T('ملاحظة خاصة','Private Note')}
                  </span>
                  <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--tx3)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{notePrivate}</div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
    <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={cardChrome}>
        <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('الملخص المالي','Financial Summary')}</span></div>
        {(() => {
          const person = inv.creator?.person
          const full = (isAr ? (person?.name_ar || person?.name_en) : (person?.name_en || person?.name_ar)) || ''
          const twoNames = full.trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
          return (
            <div style={{ padding: '12px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, gap: 10 }}>
              <span style={{ color: 'var(--tx4)' }}>{T('منشئ الفاتورة','Created by')}</span>
              <span style={{ color: twoNames ? 'var(--tx2)' : 'var(--tx4)', fontWeight: 700 }}>{twoNames || T('غير معروف','Unknown')}</span>
            </div>
          )
        })()}
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
      {(() => {
        // Action buttons depend on invoice state: a cancelled invoice exposes none,
        // a fully-paid one hides "record payment", an unpaid one hides "refund".
        const cancelled = inv.status?.code === 'cancelled'
        const canPay = !cancelled && remaining > 0.005
        const canRefund = !cancelled && paid > 0.005
        const canCancel = !cancelled
        if (!canPay && !canRefund && !canCancel) return null
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {canPay && (
              <div style={{ gridColumn: canRefund ? 'auto' : 'span 2', display: 'grid' }}>
                <ActionGridButton onClick={onRecordPayment} color={C.ok} bg="rgba(46,204,113,.10)" bd="rgba(46,204,113,.32)" label={T('تسجيل دفعة','Record Payment')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </ActionGridButton>
              </div>
            )}
            {canRefund && (
              <div style={{ gridColumn: canPay ? 'auto' : 'span 2', display: 'grid' }}>
                <ActionGridButton onClick={onRefund} color={C.blue} bg="rgba(93,173,226,.10)" bd="rgba(93,173,226,.30)" label={T('استرجاع','Refund')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                </ActionGridButton>
              </div>
            )}
            {canCancel && (
              <div style={{ gridColumn: 'span 2', display: 'grid' }}>
                <ActionGridButton onClick={onCancelInv} color={C.red} bg="rgba(229,134,122,.10)" bd="rgba(229,134,122,.30)" label={T('إلغاء','Cancel')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                </ActionGridButton>
              </div>
            )}
          </div>
        )
      })()}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: C.gold }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', letterSpacing: '.3px' }}>{T('طباعة','Print')}</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[{ k: 'ar', l: 'عربي', cc: 'sa' }, { k: 'en', l: 'English', cc: 'gb' }].map(o => (
          <button key={o.k} onClick={() => printInvoice(inv, data, o.k)} title={T('طباعة بـ ','Print in ') + o.l}
            style={{ height: 40, padding: '0 10px', borderRadius: 10, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.22)', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 700, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.14)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.06)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.22)' }}>
            <img src={`https://flagcdn.com/w40/${o.cc}.png`} alt="" width="18" height="13" style={{ display: 'block', borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} />
            <span>{o.l}</span>
          </button>
        ))}
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
    <div style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 700, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</div>
  </div>
)

const Section = ({ title, children }) => (
  <div style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
    <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>{title}</div>
    {children}
  </div>
)
const CopyBtn = ({ text }) => {
  const [done, setDone] = useState(false)
  if (text == null || text === '') return null
  return (
    <button
      title="نسخ"
      onClick={() => { try { navigator.clipboard?.writeText(String(text)); setDone(true); setTimeout(() => setDone(false), 1200) } catch {} }}
      style={{ width: 18, height: 18, padding: 0, borderRadius: 4, background: 'transparent', border: 'none', color: done ? C.ok : 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.18s', flexShrink: 0 }}
      onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!done) e.currentTarget.style.color = 'var(--tx4)' }}
    >
      {done
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
    </button>
  )
}

const Row = ({ label, value, mono, color, copy }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: mono ? 'ltr' : undefined }}>
      <span style={{ fontSize: 13, color: color || 'var(--tx2)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontFamily: mono ? 'monospace' : F, fontWeight: 600 }}>{value || '—'}</span>
      {copy && value ? <CopyBtn text={value} /> : null}
    </span>
  </div>
)

const SectionLabel = ({ label, color = C.gold }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 6px', marginTop: 4 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}aa` }} />
    <span style={{ fontSize: 10.5, color: color, fontWeight: 700, letterSpacing: '.6px' }}>{label}</span>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
  </div>
)

const BorderRow = ({ T, borderNo, visaUsed, visaNo }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{T('رقم الحدود','Border No')}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {(visaNo || borderNo) && <span style={{
        padding: '2px 8px', borderRadius: 999, fontSize: 9.5, fontWeight: 800, letterSpacing: '.4px',
        background: visaUsed ? 'rgba(46,204,113,.12)' : 'rgba(255,255,255,.04)',
        border: '1px solid ' + (visaUsed ? 'rgba(46,204,113,.32)' : 'rgba(255,255,255,.08)'),
        color: visaUsed ? C.ok : 'var(--tx4)',
      }}>{visaUsed ? T('مستخدمة','Used') : T('لم تستخدم','Not Used')}</span>}
      <span style={{ fontSize: 13, color: 'var(--tx2)', fontFamily: 'monospace', direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{borderNo || '—'}</span>
    </div>
  </div>
)

const selS = { padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, color: 'var(--tx1)', fontSize: 13, fontFamily: F, minWidth: 130 }
const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : C.gold, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
