import React, { useEffect, useMemo, useState, useCallback } from 'react'
import * as LucideIcons from 'lucide-react'
import { ShieldCheck, Plus, Users, Lock, Pencil, Trash2, Check, Layers, Eye } from 'lucide-react'
import BackButton from '../../components/BackButton'
import { Modal, ModalSection, ActionButton, SuccessView, TextField, GRID, EmptyState } from '../../components/ui/FormKit.jsx'
import { Shimmer } from '../../components/ui/Skeleton.jsx'
import { isGM as isGmUser, can } from '../../lib/permissions.js'
import * as svc from '../../services/rolesAdminService.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', red: '#c0392b', ok: '#27a046', blue: '#3483b4' }
const PALETTE = ['#D4A017', '#3483b4', '#16a085', '#bb8fce', '#f39c12', '#27a046', '#e8c77a', '#5dade2', '#e74c3c', '#9b59b6']
const resolveIcon = (name) => (name && LucideIcons[name]) || ShieldCheck

// «view»/«access» is the gate that opens a whole section — surface it clearly.
const isViewAction = (a) => a === 'view' || a === 'access'

export default function RolesAdminPage({ sb, user, toast, lang, emptyIcon }) {
  const canManage = isGmUser(user) || can(user, 'admin_permissions.manage_permissions')
  const [roles, setRoles] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [modal, setModal] = useState(null) // { mode:'create'|'edit', role? }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [r, cat] = await Promise.all([svc.listRolesWithStats(), svc.listPermissionCatalog()])
      setRoles(r); setCatalog(cat)
    } catch (e) { toast?.(e.message || 'خطأ في تحميل الأدوار') }
    finally { setLoading(false) }
  }, [toast])
  useEffect(() => { load() }, [load])

  const selected = selectedId ? roles.find(r => r.id === selectedId) : null

  if (selected) {
    return <RoleEditor sb={sb} role={selected} catalog={catalog} canManage={canManage} toast={toast}
      onBack={() => setSelectedId(null)} onChanged={load}
      onEdit={() => setModal({ mode: 'edit', role: selected })}
      onDeleted={() => { setSelectedId(null); load() }} />
  }

  const totalPerms = catalog.reduce((s, m) => s + m.perms.length, 0)

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px' }}>الأدوار والصلاحيات</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            عرّف الأدوار وحدّد صلاحيات كل دور مرة واحدة، ثم أسنِد للمستخدم دوراً أو أكثر من صفحة المستخدم.
          </div>
        </div>
        {canManage && (
          <button onClick={() => setModal({ mode: 'create' })} className="btn-primary-modal"
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
            دور جديد <Plus size={16} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <Shimmer key={i} w="100%" h={104} r={14} />)}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState icon={emptyIcon} title="لا توجد أدوار" desc="أنشئ أول دور لتبدأ بتوزيع الصلاحيات" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
          {roles.map(r => (
            <RoleCard key={r.id} role={r} totalPerms={totalPerms} onClick={() => setSelectedId(r.id)} />
          ))}
        </div>
      )}

      {modal && (
        <RoleFormModal mode={modal.mode} role={modal.role} toast={toast}
          onClose={() => setModal(null)}
          onSaved={async () => { setModal(null); await load() }} />
      )}
    </div>
  )
}

function RoleCard({ role, totalPerms, onClick }) {
  const c = role.color || C.gold
  const pct = totalPerms ? Math.round((role.perm_count / totalPerms) * 100) : 0
  return (
    <div onClick={onClick}
      style={{ position: 'relative', cursor: 'pointer', borderRadius: 14, background: 'var(--card-bg)',
        border: '1px solid var(--bd)', boxShadow: '0 4px 14px rgba(0,0,0,.18)', overflow: 'hidden', transition: '.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = c + '66'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.transform = 'none' }}>
      <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: c }} />
      <div style={{ padding: '16px 18px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: c + '1e', border: `1px solid ${c}44`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={15} color={c} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{role.name_ar}</div>
            {role.name_en && <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx5)', direction: 'ltr', textAlign: 'right' }}>{role.name_en}</div>}
          </div>
          {role.is_system && <Lock size={12} color="var(--tx5)" title="دور نظامي" />}
        </div>
        <div style={{ height: 4, borderRadius: 4, background: 'var(--bd)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: c, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c }}>
            <ShieldCheck size={11} /> {role.perm_count} صلاحية
          </span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--tx5)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--tx4)' }}>
            <Users size={11} /> {role.user_count} مستخدم
          </span>
          {!role.is_active && <span style={{ marginInlineStart: 'auto', fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'var(--bd)', color: 'var(--tx5)' }}>معطّل</span>}
        </div>
      </div>
    </div>
  )
}

// ── Role editor: section/action toggles writing role_permissions ───────────
function RoleEditor({ sb, role, catalog, canManage, toast, onBack, onChanged, onEdit, onDeleted }) {
  const c = role.color || C.gold
  const [granted, setGranted] = useState(null) // Set<permission_id>
  const [busy, setBusy] = useState(() => new Set())

  useEffect(() => {
    let live = true
    svc.getRolePermissionIds(role.id).then(ids => { if (live) setGranted(new Set(ids)) })
      .catch(e => toast?.(e.message))
    return () => { live = false }
  }, [role.id, toast])

  const totalPerms = catalog.reduce((s, m) => s + m.perms.length, 0)
  const grantedCount = granted ? granted.size : 0

  const toggle = async (perm) => {
    if (!canManage || !granted || busy.has(perm.id)) return
    const next = !granted.has(perm.id)
    setBusy(b => new Set(b).add(perm.id))
    setGranted(g => { const n = new Set(g); next ? n.add(perm.id) : n.delete(perm.id); return n })
    try { await svc.setRolePermission(role.id, perm.id, next) }
    catch (e) { setGranted(g => { const n = new Set(g); next ? n.delete(perm.id) : n.add(perm.id); return n }); toast?.(e.message || 'تعذّر الحفظ') }
    finally { setBusy(b => { const n = new Set(b); n.delete(perm.id); return n }); onChanged?.() }
  }

  const toggleModule = async (mod, on) => {
    if (!canManage || !granted) return
    const ids = mod.perms.map(p => p.id)
    setGranted(g => { const n = new Set(g); ids.forEach(id => on ? n.add(id) : n.delete(id)); return n })
    try { await svc.setRolePermissionsBatch(role.id, ids, on) }
    catch (e) { toast?.(e.message || 'تعذّر الحفظ'); svc.getRolePermissionIds(role.id).then(x => setGranted(new Set(x))) }
    finally { onChanged?.() }
  }

  const del = async () => {
    if (!window.confirm(`حذف الدور «${role.name_ar}»؟`)) return
    try { await svc.deleteRole(role.id); toast?.('تم حذف الدور'); onDeleted?.() }
    catch (e) { toast?.(e.message || 'تعذّر الحذف') }
  }

  const isGmRole = role.name_en === 'General Manager' || role.name_ar === 'المدير العام'

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 48, direction: 'rtl' }}>
      <div style={{ marginBottom: 16 }}><BackButton onBack={onBack} /></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, background: c + '1e', border: `1px solid ${c}44`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldCheck size={18} color={c} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: c }}>{role.name_ar}</div>
          {role.name_en && <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx5)', direction: 'ltr', textAlign: 'right' }}>{role.name_en}</div>}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 8, background: c + '14', border: `1px solid ${c}33`, fontSize: 12, fontWeight: 800, color: c, direction: 'ltr' }}>
          {grantedCount} / {totalPerms}
        </span>
        {canManage && !role.is_system && (
          <>
            <button onClick={onEdit} title="تعديل الاسم واللون"
              style={iconBtn(C.gold)}><Pencil size={14} /></button>
            <button onClick={del} title="حذف الدور"
              style={iconBtn(C.red)}><Trash2 size={14} /></button>
          </>
        )}
      </div>

      {isGmRole && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 12, background: c + '12', border: `1px solid ${c}33`, marginBottom: 16 }}>
          <ShieldCheck size={18} color={c} />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)' }}>
            المدير العام يملك كل الصلاحيات تلقائياً — لا حاجة لتفعيلها يدوياً.
          </div>
        </div>
      )}

      {!granted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => <Shimmer key={i} w="100%" h={70} r={12} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(330px,1fr))', gap: 12, alignItems: 'start' }}>
          {catalog.map(mod => (
            <ModuleBlock key={mod.module} mod={mod} granted={granted} busy={busy} canManage={canManage}
              onToggle={toggle} onToggleModule={toggleModule} />
          ))}
        </div>
      )}
    </div>
  )
}

function ModuleBlock({ mod, granted, busy, canManage, onToggle, onToggleModule }) {
  const Icon = resolveIcon(mod.icon)
  const onCount = mod.perms.filter(p => granted.has(p.id)).length
  const allOn = onCount === mod.perms.length
  const c = C.gold
  return (
    <div style={{ borderRadius: 12, background: 'var(--inputBg)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderBottom: '1px solid var(--bd)' }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: c + '14', border: `1px solid ${c}30`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={c} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{mod.label_ar || mod.module}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: onCount ? C.ok : 'var(--tx5)' }}>{onCount}/{mod.perms.length} مفعّلة</div>
        </div>
        {canManage && (
          <button onClick={() => onToggleModule(mod, !allOn)}
            style={{ fontSize: 10.5, fontWeight: 700, padding: '4px 9px', borderRadius: 7, cursor: 'pointer',
              border: `1px solid ${allOn ? C.red + '55' : c + '55'}`, background: 'transparent', color: allOn ? C.red : c, fontFamily: F }}>
            {allOn ? 'إلغاء الكل' : 'تفعيل الكل'}
          </button>
        )}
      </div>
      <div style={{ padding: '10px 13px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {mod.perms.map(p => {
          const on = granted.has(p.id)
          const view = isViewAction(p.action)
          const saving = busy.has(p.id)
          return (
            <button key={p.id} disabled={!canManage || saving} onClick={() => onToggle(p)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8,
                border: `1px solid ${on ? C.ok + '55' : 'var(--bd)'}`,
                background: on ? 'rgba(39,160,70,.12)' : 'var(--card-bg)',
                color: on ? '#3ec46a' : 'var(--tx4)', fontFamily: F, fontSize: 11.5, fontWeight: 700,
                cursor: canManage ? (saving ? 'wait' : 'pointer') : 'default', opacity: saving ? .5 : 1, transition: '.15s' }}>
              {view && <Eye size={11} />}
              {on && !view && <Check size={11} />}
              {p.label_ar}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const iconBtn = (color) => ({
  width: 32, height: 32, borderRadius: 8, flexShrink: 0, cursor: 'pointer',
  border: `1px solid ${color}44`, background: color + '12', color,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
})

// ── Create / edit a role (name + english + color) ──────────────────────────
function RoleFormModal({ mode, role, toast, onClose, onSaved }) {
  const isEdit = mode === 'edit'
  const [f, setF] = useState({ name_ar: role?.name_ar || '', name_en: role?.name_en || '', color: role?.color || PALETTE[0] })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k, v) => { setErr(''); setF(p => ({ ...p, [k]: v })) }

  const save = async () => {
    if (!f.name_ar.trim()) { setErr('اسم الدور مطلوب'); return }
    setSaving(true)
    try {
      if (isEdit) await svc.updateRole(role.id, { name_ar: f.name_ar.trim(), name_en: f.name_en.trim() || null, color: f.color })
      else await svc.createRole({ name_ar: f.name_ar.trim(), name_en: f.name_en.trim() || null, color: f.color })
      setDone(true); setTimeout(() => onSaved?.(), 1200)
    } catch (e) { setErr(e.message || 'تعذّر الحفظ'); setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? 'تعديل الدور' : 'دور جديد'} Icon={ShieldCheck}
      width={520} variant={isEdit ? 'edit' : 'create'} errorMsg={err}
      success={done ? <SuccessView title={isEdit ? 'تم التعديل' : 'تم إنشاء الدور'} /> : null}
      footer={<ActionButton onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ…' : (isEdit ? 'تعديل' : 'إنشاء')}</ActionButton>}>
      <ModalSection Icon={ShieldCheck} label="بيانات الدور">
        <div style={GRID}>
          <TextField label="اسم الدور" req value={f.name_ar} onChange={v => set('name_ar', v)} placeholder="مثال: محاسب" />
          <TextField label="الاسم بالإنجليزية" dir="ltr" value={f.name_en} onChange={v => set('name_en', v)} placeholder="Accountant" />
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 9 }}>لون الدور</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {PALETTE.map(col => (
              <button key={col} type="button" onClick={() => set('color', col)}
                style={{ width: 30, height: 30, borderRadius: 8, cursor: 'pointer', background: col,
                  border: f.color === col ? '2px solid var(--tx)' : '2px solid transparent',
                  boxShadow: f.color === col ? `0 0 0 2px ${col}66` : 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {f.color === col && <Check size={15} color="#fff" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </ModalSection>
    </Modal>
  )
}
