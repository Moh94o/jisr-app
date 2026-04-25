import React, { useEffect, useState, useMemo } from 'react'
import * as LucideIcons from 'lucide-react'
import { ShieldCheck, ChevronDown, Plus, Minus, Lock } from 'lucide-react'
import * as userProfileService from '../../../services/userProfileService.js'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'
const GOLD_SOFT = '#e8c77a'

// Resolve a Lucide icon from its string name (e.g. "Building2" → component).
// Falls back to ShieldCheck when the name isn't recognized.
const resolveIcon = (name) => {
  if (!name) return ShieldCheck
  return LucideIcons[name] || ShieldCheck
}

const ActionChip = ({ perm, canToggle, saving, onToggle }) => {
  const [hover, setHover] = useState(false)
  const granted = !!perm.is_granted
  const isUserGrant = perm.source === 'user_grant'
  const isUserDeny = perm.source === 'user_deny'
  const bg = granted ? 'rgba(212,160,23,.12)' : 'rgba(255,255,255,.03)'
  const border = granted ? 'rgba(212,160,23,.35)' : 'rgba(255,255,255,.06)'
  const color = granted ? GOLD_SOFT : 'rgba(255,255,255,.35)'

  const scopeText = perm.scope && perm.scope !== 'all' ? `النطاق: ${perm.scope}` : null
  const conditionsText = perm.conditions ? `شروط: ${JSON.stringify(perm.conditions)}` : null
  const hasTooltip = !!(scopeText || conditionsText)

  const Tag = canToggle ? 'button' : 'span'
  const interactiveProps = canToggle ? {
    type: 'button',
    disabled: saving,
    onClick: (e) => { e.stopPropagation(); onToggle?.(perm) },
  } : {}

  return (
    <Tag
      {...interactiveProps}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 7,
        background: bg, border: `1px solid ${border}`,
        fontFamily: F, fontSize: 11, fontWeight: 700, color,
        textDecoration: granted ? 'none' : 'line-through',
        cursor: canToggle ? (saving ? 'wait' : 'pointer') : 'default',
        opacity: saving ? .55 : 1,
        transition: '.15s',
      }}
    >
      {perm.label_ar}
      {isUserGrant && (
        <span title="ممنوحة بشكل خاص" style={{
          width: 14, height: 14, borderRadius: '50%',
          background: GOLD, color: '#0a0a0a',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 6px ${GOLD}88`,
        }}>
          <Plus size={10} strokeWidth={3} />
        </span>
      )}
      {isUserDeny && (
        <span title="محظورة بشكل خاص" style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#c0392b', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Minus size={10} strokeWidth={3} />
        </span>
      )}
      {hover && hasTooltip && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', right: 0,
          background: '#0a0a0a', border: '1px solid rgba(212,160,23,.3)',
          borderRadius: 7, padding: '6px 10px', minWidth: 140, maxWidth: 260,
          fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,.85)',
          whiteSpace: 'normal', zIndex: 10, textDecoration: 'none',
          boxShadow: '0 8px 20px rgba(0,0,0,.6)', lineHeight: 1.5,
        }}>
          {scopeText && <div>{scopeText}</div>}
          {conditionsText && <div style={{ marginTop: 3, direction: 'ltr', fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5 }}>{conditionsText}</div>}
        </span>
      )}
    </Tag>
  )
}

const ModuleCard = ({ row, defaultOpen, canToggle, savingIds, onToggle }) => {
  const [open, setOpen] = useState(!!defaultOpen)
  const Icon = resolveIcon(row.module_icon)
  const granted = Number(row.granted_count || 0)
  const total = Number(row.total_count || 0)
  const pct = total ? Math.round((granted / total) * 100) : 0
  const perms = Array.isArray(row.permissions) ? row.permissions : []

  return (
    <div style={{
      background: '#141414', border: '1px solid rgba(255,255,255,.06)',
      borderRadius: 12, overflow: 'hidden', transition: '.2s',
    }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '12px 14px', background: 'transparent',
          border: 'none', cursor: 'pointer', color: 'var(--tx)',
          display: 'flex', alignItems: 'center', gap: 10, fontFamily: F,
        }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: `${GOLD}14`, border: `1px solid ${GOLD}30`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={16} color={GOLD} strokeWidth={2} />
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.3 }}>
            {row.module_label_ar || row.module}
          </div>
          <div style={{
            marginTop: 6, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.05)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: `linear-gradient(90deg, ${GOLD} 0%, ${GOLD_SOFT} 100%)`,
              transition: 'width .4s ease', boxShadow: `0 0 8px ${GOLD}55`,
            }} />
          </div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 6,
          background: granted ? `${GOLD}14` : 'rgba(255,255,255,.04)',
          border: `1px solid ${granted ? GOLD + '33' : 'rgba(255,255,255,.06)'}`,
          fontSize: 11, fontWeight: 800,
          color: granted ? GOLD_SOFT : 'rgba(255,255,255,.4)',
          direction: 'ltr', flexShrink: 0,
        }}>
          {granted} / {total}
        </span>
        <ChevronDown size={14} color="rgba(255,255,255,.4)"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
      </button>
      {open && (
        <div style={{
          padding: '4px 14px 14px',
          borderTop: '1px solid rgba(255,255,255,.04)',
          display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12,
        }}>
          {perms.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 700, padding: '8px 0' }}>
              لا توجد صلاحيات في هذا الموديول
            </div>
          ) : perms.map(p => (
            <ActionChip key={p.permission_id} perm={p}
              canToggle={canToggle}
              saving={savingIds?.has(p.permission_id)}
              onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function UserPermissionsCard({ userId, viewerId, toast }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [canManage, setCanManage] = useState(false)
  const [savingIds, setSavingIds] = useState(() => new Set())

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    Promise.all([
      userProfileService.listUserPermissionsSummary(userId),
      viewerId
        ? userProfileService.hasEffectivePermission(viewerId, 'admin', 'manage_permissions')
        : Promise.resolve(false),
    ]).then(([data, can]) => {
      if (cancelled) return
      setRows(data)
      setCanManage(!!can)
    }).catch(e => toast?.(e.message || 'خطأ في تحميل الصلاحيات'))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, viewerId, toast])

  const totals = useMemo(() => {
    const granted = rows.reduce((s, r) => s + Number(r.granted_count || 0), 0)
    const total = rows.reduce((s, r) => s + Number(r.total_count || 0), 0)
    return { granted, total }
  }, [rows])

  // Optimistic toggle: flip the chip in local state, call the service, revert
  // on failure. granted_count at the module level is recomputed from the
  // updated permissions array.
  const handleToggle = async (perm) => {
    if (!canManage) return
    if (savingIds.has(perm.permission_id)) return
    const nextGranted = !perm.is_granted
    // Source transitions: if it was a role-inherited grant/deny, becomes an
    // explicit user_grant/user_deny override; if it was already a user override,
    // stays that way but with the flipped value.
    const nextSource = nextGranted ? 'user_grant' : 'user_deny'

    const prev = rows
    setRows(rs => rs.map(r => {
      const perms = (r.permissions || []).map(p =>
        p.permission_id === perm.permission_id
          ? { ...p, is_granted: nextGranted, source: nextSource }
          : p
      )
      const granted_count = perms.filter(p => p.is_granted).length
      return { ...r, permissions: perms, granted_count }
    }))
    setSavingIds(s => { const n = new Set(s); n.add(perm.permission_id); return n })

    try {
      await userProfileService.setUserPermission(userId, perm.permission_id, nextGranted)
    } catch (e) {
      setRows(prev)
      toast?.(e.message || 'تعذر حفظ الصلاحية')
    } finally {
      setSavingIds(s => { const n = new Set(s); n.delete(perm.permission_id); return n })
    }
  }

  return (
    <div className="prs-card" style={{ padding: 16 }}>
      <div className="prs-card-title">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={15} color={GOLD} /> الصلاحيات
          {!loading && (
            <span style={{
              marginInlineStart: 6, padding: '2px 8px', borderRadius: 6,
              background: `${GOLD}14`, border: `1px solid ${GOLD}33`,
              fontSize: 10.5, fontWeight: 800, color: GOLD_SOFT, direction: 'ltr',
            }}>
              {totals.granted} / {totals.total}
            </span>
          )}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 30, textAlign: 'center', fontSize: 12, color: 'var(--tx5)' }}>
          جاري التحميل...
        </div>
      ) : rows.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)',
          borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <Lock size={22} color={GOLD} style={{ opacity: .5 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>
            لا توجد صلاحيات مُسندة لهذا المستخدم
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 10,
        }}>
          {rows.map(r => (
            <ModuleCard key={r.module} row={r} defaultOpen={false}
              canToggle={canManage} savingIds={savingIds} onToggle={handleToggle} />
          ))}
        </div>
      )}
    </div>
  )
}
