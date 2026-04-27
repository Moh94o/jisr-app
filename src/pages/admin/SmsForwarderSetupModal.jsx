import React, { useEffect, useState } from 'react'
import { X, Smartphone, AlertCircle, Send } from 'lucide-react'
import { createForwarder, translateSmsError } from '../../services/smsForwarderService.js'
import { normalizeSaudiMobile, validateSaudiMobile } from '../../lib/saudi-phone.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

export default function SmsForwarderSetupModal({ person, onClose, onCreated, toast }) {
  const [shortAr, setShortAr] = useState('')
  const [shortEn, setShortEn] = useState('')
  const [label, setLabel] = useState('')
  const [phone, setPhone] = useState((person?.personal_phone || '').replace(/^\+966/, ''))
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState(null) // { forwarder, deviceKey }

  const personPhoneNorm = (person?.personal_phone || '')
  const phoneNorm = normalizeSaudiMobile(phone) || ''
  const phoneDiffers = !!phoneNorm && phoneNorm !== personPhoneNorm

  const handleSubmit = async () => {
    const err = {}
    if (!shortAr.trim()) err.shortAr = 'مطلوب'
    else if (shortAr.length > 40) err.shortAr = 'الحد الأقصى 40 حرف'
    if (!shortEn.trim()) err.shortEn = 'مطلوب'
    else if (shortEn.length > 40) err.shortEn = 'الحد الأقصى 40 حرف'
    if (label && label.length > 50) err.label = 'الحد الأقصى 50 حرف'
    if (!phoneNorm || !validateSaudiMobile(phone)) err.phone = 'رقم جوال سعودي غير صحيح (يبدأ بـ 5 ويتكون من 9 أرقام)'
    setErrors(err)
    if (Object.keys(err).length) return

    setBusy(true)
    try {
      // 1. Record phone in notes if it differs from the person's personal phone.
      const finalNotes = phoneDiffers ? `رقم الجوال: ${phoneNorm}` : ''

      // 2. Auto-generate device_key — never user-entered.
      const deviceKey = (crypto?.randomUUID?.() || ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      })))

      const forwarder = await createForwarder({
        personId: person.id,
        deviceKey,
        shortNameAr: shortAr.trim(),
        shortNameEn: shortEn.trim(),
        label: label.trim() || null,
        notes: finalNotes || null,
      })
      setSuccess({ forwarder, deviceKey })
    } catch (e) {
      const msg = translateSmsError(e)
      if (e.code === '23505') {
        if ((e.message || '').includes('person_label') || (e.message || '').includes('sms_forwarders_person_label_unique')) {
          setErrors({ label: msg })
        } else if ((e.message || '').includes('device_key')) {
          toast?.('حدث تضارب في توليد المفتاح، حاول مرة أخرى')
        } else {
          toast?.(msg)
        }
      } else {
        toast?.(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const handleClose = () => {
    if (success) onCreated?.(success.forwarder)
    onClose?.()
  }

  useEffect(() => {
    const t = setTimeout(() => document.getElementById('sms-fwd-short-ar')?.focus(), 100)
    return () => clearTimeout(t)
  }, [])

  // Transfer-Calc-style modal frame.
  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }
  const modalBox = { background: '#1a1a1a', borderRadius: 18, width: 560, maxWidth: '95vw', height: 430, maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)', position: 'relative' }

  const inpS = {
    width: '100%', height: 42, padding: '0 14px',
    border: '1px solid rgba(255,255,255,.05)', borderRadius: 9,
    fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)',
    background: 'rgba(0,0,0,.18)', outline: 'none',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', boxSizing: 'border-box',
    textAlign: 'center',
  }
  const lblS = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5 }
  const errS = { fontSize: 10, color: 'rgba(192,57,43,.85)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }

  return (
    <div onClick={handleClose} style={modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox} dir="rtl">
        {/* Header — title shown only in form state; X is always present */}
        {!success && (
          <div style={{ padding: '14px 14px 10px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Smartphone size={34} strokeWidth={1.8} color={C.gold} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', fontFamily: F }}>حساب SMS Forwarder</div>
                <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: F, marginTop: 3 }}>{person?.name_ar}</div>
              </div>
            </div>
            <button onClick={handleClose} style={{
              width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,.05)',
              border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><X size={14} /></button>
          </div>
        )}
        {success && (
          <button onClick={handleClose} style={{
            position: 'absolute', top: 14, left: 14, zIndex: 2,
            width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><X size={14} /></button>
        )}

        {/* Body */}
        {!success ? (
          <div style={{ overflowY: 'auto', overflowX: 'visible', padding: '14px 22px 14px' }}>
            <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '20px 16px 16px', position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{
                position: 'absolute', top: -10, right: 16,
                background: '#1a1a1a', padding: '0 10px',
                fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F,
              }}>بيانات الحساب</div>

              <div>
                <div style={lblS}>التسمية التعريفية <span style={{ color: 'var(--tx5)', fontWeight: 600, fontSize: 10 }}>(اختياري)</span></div>
                <input value={label} onChange={e => setLabel(e.target.value.slice(0, 50))}
                  placeholder="مثال: ابشر، بنك الراجحي ... إلخ"
                  style={{ ...inpS, borderColor: errors.label ? 'rgba(192,57,43,.5)' : inpS.border }} />
                {errors.label && <div style={errS}><AlertCircle size={10} />{errors.label}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={lblS}>الاسم المختصر بالعربي <span style={{ color: C.red }}>*</span></div>
                  <input id="sms-fwd-short-ar" value={shortAr} onChange={e => setShortAr(e.target.value.replace(/[A-Za-z]/g, '').slice(0, 40))}
                    placeholder="مهدي"
                    style={{ ...inpS, borderColor: errors.shortAr ? 'rgba(192,57,43,.5)' : inpS.border }} />
                  {errors.shortAr && <div style={errS}><AlertCircle size={10} />{errors.shortAr}</div>}
                </div>
                <div>
                  <div style={lblS}>الاسم المختصر بالإنجليزي <span style={{ color: C.red }}>*</span></div>
                  <input value={shortEn} onChange={e => setShortEn(e.target.value.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '').slice(0, 40))}
                    placeholder="Mahdi" dir="ltr"
                    style={{ ...inpS, direction: 'ltr', borderColor: errors.shortEn ? 'rgba(192,57,43,.5)' : inpS.border }} />
                  {errors.shortEn && <div style={errS}><AlertCircle size={10} />{errors.shortEn}</div>}
                </div>
              </div>

              <div>
                <div style={lblS}>رقم الجوال <span style={{ color: C.red }}>*</span></div>
                <div style={{
                  display: 'flex', direction: 'ltr', borderRadius: 9, overflow: 'hidden',
                  border: errors.phone ? '1px solid rgba(192,57,43,.5)' : '1px solid rgba(255,255,255,.05)',
                  background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', height: 42,
                }}>
                  <div style={{ padding: '0 14px', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: C.gold, flexShrink: 0 }}>+966</div>
                  <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="5X XXX XXXX" style={{ width: '100%', padding: '0 14px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', textAlign: 'left', letterSpacing: '.5px' }} />
                </div>
                {errors.phone && <div style={errS}><AlertCircle size={10} />{errors.phone}</div>}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22 }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(39,160,70,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path d="M8 12l3 3 5-6" stroke="rgba(39,160,70,.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', fontFamily: F }}>تم إنشاء الحساب بنجاح</div>
          </div>
        )}

        {/* Footer */}
        <style>{`.smsfwd-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.smsfwd-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.smsfwd-nav-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000;transform:translateX(4px)}.smsfwd-nav-btn:disabled{opacity:.45;cursor:not-allowed}.smsfwd-nav-btn:disabled:hover .nav-ico{background:rgba(212,160,23,.1);transform:none}@keyframes smsfwd-spin{to{transform:rotate(360deg)}}`}</style>
        {!success && (
          <div style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
            <button onClick={handleSubmit} disabled={busy} className="smsfwd-nav-btn">
              <span>{busy ? 'جاري الإضافة…' : 'إضافة'}</span>
              <span className="nav-ico">{busy ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'smsfwd-spin 0.7s linear infinite' }} /> : <Send size={14} strokeWidth={2.5} />}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
