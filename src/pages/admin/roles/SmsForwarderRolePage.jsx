import React, { useEffect, useState, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import {
  Phone, Edit2, Plus, Link2, Trash2, MessageSquare, Smartphone, KeyRound,
  Activity, Users, Power,
} from 'lucide-react'
import RoleLayout from './RoleLayout.jsx'
import { KCard, Lbl, sF, HeroStat, KpiBox, ModalShell, SaveBtn, C } from './RoleUI.jsx'
import SmsSendersCard from './SmsSendersCard.jsx'
import SmsMessagesCard from './SmsMessagesCard.jsx'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const ORANGE = '#f39c12'
const GOLD = '#D4A017'

const LEGACY_SENDER_OPTIONS = [
  { key: 'qiwa',      label: 'قوى' },
  { key: 'absher',    label: 'أبشر' },
  { key: 'nafath',    label: 'نفاذ' },
  { key: 'moi',       label: 'داخلية' },
  { key: 'gosi',      label: 'GOSI' },
  { key: 'muqeem',    label: 'مقيم' },
  { key: 'chamber',   label: 'الغرفة التجارية' },
  { key: 'banks',     label: 'البنوك' },
  { key: 'other',     label: 'أخرى' },
]

export default function SmsForwarderRolePage({ person, profile, onBack, toast, countries, reload }) {
  const [row, setRow] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await rolesService.getSmsForwarder(person.id)
      setRow(r)
      setStats(r?.id ? await rolesService.getSmsForwarderStats(r.id) : null)
    } catch (e) { toast?.(rolesService.humanizeDbError(e)) }
    finally { setLoading(false) }
  }, [person.id, toast])

  useEffect(() => { load() }, [load])

  const onSaved = () => { setShowModal(false); setShowLinkModal(false); load(); reload?.() }

  const onUnlink = async () => {
    if (!confirm('إلغاء ربط ملف SMS Forwarder بهذا الشخص؟')) return
    try { await rolesService.unlinkSmsForwarder(row.id); toast?.('تم إلغاء الربط'); load(); reload?.() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  const onToggleActive = async () => {
    try { await rolesService.updateSmsForwarder(row.id, { is_active: !row.is_active }); load() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  const onDelete = async () => {
    if (!confirm('حذف حساب SMS Forwarder نهائياً (مع الرسائل والصلاحيات)؟')) return
    try { await rolesService.deleteSmsForwarder(row.id); toast?.('تم الحذف'); load(); reload?.() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  return (
    <RoleLayout title="ملف SMS Forwarder" subtitle={person?.name_ar} color={ORANGE} onBack={onBack}
      actions={row ? (
        <>
          <button onClick={() => setShowModal(true)}
            style={{ height: 34, padding: '0 14px', borderRadius: 8,
              border: `1px solid ${ORANGE}`, background: 'transparent', color: ORANGE,
              fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = `${ORANGE}14` }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            تعديل <Edit2 size={13} strokeWidth={2.5} />
          </button>
          <button onClick={onUnlink}
            style={{ height: 34, padding: '0 14px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)',
              color: 'var(--tx3)', fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={12} /> إلغاء الربط
          </button>
        </>
      ) : null}>

      {/* KPI row + hero (same rhythm as UserRolePage) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2.6fr) minmax(0,1fr)', gap: 14, marginBottom: 22 }}>
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)',
          borderRadius: 14, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
            <KpiBox label="الرسائل" value={stats?.total_messages ?? 0} color={C.blue} />
            <KpiBox label="رموز OTP" value={stats?.otp_messages ?? 0} color={GOLD} />
            <KpiBox label="الجهات" value={stats?.senders_count ?? 0} color={ORANGE} />
            <KpiBox label="الحالة" value={row?.is_active ? 'نشط' : (row ? 'معطّل' : '—')}
              color={row?.is_active ? C.ok : '#999'} />
          </div>
          <MessagesChart daily={stats?.daily_14d} />
        </div>
        <HeroStat label="SMS Forwarder" value={stats?.total_messages ?? (row ? 0 : 0)} unit="رسالة"
          color={ORANGE} footer={row?.phone ? `+966${row.phone}` : 'غير مُرتبط'} />
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : !row ? (
        <div style={{ padding: 60, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12 }}>
          <Phone size={40} color={ORANGE} style={{ opacity: .6 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>
            لا يوجد حساب SMS Forwarder لهذا الشخص
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowModal(true)}
              style={{ height: 36, padding: '0 16px', borderRadius: 9,
                border: `1px solid ${ORANGE}55`, background: ORANGE + '15', color: ORANGE,
                fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> إنشاء حساب جديد
            </button>
            <button onClick={() => setShowLinkModal(true)}
              style={{ height: 36, padding: '0 16px', borderRadius: 9,
                border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.04)',
                color: 'var(--tx2)', fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Link2 size={14} /> ربط حساب موجود
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AccountCard row={row} stats={stats} onToggleActive={onToggleActive} onDelete={onDelete} />
          <SmsSendersCard
            senders={stats?.senders || []}
            total={stats?.total_messages || 0}
            allowed={row.default_senders || []}
            disabled={row.disabled_senders || []} />
          <SmsMessagesCard otpPersonId={row.id} toast={toast} senders={stats?.senders || []} />
        </div>
      )}

      {showModal && (
        <SmsForwarderModal open={showModal} onClose={() => setShowModal(false)}
          personId={person.id} person={person} row={row} toast={toast} onSaved={onSaved} />
      )}
      {showLinkModal && (
        <LinkExistingModal open={showLinkModal} onClose={() => setShowLinkModal(false)}
          personId={person.id} toast={toast} onSaved={onSaved} />
      )}
    </RoleLayout>
  )
}

// Deterministic 14-day window (today going back 13 days), merging the sparse
// daily_14d jsonb from the view. Mirrors the bar-chart style used on the
// user-role page so the two visually match.
function MessagesChart({ daily }) {
  const days = useMemo(() => {
    const map = new Map()
    ;(daily || []).forEach(d => map.set(String(d.day).slice(0, 10), Number(d.cnt || 0)))
    const today = new Date()
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (13 - i))
      const key = d.toISOString().slice(0, 10)
      return { date: d, count: map.get(key) || 0 }
    })
  }, [daily])

  const max = Math.max(1, ...days.map(d => d.count))
  const total = days.reduce((s, d) => s + d.count, 0)

  return (
    <div style={{ padding: '0 4px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '0 4px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11.5, fontWeight: 800, color: 'var(--tx)' }}>
          <Activity size={13} color={ORANGE} /> الرسائل اليومية (آخر 14 يوم)
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx4)' }}>
          الإجمالي: <span style={{ color: ORANGE, fontWeight: 800 }}>{total}</span> رسالة
        </span>
      </div>
      <div style={{ position: 'relative', height: 130, padding: '4px 2px 10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`,
          gap: 5, alignItems: 'end', height: '100%', direction: 'ltr' }}>
          {days.map((d, i) => {
            const h = (d.count / max) * 100
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: '100%' }}>
                <div title={`${d.date.toLocaleDateString('ar-SA')} — ${d.count} رسالة`}
                  style={{ width: '70%', minHeight: d.count > 0 ? 3 : 0,
                    height: `${h}%`,
                    background: d.count > 0
                      ? `linear-gradient(180deg, ${ORANGE} 0%, ${ORANGE}88 100%)`
                      : 'rgba(255,255,255,.04)',
                    borderRadius: '4px 4px 2px 2px',
                    border: d.count > 0 ? `1px solid ${ORANGE}55` : '1px solid rgba(255,255,255,.04)',
                    boxShadow: d.count > 0 ? `0 0 8px ${ORANGE}33` : 'none',
                    transition: '.2s' }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Compact info card: name/phone/device on the left, active toggle + delete on the right.
function AccountCard({ row, stats, onToggleActive, onDelete }) {
  const KV = ({ Icon, label, value, dir }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: `${ORANGE}14`, border: `1px solid ${ORANGE}33`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={13} color={ORANGE} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--tx5)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)',
          direction: dir || 'rtl', wordBreak: 'break-word',
          fontFamily: dir === 'ltr' ? "'JetBrains Mono',monospace" : F }}>
          {value ?? '—'}
        </div>
      </div>
    </div>
  )

  return (
    <div className="prs-card" style={{ padding: 16 }}>
      <div className="prs-card-title" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Smartphone size={15} color={ORANGE} /> بيانات الحساب
        </span>
        <div style={{ display: 'inline-flex', gap: 6 }}>
          <button onClick={onToggleActive}
            style={{
              height: 28, padding: '0 12px', borderRadius: 7,
              border: `1px solid ${row.is_active ? 'rgba(192,57,43,.4)' : 'rgba(39,160,70,.4)'}`,
              background: row.is_active ? 'rgba(192,57,43,.08)' : 'rgba(39,160,70,.08)',
              color: row.is_active ? '#e68a80' : '#6dcc89',
              fontFamily: F, fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
            <Power size={11} /> {row.is_active ? 'تعطيل' : 'تفعيل'}
          </button>
          <button onClick={onDelete}
            style={{
              height: 28, padding: '0 12px', borderRadius: 7,
              border: '1px solid rgba(192,57,43,.5)', background: 'rgba(192,57,43,.14)',
              color: '#e68a80', fontFamily: F, fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
            <Trash2 size={11} /> حذف الحساب
          </button>
        </div>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
      }}>
        <KV Icon={Phone} label="الاسم المختصر" value={row.name} />
        <KV Icon={Phone} label="الاسم الرسمي" value={row.full_name_ar} />
        <KV Icon={Phone} label="الاسم بالإنجليزي" value={row.name_en} dir="ltr" />
        <KV Icon={Phone} label="رقم الجوال" value={row.phone ? '+966' + row.phone : null} dir="ltr" />
        <KV Icon={Smartphone} label="معرّف الجهاز" value={row.device_key} dir="ltr" />
        <KV Icon={Users} label="المجموعة" value={row.group_name} />
        {stats?.last_message_at && (
          <KV Icon={Activity} label="آخر رسالة"
            value={new Date(stats.last_message_at).toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' })} />
        )}
        <KV Icon={KeyRound} label="رموز OTP" value={`${stats?.otp_messages || 0} رمز`} />
      </div>
    </div>
  )
}

// Polished create/edit modal — matches UserModal structure (KCards + success animation).
function SmsForwarderModal({ open, onClose, personId, person, row, toast, onSaved }) {
  const isEdit = !!row
  const [f, setF] = useState({
    name: row?.name || (person?.name_ar?.split(' ')[0] || ''),
    full_name_ar: row?.full_name_ar || person?.name_ar || '',
    name_en: row?.name_en || person?.name_en || '',
    phone: row?.phone || '',
    device_key: row?.device_key || '',
    group_name: row?.group_name || 'personal',
    is_active: row?.is_active ?? true,
    default_senders: row?.default_senders || [],
    disabled_senders: row?.disabled_senders || [],
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const toggleIn = (key, arr) => arr.includes(key) ? arr.filter(x => x !== key) : [...arr, key]

  const save = async () => {
    if (!f.name || !f.phone) { toast?.('الاسم والجوال مطلوبان'); return }
    setSaving(true)
    try {
      const payload = { ...f, person_id: personId,
        phone: String(f.phone).replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '').slice(0, 9) }
      if (isEdit) await rolesService.updateSmsForwarder(row.id, payload)
      else await rolesService.createSmsForwarder(payload)
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
          border: `1px solid ${ORANGE}22`
        }}>
          <style>{`
            @keyframes smsSuccessPop { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
            @keyframes smsSuccessCheck { 0% { stroke-dashoffset: 60 } 100% { stroke-dashoffset: 0 } }
            @keyframes smsSuccessFade { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
          `}</style>
          <div dir="rtl" style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: 'radial-gradient(circle at center, #27a04622, #27a04608)',
              border: '2px solid #27a04655',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'smsSuccessPop .5s cubic-bezier(.4,1.4,.5,1) forwards',
              boxShadow: '0 0 40px #27a04633'
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#27a046" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"
                  style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'smsSuccessCheck .45s .25s ease-out forwards' }} />
              </svg>
            </div>
            <div style={{ animation: 'smsSuccessFade .4s .45s both', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', marginBottom: 6 }}>
                {isEdit ? 'تم التعديل' : 'تم الإنشاء'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx5)' }}>
                {f.full_name_ar || f.name}
              </div>
            </div>
          </div>
        </div>
      </div>, document.body
    )
  }

  return (
    <ModalShell open={open} onClose={onClose}
      title={isEdit ? 'تعديل حساب SMS Forwarder' : 'إنشاء حساب SMS Forwarder'} Icon={Phone}
      footer={<><div style={{ flex: 1 }} />
        <SaveBtn onClick={save} disabled={saving}
          label={saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ' : 'إنشاء')} /></>}>
      <KCard Icon={Phone} label="بيانات الحساب">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div><Lbl req>الاسم المختصر</Lbl>
            <input value={f.name} onChange={e => set('name', e.target.value)} style={sF} /></div>
          <div><Lbl>الاسم الرسمي</Lbl>
            <input value={f.full_name_ar} onChange={e => set('full_name_ar', e.target.value)} style={sF} /></div>
          <div><Lbl>الاسم بالإنجليزي</Lbl>
            <input value={f.name_en} onChange={e => set('name_en', e.target.value.toUpperCase())} dir="ltr"
              style={{ ...sF, direction: 'ltr', textTransform: 'uppercase' }} /></div>
          <div><Lbl req>الجوال</Lbl>
            <div style={{
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
                fontSize: 12, fontWeight: 700, color: ORANGE, flexShrink: 0
              }}>+966</div>
              <input value={f.phone}
                onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="5XXXXXXXX" maxLength={9}
                style={{
                  width: '100%', height: '100%', padding: '0 12px',
                  border: 'none', background: 'transparent',
                  fontFamily: F, fontSize: 13, fontWeight: 600,
                  color: 'var(--tx)', outline: 'none', textAlign: 'left'
                }} />
            </div></div>
          <div><Lbl>معرّف الجهاز</Lbl>
            <input value={f.device_key} onChange={e => set('device_key', e.target.value)} dir="ltr"
              style={{ ...sF, direction: 'ltr' }} /></div>
          <div><Lbl>المجموعة</Lbl>
            <input value={f.group_name} onChange={e => set('group_name', e.target.value)} style={sF} /></div>
        </div>
      </KCard>

      <KCard Icon={MessageSquare} label="الجهات">
        <div style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 700, marginBottom: 8 }}>المسموحة</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {LEGACY_SENDER_OPTIONS.map(s => {
            const on = f.default_senders.includes(s.key)
            return (
              <button key={s.key} type="button"
                onClick={() => set('default_senders', toggleIn(s.key, f.default_senders))}
                style={{ height: 32, padding: '0 12px', borderRadius: 8,
                  border: `1px solid ${on ? 'rgba(39,160,70,.5)' : 'rgba(255,255,255,.1)'}`,
                  background: on ? 'rgba(39,160,70,.14)' : 'rgba(255,255,255,.03)',
                  color: on ? '#6dcc89' : 'var(--tx3)',
                  fontFamily: F, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5, transition: '.15s' }}>
                {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                {s.label}
              </button>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 700, marginBottom: 8 }}>الممنوعة</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {LEGACY_SENDER_OPTIONS.map(s => {
            const on = f.disabled_senders.includes(s.key)
            return (
              <button key={s.key} type="button"
                onClick={() => set('disabled_senders', toggleIn(s.key, f.disabled_senders))}
                style={{ height: 32, padding: '0 12px', borderRadius: 8,
                  border: `1px solid ${on ? 'rgba(192,57,43,.5)' : 'rgba(255,255,255,.1)'}`,
                  background: on ? 'rgba(192,57,43,.14)' : 'rgba(255,255,255,.03)',
                  color: on ? '#e68a80' : 'var(--tx3)',
                  fontFamily: F, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5, transition: '.15s' }}>
                {on && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                {s.label}
              </button>
            )
          })}
        </div>
      </KCard>

      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center' }}>
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
          حساب نشط
        </label>
      </div>
    </ModalShell>
  )
}

function LinkExistingModal({ open, onClose, personId, toast, onSaved }) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!open) return
    rolesService.listUnlinkedSmsForwarders()
      .then(setOptions)
      .catch(e => toast?.(rolesService.humanizeDbError(e)))
      .finally(() => setLoading(false))
  }, [open, toast])

  const doLink = async () => {
    if (!selected) { toast?.('اختر حساباً'); return }
    try { await rolesService.linkSmsForwarder(selected, personId); toast?.('تم الربط'); onSaved?.() }
    catch (e) { toast?.(rolesService.humanizeDbError(e)) }
  }

  return (
    <ModalShell open={open} onClose={onClose} title="ربط حساب موجود" Icon={Link2}
      footer={<><div style={{ flex: 1 }} /><SaveBtn onClick={doLink} label="ربط" /></>}>
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx5)' }}>جاري التحميل...</div>
      ) : options.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx5)' }}>لا توجد حسابات غير مرتبطة</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map(o => (
            <button key={o.id} type="button" onClick={() => setSelected(o.id)}
              style={{ padding: '12px 14px', borderRadius: 10, textAlign: 'start',
                border: `1px solid ${selected === o.id ? ORANGE + '55' : 'rgba(255,255,255,.06)'}`,
                background: selected === o.id ? ORANGE + '10' : 'rgba(0,0,0,.2)',
                fontFamily: F, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{o.name}</div>
                <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 2 }}>{o.full_name_ar || '—'}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx4)', direction: 'ltr', fontFamily: "'JetBrains Mono',monospace" }}>
                +966{o.phone}
              </div>
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  )
}
