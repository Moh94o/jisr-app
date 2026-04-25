import React, { useMemo, useState } from 'react'
import { MessageSquare, KeyRound, Check, Ban, Clock } from 'lucide-react'
import { resolveSender, senderAllowedState, SMS_CATEGORIES } from './smsSenders.js'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'
const GOLD_SOFT = '#e8c77a'

const TONE_COLOR = {
  gold:    GOLD,
  info:    '#3483b4',
  success: '#27a046',
  neutral: '#7a8698',
  danger:  '#c0392b',
}

const formatRelative = (s) => {
  const n = Number(s || 0)
  if (!n) return '—'
  if (n < 60) return 'الآن'
  if (n < 3600) return `قبل ${Math.floor(n / 60)} د`
  if (n < 86400) return `قبل ${Math.floor(n / 3600)} س`
  if (n < 604800) return `قبل ${Math.floor(n / 86400)} يوم`
  return `قبل ${Math.floor(n / 604800)} أسبوع`
}

const StateBadge = ({ state }) => {
  if (state === 'allowed') return (
    <span title="مسموحة" style={{
      width: 16, height: 16, borderRadius: '50%',
      background: '#27a046', color: '#fff', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 6px rgba(39,160,70,.55)',
    }}><Check size={10} strokeWidth={3.5} /></span>
  )
  if (state === 'denied') return (
    <span title="ممنوعة" style={{
      width: 16, height: 16, borderRadius: '50%',
      background: '#c0392b', color: '#fff', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}><Ban size={10} strokeWidth={3.5} /></span>
  )
  return (
    <span title="غير مدرجة" style={{
      width: 16, height: 16, borderRadius: '50%',
      background: 'rgba(255,255,255,.05)', color: 'var(--tx5)',
      border: '1px solid rgba(255,255,255,.1)', flexShrink: 0,
    }} />
  )
}

const SenderRow = ({ sender, total, state }) => {
  const meta = resolveSender(sender.phone_from)
  const tone = TONE_COLOR[meta.tone] || TONE_COLOR.neutral
  const pct = total ? Math.round((sender.msg_count / total) * 100) : 0
  const Icon = meta.Icon

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 10,
      background: 'rgba(255,255,255,.02)',
      border: '1px solid rgba(255,255,255,.05)',
      display: 'flex', alignItems: 'center', gap: 10,
      transition: '.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.04)'; e.currentTarget.style.borderColor = `${GOLD}22` }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: `${tone}14`, border: `1px solid ${tone}33`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} color={tone} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--tx)' }}>{meta.label}</span>
          <StateBadge state={state} />
          {sender.otp_count > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 9.5, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
              background: `${GOLD}14`, border: `1px solid ${GOLD}33`, color: GOLD_SOFT,
            }}>
              <KeyRound size={9} /> {sender.otp_count} OTP
            </span>
          )}
        </div>
        <div style={{
          height: 4, borderRadius: 4, background: 'rgba(255,255,255,.04)',
          overflow: 'hidden', marginBottom: 4,
        }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: `linear-gradient(90deg, ${tone} 0%, ${tone}88 100%)`,
            transition: 'width .4s ease', boxShadow: `0 0 6px ${tone}55`,
          }} />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 10, color: 'var(--tx5)', fontWeight: 700,
        }}>
          <span style={{ direction: 'ltr', fontFamily: "'JetBrains Mono',monospace", opacity: .75 }}>
            {sender.phone_from}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Clock size={9} /> {formatRelative(sender.last_seconds_ago)}
          </span>
        </div>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
        flexShrink: 0, minWidth: 48,
      }}>
        <span style={{ fontSize: 15, fontWeight: 900, color: tone, direction: 'ltr', lineHeight: 1 }}>
          {sender.msg_count}
        </span>
        <span style={{ fontSize: 9, color: 'var(--tx5)', fontWeight: 700 }}>رسالة</span>
      </div>
    </div>
  )
}

export default function SmsSendersCard({ senders = [], total = 0, allowed = [], disabled = [] }) {
  const [cat, setCat] = useState('all')
  const decorated = useMemo(() => senders.map(s => {
    const meta = resolveSender(s.phone_from)
    const state = senderAllowedState(s.phone_from, { allowed, disabled })
    return { ...s, _cat: meta.cat, _state: state }
  }), [senders, allowed, disabled])
  const filtered = cat === 'all' ? decorated : decorated.filter(s => s._cat === cat)

  return (
    <div className="prs-card" style={{ padding: 16 }}>
      <div className="prs-card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={15} color={GOLD} /> الجهات المُرسِلة
          <span style={{
            marginInlineStart: 4, padding: '2px 8px', borderRadius: 6,
            background: `${GOLD}14`, border: `1px solid ${GOLD}33`,
            fontSize: 10.5, fontWeight: 800, color: GOLD_SOFT, direction: 'ltr',
          }}>
            {senders.length}
          </span>
        </span>
        <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {SMS_CATEGORIES.map(c => {
            const active = c.key === cat
            return (
              <button key={c.key} onClick={() => setCat(c.key)}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 6,
                  border: `1px solid ${active ? GOLD + '55' : 'rgba(255,255,255,.08)'}`,
                  background: active ? `${GOLD}14` : 'rgba(0,0,0,.18)',
                  color: active ? GOLD_SOFT : 'var(--tx3)',
                  fontFamily: F, fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                }}>
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          padding: 30, textAlign: 'center',
          background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)',
          borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <MessageSquare size={22} color={GOLD} style={{ opacity: .5 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>
            لا توجد جهات في هذا التصنيف
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 8,
        }}>
          {filtered.map(s => (
            <SenderRow key={s.phone_from} sender={s} total={total} state={s._state} />
          ))}
        </div>
      )}
    </div>
  )
}
