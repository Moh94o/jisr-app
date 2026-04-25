import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  Activity, MessageSquare, KeyRound, Clock, Filter, ChevronDown, X, Copy,
  Smartphone, Eye, Check,
} from 'lucide-react'
import { resolveSender, SMS_CATEGORIES } from './smsSenders.js'
import * as rolesService from '../../../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'
const GOLD_SOFT = '#e8c77a'

const TONE = {
  gold:    { color: GOLD,        bg: `${GOLD}14`,           border: `${GOLD}33` },
  info:    { color: '#3483b4',   bg: 'rgba(52,131,180,.12)', border: 'rgba(52,131,180,.35)' },
  success: { color: '#27a046',   bg: 'rgba(39,160,70,.12)',  border: 'rgba(39,160,70,.35)' },
  neutral: { color: '#7a8698',   bg: 'rgba(122,134,152,.12)', border: 'rgba(122,134,152,.35)' },
  danger:  { color: '#c0392b',   bg: 'rgba(192,57,43,.12)',  border: 'rgba(192,57,43,.35)' },
}

const formatRelative = (s) => {
  const n = Number(s || 0)
  if (n < 60) return 'الآن'
  if (n < 3600) return `قبل ${Math.floor(n / 60)} د`
  if (n < 86400) return `قبل ${Math.floor(n / 3600)} س`
  if (n < 604800) return `قبل ${Math.floor(n / 86400)} يوم`
  return `قبل ${Math.floor(n / 604800)} أسبوع`
}

const formatAbsolute = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' }) }
  catch { return iso }
}

const FilterSelect = ({ label, value, onChange, options }) => {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const selected = options.find(o => String(o.value) === String(value))
  const active = value != null && value !== '' && value !== 'all'
  return (
    <div ref={wrap} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          height: 32, padding: '0 10px', borderRadius: 7,
          border: `1px solid ${active ? GOLD + '55' : 'rgba(255,255,255,.08)'}`,
          background: active ? `${GOLD}10` : 'rgba(0,0,0,.18)',
          color: active ? GOLD_SOFT : 'var(--tx2)',
          fontFamily: F, fontSize: 11, fontWeight: 700,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: '.15s',
        }}>
        {label}: <strong style={{ fontWeight: 800 }}>{selected?.label || 'الكل'}</strong>
        <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', insetInlineEnd: 0,
          background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 9, minWidth: 170, padding: 4, zIndex: 5,
          boxShadow: '0 10px 30px rgba(0,0,0,.5)', maxHeight: 300, overflowY: 'auto',
        }}>
          {options.map(o => {
            const sel = String(o.value) === String(value)
            return (
              <div key={String(o.value)} onClick={() => { onChange(o.value); setOpen(false) }}
                style={{
                  padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 700,
                  color: sel ? GOLD_SOFT : 'rgba(255,255,255,.85)',
                  background: sel ? `${GOLD}14` : 'transparent',
                  transition: '.12s',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>
                {o.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const MessageItem = ({ row, onOpen }) => {
  const meta = resolveSender(row.phone_from)
  const tone = TONE[meta.tone] || TONE.neutral
  const hasOtp = !!row.otp_code
  const Icon = hasOtp ? KeyRound : meta.Icon

  const snippet = (row.message_body || '').replace(/\s+/g, ' ').trim()
  const short = snippet.length > 140 ? snippet.slice(0, 140) + '…' : snippet

  return (
    <button onClick={() => onOpen(row)} style={{
      display: 'flex', gap: 12, alignItems: 'stretch',
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
      fontFamily: F, color: 'inherit', textAlign: 'start', width: '100%',
      marginBottom: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        background: tone.bg, border: `1.5px solid ${tone.border}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 10px ${tone.color}33`, flexShrink: 0, marginTop: 6,
      }}>
        <Icon size={14} color={tone.color} strokeWidth={2.2} />
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(255,255,255,.02)',
        border: '1px solid rgba(255,255,255,.04)',
        transition: '.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.04)'; e.currentTarget.style.borderColor = `${GOLD}22` }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.04)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 7px', borderRadius: 5,
            background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`,
            fontSize: 10, fontWeight: 800,
          }}>
            {meta.label}
          </span>
          {hasOtp && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 5,
              background: `${GOLD}14`, color: GOLD_SOFT, border: `1px solid ${GOLD}33`,
              fontSize: 11, fontWeight: 900, direction: 'ltr',
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              <KeyRound size={10} /> {row.otp_code}
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--tx5)' }}>
            <Clock size={10} /> {formatRelative(row.seconds_ago)}
          </span>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)', lineHeight: 1.55 }}>
          {short || '—'}
        </div>
        {(row.copy_count > 0 || row.view_count > 0) && (
          <div style={{
            marginTop: 6, display: 'flex', gap: 10,
            fontSize: 9.5, fontWeight: 700, color: 'var(--tx5)',
          }}>
            {row.copy_count > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Copy size={9} /> {row.copied_by || '—'} · {row.copy_count}
              </span>
            )}
            {row.view_count > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Eye size={9} /> {row.viewed_by || '—'} · {row.view_count}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

const InfoBox = ({ label, value, mono }) => (
  <div style={{
    padding: '8px 10px', borderRadius: 8,
    background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)',
  }}>
    <div style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 800, letterSpacing: '.3px', marginBottom: 3 }}>{label}</div>
    <div style={{
      fontSize: 11.5, fontWeight: 700, color: 'var(--tx)',
      direction: mono ? 'ltr' : 'rtl', wordBreak: 'break-word',
      fontFamily: mono ? "'JetBrains Mono',monospace" : F,
    }}>
      {value}
    </div>
  </div>
)

const DetailPanel = ({ row, onClose }) => {
  if (!row) return null
  const meta = resolveSender(row.phone_from)
  const tone = TONE[meta.tone] || TONE.neutral
  const hasOtp = !!row.otp_code

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,.7)', backdropFilter: 'blur(6px)',
      zIndex: 1000, display: 'flex', justifyContent: 'flex-start',
    }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{
        width: 540, maxWidth: '95vw', height: '100%',
        background: '#1a1a1a', borderLeft: '1px solid rgba(212,160,23,.15)',
        boxShadow: '-12px 0 40px rgba(0,0,0,.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: F, animation: 'slidePanelIn .25s ease-out',
      }}>
        <style>{`@keyframes slidePanelIn { from { transform: translateX(-100%) } to { transform: translateX(0) } }`}</style>
        <div style={{
          padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,.06)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: tone.bg, border: `1.5px solid ${tone.border}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <meta.Icon size={16} color={tone.color} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>
              {meta.label}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--tx5)', marginTop: 2,
              direction: 'ltr', fontFamily: "'JetBrains Mono',monospace" }}>
              {row.phone_from}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)',
            color: 'var(--tx3)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {hasOtp && (
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: `linear-gradient(135deg, ${GOLD}18, ${GOLD}06)`,
              border: `1px solid ${GOLD}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: GOLD_SOFT, letterSpacing: '.3px', marginBottom: 4 }}>
                  رمز التحقق
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 900, color: GOLD, letterSpacing: '6px',
                  direction: 'ltr', fontFamily: "'JetBrains Mono',monospace",
                  textShadow: `0 0 20px ${GOLD}55`,
                }}>
                  {row.otp_code}
                </div>
              </div>
              <CopyButton text={row.otp_code} />
            </div>
          )}

          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)',
            fontSize: 13, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {row.message_body || '—'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 8 }}>
            <InfoBox label="وقت الاستلام" value={formatAbsolute(row.received_at)} />
            {row.device_id && <InfoBox label="الجهاز" value={String(row.device_id).slice(0, 14) + '…'} mono />}
            {row.copied_by && <InfoBox label={`نُسخ ${row.copy_count}×`} value={row.copied_by} />}
            {row.viewed_by && <InfoBox label={`عُرض ${row.view_count}×`} value={row.viewed_by} />}
            <InfoBox label="مقروءة" value={row.is_read ? 'نعم' : 'لا'} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard?.writeText(String(text)); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{
        height: 36, padding: '0 14px', borderRadius: 9,
        background: copied ? '#27a046' : GOLD, color: copied ? '#fff' : '#0a0a0a',
        border: 'none', fontFamily: F, fontSize: 12, fontWeight: 900, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        transition: '.2s',
      }}>
      {copied ? <><Check size={13} /> تم</> : <><Copy size={13} /> نسخ</>}
    </button>
  )
}

const PAGE_SIZE = 50

export default function SmsMessagesCard({ otpPersonId, toast, senders = [] }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [phoneFrom, setPhoneFrom] = useState('')
  const [onlyOtp, setOnlyOtp] = useState(false)
  const [days, setDays] = useState('')
  const [detail, setDetail] = useState(null)
  const sentinelRef = useRef(null)
  const loadMoreRef = useRef(() => {})

  const load = useCallback(async (reset) => {
    if (!otpPersonId) return
    if (reset) { setLoading(true); setExhausted(false) }
    else setLoadingMore(true)
    try {
      const from = reset ? 0 : items.length
      const data = await rolesService.listSmsMessages(otpPersonId, {
        from, size: PAGE_SIZE,
        phoneFrom: phoneFrom || undefined,
        onlyOtp: onlyOtp || undefined,
        days: days ? Number(days) : undefined,
      })
      setItems(reset ? data : [...items, ...data])
      if (data.length < PAGE_SIZE) setExhausted(true)
    } catch (e) {
      toast?.(e.message || 'خطأ في تحميل الرسائل')
    } finally {
      if (reset) setLoading(false)
      else setLoadingMore(false)
    }
  }, [otpPersonId, items, phoneFrom, onlyOtp, days, toast])

  loadMoreRef.current = () => {
    if (loadingMore || exhausted || loading) return
    load(false)
  }

  useEffect(() => { load(true) }, [otpPersonId, phoneFrom, onlyOtp, days])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreRef.current()
    }, { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [items.length, exhausted, loadingMore, loading])

  // Sender options come from the summary view (all senders for this forwarder,
  // even ones not in the current page of messages).
  const senderOpts = useMemo(() => [
    { value: '', label: 'الكل' },
    ...senders.map(s => ({ value: s.phone_from, label: resolveSender(s.phone_from).label })),
  ], [senders])

  return (
    <div className="prs-card" style={{ padding: 16 }}>
      <div className="prs-card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} color={GOLD} /> سجل الرسائل
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Filter size={12} color="var(--tx5)" />
          <FilterSelect label="الجهة" value={phoneFrom} onChange={setPhoneFrom} options={senderOpts} />
          <FilterSelect label="الفترة" value={days} onChange={setDays} options={[
            { value: '', label: 'الكل' },
            { value: 1, label: '٢٤ ساعة' },
            { value: 7, label: '٧ أيام' },
            { value: 30, label: '٣٠ يوم' },
          ]} />
          <button onClick={() => setOnlyOtp(v => !v)}
            style={{
              height: 32, padding: '0 10px', borderRadius: 7,
              border: `1px solid ${onlyOtp ? GOLD + '55' : 'rgba(255,255,255,.08)'}`,
              background: onlyOtp ? `${GOLD}14` : 'rgba(0,0,0,.18)',
              color: onlyOtp ? GOLD_SOFT : 'var(--tx3)',
              fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
            <KeyRound size={11} /> OTP فقط
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'var(--tx5)' }}>
          جاري التحميل...
        </div>
      ) : items.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)',
          borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <MessageSquare size={22} color={GOLD} style={{ opacity: .5 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>
            لا توجد رسائل
          </div>
        </div>
      ) : (
        <div style={{ padding: '4px 2px' }}>
          {items.map((row, i) => (
            <MessageItem key={row.id || i} row={row} onOpen={setDetail} />
          ))}
          <div ref={sentinelRef} style={{ height: 1 }} />
          {loadingMore && (
            <div style={{ padding: 12, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>
              جاري تحميل المزيد...
            </div>
          )}
          {exhausted && items.length > 0 && (
            <div style={{ padding: 12, textAlign: 'center', fontSize: 10.5, color: 'var(--tx5)', fontWeight: 700 }}>
              — نهاية السجل —
            </div>
          )}
        </div>
      )}

      <DetailPanel row={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
