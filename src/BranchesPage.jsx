import React, { useState, useEffect, useCallback, useMemo } from 'react'
// Forced reparse marker — InvoicePage-styled detail page
import BackButton from './components/BackButton'
import { can as canPerm, cardVisible, canCardBtn } from './lib/permissions.js'
import BranchRentCard from './pages/branch/BranchRentCard.jsx'
import BranchObligationsCard from './pages/branch/BranchObligationsCard.jsx'
import BranchLicenseCard from './pages/branch/BranchLicenseCard.jsx'
import {
  Building2, Users, Activity, MapPin, Phone, User, Edit2, Plus,
  Search, Check, AlertCircle, CreditCard, FileText, Link2,
  Banknote, ArrowDownToLine, ArrowUpFromLine, Receipt, Copy, Landmark,
} from 'lucide-react'
import { Modal as FKModal, ModalSection as FKSection, ActionButton as FKAction, Select as FKSelect, MultiSelect as FKMulti, TextField as FKText, FileField as FKFile, DateField as FKDateField, Field as FKField, EmptyState, SuccessView, ConfirmDialog, ScrollBox, GRID, C, sF } from './components/ui/FormKit.jsx'
import { SkeletonCards, SkeletonList } from './components/ui/Skeleton.jsx'

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

// Multi-select dropdown options for a bank account's purposes (value is a ' · '-joined string).
const PURPOSE_OPTS = [
  { v: 'الإيداعات النقدية', Icon: Banknote, hue: '#27a046' },
  { v: 'التحويلات الواردة', Icon: ArrowDownToLine, hue: '#3483b4' },
  { v: 'التحويلات الصادرة', Icon: ArrowUpFromLine, hue: '#e6a23c' },
  { v: 'سداد المدفوعات', Icon: Receipt, hue: '#bb8fce' },
]
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
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  // Detail view replaces the list inline (same pattern as PersonsPage),
  // identified by the selected branch id so the data stays fresh on reload.
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [pop, setPop] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [filters, setFilters] = useState({ region_id: '', city_id: '', is_active: '' })
  const [advOpen, setAdvOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [br, u, ba, rg, ct, di, dc, dash, mgr, rl] = await Promise.all([
      sb.from('branches').select('*').is('deleted_at', null),
      sb.from('users').select('id, auth_user_id, role_id, primary_branch_id, is_active, email, avatar_url, personal_phone, person:persons(id, name_ar, name_en, id_number, phone_primary, nationality:nationalities(name_ar, flag_url, code))').is('deleted_at', null),
      sb.from('bank_account_branches')
        .select('id, branch_id, account_purpose, bank_accounts!inner(*)')
        .is('deleted_at', null)
        .eq('is_active', true)
        .is('bank_accounts.deleted_at', null),
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
      sb.from('roles').select('id, name_ar, name_en, color').is('is_active', true),
    ])
    const regionsData = rg.data || []
    const citiesData = ct.data || []
    const rolesData = rl.data || []
    // Normalize users: flatten persons join + alias primary_branch_id as branch_id
    // for backward compat with existing references.
    const usersData = (u.data || []).map(usr => ({
      ...usr,
      branch_id: usr.primary_branch_id,
      name_ar: usr.person?.name_ar || '',
      name_en: usr.person?.name_en || '',
      id_number: usr.person?.id_number || '',
      phone: usr.personal_phone || usr.person?.phone_primary || '',
      nationality_name: usr.person?.nationality?.name_ar || '',
      nationality_flag: usr.person?.nationality?.flag_url || '',
      nationality_code: usr.person?.nationality?.code || '',
      role_name: rolesData.find(r => r.id === usr.role_id)?.name_ar || '',
      role_color: rolesData.find(r => r.id === usr.role_id)?.color || '#777',
    }))
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
        workers_count: usersData.filter(x => x.branch_id === b.id && x.role_name !== 'المدير العام').length,
      }
    })
    const dashMap = {}
    ;(dash.data || []).forEach(d => { dashMap[d.branch_id] = d })
    // Flatten junction → flat bank rows scoped to a branch; the same bank account
    // appears once per linked branch with its branch-specific purpose.
    const banksData = (ba.data || []).map(j => ({
      ...(j.bank_accounts || {}),
      _junction_id: j.id,
      branch_id: j.branch_id,
      account_purpose: j.account_purpose,
    }))
    setBranches(branchesData); setUsers(usersData); setBanks(banksData)
    setRegions(regionsData); setCities(citiesData); setDistrictsList(districtsData)
    setDocs(dc.data || []); setDashboards(dashMap); setRoles(rolesData)
    // Intersect user_roles→users client-side: keep only active non-deleted
    // users whose id appears in a branch-manager role row.
    const managerIds = new Set((mgr.data || []).map(r => r.user_id).filter(Boolean))
    const managers = usersData.filter(u => managerIds.has(u.id) && u.is_active === true)
    setBranchManagers(managers)
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  const saveBranch = async () => {
    setSaving(true)
    const d = { ...form }; const id = d._id; delete d._id
    // Drop derived/UI-only fields and any column that's not yet in the branches table.
    ;['region_name','city_name','district_name','manager_user_name','workers_count','branch_id',
      'region_id','building_number','street','street_en','_orig'].forEach(k => delete d[k])
    Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null })
    try {
      if (id) { d.updated_by = user?.id; const { error } = await sb.from('branches').update(d).eq('id', id); if (error) throw error }
      else { d.created_by = user?.id; const { error } = await sb.from('branches').insert(d); if (error) throw error }
      setSuccess(true)
      load() // refresh the list behind the modal; modal stays open in success state until X is pressed
      return null
    } catch (e) {
      const msg = (e.message || '').toLowerCase()
      // Return the error string so the modal can show it inline in its footer (no toast).
      if (e.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
        return 'كود المكتب "' + (d.branch_code || '') + '" مستخدم بالفعل — اختر كوداً آخر'
      } else if (e.code === '42501' || msg.includes('row-level security') || msg.includes('violates row level')) {
        return 'لا تملك صلاحية إضافة مكتب جديد — تواصل مع مدير النظام لتفعيل الصلاحية'
      } else if (e.code === '23502' || msg.includes('null value')) {
        return 'تنقص بيانات مطلوبة لحفظ المكتب — تأكد من تعبئة كل الحقول الأساسية'
      } else if (e.code === '23503' || msg.includes('foreign key')) {
        return 'قيمة مرتبطة غير صحيحة (منطقة/مدينة/حي) — أعد اختيارها وحاول مرة أخرى'
      }
      return 'تعذّر حفظ المكتب: ' + (e.message || '').slice(0, 80)
    } finally {
      setSaving(false)
    }
  }

  // Delete flow — FormKit ConfirmDialog replaces the native confirm().
  const [delTarget, setDelTarget] = useState(null)
  const del = (id) => setDelTarget(id)
  const confirmDelBranch = async () => {
    const id = delTarget
    setDelTarget(null)
    if (!id) return
    const { error } = await sb.from('branches').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast?.('خطأ: ' + (error.message || '').slice(0, 80), 'error'); return }
    toast?.('تم الحذف'); setSelectedBranchId(null); load()
  }
  const delConfirmEl = (
    <ConfirmDialog open={!!delTarget} onCancel={() => setDelTarget(null)} onConfirm={confirmDelBranch}
      title="حذف المكتب" message="هل أنت متأكد من حذف هذا المكتب؟ لا يمكن التراجع عن هذا الإجراء."
      itemName={branches.find(b => b.id === delTarget)?.branch_code || undefined} />
  )

  const updateCode = async (cityId) => {
    const city = cities.find(c => c.id === cityId)
    if (!city?.code) { setForm(p => ({ ...p, city_id: cityId, district_id: '' })); return }
    // Read current max suffix straight from DB rather than local state, so two users
    // adding to the same city won't both land on the same generated code. The DB UNIQUE
    // constraint on branch_code is the real guard; this just makes the default sensible.
    // Codes are now joined (no hyphen) e.g. SHR01 — but match legacy hyphenated codes too.
    const { data } = await sb.from('branches').select('branch_code').like('branch_code', city.code + '%')
    const esc = city.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp('^' + esc + '-?(\\d+)$')
    const maxNum = (data || []).reduce((m, r) => {
      const mt = re.exec(r.branch_code || '')
      const n = mt ? parseInt(mt[1], 10) : NaN
      return Number.isFinite(n) && n > m ? n : m
    }, 0)
    const num = String(maxNum + 1).padStart(2, '0')
    setForm(p => ({ ...p, city_id: cityId, branch_code: city.code + num, district_id: '' }))
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
      // Snapshot of the editable fields before any change, so the success card can
      // show a before → after comparison. Stripped before the DB write in saveBranch.
      _orig: {
        branch_code: r.branch_code || '', region_id: r.region_id || '',
        city_id: r.city_id || '', district_id: r.district_id || '',
      },
    })
    setPop(true)
  }

  // Aggregate KPIs across all branches for the top row.
  const topStats = useMemo(() => {
    const total = branches.length
    const active = branches.filter(b => b.is_active === true).length
    // Exclude the system-level General Manager from staff counts —
    // he controls the whole system, not assigned per branch.
    const totalStaff = users.filter(u => u.is_active && u.role_name !== 'المدير العام').length
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
      if (filters.is_active !== '' && (b.is_active === true) !== (filters.is_active === 'true')) return false
      return true
    })
  }, [branches, searchQ, filters])


  const selectedBranch = selectedBranchId ? branches.find(b => b.id === selectedBranchId) : null

  // Build city groups + per-city stats. Defined here (before any early
  // return) to keep the hook order stable across detail/list renders.
  const cityGroups = useMemo(() => {
    const map = new Map()
    filteredBranches.forEach(b => {
      const key = b.city_id || '__none'
      const name = b.city_name || 'بدون مدينة'
      if (!map.has(key)) map.set(key, { id: key, name, items: [], active: 0 })
      const g = map.get(key)
      g.items.push(b)
      if (b.is_active === true) g.active += 1
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
      .brs-add-btn:hover{background:rgba(212,160,23,.10) !important;border-color:rgba(212,160,23,.7) !important}
    `}</style>
  )

  if (selectedBranch) {
    return (
      <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
        {sharedStyle}
        <BranchDetailPage
          sb={sb}
          branch={selectedBranch} dashboard={dashboards[selectedBranch.id]}
          users={users.filter(u =>
            u.branch_id === selectedBranch.id &&
            // Hide system-level General Manager — he controls the whole system, not assigned per branch
            u.role_name !== 'المدير العام'
          )}
          banks={banks.filter(a => a.branch_id === selectedBranch.id)}
          docs={docs.filter(d => d.entity_type === 'branch' && d.entity_id === selectedBranch.id)}
          roles={roles}
          onReload={load}
          onBack={() => setSelectedBranchId(null)}
          onEdit={canPerm(user, 'admin_offices.edit') ? (() => openEdit(selectedBranch)) : null}
          onDelete={canPerm(user, 'admin_offices.delete') ? (() => del(selectedBranch.id)) : null}
          user={user} lang={lang}
          toast={toast} />
        {pop && (
          <BranchFormModal
            open={pop} onClose={() => { setPop(false); setSuccess(false) }}
            form={form} setForm={setForm} saving={saving} success={success}
            onSave={saveBranch} updateCode={updateCode}
            regions={regions} cities={cities} districtsList={districtsList} branchManagers={branchManagers} />
        )}
        {delConfirmEl}
      </div>
    )
  }

  const initialLoading = loading && branches.length === 0
  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {sharedStyle}
      <style>{`
        .brs-row{transition:all .15s}
        .brs-row:hover{border-color:rgba(212,160,23,.35) !important}
        .brs-add-btn:hover{background:rgba(212,160,23,.10) !important;border-color:rgba(212,160,23,.7) !important}
        .brs-hero-grid{display:grid;grid-template-columns:2.2fr 1fr 1.5fr;gap:14px;margin-bottom:24px}
        @media (max-width: 1100px){.brs-hero-grid{grid-template-columns:1fr 1fr;}.brs-hero-grid > :nth-child(3){grid-column:1/-1}}
        @media (max-width: 720px){.brs-hero-grid{grid-template-columns:1fr}}
        .brs-row-grid{display:grid;grid-template-columns:auto 1px 1fr auto;gap:18px;align-items:center}
        @media (max-width: 720px){.brs-row-grid{grid-template-columns:1fr;gap:12px}.brs-row-vdiv{display:none}}
        .brs-row:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.34) !important;border-color:rgba(212,160,23,.22) !important}
        .brs-row-vdiv{width:1px;align-self:stretch;background:linear-gradient(180deg,transparent 0%,rgba(255,255,255,.08) 50%,transparent 100%);min-height:46px}
        .brs-staff-box{background:linear-gradient(160deg,rgba(52,131,180,.12) 0%,rgba(52,131,180,.04) 100%);border:1px solid rgba(52,131,180,.24);border-radius:12px;padding:8px 16px;display:flex;align-items:center;gap:10px;transition:.2s}
        .brs-row:hover .brs-staff-box{background:linear-gradient(160deg,rgba(52,131,180,.20) 0%,rgba(52,131,180,.08) 100%);border-color:rgba(52,131,180,.42)}
        .brs-code-block{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:80px}
        .brs-meta-row{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--tx3);font-weight:600}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>المكاتب</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>إدارة المكاتب والفروع ومتابعة مستخدميها وأرصدتها ونشاطها</div>
          </div>
          {canPerm(user, 'admin_offices.create') && (
          <button onClick={openAdd}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: GOLD, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease' }}>
            مكتب جديد <Plus size={16} strokeWidth={2.2} />
          </button>
          )}
        </div>
      </div>

      {initialLoading ? (<><SkeletonCards count={3} cols="2.2fr 1fr 1.5fr" minHeight={150} /><SkeletonList rows={6} /></>) : (<>

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
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6, minHeight: 40 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.ok, boxShadow: `0 0 10px ${C.ok}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>المكاتب</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.ok, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{topStats.active}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>
              {topStats.total === 0
                ? 'لا توجد مكاتب'
                : topStats.active === topStats.total
                  ? 'جميع المكاتب نشطة'
                  : `${topStats.total - topStats.active} معطّل`}
            </span>
          </div>
        </div>

        {/* Stacked secondary — staff + balance */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          {(() => {
            // Only genuinely deactivated staff count as «معطّل» — the General Manager is excluded
            // entirely (he isn't per-branch staff), not lumped in as if he were disabled.
            const inactive = users.filter(u => !u.is_active && u.role_name !== 'المدير العام').length
            const withStaff = branches.filter(b => Number(dashboards[b.id]?.staff_total || 0) > 0).length
            return (
              <>
                <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6, minHeight: 40 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}aa` }} />
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>المستخدمون</span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
                  <span style={{ fontSize: 42, fontWeight: 800, color: C.blue, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{nm(topStats.totalStaff)}</span>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>
                    {(topStats.totalStaff + inactive) === 0
                      ? 'لا يوجد موظفون'
                      : inactive > 0
                        ? `${nm(inactive)} معطّل`
                        : 'جميع الموظفين نشطين'}
                  </span>
                </div>
              </>
            )
          })()}
        </div>

        {/* Distribution by city — same shape as InvoicePage's services card */}
        {(() => {
          const allByCity = (() => {
            const map = new Map()
            branches.forEach(b => {
              const k = b.city_id || '__none'
              const name = b.city_name || 'بدون مدينة'
              if (!map.has(k)) map.set(k, { id: k, name, cnt: 0 })
              map.get(k).cnt += 1
            })
            return Array.from(map.values()).sort((a, b) => b.cnt - a.cnt)
          })()
          const topN = allByCity.slice(0, 6)
          const totalCnt = allByCity.reduce((s, r) => s + r.cnt, 0)
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
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>التوزّع حسب المدينة</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: GOLD, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(totalCnt)}</span> مكتب
                </span>
              </div>
              {totalCnt > 0 && (() => {
                const R = 32, CIRC = 2 * Math.PI * R
                let offset = 0
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                    <svg width="86" height="86" viewBox="-43 -43 86 86" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
                      <circle r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="11" />
                      {allByCity.map((r, i) => {
                        const c = regionPalette[i % regionPalette.length]
                        const dash = (r.cnt / totalCnt) * CIRC
                        const seg = (
                          <circle key={r.id} r={R} fill="none" stroke={c} strokeWidth="11"
                            strokeDasharray={`${dash} ${CIRC - dash}`}
                            strokeDashoffset={-offset}
                            style={{ transition: 'stroke-dasharray .3s' }}>
                            <title>{`${r.name}: ${r.cnt}`}</title>
                          </circle>
                        )
                        offset += dash
                        return seg
                      })}
                      <text x="0" y="0" textAnchor="middle" dominantBaseline="central"
                        transform="rotate(90)"
                        style={{ fill: '#fff', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {nm(totalCnt)}
                      </text>
                    </svg>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px 48px', minWidth: 0 }}>
                      {topN.map((r, i) => {
                        const c = regionPalette[i % regionPalette.length]
                        return (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, minWidth: 0 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                            <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                            <span style={{ color: c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', flexShrink: 0, fontWeight: 700 }}>{nm(r.cnt)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
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
        {(() => {
          const hasFilters = !!(filters.region_id || filters.city_id || filters.is_active !== '')
          const active = advOpen || hasFilters
          const clearAll = () => setFilters({ region_id: '', city_id: '', is_active: '' })
          return (
            <button onClick={() => setAdvOpen(o => !o)} style={{
              height: 44, padding: '0 16px', borderRadius: 12, flexShrink: 0,
              background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)',
              border: active ? '1px solid rgba(212,160,23,.4)' : '1px solid rgba(255,255,255,.05)',
              color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box', transition: '.2s',
            }}>
              تصفية
              {hasFilters ? (
                <span role="button" tabIndex={0} title="مسح الفلاتر"
                  onClick={e => { e.stopPropagation(); clearAll() }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
                  style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6" /><line x1="18" y1="6" x2="20" y2="6" /><circle cx="16" cy="6" r="2" /><line x1="4" y1="12" x2="8" y2="12" /><line x1="12" y1="12" x2="20" y2="12" /><circle cx="10" cy="12" r="2" /><line x1="4" y1="18" x2="16" y2="18" /><line x1="20" y1="18" x2="20" y2="18" /><circle cx="18" cy="18" r="2" /></svg>
              )}
            </button>
          )
        })()}
      </div>

      {/* Advanced filter card — InvoicePage style */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>المنطقة</div>
                <FKSelect searchable options={[{ id: '', name_ar: 'كل المناطق' }, ...regions]} getKey={o => o.id} getLabel={o => o.name_ar}
                  value={filters.region_id || null} onChange={v => setFilters(p => ({ ...p, region_id: v || '', city_id: '' }))} placeholder="كل المناطق" />
              </div>
              <div>
                <div style={fLbl}>المدينة</div>
                <FKSelect searchable disabled={!filters.region_id}
                  options={[{ id: '', name_ar: 'كل المدن' }, ...cities.filter(c => !filters.region_id || c.region_id === filters.region_id)]}
                  getKey={o => o.id} getLabel={o => o.name_ar}
                  value={filters.city_id || null} onChange={v => setFilters(p => ({ ...p, city_id: v || '' }))}
                  placeholder={filters.region_id ? 'كل المدن' : 'اختر المنطقة أولاً'} />
              </div>
              <div>
                <div style={fLbl}>الحالة</div>
                <FKSelect options={[{ v: '', l: 'الكل' }, { v: 'true', l: 'نشط' }, { v: 'false', l: 'معطّل' }]} getKey={o => o.v} getLabel={o => o.l}
                  value={filters.is_active || null} onChange={v => setFilters(p => ({ ...p, is_active: v || '' }))} placeholder="الكل" />
              </div>
            </div>
          </div>
        )
      })()}

      {/* List — region-grouped row cards (matches InvoicePage day-grouped pattern) */}
      {!loading && filteredBranches.length === 0 && (() => {
        const noneAtAll = branches.length === 0
        const storeIcon = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 017.83 2h8.34a2 2 0 011.42.59L22 7" /><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><path d="M15 22v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4" /><path d="M2 7h20" /></svg>
        const searchIcon = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        return (
          <EmptyState
            icon={noneAtAll ? storeIcon : searchIcon}
            title={noneAtAll ? 'لا توجد مكاتب بعد' : 'لا توجد نتائج مطابقة'}
            desc={noneAtAll ? 'ابدأ بإضافة أول مكتب لإدارته ومتابعة نشاطه' : 'جرّب تعديل التصفية أو كلمة البحث'} />
        )
      })()}
      {!loading && cityGroups.map((g, gi) => {
        const c = regionPalette[gi % regionPalette.length]
        return (
          <div key={g.id} style={{ marginBottom: 28 }}>
            {/* City header */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, transform: 'translateY(-2px)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx2)' }}>{g.name}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{g.items.length}/{g.active} نشط</span>
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

      </>)}

      {pop && (
        <BranchFormModal
          open={pop} onClose={() => { setPop(false); setSuccess(false) }}
          form={form} setForm={setForm} saving={saving} success={success}
          onSave={saveBranch} updateCode={updateCode}
          regions={regions} cities={cities} districtsList={districtsList} branchManagers={branchManagers} />
      )}
      {delConfirmEl}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Branch row card — InvoicePage spirit (3-col grid + progress strip)
   ═══════════════════════════════════════════════════════════════ */

function BranchCard({ branch, dashboard, onClick, onEdit }) {
  const isActive = branch.is_active === true
  const tone = isActive ? C.ok : '#777'
  const balance = Number(dashboard?.bank_total_balance || 0)
  const staff = Number(dashboard?.staff_total ?? branch.workers_count ?? 0)
  const lastActivity = formatRelative(dashboard?.last_activity_at)
  const alerts = Number(dashboard?.bank_low_alerts || 0)
  const activity30 = Number(dashboard?.activity_30d || 0)
  const accounts = Number(dashboard?.bank_accounts_active || 0)
  // Activity bar: scale to 30 (1 op/day) for full bar; clamp 0-100
  const pct = Math.min(100, Math.round((activity30 / 30) * 100))
  const code = branch.branch_code || '—'
  const locParts = [branch.region_name, branch.city_name, branch.district_name].filter(Boolean)
  const phoneStr = branch.phone ? String(branch.phone).replace(/^\+?966/, '0') : null

  const baseWrap = {
    position: 'relative', cursor: 'pointer', borderRadius: 14,
    background: `linear-gradient(135deg, ${tone}0e 0%, #232323 50%, #1f1f1f 100%)`,
    border: '1px solid rgba(255,255,255,.06)',
    boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03)',
    overflow: 'hidden', opacity: isActive ? 1 : .7,
  }

  const codeEl = (sz) => (
    <span style={{ fontSize: sz, fontWeight: 800, color: GOLD, fontFamily: "'JetBrains Mono','Cairo',sans-serif", letterSpacing: '-.5px', direction: 'ltr', lineHeight: 1 }}>{code}</span>
  )

  const StatusPill = ({ size = 10 }) => (
    <span style={{ fontSize: size, color: tone, fontWeight: 700, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone, boxShadow: `0 0 6px ${tone}` }} />
      {isActive ? 'نشط' : 'معطّل'}
    </span>
  )

  const Location = ({ big }) => locParts.length === 0 ? null : (
    <div className="brs-meta-row" style={{ flexWrap: 'wrap', fontSize: big ? 15 : 12 }}>
      <MapPin size={big ? 16 : 13} color={GOLD} strokeWidth={2.2} />
      <span style={{ color: 'rgba(255,255,255,.82)' }}>
        {locParts.map((p, i) => (
          <React.Fragment key={i}>
            {p}{i < locParts.length - 1 && <span style={{ color: 'rgba(255,255,255,.25)', margin: '0 6px' }}>·</span>}
          </React.Fragment>
        ))}
      </span>
    </div>
  )

  const MetaLine = ({ size = 11 }) => (
    <div className="brs-meta-row" style={{ fontSize: size, gap: 12, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <User size={12} color="var(--tx4)" />
        {branch.manager_user_name
          ? <span style={{ color: 'rgba(255,255,255,.74)' }}>{branch.manager_user_name}</span>
          : <span style={{ color: 'rgba(255,255,255,.32)' }}>لم يتم تحديد مدير بعد</span>}
      </span>
      {phoneStr && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.ok, direction: 'ltr', fontFamily: 'monospace' }}>
          <Phone size={11} />{phoneStr}
        </span>
      )}
      {lastActivity && (
        <span style={{ color: 'var(--tx4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Activity size={11} />{lastActivity}
        </span>
      )}
      {alerts > 0 && (
        <span title={`${alerts} تنبيه رصيد منخفض`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, background: 'rgba(232,114,101,.14)', border: '1px solid rgba(232,114,101,.4)', fontSize: 10, fontWeight: 700, color: C.red }}>
          <AlertCircle size={10} />{alerts} تنبيه
        </span>
      )}
    </div>
  )

  const StaffBox = ({ big, tile }) => (
    <div className="brs-staff-box" style={tile
      ? { flexDirection: 'column', gap: 5, padding: '12px 20px', minWidth: 80 }
      : (big ? { padding: '11px 20px' } : undefined)}>
      <Users size={tile || big ? 18 : 16} color={C.blue} strokeWidth={2.2} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: tile ? 'center' : 'flex-start', lineHeight: 1 }}>
        <span style={{ fontSize: tile || big ? 24 : 20, fontWeight: 800, color: C.blue, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px' }}>{nm(staff)}</span>
        <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.2px', marginTop: 2 }}>مستخدم</span>
      </div>
    </div>
  )

  // Status rail on the leading edge + framed code tile, taller & rebalanced row
  return (
    <div onClick={onClick} className="brs-row" style={baseWrap}>
      <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${tone} 0%, ${tone}55 100%)` }} />
      <div style={{ padding: '20px 30px 20px 26px' }}>
        <div className="brs-row-grid" style={{ gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '13px 18px', borderRadius: 12, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.18)', minWidth: 96 }}>
            {codeEl(25)}<StatusPill size={10.5} />
          </div>
          <div className="brs-row-vdiv" style={{ minHeight: 56 }} />
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Location big /><MetaLine size={11.5} />
          </div>
          <StaffBox big />
        </div>
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

/* ═══════════════════════════════════════════════════════════════
   Location card body — mini grid tiles (code + region/city/district)
   ═══════════════════════════════════════════════════════════════ */
function LocationBody({ branch }) {
  const tiles = [
    { l: 'المنطقة', v: branch.region_name },
    { l: 'المدينة', v: branch.city_name },
    { l: 'الحي', v: branch.district_name },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '4px 0' }}>
      {tiles.map((t, i) => (
        <div key={i} style={{ padding: '12px 14px', borderRadius: 11, background: t.gold ? 'rgba(212,160,23,.07)' : 'rgba(255,255,255,.03)', border: `1px solid ${t.gold ? 'rgba(212,160,23,.2)' : 'rgba(255,255,255,.07)'}` }}>
          <div style={{ fontSize: 12, color: t.gold ? 'rgba(212,160,23,.8)' : 'var(--tx4)', fontWeight: 600, letterSpacing: '.2px', marginBottom: 5 }}>{t.l}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: t.gold ? GOLD : (t.v ? 'rgba(255,255,255,.88)' : 'var(--tx5)'), direction: t.ltr ? 'ltr' : 'rtl', textAlign: 'right', fontFamily: t.ltr ? "'JetBrains Mono','Cairo',sans-serif" : F }}>{t.v || '—'}</div>
        </div>
      ))}
    </div>
  )
}

function BranchDetailPage({ sb, branch, dashboard, users, banks: propsBanks, docs, roles, onReload, onBack, onEdit, onDelete, toast, user, lang }) {
  const isActive = branch.is_active === true
  const activeStaff = users.filter(u => u.is_active).length
  const activity30 = Number(dashboard?.activity_30d || 0)
  const lastActivity = formatRelative(dashboard?.last_activity_at)
  const alerts = Number(dashboard?.bank_low_alerts || 0)

  // Local banks state — initialized from parent, refreshable after adding a new account
  const [banks, setBanks] = useState(propsBanks || [])
  useEffect(() => { setBanks(propsBanks || []) }, [propsBanks])
  const reloadBanks = useCallback(async () => {
    if (!sb || !branch?.id) return
    const { data } = await sb.from('bank_account_branches')
      .select('id, branch_id, account_purpose, bank_accounts!inner(*)')
      .eq('branch_id', branch.id)
      .eq('is_active', true)
      .is('deleted_at', null)
      .is('bank_accounts.deleted_at', null)
    setBanks((data || []).map(j => ({
      ...(j.bank_accounts || {}),
      _junction_id: j.id,
      branch_id: j.branch_id,
      account_purpose: j.account_purpose,
    })))
  }, [sb, branch?.id])
  // Live balances computed server-side from real money movements
  // (payments in + cash deposits in − fees paid out). See v_bank_account_balances.
  const bankIds = useMemo(() => banks.map(b => b.id).filter(Boolean).sort().join(','), [banks])
  useEffect(() => {
    const ids = bankIds ? bankIds.split(',') : []
    if (!sb || ids.length === 0) return
    let alive = true
    ;(async () => {
      const { data } = await sb.from('v_bank_account_balances').select('*').in('bank_account_id', ids)
      if (!alive || !data) return
      const map = Object.fromEntries(data.map(r => [r.bank_account_id, r]))
      setBanks(prev => {
        let changed = false
        const next = prev.map(b => {
          const r = map[b.id]
          if (!r) return b
          if (b._bal && Number(b.current_balance) === Number(r.balance)) return b
          changed = true
          return { ...b, current_balance: r.balance, _bal: r }
        })
        return changed ? next : prev
      })
    })()
    return () => { alive = false }
  }, [sb, bankIds])
  const totalBalance = banks.reduce((s, a) => s + Number(a.current_balance || 0), 0)

  // Bank-account add modal
  const [bankPop, setBankPop] = useState(false)
  const [bankForm, setBankForm] = useState({})
  const [bankSaving, setBankSaving] = useState(false)
  const [bankSuccess, setBankSuccess] = useState(false)
  const openAddBank = () => { setBankForm({ mode: 'new', is_primary: false, current_balance: 0 }); setBankPop(true) }
  const openEditBank = (account) => {
    setBankForm({
      mode: 'edit', _edit_account_id: account.id, _junction_id: account._junction_id,
      bank_name: account.bank_name, bank_name_en: account.bank_name_en || '', account_name: account.account_name, account_name_en: account.account_name_en || '',
      account_number: account.account_number, iban: account.iban, swift_code: account.swift_code,
      account_purpose: account.account_purpose, is_primary: !!account.is_primary,
    })
    setBankPop(true)
  }
  const saveBankAccount = async () => {
    setBankSaving(true)
    // Upload the optional IBAN document to the shared `attachments` bucket + table.
    const uploadIban = async (accountId) => {
      const file = bankForm._ibanFile
      if (!file || !accountId) return
      const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `bank_accounts/${accountId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}`
      const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const { error: insErr } = await sb.from('attachments').insert({
        entity_type: 'bank_account', entity_id: accountId,
        file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
        mime_type: file.type || null, size_bytes: file.size || null, notes: 'ملف الآيبان',
      })
      if (insErr) throw insErr
    }
    try {
      // Edit mode: update the existing account + its branch-junction purpose.
      if (bankForm.mode === 'edit') {
        const upd = {
          bank_name: bankForm.bank_name || null, bank_name_en: bankForm.bank_name_en || null, account_name: bankForm.account_name || null, account_name_en: bankForm.account_name_en || null,
          account_number: bankForm.account_number || null, iban: bankForm.iban || null,
          swift_code: bankForm.swift_code || null, is_primary: !!bankForm.is_primary,
          sbc_facility_id: bankForm.sbc_facility_id || null,
        }
        const { error } = await sb.from('bank_accounts').update(upd).eq('id', bankForm._edit_account_id)
        if (error) throw error
        if (bankForm._junction_id) {
          await sb.from('bank_account_branches').update({ account_purpose: bankForm.account_purpose || null }).eq('id', bankForm._junction_id)
        }
        await uploadIban(bankForm._edit_account_id)
        setBankSuccess(true)
        setTimeout(() => { setBankSuccess(false); setBankPop(false); reloadBanks() }, 1400)
        return null
      }
      let bankAccountId = bankForm._link_account_id
      // Mode "new" creates the bank account first; "link" reuses an existing one.
      if (!bankAccountId) {
        const d = { ...bankForm, branch_id: branch.id }
        delete d.mode; delete d._link_account_id; delete d._link_account; delete d.account_purpose; delete d._ibanFile; delete d._branch_ids; delete d._sbc_facility; delete d._orig
        Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null })
        const { data, error } = await sb.from('bank_accounts').insert(d).select('id').single()
        if (error) throw error
        bankAccountId = data.id
      }
      // Insert junction row linking this branch with its specific purpose.
      const { error: jErr } = await sb.from('bank_account_branches').insert({
        bank_account_id: bankAccountId,
        branch_id: branch.id,
        account_purpose: bankForm.account_purpose || null,
      })
      if (jErr) throw jErr
      await uploadIban(bankAccountId)
      setBankSuccess(true)
      setTimeout(() => { setBankSuccess(false); setBankPop(false); reloadBanks() }, 1400)
      return null
    } catch (e) {
      const msg = (e.message || '').toLowerCase()
      // Return the error string so the modal shows it inline in its footer (no toast).
      if (e.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
        return 'هذا الحساب مربوط بالفعل بهذا المكتب'
      } else if (e.code === '42501' || msg.includes('row-level security')) {
        return 'لا تملك صلاحية إضافة حساب بنكي'
      } else if (e.code === '23502' || msg.includes('null value')) {
        return 'تنقص بيانات مطلوبة — تأكد من تعبئة كل الحقول الأساسية'
      }
      return 'تعذّر حفظ الحساب: ' + (e.message || '').slice(0, 80)
    } finally { setBankSaving(false) }
  }

  // 14-day invoice activity for this branch
  const [invoices14, setInvoices14] = useState([])
  useEffect(() => {
    if (!sb || !branch?.id) return
    const since = new Date(); since.setDate(since.getDate() - 13); since.setHours(0, 0, 0, 0)
    sb.from('invoices')
      .select('created_at')
      .eq('branch_id', branch.id)
      .is('deleted_at', null)
      .gte('created_at', since.toISOString())
      .then(({ data }) => setInvoices14(data || []))
  }, [sb, branch?.id])

  // Activate / deactivate the office from the overview card header.
  const [activeBusy, setActiveBusy] = useState(false)
  const toggleBranchActive = async () => {
    const next = !isActive
    setActiveBusy(true)
    const { error } = await sb.from('branches').update({ is_active: next }).eq('id', branch.id)
    setActiveBusy(false)
    if (error) { toast?.('تعذّر تحديث الحالة: ' + (error.message || '').slice(0, 60), 'error'); return }
    toast?.(next ? 'تم تفعيل المكتب' : 'تم تعطيل المكتب')
    onReload?.()
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .brd-hero{display:grid;grid-template-columns:2.2fr 1fr 1.5fr;gap:14px;margin-bottom:24px}
        @media (max-width: 1100px){.brd-hero{grid-template-columns:1fr 1fr}.brd-hero > :nth-child(3){grid-column:1/-1}}
        @media (max-width: 720px){.brd-hero{grid-template-columns:1fr}}
        /* Card chrome — unified with UserDetailPage cardChrome/cardHeader/cardTitle */
        .brd-section{background:linear-gradient(180deg,#2A2A2A 0%,#222 100%);border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden}
        .brd-section-head{padding:14px 22px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;gap:10px}
        .brd-section-head-l{display:inline-flex;align-items:center;gap:10px;font-size:16px;font-weight:600;color:#fff;letter-spacing:.2px}
        .brd-section-body{padding:14px 22px}
        .brd-section-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
        .brd-section-count{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.06);font-size:10px;font-weight:700;color:var(--tx3)}
        /* Two-column detail layout — matches UserDetailPage .usrd-grid */
        .brd-grid{display:grid;grid-template-columns:1fr 340px;gap:14px;align-items:flex-start}
        @media (max-width:900px){.brd-grid{grid-template-columns:1fr}.brd-side,.brd-main{grid-column:auto !important;position:static !important}.brd-side{order:1 !important}.brd-main{order:2 !important}}
        .brd-irow{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px dashed rgba(255,255,255,.07)}
        .brd-irow:last-child{border-bottom:none}
        .brd-irow-l{font-size:12px;color:var(--tx4);font-weight:600;flex-shrink:0}
        .brd-irow-v{font-size:13px;font-weight:600;text-align:end;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
      `}</style>

      {/* Back (matches UserDetailPage) */}
      <div style={{ marginBottom: 16 }}>
        <BackButton onBack={onBack} />
      </div>

      {/* Header — icon + code title + status + subtitle (matches UserDetailPage) */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Building2 size={26} color={GOLD} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 22, fontWeight: 600, color: GOLD, fontFamily: "'JetBrains Mono','Cairo',sans-serif", letterSpacing: '-.2px', direction: 'ltr', unicodeBidi: 'isolate', lineHeight: 1 }}>{branch.branch_code || '—'}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>العنوان والموقع، عقد الإيجار، الفواتير (كهرباء/ماء/إنترنت)، أرقام الجوالات، والمستخدمون.</div>
        {(branch.phone || lastActivity || alerts > 0) && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)' }}>
            {branch.phone && (
              <a href={`tel:${branch.phone}`} style={{ color: C.ok, fontWeight: 700, direction: 'ltr', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={11} /> {String(branch.phone).replace(/^\+?966/, '0')}
              </a>
            )}
            {lastActivity && (
              <>
                {branch.phone && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />}
                <span style={{ color: 'var(--tx4)' }}>آخر نشاط: {lastActivity}</span>
              </>
            )}
            {alerts > 0 && (
              <>
                {(branch.phone || lastActivity) && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />}
                <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(229,134,122,.10)', border: `1px solid ${C.red}`, color: C.red, fontSize: 10.5, fontWeight: 800, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={11} /> {alerts} تنبيه رصيد
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ═══ Two-column layout — main (operations) + sticky side (location) ═══ */}
      <div className="brd-grid">
        <div className="brd-main" style={{ order: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Location card — right column, above the operations */}
          {cardVisible(user, 'admin_offices', 'location_and_address') && (
          <div className="brd-section">
            <div className="brd-section-head">
              <span className="brd-section-head-l">
                <span className="brd-section-dot" style={{ background: GOLD }} />
                العنوان والموقع
              </span>
              {onEdit && canCardBtn(user, 'admin_offices', 'location_and_address', 'edit') && (
              <button onClick={onEdit}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s ease, border-color .15s ease' }}>
                تعديل
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              </button>
              )}
            </div>
            <div className="brd-section-body" style={{ paddingTop: 6, paddingBottom: 12 }}>
              <LocationBody branch={branch} />
            </div>
          </div>
          )}

          {/* Rent contract + payment schedule */}
          {cardVisible(user, 'admin_offices', 'rent_contract') && (
          <BranchRentCard sb={sb} branch={branch} user={user} cardKey="rent_contract" lang={lang} toast={toast} />
          )}

          {/* Licenses */}
          {cardVisible(user, 'admin_offices', 'municipal_license') && (
          <BranchLicenseCard sb={sb} branch={branch} user={user} cardKey="municipal_license" toast={toast} title="رخصة بلدي" licenseType="balady" accent="#5dade2" addLabel="إضافة رخصة بلدي جديدة" />
          )}
          {cardVisible(user, 'admin_offices', 'safety_certificate') && (
          <BranchLicenseCard sb={sb} branch={branch} user={user} cardKey="safety_certificate" toast={toast} title="شهادة السلامة" licenseType="safety" accent="#e67e22" addLabel="إضافة شهادة سلامة جديدة" />
          )}

          {/* Utility bills — a separate card + popup per service */}
          {cardVisible(user, 'admin_offices', 'electricity_bills') && (
          <BranchObligationsCard sb={sb} branch={branch} user={user} cardKey="electricity_bills" toast={toast}
            title="الكهرباء" accent="#eab308" addLabel="فاتورة كهرباء جديدة" editLabel="تعديل فاتورة الكهرباء"
            vendorLabel="مزود الخدمة" accountLabel="رقم الحساب/العداد"
            fixedMonthly
            typeOptions={[{ k: 'utility_electricity', l: 'كهرباء' }]} />
          )}

          {cardVisible(user, 'admin_offices', 'internet_bills') && (
          <BranchObligationsCard sb={sb} branch={branch} user={user} cardKey="internet_bills" toast={toast}
            title="الإنترنت" accent="#5dade2" addLabel="فاتورة إنترنت جديدة" editLabel="تعديل فاتورة الإنترنت"
            vendorLabel="مزود الخدمة" accountLabel="رقم الحساب/العداد"
            fixedMonthly withAmount
            typeOptions={[{ k: 'utility_internet', l: 'إنترنت' }]} />
          )}

          {cardVisible(user, 'admin_offices', 'water_bills') && (
          <BranchObligationsCard sb={sb} branch={branch} user={user} cardKey="water_bills" toast={toast}
            title="الماء" accent="#27ae60" addLabel="فاتورة ماء جديدة" editLabel="تعديل فاتورة الماء"
            vendorLabel="مزود الخدمة" accountLabel="رقم الحساب/العداد"
            fixedMonthly
            typeOptions={[{ k: 'utility_water', l: 'ماء' }]} />
          )}

      {/* Staff section — full management: activate + role + permissions */}
      {cardVisible(user, 'admin_offices', 'users_and_staff') && (
      <div className="brd-section">
        <div className="brd-section-head">
          <span className="brd-section-head-l">
            <span className="brd-section-dot" style={{ background: C.blue }} />
            المستخدمون
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
            <UsersSpotlight users={users} branch={branch} sb={sb} toast={toast} onReload={onReload} />
          )}
        </div>
      </div>
      )}

      {/* Documents section (only if any) */}
      {cardVisible(user, 'admin_offices', 'documents') && docs.length > 0 && (
        <div className="brd-section">
          <div className="brd-section-head">
            <span className="brd-section-head-l">
              <span className="brd-section-dot" style={{ background: GOLD }} />
              المستندات
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
        </div>{/* /brd-main */}

        {/* Left column — overview stats, sticky and alone */}
        <div className="brd-side" style={{ order: 2, position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Overview stats — relocated from the KPI hero cards */}
          {cardVisible(user, 'admin_offices', 'overview_stats') && (
          <div className="brd-section">
            <div className="brd-section-head">
              <span className="brd-section-head-l">
                <span className="brd-section-dot" style={{ background: C.blue }} />
                نظرة عامة
              </span>
              {canCardBtn(user, 'admin_offices', 'overview_stats', 'toggle') && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? C.ok : 'var(--tx5)' }}>{isActive ? 'نشط' : 'معطّل'}</span>
                <button type="button" disabled={activeBusy} onClick={toggleBranchActive} title={isActive ? 'تعطيل المكتب' : 'تفعيل المكتب'}
                  style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: isActive ? `linear-gradient(180deg, ${C.ok} 0%, #1f8a3a 100%)` : 'linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.10) 100%)', cursor: activeBusy ? 'not-allowed' : 'pointer', opacity: activeBusy ? .55 : 1, position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, boxShadow: isActive ? `0 2px 8px ${C.ok}44, inset 0 1px 0 rgba(255,255,255,.15)` : 'inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.18)' }}>
                  <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, right: isActive ? 3 : 23, transition: '.2s', boxShadow: '0 2px 4px rgba(0,0,0,.3)' }} />
                </button>
              </div>
              )}
            </div>
            <div className="brd-section-body" style={{ paddingTop: 6, paddingBottom: 12 }}>
              <div className="brd-irow">
                <span className="brd-irow-l" style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>كود المكتب</span>
                <span className="brd-irow-v" style={{ direction: 'ltr', color: 'var(--tx)', fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 14, letterSpacing: '.5px' }}>{branch.branch_code || '—'}</span>
              </div>
              {[
                { l: 'المستخدمون', v: users.length > activeStaff ? `${nm(users.length)} / ${nm(activeStaff)}` : nm(activeStaff), c: C.blue },
              ].map(({ l, v, c }) => (
                <div key={l} className="brd-irow">
                  <span className="brd-irow-l" style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{l}</span>
                  <span className="brd-irow-v" style={{ direction: 'ltr', color: c, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>{v}</span>
                </div>
              ))}
              {/* Last-updated timestamp — auto-maintained by the trg_branches_updated_at trigger.
                  Western digits, dash-separated date, date on the left / time on the right. */}
              {branch.updated_at && (() => {
                const d = new Date(branch.updated_at)
                const p2 = n => String(n).padStart(2, '0')
                const date = `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}`
                const time = `${p2(d.getHours())}:${p2(d.getMinutes())}`
                return (
                  <div className="brd-irow">
                    <span className="brd-irow-l" style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>آخر تحديث</span>
                    <span className="brd-irow-v" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, direction: 'ltr', color: 'var(--tx3)', fontWeight: 600, fontSize: 12.5 }}>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{date}</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{time}</span>
                    </span>
                  </div>
                )
              })()}
              {/* Invoice activity — 14-day sparkline, at the bottom of the overview card */}
              {(() => {
                const map = new Map()
                invoices14.forEach(inv => { const k = String(inv.created_at).slice(0, 10); map.set(k, (map.get(k) || 0) + 1) })
                const today = new Date()
                const days14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - (13 - i)); const key = d.toISOString().slice(0, 10); return { date: d, count: map.get(key) || 0 } })
                const total = days14.reduce((s, d) => s + d.count, 0)
                const max = Math.max(1, ...days14.map(d => d.count))
                return (
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>نشاط الفواتير — آخر 14 يوم</span>
                      <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                        <span style={{ color: GOLD, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(total)}</span> فاتورة
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: 3, alignItems: 'end', height: 70, direction: 'rtl' }}>
                      {days14.map((d, i) => {
                        const h = (d.count / max) * 100
                        return (
                          <div key={i} title={`${d.date.toLocaleDateString('ar-SA')} — ${d.count} فاتورة`}
                            style={{ height: `${h}%`, minHeight: d.count > 0 ? 3 : 0, background: d.count > 0 ? `linear-gradient(180deg, ${GOLD} 0%, ${GOLD}88 100%)` : 'rgba(255,255,255,.05)', borderRadius: '3px 3px 1px 1px', border: d.count > 0 ? `1px solid ${GOLD}55` : '1px solid rgba(255,255,255,.04)', boxShadow: d.count > 0 ? `0 0 6px ${GOLD}33` : 'none' }} />
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
          )}
        </div>{/* /brd-side */}
      </div>{/* /brd-grid */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Bank account modal — simpler version of BranchFormModal.
   ═══════════════════════════════════════════════════════════════ */

export function BankAccountFormModal({ sb, open, onClose, form, setForm, saving, success, onSave, branches }) {
  // Global mode (admin bank-accounts tab): an office must be chosen to link the account to.
  const globalMode = Array.isArray(branches)
  // Load Saudi banks from lookup_items for the dropdown
  const [saudiBanks, setSaudiBanks] = useState([])
  useEffect(() => {
    if (!sb || !open) return
    sb.from('lookup_items')
      .select('value_ar, value_en, sort_order, lookup_categories!inner(category_key)')
      .eq('lookup_categories.category_key', 'saudi_banks')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setSaudiBanks(data || []))
  }, [sb, open])

  // Search-existing mode: live query bank_accounts by account_number / iban
  const mode = form.mode || 'new'
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    if (mode !== 'link' || !sb) return
    const q = searchQ.trim()
    if (q.length < 1) { setSearchResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const { data } = await sb.from('bank_accounts')
        .select('id, bank_name, account_name, account_number, iban, current_balance, bank_account_branches(branch_id, account_purpose, branches(branch_code))')
        .or(`account_number.ilike.%${q}%,iban.ilike.%${q}%`)
        .is('deleted_at', null)
        .limit(8)
      setSearchResults(data || [])
      setSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [sb, mode, searchQ])
  useEffect(() => { if (!open) { setSearchQ(''); setSearchResults([]) } }, [open])

  // Step 2 — link an establishment (sbc_facilities) by any CR / unified / GOSI number.
  const [facQ, setFacQ] = useState('')
  const [facResults, setFacResults] = useState([])
  const [facSearching, setFacSearching] = useState(false)
  const FAC_SEL = 'id, entity_full_name_ar, entity_full_name_en, cr_number, cr_national_number, gosi_unified_national_number, cr_confirm_date_gregorian, cr_status_ar'
  useEffect(() => {
    if (!sb) return
    const q = facQ.trim()
    if (q.length < 2) { setFacResults([]); return }
    setFacSearching(true)
    const t = setTimeout(async () => {
      const { data } = await sb.from('sbc_facilities').select(FAC_SEL)
        .or(`cr_number.ilike.%${q}%,cr_national_number.ilike.%${q}%,gosi_unified_national_number.ilike.%${q}%,main_cr_number.ilike.%${q}%`)
        .limit(8)
      setFacResults(data || []); setFacSearching(false)
    }, 250)
    return () => clearTimeout(t)
  }, [sb, facQ])
  useEffect(() => { if (!open) { setFacQ(''); setFacResults([]) } }, [open])
  // Edit: preload the already-linked facility so its dates render without a re-search.
  useEffect(() => {
    if (!open || !sb || !form.sbc_facility_id || form._sbc_facility) return
    sb.from('sbc_facilities').select(FAC_SEL).eq('id', form.sbc_facility_id).maybeSingle()
      .then(({ data }) => { if (data) setForm(p => ({ ...p, _sbc_facility: data })) })
  }, [open, sb, form.sbc_facility_id]) // eslint-disable-line

  // Inline footer error (no toast) + mandatory-field gating — mirrors BranchFormModal.
  const [errMsg, setErrMsg] = useState('')
  useEffect(() => { if (!open) setErrMsg('') }, [open])
  const hasPurpose = !!(form.account_purpose || '').trim()
  // In global mode a new/linked account must be tied to an office; purpose is per-office
  // so it's not required when editing account-level fields globally.
  const needBranch = globalMode && mode !== 'edit'
  const purposeRequired = !(globalMode && mode === 'edit')
  const branchOk = needBranch ? (Array.isArray(form._branch_ids) && form._branch_ids.length > 0) : true
  // On edit, block saving until at least one field actually changed (vs the openEdit snapshot).
  const editOrig = form._orig
  const idsEqual = (a, b) => { const A = [...(a || [])].sort(); const B = [...(b || [])].sort(); return A.length === B.length && A.every((x, i) => x === B[i]) }
  const editChanged = !(mode === 'edit' && editOrig) || (
    String(form.bank_name || '') !== String(editOrig.bank_name || '') ||
    String(form.bank_name_en || '') !== String(editOrig.bank_name_en || '') ||
    String(form.account_name || '') !== String(editOrig.account_name || '') ||
    String(form.account_name_en || '') !== String(editOrig.account_name_en || '') ||
    String(form.account_number || '') !== String(editOrig.account_number || '') ||
    String(form.iban || '') !== String(editOrig.iban || '') ||
    String(form.expiry_date || '') !== String(editOrig.expiry_date || '') ||
    String(form.account_purpose || '') !== String(editOrig.account_purpose || '') ||
    !idsEqual(form._branch_ids, editOrig.branch_ids) ||
    String(form.sbc_facility_id || '') !== String(editOrig.sbc_facility_id || '') ||
    !!form._ibanFile
  )
  // Account-fields completeness (step 1) — gates the «التالي» button.
  const acctComplete = mode === 'link' ? true : (!!form.bank_name && !!(form.account_name || '').trim() && !!(form.account_number || '').trim() && !!(form.iban || '').trim() && (purposeRequired ? hasPurpose : true) && branchOk)
  const canSave = branchOk && editChanged && (mode === 'link'
    ? (!!form._link_account_id && hasPurpose)
    : (!!form.bank_name && !!(form.account_name || '').trim() && !!(form.account_number || '').trim() && !!(form.iban || '').trim() && (purposeRequired ? hasPurpose : true) && (mode === 'edit' || !!form._ibanFile)))
  const handleSave = async () => { setErrMsg(''); const err = await onSave(); if (err) setErrMsg(err) }

  // Unified success view — shown inside the SAME Modal via the success prop (no jump).
  const successNode = success
    ? <SuccessView title={mode === 'edit' ? 'تم تعديل الحساب البنكي' : mode === 'link' ? 'تم ربط الحساب البنكي' : 'تمت إضافة الحساب البنكي'} />
    : null

  if (!open) return null
  const purposeArr = (form.account_purpose || '').split('·').map(s => s.trim()).filter(Boolean)
  const fmtCrDate = (s, addDays = 0) => { if (!s) return '—'; const d = new Date(s); if (isNaN(d)) return s; if (addDays) d.setDate(d.getDate() + addDays); const p2 = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` }
  const MONO = "'JetBrains Mono','Cairo',sans-serif"

  // Step 1 — account data.
  const accountSection = (
    <FKSection Icon={Landmark} label="بيانات الحساب">
      <div style={GRID}>
        {globalMode && (
          <FKMulti full label="المكتب المرتبط" req searchable value={form._branch_ids || []}
            onChange={arr => setForm(p => ({ ...p, _branch_ids: arr }))}
            options={(branches || []).map(b => ({ k: b.id, l: [b.branch_code, b.name_ar].filter(Boolean).join(' — ') || b.id }))}
            getKey={o => o.k} getLabel={o => o.l} placeholder="اختر المكتب..." />
        )}
        <FKSelect label="البنك" req value={form.bank_name || ''}
          onChange={v => { const b = saudiBanks.find(x => x.value_ar === v); setForm(p => ({ ...p, bank_name: v, bank_name_en: b?.value_en || p.bank_name_en || '' })) }}
          options={saudiBanks.map(b => ({ k: b.value_ar, l: b.value_ar }))}
          getKey={o => o.k} getLabel={o => o.l} placeholder="اختر البنك..." />
        <FKText label="اسم البنك (إنجليزي)" dir="ltr" value={form.bank_name_en || ''} onChange={v => setForm(p => ({ ...p, bank_name_en: v }))} placeholder="Saudi National Bank" />
        <FKText label="اسم الحساب" req value={form.account_name || ''} onChange={v => setForm(p => ({ ...p, account_name: v }))} placeholder="اسم صاحب الحساب" />
        <FKText label="اسم الحساب (إنجليزي)" dir="ltr" value={form.account_name_en || ''} onChange={v => setForm(p => ({ ...p, account_name_en: v }))} placeholder="Account holder name" />
        <FKText label="رقم الحساب" req dir="ltr" value={form.account_number || ''} onChange={v => setForm(p => ({ ...p, account_number: v }))} placeholder="000000000000" />
        <FKText label="الآيبان (IBAN)" req dir="ltr" upper value={form.iban || ''} onChange={v => setForm(p => ({ ...p, iban: v }))} placeholder="SA00 0000 0000 0000 0000 0000" />
        <FKDateField label="تاريخ الانتهاء" value={form.expiry_date || ''} onChange={v => setForm(p => ({ ...p, expiry_date: v }))} />
        <FKMulti label="الغرض" req={purposeRequired} searchable={false} value={purposeArr}
          onChange={arr => setForm(p => ({ ...p, account_purpose: arr.join(' · ') }))}
          options={PURPOSE_OPTS.map(o => ({ k: o.v, l: o.v }))} getKey={o => o.k} getLabel={o => o.l} placeholder="اختر الغرض..." />
      </div>
    </FKSection>
  )

  // IBAN document — moved to step 2 (keeps step 1 compact). Required for new accounts.
  const ibanFileBlock = (
    <FKSection Icon={FileText} label="ملف الآيبان">
      <FKFile label={mode === 'edit' ? 'استبدال ملف الآيبان' : 'ملف الآيبان'} req={mode !== 'edit'}
        hint={mode === 'edit' ? 'اختياري' : 'صورة أو PDF'}
        value={form._ibanFile || null} onChange={fl => setForm(p => ({ ...p, _ibanFile: fl }))} />
    </FKSection>
  )

  // Step 2 — optional establishment link (search by CR / unified / GOSI number).
  const fac = form._sbc_facility
  const facilitySection = (
    <FKSection Icon={Landmark} label="ربط بمنشأة (اختياري)" hint="بحث برقم السجل / الموحّد / التأمينات">
      {!fac ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FKText full dir="ltr" value={facQ} onChange={setFacQ} placeholder="ابحث برقم السجل / الموحّد / التأمينات…" />
          {facSearching && <div style={{ padding: 12, textAlign: 'center', color: C.tx4, fontSize: 12 }}>جاري البحث…</div>}
          {!facSearching && facQ.trim().length >= 2 && facResults.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: C.tx4, fontSize: 12, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>لا توجد منشآت مطابقة</div>
          )}
          {facResults.length > 0 && (
            <ScrollBox maxHeight={190}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {facResults.map(r => (
                  <button key={r.id} type="button" onClick={() => setForm(p => ({ ...p, sbc_facility_id: r.id, _sbc_facility: r }))}
                    style={{ width: '100%', textAlign: 'start', cursor: 'pointer', fontFamily: F, padding: '12px 14px', borderRadius: 11, background: `linear-gradient(135deg, ${GOLD}14, rgba(255,255,255,.02))`, border: `1px solid ${GOLD}33`, color: C.tx }}>
                    <div style={{ fontWeight: 600, color: C.tx, fontSize: 13.5 }}>{r.entity_full_name_ar || r.entity_full_name_en || '—'}</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: C.tx4, direction: 'ltr', textAlign: 'right', fontFamily: MONO }}>{[r.cr_number, r.cr_national_number].filter(Boolean).join(' · ') || '—'}</div>
                  </button>
                ))}
              </div>
            </ScrollBox>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontWeight: 600, color: C.tx, fontSize: 14 }}>{fac.entity_full_name_ar || fac.entity_full_name_en || '—'}</span>
            <button type="button" onClick={() => setForm(p => ({ ...p, sbc_facility_id: null, _sbc_facility: null }))}
              style={{ background: 'transparent', border: 'none', color: GOLD, fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>تغيير</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { l: 'رقم السجل', v: fac.cr_number, mono: true },
              { l: 'حالة السجل', v: fac.cr_status_ar },
              { l: 'التأكيد السنوي', v: fmtCrDate(fac.cr_confirm_date_gregorian), mono: true, c: GOLD },
              { l: 'التعليق المتوقّع', v: fmtCrDate(fac.cr_confirm_date_gregorian, 90), mono: true, c: C.red },
            ].map((x, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                <div style={{ fontSize: 11, color: C.tx4, fontWeight: 600, marginBottom: 4 }}>{x.l}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: x.c || C.tx, direction: x.mono ? 'ltr' : 'rtl', textAlign: x.mono ? 'left' : 'right', fontFamily: x.mono ? MONO : F }}>{x.v || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </FKSection>
  )

  // Link mode — single FormKit page: search an existing account, then pick its purpose.
  if (mode === 'link') {
    const acc = form._link_account
    const linkContent = (
      <FKSection Icon={Search} label="ربط حساب بنكي قائم" hint="بحث برقم الحساب أو الآيبان">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {globalMode && (
            <FKMulti full label="المكتب المرتبط" req searchable value={form._branch_ids || []}
              onChange={arr => setForm(p => ({ ...p, _branch_ids: arr }))}
              options={(branches || []).map(b => ({ k: b.id, l: [b.branch_code, b.name_ar].filter(Boolean).join(' — ') || b.id }))}
              getKey={o => o.k} getLabel={o => o.l} placeholder="اختر المكتب..." />
          )}
          {!acc ? (
            <>
              <FKText full label="رقم الحساب أو الآيبان" dir="ltr" value={searchQ} onChange={setSearchQ}
                placeholder="رقم الحساب أو الآيبان (حرف أو أكثر)…" />
              {searching && <div style={{ padding: 14, textAlign: 'center', color: C.tx4, fontSize: 12 }}>جاري البحث…</div>}
              {!searching && searchQ.trim().length >= 1 && searchResults.length === 0 && (
                <div style={{ padding: 18, textAlign: 'center', color: C.tx4, fontSize: 12, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>لا توجد نتائج</div>
              )}
              {searchResults.length > 0 && (
                <ScrollBox maxHeight={190}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {searchResults.map(r => (
                      <button key={r.id} type="button"
                        onClick={() => setForm(p => ({ ...p, _link_account_id: r.id, _link_account: r, account_purpose: '' }))}
                        style={{ width: '100%', textAlign: 'start', cursor: 'pointer', fontFamily: F, padding: '14px 16px', borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}14 0%, rgba(255,255,255,.02) 60%)`, color: C.tx, border: `1px solid ${GOLD}33`, transition: '.18s' }}>
                        <span style={{ fontWeight: 600, color: C.tx, fontSize: 14 }}>{r.bank_name}</span>
                        {r.account_name && <div style={{ fontSize: 11, color: C.tx3, marginTop: 3 }}>{r.account_name}</div>}
                        {(r.account_number || r.iban) && (
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: C.tx4 }}>
                            {r.account_number && <div>رقم الحساب: <span style={{ direction: 'ltr', unicodeBidi: 'isolate', fontFamily: MONO, color: C.tx3 }}>{r.account_number}</span></div>}
                            {r.iban && <div>الآيبان: <span style={{ direction: 'ltr', unicodeBidi: 'isolate', fontFamily: MONO, color: C.tx3 }}>{r.iban}</span></div>}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollBox>
              )}
            </>
          ) : (
            <>
              <div style={{ padding: '14px 16px', borderRadius: 12, background: `linear-gradient(135deg, ${GOLD}14 0%, rgba(255,255,255,.02) 60%)`, border: `1px solid ${GOLD}33`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontWeight: 600, color: C.tx, fontSize: 14 }}>{acc.bank_name}</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, _link_account_id: undefined, _link_account: undefined }))}
                    style={{ background: 'transparent', border: 'none', color: GOLD, fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>تغيير</button>
                </div>
                {acc.account_name && <div style={{ fontSize: 11, color: C.tx3 }}>{acc.account_name}</div>}
                {(acc.account_number || acc.iban) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, color: C.tx4 }}>
                    {acc.account_number && <div>رقم الحساب: <span style={{ direction: 'ltr', unicodeBidi: 'isolate', fontFamily: MONO, color: C.tx3 }}>{acc.account_number}</span></div>}
                    {acc.iban && <div>الآيبان: <span style={{ direction: 'ltr', unicodeBidi: 'isolate', fontFamily: MONO, color: C.tx3 }}>{acc.iban}</span></div>}
                  </div>
                )}
              </div>
              <FKMulti full label="غرض هذا الحساب لهذا المكتب" req searchable={false}
                value={(form.account_purpose || '').split('·').map(s => s.trim()).filter(Boolean)}
                onChange={arr => setForm(p => ({ ...p, account_purpose: arr.join(' · ') }))}
                options={PURPOSE_OPTS.map(o => ({ k: o.v, l: o.v }))} getKey={o => o.k} getLabel={o => o.l} placeholder="اختر الغرض..." />
            </>
          )}
        </div>
      </FKSection>
    )
    return (
      <FKModal open onClose={onClose} variant="create" width={600} success={successNode}
        title="ربط حساب بنكي" Icon={Landmark}
        onSubmit={handleSave} submitting={saving} submitLabel="ربط" submitIcon={Link2}
        pages={[{ valid: canSave, error: errMsg, content: linkContent }]} />
    )
  }

  return (
    <FKModal open onClose={onClose} variant={mode === 'edit' ? 'edit' : 'create'} width={600} success={successNode}
      title={mode === 'edit' ? 'تعديل الحساب البنكي' : 'حساب بنكي جديد'} Icon={Landmark}
      onSubmit={handleSave} submitting={saving}
      submitLabel={mode === 'edit' ? 'تعديل' : 'إضافة'} submitIcon={mode === 'edit' ? Edit2 : Plus}
      nextLabel="التالي" backLabel="السابق"
      pages={[
        { title: 'بيانات الحساب', valid: acctComplete, error: errMsg, content: accountSection },
        { title: 'ملف الآيبان', valid: mode === 'edit' || !!form._ibanFile, content: ibanFileBlock },
        { title: 'ربط المنشأة (اختياري)', valid: canSave, error: errMsg, content: facilitySection },
      ]} />
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

export function BankRow({ account, sb, toast, onEdit, onReload }) {
  const lowBal = account.min_balance_alert != null &&
    Number(account.current_balance || 0) <= Number(account.min_balance_alert)
  const c = lowBal ? '#e6a23c' : C.ok

  const copy = (v) => { if (!v) return; navigator.clipboard?.writeText(String(v)) }

  const [cards, setCards] = useState([])
  const [confirmDel, setConfirmDel] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [editCard, setEditCard] = useState(null)
  const [reveal, setReveal] = useState({})
  const [deleting, setDeleting] = useState(false)

  const loadCards = useCallback(async () => {
    if (!sb) return
    const { data } = await sb.from('bank_cards').select('*').eq('bank_account_id', account.id).is('deleted_at', null).order('created_at', { ascending: true })
    setCards(data || [])
  }, [sb, account.id])
  useEffect(() => { loadCards() }, [loadCards])

  // All offices this account is linked to (with their purpose), across branches.
  const [links, setLinks] = useState([])
  const loadLinks = useCallback(async () => {
    if (!sb) return
    const { data } = await sb.from('bank_account_branches')
      .select('id, account_purpose, is_active, branches(branch_code)')
      .eq('bank_account_id', account.id).eq('is_active', true).is('deleted_at', null)
    setLinks(data || [])
  }, [sb, account.id])
  useEffect(() => { loadLinks() }, [loadLinks])

  const delAccount = async () => {
    setDeleting(true)
    try {
      const { error } = await sb.from('bank_accounts').update({ deleted_at: new Date().toISOString() }).eq('id', account.id)
      if (error) throw error
      if (account._junction_id) await sb.from('bank_account_branches').update({ deleted_at: new Date().toISOString() }).eq('id', account._junction_id)
      toast?.('تم حذف الحساب البنكي')
      onReload?.()
    } catch (e) {
      const msg = (e.message || '').toLowerCase()
      toast?.(msg.includes('row-level security') || e.code === '42501' ? 'لا تملك صلاحية حذف الحساب' : 'تعذّر الحذف: ' + (e.message || '').slice(0, 80), 'error')
      setDeleting(false); setConfirmDel(false)
    }
  }
  const delCard = async (id) => {
    const { error } = await sb.from('bank_cards').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast?.('تعذّر حذف البطاقة', 'error'); return }
    toast?.('تم حذف البطاقة'); loadCards()
  }
  // Activate / deactivate the bank account (for this branch) and individual cards.
  const accActive = account.is_active !== false
  const toggleAccount = async () => {
    const { error } = await sb.from('bank_accounts').update({ is_active: !accActive }).eq('id', account.id)
    if (error) { toast?.('تعذّر تحديث حالة الحساب', 'error'); return }
    toast?.(!accActive ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب'); onReload?.()
  }
  const toggleCard = async (cd) => {
    const { error } = await sb.from('bank_cards').update({ is_active: cd.is_active === false }).eq('id', cd.id)
    if (error) { toast?.('تعذّر تحديث حالة البطاقة', 'error'); return }
    loadCards()
  }
  const switchBtn = (on, onClick, title) => (
    <button type="button" onClick={onClick} title={title}
      style={{ width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0, position: 'relative', transition: '.2s', background: on ? `linear-gradient(180deg, ${C.ok} 0%, #1f8a3a 100%)` : 'rgba(255,255,255,.14)', boxShadow: on ? `0 0 8px ${C.ok}44, inset 0 1px 0 rgba(255,255,255,.15)` : 'inset 0 1px 2px rgba(0,0,0,.3)' }}>
      <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, right: on ? 3 : 21, transition: '.2s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
    </button>
  )
  const maskNum = (v) => { const s = String(v || '').replace(/\s+/g, ''); return s.length > 4 ? '•••• ' + s.slice(-4) : s }

  // ── Build reusable UI pieces, then arrange them in a two-column layout. ──────
  const PURPOSE_META = {
    'الإيداعات النقدية':   { Icon: Banknote,         hue: '#27a046' },
    'التحويلات الواردة':   { Icon: ArrowDownToLine,  hue: '#3483b4' },
    'التحويلات الصادرة':  { Icon: ArrowUpFromLine,  hue: '#e6a23c' },
    'سداد المدفوعات':      { Icon: Receipt,          hue: '#bb8fce' },
  }
  const purposeParts = account.account_purpose
    ? account.account_purpose.split('·').map(s => s.trim()).filter(Boolean) : []

  const primaryBadge = account.is_primary ? (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: `${GOLD}15`, color: GOLD, display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
      رئيسي
    </span>
  ) : null
  const purposeBadges = purposeParts.length ? purposeParts.map((p, i) => {
    const { Icon, hue } = PURPOSE_META[p] || { Icon: CreditCard, hue: GOLD }
    return (
      <span key={i} style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 7, background: `linear-gradient(135deg, ${hue}26 0%, ${hue}12 100%)`, color: hue, border: `1px solid ${hue}45`, boxShadow: `0 1px 4px ${hue}1a, inset 0 1px 0 rgba(255,255,255,.04)`, display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <Icon size={11} strokeWidth={2.4} />{p}
      </span>
    )
  }) : null

  const editBtn = (
    <button type="button" onClick={() => onEdit?.(account)}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s ease, border-color .15s ease' }}>
      تعديل
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
    </button>
  )
  const toggle = switchBtn(accActive, toggleAccount, accActive ? 'تعطيل الحساب' : 'تفعيل الحساب')

  const lowBalAlert = lowBal ? (
    <div style={{ fontSize: 10, fontWeight: 600, color: '#e6a23c', background: 'rgba(230,162,60,.12)', padding: '5px 10px', borderRadius: 6, marginBottom: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <AlertCircle size={10} /> الحد الأدنى: {nm(account.min_balance_alert)}
    </div>
  ) : null

  const copyItems = [
    account.account_number && { key: 'acc', label: 'رقم الحساب', value: account.account_number, node: <CopyRow key="acc" label="رقم الحساب" value={account.account_number} onCopy={() => copy(account.account_number)} /> },
    account.iban && { key: 'iban', label: 'الآيبان', value: account.iban, node: <CopyRow key="iban" label="الآيبان" value={account.iban} onCopy={() => copy(account.iban)} /> },
    account.swift_code && { key: 'swift', label: 'سويفت', value: account.swift_code, node: <CopyRow key="swift" label="سويفت" value={account.swift_code} onCopy={() => copy(account.swift_code)} /> },
  ].filter(Boolean)

  const linksInner = links.length ? (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {links.map(l => (
        <span key={l.id} style={{ fontSize: 10, padding: '3px 9px', borderRadius: 5, background: `${C.blue}15`, color: C.blue, border: `1px solid ${C.blue}33`, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {l.branches?.branch_code}{l.account_purpose ? ` · ${l.account_purpose}` : ''}
        </span>
      ))}
    </div>
  ) : null
  const linksNode = links.length ? (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 700, marginBottom: 6 }}>المكاتب المرتبطة بهذا الحساب:</div>
      {linksInner}
    </div>
  ) : null

  const MONO_F = "'JetBrains Mono','Cairo',sans-serif"
  const cardBtn = (extra = {}) => ({ width: 26, height: 26, borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)', ...extra })
  const cardsInner = cards.length ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {cards.map(card => {
        const shown = !!reveal[card.id]
        const inactive = card.is_active === false
        return (
          <div key={card.id} style={{
            position: 'relative', width: '100%', minHeight: 168,
            borderRadius: 14, padding: '15px 17px', overflow: 'hidden',
            background: 'linear-gradient(135deg, #313131 0%, #1d1d1d 52%, #151515 100%)',
            border: `1px solid ${GOLD}33`,
            boxShadow: `0 10px 26px rgba(0,0,0,.42), inset 0 1px 0 ${GOLD}1f`,
            display: 'flex', flexDirection: 'column',
            opacity: inactive ? .5 : 1, transition: 'opacity .2s',
          }}>
            {/* sheen + glow */}
            <div style={{ position: 'absolute', insetInlineEnd: -34, top: -34, width: 130, height: 130, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}26 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', insetInlineStart: -60, bottom: -70, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* Top: bank label + reveal / edit */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: GOLD, letterSpacing: '.4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.bank_name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <button type="button" onClick={() => setReveal(p => ({ ...p, [card.id]: !p[card.id] }))} title={shown ? 'إخفاء' : 'إظهار'} style={cardBtn({ border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)' })}>
                  {shown
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>}
                </button>
                <button type="button" onClick={() => { setEditCard(card); setShowCardModal(true) }} title="تعديل البطاقة" style={cardBtn({ border: `1px solid ${GOLD}40`, background: `${GOLD}1f`, color: GOLD })}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                </button>
              </div>
            </div>

            {/* Chip */}
            <div style={{ position: 'relative', width: 38, height: 28, borderRadius: 6, margin: '16px 0 14px', background: 'linear-gradient(135deg,#e9d089 0%,#b5903a 50%,#8c6c25 100%)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.3)' }}>
              <div style={{ position: 'absolute', inset: '6px 5px', borderRadius: 3, border: '1px solid rgba(0,0,0,.22)' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(0,0,0,.2)' }} />
            </div>

            {/* Card number */}
            <div style={{ position: 'relative', fontSize: 16.5, fontWeight: 700, color: 'rgba(255,255,255,.93)', direction: 'ltr', fontFamily: MONO_F, letterSpacing: '2.5px' }}>
              {shown ? (card.card_number || '—') : maskNum(card.card_number)}
            </div>

            {/* Bottom: holder + toggle */}
            <div style={{ position: 'relative', marginTop: 'auto', paddingTop: 13, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 7.5, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.6px', marginBottom: 2 }}>حامل البطاقة</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.86)', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{card.holder_name || '—'}</div>
              </div>
              {switchBtn(card.is_active !== false, () => toggleCard(card), card.is_active !== false ? 'تعطيل البطاقة' : 'تفعيل البطاقة')}
            </div>

            {/* Revealed PIN / CVV */}
            {shown && (card.pin || card.cvv) && (
              <div style={{ position: 'relative', marginTop: 11, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,.09)', display: 'flex', gap: 16, fontSize: 11, color: 'var(--tx3)', direction: 'ltr', fontFamily: MONO_F }}>
                {card.pin && <span>PIN: <b style={{ color: 'var(--tx2)' }}>{card.pin}</b></span>}
                {card.cvv && <span>CVV: <b style={{ color: 'var(--tx2)' }}>{card.cvv}</b></span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  ) : null
  const cardsNode = cards.length ? <div style={{ marginTop: 10 }}>{cardsInner}</div> : null

  const footerActions = (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" onClick={() => { setEditCard(null); setShowCardModal(true) }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: GOLD, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s ease, border-color .15s ease' }}>
        بطاقة بنكية جديدة <Plus size={13} strokeWidth={2.2} />
      </button>
    </div>
  )

  return (
    <>
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
        border: `1px solid ${lowBal ? 'rgba(230,162,60,.3)' : 'rgba(255,255,255,.06)'}`,
        borderInlineStart: `3px solid ${lowBal ? c : GOLD}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 2px 6px rgba(0,0,0,.2)',
        opacity: accActive ? 1 : .6, transition: 'opacity .2s',
      }}>
        {/* Two-column layout: identity + balance | account numbers + offices */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px,.9fr) 1.4fr', gap: 12, alignItems: 'stretch' }}>
          <div style={{ padding: 12, borderRadius: 9, background: `linear-gradient(160deg, ${c}14 0%, rgba(0,0,0,.25) 100%)`, border: `1px solid ${c}26`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 11, textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', minWidth: 0 }}>
              <Landmark size={22} color={c} strokeWidth={2.2} style={{ flexShrink: 0 }} />
              <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 1, minWidth: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{account.bank_name}</span>
                {account.account_name && <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{account.account_name}</span>}
              </span>
            </div>
            <div title={account._bal ? `الرصيد = الإيداعات − المدفوعات\n+ تحويلات واردة: ${nm(account._bal.in_payments)}\n+ إيداعات نقدية: ${nm(account._bal.in_cash_deposits)}\n− المدفوعات: ${nm(account._bal.out_fees)}` : undefined}
              style={{ fontSize: 30, fontWeight: 800, color: c, fontFamily: MONO_F, direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1.05, cursor: account._bal ? 'help' : 'default' }}>{nm(account.current_balance || 0)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>{primaryBadge}{purposeBadges}</div>
            {toggle}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{editBtn}</div>
            {lowBalAlert}
            {copyItems.map(it => it.node)}
            {linksNode}
          </div>
        </div>
        {cardsNode}
        {footerActions}
      </div>
      {showCardModal && (
        <BankCardModal sb={sb} accountId={account.id} bankName={account.bank_name} card={editCard} toast={toast}
          onClose={() => { setShowCardModal(false); setEditCard(null) }}
          onSaved={() => { setShowCardModal(false); setEditCard(null); loadCards() }} />
      )}
      <ConfirmDialog open={confirmDel} onCancel={() => setConfirmDel(false)} onConfirm={delAccount}
        title="حذف الحساب البنكي" message="هل أنت متأكد من حذف هذا الحساب نهائياً؟ لا يمكن التراجع عن هذا الإجراء."
        itemName={account.bank_name} confirmText={deleting ? '...' : 'حذف'} />
    </>
  )
}

export function BankCardModal({ sb, accountId, bankName, card, toast, onClose, onSaved }) {
  const [f, setFRaw] = useState({ card_number: card?.card_number || '', holder_name: card?.holder_name || '', pin: card?.pin || '', cvv: card?.cvv || '', holder_user_id: card?.holder_user_id || '' })
  const setF = (...a) => { setErrMsg(''); setFRaw(...a) }
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [users, setUsers] = useState([])
  const [errMsg, setErrMsg] = useState('')
  const isEdit = !!card?.id
  // System users — the card can be assigned to whoever physically holds it.
  useEffect(() => {
    if (!sb) return
    sb.from('users').select('id, name_ar, name_en, email').eq('is_active', true).order('name_ar')
      .then(({ data }) => setUsers(data || []))
  }, [sb])
  const canSave = !!f.card_number.trim() && !!f.holder_name.trim() && !!f.pin.trim() && !!f.cvv.trim()
  const save = async () => {
    setErrMsg('')
    if (!canSave) { setErrMsg('جميع الحقول إلزامية'); return }
    setBusy(true)
    try {
      const payload = { card_number: f.card_number.trim() || null, holder_name: f.holder_name.trim() || null, pin: f.pin.trim() || null, cvv: f.cvv.trim() || null, holder_user_id: f.holder_user_id || null }
      const res = card?.id
        ? await sb.from('bank_cards').update(payload).eq('id', card.id)
        : await sb.from('bank_cards').insert({ bank_account_id: accountId, ...payload })
      if (res.error) throw res.error
      setBusy(false); setDone(true)
      setTimeout(() => onSaved?.(), 1400)
    } catch (e) {
      const msg = (e.message || '').toLowerCase()
      setErrMsg(msg.includes('row-level security') || e.code === '42501' ? 'لا تملك صلاحية إضافة بطاقة' : 'تعذّر الحفظ: ' + (e.message || '').slice(0, 80))
      setBusy(false)
    }
  }
  return (
    <FKModal open onClose={done ? onSaved : onClose} variant={isEdit ? 'edit' : 'create'} width={560}
      title={isEdit ? 'تعديل البطاقة البنكية' : 'بطاقة بنكية جديدة'} Icon={CreditCard}
      success={done ? <SuccessView title={isEdit ? 'تم تعديل البطاقة' : 'تمت إضافة البطاقة'} /> : null}
      errorMsg={errMsg}
      footer={
        <FKAction Icon={isEdit ? Edit2 : Plus} disabled={busy || !canSave} onClick={save}>
          {busy ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'إضافة')}
        </FKAction>
      }>
      <FKSection Icon={CreditCard} label="بيانات البطاقة">
        <div style={GRID}>
          <FKText full label="رقم البطاقة" req dir="ltr" value={f.card_number} onChange={v => setF(p => ({ ...p, card_number: v.replace(/[^\d ]/g, '') }))} placeholder="0000 0000 0000 0000" />
          <FKText full label="اسم حامل البطاقة" req value={f.holder_name} onChange={v => setF(p => ({ ...p, holder_name: v }))} placeholder="الاسم كما في البطاقة" />
          <FKSelect full label="الموظف الحامل للبطاقة" value={f.holder_user_id || ''} onChange={v => setF(p => ({ ...p, holder_user_id: v }))}
            options={users.map(u => ({ k: u.id, l: u.name_ar || u.name_en || u.email }))} getKey={o => o.k} getLabel={o => o.l} placeholder="اختر المستخدم..." />
          <FKText label="الرقم السري" req dir="ltr" value={f.pin} onChange={v => setF(p => ({ ...p, pin: v.replace(/[^\d]/g, '') }))} placeholder="****" />
          <FKText label="CVV" req dir="ltr" maxLength={4} value={f.cvv} onChange={v => setF(p => ({ ...p, cvv: v.replace(/[^\d]/g, '') }))} placeholder="***" />
        </div>
      </FKSection>
    </FKModal>
  )
}

// Unified info row (id / phone / role) — display only, no copy.
const MetaRow = ({ Icon, dot, value, label, mono, color }) => {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7,
      background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.04)',
      fontSize: 11, color: 'rgba(255,255,255,.78)', fontWeight: 600,
    }}>
      <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ marginInlineStart: 'auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: mono ? 'ltr' : 'rtl', fontFamily: mono ? "'JetBrains Mono','Cairo',sans-serif" : F }}>{value}</span>
      {Icon && <Icon size={11} color={color || 'var(--tx4)'} strokeWidth={2.3} style={{ flexShrink: 0 }} />}
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Users section — spotlight manager banner + employee grid
   ═══════════════════════════════════════════════════════════════ */
function UsersSpotlight({ users, branch, sb, toast, onReload }) {
  const managers = users.filter(u => branch.manager_user_id === u.id)
  const employees = users.filter(u => branch.manager_user_id !== u.id)

  const toggleActive = async (u, e) => {
    e?.stopPropagation()
    const next = !u.is_active
    const { error } = await sb.from('users').update({ is_active: next }).eq('id', u.id)
    if (error) { toast?.(error.message || 'تعذّر تحديث الحالة', 'error'); return }
    toast?.(next ? 'تم التفعيل' : 'تم التعطيل')
    onReload?.()
  }

  const phoneOf = u => u.phone ? String(u.phone).replace(/^\+?966/, '0') : null
  const initialOf = u => (u.name_ar || u.email || '?').trim()[0] || '?'
  const cOf = u => (branch.manager_user_id === u.id ? GOLD : C.blue)

  const Flag = ({ u, size = 42, radius = 11 }) => {
    const c = cOf(u)
    return (
      <div title={u.nationality_name || u.nationality_code || undefined}
        style={{ width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden',
          border: `1px solid ${c}45`, boxShadow: `0 3px 10px ${c}22, inset 0 1px 0 rgba(255,255,255,.06)`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: u.nationality_flag ? '#1a1a1a' : `linear-gradient(135deg, ${c}2e 0%, ${c}12 100%)`,
          fontSize: Math.round(size * 0.37), fontWeight: 700, color: c }}>
        {u.nationality_flag
          ? <img src={u.nationality_flag} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initialOf(u)}
      </div>
    )
  }

  const Sw = ({ u, w = 38, h = 21 }) => (
    <button type="button" onClick={e => toggleActive(u, e)} title={u.is_active ? 'تعطيل' : 'تفعيل'}
      style={{ flexShrink: 0, width: w, height: h, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: u.is_active ? `linear-gradient(180deg, ${C.ok} 0%, ${C.ok}cc 100%)` : 'rgba(255,255,255,.08)',
        position: 'relative', boxShadow: u.is_active ? `0 0 10px ${C.ok}55, inset 0 1px 0 rgba(255,255,255,.2)` : 'inset 0 1px 3px rgba(0,0,0,.32)', transition: '.22s' }}>
      <span style={{ position: 'absolute', top: 3, left: u.is_active ? 3 : (w - h + 3), width: h - 6, height: h - 6, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.45)', transition: '.22s' }} />
    </button>
  )

  const MgrTag = ({ small }) => (
    <span style={{ fontSize: small ? 9 : 9.5, fontWeight: 700, padding: small ? '1px 6px' : '2px 7px', borderRadius: 5, background: `${GOLD}22`, color: GOLD, border: `1px solid ${GOLD}48`, letterSpacing: '.2px' }}>المدير</span>
  )

  const RoleLine = ({ u, size = 11 }) => u.role_name ? (
    <span style={{ fontSize: size, color: 'var(--tx4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: u.role_color || cOf(u) }} />{u.role_name}
    </span>
  ) : null

  const GroupHead = ({ color, label, count }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)', letterSpacing: '.2px' }}>{label}</span>
      <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, direction: 'ltr' }}>{nm(count)}</span>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <GroupHead color={GOLD} label="المدير" count={managers.length} />
        {managers.length === 0 ? (
          <div style={{ padding: '15px 16px', textAlign: 'center', color: 'var(--tx4)', fontSize: 11.5, fontWeight: 600, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 10 }}>
            لم يتم تحديد مدير بعد
          </div>
        ) : managers.map(u => {
          const ph = phoneOf(u)
          return (
            <div key={u.id} style={{
              position: 'relative', overflow: 'hidden', borderRadius: 15, padding: '18px 20px',
              background: `linear-gradient(120deg, ${GOLD}16 0%, ${GOLD}06 40%, rgba(0,0,0,.2) 100%)`,
              border: `1px solid ${GOLD}38`, boxShadow: `0 6px 20px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05)`,
              opacity: u.is_active ? 1 : .6,
            }}>
              <div style={{ position: 'absolute', insetInlineStart: -50, top: -50, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Flag u={u} size={60} radius={14} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{u.name_ar || u.email || '—'}</span>
                    <MgrTag />
                  </div>
                  <div style={{ marginTop: 5 }}><RoleLine u={u} size={12} /></div>
                </div>
                {ph && <PillMeta label="الجوال" value={ph} color={C.ok} />}
                {u.id_number && <PillMeta label="الهوية" value={u.id_number} />}
                <Sw u={u} w={42} h={23} />
              </div>
            </div>
          )
        })}
      </div>
      {employees.length > 0 && (
        <div>
          <GroupHead color={C.blue} label="الموظفون" count={employees.length} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 10 }}>
            {employees.map(u => (
              <div key={u.id} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, textAlign: 'center',
                padding: '16px 12px', borderRadius: 13, background: 'rgba(0,0,0,.18)',
                border: '1px solid rgba(255,255,255,.06)', opacity: u.is_active ? 1 : .55, transition: '.2s',
              }}>
                <Flag u={u} size={52} radius={13} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.94)' }}>{u.name_ar || u.email || '—'}</div>
                  <div style={{ marginTop: 4, display: 'flex', justifyContent: 'center' }}><RoleLine u={u} size={10.5} /></div>
                </div>
                <Sw u={u} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const PillMeta = ({ label, value, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 12px', borderRadius: 9, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.06)' }}>
    <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: color || 'rgba(255,255,255,.9)', direction: 'ltr', fontFamily: "'JetBrains Mono','Cairo',sans-serif" }}>{value}</span>
  </div>
)

const CopyRow = ({ label, value, onCopy }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e) => {
    e?.stopPropagation()
    onCopy?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div onClick={handleCopy} className="brs-copy-row" style={{
      padding: '7px 10px', borderRadius: 8,
      background: 'linear-gradient(180deg,#262626 0%,#1d1d1d 100%)',
      border: '1px solid rgba(255,255,255,.05)',
      cursor: 'pointer', transition: '.18s',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.03)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${GOLD}40` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>
      <style>{`.brs-copy-row:hover .brs-copy-ico{opacity:1!important;transform:scale(1)!important}`}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', marginBottom: 3, letterSpacing: '.2px' }}>{label}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.92)', direction: 'ltr',
          fontFamily: "'JetBrains Mono','Cairo',sans-serif", wordBreak: 'break-all' }}>
          {value}
        </div>
      </div>
      <span className="brs-copy-ico" style={{
        flexShrink: 0, transform: 'scale(.92)',
        width: 26, height: 26, borderRadius: 7,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: copied ? `${C.ok}22` : 'rgba(255,255,255,.04)',
        border: `1px solid ${copied ? `${C.ok}55` : 'rgba(255,255,255,.06)'}`,
        color: copied ? C.ok : GOLD,
        opacity: copied ? 1 : .6,
        transition: '.18s',
      }}>
        {copied ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.2} />}
      </span>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Add / Edit modal — built on FormKit Modal + ModalSection + SuccessView.
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
  // Inline footer error (no toast) + mandatory-field gating — mirrors NewUserModal.
  const [errMsg, setErrMsg] = useState('')
  useEffect(() => { if (!open) setErrMsg('') }, [open])
  // Editable fields, and which of them actually changed vs the openEdit snapshot.
  const CMP_KEYS = ['branch_code', 'region_id', 'city_id', 'district_id']
  const orig = form._orig
  const changedKeys = (isEdit && orig)
    ? CMP_KEYS.filter(k => String(form[k] || '') !== String(orig[k] || ''))
    : CMP_KEYS // add mode → treat everything as "new"
  // On edit, block saving until at least one field actually changed.
  const hasChanges = !isEdit || changedKeys.length > 0
  const allFilled = !!form.region_id && !!form.city_id && !!form.district_id && !!(form.branch_code || '').trim()
  const canSave = allFilled && hasChanges
  const handleSave = async () => {
    setErrMsg('')
    const err = await onSave()
    if (err) setErrMsg(err)
  }

  // Unified success view — one sentence only, rendered inside the same Modal.
  const successNode = success
    ? <SuccessView title={isEdit ? 'عُدّلت بيانات المكتب بنجاح' : 'أُضيفت بيانات المكتب بنجاح'} />
    : undefined

  if (!open) return null
  return (
    <FKModal open={open} onClose={onClose} width={640} success={successNode}
      title={isEdit ? 'تعديل بيانات المكتب' : 'مكتب جديد'} Icon={Building2}
      variant={isEdit ? 'edit' : 'create'} errorMsg={errMsg}
      footer={
        <FKAction Icon={isEdit ? Edit2 : Plus} disabled={saving || !canSave} onClick={handleSave}>
          {saving ? (isEdit ? 'جارٍ التعديل…' : 'جاري الحفظ...') : (isEdit ? 'تعديل' : 'إضافة')}
        </FKAction>
      }>
      <FKSection Icon={Building2} label="بيانات المكتب">
        <div style={GRID}>
          <FKSelect label="المنطقة" req searchable
            options={regions} getKey={o => o.id} getLabel={o => o.name_ar}
            value={form.region_id || null} onChange={v => setForm(p => ({ ...p, region_id: v, city_id: '', district_id: '' }))}
            placeholder="اختر المنطقة..." />
          <FKSelect label="المدينة" req disabled={!form.region_id}
            options={cities.filter(c => !form.region_id || c.region_id === form.region_id)}
            getKey={o => o.id} getLabel={o => o.name_ar}
            value={form.city_id || null} onChange={v => updateCode(v)}
            placeholder={form.region_id ? 'اختر المدينة...' : 'اختر المنطقة أولاً'} />
          <FKSelect label="الحي" req disabled={!form.city_id}
            options={distOpts} getKey={o => o.v} getLabel={o => o.l}
            value={form.district_id || null} onChange={v => setForm(p => ({ ...p, district_id: v }))}
            placeholder={form.city_id ? 'اختر الحي...' : 'اختر المدينة أولاً'} />
          <FKField label="كود المكتب" req>
            {codeEditing ? (
              <input value={form.branch_code || ''} autoFocus
                onChange={e => setForm(p => ({ ...p, branch_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                onBlur={() => setCodeEditing(false)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setCodeEditing(false) } }}
                placeholder="RYD01" dir="ltr"
                style={{ ...sF, direction: 'ltr', textAlign: 'center', fontSize: 14,
                  fontFamily: "'JetBrains Mono','Cairo',sans-serif", fontWeight: 700 }} />
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
                background: 'rgba(0,0,0,.18)', borderRadius: 9,
                height: 42, boxSizing: 'border-box',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', overflow: 'hidden',
              }}>
                <span style={{
                  fontSize: 14, fontFamily: "'JetBrains Mono','Cairo',sans-serif",
                  fontWeight: 600, direction: 'ltr', flex: 1, textAlign: 'center',
                  color: form.branch_code ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {form.branch_code || 'الكود'}
                </span>
                <button type="button" onClick={() => setCodeEditing(true)} title="تعديل"
                  style={{
                    width: 28, height: 26, borderRadius: 6,
                    border: `1px dashed ${isEdit ? '#36a8e6' : GOLD}80`, background: 'transparent',
                    color: isEdit ? '#36a8e6' : GOLD, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, flexShrink: 0, transition: '.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${isEdit ? '#36a8e6' : GOLD}15` }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <Edit2 size={12} strokeWidth={2.2} />
                </button>
              </div>
            )}
          </FKField>
        </div>
      </FKSection>
    </FKModal>
  )
}
