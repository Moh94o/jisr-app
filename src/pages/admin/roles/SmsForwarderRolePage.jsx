import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Smartphone, Copy, Check, AlertCircle, AlertTriangle, RefreshCw, Trash2, ShieldCheck,
  MessageSquare, Plus, Tag, RotateCcw, Link2, X,
  ArrowRight, Users, Activity, Inbox, Calendar,
} from 'lucide-react'
import { getSupabase } from '../../../lib/supabase.js'
import {
  listForwardersByPerson,
  toggleForwarderActive,
  regenerateDeviceKey,
  softDeleteForwarder,
  reactivateForwarder,
  getForwarderStats,
  translateSmsError,
} from '../../../services/smsForwarderService.js'
import { maskSaudiPhone } from '../../../lib/saudi-phone.js'
import SmsForwarderSetupModal from '../SmsForwarderSetupModal.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const ORANGE = '#f39c12'
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

const SUPABASE_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
const ENDPOINT_URL = `${SUPABASE_URL}/functions/v1/receive-otp`

function buildBodyJson(deviceKey) {
  return JSON.stringify({ device_key: deviceKey, message: '%m', sender: '%s', timestamp: '%d' }, null, 2)
}
function buildHeadersJson() {
  return JSON.stringify({ Authorization: `Bearer ${SUPABASE_ANON_KEY}` }, null, 2)
}

function fmtArabicDate(iso) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) }
  catch { return iso }
}
function relTime(iso) {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 86400 * 30) return `قبل ${Math.floor(diff / 86400)} يوم`
  try { return new Date(iso).toLocaleDateString('ar-SA') } catch { return '' }
}

// Full-page SMS Forwarder management — lists all forwarders for the person
// with full inline controls per card, modeled after ClientRolePage layout.
export default function SmsForwarderRolePage({ person, onBack, toast, reload }) {
  const [rows, setRows] = useState([])
  const [statsById, setStatsById] = useState({})  // { [forwarderId]: { messageCount, lastMessageAt } }
  const [loading, setLoading] = useState(true)
  const [showSetup, setShowSetup] = useState(false)
  const [selectedTabId, setSelectedTabId] = useState(null)  // null = show all

  const toastRef = useRef(toast)
  useEffect(() => { toastRef.current = toast }, [toast])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listForwardersByPerson(person.id, { includeDeleted: true })
      setRows(list)
      const statsEntries = await Promise.all(
        list.map(async f => [f.id, await getForwarderStats(f.id).catch(() => ({ messageCount: 0, messagesToday: 0, lastMessageAt: null }))])
      )
      setStatsById(Object.fromEntries(statsEntries))
    } catch (e) { toastRef.current?.(translateSmsError(e)) }
    finally { setLoading(false) }
  }, [person.id])

  useEffect(() => { load() }, [load])

  const tabRows = rows.filter(f => !f.deleted_at)
  const visible = selectedTabId ? tabRows.filter(f => f.id === selectedTabId) : tabRows
  const activeCount = rows.filter(f => f.is_active && !f.deleted_at).length
  const totalMessages = Object.values(statsById).reduce((s, v) => s + (v?.messageCount || 0), 0)
  const totalToday = Object.values(statsById).reduce((s, v) => s + (v?.messagesToday || 0), 0)
  const deletedCount = rows.filter(f => f.deleted_at).length

  return (
    <div dir="rtl" style={{ fontFamily: F, color: 'var(--tx2)', padding: '32px 32px 48px' }}>
      {/* Header — back+breadcrumb / title+subtitle / add-account */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        borderBottom: '1px solid rgba(255,255,255,.06)', paddingBottom: 18, marginBottom: 28,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flexShrink: 0 }}>
          <button onClick={onBack} title="رجوع لملف الشخص"
            style={{
              alignSelf: 'flex-start', height: 36, padding: '0 14px', borderRadius: 8,
              background: '#141414', border: '1px solid rgba(255,255,255,.06)',
              color: 'var(--tx2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: F, fontSize: 12, fontWeight: 700, transition: '.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)'; e.currentTarget.style.color = C.gold }}
            onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx2)' }}>
            <ArrowRight size={13} /> رجوع لملف الشخص
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tx5)', fontWeight: 600, paddingInlineStart: 4 }}>
            <span>الأشخاص</span>
            <span style={{ opacity: .5 }}>←</span>
            <span>{person?.name_ar || '—'}</span>
            <span style={{ opacity: .5 }}>←</span>
            <span style={{ color: ORANGE, fontWeight: 700 }}>SMS Forwarder</span>
          </div>
        </div>

        <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-.3px', lineHeight: 1.2 }}>
            ملف SMS Forwarder
          </div>
          {person?.name_ar && (
            <div style={{ fontSize: 14, color: '#9aa3af', fontWeight: 600, marginTop: 6 }}>
              {person.name_ar}
            </div>
          )}
        </div>

        <button onClick={() => setShowSetup(true)}
          style={{
            flexShrink: 0, padding: '10px 20px', borderRadius: 10,
            border: `1px solid ${C.gold}66`, background: 'transparent', color: C.gold,
            fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8, transition: '.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${C.gold}14`; e.currentTarget.style.borderColor = C.gold }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${C.gold}66` }}>
          <Plus size={16} strokeWidth={2.5} />
          إضافة حساب
        </button>
      </div>

      {/* Stats — 4 cards on aggregate, 3 cards when a single forwarder tab is selected */}
      {(() => {
        const sel = selectedTabId ? rows.find(r => r.id === selectedTabId) : null
        if (sel) {
          const s = statsById[sel.id] || { messageCount: 0, lastMessageAt: null }
          const status = sel.deleted_at ? 'محذوف' : (sel.is_active ? 'نشط' : 'معطّل')
          const statusColor = sel.deleted_at ? C.red : (sel.is_active ? C.ok : '#e67e22')
          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 14, marginBottom: 28 }}>
              <StatCard Icon={Inbox} iconColor={C.gold} label="عدد الرسائل" value={s.messageCount} />
              <StatCard Icon={Activity} iconColor={statusColor} label="حالة الحساب" value={status} />
              <StatCard Icon={Calendar} iconColor={ORANGE} label="آخر رسالة" value={s.lastMessageAt ? relTime(s.lastMessageAt) : '—'} />
            </div>
          )
        }
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 14, marginBottom: 28 }}>
            <StatCard Icon={Users} iconColor={C.gold} label="إجمالي الحسابات" value={rows.length - deletedCount}
              subText={deletedCount ? `${deletedCount} محذوف` : null} />
            <StatCard Icon={Activity} iconColor={C.ok} label="حسابات نشطة" value={activeCount} />
            <StatCard Icon={Inbox} iconColor={C.gold} label="إجمالي الرسائل" value={totalMessages} />
            <StatCard Icon={Calendar} iconColor={ORANGE} label="رسائل اليوم" value={totalToday} subText="منذ منتصف الليل" />
          </div>
        )
      })()}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx5)', fontFamily: F, fontSize: 12 }}>جاري التحميل...</div>
      ) : visible.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12,
          fontFamily: F,
        }}>
          <Smartphone size={40} color={ORANGE} style={{ opacity: .6 }} />
          <div style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>لا يوجد حسابات SMS Forwarder بعد</div>
          <button onClick={() => setShowSetup(true)} style={{
            marginTop: 16, height: 36, padding: '0 16px', borderRadius: 9,
            border: `1px solid ${ORANGE}`, background: `${ORANGE}14`, color: ORANGE,
            fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}><Plus size={14} /> إضافة حساب جديد</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visible.map(fwd => (
            <ForwarderCard
              key={fwd.id}
              forwarder={fwd}
              person={person}
              stats={statsById[fwd.id] || { messageCount: 0, lastMessageAt: null }}
              toast={toast}
              onChanged={() => { load(); reload?.() }}
            />
          ))}
        </div>
      )}

      {showSetup && (
        <SmsForwarderSetupModal
          person={person}
          toast={toast}
          onClose={() => setShowSetup(false)}
          onCreated={() => { setShowSetup(false); load(); reload?.() }}
        />
      )}
    </div>
  )
}

// Compact stat card — icon chip + label + big number + optional sub-text.
function StatCard({ Icon, iconColor, label, value, subText }) {
  return (
    <div style={{
      background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14,
      padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${iconColor}1a`, border: `1px solid ${iconColor}33`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={iconColor} strokeWidth={2.2} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#9aa3af', letterSpacing: '.2px' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', direction: 'ltr', textAlign: 'right', lineHeight: 1, wordBreak: 'break-word' }}>{value}</div>
      {subText && (
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{subText}</div>
      )}
    </div>
  )
}

// One card per forwarder — shows label/status/key/notes/stats and inline actions.
function ForwarderCard({ forwarder, person, stats, toast, onChanged }) {
  const isDeleted = !!forwarder.deleted_at
  const [copiedField, setCopiedField] = useState(null)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newKeyShown, setNewKeyShown] = useState(null)
  const [showBindingModal, setShowBindingModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)

  const handleToggleActive = async () => {
    try { await toggleForwarderActive(forwarder.id, !forwarder.is_active); onChanged?.() }
    catch (e) { toast?.(translateSmsError(e)) }
  }
  const handleRegen = async () => {
    setConfirmRegen(false)
    try {
      const { deviceKey } = await regenerateDeviceKey(forwarder.id)
      setNewKeyShown(deviceKey); onChanged?.()
    } catch (e) { toast?.(translateSmsError(e)) }
  }
  const handleDelete = async () => {
    setConfirmDelete(false)
    try { await softDeleteForwarder(forwarder.id); toast?.('تم حذف الحساب'); onChanged?.() }
    catch (e) { toast?.(translateSmsError(e)) }
  }
  const handleReactivate = async () => {
    try { await reactivateForwarder(forwarder.id); toast?.('تم استعادة الحساب'); onChanged?.() }
    catch (e) { toast?.(translateSmsError(e)) }
  }
  const copyText = async (text, fieldId) => {
    const value = String(text ?? '')
    let ok = false
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(value); ok = true
      }
    } catch { /* fall through to execCommand */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea')
        ta.value = value
        ta.setAttribute('readonly', '')
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;'
        document.body.appendChild(ta)
        ta.focus(); ta.select()
        ok = document.execCommand('copy')
        document.body.removeChild(ta)
      } catch { ok = false }
    }
    if (ok) { setCopiedField(fieldId); setTimeout(() => setCopiedField(null), 2000) }
    else { toast?.('تعذّر النسخ') }
  }

  const status = isDeleted ? { l: 'محذوف', c: C.red, bg: 'rgba(192,57,43,.08)', bd: 'rgba(192,57,43,.3)' }
    : forwarder.is_active ? { l: 'نشط', c: C.ok, bg: 'rgba(39,160,70,.08)', bd: 'rgba(39,160,70,.3)' }
    : { l: 'معطّل', c: '#e67e22', bg: 'rgba(230,126,34,.08)', bd: 'rgba(230,126,34,.3)' }

  const inpS = {
    width: '100%', height: 36, padding: '0 12px',
    border: '1px solid rgba(255,255,255,.08)', borderRadius: 8,
    fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)',
    background: 'rgba(0,0,0,.18)', outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', boxSizing: 'border-box',
  }
  const lblS = { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 5 }

  const cardStyle = {
    background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14,
    padding: '24px 28px', position: 'relative', opacity: isDeleted ? .65 : 1,
  }
  const cardTitleStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    marginBottom: 22, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,.06)', flexWrap: 'wrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`.fwd-del-icon:hover{background:rgba(214,56,42,.15)!important;border-radius:50%!important}`}</style>
      {/* Card 1 — Account data + binding */}
      <div style={cardStyle}>
        <div style={cardTitleStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <Tag size={20} strokeWidth={2.2} color={ORANGE} />
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              بيانات حساب {forwarder.label?.trim() || forwarder.short_name_ar || '—'}
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--tx5)' }}>أُنشئ {relTime(forwarder.created_at)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isDeleted ? (
              <button onClick={handleReactivate} style={pillBtn(C.ok)}>
                <RotateCcw size={11} /> استعادة
              </button>
            ) : (
              <>
                <button onClick={handleToggleActive} style={{
                  flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 8,
                  border: `1px solid ${forwarder.is_active ? C.ok + '40' : '#e67e2240'}`,
                  background: forwarder.is_active ? `${C.ok}14` : 'rgba(230,126,34,.1)',
                  color: forwarder.is_active ? C.ok : '#e67e22',
                  fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>{forwarder.is_active ? 'نشط — اضغط للتعطيل' : 'معطّل — اضغط للتفعيل'}</button>
                <button onClick={() => window.location.hash = '#/admin/sms?forwarder=' + forwarder.id} style={pillBtn(C.blue)}>
                  <MessageSquare size={11} /> الرسائل ({stats.messageCount})
                </button>
                <button onClick={() => setConfirmDelete(true)} title="حذف" className="fwd-del-icon" style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: 'none', background: 'transparent', color: '#d6382a',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s, border-radius .15s, color .15s',
                }}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', columnGap: 28, rowGap: 20 }}>
          <KVRow label="التسمية التعريفية" value={forwarder.label} />
          <KVRow label="الاسم بالعربي" value={forwarder.short_name_ar} />
          <KVRow label="الاسم بالإنجليزي" value={forwarder.short_name_en} ltr />
          <KVRow label="رقم الجوال المرتبط" value={person?.personal_phone || '—'} ltr mono />
          <KVRow label="عدد الرسائل" value={<span style={{ color: C.gold, fontWeight: 800 }}>{stats.messageCount}</span>} />
          <KVRow label="آخر رسالة" value={stats.lastMessageAt ? relTime(stats.lastMessageAt) : 'لا رسائل'} />
        </div>

        {forwarder.notes && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <div style={lblS}>ملاحظات</div>
            <div style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 600, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {forwarder.notes}
            </div>
          </div>
        )}

        {!isDeleted && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.06)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setShowBindingModal(true)}
              style={{
                padding: '12px 24px', borderRadius: 10,
                background: C.gold, border: '1px solid ' + C.gold, color: '#000',
                fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8, transition: '.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#bf8e15'; e.currentTarget.style.borderColor = '#bf8e15' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.borderColor = C.gold }}>
              <Link2 size={16} strokeWidth={2.4} />
              <span>بيانات الربط</span>
            </button>
            <button onClick={() => setShowPermissionsModal(true)}
              style={{
                padding: '12px 24px', borderRadius: 10,
                background: 'transparent', border: '1px solid ' + C.gold + '66', color: C.gold,
                fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8, transition: '.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.gold + '14'; e.currentTarget.style.borderColor = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.gold + '66' }}>
              <ShieldCheck size={16} strokeWidth={2.2} />
              <span>صلاحيات الحساب</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showBindingModal && (
        <SmsBindingModal forwarder={forwarder}
          copiedField={copiedField} onCopy={copyText}
          newKeyShown={newKeyShown} onClearNewKey={() => setNewKeyShown(null)}
          onRegen={() => setConfirmRegen(true)}
          onClose={() => { setShowBindingModal(false); setNewKeyShown(null) }} />
      )}
      {showPermissionsModal && (
        <SmsPermissionsModal forwarder={forwarder}
          onClose={() => setShowPermissionsModal(false)} />
      )}

      {/* Confirm dialogs */}
      {confirmRegen && (
        <ConfirmDialog title="تأكيد إعادة توليد المفتاح"
          body="سيتم إنشاء مفتاح جديد، وسيفصل التطبيق المربوط حالياً. هل تريد المتابعة؟"
          confirmLabel="إعادة التوليد" confirmColor="#e67e22"
          onCancel={() => setConfirmRegen(false)} onConfirm={handleRegen} />
      )}
      {confirmDelete && (
        <ConfirmDialog title="حذف الحساب"
          body="سيتم تعطيل الحساب. الرسائل ستبقى محفوظة في قاعدة البيانات."
          confirmLabel="حذف" confirmColor={C.red}
          onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} />
      )}
    </div>
  )
}

function KVRow({ label, value, ltr, mono }) {
  const empty = value === null || value === undefined || value === '' || value === '—'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx5)', letterSpacing: '.2px' }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700,
        color: empty ? 'var(--tx5)' : 'var(--tx)',
        direction: ltr ? 'ltr' : 'rtl', textAlign: 'right',
        unicodeBidi: ltr ? 'isolate' : undefined,
        fontFamily: mono ? 'monospace' : undefined,
        wordBreak: 'break-word',
      }}>{empty ? '—' : value}</div>
    </div>
  )
}

function SmsBindingModal({ forwarder, copiedField, onCopy, newKeyShown, onClearNewKey, onRegen, onClose }) {
  const title = forwarder.label?.trim() || forwarder.short_name_ar || '—'
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16, fontFamily: F, direction: 'rtl',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', borderRadius: 16, width: 640, maxWidth: '95vw', overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(212,160,23,0.08)',
      }}>
        <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <Link2 size={24} strokeWidth={1.8} color={C.gold} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--tx)', fontFamily: F, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                بيانات الربط
              </div>
            </div>
            <button onClick={onClose} aria-label="إغلاق" style={{
              width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--tx4)', fontFamily: F, marginTop: 4 }}>
            {title}
          </div>
        </div>

        <div style={{ padding: '14px 20px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ borderRadius: 10, border: '1.5px solid rgba(212,160,23,.35)', padding: '12px 14px 6px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -9, right: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Link2 size={12} strokeWidth={2.2} />
              <span>بيانات الاتصال</span>
            </div>
            <ConnField label="URL" value={ENDPOINT_URL} fieldId="url"
              copiedField={copiedField} onCopy={onCopy} />
            <ConnField label="Request body" value={buildBodyJson(forwarder.device_key)} fieldId="body" multiline
              copiedField={copiedField} onCopy={onCopy} />
            <ConnField label="Request Headers" value={buildHeadersJson()} fieldId="headers" multiline
              copiedField={copiedField} onCopy={onCopy} />
          </div>

          {newKeyShown && (
            <div style={{ padding: '10px 12px', background: 'rgba(39,160,70,.06)', border: '1px solid rgba(39,160,70,.25)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 12, color: C.ok, fontWeight: 600 }}>المفتاح الجديد (يُعرض مرة واحدة):</div>
                <button onClick={onClearNewKey} style={{
                  width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent',
                  color: 'var(--tx5)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}><X size={13} /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => onCopy(newKeyShown, 'newkey')} style={iconBtn(copiedField === 'newkey' ? C.ok : C.gold)}>
                  {copiedField === 'newkey' ? <Check size={12} /> : <Copy size={12} />}
                </button>
                <code style={{ flex: 1, direction: 'ltr', fontFamily: 'monospace', fontSize: 11.5, color: C.gold, wordBreak: 'break-all' }}>{newKeyShown}</code>
              </div>
            </div>
          )}

          <div style={{ borderRadius: 10, border: '1.5px solid rgba(230,126,34,.35)', padding: '10px 14px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -9, right: 12, background: '#1a1a1a', padding: '0 6px', fontSize: 12, fontWeight: 600, color: '#e67e22', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <RefreshCw size={12} strokeWidth={2.2} />
              <span>إعادة توليد المفتاح</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0, fontSize: 11.5, color: 'var(--tx5)', display: 'inline-flex', alignItems: 'center', gap: 6, lineHeight: 1.4 }}>
                <AlertTriangle size={12} color="#e67e22" /> ستفصل التطبيق المربوط حالياً.
              </div>
              <button onClick={onRegen} style={{
                flexShrink: 0, height: 30, padding: '0 12px', borderRadius: 8,
                border: '1px solid #e67e2240', background: 'rgba(230,126,34,.1)', color: '#e67e22',
                fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <RefreshCw size={12} /> إعادة توليد
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SmsPermissionsModal({ forwarder, onClose }) {
  const title = forwarder.label?.trim() || forwarder.short_name_ar || '—'
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16, fontFamily: F, direction: 'rtl',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', borderRadius: 16, width: 'min(560px,94vw)', maxHeight: '88vh', overflow: 'auto',
        boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <ShieldCheck size={18} color={ORANGE} />
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              صلاحيات الحساب — {title}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--tx5)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx5)', fontSize: 12.5 }}>
          {/* محتوى صلاحيات الحساب — قيد البناء */}
        </div>
      </div>
    </div>
  )
}

function ConnField({ label, value, fieldId, multiline, copiedField, onCopy }) {
  const isCopied = copiedField === fieldId
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>{label}</div>
      <div style={{
        background: 'rgba(0,0,0,.25)', border: 'none', borderRadius: 8,
        padding: '7px 10px', display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 8,
      }}>
        <button onClick={() => onCopy(value, fieldId)} style={iconBtn(isCopied ? C.ok : C.gold)}>
          {isCopied ? <Check size={12} /> : <Copy size={12} />}
        </button>
        {multiline ? (
          <pre style={{
            flex: 1, margin: 0, direction: 'ltr', fontFamily: 'monospace',
            fontSize: 11, color: C.gold, lineHeight: 1.45,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>{value}</pre>
        ) : (
          <code style={{ flex: 1, direction: 'ltr', fontFamily: 'monospace', fontSize: 11.5, color: C.gold, wordBreak: 'break-all' }}>
            {value}
          </code>
        )}
      </div>
    </div>
  )
}

function PermissionRow({ label, description, value, disabled, activeText, inactiveText, onToggle, note }) {
  const showToggle = typeof onToggle === 'function'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      padding: '10px 12px', background: 'rgba(255,255,255,.02)',
      border: '1px solid rgba(255,255,255,.05)', borderRadius: 10,
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--tx)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--tx5)', marginTop: 2, lineHeight: 1.5 }}>{description}</div>
        {note && <div style={{ fontSize: 9.5, color: 'var(--tx5)', marginTop: 4, fontStyle: 'italic' }}>{note}</div>}
      </div>
      {showToggle ? (
        <button onClick={onToggle} disabled={disabled} style={{
          flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 8,
          border: `1px solid ${value ? C.ok + '40' : '#e67e2240'}`,
          background: value ? `${C.ok}14` : 'rgba(230,126,34,.1)',
          color: value ? C.ok : '#e67e22',
          fontFamily: F, fontSize: 11, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? .5 : 1, whiteSpace: 'nowrap',
        }}>{value ? activeText : inactiveText}</button>
      ) : (
        <span style={{
          flexShrink: 0, height: 32, padding: '0 12px', borderRadius: 8, lineHeight: '32px',
          border: `1px solid ${value ? C.ok + '40' : 'rgba(255,255,255,.1)'}`,
          background: value ? `${C.ok}14` : 'rgba(255,255,255,.04)',
          color: value ? C.ok : 'var(--tx5)',
          fontFamily: F, fontSize: 11, fontWeight: 700,
        }}>{value ? 'مفعّل' : 'معطّل'}</span>
      )}
    </div>
  )
}

function ConfirmDialog({ title, body, confirmLabel, confirmColor, onCancel, onConfirm }) {
  const isDanger = confirmColor === C.red
  // Spec accent colors (red-500 for soft tints, red-600 for solid button).
  const accent = isDanger ? '214,56,42' : '230,126,34'
  const solidBg = isDanger ? 'rgba(214,56,42,.96)' : confirmColor
  const solidHover = isDanger ? 'rgba(192,46,33,.96)' : confirmColor
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16, fontFamily: F, direction: 'rtl',
    }}>
      <style>{`.del-btn-solid:hover{background:${solidHover}!important}.del-btn-ghost:hover{background:rgba(255,255,255,.05)!important}`}</style>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', borderRadius: 16, width: 'min(380px,92vw)',
        boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.06)',
        padding: 28,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `rgba(${accent},.10)`, border: `1px solid rgba(${accent},.20)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          {isDanger ? <Trash2 size={24} strokeWidth={2} color={`rgb(${accent})`} /> : <AlertCircle size={24} strokeWidth={2} color={`rgb(${accent})`} />}
        </div>
        <div style={{
          textAlign: 'center', fontSize: 18, fontWeight: 600, color: '#fff',
          marginBottom: 10,
        }}>{title}</div>
        <p style={{
          textAlign: 'center', fontSize: 14, lineHeight: 1.625, color: '#9b9da8',
          maxWidth: 300, margin: '0 auto 24px',
        }}>{body}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} className="del-btn-ghost" style={{
            flex: 1, height: 44, borderRadius: 10,
            background: 'transparent', border: '1px solid rgba(255,255,255,.10)',
            color: '#c5c7d0', cursor: 'pointer',
            fontFamily: F, fontSize: 14, fontWeight: 500,
            transition: 'background .15s',
          }}>إلغاء</button>
          <button onClick={onConfirm} className="del-btn-solid" style={{
            flex: 1, height: 44, borderRadius: 10,
            background: solidBg, border: 'none', color: '#fff', cursor: 'pointer',
            fontFamily: F, fontSize: 14, fontWeight: 500,
            transition: 'background .15s',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

const iconBtn = (color) => ({
  width: 28, height: 28, borderRadius: 6,
  border: `1px solid ${color}33`, background: `${color}0d`, color,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
})

const tabBtn = (active) => ({
  height: 36, padding: '0 14px',
  border: 'none', background: 'transparent',
  borderBottom: `2px solid ${active ? ORANGE : 'transparent'}`,
  color: active ? ORANGE : 'var(--tx3)',
  fontFamily: F, fontSize: 13, fontWeight: active ? 800 : 600, cursor: 'pointer',
  transition: '.15s',
})

const pillBtn = (color) => ({
  height: 28, padding: '0 10px', borderRadius: 6,
  border: `1px solid ${color}33`, background: `${color}0d`, color,
  fontFamily: F, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 4,
})
