import React, { useEffect, useState, useCallback } from 'react'
import { X, Plus, Smartphone, Eye, Trash2, Settings, MessageSquare, Tag } from 'lucide-react'
import {
  listForwardersByPerson,
  softDeleteForwarder,
  reactivateForwarder,
  translateSmsError,
} from '../../services/smsForwarderService.js'
import { maskSaudiPhone } from '../../lib/saudi-phone.js'
import SmsForwarderSetupModal from './SmsForwarderSetupModal.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

function relTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 86400 * 30) return `قبل ${Math.floor(diff / 86400)} يوم`
  return d.toLocaleDateString('ar-SA')
}

export default function SmsForwardersListModal({ person, onClose, toast }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listForwardersByPerson(person.id, { includeDeleted: showDeleted })
      setRows(data)
    } catch (e) {
      toast?.(translateSmsError(e))
    } finally {
      setLoading(false)
    }
  }, [person.id, showDeleted, toast])

  useEffect(() => { load() }, [load])

  const handleDelete = async (forwarder) => {
    if (!confirm(`حذف الحساب${forwarder.label ? ` "${forwarder.label}"` : ''}؟ سيتم تعطيله مع الحفاظ على الرسائل.`)) return
    setDeletingId(forwarder.id)
    try {
      await softDeleteForwarder(forwarder.id)
      toast?.('تم حذف الحساب')
      load()
    } catch (e) {
      toast?.(translateSmsError(e))
    } finally {
      setDeletingId(null)
    }
  }

  const handleReactivate = async (forwarder) => {
    try {
      await reactivateForwarder(forwarder.id)
      toast?.('تم استعادة الحساب')
      load()
    } catch (e) {
      toast?.(translateSmsError(e))
    }
  }

  // Phone shown in rows comes from the linked person; mask it.
  const maskedPersonPhone = maskSaudiPhone(person?.personal_phone || '')

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1090, padding: 16,
        direction: 'rtl', fontFamily: F,
      }}>
        <div onClick={e => e.stopPropagation()} style={{
          background: '#1a1a1a', borderRadius: 16, width: 'min(640px, 96vw)', maxHeight: '92vh',
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
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>حسابات SMS Forwarder</div>
                <div style={{ fontSize: 11, color: 'var(--tx4)', marginTop: 2 }}>{person?.name_ar}</div>
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.55)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><X size={14} /></button>
          </div>

          {/* Body */}
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
              <button onClick={() => setShowSetup(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 14px', borderRadius: 8,
                background: 'rgba(212,160,23,.08)', border: `1px solid ${C.gold}`, color: C.gold,
                fontFamily: F, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
              }}><Plus size={13} strokeWidth={2.5} />إضافة حساب جديد</button>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
                <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>إظهار المحذوفة</span>
              </label>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx4)', fontSize: 12 }}>جاري التحميل...</div>
            ) : rows.length === 0 ? (
              <div style={{
                padding: '40px 20px', textAlign: 'center', color: 'var(--tx4)',
                background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px dashed rgba(255,255,255,.08)',
              }}>
                <Smartphone size={28} color="rgba(255,255,255,.2)" style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>لا توجد حسابات بعد</div>
                <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 6 }}>اضغط "إضافة حساب جديد" لإنشاء أول حساب SMS Forwarder لهذا الشخص</div>
              </div>
            ) : (
              rows.map(f => {
                const isDeleted = !!f.deleted_at
                const status = isDeleted ? { l: 'محذوف', c: C.red, bg: 'rgba(192,57,43,.08)', bd: 'rgba(192,57,43,.25)' }
                  : f.is_active ? { l: 'نشط', c: C.ok, bg: 'rgba(39,160,70,.08)', bd: 'rgba(39,160,70,.25)' }
                  : { l: 'معطّل', c: '#e67e22', bg: 'rgba(230,126,34,.08)', bd: 'rgba(230,126,34,.25)' }
                return (
                  <div key={f.id} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: '#141414', border: '1px solid rgba(255,255,255,.05)',
                    opacity: isDeleted ? .65 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <Tag size={12} color={C.gold} style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {f.label || <span style={{ color: 'var(--tx5)', fontWeight: 600 }}>بدون تسمية</span>}
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5, color: status.c, background: status.bg, border: `1px solid ${status.bd}` }}>{status.l}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isDeleted ? (
                          <button onClick={() => handleReactivate(f)} title="استعادة" style={{
                            height: 28, padding: '0 10px', borderRadius: 6,
                            border: `1px solid ${C.ok}33`, background: `${C.ok}14`, color: C.ok,
                            fontFamily: F, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                          }}>استعادة</button>
                        ) : (
                          <>
                            <button onClick={() => {
                              // Navigate to the SMS Forwarder role page (not a modal).
                              window.location.hash = `#/admin/persons/${person.id}/role/sms_forwarder/${f.id}`
                              onClose?.()
                            }} title="إدارة" style={iconBtn(C.gold)}>
                              <Settings size={12} />
                            </button>
                            <button onClick={() => { onClose?.(); window.location.hash = '#/admin/sms?forwarder=' + f.id }} title="عرض الرسائل" style={iconBtn(C.blue)}>
                              <MessageSquare size={12} />
                            </button>
                            <button onClick={() => handleDelete(f)} disabled={deletingId === f.id} title="حذف" style={iconBtn(C.red)}>
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: 10.5, color: 'var(--tx4)' }}>
                      <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{maskedPersonPhone || '—'}</span>
                      <span style={{ color: 'var(--tx5)' }}>·</span>
                      <span>أُنشئ {relTime(f.created_at)}</span>
                    </div>
                    {f.notes && (
                      <div style={{ marginTop: 6, fontSize: 10.5, color: 'var(--tx4)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {f.notes}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              height: 36, padding: '0 16px', borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(255,255,255,.08)',
              color: 'var(--tx2)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>إغلاق</button>
          </div>
        </div>
      </div>

      {showSetup && (
        <SmsForwarderSetupModal
          person={person}
          toast={toast}
          onClose={() => setShowSetup(false)}
          onCreated={() => { setShowSetup(false); load() }}
        />
      )}
    </>
  )
}

const iconBtn = (color) => ({
  width: 28, height: 28, borderRadius: 6,
  border: '1px solid ' + color + '33',
  background: color + '0d', color,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer',
})
