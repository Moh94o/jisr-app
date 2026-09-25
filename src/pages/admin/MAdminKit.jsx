import React, { useState } from 'react'
import BackButton from '../../components/BackButton'
import { mTone } from '../../components/mobile/MobileKit.jsx'
import '../../styles/m-admin.css'

/* أدوات عرض الجوال لصفحات الإدارة (المكاتب، المستخدمون، الأدوار، العملاء، الوسطاء…).
   تُرسم فقط حين useIsMobile() صحيح — العرض الحاسبي لا يتأثّر. التنسيق في styles/m-admin.css */

const Chev = () => (
  <svg className="ma-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
)

/* عنوان الصفحة المضغوط: عنوان + سطر وصف واحد اختياري */
export function MPageHead({ title, sub, action }) {
  return (
    <div className="ma-head">
      <div className="ma-head-text">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

/* رابط الرجوع بنمط iOS — يلفّ BackButton الأصلي (يحافظ على سلسلة الرجوع وزر الرجوع في الجوال) */
export function MBack(props) {
  return <div className="ma-back"><BackButton {...props} /></div>
}

/* ترويسة ملف (عميل/مستخدم/مكتب…) — صورة/حرف + اسم + سطر فرعي + شارات */
export function MHero({ avatar, img, tone = 'gold', title, sub, subLtr, badges, children, square }) {
  const c = mTone(tone)
  return (
    <div className="ma-hero">
      <div className={'ma-hero-av' + (square ? ' sq' : '')} style={{ '--tone': c }}>
        {img ? <img src={img} alt="" /> : avatar}
      </div>
      <div className="ma-hero-title">{title}</div>
      {sub && <div className="ma-hero-sub" dir={subLtr ? 'ltr' : undefined}>{sub}</div>}
      {badges && <div className="ma-hero-badges">{badges}</div>}
      {children}
    </div>
  )
}

/* مجموعة مُجمّعة بنمط iOS (عنوان صغير فوق سطح مستدير) */
export function MGroup({ title, action, children, footer, flush, style, className }) {
  return (
    <section className={'ma-group' + (className ? ' ' + className : '')} style={style}>
      {(title || action) && (
        <div className="ma-group-hdr"><span>{title}</span>{action}</div>
      )}
      <div className={'ma-list' + (flush ? ' flush' : '')}>{children}</div>
      {footer && <div className="ma-group-foot">{footer}</div>}
    </section>
  )
}

/* زر نصّي صغير في رأس المجموعة (تعديل/إضافة) */
export function MLink({ children, onClick, tone }) {
  return <button type="button" className="ma-link" onClick={onClick} style={tone ? { color: mTone(tone) } : undefined}>{children}</button>
}

/* صف «تسمية ← قيمة» */
export function MKV({ label, value, ltr, tone, copy, onClick, icon, wrap, toast }) {
  const [done, setDone] = useState(false)
  const doCopy = async (e) => {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(String(value)); setDone(true); setTimeout(() => setDone(false), 1200) } catch (_) { toast?.('تعذّر النسخ') }
  }
  const empty = value == null || value === '' || value === false
  return (
    <div className={'ma-kv' + (onClick ? ' tap' : '')} onClick={onClick} role={onClick ? 'button' : undefined}>
      {icon && <span className="ma-kv-ico">{icon}</span>}
      <span className="ma-kv-l">{label}</span>
      <span className={'ma-kv-v' + (wrap ? ' wrap' : '') + (empty ? ' empty' : '')} dir={ltr && !empty ? 'ltr' : undefined} style={tone && !empty ? { color: mTone(tone) } : undefined}>
        {empty ? '—' : value}
      </span>
      {copy && !empty && (
        <button type="button" className={'ma-copy' + (done ? ' done' : '')} onClick={doCopy} aria-label="نسخ">
          {done
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
        </button>
      )}
      {onClick && <Chev />}
    </div>
  )
}

/* صف قائمة: أيقونة/أفاتار + عنوان + سطر فرعي + قيمة/شارة + سهم */
export function MItem({ leading, tone, title, sub, subLtr, value, valueTone, badge, onClick, chevron = true, trailing, dim, className }) {
  return (
    <div className={'ma-item' + (onClick ? ' tap' : '') + (dim ? ' dim' : '') + (className ? ' ' + className : '')} onClick={onClick} role={onClick ? 'button' : undefined}>
      {leading != null && <span className="ma-item-lead" style={{ '--tone': mTone(tone) }}>{leading}</span>}
      <span className="ma-item-text">
        <span className="ma-item-title">{title}</span>
        {sub && <span className="ma-item-sub" dir={subLtr ? 'ltr' : undefined}>{sub}</span>}
      </span>
      {value != null && <span className="ma-item-val" style={valueTone ? { color: mTone(valueTone) } : undefined}>{value}</span>}
      {badge}
      {trailing}
      {onClick && chevron && <Chev />}
    </div>
  )
}

/* مفتاح iOS */
export function MSwitch({ on, onChange, disabled, busy }) {
  return (
    <button type="button" role="switch" aria-checked={!!on} disabled={disabled || busy}
      className={'ma-switch' + (on ? ' on' : '') + (busy ? ' busy' : '')}
      onClick={e => { e.stopPropagation(); if (!disabled && !busy) onChange?.(!on) }}>
      <span />
    </button>
  )
}

export function MSwitchRow({ title, sub, on, onChange, disabled, busy, leading, tone }) {
  return (
    <div className={'ma-item' + (disabled ? ' dim' : '')}>
      {leading != null && <span className="ma-item-lead" style={{ '--tone': mTone(tone) }}>{leading}</span>}
      <span className="ma-item-text">
        <span className="ma-item-title">{title}</span>
        {sub && <span className="ma-item-sub">{sub}</span>}
      </span>
      <MSwitch on={on} onChange={onChange} disabled={disabled} busy={busy} />
    </div>
  )
}

/* مربعات أرقام صغيرة (فوترة/مدفوع/متبقٍ) */
export function MTiles({ items }) {
  const list = (items || []).filter(Boolean)
  if (!list.length) return null
  return (
    <div className={'ma-tiles c' + Math.min(list.length, 3)}>
      {list.map((t, i) => (
        <div key={i} className="ma-tile" style={{ '--tone': mTone(t.tone) }}>
          <span className="ma-tile-l">{t.label}</span>
          <span className="ma-tile-v">{t.value}{t.unit && <small>{t.unit}</small>}</span>
        </div>
      ))}
    </div>
  )
}

/* شريط نسبة */
export function MProgress({ pct, tone = 'green', label, right }) {
  return (
    <div className="ma-prog">
      {(label || right) && <div className="ma-prog-top"><span>{label}</span><b style={{ color: mTone(tone) }}>{right}</b></div>}
      <div className="ma-prog-bar"><span style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, background: mTone(tone) }} /></div>
    </div>
  )
}

/* أفاتار دائري/مربّع بحرف أو صورة */
export function MAvatar({ text, img, tone = 'gold', size = 42, round }) {
  const c = mTone(tone)
  return (
    <span className="ma-av" style={{ '--tone': c, width: size, height: size, borderRadius: round ? '50%' : Math.round(size * 0.3), fontSize: Math.round(size * 0.4) }}>
      {img ? <img src={img} alt="" /> : text}
    </span>
  )
}

export const initialOf = (s) => ((s || '—').trim().charAt(0) || '?')
export const fmtNum = (v) => Number(v || 0).toLocaleString('en-US')
