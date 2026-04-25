import React from 'react'
import { ArrowRight } from 'lucide-react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4' }

// Header that matches PersonsPage detail header spacing + back button style.
export default function RoleLayout({ title, subtitle, color = C.gold, onBack, actions, children }) {
  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      <style>{`
        .prs-card { background: #141414; border: 1px solid rgba(255,255,255,.06); border-radius: 14px;
          padding: 16px; transition: .2s; }
        .prs-card-title { font-size: 13px; font-weight: 800; color: var(--tx); margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px; padding-bottom: 10px;
          border-bottom: 1px solid rgba(255,255,255,.05) }
        .prs-kv { display: flex; align-items: flex-start; gap: 10px; padding: 7px 0 }
        .prs-kv-ico { width: 26px; height: 26px; border-radius: 7px; background: rgba(212,160,23,.08);
          border: 1px solid rgba(212,160,23,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0 }
        .prs-kv-text { flex: 1; min-width: 0 }
        .prs-kv-l { font-size: 10px; color: var(--tx2); font-weight: 700; margin-bottom: 3px; letter-spacing: .2px }
        .prs-kv-v { font-size: 12.5px; color: var(--tx); font-weight: 600; word-break: break-word }
      `}</style>

      {/* Header row — matches Persons detail spacing */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 15, color: 'var(--tx2)', fontWeight: 600, marginTop: 8, letterSpacing: '.3px' }}>
            {subtitle}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <button onClick={onBack} title="رجوع"
            style={{ height: 34, padding: '0 12px', borderRadius: 8,
              background: '#141414', border: '1px solid rgba(255,255,255,.06)',
              color: 'var(--tx2)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: F, fontSize: 11, fontWeight: 700, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)'; e.currentTarget.style.color = C.gold }}
            onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx2)' }}>
            <ArrowRight size={13} /> رجوع
          </button>
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      </div>

      {children}
    </div>
  )
}

export { F, C }
