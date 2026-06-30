import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Search, X, Check, ShieldCheck, Building2, Phone, Mail, CreditCard, ChevronDown, ChevronLeft, Eye, EyeOff, Copy, User, Globe, Lock, Layers, SlidersHorizontal, MousePointerClick, Pencil, AppWindow, Wand2 } from 'lucide-react'
import BackButton from '../../components/BackButton'
import {
  Modal as FKModal, ModalSection, ActionButton, SuccessView, Lbl, GRID, FULL,
  TextField, IdField, PhoneField, Select, MultiSelect, EmptyState,
} from '../../components/ui/FormKit.jsx'
import { Shimmer } from '../../components/ui/Skeleton.jsx'
import { TAB_CARDS, CARD_GROUP_LABELS, MODULE_ACTIONS, TAB_FIELDS, TAB_MODALS, TAB_STAGES, TAB_SERVICE_SCOPE, TAB_STATS_MODE, groupFields, tabModule as catTabModule } from '../../lib/permCatalog.js'
import { isGM as isGmUser } from '../../lib/permissions.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', red: '#c0392b', blue: '#3483b4', ok: '#27a046' }
const ROLE_PALETTE = [C.gold, C.blue, '#16a085', '#bb8fce', '#f39c12', C.ok, '#e8c77a', '#5dade2', '#27ae60']
const nm = v => Number(v || 0).toLocaleString('en-US')

// Company email domain — every staff account is name@jisr.com; the GM only types the local part.
const EMAIL_DOMAIN = '@jisr.com'
// Roles the GM can assign to a staff account (excludes system-only roles like "مصدر فواتير").
const ASSIGNABLE_ROLES = ['المدير العام', 'مدير مكتب', 'موظف']
// Suggest a clean lowercase email local-part from the Latin portion of the name (e.g. "محمد Mohammed Ali" → "mohammed.ali").
const emailLocalFromName = (name) => {
  const latin = (name || '').replace(/[^A-Za-z0-9 ]/g, ' ').trim().toLowerCase()
  if (!latin) return ''
  return latin.split(/\s+/).filter(Boolean).slice(0, 2).join('.')
}
// A random, effectively-unique password. Guarantees one of each class
// (lower, UPPER, digit, symbol) to satisfy the auth password policy.
const genPassword = () => {
  const U = 'ABCDEFGHJKLMNPQRSTUVWXYZ', L = 'abcdefghijkmnpqrstuvwxyz', D = '23456789', S = '!@#$%*-_'
  const all = U + L + D + S
  const pick = s => s[Math.floor(Math.random() * s.length)]
  let p = pick(U) + pick(L) + pick(D) + pick(S)
  for (let i = 0; i < 6; i++) p += pick(all)
  return p.split('').sort(() => Math.random() - 0.5).join('')
}

// Small "اقتراح جديد" pill — generates a fresh password into the field(s).
// Shared by the create-user and edit-work-info modals.
function PwSuggestBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ height: 26, padding: '0 10px', borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
      اقتراح جديد
    </button>
  )
}

// Shared KPI-card shell — matches the BranchesPage hero cards exactly.
function HeroStat({ tone, label, value, footer }) {
  return (
    <div style={{
      position: 'relative', padding: '18px 22px', borderRadius: 16,
      background: 'var(--card-grad2)',
      border: '1px solid var(--bd)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      overflow: 'hidden', minHeight: 150,
    }}>
      <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${tone}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone, boxShadow: `0 0 10px ${tone}aa` }} />
        <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: tone, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{footer}</span>
      </div>
    </div>
  )
}

export default function PermissionsPage({ sb, user, toast, lang, nav, hubTabs, visibility, onVisibilityChange, emptyIcon }) {
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [roles, setRoles] = useState([])
  const [nationalities, setNationalities] = useState([])
  const [modules, setModules] = useState([])      // permission modules (grouped)
  const [grants, setGrants] = useState([])        // user_permissions rows (per-user overrides)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState(null) // open employee detail page
  const [loading, setLoading] = useState(true)

  // Creating accounts is a General-Manager-only action.
  const isGM = user?.role?.name_ar === 'المدير العام' || user?.role?.name_en === 'General Manager'

  const refresh = async () => {
    const [uRes, bRes, rRes, nRes, pRes, gRes] = await Promise.all([
      sb.from('users')
        .select('id,role_id,primary_branch_id,branch_ids,is_active,personal_phone,email,plain_password,ui_visibility,created_at,last_login_at,person:persons(id,name_ar,name_en,id_number,id_type_id,nationality_id,phone_primary,birth_date,email),branch:branches!users_primary_branch_id_fkey(id,branch_code),role:roles!users_role_id_fkey(id,name_ar,name_en,color)')
        .is('deleted_at', null).order('created_at'),
      sb.from('branches').select('id,branch_code').is('deleted_at', null).order('branch_code'),
      sb.from('roles').select('id,name_ar,name_en,color').order('name_ar'),
      sb.from('nationalities').select('id,name_ar,name_en,flag_url').eq('is_active', true).order('name_ar'),
      sb.from('permissions').select('*').eq('is_active', true).order('module_sort').order('sort_order'),
      sb.from('user_permissions').select('user_id,permission_id,is_granted'),
    ])
    setUsers(uRes.data || [])
    setBranches(bRes.data || [])
    setRoles(rRes.data || [])
    setNationalities(nRes.data || [])
    // Group permissions by module for the per-user permissions card.
    const grouped = {}
    ;(pRes.data || []).forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = { module: p.module, label_ar: p.module_label_ar, icon: p.module_icon, sort: p.module_sort, perms: [] }
      grouped[p.module].perms.push(p)
    })
    setModules(Object.values(grouped).sort((a, b) => a.sort - b.sort))
    setGrants(gRes.data || [])
    setLoading(false)
  }
  useEffect(() => { if (sb) refresh() }, [sb])

  const selectedUser = selectedId ? users.find(u => u.id === selectedId) : null

  // Detail page replaces the list inline (same pattern as BranchesPage).
  if (selectedUser) {
    return <UserDetailPage sb={sb} currentUser={user} toast={toast} lang={lang}
      u={selectedUser} branches={branches} roles={roles} nationalities={nationalities}
      modules={modules} grants={grants.filter(g => g.user_id === selectedUser.id)}
      nav={nav} hubTabs={hubTabs} allUsers={users}
      onBack={() => setSelectedId(null)} onChanged={refresh} />
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>المستخدمون</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>تفعيل أو تعطيل حسابات المستخدمين والتحكم بصلاحية الدخول للنظام.</div>
        </div>
        {isGM && (
          <button onClick={() => setAdding(true)} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
            مستخدم جديد
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
      </div>

      <UsersTab sb={sb} user={user} toast={toast} lang={lang} loading={loading} users={users} branches={branches} nationalities={nationalities} emptyIcon={emptyIcon} onOpen={u => setSelectedId(u.id)} onChanged={() => { refresh() }} />

      {adding && <NewUserModal sb={sb} toast={toast} branches={branches} roles={roles} nationalities={nationalities}
        onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh() }} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Users tab — activate/deactivate user accounts, edit employee details.
// ═══════════════════════════════════════════════════════════════════
function UsersTab({ sb, user, toast, lang, loading, users, branches, nationalities, emptyIcon, onOpen, onChanged }) {
  const isAr = lang !== 'en'; const T = (a, e) => isAr ? a : e
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'pending'
  const [roleFilter, setRoleFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const roleOptions = useMemo(() => { const m = new Map(); users.forEach(u => { if (u.role?.id) m.set(u.role.id, u.role) }); return [...m.values()] }, [users])
  const [savingIds, setSavingIds] = useState(() => new Set())
  const pendingCount = users.filter(u => !u.is_active).length
  const filtered = users.filter(u => {
    if (statusFilter === 'active' && !u.is_active) return false
    if (statusFilter === 'pending' && u.is_active) return false
    if (roleFilter && u.role?.id !== roleFilter) return false
    if (branchFilter && u.primary_branch_id !== branchFilter && !(u.branch_ids || []).includes(branchFilter)) return false
    if (!q) return true
    const phoneLocal = u.personal_phone ? String(u.personal_phone).replace(/^\+?966/, '0') : ''
    const branchCodes = (u.branch_ids && u.branch_ids.length)
      ? u.branch_ids.map(id => (branches || []).find(b => b.id === id)?.branch_code).filter(Boolean).join(' ')
      : (u.branch?.branch_code || '')
    const hay = [
      u.person?.name_ar, u.person?.name_en, u.person?.id_number,
      u.personal_phone, phoneLocal, u.email,
      branchCodes, u.role?.name_ar, u.role?.name_en,
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.trim().toLowerCase())
  })
  // Pending accounts surface first so the GM sees what needs action.
  const sorted = [...filtered].sort((a, b) => Number(a.is_active) - Number(b.is_active))
  const toggle = async (u) => {
    if (u.id === user?.id) { toast(T('لا يمكنك تعطيل حسابك', "You can't disable your own account")); return }
    const next = !u.is_active
    // Last-GM safety: refuse to deactivate the final active General Manager.
    if (!next && (u.role?.name_ar === 'المدير العام' || u.role?.name_en === 'General Manager')) {
      const activeGMs = users.filter(x => x.is_active && (x.role?.name_ar === 'المدير العام' || x.role?.name_en === 'General Manager'))
      if (activeGMs.length <= 1) { toast(T('لا يمكن تعطيل آخر مدير عام نشط', 'Cannot disable the last active General Manager')); return }
    }
    setSavingIds(s => new Set([...s, u.id]))
    const { error } = await sb.from('users').update({ is_active: next, updated_at: new Date().toISOString() }).eq('id', u.id)
    setSavingIds(s => { const n = new Set(s); n.delete(u.id); return n })
    if (error) { toast(T('خطأ: ', 'Error: ') + error.message.slice(0, 80)); return }
    toast(T(next ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب', next ? 'Account enabled' : 'Account disabled'))
    await onChanged?.()
  }
  const activeCount = users.length - pendingCount

  // Top-row KPI + nationality distribution donut (mirrors the BranchesPage hero).
  const natDist = useMemo(() => {
    const map = new Map()
    users.forEach(u => {
      const key = u.person?.nationality_id || '__none'
      const name = (nationalities || []).find(n => n.id === u.person?.nationality_id)?.name_ar || 'غير محدد'
      if (!map.has(key)) map.set(key, { id: key, name, color: null, cnt: 0 })
      map.get(key).cnt += 1
    })
    return Array.from(map.values()).sort((a, b) => b.cnt - a.cnt)
  }, [users, nationalities])

  // Group filtered users by role — parallels the city grouping on the offices page.
  const roleGroups = useMemo(() => {
    const map = new Map()
    sorted.forEach(u => {
      const key = u.role?.id || '__none'
      const name = u.role?.name_ar || 'بدون دور'
      const color = u.role?.color || null
      if (!map.has(key)) map.set(key, { id: key, name, color, items: [], active: 0 })
      const g = map.get(key)
      g.items.push(u)
      if (u.is_active) g.active += 1
    })
    // Fixed role order: المدير العام → مدير مكتب → موظف → (any other role) → بدون دور.
    const rank = name => { const i = ASSIGNABLE_ROLES.indexOf(name); return i === -1 ? (name === 'بدون دور' ? 99 : ASSIGNABLE_ROLES.length) : i }
    return Array.from(map.values()).sort((a, b) => rank(a.name) - rank(b.name) || b.items.length - a.items.length)
  }, [sorted])


  return (
    <div>
      <style>{`
        .usr-hero-grid{display:grid;grid-template-columns:1.8fr 1fr;gap:14px;margin-bottom:24px}
        @media (max-width:720px){.usr-hero-grid{grid-template-columns:1fr}}
        .usr-row{transition:all .15s}
        .usr-row:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.34) !important;border-color:rgba(212,160,23,.22) !important}
        .usr-row-grid{display:grid;grid-template-columns:auto 1px 1fr auto;gap:18px;align-items:center}
        @media (max-width:720px){.usr-row-grid{grid-template-columns:1fr;gap:12px}.usr-row-vdiv{display:none}}
        .usr-row-vdiv{width:1px;align-self:stretch;background:linear-gradient(180deg,transparent 0%,var(--bd) 50%,transparent 100%);min-height:46px}
        @keyframes sk-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}
      `}</style>

      {/* Initial-load skeleton — echoes the hero grid (KPI + donut) and the
          role-grouped row cards, so the body doesn't flash the empty state. */}
      {loading && users.length === 0 ? (
        <>
          <div className="usr-hero-grid">
            <div style={{ padding: '18px 22px', borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
              <Shimmer w="42%" h={20} />
              <Shimmer w="50%" h={40} />
              <Shimmer w="60%" h={11} />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', minHeight: 150, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Shimmer w="45%" h={12} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <Shimmer w={86} h={86} r="50%" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} w={`${70 - i * 8}%`} h={9} />)}
                </div>
              </div>
            </div>
          </div>
          {/* Role group header + row cards */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
              <Shimmer w={120} h={13} />
              <Shimmer w={60} h={11} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 14, background: 'linear-gradient(135deg, rgba(119,119,119,.06) 0%, var(--card-bg) 50%, var(--card-bg) 100%)', border: '1px solid var(--bd)', boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03)', overflow: 'hidden' }}>
                  <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: 'var(--bd)' }} />
                  <div style={{ padding: '26px 30px 26px 26px', display: 'flex', alignItems: 'center', gap: 22 }}>
                    <Shimmer w={52} h={52} r={14} style={{ flexShrink: 0 }} />
                    <div className="usr-row-vdiv" style={{ minHeight: 56 }} />
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Shimmer w="34%" h={14} />
                      <Shimmer w="55%" h={10} />
                    </div>
                    <Shimmer w={44} h={24} r={999} style={{ flexShrink: 0 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (<>

      {/* Hero — active count + nationality distribution */}
      <div className="usr-hero-grid">
        <HeroStat tone={C.ok} label="المستخدمون" value={nm(activeCount)}
          footer={pendingCount > 0 ? `${nm(pendingCount)} معطّل` : 'جميع الحسابات نشطة'} />

        {/* Distribution by nationality — donut (same shape as offices) */}
        {(() => {
          const total = natDist.reduce((s, r) => s + r.cnt, 0) || 1
          const topN = natDist.slice(0, 6)
          const R = 32, CIRC = 2 * Math.PI * R
          let offset = 0
          return (
            <div style={{
              borderRadius: 16,
              background: 'var(--card-grad2)',
              border: '1px solid var(--bd)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>التوزّع حسب الجنسيات</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', marginLeft: 6 }}>{nm(users.length)}</span>{users.length >= 3 && users.length <= 9 ? 'مستخدمين' : 'مستخدم'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <svg width="86" height="86" viewBox="-43 -43 86 86" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
                  <circle r={R} fill="none" stroke="var(--bd2)" strokeWidth="11" />
                  {natDist.map((r, i) => {
                    const c = r.color || ROLE_PALETTE[i % ROLE_PALETTE.length]
                    const dash = (r.cnt / total) * CIRC
                    const seg = (
                      <circle key={r.id} r={R} fill="none" stroke={c} strokeWidth="11"
                        strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-offset}
                        style={{ transition: 'stroke-dasharray .3s' }}>
                        <title>{`${r.name}: ${r.cnt}`}</title>
                      </circle>
                    )
                    offset += dash
                    return seg
                  })}
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" transform="rotate(90)"
                    style={{ fill: 'var(--tx)', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {nm(users.length)}
                  </text>
                </svg>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 6, minWidth: 0 }}>
                  {topN.map((r, i) => {
                    const c = r.color || ROLE_PALETTE[i % ROLE_PALETTE.length]
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
            </div>
          )
        })()}
      </div>

      {/* Filter row — search + filter button/card (InvoicePage style) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={14} color="var(--tx4)" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو الهوية أو الجوال أو البريد أو الفرع أو الدور…"
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'var(--card-grad2)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
        {(() => {
          const hasFilters = !!(roleFilter || branchFilter || statusFilter !== 'all')
          const active = advOpen || hasFilters
          const clearAll = () => { setRoleFilter(''); setBranchFilter(''); setStatusFilter('all') }
          return (
            <button onClick={() => setAdvOpen(o => !o)} style={{ height: 44, padding: '0 16px', borderRadius: 12, flexShrink: 0, background: active ? 'rgba(212,160,23,.12)' : 'var(--card-grad2)', border: active ? '1px solid rgba(212,160,23,.4)' : '1px solid var(--bd)', color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box', transition: '.2s' }}>
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

      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>الدور</div>
                <Select searchable options={[{ id: '', name_ar: 'كل الأدوار' }, ...roleOptions]} getKey={o => o.id} getLabel={o => o.name_ar}
                  value={roleFilter || null} onChange={v => setRoleFilter(v || '')} placeholder="كل الأدوار" />
              </div>
              <div>
                <div style={fLbl}>المكتب</div>
                <Select searchable options={[{ id: '', branch_code: 'كل المكاتب' }, ...(branches || [])]} getKey={o => o.id} getLabel={o => o.branch_code}
                  value={branchFilter || null} onChange={v => setBranchFilter(v || '')} placeholder="كل المكاتب" />
              </div>
              <div>
                <div style={fLbl}>الحالة</div>
                <Select options={[{ v: '', l: 'الكل' }, { v: 'active', l: 'نشط' }, { v: 'pending', l: 'معطّل / قيد المراجعة' }]} getKey={o => o.v} getLabel={o => o.l}
                  value={statusFilter === 'all' ? null : statusFilter} onChange={v => setStatusFilter(v || 'all')} placeholder="الكل" />
              </div>
            </div>
          </div>
        )
      })()}

      {/* List — role-grouped accent row cards (matches offices city groups) */}
      {sorted.length === 0 ? (
        <EmptyState icon={emptyIcon} title="لا يوجد موظفين" desc="أضِف مستخدمين لإدارة أدوارهم وصلاحياتهم" />
      ) : roleGroups.map((g, gi) => {
        const c = g.color || ROLE_PALETTE[gi % ROLE_PALETTE.length]
        return (
          <div key={g.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, transform: 'translateY(-2px)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx2)' }}>{g.name}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{g.items.length}/{g.active} نشط</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {g.items.map(u => (
                <UserCard key={u.id} u={u} isMe={u.id === user?.id} saving={savingIds.has(u.id)}
                  nat={(nationalities || []).find(n => n.id === u.person?.nationality_id)}
                  onClick={() => onOpen(u)} onToggle={() => toggle(u)} />
              ))}
            </div>
          </div>
        )
      })}
      </>)}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// User row card — InvoicePage/BranchesPage spirit (accent bar + 4-col grid)
// ═══════════════════════════════════════════════════════════════════
function UserCard({ u, isMe, saving, nat, onClick, onToggle }) {
  const name = u.person?.name_ar || u.person?.name_en || '—'
  const branchLabel = u.branch ? u.branch.branch_code : '—'
  const isActive = u.is_active === true
  const tone = isActive ? C.ok : '#777'
  const accent = u.role?.color || C.gold
  const initial = (name || '—').trim().charAt(0)
  const flagUrl = nat?.flag_url

  return (
    <div onClick={onClick} className="usr-row"
      style={{
        position: 'relative', cursor: 'pointer', borderRadius: 14,
        background: `linear-gradient(135deg, ${tone}0e 0%, #232323 50%, #1f1f1f 100%)`,
        border: '1px solid rgba(255,255,255,.06)',
        boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03)',
        overflow: 'hidden', opacity: isActive ? 1 : .7,
      }}>
      {/* Status rail on the leading edge */}
      <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${tone} 0%, ${tone}55 100%)` }} />
      <div style={{ padding: '26px 30px 26px 26px' }}>
        <div className="usr-row-grid" style={{ gap: 22 }}>
          {/* Avatar — nationality flag (falls back to initial) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64 }}>
            <div title={nat?.name_ar || ''} style={{ width: 52, height: 52, borderRadius: 14, overflow: 'hidden', background: `linear-gradient(135deg, ${accent}33 0%, ${accent}14 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, fontWeight: 800, color: accent, flexShrink: 0 }}>
              {flagUrl ? <img src={flagUrl} alt={nat?.name_ar || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="usr-row-vdiv" style={{ minHeight: 56 }} />

          {/* Metadata column */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.92)', letterSpacing: '-.2px' }}>{name}</span>
              {u.role && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: accent + '20', color: accent }}>{u.role.name_ar}</span>}
              {isMe && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(212,160,23,.14)', color: C.gold, letterSpacing: '.3px' }}>أنت</span>}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--tx3)', fontWeight: 600, flexWrap: 'wrap' }}>
              {u.person?.name_en && (
                <span style={{ direction: 'ltr', fontFamily: F, fontSize: 12, letterSpacing: '.4px', color: 'var(--tx4)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.person.name_en}</span>
              )}
              {u.email && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--tx4)' }}>
                  <Mail size={11} />{u.email}
                </span>
              )}
            </div>
          </div>

          {/* Toggle (left) */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button type="button" disabled={saving || isMe} onClick={onToggle} title={isMe ? 'لا يمكنك تعطيل حسابك' : (isActive ? 'تعطيل الحساب' : 'تفعيل الحساب')}
              style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: isActive ? `linear-gradient(180deg, ${C.ok} 0%, #1f8a3a 100%)` : 'linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.10) 100%)', cursor: (saving || isMe) ? 'not-allowed' : 'pointer', opacity: (saving || isMe) ? .55 : 1, position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, boxShadow: isActive ? `0 2px 8px ${C.ok}44, inset 0 1px 0 rgba(255,255,255,.15)` : 'inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.18)' }}>
              <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, right: isActive ? 3 : 23, transition: '.2s', boxShadow: '0 2px 4px rgba(0,0,0,.3)' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// UserDetailPage — full employee page, styled like InvoiceDetailPage.
// Left: employee info + permissions card. Right (sticky): account status
// + visibility card. Permissions write user_permissions; visibility writes
// users.ui_visibility (per-employee sidebar/tab overrides).
// ═══════════════════════════════════════════════════════════════════
const cardChrome = { background: 'var(--card-grad2)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle = { fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '.2px' }
// Every sidebar tab is controllable — nothing is permanently locked. The General
// Manager bypasses personal visibility entirely (App.jsx isVisible), so an empty
// list can never lock the GM out of any tab.
const VIS_LOCKED = []

// Small inline copy-to-clipboard button used on copyable info rows.
function CopyBtn({ value, toast }) {
  const [done, setDone] = useState(false)
  const copy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(value))
      setDone(true)
      setTimeout(() => setDone(false), 1200)
    } catch (_) { toast?.('تعذّر النسخ') }
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

function InfoRow({ label, value, mono, copy, toast }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px dashed rgba(255,255,255,.07)', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 13, color: value ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600, direction: mono ? 'ltr' : 'rtl', fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'end', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={value || ''}>{value || '—'}</span>
        {copy && value && <CopyBtn value={value} toast={toast} />}
      </span>
    </div>
  )
}

function VisToggle({ on, locked, onClick }) {
  return (
    <button type="button" disabled={locked} onClick={onClick}
      style={{ width: 40, height: 22, borderRadius: 999, border: 'none', background: on ? C.ok : 'rgba(255,255,255,.15)', cursor: locked ? 'not-allowed' : 'pointer', position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, opacity: locked ? .5 : 1 }}>
      <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 3, right: on ? 3 : 21, transition: '.2s' }} />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PermissionsPanel — the full per-user control panel. For every sidebar
// tab it exposes four independent controls, all persisted to the DB:
//   1. إظهار التبويب   → users.ui_visibility[tabId]            (show/hide)
//   2. المكاتب         → users.ui_visibility['office:'+tabId]  (office scope)
//   3. الأزرار         → user_permissions grants per action     (effective role+user)
//   4. بطاقات التفاصيل → users.ui_visibility['card:'+tabId+':'+key] (per-card)
// The GM bypasses every check (App.jsx), so a GM account is shown read-only.
// ═══════════════════════════════════════════════════════════════════
const ACTION_DOT = { view: '#7f8c8d', create: C.ok, edit: C.blue, delete: C.red, special: C.gold }
const actionKind = (action) => action === 'view' || action === 'access' ? 'view'
  : action === 'create' ? 'create' : action === 'edit' ? 'edit' : action === 'delete' ? 'delete' : 'special'

function Seg({ value, options, onChange, disabled }) {
  return (
    <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 9, padding: 3, gap: 3 }}>
      {options.map(o => {
        const on = o.v === value
        return (
          <button key={o.v} type="button" disabled={disabled} onClick={() => onChange(o.v)}
            style={{ padding: '5px 11px', borderRadius: 7, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', background: on ? 'rgba(212,160,23,.16)' : 'transparent', color: on ? C.gold : 'var(--tx3)', transition: '.15s' }}>
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

// A single action button toggle (with effective-source hint).
function ActionRow({ p, on, source, locked, onToggle }) {
  const dot = ACTION_DOT[actionKind(p.action)] || C.gold
  const hint = source === 'role' ? 'مكتسبة من الدور' : source === 'user_grant' ? 'مخصصة لهذا المستخدم' : source === 'user_deny' ? 'موقوفة لهذا المستخدم' : ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', borderRadius: 9, background: on ? 'rgba(39,160,70,.05)' : 'rgba(255,255,255,.02)', border: '1px solid ' + (on ? 'rgba(39,160,70,.18)' : 'rgba(255,255,255,.05)'), transition: '.15s' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0, boxShadow: on ? `0 0 7px ${dot}99` : 'none' }} />
        <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? 'var(--tx)' : 'var(--tx3)' }}>{p.label_ar}</span>
          {hint && <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--tx5)' }}>{hint}</span>}
        </span>
      </span>
      <VisToggle on={on} locked={locked} onClick={onToggle} />
    </div>
  )
}

function PermissionsPanel({ sb, currentUser, u, branches, nav, hubTabs, modules, toast }) {
  const userIsGM = isGmUser(u)
  const [vis, setVis] = useState(() => ({ ...(u.ui_visibility || {}) }))
  const visRef = useRef(vis)
  const [eff, setEff] = useState(null)   // permId -> { is_granted, source }
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(() => new Set())   // expanded tab ids
  const [serviceTypes, setServiceTypes] = useState([]) // for the service-scope picker

  // Effective permissions for this user (role grants ∪ user overrides).
  useEffect(() => {
    let live = true
    sb.from('v_user_effective_permissions').select('permission_id,is_granted,source').eq('user_id', u.id)
      .then(({ data }) => { if (!live) return; const m = {}; (data || []).forEach(r => { m[r.permission_id] = { is_granted: r.is_granted, source: r.source } }); setEff(m) })
    return () => { live = false }
  }, [sb, u.id])

  // Service types (for the per-user invoice service-type scope control).
  useEffect(() => {
    let live = true
    sb.from('lookup_items').select('id,value_ar,value_en,category:lookup_categories!inner(category_key)')
      .eq('category.category_key', 'service_type')
      .then(({ data }) => { if (live) setServiceTypes(data || []) })
    return () => { live = false }
  }, [sb])

  const moduleByName = useMemo(() => { const m = {}; (modules || []).forEach(x => { m[x.module] = x }); return m }, [modules])
  const moduleForTab = (tabId) => moduleByName[catTabModule(tabId)] || null

  // ── writers ──
  const patchVis = async (patch) => {
    const next = { ...visRef.current, ...patch }
    visRef.current = next; setVis(next)
    const { error } = await sb.from('users').update({ ui_visibility: next, updated_at: new Date().toISOString() }).eq('id', u.id)
    if (error) toast('خطأ: ' + error.message.slice(0, 80))
  }
  // Everything is DENY-by-default: a control is granted only when its key === true.
  // Toggling flips between true (granted) and false (denied) — mirrors toggleTab.
  const toggleTab = (tabId) => patchVis({ [tabId]: !(visRef.current[tabId] === true) })
  const toggleCard = (tabId, key) => { const k = `card:${tabId}:${key}`; patchVis({ [k]: !(visRef.current[k] === true) }) }
  const toggleCardAct = (tabId, key, action) => { const k = `cardact:${tabId}:${key}:${action}`; patchVis({ [k]: !(visRef.current[k] === true) }) }
  // granular layer — fields (show + edit-lock), modals (open), wizard stages (show)
  const toggleField = (tabId, key) => { const k = `field:${tabId}:${key}`; patchVis({ [k]: !(visRef.current[k] === true) }) }
  const toggleFieldEdit = (tabId, key) => { const k = `fieldedit:${tabId}:${key}`; patchVis({ [k]: !(visRef.current[k] === true) }) }
  const toggleModal = (tabId, key) => { const k = `modal:${tabId}:${key}`; patchVis({ [k]: !(visRef.current[k] === true) }) }
  const toggleStage = (tabId, key) => { const k = `stage:${tabId}:${key}`; patchVis({ [k]: !(visRef.current[k] === true) }) }
  const setOffice = (tabId, policy) => patchVis({ [`office:${tabId}`]: policy })
  const setServiceScope = (tabId, policy) => patchVis({ [`svc:${tabId}`]: policy })
  const setStatsMode = (tabId, mode) => patchVis({ [`stats:${tabId}`]: mode })

  const togglePerm = async (p) => {
    if (busy || !eff) return
    const cur = eff[p.id] || { is_granted: false, source: 'none' }
    const isOn = cur.is_granted === true
    setBusy(true)
    try {
      if (isOn) {
        if (cur.source === 'role') {
          const { error } = await sb.from('user_permissions').upsert({ user_id: u.id, permission_id: p.id, is_granted: false, created_by: currentUser?.id || null }, { onConflict: 'user_id,permission_id' })
          if (error) throw error
          setEff(e => ({ ...e, [p.id]: { is_granted: false, source: 'user_deny' } }))
        } else {
          const { error } = await sb.from('user_permissions').delete().eq('user_id', u.id).eq('permission_id', p.id)
          if (error) throw error
          setEff(e => ({ ...e, [p.id]: { is_granted: false, source: 'none' } }))
        }
      } else {
        const { error } = await sb.from('user_permissions').upsert({ user_id: u.id, permission_id: p.id, is_granted: true, created_by: currentUser?.id || null }, { onConflict: 'user_id,permission_id' })
        if (error) throw error
        setEff(e => ({ ...e, [p.id]: { is_granted: true, source: 'user_grant' } }))
      }
    } catch (e) { toast('خطأ: ' + (e.message || '').slice(0, 80)) }
    setBusy(false)
  }

  // ── per-tab summary helpers ──
  const officePolicy = (tabId) => { const r = vis[`office:${tabId}`]; return (r && r.mode) ? r : { mode: 'inherit', ids: [] } }
  const officeLabel = (tabId) => { const p = officePolicy(tabId); return p.mode === 'all' ? 'كل المكاتب' : p.mode === 'specific' ? `${(p.ids || []).length} مكتب محدد` : 'مكاتب الحساب' }
  const grantedCount = (tabId) => { const mod = moduleForTab(tabId); if (!mod || !eff) return [0, 0]; const on = mod.perms.filter(p => eff[p.id]?.is_granted).length; return [on, mod.perms.length] }
  // deny-by-default: a card counts as shown only when explicitly granted (=== true).
  const hiddenCards = (tabId) => (TAB_CARDS[tabId] || []).filter(c => vis[`card:${tabId}:${c.key}`] !== true).length

  const totalShown = (nav || []).reduce((acc, n) => {
    const leaves = hubTabs?.[n.id]
    if (leaves) return acc + leaves.filter(t => vis[t.id] === true).length
    return acc + (vis[n.id] === true ? 1 : 0)
  }, 0)

  // ── one tab's expandable control block ──
  const TabBlock = (tab) => {
    const id = tab.id
    const label = tab.l || tab.label
    const mod = moduleForTab(id)
    const cards = TAB_CARDS[id] || []
    const shown = vis[id] === true
    const isOpen = open.has(id)
    const [gOn, gTot] = grantedCount(id)
    const pol = officePolicy(id)
    const svcPol = (vis[`svc:${id}`] && vis[`svc:${id}`].mode) ? vis[`svc:${id}`] : { mode: 'all', ids: [] }
    const statMode = vis[`stats:${id}`] || 'real'
    return (
      <div key={id} style={{ borderRadius: 11, background: 'rgba(255,255,255,.015)', border: '1px solid rgba(255,255,255,.05)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <button type="button" onClick={() => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', color: 'var(--tx4)', transition: '.2s', transform: isOpen ? 'rotate(-90deg)' : 'none' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })}>
            <span style={{ fontSize: 13, fontWeight: 700, color: shown ? 'var(--tx)' : 'var(--tx3)' }}>{label}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10, fontWeight: 600, color: 'var(--tx5)', flexWrap: 'wrap' }}>
              {gTot > 0 && <span><span style={{ color: gOn ? C.ok : 'var(--tx5)' }}>{gOn}</span>/{gTot} صلاحية</span>}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Building2 size={9} />{officeLabel(id)}</span>
              {cards.length > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Layers size={9} />{cards.length - hiddenCards(id)}/{cards.length} كرت</span>}
            </span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            {shown ? <Eye size={13} color={C.ok} /> : <EyeOff size={13} color="var(--tx5)" />}
            <VisToggle on={shown} locked={busy || userIsGM} onClick={() => toggleTab(id)} />
          </span>
        </div>
        {/* body */}
        {isOpen && (
          <div style={{ padding: '4px 14px 14px', display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            {/* offices */}
            <div style={{ paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Building2 size={13} color={C.gold} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)' }}>المكاتب المسموح بها</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <Seg value={pol.mode} disabled={busy || userIsGM}
                  onChange={(m) => setOffice(id, { mode: m, ids: m === 'specific' ? (pol.ids || []) : [] })}
                  options={[{ v: 'inherit', l: 'مكاتب الحساب' }, { v: 'all', l: 'كل المكاتب' }, { v: 'specific', l: 'مكاتب محددة' }]} />
                {pol.mode === 'specific' && (
                  <MultiSelect placeholder="اختر المكاتب…" value={pol.ids || []}
                    onChange={(ids) => setOffice(id, { mode: 'specific', ids })}
                    options={branches || []} getKey={b => b.id} getLabel={b => b.branch_code} />
                )}
                {pol.mode === 'inherit' && <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>يستخدم المكاتب المسندة للحساب افتراضياً.</span>}
              </div>
            </div>
            {/* service-type scope (which service types this user may see) */}
            {TAB_SERVICE_SCOPE.includes(id) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <Layers size={13} color={C.gold} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)' }}>أنواع الخدمات المسموح بها</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <Seg value={svcPol.mode} disabled={busy || userIsGM}
                    onChange={(m) => setServiceScope(id, { mode: m, ids: m === 'specific' ? (svcPol.ids || []) : [] })}
                    options={[{ v: 'all', l: 'كل الأنواع' }, { v: 'specific', l: 'أنواع محددة' }]} />
                  {svcPol.mode === 'specific' && (
                    <MultiSelect placeholder="اختر أنواع الخدمات…" value={svcPol.ids || []}
                      onChange={(ids) => setServiceScope(id, { mode: 'specific', ids })}
                      options={serviceTypes} getKey={s => s.id} getLabel={s => s.value_ar || s.value_en} />
                  )}
                  {svcPol.mode === 'all' && <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>يرى فواتير كل أنواع الخدمات.</span>}
                </div>
              </div>
            )}
            {/* stat-cards mode (real / always-zero / hidden) */}
            {TAB_STATS_MODE.includes(id) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <SlidersHorizontal size={13} color={C.gold} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)' }}>كروت الإحصاء</span>
                </div>
                <Seg value={statMode} disabled={busy || userIsGM} onChange={(m) => setStatsMode(id, m)}
                  options={[{ v: 'real', l: 'أرقام حقيقية' }, { v: 'zero', l: 'أصفار دائماً' }, { v: 'hidden', l: 'مخفية' }]} />
                {statMode === 'zero' && <span style={{ display: 'block', marginTop: 7, fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>تظهر الكروت لكن بقيم صفرية (الأرقام أصلاً محصورة في مكاتب/خدمات المستخدم عبر قاعدة البيانات).</span>}
              </div>
            )}
            {/* actions */}
            {mod && mod.perms.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <MousePointerClick size={13} color={C.gold} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)' }}>الأزرار والصلاحيات</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 7 }}>
                  {mod.perms.map(p => (
                    <ActionRow key={p.id} p={p} on={!!eff?.[p.id]?.is_granted} source={eff?.[p.id]?.source}
                      locked={busy || userIsGM} onToggle={() => togglePerm(p)} />
                  ))}
                </div>
              </div>
            )}
            {/* cards (+ their fields) */}
            {cards.length > 0 && <CardsSection tabId={id} cards={cards} fields={TAB_FIELDS[id] || []} vis={vis} disabled={busy || userIsGM} onToggle={toggleCard} onToggleAct={toggleCardAct} onToggleField={toggleField} onToggleFieldEdit={toggleFieldEdit} />}
            {/* wizard stages (+ their fields) */}
            {(TAB_STAGES[id] || []).length > 0 && <StagesSection tabId={id} stages={TAB_STAGES[id]} fields={TAB_FIELDS[id] || []} vis={vis} disabled={busy || userIsGM} onToggleStage={toggleStage} onToggleField={toggleField} onToggleFieldEdit={toggleFieldEdit} />}
            {/* modals / popups */}
            {(TAB_MODALS[id] || []).length > 0 && <ModalsSection tabId={id} modals={TAB_MODALS[id]} vis={vis} disabled={busy || userIsGM} onToggleModal={toggleModal} />}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
        <span style={cardTitle}>الصلاحيات والتحكم</span>
        <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx5)', fontWeight: 600 }}>{totalShown} تبويب ظاهر</span>
      </div>
      {userIsGM ? (
        <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldCheck size={20} color={C.gold} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>مدير عام — صلاحية كاملة</div>
            <div style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600, marginTop: 3 }}>يملك هذا المستخدم كل الصلاحيات على جميع التبويبات والمكاتب تلقائياً.</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!eff && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} w="100%" h={52} r={11} />)}</div>}
          {eff && (nav || []).map(n => {
            const leaves = hubTabs?.[n.id] || null
            const hubOn = vis[n.id] === true
            return (
              <div key={n.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--tx2)' }}>{n.l}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    {hubOn ? <Eye size={13} color={C.ok} /> : <EyeOff size={13} color="var(--tx5)" />}
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: hubOn ? 'var(--tx3)' : 'var(--tx5)' }}>{leaves ? 'إظهار القسم' : 'إظهار التبويب'}</span>
                    <VisToggle on={hubOn} locked={busy} onClick={() => toggleTab(n.id)} />
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingInlineStart: leaves ? 6 : 0 }}>
                  {(leaves || [{ id: n.id, l: n.l }]).map(t => TabBlock(t))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Compact mini toggle for per-card action buttons.
function MiniToggle({ on, locked, onClick }) {
  return (
    <button type="button" disabled={locked} onClick={onClick}
      style={{ width: 30, height: 17, borderRadius: 999, border: 'none', background: on ? C.ok : 'rgba(255,255,255,.15)', cursor: locked ? 'not-allowed' : 'pointer', position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, opacity: locked ? .5 : 1 }}>
      <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#fff', top: 2.5, right: on ? 2.5 : 15.5, transition: '.2s' }} />
    </button>
  )
}

// A field list rendered inside a card/stage tile: one row per field with an
// "إظهار" (visibility) toggle and, for editable fields, a "تعديل" (edit-lock)
// toggle. A hidden field implicitly can't be edited (its edit toggle locks off).
function FieldList({ tabId, groupKey, fields, vis, disabled, parentShown, onToggleField, onToggleFieldEdit }) {
  const list = (fields || []).filter(f => f.group === groupKey)
  if (!list.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 7, borderTop: '1px dashed rgba(255,255,255,.07)', opacity: parentShown ? 1 : .4 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
        <SlidersHorizontal size={9} color="var(--tx5)" />
        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--tx5)' }}>الحقول</span>
      </div>
      {list.map(f => {
        const fVis = vis[`field:${tabId}:${f.key}`] === true
        const fEdit = vis[`fieldedit:${tabId}:${f.key}`] === true
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: fVis ? C.blue : 'var(--tx5)', flexShrink: 0 }} />
              <span title={f.label_ar} style={{ fontSize: 11, fontWeight: 600, color: fVis ? 'var(--tx2)' : 'var(--tx5)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label_ar}</span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
              {f.edit && (
                <span title="السماح بتعديل الحقل" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Pencil size={9} color={fEdit && fVis ? C.gold : 'var(--tx5)'} />
                  <MiniToggle on={fEdit && fVis} locked={disabled || !fVis} onClick={() => onToggleFieldEdit(tabId, f.key)} />
                </span>
              )}
              <span title="إظهار الحقل" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Eye size={9} color={fVis ? C.ok : 'var(--tx5)'} />
                <MiniToggle on={fVis} locked={disabled} onClick={() => onToggleField(tabId, f.key)} />
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Per-card visibility + per-card action buttons + per-field controls. Each card
// is a tile: a show/hide toggle for the card, a toggle for every action button
// inside it (edit/add/delete/special), and a row per field (show + edit-lock).
function CardsSection({ tabId, cards, fields, vis, disabled, onToggle, onToggleAct, onToggleField, onToggleFieldEdit }) {
  const groups = useMemo(() => {
    const g = {}
    cards.forEach(c => { const key = c.group || 'core'; (g[key] = g[key] || []).push(c) })
    return g
  }, [cards])
  const groupKeys = Object.keys(groups)
  const multiGroup = groupKeys.length > 1
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Layers size={13} color={C.gold} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)' }}>بطاقات صفحة التفاصيل</span>
        <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 600 }}>رؤية كل كرت وأزراره وحقوله</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groupKeys.map(gk => (
          <div key={gk}>
            {multiGroup && <div style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, marginBottom: 6, opacity: .85 }}>{CARD_GROUP_LABELS[gk] || gk}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))', gap: 8, alignItems: 'start' }}>
              {groups[gk].map(c => {
                const shown = vis[`card:${tabId}:${c.key}`] === true
                const acts = c.actions || []
                return (
                  <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 11px', borderRadius: 10, background: shown ? 'rgba(255,255,255,.02)' : 'rgba(192,57,43,.05)', border: '1px solid ' + (shown ? 'rgba(255,255,255,.06)' : 'rgba(192,57,43,.16)') }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        {shown ? <Eye size={12} color={C.ok} /> : <EyeOff size={12} color="var(--tx5)" />}
                        <span style={{ fontSize: 12, fontWeight: 700, color: shown ? 'var(--tx)' : 'var(--tx4)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.label_ar}>{c.label_ar}</span>
                      </span>
                      <VisToggle on={shown} locked={disabled} onClick={() => onToggle(tabId, c.key)} />
                    </div>
                    {acts.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingTop: 7, borderTop: '1px dashed rgba(255,255,255,.07)', opacity: shown ? 1 : .45 }}>
                        {acts.map(a => {
                          const aOn = vis[`cardact:${tabId}:${c.key}:${a.action}`] === true
                          const dot = ACTION_DOT[a.kind] || C.gold
                          return (
                            <div key={a.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: aOn ? 'var(--tx2)' : 'var(--tx5)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.label_ar}>{a.label_ar}</span>
                              </span>
                              <MiniToggle on={aOn} locked={disabled} onClick={() => onToggleAct(tabId, c.key, a.action)} />
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <FieldList tabId={tabId} groupKey={c.key} fields={fields} vis={vis} disabled={disabled} parentShown={shown} onToggleField={onToggleField} onToggleFieldEdit={onToggleFieldEdit} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Wizard stages — one tile per step (show/hide) with its own fields beneath.
function StagesSection({ tabId, stages, fields, vis, disabled, onToggleStage, onToggleField, onToggleFieldEdit }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Wand2 size={13} color={C.gold} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)' }}>مراحل الحاسبة</span>
        <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 600 }}>رؤية كل مرحلة وحقولها</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(232px,1fr))', gap: 8, alignItems: 'start' }}>
        {stages.map(s => {
          const shown = vis[`stage:${tabId}:${s.key}`] === true
          return (
            <div key={s.key} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 11px', borderRadius: 10, background: shown ? 'rgba(255,255,255,.02)' : 'rgba(192,57,43,.05)', border: '1px solid ' + (shown ? 'rgba(255,255,255,.06)' : 'rgba(192,57,43,.16)') }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  {shown ? <Eye size={12} color={C.ok} /> : <EyeOff size={12} color="var(--tx5)" />}
                  <span style={{ fontSize: 12, fontWeight: 700, color: shown ? 'var(--tx)' : 'var(--tx4)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.label_ar}>{s.label_ar}</span>
                </span>
                <VisToggle on={shown} locked={disabled} onClick={() => onToggleStage(tabId, s.key)} />
              </div>
              <FieldList tabId={tabId} groupKey={s.key} fields={fields} vis={vis} disabled={disabled} parentShown={shown} onToggleField={onToggleField} onToggleFieldEdit={onToggleFieldEdit} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Modals / popups — one tile per popup with an open/use toggle.
function ModalsSection({ tabId, modals, vis, disabled, onToggleModal }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <AppWindow size={13} color={C.gold} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)' }}>النوافذ المنبثقة</span>
        <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 600 }}>السماح بفتح كل نافذة</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 7 }}>
        {modals.map(m => {
          const on = vis[`modal:${tabId}:${m.key}`] === true
          return (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', borderRadius: 9, background: on ? 'rgba(255,255,255,.02)' : 'rgba(192,57,43,.05)', border: '1px solid ' + (on ? 'rgba(255,255,255,.05)' : 'rgba(192,57,43,.16)') }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <AppWindow size={11} color={on ? C.gold : 'var(--tx5)'} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? 'var(--tx2)' : 'var(--tx5)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.label_ar}>{m.label_ar}</span>
              </span>
              <MiniToggle on={on} locked={disabled} onClick={() => onToggleModal(tabId, m.key)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// EmployeeInfoCards — three standalone stacked cards (الهوية / بيانات العمل
// / بيانات الدخول) for the detail page sidebar. `fields` is the shared field
// list; `pwNode` is the interactive password control.
// ═══════════════════════════════════════════════════════════════════
// One employee-info card (header + label/value rows). `headerAction` is the
// edit button or activation toggle; `pwNode` (optional) appends a password row.
function InfoSectionCard({ title, items, pwNode, headerAction }) {
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
        <span style={cardTitle}>{title}</span>
        {headerAction}
      </div>
      <div style={{ padding: '6px 22px 12px' }}>
        {items.map((f, i) => {
          const withBorder = i < items.length - 1 || pwNode
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: f.chips ? 'flex-start' : 'center', gap: 12, padding: '9px 0', borderBottom: withBorder ? '1px dashed rgba(255,255,255,.07)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0, paddingTop: f.chips ? 3 : 0 }}>{f.label}</span>
              {f.chips ? (
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', flex: 1, minWidth: 0 }}>
                  {f.chips.length ? f.chips.map((c, ci) => (
                    <span key={ci} style={{ fontSize: 13, fontWeight: 700, color: C.gold, fontFamily: 'monospace', direction: 'ltr', whiteSpace: 'nowrap' }}>{c}</span>
                  )) : <span style={{ fontSize: 13, color: 'var(--tx5)', fontWeight: 600 }}>—</span>}
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  {f.copy && f.value && <CopyBtn value={f.value} toast={f.toast} />}
                  <span style={{ fontSize: 13, color: f.value ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600, direction: f.mono ? 'ltr' : 'rtl', fontFamily: f.mono ? 'monospace' : 'inherit', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.value || ''}>{f.value || '—'}</span>
                </span>
              )}
            </div>
          )
        })}
        {pwNode && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0' }}>
            <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>كلمة المرور</span>
            {pwNode}
          </div>
        )}
      </div>
    </div>
  )
}

// Header actions for the cards.
function EditAction({ onEdit }) {
  return (
    <button onClick={onEdit}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s ease, border-color .15s ease' }}>
      تعديل
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
    </button>
  )
}
function ActiveToggleAction({ isActive, isMe, busy, onToggleActive }) {
  return (
    <div style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? C.ok : 'var(--tx5)' }}>{isActive ? 'نشط' : 'معطّل'}</span>
      <button type="button" disabled={isMe || busy} onClick={onToggleActive} title={isMe ? 'لا يمكنك تعطيل حسابك' : (isActive ? 'تعطيل الحساب' : 'تفعيل الحساب')}
        style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: isActive ? `linear-gradient(180deg, ${C.ok} 0%, #1f8a3a 100%)` : 'linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.10) 100%)', cursor: (isMe || busy) ? 'not-allowed' : 'pointer', opacity: (isMe || busy) ? .55 : 1, position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, boxShadow: isActive ? `0 2px 8px ${C.ok}44, inset 0 1px 0 rgba(255,255,255,.15)` : 'inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.18)' }}>
        <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, right: isActive ? 3 : 23, transition: '.2s', boxShadow: '0 2px 4px rgba(0,0,0,.3)' }} />
      </button>
    </div>
  )
}

// Back button — minimal outline; turns solid white on hover. Arrow points
// right (→) for RTL "back".
function UserDetailPage({ sb, currentUser, toast, lang, u, branches, roles, nationalities, modules, grants, nav, hubTabs, allUsers, onBack, onChanged }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pwShown, setPwShown] = useState(false)
  const name = u.person?.name_ar || u.person?.name_en || '—'
  const isMe = u.id === currentUser?.id
  const isActive = u.is_active === true
  const accent = u.role?.color || C.gold
  const initial = (name || '—').trim().charAt(0)
  const natName = nationalities.find(n => n.id === u.person?.nationality_id)?.name_ar || '—'

  // The full permissions control panel lives in <PermissionsPanel> below — it
  // manages per-tab visibility, per-tab office scope, action grants and per-card
  // visibility, all persisted to the DB (user_permissions + users.ui_visibility).

  // Activate / deactivate the account (الهوية card header toggle).
  const toggleActive = async () => {
    if (isMe) { toast('لا يمكنك تعطيل حسابك'); return }
    const next = !isActive
    // Last-GM safety: never deactivate the final active General Manager.
    if (!next && (u.role?.name_ar === 'المدير العام' || u.role?.name_en === 'General Manager')) {
      const activeGMs = (allUsers || []).filter(x => x.is_active && (x.role?.name_ar === 'المدير العام' || x.role?.name_en === 'General Manager'))
      if (activeGMs.length <= 1) { toast('لا يمكن تعطيل آخر مدير عام نشط'); return }
    }
    setBusy(true)
    const { error } = await sb.from('users').update({ is_active: next, updated_at: new Date().toISOString() }).eq('id', u.id)
    setBusy(false)
    if (error) { toast('خطأ: ' + error.message.slice(0, 80)); return }
    toast(next ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب')
    await onChanged?.()
  }

  // Field descriptors shared by every card design variant.
  const phoneLocal = u.personal_phone ? String(u.personal_phone).replace(/^\+?966/, '0') : ''
  // Show every assigned office (branch_ids), not just the primary one — as chips.
  const branchList = (u.branch_ids && u.branch_ids.length)
    ? u.branch_ids.map(id => branches.find(b => b.id === id)?.branch_code).filter(Boolean)
    : (u.branch?.branch_code ? [u.branch.branch_code] : [])
  const branchCodes = branchList.join('، ')
  // The General Manager isn't tied to an office, so hide the office field.
  const isGMRole = u.role?.name_ar === 'المدير العام' || u.role?.name_en === 'General Manager'
  const infoFields = [
    { label: 'الاسم (بالعربي)', value: u.person?.name_ar, icon: User },
    { label: 'الاسم (بالإنجليزي)', value: u.person?.name_en, mono: true, icon: User },
    { label: 'رقم الهوية', value: u.person?.id_number, mono: true, copy: true, icon: CreditCard },
    { label: 'الجنسية', value: natName, icon: Globe },
    { label: 'الدور', value: u.role?.name_ar, icon: ShieldCheck },
    isGMRole ? null : { label: 'المكتب', value: branchCodes, chips: branchList, mono: true, icon: Building2 },
    { label: 'رقم الجوال', value: phoneLocal, mono: true, copy: true, icon: Phone },
    { label: 'البريد الإلكتروني', value: u.email, mono: true, copy: true, icon: Mail },
  ].filter(Boolean).map(f => ({ ...f, toast }))

  // Password value — display only (show/hide + copy). Changing it happens in WorkInfoModal.
  const pwValueNode = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {u.plain_password ? (
        <>
          <CopyBtn value={u.plain_password} toast={toast} />
          <button type="button" onClick={() => setPwShown(s => !s)} title={pwShown ? 'إخفاء' : 'إظهار'}
            style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {pwShown ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
          <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 600, color: 'var(--tx2)', direction: 'ltr', letterSpacing: pwShown ? '.5px' : '2px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pwShown ? u.plain_password : ''}>
            {pwShown ? u.plain_password : '••••••••'}
          </span>
        </>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600 }}>غير متوفرة</span>
      )}
    </div>
  )

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 48, color: 'var(--tx2)', direction: 'rtl' }}>
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <BackButton onBack={onBack} />
      </div>

      {/* Header — icon + name title + tags (matches InvoiceDetailPage) */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{name}</div>
          {u.role && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: accent + '20', color: accent }}>{u.role.name_ar}</span>}
          {isMe && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(212,160,23,.14)', color: C.gold, letterSpacing: '.3px' }}>أنت</span>}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>عرض بيانات المستخدم وتعديلها، والتحكم بصلاحياته وحالة حسابه.</div>
      </div>

      <div className="usrd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        <style>{`@media (max-width:900px){.usrd-grid{grid-template-columns:1fr !important}.usrd-side,.usrd-main{grid-column:auto !important;position:static !important}}`}</style>

        {/* Right column — بيانات العمل (top) + permissions (below) */}
        <div className="usrd-main" style={{ gridColumn: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InfoSectionCard title="بيانات العمل" items={infoFields.slice(4, 8)} pwNode={pwValueNode}
            headerAction={<EditAction onEdit={() => setEditing(true)} />} />
          {/* Permissions — full control panel (visibility · offices · actions · cards) */}
          <PermissionsPanel sb={sb} currentUser={currentUser} u={u} branches={branches}
            nav={nav} hubTabs={hubTabs} modules={modules} toast={toast} />
        </div>

        {/* Left column — الهوية (sticky) */}
        <div className="usrd-side" style={{ gridColumn: 2, position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InfoSectionCard title="الهوية" items={infoFields.slice(0, 4)}
            headerAction={<ActiveToggleAction isActive={isActive} isMe={isMe} busy={busy} onToggleActive={toggleActive} />} />
        </div>
      </div>

      {editing && <WorkInfoModal sb={sb} user={u} branches={branches} roles={roles} toast={toast} onClose={() => setEditing(false)} onSaved={async () => { setEditing(false); await onChanged?.() }} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// WorkInfoModal — edit just the work fields (role, office, phone, email).
// FormKit edit modal (cyan): one ModalSection, in-modal SuccessView.
// ═══════════════════════════════════════════════════════════════════
function WorkInfoModal({ sb, user, branches, roles, toast, onClose, onSaved }) {
  const [f, setF] = useState({
    role_id: user.role_id || '',
    branch_ids: (user.branch_ids && user.branch_ids.length) ? user.branch_ids : (user.primary_branch_id ? [user.primary_branch_id] : []),
    personal_phone: (user.personal_phone || '').replace(/^\+?966/, '').replace(/^0/, ''),
    email: (user.email || '').split('@')[0],
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false) // in-modal success view (FormKit success= prop)
  const [errMsg, setErrMsg] = useState('') // inline error shown in the footer (no toast)
  const set = (k, v) => { setErrMsg(''); setF(p => ({ ...p, [k]: v })) }

  // The General Manager isn't tied to an office — hide the office field for that role.
  const selRole = roles.find(r => r.id === f.role_id)
  const isGM = selRole?.name_ar === 'المدير العام' || selRole?.name_en === 'General Manager'

  // Success view auto-closes (and refreshes the detail page) after a short beat.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onSaved?.(), 1400)
    return () => clearTimeout(t)
  }, [done])

  const save = async () => {
    if (!f.role_id) { setErrMsg('الدور مطلوب'); return }
    // GM has no office; everyone else must have at least one.
    const branchIds = isGM ? [] : f.branch_ids
    if (!isGM && !branchIds.length) { setErrMsg('المكتب مطلوب'); return }
    const phone9 = (f.personal_phone || '').replace(/\D/g, '')
    if (phone9 && phone9.length !== 9) { setErrMsg('رقم الجوال يجب أن يكون 9 أرقام بعد +966'); return }
    const newPw = (f.password || '').trim()
    if (newPw && newPw.length < 6) { setErrMsg('كلمة المرور 6 أحرف على الأقل'); return }
    const localPart = (f.email || '').trim().toLowerCase()
    if (localPart && !/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(localPart)) { setErrMsg('البريد الإلكتروني غير صحيح'); return }
    const email = localPart ? localPart + EMAIL_DOMAIN : null
    setSaving(true)
    // Mobile number must stay unique across accounts.
    if (phone9) {
      const { data: dupPhone } = await sb.from('users').select('id').eq('personal_phone', '+966' + phone9).neq('id', user.id).is('deleted_at', null).limit(1)
      if (dupPhone?.length) { setErrMsg('رقم الجوال مسجّل مسبقاً'); setSaving(false); return }
    }
    // Email is changed via the edge function (keeps auth + profile in sync), so it's excluded here.
    const { data, error } = await sb.from('users').update({
      role_id: f.role_id,
      primary_branch_id: branchIds[0] || null,
      branch_ids: branchIds,
      personal_phone: phone9 ? '+966' + phone9 : null,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id).select()
    if (error) { setErrMsg(error.message.slice(0, 100)); setSaving(false); return }
    if ((data || []).length === 0) { setErrMsg('لم يتم الحفظ — ليست لديك صلاحية كافية'); setSaving(false); return }
    // Email change — updates the auth login email too (so the user can sign in with it).
    if (email && (user.email || '') !== email) {
      const { data: emData, error: emErr } = await sb.functions.invoke('admin-set-email', { body: { user_id: user.id, email } })
      let emMsg = ''
      if (emErr) { emMsg = emErr.message; try { const j = await emErr.context.json(); if (j?.error?.message) emMsg = j.error.message } catch (_) {} }
      else if (emData && emData.ok === false) { emMsg = emData.error?.message || 'تعذّر تغيير البريد الإلكتروني' }
      if (emMsg) { setErrMsg('تم حفظ البيانات لكن تعذّر تغيير البريد: ' + emMsg); setSaving(false); return }
    }
    // Optional password change — only when the GM entered a new one.
    if (newPw) {
      const { data: pwData, error: pwErr } = await sb.functions.invoke('admin-set-password', { body: { user_id: user.id, password: newPw } })
      let pwMsg = ''
      if (pwErr) { pwMsg = pwErr.message; try { const j = await pwErr.context.json(); if (j?.error?.message) pwMsg = j.error.message } catch (_) {} }
      else if (pwData && pwData.ok === false) { pwMsg = pwData.error?.message || 'تعذّر تغيير كلمة المرور' }
      if (pwMsg) { setErrMsg('تم حفظ البيانات لكن تعذّر تغيير كلمة المرور: ' + pwMsg); setSaving(false); return }
    }
    setSaving(false)
    setDone(true)
  }

  return (
    <FKModal open onClose={done ? () => onSaved?.() : onClose} variant="edit" width={560}
      title="تعديل بيانات المستخدم" Icon={ShieldCheck} errorMsg={errMsg}
      success={done ? <SuccessView title="تم تعديل البيانات بنجاح" /> : null}
      footer={<ActionButton onClick={save} disabled={saving}>{saving ? 'جارٍ التعديل…' : 'تعديل'}</ActionButton>}>
      <ModalSection Icon={User} label="بيانات العمل">
        <div style={GRID}>
          <Select label="الدور" req placeholder="— اختر —"
            value={f.role_id} onChange={v => set('role_id', v)}
            options={roles.filter(r => ASSIGNABLE_ROLES.includes(r.name_ar) || r.id === f.role_id)}
            getKey={r => r.id} getLabel={r => r.name_ar} />
          {!isGM && (
            <MultiSelect label="المكتب" req hint="يمكن اختيار أكثر من مكتب" placeholder="— اختر —"
              value={f.branch_ids} onChange={v => set('branch_ids', v)}
              options={branches} getKey={b => b.id} getLabel={b => b.branch_code} />
          )}
          <PhoneField label="رقم الجوال" value={f.personal_phone} onChange={v => set('personal_phone', v)} />
          <TextField label="البريد الإلكتروني" hint={EMAIL_DOMAIN} dir="ltr" placeholder="name" full={isGM}
            value={f.email} onChange={v => set('email', (v || '').toLowerCase().replace(/[^a-z0-9._-]/g, ''))} />
          <div style={FULL}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <Lbl hint="اتركها فارغة لعدم التغيير">كلمة المرور</Lbl>
              <PwSuggestBtn onClick={() => set('password', genPassword())} />
            </div>
            <TextField dir="ltr" placeholder="كلمة مرور جديدة" value={f.password} onChange={v => set('password', v)} />
          </div>
        </div>
      </ModalSection>
    </FKModal>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Drop — portal dropdown that matches the invoice-modal field look
// (gold chevron, search when long, centered value). No longer used in
// this file (modals moved to FormKit Select) — kept exported for
// ClientsPage / AgentsPage which still import it.
// ═══════════════════════════════════════════════════════════════════
export function Drop({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [q, setQ] = useState('')
  const btnRef = useRef(null)
  const selected = options.find(o => o.v === value)
  const filtered = q ? options.filter(o => (o.l || '').toLowerCase().includes(q.toLowerCase())) : options
  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 16
    setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxH: Math.max(160, Math.min(260, below)) })
  }, [open])
  const pick = v => { onChange(v); setOpen(false); setQ('') }
  return (
    <>
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', height: 42, padding: '0 34px', borderRadius: 9, cursor: 'pointer',
          border: `1px solid ${open ? 'rgba(212,160,23,.45)' : 'transparent'}`,
          background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
          color: selected ? 'var(--tx)' : 'var(--tx5)', fontFamily: F, fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8, position: 'relative', outline: 'none', boxSizing: 'border-box', transition: '.2s' }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selected?.l || placeholder || '—'}</span>
        <ChevronDown size={13} color={C.gold} strokeWidth={2.5}
          style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }} />
      </button>
      {open && pos && ReactDOM.createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1998 }} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: 'var(--modal-input-bg)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, maxHeight: pos.maxH, zIndex: 1999, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,.75)', direction: 'rtl', fontFamily: F }}>
            {options.length > 6 && (
              <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                  style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, background: 'var(--modal-bg)', fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
              </div>
            )}
            <div className="nu-drop-scroll" style={{ flex: 1, overflowY: 'auto' }}>
              <style>{`.nu-drop-scroll::-webkit-scrollbar{width:0;display:none}.nu-drop-scroll{scrollbar-width:none}`}</style>
              {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>لا توجد نتائج</div>}
              {filtered.map(o => {
                const sel = o.v === value
                return (
                  <div key={o.v} onClick={() => pick(o.v)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: sel ? 800 : 600, color: sel ? C.gold : 'rgba(255,255,255,.92)', background: sel ? 'rgba(212,160,23,.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,.03)', textAlign: 'center' }}
                    onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
                    onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>
                    {o.l}
                  </div>
                )
              })}
            </div>
          </div>
        </>, document.body)}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MultiDrop — same look as Drop but allows picking several options. The
// trigger shows the selected items as chips; the list stays open while
// toggling. Used for assigning a user to more than one office.
// ═══════════════════════════════════════════════════════════════════
export function MultiDrop({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [q, setQ] = useState('')
  const btnRef = useRef(null)
  const sel = new Set(value || [])
  const chosen = options.filter(o => sel.has(o.v))
  const filtered = q ? options.filter(o => (o.l || '').toLowerCase().includes(q.toLowerCase())) : options
  useEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 16
    setPos({ top: r.bottom + 4, left: r.left, width: r.width, maxH: Math.max(160, Math.min(260, below)) })
  }, [open])
  const toggle = (v) => { const next = new Set(sel); next.has(v) ? next.delete(v) : next.add(v); onChange([...next]) }
  const primary = chosen[0]
  return (
    <>
      {/* Compact single-line trigger: primary office + a +N badge. The full list
          (with add/remove) lives in the dropdown so the field never grows or scrolls. */}
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', height: 42, padding: '0 34px 0 12px', borderRadius: 9, cursor: 'pointer',
          border: `1px solid ${open ? 'rgba(212,160,23,.45)' : 'transparent'}`,
          background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
          color: 'var(--tx)', fontFamily: F, fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 7, position: 'relative', outline: 'none', boxSizing: 'border-box', justifyContent: chosen.length ? 'flex-start' : 'center', overflow: 'hidden', transition: '.2s' }}>
        {chosen.length === 0
          ? <span style={{ flex: 1, textAlign: 'center', color: 'var(--tx5)' }}>{placeholder || '—'}</span>
          : (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: 'rgba(212,160,23,.14)', border: '1px solid rgba(212,160,23,.3)', color: C.gold, fontSize: 11.5, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {primary.l}
                <span style={{ fontSize: 8.5, fontWeight: 700, opacity: .75 }}>رئيسي</span>
                <span onClick={e => { e.stopPropagation(); toggle(primary.v) }} style={{ cursor: 'pointer', display: 'inline-flex' }}><X size={11} /></span>
              </span>
              {chosen.length > 1 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', flexShrink: 0 }}>+{chosen.length - 1} مكتب</span>
              )}
            </>
          )}
        <ChevronDown size={13} color={C.gold} strokeWidth={2.5}
          style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }} />
      </button>
      {open && pos && ReactDOM.createPortal(
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1998 }} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: 'var(--modal-input-bg)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, maxHeight: pos.maxH, zIndex: 1999, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,.75)', direction: 'rtl', fontFamily: F }}>
            {options.length > 6 && (
              <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                  style={{ width: '100%', height: 32, padding: '0 10px', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, background: 'var(--modal-bg)', fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
              </div>
            )}
            <div className="nu-drop-scroll" style={{ flex: 1, overflowY: 'auto' }}>
              <style>{`.nu-drop-scroll::-webkit-scrollbar{width:0;display:none}.nu-drop-scroll{scrollbar-width:none}`}</style>
              {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>لا توجد نتائج</div>}
              {filtered.map(o => {
                const on = sel.has(o.v)
                return (
                  <div key={o.v} onClick={() => toggle(o.v)}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, fontWeight: on ? 800 : 600, color: on ? C.gold : 'rgba(255,255,255,.92)', background: on ? 'rgba(212,160,23,.1)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', gap: 10 }}
                    onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
                    onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}>
                    <span style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0, border: on ? '1px solid ' + C.gold : '1.5px solid rgba(255,255,255,.18)', background: on ? C.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <Check size={12} color="#000" strokeWidth={3} />}
                    </span>
                    <span style={{ flex: 1 }}>{o.l}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>, document.body)}
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════
// NewUserModal — GM-only: register a brand-new staff account from inside
// the app. Two-step wizard styled like the invoice action modal (top bar,
// step progress, bottom nav bar). Calls the `admin-create-user` edge
// function which creates the auth user with NO confirmation email; the
// account starts inactive and is activated from the Users list.
// ═══════════════════════════════════════════════════════════════════
// On entering step 2, pre-fill a suggested email + generated password (only if
// blank) — preserves NewUserModal's old goStep2 side-effect under FormKit pages.
function Step2Init({ f, setF }) {
  useEffect(() => {
    setF(p => {
      const next = { ...p }
      if (!next.email) next.email = emailLocalFromName(next.name_en || next.name_ar)
      if (!next.password) { const pw = genPassword(); next.password = pw; next.password2 = pw }
      return next
    })
  }, [])
  return null
}

function NewUserModal({ sb, toast, branches, roles, nationalities, onClose, onSaved }) {
  const employeeRole = roles.find(r => r.name_ar === 'موظف' || r.name_en === 'Employee')
  const [f, setF] = useState({
    name_ar: '', name_en: '', id_number: '', nationality_id: '',
    role_id: employeeRole?.id || '', branch_ids: [],
    personal_phone: '', email: '', password: '', password2: '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false) // in-modal success view after creating the account
  const [errMsg, setErrMsg] = useState('') // inline error shown in the footer (no toast)
  const set = (k, v) => { setErrMsg(''); setF(p => ({ ...p, [k]: v })) }

  // Success view auto-closes (and refreshes the users list) after a short beat.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onSaved?.(), 1400)
    return () => clearTimeout(t)
  }, [done])

  // The General Manager isn't tied to an office — hide the office field for that role.
  const selRole = roles.find(r => r.id === f.role_id)
  const isGM = selRole?.name_ar === 'المدير العام' || selRole?.name_en === 'General Manager'

  // All fields are mandatory — the nav buttons stay disabled until each step is complete.
  const idDigits = (f.id_number || '').replace(/\D/g, '')
  const localPart = (f.email || '').trim().toLowerCase()
  const phoneDigits = (f.personal_phone || '').replace(/\D/g, '')
  const step1Valid = !!(f.name_ar || '').trim() && !!(f.name_en || '').trim() && /^\d{10}$/.test(idDigits)
    && !!f.nationality_id && !!f.role_id && (isGM || (f.branch_ids && f.branch_ids.length > 0))
  const step2Valid = phoneDigits.length === 9
    && /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(localPart)
    && (f.password || '').length >= 6 && f.password === f.password2

  const validateStep1 = () => {
    if (!(f.name_ar || '').trim()) { setErrMsg('الاسم بالعربي مطلوب'); return false }
    if (!(f.name_en || '').trim()) { setErrMsg('الاسم بالإنجليزي مطلوب'); return false }
    if (!/^\d{10}$/.test((f.id_number || '').replace(/\D/g, ''))) { setErrMsg('رقم الهوية يجب أن يكون 10 أرقام'); return false }
    if (!f.nationality_id) { setErrMsg('الجنسية مطلوبة'); return false }
    if (!f.role_id) { setErrMsg('الدور مطلوب'); return false }
    if (!isGM && !(f.branch_ids && f.branch_ids.length)) { setErrMsg('المكتب مطلوب'); return false }
    return true
  }

  const save = async () => {
    setErrMsg('')
    const name_ar = (f.name_ar || '').trim()
    const idDigits = (f.id_number || '').replace(/\D/g, '')
    const localPart = (f.email || '').trim().toLowerCase()
    const email = localPart + EMAIL_DOMAIN
    const phoneDigits = (f.personal_phone || '').replace(/\D/g, '')
    if (!validateStep1()) return
    if (phoneDigits.length !== 9) { setErrMsg('رقم الجوال يجب أن يكون 9 أرقام بعد +966'); return }
    if (!/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(localPart)) { setErrMsg('البريد الإلكتروني غير صحيح'); return }
    if ((f.password || '').length < 6) { setErrMsg('كلمة المرور 6 أحرف على الأقل'); return }
    if (f.password !== f.password2) { setErrMsg('كلمتا المرور غير متطابقتين'); return }

    // Saudis use a national ID, everyone else an iqama.
    const nat = nationalities.find(n => n.id === f.nationality_id)
    const idTypeCode = nat?.name_ar === 'سعودي' ? 'national_id' : 'iqama'

    setSaving(true)
    try {
      const { data, error } = await sb.functions.invoke('admin-create-user', {
        body: {
          name_ar, name_en: (f.name_en || '').trim(),
          id_number: idDigits, id_type_code: idTypeCode,
          nationality_id: f.nationality_id, role_id: f.role_id || null,
          branch_id: isGM ? null : (f.branch_ids[0] || null), branch_ids: isGM ? [] : f.branch_ids,
          personal_phone: phoneDigits, email, password: f.password,
        },
      })
      if (error) {
        let msg = error.message
        try { const j = await error.context.json(); if (j?.error?.message) msg = j.error.message } catch (_) {}
        setErrMsg(msg); setSaving(false); return
      }
      if (data && data.ok === false) { setErrMsg(data.error?.message || 'تعذّرت الإضافة'); setSaving(false); return }
      // In-modal success view (FormKit success= prop) instead of a toast. The login
      // credentials stay reachable on the user detail page (email + plain_password).
      setDone(true)
    } catch (e) {
      setErrMsg((e?.message || 'تعذّرت الإضافة').slice(0, 100))
    }
    setSaving(false)
  }

  return (
    <FKModal open onClose={done ? () => onSaved?.() : onClose} variant="create" width={560}
      title="مستخدم جديد" Icon={ShieldCheck}
      onSubmit={save} submitting={saving} submitLabel="إضافة"
      success={done ? <SuccessView title="تم إنشاء الحساب بنجاح" /> : null}
      pages={[
        { title: 'بيانات الموظف', valid: step1Valid, error: errMsg, content: (
          <ModalSection Icon={User} label="بيانات الموظف">
            <div style={GRID}>
              <TextField label="الاسم بالعربي" req value={f.name_ar} onChange={v => set('name_ar', v)} />
              <TextField label="الاسم بالإنجليزي" req dir="ltr" value={f.name_en} onChange={v => set('name_en', v)} />
              <IdField label="رقم الهوية" req placeholder="10 أرقام" value={f.id_number} onChange={v => set('id_number', v)} />
              <Select label="الجنسية" req placeholder="— اختر —"
                value={f.nationality_id} onChange={v => set('nationality_id', v)}
                options={nationalities} getKey={n => n.id} getLabel={n => n.name_ar} />
              <Select label="الدور" req placeholder="موظف (افتراضي)"
                value={f.role_id} onChange={v => set('role_id', v)}
                options={roles.filter(r => ASSIGNABLE_ROLES.includes(r.name_ar))}
                getKey={r => r.id} getLabel={r => r.name_ar} />
              {!isGM && (
                <MultiSelect label="المكتب" req hint="يمكن اختيار أكثر من مكتب" placeholder="الافتراضي"
                  value={f.branch_ids} onChange={v => set('branch_ids', v)}
                  options={branches} getKey={b => b.id} getLabel={b => b.branch_code} />
              )}
            </div>
          </ModalSection>
        ) },
        { title: 'بيانات الدخول', valid: step2Valid, error: errMsg, content: (
          <>
            <Step2Init f={f} setF={setF} />
            <ModalSection Icon={Lock} label="بيانات الدخول">
              <div style={GRID}>
                <PhoneField label="رقم الجوال" req value={f.personal_phone} onChange={v => set('personal_phone', v)} />
                <TextField label="البريد الإلكتروني" req hint={EMAIL_DOMAIN} dir="ltr" placeholder="name"
                  value={f.email} onChange={v => set('email', (v || '').toLowerCase().replace(/[^a-z0-9._-]/g, ''))} />
                <div style={FULL}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <Lbl req hint="مقترحة تلقائياً">كلمة المرور</Lbl>
                    <PwSuggestBtn onClick={() => setF(p => { const pw = genPassword(); return { ...p, password: pw, password2: pw } })} />
                  </div>
                  <div style={GRID}>
                    <TextField dir="ltr" placeholder="كلمة المرور" value={f.password} onChange={v => set('password', v)} />
                    <TextField dir="ltr" placeholder="تأكيد كلمة المرور" value={f.password2} onChange={v => set('password2', v)} />
                  </div>
                </div>
              </div>
            </ModalSection>
          </>
        ) },
      ]}
    />
  )
}

