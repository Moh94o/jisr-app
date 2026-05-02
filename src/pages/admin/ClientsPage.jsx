import React, { useEffect, useMemo, useState, useCallback } from 'react'
import {
  Users, Phone, MapPin, FileText, Wallet, Activity, Search, SlidersHorizontal,
  ChevronDown, ArrowRight, Hash, AlertCircle, Edit2, Plus, TrendingUp, Globe,
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
const fmtGreg = (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) } catch { return '—' } }
const initial = (name) => {
  if (!name) return '?'
  const w = name.trim().split(/\s+/)
  return (w[0]?.[0] || '') + (w.length > 1 ? (w[w.length - 1][0] || '') : '')
}
const colorFor = (s) => {
  let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  const palette = ['#5dade2', '#bb8fce', '#16a085', '#f39c12', '#e8c77a', '#2ecc71', '#3498db']
  return palette[h % palette.length]
}
const formatRelative = (iso) => {
  if (!iso) return null
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'الآن'
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`
  if (s < 604800) return `قبل ${Math.floor(s / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}

const Lbl = ({ children }) => (
  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: '.2px' }}>{children}</div>
)
const sF = {
  width: '100%', height: 42, padding: '0 12px', boxSizing: 'border-box',
  background: 'linear-gradient(180deg,#323232 0%,#262626 100%)',
  border: '1px solid rgba(255,255,255,.07)', borderRadius: 10,
  fontFamily: F, fontSize: 13, fontWeight: 500, color: 'var(--tx)',
  outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
}

/* ─── Tiny KPI pill (matches BranchesPage BPill exactly) ─── */
const Pill = ({ color, value, label }) => (
  <div style={{
    padding: '7px 12px', borderRadius: 10,
    background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
    border: '1px solid rgba(255,255,255,.06)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: '0 0 5px ' + color }} />
      <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-.3px', direction: 'ltr', lineHeight: 1 }}>{value}</div>
    </div>
    <div style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>{label}</div>
  </div>
)

/* ─── Generic 14-day bar chart ─── */
function ActivityChart({ days, color, label, totalLabel = 'الإجمالي' }) {
  const max = Math.max(1, ...days.map(d => d.count))
  const total = days.reduce((s, d) => s + d.count, 0)
  return (
    <div style={{ padding: '0 4px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, padding: '0 4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--tx3)', letterSpacing: '.3px' }}>
          <Activity size={13} color={color} /> {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx4)' }}>
          {totalLabel}: <span style={{ color, fontWeight: 700 }}>{total}</span>
        </span>
      </div>
      <div style={{ position: 'relative', height: 130, padding: '4px 2px 10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`, gap: 5, alignItems: 'end', height: '100%', direction: 'ltr' }}>
          {days.map((d, i) => {
            const h = (d.count / max) * 100
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                <div title={`${d.date.toLocaleDateString('ar-SA')} — ${d.count}`}
                  style={{
                    width: '70%', minHeight: d.count > 0 ? 3 : 0, height: `${h}%`,
                    background: d.count > 0 ? `linear-gradient(180deg, ${color} 0%, ${color}88 100%)` : 'rgba(255,255,255,.05)',
                    borderRadius: '4px 4px 2px 2px',
                    border: d.count > 0 ? `1px solid ${color}55` : '1px solid rgba(255,255,255,.04)',
                    boxShadow: d.count > 0 ? `0 0 8px ${color}33` : 'none',
                    transition: '.2s',
                  }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const cardChrome = {
  background: 'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 16,
  boxShadow: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function ClientsPage({ sb, lang, user, toast }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({ branch_id: '', nationality_id: '' })
  const [advOpen, setAdvOpen] = useState(false)

  const [branches, setBranches] = useState([])
  const [nationalities, setNationalities] = useState([])
  const [stats, setStats] = useState(null)
  const [perClientStats, setPerClientStats] = useState({})

  const [selectedId, setSelectedId] = useState(null)

  /* ─── Bootstrap: branches, nationalities, headline stats ─── */
  useEffect(() => {
    sb.from('branches').select('id,branch_code').order('branch_code').then(({ data }) => setBranches(data || []))
    sb.from('nationalities').select('id,name_ar,name_en').eq('is_active', true).order('name_ar').then(({ data }) => setNationalities(data || []))

    Promise.all([
      sb.from('clients').select('id,branch_id,created_at,nationality:nationality_id(name_ar,name_en)', { count: 'exact' }).is('deleted_at', null),
      sb.from('service_requests').select('client_id,request_date,branch_id').is('deleted_at', null),
      sb.from('invoices').select('total_amount,paid_amount,service_request_id').is('deleted_at', null),
    ]).then(([cR, srR, invR]) => {
      const cs = cR.data || []
      const srs = srR.data || []
      const invs = invR.data || []
      // Top nationalities
      const byNat = {}
      cs.forEach(c => { const k = c.nationality?.name_ar || 'غير محدد'; byNat[k] = (byNat[k] || 0) + 1 })
      const topNats = Object.entries(byNat).sort((a, b) => b[1] - a[1]).slice(0, 4)
      // New this month
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const newThisMonth = cs.filter(c => c.created_at && new Date(c.created_at) >= monthStart).length
      // Activity 14d (clients added per day)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const dayMap = new Map()
      cs.forEach(c => {
        if (!c.created_at) return
        const k = new Date(c.created_at).toISOString().slice(0, 10)
        dayMap.set(k, (dayMap.get(k) || 0) + 1)
      })
      const days14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (13 - i))
        const key = d.toISOString().slice(0, 10)
        return { date: d, count: dayMap.get(key) || 0 }
      })
      // Branch with most clients
      const byBranch = {}
      cs.forEach(c => { if (c.branch_id) byBranch[c.branch_id] = (byBranch[c.branch_id] || 0) + 1 })
      const topBranchEntry = Object.entries(byBranch).sort((a, b) => b[1] - a[1])[0]
      // Total invoiced
      const totalInv = invs.reduce((s, i) => s + Number(i.total_amount || 0), 0)
      const totalPaid = invs.reduce((s, i) => s + Number(i.paid_amount || 0), 0)
      // Per-client roll-up: requests count + invoiced sum
      const srByClient = {}
      const srToClient = {}
      srs.forEach(sr => {
        if (!sr.client_id) return
        srToClient[sr.id] = sr.client_id
        if (!srByClient[sr.client_id]) srByClient[sr.client_id] = { count: 0, lastReq: null }
        srByClient[sr.client_id].count += 1
        if (sr.request_date && (!srByClient[sr.client_id].lastReq || sr.request_date > srByClient[sr.client_id].lastReq)) {
          srByClient[sr.client_id].lastReq = sr.request_date
        }
      })
      const invByClient = {}
      invs.forEach(inv => {
        const cid = srToClient[inv.service_request_id]
        if (!cid) return
        if (!invByClient[cid]) invByClient[cid] = { invoiced: 0, paid: 0 }
        invByClient[cid].invoiced += Number(inv.total_amount || 0)
        invByClient[cid].paid += Number(inv.paid_amount || 0)
      })
      const merged = {}
      Object.keys(srByClient).forEach(cid => { merged[cid] = { ...srByClient[cid], ...(invByClient[cid] || {}) } })

      setStats({
        total: cR.count || 0,
        topNats,
        newThisMonth,
        days14,
        topBranchId: topBranchEntry?.[0],
        topBranchCount: topBranchEntry?.[1] || 0,
        totalRequests: srs.length,
        totalInvoiced: totalInv,
        totalPaid,
      })
      setPerClientStats(merged)
    })
  }, [sb])

  /* ─── List query (paginated) ─── */
  useEffect(() => {
    let alive = true; setLoading(true)
    let qb = sb.from('clients').select(`
      id, name_ar, name_en, id_number, phone, created_at,
      nationality:nationality_id(name_ar,name_en),
      branch:branch_id(branch_code)
    `, { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false, nullsFirst: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (filters.branch_id) qb = qb.eq('branch_id', filters.branch_id)
    if (filters.nationality_id) qb = qb.eq('nationality_id', filters.nationality_id)
    if (q.trim()) {
      const s = q.trim().replace(/[%,]/g, '')
      qb = qb.or(`name_ar.ilike.%${s}%,name_en.ilike.%${s}%,id_number.ilike.%${s}%,phone.ilike.%${s}%`)
    }
    qb.then(({ data, count }) => { if (alive) { setRows(data || []); setTotal(count || 0); setLoading(false) } })
    return () => { alive = false }
  }, [sb, page, q, filters])

  const totalPages = Math.max(1, Math.ceil(total / PAGE))
  const hasFilters = filters.branch_id || filters.nationality_id
  const resetFilters = () => { setFilters({ branch_id: '', nationality_id: '' }); setQ(''); setPage(0) }

  const selectedClient = selectedId ? rows.find(r => r.id === selectedId) : null

  if (selectedClient) {
    return (
      <ClientDetailPage
        sb={sb}
        client={selectedClient}
        clientStats={perClientStats[selectedClient.id]}
        onBack={() => setSelectedId(null)}
        T={T} isAr={isAr}
      />
    )
  }

  const topBranchCode = branches.find(b => b.id === stats?.topBranchId)?.branch_code || '—'

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .clp-hero { display: grid; grid-template-columns: minmax(0, 2.6fr) minmax(0, 1fr); gap: 14px; }
        .clp-pills { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 880px) {
          .clp-hero { grid-template-columns: 1fr; }
          .clp-pills { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
            {T('العملاء', 'Clients')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            {T('قائمة العملاء وسجل طلباتهم وفواتيرهم', 'Clients directory with service requests and invoices')}
          </div>
        </div>
      </div>

      {/* Hero: KPIs + identity */}
      <div className="clp-hero" style={{ marginBottom: 14 }}>
        <div style={{ ...cardChrome, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="clp-pills">
            <Pill color={C.blue}  value={num(stats?.totalRequests || 0)}                   label={T('طلب خدمة', 'requests')} />
            <Pill color={GOLD}    value={num(Math.round(stats?.totalInvoiced || 0))}        label={T('فوترة (ر.س)', 'invoiced (SAR)')} />
            <Pill color={C.ok}    value={num(Math.round(stats?.totalPaid || 0))}            label={T('مسدّد (ر.س)', 'paid (SAR)')} />
            <Pill color={C.purple} value={num(stats?.newThisMonth || 0)}                    label={T('جديد هذا الشهر', 'new this month')} />
          </div>
          <ActivityChart days={stats?.days14 || []} color={GOLD}
            label={T('عملاء جدد آخر 14 يوم', 'New clients · last 14 days')}
            totalLabel={T('الإجمالي', 'Total')} />
        </div>
        <div style={{ ...cardChrome, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', letterSpacing: '.3px' }}>{T('العملاء', 'Clients')}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, direction: 'ltr' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: '-.5px', lineHeight: 1 }}>{num(stats?.total || 0)}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx4)' }}>{T('عميل', 'clients')}</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', lineHeight: 1.5 }}>
            {stats?.topBranchCount
              ? T(`أعلى تركّز في ${topBranchCode} (${num(stats.topBranchCount)})`,
                  `Top branch ${topBranchCode} (${num(stats.topBranchCount)})`)
              : T('موزّعون على المكاتب', 'Distributed across branches')}
          </div>
          {stats?.topNats?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
              {stats.topNats.slice(0, 3).map(([nat, cnt]) => (
                <span key={nat} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999,
                  background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.05)',
                  fontSize: 10, fontWeight: 600, color: 'var(--tx3)',
                }}>
                  <span style={{ color: GOLD, fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{cnt}</span>
                  <span>{nat}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search + advanced filter */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', position: 'relative', minWidth: 200 }}>
          <Search size={15} color="rgba(255,255,255,.35)"
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }} />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(0) }}
            placeholder={T('ابحث بالاسم، رقم الهوية، الجوال…', 'Search by name, ID or phone…')}
            style={{
              width: '100%', height: 40, padding: '0 36px 0 14px',
              background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
              border: '1px solid rgba(255,255,255,.06)', borderRadius: 11,
              fontFamily: F, fontSize: 14, fontWeight: 400, color: 'var(--tx)',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
              transition: '.2s', boxSizing: 'border-box',
            }} />
        </div>
        <button onClick={() => setAdvOpen(v => !v)}
          style={{
            height: 40, padding: '0 14px', borderRadius: 11,
            border: `1px solid ${advOpen || hasFilters ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.06)'}`,
            background: advOpen || hasFilters
              ? 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)'
              : 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
            color: advOpen || hasFilters ? GOLD : 'rgba(255,255,255,.78)',
            fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
            boxShadow: advOpen || hasFilters
              ? '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)'
              : '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
            transition: '.2s',
          }}>
          <SlidersHorizontal size={14} />
          {T('بحث متقدم', 'Filters')}
          {hasFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}99` }} />}
          <ChevronDown size={12} style={{ transform: advOpen ? 'rotate(180deg)' : '', transition: '.2s' }} />
        </button>
      </div>

      {advOpen && (
        <div style={{ ...cardChrome, marginBottom: 14, padding: '16px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 12 }}>
            <div>
              <Lbl>{T('المكتب', 'Branch')}</Lbl>
              <select value={filters.branch_id}
                onChange={e => { setFilters(f => ({ ...f, branch_id: e.target.value })); setPage(0) }} style={sF}>
                <option value="">{T('جميع المكاتب', 'All branches')}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_code}</option>)}
              </select>
            </div>
            <div>
              <Lbl>{T('الجنسية', 'Nationality')}</Lbl>
              <select value={filters.nationality_id}
                onChange={e => { setFilters(f => ({ ...f, nationality_id: e.target.value })); setPage(0) }} style={sF}>
                <option value="">{T('كل الجنسيات', 'All nationalities')}</option>
                {nationalities.map(n => <option key={n.id} value={n.id}>{isAr ? n.name_ar : n.name_en}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 500 }}>
              <span style={{ fontWeight: 700, color: GOLD }}>{num(total)}</span> {T('من أصل', 'of')} <span style={{ fontWeight: 700 }}>{num(stats?.total || 0)}</span>
            </div>
            {(hasFilters || q) && (
              <button onClick={resetFilters}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 8,
                  background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
                  border: '1px solid rgba(255,255,255,.06)',
                  color: 'var(--tx3)', fontFamily: F, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
                }}>{T('إعادة تعيين', 'Reset')}</button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)', fontSize: 13, fontWeight: 500 }}>{T('جاري التحميل…', 'Loading…')}</div>
      ) : rows.length === 0 ? (
        <div style={{ ...cardChrome, padding: 60, textAlign: 'center' }}>
          <Users size={36} color={GOLD} style={{ opacity: .55 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>
            {q || hasFilters ? T('لا توجد نتائج مطابقة', 'No matches') : T('لا يوجد عملاء بعد', 'No clients yet')}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(max(320px, calc(50% - 7px)), 1fr))',
          gap: 14,
        }}>
          {rows.map(r => (
            <ClientCard key={r.id} client={r} clientStats={perClientStats[r.id]} onClick={() => setSelectedId(r.id)} T={T} isAr={isAr} />
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
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Client card (grid item) — same rhythm as BranchCard
   ═══════════════════════════════════════════════════════════════ */
function ClientCard({ client, clientStats, onClick, T, isAr }) {
  const c = clientStats || { count: 0, invoiced: 0, paid: 0, lastReq: null }
  const due = Number(c.invoiced || 0) - Number(c.paid || 0)
  const lastActivity = formatRelative(c.lastReq)
  const accent = colorFor(client.id)

  const StatRow = ({ Icon, value, label, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
      <span style={{
        fontSize: 14, fontWeight: 700,
        color: color || 'rgba(255,255,255,.88)',
        fontFamily: "'JetBrains Mono','Cairo',sans-serif",
        direction: 'ltr', letterSpacing: '-.2px',
      }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{label}</span>
      <Icon size={12} color="rgba(255,255,255,.5)" strokeWidth={2} />
    </div>
  )

  return (
    <div onClick={onClick} style={{
      ...cardChrome, position: 'relative', cursor: 'pointer',
      padding: '18px 22px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
      minHeight: 140,
      transition: '.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px ${GOLD}33, inset 0 1px 0 rgba(255,255,255,.08)` }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)' }}>

      {due > 0 && (
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}>
          <span title={T(`متبقي ${num(due)} ر.س`, `Due ${num(due)} SAR`)}
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.35)',
              color: '#e68a80',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 8px rgba(192,57,43,.25)',
            }}>
            <AlertCircle size={11} />
          </span>
        </div>
      )}

      {/* Right: identity */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: accent + '22', border: `1.5px solid ${accent}66`,
            color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>{initial(client.name_ar || client.name_en)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {client.name_ar || client.name_en || '—'}
            </div>
            {client.id_number && (
              <div style={{ fontSize: 10, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace', marginTop: 2 }}>
                {client.id_number}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx2)', fontWeight: 500, marginTop: 12, flexWrap: 'wrap' }}>
          {client.phone && (
            <>
              <Phone size={12} color="rgba(255,255,255,.5)" />
              <span style={{ direction: 'ltr', fontFamily: 'monospace', color: C.ok }}>{client.phone}</span>
            </>
          )}
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx2)', fontWeight: 500, marginTop: 6, flexWrap: 'wrap' }}>
          {client.branch?.branch_code && (
            <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(212,160,23,.10)', color: GOLD, border: '1px solid rgba(212,160,23,.25)', fontSize: 10, fontWeight: 700, direction: 'ltr' }}>
              {client.branch.branch_code}
            </span>
          )}
          {client.nationality?.name_ar && (
            <span style={{ color: 'var(--tx3)' }}>{isAr ? client.nationality.name_ar : (client.nationality.name_en || client.nationality.name_ar)}</span>
          )}
          {lastActivity && (
            <>
              <span style={{ color: 'rgba(255,255,255,.35)' }}>•</span>
              <span style={{ color: 'var(--tx4)' }}>{lastActivity}</span>
            </>
          )}
        </div>
      </div>

      {/* Left: stats */}
      <div style={{ width: 130, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
        <StatRow Icon={FileText} value={num(c.count || 0)}                             label={T('طلب', 'req')} />
        <StatRow Icon={Wallet}   value={num(Math.round(c.invoiced || 0))}              label={T('فاتورة', 'inv')}  color={GOLD} />
        <StatRow Icon={TrendingUp} value={num(Math.round(c.paid || 0))}                label={T('مسدّد', 'paid')} color={C.ok} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Detail page — replaces list when a client is selected
   ═══════════════════════════════════════════════════════════════ */
function ClientDetailPage({ sb, client, clientStats, onBack, T, isAr }) {
  const [requests, setRequests] = useState(null)
  const [days12m, setDays12m] = useState([])

  useEffect(() => {
    sb.from('service_requests').select(`
      id, request_ref_no, request_date, quantity,
      service_type:service_type_id(code,value_ar,value_en),
      status:status_id(code,value_ar,value_en),
      branch:branch_id(branch_code),
      invoice:invoices(id,invoice_no,total_amount,paid_amount,remaining_amount)
    `).eq('client_id', client.id).is('deleted_at', null).order('request_date', { ascending: false })
      .then(({ data }) => {
        const reqs = data || []
        setRequests(reqs)
        // 12-month chart
        const now = new Date()
        const months = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
          return { date: d, key: d.toISOString().slice(0, 7), count: 0 }
        })
        const monthMap = new Map(months.map(m => [m.key, m]))
        reqs.forEach(r => {
          if (!r.request_date) return
          const k = new Date(r.request_date).toISOString().slice(0, 7)
          const m = monthMap.get(k); if (m) m.count += 1
        })
        setDays12m(months)
      })
  }, [sb, client.id])

  const accent = colorFor(client.id)
  const totalAmt = requests?.reduce((s, r) => s + (r.invoice?.[0] ? Number(r.invoice[0].total_amount || 0) : 0), 0) || 0
  const paidAmt  = requests?.reduce((s, r) => s + (r.invoice?.[0] ? Number(r.invoice[0].paid_amount || 0) : 0), 0) || 0
  const due = totalAmt - paidAmt

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: accent + '22', border: `2px solid ${accent}88`,
            color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700,
          }}>{initial(client.name_ar || client.name_en)}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.95)', letterSpacing: '-.3px' }}>
              {client.name_ar || client.name_en}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 4, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {client.id_number && <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{client.id_number}</span>}
              {client.phone && <><span>•</span><span style={{ direction: 'ltr', fontFamily: 'monospace', color: C.ok }}>{client.phone}</span></>}
              {client.nationality?.name_ar && <><span>•</span><span>{client.nationality.name_ar}</span></>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <button onClick={onBack}
            style={{
              height: 40, padding: '0 14px', borderRadius: 11,
              border: '1px solid rgba(255,255,255,.06)',
              background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
              color: 'rgba(255,255,255,.78)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontFamily: F, fontSize: 12, fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
              transition: '.2s',
            }}>
            <ArrowRight size={13} /> {T('رجوع', 'Back')}
          </button>
          {client.branch?.branch_code && (
            <span style={{
              padding: '6px 14px', borderRadius: 999,
              background: 'rgba(212,160,23,.12)', color: GOLD,
              border: '1px solid rgba(212,160,23,.3)', fontSize: 12, fontWeight: 700, direction: 'ltr',
            }}>{client.branch.branch_code}</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* KPI row + activity */}
        <div className="clp-hero">
          <div style={{ ...cardChrome, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="clp-pills">
              <Pill color={C.blue} value={requests === null ? '…' : num(requests.length)} label={T('عدد الطلبات', 'requests')} />
              <Pill color={GOLD}   value={num(Math.round(totalAmt))}                       label={T('فاتورة (ر.س)', 'invoiced')} />
              <Pill color={C.ok}   value={num(Math.round(paidAmt))}                        label={T('مسدّد (ر.س)', 'paid')} />
              <Pill color={due > 0 ? C.red : '#666'} value={num(Math.round(due))}          label={T('متبقي (ر.س)', 'due')} />
            </div>
            <ActivityChart days={days12m.map(m => ({ date: m.date, count: m.count }))} color={GOLD}
              label={T('طلبات آخر 12 شهر', 'Requests · last 12 months')}
              totalLabel={T('الإجمالي', 'Total')} />
          </div>
          <div style={{ ...cardChrome, padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', letterSpacing: '.3px' }}>{T('متوسط الفاتورة', 'Avg invoice')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, direction: 'ltr' }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: GOLD, letterSpacing: '-.5px', lineHeight: 1 }}>
                {requests?.length ? num(Math.round(totalAmt / requests.length)) : '—'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx4)' }}>{T('ر.س', 'SAR')}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', lineHeight: 1.5 }}>
              {due > 0
                ? T(`متبقي ${num(Math.round(due))} ر.س على هذا العميل`, `${num(Math.round(due))} SAR outstanding`)
                : T('لا يوجد متبقي', 'No outstanding balance')}
            </div>
          </div>
        </div>

        {/* Requests list */}
        <div style={{ ...cardChrome, padding: '18px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.9)', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={14} color={GOLD} /> {T('سجل الطلبات', 'Service requests')}
            <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)', fontWeight: 500 }}>{requests?.length || 0}</span>
          </div>
          {requests === null && <div style={{ color: 'var(--tx4)', fontSize: 12, padding: 20, textAlign: 'center' }}>{T('جاري التحميل…', 'Loading…')}</div>}
          {requests?.length === 0 && <div style={{ color: 'var(--tx4)', fontSize: 12, padding: 20, textAlign: 'center' }}>{T('لا توجد طلبات بعد', 'No requests yet')}</div>}
          {requests?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {requests.map(r => {
                const inv = r.invoice?.[0]
                const remaining = inv ? Number(inv.remaining_amount || 0) : 0
                const stClr = r.status?.code === 'done' ? C.ok : (r.status?.code === 'cancelled' ? C.red : GOLD)
                return (
                  <div key={r.id} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: GOLD, fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{r.request_ref_no}</span>
                        <span style={{ fontSize: 11, color: stClr, fontWeight: 700 }}>· {isAr ? r.status?.value_ar : (r.status?.value_en || r.status?.value_ar)}</span>
                        <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{isAr ? r.service_type?.value_ar : (r.service_type?.value_en || r.service_type?.value_ar)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--tx4)', direction: 'ltr' }}>
                        {fmtGreg(r.request_date)} · {r.branch?.branch_code}
                      </div>
                    </div>
                    {inv && (
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, color: GOLD, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(inv.total_amount)}</div>
                        {remaining > 0 && <div style={{ fontSize: 10, color: C.warn, direction: 'ltr' }}>{T('متبقي', 'rem')} {num(remaining)}</div>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const btnPg = (disabled) => ({
  padding: '8px 16px',
  background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)',
  border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'),
  borderRadius: 10,
  color: disabled ? 'var(--tx4)' : GOLD,
  fontSize: 12, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontFamily: F,
})
