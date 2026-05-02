import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
// Forced reparse marker — InvoicePage-styled detail page
import ReactDOM from 'react-dom'
import {
  Building2, Users, Wallet, Activity, MapPin, Phone, User, Edit2, Plus, X, Save,
  Trash2, Search, SlidersHorizontal, ChevronDown, Check, AlertCircle, TrendingUp,
  CreditCard, FileText, Home, Hash, Briefcase, ArrowRight,
} from 'lucide-react'
import { KCard, KV, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, C } from './pages/admin/roles/RoleUI.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = C.gold
const GOLD_SOFT = '#e8c77a'
const nm = v => Number(v || 0).toLocaleString('en-US')

const BPill = ({ color, value, label }) => (
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

const formatRelative = (iso) => {
  if (!iso) return null
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'الآن'
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`
  if (s < 604800) return `قبل ${Math.floor(s / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}

/* ═══════════════════════════════════════════════════════════════
   Field primitives — carried over from the previous design because
   they match the Kafala Calculator input look we standardized on.
   ═══════════════════════════════════════════════════════════════ */

function WF({ k, l, r, d, w, opts, ph, tp, form, setForm, missing }) {
  const val = form[k] || ''
  const onChange = e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <div style={{ gridColumn: w === true ? '1/-1' : undefined, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Lbl req={r}>{l}</Lbl>
        {missing && <MissingBadge />}
      </div>
      {opts
        ? <select value={val} onChange={onChange} style={sF}>
            <option value="">—</option>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        : <input type={tp || 'text'} placeholder={ph || ''} value={val} onChange={onChange}
            style={{ ...sF, direction: d ? 'ltr' : 'rtl', textAlign: 'center', borderColor: missing ? 'rgba(192,57,43,.35)' : undefined }} />}
    </div>
  )
}

function MissingBadge() {
  return (
    <span title="هذا الحقل غير موجود في قاعدة البيانات بعد — لن يُحفظ"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: '50%',
        background: 'rgba(192,57,43,.18)', border: '1px solid rgba(192,57,43,.5)',
        color: '#e87265', fontSize: 9, fontWeight: 900, lineHeight: 1, cursor: 'help',
      }}>×</span>
  )
}

function CustomSel({ k, l, r, w, opts, ph, form, setForm, onSelect }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [q, setQ] = useState('')
  const btnRef = useRef(null)
  const val = form[k] || ''
  const selected = (opts || []).find(o => o.v === val)
  const filtered = q ? opts.filter(o => (o.l || '').includes(q)) : opts
  const handleSelect = v => {
    if (onSelect) onSelect(v); else setForm(p => ({ ...p, [k]: v }))
    setOpen(false); setQ('')
  }
  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 16
    setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxH: Math.max(160, Math.min(260, below)) })
  }, [open])
  return (
    <div style={{ gridColumn: w === true ? '1/-1' : undefined }}>
      <Lbl req={r}>{l}</Lbl>
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        style={{ ...sF, cursor: 'pointer', color: selected ? 'var(--tx)' : 'var(--tx5)',
          display: 'flex', alignItems: 'center', gap: 8, padding: '0 32px', position: 'relative' }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selected?.l || ph || '—'}
        </span>
        <ChevronDown size={12} color={GOLD} strokeWidth={2.5}
          style={{ position: 'absolute', left: 12, top: '50%',
            transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }} />
      </button>
      {open && pos && ReactDOM.createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
            background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 10, maxHeight: pos.maxH, zIndex: 9999, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 12px 40px rgba(0,0,0,.7)', direction: 'rtl', fontFamily: F,
          }}>
            {(opts || []).length > 5 && (
              <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                  style={{ width: '100%', height: 32, padding: '0 10px',
                    border: '1px solid transparent', borderRadius: 7,
                    background: 'rgba(0,0,0,.2)', fontFamily: F, fontSize: 12, fontWeight: 600,
                    color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
              </div>
            )}
            <div className="brs-sel-scroll" style={{ flex: 1, overflowY: 'auto' }}>
              <style>{`.brs-sel-scroll::-webkit-scrollbar{width:0;display:none}.brs-sel-scroll{scrollbar-width:none;-ms-overflow-style:none}`}</style>
              {filtered.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>لا توجد نتائج</div>
              )}
              {filtered.map(o => {
                const sel = o.v === val
                return (
                  <div key={o.v} onClick={() => handleSelect(o.v)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                      fontWeight: sel ? 800 : 600, color: sel ? GOLD : 'rgba(255,255,255,.92)',
                      background: sel ? 'rgba(212,160,23,.1)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,.03)', textAlign: 'center' }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>
                    {o.l}
                  </div>
                )
              })}
            </div>
          </div>
        </>, document.body)}
    </div>
  )
}

function PhoneField({ k, l, r, w, form, setForm }) {
  const digits = (form[k] || '').replace('+966', '').replace(/\D/g, '')
  return (
    <div style={{ gridColumn: w === true ? '1/-1' : undefined }}>
      <Lbl req={r}>{l}</Lbl>
      <div style={{
        display: 'flex', direction: 'ltr',
        border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, overflow: 'hidden',
        background: 'linear-gradient(180deg,#323232 0%,#262626 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
        height: 42, transition: '.18s',
      }}>
        <div style={{
          height: '100%', padding: '0 12px',
          background: 'rgba(212,160,23,.10)',
          borderInlineEnd: '1px solid rgba(255,255,255,.06)',
          display: 'flex', alignItems: 'center',
          fontSize: 12, fontWeight: 600, color: GOLD, flexShrink: 0,
        }}>+966</div>
        <input placeholder="5X XXX XXXX" maxLength={9} value={digits}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 9)
            setForm(p => ({ ...p, [k]: v ? '+966' + v : '' }))
          }}
          style={{
            width: '100%', height: '100%', padding: '0 12px',
            border: 'none', background: 'transparent',
            fontFamily: F, fontSize: 13, fontWeight: 500,
            color: 'var(--tx)', outline: 'none', textAlign: 'left',
          }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function BranchesPage({ sb, toast, user, lang }) {
  const [branches, setBranches] = useState([])
  const [users, setUsers] = useState([])
  const [banks, setBanks] = useState([])
  const [regions, setRegions] = useState([])
  const [cities, setCities] = useState([])
  const [districtsList, setDistrictsList] = useState([])
  const [docs, setDocs] = useState([])
  const [dashboards, setDashboards] = useState({}) // branch_id → stats row
  const [branchManagers, setBranchManagers] = useState([]) // users with role "مدير فرع"
  const [loading, setLoading] = useState(true)
  // Detail view replaces the list inline (same pattern as PersonsPage),
  // identified by the selected branch id so the data stays fresh on reload.
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [pop, setPop] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [filters, setFilters] = useState({ region_id: '', city_id: '', is_active: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const [br, u, ba, rg, ct, di, dc, dash, mgr] = await Promise.all([
      sb.from('branches').select('*').is('deleted_at', null),
      sb.from('users').select('id,name_ar,name_en,branch_id,is_active').is('deleted_at', null),
      sb.from('bank_accounts').select('*').is('is_active', true),
      sb.from('regions').select('id,name_ar,sort_order').is('is_active', true).order('sort_order').order('name_ar'),
      sb.from('cities').select('id,name_ar,code,region_id,sort_order').is('is_active', true).order('sort_order').order('name_ar'),
      sb.from('districts').select('id,name_ar,city_id,sort_order').is('is_active', true).order('sort_order').order('name_ar'),
      sb.from('documents').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('v_branches_dashboard').select('*'),
      // Users holding the "مدير فرع" role — used as the assignable-manager list.
      // (Join via roles only; users are intersected client-side because the
      // user_roles→users FK is ambiguous to PostgREST.)
      sb.from('user_roles')
        .select('user_id, roles!inner(name_ar)')
        .eq('roles.name_ar', 'مدير فرع'),
    ])
    const regionsData = rg.data || []
    const citiesData = ct.data || []
    const usersData = u.data || []
    const districtsData = di.data || []
    const branchesData = (br.data || []).map(b => {
      const region_id = citiesData.find(c => c.id === b.city_id)?.region_id || null
      return {
        ...b,
        region_id,
        branch_id: b.id,
        region_name: regionsData.find(r => r.id === region_id)?.name_ar || '',
        city_name: citiesData.find(c => c.id === b.city_id)?.name_ar || '',
        district_name: districtsData.find(d => d.id === b.district_id)?.name_ar || '',
        manager_user_name: usersData.find(x => x.id === b.manager_user_id)?.name_ar || '',
        workers_count: usersData.filter(x => x.branch_id === b.id).length,
      }
    })
    const dashMap = {}
    ;(dash.data || []).forEach(d => { dashMap[d.branch_id] = d })
    setBranches(branchesData); setUsers(usersData); setBanks(ba.data || [])
    setRegions(regionsData); setCities(citiesData); setDistrictsList(districtsData)
    setDocs(dc.data || []); setDashboards(dashMap)
    // Intersect user_roles→users client-side: keep only active non-deleted
    // users whose id appears in a branch-manager role row.
    const managerIds = new Set((mgr.data || []).map(r => r.user_id).filter(Boolean))
    const managers = usersData.filter(u => managerIds.has(u.id) && u.is_active !== false)
    setBranchManagers(managers)
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  const saveBranch = async () => {
    setSaving(true)
    try {
      const d = { ...form }; const id = d._id; delete d._id
      // Drop derived/UI-only fields and any column that's not yet in the branches table.
      ;['region_name','city_name','district_name','manager_user_name','workers_count','branch_id',
        'region_id','building_number','street','street_en'].forEach(k => delete d[k])
      Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null })
      if (id) { d.updated_by = user?.id; const { error } = await sb.from('branches').update(d).eq('id', id); if (error) throw error }
      else { d.created_by = user?.id; const { error } = await sb.from('branches').insert(d); if (error) throw error }
      setSuccess(true)
      setTimeout(() => { setSuccess(false); setPop(false); load() }, 1300)
    } catch (e) { toast?.('خطأ: ' + (e.message || '').slice(0, 80)) }
    setSaving(false)
  }

  const del = async (id) => {
    if (!confirm('حذف هذا المكتب؟')) return
    await sb.from('branches').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    toast?.('تم الحذف'); setSelectedBranchId(null); load()
  }

  const updateCode = (cityId) => {
    const city = cities.find(c => c.id === cityId)
    if (city?.code) {
      const existing = branches.filter(b => b.branch_code?.startsWith(city.code)).length
      const num = String(existing + 1).padStart(2, '0')
      setForm(p => ({ ...p, city_id: cityId, branch_code: city.code + '-' + num, district_id: '' }))
    } else {
      setForm(p => ({ ...p, city_id: cityId, district_id: '' }))
    }
  }

  const openAdd = () => {
    setForm({ branch_code: '', region_id: '', city_id: '', district_id: '', phone: '', manager_user_id: '',
      building_number: '', street: '', street_en: '', postal_code: '', is_active: true })
    setPop(true)
  }
  const openEdit = (r) => {
    setForm({
      _id: r.id, branch_code: r.branch_code || '', region_id: r.region_id || '', city_id: r.city_id || '',
      district_id: r.district_id || '', phone: r.phone || '', manager_user_id: r.manager_user_id || '',
      building_number: r.building_number || '', street: r.street || '', street_en: r.street_en || '',
      postal_code: r.postal_code || '', is_active: r.is_active !== false,
    })
    setPop(true)
  }

  // Aggregate KPIs across all branches for the top row.
  const topStats = useMemo(() => {
    const total = branches.length
    const active = branches.filter(b => b.is_active !== false).length
    const totalStaff = users.filter(u => u.is_active).length
    const totalBalance = Object.values(dashboards).reduce((s, d) => s + Number(d.bank_total_balance || 0), 0)
    const lowAlerts = Object.values(dashboards).reduce((s, d) => s + Number(d.bank_low_alerts || 0), 0)
    // Merge daily_14d across branches into one array keyed by day.
    const dayMap = new Map()
    Object.values(dashboards).forEach(d => {
      ;(d.daily_14d || []).forEach(x => {
        const k = String(x.day).slice(0, 10)
        dayMap.set(k, (dayMap.get(k) || 0) + Number(x.cnt || 0))
      })
    })
    const today = new Date()
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (13 - i))
      const key = d.toISOString().slice(0, 10)
      return { date: d, count: dayMap.get(key) || 0 }
    })
    return { total, active, totalStaff, totalBalance, lowAlerts, days }
  }, [branches, users, dashboards])

  const filteredBranches = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    return branches.filter(b => {
      if (q) {
        const match = (b.branch_code || '').toLowerCase().includes(q)
          || (b.city_name || '').toLowerCase().includes(q)
          || (b.region_name || '').toLowerCase().includes(q)
          || (b.district_name || '').toLowerCase().includes(q)
          || (b.manager_user_name || '').toLowerCase().includes(q)
          || (b.phone || '').includes(q)
        if (!match) return false
      }
      if (filters.region_id && b.region_id !== filters.region_id) return false
      if (filters.city_id && b.city_id !== filters.city_id) return false
      if (filters.is_active !== '' && (b.is_active !== false) !== (filters.is_active === 'true')) return false
      return true
    })
  }, [branches, searchQ, filters])

  const hasFilters = filters.region_id || filters.city_id || filters.is_active !== ''
  const resetFilters = () => { setFilters({ region_id: '', city_id: '', is_active: '' }); setSearchQ('') }

  const selectedBranch = selectedBranchId ? branches.find(b => b.id === selectedBranchId) : null

  // Build region groups + per-region stats. Defined here (before any early
  // return) to keep the hook order stable across detail/list renders.
  const regionGroups = useMemo(() => {
    const map = new Map()
    filteredBranches.forEach(b => {
      const key = b.region_id || '__none'
      const name = b.region_name || 'بدون منطقة'
      if (!map.has(key)) map.set(key, { id: key, name, items: [], active: 0 })
      const g = map.get(key)
      g.items.push(b)
      if (b.is_active !== false) g.active += 1
    })
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length)
  }, [filteredBranches])
  const regionPalette = [C.gold, C.blue, '#16a085', '#bb8fce', '#f39c12', C.ok, '#e8c77a', '#5dade2', '#27ae60']

  const sharedStyle = (
    <style>{`
      .brs-card {
        background: linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%);
        backdrop-filter: blur(20px) saturate(160%);
        -webkit-backdrop-filter: blur(20px) saturate(160%);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 16px;
        padding: 16px 18px;
        box-shadow: 0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2);
        transition: .2s;
      }
      .brs-card-title {
        font-size: 13px; font-weight: 600; color: rgba(255,255,255,.93); margin-bottom: 12px;
        display: flex; align-items: center; gap: 8px; padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,.06);
        letter-spacing: -.2px;
      }
    `}</style>
  )

  if (selectedBranch) {
    return (
      <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
        {sharedStyle}
        <BranchDetailPage
          branch={selectedBranch} dashboard={dashboards[selectedBranch.id]}
          users={users.filter(u => u.branch_id === selectedBranch.id)}
          banks={banks.filter(a => a.branch_id === selectedBranch.id)}
          docs={docs.filter(d => d.entity_type === 'branch' && d.entity_id === selectedBranch.id)}
          onBack={() => setSelectedBranchId(null)}
          onEdit={() => openEdit(selectedBranch)}
          onDelete={() => del(selectedBranch.id)}
          toast={toast} />
        {pop && (
          <BranchFormModal
            open={pop} onClose={() => setPop(false)}
            form={form} setForm={setForm} saving={saving} success={success}
            onSave={saveBranch} updateCode={updateCode}
            regions={regions} cities={cities} districtsList={districtsList} branchManagers={branchManagers} />
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {sharedStyle}
      <style>{`
        .brs-row{transition:all .15s}
        .brs-row:hover{border-color:rgba(212,160,23,.35) !important}
        .brs-hero-grid{display:grid;grid-template-columns:2.2fr 1fr 1.5fr;gap:14px;margin-bottom:24px}
        @media (max-width: 1100px){.brs-hero-grid{grid-template-columns:1fr 1fr;}.brs-hero-grid > :nth-child(3){grid-column:1/-1}}
        @media (max-width: 720px){.brs-hero-grid{grid-template-columns:1fr}}
        .brs-row-grid{display:grid;grid-template-columns:1fr 1px 200px;gap:18px;align-items:center}
        @media (max-width: 720px){.brs-row-grid{grid-template-columns:1fr;gap:12px}.brs-row-divider{display:none}}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>المكاتب</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>إدارة المكاتب والفروع ومتابعة موظفيها وأرصدتها ونشاطها</div>
          </div>
          <button onClick={openAdd}
            style={{ height: 40, padding: '0 18px', borderRadius: 11,
              border: '1px solid rgba(212,160,23,.45)',
              background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',
              color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',
              transition: '.2s' }}>
            إضافة مكتب <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Hero — InvoicePage spirit: Big primary KPI + Stacked secondary + Distribution */}
      <div className="brs-hero-grid">
        {/* Big primary — active branches */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.ok}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ok, boxShadow: `0 0 10px ${C.ok}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>المكاتب النشطة</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
            <span style={{ fontSize: 13, color: 'var(--tx4)', fontWeight: 600 }}>/ {topStats.total}</span>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.ok, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{topStats.active}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>
              {topStats.active === topStats.total
                ? 'جميع المكاتب نشطة'
                : `${topStats.total - topStats.active} معطّل`}
            </span>
            <span style={{ fontSize: 13, color: topStats.lowAlerts ? C.red : C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {topStats.lowAlerts > 0 && <AlertCircle size={11} />} {topStats.lowAlerts || 0} تنبيه
            </span>
          </div>
        </div>

        {/* Stacked secondary — staff + balance */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 150,
        }}>
          {[
            { label: 'الموظفون',  val: topStats.totalStaff,                          cnt: branches.filter(b => Number(dashboards[b.id]?.staff_total || 0) > 0).length, c: C.blue, sub: 'مكتب يضم موظفين' },
            { label: 'الرصيد',    val: nm(Math.round(topStats.totalBalance)) + ' ر.س', cnt: Object.values(dashboards).reduce((s, d) => s + Number(d.bank_accounts_active || 0), 0), c: GOLD, sub: 'حساب نشط' },
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
                  <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>({nm(s.cnt)} {s.sub})</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', direction: 'ltr' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{s.val}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Distribution by region — same shape as InvoicePage's services card */}
        {(() => {
          const allByRegion = (() => {
            const map = new Map()
            branches.forEach(b => {
              const k = b.region_id || '__none'
              const name = b.region_name || 'بدون منطقة'
              if (!map.has(k)) map.set(k, { id: k, name, cnt: 0 })
              map.get(k).cnt += 1
            })
            return Array.from(map.values()).sort((a, b) => b.cnt - a.cnt)
          })()
          const topN = allByRegion.slice(0, 6)
          const totalCnt = allByRegion.reduce((s, r) => s + r.cnt, 0) || 1
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
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>التوزّع حسب المنطقة</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: GOLD, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(totalCnt)}</span> مكتب
                </span>
              </div>
              {totalCnt > 0 && (
                <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                  {allByRegion.map((r, i) => {
                    const c = regionPalette[i % regionPalette.length]
                    const pct = (r.cnt / totalCnt) * 100
                    return <div key={r.id} title={`${r.name}: ${r.cnt}`} style={{ width: pct + '%', background: c, transition: 'width .3s' }} />
                  })}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                {topN.map((r, i) => {
                  const c = regionPalette[i % regionPalette.length]
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600 }}>
                      <span style={{ color: c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{nm(r.cnt)}</span>
                      <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Filter row — InvoicePage style: search + filter button with X-clear */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={14} color="var(--tx4)" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="ابحث بالكود، المدينة، المنطقة، المدير، الجوال…"
            style={{
              width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12,
              background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)',
              color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box',
            }} />
        </div>
        <button onClick={() => setAdvOpen(o => !o)}
          style={{
            height: 44, padding: '0 16px', borderRadius: 12,
            background: advOpen || hasFilters ? GOLD : 'rgba(0,0,0,.18)',
            border: '1px solid ' + (advOpen || hasFilters ? GOLD : 'rgba(255,255,255,.05)'),
            color: advOpen || hasFilters ? '#000' : 'var(--tx2)',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
          تصفية
          {hasFilters || searchQ ? (
            <span role="button" tabIndex={0} title="مسح الفلاتر"
              onClick={e => { e.stopPropagation(); resetFilters() }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = GOLD; e.currentTarget.style.color = '#000' }}
              style={{ background: GOLD, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </span>
          ) : (
            <SlidersHorizontal size={14} />
          )}
        </button>
      </div>

      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }}>المنطقة</div>
              <select value={filters.region_id} onChange={e => setFilters(f => ({ ...f, region_id: e.target.value, city_id: '' }))} style={sF}>
                <option value="">جميع المناطق</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }}>المدينة</div>
              <select value={filters.city_id} onChange={e => setFilters(f => ({ ...f, city_id: e.target.value }))} style={sF}>
                <option value="">جميع المدن</option>
                {cities.filter(c => !filters.region_id || c.region_id === filters.region_id).map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }}>الحالة</div>
              <div style={{ display: 'flex', gap: 3, padding: 3, height: 42, boxSizing: 'border-box', background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', borderRadius: 10, border: '1px solid rgba(255,255,255,.06)' }}>
                {[['', 'الكل', 'var(--tx3)'], ['true', 'نشط', C.ok], ['false', 'معطّل', C.red]].map(([v, l, c]) => (
                  <button key={v} onClick={() => setFilters(f => ({ ...f, is_active: v }))}
                    style={{ flex: 1, borderRadius: 7, border: 'none', background: filters.is_active === v ? c + '22' : 'transparent', color: filters.is_active === v ? c : 'var(--tx5)', fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List — region-grouped row cards (matches InvoicePage day-grouped pattern) */}
      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>…</div>}
      {!loading && filteredBranches.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {branches.length === 0 ? 'لا توجد مكاتب — أضِف أول مكتب' : 'لا توجد نتائج مطابقة'}
        </div>
      )}
      {!loading && regionGroups.map((g, gi) => {
        const c = regionPalette[gi % regionPalette.length]
        const groupStaff = g.items.reduce((s, b) => s + Number(dashboards[b.id]?.staff_total ?? b.workers_count ?? 0), 0)
        const groupBalance = g.items.reduce((s, b) => s + Number(dashboards[b.id]?.bank_total_balance || 0), 0)
        return (
          <div key={g.id} style={{ marginBottom: 28 }}>
            {/* Region header */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, transform: 'translateY(-2px)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx2)' }}>{g.name}</span>
                <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>· {g.active}/{g.items.length} نشط</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 16, fontWeight: 600 }}>
                <span><span style={{ color: C.blue, direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{nm(groupStaff)}</span> موظف</span>
                <span><span style={{ color: GOLD, direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{nm(Math.round(groupBalance))}</span> ر.س</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {g.items.map(b => (
                <BranchCard key={b.id} branch={b} dashboard={dashboards[b.id]}
                  onClick={() => setSelectedBranchId(b.id)} onEdit={() => openEdit(b)} />
              ))}
            </div>
          </div>
        )
      })}

      {pop && (
        <BranchFormModal
          open={pop} onClose={() => setPop(false)}
          form={form} setForm={setForm} saving={saving} success={success}
          onSave={saveBranch} updateCode={updateCode}
          regions={regions} cities={cities} districtsList={districtsList} branchManagers={branchManagers} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Branch row card — InvoicePage spirit (3-col grid + progress strip)
   ═══════════════════════════════════════════════════════════════ */

function BranchCard({ branch, dashboard, onClick, onEdit }) {
  const isActive = branch.is_active !== false
  const tone = isActive ? C.ok : '#777'
  const balance = Number(dashboard?.bank_total_balance || 0)
  const staff = Number(dashboard?.staff_total ?? branch.workers_count ?? 0)
  const lastActivity = formatRelative(dashboard?.last_activity_at)
  const alerts = Number(dashboard?.bank_low_alerts || 0)
  const activity30 = Number(dashboard?.activity_30d || 0)
  const accounts = Number(dashboard?.bank_accounts_active || 0)
  // Activity bar: scale to 30 (1 op/day) for full bar; clamp 0-100
  const pct = Math.min(100, Math.round((activity30 / 30) * 100))

  return (
    <div onClick={onClick} className="brs-row"
      style={{
        position: 'relative', cursor: 'pointer',
        borderRadius: 14,
        background: `radial-gradient(ellipse at top, ${tone}10 0%, #222 60%)`,
        border: '1px solid rgba(255,255,255,.05)',
        boxShadow: '0 4px 14px rgba(0,0,0,.22)',
        overflow: 'hidden',
        opacity: isActive ? 1 : .7,
      }}>
      {/* Padded content */}
      <div style={{ padding: '16px 22px 14px 18px' }}>
        <div className="brs-row-grid">
          {/* Right (identity) */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {/* Code + status + alerts */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 20, fontWeight: 700, color: GOLD,
                fontFamily: "'JetBrains Mono','Cairo',sans-serif", letterSpacing: '-.3px',
                direction: 'ltr', lineHeight: 1,
              }}>{branch.branch_code || '—'}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
                background: `${tone}18`, color: tone, border: `1px solid ${tone}38`,
                display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone }} />
                {isActive ? 'نشط' : 'معطّل'}
              </span>
              {alerts > 0 && (
                <span title={`${alerts} تنبيه رصيد منخفض`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5,
                    background: 'rgba(232,114,101,.14)', border: '1px solid rgba(232,114,101,.4)',
                    fontSize: 10, fontWeight: 700, color: C.red, flexShrink: 0,
                  }}>
                  <AlertCircle size={10} />
                  {alerts} تنبيه
                </span>
              )}
            </div>

            {/* Location row */}
            {(branch.city_name || branch.region_name || branch.district_name) && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--tx3)', fontWeight: 600, flexWrap: 'wrap' }}>
                <MapPin size={12} color="var(--tx4)" />
                <span>
                  {[branch.region_name, branch.city_name, branch.district_name].filter(Boolean).map((p, i, arr) => (
                    <React.Fragment key={i}>
                      {p}
                      {i < arr.length - 1 && <span style={{ color: 'rgba(255,255,255,.3)', margin: '0 6px' }}>•</span>}
                    </React.Fragment>
                  ))}
                </span>
                {branch.phone && (
                  <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, color: C.ok, direction: 'ltr', fontFamily: 'monospace' }}>
                    <Phone size={11} />
                    {String(branch.phone).replace(/^\+?966/, '0')}
                  </span>
                )}
              </div>
            )}

            {/* Manager + last activity */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tx3)', fontWeight: 600, flexWrap: 'wrap' }}>
              <User size={12} color="var(--tx4)" />
              {branch.manager_user_name ? (
                <span style={{ color: 'rgba(255,255,255,.78)' }}>{branch.manager_user_name}</span>
              ) : (
                <span style={{ color: 'rgba(255,255,255,.35)' }}>لا يوجد مدير</span>
              )}
              {lastActivity && (
                <>
                  <span style={{ color: 'rgba(255,255,255,.3)' }}>•</span>
                  <span style={{ color: 'var(--tx4)' }}>{lastActivity}</span>
                </>
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="brs-row-divider" style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />

          {/* Left (stats) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>الرصيد</span>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{accounts} حساب</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1 }}>{nm(Math.round(balance))}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>الموظفون</span>
                <span style={{ color: C.blue, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Users size={11} /> {nm(staff)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>نشاط ٣٠ي</span>
                <span style={{ color: GOLD, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Activity size={11} /> {nm(activity30)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress strip — flush at bottom edge of card */}
      <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: tone, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

const Metric = ({ Icon, value, label, color, borderL, borderR, mono }) => (
  <div style={{
    padding: '10px 8px', textAlign: 'center',
    borderInlineEnd: borderR ? '1px solid rgba(255,255,255,.04)' : 'none',
    borderInlineStart: borderL ? '1px solid rgba(255,255,255,.04)' : 'none',
  }}>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
      color, fontSize: 13, fontWeight: 900, lineHeight: 1.2, marginBottom: 2,
      direction: mono ? 'ltr' : 'rtl', fontFamily: mono ? "'JetBrains Mono', Cairo, sans-serif" : F }}>
      <Icon size={11} strokeWidth={2} />
      <span>{value}</span>
    </div>
    <div style={{ fontSize: 9, fontWeight: 700, color, opacity: .7 }}>{label}</div>
  </div>
)

/* ═══════════════════════════════════════════════════════════════
   Generic 14-day bar chart (same silhouette as UserRolePage's chart).
   ═══════════════════════════════════════════════════════════════ */

function BranchActivityChart({ days, color, label }) {
  const max = Math.max(1, ...days.map(d => d.count))
  const total = days.reduce((s, d) => s + d.count, 0)
  return (
    <div style={{ padding: '0 4px 8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18, padding: '0 4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600, color: 'var(--tx3)', letterSpacing: '.3px' }}>
          <Activity size={13} color={color} /> {label}
        </span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx4)' }}>
          الإجمالي: <span style={{ color, fontWeight: 700 }}>{total}</span> عملية
        </span>
      </div>
      <div style={{ position: 'relative', height: 130, padding: '4px 2px 10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`,
          gap: 5, alignItems: 'end', height: '100%', direction: 'ltr' }}>
          {days.map((d, i) => {
            const h = (d.count / max) * 100
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                <div title={`${d.date.toLocaleDateString('ar-SA')} — ${d.count} عملية`}
                  style={{ width: '70%', minHeight: d.count > 0 ? 3 : 0,
                    height: `${h}%`,
                    background: d.count > 0
                      ? `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`
                      : 'rgba(255,255,255,.05)',
                    borderRadius: '4px 4px 2px 2px',
                    border: d.count > 0 ? `1px solid ${color}55` : '1px solid rgba(255,255,255,.04)',
                    boxShadow: d.count > 0 ? `0 0 8px ${color}33` : 'none',
                    transition: '.2s' }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Branch detail modal — opens over the list, full page feel.
   Structure mirrors UserRolePage: KPI row + hero + stacked cards.
   ═══════════════════════════════════════════════════════════════ */

function BranchDetailPage({ branch, dashboard, users, banks, docs, onBack, onEdit, onDelete, toast }) {
  const isActive = branch.is_active !== false
  const tone = isActive ? C.ok : '#777'
  const totalBalance = banks.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const activeStaff = users.filter(u => u.is_active).length
  const activity30 = Number(dashboard?.activity_30d || 0)
  const lastActivity = formatRelative(dashboard?.last_activity_at)
  const alerts = Number(dashboard?.bank_low_alerts || 0)

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .brd-hero{display:grid;grid-template-columns:2.2fr 1fr 1.5fr;gap:14px;margin-bottom:24px}
        @media (max-width: 1100px){.brd-hero{grid-template-columns:1fr 1fr}.brd-hero > :nth-child(3){grid-column:1/-1}}
        @media (max-width: 720px){.brd-hero{grid-template-columns:1fr}}
        /* Card chrome — same as InvoiceDetailPage cardChrome */
        .brd-section{background:linear-gradient(180deg,#1f1f1f 0%,#181818 100%);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden;margin-bottom:14px}
        .brd-section-head{padding:14px 22px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:10px}
        .brd-section-head-l{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:#fff;letter-spacing:.2px}
        .brd-section-body{padding:14px 22px}
        .brd-section-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .brd-section-count{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.06);font-size:10px;font-weight:700;color:var(--tx3)}
      `}</style>

      {/* Top bar — back + edit (matches InvoiceDetailPage) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} title="رجوع"
          style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500, transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = GOLD }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          <span>رجوع</span>
        </button>
        <button onClick={onEdit}
          style={{ height: 40, padding: '0 18px', borderRadius: 11, border: '1px solid rgba(212,160,23,.45)', background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)', transition: '.2s' }}>
          تعديل <Edit2 size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Header — title + tag row (matches InvoiceDetailPage shape) */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ fontSize: 21, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>تفاصيل المكتب</div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)' }}>
          <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono','Cairo',sans-serif", direction: 'ltr', letterSpacing: '-.3px' }}>{branch.branch_code || '—'}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: tone, fontWeight: 700 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone, boxShadow: `0 0 5px ${tone}` }} />
            {isActive ? 'نشط' : 'معطّل'}
          </span>
          {(branch.region_name || branch.city_name || branch.district_name) && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} />
                {[branch.region_name, branch.city_name, branch.district_name].filter(Boolean).join(' · ')}
              </span>
            </>
          )}
          {branch.phone && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <a href={`tel:${branch.phone}`} style={{ color: C.ok, fontWeight: 700, direction: 'ltr', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={11} /> {String(branch.phone).replace(/^\+?966/, '0')}
              </a>
            </>
          )}
          {lastActivity && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ color: 'var(--tx4)' }}>آخر نشاط: {lastActivity}</span>
            </>
          )}
          {alerts > 0 && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(229,134,122,.10)', border: `1px solid ${C.red}`, color: C.red, fontSize: 10.5, fontWeight: 800, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <AlertCircle size={11} /> {alerts} تنبيه رصيد
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3-col hero — Big primary KPI + Stacked + Distribution */}
      <div className="brd-hero">
        {/* Big primary — staff count */}
        <div style={{ position: 'relative', padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 150 }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>الموظفون</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
            <span style={{ fontSize: 13, color: 'var(--tx4)', fontWeight: 600 }}>{users.length > 0 ? `/ ${users.length}` : ''}</span>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.blue, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{activeStaff}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>
              {users.length === 0 ? 'لا يوجد موظفون' : (activeStaff === users.length ? 'جميع الموظفين نشطين' : `${users.length - activeStaff} معطّل`)}
            </span>
            {branch.manager_user_name && (
              <span style={{ fontSize: 11, color: GOLD, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <User size={11} /> {branch.manager_user_name}
              </span>
            )}
          </div>
        </div>

        {/* Stacked — balance + 30d activity */}
        <div style={{ borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 150 }}>
          {[
            { label: 'الرصيد', val: nm(Math.round(totalBalance)) + ' ر.س', cnt: banks.length, c: GOLD, sub: 'حساب' },
            { label: 'نشاط ٣٠ يوم', val: nm(activity30), cnt: dashboard?.activity_7d || 0, c: C.ok, sub: '٧ أيام' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'relative', padding: '12px 16px', flex: 1, borderTop: i > 0 ? '1px solid rgba(255,255,255,.06)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', insetInlineStart: -25, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.c}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>({nm(s.cnt)} {s.sub})</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', direction: 'ltr' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{s.val}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Activity sparkline */}
        {(() => {
          const map = new Map()
          ;(dashboard?.daily_14d || []).forEach(d => map.set(String(d.day).slice(0, 10), Number(d.cnt || 0)))
          const today = new Date()
          const days14 = Array.from({ length: 14 }, (_, i) => {
            const d = new Date(today); d.setDate(d.getDate() - (13 - i))
            const key = d.toISOString().slice(0, 10)
            return { date: d, count: map.get(key) || 0 }
          })
          const total = days14.reduce((s, d) => s + d.count, 0)
          const max = Math.max(1, ...days14.map(d => d.count))
          return (
            <div style={{ borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>نشاط آخر 14 يوم</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: GOLD, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(total)}</span> عملية
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(14, 1fr)`, gap: 4, alignItems: 'end', height: 90, direction: 'ltr', flex: 1 }}>
                {days14.map((d, i) => {
                  const h = (d.count / max) * 100
                  return (
                    <div key={i} title={`${d.date.toLocaleDateString('ar-SA')} — ${d.count} عملية`}
                      style={{ height: `${h}%`, minHeight: d.count > 0 ? 3 : 0, background: d.count > 0 ? `linear-gradient(180deg, ${GOLD} 0%, ${GOLD}88 100%)` : 'rgba(255,255,255,.05)', borderRadius: '3px 3px 1px 1px', border: d.count > 0 ? `1px solid ${GOLD}55` : '1px solid rgba(255,255,255,.04)', boxShadow: d.count > 0 ? `0 0 6px ${GOLD}33` : 'none' }} />
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Address details (only if any has data) */}
      {(branch.postal_code || branch.street || branch.building_number || branch.district_name || branch.city_name || branch.region_name) && (
        <div className="brd-section">
          <div className="brd-section-head">
            <span className="brd-section-head-l">
              <span className="brd-section-dot" style={{ background: GOLD }} />
              <MapPin size={13} color={GOLD} /> العنوان التفصيلي
            </span>
          </div>
          <div className="brd-section-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
              {[
                ['المنطقة', branch.region_name],
                ['المدينة', branch.city_name],
                ['الحي', branch.district_name],
                ['الشارع', branch.street],
                ['رقم المبنى', branch.building_number],
                ['الرمز البريدي', branch.postal_code],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: GOLD, direction: 'ltr', textAlign: 'start' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bank accounts section */}
      <div className="brd-section">
        <div className="brd-section-head">
          <span className="brd-section-head-l">
            <span className="brd-section-dot" style={{ background: GOLD }} />
            <Wallet size={13} color={GOLD} /> الحسابات البنكية
            <span className="brd-section-count">{banks.length}</span>
          </span>
          {banks.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: `${C.ok}15`, fontSize: 11, fontWeight: 700, color: C.ok, direction: 'ltr' }}>
              <TrendingUp size={11} /> {nm(Math.round(totalBalance))} ر.س
            </span>
          )}
        </div>
        <div className="brd-section-body">
          {banks.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>
              لا توجد حسابات بنكية مربوطة بهذا المكتب
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {banks.map(a => <BankRow key={a.id} account={a} toast={toast} />)}
            </div>
          )}
        </div>
      </div>

      {/* Staff section */}
      <div className="brd-section">
        <div className="brd-section-head">
          <span className="brd-section-head-l">
            <span className="brd-section-dot" style={{ background: C.blue }} />
            <Users size={13} color={C.blue} /> الموظفون
            <span className="brd-section-count">{users.length}</span>
          </span>
          {users.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
              <span style={{ color: C.ok, fontWeight: 700 }}>{activeStaff}</span> نشط
              {users.length > activeStaff && <> · <span style={{ color: '#777', fontWeight: 700 }}>{users.length - activeStaff}</span> معطّل</>}
            </span>
          )}
        </div>
        <div className="brd-section-body">
          {users.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center', color: 'var(--tx4)', fontSize: 12, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>
              لا يوجد موظفون في هذا المكتب
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
              {users.map(u => {
                const isManager = branch.manager_user_id === u.id
                const c = isManager ? GOLD : C.blue
                return (
                  <div key={u.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10, borderInlineStart: `3px solid ${c}` }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${c}18`, border: `1px solid ${c}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: c, flexShrink: 0 }}>
                      {(u.name_ar || '?')[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.93)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name_ar || '—'}</div>
                      <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500, marginTop: 3 }}>
                        {u.is_active ? 'نشط' : 'معطّل'}
                        {isManager && <span style={{ color: GOLD, marginInlineStart: 6 }}>· المدير</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Documents section (only if any) */}
      {docs.length > 0 && (
        <div className="brd-section">
          <div className="brd-section-head">
            <span className="brd-section-head-l">
              <span className="brd-section-dot" style={{ background: GOLD }} />
              <FileText size={13} color={GOLD} /> المستندات
              <span className="brd-section-count">{docs.length}</span>
            </span>
          </div>
          <div className="brd-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {docs.map(d => {
              const isExpired = d.expiry_date && new Date(d.expiry_date) < new Date()
              const expSoon = d.expiry_date && !isExpired && (new Date(d.expiry_date) - new Date()) / 86400000 < 30
              const c = isExpired ? C.red : expSoon ? C.warn : C.ok
              return (
                <div key={d.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${c}18`, border: `1px solid ${c}33`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={13} color={c} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{d.document_name || d.file_name}</div>
                      {d.notes && <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 2, fontWeight: 500 }}>{d.notes}</div>}
                    </div>
                  </div>
                  {d.expiry_date && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 9px', borderRadius: 6, background: `${c}15`, color: c, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                      {isExpired ? 'منتهي' : expSoon ? 'ينتهي قريباً' : 'ساري'} · {d.expiry_date}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Shared bits for the detail page.
   ═══════════════════════════════════════════════════════════════ */

const InfoCard = ({ title, Icon, badge, rightSlot, children }) => (
  <div className="brs-card">
    <div className="brs-card-title" style={{ justifyContent: 'space-between' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={15} color={GOLD} />}
        {title}
        {badge != null && (
          <span style={{
            marginInlineStart: 4, padding: '3px 9px', borderRadius: 6,
            background: `${GOLD}15`,
            fontSize: 10, fontWeight: 600, color: GOLD_SOFT, direction: 'ltr',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
            {badge}
          </span>
        )}
      </span>
      {rightSlot}
    </div>
    {children}
  </div>
)

const EmptyLine = ({ text, Icon }) => (
  <div style={{
    padding: 24, textAlign: 'center',
    background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
    border: '1px solid rgba(255,255,255,.06)',
    borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 4px rgba(0,0,0,.18)',
  }}>
    {Icon && <Icon size={20} color={GOLD} style={{ opacity: .45 }} />}
    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)' }}>{text}</div>
  </div>
)

function BankRow({ account, toast }) {
  const lowBal = account.min_balance_alert != null &&
    Number(account.current_balance || 0) <= Number(account.min_balance_alert)
  const c = lowBal ? '#e6a23c' : C.ok

  const copy = (v) => { if (!v) return; navigator.clipboard?.writeText(String(v)); toast?.('تم النسخ') }

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
      border: `1px solid ${lowBal ? 'rgba(230,162,60,.3)' : 'rgba(255,255,255,.06)'}`,
      borderInlineStart: `3px solid ${c}`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(0,0,0,.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CreditCard size={14} color={c} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{account.bank_name}</span>
          {account.is_primary && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
              background: `${GOLD}15`, color: GOLD,
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
              رئيسي
            </span>
          )}
          {account.account_purpose && (
            <span style={{
              fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 6,
              background: 'rgba(255,255,255,.05)', color: 'var(--tx4)',
            }}>{account.account_purpose}</span>
          )}
        </div>
        <div style={{ direction: 'ltr', fontSize: 16, fontWeight: 700, color: c,
          fontFamily: "'JetBrains Mono','Cairo',sans-serif", letterSpacing: '-.3px' }}>
          {nm(account.current_balance || 0)}
          <span style={{ fontSize: 10, fontWeight: 600, opacity: .65, marginInlineStart: 4 }}>ر.س</span>
        </div>
      </div>
      {lowBal && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: '#e6a23c',
          background: 'rgba(230,162,60,.12)', padding: '5px 10px', borderRadius: 6,
          marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <AlertCircle size={10} /> الحد الأدنى: {nm(account.min_balance_alert)}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 6, fontSize: 10.5 }}>
        {account.account_number && (
          <CopyRow label="رقم الحساب" value={account.account_number} onCopy={() => copy(account.account_number)} />
        )}
        {account.iban && (
          <CopyRow label="الآيبان" value={account.iban} onCopy={() => copy(account.iban)} />
        )}
        {account.swift_code && (
          <CopyRow label="سويفت" value={account.swift_code} onCopy={() => copy(account.swift_code)} />
        )}
      </div>
    </div>
  )
}

const CopyRow = ({ label, value, onCopy }) => (
  <div onClick={onCopy} style={{
    padding: '7px 10px', borderRadius: 8,
    background: 'linear-gradient(180deg,#262626 0%,#1d1d1d 100%)',
    border: '1px solid rgba(255,255,255,.05)',
    cursor: 'pointer', transition: '.18s',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.03)',
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}40` }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', marginBottom: 3, letterSpacing: '.2px' }}>{label}</div>
    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.92)', direction: 'ltr',
      fontFamily: "'JetBrains Mono','Cairo',sans-serif", wordBreak: 'break-all' }}>
      {value}
    </div>
  </div>
)

/* ═══════════════════════════════════════════════════════════════
   Add / Edit modal — built on ModalShell + KCard + success animation.
   ═══════════════════════════════════════════════════════════════ */

function BranchFormModal({ open, onClose, form, setForm, saving, success, onSave, updateCode,
                          regions, cities, districtsList, branchManagers }) {
  const isEdit = !!form._id
  const distOpts = districtsList.filter(d => !form.city_id || d.city_id === form.city_id)
    .map(d => ({ v: d.id, l: d.name_ar }))
  // Read-only by default (auto-generated from city code); pencil button
  // switches to an editable state. Once the modal closes, the override sticks
  // because the next openAdd/openEdit resets `form`, which resets this flag too.
  const [codeEditing, setCodeEditing] = useState(false)
  useEffect(() => { if (!open) setCodeEditing(false) }, [open])

  if (success) {
    return ReactDOM.createPortal(
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: 'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderRadius: 16, width: 420, maxWidth: '95vw',
          padding: '48px 32px',
          boxShadow: '0 24px 60px rgba(0,0,0,.55), 0 8px 24px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.08)',
          border: `1px solid rgba(255,255,255,.08)`,
        }}>
          <style>{`
            @keyframes brsPop { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
            @keyframes brsCheck { 0% { stroke-dashoffset: 60 } 100% { stroke-dashoffset: 0 } }
            @keyframes brsFade { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
          `}</style>
          <div dir="rtl" style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: 'radial-gradient(circle at center, #27a04628, #27a04608)',
              border: '2px solid #27a04666',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'brsPop .5s cubic-bezier(.4,1.4,.5,1) forwards',
              boxShadow: '0 0 40px #27a04640',
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#27a046"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"
                  style={{ strokeDasharray: 60, strokeDashoffset: 60,
                    animation: 'brsCheck .45s .25s ease-out forwards' }} />
              </svg>
            </div>
            <div style={{ animation: 'brsFade .4s .45s both', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,.93)', marginBottom: 8, letterSpacing: '-.3px' }}>
                {isEdit ? 'تم التعديل' : 'تمت الإضافة'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)' }}>{form.branch_code}</div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <ModalShell open={open} onClose={onClose}
      title={isEdit ? 'تعديل مكتب' : 'مكتب جديد'} Icon={Building2}
      footer={
        <>
          <div style={{ flex: 1 }} />
          <SaveBtn onClick={onSave} disabled={saving}
            label={saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'إضافة')} />
        </>
      }>
      <KCard Icon={Building2} label="بيانات المكتب">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <CustomSel k="region_id" l="المنطقة" r
            opts={regions.map(r => ({ v: r.id, l: r.name_ar }))} ph="اختر المنطقة..."
            form={form} setForm={setForm} />
          <CustomSel k="city_id" l="المدينة" r
            opts={cities.filter(c => !form.region_id || c.region_id === form.region_id)
              .map(c => ({ v: c.id, l: c.name_ar }))}
            ph="اختر المدينة..." onSelect={updateCode}
            form={form} setForm={setForm} />
          <CustomSel k="district_id" l="الحي"
            opts={distOpts} ph="اختر الحي..." form={form} setForm={setForm} />
          <div>
            <Lbl req>كود المكتب</Lbl>
            {codeEditing ? (
              <input value={form.branch_code || ''} autoFocus
                onChange={e => setForm(p => ({ ...p, branch_code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') }))}
                onBlur={() => setCodeEditing(false)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCodeEditing(false) } }}
                placeholder="RYD-01" dir="ltr"
                style={{ ...sF, direction: 'ltr', textAlign: 'center',
                  fontFamily: "'JetBrains Mono','Cairo',sans-serif", fontWeight: 700 }} />
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', borderRadius: 10,
                border: '1px solid rgba(255,255,255,.07)', height: 42, boxSizing: 'border-box',
                boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
                overflow: 'hidden',
              }}>
                <span style={{
                  fontSize: 13, fontFamily: "'JetBrains Mono','Cairo',sans-serif",
                  fontWeight: 600, direction: 'ltr', flex: 1, textAlign: 'center',
                  color: form.branch_code ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {form.branch_code || '— الكود —'}
                </span>
                <button type="button" onClick={() => setCodeEditing(true)} title="تعديل"
                  style={{
                    width: 28, height: 26, borderRadius: 6,
                    border: `1px dashed ${GOLD}80`, background: 'transparent',
                    color: GOLD, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0, transition: '.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}15` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <Edit2 size={12} strokeWidth={2.2} />
                </button>
              </div>
            )}
          </div>
          <WF k="street" l="الشارع بالعربي" ph="شارع حائل" form={form} setForm={setForm} missing />
          <WF k="street_en" l="الشارع بالإنجليزي" d ph="Hail Street" form={form} setForm={setForm} missing />
          <WF k="postal_code" l="الرمز البريدي" d ph="32416" form={form} setForm={setForm} />
          <WF k="building_number" l="رقم المبنى" d ph="4521" form={form} setForm={setForm} missing />
          <CustomSel k="manager_user_id" l="مدير الفرع"
            opts={branchManagers.map(u => ({ v: u.id, l: u.name_ar }))} ph="اختر مدير الفرع..."
            form={form} setForm={setForm} />
          <PhoneField k="phone" l="رقم الجوال" form={form} setForm={setForm} />
          {isEdit && (
            <div>
              <Lbl>الحالة</Lbl>
              <div style={{
                display: 'flex', gap: 3, padding: 3, height: 42, boxSizing: 'border-box',
                background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
                borderRadius: 10, border: '1px solid rgba(255,255,255,.06)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',
              }}>
                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: true }))}
                  style={{
                    flex: 1, borderRadius: 7, border: 'none',
                    background: form.is_active === true ? 'rgba(39,160,70,.18)' : 'transparent',
                    color: form.is_active === true ? C.ok : 'var(--tx5)',
                    fontFamily: F, fontSize: 12, fontWeight: form.is_active === true ? 700 : 500,
                    cursor: 'pointer', transition: '.18s',
                  }}>نشط</button>
                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: false }))}
                  style={{
                    flex: 1, borderRadius: 7, border: 'none',
                    background: form.is_active === false ? 'rgba(192,57,43,.18)' : 'transparent',
                    color: form.is_active === false ? C.red : 'var(--tx5)',
                    fontFamily: F, fontSize: 12, fontWeight: form.is_active === false ? 700 : 500,
                    cursor: 'pointer', transition: '.18s',
                  }}>معطّل</button>
              </div>
            </div>
          )}
        </div>
      </KCard>
    </ModalShell>
  )
}
