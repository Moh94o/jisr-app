import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
  Activity, Plus, Pencil, Trash2, Check, X, LogIn, Download, Upload,
  ChevronDown, Filter, Clock, MapPin, Info,
} from 'lucide-react'
import * as userProfileService from '../../../services/userProfileService.js'

const F = "'Cairo','Tajawal',sans-serif"
const GOLD = '#D4A017'
const GOLD_SOFT = '#e8c77a'

const TONE = {
  success: { color: '#27a046', bg: 'rgba(39,160,70,.12)', border: 'rgba(39,160,70,.35)' },
  info:    { color: '#3483b4', bg: 'rgba(52,131,180,.12)', border: 'rgba(52,131,180,.35)' },
  danger:  { color: '#c0392b', bg: 'rgba(192,57,43,.12)',  border: 'rgba(192,57,43,.35)' },
  gold:    { color: GOLD,       bg: `${GOLD}14`,              border: `${GOLD}33` },
  warning: { color: '#e6a23c', bg: 'rgba(230,162,60,.12)',  border: 'rgba(230,162,60,.35)' },
  neutral: { color: '#7a8698', bg: 'rgba(122,134,152,.12)', border: 'rgba(122,134,152,.35)' },
}

const ACTION_ICON = {
  insert:   Plus,
  update:   Pencil,
  delete:   Trash2,
  approve:  Check,
  reject:   X,
  login:    LogIn,
  logout:   LogIn,
  export:   Download,
  import:   Upload,
}

const formatRelative = (secondsAgo) => {
  const s = Number(secondsAgo || 0)
  if (s < 60) return 'الآن'
  if (s < 3600) return `قبل ${Math.floor(s / 60)} د`
  if (s < 86400) return `قبل ${Math.floor(s / 3600)} س`
  if (s < 604800) return `قبل ${Math.floor(s / 86400)} يوم`
  if (s < 2592000) return `قبل ${Math.floor(s / 604800)} أسبوع`
  return `قبل ${Math.floor(s / 2592000)} شهر`
}

const formatAbsolute = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' }) }
  catch { return iso }
}

// Simple chip dropdown used for the filter bar. Matches the gold-on-dark theme.
const FilterSelect = ({ label, value, onChange, options }) => {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const selected = options.find(o => o.value === value)
  const active = value != null && value !== ''
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
          borderRadius: 9, minWidth: 160, padding: 4, zIndex: 5,
          boxShadow: '0 10px 30px rgba(0,0,0,.5)',
        }}>
          {options.map(o => {
            const sel = o.value === value
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

const TimelineItem = ({ row, isLast, onOpen }) => {
  const tone = TONE[row.action_tone] || TONE.neutral
  const Icon = ACTION_ICON[row.action] || Activity
  return (
    <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: tone.bg, border: `1.5px solid ${tone.border}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 10px ${tone.color}33`, zIndex: 2,
        }}>
          <Icon size={13} color={tone.color} strokeWidth={2.2} />
        </div>
        {!isLast && (
          <div style={{
            width: 1.5, flex: 1, minHeight: 20,
            background: 'linear-gradient(180deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,.02) 100%)',
            marginTop: 2,
          }} />
        )}
      </div>
      <button onClick={() => onOpen(row)} style={{
        flex: 1, minWidth: 0, textAlign: 'start',
        background: 'transparent', border: 'none', padding: '3px 0 16px',
        cursor: 'pointer', fontFamily: F, color: 'inherit',
      }}>
        <div style={{
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,.02)',
          border: '1px solid rgba(255,255,255,.04)',
          transition: '.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.04)'; e.currentTarget.style.borderColor = `${GOLD}22` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.04)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.5 }}>
            {row.description || `${row.action_label_ar || row.action} — ${row.entity_label_ar || ''}`}
          </div>
          <div style={{
            marginTop: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
            fontSize: 10.5, fontWeight: 700, color: 'var(--tx5)',
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 7px', borderRadius: 5,
              background: tone.bg, color: tone.color, border: `1px solid ${tone.border}`,
            }}>
              {row.action_label_ar || row.action}
            </span>
            {row.entity_label_ar && (
              <span>{row.entity_label_ar}{row.entity_name ? ` · ${row.entity_name}` : ''}</span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Clock size={10} /> {formatRelative(row.seconds_ago)}
            </span>
            {row.branch_code && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5,
                color: GOLD_SOFT,
              }}>
                <MapPin size={10} /> {row.branch_code}
              </span>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

const DiffRow = ({ label, oldV, newV }) => {
  const changed = JSON.stringify(oldV) !== JSON.stringify(newV)
  const fmt = (v) => v == null ? '—' : (typeof v === 'object' ? JSON.stringify(v) : String(v))
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: 10,
      padding: '9px 10px', borderRadius: 8,
      background: changed ? `${GOLD}08` : 'transparent',
      border: `1px solid ${changed ? GOLD + '22' : 'transparent'}`,
      alignItems: 'start',
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx4)' }}>{label}</div>
      <div style={{
        fontSize: 11.5, fontWeight: 600, padding: '4px 8px', borderRadius: 6,
        background: changed ? 'rgba(192,57,43,.08)' : 'rgba(255,255,255,.02)',
        color: changed ? '#e68a80' : 'var(--tx3)',
        textDecoration: changed && newV != null ? 'line-through' : 'none',
        wordBreak: 'break-word',
      }}>{fmt(oldV)}</div>
      <div style={{
        fontSize: 11.5, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
        background: changed ? 'rgba(39,160,70,.08)' : 'rgba(255,255,255,.02)',
        color: changed ? '#6ee091' : 'var(--tx3)',
        wordBreak: 'break-word',
      }}>{fmt(newV)}</div>
    </div>
  )
}

const DetailPanel = ({ row, onClose }) => {
  if (!row) return null
  const tone = TONE[row.action_tone] || TONE.neutral
  const Icon = ACTION_ICON[row.action] || Activity
  const keys = useMemo(() => {
    const s = new Set()
    ;[row.old_data, row.new_data].forEach(o => {
      if (o && typeof o === 'object') Object.keys(o).forEach(k => s.add(k))
    })
    return Array.from(s)
  }, [row])
  const changedKeys = keys.filter(k => {
    const a = row.old_data?.[k]
    const b = row.new_data?.[k]
    return JSON.stringify(a) !== JSON.stringify(b)
  })
  const showKeys = changedKeys.length ? changedKeys : keys

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,.7)', backdropFilter: 'blur(6px)',
      zIndex: 1000, display: 'flex', justifyContent: 'flex-start',
    }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{
        width: 520, maxWidth: '95vw', height: '100%',
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
            <Icon size={16} color={tone.color} strokeWidth={2.2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>
              {row.action_label_ar || row.action}
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 2 }}>
              {row.entity_label_ar}{row.entity_name ? ` · ${row.entity_name}` : ''}
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
          {row.description && (
            <div style={{
              padding: '10px 12px', borderRadius: 9,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)',
              fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)', lineHeight: 1.6,
            }}>
              {row.description}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 8 }}>
            <InfoBox label="الوقت" value={formatAbsolute(row.created_at)} />
            {row.branch_code && <InfoBox label="الفرع" value={row.branch_code} mono />}
            {row.ip_address && <InfoBox label="IP" value={row.ip_address} mono />}
            {row.metadata?.user_agent && (
              <InfoBox label="المتصفح" value={String(row.metadata.user_agent).slice(0, 40) + (String(row.metadata.user_agent).length > 40 ? '…' : '')} />
            )}
          </div>

          {showKeys.length > 0 && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8, padding: '0 2px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx)' }}>
                  <Info size={11} style={{ marginInlineEnd: 4, color: GOLD }} /> الفروقات
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 10, fontWeight: 800 }}>
                  <span style={{ color: '#e68a80' }}>قبل</span>
                  <span style={{ color: 'var(--tx5)' }}>/</span>
                  <span style={{ color: '#6ee091' }}>بعد</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {showKeys.map(k => (
                  <DiffRow key={k} label={k} oldV={row.old_data?.[k]} newV={row.new_data?.[k]} />
                ))}
              </div>
            </div>
          )}

          {showKeys.length === 0 && !row.description && (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--tx5)', fontSize: 11.5, fontWeight: 700 }}>
              لا توجد تفاصيل إضافية
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
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

const PAGE_SIZE = 50

export default function UserActivityCard({ userId, toast }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [days, setDays] = useState('')
  const [detail, setDetail] = useState(null)
  const sentinelRef = useRef(null)
  const loadMoreRef = useRef(() => {})

  const load = useCallback(async (reset) => {
    if (!userId) return
    if (reset) { setLoading(true); setExhausted(false) }
    else setLoadingMore(true)
    try {
      const from = reset ? 0 : items.length
      const data = await userProfileService.listUserActivity(userId, {
        from, size: PAGE_SIZE,
        action: action || undefined,
        entityType: entityType || undefined,
        days: days ? Number(days) : undefined,
      })
      setItems(reset ? data : [...items, ...data])
      if (data.length < PAGE_SIZE) setExhausted(true)
    } catch (e) {
      toast?.(e.message || 'خطأ في تحميل النشاط')
    } finally {
      if (reset) setLoading(false)
      else setLoadingMore(false)
    }
  }, [userId, items, action, entityType, days, toast])

  loadMoreRef.current = () => {
    if (loadingMore || exhausted || loading) return
    load(false)
  }

  useEffect(() => { load(true) }, [userId, action, entityType, days])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreRef.current()
    }, { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [items.length, exhausted, loadingMore, loading])

  // Build filter options from what's actually in the data so we don't show
  // options the backend will return zero rows for.
  const { actionOpts, entityOpts } = useMemo(() => {
    const a = new Map(); const e = new Map()
    items.forEach(r => {
      if (r.action && !a.has(r.action)) a.set(r.action, r.action_label_ar || r.action)
      if (r.entity_type && !e.has(r.entity_type)) e.set(r.entity_type, r.entity_label_ar || r.entity_type)
    })
    return {
      actionOpts: [{ value: '', label: 'الكل' }, ...Array.from(a, ([value, label]) => ({ value, label }))],
      entityOpts: [{ value: '', label: 'الكل' }, ...Array.from(e, ([value, label]) => ({ value, label }))],
    }
  }, [items])

  return (
    <div className="prs-card" style={{ padding: 16 }}>
      <div className="prs-card-title" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} color={GOLD} /> سجل النشاط التفصيلي
        </span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Filter size={12} color="var(--tx5)" />
          <FilterSelect label="العملية" value={action} onChange={setAction} options={actionOpts} />
          <FilterSelect label="الكيان" value={entityType} onChange={setEntityType} options={entityOpts} />
          <FilterSelect label="الفترة" value={days} onChange={setDays} options={[
            { value: '', label: 'الكل' },
            { value: 7, label: '٧ أيام' },
            { value: 14, label: '١٤ يوم' },
            { value: 30, label: '٣٠ يوم' },
          ]} />
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
          <Activity size={22} color={GOLD} style={{ opacity: .5 }} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx4)' }}>
            لا يوجد نشاط مسجّل
          </div>
        </div>
      ) : (
        <div style={{ padding: '4px 2px' }}>
          {items.map((row, i) => (
            <TimelineItem
              key={row.id || i}
              row={row}
              isLast={i === items.length - 1 && exhausted}
              onOpen={setDetail}
            />
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
