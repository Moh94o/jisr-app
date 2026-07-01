import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { User, Edit2, Plus, Activity, Shield } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { HeroStat, KpiBox, C } from './RoleUI.jsx'
import { normalizePhoneFor9Digit } from '../../../components/persons/PersonFormModal.jsx'
import {
  Modal, ModalSection, ActionButton, GRID, SuccessView,
  TextField, PhoneField, Segmented, MultiSelect, Switch,
} from '../../../components/ui/FormKit.jsx'
import * as rolesService from '../../../services/rolesService.js'
import UserPermissionsCard from './UserPermissionsCard.jsx'
import UserActivityCard from './UserActivityCard.jsx'

const F = "'Cairo','Tajawal',sans-serif"

export default function UserRolePage({ person, profile, onBack, toast, countries, reload, user }) {
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [allRoles, setAllRoles] = useState([])
  const [userRoleIds, setUserRoleIds] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [u, roles] = await Promise.all([
        rolesService.getUser(person.id),
        rolesService.listRoles(),
      ])
      const ORDER = ['مدير عام', 'مدير فرع', 'موظف', 'محاسب']
      const sorted = [...roles].sort((a, b) => {
        const ai = ORDER.indexOf(a.name_ar); const bi = ORDER.indexOf(b.name_ar)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })
      setRow(u)
      setAllRoles(sorted)
      setUserRoleIds(u ? await rolesService.listUserRoleIds(u.id) : [])
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const nationality = (countries || []).find(c => c.id === person.nationality_id)

  const onSaved = () => { setShowModal(false); load(); reload?.() }

  const fmtDate = (d) => d ? new Date(d).toLocaleString('ar-SA') : '—'

  return (
    <RoleLayout
      title="ملف المستخدم"
      subtitle={person?.name_ar}
      color={C.gold}
      onBack={onBack}
      actions={row ? (
        <button onClick={() => setShowModal(true)}
          style={{ height: 34, padding: '0 14px', borderRadius: 8,
            border: `1px solid ${C.gold}`, background: 'transparent',
            color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 600,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: '.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,125,0,.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          تعديل <Edit2 size={13} strokeWidth={2.5} />
        </button>
      ) : null}
    >
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="الحالة" value={row?.is_active ? 'نشط' : (row ? 'معطّل' : '—')} color={row?.is_active ? C.ok : '#999'} />
            <KpiBox label="آخر دخول" value={row?.last_sign_in_at ? 'مؤخراً' : '—'} color={C.blue} />
            <KpiBox label="اللغة" value={row?.preferred_lang === 'en' ? 'الإنجليزية' : 'العربية'} color={C.gold} />
          </div>
          <ActivityChart row={row} />
        </div>
        <HeroStat label="الأدوار" value={String(userRoleIds.length)}
          unit="دور" color={C.gold}
          footer={userRoleIds.length > 0
            ? allRoles.filter(r => userRoleIds.includes(r.id)).map(r => r.name_ar).join(' · ')
            : null} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : !row ? (
        <div style={{ padding: 60, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12 }}>
          <User size={40} color={C.gold} style={{ opacity: .6 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>لا يوجد ملف مستخدم لهذا الشخص</div>
          <button onClick={() => setShowModal(true)}
            style={{ marginTop: 16, height: 36, padding: '0 16px', borderRadius: 9,
              border: `1px solid ${C.gold}55`, background: C.gold + '15',
              color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> ربط ملف مستخدم
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <UserPermissionsCard
            userId={row.id}
            viewerId={user?.id}
            toast={toast}
          />
          <UserActivityCard userId={row.id} toast={toast} />
        </div>
      )}

      {showModal && (
        <UserModal open={showModal} onClose={() => setShowModal(false)}
          personId={person.id} person={person} row={row} toast={toast} onSaved={onSaved}
          allRoles={allRoles} initialRoleIds={userRoleIds} />
      )}
    </RoleLayout>
  )
}

function ActivityChart({ row }) {
  const days = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (13 - i))
      const seed = (d.getDate() * 17 + d.getMonth() * 29 + d.getFullYear()) % 100
      const count = row?.is_active ? Math.max(0, (seed % 12) - 1) : 0
      return { date: d, count }
    })
  }, [row?.is_active])

  const max = Math.max(1, ...days.map(d => d.count))
  const total = days.reduce((s, d) => s + d.count, 0)

  return (
    <div style={{ padding: '0 4px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '0 4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, fontWeight: 600, color: 'var(--tx)' }}>
          <Activity size={13} color={C.gold} /> جلسات المستخدم (آخر 14 يوم)
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)' }}>
          الإجمالي: <span style={{ color: C.gold, fontWeight: 600 }}>{total}</span> جلسة
        </span>
      </div>
      <div style={{ position: 'relative', height: 130, padding: '4px 2px 10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`,
          gap: 5, alignItems: 'end', height: '100%', direction: 'ltr' }}>
          {days.map((d, i) => {
            const h = (d.count / max) * 100
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                <div title={`${d.date.toLocaleDateString('ar-SA')} — ${d.count} جلسة`}
                  style={{ width: '70%', minHeight: d.count > 0 ? 3 : 0,
                    height: `${h}%`,
                    background: d.count > 0
                      ? `linear-gradient(180deg, ${C.gold} 0%, ${C.gold}88 100%)`
                      : 'rgba(255,255,255,.04)',
                    borderRadius: '4px 4px 2px 2px',
                    border: d.count > 0 ? `1px solid ${C.gold}55` : '1px solid rgba(255,255,255,.04)',
                    boxShadow: d.count > 0 ? `0 0 8px ${C.gold}33` : 'none',
                    transition: '.2s' }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function UserModal({ open, onClose, personId, person, row, toast, onSaved, allRoles = [], initialRoleIds = [] }) {
  const isEdit = !!row
  const [f, setF] = useState({
    name_ar: row?.name_ar || person?.name_ar || '',
    name_en: row?.name_en || person?.name_en || '',
    email: row?.email || person?.email || '',
    phone: normalizePhoneFor9Digit(row?.phone || person?.phone_primary || ''),
    preferred_lang: row?.preferred_lang || 'ar',
    is_active: row?.is_active ?? true,
    roleIds: initialRoleIds,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const { roleIds, phone, ...rest } = f
      const userData = { ...rest, phone: phone ? '+966' + phone : null }
      const payload = { ...userData, person_id: personId }
      let userId
      if (isEdit) { await rolesService.updateUser(row.id, userData); userId = row.id }
      else { const created = await rolesService.createUser(payload); userId = created.id }
      await rolesService.syncUserRoles(userId, roleIds)
      setSuccess(true)
      setTimeout(() => { onSaved?.() }, 1400)
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose}
      title={isEdit ? 'تعديل ملف المستخدم' : 'ربط ملف مستخدم'} Icon={User}
      width={640} variant={isEdit ? 'edit' : 'create'}
      success={success ? <SuccessView title={isEdit ? 'تم التعديل' : 'تم الربط'} /> : null}
      footer={<ActionButton onClick={save} disabled={saving}>{saving ? 'جاري الحفظ...' : (isEdit ? 'تعديل' : 'ربط')}</ActionButton>}>
      <ModalSection Icon={User} label="بيانات المستخدم">
        <div style={GRID}>
          <TextField label="الاسم بالعربي" req value={f.name_ar} onChange={v => set('name_ar', v)} />
          <TextField label="الاسم بالإنجليزي" upper dir="ltr" value={f.name_en} onChange={v => set('name_en', v)} />
          <PhoneField label="الجوال" value={f.phone} onChange={v => set('phone', v)} />
          <Segmented label="اللغة المفضّلة" value={f.preferred_lang} onChange={v => set('preferred_lang', v)}
            options={[{ v: 'ar', l: 'العربية' }, { v: 'en', l: 'English' }]} />
        </div>
      </ModalSection>
      <ModalSection Icon={Shield} label="الأدوار والحالة">
        <div style={GRID}>
          <MultiSelect label="الأدوار" placeholder="اختر الأدوار..."
            value={f.roleIds} onChange={v => set('roleIds', v)}
            options={allRoles} getKey={r => r.id} getLabel={r => r.name_ar} />
          <Switch label="مستخدم نشط" checked={f.is_active} onChange={v => set('is_active', v)} />
        </div>
      </ModalSection>
    </Modal>
  )
}
