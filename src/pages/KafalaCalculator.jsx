import React, { useState, useMemo, useEffect, useRef } from 'react'
import { User, FileText, Calculator, ChevronRight, ChevronLeft, Plus, Trash2, Check, X, AlertCircle, Briefcase, Phone, Calendar, ArrowLeftRight, Search, Shield, CreditCard, Clock, Building2, CheckCircle2, Info } from 'lucide-react'
import { getSupabase } from '../lib/supabase.js'
import { getKafalaPricingConfig } from '../ServiceAdminPage.jsx'

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
const sF = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'rgba(0,0,0,.18)', boxSizing: 'border-box', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', textAlign: 'center', transition: '.2s' }

const Lbl = ({ children, req }) => <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'right' }}>{children}{req && <span style={{ color: C.red }}> *</span>}</div>

const Inp = ({ value, onChange, placeholder, type, dir, maxLength }) => (
  <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type || 'text'} maxLength={maxLength}
    style={{ ...sF, textAlign: 'center', direction: dir || 'rtl' }} />
)

const DateInp = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o=>!o)} style={{ ...sF, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, direction: 'ltr', color: value ? 'var(--tx)' : 'var(--tx5)', border: `1px solid ${open ? C.gold+'66' : 'rgba(255,255,255,.05)'}` }}>
        <span>{value || 'yyyy-mm-dd'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      </button>
      {open && (
        <input type="date" value={value || ''} onChange={e => { onChange(e.target.value); setOpen(false) }} autoFocus
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: 42 }}
          onBlur={() => setOpen(false)} />
      )}
    </div>
  )
}

// Custom dark-themed calendar popup to match modal design
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const DAY_ABBR_AR = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت']
const pad2 = n => String(n).padStart(2, '0')
const fmtDate = (y, m, d) => `${y}-${pad2(m+1)}-${pad2(d)}`

const CalendarPopup = ({ value, onPick, onClose, anchor }) => {
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
    <div style={{ position: 'fixed', top, left, width: POPUP_W, background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12, zIndex: 1001, boxShadow: '0 12px 40px rgba(0,0,0,.7)', fontFamily: F, direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" onClick={prevMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{MONTH_NAMES_AR[cur.m]} {cur.y}</div>
        <button type="button" onClick={nextMonth} style={navBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>
        {DAY_ABBR_AR.map(d => <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
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
              style={{ height: 30, borderRadius: 6, border: isTd && !isSel ? `1px solid ${C.gold}55` : '1px solid transparent', background: isSel ? C.gold : (isTd ? 'rgba(212,160,23,.04)' : 'transparent'), color: isSel ? '#000' : (isTd ? C.gold : 'rgba(255,255,255,.8)'), fontFamily: F, fontSize: 12, fontWeight: isSel || isTd ? 800 : 500, cursor: 'pointer', transition: '.15s', padding: 0 }}>
              {d}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <button type="button" onClick={() => { onPick(''); onClose() }} style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 700, padding: '4px 8px' }}>مسح</button>
        <button type="button" onClick={() => { const t = new Date(); onPick(fmtDate(t.getFullYear(), t.getMonth(), t.getDate())); onClose() }} style={{ fontSize: 11, color: C.gold, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 800, padding: '4px 8px' }}>اليوم</button>
      </div>
    </div>
  )
}

// Single-input date field: type YYYY-MM-DD or click calendar icon for custom picker
const DateField = ({ value, onChange, label, req }) => {
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
          style={{ ...sF, direction: 'ltr', textAlign: 'center', padding: '0 40px 0 14px', letterSpacing: '.5px', border: `1px solid ${focused || pickerOpen ? C.gold+'66' : 'rgba(255,255,255,.05)'}`, cursor: 'text' }} />
        <button type="button" onClick={openPicker} aria-label="calendar"
          style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, border: 'none', background: pickerOpen ? 'rgba(212,160,23,.12)' : 'transparent', cursor: 'pointer', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 7, transition: '.15s' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </button>
        {pickerOpen && anchor && (<>
          <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <CalendarPopup value={value} onPick={onChange} onClose={() => setPickerOpen(false)} anchor={anchor} />
        </>)}
      </div>
    </div>
  )
}

const Sel = ({ value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false)
  const [flipUp, setFlipUp] = useState(false)
  const btnRef = useRef(null)
  const [q, setQ] = useState('')
  const filtered = q ? options.filter(o => String(o).toLowerCase().includes(q.toLowerCase())) : options
  const toggle = () => {
    setQ('')
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      let sc = btnRef.current.parentElement
      while (sc && sc !== document.body) {
        const s = getComputedStyle(sc)
        if (/(auto|scroll|overlay)/.test(s.overflowY) || /(auto|scroll|overlay)/.test(s.overflow)) break
        sc = sc.parentElement
      }
      const scRect = sc && sc !== document.body ? sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
      const spaceBelow = scRect.bottom - rect.bottom
      const spaceAbove = rect.top - scRect.top
      setFlipUp(spaceBelow < 220 && spaceAbove > spaceBelow)
    }
    setOpen(o => !o)
  }
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={toggle} style={{ ...sF, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, direction: 'rtl', color: value ? 'var(--tx)' : 'var(--tx5)', border: `1px solid ${open ? C.gold+'66' : 'rgba(255,255,255,.05)'}`, padding: '0 32px 0 32px', position: 'relative' }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || placeholder || 'اختر...'}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2.5" style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (<>
        <div onClick={() => { setOpen(false); setQ('') }} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
        <div style={{ position: 'absolute', ...(flipUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }), right: 0, left: 0, background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, maxHeight: 280, display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 12px 40px rgba(0,0,0,.65)', overflow: 'hidden' }}>
          {options.length > 6 && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0, position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', right: 18, transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث..." autoFocus
                style={{ width: '100%', height: 32, padding: '0 32px', border: '1px solid rgba(255,255,255,.05)', borderRadius: 7, background: 'rgba(0,0,0,.18)', fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', textAlign: 'center' }} />
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(o => (
              <div key={o} onClick={() => { onChange(o); setOpen(false); setQ('') }} style={{ padding: '10px 14px', fontSize: 13, fontWeight: value===o?700:500, color: value===o?C.gold:'rgba(255,255,255,.75)', background: value===o?'rgba(212,160,23,.08)':'transparent', cursor: 'pointer', textAlign: 'center' }}
                onMouseEnter={e => { if (value!==o) e.currentTarget.style.background='rgba(255,255,255,.03)' }}
                onMouseLeave={e => { if (value!==o) e.currentTarget.style.background='transparent' }}>{o}</div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 14, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>لا نتائج</div>}
          </div>
        </div>
      </>)}
    </div>
  )
}

const ToggleGroup = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', gap: 6, height: 42 }}>
    {options.map(o => {
      const sel = value === o.v
      const clr = o.c || C.gold
      return (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} style={{
          flex: 1, borderRadius: 9, border: `1.5px solid ${sel ? clr : 'rgba(255,255,255,.08)'}`,
          background: sel ? clr + '15' : 'rgba(0,0,0,.18)',
          color: sel ? clr : 'var(--tx4)',
          fontFamily: F, fontSize: 12, fontWeight: sel ? 700 : 600,
          cursor: 'pointer', transition: '.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          boxShadow: sel ? 'none' : 'inset 0 1px 2px rgba(0,0,0,.2)'
        }}>
          <span>{o.l}</span>
          {o.sub && <span style={{ fontSize: 9, opacity: .6 }}>{o.sub}</span>}
        </button>
      )
    })}
  </div>
)

const YesNo = ({ value, onChange }) => (
  <ToggleGroup value={value} onChange={onChange} options={[
    { v: true, l: 'نعم', c: C.ok },
    { v: false, l: 'لا', c: C.blue }
  ]} />
)

const nm = v => Number(v || 0).toLocaleString('en-US')

// ═══ Main Component ═══
export default function KafalaCalculator({ toast, lang, onClose }) {
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

  // ═══ CHI Insurance Check state ═══
  const [insCheck, setInsCheck] = useState({
    phase: 'idle',        // idle | loading | captcha | verifying | result | error
    sessionToken: null,
    captchaImage: null,
    captchaInput: '',
    result: null,
    error: null,
  })

  // ═══ HRSD (Ministry of Labor) Worker Inquiry state ═══
  const [hrsdCheck, setHrsdCheck] = useState({
    phase: 'idle',        // idle | loading | captcha | verifying | result | error
    sessionToken: null,
    captchaImage: null,
    captchaInput: '',
    result: null,
    error: null,
  })

  // ═══ Muqeem session (stored in localStorage) ═══
  const [muqeemSession, setMuqeemSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jisr.muqeem.session') || 'null') } catch { return null }
  })
  const [muqeemPaste, setMuqeemPaste] = useState({ open: false, curl: '', saving: false, error: null })
  // Muqeem-fetched worker data — when present, the form renders these fields as fixed read-only text
  const [muqeemData, setMuqeemData] = useState(null)
  // Tiny inline indicator next to the iqama input so the employee sees something is happening.
  const [muqeemFetchStatus, setMuqeemFetchStatus] = useState('idle') // idle | loading | ok | error | unavailable

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
      const { data } = await sb.from('muqeem_sessions').select('*').eq('id', 'default').maybeSingle()
      if (cancelled || !data || !data.auth_bearer) return
      const remote = {
        cookies: data.cookies || '',
        authBearer: data.auth_bearer,
        xsrfToken: data.xsrf_token || null,
        xDomain: data.x_domain || null,
        jwtExp: data.jwt_exp || null,
        moiNumber: data.moi_number || null,
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
  const [f, setF] = useState(() => {
    const cfg = getKafalaPricingConfig()
    const midBracket = (cfg.medicalBrackets || [])[Math.floor((cfg.medicalBrackets || []).length / 2)] || { rate: 800 }
    return {
      name: '', iqama: '', phone: '', iqamaExpiry: '', dob: '', nationality: 'بنغلاديشي', gender: 'ذكر', occupation: '', legalStatus: 'صالح',
      workerType: 'facility', currentEmployer: '', currentEmployerId: '', newOccupation: '', wpExpiry: '',
      hasNoticePeriod: false, employerConsent: false, changeProfession: false, renewIqama: true,
      transferCount: '1', renewalMonths: '12', iqamaFineCount: '1',
      transferFeeInput: String(cfg.transferFee1),
      iqamaRenewalFee: String(Math.round(cfg.iqamaPerMonth * 12)),
      workPermitRate: String(cfg.workPermit12M || 100),
      medicalFee: String(midBracket.rate),
      officeFee: String(cfg.officeFee),
      profChangeInput: String(cfg.profChange),
      extras: [],
      insuranceWaived: false, insuranceExpiry: ''
    }
  })

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

  // ═══ Auto-sync effects ═══
  // Medical fee ← 0 if insurance is valid >2 months 5 days ahead, else age bracket from DOB
  useEffect(() => {
    if (f.insuranceWaived) { setF(p => ({ ...p, medicalFee: '0' })); return }
    if (medicalBracket) setF(p => ({ ...p, medicalFee: String(medicalBracket.rate) }))
  }, [medicalBracket, f.insuranceWaived])

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
  useEffect(() => {
    const totalMonths = monthsPastExpiry + (parseInt(f.renewalMonths) || 0)
    const renewalBase = totalMonths * (parseFloat(cfg.iqamaPerMonth) || 0)
    const fine = iqamaInGracePeriod
      ? (f.renewalAdd500 ? (parseFloat(cfg.iqamaFine2) || 0) : (parseFloat(cfg.iqamaFine1) || 0))
      : 0
    setF(p => ({ ...p, iqamaRenewalFee: String(Math.round(renewalBase + fine)) }))
  }, [monthsPastExpiry, f.renewalMonths, iqamaInGracePeriod, f.renewalAdd500, cfg])

  // Work permit fee ← quarters before cutoff × per-3-months + days after cutoff × daily
  // Work permit fee — driven by selected renewal months (3/6/9/12) instead of a manual date.
  //   - Bracket pricing (workPermit3M/6M/9M/12M) for periods entirely before cutoff date.
  //   - Daily rate (workPermitDailyAfter) for any portion after cutoff date.
  //   - When iqama expired, period start shifts forward by workPermitExpiredOffsetDays.
  useEffect(() => {
    const months = parseInt(f.renewalMonths) || 12
    const offsetDays = (muqeemData?.iqamaExpired || iqamaInGracePeriod) ? (parseFloat(cfg.workPermitExpiredOffsetDays) || 57) : 0
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + offsetDays)
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
      // Mixed: bracket fee for the portion before cutoff + daily for portion after
      total = bracketFee + Math.ceil((end - cutoff) / 86400000) * dailyRate
    }
    setF(p => ({ ...p, workPermitRate: String(Math.round(total)) }))
  }, [f.renewalMonths, muqeemData?.iqamaExpired, iqamaInGracePeriod, cfg])

  // Auto-set transfer fee from Muqeem sponsor changes:
  //   0 transfers  → cfg.transferFee1 (المرة الأولى)
  //   1 transfer   → cfg.transferFee2 (المرة الثانية)
  //   2+ transfers → cfg.transferFee3 (أكثر من مرتين)
  const muqeemSponsorChanges = (() => {
    // Look up the latest Muqeem result if available (state set after fetch)
    return typeof muqeemData?.sponsorChanges === 'number' ? muqeemData.sponsorChanges : null
  })()
  useEffect(() => {
    if (muqeemSponsorChanges === null) return
    const fee = muqeemSponsorChanges === 0 ? cfg.transferFee1
              : muqeemSponsorChanges === 1 ? cfg.transferFee2
              : cfg.transferFee3
    if (fee != null) setF(p => ({ ...p, transferFeeInput: String(Math.round(fee)) }))
  }, [muqeemSponsorChanges, cfg])

  // ═══ Totals (use unified input values) ═══
  const transferFee = parseFloat(f.transferFeeInput) || 0
  const iqamaRenewalFee = parseFloat(f.iqamaRenewalFee) || 0
  const workPermitFee = parseFloat(f.workPermitRate) || 0
  const profChangeFee = f.changeProfession ? (parseFloat(f.profChangeInput) || 0) : 0
  const medicalFee = parseFloat(f.medicalFee) || 0

  // Office fee with floor (general discount will be applied later, NOT absher).
  // Floor = (months remaining in iqama + renewal months) × officePerMonth.
  const monthsInIqama = (() => {
    if (!f.iqamaExpiry) return 0
    const exp = new Date(f.iqamaExpiry); if (isNaN(exp)) return 0
    const today = new Date()
    if (exp <= today) return 0
    return Math.max(0, Math.ceil((exp - today) / (30 * 86400000)))
  })()
  const officeMonths = monthsInIqama + (parseInt(f.renewalMonths) || 0)
  const officeMin = officeMonths * (parseFloat(cfg.officePerMonth) || 541.67)
  const officeBase = parseFloat(f.officeFee) || parseFloat(cfg.officeFee) || 0
  const officeFee = Math.max(officeBase, officeMin)

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
    setF(p => ({
      ...p,
      iqamaExpiry: m.iqamaExpiryGregorian || p.iqamaExpiry,
      occupation: m.occupationAr || p.occupation,
      legalStatus: STATUS_MAP[m.statusAr] || p.legalStatus,
      transferCount: m.sponsorChanges != null ? String(Math.min(3, Math.max(1, m.sponsorChanges))) : p.transferCount,
    }))
    setMuqeemData(m)
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
    setInsCheck(c => ({ ...c, phase: 'loading', error: null }))
    try {
      const sb = getSupabase()
      if (sb) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data } = await sb.from('insurance_check_cache').select('*').eq('iqama_number', iq).gte('checked_at', since).maybeSingle()
        if (data) {
          const meta = data.is_active ? applyInsuranceToCalc(data.expiry_date) : { waived: false, daysLeft: null }
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
      if (r.status === 'invalid_captcha') {
        const fresh = await callInsFn({ action: 'init' })
        setInsCheck(c => ({
          ...c,
          phase: 'captcha',
          sessionToken: fresh.session,
          captchaImage: fresh.captchaImage,
          captchaInput: '',
          error: 'رمز التحقق غير صحيح — جرّب مرة ثانية',
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
      const sb = getSupabase()
      if (sb && (r.status === 'insured' || r.status === 'not_insured')) {
        await sb.from('insurance_check_cache').upsert({
          iqama_number: f.iqama,
          is_active: r.status === 'insured',
          company_name: r.company || null,
          expiry_date: r.expiryDate || null,
          raw_response: r,
          checked_at: new Date().toISOString(),
        })
      }
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
      setInsCheck(c => ({ ...c, phase: 'result', result: { ...r, waived: meta.waived, daysLeft: meta.daysLeft, muqeem: muqeemData, muqeemError: mq.ok ? null : (mq.code || mq.error) } }))
      // Auto-chain HRSD captcha right after CHI succeeds
      setTimeout(() => startHrsdCheck(), 600)
    } catch (e) {
      setInsCheck(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? 'انتهت مهلة التحقق' : (e.message || 'خطأ في التحقق') }))
    }
  }

  function closeInsCheck() {
    setInsCheck({ phase: 'idle', sessionToken: null, captchaImage: null, captchaInput: '', result: null, error: null })
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
    setHrsdCheck(c => ({ ...c, phase: 'loading', error: null, result: null }))
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
      if (r.status === 'invalid_captcha') {
        const fresh = await callHrsdFn({ action: 'init' })
        setHrsdCheck(c => ({ ...c, phase: 'captcha', sessionToken: fresh.session, captchaImage: fresh.captchaImage, captchaInput: '', error: 'رمز التحقق غير صحيح — جرّب مرة ثانية' }))
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
    } catch (e) {
      setHrsdCheck(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? 'انتهت مهلة التحقق' : (e.message || 'خطأ في التحقق') }))
    }
  }

  function closeHrsdCheck() {
    setHrsdCheck({ phase: 'idle', sessionToken: null, captchaImage: null, captchaInput: '', result: null, error: null })
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
  const Err = ({ k }) => tried[tab] && errors[k] ? <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>{errors[k]}</div> : null

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
    { id: 'worker', title: 'بيانات العامل', Icon: User },
    { id: 'details', title: 'تفاصيل العامل', Icon: ArrowLeftRight },
    { id: 'pricing', title: 'التسعيرة', Icon: Calculator },
    { id: 'review', title: 'مراجعة', Icon: CheckCircle2 }
  ]

  const headerSubtitle = screen === 'home' ? 'حساب تكاليف نقل خدمات العمال والرسوم الحكومية' : (workerMode === 'existing' ? 'عامل مسجّل' : 'عامل جديد') + (f.name ? ` — ${f.name}` : '')

  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }
  const modalBox = { background: '#1a1a1a', borderRadius: 18, width: 720, maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)' }
  const headerBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 6px', flexShrink: 0, fontFamily: F, direction: 'rtl' }

  if (screen === 'home') return (
    <div onClick={() => onClose && onClose()} style={modalOverlay}><div onClick={e => e.stopPropagation()} style={modalBox}>
    <div style={headerBar}>
      <div><div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.9)' }}>حسبة نقل الكفالة</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{headerSubtitle}</div></div>
      <button onClick={() => onClose && onClose()} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
    </div>
    <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, padding: '22px 24px', overflowY: 'auto' }}>

      {/* ═══ Fieldset: اختيار نوع العامل ═══ */}
      <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '18px 14px 14px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -9, right: 14, background: '#1a1a1a', padding: '0 8px', fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <User size={12} strokeWidth={2.2} />
          <span>نوع العامل</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { mode: 'existing', title: 'عامل مسجّل مسبقاً', desc: 'البحث برقم الإقامة في قاعدة البيانات', Icon: Search },
            { mode: 'new', title: 'عامل جديد', desc: 'تسجيل بيانات عامل جديد يدوياً', Icon: Plus }
          ].map(({ mode, title, desc, Icon }) => {
            const sel = workerMode === mode
            return (
              <button key={mode} type="button"
                onClick={() => { if (mode === 'new') { setWorkerMode('new'); setScreen('form'); setTab(0) } else { setWorkerMode('existing') } }}
                onMouseEnter={e => { if (!sel) { e.currentTarget.style.background = 'rgba(212,160,23,.07)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.2)' } }}
                onMouseLeave={e => { if (!sel) { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' } }}
                style={{ textAlign: 'right', padding: '12px 14px', borderRadius: 12, border: `1px solid ${sel ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.06)'}`, background: sel ? 'rgba(212,160,23,.12)' : 'rgba(255,255,255,.03)', color: 'var(--tx)', fontFamily: F, cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,160,23,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }}>
                  <Icon size={20} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.85)', marginBottom: 2, lineHeight: 1.3 }}>{title}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)' }}>{desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ Fieldset: البحث (when existing mode) ═══ */}
      {workerMode === 'existing' && (
        <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '18px 14px 14px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -9, right: 14, background: '#1a1a1a', padding: '0 8px', fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Search size={12} strokeWidth={2.2} />
            <span>البحث عن العامل</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)' }}>رقم الإقامة <span style={{ color: C.red }}>*</span></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={searchIqama} onChange={e => setSearchIqama(e.target.value.replace(/\D/g,''))} placeholder="7XXXXXXXXX" maxLength={10}
                style={{ flex: 1, height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'rgba(0,0,0,.18)', textAlign: 'center', boxSizing: 'border-box', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', direction: 'ltr', letterSpacing: '.5px' }} />
              <button type="button" onClick={() => { if (searchIqama.length >= 10) { set('iqama', searchIqama); setScreen('form'); setTab(0) } else { toast && toast('ادخل رقم إقامة صحيح') } }}
                style={{ height: 42, padding: '0 18px', borderRadius: 9, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.12)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <Search size={14} /> بحث
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Info size={11} /> سيتم ربط البحث بقاعدة البيانات لاحقاً
            </div>
          </div>
        </div>
      )}
    </div>
    </div></div>
  )

  // ═══════════════════════════════════════
  // SCREEN 2: FORM WITH TABS
  // ═══════════════════════════════════════
  return (
    <div onClick={() => onClose && onClose()} style={modalOverlay}><div onClick={e => e.stopPropagation()} style={modalBox}>
    <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header — title on right (RTL), X on left */}
      <div style={{ ...headerBar, justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
            <Calculator size={16} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', fontFamily: F }}>حسبة نقل الكفالة</div>
            <div style={{ fontSize: 11, color: 'var(--tx4)', fontFamily: F, marginTop: 3 }}>الخطوة {tab+1} من {tabs.length}</div>
          </div>
        </div>
        <button onClick={() => onClose && onClose()} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
      </div>

      {/* ═══ Progress Bar — thin gold segments like ServiceRequestPage ═══ */}
      <div style={{ padding: '0 22px 8px', flexShrink: 0, display: 'flex', gap: 6 }}>
        {tabs.map((_, i) => (
          <div key={i} onClick={() => tryGoTab(i)} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= tab ? C.gold : 'rgba(255,255,255,.08)', transition: '.25s', cursor: i <= tab ? 'pointer' : 'default' }} />
        ))}
      </div>


      {/* ═══ Scrollable Content ═══ */}
      <style>{`.kc-scroll::-webkit-scrollbar{width:0;display:none}.kc-scroll{scrollbar-width:none;-ms-overflow-style:none}`}</style>
      <div className="kc-scroll" style={{ flex: 1, overflow: 'hidden', padding: '8px 16px 12px' }}>

      {/* ═══════════════════════════════════════ */}
      {/* TAB 0: بيانات العامل — matches ServiceRequest kafala step 3 page 1 */}
      {/* ═══════════════════════════════════════ */}
      {tab === 0 && (()=>{
        const WORKER_STATUS=[{v:'valid',l:'صالح'},{v:'huroob',l:'هروب'},{v:'final_exit',l:'خروج نهائي'},{v:'absent',l:'منقطع عن العمل'}]
        const years=Array.from({length:60},(_,i)=>String(new Date().getFullYear()-40+i))
        const months=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))
        const daysFor=(y,m)=>{const n=y&&m?new Date(parseInt(y),parseInt(m),0).getDate():31;return Array.from({length:n},(_,i)=>String(i+1).padStart(2,'0'))}
        const HijriDate=({value,onChange,label,req})=>{
          const parts=value?value.split('-'):[]
          const [y,m,d]=[parts[0]||'',parts[1]||'',parts[2]||'']
          const setPart=(which,val)=>{const p=[y,m,d];if(which==='y')p[0]=val;if(which==='m')p[1]=val;if(which==='d')p[2]=val;onChange(p[0]&&p[1]&&p[2]?`${p[0]}-${p[1]}-${p[2]}`:`${p[0]}-${p[1]}-${p[2]}`)}
          return <div>
            <Lbl req={req}>{label}</Lbl>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,direction:'ltr'}}>
              <Sel value={y} onChange={v=>setPart('y',v)} options={years} placeholder="السنة"/>
              <Sel value={m} onChange={v=>setPart('m',v)} options={months} placeholder="الشهر"/>
              <Sel value={d} onChange={v=>setPart('d',v)} options={daysFor(y,m)} placeholder="اليوم"/>
            </div>
          </div>
        }
        return <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '18px 14px 14px', position: 'relative', marginTop: 10 }}>
          <div style={{ position: 'absolute', top: -9, right: 14, background: '#1a1a1a', padding: '0 8px', fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <User size={12} strokeWidth={2.2} />
            <span>بيانات العامل</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <Lbl req>رقم الإقامة</Lbl>
                {muqeemFetchStatus !== 'idle' && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 6, marginBottom: 4,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    ...(muqeemFetchStatus === 'loading' ? { background: 'rgba(52,131,180,.12)', color: C.blue } :
                       muqeemFetchStatus === 'ok' ? { background: 'rgba(39,160,70,.12)', color: '#27a046' } :
                       muqeemFetchStatus === 'unavailable' ? { background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.4)' } :
                       { background: 'rgba(192,57,43,.1)', color: C.red })
                  }}>
                    {muqeemFetchStatus === 'loading' && <><span style={{ width: 8, height: 8, border: '1.5px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', animation: 'mq-spin .7s linear infinite' }} /> جاري جلب البيانات…</>}
                    {muqeemFetchStatus === 'ok' && <>✓ تم جلب بيانات مقيم</>}
                    {muqeemFetchStatus === 'unavailable' && <>• خدمة مقيم غير متاحة</>}
                    {muqeemFetchStatus === 'error' && <>! تعذّر الاتصال بمقيم</>}
                  </span>
                )}
                <style>{`@keyframes mq-spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              <Inp value={f.iqama} onChange={v => set('iqama', v.replace(/\D/g,'').slice(0,10))} placeholder="2XXXXXXXXX" dir="ltr" maxLength={10}/>
            </div>
            <div>
              <Lbl>رقم الجوال</Lbl>
              <div style={{ display: 'flex', direction: 'ltr', border: '1px solid rgba(255,255,255,.05)', borderRadius: 9, overflow: 'hidden', background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', height: 42 }}>
                <div style={{ height: '100%', padding: '0 10px', background: 'rgba(255,255,255,.04)', borderRight: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: C.gold, flexShrink: 0 }}>+966</div>
                <input value={f.phone || ''} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))} placeholder="5X XXX XXXX" maxLength={9}
                  style={{ width: '100%', height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <DateField value={f.dob} onChange={v=>set('dob',v)} label="تاريخ الميلاد" req/>
            </div>
          </div>
        </div>
      })()}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 1: تفاصيل العامل */}
      {/* ═══════════════════════════════════════ */}
      {tab === 1 && (()=>{
        // Match review-tab visual: subtle blue panel, key-value rows, no colored boxes per field.
        const Row = ({ label, value, color }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, padding: '2px 0' }}>
            <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontWeight: 700, color: color || 'rgba(255,255,255,.92)', direction: 'ltr' }}>{value || '—'}</span>
          </div>
        )
        const Group = ({ title, Icon, children }) => (
          <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.1)', marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              {Icon && <Icon size={12} />}
              <span>{title}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18, rowGap: 2 }}>{children}</div>
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

        return (<div>
          <Group title="هوية العامل" Icon={User}>
            <Row label="اسم العامل" value={hrsdCheck.result?.name || f.name} />
            <Row label="رقم الإقامة" value={f.iqama} />
            <Row label="حالة العامل" value={hrsdCheck.result?.workerStatus} />
            <Row label="المهنة الحالية" value={muqeemData?.occupationAr} />
            <Row label="عدد مرات نقل الكفالة" value={typeof muqeemData?.sponsorChanges === 'number' ? String(muqeemData.sponsorChanges) : null} />
          </Group>

          <Group title="الإقامة" Icon={Building2}>
            <Row label="انتهاء الإقامة (ميلادي)" value={muqeemData?.iqamaExpiryGregorian || f.iqamaExpiry} />
            <Row label="انتهاء الإقامة (هجري)" value={muqeemData?.iqamaExpiryHijri ? muqeemData.iqamaExpiryHijri + ' هـ' : null} />
            <Row label="حالة الإقامة" value={iqamaExpiredFlag === null ? null : iqamaExpiredFlag ? 'منتهية' : 'سارية'} color={iqamaExpiredFlag ? C.red : iqamaExpiredFlag === false ? GREEN : null} />
            <Row label="حالة العامل في الجوازات" value={muqeemData?.statusAr} />
          </Group>

          <Group title="التأمين الصحي والعمر" Icon={Shield}>
            <Row label="حالة التأمين" value={insuredOk ? 'نشط' : 'غير نشط'} color={insuredOk ? GREEN : C.red} />
            <Row label="انتهاء التأمين" value={insuredOk ? insExpiry : null} color={insuredOk ? GREEN : null} />
            <Row label="العمر" value={ageYears !== null ? `${ageYears} سنة` : null} />
          </Group>
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
              <label style={{ fontSize: 11, fontWeight: 700, color: on ? c : 'var(--tx4)', fontFamily: F, transition: '.2s' }}>{label}</label>
              <button type="button" onClick={() => set(stateKey + '_on', !on)} style={{ width: 28, height: 16, borderRadius: 999, border: 'none', background: on ? c : 'rgba(255,255,255,.15)', cursor: 'pointer', position: 'relative', transition: '.2s', padding: 0, flexShrink: 0 }}>
                <span style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', background: '#fff', top: 2, right: on ? 2 : 14, transition: '.2s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', background: on ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.02)', border: `1px solid ${on ? c + '4d' : 'rgba(255,255,255,.05)'}`, borderRadius: 9, boxShadow: on ? 'inset 0 1px 2px rgba(0,0,0,.2)' : 'none', height: 36, opacity: on ? 1 : .5, transition: '.2s' }}>
              <input type="text" inputMode="decimal" disabled={!on} value={f[stateKey] || ''} onChange={e => set(stateKey, e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ flex: 1, minWidth: 0, height: '100%', padding: '0 10px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 12.5, fontWeight: 700, color: on ? 'var(--tx)' : 'var(--tx5)', outline: 'none', direction: 'ltr', textAlign: 'center' }} />
              <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 700, padding: '0 8px 0 4px', fontFamily: F, flexShrink: 0 }}>ريال</span>
            </div>
          </div>
        }
        const subtotal = grandTotal
        const discount = f.discount_on ? (parseFloat(f.discount) || 0) : 0
        const absher = f.absherBalance_on ? (parseFloat(f.absherBalance) || 0) : 0
        const total = Math.max(0, subtotal - discount - absher)
        // Card-based: each option is a tile with icon + label + control. Cleaner visual hierarchy.
        const Card = ({ Icon, label, hint, children, span }) => (
          <div style={{ gridColumn: span ? `span ${span}` : 'auto', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', flexDirection: 'column', gap: 6, transition: '.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(212,160,23,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }}>
                <Icon size={11} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)' }}>{label}</div>
                {hint && <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>{hint}</div>}
              </div>
            </div>
            <div>{children}</div>
          </div>
        )
        return <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:2}}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* تغيير المهنة */}
            <Card Icon={ArrowLeftRight} label="تغيير المهنة" hint={f.changeProfession ? 'رسم إضافي 10,000 ريال' : 'لا يوجد رسوم'} span={f.changeProfession ? 2 : 1}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: f.changeProfession ? '0 0 130px' : 1 }}>
                  <YesNo value={f.changeProfession} onChange={v => set('changeProfession', v)} />
                </div>
                {f.changeProfession && (
                  <Inp value={f.newOccupation || ''} onChange={v => set('newOccupation', v)} placeholder="المهنة الجديدة" />
                )}
              </div>
            </Card>

            {/* خصم رصيد أبشر */}
            <Card Icon={CreditCard} label="خصم رصيد أبشر" hint="يخصم من الإجمالي" span={f.absherBalance_on ? 2 : 1}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: f.absherBalance_on ? '0 0 130px' : 1 }}>
                  <YesNo value={f.absherBalance_on} onChange={v => set('absherBalance_on', v)} />
                </div>
                {f.absherBalance_on && (
                  <input type="text" inputMode="decimal" value={f.absherBalance || ''} onChange={e => set('absherBalance', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="المبلغ" style={{ ...sF, flex: 1, height: 40, direction: 'ltr', textAlign: 'center' }} />
                )}
              </div>
            </Card>

            {/* فترة التجديد */}
            <Card Icon={Calendar} label="فترة تجديد الإقامة" hint={`${f.renewalMonths || 12} أشهر × ${cfg.iqamaPerMonth || 54.2} ريال${iqamaInGracePeriod ? ' + غرامة' : ''}`} span={2}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['3', '6', '9', '12'].map(m => {
                  const sel = f.renewalMonths === m
                  return (
                    <button key={m} type="button" onClick={() => { set('renewalMonths', m); set('renewIqama', true) }}
                      style={{ flex: 1, height: 40, borderRadius: 8, border: `1.5px solid ${sel ? C.gold : 'rgba(255,255,255,.08)'}`, background: sel ? 'rgba(212,160,23,.14)' : 'rgba(0,0,0,.2)', color: sel ? C.gold : 'rgba(255,255,255,.6)', fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: '.18s' }}>
                      {m} <span style={{ fontSize: 10, opacity: .8 }}>أشهر</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: f.renewalAdd500 ? C.gold : 'rgba(255,255,255,.55)' }}>{iqamaInGracePeriod ? `غرامة ثانية (${cfg.iqamaFine2 || 1000} بدل ${cfg.iqamaFine1 || 500})` : 'لا توجد غرامة (الإقامة سارية)'}</span>
                <button type="button" onClick={() => set('renewalAdd500', !f.renewalAdd500)} style={{ width: 36, height: 20, borderRadius: 999, border: 'none', background: f.renewalAdd500 ? C.gold : 'rgba(255,255,255,.15)', cursor: 'pointer', position: 'relative', transition: '.2s', padding: 0 }}>
                  <span style={{ position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, right: f.renewalAdd500 ? 2 : 18, transition: '.2s' }} />
                </button>
              </div>
            </Card>

            {/* رسوم إضافية */}
            <Card Icon={Plus} label="رسوم إضافية" hint={f.extras.length ? `${f.extras.length} بنود مضافة` : 'اختياري'} span={2}>
              <div style={{ display: 'flex', gap: 5 }}>
                <input value={extraName} onChange={e => setExtraName(e.target.value)} placeholder="اسم الرسم (مثال: تأشيرة خروج)" style={{ ...sF, flex: 2, height: 36 }} />
                <input type="text" inputMode="decimal" value={extraAmount} onChange={e => setExtraAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="المبلغ" style={{ ...sF, flex: 1, height: 36, direction: 'ltr', textAlign: 'center' }} />
                <button onClick={addExtra} disabled={!extraName || !extraAmount} style={{ height: 36, width: 40, borderRadius: 8, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.12)', color: C.gold, fontFamily: F, fontSize: 18, fontWeight: 700, cursor: 'pointer', opacity: (!extraName||!extraAmount)?0.4:1, lineHeight: 1, padding: 0 }}>+</button>
              </div>
              {f.extras.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {f.extras.map((ex, i) => (
                    <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)', fontSize: 11 }}>
                      <span style={{ color: 'rgba(255,255,255,.85)', fontWeight: 600 }}>{ex.name}</span>
                      <span style={{ color: C.gold, fontWeight: 800 }}>{nm(ex.amount)}﷼</span>
                      <button onClick={() => removeExtra(i)} style={{ color: C.red, cursor: 'pointer', fontWeight: 700, background: 'transparent', border: 'none', fontSize: 14, padding: 0, lineHeight: 1, marginRight: -2 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Total — emphasized */}
          <div style={{ marginTop: 2, padding: '10px 16px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(212,160,23,.18), rgba(212,160,23,.06))', border: '1px solid rgba(212,160,23,.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 20px rgba(212,160,23,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(212,160,23,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                <Calculator size={13} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.gold }}>الإجمالي المتوقع</span>
            </div>
            <span style={{ fontSize: 19, fontWeight: 900, color: C.gold }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(total.toFixed(2))}</span> <span style={{ fontSize: 12, fontWeight: 700 }}>ريال</span></span>
          </div>
        </div>
      })()}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 3: مراجعة */}
      {/* ═══════════════════════════════════════ */}
      {tab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Worker summary */}
          <div style={{ padding: '7px 12px', borderRadius: 10, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.1)' }}>
            {(() => {
              const addMonths = (dateStr, months) => {
                if (!dateStr) return null
                const d = new Date(dateStr); if (isNaN(d)) return null
                d.setMonth(d.getMonth() + months)
                return d.toISOString().slice(0, 10)
              }
              const renewalMonthsNum = f.renewIqama ? (parseInt(f.renewalMonths) || 0) : 0
              const expectedExpiry = addMonths(f.iqamaExpiry, renewalMonthsNum)
              const monthsFromToday = (() => {
                if (!expectedExpiry) return null
                const d = new Date(expectedExpiry), now = new Date()
                return Math.round((d - now) / (30 * 86400000))
              })()
              const cell = (l, v, vColor) => (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>{l}</span>
                  <span style={{ fontWeight: 700, color: vColor || 'rgba(255,255,255,.92)' }}>{v}</span>
                </div>
              )
              return (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}><User size={12} /> بيانات العامل</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18, rowGap: 2 }}>
                    {cell('اسم العامل', hrsdCheck.result?.name || f.name || '—')}
                    {cell('رقم الإقامة', f.iqama || '—')}
                    {cell('رقم الجوال', f.phone ? '+966' + f.phone : '—')}
                    {cell('انتهاء الإقامة الحالي', f.iqamaExpiry || '—')}
                    {cell('انتهاء الإقامة المتوقع', expectedExpiry || '—', expectedExpiry ? C.gold : null)}
                    {cell('عدد الأشهر من اليوم', monthsFromToday !== null ? `${monthsFromToday} شهر` : '—', monthsFromToday !== null && monthsFromToday > 0 ? C.ok : (monthsFromToday !== null ? C.red : null))}
                  </div>
                </>
              )
            })()}
          </div>


          {/* Cost summary */}
          <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(39,160,70,.04)', border: '1px solid rgba(39,160,70,.1)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.ok, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Calculator size={13} /> ملخص التكاليف</div>
            {(() => {
              const items = [['رسوم نقل الكفالة', transferFee], ['تجديد الإقامة', iqamaRenewalFee], ['رخصة العمل', workPermitFee], ...(profChangeFee > 0 ? [['تغيير المهنة', profChangeFee]] : []), ['التأمين الطبي', medicalFee], ['رسوم المكتب', officeFee], ...f.extras.map(ex => [ex.name, Number(ex.amount)])]
              const subtotal = items.reduce((s, [, v]) => s + (Number(v) || 0), 0)
              const absherOn = !!f.absherBalance_on
              const absher = absherOn ? (parseFloat(f.absherBalance) || 0) : 0
              const total = Math.max(0, subtotal - absher)
              const absherClr = '#2ea043'
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* Items in 2 columns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 2 }}>
                    {items.map(([l, v], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: 12 }}>
                        <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>{l}</span>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.92)' }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(v)}</span> ريال</span>
                      </div>
                    ))}
                  </div>
                  {/* Subtotal */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 2px', fontSize: 12 }}>
                    <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>إجمالي الرسوم</span>
                    <span style={{ fontWeight: 800, color: 'var(--tx)', fontSize: 13 }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(subtotal)}</span> ريال</span>
                  </div>
                  {/* Absher discount — aligned with subtotal row style */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: absherOn ? absherClr : 'var(--tx2)', fontWeight: 700, transition: '.2s' }}>رصيد أبشر (خصم)</span>
                      <button type="button" onClick={() => set('absherBalance_on', !absherOn)} style={{ width: 26, height: 15, borderRadius: 999, border: 'none', background: absherOn ? absherClr : 'rgba(255,255,255,.15)', cursor: 'pointer', position: 'relative', transition: '.2s', padding: 0, flexShrink: 0 }}>
                        <span style={{ position: 'absolute', width: 11, height: 11, borderRadius: '50%', background: '#fff', top: 2, right: absherOn ? 2 : 13, transition: '.2s' }} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', width: 130, background: absherOn ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.02)', border: `1px solid ${absherOn ? absherClr + '4d' : 'rgba(255,255,255,.05)'}`, borderRadius: 7, height: 28, opacity: absherOn ? 1 : .5, transition: '.2s' }}>
                      <input type="text" inputMode="decimal" disabled={!absherOn} value={f.absherBalance || ''} onChange={e => set('absherBalance', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ flex: 1, minWidth: 0, height: '100%', padding: '0 8px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 12, fontWeight: 700, color: absherOn ? 'var(--tx)' : 'var(--tx5)', outline: 'none', direction: 'ltr', textAlign: 'center' }} />
                      <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 700, padding: '0 8px', flexShrink: 0 }}>ريال</span>
                    </div>
                  </div>
                  {/* Grand total */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0', marginTop: 2, borderTop: '1px dashed rgba(212,160,23,.25)' }}>
                    <span style={{ color: C.gold, fontWeight: 800, fontSize: 13 }}>الإجمالي</span>
                    <span style={{ fontWeight: 900, color: C.gold, fontSize: 16 }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(total)}</span> ريال</span>
                  </div>
                </div>
              )
            })()}
          </div>

        </div>
      )}

      </div>{/* end scrollable */}

      {/* ═══ Footer Navigation — register-modal style ═══ */}
      <style>{`.kc-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.kc-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.kc-nav-btn:hover .nav-ico{background:#D4A017;color:#000}.kc-nav-btn.dir-fwd:hover .nav-ico{transform:translateX(-4px)}.kc-nav-btn.dir-back:hover .nav-ico{transform:translateX(4px)}.kc-nav-btn:disabled{opacity:.5;cursor:not-allowed}`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px 12px', flexShrink: 0 }}>
        {tab > 0 ? (
          <button onClick={() => setTab(tab - 1)} className="kc-nav-btn dir-fwd">
            <span className="nav-ico"><ChevronRight size={14} strokeWidth={2.5} /></span>
            <span>السابق</span>
          </button>
        ) : <span />}
        {tab < 3 ? (
          <button onClick={tryNextTab} className="kc-nav-btn dir-back">
            <span>التالي</span>
            <span className="nav-ico"><ChevronLeft size={14} strokeWidth={2.5} /></span>
          </button>
        ) : <span />}
      </div>

      {/* ═══ CHI Insurance Check Overlay ═══ */}
      {insCheck.phase !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16, fontFamily: F }} dir="rtl">
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', background: '#141518', borderRadius: 16, border: '1px solid rgba(212,160,23,.18)', padding: 22, boxShadow: '0 28px 70px rgba(0,0,0,.6)', position: 'relative' }}>
            <button onClick={closeInsCheck} style={{ position: 'absolute', top: 12, left: 12, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>

            <div style={{ textAlign: 'right', marginBottom: 16, paddingLeft: 36 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
                <Shield size={16} style={{ color: C.gold }} />
                <span>التحقق — الضمان الصحي</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>أدخل رمز التحقق الظاهر في الصورة</div>
            </div>

            {insCheck.phase === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(212,160,23,.15)`, borderTopColor: C.gold, borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>جاري الاتصال بمنصّة CHI…</div>
                <style>{`@keyframes kc-spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {insCheck.phase === 'captcha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', textAlign: 'right' }}>أدخل رمز التحقق الظاهر بالصورة</div>
                <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', borderRadius: 10, padding: 10, border: '1px solid rgba(255,255,255,.06)' }}>
                  {insCheck.captchaImage ? <img src={insCheck.captchaImage} alt="captcha" style={{ height: 56 }} /> : null}
                </div>
                <input
                  value={insCheck.captchaInput}
                  onChange={e => setInsCheck(c => ({ ...c, captchaInput: e.target.value.slice(0, 6) }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitInsCaptcha() }}
                  placeholder="______"
                  autoFocus
                  maxLength={6}
                  style={{ height: 46, padding: '0 14px', border: '1px solid rgba(212,160,23,.25)', borderRadius: 9, fontFamily: F, fontSize: 18, fontWeight: 700, color: 'var(--tx)', outline: 'none', background: 'rgba(0,0,0,.25)', textAlign: 'center', letterSpacing: '6px', direction: 'ltr' }}
                />
                {insCheck.error && <div style={{ fontSize: 11, color: C.red, textAlign: 'right' }}>{insCheck.error}</div>}
                <button
                  onClick={submitInsCaptcha}
                  disabled={!insCheck.captchaInput || insCheck.captchaInput.length < 3}
                  style={{ height: 44, borderRadius: 10, border: 'none', background: C.gold, color: '#000', fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: (!insCheck.captchaInput || insCheck.captchaInput.length < 3) ? 0.5 : 1 }}
                >تحقق</button>
                <button onClick={skipInsAndAdvance} style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>تخطّي والمتابعة</button>
              </div>
            )}

            {insCheck.phase === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(212,160,23,.15)`, borderTopColor: C.gold, borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>جاري التحقق…</div>
                <style>{`@keyframes kc-spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}

            {insCheck.phase === 'result' && insCheck.result && (() => {
              const r = insCheck.result
              const insured = r.status === 'insured'
              const notIns = r.status === 'not_insured'
              const unknown = r.status === 'unknown'
              const color = insured ? '#27a046' : notIns ? C.red : '#d4a017'
              const icon = insured ? <CheckCircle2 size={32} /> : notIns ? <X size={32} /> : <AlertCircle size={32} />
              const title = insured ? 'التأمين الصحي ساري' : notIns ? 'لا يوجد تأمين صحي نشط' : 'نتيجة غير واضحة'
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                    <div style={{ width: 62, height: 62, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color }}>{title}</div>
                    {r.cached && <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)' }}>• من الكاش (آخر 24 ساعة)</div>}
                  </div>

                  {insured && r.expiryDate && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ background: 'rgba(39,160,70,.06)', border: '1px solid rgba(39,160,70,.2)', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'rgba(255,255,255,.8)' }}>
                        <span style={{ color: 'rgba(255,255,255,.5)' }}>تاريخ الانتهاء</span>
                        <span style={{ fontWeight: 700 }}>{r.expiryDate}{typeof r.daysLeft === 'number' ? <span style={{ color: 'rgba(255,255,255,.4)', fontWeight: 500, marginRight: 6, fontSize: 11 }}> ({r.daysLeft} يوم)</span> : null}</span>
                      </div>
                      {r.waived ? (
                        <div style={{ background: 'rgba(39,160,70,.1)', border: '1px solid rgba(39,160,70,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 11.5, color: '#27a046', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                          <CheckCircle2 size={14} />
                          <span>تم إعفاء رسوم التأمين الطبي (التأمين سارٍ أكثر من {cfg.medicalGraceMonths || 2} شهر و{cfg.medicalGraceDays || 7} أيام)</span>
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.25)', borderRadius: 10, padding: '10px 14px', fontSize: 11.5, color: C.gold, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                          <AlertCircle size={14} />
                          <span>سيتم احتساب رسوم التأمين الطبي حسب الفئة العمرية (المتبقي أقل من {cfg.medicalGraceMonths || 2} شهر و{cfg.medicalGraceDays || 7} أيام)</span>
                        </div>
                      )}
                    </div>
                  )}

                  {notIns && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {r.detail && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.2)', borderRadius: 8, padding: '10px 12px', textAlign: 'right', lineHeight: 1.7 }}>
                          {r.detail}
                        </div>
                      )}
                      <div style={{ background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.25)', borderRadius: 10, padding: '10px 14px', fontSize: 11.5, color: C.gold, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                        <AlertCircle size={14} />
                        <span>سيتم احتساب رسوم التأمين الطبي حسب الفئة العمرية</span>
                      </div>
                    </div>
                  )}

                  {unknown && (r.debug?.panelText || r.debug?.bodyText) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {r.debug?.panelText && (
                        <>
                          <div style={{ fontSize: 10, color: '#d4a017', textAlign: 'right' }}>محتوى نتيجة CHI:</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.2)', padding: 10, borderRadius: 8, maxHeight: 120, overflowY: 'auto', textAlign: 'right', direction: 'rtl', lineHeight: 1.6 }}>
                            {r.debug.panelText}
                          </div>
                        </>
                      )}
                      {r.debug?.bodyText && (
                        <details style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                          <summary style={{ cursor: 'pointer', textAlign: 'right' }}>عرض النص الكامل (للتحليل)</summary>
                          <div style={{ background: 'rgba(0,0,0,.3)', padding: 10, borderRadius: 8, maxHeight: 200, overflowY: 'auto', textAlign: 'right', direction: 'rtl', marginTop: 6 }}>{r.debug.bodyText}</div>
                        </details>
                      )}
                    </div>
                  )}

                  {/* ─── Source success summary (no details, those appear in next step) ─── */}
                  {r.muqeem && (
                    <div style={{ background: 'rgba(39,160,70,.06)', border: '1px solid rgba(39,160,70,.25)', borderRadius: 10, padding: '8px 12px', fontSize: 11.5, color: '#27a046', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <CheckCircle2 size={14} />
                      <span>تم جلب البيانات من مقيم بنجاح</span>
                    </div>
                  )}
                  {hrsdCheck.result && hrsdCheck.result.status === 'found' && (
                    <div style={{ background: 'rgba(39,160,70,.06)', border: '1px solid rgba(39,160,70,.25)', borderRadius: 10, padding: '8px 12px', fontSize: 11.5, color: '#27a046', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <CheckCircle2 size={14} />
                      <span>تم جلب البيانات من وزارة العمل بنجاح</span>
                    </div>
                  )}

                  {/* Continue button shown only when both checks complete (HRSD captcha auto-opens after CHI) */}
                  {hrsdCheck.phase === 'result' && (
                    <button onClick={skipInsAndAdvance} style={{ height: 44, borderRadius: 10, border: 'none', background: C.gold, color: '#000', fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                      {insured ? 'متابعة للخطوة التالية' : 'متابعة على أي حال'}
                    </button>
                  )}
                  {hrsdCheck.phase === 'idle' && hrsdCheck.result === null && (
                    <button onClick={skipInsAndAdvance} style={{ height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'transparent', color: 'rgba(255,255,255,.4)', fontFamily: F, fontSize: 11, cursor: 'pointer' }}>
                      تخطّي وزارة العمل والمتابعة
                    </button>
                  )}
                </div>
              )
            })()}

            {insCheck.phase === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}><AlertCircle size={28} /></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.red, textAlign: 'center' }}>تعذّر التحقق من التأمين</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>{insCheck.error}</div>
                </div>
                <button onClick={startInsuranceCheck} style={{ height: 42, borderRadius: 10, border: '1px solid rgba(212,160,23,.3)', background: 'rgba(212,160,23,.1)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>إعادة المحاولة</button>
                <button onClick={skipInsAndAdvance} style={{ height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: 'rgba(255,255,255,.5)', fontFamily: F, fontSize: 11, cursor: 'pointer' }}>تخطّي والمتابعة</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ HRSD (Ministry of Labor) CAPTCHA Overlay ═══ */}
      {hrsdCheck.phase !== 'idle' && hrsdCheck.phase !== 'result' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100, padding: 16, fontFamily: F }} dir="rtl">
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', background: '#141518', borderRadius: 16, border: '1px solid rgba(155,89,182,.3)', padding: 22, boxShadow: '0 28px 70px rgba(0,0,0,.6)', position: 'relative' }}>
            <button onClick={closeHrsdCheck} style={{ position: 'absolute', top: 12, left: 12, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>

            <div style={{ textAlign: 'right', marginBottom: 16, paddingLeft: 36 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
                <Briefcase size={16} style={{ color: '#9b59b6' }} />
                <span>التحقق — وزارة العمل</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.4)', marginTop: 4 }}>أدخل رمز التحقق الظاهر في الصورة</div>
            </div>

            {hrsdCheck.phase === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(155,89,182,.15)`, borderTopColor: '#9b59b6', borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>جاري الاتصال بوزارة العمل…</div>
              </div>
            )}

            {hrsdCheck.phase === 'captcha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', textAlign: 'right' }}>أدخل رمز التحقق الظاهر بالصورة</div>
                <div style={{ display: 'flex', justifyContent: 'center', background: '#fff', borderRadius: 10, padding: 10, border: '1px solid rgba(255,255,255,.06)' }}>
                  {hrsdCheck.captchaImage ? <img src={hrsdCheck.captchaImage} alt="captcha" style={{ height: 56 }} /> : null}
                </div>
                <input
                  value={hrsdCheck.captchaInput}
                  onChange={e => setHrsdCheck(c => ({ ...c, captchaInput: e.target.value.slice(0, 6) }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitHrsdCaptcha() }}
                  placeholder="______"
                  autoFocus maxLength={6}
                  style={{ height: 46, padding: '0 14px', border: '1px solid rgba(155,89,182,.35)', borderRadius: 9, fontFamily: F, fontSize: 18, fontWeight: 700, color: 'var(--tx)', outline: 'none', background: 'rgba(0,0,0,.25)', textAlign: 'center', letterSpacing: '6px', direction: 'ltr' }}
                />
                {hrsdCheck.error && <div style={{ fontSize: 11, color: C.red, textAlign: 'right' }}>{hrsdCheck.error}</div>}
                <button onClick={submitHrsdCaptcha} disabled={!hrsdCheck.captchaInput || hrsdCheck.captchaInput.length < 3} style={{ height: 44, borderRadius: 10, border: 'none', background: '#9b59b6', color: '#fff', fontFamily: F, fontSize: 13, fontWeight: 800, cursor: 'pointer', opacity: (!hrsdCheck.captchaInput || hrsdCheck.captchaInput.length < 3) ? 0.5 : 1 }}>تحقق</button>
                <button onClick={closeHrsdCheck} style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>إلغاء</button>
              </div>
            )}

            {hrsdCheck.phase === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: `3px solid rgba(155,89,182,.15)`, borderTopColor: '#9b59b6', borderRadius: '50%', animation: 'kc-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>جاري التحقق…</div>
              </div>
            )}

            {hrsdCheck.phase === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}><AlertCircle size={28} /></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.red, textAlign: 'center' }}>تعذّر الاستعلام</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>{hrsdCheck.error}</div>
                </div>
                <button onClick={startHrsdCheck} style={{ height: 42, borderRadius: 10, border: '1px solid rgba(155,89,182,.3)', background: 'rgba(155,89,182,.1)', color: '#9b59b6', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>إعادة المحاولة</button>
                <button onClick={closeHrsdCheck} style={{ height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: 'rgba(255,255,255,.5)', fontFamily: F, fontSize: 11, cursor: 'pointer' }}>إلغاء</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
    </div></div>
  )
}
