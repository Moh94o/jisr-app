import React, { useEffect, useMemo, useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { ChevronLeft, Search, X, Check, ShieldCheck, Building2, Eye, EyeOff } from 'lucide-react'
import VisibilityAdmin from '../VisibilityAdmin.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', red: '#c0392b', blue: '#3483b4', ok: '#27a046' }

const GLASS = {
  background: 'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 16,
  boxShadow: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',
}

const INNER = {
  background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
  border: '1px solid rgba(255,255,255,.06)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',
}

const resolveIcon = (name) => LucideIcons[name] || ShieldCheck

// Sidebar tab id corresponding to each permission module — used so the
// "إظهار التبويب" toggle on each module card flips the right visibility flag.
const MODULE_TO_TAB_ID = {
  home: 'home',
  facilities: 'facilities',
  workers: 'workers',
  invoices: 'invoices',
  quotations: 'transfer_calc',
  admin_offices: 'admin_offices',
  admin_persons: 'admin_persons',
  admin_services: 'admin_services',
  admin_ui_controls: 'admin_ui_controls',
  admin: 'admin_permissions',
  otp_messages: 'otp_messages',
  sync_hub: 'sync_hub',
  settings: 'settings',
}
const VIS_LOCKED = ['admin_hub', 'admin_permissions']

export default function PermissionsPage({ sb, user, toast, lang, nav, hubTabs, visibility, onVisibilityChange }) {
  const [tab, setTab] = useState('users') // 'users' | 'perms'
  const [modules, setModules] = useState([])
  const [users, setUsers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null) // active permission for modal

  const refresh = async () => {
    setLoading(true)
    const [pRes, uRes, bRes] = await Promise.all([
      sb.from('permissions').select('*').eq('is_active', true).order('module_sort').order('sort_order'),
      sb.from('users')
        .select('id,role_id,primary_branch_id,is_active,person:persons(name_ar,name_en),branch:branches!users_primary_branch_id_fkey(id,branch_code),role:roles!users_role_id_fkey(id,name_ar,color)')
        .is('deleted_at', null).order('created_at'),
      sb.from('branches').select('id,branch_code').is('deleted_at', null).order('branch_code'),
    ])
    const perms = pRes.data || []
    // Group by module
    const grouped = {}
    perms.forEach(p => {
      if (!grouped[p.module]) grouped[p.module] = { module: p.module, label_ar: p.module_label_ar, icon: p.module_icon, sort: p.module_sort, perms: [] }
      grouped[p.module].perms.push(p)
    })
    const list = Object.values(grouped).sort((a, b) => a.sort - b.sort)
    setModules(list)
    setUsers(uRes.data || [])
    setBranches(bRes.data || [])
    setLoading(false)
  }
  useEffect(() => { if (sb) refresh() }, [sb])

  // Map of permission_id -> user grants (so each module row can show how many people have it).
  const [grants, setGrants] = useState([])
  const refreshGrants = async () => {
    const { data } = await sb.from('user_permissions').select('user_id,permission_id,is_granted,branch_scope,branch_id')
    setGrants(data || [])
  }
  useEffect(() => { if (sb) refreshGrants() }, [sb])

  const grantedCountFor = (permId) => {
    // role-grant from any role implicitly grants all members of that role.
    // user-specific grants in `user_permissions` add or remove from the role baseline.
    const denied = new Set(grants.filter(g => g.permission_id === permId && !g.is_granted).map(g => g.user_id))
    const explicit = new Set(grants.filter(g => g.permission_id === permId && g.is_granted).map(g => g.user_id))
    let count = 0
    users.forEach(u => {
      if (denied.has(u.id)) return
      if (explicit.has(u.id)) { count++; return }
      // role-based grant detection happens via role_permissions; we approximate
      // by treating any user with a role as granted unless explicitly denied.
      // The modal does the precise computation per permission.
    })
    return count
  }

  const tabs = [
    { k: 'users', l: 'المستخدمون' },
    { k: 'perms', l: 'الصلاحيات' },
  ]

  const subtitleFor = {
    users: 'تفعيل أو تعطيل حسابات الموظفين والتحكم بصلاحية الدخول للنظام.',
    perms: 'تنظيم الصلاحيات بحسب التبويبات في القائمة الجانبية. اضغط على أي صلاحية لاختيار الموظفين، أو فعّل/عطّل ظهور التبويب في القائمة الجانبية.',
  }

  const toggleVisible = (tabId) => {
    if (!tabId || VIS_LOCKED.includes(tabId)) return
    const current = visibility?.[tabId] !== false
    const next = { ...(visibility || {}), [tabId]: !current }
    onVisibilityChange?.(next)
    toast?.(current ? 'تم إخفاء التبويب' : 'تم إظهار التبويب')
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>إدارة المستخدمين</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{subtitleFor[tab]}</div>
      </div>

      {/* Tab strip — underline style matches the rest of the app */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,.07)', marginBottom: 18, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabs.map(t => {
          const sel = tab === t.k
          return <div key={t.k} onClick={() => setTab(t.k)}
            style={{ padding: '10px 22px 9px', cursor: 'pointer', color: sel ? C.gold : 'var(--tx4)', fontFamily: F, fontSize: 13, fontWeight: sel ? 600 : 500, borderBottom: sel ? '2px solid ' + C.gold : '2px solid transparent', marginBottom: -1, transition: '.2s', letterSpacing: '-.2px', whiteSpace: 'nowrap' }}>{t.l}</div>
        })}
      </div>

      {tab === 'users' && <UsersTab sb={sb} user={user} toast={toast} lang={lang} users={users} onChanged={() => { refresh() }} />}

      {tab === 'perms' && (loading ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)', fontSize: 13 }}>جاري التحميل...</div> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 14 }}>
          {modules.map(mod => {
            const Icon = resolveIcon(mod.icon)
            const tabId = MODULE_TO_TAB_ID[mod.module]
            const visible = tabId ? (visibility?.[tabId] !== false) : null
            const locked = !tabId || VIS_LOCKED.includes(tabId)
            return (
              <div key={mod.module} style={{ ...GLASS, padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }}>
                    <Icon size={20} strokeWidth={2} />
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', letterSpacing: '-.2px' }}>{mod.label_ar}</span>
                  <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx5)', fontWeight: 500 }}>{mod.perms.length} صلاحية</span>
                </div>
                {tabId && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, ...INNER, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {visible ? <Eye size={14} color={C.ok} /> : <EyeOff size={14} color="var(--tx5)" />}
                      <span style={{ fontSize: 12, fontWeight: 600, color: visible ? 'var(--tx2)' : 'var(--tx5)' }}>إظهار التبويب في القائمة الجانبية</span>
                      {locked && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'rgba(212,160,23,.1)', color: C.gold, fontWeight: 700 }}>دائم</span>}
                    </div>
                    <button type="button" disabled={locked} onClick={() => toggleVisible(tabId)}
                      style={{ width: 36, height: 20, borderRadius: 999, border: 'none', background: visible ? C.ok : 'rgba(255,255,255,.15)', cursor: locked ? 'not-allowed' : 'pointer', position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, opacity: locked ? .5 : 1 }}>
                      <span style={{ position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#fff', top: 3, right: visible ? 3 : 19, transition: '.2s' }} />
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {mod.perms.map(p => {
                    const cnt = grantedCountFor(p.id)
                    return (
                      <button key={p.id} onClick={() => setActive(p)}
                        style={{
                          ...INNER, borderRadius: 10, padding: '11px 14px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                          fontFamily: F, color: 'var(--tx)', textAlign: 'start', transition: '.18s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{p.label_ar}</span>
                          {cnt > 0 && <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(39,160,70,.14)', color: C.ok, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.ok }} />{cnt} موظف
                          </span>}
                        </div>
                        <ChevronLeft size={14} color="rgba(255,255,255,.4)" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {active && <PermissionEditor
        sb={sb} user={user} toast={toast} lang={lang}
        permission={active}
        users={users}
        branches={branches}
        grants={grants}
        onClose={() => setActive(null)}
        onSaved={async () => { await refreshGrants() }}
      />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Modal: pick employees to grant a single permission to, with branch scope.
// ═══════════════════════════════════════════════════════════════════
function PermissionEditor({ sb, user, toast, lang, permission, users, branches, grants, onClose, onSaved }) {
  const isAr = lang !== 'en'; const T = (a, e) => isAr ? a : e
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)
  // local state mirrors per-user override for this permission. Loaded once from `grants`.
  const initial = useMemo(() => {
    const m = {}
    users.forEach(u => {
      const g = grants.find(x => x.user_id === u.id && x.permission_id === permission.id)
      if (g) m[u.id] = { granted: g.is_granted, scope: g.branch_scope, branchId: g.branch_id }
      else m[u.id] = { granted: false, scope: 'primary', branchId: null }
    })
    return m
  }, [users, grants, permission.id])
  const [state, setState] = useState(initial)
  useEffect(() => setState(initial), [initial])

  const filtered = users.filter(u => {
    if (!u.is_active) return false
    if (!q) return true
    const hay = [u.person?.name_ar, u.person?.name_en, u.branch?.branch_code, u.role?.name_ar].filter(Boolean).join(' ').toLowerCase()

    return hay.includes(q.toLowerCase())
  })

  const toggle = (uid) => setState(s => ({ ...s, [uid]: { ...s[uid], granted: !s[uid].granted } }))
  const setScope = (uid, scope) => setState(s => ({ ...s, [uid]: { ...s[uid], scope, branchId: scope === 'specific' ? s[uid].branchId : null } }))
  const setBranch = (uid, bid) => setState(s => ({ ...s, [uid]: { ...s[uid], branchId: bid } }))

  const save = async () => {
    setSaving(true)
    try {
      // Snapshot diffs against initial to write the minimum set of upserts/deletes.
      const toUpsert = []
      const toDelete = []
      Object.entries(state).forEach(([uid, cur]) => {
        const prev = initial[uid]
        const changed = prev.granted !== cur.granted || prev.scope !== cur.scope || prev.branchId !== cur.branchId
        if (!changed) return
        if (cur.granted) {
          toUpsert.push({
            user_id: uid, permission_id: permission.id,
            is_granted: true,
            branch_scope: cur.scope,
            branch_id: cur.scope === 'specific' ? cur.branchId : null,
            created_by: user?.id || null,
          })
        } else if (prev.granted) {
          // user was granted before — remove the row to fall back to role baseline.
          toDelete.push(uid)
        }
      })
      if (toUpsert.length) {
        const { error } = await sb.from('user_permissions').upsert(toUpsert, { onConflict: 'user_id,permission_id' })
        if (error) throw error
      }
      for (const uid of toDelete) {
        await sb.from('user_permissions').delete().eq('user_id', uid).eq('permission_id', permission.id)
      }
      toast(T('تم حفظ الصلاحيات', 'Permissions saved'))
      await onSaved?.()
      onClose()
    } catch (e) {
      toast(T('خطأ: ', 'Error: ') + (e.message || '').slice(0, 80))
    }
    setSaving(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--modal-bg)', borderRadius: 16, width: 720, maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: F, direction: 'rtl' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--tx)' }}>{permission.label_ar}</div>
            <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 4 }}>{permission.module_label_ar}</div>
          </div>
          <button onClick={onClose} aria-label="إغلاق" style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '14px 24px 0', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.4)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو رمز الفرع أو الدور..."
              style={{ width: '100%', height: 40, padding: '0 14px 0 36px', background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 11, fontFamily: F, fontSize: 14, fontWeight: 400, color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }} />
          </div>
        </div>

        {/* Employee list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ?
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx5)', fontSize: 13 }}>لا يوجد موظفين</div>
            : filtered.map(u => {
              const cur = state[u.id] || { granted: false, scope: 'primary', branchId: null }
              const name = u.person?.name_ar || u.person?.name_en || '—'
              const branchLabel = u.branch ? u.branch.branch_code : '—'
              return (
                <div key={u.id} style={{ ...INNER, borderRadius: 12, padding: '12px 14px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 14 }}>
                  <button onClick={() => toggle(u.id)} aria-label={cur.granted ? 'إلغاء' : 'منح'}
                    style={{
                      width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
                      background: cur.granted ? C.gold : 'transparent',
                      border: cur.granted ? '1px solid ' + C.gold : '1.5px solid rgba(255,255,255,.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      transition: '.15s',
                    }}>
                    {cur.granted && <Check size={14} color="#000" strokeWidth={3} />}
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{name}</span>
                      {u.role && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: (u.role.color || C.gold) + '20', color: u.role.color || C.gold }}>{u.role.name_ar}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={11} />{branchLabel}
                    </div>
                  </div>
                  {cur.granted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifySelf: 'end' }}>
                      <select value={cur.scope} onChange={e => setScope(u.id, e.target.value)}
                        style={{ height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', color: 'var(--tx)', fontFamily: F, fontSize: 12, fontWeight: 500, outline: 'none', cursor: 'pointer' }}>
                        <option value="primary">المكتب الافتراضي</option>
                        <option value="all">كل المكاتب</option>
                        <option value="specific">مكتب محدد</option>
                      </select>
                      {cur.scope === 'specific' && (
                        <select value={cur.branchId || ''} onChange={e => setBranch(u.id, e.target.value || null)}
                          style={{ height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', color: 'var(--tx)', fontFamily: F, fontSize: 12, fontWeight: 500, outline: 'none', cursor: 'pointer' }}>
                          <option value="">— اختر —</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.branch_code}</option>)}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 18px', borderRadius: 11, background: 'transparent', color: 'var(--tx4)', border: '1px solid rgba(255,255,255,.1)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>إلغاء</button>
          <button onClick={save} disabled={saving}
            style={{ height: 40, padding: '0 22px', borderRadius: 11, border: '1px solid rgba(212,160,23,.45)', background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .65 : 1, boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {saving ? '...' : 'حفظ الصلاحيات'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Users tab — activate/deactivate user accounts.
// ═══════════════════════════════════════════════════════════════════
function UsersTab({ sb, user, toast, lang, users, onChanged }) {
  const isAr = lang !== 'en'; const T = (a, e) => isAr ? a : e
  const [q, setQ] = useState('')
  const [savingIds, setSavingIds] = useState(() => new Set())
  const filtered = users.filter(u => {
    if (!q) return true
    const hay = [u.person?.name_ar, u.person?.name_en, u.branch?.branch_code, u.role?.name_ar].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q.toLowerCase())
  })
  const toggle = async (u) => {
    if (u.id === user?.id) { toast(T('لا يمكنك تعطيل حسابك', "You can't disable your own account")); return }
    setSavingIds(s => new Set([...s, u.id]))
    const next = !u.is_active
    const { error } = await sb.from('users').update({ is_active: next, updated_at: new Date().toISOString() }).eq('id', u.id)
    setSavingIds(s => { const n = new Set(s); n.delete(u.id); return n })
    if (error) { toast(T('خطأ: ', 'Error: ') + error.message.slice(0, 80)); return }
    toast(T(next ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب', next ? 'Account enabled' : 'Account disabled'))
    await onChanged?.()
  }
  return (
    <div>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.4)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالاسم أو رمز الفرع أو الدور..."
          style={{ width: '100%', height: 40, padding: '0 14px 0 36px', background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 11, fontFamily: F, fontSize: 14, fontWeight: 400, color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }} />
      </div>
      {filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 60, color: 'var(--tx5)', fontSize: 13 }}>لا يوجد موظفين</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(u => {
            const name = u.person?.name_ar || u.person?.name_en || '—'
            const branchLabel = u.branch ? u.branch.branch_code : '—'
            const isMe = u.id === user?.id
            const saving = savingIds.has(u.id)
            const initials = (name || '').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('') || '—'
            const accent = u.role?.color || C.gold
            const accentColor = u.is_active ? accent : 'rgba(255,255,255,.18)'
            return (
              <div key={u.id} style={{ ...GLASS, padding: '14px 18px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 16, opacity: u.is_active ? 1 : .65, transition: '.2s' }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}88 100%)`, border: `1px solid ${accentColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#0a0a0a', flexShrink: 0, boxShadow: `0 4px 12px ${accentColor}30, inset 0 1px 0 rgba(255,255,255,.25)`, fontFamily: F, letterSpacing: '.5px' }}>{initials}</div>

                {/* Name + meta */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.1px' }}>{name}</span>
                    {isMe && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(212,160,23,.14)', color: C.gold, letterSpacing: '.3px' }}>أنت</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontWeight: 500 }}>
                    {u.role && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, boxShadow: `0 0 4px ${accent}` }} />
                      <span style={{ color: accent, fontWeight: 600 }}>{u.role.name_ar}</span>
                    </span>}
                    {u.role && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--tx6)' }} />}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Building2 size={11} />{branchLabel}
                    </span>
                  </div>
                </div>

                {/* Status + toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: u.is_active ? 'rgba(39,160,70,.14)' : 'rgba(255,255,255,.05)', color: u.is_active ? C.ok : 'var(--tx5)', border: `1px solid ${u.is_active ? 'rgba(39,160,70,.3)' : 'rgba(255,255,255,.08)'}` }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: u.is_active ? C.ok : 'var(--tx5)', boxShadow: u.is_active ? `0 0 4px ${C.ok}` : 'none' }} />
                    {u.is_active ? 'نشط' : 'معطّل'}
                  </span>
                  <button type="button" disabled={saving || isMe} onClick={() => toggle(u)} title={isMe ? 'لا يمكنك تعطيل حسابك' : (u.is_active ? 'تعطيل الحساب' : 'تفعيل الحساب')}
                    style={{ width: 44, height: 24, borderRadius: 999, border: 'none', background: u.is_active ? `linear-gradient(180deg, ${C.ok} 0%, #1f8a3a 100%)` : 'linear-gradient(180deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.10) 100%)', cursor: (saving || isMe) ? 'not-allowed' : 'pointer', opacity: (saving || isMe) ? .55 : 1, position: 'relative', padding: 0, transition: '.2s', flexShrink: 0, boxShadow: u.is_active ? `0 2px 8px ${C.ok}44, inset 0 1px 0 rgba(255,255,255,.15)` : 'inset 0 1px 0 rgba(255,255,255,.08), 0 2px 4px rgba(0,0,0,.18)' }}>
                    <span style={{ position: 'absolute', width: 18, height: 18, borderRadius: '50%', background: '#fff', top: 3, right: u.is_active ? 3 : 23, transition: '.2s', boxShadow: '0 2px 4px rgba(0,0,0,.3)' }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      }
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Visibility tab — wrap the existing VisibilityAdmin so the look matches
// the surrounding glass cards instead of the legacy gold-bordered fieldset.
// ═══════════════════════════════════════════════════════════════════
function VisibilityTab({ lang, toast, nav, hubTabs, visibility, onChange }) {
  return (
    <div style={{ ...GLASS, padding: 4 }}>
      <VisibilityAdmin lang={lang} toast={toast} nav={nav} hubTabs={hubTabs} visibility={visibility} onChange={onChange} />
    </div>
  )
}
