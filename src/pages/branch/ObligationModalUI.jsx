import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { X, ChevronDown } from 'lucide-react'
import { sF, SaveBtn } from '../admin/roles/RoleUI.jsx'
import { Modal as FkModal, ModalSection } from '../../components/ui/FormKit.jsx'

// Shared modal chrome for the branch obligation forms (rent / utilities / phones).
// Mirrors BranchFormModal ("تعديل بيانات المكتب"): blurred overlay, icon + title
// header with a red-hover close button, a gold-outlined section, and a SaveBtn footer.

const F = "'Cairo','Tajawal',sans-serif"
const MONO = "'JetBrains Mono','Cairo',sans-serif"
const GOLD = '#D4A017'
const RED = '#e87265'

export { SaveBtn }

export const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 18, rowGap: 16 }

const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

// Custom popup calendar — ported from the client-invoice wizard (ServiceRequestPage's
// CompactDatePicker): gold-accented month grid in a fixed-position popover.
export function DatePick({ value, onChange, height = 42, boxStyle }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const init = value ? new Date(value) : new Date()
  const [viewDate, setViewDate] = useState(isNaN(init) ? new Date() : init)
  const btnRef = useRef(null)
  const popRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const POP_W = 240, POP_H = 260
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect(); if (!r) return
      const vh = window.innerHeight, vw = window.innerWidth
      const below = vh - r.bottom >= POP_H + 8
      const top = below ? r.bottom + 6 : Math.max(8, r.top - POP_H - 6)
      let left = r.right - POP_W; if (left < 8) left = 8; if (left + POP_W > vw - 8) left = vw - POP_W - 8
      setPos({ top, left })
    }
    place()
    const h = (e) => { if (btnRef.current?.contains(e.target)) return; if (popRef.current?.contains(e.target)) return; setOpen(false) }
    document.addEventListener('mousedown', h)
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true)
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true) }
  }, [open])
  const y = viewDate.getFullYear(), m = viewDate.getMonth()
  const first = new Date(y, m, 1).getDay()
  const dim = new Date(y, m + 1, 0).getDate()
  const cells = []; for (let i = 0; i < first; i++) cells.push(null); for (let d = 1; d <= dim; d++) cells.push(d)
  const pad = (n) => String(n).padStart(2, '0')
  const pick = (d) => { onChange(`${y}-${pad(m + 1)}-${pad(d)}`); setOpen(false) }
  const sel = value ? new Date(value) : null
  const isSel = (d) => sel && sel.getFullYear() === y && sel.getMonth() === m && sel.getDate() === d
  const today = new Date()
  const isToday = (d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d
  const fs = height >= 42 ? 14 : 13, ic = 15
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', height, padding: '0 14px', borderRadius: 10, border: `1px solid ${open ? GOLD + '66' : 'rgba(255,255,255,.07)'}`, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', color: value ? 'var(--tx)' : 'var(--tx5)', fontFamily: F, fontSize: fs, fontWeight: 500, cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, direction: 'ltr', boxSizing: 'border-box', ...boxStyle }}>
        <span>{value || 'yyyy-mm-dd'}</span>
        <svg width={ic} height={ic} viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1100, width: 240, padding: 10, borderRadius: 10, background: '#1a1611', border: `1.5px solid ${GOLD}55`, boxShadow: '0 12px 40px rgba(0,0,0,.6)', direction: 'rtl' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 4 }}>
            <button type="button" onClick={() => setViewDate(new Date(y, m - 1, 1))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: GOLD, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 800, color: GOLD, fontFamily: F }}>{AR_MONTHS[m]} {y}</span>
            <button type="button" onClick={() => setViewDate(new Date(y, m + 1, 1))} style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: GOLD, cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {AR_DAYS.map(d => <span key={d} style={{ fontSize: 8, fontWeight: 700, color: 'var(--tx5)', textAlign: 'center', padding: '3px 0', letterSpacing: '-0.2px' }}>{d}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((c, i) => c == null ? <span key={i} /> : <button key={i} type="button" onClick={() => pick(c)} style={{ height: 26, borderRadius: 5, border: isSel(c) ? `1.5px solid ${GOLD}` : '1px solid transparent', background: isSel(c) ? GOLD + '22' : (isToday(c) ? 'rgba(255,255,255,.04)' : 'transparent'), color: isSel(c) ? GOLD : 'var(--tx)', fontFamily: F, fontSize: 11, fontWeight: isSel(c) || isToday(c) ? 800 : 600, cursor: 'pointer', transition: '.15s' }}>{c}</button>)}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const labelStyle = { fontSize: 13.5, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 7, textAlign: 'start', display: 'block' }

// Base field input styles, all derived from RoleUI's sF so they match the edit modal.
export const fText = { ...sF, textAlign: 'start' }
export const fMono = { ...sF, textAlign: 'start', direction: 'ltr', fontFamily: MONO }
export const fDate = { ...sF, textAlign: 'start', direction: 'ltr' }
export const fFile = { ...sF, height: 'auto', padding: 10, textAlign: 'start', fontSize: 12, cursor: 'pointer' }

export function Field({ label, req, full, children }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <label style={labelStyle}>{label}{req && <span style={{ color: RED }}> *</span>}</label>
      {children}
    </div>
  )
}

// Native select styled to read like the edit modal's custom dropdowns.
export function SelField({ label, req, full, value, onChange, options }) {
  return (
    <Field label={label} req={req} full={full}>
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={onChange}
          style={{ ...sF, textAlign: 'start', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingInlineEnd: 36, cursor: 'pointer' }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <ChevronDown size={16} strokeWidth={2.2}
          style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }} />
      </div>
    </Field>
  )
}

// Polished dropdown — ported from the client-invoice wizard (ServiceRequestPage's
// NiceSelect): gradient trigger + portaled gold-accented option panel.
export function NiceSel({ value, onChange, options, placeholder = 'اختر...', height = 42 }) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState({ top: 0, left: 0, width: 0, maxHeight: 280, placeUp: false })
  const ref = useRef(null)
  const popRef = useRef(null)
  const selected = options.find(o => o.value === value)
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target) && popRef.current && !popRef.current.contains(e.target)) setOpen(false) }
    const onEsc = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])
  useEffect(() => {
    if (!open || !ref.current) return
    const compute = () => {
      const t = ref.current.getBoundingClientRect()
      const below = window.innerHeight - t.bottom - 12, above = t.top - 12
      const placeUp = below < 200 && above > below
      const maxHeight = Math.max(160, Math.min(300, placeUp ? above : below))
      setPanel({ top: placeUp ? undefined : t.bottom + 6, bottom: placeUp ? window.innerHeight - t.top + 6 : undefined, left: t.left, width: t.width, maxHeight, placeUp })
    }
    compute()
    window.addEventListener('resize', compute); window.addEventListener('scroll', compute, true)
    return () => { window.removeEventListener('resize', compute); window.removeEventListener('scroll', compute, true) }
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', height, padding: '0 32px', borderRadius: 10, border: `1px solid ${open ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.07)'}`, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', color: selected ? 'var(--tx)' : 'var(--tx5)', fontFamily: F, fontSize: 14, fontWeight: 500, textAlign: 'center', cursor: 'pointer', transition: '.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', outline: 'none', boxSizing: 'border-box' }}>
        <span style={{ flex: '1 1 0', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{selected ? selected.label : placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.5" style={{ position: 'absolute', left: 14, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, transition: '.2s' }}><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && ReactDOM.createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: panel.top, bottom: panel.bottom, left: panel.left, width: panel.width, zIndex: 1100, borderRadius: 12, border: '1px solid rgba(212,160,23,.25)', background: 'var(--modal-bg)', boxShadow: '0 10px 30px rgba(0,0,0,.5),0 0 0 1px rgba(212,160,23,.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: panel.maxHeight }}>
          <div className="obm-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {options.map(opt => {
              const sel = opt.value === value
              return (
                <div key={opt.value} onClick={() => { onChange(opt.value); setOpen(false) }}
                  style={{ padding: sel ? '9px 28px 9px 12px' : '9px 12px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, fontFamily: F, fontSize: 12.5, fontWeight: sel ? 700 : 600, color: sel ? GOLD : 'var(--tx2)', background: sel ? 'rgba(212,160,23,.1)' : 'transparent', transition: '.15s', position: 'relative', flexShrink: 0 }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>
                  <span>{opt.label}</span>
                  {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><polyline points="20 6 9 17 4 12" /></svg>}
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

// Subtle checkbox row used for the auto-generate-schedule toggle.
export function CheckRow({ checked, onChange, children }) {
  return (
    <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 10, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.18)', fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.7)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ accentColor: GOLD, width: 15, height: 15, cursor: 'pointer' }} />
      {children}
    </label>
  )
}

// Now delegates to FormKit's Modal + ModalSection so the branch obligation/rent
// payment popups inherit the unified chrome. The gold-outlined section is
// ModalSection; the footer slot right-aligns (save lands on the left in RTL).
export function ObModal({ title, Icon, sectionLabel, SectionIcon, width = 600, onClose, footer, children }) {
  return (
    <FkModal open onClose={onClose} title={title} Icon={Icon} footer={footer} width={width} scroll>
      {sectionLabel
        ? <ModalSection Icon={SectionIcon} label={sectionLabel}>{children}</ModalSection>
        : children}
    </FkModal>
  )
}
