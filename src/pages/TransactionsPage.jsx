import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { CalendarPopup, Sel, DateField } from './KafalaCalculator.jsx'
import BackButton from '../components/BackButton'
import { noDash } from '../lib/utils.js'
import { Modal, ModalSection, TextField, TextArea, Select, CurrencyField, FileField, SuccessView, GRID, EmptyState } from '../components/ui/FormKit.jsx'
import { StatStripSkeleton, SkeletonCards, SkeletonTable } from '../components/ui/Skeleton.jsx'
import { Wallet, Building2, FileText as FileTextIco, Send, CheckCircle2, Ban, Clock, CreditCard, User, Plus, Paperclip } from 'lucide-react'
import { TXN_SERVICES, TXN_REGISTRY_CODES, txnServiceFor } from './txnServices.js'
import { docTypeLabel } from '../ServiceAdminPage.jsx'

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
  if (s.length === 9 && s.startsWith('5')) return '0' + s // local Saudi mobile → prefix 0
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
/* Elapsed time broken into [{n,u}] parts — granularity: days + hours, clear word units.
   e.g. [{n:2,u:'يوم'},{n:5,u:'ساعة'}] · sub-hour → [{n:'<1',u:'ساعة'}] */
const fmtDurationParts = (fromIso, toIso, ar = true) => {
  if (!fromIso || !toIso) return []
  try {
    const ms = new Date(toIso) - new Date(fromIso)
    if (!(ms > 0)) return []
    const totalHours = Math.floor(ms / 3600000)
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24
    // Arabic plural: 3–10 take the broken plural (ساعات/أيام), otherwise singular.
    const dU = (n) => ar ? ((n >= 3 && n <= 10) ? 'أيام' : 'يوم') : 'day'
    const hU = (n) => ar ? ((n >= 3 && n <= 10) ? 'ساعات' : 'ساعة') : 'hr'
    const out = []
    if (days > 0) { out.push({ n: days, u: dU(days) }); if (hours > 0) out.push({ n: hours, u: hU(hours) }) }
    else if (hours > 0) { out.push({ n: hours, u: hU(hours) }) }
    else out.push({ n: '<1', u: ar ? 'ساعة' : 'hr' }) // less than an hour
    return out
  } catch { return [] }
}
/* Same elapsed time as a single clear phrase. e.g. "2 يوم 5 ساعة" / "5 ساعة" */
const fmtDuration = (fromIso, toIso, ar = true) =>
  fmtDurationParts(fromIso, toIso, ar).map(p => `${p.n} ${p.u}`).join(' ')

/* ─────── Service-type theme ─────── */
const SVC_THEME = {
  work_visa:            { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة عمل',         label_en: 'Work Visa' },
  work_visa_permanent:  { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة وإقامة دائمة',   label_en: 'Permanent Visa & Iqama' },
  work_visa_temporary:  { c: C.blue,   bg: 'rgba(93,173,226,.12)',  bd: 'rgba(93,173,226,.32)',  label_ar: 'تأشيرة وإقامة مؤقتة',   label_en: 'Temporary Visa & Iqama' },
  iqama_issuance: { c: '#27ae60',bg: 'rgba(39,174,96,.12)',   bd: 'rgba(39,174,96,.32)',   label_ar: 'إصدار إقامة', label_en: 'Iqama Issuance' },
  transfer:       { c: C.orange, bg: 'rgba(243,156,18,.12)',  bd: 'rgba(243,156,18,.32)',  label_ar: 'نقل كفالة',   label_en: 'Transfer' },
  ajeer:          { c: C.purple, bg: 'rgba(187,143,206,.12)', bd: 'rgba(187,143,206,.32)', label_ar: 'أجير',        label_en: 'Ajeer' },
  iqama_renewal:  { c: C.cyan,   bg: 'rgba(22,160,133,.12)',  bd: 'rgba(22,160,133,.32)',  label_ar: 'تجديد إقامة', label_en: 'Iqama Renewal' },
  other:          { c: C.gray,   bg: 'rgba(149,165,166,.12)', bd: 'rgba(149,165,166,.32)', label_ar: 'خدمة أخرى',   label_en: 'Other' },
  supplier_payroll:           { c: '#D4A017', bg: 'rgba(212,160,23,.12)',  bd: 'rgba(212,160,23,.32)',  label_ar: 'رواتب سبلاير',     label_en: 'Supplier Payroll' },
  external_transfer_approval: { c: C.orange,  bg: 'rgba(243,156,18,.12)',  bd: 'rgba(243,156,18,.32)',  label_ar: 'موافقة نقل خارجي', label_en: 'External Transfer' },
  general:        { c: '#7f8c8d',bg: 'rgba(127,140,141,.12)', bd: 'rgba(127,140,141,.32)', label_ar: 'خدمة عامة',   label_en: 'General' },
}
// Un-themed service types keep their REAL lookup name instead of collapsing to the generic "خدمة عامة" theme.
const svcThemeFor = (st) => {
  const code = st?.code
  const t = code && SVC_THEME[code]
  if (t) return t
  // Registry-driven tabs derive bg/bd from the accent color so they match the SVC_THEME shape.
  const reg = code && TXN_SERVICES[code]?.theme
  if (reg) return { c: reg.c, bg: reg.c + '1f', bd: reg.c + '55', label_ar: reg.label_ar, label_en: reg.label_en }
  return { ...SVC_THEME.general, label_ar: st?.value_ar || 'خدمة', label_en: st?.value_en || st?.value_ar || 'Service' }
}
const STATUS_THEME = {
  new:         { c: C.blue,   stamp_ar: 'جديد',         stamp_en: 'NEW' },
  in_progress: { c: C.blue,   stamp_ar: 'قيد التنفيذ',  stamp_en: 'IN PROGRESS' },
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

/* ─────── Status cell — status + live elapsed, gradient-bar design ─────── */
function StatusCell({ st, statusLabel, dur, isSettled, isAr }) {
  const c = st.c
  const tip = isSettled ? (isAr ? 'المدة من الطلب حتى ' + statusLabel : 'Duration from request to ' + statusLabel)
                        : (isAr ? 'مضى عليه قيد التنفيذ' : 'Time in progress so far')
  const liveDot = !isSettled // pulse while in progress
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, minWidth: 120, direction: isAr ? 'rtl' : 'ltr' }} title={tip}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: c, whiteSpace: 'nowrap' }}>
        <span className={liveDot ? 'txn-dot-pulse' : ''} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />{statusLabel}
      </span>
      <span style={{ height: 4, borderRadius: 4, background: `linear-gradient(${isAr ? 270 : 90}deg, ${c}, ${c}22)` }} />
      {dur && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', direction: isAr ? 'rtl' : 'ltr', whiteSpace: 'nowrap' }}>{dur}</span>}
    </div>
  )
}

// تحديد صف الطلب — مشترَك بين قائمة الطلبات والفتح المباشر (deep-link) من الفاتورة عبر الرقم المرجعي.
const SR_SELECT = `
        id, request_ref_no, request_date, paid_date, updated_at, quantity, note, cancelled_reason, cancelled_at, cancelled_by, completed_by,
        accountant_status, accountant_at, accountant_note,
        canceller:cancelled_by(person:persons!users_person_id_fkey(name_ar,name_en)),
        completer:completed_by(person:persons!users_person_id_fkey(name_ar,name_en)),
        accountant:accountant_by(person:persons!users_person_id_fkey(name_ar,name_en)),
        client:client_id(id,name_ar,name_en,phone,id_number,edit_log,nationality:nationality_id(code,name_ar,flag_url)),
        service_type:service_type_id(code,value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(id,branch_code),
        invoices(invoice_no,deleted_at),
        visa_applications(id,visa_number,border_number,main_facility:main_facility_id(name_ar,hrsd_number)),
        iqama_issuance_applications(iqama_number),
        other_applications(worker_phone,details,worker:worker_id(name_ar,name_en,iqama_number,phone,nationality:nationality_id(code,name_ar,flag_url)),worker_facility:worker_facility_id(name_ar,unified_number)),
        supplier_payroll_applications(worker_phone,total_amount,worker:worker_id(name_ar,name_en,iqama_number,phone,nationality:nationality_id(code,name_ar,flag_url))),
        ajeer_applications(worker:worker_id(name_ar,name_en,iqama_number,phone,nationality:nationality_id(code,name_ar,flag_url))),
        iqama_renewal_applications(worker:worker_id(name_ar,name_en,iqama_number,phone,nationality:nationality_id(code,name_ar,flag_url)))
      `

/* ═══════════════════════════════════════════════════════════════════════ */
export default function TransactionsPage({ sb, lang, user, branchId, toast, lockedService, lockedLabel, emptyIcon, accountantMode, initialDetailId, onConsumeInitialDetail }) {
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

  // Live tick (every 60s) so "in progress" elapsed counters stay current.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  // When locked to a single request type, resolve its service_type lookup id.
  const lockedServiceId = useMemo(() => (lockedService ? (services.find(s => s.code === lockedService)?.id || null) : null), [lockedService, services])

  useEffect(() => {
    let alive = true
    Promise.all([
      sb.from('branches').select('id,branch_code').order('branch_code'),
      sb.from('lookup_items').select('id,code,value_ar,value_en,category:lookup_categories!inner(category_key)').eq('is_active', true).in('category.category_key', ['service_type', 'request_status']),
    ]).then(([b, l]) => {
      if (!alive) return
      setBranches(b.data || [])
      const items = l.data || []
      setServices(items.filter(i => i.category?.category_key === 'service_type'))
      setStatuses(items.filter(i => i.category?.category_key === 'request_status'))
    })
    return () => { alive = false }
  }, [sb])

  // No default status filter — every service/task page opens showing ALL requests
  // (جميع الحالات). The employee filters by status themselves from the filter bar.

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
    // Work-visa pages show real execution milestones (جديد → منشأة → تأشيرة → إقامة) instead of the
    // generic status lookup, so for them we also pull each request's visa rows to derive its stage.
    const isVisa = /^work_visa(_|$)/.test(lockedService || '')
    // visa_applications carries the visa + wakalah (كرت العمل) milestones. It has NO worker/iqama link
    // (a visa is issued before a worker is assigned), so the iqama milestone isn't sourced here.
    const sel = isVisa
      ? 'id,request_date,status:status_id(code),visa_applications(visa_number,border_number),iqama_issuance_applications(iqama_number)'
      : 'id,request_date,status:status_id(code)'
    let qb = sb.from('service_requests')
      .select(sel, { count: 'exact' })
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
      // Work-visa lifecycle buckets: awaiting visa → awaiting iqama → iqama issued.
      const byStage = { awaiting_visa: 0, awaiting_iqama: 0, iqama_issued: 0 }
      list.forEach(r => {
        const dStr = (r.request_date || '').slice(0, 10)
        if (dStr === todayStr) today++
        const dt = r.request_date ? new Date(r.request_date) : null
        if (dt && dt >= weekAgo) week++
        const code = r.status?.code || 'in_progress'
        byStatus[code] = (byStatus[code] || 0) + 1
        // Stage breakdown excludes cancelled requests (they aren't a milestone on the active path).
        if (isVisa && code !== 'cancelled') {
          const hasIqama = (r.iqama_issuance_applications || []).some(i => i.iqama_number)
          const hasVisa = (r.visa_applications || []).some(v => v.visa_number || v.border_number)
          byStage[hasIqama ? 'iqama_issued' : hasVisa ? 'awaiting_iqama' : 'awaiting_visa']++
        }
      })
      setTypeStats({ total: count ?? list.length, today, week, byStatus, byStage, isVisa })
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
      .select(SR_SELECT, { count: 'exact' })
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
    // صندوق موافقات المحاسب: لا يُصفّى بنوع خدمة واحد — يعرض كل الطلبات المعلّقة لدى المحاسب عبر الخدمات.
    if (accountantMode) qb = qb.eq('accountant_status', 'pending')

    ;(async () => {
      // البحث الموحّد: رقم الطلب · بيانات العميل · العامل · المنشأة · رقم الفاتورة (عبر دالة search_request_ids)
      if (q.trim()) {
        const { data: idRows, error: idErr } = await sb.rpc('search_request_ids', { p_q: q.trim() })
        if (idErr) { if (alive) { setErr(idErr.message); setLoading(false) } return }
        const ids = (idRows || []).map(r => r.id)
        if (!ids.length) { if (alive) { setRows([]); setTotal(0); setLoading(false) } return }
        qb = qb.in('id', ids)
      }
      const { data, count, error } = await qb
      if (!alive) return
      if (error) { setErr(error.message); setLoading(false); return }
      setRows(data || []); setTotal(count || 0); setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, page, branchFilter, branchId, serviceType, lockedServiceId, lockedService, status, q, from, to, accountantMode])

  // فتح مباشر (deep-link) من الفاتورة عبر الرقم المرجعي: نُحضر صفّ الطلب بمعرّفه ونفتح تفاصيله مباشرة،
  // متجاوزين فلاتر القائمة (الفرع/الحالة/الصفحة) كي يعمل أياً كان موضع الطلب في القائمة.
  useEffect(() => {
    if (!initialDetailId || detail) return
    let alive = true
    ;(async () => {
      const { data } = await sb.from('service_requests').select(SR_SELECT).eq('id', initialDetailId).is('deleted_at', null).maybeSingle()
      if (!alive) return
      if (data) setDetail(data)
      onConsumeInitialDetail?.()
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDetailId, sb])

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
  // List column layout per service. supplier_payroll + worker-centric registry tabs → office + worker.
  // facility-centric registry tabs → office + facility. Everything else → qty + facility + border.
  const listMode = accountantMode ? 'worker' : (lockedService === 'supplier_payroll' ? 'worker' : (txnServiceFor(lockedService)?.listMode || 'default'))
  const isWorkerList = listMode === 'worker'
  const isFacilityList = listMode === 'facility'
  const isSablair = isWorkerList // office + worker columns (legacy name kept for the existing rows below)
  // The «رقم الحدود» (Border no) column is visa-only — its value comes from visa_applications,
  // so on a non-visa locked service page it is always «—». Show it only on work-visa pages and on
  // the unlocked all-services log (where visa rows populate it). Default group then drops to 2 cols.
  const showBorderCol = /^work_visa/.test(lockedService || '') || !lockedService

  if (detail) return <TransactionDetailPage sb={sb} sr={detail} onBack={() => setDetail(null)} isAr={isAr} T={T} toast={toast} user={user} />

  const initialLoading = loading && rows.length === 0
  /* ─────── Render ─────── */
  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      {(() => {
        // Per-service hero overrides (title + description). Falls back to the generic lockedLabel hero.
        const HERO = {
          general: { ar: 'خدمة عامة', en: 'General', dAr: 'الطلبات المصنّفة ضمن «الخدمة العامة» — أي معاملة لا تندرج تحت خدمة محدّدة — ومتابعة حالتها', dEn: 'Requests categorized under the “General” service — any transaction not tied to a specific service — tracked by status' },
          work_visa_permanent: { ar: 'إصدار تأشيرات وإقامات العمل الدائمة', en: 'Issuing Permanent Work Visas & Iqamas', dAr: 'إصدار ومتابعة طلبات تأشيرات وإقامات العمل الدائمة للمنشآت', dEn: 'Issue and track permanent work-visa & iqama requests for facilities' },
          supplier_payroll: { ar: 'طلب رواتب سبلاير', en: 'Supplier Payroll Requests', dAr: 'إصدار ومتابعة طلبات رواتب السبلاير غير المدفوعة للعمّال', dEn: 'Issue and track unpaid supplier-worker payroll requests' },
          external_transfer_approval: { ar: 'الموافقة للنقل الخارجي', en: 'External Transfer Approval', dAr: 'إصدار ومتابعة طلبات الموافقة على النقل الخارجي', dEn: 'Issue and track external transfer approval requests' },
        }
        const hero = txnServiceFor(lockedService)?.hero || HERO[lockedService]
        const title = accountantMode ? T('موافقات المحاسب','Accountant Approvals') : (hero ? T(hero.ar, hero.en) : (lockedLabel || T('المعاملات','Transactions')))
        const desc = accountantMode
          ? T('الطلبات المُرسَلة لموافقة المحاسب (النقل الخارجي والخروج النهائي) — راجِع الطلب ووافِق أو ارفض ليُكمل الموظف الإجراءات.','Requests sent for accountant approval (external transfer & final exit) — review and approve or reject so staff can complete the procedure.')
          : (hero ? T(hero.dAr, hero.dEn) : (lockedService ? T(`جميع طلبات «${lockedLabel}» ومتابعة حالتها`, `All “${lockedLabel}” requests — tracked by status and branch`) : T('سجل الطلبات الرئيسية ومتابعة حالتها بحسب الخدمة والمكتب','Main service requests log — tracked by service type, branch and status')))
        return (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{desc}</div>
          </div>
        )
      })()}

      {/* Stats — Hero KPI + Sidebar (statuses) + Services card (hidden on per-type pages, where cross-type stats would be misleading) */}
      {!lockedService && !accountantMode && initialLoading && <StatStripSkeleton breakdownRows={6} />}
      {!lockedService && !accountantMode && !initialLoading && (
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
            <span style={{ fontSize: 42, fontWeight: 600, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.todayCnt)}</span>
            <span style={{ fontSize: 14, color: 'var(--tx4)', fontWeight: 600 }}>/ {num(stats.weekCnt)} {T('أسبوع','wk')}</span>
          </div>
          {/* Bottom — totals */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('إجمالي السجلات','Total records')}</span>
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
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
            { code: 'in_progress', label: T('قيد التنفيذ','In Progress'), c: C.blue },
            { code: 'done', label: T('منجز','Done'), c: C.ok },
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
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{s.label}</span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start', direction: 'ltr' }}>
                  <span style={{ fontSize: 22, fontWeight: 600, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{num(cnt)}</span>
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
                  <span style={{ color: C.gold, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(totalSvc)}</span> {T('سجل','records')}
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
                      <span style={{ color: isZero ? 'var(--tx4)' : theme.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 600 }}>{num(cnt)}</span>
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
      {lockedService && initialLoading && <SkeletonCards count={2} cols="1fr 1.4fr" minHeight={188} />}
      {lockedService && !initialLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 24 }}>

          {/* Overview — total (big) + today / this-week */}
          <div style={{
            position: 'relative', padding: '18px 22px', borderRadius: 16,
            background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
            border: '1px solid rgba(255,255,255,.05)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            overflow: 'hidden', height: 188, boxSizing: 'border-box',
          }}>
            <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
              <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي الطلبات','Total requests')}</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 8, direction: 'ltr' }}>
              <span style={{ fontSize: 44, fontWeight: 600, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(typeStats?.total || 0)}</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('اليوم','Today')}</span>
                <span style={{ fontSize: 18, color: '#fff', fontWeight: 600, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(typeStats?.today || 0)}</span>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,.06)', margin: '6px 4px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('هذا الأسبوع','This week')}</span>
                <span style={{ fontSize: 18, color: '#fff', fontWeight: 600, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(typeStats?.week || 0)}</span>
              </div>
            </div>
          </div>

          {/* Status breakdown — stacked bar + status counts (display only) */}
          {(() => {
            // Work-visa pages: real execution milestones. Other services: the generic status lookup.
            const isVisa = typeStats?.isVisa
            const ST = isVisa ? [
              { key: 'awaiting_visa',  label: T('في انتظار إصدار التأشيرة','Awaiting visa'),  c: C.blue },
              { key: 'awaiting_iqama', label: T('في انتظار إصدار الإقامة','Awaiting iqama'),   c: C.gold },
              { key: 'iqama_issued',   label: T('تم إصدار الإقامة','Iqama issued'),            c: C.ok },
            ] : [
              { key: 'in_progress', label: lockedService === 'general' ? T('جديدة','New') : T('قيد التنفيذ','In progress'), c: C.blue },
              { key: 'done',        label: T('منجز','Done'),         c: C.ok },
              { key: 'cancelled',   label: T('ملغي','Cancelled'),    c: C.red },
            ]
            const get = (s) => isVisa ? (typeStats?.byStage?.[s.key] || 0) : (typeStats?.byStatus?.[s.key] || 0)
            return (
              <div style={{
                borderRadius: 16,
                background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
                border: '1px solid rgba(255,255,255,.05)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
                padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, height: 188, boxSizing: 'border-box',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{T('الحالات','Statuses')}</span>
                </div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${ST.length},1fr)`, gap: 10 }}>
                  {ST.map(s => {
                    const cnt = get(s)
                    return (
                      <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)', opacity: cnt === 0 ? 0.55 : 1 }}>
                        <span style={{ fontSize: 26, fontWeight: 600, color: s.c, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(cnt)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx2)', fontWeight: 600, textAlign: 'center' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.c, flexShrink: 0 }} />{s.label}</span>
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
            style={{ width: '100%', padding: '11px 38px 11px 14px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(branchFilter || status || serviceType || from || to)
          const clearAll = () => { setBranchFilter(''); setStatus(''); setServiceType(''); setFrom(''); setTo(''); setPage(0) }
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

      {/* Advanced filter panel — matches Invoices filter card design */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        // On a service-locked page the only meaningful statuses are the three shown in the stat cards.
        const statusOpts = lockedService
          ? ['in_progress', 'done', 'cancelled'].map(code => statuses.find(s => s.code === code)).filter(Boolean)
          : statuses
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
              {!lockedService && (
                <div>
                  <div style={fLbl}>{T('نوع الخدمة','Service Type')}</div>
                  <Sel value={serviceType} onChange={v => { setServiceType(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...services.map(s => ({ v: s.id, l: isAr ? s.value_ar : (s.value_en || s.value_ar) }))]} />
                </div>
              )}
              <div>
                <div style={fLbl}>{T('الحالة','Status')}</div>
                <Sel value={status} onChange={v => { setStatus(v); setPage(0) }} placeholder={T('كل الحالات','All statuses')} options={[{ v: '', l: T('كل الحالات','All statuses') }, ...statusOpts.map(s => ({ v: s.id, l: isAr ? s.value_ar : (s.value_en || s.value_ar) }))]} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* List */}
      {loading && rows.length === 0 && (() => {
        // Mirror the real table: same column count + the tl-c5/c6/c7 widths above
        // so the skeleton lines up exactly with the loaded table. On the unlocked
        // all-services view the KPI strip is part of the page, so shimmer it too.
        const skCols = isWorkerList || isFacilityList
          ? ['17%', '12%', '26%', '25%', '20%']
          : showBorderCol
            ? (lockedService ? ['14%', '9%', '24%', '19%', '18%', '16%'] : ['12%', '13%', '8%', '21%', '17%', '15%', '14%'])
            : (lockedService ? ['17%', '26%', '25%', '20%', '12%'] : ['12%', '13%', '21%', '17%', '15%', '22%'])
        return <SkeletonTable columns={skCols} rows={9} />
      })()}
      {!loading && err && <div style={{ padding: 60, textAlign: 'center', color: C.red, fontSize: 13 }}>{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <EmptyState icon={emptyIcon} title={T('لا توجد سجلات', 'No records')} desc={T('ستظهر السجلات هنا بمجرد إضافتها', 'Records will appear here once added')} />
      )}

      {!loading && !err && rows.length > 0 && (
        <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
          <style>{`
.txn-tbl{width:100%;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
.txn-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:14.5px;font-weight:600;text-align:center;padding:14px 12px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
.txn-tbl tbody td{padding:13px 12px;font-size:12px;color:#fff;text-align:center;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.03)}
.txn-tbl tbody tr{cursor:pointer;transition:background .12s}
.txn-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
.txn-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
.txn-tbl tbody tr:last-child td{border-bottom:none}
.txn-name{display:inline-block;max-width:180px;overflow:hidden;white-space:nowrap;vertical-align:bottom}
.txn-name>span{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom}
.txn-tbl tbody tr:hover .txn-name>span{max-width:none;text-overflow:clip;animation:txn-marquee 3.2s ease-in-out .25s infinite alternate}
@keyframes txn-marquee{0%,12%{transform:translateX(0)}88%,100%{transform:translateX(min(0px,calc(180px - 100%)))}}
@keyframes txn-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.78)}}
.txn-dot-pulse{animation:txn-pulse 1.5s ease-in-out infinite}

/* Balanced layout — fixed, proportional column widths with breathing room.
   Widths are scoped per column-count (tl-c5 / tl-c6 / tl-c7) so every view (worker/facility = 5,
   locked visa = 6, default = 7) sums to 100% and the table never overflows its container. */
.txn-tbl.tl-balanced{table-layout:fixed}
.txn-tbl.tl-balanced tbody td{padding:16px 10px;white-space:nowrap}
/* 5 columns — worker / facility lists */
.txn-tbl.tl-c5 th:nth-child(1){width:17%}
.txn-tbl.tl-c5 th:nth-child(2){width:12%}
.txn-tbl.tl-c5 th:nth-child(3){width:26%}
.txn-tbl.tl-c5 th:nth-child(4){width:25%}
.txn-tbl.tl-c5 th:nth-child(5){width:20%}
/* 6 columns — locked visa page (date · qty · facility · border · reference · status) */
.txn-tbl.tl-c6 th:nth-child(1){width:14%}
.txn-tbl.tl-c6 th:nth-child(2){width:9%}
.txn-tbl.tl-c6 th:nth-child(3){width:24%}
.txn-tbl.tl-c6 th:nth-child(4){width:19%}
.txn-tbl.tl-c6 th:nth-child(5){width:18%}
.txn-tbl.tl-c6 th:nth-child(6){width:16%}
/* 7 columns — default unlocked log (adds the service column) */
.txn-tbl.tl-c7 th:nth-child(1){width:12%}
.txn-tbl.tl-c7 th:nth-child(2){width:13%}
.txn-tbl.tl-c7 th:nth-child(3){width:8%}
.txn-tbl.tl-c7 th:nth-child(4){width:21%}
.txn-tbl.tl-c7 th:nth-child(5){width:17%}
.txn-tbl.tl-c7 th:nth-child(6){width:15%}
.txn-tbl.tl-c7 th:nth-child(7){width:14%}
          `}</style>
          <table className={`txn-tbl tl-balanced tl-c${3 + (!lockedService ? 1 : 0) + (isWorkerList || isFacilityList ? 2 : (showBorderCol ? 3 : 2))}`}>
            <thead>
              <tr>
                <th>{T('التاريخ','Date')}</th>
                {!lockedService && <th>{T('الخدمة','Service')}</th>}
                {isWorkerList ? (
                  <>
                    <th>{T('المكتب','Office')}</th>
                    <th>{T('العامل','Worker')}</th>
                  </>
                ) : isFacilityList ? (
                  <>
                    <th>{T('المكتب','Office')}</th>
                    <th>{T('المنشأة','Facility')}</th>
                  </>
                ) : (
                  <>
                    <th>{T('الكمية','Qty')}</th>
                    <th>{T('المنشأة','Facility')}</th>
                    {showBorderCol && <th>{T('رقم الحدود','Border no')}</th>}
                  </>
                )}
                <th>{T('المرجع','Reference')}</th>
                <th>{T('الحالة','Status')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const svc = svcThemeFor(r.service_type)
                const stCode = r.status?.code || 'in_progress'
                let st  = STATUS_THEME[stCode] || STATUS_THEME.in_progress
                let statusLabel = isAr ? (r.status?.value_ar || st.stamp_ar) : (r.status?.value_en || st.stamp_en)
                // الخدمة العامة: دورة حياة «جديدة → منجزة»؛ نعرض «جديدة» بدل «قيد التنفيذ».
                if (lockedService === 'general' && stCode === 'in_progress') statusLabel = T('جديدة','New')
                // Work-visa lifecycle: show the milestone the request is waiting on instead of the generic status.
                if (/^work_visa/.test(lockedService || '') && stCode !== 'cancelled') {
                  const hasIqama = (Array.isArray(r.iqama_issuance_applications) ? r.iqama_issuance_applications : []).some(i => i.iqama_number)
                  const hasVisa = (Array.isArray(r.visa_applications) ? r.visa_applications : []).some(a => a.visa_number || a.border_number)
                  if (hasIqama) { statusLabel = T('تم إصدار الإقامة','Iqama issued'); st = { ...st, c: C.ok } }
                  else if (hasVisa) { statusLabel = T('في انتظار إصدار الإقامة','Awaiting iqama'); st = { ...st, c: C.gold } }
                  else if (stCode === 'new') { statusLabel = T('جديدة','New'); st = { ...st, c: C.blue } }
                  else { statusLabel = T('في انتظار إصدار التأشيرة','Awaiting visa'); st = { ...st, c: C.blue } }
                }
                const isSettled = stCode === 'done' || stCode === 'cancelled'
                const durTo = isSettled ? r.updated_at : new Date(now).toISOString()
                const settledDur = fmtDuration(r.request_date, durTo, isAr)
                const date = (r.request_date || '').slice(0, 10)
                const apps = Array.isArray(r.visa_applications) ? r.visa_applications : []
                const qty = apps.length > 0 ? apps.length : Number(r.quantity || 1)
                const facility = apps.map(a => a.main_facility).find(Boolean)
                const facName = facility?.name_ar || '—'
                const hrsd = facility?.hrsd_number || ''
                const border = apps.map(a => a.border_number).find(Boolean) || '—'
                // own-table services (سبلاير/أجير/تجديد) keep their worker in their own detail table.
                // Embeds may be a single object OR an array (and empty ones come back as [], not null),
                // so normalize each then pick the first non-empty source.
                const pick1 = x => Array.isArray(x) ? x[0] : x
                const oa1 = pick1(r.supplier_payroll_applications) || pick1(r.other_applications) || pick1(r.ajeer_applications) || pick1(r.iqama_renewal_applications)
                const otherApps = oa1 ? [oa1] : []
                const worker = otherApps.map(a => a.worker).find(Boolean)
                const workerName = worker ? (isAr ? (worker.name_ar || worker.name_en) : (worker.name_en || worker.name_ar)) : '—'
                const workerIqama = worker?.iqama_number || ''
                const officeCode = r.branch?.branch_code || '—'
                // Facility-centric registry tabs read the linked facility from other_applications.
                const oaFacility = otherApps.map(a => a.worker_facility).find(Boolean)
                const oaFacName = oaFacility?.name_ar || '—'
                const oaFacUnified = oaFacility?.unified_number || ''
                const invNo = (r.invoices || []).find(iv => iv.deleted_at == null)?.invoice_no
                const ref = noDash(invNo ? invNo.replace(/^INV/i, 'TXN') : ['TXN', r.branch?.branch_code, String(r.request_ref_no || '').slice(-6)].filter(Boolean).join('-'))
                return (
                  <tr key={r.id} onClick={() => setDetail(r)} title={r.client?.name_ar || r.client?.name_en || ''}>
                    <td><span style={{ direction: 'ltr', fontFamily: 'monospace', color: 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{date}</span></td>
                    {!lockedService && (
                      <td>
                        <span style={{ color: svc.c, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{isAr ? svc.label_ar : svc.label_en}</span>
                      </td>
                    )}
                    {isWorkerList ? (
                      <>
                        <td>
                          <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 600, color: officeCode === '—' ? 'var(--tx4)' : C.gold }}>{officeCode}</span>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 0 }}>
                            <span className="txn-name" title={workerName} style={{ fontSize: 12.5, fontWeight: 600, color: workerName === '—' ? 'var(--tx4)' : 'rgba(255,255,255,.92)' }}><span>{workerName}</span></span>
                            {workerIqama && <span style={{ fontSize: 10.5, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace', fontWeight: 600 }}>{workerIqama}</span>}
                          </div>
                        </td>
                      </>
                    ) : isFacilityList ? (
                      <>
                        <td>
                          <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 600, color: officeCode === '—' ? 'var(--tx4)' : C.gold }}>{officeCode}</span>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 0 }}>
                            <span className="txn-name" title={oaFacName} style={{ fontSize: 12.5, fontWeight: 600, color: oaFacName === '—' ? 'var(--tx4)' : 'rgba(255,255,255,.92)' }}><span>{oaFacName}</span></span>
                            {oaFacUnified && <span style={{ fontSize: 10.5, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace', fontWeight: 600 }}>{oaFacUnified}</span>}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'var(--tx2)' }}>{num(qty)}</span>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 0 }}>
                            <span className="txn-name" title={facName} style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.92)' }}><span>{facName}</span></span>
                            {hrsd && <span style={{ fontSize: 10.5, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace', fontWeight: 600 }}>{hrsd}</span>}
                          </div>
                        </td>
                        {showBorderCol && (
                        <td>
                          <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 600, color: border === '—' ? 'var(--tx4)' : 'var(--tx2)', fontVariantNumeric: 'tabular-nums' }}>{border}</span>
                        </td>
                        )}
                      </>
                    )}
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: C.gold }}>{ref}</span>
                        <CopyRefBtn value={ref} title={T('نسخ','Copy')} />
                      </span>
                    </td>
                    <td>
                      <StatusCell st={st} statusLabel={statusLabel} dur={settledDur} isSettled={isSettled} isAr={isAr} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
            .tx-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:600;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
            .tx-pg-input::-webkit-outer-spin-button,.tx-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
          `}</style>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 600, fontFamily: F }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(total)}</span>
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

/* Copy-to-clipboard button — shows a check (✓) for a moment after copying. No toast. */
function CopyRefBtn({ value, title }) {
  const [done, setDone] = useState(false)
  const copy = (e) => {
    e.stopPropagation()
    const text = String(value || '')
    const fallback = () => { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta) } catch {} }
    try { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback); else fallback() } catch { fallback() }
    setDone(true); setTimeout(() => setDone(false), 1400)
  }
  return (
    <button onClick={copy} title={title}
      onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!done) e.currentTarget.style.color = 'var(--tx4)' }}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: done ? C.ok : 'var(--tx4)', display: 'inline-flex', alignItems: 'center', padding: 2, lineHeight: 0, transition: 'color .15s' }}>
      {done
        ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Transaction card — mirrors the invoice card layout
   ═══════════════════════════════════════════════════════════════════════ */
function TransactionCard({ r, isAr, T, onClick }) {
  const svc = svcThemeFor(r.service_type)
  const st  = STATUS_THEME[r.status?.code || 'in_progress'] || STATUS_THEME.in_progress
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
              <span style={{ fontSize: 17, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>{r.client?.name_ar || r.client?.name_en || T('— بدون عميل —','— no client —')}</span>
              {qty > 1 && (
                <span title={T('عدد الوحدات','Quantity')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: svc.bg, border: '1px solid ' + svc.bd, color: svc.c, fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                {SVC_ICON[r.service_type?.code || 'general'] || SVC_ICON.general}
                {isAr ? svc.label_ar : svc.label_en}
              </span>
              <span style={{ fontSize: 12, color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace', fontWeight: 600 }}>{noDash(['TXN', r.branch?.branch_code, String(r.request_ref_no || '').slice(-6)].filter(Boolean).join('-'))}</span>
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
              <span style={{ fontSize: 22, fontWeight: 600, color: st.c, letterSpacing: '-.3px', lineHeight: 1, fontFamily: F }}>{isAr ? st.stamp_ar : st.stamp_en}</span>
            </div>
            {/* Sub rows: quantity + ref short */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('الكمية','Quantity')}</span>
                <span style={{ color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>×{qty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('الخدمة','Service')}</span>
                <span style={{ color: svc.c, fontWeight: 600, fontSize: 10 }}>{isAr ? svc.label_ar : svc.label_en}</span>
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
  // Per-file workflow — the detail page is DISPLAY-ONLY; every section opens its own
  // FormKit popup (نافذة منبثقة): facility picking, the Qiwa-subscription payment, and the
  // issuance data (shared visa number + per-visa border numbers + PDF). Picks/saves commit
  // immediately from their modal. Permanent work visas cap at 4 visas per facility.
  const [facModal, setFacModal] = useState(null)        // establishment key whose facility popup is open | null
  const [issuanceModal, setIssuanceModal] = useState(null) // fileNo whose issuance popup is open | null
  const [subFeeModal, setSubFeeModal] = useState(null)  // fileNo whose subscription-fee popup is open | null
  const [distModal, setDistModal] = useState(false)     // «إضافة منشأة وتوزيع التأشيرات» popup (distribute the fixed visa set)
  const [sendingVisaFee, setSendingVisaFee] = useState({}) // { [fileNo]: true } while the direct send runs
  // Fees gate per file — the Qiwa subscription (facility-wide) and the visa fee (per file)
  // are sent as payment requests to the Payments page; issuance unlocks once paid.
  const [feesRows, setFeesRows] = useState([])     // this SR's payment-request rows
  const [facSubRows, setFacSubRows] = useState([]) // facility-wide 'اشتراك قوى' rows for involved facilities
  const [feesTick, setFeesTick] = useState(0)
  const [feeSettings, setFeeSettings] = useState({}) // admin fees catalog keyed by code (الإدارة ← الرسوم)
  // Iqama-issuance follow-up — one iqama_issuance_applications row PER visa (map: visa_application_id → row)
  const [iqamaRows, setIqamaRows] = useState({})
  const [iqamaAttachments, setIqamaAttachments] = useState([])
  const [iqamaModalVisaId, setIqamaModalVisaId] = useState(null) // the visa whose iqama popup is open | null
  // Status timeline — how long the request spent in each status (logged by a DB trigger).
  const [statusHistory, setStatusHistory] = useState([])
  const [actorNames, setActorNames] = useState({}) // user_id → display name, for "entered by" footers
  const [statusTick, setStatusTick] = useState(0) // bump to refetch the timeline after a save
  // Uploaded visa PDFs (display only — uploads happen inside the issuance popup).
  const [visaAttachments, setVisaAttachments] = useState([])
  // Invoice installments schedule («الدفعات») — every tranche, not just the visa-issuance one.
  const [installments, setInstallments] = useState([])
  // Request-level actions (رواتب سبلاير): mark done / cancel — each opens a FormKit popup.
  const [actionModal, setActionModal] = useState(null)       // 'done' | 'cancel' | null
  const [workerModal, setWorkerModal] = useState(null)       // other_applications.id whose worker-picker popup is open | null
  const [statusOverride, setStatusOverride] = useState(null) // status code applied after an action
  const [cancelReasonOverride, setCancelReasonOverride] = useState(null) // reason captured right after cancelling
  // موافقة المحاسب — خطوة وسطى للنقل الخارجي/الخروج النهائي: 'send' | 'approve' | 'reject' popup
  const [acctModal, setAcctModal] = useState(null)
  const [acctOverride, setAcctOverride] = useState(null) // accountant_status applied right after an action
  // Action-card notes — authored + timestamped; deletable only by the author while in_progress.
  const [reqNotes, setReqNotes] = useState([])
  const [noteModal, setNoteModal] = useState(false)   // popup: add an action (text + multiple files)
  const reloadReqNotes = useCallback(async () => {
    const { data } = await sb.from('service_request_notes')
      .select('id,note,created_at,created_by,author:created_by(person:persons!users_person_id_fkey(name_ar,name_en))')
      .eq('service_request_id', sr.id).is('deleted_at', null).order('created_at', { ascending: true })
    const notes = data || []
    // اربط مرفقات كل إجراء (جدول attachments العام، entity_type='service_request_note')
    const ids = notes.map(n => n.id)
    const attByNote = {}
    if (ids.length) {
      const { data: atts } = await sb.from('attachments')
        .select('id,entity_id,file_name,file_url,created_at')
        .eq('entity_type', 'service_request_note').in('entity_id', ids).is('deleted_at', null)
        .order('created_at', { ascending: true })
      ;(atts || []).forEach(a => { (attByNote[a.entity_id] = attByNote[a.entity_id] || []).push(a) })
    }
    setReqNotes(notes.map(n => ({ ...n, attachments: attByNote[n.id] || [] })))
  }, [sb, sr.id])
  useEffect(() => { reloadReqNotes() }, [reloadReqNotes])
  const deleteReqNote = async (id) => {
    try {
      const { error } = await sb.from('service_request_notes').update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null }).eq('id', id)
      if (error) throw error
      await reloadReqNotes()
    } catch (e) { toast?.(T('تعذّر حذف الملاحظة: ', 'Failed to delete note: ') + (e?.message || e), 'error') }
  }

  // Load the fees-gate state: this SR's payment requests + facility-wide Qiwa-subscription
  // rows (a subscription paid in another transaction still counts for the same facility).
  useEffect(() => {
    if (data.loading || data.code !== 'work_visa') return
    let alive = true
    ;(async () => {
      const facIds = [...new Set((data.det || []).map(d => d.main_facility?.id).filter(Boolean))]
      const [mine, subs, settings] = await Promise.all([
        sb.from('transaction_fees')
          .select('id,fee_label_ar,amount,status,sadad_no,facility_id,file_number,created_at')
          .eq('service_request_id', sr.id).is('deleted_at', null),
        facIds.length
          ? sb.from('transaction_fees')
              .select('id,facility_id,status,sadad_no,amount')
              .eq('fee_label_ar', 'اشتراك قوى').in('facility_id', facIds).is('deleted_at', null)
          : Promise.resolve({ data: [] }),
        sb.from('fee_settings').select('code,label_ar,label_en,amount_type,fixed_amount,max_amount,over_max_action,is_active'),
      ])
      if (!alive) return
      setFeesRows(mine.data || [])
      setFacSubRows(subs.data || [])
      setFeeSettings(Object.fromEntries((settings.data || []).map(s => [s.code, s])))
    })()
    return () => { alive = false }
  }, [sb, sr.id, data.loading, data.code, data.det, feesTick])

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

  // Load every iqama_issuance_applications row for this request's visas — one card per visa, keyed by visa.
  useEffect(() => {
    const visaIds = (data.det || []).map(d => d.id).filter(Boolean)
    if (!visaIds.length) { setIqamaRows({}); return }
    let alive = true
    ;(async () => {
      const { data: rows } = await sb.from('iqama_issuance_applications')
        .select('id,visa_application_id,worker_name_at_entry,work_permit_expiry,insurance_expiry,iqama_number,iqama_expiry,iqama_delivery_date,iqama_duration_months')
        .in('visa_application_id', visaIds)
        .is('deleted_at', null)
      if (!alive) return
      const byVisa = {}
      ;(rows || []).forEach(r => { if (r.visa_application_id) byVisa[r.visa_application_id] = r })
      setIqamaRows(byVisa)
    })()
    return () => { alive = false }
  }, [data.det, sb])

  // Load the status timeline (entered_at per status) to show time spent in each status.
  useEffect(() => {
    if (!sr?.id) { setStatusHistory([]); return }
    let alive = true
    ;(async () => {
      const { data: rows } = await sb.from('service_request_status_history')
        .select('status_code, entered_at, changed_by, status:status_id(value_ar,value_en)')
        .eq('service_request_id', sr.id)
        .order('entered_at', { ascending: true })
      if (!alive) return
      setStatusHistory(rows || [])
      const ids = [...new Set((rows || []).map(r => r.changed_by).filter(Boolean))]
      if (ids.length) {
        const { data: us } = await sb.from('users').select('id, person:person_id(name_ar,name_en)').in('id', ids)
        if (!alive) return
        const map = {}
        ;(us || []).forEach(u => { map[u.id] = (isAr ? (u.person?.name_ar || u.person?.name_en) : (u.person?.name_en || u.person?.name_ar)) || '' })
        setActorNames(map)
      } else setActorNames({})
    })()
    return () => { alive = false }
  }, [sr?.id, sb, statusTick, isAr])

  // Load attachments for all iqama rows (medical exam, Muqeem file, iqama photo) — shown per-visa.
  useEffect(() => {
    const ids = Object.values(iqamaRows).map(r => r.id).filter(Boolean)
    if (!ids.length) { setIqamaAttachments([]); return }
    let alive = true
    ;(async () => {
      const { data: rows } = await sb.from('attachments')
        .select('id,entity_id,file_name,file_url,notes,size_bytes,created_at')
        .eq('entity_type', 'iqama_issuance_application')
        .in('entity_id', ids)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (alive) setIqamaAttachments(rows || [])
    })()
    return () => { alive = false }
  }, [iqamaRows, sb])

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Normalize work_visa_permanent / work_visa_temporary down to 'work_visa' so the SELECTS/TABLES
      // lookups hit the same query path for every visa variant.
      const rawCode = sr.service_type?.code
      const code = /^work_visa(_|$)/.test(rawCode || '') ? 'work_visa' : rawCode

      const SELECTS = {
        work_visa: `id,visa_number,visa_cost,border_number,wakalah_number,wakalah_date,wakalah_office,wakalah_price_1,wakalah_price_2,visa_used,gender,file_number,
          main_facility:main_facility_id(id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number,qiwa_subscription_active),
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
        other: `id,description,details,worker_phone,
          worker:worker_id(id,name_ar,name_en,iqama_number,phone,nationality:nationality_id(code,name_ar,flag_url)),
          worker_facility:worker_facility_id(name_ar,unified_number,hrsd_number,gosi_number)`,
        supplier_payroll: `id,description,worker_phone,unpaid_salaries_count,total_amount,
          worker:worker_id(name_ar,name_en,iqama_number,phone),
          worker_facility:worker_facility_id(name_ar,unified_number,hrsd_number,gosi_number)`,
      }
      const TABLES = { work_visa: 'visa_applications', transfer: 'transfer_applications', ajeer: 'ajeer_applications', iqama_renewal: 'iqama_renewal_applications', iqama_issuance: 'iqama_issuance_applications', other: 'other_applications', supplier_payroll: 'supplier_payroll_applications' }
      // Registry-driven tabs (passport_update, documents, zatca, …) all live in other_applications,
      // storing their service-specific fields in the `details` JSONB column.
      const isRegistry = !!TXN_SERVICES[code]
      const tbl = TABLES[code] || (isRegistry ? 'other_applications' : undefined)
      const sel = SELECTS[code] || (isRegistry ? SELECTS.other : undefined)

      const [det, inv, agents, fees] = await Promise.all([
        tbl ? sb.from(tbl).select(sel).eq('service_request_id', sr.id) : Promise.resolve({ data: [] }),
        sb.from('invoices').select('id,invoice_no,total_amount,paid_amount,remaining_amount,status:status_id(code,value_ar,value_en),payment_plan,installments_count,created_at,creator:created_by(person:person_id(name_ar,name_en))').eq('service_request_id', sr.id).is('deleted_at', null),
        sb.from('service_request_agents').select('commission_amount,agent:agent_id(name_ar,name_en,phone)').eq('service_request_id', sr.id),
        code === 'transfer' ? sb.from('transfer_application_fees').select('id,amount,is_official,bank_note,sadad_no,payment_date,fee_kind:fee_kind_id(value_ar,value_en,code),status:status_id(value_ar,value_en),transfer_application_id').is('deleted_at', null) : Promise.resolve({ data: [] }),
      ])

      const detIds = (det.data || []).map(d => d.id)
      const filteredFees = (fees.data || []).filter(f => detIds.includes(f.transfer_application_id))

      if (alive) setData({ loading: false, code, det: det.data || [], inv: inv.data || [], agents: agents.data || [], fees: filteredFees })
    })()
    return () => { alive = false }
  }, [sb, sr.id, sr.service_type?.code])

  // Load the full installments schedule («الدفعات») for this request's invoice — every
  // tranche (issuance / authorization / residence / …) with its milestone label & status.
  useEffect(() => {
    const invId = (!data.loading && data.inv.length > 0) ? data.inv[0].id : null
    if (!invId) { setInstallments([]); return }
    let alive = true
    ;(async () => {
      const { data: rows } = await sb.from('installments')
        .select('id,installment_order,total_amount,paid_amount,expected_date,paid_date,notes,visa_application_id,payment_milestone:payment_milestone_id(value_ar,value_en)')
        .eq('invoice_id', invId).is('deleted_at', null).order('installment_order')
      if (alive) setInstallments(rows || [])
    })()
    return () => { alive = false }
  }, [sb, data.loading, data.inv])

  // Payment gate: milestone installments (milestone held in `notes`) decide when each step unlocks.
  // Schedule shape: one combined «إصدار التأشيرة والتوكيل» tranche (transaction-level) + one
  // «إصدار الإقامة» tranche per visa (visa-linked). No milestone schedule → nothing to gate.
  const payGate = useMemo(() => {
    const isIss = n => /إصدار\s*التأشيرة/.test(n || '')
    const isWak = n => /توكيل/.test(n || '')
    const isIqa = n => /إصدار\s*الإقامة|الإقامة/.test(n || '')
    const isPaid = it => Number(it.total_amount || 0) <= 0 || Number(it.paid_amount || 0) >= Number(it.total_amount || 0)
    const byVisa = {}
    installments.forEach(it => {
      const v = it.visa_application_id
      if (!v) return
      if (!byVisa[v]) byVisa[v] = { iss: [] }
      if (isIss(it.notes)) byVisa[v].iss.push(it)
    })
    const issAll = installments.filter(it => isIss(it.notes))
    const wakAll = installments.filter(it => isWak(it.notes))
    const iqaAll = installments.filter(it => isIqa(it.notes))
    const issuanceSettled = issAll.length === 0 ? true : issAll.every(isPaid)
    const wakalahSettled = wakAll.length === 0 ? true : wakAll.every(isPaid)
    // لا يوجد جدول مراحل (التأشيرة المؤقتة دفعة واحدة بلا مسمّيات، أو بيانات قديمة): البوابة تعتمد على
    // سداد الفاتورة كاملةً (كل الدفعات مسدّدة) بدلاً من الفتح مجاناً — كي لا يُتجاوز قفل الدفع.
    const invoiceSettled = installments.length > 0 && installments.every(isPaid)
    return {
      // Visa data entry for a visa: its «إصدار التأشيرة» tranche is paid (per-visa link), falling
      // back to the shared transaction-level issuance tranche, then to full-invoice settlement.
      issuancePaidForVisa: vid => {
        const g = byVisa[vid]
        if (g && g.iss.length) return g.iss.every(isPaid)
        const txnIss = installments.filter(it => !it.visa_application_id && isIss(it.notes))
        if (txnIss.length) return txnIss.every(isPaid)
        return invoiceSettled
      },
      // قفل تسجيل الإقامة لكل تأشيرة على حدة: «إصدار التأشيرة» و«التوكيل» مسدّدتان، ودفعةُ إقامة هذه
      // التأشيرة بالذات مسدّدة بالكامل (لا يكفي سداد إقامة تأشيرة أخرى). للمؤقتة: سداد الفاتورة كاملةً.
      iqamaReadyForVisa: vid => {
        if (!(issuanceSettled && wakalahSettled)) return false
        const res = installments.filter(it => it.visa_application_id === vid && isIqa(it.notes))
        if (res.length) return res.every(isPaid)
        return invoiceSettled
      },
      // (مُبقاة للتوافق) جاهزية الإقامة على مستوى المعاملة — مع إغلاق ثغرة «بلا جدول» للمؤقتة.
      iqamaReady: issuanceSettled && wakalahSettled && (iqaAll.length === 0 ? invoiceSettled : iqaAll.some(isPaid)),
    }
  }, [installments])

  const svc = svcThemeFor(sr.service_type)
  const effStatusCode = statusOverride || sr.status?.code || 'in_progress'
  const st  = STATUS_THEME[effStatusCode] || STATUS_THEME.in_progress
  // المعاملة الملغاة (أو المنجزة) للقراءة فقط: لا تُفتح نوافذ التعديل/الإضافة (نظير cancelledRO في الفاتورة).
  // يمنع توليد عمل أقسام جديد (إقامة/توزيع منشأة/بيانات تأشيرة) على معاملة أُلغيت ماليًا.
  const readOnly = effStatusCode === 'cancelled' || effStatusCode === 'done'
  const guardEdit = (fn) => { if (readOnly) { toast?.(T('المعاملة ملغاة — التعديل غير متاح','Transaction cancelled — editing is disabled'), 'error'); return } fn() }

  // Footer row placed INSIDE each lifecycle card: who entered it + when, plus an edit button.
  const renderCardActor = (code, onEdit) => {
    const EDIT_CODE = { facility_set: 'facility_edited', visa_issued: 'visa_edited', iqama_issued: 'iqama_edited' }
    const p2 = n => String(n).padStart(2, '0')
    const toInfo = (ev) => { const d = new Date(ev.entered_at); return { name: actorNames[ev.changed_by] || '—', date: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`, time: `${p2(d.getHours())}:${p2(d.getMinutes())}` } }
    const ev = statusHistory.find(h => h.status_code === code)
    const editEv = EDIT_CODE[code] ? statusHistory.filter(h => h.status_code === EDIT_CODE[code]).at(-1) : null
    const info = ev ? toInfo(ev) : null
    const editInfo = editEv ? toInfo(editEv) : null
    if (!info && !editInfo && !onEdit) return null
    const lbl = { fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }
    const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }
    const dateStyle = { fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }
    return (
      <div style={{ marginTop: 2, paddingTop: 12, borderTop: '1px solid rgba(212,160,23,.18)', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {info && (
          <div style={rowStyle}>
            <span style={lbl}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span style={{ color: 'var(--tx2)' }}>{info.name}</span>
            </span>
            <span style={dateStyle}>{info.date} {info.time}</span>
          </div>
        )}
        {editInfo && (
          <div style={rowStyle}>
            <span style={lbl}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              <span style={{ color: 'var(--tx2)' }}>{T('تم التعديل من قبل','Edited by')} {editInfo.name}</span>
            </span>
            <span style={dateStyle}>{editInfo.date} {editInfo.time}</span>
          </div>
        )}
        {onEdit && (
          <button type="button" onClick={onEdit} style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, cursor: 'pointer', fontFamily: F, fontSize: 11, fontWeight: 700 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.2)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            {T('تعديل','Edit')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 60, color: 'var(--tx2)' }}>
      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
      </div>

      {/* Header — title + service tag + ref + branch + date + status (matches InvoiceDetailPage header) */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', lineHeight: 1 }}>{isAr ? svc.label_ar : svc.label_en}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>{(() => {
          const code = sr.service_type?.code
          if (code === 'supplier_payroll') return T('تفاصيل طلب رواتب السبلاير للعامل ومجريات المعاملة.','Supplier-payroll request details for the worker and the transaction timeline.')
          if (code === 'general') return T('بيانات العميل والعامل والمنشأة وحالة الطلب وإجراءاته.','Client, worker and facility data, request status and its actions.')
          // Registry-driven tabs each carry their own description in the service registry (hero).
          const reg = TXN_SERVICES[code]
          if (reg?.hero) return isAr ? reg.hero.dAr : reg.hero.dEn
          // Work-visa keeps its visa-centric description; any other built-in gets a neutral one.
          if (/^work_visa/.test(code || '')) return T('بيانات الطلب والتأشيرات وحالة المعاملة والفواتير والمدفوعات المرتبطة بها.','Request data, visas, status, and related invoices and payments.')
          return T('بيانات الطلب وحالة المعاملة والفواتير والمدفوعات المرتبطة بها.','Request data, status, and related invoices and payments.')
        })()}</div>
      </div>

      {/* Main 2-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        {/* Left column — content cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* العامل والمنشأة — رواتب سبلاير: كرت موحّد يستبدل كرت «العميل والعامل» وكرت «المنشأة»، بنفس تخطيط الخدمة العامة */}
          {sr.service_type?.code === 'supplier_payroll' && !data.loading && data.code === 'supplier_payroll' && (() => {
            const d = data.det?.[0]
            const worker = d?.worker ? { ...d.worker, phone: d.worker_phone || d.worker.phone } : null
            const facility = data.det?.map(x => x.worker_facility).find(Boolean) || null
            if (!worker && !facility) return null
            return (
              <div style={cardChrome}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                  <span style={cardTitle}>{T('العامل والمنشأة','Worker & Facility')}</span>
                </div>
                <div style={{ padding: '16px 22px' }}>
                  <WorkerFacilityHero worker={worker} facility={facility} T={T} />
                </div>
              </div>
            )
          })()}

          {/* Client card — hidden for supplier_payroll (replaced by the «العامل والمنشأة» hero card above) */}
          {sr.service_type?.code !== 'supplier_payroll' && (
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              {(() => {
                const oaSrc = sr.supplier_payroll_applications ?? sr.other_applications
                const oaWorker = Array.isArray(oaSrc) ? oaSrc[0]?.worker : oaSrc?.worker
                const isClientWorker = !sr.client && !!oaWorker
                return <span style={cardTitle}>{isClientWorker ? T('العميل والعامل','Client & Worker') : T('العميل','Client')}</span>
              })()}
              {(() => {
                const oaSrc = sr.supplier_payroll_applications ?? sr.other_applications
                const oaWorker = Array.isArray(oaSrc) ? oaSrc[0]?.worker : oaSrc?.worker
                const nat = sr.client?.nationality || oaWorker?.nationality
                if (!nat) return null
                const fl = nat.flag_url
                const em = flagEmoji(nat.code)
                return fl
                  ? <img src={fl} alt={nat.name_ar || ''} title={nat.name_ar || ''} style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                  : (em ? <span title={nat.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{em}</span> : null)
              })()}
            </div>
            <ClientRows sr={sr} T={T} />
            {(() => {
              // سجلّ تعديل بيانات العميل (من clients.edit_log) — مقصور على القيود التي تمّت من فاتورة هذه المعاملة.
              const allLog = Array.isArray(sr.client?.edit_log) ? sr.client.edit_log : []
              const invIds = (data.inv || []).map(i => i.id)
              const log = allLog.filter(e => e && (invIds.length ? invIds.includes(e.inv) : true))
              if (!log.length) return null
              const LBL = { name: ['الاسم', 'Name'], id: ['رقم الهوية', 'ID Number'], phone: ['رقم الجوال', 'Phone'], nationality: ['الجنسية', 'Nationality'] }
              const showVal = (field, v) => v ? (field === 'phone' ? fmtPhone(v) : v) : '—'
              return (
                <div style={{ padding: '0 22px 16px' }}>
                  <ChangeLog T={T} title={T('سجل تعديل بيانات العميل', 'Client edit log')} entries={log}
                    actionLabel={T('تم تعديل بيانات العميل', 'Client details edited')}
                    renderDetail={c => <FieldChanges T={T} changes={c.changes} LBL={LBL} showVal={showVal} />} />
                </div>
              )
            })()}
          </div>
          )}

          {/* Visa files — DISPLAY-ONLY card per FILE. Every section carries its own button
              that opens a FormKit popup: facility picking, the Qiwa-subscription payment,
              and the issuance data (shared visa number + per-visa border numbers + PDF).
              Saves commit from the popups; permanent visas cap at 4 per facility. */}
          {!data.loading && data.code === 'work_visa' && data.det.length > 0 && (() => {
            const det = data.det || []
            const isTemp = sr.service_type?.code === 'work_visa_temporary'
            const visaList = [...det].sort((a, b) => ((a.file_number ?? 0) - (b.file_number ?? 0)))
            const byFile = new Map()
            visaList.forEach(d => { const fn = d.file_number ?? 0; if (!byFile.has(fn)) byFile.set(fn, []); byFile.get(fn).push(d) })
            const files = [...byFile.entries()].map(([fn, rows]) => ({ fn, rows }))
            const arOrd = ['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر']
            const enOrd = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth']
            const fileTitle = idx => files.length === 1
              ? (visaList.length === 1 ? T('التأشيرة','Visa') : T('ملف التأشيرات','Visa File'))
              : T(`الملف ${arOrd[idx] || idx + 1}`, `${enOrd[idx] || 'File ' + (idx + 1)} File`)
            const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || T('تأشيرة','Visa')
            const occOf = r => (isAr ? r.occupation?.name_ar : (r.occupation?.name_en || r.occupation?.name_ar)) || ''
            const embOf = r => (isAr ? r.embassy?.name_ar : (r.embassy?.name_en || r.embassy?.name_ar)) || ''
            const genOf = r => r.gender === 'female' ? T('أنثى','Female') : r.gender === 'male' ? T('ذكر','Male') : ''
            const globalIdx = d => visaList.indexOf(d) + 1
            const dbFacOfFile = rows => rows.find(r => r.main_facility?.id)?.main_facility || null
            const visasNoFac = files.reduce((s, { rows }) => s + (dbFacOfFile(rows) ? 0 : rows.length), 0)
            const fm = v => Number(v || 0).toLocaleString('en-US')
            const pillS = c => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, padding: '3px 10px', borderRadius: 999, color: c, background: c + '1f', border: '1px solid ' + c + '55' })
            const numChip = (n) => (
              <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
            )
            const SecLabel = ({ children }) => (
              <span style={{ fontSize: 11, color: C.gold, fontWeight: 600, letterSpacing: '.4px' }}>{children}</span>
            )
            const CardActionBtn = ({ onClick, disabled = false, color = C.gold, children }) => (
              <button type="button" disabled={disabled} onClick={onClick}
                style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + (disabled ? 'rgba(255,255,255,.12)' : color + '80'), color: disabled ? 'var(--tx4)' : color, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 7, flexDirection: 'row-reverse', whiteSpace: 'nowrap', transition: 'background .15s ease, border-color .15s ease' }}
                onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = color + '1f' }}
                onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = 'transparent' }}>
                {children}
              </button>
            )
            const PlusMini = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            const CheckMini = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            const ClockMini = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>

            // تحديث صفوف الملف محلياً بعد حفظ المنشأة من النافذة
            const applyFacility = (ids, fac) => {
              setData(prev => ({ ...prev, det: (prev.det || []).map(d => ids.includes(d.id) ? { ...d, main_facility_id: fac?.id || null, main_facility: fac ? { ...fac } : null } : d) }))
              setFeesTick(t => t + 1)
            }
            const markSubActive = async (dbF) => {
              const { error } = await sb.from('facilities').update({ qiwa_subscription_active: true }).eq('id', dbF.id)
              if (error) { toast?.(T('تعذر الحفظ','Save failed'), 'error'); return }
              setData(prev => ({ ...prev, det: (prev.det || []).map(d => d.main_facility?.id === dbF.id ? { ...d, main_facility: { ...d.main_facility, qiwa_subscription_active: true } } : d) }))
              toast?.(T('تم تأكيد وجود اشتراك قوى فعّال','Active Qiwa subscription confirmed'))
            }
            // رسوم التأشيرة — إرسال مباشر بدون نافذة: السداد = الرقم الموحد والمبلغ ثابت محسوب
            const sendVisaFee = async (fn, rows, dbF) => {
              if (sendingVisaFee[fn]) return
              const setting = feeSettings.visa_fee || {}
              const unit = Number(setting.fixed_amount) > 0 ? Number(setting.fixed_amount) : 2000
              const amount = unit * rows.length
              const sadad = dbF?.unified_number || ''
              if (!sadad) { toast?.(T('لا يوجد رقم موحد للمنشأة','The facility has no unified number'), 'error'); return }
              setSendingVisaFee(s => ({ ...s, [fn]: true }))
              try {
                const { error } = await sb.from('transaction_fees').insert({
                  service_request_id: sr.id, facility_id: dbF.id, file_number: fn,
                  fee_label_ar: setting.label_ar || 'رسوم التأشيرة', fee_label_en: setting.label_en || 'Visa Fees',
                  amount, sadad_no: sadad, status: 'pending', notes: 'manual_pay_request',
                  created_by: user?.id || null,
                })
                if (error) throw error
                toast?.(T('أُرسل طلب السداد إلى سدادات الخدمات','Payment request sent to Service Payments'))
                setFeesTick(t => t + 1)
              } catch { toast?.(T('تعذر إرسال الطلب','Could not send the request'), 'error') }
              finally { setSendingVisaFee(s => { const n = { ...s }; delete n[fn]; return n }) }
            }

            const subModalFile = subFeeModal != null ? files.find(x => x.fn === subFeeModal) : null
            const issModalFile = issuanceModal != null ? files.find(x => x.fn === issuanceModal) : null
            // ── تجميع الملفات في «منشآت»: كل منشأة (نفس main_facility) كرت واحد يضمّ ملفاتها وبيانات تأشيراتها؛
            //    أي ملف بلا منشأة يظهر ككرت مستقل بانتظار اختيارها. عدد التأشيرات ثابت من الفاتورة — «إضافة منشأة»
            //    تعيد فقط توزيع التأشيرات (تغيير main_facility) ولا تنشئ سجلات جديدة. ──
            const establishments = (() => {
              const out = []; const byFac = new Map(); let unassigned = null
              files.forEach(f => {
                const fac = dbFacOfFile(f.rows)
                if (fac?.id) {
                  let g = byFac.get(fac.id)
                  if (!g) { g = { key: 'fac-' + fac.id, facility: fac, files: [] }; byFac.set(fac.id, g); out.push(g) }
                  g.files.push(f)
                } else {
                  // كل التأشيرات غير المُسندة في كرت واحد «اختر المنشأة» — تُختار مرة واحدة ثم تُوزَّع عبر «إضافة منشأة».
                  if (!unassigned) { unassigned = { key: 'unassigned', facility: null, files: [] }; out.push(unassigned) }
                  unassigned.files.push(f)
                }
              })
              return out.map(g => ({ ...g, rows: g.files.flatMap(f => f.rows) }))
            })()
            const facModalEst = facModal != null ? establishments.find(e => e.key === facModal) : null
            // التأشيرات القابلة لإعادة التوزيع = التي لم تُصدر بعد (لا رقم تأشيرة ولا رقم حدود)
            const unissuedVisas = visaList.filter(v => !v.visa_number && !v.border_number)
            const estTitle = (ei) => establishments.length === 1
              ? T('المنشأة','Facility')
              : T(`المنشأة ${arOrd[ei] || ei + 1}`, `${enOrd[ei] || 'Establishment ' + (ei + 1)}`)
            // كرت المنشأة (هيرو) أو زر اختيارها — التغيير يُطبَّق على كل تأشيرات المنشأة دفعة واحدة
            const renderFacilityBlock = (est) => {
              const dbF = est.facility
              if (!dbF) return (
                <button type="button" onClick={() => guardEdit(() => setFacModal(est.key))}
                  style={{ width: '100%', cursor: 'pointer', fontFamily: F, border: '1.5px dashed rgba(212,160,23,.38)', background: 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))', borderRadius: 16, padding: '26px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, transition: 'border-color .15s ease, background .15s ease, transform .15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.7)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.1),rgba(255,255,255,.022))' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.38)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))' }}>
                  <div style={{ position: 'relative', width: 54, height: 54, borderRadius: 15, background: 'rgba(212,160,23,.09)', border: '1.5px dashed rgba(212,160,23,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={27} color={C.gold} strokeWidth={1.6} />
                    <span style={{ position: 'absolute', insetInlineEnd: -5, bottom: -5, width: 19, height: 19, borderRadius: '50%', background: C.gold, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #242424' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-.1px' }}>{T('لم يتم تحديد المنشأة بعد','No facility selected yet')}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 300 }}>{T('اضغط هنا لتحديد المنشأة وبدء المعاملة','Click here to set the facility and start')}</span>
                  </div>
                </button>
              )
              const facName = (isAr ? dbF.name_ar : (dbF.name_en || dbF.name_ar)) || '—'
              const cells = [
                { label: T('الرقم الموحد','Unified No'), value: dbF.unified_number },
                { label: T('رقم التأمينات','GOSI No'), value: dbF.gosi_number },
                { label: T('رقم الموارد البشرية','HRSD No'), value: dbF.hrsd_number },
              ].filter(c => c.value)
              return (
                <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={24} color={C.gold} strokeWidth={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{facName}</span>
                      {dbF.name_en && dbF.name_ar && dbF.name_en !== dbF.name_ar && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .7 }}>{dbF.name_en}</span>}
                    </div>
                    <button type="button" onClick={() => guardEdit(() => setFacModal(est.key))} title={T('تغيير','Change')} aria-label={T('تغيير','Change')} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: C.gold, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.16)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </button>
                  </div>
                  {cells.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, cells.length)},1fr)`, gap: 8 }}>
                      {cells.map((c, i) => (
                        <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ minWidth: 0, fontSize: 13, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value}</span>
                            <CopyRefBtn value={c.value} title={T('نسخ','Copy')} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {renderCardActor('facility_set', null)}
                </div>
              )
            }
            // قسم تأشيرات الملف داخل كرت المنشأة — رقم تأشيرة مشترك + أرقام الحدود + ملف PDF (نفس حالات القفل/الدفع/الإصدار)
            const renderVisaFile = (file, dbF) => {
              const { fn, rows } = file
              const lock = !dbF
              const dbVisaNo = rows.find(r => r.visa_number)?.visa_number || ''
              const visaEmpty = !dbVisaNo && !rows.some(r => r.border_number)
              const visaPayLocked = !rows.every(r => payGate.issuancePaidForVisa(r.id))
              const visaLabel = rows.length > 1 ? T('التأشيرات','Visas') : T('التأشيرة','Visa')
              const filePdfs = visaAttachments.filter(a => a.notes === 'visa_pdf' && rows.some(r => r.id === a.entity_id))
              const specLine = [natOf(rows[0]), occOf(rows[0]), embOf(rows[0]), genOf(rows[0])].filter(Boolean).join(' · ')
              return (
                <div key={fn} style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, background: 'rgba(0,0,0,.12)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileTextIco size={14} color={C.gold} strokeWidth={2} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)', flexShrink: 0 }}>{visaLabel}</span>
                    {specLine && <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>· {specLine}</span>}
                    <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{rows.length} {rows.length > 1 ? T('تأشيرات','visas') : T('تأشيرة','visa')}</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    {visaEmpty ? (lock ? (
                      <div style={{ width: '100%', border: '1.5px dashed rgba(255,255,255,.12)', background: 'rgba(255,255,255,.015)', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(255,255,255,.03)', border: '1.5px dashed rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileTextIco size={23} color={C.gray} strokeWidth={1.6} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx3)', letterSpacing: '-.1px' }}>{T('بيانات التأشيرة','Visa data')}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 300 }}>{T('حدِّد المنشأة أولًا لإدخال بيانات التأشيرة.','Select the facility first to enter visa data.')}</span>
                        </div>
                      </div>
                    ) : visaPayLocked ? (
                      <div style={{ width: '100%', border: '1.5px dashed rgba(234,179,8,.3)', background: 'rgba(234,179,8,.05)', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(234,179,8,.1)', border: '1.5px dashed rgba(234,179,8,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: C.warn, letterSpacing: '-.1px' }}>{T('بانتظار سداد دفعة إصدار التأشيرة','Awaiting visa-issuance payment')}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 320 }}>{T('لا يمكن إدخال بيانات التأشيرة حتى تُسدَّد دفعة «عند إصدار التأشيرة» من شاشة المدفوعات.','Visa data stays locked until the “on visa issuance” installment is paid in Payments.')}</span>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => guardEdit(() => setIssuanceModal(fn))}
                        style={{ width: '100%', cursor: 'pointer', fontFamily: F, border: '1.5px dashed rgba(212,160,23,.38)', background: 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, transition: 'border-color .15s ease, background .15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.7)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.1),rgba(255,255,255,.022))' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.38)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))' }}>
                        <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 13, background: 'rgba(212,160,23,.09)', border: '1.5px dashed rgba(212,160,23,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileTextIco size={23} color={C.gold} strokeWidth={1.6} />
                          <span style={{ position: 'absolute', insetInlineEnd: -5, bottom: -5, width: 19, height: 19, borderRadius: '50%', background: C.gold, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #242424' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-.1px' }}>{T('لم تُدخل بيانات التأشيرة بعد','No visa data entered yet')}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 300 }}>{T('اضغط هنا لإدخال رقم التأشيرة وأرقام الحدود وملف التأشيرة','Click here to enter the visa & border numbers and visa file')}</span>
                        </div>
                      </button>
                    )) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileTextIco size={21} color={C.gold} strokeWidth={1.8} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('رقم التأشيرة (مشترك للملف)','Visa No. (shared)')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: 18, fontWeight: 600, color: dbVisaNo ? C.gold : 'var(--tx5)', direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{dbVisaNo || '—'}</span>
                              {dbVisaNo && <CopyRefBtn value={dbVisaNo} title={T('نسخ','Copy')} />}
                            </div>
                          </div>
                          <button type="button" onClick={() => guardEdit(() => setIssuanceModal(fn))} title={T('تعديل','Edit')} aria-label={T('تعديل','Edit')} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: C.gold, cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.16)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {rows.map(d => {
                            const sub = [embOf(d), occOf(d), genOf(d)].filter(Boolean).join(' · ')
                            return (
                              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.05)' }}>
                                {numChip(globalIdx(d))}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, color: 'var(--tx1)', fontWeight: 600 }}>{natOf(d)}</div>
                                  {sub && <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
                                </div>
                                <div style={{ textAlign: 'start', flexShrink: 0 }}>
                                  <div style={{ fontSize: 9, color: 'var(--tx4)', fontWeight: 600 }}>{T('رقم الحدود','Border')}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontFamily: 'monospace', direction: 'ltr', fontSize: 12.5, fontWeight: 600, color: d.border_number ? C.gold : 'var(--tx5)', fontVariantNumeric: 'tabular-nums' }}>{d.border_number || '—'}</span>
                                    {d.border_number && <CopyRefBtn value={d.border_number} title={T('نسخ','Copy')} />}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {filePdfs.length > 0 && filePdfs.map(a => (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.06)', textDecoration: 'none' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name || '—'}</span>
                          </a>
                        ))}
                        {renderCardActor('visa_issued', null)}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            return (
              <>
                {/* ── كرت الخدمة — ملخّص ما هي الخدمة المطلوبة وحالتها ── */}
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
                    <span style={{ ...cardTitle, color: C.blue }}>{isAr ? svc.label_ar : svc.label_en}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* بيانات التأشيرة — مجموعات حسب المواصفات؛ كل مجموعة كرت بعددها (الكمية) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(() => {
                        // اجمع التأشيرات المتطابقة (الجنسية·المهنة·السفارة·الجنس) في مجموعة واحدة بعدّاد
                        const seen = new Map(); const groups = []
                        visaList.forEach(d => {
                          const key = [natOf(d), occOf(d), embOf(d), genOf(d)].join('§')
                          let g = seen.get(key)
                          if (!g) { g = { key, sample: d, count: 0 }; seen.set(key, g); groups.push(g) }
                          g.count++
                        })
                        return groups.map((g, gi) => {
                          const d = g.sample
                          const cells = [
                            { l: T('الجنسية','Nationality'), v: natOf(d) },
                            { l: T('المهنة','Occupation'), v: occOf(d) },
                            { l: T('السفارة','Embassy'), v: embOf(d) },
                            { l: T('الجنس','Gender'), v: genOf(d) },
                          ]
                          return (
                            <div key={g.key} style={{ display: 'flex', alignItems: 'stretch', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.14)', border: '1px solid rgba(255,255,255,.05)' }}>
                              {/* عدّاد الكمية — عمود سماوي جانبي يوضّح عدد التأشيرات في المجموعة */}
                              <div style={{ flexShrink: 0, width: 58, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 9, background: 'rgba(93,173,226,.1)', border: '1px solid rgba(93,173,226,.3)' }}>
                                <span style={{ fontSize: 22, color: C.blue, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{num(g.count)}</span>
                                <span style={{ fontSize: 9, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.2px' }}>{g.count > 1 ? T('تأشيرات','visas') : T('تأشيرة','visa')}</span>
                              </div>
                              {/* المواصفات */}
                              <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', alignContent: 'center' }}>
                                {cells.map((c, i) => (
                                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                                    <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px' }}>{c.l}</span>
                                    <span style={{ fontSize: 12.5, color: 'var(--tx1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.v || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                    {sr.note && (
                      <div style={{ padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.14)', border: '1px solid rgba(255,255,255,.05)', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px' }}>{T('ملاحظات','Notes')}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--tx1)', fontWeight: 600, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{sr.note}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Slim overview strip — multi-establishment only */}
                {establishments.filter(e => e.facility).length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 14, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>{T('المنشآت','Facilities')} <span style={{ color: 'var(--tx1)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{establishments.filter(e => e.facility).length}</span></span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>{T('التأشيرات','Visas')} <span style={{ color: 'var(--tx1)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{visaList.length}</span></span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.2)' }} />
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>{T('مرتبطة بمنشأة','With facility')} <span style={{ color: visasNoFac ? C.warn : C.gold, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{visaList.length - visasNoFac}/{visaList.length}</span></span>
                    <span style={{ flex: 1, minWidth: 70, height: 4, borderRadius: 999, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.round(((visaList.length - visasNoFac) / Math.max(1, visaList.length)) * 100)}%`, background: C.gold, transition: 'width .25s' }} />
                    </span>
                    {!isTemp && <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{T('بحد أقصى 4 تأشيرات / منشأة','max 4 visas / facility')}</span>}
                  </div>
                )}

                {establishments.map((est, ei) => {
                  const dbF = est.facility
                  const facName = dbF ? ((isAr ? dbF.name_ar : (dbF.name_en || dbF.name_ar)) || '—') : null
                  const cap = est.rows.length
                  // كرت المنشأة غير المُسندة (المنشأة الأولى/الجديدة): اختيار المنشأة + التأشيرات + طريقة الملف عبر المعالج (خطوتان)
                  if (!dbF) return (
                    <div key={est.key} style={cardChrome}>
                      <div style={cardHeader}>
                        <StepBadge n={ei + 1} c={C.gold} />
                        <span style={cardTitle}>{estTitle(ei)}</span>
                        {!isTemp && <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--tx4)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{cap} {cap > 1 ? T('تأشيرات','visas') : T('تأشيرة','visa')}</span>}
                      </div>
                      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {est.rows.map(d => {
                            const sub = [embOf(d), occOf(d), genOf(d)].filter(Boolean).join(' · ')
                            return (
                              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
                                {numChip(globalIdx(d))}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, color: 'var(--tx1)', fontWeight: 600 }}>{natOf(d)}</div>
                                  {sub && <div style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <button type="button" onClick={() => guardEdit(() => setDistModal(true))}
                          style={{ width: '100%', cursor: 'pointer', fontFamily: F, border: '1.5px dashed rgba(212,160,23,.42)', background: 'linear-gradient(135deg,rgba(212,160,23,.06),rgba(255,255,255,.012))', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, transition: 'border-color .15s ease, background .15s ease' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.75)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.11),rgba(255,255,255,.022))' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.42)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.06),rgba(255,255,255,.012))' }}>
                          <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 14, background: 'rgba(212,160,23,.09)', border: '1.5px dashed rgba(212,160,23,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={24} color={C.gold} strokeWidth={1.6} />
                            <span style={{ position: 'absolute', insetInlineEnd: -5, bottom: -5, width: 19, height: 19, borderRadius: '50%', background: C.gold, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #242424' }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-.1px' }}>{T('اختر المنشأة وحدد التأشيرات','Pick establishment & select visas')}</span>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 320 }}>{T('خطوتان: اختيار المنشأة، ثم تحديد التأشيرات وطريقة الملف (ملف واحد أو منفصل)','Two steps: pick the establishment, then choose visas and file grouping')}</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  )
                  return (
                    <div key={est.key} style={cardChrome}>
                      <div style={cardHeader}>
                        <StepBadge n={ei + 1} c={C.gold} />
                        <span style={cardTitle}>{estTitle(ei)}</span>
                        {dbF && <span title={[facName, dbF.unified_number && (T('الرقم الموحد','Unified') + ': ' + dbF.unified_number), dbF.gosi_number && (T('رقم التأمينات','GOSI') + ': ' + dbF.gosi_number), dbF.hrsd_number && (T('رقم الموارد البشرية','HRSD') + ': ' + dbF.hrsd_number)].filter(Boolean).join('\n')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: C.gold, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.28)', borderRadius: 999, padding: '3px 10px', minWidth: 0, maxWidth: 320 }}>
                          <Building2 size={11} color={C.gold} strokeWidth={2} />
                          {dbF.unified_number && <span style={{ flexShrink: 0, color: 'var(--tx4)', fontWeight: 600, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontSize: 10 }}>{dbF.unified_number}</span>}
                        </span>}
                        {!isTemp && <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: cap > 4 ? C.warn : 'var(--tx4)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{cap}/4 {T('تأشيرات','visas')}</span>}
                      </div>
                      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {renderFacilityBlock(est)}
                        {est.files.map(f => renderVisaFile(f, dbF))}
                      </div>
                    </div>
                  )
                })}

                {/* ── «إضافة منشأة وتوزيع التأشيرات» — يظهر فقط حين لا يوجد كرت منشأة غير مُسندة (كل التأشيرات مُسندة) لتقسيمها على منشأة أخرى ── */}
                {!isTemp && unissuedVisas.length > 0 && !establishments.some(e => !e.facility) && (
                  <button type="button" onClick={() => guardEdit(() => setDistModal(true))}
                    style={{ width: '100%', cursor: 'pointer', fontFamily: F, border: '1.5px dashed rgba(212,160,23,.45)', background: 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))', borderRadius: 16, padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.gold, fontSize: 13, fontWeight: 700, transition: 'border-color .15s ease, background .15s ease' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.8)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.1),rgba(255,255,255,.02))' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))' }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(212,160,23,.14)', border: '1px solid rgba(212,160,23,.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </span>
                    <span>{T('إضافة منشأة وتوزيع التأشيرات','Add establishment & distribute visas')}</span>
                  </button>
                )}

                {/* النوافذ المنبثقة */}
                {facModalEst && (
                  <TxnFacilityPickModal sb={sb} toast={toast} T={T} isAr={isAr} isTemp={isTemp}
                    fileLabel={estTitle(establishments.indexOf(facModalEst))}
                    rows={facModalEst.rows} files={files} dbFacOfFile={dbFacOfFile}
                    currentId={facModalEst.facility?.id || null}
                    onClose={() => setFacModal(null)}
                    onSaved={fac => applyFacility(facModalEst.rows.map(r => r.id), fac)} />
                )}
                {subModalFile && dbFacOfFile(subModalFile.rows) && (
                  <TxnFeeModal sb={sb} user={user} toast={toast} T={T}
                    title={T('سداد اشتراك قوى','Qiwa subscription payment')}
                    setting={feeSettings.qiwa_subscription} labelFallbackAr="اشتراك قوى"
                    srId={sr.id} facilityId={dbFacOfFile(subModalFile.rows).id} fileNo={subModalFile.fn}
                    onClose={() => setSubFeeModal(null)} onDone={() => setFeesTick(t => t + 1)} />
                )}
                {issModalFile && (
                  <TxnIssuanceModal sb={sb} user={user} toast={toast} T={T} isAr={isAr}
                    fileLabel={fileTitle(files.indexOf(issModalFile))}
                    rows={issModalFile.rows}
                    metaOf={d => ({ idx: globalIdx(d), nat: natOf(d), sub: [embOf(d), occOf(d), genOf(d)].filter(Boolean).join(' · ') })}
                    onClose={() => setIssuanceModal(null)}
                    onSaved={updates => { setData(prev => ({ ...prev, det: (prev.det || []).map(d => updates[d.id] ? { ...d, ...updates[d.id] } : d) })); setStatusTick(t => t + 1) }} />
                )}
                {distModal && (
                  <TxnDistributeModal sb={sb} toast={toast} T={T} isAr={isAr} isTemp={isTemp}
                    visas={unissuedVisas} allDet={det} establishments={establishments}
                    natOf={natOf} occOf={occOf} embOf={embOf} genOf={genOf} globalIdx={globalIdx}
                    onClose={() => setDistModal(false)}
                    onSaved={changes => { setData(prev => ({ ...prev, det: (prev.det || []).map(d => changes[d.id] ? { ...d, ...changes[d.id] } : d) })); setFeesTick(t => t + 1) }} />
                )}
              </>
            )
          })()}

          {/* ── كرت الإقامات — كرت فرعي لكل تأشيرة (إصدار إقامة لكل عامل) ── */}
          {!data.loading && data.code === 'work_visa' && data.det.length > 0 && (() => {
            const visaList = [...data.det].sort((a, b) => ((a.file_number ?? 0) - (b.file_number ?? 0)))
            const natOf = r => (isAr ? r.nationality?.name_ar : (r.nationality?.name_en || r.nationality?.name_ar)) || ''
            const genOf = r => r.gender === 'female' ? T('أنثى','Female') : r.gender === 'male' ? T('ذكر','Male') : ''
            const doneCount = visaList.filter(v => iqamaRows[v.id]?.iqama_number).length
            const iqChip = n => <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
            const renderIqamaSub = (visa, vi) => {
              const r = iqamaRows[visa.id]
              const visaDone = !!(visa.visa_number || visa.border_number)
              const pdfFiles = iqamaAttachments.filter(a => a.notes === 'iqama_pdf' && r && a.entity_id === r.id)
              const passport = visaAttachments.find(a => a.notes === 'passport' && a.entity_id === visa.id)
              const durLabel = r?.iqama_duration_months ? (Number(r.iqama_duration_months) === 12 ? T('12 شهرًا','12 months') : T(`${r.iqama_duration_months} أشهر`, `${r.iqama_duration_months} months`)) : ''
              const cells = r ? [
                { l: T('اسم العامل','Worker name'), v: r.worker_name_at_entry, mono: false, copy: true },
                { l: T('رقم الحدود','Border No.'), v: visa.border_number, mono: true, copy: true },
                { l: T('انتهاء الإقامة','Iqama expiry'), v: r.iqama_expiry, mono: true },
                { l: T('مدة الإصدار','Duration'), v: durLabel, mono: false },
              ].filter(c => c.v) : []
              const ident = [natOf(visa), genOf(visa)].filter(Boolean).join(' · ')
              return (
                <div key={visa.id} style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, background: 'rgba(0,0,0,.12)', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {iqChip(vi + 1)}
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)', flexShrink: 0 }}>{T('الإقامة','Iqama')}</span>
                    {ident && <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>· {ident}</span>}
                    {visa.border_number && <span style={{ marginInlineStart: 'auto', fontSize: 10, color: 'var(--tx4)', fontWeight: 600, fontFamily: 'monospace', direction: 'ltr', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{T('حدود','Border')} {visa.border_number}</span>}
                  </div>
                  <div style={{ padding: 14 }}>
                    {r?.iqama_number ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CreditCard size={21} color={C.gold} strokeWidth={1.8} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('رقم الإقامة','Iqama No.')}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <span style={{ fontSize: 18, fontWeight: 600, color: C.gold, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{r.iqama_number}</span>
                              <CopyRefBtn value={r.iqama_number} title={T('نسخ','Copy')} />
                            </div>
                          </div>
                          <button type="button" onClick={() => guardEdit(() => setIqamaModalVisaId(visa.id))} title={T('تعديل','Edit')} aria-label={T('تعديل','Edit')} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: C.gold, cursor: 'pointer' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.16)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          </button>
                        </div>
                        {cells.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                            {cells.map((c, i) => (
                              <div key={i} style={{ background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.l}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ minWidth: 0, fontSize: 13, color: 'var(--tx2)', fontWeight: 600, direction: c.mono ? 'ltr' : 'rtl', textAlign: 'right', fontFamily: c.mono ? 'monospace' : F, fontVariantNumeric: c.mono ? 'tabular-nums' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.v}</span>
                                  {c.copy && <CopyRefBtn value={c.v} title={T('نسخ','Copy')} />}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {pdfFiles.map(a => (
                          <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 9, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.06)', textDecoration: 'none' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name || '—'}</span>
                          </a>
                        ))}
                        {passport && (() => {
                          const isImg = /\.(png|jpe?g|gif|webp|bmp)$/i.test(passport.file_name || passport.file_url || '')
                          return (
                            <div style={{ background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--tx3)', fontWeight: 700 }}>{T('صورة جواز العامل','Worker Passport')}</span>
                              {isImg && <a href={passport.file_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, lineHeight: 0 }}><img src={passport.file_url} alt="" style={{ width: 42, height: 30, objectFit: 'cover', borderRadius: 6, border: '1px solid rgba(255,255,255,.1)' }} /></a>}
                              <a href={passport.file_url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, fontSize: 11.5, color: C.gold, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                                {T('فتح','Open')}
                              </a>
                            </div>
                          )
                        })()}
                        {renderCardActor('iqama_issued', null)}
                      </div>
                    ) : !visaDone ? (
                      <div style={{ width: '100%', border: '1.5px dashed rgba(255,255,255,.12)', background: 'rgba(255,255,255,.015)', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(255,255,255,.03)', border: '1.5px dashed rgba(255,255,255,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CreditCard size={23} color={C.gray} strokeWidth={1.6} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx3)', letterSpacing: '-.1px' }}>{T('الإقامة','Iqama')}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 300 }}>{T('أدخل بيانات هذه التأشيرة أولًا لتسجيل الإقامة.','Enter this visa’s data first to record the iqama.')}</span>
                        </div>
                      </div>
                    ) : payGate.iqamaReadyForVisa(visa.id) ? (
                      <button type="button" onClick={() => guardEdit(() => setIqamaModalVisaId(visa.id))}
                        style={{ width: '100%', cursor: 'pointer', fontFamily: F, border: '1.5px dashed rgba(212,160,23,.38)', background: 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, transition: 'border-color .15s ease, background .15s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.7)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.1),rgba(255,255,255,.022))' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.38)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.05),rgba(255,255,255,.012))' }}>
                        <div style={{ position: 'relative', width: 48, height: 48, borderRadius: 13, background: 'rgba(212,160,23,.09)', border: '1.5px dashed rgba(212,160,23,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CreditCard size={23} color={C.gold} strokeWidth={1.6} />
                          <span style={{ position: 'absolute', insetInlineEnd: -5, bottom: -5, width: 19, height: 19, borderRadius: '50%', background: C.gold, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #242424' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx1)', letterSpacing: '-.1px' }}>{T('لم تُسجَّل الإقامة بعد','No iqama recorded yet')}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 300 }}>{T('اضغط هنا لتسجيل بيانات الإقامة لهذا العامل','Click here to record this worker’s iqama data')}</span>
                        </div>
                      </button>
                    ) : (
                      <div style={{ width: '100%', border: '1.5px dashed rgba(234,179,8,.3)', background: 'rgba(234,179,8,.05)', borderRadius: 14, padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 13, background: 'rgba(234,179,8,.1)', border: '1.5px dashed rgba(234,179,8,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: C.warn, letterSpacing: '-.1px' }}>{T('بانتظار سداد دفعات التأشيرة والإقامة','Awaiting visa & iqama payments')}</span>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.65, maxWidth: 320 }}>{T('لا يمكن تسجيل الإقامة حتى تُسدَّد دفعات «إصدار التأشيرة» و«التوكيل» و«إصدار الإقامة» من شاشة المدفوعات.','Iqama stays locked until the visa-issuance, authorization and iqama-issuance installments are all paid in Payments.')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
            return (
              <div style={cardChrome}>
                <div style={cardHeader}>
                  <StepBadge n={3} c={C.gold} />
                  <span style={cardTitle}>{visaList.length > 1 ? T('الإقامات','Iqamas') : T('الإقامة','Iqama')}</span>
                  {visaList.length > 1 && <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--tx4)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{doneCount}/{visaList.length}</span>}
                </div>
                <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {visaList.map((visa, vi) => renderIqamaSub(visa, vi))}
                </div>
                {iqamaModalVisaId != null && (() => {
                  const visa = data.det.find(v => v.id === iqamaModalVisaId)
                  if (!visa) return null
                  const r = iqamaRows[iqamaModalVisaId] || null
                  const pdfFiles = iqamaAttachments.filter(a => a.notes === 'iqama_pdf' && r && a.entity_id === r.id)
                  return (
                    <TxnIqamaModal sb={sb} user={user} toast={toast} T={T}
                      defaultVisaId={visa.id} srId={sr.id} facilityId={visa.main_facility?.id || visa.main_facility_id || null}
                      row={r} visaOptions={[{ value: visa.id, label: visa.border_number || T('تأشيرة','Visa') }]} pdfFiles={pdfFiles}
                      gateOk={payGate.iqamaReadyForVisa(visa.id)}
                      onClose={() => setIqamaModalVisaId(null)}
                      onSaved={(updatedRow, newAtt) => { setIqamaRows(prev => ({ ...prev, [visa.id]: { ...updatedRow, visa_application_id: visa.id } })); if (newAtt) setIqamaAttachments(prev => [newAtt, ...prev]); setStatusTick(t => t + 1) }} />
                  )
                })()}
              </div>
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
          {/* رواتب سبلاير: العامل + المنشأة معروضان في كرت «العامل والمنشأة» الموحّد أعلى الصفحة */}

          {/* General service — instead of the «تفاصيل الطلب» card, mirror the invoice layout:
              a «العامل والمنشأة» hero card + a «الخدمة» card (service type + description). */}
          {!data.loading && data.code === 'general' && data.det.map((d, idx) => {
            // Hide the worker hero when the worker is also the client (already shown in the client card above).
            const workerDistinct = !!sr.client
            const showWF = (workerDistinct && d.worker) || d.worker_facility
            return (
              <React.Fragment key={d.id || idx}>
                {showWF && (
                  <div style={cardChrome}>
                    <div style={cardHeader}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                      <span style={cardTitle}>{T('العامل والمنشأة','Worker & Facility')}{data.det.length > 1 ? ` (${idx + 1}/${data.det.length})` : ''}</span>
                    </div>
                    <div style={{ padding: '16px 22px' }}>
                      <WorkerFacilityHero worker={workerDistinct ? d.worker : null} facility={d.worker_facility} T={T} />
                      {(() => {
                        const changes = Array.isArray(d.details?.worker_changes) ? d.details.worker_changes : []
                        if (!changes.length) return null
                        return (
                          <ChangeLog T={T} title={T('سجل تغيير العامل','Worker change log')} entries={changes}
                            actionLabel={T('تم تغيير العامل','Worker changed')}
                            renderDetail={c => c.from_name ? (
                              <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span>{T('العامل السابق','Previous worker')}:</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{c.from_name}</span>
                                  {c.from_iqama && <span style={{ fontFamily: 'monospace', direction: 'ltr', color: 'var(--tx3)' }}>{c.from_iqama}</span>}
                                </div>
                              </div>
                            ) : null} />
                        )
                      })()}
                    </div>
                  </div>
                )}
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                    <span style={cardTitle}>{T('الخدمة','Service')}</span>
                  </div>
                  {/* كرت الخدمة — مطابق لكرت الخدمة في صفحة تفاصيل الفاتورة: كرت المكتب ثم اسم الخدمة (ذهبي) مع الوصف تحته */}
                  <div style={{ padding: '14px 22px' }}>
                    {sr.branch?.branch_code && (
                      <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('المكتب','Office')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
                          <span style={{ fontSize: 14, color: C.gold, fontWeight: 700, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{sr.branch.branch_code}</span>
                        </span>
                      </div>
                    )}
                    {(() => {
                      const svcLabel = isAr ? (svc.label_ar_full || svc.label_ar) : (svc.label_en_full || svc.label_en)
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <span style={{ fontSize: 14, color: C.gold, fontWeight: 600, lineHeight: 1.4 }}>{svcLabel}</span>
                            {d.description && d.description !== svcLabel && (
                              <span style={{ fontSize: 12.5, color: '#fff', fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'rtl', marginTop: 4 }}>{d.description}</span>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </React.Fragment>
            )
          })}

          {/* الملاحظات — عرض فقط: ملاحظة الطلب + سجلّ ملاحظات المعاملة (نفس مصدر كرت الإجراء، بدون إضافة) */}
          {!data.loading && data.code === 'general' && (
            <div style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                <span style={cardTitle}>{T('ملاحظات الفاتورة','Invoice Notes')}</span>
              </div>
              <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sr.note && (() => {
                  const invRow = data.inv?.[0]
                  const p = invRow?.creator?.person
                  const name = ((isAr ? (p?.name_ar || p?.name_en) : (p?.name_en || p?.name_ar)) || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
                  const ts = invRow?.created_at || sr.request_date
                  const dt = ts ? new Date(ts) : null
                  const hhmm = dt ? String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0') : ''
                  return (
                    <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('ملاحظة الفاتورة','Invoice note')}</span>
                      <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{sr.note}</span>
                      <div style={{ display: 'flex', direction: 'rtl', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>
                        {name && <span style={{ fontWeight: 600, color: C.gold }}>{name}</span>}
                        {dt && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}><span>{fmtGreg(ts)}</span><span>{hhmm}</span></span>}
                      </div>
                    </div>
                  )
                })()}
                {!sr.note && <span style={{ fontSize: 11.5, color: 'var(--tx5)', textAlign: 'center', padding: '6px 0' }}>{T('لا توجد ملاحظة','No note')}</span>}
              </div>
            </div>
          )}

          {!data.loading && data.code !== 'work_visa' && data.code !== 'general' && data.det.map((d, idx) => (
            <div key={d.id || idx} style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                <span style={cardTitle}>{T('تفاصيل الطلب','Application')}{data.det.length > 1 ? ` (${idx + 1}/${data.det.length})` : ''}</span>
                {data.code !== 'supplier_payroll' && <span style={{ marginInlineStart: 'auto', fontSize: 11, color: svc.c, fontWeight: 600, padding: '2px 9px', borderRadius: 6, background: svc.bg, border: '1px solid ' + svc.bd }}>{isAr ? svc.label_ar : svc.label_en}</span>}
              </div>
              <div style={{ padding: (data.code === 'supplier_payroll' || (TXN_SERVICES[data.code] && !['ajeer', 'iqama_renewal', 'other'].includes(data.code))) ? 0 : '14px 22px' }}>
                <ApplicationDetails code={data.code} d={d} isAr={isAr} T={T} invTotal={data.code === 'supplier_payroll' ? (d.total_amount ?? data.inv?.[0]?.total_amount) : data.inv?.[0]?.total_amount} />
              </div>
            </div>
          ))}

          {/* Action card — تأكيد الإنجاز / إلغاء + ملاحظات مؤرّخة باسم المستخدم.
              Originally رواتب سبلاير-only; now shown for every registry-driven transaction tab. */}
          {(sr.service_type?.code === 'supplier_payroll' || TXN_SERVICES[sr.service_type?.code]) && (() => {
            const open = effStatusCode === 'in_progress'
            // موافقة المحاسب — بوابة وسطى: لا تظهر «تأكيد الإنجاز» قبل موافقته على الخدمات المعلَّمة.
            const acctCode = sr.service_type?.code
            const needsAcct = !!TXN_SERVICES[acctCode]?.needs_accountant_approval
            const acct = acctOverride ?? sr.accountant_status   // null | 'pending' | 'approved' | 'rejected'
            const acctPending  = needsAcct && acct === 'pending'
            const acctApproved = needsAcct && acct === 'approved'
            const acctCanSend  = needsAcct && open && acct !== 'pending' && acct !== 'approved'  // null أو مرفوض → يُعاد الإرسال
            const canConfirmDone = open && (!needsAcct || acctApproved)
            const actBtn = (color, bg, bd) => ({ flex: 1, height: 44, padding: '0 12px', borderRadius: 11, background: bg, border: '1px solid ' + bd, color, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: F, fontSize: 12.5, fontWeight: 600, transition: '.18s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)' })
            const pill = (clr) => ({ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + clr + '80', color: clr, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: '.15s' })
            return (
              <div style={cardChrome}>
                <div style={{ ...cardHeader, gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
                  <span style={{ ...cardTitle, color: C.blue }}>{T('الإجراء','Action')}</span>
                  <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
                    {acctPending ? (
                      <>
                        {/* بوابة المحاسب مفتوحة — موافقة/رفض (تظهر في تبويب الخدمة وفي «موافقات المحاسب») */}
                        <button onClick={() => setAcctModal('approve')} style={pill(C.ok)}
                          onMouseEnter={e => { e.currentTarget.style.background = C.ok + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span>{T('موافقة','Approve')}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </button>
                        <button onClick={() => setAcctModal('reject')} style={pill(C.red)}
                          onMouseEnter={e => { e.currentTarget.style.background = C.red + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span>{T('رفض','Reject')}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                        </button>
                      </>
                    ) : open ? (
                      <>
                        {acctCanSend && (
                        <button onClick={() => setAcctModal('send')} style={pill(C.gold)}
                          onMouseEnter={e => { e.currentTarget.style.background = C.gold + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span>{T('إرسال للمحاسب','Send to accountant')}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>
                        </button>
                        )}
                        {canConfirmDone && (
                        <button onClick={() => setActionModal('done')} style={pill(C.ok)}
                          onMouseEnter={e => { e.currentTarget.style.background = C.ok + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span>{T('تأكيد الإنجاز','Confirm Done')}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </button>
                        )}
                        {/* General service is cancelled from its invoice only — no cancel button here. */}
                        {data.code !== 'general' && (
                        <button onClick={() => setActionModal('cancel')} style={pill(C.red)}
                          onMouseEnter={e => { e.currentTarget.style.background = C.red + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span>{T('إلغاء','Cancel')}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                        </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
                <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* الإجراءات — سجلّ إجراءات/ملاحظات المعاملة (بدون ملاحظة الفاتورة؛ تظهر في كرت «ملاحظات الفاتورة») */}
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 10 }}>{T('الإجراءات','Actions')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {reqNotes.map(n => {
                        const p = n.author?.person
                        const name = ((isAr ? (p?.name_ar || p?.name_en) : (p?.name_en || p?.name_ar)) || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
                        const dt = new Date(n.created_at)
                        const hhmm = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0')
                        return (
                          <div key={n.id} style={{ background: 'rgba(0,0,0,.18)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid rgba(255,255,255,.05)' }}>
                            <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{n.note}</span>
                            {Array.isArray(n.attachments) && n.attachments.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                                {n.attachments.map((a, i) => (
                                  <a key={a.id || i} href={a.file_url} target="_blank" rel="noreferrer" title={a.file_name || T('مرفق','Attachment')}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.gold, textDecoration: 'none' }}>
                                    <Paperclip size={12} strokeWidth={2} />
                                    <span style={{ textDecoration: 'underline', textUnderlineOffset: 3, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{a.file_name || (T('مرفق','Attachment') + ' ' + (i + 1))}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', direction: 'rtl', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>
                              {name && <span style={{ fontWeight: 600, color: C.gold }}>{name}</span>}
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
                                <span>{fmtGreg(n.created_at)}</span>
                                <span>{hhmm}</span>
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      {/* بطاقتا الإنجاز (خضراء) / الإلغاء (حمراء) — تُضافان تلقائياً عند تغيّر حالة الطلب */}
                      {effStatusCode === 'done' && (() => {
                        const ev = statusHistory.find(h => h.status_code === 'done')
                        const cmp = sr.completer?.person
                        const who = (isAr ? (cmp?.name_ar || cmp?.name_en) : (cmp?.name_en || cmp?.name_ar)) || (ev ? (actorNames[ev.changed_by] || '') : '')
                        const when = ev?.entered_at || sr.paid_date || sr.updated_at
                        const d = when ? new Date(when) : null
                        const hhmm = d ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''
                        return (
                          <div style={{ background: `${C.ok}14`, border: `1px solid ${C.ok}3a`, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.ok, fontWeight: 600 }}>
                              <CheckCircle2 size={14} strokeWidth={2.4} />{T('تم إنجاز الطلب','Request completed')}
                            </span>
                            {(who || d) && (
                              <div style={{ display: 'flex', direction: 'rtl', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>
                                {who ? <span style={{ fontWeight: 600, color: C.gold }}>{who}</span> : <span />}
                                {d && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}><span>{fmtGreg(when)}</span><span>{hhmm}</span></span>}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {effStatusCode === 'cancelled' && (() => {
                        const ev = statusHistory.find(h => h.status_code === 'cancelled')
                        const cp = sr.canceller?.person
                        const who = (isAr ? (cp?.name_ar || cp?.name_en) : (cp?.name_en || cp?.name_ar)) || (ev ? (actorNames[ev.changed_by] || '') : '')
                        const when = ev?.entered_at || sr.cancelled_at
                        const d = when ? new Date(when) : null
                        const hhmm = d ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''
                        const reason = cancelReasonOverride || sr.cancelled_reason
                        return (
                          <div style={{ background: `${C.red}14`, border: `1px solid ${C.red}3a`, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.red, fontWeight: 600 }}>
                              <Ban size={14} strokeWidth={2.4} />{T('تم إلغاء الطلب نتيجة إلغاء الفاتورة','Request cancelled due to invoice cancellation')}
                            </span>
                            {reason && <span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{reason}</span>}
                            {(who || d) && (
                              <div style={{ display: 'flex', direction: 'rtl', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>
                                {who ? <span style={{ fontWeight: 600, color: C.gold }}>{who}</span> : <span />}
                                {d && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}><span>{fmtGreg(when)}</span><span>{hhmm}</span></span>}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* موافقة المحاسب — شارة حالة الطلب لدى المحاسب (معلّق/موافَق/مرفوض) */}
                      {(() => {
                        const needsA = !!TXN_SERVICES[sr.service_type?.code]?.needs_accountant_approval
                        const a = acctOverride ?? sr.accountant_status
                        if (!needsA || !a) return null
                        const who = (isAr ? (sr.accountant?.person?.name_ar || sr.accountant?.person?.name_en) : (sr.accountant?.person?.name_en || sr.accountant?.person?.name_ar)) || ''
                        const when = sr.accountant_at
                        const dd = when ? new Date(when) : null
                        const hhmm = dd ? String(dd.getHours()).padStart(2, '0') + ':' + String(dd.getMinutes()).padStart(2, '0') : ''
                        const note = sr.accountant_note
                        const cfg = a === 'approved'
                          ? { c: C.ok,  t: T('تمت موافقة المحاسب','Approved by accountant'), ic: <CheckCircle2 size={14} strokeWidth={2.4} /> }
                          : a === 'rejected'
                          ? { c: C.red, t: T('رفض المحاسب الطلب','Rejected by accountant'), ic: <Ban size={14} strokeWidth={2.4} /> }
                          : { c: C.warn, t: T('بانتظار موافقة المحاسب','Awaiting accountant approval'), ic: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> }
                        return (
                          <div style={{ background: `${cfg.c}14`, border: `1px solid ${cfg.c}3a`, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: cfg.c, fontWeight: 600 }}>{cfg.ic}{cfg.t}</span>
                            {note && <span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{note}</span>}
                            {(who || dd) && (
                              <div style={{ display: 'flex', direction: 'rtl', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>
                                {who ? <span style={{ fontWeight: 600, color: C.gold }}>{who}</span> : <span />}
                                {dd && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}><span>{fmtGreg(when)}</span><span>{hhmm}</span></span>}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {reqNotes.length === 0 && effStatusCode === 'in_progress' && <span style={{ fontSize: 11.5, color: 'var(--tx5)' }}>{T('لا توجد إجراءات بعد','No actions yet')}</span>}
                      {open && (
                        <button onClick={() => setNoteModal(true)}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                          style={{ alignSelf: 'stretch', justifyContent: 'center', height: 42, padding: '0 16px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + C.gold + '80', color: C.gold, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: '.15s' }}>
                          <Plus size={15} strokeWidth={2.4} />
                          {T('إضافة إجراء','Add action')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

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
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 6, background: f.is_official ? 'rgba(46,204,113,.12)' : 'rgba(243,156,18,.12)', color: f.is_official ? C.ok : C.warn, fontWeight: 600 }}>{f.is_official ? T('رسمي','Official') : T('غير رسمي','Unofficial')}</span>
                      {f.status && <span style={{ fontSize: 10, color: 'var(--tx4)' }}>{isAr ? f.status.value_ar : (f.status.value_en || f.status.value_ar)}</span>}
                    </div>
                    <span style={{ fontSize: 13, color: C.gold, fontWeight: 600, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{num(f.amount)} {T('ر.س','SAR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right column — sticky sidebar */}
        <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Overview card — stat tiles (service merged with quantity); the full payments schedule lives in the «الدفعات» card below */}
          {(() => {
            const refNo = (() => { const n = (sr.invoices || []).find(x => x.deleted_at == null)?.invoice_no; return noDash(n ? n.replace(/^INV/i, 'TXN') : ['TXN', sr.branch?.branch_code, String(sr.request_ref_no || '').slice(-6)].filter(Boolean).join('-')) })()
            const serviceLabel = isAr ? svc.label_ar : svc.label_en
            const qty = data.code === 'work_visa' ? (data.det.length || Number(sr.quantity || 1)) : Number(sr.quantity || 1)
            // الكمية تظهر فقط لتأشيرات العمل والغرفة التجارية (code 'other') — بقية الخدمات كميتها دائماً 1
            const showQty = /^work_visa/.test(sr.service_type?.code || '') || sr.service_type?.code === 'other'
            const tile = (l, v, c) => (
              <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4, letterSpacing: '.5px' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: c || '#fff', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              </div>
            )
            return (
              <div style={{ ...cardChrome, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {tile(T('تاريخ الطلب','Request date'), fmtGreg(sr.request_date))}
                  {tile(T('آخر تحديث','Last update'), fmtGreg(sr.updated_at || sr.request_date))}
                  {tile(T('الخدمة','Service'), <span style={{ color: svc.c }}>{serviceLabel}</span>)}
                  {showQty && tile(T('الكمية','Quantity'), '' + qty)}
                  <div style={showQty ? { gridColumn: '1 / -1' } : undefined}>
                    {tile(T('رقم المرجع','Reference'), (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.gold, fontFamily: 'monospace', direction: 'ltr' }}><CopyRefBtn value={refNo} title="نسخ" />{refNo}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })()}
          {/* Installments card — the full «الدفعات» schedule: every tranche (issuance / authorization / residence / …), not just the visa-issuance payment */}
          {!data.loading && data.inv.length > 0 && (() => {
            const ordAr = ['الأولى','الثانية','الثالثة','الرابعة','الخامسة','السادسة','السابعة','الثامنة','التاسعة','العاشرة']
            const ordEn = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth']
            const ordLabel = n => isAr ? ('الدفعة ' + (ordAr[n - 1] || n)) : ((ordEn[n - 1] || ('#' + n)) + ' Installment')
            const sumTotal = installments.reduce((a, i) => a + Number(i.total_amount || 0), 0)
            const sumPaid = installments.reduce((a, i) => a + Number(i.paid_amount || 0), 0)
            const pct = sumTotal ? Math.min(100, Math.round(sumPaid / sumTotal * 100)) : 0
            return (
              <div style={cardChrome}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                  <span style={{ ...cardTitle, color: C.gold }}>{T('الدفعات','Installments')}</span>
                  {installments.length > 0 && <span style={{ marginInlineStart: 'auto', fontSize: 16, color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>}
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {installments.length === 0 ? (
                    <div style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center', padding: '6px 0' }}>{T('لا توجد دفعات','No installments')}</div>
                  ) : (
                    installments.map(ins => {
                      // Each tranche: just its name + a paid-progress bar (no status chip, no amount).
                      const insTotal = Number(ins.total_amount || 0)
                      const insPaid = Number(ins.paid_amount || 0)
                      const insPct = insTotal ? Math.min(100, Math.round(insPaid / insTotal * 100)) : 0
                      const pctC = insPct >= 100 ? C.ok : (insPct > 0 ? C.gold : C.red)
                      // Stage name: lookup milestone → the note saved at creation ("عند إصدار التأشيرة" …) →
                      // ordinal ("الدفعة الأولى" …), or just "دفعة واحدة" when the schedule has a single tranche.
                      const mile = ins.payment_milestone
                        ? (isAr ? ins.payment_milestone.value_ar : (ins.payment_milestone.value_en || ins.payment_milestone.value_ar))
                        : (ins.notes || (installments.length === 1 ? T('دفعة واحدة','Single payment') : ordLabel(ins.installment_order)))
                      return (
                        <div key={ins.id} style={{ padding: '10px 12px', background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 10.5, color: 'var(--tx4)' }}>
                            <span>{mile}</span>
                            <span style={{ color: pctC, fontWeight: 600, direction: 'ltr' }}>{insPct}%</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: insPct + '%', background: `linear-gradient(90deg, ${C.ok}, ${C.ok}cc)`, transition: 'width .3s' }} />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })()}
          {/* Status timeline card — workflow progress + time spent in each status */}
          {(() => {
            // Only the work-visa lifecycle carries the visa→iqama milestones. EVERY other
            // service (general, registry tabs, transfer, ajeer, iqama renewal, payroll, …)
            // follows the simple جديدة → منجزة lifecycle — the visa stages must never leak
            // into a non-visa transaction's status card.
            const isVisaFlow = data.code === 'work_visa'
            const STAGES = isVisaFlow
              ? [
                  { code: 'new', label: T('جديدة','New') },
                  { code: 'visa_issued', label: T('تأشيرة مصدرة','Visa issued') },
                  { code: 'iqama_issued', label: T('إقامة مصدرة','Iqama issued') },
                ]
              : [
                  { code: 'new', label: T('جديدة','New') },
                  { code: 'done', label: T('منجزة','Completed') },
                ]
            const stageIdx = isVisaFlow
              ? (code => code === 'iqama_issued' ? 2 : code === 'visa_issued' ? 1 : 0)
              : (code => code === 'done' ? 1 : 0)
            const cancelled = effStatusCode === 'cancelled'
            const now = Date.now()
            const fmtDur = ms => {
              if (!(ms > 0)) return T('أقل من دقيقة','< 1 min')
              const m = Math.floor(ms / 60000)
              if (m < 60) return T(`${m} دقيقة`, `${m} min`)
              const h = Math.floor(m / 60)
              if (h < 24) return T(`${h} ساعة`, `${h} h`)
              const d = Math.floor(h / 24)
              return T(`${d} يوم`, `${d} d`)
            }
            // Earliest time each milestone was reached (collapse raw status events into the 3 stages).
            const stageStart = {}
            statusHistory.forEach(row => {
              if (row.status_code === 'cancelled' || row.status_code === 'facility_set' || String(row.status_code).endsWith('_edited')) return
              const si = stageIdx(row.status_code)
              const t = new Date(row.entered_at).getTime()
              if (stageStart[si] == null || t < stageStart[si]) stageStart[si] = t
            })
            const reached = Object.keys(stageStart).map(Number).sort((a, b) => a - b)
            // بعض الطلبات بلا سجلّ حالات؛ نعتمد الحالة الفعلية كحدٍّ أدنى للمرحلة حتى لا يبقى «المنجز» عالقاً على «جديدة».
            const histIdx = reached.length ? reached[reached.length - 1] : 0
            const curIdx = cancelled ? histIdx : Math.max(histIdx, stageIdx(effStatusCode))
            const hist = reached.map((si, i) => {
              const start = stageStart[si]
              const end = i < reached.length - 1 ? stageStart[reached[i + 1]] : now
              return { label: STAGES[si].label, enteredAt: new Date(start).toISOString(), dur: end - start, current: i === reached.length - 1 }
            })
            const totalMs = hist.length ? now - new Date(hist[0].enteredAt).getTime() : 0
            const accent = cancelled ? C.red : C.blue
            return (
              <div style={cardChrome}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                  <span style={{ ...cardTitle, color: C.gold }}>{T('الحالة','Status')}</span>
                  {cancelled && (
                    <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, background: C.red + '14', border: '1px solid ' + C.red + '33', color: C.red, fontSize: 12, fontWeight: 600 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.red }} />{T('تم إلغاء الطلب','Cancelled')}
                    </span>
                  )}
                  {!cancelled && hist.length > 0 && <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('الإجمالي','Total')} {fmtDur(totalMs)}</span>}
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* الستيبر يظهر دائماً ليبيّن المرحلة التي بلغها الطلب — حتى لو أُلغي (جديد/قيد التنفيذ/منجز) */}
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    {STAGES.map((s, i) => {
                      // المبلوغة ✓؛ المرحلة التالية «الحالية» بالأزرق — تُخفى عند الإلغاء (لا يوجد تقدّم جارٍ).
                      const done = curIdx >= i, cur = !cancelled && curIdx + 1 === i
                      return (
                        <React.Fragment key={s.code}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, width: 64, opacity: cancelled && !done ? 0.5 : 1 }}>
                            <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: done ? '#10240f' : cur ? '#0b2233' : 'var(--tx5)', background: done ? C.ok : cur ? C.blue : 'rgba(255,255,255,.06)', border: done || cur ? 'none' : '1px solid rgba(255,255,255,.1)' }}>{done ? '✓' : i + 1}</span>
                            <span style={{ fontSize: 9.5, color: cur ? C.blue : 'var(--tx4)', fontWeight: 600, textAlign: 'center', lineHeight: 1.3 }}>{s.label}</span>
                          </div>
                          {i < STAGES.length - 1 && <span style={{ flex: 1, height: 2, borderRadius: 2, background: curIdx > i ? C.ok : 'rgba(255,255,255,.08)', marginTop: 12 }} />}
                        </React.Fragment>
                      )
                    })}
                  </div>
                  {hist.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {hist.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: h.current ? accent : C.ok }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12.5, color: 'var(--tx1)', fontWeight: 600 }}>{h.label}{h.current && <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, marginInlineStart: 6 }}>({T('حالية','current')})</span>}</div>
                            <div style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>{(h.enteredAt || '').slice(0, 10)}</div>
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: h.current ? C.gold : 'var(--tx3)', whiteSpace: 'nowrap' }}>{fmtDur(h.dur)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {actionModal && (
        <RequestActionModal
          type={actionModal} sb={sb} T={T} isAr={isAr} toast={toast} sr={sr} user={user}
          summary={{
            serviceLabel: isAr ? svc.label_ar : svc.label_en,
            worker: data.det?.[0]?.worker?.name_ar || data.det?.[0]?.worker?.name_en,
            iqama: data.det?.[0]?.worker?.iqama_number,
            phone: fmtPhone(data.det?.[0]?.worker_phone || data.det?.[0]?.worker?.phone),
            unpaid: data.det?.[0]?.unpaid_salaries_count,
            total: data.det?.[0]?.total_amount ?? data.inv?.[0]?.total_amount,
            // تفاصيل الطلب — تُعرض في «مراجعة الطلب قبل الإنجاز»
            quantity: Number(sr.quantity || 1),
            description: data.det?.[0]?.description || null,
            attachments: reqNotes.flatMap(n => Array.isArray(n.attachments) ? n.attachments : []),
          }}
          onClose={() => setActionModal(null)}
          onApplied={(code, reason) => { setStatusOverride(code); if (reason) setCancelReasonOverride(reason); reloadReqNotes(); setStatusTick(t => t + 1) }}
        />
      )}

      {acctModal && (
        <AccountantActionModal
          type={acctModal} sb={sb} T={T} isAr={isAr} toast={toast} sr={sr} user={user}
          summary={{
            serviceLabel: isAr ? svc.label_ar : svc.label_en,
            worker: data.det?.[0]?.worker?.name_ar || data.det?.[0]?.worker?.name_en,
            iqama: data.det?.[0]?.worker?.iqama_number,
            facility: data.det?.[0]?.worker_facility?.name_ar,
            total: data.inv?.[0]?.total_amount,
          }}
          onClose={() => setAcctModal(null)}
          onApplied={(st) => { setAcctOverride(st); reloadReqNotes(); setStatusTick(t => t + 1) }}
        />
      )}

      {noteModal && (
        <ReqNoteModal sb={sb} T={T} toast={toast} sr={sr} user={user}
          onClose={() => setNoteModal(false)}
          onSaved={reloadReqNotes} />
      )}

      {workerModal && (
        <TxnWorkerPickModal
          sb={sb} toast={toast} T={T} isAr={isAr}
          appId={workerModal}
          currentId={data.det?.find(d => d.id === workerModal)?.worker?.id}
          onClose={() => setWorkerModal(null)}
          onSaved={(w) => {
            setData(prev => ({ ...prev, det: (prev.det || []).map(d => d.id === workerModal
              ? { ...d, worker_id: w.id, worker: { id: w.id, name_ar: w.name_ar, name_en: w.name_en, iqama_number: w.iqama_number, phone: w.phone, nationality: w.nationality || null } }
              : d) }))
          }}
        />
      )}
    </div>
  )
}

/* ─────── إضافة إجراء — نافذة منبثقة: نص الإجراء + إرفاق أكثر من ملف (جدول attachments العام) ─────── */
function ReqNoteModal({ sb, T, toast, sr, user, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async () => {
    const note = text.trim()
    if (!note) return
    setSubmitting(true)
    setErr(null)
    try {
      const { data: row, error } = await sb.from('service_request_notes')
        .insert({ service_request_id: sr.id, note, created_by: user?.id || null })
        .select('id').single()
      if (error || !row) throw (error || new Error('insert failed'))
      // ارفع كل ملف إلى bucket «attachments» ثم اربطه بالإجراء عبر جدول attachments.
      for (const file of files) {
        const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `service-request-note/${row.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) continue
        const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
        await sb.from('attachments').insert({
          entity_type: 'service_request_note', entity_id: row.id,
          file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
          mime_type: file.type || null, size_bytes: file.size || null, uploaded_by: user?.id || null,
        })
      }
      toast?.(T('تمت إضافة الإجراء', 'Action added'))
      await onSaved?.()
      onClose()
    } catch (e) {
      setSubmitting(false)
      setErr(T('تعذّر إضافة الإجراء: ', 'Failed to add action: ') + (e?.message || e))
    }
  }
  return (
    <Modal open onClose={onClose} title={T('إضافة إجراء', 'Add action')} Icon={FileTextIco} width={560} height="auto" accent={C.gold}
      pages={[{ valid: !!text.trim(), error: err, content: (
        <ModalSection Icon={FileTextIco} label={T('تفاصيل الإجراء', 'Action details')}>
          <div style={GRID}>
            <TextArea req full label={T('نص الإجراء', 'Action text')} value={text} onChange={v => { setText(v); setErr(null) }}
              placeholder={T('اكتب تفاصيل الإجراء…', 'Describe the action…')} rows={4} />
            <FileField full multiple label={T('المرفقات', 'Attachments')}
              hint={T('يمكن إرفاق أكثر من ملف', 'You can attach more than one file')} value={files} onChange={setFiles} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={submitting} submitLabel={T('إضافة', 'Add')} submitIcon={Plus} />
  )
}

/* ─────── Request-level actions (تم الإنجاز / إلغاء) — FormKit popups, invoice-style ─────── */
const CANCEL_REASONS = [
  { value: 'worker_request',      label_ar: 'طلب من العامل',                 label_en: 'Worker request' },
  { value: 'supplier_unreachable',label_ar: 'تعذّر التواصل مع السبلاير',       label_en: 'Could not reach the supplier' },
  { value: 'duplicate',           label_ar: 'طلب مكرر',                       label_en: 'Duplicate request' },
]

function RequestActionModal({ type, sb, T, isAr, toast, sr, summary, user, onClose, onApplied }) {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [reasonKey, setReasonKey] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState(null)
  const isCancel = type === 'cancel'
  const isPayroll = sr.service_type?.code === 'supplier_payroll'
  const accent = isCancel ? C.red : C.ok

  const submit = async () => {
    setSubmitting(true)
    setErr(null)
    try {
      const newCode = isCancel ? 'cancelled' : 'done'
      const { data: stRow, error: e1 } = await sb.from('lookup_items')
        .select('id,category:lookup_categories!inner(category_key)')
        .eq('code', newCode).eq('category.category_key', 'request_status').maybeSingle()
      if (e1 || !stRow?.id) throw (e1 || new Error('status lookup not found'))
      const patch = { status_id: stRow.id, updated_at: new Date().toISOString() }
      if (!isCancel) patch.completed_by = user?.id || null
      if (isCancel) {
        const r = CANCEL_REASONS.find(x => x.value === reasonKey)
        const base = r ? (isAr ? r.label_ar : r.label_en) : ''
        patch.cancelled_at = new Date().toISOString()
        patch.cancelled_by = user?.id || null
        patch.cancelled_reason = reasonKey === 'other' ? note.trim() : [base, note.trim()].filter(Boolean).join(' — ')
      }
      const { error: e2 } = await sb.from('service_requests').update(patch).eq('id', sr.id)
      if (e2) throw e2
      setDone(true)
      onApplied?.(newCode, isCancel ? patch.cancelled_reason : null)
    } catch (e) {
      setSubmitting(false)
      setErr(T('تعذّر تنفيذ العملية', 'Action failed') + (e?.message ? ': ' + e.message : ''))
    }
  }

  const Line = ({ l, v, c, rtl }) => v ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.05)', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{l}</span>
      <span style={{ fontSize: 13, color: c || 'var(--tx2)', fontWeight: 600, direction: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' }}>{v}</span>
    </div>
  ) : null

  const doneContent = (
    <>
      <ModalSection Icon={CheckCircle2} label={T('مراجعة الطلب قبل الإنجاز', 'Review before completing')}>
        <div style={{ padding: '2px 2px 4px' }}>
          <Line l={T('الخدمة', 'Service')} v={summary.serviceLabel} c={C.gold} />
          <Line l={T('العامل', 'Worker')} v={summary.worker} />
          <Line l={T('الإقامة', 'Iqama')} v={summary.iqama} />
          <Line l={T('الجوال', 'Phone')} v={summary.phone} />
          {summary.quantity > 1 && <Line l={T('الكمية', 'Quantity')} v={'×' + summary.quantity} />}
          {summary.description && <Line l={T('التفاصيل', 'Details')} v={summary.description} rtl />}
          {isPayroll && <Line l={T('عدد الأشهر', 'Months')} v={summary.unpaid != null ? String(summary.unpaid) : null} />}
          {isPayroll && <Line l={T('المبلغ الإجمالي للرواتب', 'Total Payroll')} v={summary.total != null ? num(summary.total) + ' ' + T('ر.س', 'SAR') : null} c={C.gold} />}
        </div>
        {Array.isArray(summary.attachments) && summary.attachments.length > 0 && (
          <div style={{ padding: '8px 2px 2px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('الملفات المرفقة', 'Attachments')}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {summary.attachments.map((a, i) => (
                <a key={a.id || i} href={a.file_url} target="_blank" rel="noreferrer" title={a.file_name || ''}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: C.gold, textDecoration: 'none' }}>
                  <Paperclip size={12} strokeWidth={2} />
                  <span style={{ textDecoration: 'underline', textUnderlineOffset: 3, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{a.file_name || (T('مرفق', 'Attachment') + ' ' + (i + 1))}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </ModalSection>
      <div style={{ marginTop: 12, fontSize: 12.5, color: C.ok, padding: '10px 14px', borderRadius: 10, background: `${C.ok}14`, border: `1px solid ${C.ok}33`, fontWeight: 600, lineHeight: 1.8, textAlign: 'center' }}>
        {isPayroll
          ? T('سيتم تحديث حالة الطلب إلى «منجز» — تأكد من اكتمال صرف الرواتب قبل التأكيد', 'The request will be marked “Done” — confirm the payroll has been fully processed')
          : T('سيتم تحديث حالة الطلب إلى «منجز»', 'The request will be marked “Done”')}
      </div>
    </>
  )

  const cancelContent = (
    <>
      <ModalSection Icon={Ban} label={T('سبب الإلغاء', 'Cancellation Reason')}>
        <div style={GRID}>
          <Select full label={T('السبب', 'Reason')} req placeholder={T('اختر سبب الإلغاء…', 'Select a reason…')}
            value={reasonKey} onChange={v => { setReasonKey(v); setErr(null) }} options={CANCEL_REASONS}
            getKey={o => o.value} getLabel={o => isAr ? o.label_ar : o.label_en} searchable={false} />
          <TextArea full rows={3} label={reasonKey === 'other' ? T('اكتب السبب', 'Describe the reason') : T('ملاحظة (اختياري)', 'Note (optional)')}
            value={note} onChange={v => { setNote(v); setErr(null) }}
            placeholder={reasonKey === 'other' ? T('اذكر سبب الإلغاء…', 'Explain why…') : T('تفاصيل إضافية…', 'Extra details…')} />
        </div>
      </ModalSection>
      <div style={{ marginTop: 12, fontSize: 12.5, color: C.red, padding: '10px 14px', borderRadius: 10, background: `${C.red}14`, border: `1px solid ${C.red}33`, display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 600, lineHeight: 1.8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{T('سيتم تحويل حالة الطلب إلى «ملغي». اختر سبب الإلغاء.', 'The request will be marked “Cancelled”. Pick a reason.')}</span>
      </div>
    </>
  )

  const cancelValid = reasonKey !== '' && (reasonKey !== 'other' || note.trim().length > 0)

  return (
    <Modal
      open onClose={onClose} accent={accent} width={540} height="auto"
      title={isCancel ? T('إلغاء الطلب', 'Cancel Request') : T('إنجاز الطلب', 'Complete Request')}
      Icon={isCancel ? Ban : CheckCircle2}
      success={done ? <SuccessView title={isCancel ? T('تم إلغاء الطلب', 'Request cancelled') : T('تم إنجاز الطلب', 'Request completed')} /> : null}
      onSubmit={submit} submitting={submitting}
      submitLabel={isCancel ? T('تأكيد الإلغاء', 'Confirm Cancellation') : T('تأكيد الإنجاز', 'Confirm Completion')}
      submitIcon={isCancel ? Ban : CheckCircle2}
      pages={[{ valid: isCancel ? cancelValid : true, error: err, content: isCancel ? cancelContent : doneContent }]}
    />
  )
}

/* ─────── موافقة المحاسب — إرسال / موافقة / رفض (خطوة وسطى للنقل الخارجي والخروج النهائي) ─────── */
function AccountantActionModal({ type, sb, T, isAr, toast, sr, summary, user, onClose, onApplied }) {
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState(null)
  const isReject = type === 'reject'
  const isApprove = type === 'approve'
  const isSend = type === 'send'
  const accent = isReject ? C.red : isApprove ? C.ok : C.gold
  const newStatus = isSend ? 'pending' : isApprove ? 'approved' : 'rejected'

  const submit = async () => {
    setSubmitting(true)
    setErr(null)
    try {
      const patch = {
        accountant_status: newStatus,
        accountant_by: user?.id || null,
        accountant_at: new Date().toISOString(),
        accountant_note: note.trim() || null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await sb.from('service_requests').update(patch).eq('id', sr.id)
      if (error) throw error
      // أثر في سجل الإجراءات (service_request_notes) — يظهر مؤرّخاً باسم المستخدم.
      const log = isSend ? T('أُرسل الطلب إلى المحاسب للموافقة', 'Sent to accountant for approval')
        : isApprove ? T('وافق المحاسب على الطلب', 'Accountant approved the request')
        : T('رفض المحاسب الطلب', 'Accountant rejected the request')
      await sb.from('service_request_notes').insert({
        service_request_id: sr.id,
        note: note.trim() ? `${log} — ${note.trim()}` : log,
        created_by: user?.id || null,
      })
      setDone(true)
      onApplied?.(newStatus)
    } catch (e) {
      setSubmitting(false)
      setErr(T('تعذّر تنفيذ العملية', 'Action failed') + (e?.message ? ': ' + e.message : ''))
    }
  }

  const Line = ({ l, v, c }) => v ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.05)', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{l}</span>
      <span style={{ fontSize: 13, color: c || 'var(--tx2)', fontWeight: 600 }}>{v}</span>
    </div>
  ) : null

  const title = isSend ? T('إرسال للمحاسب', 'Send to Accountant') : isApprove ? T('موافقة المحاسب', 'Accountant Approval') : T('رفض الطلب', 'Reject Request')
  const Ico = isReject ? Ban : isApprove ? CheckCircle2 : FileTextIco
  const banner = isSend ? T('سيُحال الطلب إلى صندوق «موافقات المحاسب» بانتظار قرار المحاسب.', 'The request will move to the “Accountant Approvals” inbox pending a decision.')
    : isApprove ? T('بالموافقة يعود الطلب إلى تبويبه ليُكمل الموظف الإجراءات.', 'On approval the request returns to its tab so staff can complete it.')
    : T('بالرفض يعود الطلب إلى الموظف مع السبب لمعالجته.', 'On rejection the request returns to staff with the reason to address.')

  return (
    <Modal open onClose={onClose} accent={accent} width={540} height="auto"
      title={title} Icon={Ico}
      success={done ? <SuccessView title={isSend ? T('تم الإرسال للمحاسب', 'Sent to accountant') : isApprove ? T('تمت الموافقة', 'Approved') : T('تم الرفض', 'Rejected')} /> : null}
      onSubmit={submit} submitting={submitting}
      submitLabel={isSend ? T('إرسال', 'Send') : isApprove ? T('تأكيد الموافقة', 'Confirm Approval') : T('تأكيد الرفض', 'Confirm Rejection')}
      submitIcon={Ico}
      pages={[{ valid: isReject ? note.trim().length > 0 : true, error: err, content: (
        <>
          <ModalSection Icon={Ico} label={T('مراجعة الطلب', 'Review request')}>
            <div style={{ padding: '2px 2px 4px' }}>
              <Line l={T('الخدمة', 'Service')} v={summary.serviceLabel} c={C.gold} />
              <Line l={T('العامل', 'Worker')} v={summary.worker} />
              <Line l={T('الإقامة', 'Iqama')} v={summary.iqama} />
              <Line l={T('المنشأة', 'Facility')} v={summary.facility} />
              {summary.total != null && <Line l={T('قيمة الفاتورة', 'Invoice total')} v={num(summary.total) + ' ' + T('ر.س', 'SAR')} c={C.gold} />}
            </div>
          </ModalSection>
          <div style={{ marginTop: 12 }}>
            <TextArea full rows={3} req={isReject}
              label={isReject ? T('سبب الرفض', 'Rejection reason') : T('ملاحظة (اختياري)', 'Note (optional)')}
              value={note} onChange={v => { setNote(v); setErr(null) }}
              placeholder={isReject ? T('اذكر سبب الرفض…', 'Explain why…') : T('ملاحظة للمحاسب أو الموظف…', 'Note…')} />
          </div>
          <div style={{ marginTop: 12, fontSize: 12.5, color: accent, padding: '10px 14px', borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}33`, fontWeight: 600, lineHeight: 1.8, textAlign: 'center' }}>
            {banner}
          </div>
        </>
      ) }]}
    />
  )
}

/* ─────── Service-specific row groups ─────── */
function ApplicationDetails({ code, d, isAr, T, invTotal }) {
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

  if (code === 'supplier_payroll') {
    const mc = d.unpaid_salaries_count
    const monthsVal = mc != null ? mc + ' ' + (mc >= 3 && mc <= 10 ? T('أشهر', 'months') : T('شهر', 'month')) : null
    return (
      <CardBodyGrid fields={[
        { label: T('عدد الأشهر غير المدفوعة', 'Unpaid Months'), value: monthsVal, color: 'var(--tx1)' },
        { label: T('المبلغ الإجمالي للرواتب', 'Total Payroll'), value: invTotal != null ? num(invTotal) : null, color: C.gold, mono: true },
      ]} />
    )
  }

  // Registry-driven tabs render their fields from the `details` JSONB + linked worker/facility.
  const reg = TXN_SERVICES[code]
  if (reg?.detail) {
    const det = d.details || {}
    const resolve = (f) => {
      let v
      switch (f.src) {
        case 'w_name': v = isAr ? (d.worker?.name_ar || d.worker?.name_en) : (d.worker?.name_en || d.worker?.name_ar); break
        case 'w_iqama': v = d.worker?.iqama_number; break
        case 'w_phone': v = d.worker_phone || d.worker?.phone; break
        case 'f_name': v = d.worker_facility?.name_ar; break
        case 'f_unified': v = d.worker_facility?.unified_number; break
        case 'f_hrsd': v = d.worker_facility?.hrsd_number; break
        case 'f_gosi': v = d.worker_facility?.gosi_number; break
        case 'desc': v = d.description; break
        default: v = f.src?.startsWith('d:') ? det[f.src.slice(2)] : null
      }
      if (v == null || v === '') return null
      if (f.opts) v = f.opts[v] || v
      // doc_type may be an admin-managed custom type not in the static opts map → resolve its label.
      if (f.src === 'd:doc_type' && v === det.doc_type) v = docTypeLabel(det.doc_type)
      if (f.date) v = fmtGreg(v)
      else if (f.months && !isNaN(Number(v))) { const n = Number(v); v = n + ' ' + (n >= 3 && n <= 10 ? T('أشهر', 'months') : T('شهر', 'month')) }
      else if (f.money && !isNaN(Number(v))) v = num(v) + ' ' + T('ر.س', 'SAR')
      else if (f.suffix) v = String(v) + f.suffix
      return v
    }
    const copyable = new Set(['w_iqama', 'f_unified', 'f_hrsd', 'f_gosi'])
    const fields = reg.detail.map(f => ({
      label: T(f.l_ar, f.l_en),
      value: resolve(f),
      mono: !!f.mono,
      color: f.color || (f.money ? C.gold : undefined),
      copy: copyable.has(f.src),
    }))
    return <CardBodyGrid fields={fields} />
  }

  return <div style={{ fontSize: 12, color: 'var(--tx4)' }}>{T('لا توجد تفاصيل لعرضها','No details to display')}</div>
}

const ClientRows = ({ sr, T }) => {
  // workerIsClient: client_id is null but a worker exists on the application table
  // (e.g. رواتب سبلاير) — show that worker as the party, same as the invoice page.
  const appSrc = sr?.supplier_payroll_applications ?? sr?.other_applications
  const appRow = Array.isArray(appSrc) ? appSrc[0] : appSrc
  const workerFromApp = appRow?.worker || null
  const c = sr.client || workerFromApp
  const isWorker = !sr.client && !!workerFromApp
  const primary = c?.name_ar || c?.name_en || '—'
  const secondary = c?.name_ar && c?.name_en && c.name_en !== c.name_ar ? c.name_en : null
  const idValue = c?.id_number || c?.iqama_number
  const phoneValue = fmtPhone(isWorker ? (appRow?.worker_phone || c?.phone) : c?.phone)
  const isLatin = /[A-Za-z]/.test(primary)
  return (
    <CardBodyGrid
      name={{ label: T('الاسم', 'Name'), value: primary, ltr: isLatin, boxed: true, sub: secondary }}
      fields={[
        { label: isWorker ? T('الإقامة', 'Iqama') : T('الهوية', 'ID'), value: idValue, mono: true, copy: true },
        { label: T('الجوال', 'Phone'), value: phoneValue, mono: true, copy: true },
      ]}
    />
  )
}

const __OV_DEAD__ = () => {
  const Bar = ({ pct, c, h = 8 }) => (
    <div style={{ height: h, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg, ${c}, ${c}cc)`, transition: 'width .3s' }} />
    </div>
  )
  const FRow = ({ l, v, c }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', minHeight: 26, gap: 10 }}>
      <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{l}</span>
      <span style={{ fontSize: 13, color: c || 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', direction: c === C.gold ? 'ltr' : undefined }}>{v}</span>
    </div>
  )
  const Tile = ({ l, v, c }) => (
    <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)' }}>
      <div style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4, letterSpacing: '.5px' }}>{l}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: c || '#fff', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
    </div>
  )
  const Dot = ({ size = 10 }) => <span style={{ width: size, height: size, borderRadius: '50%', background: statusColor, boxShadow: `0 0 10px ${statusColor}aa`, flexShrink: 0 }} />
  const Ring = ({ pct, c, size = 62 }) => {
    const r = (size - 6) / 2, circ = 2 * Math.PI * r
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} />
      </svg>
    )
  }
  const PL = 'دفعة إصدار التأشيرة'
  const variants = [
    // 1 — classic centered stamp
    (<div style={CARD}>
      <div style={{ padding: '18px 22px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Dot size={12} /><span style={{ fontSize: 22, fontWeight: 600, color: statusColor }}>{statusLabel}</span></div>
      </div>
      <div style={{ padding: '12px 22px' }}><FRow l="تاريخ الطلب" v={reqDate} /><FRow l="نوع الخدمة" v={serviceLabel} c={serviceColor} /><FRow l="الكمية" v={'×' + qty} /><FRow l="آخر تحديث" v={lastUpdate} /><FRow l="رقم المرجع" v={refNo} c={C.gold} /></div>
      {pay && <div style={{ padding: '12px 22px 18px', borderTop: '1px solid rgba(255,255,255,.06)' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 11, color: 'var(--tx3)' }}><span>{PL}</span><span style={{ color: pay.c, fontWeight: 600, direction: 'ltr' }}>{pay.pct}%</span></div><Bar pct={pay.pct} c={pay.c} /></div>}
    </div>),
    // 2 — top accent line + 2-col tiles
    (<div style={CARD}>
      {pay && <div style={{ height: 4, background: 'rgba(255,255,255,.05)' }}><div style={{ height: '100%', width: pay.pct + '%', background: pay.c }} /></div>}
      <div style={{ padding: '16px 22px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>نظرة عامة</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: statusColor }}><Dot size={8} />{statusLabel}</span></div>
      <div style={{ padding: '8px 22px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><Tile l="تاريخ الطلب" v={reqDate} /><Tile l="آخر تحديث" v={lastUpdate} /><Tile l="الخدمة" v={serviceLabel} c={serviceColor} /><Tile l="الكمية" v={'×' + qty} /><div style={{ gridColumn: '1 / -1' }}><Tile l="رقم المرجع" v={refNo} c={C.gold} /></div></div>
    </div>),
    // 3 — horizontal split: status block + fields
    (<div style={CARD}>
      <div style={{ display: 'grid', gridTemplateColumns: '108px 1px 1fr', gap: 14, alignItems: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center' }}><Dot size={14} /><div style={{ fontSize: 18, fontWeight: 600, color: statusColor, marginTop: 8 }}>{statusLabel}</div>{pay && <div style={{ fontSize: 11, color: pay.c, fontWeight: 600, marginTop: 4, direction: 'ltr' }}>{pay.pct}%</div>}</div>
        <div style={{ alignSelf: 'stretch', background: 'rgba(255,255,255,.07)' }} />
        <div><FRow l="التاريخ" v={reqDate} /><FRow l="الخدمة" v={serviceLabel} c={serviceColor} /><FRow l="الكمية" v={'×' + qty} /><FRow l="المرجع" v={refNo} c={C.gold} /></div>
      </div>
      {pay && <div style={{ padding: '0 16px 16px' }}><Bar pct={pay.pct} c={pay.c} h={6} /></div>}
    </div>),
    // 4 — chips header + highlighted ref
    (<div style={CARD}>
      <div style={{ padding: '16px 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, background: statusColor + '1f', border: '1px solid ' + statusColor + '4d', borderRadius: 999, padding: '4px 12px' }}>{statusLabel}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: serviceColor, background: serviceColor + '1f', border: '1px solid ' + serviceColor + '4d', borderRadius: 999, padding: '4px 12px' }}>{serviceLabel}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 999, padding: '4px 12px', direction: 'ltr' }}>×{qty}</span>
      </div>
      <div style={{ padding: '0 18px 8px' }}><FRow l="تاريخ الطلب" v={reqDate} /><FRow l="آخر تحديث" v={lastUpdate} /></div>
      <div style={{ padding: '12px 18px', background: 'rgba(0,0,0,.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 11, color: 'var(--tx4)' }}>رقم المرجع</span><span style={{ fontSize: 14, fontWeight: 600, color: C.gold, fontFamily: 'monospace', direction: 'ltr' }}>{refNo}</span></div>
      {pay && <div style={{ padding: '12px 18px 16px' }}><Bar pct={pay.pct} c={pay.c} /></div>}
    </div>),
    // 5 — stat tiles grid + payment tile
    (<div style={{ ...CARD, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Dot size={10} /><span style={{ fontSize: 16, fontWeight: 600, color: statusColor }}>{statusLabel}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><Tile l="التاريخ" v={reqDate} /><Tile l="آخر تحديث" v={lastUpdate} /><Tile l="الخدمة" v={serviceLabel} c={serviceColor} /><Tile l="الكمية" v={'×' + qty} /></div>
      <Tile l="رقم المرجع" v={refNo} c={C.gold} />
      {pay && <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10, color: 'var(--tx4)' }}><span>{PL}</span><span style={{ color: pay.c, fontWeight: 600, direction: 'ltr' }}>{pay.pct}%</span></div><Bar pct={pay.pct} c={pay.c} h={6} /></div>}
    </div>),
    // 6 — minimal, big ref hero
    (<div style={CARD}>
      <div style={{ padding: '18px 22px 14px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,.06)' }}><div style={{ fontSize: 11, color: 'var(--tx4)', marginBottom: 6 }}>رقم المرجع</div><div style={{ fontSize: 18, fontWeight: 600, color: C.gold, fontFamily: 'monospace', direction: 'ltr', letterSpacing: '.5px' }}>{refNo}</div><div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: statusColor }}><Dot size={8} />{statusLabel}</div></div>
      <div style={{ padding: '12px 22px' }}><FRow l="تاريخ الطلب" v={reqDate} /><FRow l="نوع الخدمة" v={serviceLabel} c={serviceColor} /><FRow l="الكمية" v={'×' + qty} /><FRow l="آخر تحديث" v={lastUpdate} /></div>
      {pay && <div style={{ padding: '0 22px 18px' }}><Bar pct={pay.pct} c={pay.c} h={6} /></div>}
    </div>),
    // 7 — circular ring payment
    (<div style={CARD}>
      <div style={{ padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
        {pay && <div style={{ position: 'relative' }}><Ring pct={pay.pct} c={pay.c} size={62} /><span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: pay.c, direction: 'ltr' }}>{pay.pct}%</span></div>}
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 600, color: statusColor, marginBottom: 6 }}><Dot size={9} />{statusLabel}</div><div style={{ fontSize: 12, color: 'var(--tx3)' }}>{serviceLabel} · ×{qty}</div><div style={{ fontSize: 12, color: C.gold, fontFamily: 'monospace', direction: 'ltr', marginTop: 4 }}>{refNo}</div></div>
      </div>
      <div style={{ padding: '12px 18px 16px', borderTop: '1px solid rgba(255,255,255,.06)' }}><FRow l="تاريخ الطلب" v={reqDate} /><FRow l="آخر تحديث" v={lastUpdate} /></div>
    </div>),
    // 8 — status band top
    (<div style={CARD}>
      <div style={{ padding: '14px 22px', background: `linear-gradient(90deg, ${statusColor}22, transparent)`, borderBottom: `2px solid ${statusColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 17, fontWeight: 600, color: statusColor }}>{statusLabel}</span>{pay && <span style={{ fontSize: 12, fontWeight: 600, color: pay.c, direction: 'ltr' }}>{pay.pct}%</span>}</div>
      <div style={{ padding: '14px 22px' }}><FRow l="تاريخ الطلب" v={reqDate} /><FRow l="نوع الخدمة" v={serviceLabel} c={serviceColor} /><FRow l="الكمية" v={'×' + qty} /><FRow l="آخر تحديث" v={lastUpdate} /><FRow l="رقم المرجع" v={refNo} c={C.gold} /></div>
      {pay && <div style={{ padding: '0 22px 18px' }}><Bar pct={pay.pct} c={pay.c} /></div>}
    </div>),
    // 9 — compact dense, inline bar
    (<div style={{ ...CARD, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 15, fontWeight: 600, color: statusColor }}><Dot size={9} />{statusLabel}</span><span style={{ fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: 'monospace', direction: 'ltr' }}>{refNo}</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><FRow l="التاريخ" v={reqDate} /><FRow l="الخدمة" v={serviceLabel} c={serviceColor} /><FRow l="الكمية" v={'×' + qty} /><FRow l="آخر تحديث" v={lastUpdate} /></div>
      {pay && <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1 }}><Bar pct={pay.pct} c={pay.c} h={6} /></div><span style={{ fontSize: 11, fontWeight: 600, color: pay.c, direction: 'ltr' }}>{pay.pct}%</span></div>}
    </div>),
    // 10 — side stripe accent
    (<div style={{ ...CARD, display: 'flex' }}>
      <div style={{ width: 5, background: statusColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ padding: '14px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 16, fontWeight: 600, color: statusColor }}>{statusLabel}</span><span style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', direction: 'ltr' }}>{refNo}</span></div>
        <div style={{ padding: '0 18px 10px' }}><FRow l="تاريخ الطلب" v={reqDate} /><FRow l="نوع الخدمة" v={serviceLabel} c={serviceColor} /><FRow l="الكمية" v={'×' + qty} /><FRow l="آخر تحديث" v={lastUpdate} /></div>
        {pay && <div style={{ padding: '0 18px 16px' }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--tx3)' }}><span>{PL}</span><span style={{ color: pay.c, fontWeight: 600, direction: 'ltr' }}>{pay.pct}%</span></div><Bar pct={pay.pct} c={pay.c} /></div>}
      </div>
    </div>),
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {variants.map((v, i) => (
        <div key={i}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, marginBottom: 8, letterSpacing: '.4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, background: C.gold + '1a', border: '1px solid ' + C.gold + '40', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
            تصميم {i + 1}
          </div>
          {v}
        </div>
      ))}
    </div>
  )
}

const Row = ({ label, value, mono, color, copy }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: mono ? 'ltr' : undefined }}>
      <span style={{ fontSize: 13, color: color || 'var(--tx2)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontFamily: mono ? 'monospace' : F, fontWeight: 600 }}>{value || '—'}</span>
      {copy && value ? <CopyRefBtn value={value} title="نسخ" /> : null}
    </span>
  </div>
)

/* ─────── Shared card body — optional name header + a mini-box grid of fields ─────── */
function CardBodyGrid({ name, fields }) {
  // name?: { label, value, ltr } rendered full-width on top
  // fields: [{ label, value, mono, copy, color }]
  const cols = Math.min(3, Math.max(1, fields.length))
  return (
    <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {name && (
        name.boxed ? (
          // كرت الاسم المؤطّر مع زر النسخ — مطابق لكرت العميل في صفحة تفاصيل الفاتورة (ClientRows في InvoicePage)
          <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{name.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
              {name.value ? <CopyRefBtn value={name.value} title="نسخ" /> : null}
              <span style={{ fontSize: 14, color: 'var(--tx1)', fontWeight: 600, lineHeight: 1.4, direction: name.ltr ? 'ltr' : 'rtl' }}>{name.value || '—'}</span>
            </span>
            {name.sub && <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace', fontWeight: 500, direction: 'ltr' }}>{name.sub}</div>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{name.label}</span>
            <span style={{ fontSize: 14, color: 'var(--tx1)', fontWeight: 600, lineHeight: 1.4, textAlign: 'start' }}>{name.value || '—'}</span>
          </div>
        )
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 8 }}>
        {fields.map((f, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{f.label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 13, color: f.color || '#fff', fontWeight: 600, ...(f.mono ? { fontFamily: 'monospace', direction: 'ltr', fontVariantNumeric: 'tabular-nums' } : {}) }}>{f.value || '—'}</span>
              {f.copy && f.value ? <CopyRefBtn value={f.value} title="نسخ" /> : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────── Facility card body — name on top, 3 numbers in a mini-box grid ─────── */
function FacilityFields({ fac, T }) {
  return (
    <CardBodyGrid
      name={{ label: T('اسم المنشأة', 'Facility Name'), value: fac.name_ar || '—' }}
      fields={[
        { label: T('الرقم الموحد', 'Unified Number'), value: fac.unified_number, mono: true, copy: true },
        { label: T('رقم الموارد البشرية', 'HRSD Number'), value: fac.hrsd_number, mono: true, copy: true },
        { label: T('رقم التأمينات', 'GOSI Number'), value: fac.gosi_number, mono: true, copy: true },
      ]}
    />
  )
}

/* ─────── Worker / facility hero cards — identical to the invoice's EntityHero ─────── */
const EntityHero = ({ icon, primary, secondary, latin, cells, onEdit }) => (
  <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
    {onEdit && (
      <button type="button" onClick={onEdit} title="تغيير" aria-label="تغيير"
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.18)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)' }}
        style={{ position: 'absolute', top: 10, insetInlineStart: 10, width: 28, height: 28, borderRadius: 8, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, transition: '.15s' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
          {primary && <CopyRefBtn value={primary} title="نسخ" />}
          <span style={{ minWidth: 0, fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', direction: latin ? 'ltr' : 'rtl', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary}</span>
        </span>
        {secondary && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .7 }}>{secondary}</span>}
      </div>
    </div>
    {cells.length > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.label}</span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
              {c.value && <CopyRefBtn value={c.value} title="نسخ" />}
              <span style={{ minWidth: 0, fontSize: 13, color: c.value ? 'var(--tx2)' : 'var(--tx4)', fontWeight: 600, direction: c.value ? 'ltr' : 'rtl', fontFamily: c.value ? 'monospace' : undefined, fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value || '—'}</span>
            </span>
          </div>
        ))}
      </div>
    )}
  </div>
)

// Worker + facility hero cards (same layout as the invoice's «العامل والمنشأة»).
// Pass worker=null to render the facility hero only (e.g. when the worker is also the client).
function WorkerFacilityHero({ worker, facility, T, onEditWorker }) {
  const w = worker
  const wPrimary = w?.name_ar || w?.name_en
  const wSecondary = w?.name_ar && w?.name_en && w.name_en !== w.name_ar ? w.name_en : null
  const isLatinName = /[A-Za-z]/.test(wPrimary || '')
  const wCells = w ? [
    { label: T('الإقامة','Iqama'), value: w.iqama_number },
    { label: T('الجوال','Phone'), value: fmtPhone(w.phone) },
  ].filter(f => f.value) : []
  const wNat = w?.nationality
  const wIcon = wNat?.flag_url
    ? <img src={wNat.flag_url} alt={wNat.name_ar || ''} title={wNat.name_ar || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 11, flexShrink: 0 }} />
    : (flagEmoji(wNat?.code) ? <span title={wNat?.name_ar || ''} style={{ fontSize: 30, lineHeight: 1 }}>{flagEmoji(wNat?.code)}</span> : <User size={24} color={C.gold} strokeWidth={1.8} />)
  const f = facility
  const fPrimary = f?.name_ar || f?.name_en
  const fCells = f ? [
    { label: T('الرقم الموحد','Unified No'), value: f.unified_number },
    { label: T('رقم الموارد البشرية','HRSD No'), value: f.hrsd_number },
    { label: T('رقم التأمينات','GOSI No'), value: f.gosi_number },
  ] : []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {w && wPrimary && <EntityHero icon={wIcon} primary={wPrimary} secondary={wSecondary} latin={isLatinName} cells={wCells} onEdit={onEditWorker} />}
      {f && (fPrimary || fCells.some(c => c.value)) && (
        <EntityHero icon={<Building2 size={24} color={C.gold} strokeWidth={1.8} />} primary={fPrimary} secondary={null} latin={false} cells={fCells} />
      )}
    </div>
  )
}

const SectionLabel = ({ label, color = C.gold }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 6px', marginTop: 4 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}aa` }} />
    <span style={{ fontSize: 10.5, color: color, fontWeight: 600, letterSpacing: '.6px' }}>{label}</span>
    <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
  </div>
)

const AmountBox = ({ label, value, color }) => (
  <div style={{ padding: '14px 18px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: 1 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</div>
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
        fontFamily: F, fontSize: 12.5, fontWeight: 600,
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
      <div style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', borderRadius: 9, background: `${c}1f`, border: `1px solid ${c}66`, color: c, fontFamily: F, fontSize: 12.5, fontWeight: 600 }}>
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
        <span style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: open ? C.gold : C.gold }}>{T('إضافة اشتراك قوى','Add Qiwa subscription')}</span>
      </label>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(212,160,23,.25)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px' }}>{T('رقم السداد','SADAD No')}</label>
              <input type="text" value={sadad} onChange={e => setSadad(e.target.value.replace(/[^\d]/g, ''))} placeholder="—"
                style={{ height: 38, padding: '0 12px', borderRadius: 8, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx1)', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, direction: 'ltr', textAlign: 'center', outline: 'none' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.5)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px' }}>{T('المبلغ (ريال)','Amount (SAR)')}</label>
              <input type="text" inputMode="decimal" value={amount}
                onChange={e => { const v = e.target.value.replace(/[^\d.]/g, ''); if (/^\d*\.?\d*$/.test(v)) setAmount(v) }}
                placeholder="0.00"
                style={{ height: 38, padding: '0 12px', borderRadius: 8, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.08)', color: C.gold, fontFamily: F, fontSize: 14, fontWeight: 600, direction: 'ltr', textAlign: 'center', outline: 'none' }}
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
              fontFamily: F, fontSize: 12.5, fontWeight: 600,
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

/* ═══ نوافذ صفحة تفاصيل تأشيرة العمل — الصفحة عرض فقط وكل إدخال من نافذته ═══ */

// اختيار/تغيير عامل الطلب — بحث مباشر في جدول العمال، والاختيار يحفظ على other_applications.worker_id.
function TxnWorkerPickModal({ sb, toast, T, isAr, appId, currentId, onClose, onSaved }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [done, setDone] = useState(false)
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const pattern = `%${needle.replace(/[%,]/g, '')}%`
      const { data } = await sb.from('workers')
        .select('id,name_ar,name_en,iqama_number,phone,nationality:nationality_id(code,name_ar,flag_url)')
        .or(`name_ar.ilike.${pattern},name_en.ilike.${pattern},iqama_number.ilike.${pattern},phone.ilike.${pattern}`)
        .is('deleted_at', null)
        .limit(15)
      setResults(data || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, sb])
  const choose = w => { setErr(''); setSelected(w) }
  const confirm = async () => {
    const w = selected
    if (!w?.id || saving) return
    setSaving(true)
    setErr('')
    try {
      const { error } = await sb.from('other_applications').update({ worker_id: w.id }).eq('id', appId)
      if (error) throw error
      onSaved?.(w); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const flag = (nat) => nat?.flag_url
    ? <img src={nat.flag_url} alt={nat.name_ar || ''} title={nat.name_ar || ''} style={{ width: 22, height: 15, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
    : (flagEmoji(nat?.code) ? <span title={nat?.name_ar || ''} style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{flagEmoji(nat?.code)}</span> : null)
  const WkRow = ({ w }) => {
    const isCur = currentId === w.id
    const active = selected?.id === w.id || isCur
    const cells = [
      { label: T('الإقامة','Iqama'), value: w.iqama_number },
      { label: T('الجوال','Phone'), value: fmtPhone(w.phone) },
    ]
    return (
      <div onClick={() => choose(w)}
        style={{ border: `1px solid ${active ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.08)'}`, borderRadius: 12, background: active ? 'rgba(212,160,23,.06)' : 'rgba(255,255,255,.02)', padding: '11px 13px', marginBottom: 8, cursor: 'pointer', transition: '.15s' }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.25)' } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {flag(w.nationality)}
            <span style={{ fontSize: 13.5, color: active ? C.gold : 'var(--tx2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{(isAr ? (w.name_ar || w.name_en) : (w.name_en || w.name_ar)) || '—'}</span>
          </span>
          {isCur
            ? <span style={{ flexShrink: 0, fontSize: 9.5, color: C.gold, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.35)' }}>{T('الحالي','Current')}</span>
            : <span style={{ flexShrink: 0, color: 'var(--tx5)', display: 'inline-flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {cells.map((c, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, padding: '7px 9px' }}>
              <span style={{ fontSize: 9, color: 'var(--tx4)', fontWeight: 600, display: 'block', marginBottom: 3 }}>{c.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', direction: 'ltr', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F, height: '100%', minHeight: 0 }}>
      <ModalSection Icon={User} flex bodyStyle={{ gap: 10 }} style={{ marginTop: 6 }}
        label={T('ابحث واختر العامل','Search & pick a worker')}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', top: '50%', insetInlineEnd: 12, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none', display: 'inline-flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="text" value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder={T('ابحث بالاسم، رقم الإقامة، أو الجوال…','Search by name, Iqama, or phone…')}
            style={{ width: '100%', height: 42, padding: '0 38px', borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx1)', fontFamily: F, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
          <style>{`.wk-results::-webkit-scrollbar{width:0;display:none}`}</style>
          <div className="wk-results" style={{ height: '100%', overflowY: 'auto', paddingInline: 2, scrollbarWidth: 'none' }}>
            {q.trim().length < 2 && <div style={{ padding: '16px', fontSize: 11.5, color: 'var(--tx5)', textAlign: 'center' }}>{T('اكتب حرفين على الأقل للبحث…','Type at least two characters…')}</div>}
            {q.trim().length >= 2 && searching && <div style={{ padding: '16px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('جارٍ البحث…','Searching…')}</div>}
            {q.trim().length >= 2 && !searching && results.length === 0 && <div style={{ padding: '16px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('لا توجد نتائج','No results')}</div>}
            {!searching && results.map(w => <WkRow key={w.id} w={w} />)}
          </div>
        </div>
      </ModalSection>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تغيير العامل','Change worker')} Icon={User} width={560} accent={C.gold}
      success={done ? <SuccessView title={T('تم تغيير العامل','Worker changed')} /> : undefined}
      pages={[{ title: T('اختيار العامل','Select worker'), valid: !!selected, error: err || undefined, content }]}
      onSubmit={confirm} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تأكيد العامل','Confirm worker')} />
  )
}

// اختيار/تغيير منشأة الملف — بحث مباشر داخل النافذة، والاختيار يحفظ فوراً
// (مع قيد الـ4 تأشيرات لكل منشأة للتأشيرة الدائمة محسوباً عبر كل الملفات).
function TxnFacilityPickModal({ sb, toast, T, isAr, isTemp, fileLabel, rows, files, dbFacOfFile, currentId, onClose, onSaved }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null) // المنشأة المحدَّدة (لم تُحفظ بعد) — تُعرض ككرت ثم تُؤكَّد
  const [done, setDone] = useState(false) // بعد التأكيد — تُعرض شاشة نجاح داخل النافذة (بدل التوستر)
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const pattern = `%${needle.replace(/[%,]/g, '')}%`
      const { data } = await sb.from('facilities')
        .select('id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number,qiwa_subscription_active')
        .or(`name_ar.ilike.${pattern},name_en.ilike.${pattern},unified_number.ilike.${pattern},gosi_number.ilike.${pattern},hrsd_number.ilike.${pattern}`)
        .is('deleted_at', null)
        .limit(15)
      setResults(data || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, sb])
  // منشآت مستخدمة في باقي ملفات المعاملة — اختيار سريع
  const quick = (() => {
    const seen = new Map()
    files.forEach(f => {
      if (f.rows === rows) return
      const fac = dbFacOfFile(f.rows)
      if (fac?.id && !seen.has(fac.id)) seen.set(fac.id, fac)
    })
    return [...seen.values()]
  })()
  // الضغط على نتيجة/اختصار يحدّد المنشأة فقط (يعرض كرتها) — لا حفظ حتى التأكيد.
  const choose = f => { setErr(''); setSelected(f) }
  // تأكيد التحديد — يتحقق من حد التأشيرات ثم يحفظ على تأشيرات هذا الملف ويغلق.
  const confirm = async () => {
    const f = selected
    if (!f?.id || saving) return
    setErr('')
    if (!isTemp) {
      // مجموع تأشيرات المنشأة لو انتقلت تأشيرات هذه المجموعة إليها (نستبعد التأشيرات المنقولة نفسها بالمعرّف)
      const movingIds = new Set(rows.map(r => r.id))
      let total = rows.length
      files.forEach(x => { if (dbFacOfFile(x.rows)?.id === f.id) total += x.rows.filter(r => !movingIds.has(r.id)).length })
      if (total > 4) { setErr(T(`لا يمكن: سيصبح لدى المنشأة ${total} تأشيرات والحد الأقصى 4 للتأشيرة الدائمة.`, `Blocked: the facility would hold ${total} visas (cap is 4 for permanent).`)); return }
    }
    setSaving(true)
    try {
      const { error } = await sb.from('visa_applications').update({ main_facility_id: f.id }).in('id', rows.map(r => r.id))
      if (error) throw error
      const fac = { id: f.id, name_ar: f.name_ar, name_en: f.name_en, unified_number: f.unified_number, cr_number: f.cr_number, gosi_number: f.gosi_number, hrsd_number: f.hrsd_number, qiwa_subscription_active: f.qiwa_subscription_active ?? null }
      // حُفظ في القاعدة وحُدِّثت بيانات الأب — تُعرض شاشة نجاح داخل النافذة (صح + «تم تحديد المنشأة») مثل «إصدار».
      onSaved?.(fac); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  // صف نتيجة بحث (تصميم البطاقة المؤطّرة + شبكة الأرقام — نفس كرت التأكيد). الضغط يحدّد المنشأة بدل الحفظ الفوري.
  const FacRow = ({ f }) => {
    const isCur = currentId === f.id
    const active = selected?.id === f.id || isCur
    const cells = [
      { label: T('الرقم الموحد','Unified No'), value: f.unified_number },
      { label: T('رقم التأمينات','GOSI No'), value: f.gosi_number },
      { label: T('رقم الموارد البشرية','HRSD No'), value: f.hrsd_number },
    ]
    return (
      <div onClick={() => choose(f)}
        style={{ border: `1px solid ${active ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.08)'}`, borderRadius: 12, background: active ? 'rgba(212,160,23,.06)' : 'rgba(255,255,255,.02)', padding: '11px 13px', marginBottom: 8, cursor: 'pointer', transition: '.15s' }}
        onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.25)' } }}
        onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, color: active ? C.gold : 'var(--tx2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{(isAr ? f.name_ar : (f.name_en || f.name_ar)) || '—'}</span>
          {isCur
            ? <span style={{ flexShrink: 0, fontSize: 9.5, color: C.gold, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.35)' }}>{T('الحالية','Current')}</span>
            : <span style={{ flexShrink: 0, color: 'var(--tx5)', display: 'inline-flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
          {cells.map((c, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, padding: '7px 9px' }}>
              <span style={{ fontSize: 9, color: 'var(--tx4)', fontWeight: 600, display: 'block', marginBottom: 3 }}>{c.label}</span>
              <span style={{ fontSize: 11.5, color: 'var(--tx3)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', direction: 'ltr', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  // كرت المنشأة المحدَّدة — نفس نمط كرت العميل/العامل في الفاتورة (اسم بارز + أرقام في خلايا + زر تغيير).
  const FacilityCard = ({ f }) => {
    const cells = [
      { label: T('الرقم الموحد','Unified No'), value: f.unified_number },
      { label: T('رقم التأمينات','GOSI No'), value: f.gosi_number },
      { label: T('رقم الموارد البشرية','HRSD No'), value: f.hrsd_number },
    ].filter(c => c.value)
    return (
      <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={() => { setSelected(null); setErr('') }} title={T('تغيير المنشأة','Change facility')}
          style={{ position: 'absolute', top: 10, insetInlineEnd: 10, width: 28, height: 28, borderRadius: 8, background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.35)', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={24} color={C.gold} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{(isAr ? f.name_ar : (f.name_en || f.name_ar)) || '—'}</span>
            </div>
            {f.name_en && f.name_ar && f.name_en !== f.name_ar && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .7 }}>{f.name_en}</span>}
          </div>
        </div>
        {cells.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, cells.length)},1fr)`, gap: 8 }}>
            {cells.map((c, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.label}</span>
                <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  // المحتوى — كرت المنشأة عند التحديد، وإلا البحث + النتائج (نفس تدفق العميل في الفاتورة).
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F, height: '100%', minHeight: 0 }}>
      {selected ? <FacilityCard f={selected} /> : (
        <ModalSection Icon={Building2} flex bodyStyle={{ gap: 10 }} style={{ marginTop: 6 }}
          label={T('ابحث واختر المنشأة','Search & pick a facility')}
          hint={!isTemp ? T('بحد أقصى 4 تأشيرات لكل منشأة','max 4 visas per facility') : undefined}>
          {quick.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{T('منشآت مستخدمة في هذه المعاملة:','Used in this transaction:')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {quick.map(qf => (
                  <button key={qf.id} type="button" onClick={() => choose(qf)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: 'rgba(212,160,23,.07)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, cursor: 'pointer', fontFamily: F, fontSize: 11.5, fontWeight: 600, maxWidth: 240 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(isAr ? qf.name_ar : (qf.name_en || qf.name_ar)) || '—'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', top: '50%', insetInlineEnd: 12, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none', display: 'inline-flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} autoFocus
              placeholder={T('ابحث بالاسم، الرقم الموحد، رقم التأمينات، أو رقم الموارد البشرية…','Search by name, Unified, GOSI, or HRSD number…')}
              style={{ width: '100%', height: 42, padding: '0 38px', borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx1)', fontFamily: F, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <style>{`.fac-results::-webkit-scrollbar{width:0;display:none}`}</style>
            <div className="fac-results" style={{ height: '100%', overflowY: 'auto', paddingInline: 2, scrollbarWidth: 'none' }}>
              {q.trim().length < 2 && <div style={{ padding: '16px', fontSize: 11.5, color: 'var(--tx5)', textAlign: 'center' }}>{T('اكتب حرفين على الأقل للبحث…','Type at least two characters…')}</div>}
              {q.trim().length >= 2 && searching && <div style={{ padding: '16px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('جارٍ البحث…','Searching…')}</div>}
              {q.trim().length >= 2 && !searching && results.length === 0 && <div style={{ padding: '16px', fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('لا توجد نتائج','No results')}</div>}
              {!searching && results.map(f => <FacRow key={f.id} f={f} />)}
            </div>
          </div>
        </ModalSection>
      )}
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('تحديد المنشأة','Select facility') + (files.length > 1 ? ' — ' + fileLabel : '')} Icon={Building2} width={640} accent={C.gold}
      success={done ? <SuccessView title={T('تم تحديد المنشأة','Facility selected')} /> : undefined}
      pages={[{ title: T('تحديد منشأة الإصدار','Select issuing facility'), valid: !!selected, error: err || undefined, content }]}
      onSubmit={confirm} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تأكيد تحديد المنشأة','Confirm facility')} />
  )
}

// طلب سداد رسم (اشتراك قوى…) — رقم السداد + المبلغ مع سياسات الحد الأعلى من تبويب الرسوم.
function TxnFeeModal({ sb, user, toast, T, title, setting = {}, labelFallbackAr, srId, facilityId, fileNo, fixedSadad, onClose, onDone }) {
  const fixedAmount = setting.amount_type === 'fixed' && Number(setting.fixed_amount) > 0 ? Number(setting.fixed_amount) : null
  const maxAmount = setting.amount_type !== 'fixed' && Number(setting.max_amount) > 0 ? Number(setting.max_amount) : null
  const overAction = setting.over_max_action || 'reject'
  const [sadad, setSadad] = useState('')
  const [amount, setAmount] = useState(fixedAmount != null ? String(fixedAmount) : '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const fmv = v => Number(v || 0).toLocaleString('en-US')
  const amtNum = Number(fixedAmount ?? amount)
  const over = maxAmount != null && amtNum > maxAmount
  const blocked = over && overAction === 'reject'
  const review = over && overAction === 'review'
  const effSadad = fixedSadad ?? sadad
  const valid = amtNum > 0 && String(effSadad || '').trim().length > 0 && !blocked
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setErr(null)
    try {
      const { error } = await sb.from('transaction_fees').insert({
        service_request_id: srId || null, facility_id: facilityId || null, file_number: fileNo ?? null,
        fee_label_ar: setting.label_ar || labelFallbackAr, fee_label_en: setting.label_en || null,
        amount: amtNum, sadad_no: String(effSadad).trim(), status: 'pending', notes: 'manual_pay_request',
        needs_review: review, created_by: user?.id || null,
      })
      if (error) throw error
      toast?.(review ? T('أُرسل لسدادات الخدمات معلَّماً بالأحمر للمراجعة','Sent flagged red for review') : T('أُرسل طلب السداد إلى سدادات الخدمات','Payment request sent to Service Payments'))
      onDone?.(); onClose()
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title={title} Icon={Wallet} width={560} accent={C.gold}
      pages={[{ title: T('بيانات السداد','Payment details'), valid, error: (blocked ? T(`المبلغ يتجاوز الحد الأعلى (${fmv(maxAmount)} ريال)`, `Exceeds the cap (${fmv(maxAmount)} SAR)`) : null) || err || undefined, content: (
        <ModalSection Icon={Wallet} label={title}>
          <div style={GRID}>
            {fixedSadad != null
              ? <TextField full label={T('رقم السداد (تلقائي)','SADAD No. (auto)')} value={fixedSadad} onChange={() => {}} dir="ltr" placeholder="—" />
              : <TextField full label={T('رقم السداد','SADAD No.')} req value={sadad} onChange={v => { setSadad(v.replace(/[^\d]/g, '')); setErr(null) }} dir="ltr" placeholder="—" />}
            <CurrencyField full label={T('المبلغ','Amount')} req unit={T('ريال','SAR')}
              hint={fixedAmount != null ? T('مبلغ ثابت من إعدادات الرسوم','Fixed by the fees settings') : (maxAmount != null ? `${T('الحد الأعلى','max')} ${fmv(maxAmount)}${review ? ' — ' + T('التجاوز يُعلَّم للمراجعة','over = flagged for review') : ''}` : undefined)}
              value={amount} onChange={v => { if (fixedAmount == null) { setAmount(v); setErr(null) } }} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('إرسال للمدفوعات','Send to Payments')} />
  )
}

// تسجيل بيانات الإصدار — رقم التأشيرة المشترك + رقم حدود لكل تأشيرة + ملف PDF اختياري.
function TxnIssuanceModal({ sb, user, toast, T, isAr, fileLabel, rows, metaOf, onClose, onSaved }) {
  const [visaNo, setVisaNo] = useState(rows.find(r => r.visa_number)?.visa_number || '')
  const [borders, setBorders] = useState(() => Object.fromEntries(rows.map(r => [r.id, r.border_number || ''])))
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const valid = String(visaNo).trim().length > 0
    && rows.every(r => String(borders[r.id] || '').trim().length > 0)
    && !!file
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setErr(null)
    try {
      const ids = rows.map(r => r.id)
      const dbVisaNo = rows.find(r => r.visa_number)?.visa_number || ''
      const updates = {}
      if (visaNo.trim() !== dbVisaNo) {
        const { error } = await sb.from('visa_applications').update({ visa_number: visaNo.trim() }).in('id', ids)
        if (error) throw error
        ids.forEach(id => { updates[id] = { ...(updates[id] || {}), visa_number: visaNo.trim() } })
      }
      for (const r of rows) {
        const v = (borders[r.id] || '').trim()
        if (v === (r.border_number || '')) continue
        const { error } = await sb.from('visa_applications').update({ border_number: v || null }).eq('id', r.id)
        if (error) throw error
        updates[r.id] = { ...(updates[r.id] || {}), border_number: v || null }
      }
      if (file) {
        const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `visa-applications/${ids[0]}/visa_pdf/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (!upErr) {
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          await sb.from('attachments').insert({
            entity_type: 'visa_application', entity_id: ids[0],
            file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
            mime_type: file.type || null, size_bytes: file.size || null, notes: 'visa_pdf', uploaded_by: user?.id || null,
          })
        }
      }
      toast?.(T('تم حفظ بيانات الإصدار','Issuance data saved'))
      onSaved?.(updates); onClose()
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title={rows.length > 1 ? T('بيانات التأشيرات','Visas data') : T('بيانات التأشيرة','Visa data')} Icon={FileTextIco} width={640} height="auto" accent={C.gold}
      pages={[{ title: T('بيانات الإصدار','Issuance data'), valid, error: err || undefined, content: (
        <ModalSection Icon={FileTextIco} label={T('رقم التأشيرة مشترك للملف، ورقم الحدود خاص بكل تأشيرة','Shared visa number; one border number per visa')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <TextField full label={T('رقم التأشيرة (مشترك للملف)','Visa No. (shared)')} req value={visaNo} onChange={v => { setVisaNo(v); setErr(null) }} dir="ltr" placeholder="—" />
            {/* صف مدمج مصغّر لكل تأشيرة: المواصفات يمينًا + إدخال رقم الحدود (وسطي) — تفي النافذة دون تمرير */}
            {rows.map(r => {
              const m = metaOf(r)
              const bv = borders[r.id] || ''
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 10px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
                  <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{m.idx}</span>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 11.5, color: 'var(--tx1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nat}{m.sub ? <span style={{ color: 'var(--tx4)', fontWeight: 600 }}> · {m.sub}</span> : null}</div>
                  <input value={bv} onChange={e => { setBorders(s => ({ ...s, [r.id]: e.target.value })); setErr(null) }} dir="ltr" placeholder={T('رقم الحدود','Border No.')}
                    style={{ flexShrink: 0, width: 160, height: 34, padding: '0 12px', borderRadius: 8, background: 'rgba(0,0,0,.3)', border: `1px solid ${bv ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.1)'}`, color: 'var(--tx1)', fontFamily: F, fontSize: 12.5, outline: 'none', direction: 'ltr', textAlign: 'center', boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums' }} />
                </div>
              )
            })}
            <FileField full req label={T('ملف التأشيرة (PDF)','Visa file (PDF)')} value={file} onChange={v => { setFile(v); setErr(null) }} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('حفظ وتأكيد','Save & Confirm')} />
  )
}

// إضافة منشأة وتوزيع التأشيرات — العدد ثابت من الفاتورة؛ ننقل تأشيرات (لم تُصدر بعد) إلى منشأة أخرى.
// النقل = تغيير main_facility فقط (+ إعطاء رقم ملف جديد عند تقسيم ملف جزئيًا) — بلا إنشاء سجلات أو مساس بالفاتورة.
function TxnDistributeModal({ sb, toast, T, isAr, isTemp, visas, allDet, establishments, natOf, occOf, embOf, genOf, globalIdx, onClose, onSaved }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [facility, setFacility] = useState(null)
  // ابدأ بتحديد التأشيرات غير المُسندة (المنشأة الأولى = كلها؛ منشأة إضافية = ما تبقّى دون منشأة)
  const [selected, setSelected] = useState(() => new Set(visas.filter(v => !v.main_facility).map(v => v.id)))
  const [grouping, setGrouping] = useState('one') // 'one' = ملف واحد (رقم تأشيرة مشترك) | 'separate' = ملف لكل تأشيرة
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const pattern = `%${needle.replace(/[%,]/g, '')}%`
      const { data } = await sb.from('facilities')
        .select('id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number,qiwa_subscription_active')
        .or(`name_ar.ilike.${pattern},name_en.ilike.${pattern},unified_number.ilike.${pattern},gosi_number.ilike.${pattern},hrsd_number.ilike.${pattern}`)
        .is('deleted_at', null).limit(15)
      setResults(data || []); setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q, sb])
  const facName = f => (isAr ? f.name_ar : (f.name_en || f.name_ar)) || '—'
  const facId = facility?.id || null
  // العدد الناتج على المنشأة الهدف = الموجود عليها (غير المحدّد) + المحدّد
  const targetExisting = facId ? allDet.filter(d => (d.main_facility?.id) === facId && !selected.has(d.id)).length : 0
  const total = targetExisting + selected.size
  const capOver = !isTemp && total > 4
  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  // «ملف واحد» (رقم تأشيرة مشترك) متاح فقط لو المختارة بنفس المواصفات (جنسية/مهنة/سفارة/جنس)؛ غير ذلك → ملفات منفصلة.
  const bucketOf = v => [natOf(v), occOf(v), embOf(v), genOf(v)].join('§')
  const selectedVisas = visas.filter(v => selected.has(v.id))
  const sameSpec = selectedVisas.length > 0 && selectedVisas.every(v => bucketOf(v) === bucketOf(selectedVisas[0]))
  const effGrouping = sameSpec ? grouping : 'separate'
  // منشآت مستخدمة في هذه المعاملة — اختصارات سريعة
  const quick = (() => { const seen = new Map(); establishments.forEach(e => { if (e.facility?.id && !seen.has(e.facility.id)) seen.set(e.facility.id, e.facility) }); return [...seen.values()] })()
  const confirm = async () => {
    if (saving || !facility || selected.size === 0 || capOver) return
    setSaving(true); setErr('')
    try {
      const sel = visas.filter(v => selected.has(v.id))
      let nextFn = Math.max(0, ...allDet.map(d => d.file_number || 0))
      const facObj = { id: facility.id, name_ar: facility.name_ar, name_en: facility.name_en, unified_number: facility.unified_number, cr_number: facility.cr_number, gosi_number: facility.gosi_number, hrsd_number: facility.hrsd_number, qiwa_subscription_active: facility.qiwa_subscription_active ?? null }
      const localChanges = {}
      if (effGrouping === 'one') {
        // ملف واحد — كل المختارة برقم ملف (ورقم تأشيرة) واحد مشترك
        nextFn += 1; const fn = nextFn
        const ids = sel.map(v => v.id)
        const { error } = await sb.from('visa_applications').update({ main_facility_id: facility.id, file_number: fn }).in('id', ids)
        if (error) throw error
        ids.forEach(id => { localChanges[id] = { main_facility_id: facility.id, main_facility: facObj, file_number: fn } })
      } else {
        // ملفات منفصلة — كل تأشيرة برقم ملف (ورقم تأشيرة) خاص بها
        for (const v of sel) {
          nextFn += 1; const fn = nextFn
          const { error } = await sb.from('visa_applications').update({ main_facility_id: facility.id, file_number: fn }).eq('id', v.id)
          if (error) throw error
          localChanges[v.id] = { main_facility_id: facility.id, main_facility: facObj, file_number: fn }
        }
      }
      onSaved?.(localChanges); setDone(true)
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  const Chip = ({ n }) => <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, fontSize: 10.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
  const facCells = f => [
    { label: T('الرقم الموحد','Unified'), value: f.unified_number },
    { label: T('رقم التأمينات','GOSI'), value: f.gosi_number },
    { label: T('رقم الموارد البشرية','HRSD'), value: f.hrsd_number },
  ]
  const FacNums = ({ f }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
      {facCells(f).map((c, i) => (
        <div key={i} style={{ background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 8, padding: '6px 8px' }}>
          <span style={{ fontSize: 8.5, color: 'var(--tx4)', fontWeight: 600, display: 'block', marginBottom: 2, textAlign: 'right' }}>{c.label}</span>
          <span style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', direction: 'rtl', unicodeBidi: 'plaintext', display: 'block', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value || '—'}</span>
        </div>
      ))}
    </div>
  )
  const FacRow = ({ f }) => (
    <div onClick={() => { setFacility(f); setErr('') }}
      style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 11, background: 'rgba(255,255,255,.02)', padding: '10px 12px', marginBottom: 7, cursor: 'pointer', transition: '.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.25)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)' }}>
      <div style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8 }}>{facName(f)}</div>
      <FacNums f={f} />
    </div>
  )
  // ── الخطوة 1: اختيار المنشأة ──
  const facilityContent = (
    <ModalSection Icon={Building2} label={T('اختر المنشأة','Pick the establishment')} hint={T('ابحث عن منشأة جديدة أو اختر من منشآت المعاملة','Search a new facility or pick one from this transaction')}>
      {facility ? (
        <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,160,23,.1)', border: '1.5px solid rgba(212,160,23,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 size={20} color={C.gold} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: C.gold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{facName(facility)}</div>
            <button type="button" onClick={() => { setFacility(null); setErr('') }} title={T('تغيير','Change')}
              style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.35)', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <FacNums f={facility} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {quick.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {quick.map(qf => (
                <button key={qf.id} type="button" onClick={() => { setFacility(qf); setErr('') }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 999, background: 'rgba(212,160,23,.07)', border: '1px solid rgba(212,160,23,.32)', color: C.gold, cursor: 'pointer', fontFamily: F, fontSize: 11.5, fontWeight: 600, maxWidth: 240 }}>
                  <Building2 size={11} color={C.gold} strokeWidth={2} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{facName(qf)}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', top: '50%', insetInlineEnd: 12, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none', display: 'inline-flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input type="text" value={q} onChange={e => setQ(e.target.value)} autoFocus
              placeholder={T('ابحث بالاسم أو الرقم الموحد أو التأمينات أو الموارد البشرية…','Search by name, Unified, GOSI or HRSD…')}
              style={{ width: '100%', height: 42, padding: '0 38px', borderRadius: 10, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx1)', fontFamily: F, fontSize: 12.5, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          {q.trim().length >= 2 && (
            <div style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'none' }}>
              {searching && <div style={{ padding: 14, fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('جارٍ البحث…','Searching…')}</div>}
              {!searching && results.length === 0 && <div style={{ padding: 14, fontSize: 12, color: 'var(--tx4)', textAlign: 'center' }}>{T('لا توجد نتائج','No results')}</div>}
              {!searching && results.map(f => <FacRow key={f.id} f={f} />)}
            </div>
          )}
        </div>
      )}
    </ModalSection>
  )
  // ── الخطوة 2: اختيار التأشيرات + طريقة الملف ──
  const groupOpts = [
    { key: 'one', t: T('ملف واحد','One file'), s: T('رقم تأشيرة مشترك للكل','One shared visa No.'), disabled: !sameSpec },
    { key: 'separate', t: T('ملفات منفصلة','Separate files'), s: T('رقم تأشيرة لكل تأشيرة','A visa No. each'), disabled: false },
  ]
  const SecLabel = ({ children, extra }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <FileTextIco size={13} color={C.gold} strokeWidth={2.2} />
      <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>{children}</span>
      {extra && <span style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{extra}</span>}
    </div>
  )
  const visaContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: F }}>
      {facility && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 9, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.25)' }}>
          <Building2 size={13} color={C.gold} strokeWidth={2} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.gold, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{facName(facility)}</span>
          <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: capOver ? C.warn : 'var(--tx4)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{total}/4</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <SecLabel extra={<>
          <button type="button" onClick={() => setSelected(new Set(visas.map(v => v.id)))} style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, padding: 0 }}>{T('تحديد الكل','All')}</button>
          <span style={{ color: 'var(--tx5)', fontSize: 10 }}>·</span>
          <button type="button" onClick={() => setSelected(new Set())} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx4)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, padding: 0 }}>{T('مسح','Clear')}</button>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', fontVariantNumeric: 'tabular-nums' }}>{selected.size}/{visas.length}</span>
        </>}>{T('اختيار التأشيرات','Select visas')}</SecLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visas.map(v => {
            const checked = selected.has(v.id)
            const sub = [embOf(v), occOf(v), genOf(v)].filter(Boolean).join(' · ')
            const curFac = v.main_facility ? facName(v.main_facility) : T('غير مُسندة','Unassigned')
            return (
              <button type="button" key={v.id} onClick={() => toggle(v.id)}
                style={{ width: '100%', textAlign: 'start', display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', alignItems: 'center', gap: 9, padding: '7px 11px', borderRadius: 9, background: checked ? 'rgba(212,160,23,.08)' : 'rgba(0,0,0,.18)', border: `1px solid ${checked ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.06)'}`, cursor: 'pointer', fontFamily: F, transition: '.15s' }}>
                <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 6, background: checked ? C.gold : 'transparent', border: `1.5px solid ${checked ? C.gold : 'rgba(255,255,255,.25)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a' }}>
                  {checked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </span>
                <Chip n={globalIdx(v)} />
                <div style={{ minWidth: 0, fontSize: 12, color: 'var(--tx1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{natOf(v)}{sub ? <span style={{ color: 'var(--tx4)', fontWeight: 600 }}> · {sub}</span> : null}</div>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, maxWidth: 120 }}>
                  <Building2 size={10} color="currentColor" strokeWidth={2} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{curFac}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <SecLabel>{T('طريقة الملف','File grouping')}</SecLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {groupOpts.map(opt => {
            const active = effGrouping === opt.key
            return (
              <button key={opt.key} type="button" disabled={opt.disabled} onClick={() => setGrouping(opt.key)}
                style={{ textAlign: 'start', padding: '9px 12px', borderRadius: 10, cursor: opt.disabled ? 'not-allowed' : 'pointer', opacity: opt.disabled ? .4 : 1, background: active ? 'rgba(212,160,23,.1)' : 'rgba(0,0,0,.18)', border: `1.5px solid ${active ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.07)'}`, fontFamily: F, display: 'flex', flexDirection: 'column', gap: 2, transition: '.15s' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? C.gold : 'var(--tx1)' }}>{opt.t}</span>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{opt.s}</span>
              </button>
            )
          })}
        </div>
        {!sameSpec && selected.size > 1 && <span style={{ display: 'block', fontSize: 10, color: 'var(--tx4)', fontWeight: 600, lineHeight: 1.5 }}>{T('التأشيرات المختارة مختلفة المواصفات — ملفات منفصلة (رقم لكل تأشيرة).','Selected visas differ — separate files (a No. each).')}</span>}
      </div>
    </div>
  )
  return (
    <Modal open onClose={onClose} title={T('إضافة منشأة وتوزيع التأشيرات','Add establishment & distribute')} Icon={Building2} width={620} height={540} accent={C.gold}
      success={done ? <SuccessView title={T('تم توزيع التأشيرات','Visas distributed')} /> : undefined}
      pages={[
        { title: T('اختيار المنشأة','Select establishment'), valid: !!facility, content: facilityContent },
        { title: T('اختيار التأشيرات وطريقة الملف','Select visas & file grouping'), valid: selected.size > 0 && !capOver, error: capOver ? T(`تجاوزت الحد: ${total} تأشيرات (الأقصى 4 لكل منشأة)`, `Over cap: ${total} visas (max 4 per facility)`) : (err || undefined), content: visaContent },
      ]}
      onSubmit={confirm} submitting={saving} submitIcon={CheckCircle2} submitLabel={T('تأكيد التوزيع','Confirm distribution')} />
  )
}

// بيانات الإقامة — رقم الحدود (اختيار التأشيرة) + اسم العامل + رقم الإقامة + تاريخ الانتهاء + مدة الإصدار + ملف PDF.
function TxnIqamaModal({ sb, user, toast, T, defaultVisaId, srId, facilityId, row, visaOptions = [], pdfFiles = [], gateOk = true, onClose, onSaved }) {
  const [form, setForm] = useState({
    visa_application_id: row?.visa_application_id || defaultVisaId || (visaOptions[0]?.value || ''),
    worker_name_at_entry: row?.worker_name_at_entry || '',
    iqama_number: row?.iqama_number || '',
    iqama_expiry: row?.iqama_expiry || '',
    iqama_duration_months: row?.iqama_duration_months != null ? String(row.iqama_duration_months) : '',
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const setF = (k, v) => { setForm(s => ({ ...s, [k]: v })); setErr(null) }
  const valid = !!form.visa_application_id
    && String(form.worker_name_at_entry).trim().length > 0
    && String(form.iqama_number).trim().length > 0
    && !!form.iqama_expiry
    && !!form.iqama_duration_months
    && (!!file || pdfFiles.length > 0)
  const durOptions = [
    { value: '3', label: T('3 أشهر','3 months') },
    { value: '6', label: T('6 أشهر','6 months') },
    { value: '9', label: T('9 أشهر','9 months') },
    { value: '12', label: T('12 شهرًا','12 months') },
  ]
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true)
    setErr(null)
    try {
      let rowId = row?.id
      if (!rowId) {
        // حارس قفل الدفع (احتياطي خلف زرّ الفتح): لا تُنشأ معاملة إقامة قبل سداد دفعة إقامة هذه التأشيرة.
        if (gateOk === false) { setErr(T('لا يمكن تسجيل الإقامة قبل سداد دفعة الإقامة لهذه التأشيرة','Cannot record iqama before this visa’s residence installment is paid')); setSaving(false); return }
        const { data: r, error } = await sb.from('iqama_issuance_applications').insert({
          visa_application_id: form.visa_application_id || defaultVisaId, service_request_id: srId, main_facility_id: facilityId || null,
        }).select('id').single()
        if (error || !r) { setErr(T('تعذر إنشاء سجل الإقامة','Could not create iqama record')); setSaving(false); return }
        rowId = r.id
      }
      const updates = {
        visa_application_id: form.visa_application_id || null,
        worker_name_at_entry: form.worker_name_at_entry.trim() || null,
        iqama_number: form.iqama_number.trim() || null,
        iqama_expiry: form.iqama_expiry || null,
        iqama_duration_months: form.iqama_duration_months ? Number(form.iqama_duration_months) : null,
      }
      const { error: upErr } = await sb.from('iqama_issuance_applications').update(updates).eq('id', rowId)
      if (upErr) throw upErr
      let newAtt = null
      if (file && (!file.type || /pdf/i.test(file.type))) {
        const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `iqama-issuance/${rowId}/iqama_pdf/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: sErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (!sErr) {
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          const { data: att } = await sb.from('attachments').insert({
            entity_type: 'iqama_issuance_application', entity_id: rowId,
            file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
            mime_type: file.type || null, size_bytes: file.size || null, notes: 'iqama_pdf', uploaded_by: user?.id || null,
          }).select('id,entity_id,file_name,file_url,notes,size_bytes,created_at').single()
          newAtt = att || null
        }
      }
      toast?.(T('تم حفظ بيانات الإقامة','Iqama data saved'))
      onSaved?.({ id: rowId, ...updates }, newAtt)
      onClose()
    } catch { setErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={onClose} title={T('بيانات الإقامة','Iqama data')} Icon={CreditCard} width={640} height="auto" accent={C.gold}
      pages={[{ title: T('بيانات الإقامة','Iqama data'), valid, error: err || undefined, content: (
        <ModalSection Icon={CreditCard} label={T('بيانات إصدار الإقامة','Iqama issuance data')}>
          <div style={GRID}>
            <Select req full label={T('رقم الحدود','Border No.')} placeholder={T('اختر رقم الحدود','Select border')}
              value={form.visa_application_id} onChange={v => setF('visa_application_id', v)}
              options={visaOptions} getKey={o => o.value} getLabel={o => o.label} searchable={visaOptions.length > 6} />
            <TextField req label={T('اسم العامل','Worker name')} value={form.worker_name_at_entry} onChange={v => setF('worker_name_at_entry', v)} placeholder={T('بالعربي أو الإنجليزي','Arabic or English')} />
            <TextField req label={T('رقم الإقامة','Iqama No.')} dir="ltr" value={form.iqama_number} onChange={v => setF('iqama_number', v)} placeholder="—" />
            <DateField req label={T('تاريخ انتهاء الإقامة','Iqama Expiry')} value={form.iqama_expiry} onChange={v => setF('iqama_expiry', v)} lang={T('ar','en')} />
            <Select req label={T('مدة إصدار الإقامة','Iqama duration')} placeholder={T('اختر المدة','Select duration')}
              value={form.iqama_duration_months} onChange={v => setF('iqama_duration_months', v)}
              options={durOptions} getKey={o => o.value} getLabel={o => o.label} searchable={false} />
            <FileField full req label={T('ملف مقيم (PDF)','Muqeem file (PDF)')} hint={pdfFiles.length > 0 ? T('يوجد ملف محفوظ — الرفع يضيف نسخة جديدة','A file exists — uploading adds a new copy') : undefined} value={file} onChange={v => { setFile(v); setErr(null) }} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('حفظ وتأكيد','Save & Confirm')} />
  )
}

// Small numbered badge used in card headers to mark the post-payment workflow steps:
// 1) facility → 2) visa issuance → 3) wakalah → 4) medical exam → 5) work permit →
// 6) medical insurance → 7) iqama issuance → 8) iqama delivery.
function StepBadge({ n, c }) {
  return (
    <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: c + '1f', border: '1px solid ' + c + '66', color: c, fontSize: 11.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: F, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
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

function EditField({ label, value, onChange, type = 'text', mono = false, placeholder = '', disabled = false, options = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px' }}>{label}</span>
      {type === 'date' ? (
        <DatePickerInput value={value} onChange={onChange} />
      ) : type === 'select' ? (
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: value ? 'var(--tx1)' : 'var(--tx4)', fontFamily: mono ? 'monospace' : F, fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .45 : 1, direction: mono ? 'ltr' : undefined }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}>
          <option value="" style={{ background: '#1a1a1a', color: '#888' }}>{placeholder || '—'}</option>
          {options.map(o => <option key={o.value} value={o.value} style={{ background: '#1a1a1a', color: '#fff' }}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{ width: '100%', height: 38, padding: '0 12px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx1)', fontFamily: mono ? 'monospace' : F, fontSize: 13, outline: 'none', boxSizing: 'border-box', direction: mono ? 'ltr' : undefined, fontVariantNumeric: mono ? 'tabular-nums' : undefined, opacity: disabled ? .45 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}
        />
      )}
    </div>
  )
}

function AttachField({ T, label, files, isUploading, onPick, allowImage = false, hint, disabled = false }) {
  const accept = allowImage ? 'application/pdf,image/*,.pdf,.jpg,.jpeg,.png,.webp' : 'application/pdf,.pdf'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px' }}>{label}</span>
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: '1px dashed rgba(212,160,23,.32)', background: 'rgba(212,160,23,.04)', cursor: disabled ? 'not-allowed' : (isUploading ? 'wait' : 'pointer'), transition: '.15s', opacity: disabled ? .45 : 1 }}
        onMouseEnter={e => { if (!isUploading && !disabled) e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
        onMouseLeave={e => { if (!isUploading && !disabled) e.currentTarget.style.background = 'rgba(212,160,23,.04)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span style={{ fontSize: 12, color: isUploading ? 'var(--tx4)' : C.gold, fontWeight: 600, flex: 1 }}>{isUploading ? T('جارٍ الرفع…','Uploading…') : (hint || (allowImage ? T('انقر لاختيار صورة أو PDF','Click to choose image or PDF') : T('انقر لاختيار ملف PDF','Click to choose a PDF')))}</span>
        <input type="file" accept={accept} disabled={isUploading || disabled} onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} style={{ display: 'none' }} />
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
const cardTitle  = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }

// سجلّ تغييرات موحّد (عرض فقط) — نفس تصميم صفحة الفاتورة: أيقونة + عنوان، ثم بطاقة لكل تعديل (الأحدث أولاً).
const ChangeLog = ({ T, title, entries, actionLabel, renderDetail }) => {
  if (!Array.isArray(entries) || !entries.length) return null
  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
        {title}
      </span>
      {[...entries].reverse().map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
          <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.28)', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
                <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700 }}>{actionLabel}</span>
                {c.by_name && <span style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>{T('بواسطة', 'by')} {c.by_name}</span>}
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>{fmtDateTime(c.at)}</span>
            </div>
            {renderDetail && renderDetail(c)}
          </div>
        </div>
      ))}
    </div>
  )
}
// تفاصيل تغييرات الحقول داخل ChangeLog — لكل حقل: التسمية، القيمة الجديدة، والقديمة (مشطوبة) أو «جديد».
const FieldChanges = ({ T, changes, LBL, showVal }) => (
  <>{(Array.isArray(changes) ? changes : []).map((ch, j) => (
    <div key={j} style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <span>{T(LBL[ch.field]?.[0] || ch.field, LBL[ch.field]?.[1] || ch.field)}:</span>
      <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{showVal ? showVal(ch.field, ch.to) : (ch.to || '—')}</span>
      {ch.from
        ? <span style={{ color: 'var(--tx5)' }}>({T('كان', 'was')}: <span style={{ textDecoration: 'line-through' }}>{showVal ? showVal(ch.field, ch.from) : ch.from}</span>)</span>
        : <span style={{ color: 'var(--tx5)' }}>({T('جديد', 'new')})</span>}
    </div>
  ))}</>
)

const btnFilter = (active) => ({ padding: '11px 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8 })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : C.gold, fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
