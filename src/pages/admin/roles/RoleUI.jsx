import React, { useState, useRef, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { X, Save, ChevronDown, CreditCard, Flag, Calendar, Phone, Mail, Plus, Edit2, Trash2, Building2, Shield } from 'lucide-react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

// Shared input style — matches PersonFormModal's sF.
export const sF = {
  width: '100%', height: 42, padding: '0 14px',
  border: '1px solid transparent', borderRadius: 9,
  fontFamily: F, fontSize: 13, fontWeight: 600,
  color: 'var(--tx)', outline: 'none',
  background: 'rgba(0,0,0,.18)', boxSizing: 'border-box',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
  textAlign: 'center', transition: '.2s'
}

export const Lbl = ({ children, req }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }}>
    {children}{req && <span style={{ color: C.red }}> *</span>}
  </div>
)

// KCard — gold outlined fieldset with label cut-out at top-right (matches PersonFormModal's KCard).
export const KCard = ({ Icon, label, children, actions }) => (
  <div style={{
    borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)',
    padding: '18px 14px 14px', position: 'relative', marginTop: 10, transition: '.2s'
  }}>
    <div style={{ position: 'absolute', top: -9, right: 14,
      background: '#1a1a1a', padding: '0 8px',
      fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F,
      display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {Icon && <Icon size={12} strokeWidth={2.2} />}<span>{label}</span>
    </div>
    {actions && <div style={{ position: 'absolute', top: -3, left: 10 }}>{actions}</div>}
    <div>{children}</div>
  </div>
)

// KV row — same as PersonsPage's KV.
export const KV = ({ icon: Icon, label, value, dir, color = C.gold }) => (
  <div className="prs-kv">
    <div className="prs-kv-ico" style={{ background: color + '15', borderColor: color + '33' }}>
      {Icon && <Icon size={13} color={color} opacity={.85} />}
    </div>
    <div className="prs-kv-text">
      <div className="prs-kv-l">{label}</div>
      <div className="prs-kv-v" style={{ direction: dir || 'rtl', textAlign: dir === 'ltr' ? 'start' : 'inherit' }}>
        {value ?? '—'}
      </div>
    </div>
  </div>
)

// KPI mini stat box — matches PersonsPage's inner role-count box.
export const KpiBox = ({ label, value, color }) => (
  <div style={{ padding: '7px 12px', borderRadius: 10,
    background: '#1a1a1a', border: '1px solid rgba(255,255,255,.04)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
    <div style={{ fontSize: 10.5, color: 'var(--tx2)', fontWeight: 700 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}` }} />
      <div style={{ fontSize: 14, fontWeight: 900, color, letterSpacing: '-.2px', direction: 'ltr', lineHeight: 1 }}>{value}</div>
    </div>
  </div>
)

// Hero stat card (narrow, matches PersonsPage total-persons card).
export const HeroStat = ({ label, value, unit, color = C.gold, footer }) => (
  <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14,
    padding: '18px 14px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: '.2s' }}>
    <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', letterSpacing: '.2px' }}>{label}</span>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 52, fontWeight: 900, color, letterSpacing: '-1.3px', lineHeight: 1,
          textShadow: `0 0 22px ${color}33`, direction: 'ltr' }}>{value}</span>
        <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx4)', letterSpacing: '.3px',
        textAlign: 'center', minHeight: 14 }}>
        {footer || '\u00A0'}
      </div>
    </div>
    <div />
  </div>
)

// Facility tile — used in per-facility role lists.
export const FacilityCard = ({ facility, color = C.gold, badges = [], fields = [], isActive, onEdit, onEnd }) => (
  <div style={{
    padding: '14px 16px', borderRadius: 12,
    background: 'linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,.2) 100%)',
    border: `1px solid ${isActive === false ? 'rgba(255,255,255,.07)' : color + '33'}`,
    opacity: isActive === false ? .6 : 1,
    display: 'flex', flexDirection: 'column', gap: 10,
    position: 'relative'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: color + '1a',
        border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Building2 size={16} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.3 }}>
          {facility?.name_ar || '—'}
        </div>
        {facility?.cr_number && (
          <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', marginTop: 2,
            fontFamily: "'JetBrains Mono',monospace" }}>
            CR: {facility.cr_number}
          </div>
        )}
      </div>
      {badges.map((b, i) => (
        <span key={i} style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 5,
          background: (b.color || color) + '22', color: b.color || color, border: `1px solid ${(b.color || color)}44` }}>
          {b.text}
        </span>
      ))}
    </div>

    {fields.length > 0 && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8,
        paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,.06)' }}>
        {fields.map((f, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--tx5)', letterSpacing: '.2px' }}>{f.label}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx2)', direction: f.dir || 'rtl' }}>
              {f.value ?? '—'}
            </span>
          </div>
        ))}
      </div>
    )}

    {(onEdit || onEnd) && (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
        {onEdit && (
          <button onClick={onEdit}
            style={{ height: 26, padding: '0 10px', borderRadius: 7,
              border: `1px solid ${color}44`, background: color + '12', color,
              fontFamily: F, fontSize: 10, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Edit2 size={11} /> تعديل
          </button>
        )}
        {onEnd && isActive !== false && (
          <button onClick={onEnd}
            style={{ height: 26, padding: '0 10px', borderRadius: 7,
              border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.08)',
              color: '#e68a80', fontFamily: F, fontSize: 10, fontWeight: 800, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={11} /> إنهاء
          </button>
        )}
      </div>
    )}
  </div>
)

// Add button that sits at the top of a list.
export const AddBtn = ({ text, onClick, color = C.gold }) => (
  <button onClick={onClick}
    style={{ height: 38, padding: '0 16px', borderRadius: 10,
      border: `1px solid ${color}55`, background: color + '0d',
      color, fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 8, transition: '.15s' }}
    onMouseEnter={e => { e.currentTarget.style.background = color + '18' }}
    onMouseLeave={e => { e.currentTarget.style.background = color + '0d' }}>
    <Plus size={14} strokeWidth={2.5} /> {text}
  </button>
)

// Empty state for a list.
export const EmptyState = ({ text }) => (
  <div style={{ padding: 40, textAlign: 'center', fontSize: 12, color: 'var(--tx5)',
    background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.06)', borderRadius: 12 }}>
    {text}
  </div>
)

// Generic modal shell matching PersonFormModal dimensions and dark theme.
export const ModalShell = ({ open, onClose, title, Icon, children, footer }) => {
  if (!open) return null
  return ReactDOM.createPortal(
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a1a', borderRadius: 18, width: 640, maxWidth: '95vw', maxHeight: '95vh',
        display: 'flex', flexDirection: 'column', overflow: 'visible',
        boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)'
      }}>
        <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8,
                background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                {Icon && <Icon size={16} strokeWidth={2} />}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)' }}>{title}</div>
            </div>
            <button onClick={onClose}
              style={{ width: 36, height: 36, borderRadius: 10,
                background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)',
                color: 'rgba(255,255,255,.5)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px 12px' }}>
            {children}
          </div>

          {footer && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 20px 12px', flexShrink: 0, gap: 12 }}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>, document.body
  )
}

// Facility picker dropdown — portal + searchable, same pattern as PersonFormModal's Dropdown.
export const FacilityPicker = ({ value, onChange, options, placeholder = 'اختر المنشأة...', disabled }) => {
  const btnRef = useRef(null)
  const portalRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 300 })
  const filtered = q
    ? options.filter(o => (o.name_ar || '').includes(q) || (o.cr_number || '').includes(q))
    : options

  const toggle = () => {
    if (disabled) return
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - 16
      const above = r.top - 16
      const flipUp = below < 120 && above > below + 40
      const maxH = Math.max(120, Math.min(260, flipUp ? above : below))
      setPos({ top: flipUp ? r.top - maxH - 4 : r.bottom + 4, left: r.left, width: r.width, maxH })
    }
    setQ(''); setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const onDoc = e => {
      if (btnRef.current?.contains(e.target)) return
      if (portalRef.current?.contains(e.target)) return
      setOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const selected = options.find(o => o.id === value)
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={toggle} disabled={disabled}
        style={{ ...sF, cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: selected ? 'var(--tx)' : 'var(--tx5)', padding: '0 32px', position: 'relative',
          opacity: disabled ? .6 : 1 }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: selected ? 700 : 500 }}>
          {selected ? selected.name_ar : placeholder}
        </span>
        <ChevronDown size={12} color={C.gold} strokeWidth={2.5}
          style={{ position: 'absolute', left: 12, top: '50%',
            transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }} />
      </button>
      {open && ReactDOM.createPortal(
        <div ref={portalRef} style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
          background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)',
          borderRadius: 10, maxHeight: pos.maxH, display: 'flex', flexDirection: 'column',
          zIndex: 3000, boxShadow: '0 12px 40px rgba(0,0,0,.7)',
          overflow: 'hidden', direction: 'rtl', fontFamily: F
        }}>
          {options.length > 5 && (
            <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="بحث..." autoFocus
                style={{ width: '100%', height: 32, padding: '0 10px',
                  border: '1px solid transparent', borderRadius: 7,
                  background: 'rgba(0,0,0,.2)', fontFamily: F, fontSize: 12, fontWeight: 600,
                  color: 'var(--tx)', outline: 'none', boxSizing: 'border-box', textAlign: 'center' }} />
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--tx5)' }}>لا توجد نتائج</div>
            )}
            {filtered.slice(0, 200).map(o => {
              const sel = o.id === value
              return (
                <div key={o.id} onClick={() => { onChange(o.id, o); setOpen(false); setQ('') }}
                  style={{ padding: '10px 14px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,.03)',
                    background: sel ? 'rgba(212,160,23,.1)' : 'transparent', transition: '.12s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(212,160,23,.1)' }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>
                  <span style={{ fontSize: 13, fontWeight: sel ? 800 : 700,
                    color: sel ? C.gold : 'rgba(255,255,255,.92)' }}>{o.name_ar}</span>
                  {o.cr_number && (
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', direction: 'ltr',
                      fontFamily: "'JetBrains Mono',monospace" }}>CR: {o.cr_number}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>, document.body
      )}
    </div>
  )
}

// Save button matching PersonFormModal footer style.
export const SaveBtn = ({ onClick, disabled, label = 'حفظ' }) => (
  <>
    <style>{`
      .kc-nav-btn { height: 40px; padding: 0 6px; background: transparent; border: none; color: #D4A017;
        font-family: ${F}; font-size: 14px; font-weight: 700; cursor: pointer;
        display: inline-flex; align-items: center; gap: 10px; transition: .2s }
      .kc-nav-btn .nav-ico { width: 32px; height: 32px; border-radius: 50%;
        background: rgba(212,160,23,.1); display: flex; align-items: center; justify-content: center;
        transition: .2s; color: #D4A017 }
      .kc-nav-btn:hover .nav-ico { background: #D4A017; color: #000 }
      .kc-nav-btn:disabled { opacity: .5; cursor: not-allowed }
    `}</style>
    <button onClick={onClick} disabled={disabled} className="kc-nav-btn">
      <span>{label}</span>
      <span className="nav-ico"><Save size={14} strokeWidth={2.5} /></span>
    </button>
  </>
)

// Common "Person identity" summary chip — shown on every role detail page.
export const PersonIdentityChip = ({ person, nationality, color = C.gold }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)',
    borderRadius: 12, marginBottom: 14 }}>
    <div style={{ width: 40, height: 40, borderRadius: 10,
      background: `linear-gradient(135deg, ${color}22, ${color}08)`,
      border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 900, color, direction: 'ltr' }}>
      {(person?.name_ar || '').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('') || '—'}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{person?.name_ar}</span>
        {nationality?.code && (
          <img src={`https://flagcdn.com/w40/${nationality.code.toLowerCase()}.png`}
            width={18} height={13} alt="" style={{ borderRadius: 2, objectFit: 'cover' }} />
        )}
        {person?.is_system && <Shield size={12} color={C.gold} />}
      </div>
      <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 2, direction: 'ltr' }}>
        {person?.name_en || '—'} {person?.id_number ? ` · ${person.id_number}` : ''}
      </div>
    </div>
  </div>
)

export { F, C }
