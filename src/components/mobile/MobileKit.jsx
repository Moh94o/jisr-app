import React, { useEffect, useRef, useState } from 'react'

/* أدوات عرض الجوال المشتركة. تُستعمل حين useIsMobile() صحيح لتبديل الجداول العريضة
   ولوحات الأرقام بعرضٍ أصلي للجوال. التنسيق في mobile.css (قسم «أدوات الجوال»). */

const Q = '(max-width: 768px)'
export function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(Q).matches)
  useEffect(() => {
    const mq = window.matchMedia(Q)
    const h = e => setM(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return m
}

const TONES = { gold: '#B07D00', green: '#1f8a4c', red: '#c0392b', blue: '#2f7cb3', orange: '#d97a1e', gray: '#7a7060', purple: '#7d4fb3' }
export const mTone = t => TONES[t] || t || TONES.gold

/* شريط أرقام أفقي قابل للتمرير — بديل لبطاقات الإحصاء المكدّسة عمودياً */
export function MStatStrip({ items, style }) {
  const list = (items || []).filter(Boolean)
  if (!list.length) return null
  return (
    <div className="mk-stats" style={style}>
      {list.map((it, i) => (
        <div key={it.key || i} className={'mk-stat' + (it.onClick ? ' mk-tap' : '')} onClick={it.onClick} style={{ '--tone': mTone(it.tone) }}>
          <span className="mk-stat-lbl">{it.label}</span>
          <span className="mk-stat-val">{it.value}{it.unit && <small>{it.unit}</small>}</span>
          {it.sub && <span className="mk-stat-sub">{it.sub}</span>}
        </div>
      ))}
    </div>
  )
}

/* قائمة بطاقات — بديل الجدول على الجوال.
   كل صفّ: title (نص رئيسي) · subtitle · leading (أيقونة/أفاتار) · badge {text,tone} ·
   fields [{label,value,tone,full}] · amount {value,unit,tone} · onClick */
export function MCardList({ rows, loading, empty, onEndReached, footer }) {
  useEffect(() => {
    if (!onEndReached) return
    const el = document.querySelector('.mk-end-sentinel')
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) onEndReached() }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [onEndReached, rows?.length])
  if (loading && !(rows && rows.length)) {
    return <div className="mk-cards">{[0, 1, 2, 3].map(i => <div key={i} className="mk-card mk-skel"><span /><span /><span /></div>)}</div>
  }
  if (!rows || !rows.length) return empty || null
  return (
    <div className="mk-cards">
      {rows.map((r, i) => { const { key, ...rest } = r; return <MCard key={key ?? i} {...rest} /> })}
      {onEndReached && <div className="mk-end-sentinel" />}
      {footer}
    </div>
  )
}

export function MCard({ title, subtitle, leading, badge, fields, amount, onClick, accent, children, trailing }) {
  const tap = !!onClick
  return (
    <div className={'mk-card' + (tap ? ' mk-tap' : '')} onClick={onClick} role={tap ? 'button' : undefined} style={accent ? { '--tone': mTone(accent) } : undefined}>
      {accent && <span className="mk-card-accent" />}
      <div className="mk-card-head">
        {leading && <span className="mk-card-lead">{leading}</span>}
        <span className="mk-card-titles">
          <span className="mk-card-title">{title}</span>
          {subtitle && <span className="mk-card-sub">{subtitle}</span>}
        </span>
        {amount != null && amount !== false && (
          <span className="mk-card-amount" style={{ color: mTone(amount.tone || 'gold') }}>
            {amount.value}{amount.unit && <small>{amount.unit}</small>}
          </span>
        )}
        {badge && <MBadge {...badge} />}
        {trailing}
      </div>
      {fields && fields.filter(Boolean).length > 0 && (
        <div className="mk-fields">
          {fields.filter(Boolean).map((f, i) => (
            <div key={i} className={'mk-field' + (f.full ? ' full' : '')}>
              <span className="mk-field-lbl">{f.label}</span>
              <span className="mk-field-val" style={f.tone ? { color: mTone(f.tone) } : undefined} dir={f.ltr ? 'ltr' : undefined}>{f.value ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

export function MBadge({ text, tone }) {
  if (!text) return null
  return <span className="mk-badge" style={{ '--tone': mTone(tone || 'gray') }}>{text}</span>
}

/* زرّ عائم للإجراء الرئيسي (فوق الشريط السفلي) */
export function MFab({ label, onClick, icon }) {
  return (
    <button className="mk-fab" onClick={onClick}>
      {icon || <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
      {label && <span>{label}</span>}
    </button>
  )
}

/* شرائح اختيار أفقية (فلاتر/فترات) */
export function MChips({ options, value, onChange, style }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current?.querySelector('.mk-chip.on')
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [value])
  return (
    <div className="mk-chips" style={style} ref={ref}>
      {options.map(o => (
        <button key={o.value} className={'mk-chip' + (o.value === value ? ' on' : '')} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && <span className="mk-chip-n">{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* عنوان مجموعة داخل الصفحة */
export function MSection({ title, action, children, style }) {
  return (
    <section className="mk-section" style={style}>
      {(title || action) && <div className="mk-section-head"><h3>{title}</h3>{action}</div>}
      {children}
    </section>
  )
}

/* بحث بنمط الجوال */
export function MSearch({ value, onChange, placeholder }) {
  return (
    <label className="mk-search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} enterKeyHint="search" />
      {value && <button onClick={() => onChange('')} aria-label="clear">×</button>}
    </label>
  )
}
