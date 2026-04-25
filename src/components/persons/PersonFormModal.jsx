import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { X, User, Link2, Save, Building2, Briefcase, Users as UsersIcon, HardHat, Phone, Mail, CreditCard, Calendar, MapPin, ChevronDown, ChevronRight, Check, FileText } from 'lucide-react'
import * as personsService from '../../services/personsService.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

// Shared input style — borderless, uses subtle inset shadow instead
const sF = {
  width: '100%', height: 42, padding: '0 14px',
  border: '1px solid transparent', borderRadius: 9,
  fontFamily: F, fontSize: 13, fontWeight: 600,
  color: 'var(--tx)', outline: 'none',
  background: 'rgba(0,0,0,.18)', boxSizing: 'border-box',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
  textAlign: 'center', transition: '.2s'
}

// Label component — identical to KafalaCalculator's Lbl
const Lbl = ({ children, req }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }}>
    {children}{req && <span style={{ color: C.red }}> *</span>}
  </div>
)

// Input filters for Arabic / English-only text
const AR_CHARS_RE = /[^\u0600-\u06FF\s]/g
const EN_CHARS_RE = /[^a-zA-Z\s]/g
const countWords = s => String(s || '').trim().split(/\s+/).filter(Boolean).length

// Calendar constants (matches KafalaCalculator's DateField)
const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const DAY_ABBR_AR = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت']
const pad2 = n => String(n).padStart(2, '0')
const fmtCalendarDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`

// CalendarPopup — dark themed popup with month/year nav, day grid, today/clear footer
const CalendarPopup = ({ value, onPick, onClose, anchor }) => {
  const today = new Date()
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').map(Number) : null
  const initial = parsed ? { y: parsed[0], m: parsed[1] - 1 } : { y: today.getFullYear(), m: today.getMonth() }
  const [cur, setCur] = useState(initial)
  const firstDay = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate()
  const prevMonth = () => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const isToday = (y, m, d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d
  const navBtn = { width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: '.15s' }
  const POPUP_H = 310, POPUP_W = Math.max(260, anchor.width)
  const spaceBelow = window.innerHeight - anchor.bottom
  const flipUp = spaceBelow < POPUP_H + 10
  const top = flipUp ? Math.max(8, anchor.top - POPUP_H - 6) : anchor.bottom + 6
  const left = Math.max(8, Math.min(window.innerWidth - POPUP_W - 8, anchor.left + anchor.width / 2 - POPUP_W / 2))
  return ReactDOM.createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }} />
      <div style={{ position: 'fixed', top, left, width: POPUP_W, background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12, zIndex: 3001, boxShadow: '0 12px 40px rgba(0,0,0,.7)', fontFamily: F, direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, direction: 'ltr' }}>
          <button type="button" onClick={prevMonth} style={navBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{MONTH_NAMES_AR[cur.m]} {cur.y}</div>
          <button type="button" onClick={nextMonth} style={navBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.4)', marginBottom: 4 }}>
          {DAY_ABBR_AR.map(d => <div key={d} style={{ textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const s = fmtCalendarDate(cur.y, cur.m, d)
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
          <button type="button" onClick={() => { const t = new Date(); onPick(fmtCalendarDate(t.getFullYear(), t.getMonth(), t.getDate())); onClose() }} style={{ fontSize: 11, color: C.gold, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 800, padding: '4px 8px' }}>اليوم</button>
          <button type="button" onClick={() => { onPick(''); onClose() }} style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 700, padding: '4px 8px' }}>مسح</button>
        </div>
      </div>
    </>, document.body)
}

// DateField — single text input (yyyy-mm-dd typable) with a calendar icon that opens CalendarPopup
const DateField = ({ value, onChange, error }) => {
  const wrapRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value])
  const handleType = t => {
    let v = t.replace(/[^0-9-]/g, '')
    if (v.length > 4 && v[4] !== '-') v = v.slice(0, 4) + '-' + v.slice(4)
    if (v.length > 7 && v[7] !== '-') v = v.slice(0, 7) + '-' + v.slice(7)
    v = v.slice(0, 10)
    if (v.length >= 7) {
      const m = parseInt(v.slice(5, 7), 10)
      if (m > 12) v = v.slice(0, 5) + '12' + v.slice(7)
      else if (m === 0) v = v.slice(0, 5) + '01' + v.slice(7)
    }
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
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <input type="text" value={text} onChange={e => handleType(e.target.value)} placeholder="yyyy-mm-dd"
        style={{ ...sF, direction: 'ltr', textAlign: 'center', padding: '0 40px 0 14px', letterSpacing: '.5px', cursor: 'text',
          borderColor: error ? C.red + '80' : 'transparent' }} />
      <button type="button" onClick={openPicker} aria-label="calendar"
        style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, border: 'none', background: pickerOpen ? 'rgba(212,160,23,.12)' : 'transparent', cursor: 'pointer', color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 7, transition: '.15s' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </button>
      {pickerOpen && anchor && (
        <CalendarPopup value={value} onPick={onChange} onClose={() => setPickerOpen(false)} anchor={anchor} />
      )}
    </div>
  )
}

// Flag image from flagcdn.com (expects ISO alpha-2 code like 'SA', 'PK', 'IN')
const Flag = ({ code, size = 18 }) => {
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      width={size}
      height={Math.round(size * 0.75)}
      alt=""
      style={{ borderRadius: 2, objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    />
  )
}

// KCard — gold-outlined fieldset with label cut-out at top-right (matches KafalaCalculator's KCard)
const KCard = ({ Icon, label, children }) => (
  <div style={{
    borderRadius: 12,
    border: '1.5px solid rgba(212,160,23,.35)',
    padding: '18px 14px 14px',
    position: 'relative',
    marginTop: 10,
    transition: '.2s'
  }}>
    <div style={{
      position: 'absolute', top: -9, right: 14,
      background: '#1a1a1a', padding: '0 8px',
      fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F,
      display: 'inline-flex', alignItems: 'center', gap: 6
    }}>
      {Icon && <Icon size={12} strokeWidth={2.2} />}
      <span>{label}</span>
    </div>
    <div>{children}</div>
  </div>
)

// Dropdown with portal + search (matches KafalaCalculator's OccSelect pattern)
// `renderCell` lets the caller fully customise a row (used for flag+label in nationality).
export const Dropdown = ({ value, onChange, options, placeholder, getKey, getLabel, getSub, searchable = true, renderCell, renderSelected, error }) => {
  const btnRef = useRef(null)
  const portalRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 300 })
  const getK = getKey || (o => o)
  const getL = getLabel || (o => String(o))
  const filtered = q
    ? options.filter(o => getL(o).toLowerCase().includes(q.toLowerCase()) || (getSub?.(o) || '').toLowerCase().includes(q.toLowerCase()))
    : options

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - 16
      const above = r.top - 16
      // Only flip up when there's truly no room below; otherwise stay attached to the field.
      const flipUp = below < 120 && above > below + 40
      const maxH = Math.max(120, Math.min(260, flipUp ? above : below))
      setPos({ top: flipUp ? r.top - maxH - 4 : r.bottom + 4, left: r.left, width: r.width, maxH })
    }
    setQ('')
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const onDoc = e => {
      if (btnRef.current && btnRef.current.contains(e.target)) return
      if (portalRef.current && portalRef.current.contains(e.target)) return
      setOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const selected = options.find(o => getK(o) === value)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{
          ...sF, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, color: selected ? 'var(--tx)' : 'var(--tx5)',
          border: `1px solid ${error ? C.red + '80' : 'transparent'}`,
          padding: '0 32px', position: 'relative'
        }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: selected ? 700 : 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {selected ? (renderSelected ? renderSelected(selected) : getL(selected)) : (placeholder || '...')}
        </span>
        <ChevronDown size={12} color={C.gold} strokeWidth={2.5}
          style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }} />
      </button>
      {open && ReactDOM.createPortal(
        <div ref={portalRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
          background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 10, maxHeight: pos.maxH,
          display: 'flex', flexDirection: 'column',
          zIndex: 3000, boxShadow: '0 12px 40px rgba(0,0,0,.7)',
          overflow: 'hidden', direction: 'rtl', fontFamily: F
        }}>
          <style>{`.px-dd-scroll::-webkit-scrollbar{width:0;display:none}.px-dd-scroll{scrollbar-width:none;-ms-overflow-style:none}`}</style>
          {searchable && options.length > 5 && (
            <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0, position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                style={{
                  width: '100%', height: 32, padding: '0 34px 0 10px',
                  border: '1px solid transparent', borderRadius: 7,
                  background: 'rgba(0,0,0,.2)', fontFamily: F, fontSize: 12, fontWeight: 600,
                  color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', textAlign: 'center'
                }} />
            </div>
          )}
          <div className="px-dd-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>لا توجد نتائج</div>}
            {filtered.slice(0, 200).map(o => {
              const k = getK(o)
              const isSel = value === k
              return (
                <div key={k} onClick={() => { onChange(k, o); setOpen(false); setQ('') }}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,.03)',
                    background: isSel ? 'rgba(212,160,23,.1)' : 'transparent',
                    transition: '.12s', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 2
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(212,160,23,.1)' }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent' }}>
                  {renderCell ? renderCell(o, isSel) : (
                    <span style={{ fontSize: 13, fontWeight: isSel ? 800 : 700, color: isSel ? C.gold : 'rgba(255,255,255,.92)', textAlign: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{getL(o)}</span>
                  )}
                  {!renderCell && getSub && getSub(o) && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textAlign: 'center' }}>{getSub(o)}</span>}
                </div>
              )
            })}
          </div>
        </div>, document.body
      )}
    </div>
  )
}

// ID types and genders are loaded from lookup_items (categories 'id_type' / 'gender')
// and passed in as props. Inline arrays kept only as a fallback if props are empty.

// Stored phones may be "+966501122334" (international) or "0501122334" (domestic).
// Modal shows 9 digits (no leading zero / +966) in a masked input like KafalaCalculator.
export function normalizePhoneFor9Digit(raw) {
  if (!raw) return ''
  let v = String(raw).replace(/\s+/g, '').replace(/^\+/, '')
  if (v.startsWith('966')) v = v.slice(3)
  if (v.startsWith('0')) v = v.slice(1)
  return v.slice(0, 9)
}

export default function PersonFormModal({ open, onClose, personId, onSaved, toast, countries, branches, idTypes, genders, profile }) {
  const isEdit = !!personId

  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [err, setErr] = useState({})

  const [f, setF] = useState({
    name_ar: '', name_en: '',
    id_type_id: null, id_number: '',
    nationality_id: null, gender_id: null, date_of_birth: '',
    phone: '', secondary_phone: ''
  })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // Nationality-driven rules for ID type:
  // - Saudi (country code 'SA') → auto-pick "هوية وطنية" and lock (only one option shown)
  // - Non-Saudi → only "إقامة" or "رقم حدود" are selectable (national ID is hidden)
  const selectedNationality = (countries || []).find(c => c.id === f.nationality_id)
  const isSaudi = selectedNationality && (selectedNationality.code || '').toUpperCase() === 'SA'
  const nationalIdItem = (idTypes || []).find(t => t.code === 'national_id')
  const filteredIdTypes = (idTypes || []).filter(t => isSaudi ? t.code === 'national_id' : t.code !== 'national_id')

  // Apply the rule when nationality changes
  useEffect(() => {
    if (!f.nationality_id) return
    if (isSaudi) {
      // Force national_id
      if (nationalIdItem && f.id_type_id !== nationalIdItem.id) {
        setF(p => ({ ...p, id_type_id: nationalIdItem.id }))
      }
    } else {
      // Non-Saudi can't have national_id — clear it if set
      if (nationalIdItem && f.id_type_id === nationalIdItem.id) {
        setF(p => ({ ...p, id_type_id: null }))
      }
    }
  }, [f.nationality_id, isSaudi, nationalIdItem?.id])

  useEffect(() => {
    if (!open) return
    setTab(0); setErr({}); setSaving(false); setSuccess(false)
    if (!isEdit) {
      setF({
        name_ar: '', name_en: '',
        id_type_id: null, id_number: '',
        nationality_id: null, gender_id: null, date_of_birth: '',
        phone: '', secondary_phone: ''
      })
      return
    }
    ;(async () => {
      const { person } = await personsService.getPerson(personId)
      if (person) {
        setF({
          name_ar: person.name_ar || '',
          name_en: person.name_en || '',
          id_type_id: person.id_type_id || null,
          id_number: person.id_number || '',
          nationality_id: person.nationality_id || null,
          gender_id: person.gender_id || null,
          date_of_birth: person.date_of_birth || '',
          phone: normalizePhoneFor9Digit(person.phone_primary),
          secondary_phone: normalizePhoneFor9Digit(person.phone_secondary)
        })
      }
    })()
  }, [open, personId, isEdit])

  const selectedIdType = (idTypes || []).find(t => t.id === f.id_type_id)
  const idTypeCode = selectedIdType?.code
  const idFieldLabel = idTypeCode === 'iqama' ? 'رقم الإقامة'
    : idTypeCode === 'border_number' ? 'رقم الحدود'
    : 'رقم الهوية'

  // Only the FIRST error's field gets highlighted and its message shown in the footer.
  // Field order here matches the visual order so the user is taken to fix them top-down.
  const errFieldOrder = [
    'name_ar', 'name_en', 'gender_id', 'date_of_birth',
    'nationality_id', 'id_type_id', 'id_number', 'phone'
  ]
  const firstErrKey = errFieldOrder.find(k => err[k])
  const firstErrMsg = firstErrKey ? err[firstErrKey] : ''

  const validate = async () => {
    const e = {}

    // Arabic name: required, 2+ words, Arabic characters only
    const ar = f.name_ar.trim()
    if (!ar) e.name_ar = 'الاسم بالعربي مطلوب'
    else if (countWords(ar) < 2) e.name_ar = 'يجب أن يتكون من كلمتين أو أكثر'
    else if (!/^[\u0600-\u06FF\s]+$/.test(ar)) e.name_ar = 'يجب أن يحتوي على أحرف عربية فقط'

    // English name: required, 2+ words, English only
    const en = f.name_en?.trim() || ''
    if (!en) e.name_en = 'الاسم بالإنجليزي مطلوب'
    else if (countWords(en) < 2) e.name_en = 'يجب أن يتكون من كلمتين أو أكثر'
    else if (!/^[a-zA-Z\s]+$/.test(en)) e.name_en = 'يجب أن يحتوي على أحرف إنجليزية فقط'

    // Gender, Nationality, DOB, ID type — all required
    if (!f.gender_id) e.gender_id = 'الجنس مطلوب'
    if (!f.nationality_id) e.nationality_id = 'الجنسية مطلوبة'
    if (!f.date_of_birth) e.date_of_birth = 'تاريخ الميلاد مطلوب'
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date_of_birth)) e.date_of_birth = 'صيغة غير صحيحة'
    if (!f.id_type_id) e.id_type_id = 'نوع الهوية مطلوب'

    // Phone: required, exactly 9 digits starting with 5, must be unique
    const p = (f.phone || '').replace(/\s+/g, '')
    if (!p) e.phone = 'رقم الجوال مطلوب'
    else if (!/^5\d{8}$/.test(p)) e.phone = 'يبدأ بـ 5 ويتكون من 9 أرقام'
    else {
      const phoneTaken = await personsService.isPhoneTaken('+966' + p, isEdit ? personId : null)
      if (phoneTaken) e.phone = 'رقم الجوال مستخدم لشخص آخر'
    }

    // ID number: required, 10 digits, prefix rules based on id_type
    if (!f.id_number) e.id_number = 'الرقم مطلوب'
    else if (f.id_number.length !== 10) e.id_number = 'الرقم يجب أن يكون 10 خانات'
    else if (idTypeCode === 'national_id' && !f.id_number.startsWith('1')) e.id_number = 'رقم الهوية الوطنية يبدأ بـ 1'
    else if (idTypeCode === 'iqama' && !f.id_number.startsWith('2')) e.id_number = 'رقم الإقامة يبدأ بـ 2'
    else {
      const taken = await personsService.isIdNumberTaken(f.id_number, isEdit ? personId : null)
      if (taken) e.id_number = 'الرقم مستخدم لشخص آخر'
    }
    setErr(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    const ok = await validate()
    if (!ok) {
      setTab(0)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name_ar: f.name_ar.trim(),
        name_en: f.name_en?.trim() || null,
        id_type_id: f.id_type_id || null,
        id_number: f.id_number?.trim() || null,
        nationality_id: f.nationality_id || null,
        gender_id: f.gender_id || null,
        date_of_birth: f.date_of_birth || null,
        phone_primary: f.phone ? '+966' + f.phone : null,
        phone_secondary: f.secondary_phone ? '+966' + f.secondary_phone : null,
      }
      const saved = isEdit
        ? await personsService.updatePerson(personId, payload)
        : await personsService.createPerson(payload)
      onSaved?.(saved)
      setSuccess(true)
      setTimeout(() => { onClose?.() }, 1600)
    } catch (e) {
      toast?.('خطأ: ' + (e.message || 'فشل الحفظ'))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const modalOverlay = {
    position: 'fixed', inset: 0,
    background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16
  }
  const modalBox = {
    background: '#1a1a1a', borderRadius: 18,
    width: 720, maxWidth: '95vw', maxHeight: '95vh',
    display: 'flex', flexDirection: 'column', overflow: 'visible',
    boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)'
  }
  const headerBar = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 20px 6px', flexShrink: 0, fontFamily: F, direction: 'rtl'
  }

  const tabs = [
    { id: 'info', title: 'معلومات أساسية', Icon: User },
    ...(isEdit ? [{ id: 'roles', title: 'الأدوار والعلاقات', Icon: Link2 }] : []),
  ]

  if (success) {
    return ReactDOM.createPortal(
      <div style={modalOverlay}>
        <div style={{ ...modalBox, width: 420, padding: '48px 32px' }}>
          <style>{`
            @keyframes pxSuccessPop { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
            @keyframes pxSuccessCheck { 0% { stroke-dashoffset: 60 } 100% { stroke-dashoffset: 0 } }
            @keyframes pxSuccessFade { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
          `}</style>
          <div dir="rtl" style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%',
              background: `radial-gradient(circle at center, ${C.ok}22, ${C.ok}08)`,
              border: `2px solid ${C.ok}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pxSuccessPop .5s cubic-bezier(.4,1.4,.5,1) forwards',
              boxShadow: `0 0 40px ${C.ok}33`
            }}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"
                  style={{ strokeDasharray: 60, strokeDashoffset: 60, animation: 'pxSuccessCheck .45s .25s ease-out forwards' }} />
              </svg>
            </div>
            <div style={{ animation: 'pxSuccessFade .4s .45s both', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', marginBottom: 6 }}>
                {isEdit ? 'تم تحديث الشخص' : 'تمت الإضافة'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx5)' }}>
                {f.name_ar}
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return ReactDOM.createPortal(
    <div onClick={() => onClose && onClose()} style={modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* ─── Header ─── */}
          <div style={headerBar}>
            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold
              }}>
                <User size={16} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', fontFamily: F }}>
                  {isEdit ? 'تعديل الشخص' : 'شخص جديد'}
                </div>
              </div>
            </div>
            <button onClick={() => onClose && onClose()}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)',
                color: 'rgba(255,255,255,.5)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
              <X size={14} />
            </button>
          </div>

          {/* ─── Scrollable content ─── */}
          <style>{`
            .kc-scroll::-webkit-scrollbar { width: 0; display: none }
            .kc-scroll { scrollbar-width: none; -ms-overflow-style: none }
            /* Kill any global focus border — borders are only ever red for errors. */
            .kc-scroll input:focus,
            .kc-scroll select:focus,
            .kc-scroll textarea:focus,
            .kc-scroll button:focus,
            .kc-scroll input:not(:placeholder-shown):not([type=checkbox]):not([type=radio]) {
              border-color: transparent !important;
              outline: none !important;
            }
            .kc-phone-wrap,
            .kc-phone-wrap:focus-within { border-color: transparent !important }
            .kc-phone-wrap input { border-width: 0 !important }
          `}</style>

          <div className="kc-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'visible', padding: '8px 16px 12px' }}>

            {/* ═══ TAB 0: معلومات أساسية ═══ */}
            {tab === 0 && (
              <KCard Icon={User} label="معلومات أساسية">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <Lbl req>الاسم الكامل بالعربي</Lbl>
                    <input value={f.name_ar}
                      onChange={e => set('name_ar', e.target.value.replace(AR_CHARS_RE, ''))}
                      placeholder="مثال: محمد أحمد الغامدي" dir="rtl"
                      style={{ ...sF, borderColor: firstErrKey === 'name_ar' ? C.red + '80' : 'transparent' }} />
                  </div>

                  <div>
                    <Lbl req>الاسم الكامل بالإنجليزي</Lbl>
                    <input value={f.name_en}
                      onChange={e => set('name_en', e.target.value.replace(EN_CHARS_RE, '').toUpperCase())}
                      placeholder="MOHAMMED AHMED" dir="ltr"
                      style={{ ...sF, direction: 'ltr', textTransform: 'uppercase', borderColor: firstErrKey === 'name_en' ? C.red + '80' : 'transparent' }} />
                  </div>

                  <div>
                    <Lbl req>الجنس</Lbl>
                    <Dropdown value={f.gender_id} onChange={v => set('gender_id', v)}
                      options={genders || []} getKey={o => o.id} getLabel={o => o.value_ar}
                      placeholder="اختر..." searchable={false}
                      error={firstErrKey === 'gender_id'} />
                  </div>

                  <div>
                    <Lbl req>تاريخ الميلاد</Lbl>
                    <DateField value={f.date_of_birth} onChange={v => set('date_of_birth', v)}
                      error={firstErrKey === 'date_of_birth'} />
                  </div>

                  <div>
                    <Lbl req>الجنسية</Lbl>
                    <Dropdown value={f.nationality_id} onChange={v => set('nationality_id', v)}
                      options={countries || []} getKey={o => o.id}
                      getLabel={o => o.nationality_ar || o.name_ar}
                      renderSelected={o => <><Flag code={o.code} size={16} /> {o.nationality_ar || o.name_ar}</>}
                      renderCell={(o, isSel) => (
                        <span style={{ fontSize: 13, fontWeight: isSel ? 800 : 700, color: isSel ? C.gold : 'rgba(255,255,255,.92)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <Flag code={o.code} size={16} />
                          <span>{o.nationality_ar || o.name_ar}</span>
                          {o.nationality_en && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>· {o.nationality_en}</span>}
                        </span>
                      )}
                      placeholder="اختر الجنسية..."
                      error={firstErrKey === 'nationality_id'} />
                  </div>

                  <div>
                    <Lbl req>نوع الهوية</Lbl>
                    <Dropdown value={f.id_type_id} onChange={v => set('id_type_id', v)}
                      options={filteredIdTypes} getKey={o => o.id} getLabel={o => o.value_ar}
                      placeholder="اختر..." searchable={false}
                      error={firstErrKey === 'id_type_id'} />
                  </div>

                  <div>
                    <Lbl req>{idFieldLabel}</Lbl>
                    <input value={f.id_number}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 10)
                        // Enforce first-digit rule live: national_id starts with 1, iqama with 2
                        if (v) {
                          if (idTypeCode === 'national_id' && v[0] !== '1') v = '1' + v.slice(1)
                          if (idTypeCode === 'iqama' && v[0] !== '2') v = '2' + v.slice(1)
                        }
                        set('id_number', v)
                      }}
                      placeholder={
                        idTypeCode === 'national_id' ? '1XXXXXXXXX'
                        : idTypeCode === 'iqama' ? '2XXXXXXXXX'
                        : 'XXXXXXXXXX'
                      }
                      dir="ltr" maxLength={10}
                      style={{
                        ...sF, direction: 'ltr', letterSpacing: '.5px',
                        borderColor: firstErrKey === 'id_number' ? C.red + '80' : 'transparent'
                      }} />
                  </div>

                  {/* Phone with +966 prefix (KafalaCalculator style) */}
                  <div>
                    <Lbl req>رقم الجوال</Lbl>
                    <div className="kc-phone-wrap" style={{
                      display: 'flex', direction: 'ltr',
                      border: `1px solid ${firstErrKey === 'phone' ? C.red + '80' : 'transparent'}`,
                      borderRadius: 9, overflow: 'hidden',
                      background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
                      height: 42, transition: 'border-color .2s'
                    }}>
                      <div style={{
                        height: '100%', padding: '0 10px',
                        background: 'rgba(255,255,255,.04)',
                        display: 'flex', alignItems: 'center',
                        fontSize: 12, fontWeight: 700, color: C.gold, flexShrink: 0
                      }}>+966</div>
                      <input value={f.phone}
                        onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="5X XXX XXXX" maxLength={9}
                        style={{
                          width: '100%', height: '100%', padding: '0 12px',
                          border: 'none', background: 'transparent',
                          fontFamily: F, fontSize: 13, fontWeight: 600,
                          color: 'var(--tx)', outline: 'none', textAlign: 'left'
                        }} />
                    </div>
                  </div>

                  <div>
                    <Lbl>رقم ثانوي</Lbl>
                    <div className="kc-phone-wrap" style={{
                      display: 'flex', direction: 'ltr',
                      border: '1px solid transparent',
                      borderRadius: 9, overflow: 'hidden',
                      background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
                      height: 42
                    }}>
                      <div style={{
                        height: '100%', padding: '0 10px',
                        background: 'rgba(255,255,255,.04)',
                        display: 'flex', alignItems: 'center',
                        fontSize: 12, fontWeight: 700, color: C.gold, flexShrink: 0
                      }}>+966</div>
                      <input value={f.secondary_phone}
                        onChange={e => set('secondary_phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="5X XXX XXXX" maxLength={9}
                        style={{
                          width: '100%', height: '100%', padding: '0 12px',
                          border: 'none', background: 'transparent',
                          fontFamily: F, fontSize: 13, fontWeight: 600,
                          color: 'var(--tx)', outline: 'none', textAlign: 'left'
                        }} />
                    </div>
                  </div>

                </div>
              </KCard>
            )}

            {/* ═══ TAB 1: الأدوار والعلاقات ═══ */}
            {tab === 1 && isEdit && <RolesTab personId={personId} profile={profile} toast={toast} />}

          </div>

          {/* ─── Footer (matches KafalaCalculator .kc-nav-btn style) ─── */}
          <style>{`
            .kc-nav-btn { height: 40px; padding: 0 6px; background: transparent; border: none; color: #D4A017; font-family: ${F}; font-size: 14px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; transition: .2s }
            .kc-nav-btn .nav-ico { width: 32px; height: 32px; border-radius: 50%; background: rgba(212,160,23,.1); display: flex; align-items: center; justify-content: center; transition: .2s; color: #D4A017 }
            .kc-nav-btn:hover .nav-ico { background: #D4A017; color: #000 }
            .kc-nav-btn.dir-fwd:hover .nav-ico { transform: translateX(-4px) }
            .kc-nav-btn.dir-back:hover .nav-ico { transform: translateX(4px) }
            .kc-nav-btn:disabled { opacity: .5; cursor: not-allowed }
          `}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px', flexShrink: 0, gap: 12 }}>
            <div style={{ minWidth: 100 }} />
            <div style={{ flex: 1, textAlign: 'center', minHeight: 18, fontSize: 12, fontWeight: 700, color: C.red, transition: '.15s' }}>
              {firstErrMsg}
            </div>
            <button onClick={save} disabled={saving} className="kc-nav-btn dir-back" style={{ flexShrink: 0 }}>
              <span>{saving ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة')}</span>
              <span className="nav-ico"><Save size={14} strokeWidth={2.5} /></span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ═══════════════════════════════════════════════════════════════════
// Roles tab (edit mode only) — 3 KCards
// ═══════════════════════════════════════════════════════════════════
function RolesTab({ personId, profile, toast }) {
  const [owned, setOwned] = useState([])
  const [managed, setManaged] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [o, m] = await Promise.all([
        personsService.listOwnedFacilities(personId),
        personsService.listManagedFacilities(personId),
      ])
      if (cancelled) return
      setOwned(o); setManaged(m); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [personId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <KCard Icon={Building2} label="المنشآت المملوكة">
        {loading ? <Skel /> : owned.length === 0 ? <EmptyRow text="لا توجد منشآت مملوكة" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {owned.map(o => (
              <FacilityRow key={o.assignment_id || o.facility_id}
                title={o.facility_name_ar}
                sub={`ملكية ${o.ownership_percentage || 0}%${o.is_primary ? ' · أساسي' : ''}`} />
            ))}
          </div>
        )}
        <AddRowBtn text="إضافة ملكية" onClick={() => toast?.('ميزة الربط قيد التطوير')} />
      </KCard>

      <KCard Icon={Briefcase} label="المنشآت المُدارة">
        {loading ? <Skel /> : managed.length === 0 ? <EmptyRow text="لا توجد منشآت مُدارة" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {managed.map(m => (
              <FacilityRow key={m.assignment_id || m.facility_id}
                title={m.facility_name_ar}
                sub={`${m.manager_type || 'مدير'}${m.is_primary ? ' · أساسي' : ''}`} />
            ))}
          </div>
        )}
        <AddRowBtn text="إضافة إدارة" onClick={() => toast?.('ميزة الربط قيد التطوير')} />
      </KCard>

      <KCard Icon={UsersIcon} label="أدوار أخرى">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <RoleMiniCard label="ملف الموظف" linked={!!profile?.user_id} Icon={UsersIcon} color={C.gold}
            onClick={() => toast?.(profile?.user_id ? 'الفتح قريباً' : 'الربط قريباً')} />
          <RoleMiniCard label="ملف العميل" linked={!!profile?.client_id} Icon={UsersIcon} color="#5ca0e6"
            onClick={() => toast?.(profile?.client_id ? 'الفتح قريباً' : 'الربط قريباً')} />
          <RoleMiniCard label="ملف الوسيط" linked={!!profile?.broker_id} Icon={UsersIcon} color="#d9a15a"
            onClick={() => toast?.(profile?.broker_id ? 'الفتح قريباً' : 'الربط قريباً')} />
          <RoleMiniCard label="ملف العامل" linked={!!profile?.worker_id} Icon={HardHat} color="#c0c0c0"
            onClick={() => toast?.(profile?.worker_id ? 'الفتح قريباً' : 'الربط قريباً')} />
        </div>
      </KCard>
    </div>
  )
}

const FacilityRow = ({ title, sub }) => (
  <div style={{
    padding: '10px 12px', borderRadius: 8,
    background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.04)',
    display: 'flex', alignItems: 'center', gap: 10
  }}>
    <Building2 size={14} color={C.gold} opacity={.7} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>{title || '—'}</div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{sub}</div>
    </div>
  </div>
)

const EmptyRow = ({ text }) => (
  <div style={{
    padding: '14px', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,.45)',
    background: 'rgba(0,0,0,.15)', borderRadius: 8, border: '1px dashed rgba(255,255,255,.06)'
  }}>{text}</div>
)

const Skel = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {[0, 1].map(i => <div key={i} style={{ height: 38, borderRadius: 8, background: 'rgba(255,255,255,.03)' }} />)}
  </div>
)

const AddRowBtn = ({ text, onClick }) => (
  <button type="button" onClick={onClick}
    style={{
      marginTop: 8, width: '100%', height: 36, borderRadius: 8,
      border: '1px dashed rgba(212,160,23,.3)',
      background: 'rgba(212,160,23,.04)',
      color: C.gold,
      fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      transition: '.15s'
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)' }}
    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(212,160,23,.04)' }}>
    <span style={{ fontSize: 14, fontWeight: 900 }}>+</span> {text}
  </button>
)

const RoleMiniCard = ({ label, linked, onClick, Icon, color }) => (
  <div style={{
    borderRadius: 10, padding: '10px 12px',
    border: `1px solid ${linked ? color + '55' : 'rgba(255,255,255,.06)'}`,
    background: linked ? color + '0d' : 'rgba(0,0,0,.18)',
    display: 'flex', alignItems: 'center', gap: 10
  }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: color + '1a', border: `1px solid ${color}33`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <Icon size={15} color={color} strokeWidth={2} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.92)' }}>{label}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: linked ? color : 'rgba(255,255,255,.4)', marginTop: 2 }}>
        {linked ? '● مُرتبط' : 'غير مُرتبط'}
      </div>
    </div>
    <button type="button" onClick={onClick}
      style={{
        height: 26, padding: '0 10px', borderRadius: 7,
        border: `1px solid ${linked ? 'rgba(192,57,43,.3)' : C.gold + '40'}`,
        background: linked ? 'rgba(192,57,43,.08)' : 'rgba(212,160,23,.08)',
        color: linked ? '#e68a80' : C.gold,
        fontFamily: F, fontSize: 10, fontWeight: 800, cursor: 'pointer'
      }}>
      {linked ? 'فتح' : 'ربط'}
    </button>
  </div>
)
