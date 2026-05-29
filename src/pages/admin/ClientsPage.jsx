import React, { useEffect, useState } from 'react'
import {
  Users, Phone, FileText, Wallet, Search, SlidersHorizontal, ChevronDown,
  AlertCircle, Hash, Calendar, Building2, Globe, TrendingUp, User,
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
const fmtGreg = (iso) => { if (!iso) return '—'; try { const d = new Date(iso); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}` } catch { return '—' } }
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
const svcColor = (code) => ({
  work_visa: C.blue, iqama_issuance: '#27ae60', transfer: C.orange,
  iqama_renewal: C.cyan, ajeer: C.purple, other: C.gold, general: C.gray,
}[code] || C.gray)
const DIST_PALETTE = [C.blue, C.gold, C.purple, C.cyan, C.orange, C.ok, '#3498db', C.gray]
const formatRelative = (iso) => {
  if (!iso) return null
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'الآن'
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`
  if (s < 604800) return `قبل ${Math.floor(s / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}
const payState = (invoiced, paid) => {
  if (invoiced <= 0) return { code: 'none', c: C.gray }
  if (paid >= invoiced) return { code: 'paid', c: C.ok }
  if (paid > 0) return { code: 'partial', c: C.gold }
  return { code: 'unpaid', c: C.red }
}

/* ─── Shared chrome (matches Invoices) ─── */
const cardChrome = { background: 'linear-gradient(180deg,#1f1f1f 0%,#181818 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle = { fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '.2px' }

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

/* ─── Big glowing stat card (matches Invoices StatCard) ─── */
const StatCard = ({ label, value, sup, sub, color, big, footer }) => {
  const c = color || C.gold
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', minHeight: 150,
      padding: '18px 22px', borderRadius: 16,
      background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
      border: '1px solid rgba(255,255,255,.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    }}>
      <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `linear-gradient(90deg, ${c}66, transparent 70%)` }} />
      <div style={{ position: 'absolute', insetInlineStart: -55, top: -55, width: 175, height: 175, borderRadius: '50%', background: `radial-gradient(circle, ${c}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 10px ${c}aa` }} />
        <span style={{ fontSize: big ? 18 : 13, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 6, justifyContent: 'flex-start', direction: 'ltr', padding: '6px 0' }}>
        <span style={{ fontSize: big ? 42 : 32, fontWeight: 800, color: c, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {sup && <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{sup}</span>}
      </div>
      {footer
        ? <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>{footer}</div>
        : (sub && <div style={{ position: 'relative', fontSize: 11, color: 'var(--tx3)', fontWeight: 500 }}>{sub}</div>)}
    </div>
  )
}

const AmountBox = ({ label, value, color }) => (
  <div style={{ padding: '14px 12px', background: 'rgba(0,0,0,.18)', textAlign: 'center' }}>
    <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6, letterSpacing: '.5px' }}>{label}</div>
    <div style={{ fontSize: 17, fontWeight: 700, color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{value}</div>
  </div>
)

const Row = ({ icon: Icon, label, value, mono, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {Icon && <Icon size={13} color="rgba(255,255,255,.4)" />}{label}
    </span>
    <span style={{ fontSize: 13, color: color || 'var(--tx2)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontFamily: mono ? 'monospace' : F, direction: mono ? 'ltr' : undefined, fontWeight: 600 }}>{value || '—'}</span>
  </div>
)

/* ─── Donut chart ─── */
function Donut({ items, total, size = 128, thickness = 14, centerLabel }) {
  const r = (size - thickness) / 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const raw = items.filter(i => i.count > 0)
  const gap = raw.length > 1 ? 6 : 0
  let acc = 0
  const segs = raw.map(i => {
    const len = total > 0 ? (i.count / total) * circ : 0
    const vis = Math.max(0.5, len - gap)
    const seg = { color: i.color, dash: `${vis} ${circ - vis}`, off: -acc }
    acc += len
    return seg
  })
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={thickness} />
        {segs.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={s.dash} strokeDashoffset={s.off} strokeLinecap={raw.length > 1 ? 'round' : 'butt'}
            style={{ transition: 'stroke-dasharray .5s', filter: `drop-shadow(0 0 3px ${s.color}88)` }} />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1, direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{num(total)}</span>
        {centerLabel && <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{centerLabel}</span>}
      </div>
    </div>
  )
}

/* ─── Distribution breakdown card — donut + legend ─── */
function Breakdown({ title, items, totalLabel, T }) {
  const total = items.reduce((s, x) => s + x.count, 0)
  const shown = items.length ? items.slice(0, 6) : []
  const c = GOLD
  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 16, minHeight: 150,
      background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
      border: '1px solid rgba(255,255,255,.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 2, background: `linear-gradient(90deg, ${c}66, transparent 70%)` }} />
      <div style={{ position: 'absolute', insetInlineStart: -50, top: -50, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${c}14 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 8px ${c}aa` }} />{title}
        </span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flex: 1 }}>
        <Donut items={items} total={total} centerLabel={totalLabel} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shown.length ? shown.map((i, idx) => {
            const pctv = total > 0 ? Math.round((i.count / total) * 100) : 0
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 10px', borderRadius: 9, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: i.color, flexShrink: 0, boxShadow: `0 0 6px ${i.color}88` }} />
                <span style={{ color: 'var(--tx1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600 }}>{i.label}</span>
                <span style={{ color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontSize: 11.5, fontWeight: 700 }}>{num(i.count)}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: i.color, direction: 'ltr', fontVariantNumeric: 'tabular-nums', padding: '2px 7px', borderRadius: 999, background: `${i.color}1a`, border: `1px solid ${i.color}33`, minWidth: 42, textAlign: 'center' }}>{pctv}%</span>
              </div>
            )
          }) : <span style={{ fontSize: 12, color: 'var(--tx4)' }}>{T('لا توجد بيانات', 'No data')}</span>}
        </div>
      </div>
    </div>
  )
}

const Search_ = ({ value, onChange, placeholder }) => (
  <div style={{ flex: '1 1 280px', position: 'relative' }}>
    <Search size={15} color="var(--tx4)" style={{ position: 'absolute', top: '50%', insetInlineEnd: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    <input value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: '100%', height: 44, padding: '0 40px 0 14px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
  </div>
)

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
      sb.from('service_requests').select('id,client_id,request_date,branch_id').is('deleted_at', null),
      sb.from('invoices').select('total_amount,paid_amount,service_request_id').is('deleted_at', null),
    ]).then(([cR, srR, invR]) => {
      const cs = cR.data || []
      const srs = srR.data || []
      const invs = invR.data || []
      const byNat = {}
      cs.forEach(c => { const k = c.nationality?.name_ar || 'غير محدد'; byNat[k] = (byNat[k] || 0) + 1 })
      const topNats = Object.entries(byNat).sort((a, b) => b[1] - a[1])
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const newThisMonth = cs.filter(c => c.created_at && new Date(c.created_at) >= monthStart).length
      const byBranch = {}
      cs.forEach(c => { if (c.branch_id) byBranch[c.branch_id] = (byBranch[c.branch_id] || 0) + 1 })
      const branchDist = Object.entries(byBranch).sort((a, b) => b[1] - a[1])
      const topBranchEntry = branchDist[0]
      const totalInv = invs.reduce((s, i) => s + Number(i.total_amount || 0), 0)
      const totalPaid = invs.reduce((s, i) => s + Number(i.paid_amount || 0), 0)
      const srToClient = {}
      const srByClient = {}
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
        topNats, branchDist,
        newThisMonth,
        topBranchId: topBranchEntry?.[0],
        topBranchCount: topBranchEntry?.[1] || 0,
        totalRequests: srs.length,
        totalInvoiced: totalInv,
        totalPaid,
        totalRemaining: Math.max(0, totalInv - totalPaid),
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
      <ClientDetailPage sb={sb} client={selectedClient} clientStats={perClientStats[selectedClient.id]}
        onBack={() => setSelectedId(null)} T={T} isAr={isAr} />
    )
  }

  const branchName = (id) => branches.find(b => b.id === id)?.branch_code || '—'
  const natItems = (stats?.topNats || []).map(([label, count], i) => ({ label, count, color: DIST_PALETTE[i % DIST_PALETTE.length] }))

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .clp-hero { display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; }
        .clp-detail { display: grid; grid-template-columns: 1fr 340px; gap: 14px; align-items: flex-start; }
        @media (max-width: 1040px) { .clp-detail { grid-template-columns: 1fr; } }
        @media (max-width: 720px) { .clp-hero { grid-template-columns: 1fr; } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('العملاء', 'Clients')}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('قائمة العملاء وسجل طلباتهم وفواتيرهم', 'Clients directory with service requests and invoices')}</div>
      </div>

      {/* Stats hero */}
      <div className="clp-hero" style={{ marginBottom: 22 }}>
        <StatCard big label={T('العملاء', 'Clients')} value={num(stats?.total || 0)} color={GOLD}
          footer={<>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('جديد هذا الشهر', 'New this month')}</span>
            <span style={{ fontSize: 13, color: C.purple, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {num(stats?.newThisMonth || 0)}</span>
          </>} />
        <Breakdown title={T('التوزيع حسب الجنسية', 'By nationality')} items={natItems} totalLabel={T('عميل', 'clients')} T={T} />
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <Search_ value={q} onChange={e => { setQ(e.target.value); setPage(0) }} placeholder={T('ابحث بالاسم، رقم الهوية، الجوال…', 'Search by name, ID or phone…')} />
        <button onClick={() => setAdvOpen(o => !o)} style={btnFilter(advOpen || hasFilters)}>
          <SlidersHorizontal size={14} />
          {T('تصفية', 'Filter')}
          {hasFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}99` }} />}
          <ChevronDown size={12} style={{ transform: advOpen ? 'rotate(180deg)' : '', transition: '.2s' }} />
        </button>
      </div>

      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 12 }}>
            <div>
              <Lbl>{T('المكتب', 'Branch')}</Lbl>
              <select value={filters.branch_id} onChange={e => { setFilters(f => ({ ...f, branch_id: e.target.value })); setPage(0) }} style={sF}>
                <option value="">{T('جميع المكاتب', 'All branches')}</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_code}</option>)}
              </select>
            </div>
            <div>
              <Lbl>{T('الجنسية', 'Nationality')}</Lbl>
              <select value={filters.nationality_id} onChange={e => { setFilters(f => ({ ...f, nationality_id: e.target.value })); setPage(0) }} style={sF}>
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
              <button onClick={resetFilters} style={{ height: 32, padding: '0 14px', borderRadius: 8, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx3)', fontFamily: F, fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>{T('إعادة تعيين', 'Reset')}</button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)', fontSize: 13, fontWeight: 500 }}>{T('جاري التحميل…', 'Loading…')}</div>
      ) : rows.length === 0 ? (
        <div style={{ ...cardChrome, padding: 60, textAlign: 'center' }}>
          <Users size={36} color={GOLD} style={{ opacity: .55 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>{q || hasFilters ? T('لا توجد نتائج مطابقة', 'No matches') : T('لا يوجد عملاء بعد', 'No clients yet')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map(r => (
            <ClientRow key={r.id} client={r} clientStats={perClientStats[r.id]} branchName={branchName} onClick={() => setSelectedId(r.id)} T={T} isAr={isAr} />
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
   Client row — invoice-style full-width card with progress strip
   ═══════════════════════════════════════════════════════════════ */
function ClientRow({ client, clientStats, branchName, onClick, T, isAr }) {
  const c = clientStats || { count: 0, invoiced: 0, paid: 0, lastReq: null }
  const invoiced = Number(c.invoiced || 0)
  const paid = Number(c.paid || 0)
  const due = Math.max(0, invoiced - paid)
  const pct = invoiced > 0 ? Math.min(100, Math.round((paid / invoiced) * 100)) : 0
  const ps = payState(invoiced, paid)
  const accent = colorFor(client.id)
  const lastActivity = formatRelative(c.lastReq)

  return (
    <div onClick={onClick} className="cl-card" style={{
      position: 'relative', cursor: 'pointer', borderRadius: 14,
      background: 'radial-gradient(ellipse at top, rgba(212,160,23,.06) 0%, #222 60%)',
      border: '1px solid rgba(255,255,255,.05)', boxShadow: '0 4px 14px rgba(0,0,0,.22)',
      transition: 'all .15s', overflow: 'hidden',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ps.c + '55' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>
      <div style={{ padding: '16px 22px 14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 210px', gap: 18, alignItems: 'center' }}>
          {/* Right (identity) */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: accent + '22', border: `1.5px solid ${accent}66`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{initial(client.name_ar || client.name_en)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-.2px' }}>{client.name_ar || client.name_en || '—'}</span>
                  {due > 0 && (
                    <span title={T(`متبقي ${num(due)} ر.س`, `Due ${num(due)} SAR`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(234,179,8,.12)', border: '1px solid rgba(234,179,8,.35)', color: C.warn, fontSize: 10, fontWeight: 700 }}>
                      <AlertCircle size={10} /> {num(due)}
                    </span>
                  )}
                </div>
                {client.id_number && <div style={{ fontSize: 11, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace', marginTop: 3 }}>{client.id_number}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>
              {client.phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
                  <Phone size={12} color="rgba(255,255,255,.45)" />
                  <span style={{ fontFamily: 'monospace', color: C.ok }}>{client.phone}</span>
                </span>
              )}
              {client.nationality?.name_ar && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Globe size={12} color="rgba(255,255,255,.45)" />{isAr ? client.nationality.name_ar : (client.nationality.name_en || client.nationality.name_ar)}
                </span>
              )}
              {client.branch?.branch_code && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'rgba(212,160,23,.10)', color: GOLD, border: '1px solid rgba(212,160,23,.25)', fontSize: 10, fontWeight: 700, direction: 'ltr' }}>
                  <Building2 size={11} />{client.branch.branch_code}
                </span>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, background: 'rgba(93,173,226,.10)', border: '1px solid rgba(93,173,226,.25)', color: C.blue, fontSize: 10, fontWeight: 700 }}>
                <FileText size={11} />{num(c.count || 0)} {T('طلب', 'req')}
              </span>
              {lastActivity && <span style={{ color: 'var(--tx4)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />{lastActivity}</span>}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 56 }} />

          {/* Left (financial) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('إجمالي الفوترة', 'Invoiced')}</span>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{fmtGreg(client.created_at)}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{num(Math.round(invoiced))}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('المسدّد', 'Paid')}</span>
                <span style={{ color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>+ {num(Math.round(paid))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('المتبقي', 'Remaining')}</span>
                <span style={{ color: due > 0 ? C.warn : C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{due > 0 ? '− ' + num(Math.round(due)) : '✓'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: ps.c, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Detail page — invoice-style two-column layout
   ═══════════════════════════════════════════════════════════════ */
function ClientDetailPage({ sb, client, clientStats, onBack, T, isAr }) {
  const [requests, setRequests] = useState(null)

  useEffect(() => {
    sb.from('service_requests').select(`
      id, request_ref_no, request_date, quantity,
      service_type:service_type_id(code,value_ar,value_en),
      status:status_id(code,value_ar,value_en),
      branch:branch_id(branch_code),
      invoice:invoices(id,invoice_no,total_amount,paid_amount,remaining_amount)
    `).eq('client_id', client.id).is('deleted_at', null).order('request_date', { ascending: false })
      .then(({ data }) => setRequests(data || []))
  }, [sb, client.id])

  const accent = colorFor(client.id)
  const totalAmt = requests?.reduce((s, r) => s + (r.invoice?.[0] ? Number(r.invoice[0].total_amount || 0) : 0), 0) || 0
  const paidAmt = requests?.reduce((s, r) => s + (r.invoice?.[0] ? Number(r.invoice[0].paid_amount || 0) : 0), 0) || 0
  const due = Math.max(0, totalAmt - paidAmt)
  const pct = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0
  const ps = payState(totalAmt, paidAmt)
  const invCount = requests?.filter(r => r.invoice?.[0]).length || 0

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .clp-detail { display: grid; grid-template-columns: 1fr 340px; gap: 14px; align-items: flex-start; }
        @media (max-width: 1040px) { .clp-detail { grid-template-columns: 1fr; } }
      `}</style>

      {/* Top bar: back */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500, transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = GOLD }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          {T('رجوع', 'Back')}
        </button>
      </div>

      {/* Identity header */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: accent + '22', border: `2px solid ${accent}88`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, flexShrink: 0 }}>{initial(client.name_ar || client.name_en)}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 700, color: 'rgba(255,255,255,.95)', letterSpacing: '-.3px' }}>{client.name_ar || client.name_en}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)', fontWeight: 600 }}>
            {client.id_number && <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{client.id_number}</span>}
            {client.phone && <><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} /><span style={{ direction: 'ltr', fontFamily: 'monospace', color: C.ok }}>{client.phone}</span></>}
            {client.nationality?.name_ar && <><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} /><span>{client.nationality.name_ar}</span></>}
            {client.branch?.branch_code && <span style={{ marginInlineStart: 4, padding: '3px 10px', borderRadius: 999, background: 'rgba(212,160,23,.12)', color: GOLD, border: '1px solid rgba(212,160,23,.3)', fontSize: 11, fontWeight: 700, direction: 'ltr' }}>{client.branch.branch_code}</span>}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="clp-detail">
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Client info */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('بيانات العميل', 'Client')}</span></div>
            <div style={{ padding: '8px 22px 14px' }}>
              <Row icon={User} label={T('الاسم', 'Name')} value={client.name_ar || client.name_en} />
              {client.name_en && client.name_ar && <Row label={T('الاسم بالإنجليزية', 'Name (EN)')} value={client.name_en} />}
              <Row icon={Hash} label={T('رقم الهوية', 'ID number')} value={client.id_number} mono />
              <Row icon={Phone} label={T('الجوال', 'Phone')} value={client.phone} mono color={client.phone ? C.ok : undefined} />
              <Row icon={Globe} label={T('الجنسية', 'Nationality')} value={client.nationality?.name_ar} />
              <Row icon={Building2} label={T('المكتب', 'Branch')} value={client.branch?.branch_code} />
              <Row icon={Calendar} label={T('تاريخ الإضافة', 'Joined')} value={fmtGreg(client.created_at)} mono />
            </div>
          </div>

          {/* Requests */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} />
              <span style={cardTitle}>{T('سجل الطلبات', 'Service requests')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{requests?.length || 0}</span>
            </div>
            <div style={{ padding: '14px 18px' }}>
              {requests === null && <div style={{ color: 'var(--tx4)', fontSize: 12, padding: 16, textAlign: 'center' }}>{T('جاري التحميل…', 'Loading…')}</div>}
              {requests?.length === 0 && <div style={{ color: 'var(--tx4)', fontSize: 12, padding: 16, textAlign: 'center' }}>{T('لا توجد طلبات بعد', 'No requests yet')}</div>}
              {requests?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {requests.map(r => {
                    const inv = r.invoice?.[0]
                    const remaining = inv ? Number(inv.remaining_amount || 0) : 0
                    const stClr = r.status?.code === 'done' ? C.ok : (r.status?.code === 'cancelled' ? C.red : GOLD)
                    const sClr = svcColor(r.service_type?.code)
                    return (
                      <div key={r.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: GOLD, fontFamily: 'monospace', fontWeight: 700, direction: 'ltr' }}>{r.request_ref_no}</span>
                            {r.status && <span style={{ fontSize: 11, color: stClr, fontWeight: 700 }}>· {isAr ? r.status?.value_ar : (r.status?.value_en || r.status?.value_ar)}</span>}
                            {r.service_type && <span style={{ fontSize: 10, color: sClr, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: sClr + '1a', border: `1px solid ${sClr}40` }}>{isAr ? r.service_type?.value_ar : (r.service_type?.value_en || r.service_type?.value_ar)}</span>}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--tx4)', direction: 'ltr' }}>{fmtGreg(r.request_date)}{r.branch?.branch_code ? ` · ${r.branch.branch_code}` : ''}</div>
                        </div>
                        {inv && (
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 13, color: GOLD, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(inv.total_amount)}</div>
                            {remaining > 0 && <div style={{ fontSize: 10, color: C.warn, direction: 'ltr', marginTop: 2 }}>{T('متبقي', 'rem')} {num(remaining)}</div>}
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

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD }} /><span style={cardTitle}>{T('الملخص المالي', 'Financial Summary')}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, padding: 1, background: 'rgba(255,255,255,.04)' }}>
              <AmountBox label={T('الفوترة', 'Invoiced')} value={num(Math.round(totalAmt))} color="#fff" />
              <AmountBox label={T('المسدّد', 'Paid')} value={num(Math.round(paidAmt))} color={C.ok} />
              <AmountBox label={T('المتبقي', 'Remaining')} value={num(Math.round(due))} color={due > 0 ? C.warn : C.ok} />
            </div>
            <div style={{ padding: '14px 22px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--tx3)' }}>
                <span>{T('نسبة السداد', 'Paid')}</span>
                <span style={{ color: ps.c, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.04)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${ps.c}, ${ps.c}dd)`, transition: 'width .3s' }} />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Row icon={FileText} label={T('عدد الطلبات', 'Requests')} value={requests === null ? '…' : num(requests.length)} mono />
              <Row icon={Wallet} label={T('عدد الفواتير', 'Invoices')} value={num(invCount)} mono />
              <Row icon={TrendingUp} label={T('متوسط الفاتورة', 'Avg invoice')} value={invCount ? num(Math.round(totalAmt / invCount)) : '—'} mono color={GOLD} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? GOLD : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })
const btnPg = (disabled) => ({ padding: '8px 16px', background: disabled ? 'rgba(255,255,255,.03)' : 'rgba(212,160,23,.12)', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.06)' : 'rgba(212,160,23,.3)'), borderRadius: 10, color: disabled ? 'var(--tx4)' : GOLD, fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F })
