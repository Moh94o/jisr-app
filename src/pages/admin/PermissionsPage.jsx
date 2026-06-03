import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { Search, X, Check, ShieldCheck, Building2, Phone, Mail, CreditCard, ChevronDown, Eye, EyeOff, Copy, User, Globe } from 'lucide-react'
import BackButton from '../../components/BackButton'

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

// Shared KPI-card shell — matches the BranchesPage hero cards exactly.
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

export default function PermissionsPage({ sb, user, toast, lang, nav, hubTabs, visibility, onVisibilityChange }) {
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [roles, setRoles] = useState([])
  const [nationalities, setNationalities] = useState([])
  const [modules, setModules] = useState([])      // permission modules (grouped)
  const [grants, setGrants] = useState([])        // user_permissions rows (per-user overrides)
  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState(null) // open employee detail page

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
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>إدارة المستخدمين</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>تفعيل أو تعطيل حسابات المستخدمين والتحكم بصلاحية الدخول للنظام.</div>
        </div>
        {isGM && (
          <button onClick={() => setAdding(true)}
            onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
            style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease' }}>
            مستخدم جديد
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        )}
      </div>

      <UsersTab sb={sb} user={user} toast={toast} lang={lang} users={users} branches={branches} nationalities={nationalities} onOpen={u => setSelectedId(u.id)} onChanged={() => { refresh() }} />

      {adding && <NewUserModal sb={sb} toast={toast} branches={branches} roles={roles} nationalities={nationalities}
        onClose={() => setAdding(false)} onSaved={async () => { setAdding(false); await refresh() }} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Users tab — activate/deactivate user accounts, edit employee details.
// ═══════════════════════════════════════════════════════════════════
function UsersTab({ sb, user, toast, lang, users, branches, nationalities, onOpen, onChanged }) {
  const isAr = lang !== 'en'; const T = (a, e) => isAr ? a : e
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'pending'
  const [savingIds, setSavingIds] = useState(() => new Set())
  const pendingCount = users.filter(u => !u.is_active).length
  const filtered = users.filter(u => {
    if (statusFilter === 'active' && !u.is_active) return false
    if (statusFilter === 'pending' && u.is_active) return false
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
        .usr-row-vdiv{width:1px;align-self:stretch;background:linear-gradient(180deg,transparent 0%,rgba(255,255,255,.08) 50%,transparent 100%);min-height:46px}
      `}</style>

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
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
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
                  <circle r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="11" />
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
                    style={{ fill: '#fff', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
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

      {/* Filter row — search (offices style) + status chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search size={14} color="var(--tx4)" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو الهوية أو الجوال أو البريد أو الفرع أو الدور…"
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      </div>

      {/* List — role-grouped accent row cards (matches offices city groups) */}
      {sorted.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>لا يوجد موظفين</div>
      ) : roleGroups.map((g, gi) => {
        const c = g.color || ROLE_PALETTE[gi % ROLE_PALETTE.length]
        return (
          <div key={g.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, transform: 'translateY(-2px)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx2)' }}>{g.name}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{g.active}/{g.items.length} نشط</span>
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
      <div style={{ padding: '14px 26px 14px 18px' }}>
        <div className="usr-row-grid">
          {/* Avatar — nationality flag (falls back to initial) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 56 }}>
            <div title={nat?.name_ar || ''} style={{ width: 42, height: 42, borderRadius: 12, overflow: 'hidden', background: `linear-gradient(135deg, ${accent}33 0%, ${accent}14 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: accent, flexShrink: 0 }}>
              {flagUrl ? <img src={flagUrl} alt={nat?.name_ar || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="usr-row-vdiv" />

          {/* Metadata column */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.92)', letterSpacing: '-.2px' }}>{name}</span>
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
const cardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle = { fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '.2px' }
const VIS_LOCKED = ['admin_hub', 'admin_permissions', 'admin_ui_controls', 'admin_visibility']

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
      style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: '1px solid rgba(255,255,255,.08)', background: done ? 'rgba(39,160,70,.16)' : 'rgba(255,255,255,.04)', color: done ? C.ok : 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}>
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
      onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
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

  // Per-user permission overrides — a Set of permission_ids explicitly granted.
  const grantSet = new Set(grants.filter(g => g.is_granted).map(g => g.permission_id))
  const vis = u.ui_visibility || {}

  // Map a permission module → the sidebar tab it controls, so each module row
  // can carry its own "إظهار التبويب" toggle. Only modules that correspond to a
  // real sidebar tab get a toggle.
  const MODULE_TAB_ALIAS = { quotations: 'transfer_calc', admin: 'admin_permissions' }
  const validTabIds = new Set([...(nav || []).map(n => n.id), ...Object.values(hubTabs || {}).flat().map(t => t.id)])
  const tabIdFor = (m) => { const id = MODULE_TAB_ALIAS[m] || m; return validTabIds.has(id) ? id : null }

  const togglePerm = async (permId) => {
    if (busy) return
    setBusy(true)
    try {
      if (grantSet.has(permId)) {
        const { error } = await sb.from('user_permissions').delete().eq('user_id', u.id).eq('permission_id', permId)
        if (error) throw error
      } else {
        const { error } = await sb.from('user_permissions').upsert({ user_id: u.id, permission_id: permId, is_granted: true, created_by: currentUser?.id || null }, { onConflict: 'user_id,permission_id' })
        if (error) throw error
      }
      await onChanged?.()
    } catch (e) { toast('خطأ: ' + (e.message || '').slice(0, 80)) }
    setBusy(false)
  }

  const toggleVisible = async (id) => {
    if (busy || VIS_LOCKED.includes(id)) return
    const currentlyVisible = vis[id] !== false
    const next = { ...vis, [id]: !currentlyVisible }
    setBusy(true)
    const { error } = await sb.from('users').update({ ui_visibility: next, updated_at: new Date().toISOString() }).eq('id', u.id)
    setBusy(false)
    if (error) { toast('خطأ: ' + error.message.slice(0, 80)); return }
    toast(currentlyVisible ? 'تم إخفاء التبويب لهذا الموظف' : 'تم إظهار التبويب لهذا الموظف')
    await onChanged?.()
  }

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
      <div style={{ marginBottom: 4 }}>
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
          {/* Permissions */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>الصلاحيات</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx5)', fontWeight: 600 }}>{grantSet.size} مفعّلة</span>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {modules.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--tx5)', fontSize: 12, padding: 14 }}>لا توجد صلاحيات</div> :
                modules.map(mod => {
                  const tabId = tabIdFor(mod.module)
                  const tabOn = tabId ? (vis[tabId] !== false) : null
                  const tabLocked = !tabId || VIS_LOCKED.includes(tabId)
                  return (
                  <div key={mod.module}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx3)' }}>{mod.label_ar}</span>
                      {tabId && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                          {tabOn ? <Eye size={13} color={C.ok} /> : <EyeOff size={13} color="var(--tx5)" />}
                          <span style={{ fontSize: 10.5, fontWeight: 600, color: tabOn ? 'var(--tx3)' : 'var(--tx5)' }}>إظهار التبويب</span>
                          {tabLocked && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: 'rgba(212,160,23,.12)', color: C.gold, fontWeight: 700 }}>دائم</span>}
                          <VisToggle on={!!tabOn} locked={tabLocked || busy} onClick={() => toggleVisible(tabId)} />
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {mod.perms.map(p => {
                        const on = grantSet.has(p.id)
                        return (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: on ? 'var(--tx)' : 'var(--tx3)' }}>{p.label_ar}</span>
                            <VisToggle on={on} locked={busy} onClick={() => togglePerm(p.id)} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  )
                })}
            </div>
          </div>
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
// Styled like NewUserModal (gold-bordered fieldset, centered inputs).
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
  const [done, setDone] = useState(null) // success screen — list of changed rows
  const [errMsg, setErrMsg] = useState('') // inline error shown in the footer (no toast)
  const set = (k, v) => { setErrMsg(''); setF(p => ({ ...p, [k]: v })) }

  // The General Manager isn't tied to an office — hide the office field for that role.
  const selRole = roles.find(r => r.id === f.role_id)
  const isGM = selRole?.name_ar === 'المدير العام' || selRole?.name_en === 'General Manager'

  const accent = 'rgba(212,160,23,.4)'
  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16, fontFamily: F, direction: 'rtl' }
  const box = { background: 'var(--modal-bg)', borderRadius: 16, width: 560, maxWidth: '95vw', minHeight: 430, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }
  const fieldset = { position: 'relative', borderRadius: 12, border: '1.5px solid ' + accent, padding: '20px 22px' }
  const legend = { position: 'absolute', top: -10, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }
  const lbl = { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }
  const inp = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', outline: 'none', boxSizing: 'border-box', textAlign: 'center', transition: '.2s' }

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

    // Build the "from → to" change list for the in-modal success screen.
    const codes = ids => (ids || []).map(id => branches.find(b => b.id === id)?.branch_code).filter(Boolean).join('، ')
    const roleName = id => roles.find(r => r.id === id)?.name_ar || '—'
    const phoneDisp = p => p ? String(p).replace(/^\+?966/, '0') : '—'
    const oldBranchIds = (user.branch_ids && user.branch_ids.length) ? user.branch_ids : (user.primary_branch_id ? [user.primary_branch_id] : [])
    const rows = []
    if (user.role_id !== f.role_id) rows.push({ label: 'الدور', from: roleName(user.role_id), to: roleName(f.role_id) })
    if (codes(oldBranchIds) !== codes(branchIds)) rows.push({ label: 'المكتب', from: codes(oldBranchIds) || '—', to: codes(branchIds) || '—', mono: true })
    if ((user.personal_phone || '') !== (phone9 ? '+966' + phone9 : '')) rows.push({ label: 'رقم الجوال', from: phoneDisp(user.personal_phone), to: phoneDisp(phone9 ? '+966' + phone9 : ''), mono: true })
    if ((user.email || '') !== (email || '')) rows.push({ label: 'البريد الإلكتروني', from: user.email || '—', to: email || '—', mono: true })
    if (newPw) rows.push({ label: 'كلمة المرور', from: '••••••', to: newPw, mono: true })
    setDone({ rows })
  }

  return (
    <div style={overlay}>
      <div onClick={e => e.stopPropagation()} style={box}>
        <style>{`.wm-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.gold};font-family:${F};font-size:15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.wm-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:${C.gold}}.wm-nav-btn:hover:not(:disabled) .nav-ico{background:${C.gold};color:#000}.wm-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
        {done ? (
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 28px', gap: 16, textAlign: 'center' }}>
            <button onClick={() => onSaved?.()} aria-label="إغلاق"
              style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }}>
              <X size={14} />
            </button>
            <div style={{ width: 74, height: 74, borderRadius: '50%', background: C.ok + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ok, boxShadow: '0 0 0 8px ' + C.ok + '14' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.ok }}>تم تعديل البيانات بنجاح</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 380 }}>{done.rows.length ? 'تم تحديث الحقول التالية:' : 'لم تتغيّر أي بيانات.'}</div>
            {done.rows.length > 0 && (
              <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {done.rows.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--tx3)', fontWeight: 600, textAlign: 'start' }}>{r.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0, direction: r.mono ? 'ltr' : 'rtl' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--tx5)', fontWeight: 600, textDecoration: 'line-through', fontFamily: r.mono ? 'monospace' : 'inherit', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.from}>{r.from}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                      <span style={{ fontSize: 13, color: C.ok, fontWeight: 700, fontFamily: r.mono ? 'monospace' : 'inherit', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.to}>{r.to}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>
        {/* Top bar */}
        <div style={{ padding: '20px 24px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ color: C.gold, flexShrink: 0, display: 'inline-flex' }}><ShieldCheck size={28} /></span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2 }}>تعديل بيانات المستخدم</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="إغلاق"
            style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 24px 20px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          <div style={fieldset}>
            <div style={legend}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m22 21-2-2" /><path d="M16 16h.01" /></svg>
              <span>بيانات العمل</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 14, rowGap: 14 }}>
              <div>
                <div style={lbl}>الدور <span style={{ color: C.red }}>*</span></div>
                <Drop value={f.role_id} onChange={v => set('role_id', v)} placeholder="— اختر —"
                  options={roles.filter(r => ASSIGNABLE_ROLES.includes(r.name_ar) || r.id === f.role_id).map(r => ({ v: r.id, l: r.name_ar }))} />
              </div>
              {!isGM && (
                <div>
                  <div style={lbl}>المكتب <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>(يمكن اختيار أكثر من مكتب)</span> <span style={{ color: C.red }}>*</span></div>
                  <MultiDrop value={f.branch_ids} onChange={v => set('branch_ids', v)} placeholder="— اختر —"
                    options={branches.map(b => ({ v: b.id, l: b.branch_code }))} />
                </div>
              )}
              <div>
                <div style={lbl}>رقم الجوال</div>
                <div style={{ display: 'flex', direction: 'ltr', height: 42, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', background: 'var(--modal-input-bg)' }}>
                  <div style={{ padding: '0 10px', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500, color: C.gold, flexShrink: 0 }}>+966</div>
                  <input value={(d => !d ? '' : d.length <= 2 ? d : d.length <= 5 ? d.slice(0, 2) + ' ' + d.slice(2) : d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5))(f.personal_phone)} onChange={e => set('personal_phone', e.target.value.replace(/\D/g, '').slice(0, 9))} dir="ltr" inputMode="numeric" maxLength={11} placeholder="5X XXX XXXX"
                    style={{ flex: 1, width: '100%', height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
                </div>
              </div>
              <div style={{ gridColumn: isGM ? '1 / -1' : 'auto' }}>
                <div style={lbl}>البريد الإلكتروني</div>
                <div style={{ display: 'flex', direction: 'ltr', height: 42, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', background: 'var(--modal-input-bg)' }}>
                  <input value={f.email} onChange={e => set('email', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} dir="ltr" placeholder="name"
                    style={{ flex: 1, minWidth: 0, height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
                  <div style={{ padding: '0 10px', background: 'rgba(255,255,255,.04)', borderInlineStart: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500, color: C.gold, flexShrink: 0 }}>{EMAIL_DOMAIN}</div>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                  <div style={{ ...lbl, marginBottom: 0 }}>كلمة المرور <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>(اتركها فارغة لعدم التغيير)</span></div>
                  <button type="button" onClick={() => set('password', genPassword())}
                    style={{ height: 26, padding: '0 10px', borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                    اقتراح جديد
                  </button>
                </div>
                <input value={f.password} onChange={e => set('password', e.target.value)} style={{ ...inp, direction: 'ltr', fontFamily: 'monospace', letterSpacing: '.5px' }} dir="ltr" type="text" placeholder="كلمة مرور جديدة" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ padding: '12px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minHeight: 16, textAlign: 'start' }}>
            {errMsg && <span style={{ fontSize: 12, fontWeight: 500, color: C.red, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {errMsg}
            </span>}
          </div>
          <button onClick={save} disabled={saving} className="wm-nav-btn">
            <span>{saving ? 'جارٍ التعديل…' : 'تعديل'}</span>
            <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span>
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Drop — portal dropdown that matches the invoice-modal field look
// (gold chevron, search when long, centered value). Used for every
// select inside NewUserModal so all dropdowns share one style.
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
        style={{ width: '100%', height: 42, padding: '0 34px', borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${open ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.07)'}`,
          background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
          color: selected ? 'var(--tx)' : 'var(--tx5)', fontFamily: F, fontSize: 14, fontWeight: 500,
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
        style={{ width: '100%', height: 42, padding: '0 34px 0 12px', borderRadius: 10, cursor: 'pointer',
          border: `1px solid ${open ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.07)'}`,
          background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
          color: 'var(--tx)', fontFamily: F, fontSize: 14, fontWeight: 500,
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
function NewUserModal({ sb, toast, branches, roles, nationalities, onClose, onSaved }) {
  const employeeRole = roles.find(r => r.name_ar === 'موظف' || r.name_en === 'Employee')
  const [step, setStep] = useState(1)
  const totalSteps = 2
  const [f, setF] = useState({
    name_ar: '', name_en: '', id_number: '', nationality_id: '',
    role_id: employeeRole?.id || '', branch_ids: [],
    personal_phone: '', email: '', password: '', password2: '',
  })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null) // in-modal success screen after creating the account
  const [errMsg, setErrMsg] = useState('') // inline error shown in the footer (no toast)
  const set = (k, v) => { setErrMsg(''); setF(p => ({ ...p, [k]: v })) }

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

  const accent = 'rgba(212,160,23,.4)'
  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16, fontFamily: F, direction: 'rtl' }
  const box = { background: 'var(--modal-bg)', borderRadius: 16, width: 560, maxWidth: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }
  const fieldset = { position: 'relative', borderRadius: 12, border: '1.5px solid ' + accent, padding: '20px 22px' }
  const legend = { position: 'absolute', top: -10, right: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }
  const lbl = { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }
  const inp = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', outline: 'none', boxSizing: 'border-box', textAlign: 'center', transition: '.2s' }

  const validateStep1 = () => {
    if (!(f.name_ar || '').trim()) { toast('الاسم بالعربي مطلوب'); return false }
    if (!(f.name_en || '').trim()) { toast('الاسم بالإنجليزي مطلوب'); return false }
    if (!/^\d{10}$/.test((f.id_number || '').replace(/\D/g, ''))) { toast('رقم الهوية يجب أن يكون 10 أرقام'); return false }
    if (!f.nationality_id) { toast('الجنسية مطلوبة'); return false }
    if (!f.role_id) { toast('الدور مطلوب'); return false }
    if (!isGM && !(f.branch_ids && f.branch_ids.length)) { toast('المكتب مطلوب'); return false }
    return true
  }

  // Moving to step 2 pre-fills a suggested email + a unique generated password
  // (only if the GM left them blank) to make creating an account as quick as possible.
  const goStep2 = () => {
    setErrMsg('')
    if (!validateStep1()) return
    setF(p => {
      const next = { ...p }
      if (!next.email) next.email = emailLocalFromName(next.name_en || next.name_ar)
      if (!next.password) { const pw = genPassword(); next.password = pw; next.password2 = pw }
      return next
    })
    setStep(2)
  }

  const save = async () => {
    const name_ar = (f.name_ar || '').trim()
    const idDigits = (f.id_number || '').replace(/\D/g, '')
    const localPart = (f.email || '').trim().toLowerCase()
    const email = localPart + EMAIL_DOMAIN
    const phoneDigits = (f.personal_phone || '').replace(/\D/g, '')
    if (!validateStep1()) { setStep(1); return }
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
      // In-modal success screen (mirrors the edit modal) instead of a toast.
      setDone({ name: name_ar, email, password: f.password })
    } catch (e) {
      setErrMsg((e?.message || 'تعذّرت الإضافة').slice(0, 100))
    }
    setSaving(false)
  }

  return (
    <div style={overlay}>
      <div onClick={e => e.stopPropagation()} style={box}>
        <style>{`.nu-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.gold};font-family:${F};font-size:15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.nu-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:${C.gold}}.nu-nav-btn:hover:not(:disabled) .nav-ico{background:${C.gold};color:#000}.nu-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
        {done ? (
          <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 28px', gap: 16, textAlign: 'center' }}>
            <button onClick={() => onSaved?.()} aria-label="إغلاق"
              style={{ position: 'absolute', top: 16, left: 16, width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }}>
              <X size={14} />
            </button>
            <div style={{ width: 74, height: 74, borderRadius: '50%', background: C.ok + '2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ok, boxShadow: '0 0 0 8px ' + C.ok + '14' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: C.ok }}>تم إنشاء الحساب بنجاح</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 380 }}>الحساب أُنشئ معطّلاً — فعّله من القائمة. هذه بيانات الدخول:</div>
            <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {[
                { label: 'الاسم', value: done.name },
                { label: 'البريد الإلكتروني', value: done.email, mono: true, copy: true },
                { label: 'كلمة المرور', value: done.password, mono: true, copy: true },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--tx3)', fontWeight: 600, textAlign: 'start' }}>{r.label}</span>
                  {r.copy && <CopyBtn value={r.value} toast={toast} />}
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', direction: r.mono ? 'ltr' : 'rtl', fontFamily: r.mono ? 'monospace' : 'inherit', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.value}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <>
        {/* Top bar */}
        <div style={{ padding: '20px 24px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ color: C.gold, flexShrink: 0, display: 'inline-flex' }}><ShieldCheck size={28} /></span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2 }}>مستخدم جديد</div>
              </div>
            </div>
            <button onClick={onClose} aria-label="إغلاق"
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.4)'; e.currentTarget.style.color = '#e5867a' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(180deg,#323232 0%,#262626 100%)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'var(--tx3)' }}
              style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i < step ? `linear-gradient(90deg, ${C.gold}, ${C.gold}aa)` : 'rgba(255,255,255,0.06)', transition: '.35s' }} />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 24px 20px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {step === 1 && (
            <div style={fieldset}>
              <div style={legend}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                <span>بيانات الموظف</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 20, rowGap: 16 }}>
                <div>
                  <div style={lbl}>الاسم بالعربي <span style={{ color: C.red }}>*</span></div>
                  <input value={f.name_ar} onChange={e => set('name_ar', e.target.value)} style={inp} dir="rtl" />
                </div>
                <div>
                  <div style={lbl}>الاسم بالإنجليزي <span style={{ color: C.red }}>*</span></div>
                  <input value={f.name_en} onChange={e => set('name_en', e.target.value)} style={{ ...inp, direction: 'ltr' }} dir="ltr" />
                </div>
                <div>
                  <div style={lbl}>رقم الهوية <span style={{ color: C.red }}>*</span></div>
                  <input value={f.id_number} onChange={e => set('id_number', e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ ...inp, direction: 'ltr' }} dir="ltr" inputMode="numeric" placeholder="10 أرقام" />
                </div>
                <div>
                  <div style={lbl}>الجنسية <span style={{ color: C.red }}>*</span></div>
                  <Drop value={f.nationality_id} onChange={v => set('nationality_id', v)} placeholder="— اختر —"
                    options={nationalities.map(n => ({ v: n.id, l: n.name_ar }))} />
                </div>
                <div>
                  <div style={lbl}>الدور <span style={{ color: C.red }}>*</span></div>
                  <Drop value={f.role_id} onChange={v => set('role_id', v)} placeholder="موظف (افتراضي)"
                    options={roles.filter(r => ASSIGNABLE_ROLES.includes(r.name_ar)).map(r => ({ v: r.id, l: r.name_ar }))} />
                </div>
                {!isGM && (
                  <div>
                    <div style={lbl}>المكتب <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>(يمكن اختيار أكثر من مكتب)</span> <span style={{ color: C.red }}>*</span></div>
                    <MultiDrop value={f.branch_ids} onChange={v => set('branch_ids', v)} placeholder="الافتراضي"
                      options={branches.map(b => ({ v: b.id, l: b.branch_code }))} />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={fieldset}>
              <div style={legend}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>بيانات الدخول</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 20, rowGap: 16 }}>
                <div>
                  <div style={lbl}>رقم الجوال <span style={{ color: C.red }}>*</span></div>
                  <div style={{ display: 'flex', direction: 'ltr', height: 42, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', background: 'var(--modal-input-bg)' }}>
                    <div style={{ padding: '0 10px', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500, color: C.gold, flexShrink: 0 }}>+966</div>
                    <input value={(d => !d ? '' : d.length <= 2 ? d : d.length <= 5 ? d.slice(0, 2) + ' ' + d.slice(2) : d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5))(f.personal_phone)} onChange={e => set('personal_phone', e.target.value.replace(/\D/g, '').slice(0, 9))} dir="ltr" inputMode="numeric" maxLength={11} placeholder="5X XXX XXXX"
                      style={{ flex: 1, width: '100%', height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
                  </div>
                </div>
                <div>
                  <div style={lbl}>البريد الإلكتروني <span style={{ color: C.red }}>*</span></div>
                  <div style={{ display: 'flex', direction: 'ltr', height: 42, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.07)', background: 'var(--modal-input-bg)' }}>
                    <input value={f.email} onChange={e => set('email', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} dir="ltr" placeholder="name"
                      style={{ flex: 1, minWidth: 0, height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
                    <div style={{ padding: '0 10px', background: 'rgba(255,255,255,.04)', borderInlineStart: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500, color: C.gold, flexShrink: 0 }}>{EMAIL_DOMAIN}</div>
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ ...lbl, marginBottom: 0 }}>كلمة المرور <span style={{ color: C.red }}>*</span> <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>(مقترحة تلقائياً)</span></div>
                    <button type="button" onClick={() => setF(p => { const pw = genPassword(); return { ...p, password: pw, password2: pw } })}
                      style={{ height: 26, padding: '0 10px', borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                      اقتراح جديد
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', columnGap: 20, rowGap: 16 }}>
                    <input value={f.password} onChange={e => set('password', e.target.value)} style={{ ...inp, direction: 'ltr', fontFamily: 'monospace', letterSpacing: '.5px' }} dir="ltr" type="text" placeholder="كلمة المرور" />
                    <input value={f.password2} onChange={e => set('password2', e.target.value)} style={{ ...inp, direction: 'ltr', fontFamily: 'monospace', letterSpacing: '.5px' }} dir="ltr" type="text" placeholder="تأكيد كلمة المرور" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <style>{`.nu-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.gold};font-family:${F};font-size:15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.nu-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:${C.gold}}.nu-nav-btn:hover:not(:disabled) .nav-ico{background:${C.gold};color:#000}.nu-back-btn{color:var(--tx3)}.nu-back-btn .nav-ico{background:rgba(255,255,255,.06);color:var(--tx3)}.nu-back-btn:hover:not(:disabled){color:var(--tx)}.nu-back-btn:hover:not(:disabled) .nav-ico{background:rgba(255,255,255,.14);color:var(--tx)}.nu-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
        <div style={{ padding: '12px 24px 16px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ justifySelf: 'start' }}>
            {step > 1 && (
              <button onClick={() => { setErrMsg(''); setStep(1) }} className="nu-nav-btn nu-back-btn">
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg></span>
                <span>السابق</span>
              </button>
            )}
          </div>
          <div style={{ justifySelf: 'center', textAlign: 'center', minHeight: 16 }}>
            {errMsg && <span style={{ fontSize: 12, fontWeight: 500, color: C.red, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {errMsg}
            </span>}
          </div>
          <div style={{ justifySelf: 'end' }}>
            {step < totalSteps ? (
              <button onClick={goStep2} disabled={!step1Valid} className="nu-nav-btn">
                <span>التالي</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg></span>
              </button>
            ) : (
              <button onClick={save} disabled={saving || !step2Valid} className="nu-nav-btn">
                <span>{saving ? 'جارٍ الإضافة…' : 'إضافة'}</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg></span>
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

