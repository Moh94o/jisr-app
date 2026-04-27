import React, { useEffect, useState, useCallback } from 'react'
import { X, Smartphone, KeyRound, Copy, Check, AlertCircle, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react'
import { getSupabase } from '../../lib/supabase.js'
import {
  updateForwarder,
  updateForwarderLabel,
  toggleForwarderActive,
  regenerateDeviceKey,
  softDeleteForwarder,
  getForwarderStats,
  translateSmsError,
} from '../../services/smsForwarderService.js'
import { maskSaudiPhone } from '../../lib/saudi-phone.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

function fmtArabicDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return iso }
}

export default function SmsForwarderManageModal({ forwarderId, person, onClose, onChanged, toast }) {
  const [forwarder, setForwarder] = useState(null)
  const [stats, setStats] = useState({ messageCount: 0, lastMessageAt: null })
  const [loading, setLoading] = useState(true)

  const [labelDraft, setLabelDraft] = useState('')
  const [labelSaving, setLabelSaving] = useState(false)
  const [labelErr, setLabelErr] = useState('')

  const [notesDraft, setNotesDraft] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)

  const [showKey, setShowKey] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [newKeyShown, setNewKeyShown] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = getSupabase()
      const [{ data, error }, st] = await Promise.all([
        sb.from('sms_forwarders').select('*').eq('id', forwarderId).maybeSingle(),
        getForwarderStats(forwarderId),
      ])
      if (error) throw error
      setForwarder(data)
      setLabelDraft(data?.label || '')
      setNotesDraft(data?.notes || '')
      setStats(st)
    } catch (e) {
      toast?.(translateSmsError(e))
    } finally {
      setLoading(false)
    }
  }, [forwarderId, toast])

  useEffect(() => { load() }, [load])

  const saveLabel = async () => {
    if (labelDraft === (forwarder?.label || '')) return
    if (labelDraft.length > 50) { setLabelErr('الحد الأقصى 50 حرف'); return }
    setLabelSaving(true); setLabelErr('')
    try {
      const updated = await updateForwarderLabel(forwarderId, labelDraft.trim())
      setForwarder(updated)
      toast?.('تم حفظ التسمية')
      onChanged?.()
    } catch (e) {
      setLabelErr(translateSmsError(e))
    } finally {
      setLabelSaving(false)
    }
  }

  const saveNotes = async () => {
    if (notesDraft === (forwarder?.notes || '')) return
    if (notesDraft.length > 2000) { toast?.('الملاحظات طويلة جداً'); return }
    setNotesSaving(true)
    try {
      const updated = await updateForwarder(forwarderId, { notes: notesDraft.trim() || null })
      setForwarder(updated)
      toast?.('تم حفظ الملاحظات')
      onChanged?.()
    } catch (e) {
      toast?.(translateSmsError(e))
    } finally {
      setNotesSaving(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      const updated = await toggleForwarderActive(forwarderId, !forwarder.is_active)
      setForwarder(updated)
      onChanged?.()
    } catch (e) { toast?.(translateSmsError(e)) }
  }

  const handleRegen = async () => {
    setConfirmRegen(false)
    try {
      const { forwarder: updated, deviceKey } = await regenerateDeviceKey(forwarderId)
      setForwarder(updated)
      setNewKeyShown(deviceKey)
      onChanged?.()
    } catch (e) { toast?.(translateSmsError(e)) }
  }

  const handleDelete = async () => {
    setConfirmDelete(false)
    try {
      await softDeleteForwarder(forwarderId)
      toast?.('تم حذف الحساب')
      onChanged?.()
      onClose?.()
    } catch (e) { toast?.(translateSmsError(e)) }
  }

  const copyKey = async (key) => {
    try {
      await navigator.clipboard.writeText(key)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 2000)
    } catch { toast?.('تعذّر النسخ') }
  }

  const inpS = {
    width: '100%', height: 36, padding: '0 12px',
    border: '1px solid rgba(255,255,255,.08)', borderRadius: 8,
    fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)',
    background: 'rgba(0,0,0,.18)', outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', boxSizing: 'border-box',
  }
  const lblS = { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 5 }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16,
      direction: 'rtl', fontFamily: F,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', borderRadius: 16, width: 'min(620px, 96vw)', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid rgba(212,160,23,.18)', boxShadow: '0 24px 60px rgba(0,0,0,.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={16} color={C.gold} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>إدارة حساب SMS Forwarder</div>
              <div style={{ fontSize: 11, color: 'var(--tx4)', marginTop: 2 }}>{forwarder?.label || 'بدون تسمية'} · {person?.name_ar}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.55)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><X size={14} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>جاري التحميل...</div>
          ) : !forwarder ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>تعذّر تحميل الحساب</div>
          ) : (
            <>
              {/* Section 1: Account info */}
              <Section title="معلومات الحساب">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <div style={lblS}>التسمية</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={labelDraft} onChange={e => setLabelDraft(e.target.value.slice(0, 50))}
                        onBlur={saveLabel} placeholder="بدون تسمية"
                        style={{ ...inpS, borderColor: labelErr ? 'rgba(192,57,43,.5)' : inpS.border }} />
                    </div>
                    {labelErr && <div style={{ fontSize: 10, color: 'rgba(192,57,43,.85)', marginTop: 4 }}>{labelErr}</div>}
                  </div>
                  <div>
                    <div style={lblS}>الحالة</div>
                    <button onClick={handleToggleActive} style={{
                      width: '100%', height: 36, borderRadius: 8,
                      border: `1px solid ${forwarder.is_active ? C.ok + '40' : '#e67e2240'}`,
                      background: forwarder.is_active ? `${C.ok}14` : 'rgba(230,126,34,.1)',
                      color: forwarder.is_active ? C.ok : '#e67e22',
                      fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}>{forwarder.is_active ? 'نشط — اضغط للتعطيل' : 'معطّل — اضغط للتفعيل'}</button>
                  </div>
                  <div>
                    <div style={lblS}>رقم الجوال المرتبط</div>
                    <div style={{ ...inpS, display: 'flex', alignItems: 'center', cursor: 'not-allowed', color: 'var(--tx2)', direction: 'ltr', fontFamily: 'monospace' }}>
                      {maskSaudiPhone(person?.personal_phone || '') || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={lblS}>تاريخ الإنشاء</div>
                    <div style={{ ...inpS, display: 'flex', alignItems: 'center', cursor: 'not-allowed', color: 'var(--tx2)' }}>
                      {fmtArabicDate(forwarder.created_at)}
                    </div>
                  </div>
                  <div>
                    <div style={lblS}>عدد الرسائل</div>
                    <div style={{ ...inpS, display: 'flex', alignItems: 'center', color: C.gold, fontWeight: 800 }}>
                      {stats.messageCount}
                    </div>
                  </div>
                  <div>
                    <div style={lblS}>آخر رسالة</div>
                    <div style={{ ...inpS, display: 'flex', alignItems: 'center', color: 'var(--tx2)' }}>
                      {stats.lastMessageAt ? fmtArabicDate(stats.lastMessageAt) : 'لا رسائل'}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <div style={lblS}>ملاحظات</div>
                  <textarea value={notesDraft} onChange={e => setNotesDraft(e.target.value.slice(0, 2000))}
                    onBlur={saveNotes} rows={3}
                    style={{ ...inpS, height: 'auto', padding: '8px 12px', resize: 'vertical', lineHeight: 1.6 }} />
                  <div style={{ fontSize: 9.5, color: 'var(--tx5)', marginTop: 3, textAlign: 'left', direction: 'ltr' }}>
                    {notesSaving ? 'جاري الحفظ...' : `${notesDraft.length}/2000`}
                  </div>
                </div>
              </Section>

              {/* Section 2: Device key */}
              <Section title="مفتاح الجهاز" Icon={KeyRound}>
                <div style={{
                  background: 'rgba(0,0,0,.25)', border: '1px solid rgba(212,160,23,.2)', borderRadius: 8,
                  padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <code style={{ flex: 1, direction: 'ltr', fontFamily: 'monospace', fontSize: 11.5, color: showKey ? C.gold : 'rgba(255,255,255,.3)', wordBreak: 'break-all', letterSpacing: showKey ? '0' : '2px' }}>
                    {showKey ? forwarder.device_key : '••••••••-••••-••••-••••-••••••••••••'}
                  </code>
                  <button onClick={() => setShowKey(s => !s)} style={iconBtn('rgba(255,255,255,.4)')}>
                    {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  {showKey && (
                    <button onClick={() => copyKey(forwarder.device_key)} style={iconBtn(keyCopied ? C.ok : C.gold)}>
                      {keyCopied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  )}
                </div>
                <button onClick={() => setConfirmRegen(true)} style={{
                  marginTop: 10, height: 32, padding: '0 12px', borderRadius: 7,
                  border: '1px solid rgba(230,126,34,.3)', background: 'rgba(230,126,34,.08)', color: '#e67e22',
                  fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}><RefreshCw size={11} />إعادة توليد المفتاح</button>
                <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 6, lineHeight: 1.5 }}>
                  ⚠️ إعادة التوليد ستفصل التطبيق المربوط حالياً.
                </div>

                {newKeyShown && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(39,160,70,.06)', border: '1px solid rgba(39,160,70,.25)', borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: C.ok, fontWeight: 700, marginBottom: 6 }}>المفتاح الجديد (يُعرض مرة واحدة):</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{ flex: 1, direction: 'ltr', fontFamily: 'monospace', fontSize: 11.5, color: C.gold, wordBreak: 'break-all' }}>{newKeyShown}</code>
                      <button onClick={() => copyKey(newKeyShown)} style={iconBtn(C.gold)}><Copy size={12} /></button>
                    </div>
                  </div>
                )}
              </Section>

              {/* Section 3: View messages */}
              <button onClick={() => { onClose?.(); window.location.hash = '#/admin/sms?forwarder=' + forwarderId }} style={{
                height: 38, padding: '0 14px', borderRadius: 8,
                border: `1px solid ${C.blue}40`, background: `${C.blue}14`, color: C.blue,
                fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>عرض جميع الرسائل ({stats.messageCount})</button>

              {/* Section 4: Delete */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 12 }}>
                <button onClick={() => setConfirmDelete(true)} style={{
                  height: 36, padding: '0 14px', borderRadius: 8,
                  border: `1px solid ${C.red}40`, background: `${C.red}10`, color: C.red,
                  fontFamily: F, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}><Trash2 size={12} />حذف الحساب</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm regen modal */}
      {confirmRegen && (
        <ConfirmDialog
          title="تأكيد إعادة توليد المفتاح"
          body="سيتم إنشاء مفتاح جديد، وسيفصل التطبيق المربوط حالياً. هل تريد المتابعة؟"
          confirmLabel="إعادة التوليد"
          confirmColor="#e67e22"
          onCancel={() => setConfirmRegen(false)}
          onConfirm={handleRegen}
        />
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <ConfirmDialog
          title="حذف الحساب"
          body="سيتم تعطيل الحساب. الرسائل ستبقى محفوظة في قاعدة البيانات."
          confirmLabel="حذف"
          confirmColor={C.red}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

function Section({ title, Icon, children }) {
  return (
    <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        {Icon && <Icon size={13} color={C.gold} />}
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx)' }}>{title}</div>
      </div>
      {children}
    </div>
  )
}

function ConfirmDialog({ title, body, confirmLabel, confirmColor, onCancel, onConfirm }) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 16, direction: 'rtl', fontFamily: F,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', borderRadius: 14, width: 'min(420px, 96vw)',
        border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} color={confirmColor} />
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{title}</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.7, marginTop: 8 }}>{body}</div>
        </div>
        <div style={{ padding: '10px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid rgba(255,255,255,.05)' }}>
          <button onClick={onCancel} style={{
            height: 34, padding: '0 14px', borderRadius: 7,
            background: 'transparent', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx2)',
            fontFamily: F, fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
          }}>إلغاء</button>
          <button onClick={onConfirm} style={{
            height: 34, padding: '0 14px', borderRadius: 7,
            background: confirmColor, border: 'none', color: '#fff',
            fontFamily: F, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
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
