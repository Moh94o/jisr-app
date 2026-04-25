import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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

function WF({ k, l, r, d, w, opts, ph, tp, form, setForm }) {
  const val = form[k] || ''
  const onChange = e => setForm(p => ({ ...p, [k]: e.target.value }))
  return (
    <div style={{ gridColumn: w === true ? '1/-1' : undefined }}>
      <Lbl req={r}>{l}</Lbl>
      {opts
        ? <select value={val} onChange={onChange} style={sF}>
            <option value="">—</option>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        : <input type={tp || 'text'} placeholder={ph || ''} value={val} onChange={onChange}
            style={{ ...sF, direction: d ? 'ltr' : 'rtl', textAlign: 'center' }} />}
    </div>
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
        border: '1px solid transparent', borderRadius: 9, overflow: 'hidden',
        background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
        height: 42, transition: 'border-color .2s',
      }}>
        <div style={{
          height: '100%', padding: '0 10px',
          background: 'rgba(255,255,255,.04)',
          display: 'flex', alignItems: 'center',
          fontSize: 12, fontWeight: 700, color: GOLD, flexShrink: 0,
        }}>+966</div>
        <input placeholder="5X XXX XXXX" maxLength={9} value={digits}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 9)
            setForm(p => ({ ...p, [k]: v ? '+966' + v : '' }))
          }}
          style={{
            width: '100%', height: '100%', padding: '0 12px',
            border: 'none', background: 'transparent',
            fontFamily: F, fontSize: 13, fontWeight: 600,
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
    const branchesData = (br.data || []).map(b => ({
      ...b,
      branch_id: b.id,
      region_name: regionsData.find(r => r.id === b.region_id)?.name_ar || '',
      city_name: citiesData.find(c => c.id === b.city_id)?.name_ar || '',
      district_name: districtsData.find(d => d.id === b.district_id)?.name_ar || '',
      manager_user_name: usersData.find(x => x.id === b.manager_user_id)?.name_ar || '',
      workers_count: usersData.filter(x => x.branch_id === b.id).length,
    }))
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
      ;['region_name','city_name','district_name','manager_user_name','workers_count','branch_id'].forEach(k => delete d[k])
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
      const existing = branches.filter(b => b.code?.startsWith(city.code)).length
      const num = String(existing + 1).padStart(2, '0')
      setForm(p => ({ ...p, city_id: cityId, code: city.code + '-' + num, district_id: '' }))
    } else {
      setForm(p => ({ ...p, city_id: cityId, district_id: '' }))
    }
  }

  const openAdd = () => {
    setForm({ code: '', region_id: '', city_id: '', district_id: '', phone: '', manager_user_id: '',
      building_number: '', street: '', street_en: '', postal_code: '', is_active: true })
    setPop(true)
  }
  const openEdit = (r) => {
    setForm({
      _id: r.id, code: r.code || '', region_id: r.region_id || '', city_id: r.city_id || '',
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
        const match = (b.code || '').toLowerCase().includes(q)
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

  const sharedStyle = (
    <style>{`
      .brs-card { background: #141414; border: 1px solid rgba(255,255,255,.06); border-radius: 14px;
        padding: 16px; transition: .2s; }
      .brs-card-title { font-size: 13px; font-weight: 800; color: var(--tx); margin-bottom: 12px;
        display: flex; align-items: center; gap: 8px; padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,255,255,.05) }
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

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>
              المكاتب
            </div>
            <div style={{ fontSize: 13, color: 'var(--tx5)', fontWeight: 600, marginTop: 6 }}>
              إدارة المكاتب والفروع
            </div>
          </div>
          <button onClick={openAdd}
            style={{ height: 36, padding: '0 16px', borderRadius: 9,
              border: `1px solid ${GOLD}`, background: 'transparent', color: GOLD,
              fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 7, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}14` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            إضافة مكتب <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* KPI + Hero row — matches UserRolePage rhythm */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="النشطة" value={`${topStats.active} / ${topStats.total}`} color={C.ok} />
            <KpiBox label="الموظفون" value={topStats.totalStaff} color={C.blue} />
            <KpiBox label="الرصيد" value={`${nm(Math.round(topStats.totalBalance))} ر.س`} color={GOLD} />
            <KpiBox label="تنبيهات" value={topStats.lowAlerts}
              color={topStats.lowAlerts ? '#c0392b' : '#999'} />
          </div>
          <BranchActivityChart days={topStats.days} color={GOLD} label="نشاط جميع المكاتب (آخر 14 يوم)" />
        </div>
        <HeroStat label="المكاتب" value={topStats.total} unit="مكتب" color={GOLD}
          footer={topStats.active === topStats.total && topStats.total > 0
            ? 'جميع المكاتب نشطة'
            : `${topStats.active} نشطة · ${topStats.total - topStats.active} معطّل`} />
      </div>

      {/* Search + advanced filters */}
      <div style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', position: 'relative', minWidth: 200 }}>
          <Search size={15} color="rgba(255,255,255,.35)"
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="ابحث بالكود، المدينة، المدير، الجوال…"
            style={{
              width: '100%', height: 42, paddingRight: 40, paddingLeft: 14,
              border: '1px solid rgba(255,255,255,.08)', borderRadius: 10,
              fontFamily: F, fontSize: 13, fontWeight: 500, color: 'var(--tx)',
              background: 'rgba(0,0,0,.18)', outline: 'none',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', boxSizing: 'border-box',
            }} />
        </div>
        <button onClick={() => setAdvOpen(v => !v)}
          style={{
            height: 42, padding: '0 16px', borderRadius: 10,
            border: `1px solid ${advOpen || hasFilters ? GOLD + '55' : 'rgba(255,255,255,.08)'}`,
            background: advOpen || hasFilters ? `${GOLD}14` : 'rgba(0,0,0,.18)',
            color: advOpen || hasFilters ? GOLD : 'var(--tx3)',
            fontFamily: F, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
          <SlidersHorizontal size={14} />
          بحث متقدم
          {hasFilters && <span style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, boxShadow: `0 0 6px ${GOLD}99` }} />}
          <ChevronDown size={12} style={{ transform: advOpen ? 'rotate(180deg)' : '', transition: '.2s' }} />
        </button>
      </div>
      {advOpen && (
        <div style={{
          marginBottom: 14, padding: '14px 16px',
          background: `${GOLD}08`, border: `1px solid ${GOLD}22`,
          borderRadius: 12,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10, marginBottom: 10 }}>
            <div>
              <Lbl>المنطقة</Lbl>
              <select value={filters.region_id}
                onChange={e => setFilters(f => ({ ...f, region_id: e.target.value, city_id: '' }))} style={sF}>
                <option value="">جميع المناطق</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name_ar}</option>)}
              </select>
            </div>
            <div>
              <Lbl>المدينة</Lbl>
              <select value={filters.city_id}
                onChange={e => setFilters(f => ({ ...f, city_id: e.target.value }))} style={sF}>
                <option value="">جميع المدن</option>
                {cities.filter(c => !filters.region_id || c.region_id === filters.region_id)
                  .map(c => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div>
              <Lbl>الحالة</Lbl>
              <div style={{
                display: 'flex', gap: 3, padding: 3, height: 42, boxSizing: 'border-box',
                background: 'rgba(0,0,0,.18)', borderRadius: 9, border: '1px solid transparent',
              }}>
                {[['', 'الكل', 'var(--tx3)'], ['true', 'نشط', C.ok], ['false', 'معطّل', '#c0392b']].map(([v, l, c]) => (
                  <button key={v} onClick={() => setFilters(f => ({ ...f, is_active: v }))}
                    style={{
                      flex: 1, borderRadius: 6, border: 'none',
                      background: filters.is_active === v ? c + '22' : 'transparent',
                      color: filters.is_active === v ? c : 'var(--tx5)',
                      fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                    }}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: 11, color: 'var(--tx5)' }}>
              <span style={{ fontWeight: 800, color: GOLD }}>{filteredBranches.length}</span> من أصل <span style={{ fontWeight: 800 }}>{branches.length}</span>
            </div>
            {(hasFilters || searchQ) && (
              <button onClick={resetFilters}
                style={{
                  height: 30, padding: '0 14px', borderRadius: 7,
                  background: 'transparent', border: '1px solid rgba(255,255,255,.1)',
                  color: 'var(--tx4)', fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                إعادة تعيين
              </button>
            )}
          </div>
        </div>
      )}

      {/* Branch grid */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : filteredBranches.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12 }}>
          <Building2 size={36} color={GOLD} style={{ opacity: .5 }} />
          <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>
            {branches.length === 0 ? 'لا توجد مكاتب — أضِف أول مكتب' : 'لا توجد نتائج مطابقة'}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(max(320px, calc(50% - 6px)), 1fr))',
          gap: 12,
        }}>
          {filteredBranches.map(b => (
            <BranchCard key={b.id} branch={b} dashboard={dashboards[b.id]}
              onClick={() => setSelectedBranchId(b.id)} onEdit={() => openEdit(b)} />
          ))}
        </div>
      )}

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
   Branch card (grid item)
   ═══════════════════════════════════════════════════════════════ */

function BranchCard({ branch, dashboard, onClick, onEdit }) {
  const isActive = branch.is_active !== false
  const tone = isActive ? C.ok : '#777'
  const balance = Number(dashboard?.bank_total_balance || 0)
  const staff = Number(dashboard?.staff_total ?? branch.workers_count ?? 0)
  const lastActivity = formatRelative(dashboard?.last_activity_at)
  const alerts = Number(dashboard?.bank_low_alerts || 0)

  // Stat row: [number] [label] [icon] — same rhythm for all three.
  const StatRow = ({ Icon, value, label }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
    }}>
      <span style={{
        fontSize: 16, fontWeight: 600,
        color: 'rgba(255,255,255,.85)',
        fontFamily: "'JetBrains Mono','Cairo',sans-serif",
        direction: 'ltr', letterSpacing: '.2px',
      }}>{value}</span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>{label}</span>
      <Icon size={14} color="rgba(255,255,255,.5)" strokeWidth={2} />
    </div>
  )

  return (
    <div onClick={onClick} style={{
      background: 'rgba(20,20,20,.5)',
      borderRadius: 12,
      transition: '.2s',
      border: '1px solid rgba(255,255,255,.05)',
      position: 'relative', cursor: 'pointer',
      padding: 20,
      display: 'flex', gap: 16, alignItems: 'flex-start',
      minHeight: 140,
      opacity: isActive ? 1 : .65,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}4d` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>

      {alerts > 0 && (
        <div onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
          <span title={`${alerts} تنبيه رصيد منخفض`}
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.25)',
              color: '#e68a80',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <AlertCircle size={11} />
          </span>
        </div>
      )}

      {/* Right section — info, takes the remaining width */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 20, fontWeight: 700, color: GOLD,
            fontFamily: "'JetBrains Mono','Cairo',sans-serif", letterSpacing: '.3px',
          }}>
            {branch.code || '—'}
          </span>
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
            background: `${tone}1a`, color: tone, border: `1px solid ${tone}33`,
          }}>
            {isActive ? 'نشط' : 'معطّل'}
          </span>
        </div>

        {(branch.city_name || branch.region_name) && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 500,
            marginTop: 8,
          }}>
            <MapPin size={14} color="rgba(255,255,255,.5)" />
            <span>
              {branch.city_name}
              {branch.region_name && (
                <>
                  <span style={{ color: 'rgba(255,255,255,.4)', margin: '0 6px' }}>•</span>
                  {branch.region_name}
                </>
              )}
            </span>
          </div>
        )}

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          fontSize: 14, color: 'rgba(255,255,255,.6)', fontWeight: 500,
          marginTop: 6,
        }}>
          <User size={14} color="rgba(255,255,255,.5)" />
          {branch.manager_user_name ? (
            <span style={{ color: 'rgba(255,255,255,.8)' }}>{branch.manager_user_name}</span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,.4)' }}>لا يوجد مدير</span>
          )}
          {lastActivity && (
            <>
              <span style={{ color: 'rgba(255,255,255,.4)' }}>•</span>
              <span style={{ color: 'rgba(255,255,255,.5)' }}>{lastActivity}</span>
            </>
          )}
        </div>
      </div>

      {/* Left section — fixed-width stats column */}
      <div style={{
        width: 128, flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: 10,
        alignItems: 'stretch',
      }}>
        <StatRow Icon={Users}      value={staff}                                         label="موظف" />
        <StatRow Icon={CreditCard} value={Number(dashboard?.bank_accounts_active || 0)} label="حساب" />
        <StatRow Icon={Activity}   value={dashboard?.activity_30d ?? 0}                 label="نشاط ٣٠ي" />
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
    <div style={{ padding: '0 4px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '0 4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, fontWeight: 800, color: 'var(--tx)' }}>
          <Activity size={13} color={color} /> {label}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx4)' }}>
          الإجمالي: <span style={{ color, fontWeight: 800 }}>{total}</span> عملية
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
                      : 'rgba(255,255,255,.04)',
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

  const days = useMemo(() => {
    const map = new Map()
    ;(dashboard?.daily_14d || []).forEach(d => map.set(String(d.day).slice(0, 10), Number(d.cnt || 0)))
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (13 - i))
      const key = d.toISOString().slice(0, 10)
      return { date: d, count: map.get(key) || 0 }
    })
  }, [dashboard])

  const totalBalance = banks.reduce((s, a) => s + Number(a.current_balance || 0), 0)
  const activeStaff = users.filter(u => u.is_active).length

  return (
    <div dir="rtl" style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {/* Header row — identity first, then back + edit buttons underneath */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.95)',
              fontFamily: "'JetBrains Mono','Cairo',sans-serif", letterSpacing: '.3px' }}>
              {branch.code || '—'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx5)', fontWeight: 600, display: 'flex', gap: 5, alignItems: 'center' }}>
            <MapPin size={12} /> {[branch.city_name, branch.region_name].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <button onClick={onBack} title="رجوع"
            style={{ height: 34, padding: '0 12px', borderRadius: 8,
              background: '#141414', border: '1px solid rgba(255,255,255,.06)',
              color: 'var(--tx2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: F, fontSize: 11, fontWeight: 700, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}14`; e.currentTarget.style.borderColor = `${GOLD}4d`; e.currentTarget.style.color = GOLD }}
            onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx2)' }}>
            <ArrowRight size={13} /> رجوع
          </button>
          <button onClick={onEdit}
            style={{ height: 34, padding: '0 14px', borderRadius: 8,
              border: `1px solid ${GOLD}`, background: 'transparent', color: GOLD,
              fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${GOLD}14` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            تعديل <Edit2 size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Stacked cards — same rhythm as the modal body had */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* KPI row (replicates UserRolePage) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14 }}>
            <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,.05)',
              borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <KpiBox label="الموظفون" value={users.length} color={C.blue} />
                <KpiBox label="الحسابات" value={banks.length} color={GOLD} />
                <KpiBox label="الرصيد" value={nm(Math.round(totalBalance))} color={C.ok} />
                <KpiBox label="نشاط ٣٠ي" value={dashboard?.activity_30d ?? 0} color={C.gold} />
              </div>
              <BranchActivityChart days={days} color={GOLD} label="نشاط المكتب (آخر 14 يوم)" />
            </div>
            <HeroStat label="الموظفون" value={users.length} unit="موظف" color={GOLD}
              footer={activeStaff === users.length && users.length > 0
                ? 'جميع الموظفين نشطين'
                : (users.length === 0 ? 'لا يوجد موظفون' : `${activeStaff} نشط · ${users.length - activeStaff} معطّل`)} />
          </div>

          {/* Basic info card */}
          <InfoCard title="بيانات المكتب" Icon={Home}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
              <KV icon={Hash} label="الكود" value={branch.code} dir="ltr" color={GOLD} />
              <KV icon={Phone} label="الجوال" value={branch.phone} dir="ltr" color={C.blue} />
              <KV icon={MapPin} label="المنطقة" value={branch.region_name} color={GOLD} />
              <KV icon={MapPin} label="المدينة" value={branch.city_name} color={GOLD} />
              <KV icon={MapPin} label="الحي" value={branch.district_name} color={GOLD} />
              <KV icon={Home} label="الشارع" value={branch.street} color={GOLD} />
              <KV icon={Hash} label="رقم المبنى" value={branch.building_number} dir="ltr" color={GOLD} />
              <KV icon={Hash} label="الرمز البريدي" value={branch.postal_code} dir="ltr" color={GOLD} />
            </div>
          </InfoCard>

          {/* Manager card */}
          <InfoCard title="مدير المكتب" Icon={Briefcase}>
            {branch.manager_user_name ? (
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: `${GOLD}08`, border: `1px solid ${GOLD}26`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}08)`,
                  border: `1.5px solid ${GOLD}44`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 900, color: GOLD,
                }}>
                  {(branch.manager_user_name || '?')[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{branch.manager_user_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 2 }}>المدير المسؤول</div>
                </div>
              </div>
            ) : (
              <EmptyLine text="لم يتم تعيين مدير لهذا المكتب" Icon={User} />
            )}
          </InfoCard>

          {/* Staff card */}
          <InfoCard title={`الموظفون`} Icon={Users} badge={users.length}>
            {users.length === 0 ? (
              <EmptyLine text="لا يوجد موظفون في هذا المكتب" Icon={Users} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
                {users.map(u => {
                  const isManager = branch.manager_user_id === u.id
                  return (
                    <div key={u.id} style={{
                      padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(255,255,255,.02)',
                      border: '1px solid rgba(255,255,255,.05)',
                      display: 'flex', alignItems: 'center', gap: 10,
                      borderInlineStart: `3px solid ${isManager ? GOLD : C.blue}`,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: `${isManager ? GOLD : C.blue}14`,
                        border: `1px solid ${isManager ? GOLD : C.blue}26`,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: isManager ? GOLD : C.blue, flexShrink: 0,
                      }}>
                        {(u.name_ar || '?')[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)' }}>{u.name_ar}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 600, marginTop: 2 }}>
                          {u.is_active ? 'نشط' : 'معطّل'}
                          {isManager && <span style={{ color: GOLD, marginInlineStart: 6 }}>· المدير</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </InfoCard>

          {/* Bank accounts card */}
          <InfoCard title="الحسابات البنكية" Icon={Wallet} badge={banks.length}
            rightSlot={banks.length > 0 ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 6,
                background: `${C.ok}14`, border: `1px solid ${C.ok}33`,
                fontSize: 10.5, fontWeight: 800, color: C.ok, direction: 'ltr',
              }}>
                <TrendingUp size={11} /> {nm(Math.round(totalBalance))} ر.س
              </span>
            ) : null}>
            {banks.length === 0 ? (
              <EmptyLine text="لا توجد حسابات بنكية مربوطة بهذا المكتب" Icon={Wallet} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {banks.map(a => <BankRow key={a.id} account={a} toast={toast} />)}
              </div>
            )}
          </InfoCard>

          {/* Documents card */}
          {docs.length > 0 && (
            <InfoCard title="المستندات" Icon={FileText} badge={docs.length}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {docs.map(d => {
                  const isExpired = d.expiry_date && new Date(d.expiry_date) < new Date()
                  const expSoon = d.expiry_date && !isExpired &&
                    (new Date(d.expiry_date) - new Date()) / 86400_000 < 30
                  const c = isExpired ? '#c0392b' : expSoon ? '#e6a23c' : C.ok
                  return (
                    <div key={d.id} style={{
                      padding: '10px 12px', borderRadius: 9,
                      background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: `${c}14`, border: `1px solid ${c}26`,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <FileText size={13} color={c} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>
                            {d.document_name || d.file_name}
                          </div>
                          {d.notes && <div style={{ fontSize: 9.5, color: 'var(--tx5)', marginTop: 1 }}>{d.notes}</div>}
                        </div>
                      </div>
                      {d.expiry_date && (
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 5,
                          background: `${c}14`, color: c, border: `1px solid ${c}33`, direction: 'ltr',
                        }}>
                          {isExpired ? 'منتهي' : expSoon ? 'ينتهي قريباً' : 'ساري'} · {d.expiry_date}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </InfoCard>
          )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Shared bits for the detail page.
   ═══════════════════════════════════════════════════════════════ */

const InfoCard = ({ title, Icon, badge, rightSlot, children }) => (
  <div className="brs-card" style={{ padding: 16 }}>
    <div className="brs-card-title" style={{ justifyContent: 'space-between' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {Icon && <Icon size={15} color={GOLD} />}
        {title}
        {badge != null && (
          <span style={{
            marginInlineStart: 4, padding: '2px 8px', borderRadius: 6,
            background: `${GOLD}14`, border: `1px solid ${GOLD}33`,
            fontSize: 10.5, fontWeight: 800, color: GOLD_SOFT, direction: 'ltr',
          }}>
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
    background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)',
    borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  }}>
    {Icon && <Icon size={20} color={GOLD} style={{ opacity: .4 }} />}
    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx5)' }}>{text}</div>
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
      background: 'rgba(255,255,255,.02)',
      border: `1px solid ${lowBal ? 'rgba(230,162,60,.25)' : 'rgba(255,255,255,.05)'}`,
      borderInlineStart: `3px solid ${c}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <CreditCard size={14} color={c} />
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{account.bank_name}</span>
          {account.is_primary && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 5,
              background: `${GOLD}14`, color: GOLD, border: `1px solid ${GOLD}33`,
            }}>رئيسي</span>
          )}
          {account.account_purpose && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
              background: 'rgba(255,255,255,.04)', color: 'var(--tx4)',
            }}>{account.account_purpose}</span>
          )}
        </div>
        <div style={{ direction: 'ltr', fontSize: 16, fontWeight: 900, color: c, fontFamily: "'JetBrains Mono','Cairo',sans-serif" }}>
          {nm(account.current_balance || 0)}
          <span style={{ fontSize: 10, fontWeight: 700, opacity: .6, marginInlineStart: 4 }}>ر.س</span>
        </div>
      </div>
      {lowBal && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#e6a23c',
          background: 'rgba(230,162,60,.1)', padding: '4px 8px', borderRadius: 5,
          marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
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
    padding: '6px 9px', borderRadius: 7,
    background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.04)',
    cursor: 'pointer', transition: '.15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}33` }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.04)' }}>
    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--tx5)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', direction: 'ltr',
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
          background: '#1a1a1a', borderRadius: 18, width: 420, maxWidth: '95vw',
          padding: '48px 32px', boxShadow: '0 24px 60px rgba(0,0,0,.5)',
          border: `1px solid ${GOLD}18`,
        }}>
          <style>{`
            @keyframes brsPop { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
            @keyframes brsCheck { 0% { stroke-dashoffset: 60 } 100% { stroke-dashoffset: 0 } }
            @keyframes brsFade { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
          `}</style>
          <div dir="rtl" style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: 'radial-gradient(circle at center, #27a04622, #27a04608)',
              border: '2px solid #27a04655',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'brsPop .5s cubic-bezier(.4,1.4,.5,1) forwards',
              boxShadow: '0 0 40px #27a04633',
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#27a046"
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"
                  style={{ strokeDasharray: 60, strokeDashoffset: 60,
                    animation: 'brsCheck .45s .25s ease-out forwards' }} />
              </svg>
            </div>
            <div style={{ animation: 'brsFade .4s .45s both', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', marginBottom: 6 }}>
                {isEdit ? 'تم التعديل' : 'تمت الإضافة'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx5)' }}>{form.code}</div>
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
              <input value={form.code || ''} autoFocus
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') }))}
                onBlur={() => setCodeEditing(false)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCodeEditing(false) } }}
                placeholder="RYD-01" dir="ltr"
                style={{ ...sF, direction: 'ltr', textAlign: 'center',
                  fontFamily: "'JetBrains Mono','Cairo',sans-serif", fontWeight: 700 }} />
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                background: 'rgba(0,0,0,.18)', borderRadius: 9,
                border: '1px solid transparent', height: 42, boxSizing: 'border-box',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', overflow: 'hidden',
              }}>
                <span style={{
                  fontSize: 13, fontFamily: "'JetBrains Mono','Cairo',sans-serif",
                  fontWeight: 700, direction: 'ltr', flex: 1, textAlign: 'center',
                  color: form.code ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.28)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {form.code || '— الكود —'}
                </span>
                <button type="button" onClick={() => setCodeEditing(true)} title="تعديل"
                  style={{
                    width: 28, height: 26, borderRadius: 6,
                    border: `1px dashed ${GOLD}73`, background: 'transparent',
                    color: `${GOLD}d9`, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0,
                  }}>
                  <Edit2 size={12} strokeWidth={2.2} />
                </button>
              </div>
            )}
          </div>
          <WF k="street" l="الشارع بالعربي" ph="شارع حائل" form={form} setForm={setForm} />
          <WF k="street_en" l="الشارع بالإنجليزي" d ph="Hail Street" form={form} setForm={setForm} />
          <WF k="postal_code" l="الرمز البريدي" d ph="32416" form={form} setForm={setForm} />
          <WF k="building_number" l="رقم المبنى" d ph="4521" form={form} setForm={setForm} />
          <CustomSel k="manager_user_id" l="مدير الفرع"
            opts={branchManagers.map(u => ({ v: u.id, l: u.name_ar }))} ph="اختر مدير الفرع..."
            form={form} setForm={setForm} />
          <PhoneField k="phone" l="رقم الجوال" form={form} setForm={setForm} />
          {isEdit && (
            <div>
              <Lbl>الحالة</Lbl>
              <div style={{
                display: 'flex', gap: 3, padding: 3, height: 42, boxSizing: 'border-box',
                background: 'rgba(0,0,0,.18)', borderRadius: 9, border: '1px solid transparent',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
              }}>
                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: true }))}
                  style={{
                    flex: 1, borderRadius: 6, border: 'none',
                    background: form.is_active === true ? 'rgba(39,160,70,.15)' : 'transparent',
                    color: form.is_active === true ? C.ok : 'var(--tx5)',
                    fontFamily: F, fontSize: 12, fontWeight: form.is_active === true ? 800 : 600, cursor: 'pointer',
                  }}>نشط</button>
                <button type="button" onClick={() => setForm(p => ({ ...p, is_active: false }))}
                  style={{
                    flex: 1, borderRadius: 6, border: 'none',
                    background: form.is_active === false ? 'rgba(192,57,43,.15)' : 'transparent',
                    color: form.is_active === false ? '#c0392b' : 'var(--tx5)',
                    fontFamily: F, fontSize: 12, fontWeight: form.is_active === false ? 800 : 600, cursor: 'pointer',
                  }}>معطّل</button>
              </div>
            </div>
          )}
        </div>
      </KCard>
    </ModalShell>
  )
}
