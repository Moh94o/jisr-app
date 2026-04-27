import React, { useState, useMemo, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { User, FileText, Calculator, Tag, ChevronRight, ChevronLeft, Plus, Trash2, Check, X, AlertCircle, Briefcase, Phone, Calendar, ArrowLeftRight, Search, Shield, CreditCard, Clock, Building2, CheckCircle2, Info, Printer, Database, FileCheck, Send } from 'lucide-react'
import { getSupabase } from '../lib/supabase.js'
import { getKafalaPricingConfig } from '../lib/kafalaPricing.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4', bg: '#171717', sf: '#1e1e1e', bd: 'rgba(255,255,255,.06)' }

// ═══ Hijri Conversion ═══
function gregorianToHijri(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const JD = Math.floor(d.getTime() / 86400000) + 2440588
  const l = JD - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n + 354
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238)
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const month = Math.floor((24 * l3) / 709)
  const day = l3 - Math.floor((709 * month) / 24)
  const year = 30 * n + j - 30
  if (month < 1 || month > 12) return ''
  return `${day}/${month}/${year} هـ`
}

function gregorianToHijriParts(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  const JD = Math.floor(d.getTime() / 86400000) + 2440588
  const l = JD - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n + 354
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238)
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const month = Math.floor((24 * l3) / 709)
  const day = l3 - Math.floor((709 * month) / 24)
  const year = 30 * n + j - 30
  if (month < 1 || month > 12) return null
  return { day, month, year }
}

function hijriToGregorian(hYear, hMonth, hDay) {
  const jd = Math.floor((11 * hYear + 3) / 30) + 354 * hYear + 30 * hMonth - Math.floor((hMonth - 1) / 2) + hDay + 1948440 - 385
  const la = jd + 68569
  const n = Math.floor(4 * la / 146097)
  const la2 = la - Math.floor((146097 * n + 3) / 4)
  const i = Math.floor(4000 * (la2 + 1) / 1461001)
  const la3 = la2 - Math.floor(1461 * i / 4) + 31
  const j = Math.floor(80 * la3 / 2447)
  const gDay = la3 - Math.floor(2447 * j / 80)
  const la4 = Math.floor(j / 11)
  const gMonth = j + 2 - 12 * la4
  const gYear = 100 * (n - 49) + i + la4
  return `${gYear}-${String(gMonth).padStart(2,'0')}-${String(gDay).padStart(2,'0')}`
}

// Generate Hijri year options (current range)
function getHijriYears() {
  const parts = gregorianToHijriParts(new Date().toISOString().slice(0,10))
  if (!parts) return []
  const years = []
  for (let y = parts.year - 2; y <= parts.year + 5; y++) years.push(y)
  return years
}

function daysSinceExpiry(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  return diff > 0 ? diff : 0
}

const NATIONALITIES = ['يمني', 'مصري', 'باكستاني', 'هندي', 'بنغلاديشي', 'إثيوبي', 'فلبيني', 'سوداني', 'سوري', 'أردني', 'لبناني', 'عراقي', 'فلسطيني', 'إندونيسي', 'سريلانكي', 'نيبالي', 'إريتري', 'أخرى']
const OCCUPATIONS = ['عامل بناء', 'نجار', 'حداد', 'كهربائي', 'سباك', 'دهان', 'مشغل معدات', 'سائق', 'مقاول', 'فني تكييف', 'حارس أمن', 'عامل نظافة', 'بائع', 'موظف إداري', 'أخرى']

// ═══ Shared UI Components — matches register modal style ═══
const sF = { width: '100%', height: 40, padding: '0 14px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#2e2e2e,#262626)', boxSizing: 'border-box', textAlign: 'center', transition: 'border-color .2s' }
const sFRO = { ...sF, border: '1px solid rgba(255,255,255,.05)', cursor: 'not-allowed' }

const Lbl = ({ children, req }) => <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }}>{children}{req && <span style={{ color: C.red, marginRight: 2 }}>*</span>}</div>

const CAPTCHA_TTL = 30
const CaptchaCountdown = ({ captchaKey, onExpire, color = C.gold }) => {
  const [remaining, setRemaining] = useState(CAPTCHA_TTL)
  const firedRef = useRef(false)
  useEffect(() => {
    firedRef.current = false
    setRemaining(CAPTCHA_TTL)
    const start = Date.now()
    const iv = setInterval(() => {
      const rem = Math.max(0, CAPTCHA_TTL - Math.floor((Date.now() - start) / 1000))
      setRemaining(rem)
      if (rem === 0 && !firedRef.current) {
        firedRef.current = true
        clearInterval(iv)
        onExpire && onExpire()
      }
    }, 250)
    return () => clearInterval(iv)
  }, [captchaKey])
  const urgent = remaining <= 10
  const displayColor = urgent ? C.red : color
  const size = 38
  const stroke = 3
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - remaining / CAPTCHA_TTL)
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={displayColor} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset .25s linear' }} />
      </svg>
      <span style={{ position: 'absolute', fontSize: 14, fontWeight: 500, color: displayColor, fontFamily: F, lineHeight: 1 }}>{remaining}</span>
    </div>
  )
}

const Inp = ({ value, onChange, placeholder, type, dir, maxLength }) => (
  <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type || 'text'} maxLength={maxLength}
    style={{ ...sF, textAlign: 'center', direction: dir || 'rtl' }} />
)

const DateInp = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o=>!o)} style={{ ...sF, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, direction: 'ltr', color: value ? 'var(--tx)' : 'var(--tx5)', border: `1px solid ${value || open ? C.gold+'b3' : C.gold+'40'}` }}>
        <span>{value || 'yyyy-mm-dd'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
      {open && (
        <input type="date" value={value || ''} onChange={e => { onChange(e.target.value); setOpen(false) }} autoFocus
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: 40 }}
          onBlur={() => setOpen(false)} />
      )}
    </div>
  )
}

// Custom dark-themed calendar popup to match modal design
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const MONTH_NAMES_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_ABBR_AR = ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const DAY_ABBR_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const pad2 = n => String(n).padStart(2, '0')
const fmtDate = (y, m, d) => `${y}-${pad2(m+1)}-${pad2(d)}`

const CalendarPopup = ({ value, onPick, onClose, anchor, lang }) => {
  const today = new Date()
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').map(Number) : null
  const initial = parsed ? { y: parsed[0], m: parsed[1]-1 } : { y: today.getFullYear(), m: today.getMonth() }
  const [cur, setCur] = useState(initial)
  const firstDay = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate()
  const prevMonth = () => setCur(c => c.m === 0 ? { y: c.y-1, m: 11 } : { y: c.y, m: c.m-1 })
  const nextMonth = () => setCur(c => c.m === 11 ? { y: c.y+1, m: 0 } : { y: c.y, m: c.m+1 })
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const isToday = (y, m, d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d
  const navBtn = { width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: '.15s' }
  const POPUP_H = 310, POPUP_W = Math.max(260, anchor.width)
  const spaceBelow = window.innerHeight - anchor.bottom
  const flipUp = spaceBelow < POPUP_H + 10
  const top = flipUp ? Math.max(8, anchor.top - POPUP_H - 6) : anchor.bottom + 6
  const left = Math.max(8, Math.min(window.innerWidth - POPUP_W - 8, anchor.left + anchor.width/2 - POPUP_W/2))
  return (
    <div style={{ position: 'fixed', top, left, width: POPUP_W, background: 'linear-gradient(180deg,#2e2e2e,#262626)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12, zIndex: 1001, boxShadow: '0 12px 40px rgba(0,0,0,.7)', fontFamily: F, direction: lang === 'en' ? 'ltr' : 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, direction: 'ltr' }}>
        <button type="button" onClick={prevMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--tx)' }}>{(lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_AR)[cur.m]} {cur.y}</div>
        <button type="button" onClick={nextMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>
        {(lang === 'en' ? DAY_ABBR_EN : DAY_ABBR_AR).map(d => <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const s = fmtDate(cur.y, cur.m, d)
          const isSel = value === s
          const isTd = isToday(cur.y, cur.m, d)
          return (
            <button key={i} type="button" onClick={() => { onPick(s); onClose() }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isTd ? 'rgba(212,160,23,.04)' : 'transparent' }}
              style={{ height: 30, borderRadius: 6, border: isTd && !isSel ? `1px solid ${C.gold}55` : '1px solid transparent', background: isSel ? C.gold : (isTd ? 'rgba(212,160,23,.04)' : 'transparent'), color: isSel ? '#000' : (isTd ? C.gold : 'rgba(255,255,255,.8)'), fontFamily: F, fontSize: 10, fontWeight: isSel || isTd ? 800 : 500, cursor: 'pointer', transition: '.15s', padding: 0 }}>
              {d}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <button type="button" onClick={() => { const t = new Date(); onPick(fmtDate(t.getFullYear(), t.getMonth(), t.getDate())); onClose() }} style={{ fontSize: 12, color: C.gold, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 500, padding: '4px 8px' }}>{lang === 'en' ? 'Today' : 'اليوم'}</button>
        <button type="button" onClick={() => { onPick(''); onClose() }} style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 500, padding: '4px 8px' }}>{lang === 'en' ? 'Clear' : 'مسح'}</button>
      </div>
    </div>
  )
}

// Single-input date field: type YYYY-MM-DD or click calendar icon for custom picker
const DateField = ({ value, onChange, label, req, lang }) => {
  const wrapRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [focused, setFocused] = useState(false)
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value])
  const handleType = t => {
    let v = t.replace(/[^0-9-]/g, '')
    if (v.length > 4 && v[4] !== '-') v = v.slice(0,4) + '-' + v.slice(4)
    if (v.length > 7 && v[7] !== '-') v = v.slice(0,7) + '-' + v.slice(7)
    v = v.slice(0, 10)
    // Clamp month to 01-12 once both digits are entered
    if (v.length >= 7) {
      const m = parseInt(v.slice(5, 7), 10)
      if (m > 12) v = v.slice(0, 5) + '12' + v.slice(7)
      else if (m === 0) v = v.slice(0, 5) + '01' + v.slice(7)
    }
    // Clamp day to 01-31 once both digits are entered
    if (v.length >= 10) {
      const d = parseInt(v.slice(8, 10), 10)
      if (d > 31) v = v.slice(0, 8) + '31'
      else if (d === 0) v = v.slice(0, 8) + '01'
    }
    setText(v)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) || v === '') onChange(v)
  }
  const openPicker = () => {
    if (!pickerOpen && wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: r.width })
    }
    setPickerOpen(o => !o)
  }
  return (
    <div>
      <Lbl req={req}>{label}</Lbl>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
        <input type="text" value={text} onChange={e => handleType(e.target.value)} placeholder="yyyy-mm-dd"
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ ...sF, direction: 'ltr', textAlign: 'center', padding: '0 40px 0 14px', letterSpacing: '.5px', cursor: 'text' }} />
        <button type="button" onClick={openPicker} aria-label="calendar"
          style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, border: 'none', background: pickerOpen ? 'rgba(212,160,23,.12)' : 'transparent', cursor: 'pointer', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 7, transition: '.15s' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
        {pickerOpen && anchor && (<>
          <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <CalendarPopup value={value} onPick={onChange} onClose={() => setPickerOpen(false)} anchor={anchor} lang={lang} />
        </>)}
      </div>
    </div>
  )
}

const OccSelect = ({ value, onChange, items, lang, placeholder }) => {
  const isAr = lang !== 'en'
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 380 })
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const filtered = q ? items.filter(o => (o.name_ar || '').includes(q) || (o.name_en || '').toLowerCase().includes(q.toLowerCase())) : items
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - r.bottom - 12
      // Show ~2 items at a time (search bar ~50px + ~2 rows of ~62px each ≈ 180px); rest scrolls.
      const maxH = Math.max(150, Math.min(190, spaceBelow))
      setPos({ top: r.bottom + 6, left: r.left, width: r.width, maxH })
    }
    setQ('')
    setOpen(o => !o)
  }
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (popRef.current && !popRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={toggle} style={{ ...sF, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: value ? 'var(--tx)' : 'var(--tx5)', border: `1px solid ${open ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.08)'}`, padding: '0 32px', position: 'relative' }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 400 }}>{value || placeholder || '...'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popRef} className="occ-sel-pop" style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: 'linear-gradient(180deg,#2e2e2e,#262626)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, maxHeight: pos.maxH, display: 'flex', flexDirection: 'column', zIndex: 2000, boxShadow: '0 16px 48px rgba(0,0,0,.75)', overflow: 'hidden', direction: isAr ? 'rtl' : 'ltr', fontFamily: F }}>
          <div style={{ padding: 10, flexShrink: 0, position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="occ-sel-icon" style={{ position: 'absolute', top: '50%', left: 22, transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={isAr ? 'ابحث بالاسم...' : 'Search by name...'} autoFocus className="occ-sel-search" style={{ width: '100%', height: 34, padding: '0 34px', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, background: '#141414', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
          </div>
          <style>{`.occ-sel-scroll{scrollbar-width:none;-ms-overflow-style:none}.occ-sel-scroll::-webkit-scrollbar{display:none;width:0;height:0}.occ-sel-search,.occ-sel-search:focus,.occ-sel-search:hover{border-color:rgba(255,255,255,.06)!important;box-shadow:none!important;outline:none!important}.occ-sel-search::placeholder{font-size:12px;color:rgba(255,255,255,.4)}.occ-sel-icon,.occ-sel-icon *{stroke:rgba(255,255,255,.45)!important;color:rgba(255,255,255,.45)!important}`}</style>
          <div className="occ-sel-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: 30, textAlign: 'center', fontSize: 14, color: 'var(--tx5)' }}>{isAr ? 'لا توجد نتائج' : 'No results'}</div>}
            {filtered.slice(0, 200).map(o => {
              const selLabel = isAr && o.name_ar ? o.name_ar : (o.name_en || o.name_ar)
              const isSel = value === selLabel
              return (
                <div key={o.id} onClick={() => { onChange(selLabel, o); setOpen(false); setQ('') }}
                  style={{ padding: '5px 14px', cursor: 'pointer', position: 'relative', borderBottom: '1px solid rgba(255,255,255,.08)', background: isSel ? 'rgba(212,160,23,.1)' : 'transparent', transition: '.12s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,.035)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: isSel ? 500 : 400, color: isSel ? C.gold : 'rgba(255,255,255,.92)', textAlign: 'center', width: '100%' }}>{o.name_ar}</span>
                    {o.name_en && <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,.5)', textAlign: 'center', width: '100%', unicodeBidi: 'plaintext' }}>{o.name_en}</span>}
                  </div>
                  {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }}><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              )
            })}
            {filtered.length > 200 && <div style={{ padding: 10, textAlign: 'center', fontSize: 14, color: 'var(--tx5)' }}>{isAr ? `… و ${filtered.length - 200} نتيجة أخرى. ضيّق البحث.` : `… and ${filtered.length - 200} more. Narrow your search.`}</div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const Sel = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 380 })
  const btnRef = useRef(null)
  const popRef = useRef(null)
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const maxH = options.length * 42 + 4
      setPos({ top: r.bottom + 6, left: r.left, width: r.width, maxH })
    }
    setOpen(o => !o)
  }
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (popRef.current && !popRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={toggle} style={{ ...sF, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: value ? 'var(--tx)' : 'var(--tx5)', border: `1px solid ${open ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.08)'}`, padding: '0 32px', position: 'relative' }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 400 }}>{value || placeholder || '...'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: 'linear-gradient(180deg,#2e2e2e,#262626)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, maxHeight: pos.maxH, display: 'flex', flexDirection: 'column', zIndex: 2000, boxShadow: '0 16px 48px rgba(0,0,0,.75)', overflow: 'hidden', direction: 'rtl', fontFamily: F }}>
          <style>{`.sel-pop-scroll{scrollbar-width:none;-ms-overflow-style:none}.sel-pop-scroll::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
          <div className="sel-pop-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {options.length === 0 && <div style={{ padding: 30, textAlign: 'center', fontSize: 14, color: 'var(--tx5)' }}>—</div>}
            {options.map(o => {
              const isSel = value === o
              return (
                <div key={o} onClick={() => { onChange(o); setOpen(false) }}
                  style={{ padding: '5px 14px', cursor: 'pointer', position: 'relative', borderBottom: '1px solid rgba(255,255,255,.08)', background: isSel ? 'rgba(212,160,23,.1)' : 'transparent', transition: '.12s' }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,.035)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: isSel ? 500 : 400, color: isSel ? C.gold : 'rgba(255,255,255,.92)', textAlign: 'center', width: '100%' }}>{o}</span>
                  </div>
                  {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }}><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const ToggleGroup = ({ options, value, onChange, disabled, height = 36 }) => (
  <div style={{ display: 'flex', gap: 6, height }}>
    {options.map(o => {
      const sel = value === o.v
      const clr = o.c || C.gold
      return (
        <button key={String(o.v)} type="button" disabled={disabled} onClick={() => !disabled && onChange(o.v)} style={{
          flex: 1, borderRadius: 8, border: `1.5px solid ${sel ? clr : 'rgba(255,255,255,.08)'}`,
          background: sel ? clr + '15' : 'rgba(0,0,0,.18)',
          color: sel ? clr : 'var(--tx4)',
          fontFamily: F, fontSize: 14, fontWeight: sel ? 700 : 600,
          cursor: disabled ? 'not-allowed' : 'pointer', transition: '.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          boxShadow: sel ? 'none' : 'inset 0 1px 2px rgba(0,0,0,.2)',
          opacity: disabled && !sel ? 0.4 : 1
        }}>
          <span>{o.l}</span>
          {o.sub && <span style={{ fontSize: 14, opacity: .6 }}>{o.sub}</span>}
        </button>
      )
    })}
  </div>
)

const YesNo = ({ value, onChange, lang, disabled, height }) => (
  <ToggleGroup value={value} onChange={onChange} disabled={disabled} height={height} options={[
    { v: true, l: lang === 'en' ? 'Yes' : 'نعم', c: C.ok },
    { v: false, l: lang === 'en' ? 'No' : 'لا', c: C.blue }
  ]} />
)

const KCard = ({ Icon, label, hint, children, span }) => (
  <div style={{ gridColumn: span ? `span ${span}` : 'auto', borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '12px 14px 10px', position: 'relative', transition: '.2s' }}>
    <div style={{ position: 'absolute', top: -10, right: 14, background: '#1a1a1a', padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {Icon && <Icon size={11} strokeWidth={2.2} />}
      <span>{label}</span>
      {hint && <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,.4)', marginInlineStart: 4 }}>· {hint}</span>}
    </div>
    <div>{children}</div>
  </div>
)

const RenewalPill = ({ selected, onClick, children, flex }) => (
  <button type="button" onClick={onClick}
    style={{
      flex: flex || 1,
      height: 36,
      borderRadius: 10,
      border: `1.5px solid ${selected ? C.gold : 'rgba(255,255,255,.08)'}`,
      background: selected ? 'rgba(212,160,23,.08)' : 'rgba(0,0,0,.22)',
      color: selected ? C.gold : 'rgba(255,255,255,.55)',
      fontFamily: F,
      fontSize: 14,
      fontWeight: 500,
      cursor: 'pointer',
      transition: '.18s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      boxShadow: selected ? 'inset 0 0 0 1px rgba(212,160,23,.15)' : 'inset 0 1px 2px rgba(0,0,0,.25)'
    }}
    onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)'; e.currentTarget.style.color = 'rgba(255,255,255,.8)' } }}
    onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.55)' } }}>
    {children}
  </button>
)

const nm = v => Number(v || 0).toLocaleString('en-US')

// ═══ Quote translations ═══
// Best-effort translations for the printed quote sheet. Worker names stay untranslated (they come
// from HRSD / Labor Office records). Arabic and English are primary; bn/hi/ur should be reviewed
// by a native speaker before production use.
const QUOTE_LANGS = [
  { code: 'ar', label: 'العربية',    flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', label: 'English',   flag: '🇬🇧', dir: 'ltr' },
  { code: 'bn', label: 'বাংলা',      flag: '🇧🇩', dir: 'ltr' },
  { code: 'hi', label: 'हिन्दी',      flag: '🇮🇳', dir: 'ltr' },
  { code: 'ur', label: 'اردو',       flag: '🇵🇰', dir: 'rtl' },
]
const QUOTE_TEXTS = {
  ar: { title:'عرض سعر — حسبة التنازل', quoteNo:'رقم التسعيرة', date:'التاريخ', workerData:'بيانات العامل', workerName:'اسم العامل', iqamaNo:'رقم الإقامة', mobile:'رقم الجوال', currentIqamaExpiry:'انتهاء الإقامة الحالي', expectedIqamaExpiry:'انتهاء الإقامة المتوقع', expectedDuration:'المدة المتوقعة', months:'شهر', days:'يوم', and:'و', costSummary:'ملخص التكاليف', item:'البند', amount:'المبلغ', sar:'ريال', transferFee:'رسوم نقل الكفالة', iqamaRenewal:'تجديد الإقامة', workPermit:'رخصة العمل', changeProf:'تغيير المهنة', medical:'التأمين الطبي', office:'رسوم المكتب', extras:'رسوم إضافية', subtotal:'إجمالي الرسوم', absher:'رصيد أبشر (خصم)', grandTotal:'الإجمالي النهائي', warnings:'تنبيهات وملاحظات', warnExpired:'الإقامة منتهية منذ {d} يوم — تم إضافة غرامة التأخير. تجديد الإقامة قبل الانتهاء يُسقط الغرامة.', warnExpiringSoon:'الإقامة ستنتهي خلال {d} يوم — يُنصح بالتجديد قبل الانتهاء لتجنّب غرامة التأخير.', warnValid:'الإقامة سارية — لا توجد غرامة.', signature:'التوقيع', stamp:'الختم', footer:'هذه تسعيرة تقديرية صالحة لمدة 7 أيام من تاريخ الإصدار.', print:'طباعة' },
  en: { title:'Quote — Sponsorship Transfer', quoteNo:'Quote No.', date:'Date', workerData:'Worker Data', workerName:'Worker Name', iqamaNo:'Iqama Number', mobile:'Mobile', currentIqamaExpiry:'Current Iqama Expiry', expectedIqamaExpiry:'Expected Iqama Expiry', expectedDuration:'Expected Duration', months:'month(s)', days:'day(s)', and:'and', costSummary:'Cost Summary', item:'Item', amount:'Amount', sar:'SAR', transferFee:'Sponsorship Transfer Fee', iqamaRenewal:'Iqama Renewal', workPermit:'Work Permit', changeProf:'Profession Change', medical:'Medical Insurance', office:'Office Fees', extras:'Additional Fees', subtotal:'Subtotal', absher:'Absher Balance (discount)', grandTotal:'Grand Total', warnings:'Notes & Warnings', warnExpired:'Iqama expired {d} day(s) ago — late fine applied. Renewing before expiry removes the fine.', warnExpiringSoon:'Iqama expires in {d} day(s) — renew before expiry to avoid the late fine.', warnValid:'Iqama is valid — no fine applies.', signature:'Signature', stamp:'Stamp', footer:'This is an estimated quote valid for 7 days from issue date.', print:'Print' },
  bn: { title:'উদ্ধৃতি — স্পনসরশিপ স্থানান্তর', quoteNo:'উদ্ধৃতি নং', date:'তারিখ', workerData:'কর্মীর তথ্য', workerName:'কর্মীর নাম', iqamaNo:'ইকামা নম্বর', mobile:'মোবাইল', currentIqamaExpiry:'বর্তমান ইকামা মেয়াদ', expectedIqamaExpiry:'প্রত্যাশিত ইকামা মেয়াদ', expectedDuration:'প্রত্যাশিত সময়কাল', months:'মাস', days:'দিন', and:'এবং', costSummary:'খরচের সারাংশ', item:'বিবরণ', amount:'পরিমাণ', sar:'SAR', transferFee:'স্পনসরশিপ স্থানান্তর ফি', iqamaRenewal:'ইকামা নবায়ন', workPermit:'কাজের অনুমতিপত্র', changeProf:'পেশা পরিবর্তন', medical:'চিকিৎসা বীমা', office:'অফিস ফি', extras:'অতিরিক্ত ফি', subtotal:'উপমোট', absher:'আবশের ব্যালেন্স (ছাড়)', grandTotal:'সর্বমোট', warnings:'বিজ্ঞপ্তি ও সতর্কতা', warnExpired:'ইকামার মেয়াদ {d} দিন আগে শেষ হয়েছে — বিলম্ব জরিমানা প্রযোজ্য। মেয়াদ শেষ হওয়ার আগে নবায়ন জরিমানা বাদ দেয়।', warnExpiringSoon:'ইকামা {d} দিনের মধ্যে শেষ হবে — বিলম্ব জরিমানা এড়াতে মেয়াদ শেষ হওয়ার আগে নবায়ন করুন।', warnValid:'ইকামা বৈধ — কোন জরিমানা নেই।', signature:'স্বাক্ষর', stamp:'সিল', footer:'এটি একটি আনুমানিক উদ্ধৃতি, ইস্যুর তারিখ থেকে ৭ দিনের জন্য বৈধ।', print:'মুদ্রণ' },
  hi: { title:'उद्धरण — प्रायोजन स्थानांतरण', quoteNo:'उद्धरण संख्या', date:'दिनांक', workerData:'कर्मचारी डेटा', workerName:'कर्मचारी का नाम', iqamaNo:'इकामा संख्या', mobile:'मोबाइल', currentIqamaExpiry:'वर्तमान इकामा समाप्ति', expectedIqamaExpiry:'अपेक्षित इकामा समाप्ति', expectedDuration:'अपेक्षित अवधि', months:'माह', days:'दिन', and:'और', costSummary:'लागत सारांश', item:'मद', amount:'राशि', sar:'SAR', transferFee:'प्रायोजन स्थानांतरण शुल्क', iqamaRenewal:'इकामा नवीनीकरण', workPermit:'कार्य परमिट', changeProf:'पेशा परिवर्तन', medical:'चिकित्सा बीमा', office:'कार्यालय शुल्क', extras:'अतिरिक्त शुल्क', subtotal:'उप-योग', absher:'अबशेर बैलेंस (छूट)', grandTotal:'कुल योग', warnings:'सूचनाएं और चेतावनियां', warnExpired:'इकामा {d} दिन पहले समाप्त हो गया — विलंब जुर्माना लागू। समाप्ति से पहले नवीनीकरण जुर्माना हटाता है।', warnExpiringSoon:'इकामा {d} दिन में समाप्त होगा — विलंब जुर्माना से बचने हेतु समाप्ति से पहले नवीनीकरण करें।', warnValid:'इकामा वैध है — कोई जुर्माना नहीं।', signature:'हस्ताक्षर', stamp:'मुहर', footer:'यह एक अनुमानित उद्धरण है, जारी होने की तिथि से 7 दिनों तक वैध।', print:'प्रिंट' },
  ur: { title:'اقتباس — کفالت کی منتقلی', quoteNo:'اقتباس نمبر', date:'تاریخ', workerData:'ملازم کا ڈیٹا', workerName:'ملازم کا نام', iqamaNo:'اقامہ نمبر', mobile:'موبائل', currentIqamaExpiry:'موجودہ اقامہ میعاد', expectedIqamaExpiry:'متوقع اقامہ میعاد', expectedDuration:'متوقع مدت', months:'ماہ', days:'دن', and:'اور', costSummary:'اخراجات کا خلاصہ', item:'مد', amount:'رقم', sar:'ریال', transferFee:'کفالت کی منتقلی کی فیس', iqamaRenewal:'اقامہ تجدید', workPermit:'ورک پرمٹ', changeProf:'پیشہ کی تبدیلی', medical:'طبی انشورنس', office:'دفتری فیس', extras:'اضافی فیس', subtotal:'ذیلی کل', absher:'ابشر بیلنس (رعایت)', grandTotal:'کل رقم', warnings:'تنبیہات اور نوٹس', warnExpired:'اقامہ {d} دن پہلے ختم ہو چکا — تاخیر کا جرمانہ شامل ہے۔ ختم ہونے سے پہلے تجدید جرمانہ ختم کر دیتی ہے۔', warnExpiringSoon:'اقامہ {d} دن میں ختم ہو جائے گا — جرمانے سے بچنے کے لیے ختم ہونے سے پہلے تجدید کریں۔', warnValid:'اقامہ درست ہے — کوئی جرمانہ نہیں۔', signature:'دستخط', stamp:'مہر', footer:'یہ ایک تخمینی اقتباس ہے، اجراء کی تاریخ سے 7 دن کے لیے درست۔', print:'پرنٹ' },
}

// ═══ Main Component ═══
export default function KafalaCalculator({ sb, user, toast, lang, onClose, onGoToTransferCalc }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e

  // Screen: 'form' (home screen removed — go directly to new worker form)
  const [screen, setScreen] = useState('form')
  const [tab, setTab] = useState(0)
  const [workerMode, setWorkerMode] = useState('new')
  const [searchIqama, setSearchIqama] = useState('')
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState([false, false, false, false])
  const [calendarType, setCalendarType] = useState('gregorian') // 'gregorian' | 'hijri'
  const [nationalities, setNationalities] = useState(NATIONALITIES)
  const [occupations, setOccupations] = useState([])
  const [residentStatuses, setResidentStatuses] = useState([])
  useEffect(() => {
    const sbx = getSupabase()
    if (!sbx) return
    ;(async () => {
      const { data: arch } = await sbx.from('lookup_items').select('id,lookup_categories!inner(category_key)').eq('code', 'archived').eq('lookup_categories.category_key', 'occupation_category').maybeSingle()
      let q = sbx.from('occupations').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').limit(5000)
      if (arch?.id) q = q.neq('category_id', arch.id)
      const { data } = await q
      if (data) setOccupations(data)
    })()
    ;(async () => {
      const { data } = await sbx.from('lookup_items').select('id,code,value_ar,value_en,sort_order,lookup_categories!inner(category_key)').eq('lookup_categories.category_key', 'resident_status').eq('is_active', true).order('sort_order', { nullsFirst: false })
      if (data) setResidentStatuses(data)
    })()
  }, [])

  // ═══ CHI Insurance Check state ═══
  const [insCheck, setInsCheck] = useState({
    phase: 'idle',        // idle | loading | captcha | verifying | result | error
    sessionToken: null,
    captchaImage: null,
    captchaInput: '',
    result: null,
    error: null,
    attempts: 0,
  })
  const INS_MAX_ATTEMPTS = 3

  // ═══ HRSD (Ministry of Labor) Worker Inquiry state ═══
  const [hrsdCheck, setHrsdCheck] = useState({
    phase: 'idle',        // idle | loading | captcha | verifying | result | error
    sessionToken: null,
    captchaImage: null,
    captchaInput: '',
    result: null,
    error: null,
    attempts: 0,
  })
  const HRSD_MAX_ATTEMPTS = 3

  // ═══ Muqeem session (stored in localStorage) ═══
  const [muqeemSession, setMuqeemSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr.muqeem.session') || 'null') } catch { return null }
  })
  const [muqeemPaste, setMuqeemPaste] = useState({ open: false, curl: '', saving: false, error: null })
  // Muqeem-fetched worker data — when present, the form renders these fields as fixed read-only text
  const [muqeemData, setMuqeemData] = useState(null)
  // Tiny inline indicator next to the iqama input so the employee sees something is happening.
  const [muqeemFetchStatus, setMuqeemFetchStatus] = useState('idle') // idle | loading | ok | error | unavailable
  // Success modal shown after "إصدار" — carries the saved quote info + copy/navigate actions.
  const [issuedQuote, setIssuedQuote] = useState(null) // { quoteNo, workerName, iqNo, total }

  useEffect(() => {
    if (muqeemSession) localStorage.setItem('jisr.muqeem.session', JSON.stringify(muqeemSession))
    else localStorage.removeItem('jisr.muqeem.session')
  }, [muqeemSession])

  // Pull the latest session that the browser extension synced into Supabase.
  // Runs on mount and every 30s so a freshly captured JWT is picked up automatically.
  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    let cancelled = false
    async function pull() {
      const { data } = await sb.rpc('get_muqeem_session')
      const row = Array.isArray(data) ? data[0] : data
      if (cancelled || !row || !row.auth_bearer) return
      const remote = {
        cookies: row.cookies || '',
        authBearer: row.auth_bearer,
        xsrfToken: row.xsrf_token || null,
        xDomain: row.x_domain || null,
        jwtExp: row.jwt_exp || null,
        moiNumber: row.moi_number || null,
      }
      const now = Math.floor(Date.now() / 1000)
      if (!remote.jwtExp || remote.jwtExp <= now) return
      setMuqeemSession(prev => {
        if (prev && prev.authBearer === remote.authBearer) return prev
        if (prev && prev.jwtExp && prev.jwtExp >= remote.jwtExp) return prev
        return remote
      })
    }
    pull()
    const id = setInterval(pull, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const muqeemSessionValid = muqeemSession && muqeemSession.jwtExp && muqeemSession.jwtExp > Math.floor(Date.now() / 1000)
  const WORKER_STATUSES = ['صالح','هروب','خروج نهائي','منقطع عن العمل']

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    sb.from('countries').select('nationality_ar').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('nationality_ar').then(({ data }) => {
      if (!data || data.length === 0) return
      const seen = new Set()
      const list = data.filter(d => d.nationality_ar && !seen.has(d.nationality_ar) && seen.add(d.nationality_ar)).map(d => d.nationality_ar)
      if (list.length) setNationalities(list)
    })
  }, [])

  // Form state — pricing defaults pulled from admin config (إدارة الخدمات > نقل كفالة)
  const makeInitialForm = () => {
    const cfg = getKafalaPricingConfig()
    const midBracket = (cfg.medicalBrackets || [])[Math.floor((cfg.medicalBrackets || []).length / 2)] || { rate: 800 }
    return {
      name: '', iqama: '', phone: '', iqamaExpiry: '', dob: '', nationality: 'بنغلاديشي', gender: 'ذكر', occupation: '', legalStatus: 'صالح',
      workerType: 'facility', currentEmployer: '', currentEmployerId: '', newOccupation: '', newOccupationId: null, occupationId: null, wpExpiry: '',
      hasNoticePeriod: false, employerConsent: false, changeProfession: false, renewIqama: true, transferOnly: false,
      transferCount: '0', renewalMonths: '12', iqamaFineCount: '1',
      transferFeeInput: String(cfg.transferFee1),
      iqamaRenewalFee: String(Math.round(cfg.iqamaPerMonth * 12)),
      workPermitRate: String(cfg.workPermit12M || 100),
      medicalFee: String(midBracket.rate),
      officeFee: String(cfg.officeFee),
      profChangeInput: String(cfg.profChange),
      extras: [],
      insuranceWaived: false, insuranceExpiry: '', medicalInsurance: false
    }
  }
  const [f, setF] = useState(makeInitialForm)

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // ═══ Config & dynamic options ═══
  const cfg = useMemo(() => getKafalaPricingConfig(), [])
  const transferOptions = useMemo(() => [cfg.transferFee1, cfg.transferFee2, cfg.transferFee3].map(v => String(Math.round(v))), [cfg])

  // ═══ Derived values ═══
  const iqamaExpired = useMemo(() => {
    if (!f.iqamaExpiry) return false
    return new Date(f.iqamaExpiry) < new Date()
  }, [f.iqamaExpiry])

  const expiredDays = useMemo(() => daysSinceExpiry(f.iqamaExpiry), [f.iqamaExpiry])
  const hijriExpiry = useMemo(() => gregorianToHijri(f.iqamaExpiry), [f.iqamaExpiry])

  // Age from DOB
  const age = useMemo(() => {
    if (!f.dob) return null
    const b = new Date(f.dob)
    if (isNaN(b)) return null
    return Math.floor((Date.now() - b.getTime()) / (365.25 * 86400000))
  }, [f.dob])

  // Matched medical bracket for current age
  const medicalBracket = useMemo(() => {
    if (age === null) return null
    return (cfg.medicalBrackets || []).find(b => age >= b.min && age < b.max) || null
  }, [age, cfg])

  // Months past iqama expiry (0 if future)
  const monthsPastExpiry = useMemo(() => {
    if (!f.iqamaExpiry) return 0
    const exp = new Date(f.iqamaExpiry)
    const now = new Date()
    if (isNaN(exp) || exp >= now) return 0
    return Math.max(0, Math.ceil((now - exp) / (30 * 86400000)))
  }, [f.iqamaExpiry])

  // Expected iqama duration in CALENDAR DAYS — mirrors the tab-3 display ("المدة المتوقعة في الإقامة")
  // and drives the hidden office discount floor. Picks procDays from المدة المتوقعة cases.
  const expectedIqamaDays = useMemo(() => {
    if (!f.iqamaExpiry) return 0
    const exp = new Date(f.iqamaExpiry); if (isNaN(exp)) return 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    exp.setHours(0, 0, 0, 0)
    const threshold = parseInt(cfg.thresholdCase2) || 30
    const daysSinceExpiry = Math.floor((today - exp) / 86400000)
    // procDays = which "expected duration" case applies
    const procDays = !f.renewIqama
      ? (parseInt(cfg.procDaysCase1) || 7)
      : daysSinceExpiry >= threshold ? (parseInt(cfg.procDaysCase2) || 7) : (parseInt(cfg.procDaysCase3) || 7)
    const renewalMos = f.renewIqama ? (parseInt(f.renewalMonths) || 0) : 0
    // expected expiry — ignores old expiry when renewing a long-expired iqama (case 2)
    let expectedExpiry
    if (!f.renewIqama) expectedExpiry = exp
    else if (daysSinceExpiry >= threshold) {
      expectedExpiry = new Date(today); expectedExpiry.setDate(expectedExpiry.getDate() + (parseInt(cfg.procDaysCase2) || 7))
      expectedExpiry.setMonth(expectedExpiry.getMonth() + renewalMos)
    } else {
      expectedExpiry = new Date(exp); expectedExpiry.setMonth(expectedExpiry.getMonth() + renewalMos)
    }
    const base = new Date(today); base.setDate(base.getDate() + procDays)
    return Math.max(0, Math.round((expectedExpiry - base) / 86400000))
  }, [f.iqamaExpiry, f.renewIqama, f.renewalMonths, cfg])

  // ═══ Auto-sync effects ═══
  // Medical fee ← 0 if insurance is valid >2 months 5 days ahead, else age bracket from DOB
  useEffect(() => {
    if (f.insuranceWaived && !f.medicalInsurance) { setF(p => ({ ...p, medicalFee: '0' })); return }
    if (medicalBracket) setF(p => ({ ...p, medicalFee: String(medicalBracket.rate) }))
  }, [medicalBracket, f.insuranceWaived, f.medicalInsurance])

  // Iqama renewal fee:
  //   - Days left = iqamaExpiry - today
  //   - If iqama expired OR days_left < cfg.iqamaGraceDays → add fine
  //   - If expired: include past months × monthly rate
  //   - Otherwise: just selectedMonths × monthly rate
  //   - Toggle "renewalAdd500" upgrades fine from fine1 → fine2 (e.g. 500 → 1000)
  // Fine triggers from the start of the grace window:
  //   expiry=22 + grace=7 → fine starts on day 15 (when daysLeft = 7).
  //   So we use daysLeft <= grace, not strictly less than.
  const iqamaInGracePeriod = (() => {
    if (!f.iqamaExpiry) return false
    const exp = new Date(f.iqamaExpiry)
    if (isNaN(exp)) return false
    const today = new Date(); today.setHours(0, 0, 0, 0)
    exp.setHours(0, 0, 0, 0)
    const daysLeft = Math.round((exp - today) / 86400000)
    return daysLeft <= (parseFloat(cfg.iqamaGraceDays) || 7)
  })()
  // Billed months = total calendar span from iqama expiry → (today + renewalMonths).
  // Any residual day (even 1) rounds UP to the next full month. When iqama is still valid, bill just renewalMonths.
  useEffect(() => {
    const renewalMos = parseInt(f.renewalMonths) || 0
    let billedMonths = renewalMos
    const exp = f.iqamaExpiry ? new Date(f.iqamaExpiry) : null
    if (exp && !isNaN(exp)) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      exp.setHours(0, 0, 0, 0)
      if (exp < today) {
        const end = new Date(today); end.setMonth(end.getMonth() + renewalMos)
        let m = (end.getFullYear() - exp.getFullYear()) * 12 + (end.getMonth() - exp.getMonth())
        let d = end.getDate() - exp.getDate()
        if (d < 0) {
          m -= 1
          d += new Date(end.getFullYear(), end.getMonth(), 0).getDate()
        }
        billedMonths = d > 0 ? m + 1 : m
      }
    }
    const renewalBase = billedMonths * (parseFloat(cfg.iqamaPerMonth) || 0)
    const fine = iqamaInGracePeriod
      ? (f.renewalAdd500 ? (parseFloat(cfg.iqamaFine2) || 0) : (parseFloat(cfg.iqamaFine1) || 0))
      : 0
    setF(p => ({ ...p, iqamaRenewalFee: String(Math.round(renewalBase + fine)) }))
  }, [f.iqamaExpiry, f.renewalMonths, iqamaInGracePeriod, f.renewalAdd500, cfg])

  // Work permit fee — driven by selected renewal months (3/6/9/12).
  //   - Bracket pricing (workPermit3M/6M/9M/12M) for periods entirely before cutoff date.
  //   - Daily rate (workPermitDailyAfter) for any portion after cutoff date.
  //   - Start date rules:
  //       · Iqama still valid        → start = iqama expiry (no procDays)
  //       · Iqama expired < threshold → start = today + workPermitProcDays
  //       · Iqama expired ≥ threshold → start = today + workPermitExpiredProcDays
  useEffect(() => {
    const months = parseInt(f.renewalMonths) || 12
    const defaultProc = parseFloat(cfg.workPermitProcDays) || 7
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exp = f.iqamaExpiry ? new Date(f.iqamaExpiry) : null
    if (exp && !isNaN(exp)) exp.setHours(0, 0, 0, 0)
    const start = (() => {
      if (exp && !isNaN(exp) && exp > today) {
        return new Date(exp)
      }
      const daysSinceExpiry = exp && !isNaN(exp) ? Math.floor((today - exp) / 86400000) : 0
      const thr = parseFloat(cfg.workPermitExpiredThreshold) || 30
      const procDays = daysSinceExpiry >= thr
        ? (parseFloat(cfg.workPermitExpiredProcDays) || defaultProc)
        : defaultProc
      const s = new Date(today); s.setDate(s.getDate() + procDays)
      return s
    })()
    const end = new Date(start); end.setMonth(end.getMonth() + months)
    const cutoff = new Date(cfg.workPermitCutoffDate)
    const bracketKey = `workPermit${months}M`
    const bracketFee = parseFloat(cfg[bracketKey]) || 0
    const dailyRate = parseFloat(cfg.workPermitDailyAfter) || 0

    let total = 0
    if (isNaN(cutoff) || end <= cutoff) {
      total = bracketFee
    } else if (start >= cutoff) {
      total = Math.ceil((end - start) / 86400000) * dailyRate
    } else {
      total = bracketFee + Math.ceil((end - cutoff) / 86400000) * dailyRate
    }
    setF(p => ({ ...p, workPermitRate: String(Math.round(total)) }))
  }, [f.renewalMonths, f.iqamaExpiry, cfg])

  // Auto-set transfer fee from Muqeem sponsor changes:
  //   0 transfers  → cfg.transferFee1 (المرة الأولى)
  //   1 transfer   → cfg.transferFee2 (المرة الثانية)
  //   2+ transfers → cfg.transferFee3 (أكثر من مرتين)
  const muqeemSponsorChanges = (() => {
    // Look up the latest Muqeem result if available (state set after fetch)
    return typeof muqeemData?.sponsorChanges === 'number' ? muqeemData.sponsorChanges : null
  })()
  // Bump rule: when the worker's CURRENT occupation is in cfg.transferBumpOccupations (e.g. domestic workers),
  // treat transfer count as +1. The new occupation is not considered — the bump is based on the existing contract only.
  const transferBumpIds = Array.isArray(cfg.transferBumpOccupations) ? cfg.transferBumpOccupations : []
  const occupationBumps = transferBumpIds.length > 0 && transferBumpIds.includes(f.occupationId)

  useEffect(() => {
    if (muqeemSponsorChanges === null) return
    const effective = (muqeemSponsorChanges || 0) + (occupationBumps ? 1 : 0)
    const fee = effective === 0 ? cfg.transferFee1
              : effective === 1 ? cfg.transferFee2
              : cfg.transferFee3
    if (fee != null) setF(p => ({ ...p, transferFeeInput: String(Math.round(fee)) }))
  }, [muqeemSponsorChanges, occupationBumps, cfg])

  // Manual fallback (when Muqeem data is unavailable): use f.transferCount (0-based: number of previous transfers) to pick the tier.
  //   0 previous  → transferFee1 (2000)
  //   1 previous  → transferFee2 (4000)
  //   2+ previous → transferFee3 (6000, stays flat beyond that)
  // Same bump rule applies.
  useEffect(() => {
    if (muqeemSponsorChanges !== null) return
    if (muqeemFetchStatus !== 'unavailable' && muqeemFetchStatus !== 'error') return
    const n = parseInt(f.transferCount)
    if (isNaN(n)) return
    const effective = Math.max(0, n) + (occupationBumps ? 1 : 0)
    const fee = effective <= 0 ? cfg.transferFee1
              : effective === 1 ? cfg.transferFee2
              : cfg.transferFee3
    if (fee != null) setF(p => ({ ...p, transferFeeInput: String(Math.round(fee)) }))
  }, [f.transferCount, muqeemSponsorChanges, muqeemFetchStatus, occupationBumps, cfg])

  // ═══ Totals (use unified input values) ═══
  // transferOnly — bill only the sponsorship transfer fee; skip renewal, work permit, and medical charges.
  const transferFee = parseFloat(f.transferFeeInput) || 0
  const iqamaRenewalFee = f.transferOnly ? 0 : (parseFloat(f.iqamaRenewalFee) || 0)
  const workPermitFee = f.transferOnly ? 0 : (parseFloat(f.workPermitRate) || 0)
  // Profession change fee — waived if either the current or the new occupation is in the free-change list
  const profChangeFreeIds = Array.isArray(cfg.profChangeFreeOccupations) ? cfg.profChangeFreeOccupations : []
  const profChangeIsFree = profChangeFreeIds.length > 0 && (profChangeFreeIds.includes(f.occupationId) || profChangeFreeIds.includes(f.newOccupationId))
  const profChangeFee = (f.changeProfession && !profChangeIsFree) ? (parseFloat(f.profChangeInput) || 0) : 0
  const medicalFee = f.transferOnly ? 0 : (parseFloat(f.medicalFee) || 0)

  // Office fee — fixed at the admin "general price" at submission time.
  // Discounts (if any) are applied later in the approval workflow, never at submission.
  // The hidden minimum floor (for future approval validation) = officeDailyRate × expected iqama duration in days.
  const iqamaRemainderParts = (() => {
    if (!f.iqamaExpiry) return { months: 0, days: 0 }
    const exp = new Date(f.iqamaExpiry); if (isNaN(exp)) return { months: 0, days: 0 }
    const today = new Date(); today.setHours(0,0,0,0)
    if (exp <= today) return { months: 0, days: 0 }
    let months = (exp.getFullYear() - today.getFullYear()) * 12 + (exp.getMonth() - today.getMonth())
    let days = exp.getDate() - today.getDate()
    if (days < 0) {
      months -= 1
      days += new Date(exp.getFullYear(), exp.getMonth(), 0).getDate()
    }
    return { months: Math.max(0, months), days: Math.max(0, days) }
  })()
  // Office fee: flat general price up to the configured monthly cap; any excess days
  // are billed at the daily rate and added on top of the general price.
  const officeDailyRate = parseFloat(cfg.officeDailyRate) || 0
  const baseOfficeFee = parseFloat(cfg.officeFee) || 0
  const officeFlatMonths = parseFloat(cfg.officeFlatMonths) || 12
  const officeFlatDays = Math.round(officeFlatMonths * 30)
  const officeExcessDays = Math.max(0, expectedIqamaDays - officeFlatDays)
  const officeAutoFee = baseOfficeFee + officeExcessDays * officeDailyRate
  const officeFee = parseFloat(f.officeFee) || officeAutoFee
  // Hidden discount floor — daily rate × expected iqama duration (calendar days). Stored for the approval-side logic.
  const officeDiscountFloor = officeDailyRate * expectedIqamaDays

  // Absher discount applies ONLY to transfer + renewal fees (not other items).
  const absherAmount = f.absherBalance_on ? (parseFloat(f.absherBalance) || 0) : 0
  const transferRenewalAfterAbsher = Math.max(0, (transferFee + iqamaRenewalFee) - absherAmount)

  const extrasTotal = f.extras.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const grandTotal = transferRenewalAfterAbsher + workPermitFee + profChangeFee + medicalFee + officeFee + extrasTotal

  // Extras management
  const [extraName, setExtraName] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const addExtra = () => {
    if (!extraName || !extraAmount) return
    set('extras', [...f.extras, { name: extraName, amount: extraAmount }])
    setExtraName(''); setExtraAmount('')
  }
  const removeExtra = i => set('extras', f.extras.filter((_, idx) => idx !== i))

  // Validation — allow progression freely; users can compute partial estimates
  const validateTab0 = () => ({})
  const validateTab1 = () => ({})

  // ═══ CHI Insurance check helpers ═══
  const INS_FN_URL = '/.netlify/functions/check-chi-insurance'

  // ═══ Muqeem helpers ═══
  // No local caching by iqama — each transfer estimate is for a different worker, must always be fresh.
  const MUQEEM_FN_URL = '/.netlify/functions/query-muqeem'

  async function queryMuqeem(iqama) {
    if (!muqeemSession) return { ok: false, code: 'NO_SESSION' }
    try {
      const res = await fetch(MUQEEM_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', iqama, session: muqeemSession }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.updatedSession) setMuqeemSession(data.updatedSession)
      if (data.code === 'SESSION_EXPIRED' || data.code === 'SESSION_INVALID') {
        setMuqeemSession(null)
        return { ok: false, code: data.code, error: data.error }
      }
      if (!res.ok || !data.ok) return { ok: false, error: data.error || `HTTP ${res.status}` }
      return { ok: true, result: data.result }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  }

  function applyMuqeemToForm(m) {
    const STATUS_MAP = { 'صالح': 'صالح', 'هروب': 'هروب', 'خروج نهائي': 'خروج نهائي', 'منقطع عن العمل': 'منقطع عن العمل' }
    // Normalize Arabic text for fuzzy matching: collapse hamza/alef variants, taa marbuta, alef maqsura, kashida and whitespace.
    const arNorm = (s) => String(s || '').replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء').replace(/\u0640/g, '').replace(/[\u064B-\u065F\u0670]/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
    let localMatch = null
    let exactLocalMatch = false
    if (m.occupationAr && Array.isArray(occupations) && occupations.length) {
      const rn = arNorm(m.occupationAr)
      const exact = occupations.find(o => arNorm(o.name_ar) === rn)
      if (exact) { localMatch = exact; exactLocalMatch = true }
      else { localMatch = occupations.find(o => { const on = arNorm(o.name_ar); return on.includes(rn) || rn.includes(on) }) }
    }
    setF(p => ({
      ...p,
      iqamaExpiry: m.iqamaExpiryGregorian || p.iqamaExpiry,
      occupation: localMatch?.name_ar || m.occupationAr || p.occupation,
      occupationId: localMatch?.id || p.occupationId,
      legalStatus: STATUS_MAP[m.statusAr] || p.legalStatus,
      transferCount: m.sponsorChanges != null ? String(Math.max(0, m.sponsorChanges)) : p.transferCount,
    }))
    setMuqeemData(m)
    // Refine with Claude only when local match was inexact — exact match is already authoritative,
    // and re-running Claude can drift the value across opens.
    if (!exactLocalMatch && m.occupationAr && Array.isArray(occupations) && occupations.length) {
      const raw = m.occupationAr
      fetch('/.netlify/functions/match-occupation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ raw, occupations: occupations.map(o => ({ id: o.id, name_ar: o.name_ar, name_en: o.name_en })) }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const match = data && data.match
          if (match && match.name_ar) setF(p => ({ ...p, occupation: match.name_ar, occupationId: match.id }))
        })
        .catch(() => {})
    }
  }

  // Auto-fetch Muqeem data the moment a valid iqama is typed. Silent + debounced.
  useEffect(() => {
    const iq = (f.iqama || '').trim()
    if (!/^[12]\d{9}$/.test(iq)) {
      setMuqeemFetchStatus(prev => prev === 'idle' ? prev : 'idle')
      return
    }
    if (muqeemData && muqeemData.iqama === iq) {
      setMuqeemFetchStatus('ok')
      return
    }
    let cancelled = false
    setMuqeemFetchStatus('loading')
    const timer = setTimeout(async () => {
      const r = await queryMuqeem(iq)
      if (cancelled) return
      if (r.ok) {
        applyMuqeemToForm(r.result)
        setMuqeemFetchStatus('ok')
      } else if (r.code === 'NO_SESSION' || r.code === 'SESSION_EXPIRED' || r.code === 'SESSION_INVALID') {
        setMuqeemFetchStatus('unavailable')
      } else {
        setMuqeemFetchStatus('error')
      }
    }, 500)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.iqama, muqeemSession?.authBearer])

  async function saveMuqeemCurl(curl) {
    setMuqeemPaste(p => ({ ...p, saving: true, error: null }))
    try {
      const res = await fetch(MUQEEM_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'parse-session', curl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setMuqeemSession(data.session)
      setMuqeemPaste({ open: false, curl: '', saving: false, error: null })
      // Auto-query for the current iqama if we have one
      if (/^[12]\d{9}$/.test((f.iqama || '').trim())) {
        const r = await queryMuqeem(f.iqama)
        if (r.ok) {
          applyMuqeemToForm(r.result)
          setInsCheck(c => c.phase === 'result' ? { ...c, result: { ...c.result, muqeem: r.result } } : c)
        }
      }
    } catch (e) {
      setMuqeemPaste(p => ({ ...p, saving: false, error: e.message }))
    }
  }

  // Waive medical fee if insurance is valid for at least 2 months + 5 days ahead.
  function applyInsuranceToCalc(expiryStr) {
    const d = expiryStr ? new Date(expiryStr) : null
    if (!d || isNaN(d)) {
      setF(p => ({ ...p, insuranceWaived: false, insuranceExpiry: expiryStr || '' }))
      return { waived: false, daysLeft: null }
    }
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() + (parseInt(cfg.medicalGraceMonths) || 2))
    cutoff.setDate(cutoff.getDate() + (parseInt(cfg.medicalGraceDays) || 7))
    const waived = d >= cutoff
    const daysLeft = Math.floor((d - new Date()) / 86400000)
    setF(p => ({ ...p, insuranceWaived: waived, insuranceExpiry: expiryStr }))
    return { waived, daysLeft }
  }

  async function callInsFn(body, timeoutMs = 25000) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(INS_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 150)}`) }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return data
    } finally { clearTimeout(timer) }
  }

  async function startInsuranceCheck() {
    const iq = (f.iqama || '').trim()
    if (!/^[12]\d{9}$/.test(iq)) {
      setErrors(e => ({ ...e, iqama: 'رقم الإقامة غير صحيح' }))
      return
    }
    setInsCheck(c => ({ ...c, phase: 'loading', error: null, attempts: 0 }))
    try {
      const sb = getSupabase()
      if (sb) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data } = await sb.from('insurance_check_cache').select('*').eq('iqama_number', iq).gte('checked_at', since).maybeSingle()
        if (data) {
          let meta
          if (data.is_active) {
            meta = applyInsuranceToCalc(data.expiry_date)
          } else {
            // Not insured — force insurance toggle to "yes" by clearing waiver and expiry.
            setF(p => ({ ...p, insuranceWaived: false, insuranceExpiry: '' }))
            meta = { waived: false, daysLeft: null }
          }
          let muqeemData = null
          const mq = await queryMuqeem(iq)
          if (mq.ok) { muqeemData = mq.result; applyMuqeemToForm(mq.result) }
          setInsCheck(c => ({
            ...c,
            phase: 'result',
            result: {
              status: data.is_active ? 'insured' : 'not_insured',
              company: data.company_name,
              expiryDate: data.expiry_date,
              cached: true,
              waived: meta.waived,
              daysLeft: meta.daysLeft,
              muqeem: muqeemData,
              muqeemError: mq.ok ? null : (mq.code || mq.error),
            },
          }))
          return
        }
      }
      const r = await callInsFn({ action: 'init' })
      setInsCheck(c => ({
        ...c,
        phase: 'captcha',
        sessionToken: r.session,
        captchaImage: r.captchaImage,
        captchaInput: '',
      }))
    } catch (e) {
      setInsCheck(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? 'انتهت مهلة الاتصال بمنصّة CHI' : (e.message || 'خطأ في الاتصال') }))
    }
  }

  async function submitInsCaptcha() {
    if (!insCheck.captchaInput || insCheck.captchaInput.length < 3) return
    setInsCheck(c => ({ ...c, phase: 'verifying', error: null }))
    try {
      const r = await callInsFn({
        action: 'verify',
        iqama: f.iqama,
        captcha: insCheck.captchaInput,
        session: insCheck.sessionToken,
      })
      if (r.status === 'invalid_captcha' || r.status === 'unknown') {
        const nextAttempts = (insCheck.attempts || 0) + 1
        if (nextAttempts >= INS_MAX_ATTEMPTS) {
          // After 3 CHI failures: mark CHI as auto-skipped (not_insured) and chain to HRSD captcha
          setF(p => ({ ...p, insuranceWaived: false, insuranceExpiry: '' }))
          let muqeemData = null
          const mq = await queryMuqeem(f.iqama)
          if (mq.ok) { muqeemData = mq.result; applyMuqeemToForm(mq.result) }
          setInsCheck({ phase: 'await_hrsd', sessionToken: null, captchaImage: null, captchaInput: '', result: { status: 'not_insured', autoSkipped: true, waived: false, daysLeft: null, muqeem: muqeemData, muqeemError: mq.ok ? null : (mq.code || mq.error) }, error: null, attempts: 0 })
          startHrsdCheck()
          return
        }
        const fresh = await callInsFn({ action: 'init' })
        setInsCheck(c => ({
          ...c,
          phase: 'captcha',
          sessionToken: fresh.session,
          captchaImage: fresh.captchaImage,
          captchaInput: '',
          error: `رمز التحقق غير صحيح — المحاولة ${nextAttempts + 1} من ${INS_MAX_ATTEMPTS}`,
          attempts: nextAttempts,
        }))
        return
      }
      if (r.code === 'SESSION_EXPIRED') {
        const fresh = await callInsFn({ action: 'init' })
        setInsCheck(c => ({
          ...c,
          phase: 'captcha',
          sessionToken: fresh.session,
          captchaImage: fresh.captchaImage,
          captchaInput: '',
          error: 'انتهت الجلسة — تم تحديث الرمز',
        }))
        return
      }
      // Cache write moved to the Netlify function (which uses service role and is the only side
      // that has actually verified the captcha). The client write was silently failing under RLS.
      let meta
      if (r.status === 'insured') {
        meta = applyInsuranceToCalc(r.expiryDate)
      } else {
        setF(p => ({ ...p, insuranceWaived: false, insuranceExpiry: '' }))
        meta = { waived: false, daysLeft: null }
      }
      let muqeemData = null
      const mq = await queryMuqeem(f.iqama)
      if (mq.ok) { muqeemData = mq.result; applyMuqeemToForm(mq.result) }
      // Skip HRSD if it already ran successfully (e.g. user is retrying CHI with a fresh captcha
      // after HRSD had succeeded). Otherwise chain HRSD captcha right after CHI.
      const hrsdAlreadyDone = hrsdCheck.result && hrsdCheck.result.status === 'found'
      if (hrsdAlreadyDone) {
        setInsCheck(c => ({ ...c, phase: 'result', result: { ...r, waived: meta.waived, daysLeft: meta.daysLeft, muqeem: muqeemData, muqeemError: mq.ok ? null : (mq.code || mq.error) } }))
      } else {
        // Store CHI result silently and chain HRSD captcha immediately — the CHI modal stays hidden
        // until HRSD finishes, so the user goes straight from CHI captcha → HRSD captcha → combined result.
        setInsCheck(c => ({ ...c, phase: 'await_hrsd', result: { ...r, waived: meta.waived, daysLeft: meta.daysLeft, muqeem: muqeemData, muqeemError: mq.ok ? null : (mq.code || mq.error) } }))
        startHrsdCheck()
      }
    } catch (e) {
      setInsCheck(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? 'انتهت مهلة التحقق' : (e.message || 'خطأ في التحقق') }))
    }
  }

  function closeInsCheck() {
    setInsCheck({ phase: 'idle', sessionToken: null, captchaImage: null, captchaInput: '', result: null, error: null, attempts: 0 })
  }

  async function refreshInsCaptcha() {
    setInsCheck(c => ({ ...c, captchaImage: null, captchaInput: '', error: null }))
    try {
      const r = await callInsFn({ action: 'init' })
      setInsCheck(c => ({ ...c, phase: 'captcha', sessionToken: r.session, captchaImage: r.captchaImage, captchaInput: '' }))
    } catch (e) {
      setInsCheck(c => ({ ...c, error: e.message || 'تعذّر تحديث رمز التحقق' }))
    }
  }

  // ═══ HRSD (Ministry of Labor) helpers ═══
  const HRSD_FN_URL = '/.netlify/functions/check-hrsd-worker'

  async function callHrsdFn(body, timeoutMs = 25000) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(HRSD_FN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: ctrl.signal,
      })
      const text = await res.text()
      let data
      try { data = JSON.parse(text) } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 150)}`) }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return data
    } finally { clearTimeout(timer) }
  }

  async function startHrsdCheck() {
    if (!/^[12]\d{9}$/.test((f.iqama || '').trim())) return
    setHrsdCheck(c => ({ ...c, phase: 'loading', error: null, result: null, attempts: 0 }))
    try {
      const r = await callHrsdFn({ action: 'init' })
      setHrsdCheck(c => ({ ...c, phase: 'captcha', sessionToken: r.session, captchaImage: r.captchaImage, captchaInput: '' }))
    } catch (e) {
      setHrsdCheck(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? 'انتهت مهلة الاتصال بوزارة العمل' : (e.message || 'خطأ في الاتصال') }))
    }
  }

  async function submitHrsdCaptcha() {
    if (!hrsdCheck.captchaInput || hrsdCheck.captchaInput.length < 3) return
    setHrsdCheck(c => ({ ...c, phase: 'verifying', error: null }))
    try {
      const r = await callHrsdFn({ action: 'verify', iqama: f.iqama, captcha: hrsdCheck.captchaInput, session: hrsdCheck.sessionToken })
      if (r.status === 'invalid_captcha' || r.status === 'unknown') {
        const nextAttempts = (hrsdCheck.attempts || 0) + 1
        if (nextAttempts >= HRSD_MAX_ATTEMPTS) {
          setHrsdCheck({ phase: 'idle', sessionToken: null, captchaImage: null, captchaInput: '', result: { status: 'skipped', autoSkipped: true }, error: null, attempts: 0 })
          setInsCheck(c => c.phase === 'await_hrsd' ? { ...c, phase: 'result' } : c)
          return
        }
        const fresh = await callHrsdFn({ action: 'init' })
        setHrsdCheck(c => ({
          ...c,
          phase: 'captcha',
          sessionToken: fresh.session,
          captchaImage: fresh.captchaImage,
          captchaInput: '',
          error: `رمز التحقق غير صحيح — المحاولة ${nextAttempts + 1} من ${HRSD_MAX_ATTEMPTS}`,
          attempts: nextAttempts,
        }))
        return
      }
      if (r.code === 'SESSION_EXPIRED') {
        const fresh = await callHrsdFn({ action: 'init' })
        setHrsdCheck(c => ({ ...c, phase: 'captcha', sessionToken: fresh.session, captchaImage: fresh.captchaImage, captchaInput: '', error: 'انتهت الجلسة — تم تحديث الرمز' }))
        return
      }
      // Apply name to form if found
      if (r.status === 'found' && r.name) {
        setF(p => ({ ...p, name: r.name }))
      }
      setHrsdCheck(c => ({ ...c, phase: 'result', result: r }))
      // Reveal the combined CHI+HRSD result modal now that both checks are done.
      setInsCheck(c => c.phase === 'await_hrsd' ? { ...c, phase: 'result' } : c)
    } catch (e) {
      setHrsdCheck(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? 'انتهت مهلة التحقق' : (e.message || 'خطأ في التحقق') }))
    }
  }

  function closeHrsdCheck() {
    setHrsdCheck({ phase: 'idle', sessionToken: null, captchaImage: null, captchaInput: '', result: null, error: null, attempts: 0 })
    // If the CHI modal was waiting for HRSD, show its result now so the user still sees the outcome.
    setInsCheck(c => c.phase === 'await_hrsd' ? { ...c, phase: 'result' } : c)
  }

  async function refreshHrsdCaptcha() {
    setHrsdCheck(c => ({ ...c, captchaImage: null, captchaInput: '', error: null }))
    try {
      const r = await callHrsdFn({ action: 'init' })
      setHrsdCheck(c => ({ ...c, phase: 'captcha', sessionToken: r.session, captchaImage: r.captchaImage, captchaInput: '' }))
    } catch (e) {
      setHrsdCheck(c => ({ ...c, error: e.message || 'تعذّر تحديث رمز التحقق' }))
    }
  }


  // Issue the quote without printing — save to DB and show the success modal with copy + navigate actions.
  const [issuing, setIssuing] = useState(false)
  async function issueQuote() {
    if (issuing) return
    setIssuing(true)
    try {
      await issueQuoteImpl()
    } finally {
      setIssuing(false)
    }
  }
  async function issueQuoteImpl() {
    const sb = getSupabase()
    const workerName = hrsdCheck.result?.name || f.name || '—'
    const iqNo = f.iqama || '—'
    const mobile = f.phone ? '+966' + f.phone : '—'
    const renewalMos = parseInt(f.renewalMonths) || 0
    const officeMos = iqamaRemainderParts.months + renewalMos
    const officeDays = iqamaRemainderParts.days
    const expectedExpiry = (() => {
      if (!f.iqamaExpiry) return null
      const exp = new Date(f.iqamaExpiry); if (isNaN(exp)) return null
      const today = new Date(); today.setHours(0,0,0,0)
      // Case 1: no renewal → end = current expiry
      if (!f.renewIqama) return f.iqamaExpiry
      const threshold = parseInt(cfg.thresholdCase2) || 30
      const daysSinceExpiry = Math.floor((today - exp) / 86400000)
      // Case 2: expired ≥ threshold — use case-2 processing days from today
      // Case 3: still valid or recently expired — use current expiry
      const start = daysSinceExpiry >= threshold
        ? (() => { const d = new Date(today); d.setDate(d.getDate() + (parseInt(cfg.procDaysCase2) || 7)); return d })()
        : new Date(exp)
      start.setMonth(start.getMonth() + renewalMos)
      return start.toISOString().slice(0, 10)
    })()
    const rows = [
      [T('رسوم نقل الكفالة','Sponsorship Transfer Fee'), transferFee],
      !f.transferOnly && renewalMos > 0 ? [T('تجديد الإقامة','Iqama Renewal'), iqamaRenewalFee] : null,
      !f.transferOnly ? [T('رخصة العمل','Work Permit'), workPermitFee] : null,
      profChangeFee > 0 ? [T('تغيير المهنة','Change Profession'), profChangeFee] : null,
      !f.transferOnly ? [T('التأمين الطبي','Medical Insurance'), medicalFee] : null,
      [T('رسوم المكتب','Office Fees'), officeFee],
      ...f.extras.map(ex => [ex.name, Number(ex.amount)]),
    ].filter(Boolean)
    const subtotal = rows.reduce((s, [, v]) => s + (Number(v) || 0), 0)
    const absher = f.absherBalance_on ? (parseFloat(f.absherBalance) || 0) : 0
    const total = Math.max(0, subtotal - absher)
    const warnings = []
    if (iqamaExpired) warnings.push({ level: 'danger', text: T(`الإقامة منتهية منذ ${expiredDays} يوم — تم إضافة غرامة التأخير.`, `Iqama expired ${expiredDays} day(s) ago — late fine applied.`) })
    else if (f.iqamaExpiry) {
      const daysLeft = Math.ceil((new Date(f.iqamaExpiry) - new Date()) / 86400000)
      if (daysLeft <= 30 && daysLeft >= 0) warnings.push({ level: 'warn', text: T(`الإقامة ستنتهي خلال ${daysLeft} يوم — يُنصح بالتجديد قبل الانتهاء.`, `Iqama expires in ${daysLeft} day(s) — renew before expiry.`) })
    }
    if (insCheck.result?.status === 'not_insured') warnings.push({ level: 'warn', text: T('التأمين الصحي غير نشط — احتُسبت الرسوم حسب الفئة العمرية.','Health insurance not active — fee calculated by age bracket.') })
    if (f.changeProfession && !f.newOccupation) warnings.push({ level: 'warn', text: T('لم يتم تحديد المهنة الجديدة.','New occupation not specified.') })
    if (!sb) { toast && toast(T('قاعدة البيانات غير متاحة','Database unavailable')); return }
    const phoneRaw = (f.phone || '').replace(/^\+?966/, '').trim()
    const payload = {
      iqama_number: iqNo,
      worker_name: workerName,
      phone: phoneRaw,
      dob: f.dob || null,
      nationality: f.nationality || null,
      gender: f.gender || null,
      muqeem_fetched_at: muqeemData ? new Date().toISOString() : null,
      iqama_expiry_gregorian: muqeemData?.iqamaExpiryGregorian || f.iqamaExpiry || null,
      iqama_expiry_hijri: muqeemData?.iqamaExpiryHijri || null,
      iqama_expired: muqeemData?.iqamaExpired ?? null,
      occupation_id: f.occupationId || null,
      occupation_name_ar: f.occupation || muqeemData?.occupationAr || null,
      resident_status_code: null,
      resident_status_ar: muqeemData?.statusAr || f.legalStatus || null,
      sponsor_changes: typeof muqeemData?.sponsorChanges === 'number' ? muqeemData.sponsorChanges : null,
      hrsd_worker_status: hrsdCheck.result?.workerStatus || null,
      hrsd_verified_at: hrsdCheck.result?.status === 'found' ? new Date().toISOString() : null,
      insurance_status: insCheck.result?.status || null,
      insurance_expiry: insCheck.result?.expiryDate || null,
      insurance_company: insCheck.result?.company || null,
      insurance_waived: !!f.insuranceWaived,
      chi_verified_at: insCheck.result ? new Date().toISOString() : null,
      transfer_only: !!f.transferOnly,
      renew_iqama: !!f.renewIqama,
      renewal_months: renewalMos,
      change_profession: !!f.changeProfession,
      new_occupation_id: f.newOccupationId || null,
      new_occupation_name_ar: f.newOccupation || null,
      add_late_fine: !!f.renewalAdd500,
      transfer_fee: transferFee,
      iqama_renewal_fee: iqamaRenewalFee,
      work_permit_fee: workPermitFee,
      prof_change_fee: profChangeFee,
      medical_fee: medicalFee,
      office_fee: officeFee,
      late_fine_amount: f.renewalAdd500 ? (parseFloat(cfg.iqamaFine1) || 500) : 0,
      absher_discount: absher,
      manual_discount: 0,
      extras: f.extras || [],
      expected_expiry_date: expectedExpiry,
      duration_months: Math.max(0, officeMos - renewalMos),
      duration_days: officeDays,
      warnings,
    }
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { toast && toast(T('انتهت الجلسة — أعد تسجيل الدخول','Session expired — please sign in again')); return }
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL || sb.supabaseUrl}/functions/v1/issue-quotation`
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.ok) {
      const msg = data?.detail || data?.error || `HTTP ${res.status}`
      toast && toast('تعذّر حفظ التسعيرة: ' + String(msg).slice(0, 100))
      return
    }
    setIssuedQuote({ quoteNo: data.row.quote_no, workerName, iqNo, total: Number(data.row.total_amount), warnings })
  }

  function skipInsAndAdvance() {
    closeInsCheck()
    setErrors({}); setTab(1)
  }

  const tryNextTab = () => {
    if (tab === 0 && insCheck.phase === 'idle' && /^[12]\d{9}$/.test((f.iqama || '').trim())) {
      startInsuranceCheck()
      return
    }
    setErrors({}); setTab(tab + 1)
  }
  const tryGoTab = (i) => {
    if (i <= tab) { setTab(i); return }
    if (i > tab + 1) return
    tryNextTab()
  }
  const Err = ({ k }) => tried[tab] && errors[k] ? <div style={{ fontSize: 14, color: C.red, marginTop: 4 }}>{errors[k]}</div> : null

  const tabComplete = [
    !!f.iqama,
    !!f.iqamaExpiry,
    true,
    true
  ]

  // ═══════════════════════════════════════
  // SCREEN 1: HOME
  // ═══════════════════════════════════════
  const tabs = [
    { id: 'worker', title: T('بيانات العامل','Worker Data'), Icon: User },
    { id: 'details', title: T('تفاصيل العامل','Worker Details'), Icon: ArrowLeftRight },
    { id: 'pricing', title: T('التسعيرة','Pricing'), Icon: Calculator },
    { id: 'review', title: T('مراجعة','Review'), Icon: CheckCircle2 }
  ]

  const headerSubtitle = screen === 'home' ? T('حساب تكاليف نقل خدمات العمال والرسوم الحكومية','Calculate worker transfer costs and government fees') : (workerMode === 'existing' ? T('عامل مسجّل','Registered Worker') : T('عامل جديد','New Worker')) + (f.name ? ` — ${f.name}` : '')

  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }
  const modalBox = { background: '#141414', borderRadius: 16, width: 640, maxWidth: '95vw', height: 'auto', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'visible', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 60 }
  const headerBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', flexShrink: 0, fontFamily: F, direction: 'rtl' }

  // ═══════════════════════════════════════
  // SCREEN 2: FORM WITH TABS
  // ═══════════════════════════════════════
  return (
    <div onClick={() => onClose && onClose()} style={modalOverlay}><div onClick={e => e.stopPropagation()} style={{ ...modalBox, height: 720, overflow: 'hidden' }}>
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header — Premium Arabic admin */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', direction: lang === 'en' ? 'ltr' : 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <Tag size={22} strokeWidth={1.8} color={C.gold} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx)', fontFamily: F, lineHeight: 1.2 }}>{T('تسعيرة تنازل','Transfer Calculator')}</div>
          </div>
          <button onClick={() => onClose && onClose()} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F }} aria-label={T('إغلاق','Close')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--tx4)', fontFamily: F, marginTop: 8 }}>{T(`الخطوة ${tab + 1} من ${tabs.length}`,`Step ${tab + 1} of ${tabs.length}`)}</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
          {Array.from({ length: tabs.length }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i <= tab ? 'linear-gradient(90deg, #D4A017, #F0C040)' : 'rgba(255,255,255,0.06)', transition: '.35s' }} />
          ))}
        </div>
      </div>


      {/* ═══ Scrollable Content ═══ */}
      <style>{`.kc-scroll::-webkit-scrollbar{width:0;display:none}.kc-scroll{scrollbar-width:none;-ms-overflow-style:none}.kc-scroll input:focus,.kc-scroll select:focus,.kc-scroll textarea:focus,.kc-scroll .kc-phone-wrap:focus-within,.kc-captcha-input:focus{border-color:rgba(255,255,255,.16)!important;box-shadow:none!important}`}</style>
      <div className="kc-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '20px 24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ═══════════════════════════════════════ */}
      {/* TAB 0: بيانات العامل — matches ServiceRequest kafala step 3 page 1 */}
      {/* ═══════════════════════════════════════ */}
      {tab === 0 && (()=>{
        const WORKER_STATUS=[{v:'valid',l:T('صالح','Valid')},{v:'huroob',l:T('هروب','Absconded')},{v:'final_exit',l:T('خروج نهائي','Final Exit')},{v:'absent',l:T('منقطع عن العمل','Absent from Work')}]
        const years=Array.from({length:60},(_,i)=>String(new Date().getFullYear()-40+i))
        const months=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))
        const daysFor=(y,m)=>{const n=y&&m?new Date(parseInt(y),parseInt(m),0).getDate():31;return Array.from({length:n},(_,i)=>String(i+1).padStart(2,'0'))}
        const HijriDate=({value,onChange,label,req})=>{
          const parts=value?value.split('-'):[]
          const [y,m,d]=[parts[0]||'',parts[1]||'',parts[2]||'']
          const setPart=(which,val)=>{const p=[y,m,d];if(which==='y')p[0]=val;if(which==='m')p[1]=val;if(which==='d')p[2]=val;onChange(p[0]&&p[1]&&p[2]?`${p[0]}-${p[1]}-${p[2]}`:`${p[0]}-${p[1]}-${p[2]}`)}
          return <div>
            <Lbl req={req}>{label}</Lbl>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,direction:'ltr'}}>
              <Sel value={y} onChange={v=>setPart('y',v)} options={years} placeholder={T('السنة','Year')}/>
              <Sel value={m} onChange={v=>setPart('m',v)} options={months} placeholder={T('الشهر','Month')}/>
              <Sel value={d} onChange={v=>setPart('d',v)} options={daysFor(y,m)} placeholder={T('اليوم','Day')}/>
            </div>
          </div>
        }
        return <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '20px 22px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -10, [lang === 'en' ? 'left' : 'right']: 14, background: '#141414', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <User size={12} strokeWidth={2.2} />
            <span>{T('بيانات العامل','Worker Data')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 16 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <Lbl req>{T('رقم الإقامة','Iqama Number')}</Lbl>
                {muqeemFetchStatus !== 'idle' && (() => {
                  const isClickable = muqeemFetchStatus === 'unavailable' || muqeemFetchStatus === 'error'
                  const retry = async () => {
                    const iq = (f.iqama || '').trim()
                    if (!/^[12]\d{9}$/.test(iq)) return
                    setMuqeemFetchStatus('loading')
                    const r = await queryMuqeem(iq)
                    if (r.ok) { applyMuqeemToForm(r.result); setMuqeemFetchStatus('ok') }
                    else if (r.code === 'NO_SESSION' || r.code === 'SESSION_EXPIRED' || r.code === 'SESSION_INVALID') setMuqeemFetchStatus('unavailable')
                    else setMuqeemFetchStatus('error')
                  }
                  const onBadgeClick = () => {
                    if (muqeemFetchStatus === 'unavailable') retry()
                    else if (muqeemFetchStatus === 'error') window.open('https://muqeem.sa/#/login', '_blank', 'noopener,noreferrer')
                  }
                  return (
                  <span onClick={isClickable ? onBadgeClick : undefined} title={muqeemFetchStatus === 'unavailable' ? T('إعادة المحاولة','Retry') : muqeemFetchStatus === 'error' ? T('فتح موقع مقيم لجلب البيانات يدويا','Open Muqeem to fetch data manually') : undefined} style={{
                    fontSize: 10, fontWeight: 400, padding: '2px 8px', borderRadius: 6, marginBottom: 4,
                    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: isClickable ? 'pointer' : 'default', transition: '.15s',
                    ...(muqeemFetchStatus === 'loading' ? { background: 'rgba(244,123,32,.12)', color: '#F47B20' } :
                       muqeemFetchStatus === 'ok' ? { background: 'rgba(244,123,32,.12)', color: '#F47B20' } :
                       muqeemFetchStatus === 'unavailable' ? { background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.4)' } :
                       { background: 'rgba(192,57,43,.1)', color: C.red })
                  }}>
                    {muqeemFetchStatus === 'loading' && <><span style={{ width: 8, height: 8, border: '1.5px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'mq-spin .7s linear infinite' }} /> {T('جاري جلب البيانات…','Fetching data…')}</>}
                    {muqeemFetchStatus === 'ok' && <>{T('تمت المزامنة مع مقيم','Synced with Muqeem')}<span style={{ marginInlineStart: 6 }}>✓</span></>}
                    {muqeemFetchStatus === 'unavailable' && <>{T('خدمة مقيم غير متاحة — اضغط لإعادة المحاولة','Muqeem unavailable — click to retry')} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg></>}
                    {muqeemFetchStatus === 'error' && <>{T('جلب البيانات يدويا','Fetch data manually')} <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></>}
                  </span>
                  )
                })()}
                <style>{`@keyframes mq-spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              <Inp value={f.iqama} onChange={v => {
                const cleaned = v.replace(/\D/g,'').slice(0,10)
                // Changing the iqama invalidates all the auto-fetched data from previous iqama — clear it.
                if (cleaned !== f.iqama) {
                  setF(p => ({
                    ...p,
                    iqama: cleaned,
                    iqamaExpiry: '',
                    occupation: '',
                    occupationId: null,
                    legalStatus: 'صالح',
                    transferCount: '0',
                    name: '',
                    insuranceWaived: false,
                    insuranceExpiry: '',
                    medicalInsurance: false,
                  }))
                  setMuqeemData(null)
                  setMuqeemFetchStatus('idle')
                  setInsCheck({ phase: 'idle', sessionToken: null, captchaImage: null, captchaInput: '', result: null, error: null, attempts: 0 })
                  setHrsdCheck({ phase: 'idle', sessionToken: null, captchaImage: null, captchaInput: '', result: null, error: null, attempts: 0 })
                }
              }} placeholder="2XXXXXXXXX" dir="ltr" maxLength={10}/>
            </div>
            <div>
              <DateField value={f.dob} onChange={v=>set('dob',v)} label={T('تاريخ الميلاد','Date of Birth')} req lang={lang}/>
            </div>
            {(() => {
              const ph = (f.phone || '').trim()
              let phErr = null
              if (ph.length === 9) {
                if (!/^5[013-9]\d{7}$/.test(ph)) phErr = T('بادئة جوال غير صحيحة (يجب أن يبدأ بـ 50, 51, 53–59)','Invalid mobile prefix (must start with 50, 51, 53–59)')
                else if (/^(.)\1{8}$/.test(ph)) phErr = T('رقم غير صحيح','Invalid number')
                else if ('012345678'.includes(ph) || '987654321'.includes(ph) || '0123456789'.includes(ph) || '9876543210'.includes(ph)) phErr = T('رقم غير صحيح','Invalid number')
              } else if (ph.length > 0 && ph.length < 9) {
                phErr = T(`أدخل ${9 - ph.length} ${9 - ph.length === 1 ? 'رقم' : 'أرقام'} إضافية`,`Enter ${9 - ph.length} more ${9 - ph.length === 1 ? 'digit' : 'digits'}`)
              }
              const isErr = !!phErr && ph.length === 9
              return (
            <div>
              <Lbl req>{T('رقم الجوال','Mobile Number')}</Lbl>
              <div className="kc-phone-wrap" style={{ display: 'flex', direction: 'ltr', border: `1px solid ${isErr ? 'rgba(192,57,43,.5)' : 'rgba(255,255,255,.08)'}`, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(180deg,#2e2e2e,#262626)', height: 40, transition: 'border-color .2s' }}>
                <div style={{ height: '100%', padding: '0 10px', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 500, color: C.gold, flexShrink: 0 }}>+966</div>
                <input value={f.phone || ''} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="5X XXX XXXX" maxLength={9}
                  style={{ width: '100%', height: '100%', padding: '0 12px', borderWidth: 0, borderStyle: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
              </div>
              <style>{`.kc-phone-wrap:focus-within{border-color:${isErr ? 'rgba(192,57,43,.6)' : 'rgba(255,255,255,.18)'}!important}.kc-phone-wrap input{border-width:0!important}`}</style>
            </div>
              )
            })()}
            {/* Muqeem OK → show fetched values as read-only. Failed/unavailable → manual inputs.
                Transfer count is not asked here — it's inferred from the transfer fee selection in the pricing tab. */}
            {muqeemFetchStatus === 'ok' && <>
              <div>
                <Lbl>{T('حالة المقيم','Resident Status')}</Lbl>
                <div style={{ ...sFRO, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muqeemData?.statusAr ? 'var(--tx)' : 'var(--tx5)' }}>{muqeemData?.statusAr || '—'}</div>
              </div>
              <div>
                <Lbl>{T('المهنة','Occupation')}</Lbl>
                <div style={{ ...sFRO, display: 'flex', alignItems: 'center', justifyContent: 'center', color: (f.occupation || muqeemData?.occupationAr) ? 'var(--tx)' : 'var(--tx5)' }}>{f.occupation || muqeemData?.occupationAr || '—'}</div>
              </div>
              <div>
                <Lbl>{T('تاريخ انتهاء الإقامة (ميلادي)','Iqama Expiry (Gregorian)')}</Lbl>
                {(() => {
                  const g = muqeemData?.iqamaExpiryGregorian
                  const m = g && /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(g.trim())
                  const txt = m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : (g || '—')
                  const exp = muqeemData?.iqamaExpired
                  const dateColor = exp === true ? '#e06157' : exp === false ? '#34c759' : g ? 'var(--tx)' : 'var(--tx5)'
                  return <div style={{ ...sFRO, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'ltr', color: dateColor, fontWeight: exp === true || exp === false ? 700 : 600 }}>{txt}</div>
                })()}
              </div>
              <div>
                <Lbl>{T('عدد مرات نقل الخدمات','Service Transfer Count')}</Lbl>
                <div style={{ ...sFRO, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'ltr', color: typeof muqeemData?.sponsorChanges === 'number' ? 'var(--tx)' : 'var(--tx5)' }}>{typeof muqeemData?.sponsorChanges === 'number' ? String(muqeemData.sponsorChanges) : '—'}</div>
              </div>
            </>}
            {(muqeemFetchStatus === 'unavailable' || muqeemFetchStatus === 'error') && <>
              <div>
                <Lbl req>{T('حالة المقيم','Resident Status')}</Lbl>
                <Sel value={f.legalStatus} onChange={v=>set('legalStatus',v)} options={residentStatuses.length ? residentStatuses.map(s=>lang==='en'?s.value_en||s.value_ar:s.value_ar) : WORKER_STATUSES} placeholder={T('اختر…','Select…')}/>
              </div>
              <div>
                <Lbl req>{T('المهنة','Occupation')}</Lbl>
                <OccSelect value={f.occupation || ''} onChange={(v,item)=>setF(p=>({...p,occupation:v,occupationId:item?.id||null}))} items={occupations} lang={lang} placeholder={T('اختر المهنة…','Select occupation…')}/>
              </div>
              <div>
                <DateField value={f.iqamaExpiry} onChange={v=>set('iqamaExpiry',v)} label={T('تاريخ انتهاء الإقامة (ميلادي)','Iqama Expiry (Gregorian)')} req lang={lang}/>
              </div>
              <div>
                <Lbl req>{T('عدد مرات نقل الخدمات السابقة','Previous Service Transfers')}</Lbl>
                <input value={f.transferCount || ''} onChange={e=>set('transferCount', e.target.value.replace(/\D/g,'').slice(0,2))} inputMode="numeric" maxLength={2} placeholder={T('0','0')} style={{ ...sF, textAlign: 'center', direction: 'ltr' }} />
              </div>
            </>}
          </div>
        </div>
      })()}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 1: تفاصيل العامل */}
      {/* ═══════════════════════════════════════ */}
      {tab === 1 && (()=>{
        // Match review-tab visual: subtle blue panel, key-value rows, no colored boxes per field.
        const Row = ({ label, value, color }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 14, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
            <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontWeight: 500, color: color || 'rgba(255,255,255,.92)', direction: 'ltr' }}>{value || '—'}</span>
          </div>
        )
        const Group = ({ title, Icon, children }) => (
          <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '20px 22px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -10, right: 14, background: '#141414', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {Icon && <Icon size={12} strokeWidth={2.2} />}
              <span>{title}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 0 }}>{children}</div>
          </div>
        )

        // ── Computed values ─────────────────────────────────
        const ageYears = f.dob ? Math.floor((Date.now() - new Date(f.dob).getTime()) / (365.25 * 86400000)) : null
        const bracket = ageYears !== null ? (cfg.medicalBrackets || []).find(b => ageYears >= b.min && ageYears < b.max) : null
        const insuredOk = insCheck.result?.status === 'insured'
        const insExpiry = insCheck.result?.expiryDate
        const insWaived = !!f.insuranceWaived
        const iqamaExpiredFlag = muqeemData?.iqamaExpired ?? (f.iqamaExpiry ? new Date(f.iqamaExpiry) < new Date() : null)
        const PURPLE = '#9b59b6'
        const purpleBg = 'rgba(155,89,182,.06)'
        const purpleBorder = 'rgba(155,89,182,.32)'
        const greenBg = 'rgba(39,160,70,.06)'; const greenBorder = 'rgba(39,160,70,.3)'; const GREEN = '#27a046'
        const redBg = 'rgba(192,57,43,.06)'; const redBorder = 'rgba(192,57,43,.3)'

        return (<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Group title={T('هوية العامل','Worker Identity')} Icon={User}>
            <Row label={T('الإسم','Name')} value={hrsdCheck.result?.name || f.name} />
            <Row label={T('رقم الإقامة','Iqama Number')} value={f.iqama} />
            <Row label={T('حالة العامل','Worker Status')} value={hrsdCheck.result?.workerStatus} />
            <Row label={T('حالة المقيم','Resident Status')} value={muqeemData?.statusAr} />
            <Row label={T('المهنة','Occupation')} value={f.occupation || muqeemData?.occupationAr} />
            <Row label={T('عدد مرات نقل الخدمات','Service Transfer Count')} value={typeof muqeemData?.sponsorChanges === 'number' ? String(muqeemData.sponsorChanges) : null} />
          </Group>

          {(() => {
            const hijriRaw = muqeemData?.iqamaExpiryHijri
            const hijriFormatted = hijriRaw
              ? (lang === 'en' ? hijriRaw + ' H' : hijriRaw)
              : null
            const dateColor = iqamaExpiredFlag === true ? C.red : iqamaExpiredFlag === false ? GREEN : null
            return (
              <Group title={T('الإقامة','Iqama')} Icon={Building2}>
                <Row label={T('انتهاء الإقامة (ميلادي)','Iqama Expiry (Gregorian)')} value={muqeemData?.iqamaExpiryGregorian || f.iqamaExpiry} color={dateColor} />
                <Row label={T('انتهاء الإقامة (هجري)','Iqama Expiry (Hijri)')} value={hijriFormatted} color={dateColor} />
              </Group>
            )
          })()}

          {(() => {
            let ageStr = null
            if (f.dob) {
              const dob = new Date(f.dob)
              const today = new Date()
              let years = today.getFullYear() - dob.getFullYear()
              let months = today.getMonth() - dob.getMonth()
              if (today.getDate() < dob.getDate()) months -= 1
              if (months < 0) { years -= 1; months += 12 }
              ageStr = lang === 'en'
                ? `${years} years ${months} months`
                : (<span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, direction: 'rtl' }}><span>{years}</span><span>سنة</span><span>{months}</span><span>شهر</span></span>)
            }
            return (
              <Group title={T('التأمين الصحي','Health Insurance')} Icon={Shield}>
                <Row label={T('حالة التأمين','Insurance Status')} value={insuredOk ? T('نشط','Active') : T('غير نشط','Inactive')} color={insuredOk ? GREEN : C.red} />
                {insuredOk && <Row label={T('انتهاء التأمين','Insurance Expiry')} value={insExpiry} color={GREEN} />}
                <Row label={T('العمر','Age')} value={ageStr} />
              </Group>
            )
          })()}
        </div>)
      })()}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 2: التسعيرة — matches ServiceRequest kafala pricing fieldset */}
      {/* ═══════════════════════════════════════ */}
      {tab === 2 && (()=>{
        const togChip = (label, stateKey, clr) => {
          const on = !!f[stateKey + '_on']
          const c = clr || C.gold
          return <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <label style={{ fontSize: 14, fontWeight: 500, color: on ? c : 'var(--tx4)', fontFamily: F, transition: '.2s' }}>{label}</label>
              <button type="button" onClick={() => set(stateKey + '_on', !on)} style={{ width: 28, height: 16, borderRadius: 999, border: 'none', background: on ? c : 'rgba(255,255,255,.15)', cursor: 'pointer', position: 'relative', transition: '.2s', padding: 0, flexShrink: 0 }}>
                <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#fff', top: 2, right: on ? 2 : 14, transition: '.2s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: on ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.02)', border: `1px solid ${on ? c + '4d' : 'rgba(255,255,255,.05)'}`, borderRadius: 8, boxShadow: on ? 'inset 0 1px 2px rgba(0,0,0,.2)' : 'none', height: 36, opacity: on ? 1 : .5, transition: '.2s' }}>
              <input type="text" inputMode="decimal" disabled={!on} value={f[stateKey] || ''} onChange={e => set(stateKey, e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ flex: 1, minWidth: 0, height: '100%', padding: '0 10px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 500, color: on ? 'var(--tx)' : 'var(--tx5)', outline: 'none', direction: 'ltr', textAlign: 'center' }} />
              <span style={{ fontSize: 14, color: 'var(--tx5)', fontWeight: 500, padding: '0 8px 0 4px', fontFamily: F, flexShrink: 0 }}>{T('ريال','SAR')}</span>
            </div>
          </div>
        }
        const subtotal = grandTotal
        const discount = f.discount_on ? (parseFloat(f.discount) || 0) : 0
        const absher = f.absherBalance_on ? (parseFloat(f.absherBalance) || 0) : 0
        const total = Math.max(0, subtotal - discount - absher)
        // Card-based: each option is a tile with icon + label + control. Cleaner visual hierarchy.
        const Card = KCard
        return <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 10px' }}>
            {/* فترة التجديد — «نقل فقط» يختفي إذا المتبقي في الإقامة أقل من الحد الأدنى أو منتهية */}
            {(() => {
              const transferOnlyAllowed = (() => {
                if (!f.iqamaExpiry) return true
                const exp = new Date(f.iqamaExpiry); if (isNaN(exp)) return true
                const today = new Date(); today.setHours(0, 0, 0, 0)
                exp.setHours(0, 0, 0, 0)
                const daysLeft = Math.floor((exp - today) / 86400000)
                const minDays = parseInt(cfg.transferOnlyMinDays) || 30
                return daysLeft >= minDays
              })()
              // Auto-switch away from transferOnly if it became disallowed
              if (!transferOnlyAllowed && f.transferOnly) {
                setTimeout(() => setF(p => ({ ...p, transferOnly: false, renewIqama: true })), 0)
              }
              return (
                <Card Icon={Calendar} label={T('تجديد الإقامة','Iqama Renewal')} span={2}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {transferOnlyAllowed && (
                      <RenewalPill flex={1.3} selected={f.transferOnly} onClick={() => { set('transferOnly', true); set('renewIqama', false) }}>
                        <span>{T('نقل فقط','Transfer only')}</span>
                      </RenewalPill>
                    )}
                    {['3', '6', '9', '12'].map(m => {
                      const sel = !f.transferOnly && f.renewalMonths === m
                      return (
                        <RenewalPill key={m} selected={sel} onClick={() => { set('renewalMonths', m); set('renewIqama', true); set('transferOnly', false) }}>
                          <span style={{ fontSize: 14 }}>{m}</span>
                          <span style={{ fontSize: 14, fontWeight: 500, opacity: .75 }}>{T('شهر','mo')}</span>
                        </RenewalPill>
                      )
                    })}
                  </div>
                </Card>
              )
            })()}

            {/* تأمين طبي — دائمًا ظاهر؛ مقفل على "نعم" إذا التأمين غير نشط (لازم شراء تأمين) */}
            {(() => {
              const insOk = insCheck.result?.status === 'insured'
              const canEdit = insOk && f.insuranceWaived
              return (
                <Card Icon={Shield} label={T('تأمين طبي','Medical Insurance')}>
                  <YesNo
                    value={canEdit ? f.medicalInsurance : true}
                    onChange={v => { if (canEdit) set('medicalInsurance', v) }}
                    disabled={!canEdit}
                    lang={lang}
                  />
                </Card>
              )
            })()}

            {/* تغيير المهنة */}
            <Card Icon={ArrowLeftRight} label={T('تغيير المهنة','Change Profession')}>
              <YesNo value={f.changeProfession} onChange={v => set('changeProfession', v)} lang={lang} />
            </Card>

            {/* المهنة الجديدة — بطاقة مستقلة تظهر عند اختيار نعم */}
            {f.changeProfession && (
              <Card Icon={Briefcase} label={T('المهنة الجديدة','New Occupation')} span={2}>
                <OccSelect value={f.newOccupation || ''} onChange={(v,item) => setF(p => ({...p,newOccupation:v,newOccupationId:item?.id||null}))} items={occupations} lang={lang} placeholder={T('اختر المهنة…','Select occupation…')} />
              </Card>
            )}

            {/* رسوم إضافية */}
            <Card Icon={Plus} label={T('رسوم إضافية','Additional Fees')} hint={f.extras.length ? (lang === 'en' ? `${f.extras.length} items added` : `${f.extras.length} بنود مضافة`) : T('اختياري','Optional')} span={2}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={extraName} onChange={e => setExtraName(e.target.value)} placeholder={T('اسم الرسوم (مثال: إلغاء خروج نهائي)','Fee name (e.g., Cancel Final Exit)')} style={{ ...sF, flex: 2, height: 38 }} />
                <input type="text" inputMode="decimal" value={extraAmount ? Number(extraAmount.replace(/,/g,'')).toLocaleString('en-US') : ''} onChange={e => setExtraAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder={T('المبلغ','Amount')} style={{ ...sF, flex: 1, height: 38, direction: 'ltr', textAlign: 'center' }} />
                <button onClick={addExtra} disabled={!extraName || !extraAmount} title={T('إضافة','Add')} style={{ height: 38, width: 42, borderRadius: 8, border: '1px solid rgba(212,160,23,.35)', background: 'linear-gradient(180deg, rgba(212,160,23,.18), rgba(212,160,23,.08))', color: C.gold, fontFamily: F, cursor: 'pointer', opacity: (!extraName||!extraAmount)?0.4:1, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.18s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)' }}><Plus size={17} strokeWidth={2.6} /></button>
              </div>
              {f.extras.length > 0 && (
                <div className="kc-scroll" style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, direction: 'rtl', maxHeight: 110, overflowY: 'auto' }}>
                  {f.extras.map((ex, i) => (
                    <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 9px', borderRadius: 8, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.25)', direction: 'rtl' }}>
                      <span style={{ color: 'rgba(255,255,255,.92)', fontWeight: 500, fontSize: 12 }}>{ex.name}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, direction: 'ltr', color: C.gold, fontWeight: 500, fontSize: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{T('ريال','SAR')}</span>
                        <span>{Number(ex.amount).toLocaleString('en-US')}</span>
                      </span>
                      <button onClick={() => removeExtra(i)} title={T('حذف','Remove')} style={{ width: 18, height: 18, borderRadius: 5, color: C.red, cursor: 'pointer', background: 'rgba(192,57,43,.12)', border: '1px solid rgba(192,57,43,.3)', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}><X size={10} strokeWidth={2} /></button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Total — emphasized */}
          <div style={{ marginTop: 2, padding: '10px 18px', borderRadius: 11, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.35)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(212,160,23,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                <Calculator size={15} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.gold }}>{T('الإجمالي المتوقع','Expected Total')}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.gold, lineHeight: 1 }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(total.toFixed(2))}</span> <span style={{ fontSize: 14, fontWeight: 500 }}>{T('ريال','SAR')}</span></span>
          </div>
        </div>
      })()}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 3: مراجعة */}
      {/* ═══════════════════════════════════════ */}
      {tab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Worker summary */}
          <div style={{ padding: '12px 14px 8px', borderRadius: 10, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.25)', position: 'relative' }}>
            {(() => {
              const renewalMonthsNum = f.renewIqama ? (parseInt(f.renewalMonths) || 0) : 0
              const threshold = parseInt(cfg.thresholdCase2) || 30
              // Determine which of the 3 cases applies → picks the right processing-days setting
              const procDays = (() => {
                if (!f.renewIqama) return parseInt(cfg.procDaysCase1) || 7
                if (!f.iqamaExpiry) return parseInt(cfg.procDaysCase3) || 7
                const exp = new Date(f.iqamaExpiry); if (isNaN(exp)) return parseInt(cfg.procDaysCase3) || 7
                const today = new Date(); today.setHours(0,0,0,0)
                const daysSinceExpiry = Math.floor((today - exp) / 86400000)
                return daysSinceExpiry >= threshold ? (parseInt(cfg.procDaysCase2) || 7) : (parseInt(cfg.procDaysCase3) || 7)
              })()
              const expectedExpiry = (() => {
                if (!f.iqamaExpiry) return null
                const exp = new Date(f.iqamaExpiry); if (isNaN(exp)) return null
                const today = new Date(); today.setHours(0,0,0,0)
                if (!f.renewIqama) return f.iqamaExpiry
                const daysSinceExpiry = Math.floor((today - exp) / 86400000)
                const start = daysSinceExpiry >= threshold
                  ? (() => { const d = new Date(today); d.setDate(d.getDate() + (parseInt(cfg.procDaysCase2) || 7)); return d })()
                  : new Date(exp)
                start.setMonth(start.getMonth() + renewalMonthsNum)
                return start.toISOString().slice(0, 10)
              })()
              // Expected iqama duration expressed as months + days, measured from (today − 7 days) to the expected expiry.
              // The −7 day offset accounts for the processing buffer before the renewal actually takes effect.
              const expectedIqamaDuration = (() => {
                if (!expectedExpiry) return null
                const end = new Date(expectedExpiry); if (isNaN(end)) return null
                const base = new Date(); base.setHours(0,0,0,0); base.setDate(base.getDate() + procDays)
                const sign = end >= base ? 1 : -1
                const [a, b] = sign === 1 ? [base, end] : [end, base]
                let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
                let days = b.getDate() - a.getDate()
                if (days < 0) {
                  months -= 1
                  const lastDayPrev = new Date(b.getFullYear(), b.getMonth(), 0).getDate()
                  days += lastDayPrev
                }
                return { months, days, sign }
              })()
              const cell = (l, v, vColor, vSize) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 500 }}>{l}</span>
                  <span style={{ fontWeight: 500, color: vColor || 'rgba(255,255,255,.92)', fontSize: vSize || 'inherit' }}>{v}</span>
                </div>
              )
              return (
                <>
                  <div style={{ position: 'absolute', top: -10, [lang === 'en' ? 'left' : 'right']: 14, background: '#141414', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.blue, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}><User size={12} strokeWidth={2.2} /><span>{T('بيانات العامل','Worker Data')}</span></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18, rowGap: 2 }}>
                    {cell(T('اسم العامل','Worker Name'), hrsdCheck.result?.name || f.name || '—')}
                    {cell(T('رقم الجوال','Mobile Number'), f.phone ? (<span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>0{f.phone}</span>) : '—')}
                    {cell(T('رقم الإقامة','Iqama Number'), f.iqama || '—')}
                    {f.changeProfession && cell(T('المهنة الجديدة','New Occupation'), f.newOccupation || '—', f.newOccupation ? C.gold : null)}
                    {cell(T('انتهاء الإقامة الحالي','Current Iqama Expiry'), f.iqamaExpiry || '—')}
                    {cell(T('انتهاء الإقامة المتوقع','Expected Iqama Expiry'), expectedExpiry || '—', expectedExpiry ? C.gold : null)}
                    {cell(T('المدة المتوقعة في الإقامة','Expected Iqama Duration'), expectedIqamaDuration ? `${expectedIqamaDuration.sign < 0 ? '-' : ''}${expectedIqamaDuration.months} ${lang === 'en' ? (expectedIqamaDuration.months === 1 ? 'month' : 'months') : 'شهر'} ${lang === 'en' ? 'and' : 'و'} ${expectedIqamaDuration.days} ${lang === 'en' ? (expectedIqamaDuration.days === 1 ? 'day' : 'days') : 'يوم'}` : '—', expectedIqamaDuration ? (expectedIqamaDuration.sign > 0 ? C.ok : C.red) : null)}
                  </div>
                </>
              )
            })()}
          </div>


          {/* Cost summary */}
          <div style={{ padding: '14px 14px 10px', borderRadius: 12, background: 'rgba(39,160,70,.04)', border: '1px solid rgba(39,160,70,.25)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -10, [lang === 'en' ? 'left' : 'right']: 14, background: '#141414', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.ok, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calculator size={12} strokeWidth={2.2} /><span>{T('ملخص التكاليف','Cost Summary')}</span></div>
            {(() => {
              // Human-readable month/day suffix so each row hints the duration driving the amount.
              const renewalMos = parseInt(f.renewalMonths) || 0
              const monthLbl = (n) => lang === 'en' ? (n === 1 ? 'month' : 'months') : 'شهر'
              const dayLbl = (n) => lang === 'en' ? (n === 1 ? 'day' : 'days') : 'يوم'
              const renewalLabelSuffix = (!f.transferOnly && renewalMos > 0) ? ` (${renewalMos} ${monthLbl(renewalMos)})` : ''
              const officeMos = iqamaRemainderParts.months + renewalMos
              const officeDays = iqamaRemainderParts.days
              const officeLabelSuffix = officeMos > 0 || officeDays > 0 ? ` (${officeMos} ${monthLbl(officeMos)}${officeDays > 0 ? ' ' + (lang === 'en' ? 'and' : 'و') + ' ' + officeDays + ' ' + dayLbl(officeDays) : ''})` : ''
              const extrasRows = (() => {
                if (!f.extras.length) return []
                if (f.extras.length === 1) return f.extras.map(ex => [ex.name, Number(ex.amount)])
                const sum = f.extras.reduce((s, ex) => s + (Number(ex.amount) || 0), 0)
                return [[T('مجموع الرسوم الإضافية','Additional Fees Total'), sum]]
              })()
              const items = [[T('رسوم نقل الكفالة','Sponsorship Transfer Fee'), transferFee, 'transferFee'], [T('تجديد الإقامة','Iqama Renewal') + renewalLabelSuffix, iqamaRenewalFee, 'iqamaRenewal'], [T('رخصة العمل','Work Permit') + renewalLabelSuffix, workPermitFee], ...(profChangeFee > 0 ? [[T('تغيير المهنة','Change Profession'), profChangeFee]] : []), [T('التأمين الطبي','Medical Insurance'), medicalFee], [T('رسوم المكتب','Office Fees'), officeFee], ...extrasRows]
              const subtotal = items.reduce((s, [, v]) => s + (Number(v) || 0), 0)
              const absherOn = !!f.absherBalance_on
              const absher = absherOn ? (parseFloat(f.absherBalance) || 0) : 0
              const total = Math.max(0, subtotal - absher)
              const absherClr = '#2ea043'
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* Items in 2 columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 2 }}>
                    {items.map(([l, v, k], i) => {
                      const transferEditable = k === 'transferFee' && (muqeemFetchStatus === 'unavailable' || muqeemFetchStatus === 'error')
                      const showRenewalFineToggle = k === 'iqamaRenewal' && (iqamaExpired || iqamaInGracePeriod)
                      return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 12, gap: 8 }}>
                        <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {l}
                          {showRenewalFineToggle && (
                            <button type="button" onClick={() => set('renewalAdd500', !f.renewalAdd500)} title={f.renewalAdd500 ? T(`إزالة إضافة ${cfg.iqamaFine1 || 500} ريال`,`Remove +${cfg.iqamaFine1 || 500} SAR`) : T(`إضافة ${cfg.iqamaFine1 || 500} ريال (غرامة)`,`Add ${cfg.iqamaFine1 || 500} SAR fine`)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(212,160,23,.15)', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, fontWeight: 500, transition: '.15s' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <line x1="5" y1="12" x2="19" y2="12"/>
                                {!f.renewalAdd500 && <line x1="12" y1="5" x2="12" y2="19"/>}
                              </svg>
                            </button>
                          )}
                        </span>
                        {transferEditable ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input type="text" inputMode="decimal" value={f.transferFeeInput || ''} onChange={e => set('transferFeeInput', e.target.value.replace(/[^0-9.]/g, ''))} style={{ width: 90, height: 26, padding: '0 8px', border: '1px solid rgba(212,160,23,.3)', borderRadius: 6, background: 'rgba(0,0,0,.25)', fontFamily: F, fontSize: 14, fontWeight: 500, color: C.gold, outline: 'none', direction: 'ltr', textAlign: 'center' }} />
                            <span style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', fontWeight: 500 }}>{T('ريال','SAR')}</span>
                          </span>
                        ) : (
                          <span style={{ fontWeight: 500, color: 'rgba(255,255,255,.92)' }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(v)}</span> {T('ريال','SAR')}</span>
                        )}
                      </div>
                      )
                    })}
                  </div>
                  {/* Subtotal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px', fontSize: 14 }}>
                    <span style={{ color: 'var(--tx2)', fontWeight: 500 }}>{T('إجمالي الرسوم','Subtotal')}</span>
                    <span style={{ fontWeight: 500, color: 'var(--tx)', fontSize: 14 }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(subtotal)}</span> {T('ريال','SAR')}</span>
                  </div>
                  {/* Absher discount — aligned with subtotal row style */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button type="button" onClick={() => set('absherBalance_on', !absherOn)} style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${absherOn ? absherClr : 'rgba(255,255,255,.45)'}`, background: absherOn ? absherClr : 'rgba(255,255,255,.05)', cursor: 'pointer', transition: '.2s', padding: 0, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        {absherOn && <Check size={11} strokeWidth={3.5} />}
                      </button>
                      <span style={{ color: absherOn ? absherClr : 'rgba(255,255,255,.55)', fontWeight: 500, fontSize: 12, transition: '.2s' }}>{T('رصيد أبشر (خصم)','Absher Balance (discount)')}</span>
                    </div>
                    <span style={{ fontWeight: 500, color: absherOn ? absherClr : 'var(--tx5)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6, opacity: absherOn ? 1 : .55, transition: '.2s' }}>
                      <input type="text" inputMode="decimal" disabled={!absherOn} value={f.absherBalance ? Number(f.absherBalance.replace(/,/g,'')).toLocaleString('en-US') : ''} onChange={e => set('absherBalance', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ width: 88, height: 26, padding: '0 8px', borderRadius: 7, border: `1px solid ${absherOn ? absherClr + '55' : 'rgba(255,255,255,.08)'}`, background: absherOn ? absherClr + '0d' : 'rgba(255,255,255,.02)', fontFamily: F, fontSize: 14, fontWeight: 500, color: absherOn ? absherClr : 'var(--tx5)', outline: 'none', direction: 'ltr', textAlign: 'center', transition: '.2s' }} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{T('ريال','SAR')}</span>
                    </span>
                  </div>
                  {/* Grand total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', marginTop: 2, borderTop: '1px dashed rgba(212,160,23,.25)' }}>
                    <span style={{ color: C.gold, fontWeight: 600, fontSize: 14 }}>{T('الإجمالي','Grand Total')}</span>
                    <span style={{ fontWeight: 600, color: C.gold, fontSize: 14 }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(total)}</span> {T('ريال','SAR')}</span>
                  </div>
                </div>
              )
            })()}
          </div>

        </div>
      )}

      </div>{/* end scrollable */}

      {/* ═══ Footer Navigation — register-modal style ═══ */}
      <style>{`.kc-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.kc-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.kc-nav-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.kc-nav-btn.dir-fwd:hover:not(:disabled) .nav-ico{transform:translateX(-4px)}.kc-nav-btn.dir-back:hover:not(:disabled) .nav-ico{transform:translateX(4px)}[dir=rtl] .kc-nav-btn.dir-fwd:hover:not(:disabled) .nav-ico{transform:translateX(4px)}[dir=rtl] .kc-nav-btn.dir-back:hover:not(:disabled) .nav-ico{transform:translateX(-4px)}.kc-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
      {(() => {
        const tabErrors = (() => {
          if (tab !== 0) return []
          const errs = []
          const iqama = (f.iqama || '').trim()
          const phone = (f.phone || '').trim()
          if (!iqama) errs.push(T('أدخل رقم الإقامة','Enter the Iqama number'))
          else if (!/^[12]\d{9}$/.test(iqama)) errs.push(T('رقم الإقامة يجب أن يكون 10 أرقام ويبدأ بـ 1 أو 2','Iqama must be 10 digits starting with 1 or 2'))
          if (!f.dob) errs.push(T('أدخل تاريخ الميلاد','Enter the date of birth'))
          if (!phone) errs.push(T('أدخل رقم الجوال','Enter the mobile number'))
          else if (phone.length !== 9) errs.push(T('رقم الجوال يجب أن يكون 9 أرقام','Mobile must be 9 digits'))
          else if (!/^5[013-9]\d{7}$/.test(phone)) errs.push(T('بادئة الجوال غير صحيحة (50, 51, 53–59)','Invalid mobile prefix (50, 51, 53–59)'))
          else if (/^(.)\1{8}$/.test(phone) || '012345678'.includes(phone) || '987654321'.includes(phone)) errs.push(T('رقم الجوال غير صحيح','Invalid mobile number'))
          if (muqeemFetchStatus !== 'ok') {
            if (!f.iqamaExpiry) errs.push(T('أدخل تاريخ انتهاء الإقامة','Enter the Iqama expiry date'))
            if (!f.occupation) errs.push(T('اختر المهنة','Select occupation'))
            if (!f.legalStatus) errs.push(T('اختر حالة المقيم','Select resident status'))
          }
          return errs
        })()
        const hasErrors = tab === 0 && tabErrors.length > 0
        const showErr = hasErrors && tried[tab]
        const onNextClick = () => {
          if (hasErrors) { setTried(t => { const n = [...t]; n[tab] = true; return n }); return }
          tryNextTab()
        }
        return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '4px 24px 16px', flexShrink: 0 }}>
        <div style={{ justifySelf: 'start' }}>
        {tab === 1 ? (
          <button onClick={() => { setTab(0) }} className="kc-nav-btn dir-fwd">
            <span className="nav-ico">{lang === 'en' ? <ChevronLeft size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}</span>
            <span>{T('السابق','Previous')}</span>
          </button>
        ) : tab > 1 ? (
          <button onClick={() => {
            setTab(tab - 1)
          }} className="kc-nav-btn dir-fwd">
            <span className="nav-ico">{lang === 'en' ? <ChevronLeft size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}</span>
            <span>{T('السابق','Previous')}</span>
          </button>
        ) : null}
        </div>
        <div style={{ justifySelf: 'center', textAlign: 'center', minHeight: 16 }}>
          {showErr && tabErrors[0] && (
            <span style={{ fontSize: 12, fontWeight: 400, color: C.red, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {tabErrors[0]}
            </span>
          )}
        </div>
        <div style={{ justifySelf: 'end' }}>
        {tab < 3 ? (
          <button onClick={onNextClick} className="kc-nav-btn dir-back">
            <span>{T('التالي','Next')}</span>
            <span className="nav-ico">{lang === 'en' ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}</span>
          </button>
        ) : (
          <button onClick={issueQuote} disabled={issuing} className="kc-nav-btn dir-back">
            <span>{issuing ? T('جاري الإصدار…','Issuing…') : T('إصدار','Issue')}</span>
            <span className="nav-ico">{issuing ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'kc-spin 0.7s linear infinite' }} /> : <Send size={14} strokeWidth={2} />}</span>
          </button>
        )}
        </div>
      </div>
        )
      })()}

      {/* ═══ CHI Insurance Check Overlay ═══ */}
      {insCheck.phase !== 'idle' && insCheck.phase !== 'await_hrsd' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16, fontFamily: F }} dir={lang === 'en' ? 'ltr' : 'rtl'}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', background: '#141518', borderRadius: 16, border: insCheck.phase === 'result' ? '1px solid rgba(212,160,23,.18)' : '1px solid rgba(30,78,132,.4)', padding: 22, boxShadow: '0 28px 70px rgba(0,0,0,.6)', position: 'relative' }}>

            <div style={{ textAlign: lang === 'en' ? 'left' : 'right', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
                {insCheck.phase === 'result' ? <Database size={22} style={{ color: C.gold }} /> : <Shield size={20} style={{ color: '#5b8fc7' }} />}
                <span>{insCheck.phase === 'result' ? T('استرجاع البيانات','Data Retrieval') : T('الضمان الصحي','Health Insurance')}</span>
              </div>
            </div>

            {insCheck.phase === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(30,78,132,.18)`, borderTopColor: '#5b8fc7', borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{T('جاري الاتصال بمنصّة CHI…','Connecting to CHI platform…')}</div>
                <style>{`@keyframes kc-spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {insCheck.phase === 'captcha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', textAlign: lang === 'en' ? 'left' : 'right' }}>{T('أدخل رمز التحقق الظاهر بالصورة','Enter the captcha shown in the image')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 8px' }}>
                  {insCheck.captchaImage
                    ? <CaptchaCountdown captchaKey={insCheck.captchaImage} onExpire={refreshInsCaptcha} color="#5b8fc7" />
                    : <div style={{ width: 38, height: 38, flexShrink: 0 }} aria-hidden="true" />}
                  {insCheck.captchaImage
                    ? <img src={insCheck.captchaImage} alt="captcha" style={{ height: 72, borderRadius: 12, filter: 'invert(1) contrast(1.3) brightness(0.92) saturate(0)', imageRendering: 'auto' }} />
                    : <span style={{ fontSize: 14, color: '#888' }}>{T('...جاري التحميل','Loading...')}</span>}
                  <button type="button" onClick={refreshInsCaptcha} title={T('رمز تحقق جديد','New captcha')} style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', border: 'none', background: 'rgba(30,78,132,.12)', color: '#5b8fc7', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(30,78,132,.22)'} onMouseLeave={e => e.currentTarget.style.background='rgba(30,78,132,.12)'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>
                  </button>
                </div>
                <input
                  value={insCheck.captchaInput}
                  onChange={e => setInsCheck(c => ({ ...c, captchaInput: e.target.value.slice(0, 6) }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitInsCaptcha() }}
                  placeholder="______"
                  autoFocus
                  maxLength={6}
                  className="kc-captcha-input"
                  style={{ height: 40, width: 220, alignSelf: 'center', padding: '0 14px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, fontFamily: F, fontSize: 16, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#2e2e2e,#262626)', textAlign: 'center', letterSpacing: '4px', direction: 'ltr', transition: 'border-color .2s' }}
                />
                {insCheck.error && <div style={{ fontSize: 13, color: C.red, textAlign: lang === 'en' ? 'left' : 'right' }}>{insCheck.error}</div>}
                <button
                  onClick={submitInsCaptcha}
                  disabled={!insCheck.captchaInput || insCheck.captchaInput.length < 6}
                  style={{ height: 46, borderRadius: 12, border: 'none', background: '#5b8fc7', color: '#fff', fontFamily: F, fontSize: 16, fontWeight: 600, cursor: (!insCheck.captchaInput || insCheck.captchaInput.length < 6) ? 'not-allowed' : 'pointer', opacity: (!insCheck.captchaInput || insCheck.captchaInput.length < 6) ? 0.45 : 1, transition: 'opacity .15s' }}
                >{T('تحقق','Verify')}</button>
              </div>
            )}

            {insCheck.phase === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(30,78,132,.18)`, borderTopColor: '#5b8fc7', borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{T('جاري التحقق…','Verifying…')}</div>
                <style>{`@keyframes kc-spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {insCheck.phase === 'result' && insCheck.result && (() => {
              const r = insCheck.result
              const insured = r.status === 'insured'
              const notIns = r.status === 'not_insured'
              const unknown = r.status === 'unknown'
              const chiOk = insured || notIns
              const muqeemOk = !!r.muqeem
              const hrsdOk = hrsdCheck.result && hrsdCheck.result.status === 'found'
              const allOk = chiOk && muqeemOk && hrsdOk
              const anyOk = chiOk || muqeemOk || hrsdOk
              const color = allOk ? '#27a046' : anyOk ? '#d4a017' : C.red
              const icon = allOk ? <Check size={32} strokeWidth={2.5} /> : anyOk ? <AlertCircle size={32} /> : <X size={32} />
              const title = allOk ? T('تم التحقق بنجاح','Verification Successful') : anyOk ? T('التحقق','Verification') : T('تعذّر التحقق','Verification Failed')
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <div style={{ width: 62, height: 62, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color }}>{title}</div>
                    {r.cached && <div style={{ fontSize: 14, color: 'rgba(255,255,255,.3)' }}>• {T('من الكاش (آخر 24 ساعة)','cached (last 24 hours)')}</div>}
                  </div>



                  {unknown && (r.debug?.panelText || r.debug?.bodyText) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {r.debug?.panelText && (
                        <>
                          <div style={{ fontSize: 14, color: '#d4a017', textAlign: lang === 'en' ? 'left' : 'right' }}>{T('محتوى نتيجة CHI:','CHI result content:')}</div>
                          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.3)', padding: 10, borderRadius: 8, maxHeight: 120, overflowY: 'auto', textAlign: 'right', direction: 'rtl', lineHeight: 1.6 }}>
                            {r.debug.panelText}
                          </div>
                        </>
                      )}
                      {/* Retry button — icon-only, requests a fresh captcha. */}
                      <button onClick={refreshInsCaptcha} title={T('رمز جديد','New captcha')} style={{ alignSelf: 'flex-end', width: 28, height: 28, padding: 0, border: 'none', background: 'transparent', color: '#5b8fc7', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>
                      </button>
                    </div>
                  )}

                  {/* ─── Source retrieval status — hidden while CHI is in unknown/retry state so the user focuses on the retry UI ─── */}
                  {!unknown && (r.muqeem ? (
                    <div style={{ background: 'rgba(244,123,32,.08)', border: '1px solid rgba(244,123,32,.3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#F47B20', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                      <CheckCircle2 size={16} />
                      <span>{T('استرجاع البيانات من مقيم','Muqeem data retrieved')}</span>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: C.red, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                      <AlertCircle size={16} />
                      <span>{T('فشل استرجاع البيانات من مقيم','Failed to retrieve Muqeem data')}</span>
                    </div>
                  ))}
                  {!unknown && (chiOk ? (() => {
                    const expiringSoon = (() => {
                      if (!insured || !r.expiryDate) return false
                      const exp = new Date(r.expiryDate); if (isNaN(exp.getTime())) return false
                      const days = Math.floor((exp.getTime() - Date.now()) / 86400000)
                      return days <= 30
                    })()
                    const statusLabel = insured ? T('ساري','Active') : T('غير نشط','Inactive')
                    const statusColor = !insured ? C.red : expiringSoon ? '#d4a017' : '#27a046'
                    const showWarn = expiringSoon
                    return (
                      <div style={{ background: 'rgba(30,78,132,.12)', border: '1px solid rgba(30,78,132,.4)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#5b8fc7', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                      <CheckCircle2 size={16} />
                      <span style={{ flex: 1 }}>{T('استرجاع البيانات من الضمان الصحي','Health Insurance data retrieved')}</span>
                        <span style={{ color: statusColor, fontWeight: 500, fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {showWarn && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                          {statusLabel}
                        </span>
                      </div>
                    )
                  })() : (
                    <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: C.red, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                      <AlertCircle size={16} />
                      <span>{T('فشل استرجاع البيانات من الضمان الصحي','Failed to retrieve Health Insurance data')}</span>
                    </div>
                  ))}
                  {!unknown && (hrsdCheck.result || hrsdCheck.phase === 'error') && (hrsdOk ? (
                    <div style={{ background: 'rgba(11,109,61,.12)', border: '1px solid rgba(11,109,61,.4)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: '#3bb27a', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                      <CheckCircle2 size={16} />
                      <span>{T('استرجاع البيانات من وزارة العمل','Ministry of Labor data retrieved')}</span>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.3)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: C.red, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                      <AlertCircle size={16} />
                      <span>{T('فشل استرجاع البيانات من وزارة العمل','Failed to retrieve Ministry of Labor data')}</span>
                    </div>
                  ))}

                  {/* Continue button — show whenever HRSD has finalized (result, skipped, or never started) */}
                  {(hrsdCheck.phase === 'result' || hrsdCheck.result || hrsdCheck.phase === 'idle') && (
                    <button onClick={skipInsAndAdvance} style={{ height: 44, borderRadius: 10, border: 'none', background: C.gold, color: '#000', fontFamily: F, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                      {T('متابعة','Continue')}
                    </button>
                  )}
                </div>
              )
            })()}

            {insCheck.phase === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}><AlertCircle size={28} /></div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.red, textAlign: 'center' }}>{T('تعذّر التحقق من التأمين','Insurance verification failed')}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>{insCheck.error}</div>
                </div>
                <button onClick={startInsuranceCheck} style={{ height: 40, borderRadius: 10, border: '1px solid rgba(30,78,132,.4)', background: 'rgba(30,78,132,.12)', color: '#5b8fc7', fontFamily: F, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{T('إعادة المحاولة','Retry')}</button>
                <button onClick={skipInsAndAdvance} style={{ height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: 'rgba(255,255,255,.5)', fontFamily: F, fontSize: 14, cursor: 'pointer' }}>{T('تخطّي والمتابعة','Skip and continue')}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Quote Issued Success Modal ═══ */}
      {issuedQuote && (() => {
        const copy = (text) => { try { navigator.clipboard.writeText(text); toast && toast(T('تم النسخ','Copied')) } catch { toast && toast('تعذّر النسخ') } }
        const CopyBtn = ({ text }) => (
          <button onClick={() => copy(text)} title={T('نسخ','Copy')} style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)', color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        )
        const row = (label, value, withCopy, amountSplit) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: amountSplit ? 'rgba(212,160,23,.08)' : 'rgba(255,255,255,.03)', border: `1px solid ${amountSplit ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.06)'}` }}>
            <span style={{ flex: 1, fontSize: 14, color: amountSplit ? C.gold : 'rgba(255,255,255,.5)', fontWeight: amountSplit ? 800 : 600 }}>{label}</span>
            {amountSplit ? (
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, direction: 'ltr', fontSize: 14, fontWeight: 500, color: C.gold }}>
                <span style={{ fontSize: 14, fontWeight: 500, opacity: .85 }}>{amountSplit.unit}</span>
                <span>{amountSplit.num}</span>
              </span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.92)', direction: 'ltr' }}>{value}</span>
            )}
            {withCopy && <CopyBtn text={String(value)} />}
          </div>
        )
        return (
          <div onClick={() => setIssuedQuote(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2300, padding: 16, fontFamily: F }} dir={lang === 'en' ? 'ltr' : 'rtl'}>
            <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: '94vw', background: '#141518', borderRadius: 16, border: '1px solid rgba(39,160,70,.3)', padding: 22, boxShadow: '0 28px 70px rgba(0,0,0,.6)', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0 14px' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(39,160,70,.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27a046' }}><CheckCircle2 size={30} /></div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.95)', textAlign: 'center' }}>{T('تم إصدار التسعيرة','Quote Issued')}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', textAlign: 'center', lineHeight: 1.7, padding: '0 4px' }}>{T(`تم إصدار تسعيرة للعامل ${issuedQuote.workerName} بنجاح`, `Quote successfully issued for ${issuedQuote.workerName}`)}</div>
                {issuedQuote.warnings && issuedQuote.warnings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', marginTop: 4 }}>
                    {issuedQuote.warnings.map((w, i) => {
                      const clr = w.level === 'danger' ? { bg: 'rgba(192,57,43,.08)', bd: 'rgba(192,57,43,.3)', tx: '#e67265' } : { bg: 'rgba(212,160,23,.08)', bd: 'rgba(212,160,23,.3)', tx: C.gold }
                      return (
                        <div key={i} style={{ background: clr.bg, border: `1px solid ${clr.bd}`, borderRadius: 8, padding: '7px 11px', fontSize: 14, color: clr.tx, fontWeight: 500, lineHeight: 1.55, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>{w.text}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {row(T('رقم طلب التسعيرة','Quote No.'), issuedQuote.quoteNo, true)}
                {row(T('رقم الإقامة','Iqama Number'), issuedQuote.iqNo, true)}
                {row(T('الإجمالي','Total'), `${nm(issuedQuote.total.toFixed(2))} ${T('ريال','SAR')}`, false, { unit: T('ريال','SAR'), num: nm(issuedQuote.total.toFixed(2)) })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => { setIssuedQuote(null); if (typeof onGoToTransferCalc === 'function') onGoToTransferCalc(issuedQuote.quoteNo); else onClose && onClose() }} className="kc-nav-btn dir-back">
                  <span>{T('الذهاب إلى التسعيرة','Go to Quote')}</span>
                  <span className="nav-ico">{lang === 'en' ? <ChevronRight size={14} strokeWidth={2} /> : <ChevronLeft size={14} strokeWidth={2} />}</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ HRSD (Ministry of Labor) CAPTCHA Overlay ═══ */}
      {hrsdCheck.phase !== 'idle' && hrsdCheck.phase !== 'result' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: 16, fontFamily: F }} dir={lang === 'en' ? 'ltr' : 'rtl'}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', background: '#141518', borderRadius: 16, border: '1px solid rgba(11,109,61,.4)', padding: 22, boxShadow: '0 28px 70px rgba(0,0,0,.6)', position: 'relative' }}>
            <button onClick={closeHrsdCheck} style={{ position: 'absolute', top: 12, [lang === 'en' ? 'right' : 'left']: 12, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>

            <div style={{ textAlign: lang === 'en' ? 'left' : 'right', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,.06)', [lang === 'en' ? 'paddingRight' : 'paddingLeft']: 36 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
                <Briefcase size={22} style={{ color: '#3bb27a' }} />
                <span>{T('وزارة العمل','Ministry of Labor')}</span>
              </div>
            </div>

            {hrsdCheck.phase === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(11,109,61,.18)`, borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{T('جاري الاتصال بوزارة العمل…','Connecting to Ministry of Labor…')}</div>
              </div>
            )}

            {hrsdCheck.phase === 'captcha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', textAlign: lang === 'en' ? 'left' : 'right' }}>{T('أدخل رمز التحقق الظاهر بالصورة','Enter the captcha shown in the image')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 8px' }}>
                  {hrsdCheck.captchaImage
                    ? <CaptchaCountdown captchaKey={hrsdCheck.captchaImage} onExpire={refreshHrsdCaptcha} color="#3bb27a" />
                    : <div style={{ width: 38, height: 38, flexShrink: 0 }} aria-hidden="true" />}
                  {hrsdCheck.captchaImage
                    ? <img src={hrsdCheck.captchaImage} alt="captcha" style={{ height: 72, borderRadius: 12, filter: 'invert(1) contrast(1.3) brightness(0.92) saturate(0)', imageRendering: 'auto' }} />
                    : <span style={{ fontSize: 14, color: '#888' }}>{T('...جاري التحميل','Loading...')}</span>}
                  <button type="button" onClick={refreshHrsdCaptcha} title={T('رمز تحقق جديد','New captcha')} style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', border: 'none', background: 'rgba(11,109,61,.12)', color: '#3bb27a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(11,109,61,.22)'} onMouseLeave={e => e.currentTarget.style.background='rgba(11,109,61,.12)'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>
                  </button>
                </div>
                <input
                  value={hrsdCheck.captchaInput}
                  onChange={e => setHrsdCheck(c => ({ ...c, captchaInput: e.target.value.slice(0, 6) }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitHrsdCaptcha() }}
                  placeholder="______"
                  autoFocus maxLength={6}
                  className="kc-captcha-input"
                  style={{ height: 40, width: 220, alignSelf: 'center', padding: '0 14px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, fontFamily: F, fontSize: 16, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#2e2e2e,#262626)', textAlign: 'center', letterSpacing: '4px', direction: 'ltr', transition: 'border-color .2s' }}
                />
                {hrsdCheck.error && <div style={{ fontSize: 13, color: C.red, textAlign: lang === 'en' ? 'left' : 'right' }}>{hrsdCheck.error}</div>}
                <button onClick={submitHrsdCaptcha} disabled={!hrsdCheck.captchaInput || hrsdCheck.captchaInput.length < 6} style={{ height: 46, borderRadius: 12, border: 'none', background: '#3bb27a', color: '#fff', fontFamily: F, fontSize: 16, fontWeight: 600, cursor: (!hrsdCheck.captchaInput || hrsdCheck.captchaInput.length < 6) ? 'not-allowed' : 'pointer', opacity: (!hrsdCheck.captchaInput || hrsdCheck.captchaInput.length < 6) ? 0.45 : 1, transition: 'opacity .15s' }}>{T('تحقق','Verify')}</button>
              </div>
            )}

            {hrsdCheck.phase === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(11,109,61,.18)`, borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{T('جاري التحقق…','Verifying…')}</div>
              </div>
            )}

            {hrsdCheck.phase === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}><AlertCircle size={28} /></div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.red, textAlign: 'center' }}>{T('تعذّر الاستعلام','Inquiry failed')}</div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>{hrsdCheck.error}</div>
                </div>
                <button onClick={startHrsdCheck} style={{ height: 40, borderRadius: 10, border: '1px solid rgba(11,109,61,.4)', background: 'rgba(11,109,61,.12)', color: '#3bb27a', fontFamily: F, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{T('إعادة المحاولة','Retry')}</button>
                <button onClick={closeHrsdCheck} style={{ height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: 'rgba(255,255,255,.5)', fontFamily: F, fontSize: 14, cursor: 'pointer' }}>{T('إلغاء','Cancel')}</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
    </div></div>
  )
}
