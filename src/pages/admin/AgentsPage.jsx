import React, { useEffect, useMemo, useState } from 'react'
import BackButton from '../../components/BackButton'
import { Drop } from './PermissionsPage.jsx'
import { can as canPerm } from '../../lib/permissions.js'
import { noDash } from '../../lib/utils.js'
import { Modal as FKModal, ModalSection, GRID, TextField, IdField, PhoneField, CurrencyField, Select, SuccessView, EmptyState } from '../../components/ui/FormKit.jsx'
import { SkeletonCards, SkeletonList } from '../../components/ui/Skeleton.jsx'
import {
  Users, Phone, FileText, Wallet, Search,
  Calendar, Building2, User, Copy, Check,
  IdCard, Coins,
} from 'lucide-react'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const GOLD = C.gold
const PAGE = 36
const num = (v) => Number(v || 0).toLocaleString('en-US')
const fmtGreg = (iso) => { if (!iso) return '—'; try { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` } catch { return '—' } }
const fmtPhone = (p) => p ? String(p).replace(/^\+?966/, '0') : p
const daysAgoLabel = (iso, isAr) => { if (!iso) return null; const dd = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); if (dd <= 0) return isAr ? 'اليوم' : 'today'; return isAr ? `قبل ${dd} يوم` : `${dd}d ago` }
const initial = (name) => ((name || '—').trim().charAt(0) || '?')
const colorFor = (s) => {
  let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const palette = ['#5dade2', '#bb8fce', '#16a085', '#f39c12', '#e8c77a', '#2ecc71', '#3498db']
  return palette[h % palette.length]
}
const svcColor = (code) => ({
  work_visa: C.blue, iqama_issuance: '#27ae60', transfer: C.orange,
  iqama_renewal: C.cyan, ajeer: C.purple, other: C.gold, general: C.gray,
}[code] || C.gray)
const ROLE_PALETTE = [C.gold, C.blue, '#16a085', '#bb8fce', '#f39c12', C.ok, '#e8c77a', '#5dade2', '#27ae60']
// عمولات الوسيط: لا شيء/الكل مدفوع/جزئي/غير مدفوع — نفس منطق payState في صفحة العملاء
const payState = (total, paid) => {
  if (total <= 0) return { code: 'none', c: C.gray }
  if (paid >= total) return { code: 'paid', c: C.ok }
  if (paid > 0) return { code: 'partial', c: C.gold }
  return { code: 'unpaid', c: C.red }
}

/* ─── Shared chrome (matches the Clients page) ─── */
const cardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle = { fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '.2px' }

const Lbl = ({ children }) => (
  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: '.2px' }}>{children}</div>
)

/* ─── KPI hero card — matches the Clients page HeroStat ─── */
function HeroStat({ tone, label, value, footer }) {
  return (
    <div style={{
      position: 'relative', padding: '18px 22px', borderRadius: 16,
      background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
      border: '1px solid rgba(255,255,255,.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      overflow: 'hidden', minHeight: 150,
    }}>
      <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${tone}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone, boxShadow: `0 0 10px ${tone}aa` }} />
        <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: tone, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{footer}</span>
      </div>
    </div>
  )
}

/* ─── Nationality distribution donut card — matches the Clients page ─── */
function NatDonutCard({ items, totalLabel, title }) {
  const total = items.reduce((s, r) => s + r.cnt, 0)
  const denom = total || 1 // guard the donut arc math against divide-by-zero when empty
  const topN = items.slice(0, 6)
  const R = 32, CIRC = 2 * Math.PI * R
  let offset = 0
  return (
    <div style={{
      borderRadius: 16,
      background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
      border: '1px solid rgba(255,255,255,.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
      padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{title}</span>
        <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
          <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', marginLeft: 6 }}>{num(total)}</span>{totalLabel}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <svg width="86" height="86" viewBox="-43 -43 86 86" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
          <circle r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="11" />
          {items.map((r, i) => {
            const c = r.color || ROLE_PALETTE[i % ROLE_PALETTE.length]
            const dash = (r.cnt / denom) * CIRC
            const seg = (
              <circle key={i} r={R} fill="none" stroke={c} strokeWidth="11"
                strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-offset}
                style={{ transition: 'stroke-dasharray .3s' }}>
                <title>{`${r.name}: ${r.cnt}`}</title>
              </circle>
            )
            offset += dash
            return seg
          })}
          <text x="0" y="0" textAnchor="middle" dominantBaseline="central" transform="rotate(90)"
            style={{ fill: '#fff', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {num(total)}
          </text>
        </svg>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 6, minWidth: 0 }}>
          {topN.length ? topN.map((r, i) => {
            const c = r.color || ROLE_PALETTE[i % ROLE_PALETTE.length]
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, minWidth: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ color: c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', flexShrink: 0, fontWeight: 700 }}>{num(r.cnt)}</span>
              </div>
            )
          }) : <span style={{ fontSize: 12, color: 'var(--tx4)' }}>لا توجد بيانات</span>}
        </div>
      </div>
    </div>
  )
}

/* ─── Copyable info row helpers (match the Clients page) ─── */
function CopyBtn({ value, toast }) {
  const [done, setDone] = useState(false)
  const copy = async (e) => {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(String(value)); setDone(true); setTimeout(() => setDone(false), 1200) } catch (_) { toast?.('تعذّر النسخ') }
  }
  return (
    <button type="button" onClick={copy} title="نسخ"
      onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!done) e.currentTarget.style.color = 'var(--tx4)' }}
      style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: '1px solid rgba(255,255,255,.08)', background: done ? 'rgba(39,160,70,.16)' : 'rgba(255,255,255,.04)', color: done ? C.ok : 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s' }}>
      {done ? <Check size={12} /> : <Copy size={12} />}
    </button>
  )
}

function InfoSectionCard({ title, items, headerAction }) {
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
        <span style={cardTitle}>{title}</span>
        {headerAction}
      </div>
      <div style={{ padding: '6px 22px 12px' }}>
        {items.map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < items.length - 1 ? '1px dashed rgba(255,255,255,.07)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{f.label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              {f.copy && f.value && <CopyBtn value={f.value} toast={f.toast} />}
              <span style={{ fontSize: 13, color: f.value ? (f.color || 'var(--tx2)') : 'var(--tx5)', fontWeight: 600, direction: f.mono ? 'ltr' : 'rtl', fontFamily: f.mono ? 'monospace' : 'inherit', textAlign: 'end', overflow: 'hidden', textOverflow: f.wrap ? 'clip' : 'ellipsis', whiteSpace: f.wrap ? 'normal' : 'nowrap', wordBreak: f.wrap ? 'break-word' : 'normal' }} title={f.value || ''}>{f.value || '—'}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const AmountBox = ({ label, value, color }) => (
  <div style={{ padding: '14px 12px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
    {label && <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: '.5px' }}>{label}</div>}
    <div style={{ fontSize: 17, fontWeight: 700, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</div>
  </div>
)

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function AgentsPage({ sb, lang, user, toast, emptyIcon }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ branch_id: '', nationality_id: '' })
  const [advOpen, setAdvOpen] = useState(false)

  const [branches, setBranches] = useState([])
  const [nationalities, setNationalities] = useState([])
  const [stats, setStats] = useState(null)

  const [selectedId, setSelectedId] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  /* ─── Bootstrap: branches, nationalities, agents + commission roll-up ─── */
  useEffect(() => {
    sb.from('branches').select('id,branch_code').order('branch_code').then(({ data }) => setBranches(data || []))
    sb.from('nationalities').select('id,name_ar,name_en').eq('is_active', true).order('name_ar').then(({ data }) => setNationalities(data || []))

    setLoading(true)
    Promise.all([
      sb.from('agents').select(`
        id, name_ar, name_en, id_number, phone, created_at, default_commission_amount, nationality_id, branch_id,
        nationality:nationality_id(name_ar,name_en,flag_url),
        branch:branch_id(branch_code)
      `).is('deleted_at', null).order('created_at', { ascending: false, nullsFirst: false }),
      sb.from('service_request_agents').select('agent_id,commission_amount,commission_paid_at,service_request:service_request_id!inner(request_date,deleted_at)').is('service_request.deleted_at', null),
    ]).then(([aR, cR]) => {
      const ags = aR.data || []
      const links = cR.data || []

      // Per-agent roll-up
      const byAgent = {}
      links.forEach(x => {
        if (!byAgent[x.agent_id]) byAgent[x.agent_id] = { count: 0, sum: 0, paid: 0, paidCount: 0, lastReq: null, lastPaid: null }
        const a = byAgent[x.agent_id]
        a.count += 1
        a.sum += Number(x.commission_amount || 0)
        if (x.commission_paid_at) { a.paid += Number(x.commission_amount || 0); a.paidCount += 1; if (!a.lastPaid || x.commission_paid_at > a.lastPaid) a.lastPaid = x.commission_paid_at }
        const rd = x.service_request?.request_date
        if (rd && (!a.lastReq || rd > a.lastReq)) a.lastReq = rd
      })

      // Headline distributions
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const newThisMonth = ags.filter(a => a.created_at && new Date(a.created_at) >= monthStart).length
      const byBranch = {}
      ags.forEach(a => { if (a.branch_id) byBranch[a.branch_id] = (byBranch[a.branch_id] || 0) + 1 })
      const topBranchEntry = Object.entries(byBranch).sort((a, b) => b[1] - a[1])[0]
      const byNat = {}
      ags.forEach(a => { const k = a.nationality?.name_ar || 'غير محدد'; byNat[k] = (byNat[k] || 0) + 1 })
      const topNats = Object.entries(byNat).sort((a, b) => b[1] - a[1])

      setAgents(ags.map(a => ({ ...a, _stats: byAgent[a.id] || { count: 0, sum: 0, paid: 0, paidCount: 0, lastReq: null, lastPaid: null } })))
      setStats({
        total: ags.length,
        topNats,
        newThisMonth,
        topBranchId: topBranchEntry?.[0],
        topBranchCount: topBranchEntry?.[1] || 0,
      })
      setLoading(false)
    })
  }, [sb, refreshTick])

  const hasFilters = filters.branch_id || filters.nationality_id

  const filtered = useMemo(() => agents.filter(a => {
    if (filters.branch_id && String(a.branch_id) !== String(filters.branch_id)) return false
    if (filters.nationality_id && String(a.nationality_id) !== String(filters.nationality_id)) return false
    if (!q.trim()) return true
    const s = q.trim().toLowerCase()
    return (a.name_ar || '').toLowerCase().includes(s) ||
           (a.name_en || '').toLowerCase().includes(s) ||
           (a.id_number || '').includes(s) ||
           (a.phone || '').includes(s)
  }), [agents, filters, q])

  // ترتيب الوسطاء حسب آخر عمولة مدفوعة (الأحدث أولاً) — من لا عمولة مدفوعة له في الأسفل
  const sortedRows = useMemo(() => filtered.slice().sort((a, b) => {
    const pa = a._stats?.lastPaid || ''
    const pb = b._stats?.lastPaid || ''
    if (pa && pb) return pb < pa ? -1 : pb > pa ? 1 : 0
    if (pa) return -1
    if (pb) return 1
    return 0
  }), [filtered])

  const total = sortedRows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE))
  const pageRows = sortedRows.slice(page * PAGE, page * PAGE + PAGE)

  const natDist = useMemo(() => (stats?.topNats || []).map(([name, cnt], i) => ({ name, cnt, color: ROLE_PALETTE[i % ROLE_PALETTE.length] })), [stats])

  const selectedAgent = selectedId ? agents.find(a => a.id === selectedId) : null
  if (selectedAgent) {
    return (
      <AgentDetailPage sb={sb} agent={selectedAgent} agentStats={selectedAgent._stats}
        toast={toast} onBack={() => setSelectedId(null)} T={T} isAr={isAr} canEdit={canPerm(user, 'admin_agents.edit')}
        branches={branches} nationalities={nationalities} onReload={() => setRefreshTick(t => t + 1)} />
    )
  }

  const topBranchCode = branches.find(b => b.id === stats?.topBranchId)?.branch_code || '—'
  const initialLoading = loading && agents.length === 0

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .clp-hero { display: grid; grid-template-columns: 1.8fr 1fr; gap: 14px; }
        .cl-row { transition: all .15s; }
        .cl-row:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(0,0,0,.34) !important; border-color: rgba(212,160,23,.22) !important; }
        .cl-row-vdiv { width: 1px; align-self: stretch; background: linear-gradient(180deg,transparent 0%,rgba(255,255,255,.08) 50%,transparent 100%); min-height: 46px; }
        @media (max-width: 720px) { .clp-hero { grid-template-columns: 1fr; } .cl-row-vdiv { display: none; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('الوسطاء', 'Agents')}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('قائمة الوسطاء وسجل الطلبات التي جلبوها وعمولاتهم.', 'Agents directory with referred requests and commissions.')}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', marginTop: 6, lineHeight: 1.6, opacity: .8 }}>{T('إجمالي الوسطاء وتوزيع الجنسيات رصيد تراكمي دائم، و«جديد هذا الشهر» يُحسب من بداية الشهر الميلادي الحالي', 'Total agents and nationality split are all-time; “new this month” counts from the start of the current calendar month')}</div>
      </div>

      {initialLoading ? (<><SkeletonCards count={2} cols="1.8fr 1fr" minHeight={150} /><SkeletonList rows={6} /></>) : (<>

      {/* Stats hero — KPI + nationality donut (Clients page style) */}
      <div className="clp-hero" style={{ marginBottom: 24 }}>
        <HeroStat tone={GOLD} label={T('الوسطاء', 'Agents')} value={num(stats?.total || 0)}
          footer={T(`${num(stats?.newThisMonth || 0)} جديد هذا الشهر`, `${num(stats?.newThisMonth || 0)} new this month`)} />
        <NatDonutCard items={natDist} totalLabel={T('وسيط', 'agents')} title={T('التوزّع حسب الجنسيات', 'By nationality')} />
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={14} color="var(--tx4)" style={{ position: 'absolute', top: '50%', insetInlineEnd: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder={T('ابحث بالاسم، رقم الهوية، الجوال…', 'Search by name, ID or phone…')}
            style={{ width: '100%', height: 44, padding: '0 40px 0 14px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
        <button onClick={() => setAdvOpen(o => !o)} style={btnFilter(advOpen || hasFilters)}>
          {T('تصفية', 'Filter')}
          {hasFilters ? (
            <span role="button" tabIndex={0} title={T('مسح الفلاتر', 'Clear filters')}
              onClick={e => { e.stopPropagation(); setFilters({ branch_id: '', nationality_id: '' }); setPage(0) }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); setFilters({ branch_id: '', nationality_id: '' }); setPage(0) } }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
              style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6" /><line x1="18" y1="6" x2="20" y2="6" /><circle cx="16" cy="6" r="2" /><line x1="4" y1="12" x2="8" y2="12" /><line x1="12" y1="12" x2="20" y2="12" /><circle cx="10" cy="12" r="2" /><line x1="4" y1="18" x2="16" y2="18" /><line x1="20" y1="18" x2="20" y2="18" /><circle cx="18" cy="18" r="2" /></svg>
          )}
        </button>
      </div>

      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 12 }}>
            <div>
              <Lbl>{T('المكتب', 'Branch')}</Lbl>
              <Drop value={filters.branch_id} onChange={v => { setFilters(f => ({ ...f, branch_id: v })); setPage(0) }} placeholder={T('جميع المكاتب', 'All branches')}
                options={[{ v: '', l: T('جميع المكاتب', 'All branches') }, ...branches.map(b => ({ v: b.id, l: b.branch_code }))]} />
            </div>
            <div>
              <Lbl>{T('الجنسية', 'Nationality')}</Lbl>
              <Drop value={filters.nationality_id} onChange={v => { setFilters(f => ({ ...f, nationality_id: v })); setPage(0) }} placeholder={T('كل الجنسيات', 'All nationalities')}
                options={[{ v: '', l: T('كل الجنسيات', 'All nationalities') }, ...nationalities.map(n => ({ v: n.id, l: isAr ? n.name_ar : n.name_en }))]} />
            </div>
          </div>
        </div>
      )}

      {/* List — flat, ordered by each agent's latest commission payment */}
      {total === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={q || hasFilters ? T('لا توجد نتائج مطابقة', 'No matches') : T('لا يوجد وسطاء بعد', 'No agents yet')}
          desc={q || hasFilters ? T('جرّب تعديل التصفية أو كلمة البحث', 'Try adjusting the filter or search') : T('أضِف أول وسيط لتتبّع الطلبات والعمولات', 'Add your first agent to track requests and commissions')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {pageRows.map(a => (
            <AgentRow key={a.id} agent={a} agentStats={a._stats} onClick={() => setSelectedId(a.id)} T={T} isAr={isAr} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && total > PAGE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <div style={{ fontSize: 12, color: 'var(--tx3)' }}>
            {T('صفحة', 'Page')} <span style={{ color: GOLD, fontWeight: 700 }}>{page + 1}</span> / {totalPages} · {num(total)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} style={btnPg(page === 0)}>{T('السابق', 'Prev')}</button>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} style={btnPg(page + 1 >= totalPages)}>{T('التالي', 'Next')}</button>
          </div>
        </div>
      )}

      </>)}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Agent row — mirrors ClientRow (commissions instead of invoices)
   ═══════════════════════════════════════════════════════════════ */
function AgentRow({ agent, agentStats, onClick, T, isAr }) {
  const c = agentStats || { count: 0, sum: 0, paid: 0, paidCount: 0 }
  const totalCom = Number(c.sum || 0)
  const paid = Number(c.paid || 0)
  const due = Math.max(0, totalCom - paid)
  const ps = payState(totalCom, paid)
  const accent = colorFor(agent.id)
  const name = agent.name_ar || agent.name_en || '—'
  const reqCount = c.count || 0
  const paidCount = c.paidCount || 0
  const totalDisp = num(Math.round(totalCom))

  const flagAvatar = (size = 42, radius = 12) => (
    <div title={agent.nationality?.name_ar || ''} style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', background: `linear-gradient(135deg, ${accent}33 0%, ${accent}14 100%)`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.42), fontWeight: 800, flexShrink: 0 }}>
      {agent.nationality?.flag_url ? <img src={agent.nationality.flag_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial(name)}
    </div>
  )
  const pill = (icon, label, color, bg, bd) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, background: bg, border: `1px solid ${bd}`, color, fontSize: 10, fontWeight: 700 }}>{icon}{label}</span>
  )
  const baseBg = `linear-gradient(135deg, ${accent}0e 0%, #232323 50%, #1f1f1f 100%)`

  const nameText = (size = 15) => <span style={{ fontSize: size, fontWeight: 700, color: 'rgba(255,255,255,.92)', letterSpacing: '-.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
  const idText = agent.id_number ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}><IdCard size={13} color="rgba(255,255,255,.45)" /><span style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: 'monospace' }}>{agent.id_number}</span></span> : null
  const phoneBit = agent.phone ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}><Phone size={12} color="rgba(255,255,255,.45)" /><span style={{ fontFamily: 'monospace', color: 'var(--tx4)' }}>{fmtPhone(agent.phone)}</span></span> : null
  const mline = (children, gap = 12) => <div style={{ display: 'inline-flex', alignItems: 'center', gap, fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600, flexWrap: 'wrap' }}>{children}</div>

  return (
    <div onClick={onClick} className="cl-row" style={{ position: 'relative', cursor: 'pointer', borderRadius: 14, background: baseBg, border: '1px solid rgba(255,255,255,.06)', boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03)', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 160px', gap: 16, alignItems: 'center', padding: '14px 18px' }}>
        {/* Content — avatar + name, then id+phone, then request pills */}
        <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
          {flagAvatar(40, 11)}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{nameText(15)}</div>
            {mline(<>{idText}{phoneBit}</>, 10)}
            <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {pill(<FileText size={11} />, `${num(reqCount)} ${T('طلب', 'req')}`, GOLD, 'rgba(212,160,23,.10)', 'rgba(212,160,23,.28)')}
              {paidCount > 0 && pill(<Check size={11} />, `${num(paidCount)} ${T('مدفوعة', 'paid')}`, C.ok, 'rgba(46,204,113,.10)', 'rgba(46,204,113,.28)')}
            </div>
          </div>
        </div>
        <div className="cl-row-vdiv" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 10, background: `linear-gradient(160deg, ${ps.c}14 0%, rgba(0,0,0,.25) 100%)`, border: `1px solid ${ps.c}26` }}>
          <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '.4px' }}>{T('إجمالي العمولات', 'Commissions')}</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: ps.c, direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{totalDisp}</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, direction: 'ltr', color: due > 0 ? C.warn : C.ok }}>{due > 0 ? `− ${num(Math.round(due))}` : (totalCom > 0 ? `✓ ${T('مدفوعة بالكامل', 'fully paid')}` : '—')}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Detail page — mirrors ClientDetailPage
   ═══════════════════════════════════════════════════════════════ */
function AgentDetailPage({ sb, agent, agentStats, toast, onBack, T, isAr, branches = [], nationalities = [], onReload, canEdit = true }) {
  const [links, setLinks] = useState(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    sb.from('service_request_agents').select(`
      commission_amount, commission_paid_at,
      service_request:service_request_id!inner(
        id, request_ref_no, request_date, quantity, deleted_at,
        client:client_id(name_ar,name_en),
        service_type:service_type_id(code,value_ar,value_en),
        status:status_id(code,value_ar,value_en),
        branch:branch_id(branch_code),
        invoice:invoices(id,invoice_no,total_amount,paid_amount,remaining_amount,created_at)
      )
    `).eq('agent_id', agent.id).is('service_request.deleted_at', null)
      .then(({ data }) => {
        const rows = (data || []).filter(r => r.service_request)
        rows.sort((a, b) => (b.service_request?.request_date || '').localeCompare(a.service_request?.request_date || ''))
        setLinks(rows)
      })
  }, [sb, agent.id])

  const name = agent.name_ar || agent.name_en || '—'
  const totalCom = links?.reduce((s, r) => s + Number(r.commission_amount || 0), 0) || 0
  const reqCount = links?.length || 0

  // الفواتير المرتبطة بطلبات الوسيط — كل طلب يحمل فاتورته
  const invoiceRows = (links || [])
    .map(r => { const sr = r.service_request; const inv = sr?.invoice?.[0]; return inv ? { ...inv, service_type: sr.service_type, quantity: sr.quantity, branch: sr.branch } : null })
    .filter(Boolean)
  const openInvoice = (id) => { if (id) window.dispatchEvent(new CustomEvent('app-navigate-invoice', { detail: { id } })) }
  const invTotal = invoiceRows.reduce((s, r) => s + Number(r.total_amount || 0), 0)
  const invPaid = invoiceRows.reduce((s, r) => s + Number(r.paid_amount || 0), 0)
  const invDue = Math.max(0, invTotal - invPaid)
  const invPct = invTotal > 0 ? Math.min(100, Math.round((invPaid / invTotal) * 100)) : 0
  const invPs = payState(invTotal, invPaid)
  const lastInvoiceIso = (() => { const ds = invoiceRows.map(r => r.created_at).filter(Boolean); return ds.length ? ds.slice().sort().slice(-1)[0] : null })()

  const branchCode = agent.branch?.branch_code || branches.find(b => b.id === agent.branch_id)?.branch_code

  const infoItems = [
    { label: T('الاسم', 'Name'), value: agent.name_ar || agent.name_en },
    agent.name_en && agent.name_ar ? { label: T('الاسم بالإنجليزية', 'Name (EN)'), value: agent.name_en, mono: true } : null,
    { label: T('رقم الهوية', 'ID number'), value: agent.id_number, mono: true, copy: true },
    { label: T('الجوال', 'Phone'), value: fmtPhone(agent.phone), mono: true, copy: true },
    { label: T('الجنسية', 'Nationality'), value: agent.nationality?.name_ar },
    { label: T('المكتب', 'Branch'), value: branchCode, mono: true },
    Number(agent.default_commission_amount || 0) > 0 ? { label: T('العمولة الافتراضية', 'Default commission'), value: num(agent.default_commission_amount), mono: true, color: GOLD } : null,
    { label: T('تاريخ الإضافة', 'Joined'), value: fmtGreg(agent.created_at), mono: true },
  ].filter(Boolean).map(f => ({ ...f, toast }))

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 48, color: 'var(--tx2)', direction: 'rtl' }}>
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <BackButton onBack={onBack} label={T('رجوع', 'Back')} />
      </div>

      {/* Header — icon + name title */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <div style={{ fontSize: 22, fontWeight: 600, color: GOLD, letterSpacing: '-.2px' }}>{name}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>{T('عرض بيانات الوسيط وسجل الطلبات التي جلبها وعمولاته.', 'Agent profile, referred requests and commissions.')}</div>
      </div>

      <div className="cld-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        <style>{`@media (max-width:900px){.cld-grid{grid-template-columns:1fr !important}.cld-side,.cld-main{grid-column:auto !important;position:static !important}}`}</style>

        {/* Right column — agent info + commissions */}
        <div className="cld-main" style={{ gridColumn: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InfoSectionCard title={T('بيانات الوسيط', 'Agent')} items={infoItems}
            headerAction={!canEdit ? null : (
              <button onClick={() => setEditing(true)}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s ease, border-color .15s ease' }}>
                {T('تعديل', 'Edit')}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
            )} />

          {/* Invoices log — فواتير الطلبات التي جلبها الوسيط */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
              <span style={cardTitle}>{T('سجل الفواتير', 'Invoices')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{invoiceRows.length}</span>
            </div>
            <div style={{ padding: '14px 18px' }}>
              {links === null && <div style={{ color: 'var(--tx4)', fontSize: 12, padding: 16, textAlign: 'center' }}>{T('جاري التحميل…', 'Loading…')}</div>}
              {links !== null && invoiceRows.length === 0 && <div style={{ color: 'var(--tx4)', fontSize: 12, padding: 16, textAlign: 'center' }}>{T('لا توجد فواتير بعد', 'No invoices yet')}</div>}
              {invoiceRows.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {invoiceRows.map(invoice => (
                    <InvoiceRow key={invoice.id} invoice={invoice} openInvoice={openInvoice} T={T} isAr={isAr} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Left column — commission summary + stats (sticky) */}
        <div className="cld-side" style={{ gridColumn: 2, position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Financial summary */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('الملخص المالي', 'Financial Summary')}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, padding: 1, background: 'rgba(255,255,255,.04)' }}>
              <AmountBox label={T('الفوترة', 'Invoiced')} value={num(Math.round(invTotal))} color={GOLD} />
              <AmountBox label={T('المسدّد', 'Paid')} value={num(Math.round(invPaid))} color={C.ok} />
              <AmountBox label={T('المتبقي', 'Remaining')} color={invDue > 0 ? C.red : 'var(--tx)'} value={num(Math.round(invDue))} />
            </div>
            <div style={{ padding: '14px 22px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--tx3)' }}>
                <span>{T('نسبة السداد', 'Paid')}</span>
                <span style={{ color: invPs.c, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{invPct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${invPct}%`, background: `linear-gradient(90deg, ${invPs.c}, ${invPs.c}dd)`, transition: 'width .3s' }} />
              </div>
            </div>
          </div>
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('إحصاءات', 'Stats')}</span></div>
            <div style={{ padding: '6px 22px 12px' }}>
              {[
                { Icon: FileText, label: T('عدد الطلبات', 'Requests'), value: links === null ? '…' : num(reqCount) },
                { Icon: Wallet, label: T('عدد الفواتير', 'Invoices'), value: links === null ? '…' : num(invoiceRows.length) },
                { Icon: Coins, label: T('إجمالي العمولات', 'Commissions'), value: links === null ? '…' : num(Math.round(totalCom)), color: GOLD },
                { Icon: Coins, label: T('العمولة الافتراضية', 'Default commission'), value: Number(agent.default_commission_amount || 0) > 0 ? num(agent.default_commission_amount) : '—' },
                { Icon: Calendar, label: T('آخر فاتورة', 'Last invoice'), value: lastInvoiceIso ? daysAgoLabel(lastInvoiceIso, isAr) : '—', color: GOLD },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px dashed rgba(255,255,255,.07)' : 'none' }}>
                  <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}><row.Icon size={13} color="rgba(255,255,255,.4)" />{row.label}</span>
                  <span style={{ fontSize: 13, color: row.color || 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {editing && (
        <AgentEditModal sb={sb} agent={agent} branches={branches} nationalities={nationalities} toast={toast}
          onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onReload?.() }} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Invoice row — identical to the Clients page invoice log
   ═══════════════════════════════════════════════════════════════ */
function InvoiceRow({ invoice, openInvoice, T, isAr }) {
  const total = Number(invoice.total_amount || 0)
  const paid = Number(invoice.paid_amount || 0)
  const remaining = Number(invoice.remaining_amount || 0)
  const ps = payState(total, paid)
  const sClr = svcColor(invoice.service_type?.code)
  const invNo = noDash(invoice.invoice_no) || `#${String(invoice.id).slice(0, 8)}`
  const svcName = isAr ? invoice.service_type?.value_ar : (invoice.service_type?.value_en || invoice.service_type?.value_ar)

  const noBtn = (size = 13) => (
    <button type="button" onClick={() => openInvoice(invoice.id)} title={T('فتح تفاصيل الفاتورة', 'Open invoice')}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: size, color: GOLD, fontFamily: 'monospace', fontWeight: 700, direction: 'ltr', textDecoration: 'underline', textUnderlineOffset: 3 }}>{invNo}</button>
  )
  const isVisa = (invoice.service_type?.code || '').includes('work_visa')
  const serviceChip = invoice.service_type ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, color: sClr, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: sClr + '1a', border: `1px solid ${sClr}40` }}>
      {isVisa && invoice.quantity > 0 && <>
        <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>×{num(invoice.quantity)}</span>
        <span style={{ width: 1, height: 12, background: `${sClr}80`, flexShrink: 0 }} />
      </>}
      {svcName}
    </span>
  ) : null
  const branchChip = invoice.branch?.branch_code ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: GOLD, direction: 'ltr' }}><Building2 size={10} />{invoice.branch.branch_code}</span> : null
  const paidLabel = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.ok, fontWeight: 700 }}>{T('تم السداد بالكامل', 'Fully paid')}<Check size={11} /></span>

  const amtPill = (label, value, color) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)' }}>
      {label}<b style={{ color, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(value)}</b>
    </span>
  )

  return (
    <div style={{ padding: '12px 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 999, background: ps.c, marginInlineEnd: 12 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, minWidth: 0 }}>{noBtn()}<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{serviceChip}</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
              <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('الإجمالي', 'Total')}</span>
              <b style={{ fontSize: 18, lineHeight: 1, color: GOLD, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(total)}</b>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            {branchChip || <span />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {remaining > 0
                ? <>{amtPill(T('المدفوع', 'Paid'), paid, C.ok)}{amtPill(T('المتبقي', 'Remaining'), remaining, C.red)}</>
                : paidLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Agent edit modal — mirrors ClientEditModal
   ═══════════════════════════════════════════════════════════════ */
function AgentEditModal({ sb, agent, branches, nationalities, toast, onClose, onSaved }) {
  const [f, setF] = useState({
    name_ar: agent.name_ar || agent.name_en || '',
    id_number: agent.id_number || '',
    phone: String(agent.phone || '').replace(/^\+?966/, '').replace(/^0/, '').replace(/\D/g, '').slice(0, 9),
    nationality_id: agent.nationality_id || '',
    branch_id: agent.branch_id || '',
    default_commission_amount: agent.default_commission_amount != null ? String(agent.default_commission_amount) : '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const set = (k, v) => { setErrMsg(''); setF(p => ({ ...p, [k]: v })) }

  // Core fields are required — the «تعديل» button stays disabled until every input is valid.
  const idDigits = (f.id_number || '').replace(/\D/g, '')
  const phoneDigits = (f.phone || '').replace(/\D/g, '')
  const valid = !!(f.name_ar.trim() && idDigits.length === 10 && phoneDigits.length === 9 && f.nationality_id && f.branch_id)

  // إغلاق تلقائي بعد ظهور شاشة النجاح الموحّدة
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onSaved?.(), 1400)
    return () => clearTimeout(t)
  }, [done])

  const save = async () => {
    if (!f.name_ar.trim()) { setErrMsg('الاسم مطلوب'); return }
    if (idDigits.length !== 10) { setErrMsg('رقم الهوية يجب أن يكون 10 أرقام'); return }
    const phone9 = phoneDigits
    if (phone9.length !== 9) { setErrMsg('رقم الجوال يجب أن يكون 9 أرقام بعد +966'); return }
    if (!f.nationality_id) { setErrMsg('الجنسية مطلوبة'); return }
    if (!f.branch_id) { setErrMsg('المكتب مطلوب'); return }
    setSaving(true)
    const newPhone = phone9 ? '966' + phone9 : null
    const commission = f.default_commission_amount === '' ? null : Number(f.default_commission_amount)
    const { data, error } = await sb.from('agents').update({
      name_ar: f.name_ar.trim() || null,
      id_number: f.id_number.trim() || null,
      phone: newPhone,
      nationality_id: f.nationality_id || null,
      branch_id: f.branch_id || null,
      default_commission_amount: commission,
      updated_at: new Date().toISOString(),
    }).eq('id', agent.id).select()
    if (error) { setErrMsg(error.message.slice(0, 100)); setSaving(false); return }
    if ((data || []).length === 0) { setErrMsg('لم يتم الحفظ — ليست لديك صلاحية كافية'); setSaving(false); return }
    setSaving(false)
    setDone(true)
  }

  return (
    <FKModal open onClose={() => (done ? onSaved?.() : onClose())} width={560} height="auto"
      title="تعديل بيانات الوسيط" Icon={User} variant="edit"
      success={done ? <SuccessView title="تم تعديل البيانات بنجاح" /> : null}
      onSubmit={save} submitting={saving} submitLabel="تعديل"
      pages={[{
        valid, error: errMsg, content: (
          <ModalSection Icon={User} label="بيانات الوسيط">
            <div style={GRID}>
              <TextField label="الاسم" req full value={f.name_ar} onChange={v => set('name_ar', v)} placeholder="اسم الوسيط" />
              <IdField label="رقم الهوية" req value={f.id_number} onChange={v => set('id_number', v)} placeholder="0000000000" />
              <PhoneField label="رقم الجوال" req value={f.phone} onChange={v => set('phone', v)} />
              <Select label="الجنسية" req value={f.nationality_id} onChange={v => set('nationality_id', v)} placeholder="— اختر —"
                options={nationalities} getKey={n => n.id} getLabel={n => n.name_ar} />
              <Select label="المكتب" req value={f.branch_id} onChange={v => set('branch_id', v)} placeholder="— اختر —"
                options={branches} getKey={b => b.id} getLabel={b => b.branch_code} />
              <CurrencyField label="العمولة الافتراضية" hint="اختياري" full value={f.default_commission_amount} onChange={v => set('default_commission_amount', v)} />
            </div>
          </ModalSection>
        ),
      }]}
    />
  )
}

const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? GOLD : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : GOLD, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
