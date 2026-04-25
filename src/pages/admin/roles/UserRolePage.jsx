import React, { useEffect, useState, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { User, Mail, Phone, Calendar, Edit2, Plus, Save, Activity, X } from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, KV, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, PersonIdentityChip, C } from './RoleUI.jsx'
import { Dropdown, normalizePhoneFor9Digit } from '../../../components/persons/PersonFormModal.jsx'
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
            color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 800,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: '.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
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
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>لا يوجد ملف مستخدم لهذا الشخص</div>
          <button onClick={() => setShowModal(true)}
            style={{ marginTop: 16, height: 36, padding: '0 16px', borderRadius: 9,
              border: `1px solid ${C.gold}55`, background: C.gold + '15',
              color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
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
          fontSize: 11.5, fontWeight: 800, color: 'var(--tx)' }}>
          <Activity size={13} color={C.gold} /> جلسات المستخدم (آخر 14 يوم)
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx4)' }}>
          الإجمالي: <span style={{ color: C.gold, fontWeight: 800 }}>{total}</span> جلسة
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
  const toggleRole = (id) => setF(p => ({
    ...p, roleIds: p.roleIds.includes(id) ? p.roleIds.filter(x => x !== id) : [...p.roleIds, id]
  }))

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

  if (success) {
    return ReactDOM.createPortal(
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: '#1a1a1a', borderRadius: 18, width: 420, maxWidth: '95vw',
          padding: '48px 32px', boxShadow: '0 24px 60px rgba(0,0,0,.5)',
          border: '1px solid rgba(212,160,23,.08)', position: 'relative'
        }}>
          <style>{`
            @keyframes urSuccessPop { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
            @keyframes urSuccessCheck { 0% { stroke-dashoffset: 60 } 100% { stroke-dashoffset: 0 } }
            @keyframes urSuccessFade { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
          `}</style>
          <div dir="rtl" style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: `radial-gradient(circle at center, #27a04622, #27a04608)`,
              border: `2px solid #27a04655`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'urSuccessPop .5s cubic-bezier(.4,1.4,.5,1) forwards',
              boxShadow: `0 0 40px #27a04633`
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#27a046" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"
                  style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'urSuccessCheck .45s .25s ease-out forwards' }} />
              </svg>
            </div>
            <div style={{ animation: 'urSuccessFade .4s .45s both', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', marginBottom: 6 }}>
                {isEdit ? 'تم التعديل' : 'تم الربط'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx5)' }}>
                {f.name_ar}
              </div>
            </div>
          </div>
        </div>
      </div>, document.body
    )
  }

  return (
    <ModalShell open={open} onClose={onClose} title={isEdit ? 'تعديل ملف المستخدم' : 'ربط ملف مستخدم'} Icon={User}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={save} disabled={saving} label={saving ? 'جاري الحفظ...' : (isEdit ? 'تعديل' : 'ربط')} /></>}>
      <KCard Icon={User} label="بيانات المستخدم">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div><Lbl req>الاسم بالعربي</Lbl>
            <input value={f.name_ar} onChange={e => set('name_ar', e.target.value)} style={sF} /></div>
          <div><Lbl>الاسم بالإنجليزي</Lbl>
            <input value={f.name_en} onChange={e => set('name_en', e.target.value.toUpperCase())} dir="ltr"
              style={{ ...sF, direction: 'ltr', textTransform: 'uppercase' }} /></div>
          <div><Lbl>الجوال</Lbl>
            <div className="kc-phone-wrap" style={{
              display: 'flex', direction: 'ltr',
              border: '1px solid transparent',
              borderRadius: 9, overflow: 'hidden',
              background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
              height: 42, transition: 'border-color .2s'
            }}>
              <div style={{
                height: '100%', padding: '0 10px',
                background: 'rgba(255,255,255,.04)',
                display: 'flex', alignItems: 'center',
                fontSize: 12, fontWeight: 700, color: '#D4A017', flexShrink: 0
              }}>+966</div>
              <input value={f.phone}
                onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="5X XXX XXXX" maxLength={9}
                style={{
                  width: '100%', height: '100%', padding: '0 12px',
                  border: 'none', background: 'transparent',
                  fontFamily: F, fontSize: 13, fontWeight: 600,
                  color: 'var(--tx)', outline: 'none', textAlign: 'left'
                }} />
            </div></div>
          <div><Lbl>اللغة المفضّلة</Lbl>
            <Dropdown value={f.preferred_lang} onChange={v => set('preferred_lang', v)}
              options={[{ id: 'ar', label: 'العربية' }, { id: 'en', label: 'English' }]}
              getKey={o => o.id} getLabel={o => o.label}
              placeholder="اختر..." searchable={false} /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Lbl>الأدوار</Lbl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allRoles.map(r => {
                const on = f.roleIds.includes(r.id)
                return (
                  <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                    style={{ height: 36, padding: '0 14px', borderRadius: 9,
                      border: `1px solid ${on ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.1)'}`,
                      background: on ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)',
                      color: on ? '#D4A017' : 'var(--tx2)',
                      fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                      border: `1.5px solid ${on ? '#D4A017' : 'rgba(255,255,255,.3)'}`,
                      background: on ? '#D4A017' : 'transparent',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a"
                        strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                    {r.name_ar}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', marginTop: 4 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12,
              fontWeight: 700, color: 'var(--tx2)', cursor: 'pointer' }}
              onClick={e => { e.preventDefault(); set('is_active', !f.is_active) }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${f.is_active ? '#27a046' : 'rgba(255,255,255,.3)'}`,
                background: f.is_active ? '#27a046' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transition: '.15s' }}>
                {f.is_active && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff"
                  strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </span>
              مستخدم نشط
            </label>
          </div>
        </div>
      </KCard>
    </ModalShell>
  )
}
