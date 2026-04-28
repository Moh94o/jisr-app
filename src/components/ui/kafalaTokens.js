// Shared design tokens — Kafala/Transfer-Calc visual language.
// Use these in inline `style={{}}` props so every page reads as one designer's hand.
// Reference page: TransferCalcPage in App.jsx

export const C = {
  gold: '#D4A017',
  goldLight: '#dcc06e',
  ok: '#27a046',
  okDark: '#1a8a3e',
  red: '#c0392b',
  blue: '#3483b4',
  yellow: '#eab308',
  orange: '#e67e22',
  purple: '#9b59b6',
}

export const F = "'Cairo','Tajawal',sans-serif"

// ── Surfaces ────────────────────────────────────────────────────────────
// The hero "glass" card — page-level KPI tiles, list rows, big stat cards.
export const glassCard = {
  background: 'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 16,
  position: 'relative',
  overflow: 'hidden',
  transition: '.25s cubic-bezier(.4,0,.2,1)',
  boxShadow: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',
}

// Inner stat pill — embedded inside a glassCard. Use for status/count chips.
export const innerBox = {
  background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 10,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 4px rgba(0,0,0,.22)',
}

// Hover handlers for glassCard rows (translates -3px and intensifies the shadow tinted by status color).
export const hoverLift = {
  enter: (el, accent = 'rgba(255,255,255,.4)') => {
    el.style.transform = 'translateY(-3px)'
    el.style.boxShadow = `0 16px 36px rgba(0,0,0,.42), 0 4px 10px rgba(0,0,0,.22), 0 0 0 1px ${accent}33, inset 0 1px 0 rgba(255,255,255,.08)`
  },
  leave: (el) => {
    el.style.transform = 'translateY(0)'
    el.style.boxShadow = '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'
  },
}

// ── Typography helpers ────────────────────────────────────────────────
export const pageTitle = {
  fontSize: 24,
  fontWeight: 600,
  color: 'rgba(255,255,255,.93)',
  letterSpacing: '-.3px',
  lineHeight: 1.2,
}
export const pageSubtitle = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--tx4)',
  marginTop: 12,
  lineHeight: 1.6,
}
export const sectionTitle = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--tx2)',
}

// ── Inputs / Buttons ──────────────────────────────────────────────────
export const searchInput = {
  width: '100%',
  height: 40,
  padding: '0 14px 0 36px',
  background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 11,
  fontFamily: F,
  fontSize: 14,
  fontWeight: 400,
  color: 'var(--tx)',
  outline: 'none',
  boxSizing: 'border-box',
  boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
  transition: '.2s',
}

export const filterBtn = (active = false) => ({
  height: 40,
  padding: '0 14px',
  borderRadius: 11,
  border: active ? '1px solid rgba(212,160,23,.45)' : '1px solid rgba(255,255,255,.06)',
  background: active
    ? 'linear-gradient(180deg,rgba(212,160,23,.16),rgba(212,160,23,.08))'
    : 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
  color: active ? C.gold : 'rgba(255,255,255,.78)',
  fontFamily: F,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  flexShrink: 0,
  boxShadow: active
    ? '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)'
    : '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
  transition: '.2s',
})

// Standard form input (modal-style) — used in advanced filter / form fields.
export const formInput = {
  height: 42,
  padding: '0 14px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,.07)',
  background: 'linear-gradient(180deg,#323232 0%,#262626 100%)',
  color: 'var(--tx)',
  fontFamily: F,
  fontSize: 13,
  fontWeight: 500,
  outline: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
  transition: '.18s',
  width: '100%',
  boxSizing: 'border-box',
}

export const formLabel = {
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--tx3)',
  paddingInlineStart: 2,
  marginBottom: 7,
}

// Primary action button (gold). Use for "Add new", confirm, submit.
export const goldBtn = {
  height: 40,
  padding: '0 18px',
  borderRadius: 11,
  border: '1px solid rgba(212,160,23,.45)',
  background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)',
  color: C.gold,
  fontFamily: F,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)',
  transition: '.2s',
}

// Quiet ghost button — secondary actions.
export const ghostBtn = {
  height: 40,
  padding: '0 14px',
  borderRadius: 11,
  border: '1px solid rgba(255,255,255,.06)',
  background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)',
  color: 'rgba(255,255,255,.78)',
  fontFamily: F,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)',
  transition: '.2s',
}

// ── Panels ────────────────────────────────────────────────────────────
// Inline expanded panel (e.g. advanced filter box).
export const panel = {
  padding: '16px 18px',
  background: 'var(--modal-bg)',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 14,
  boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)',
}

// ── Status colors ─────────────────────────────────────────────────────
export const statusColor = {
  draft: '#666',
  priced: C.yellow,
  approved: C.blue,
  invoiced: C.ok,
  completed: C.okDark,
  cancelled: C.red,
  pending: C.gold,
  scheduled: C.gold,
  confirmed: C.blue,
  no_show: C.orange,
  active: C.ok,
  paid: C.ok,
  issue: C.red,
  suspended: C.orange,
  in_progress: C.blue,
  partial: C.gold,
  unpaid: C.red,
  overdue: C.red,
  urgent: C.red,
  high: C.orange,
  normal: C.blue,
  low: '#999',
  male: C.blue,
  female: C.purple,
}

// Pill badge for status. Use as <span style={statusBadge('priced')}>...</span>
export const statusBadge = (key) => {
  const c = statusColor[key] || '#999'
  return {
    fontSize: 10,
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: 6,
    background: c + '15',
    color: c,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  }
}

// ── Empty state ──────────────────────────────────────────────────────
export const emptyState = {
  textAlign: 'center',
  padding: 60,
  color: 'var(--tx6)',
  fontSize: 13,
  fontWeight: 500,
}

// ── Date group separator (the "الاثنين 27 أبريل 2026 · 4 حسبة" row) ──
// Composes via JSX, not a single style. Recipe documented here.
//
// <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
//   <div style={{width:10,height:10,borderRadius:'50%',background:isToday?C.gold:'rgba(255,255,255,.18)',
//     border:isToday?'2px solid rgba(212,160,23,.25)':'none',flexShrink:0}}/>
//   <div style={{fontSize:13,fontWeight:600,color:isToday?C.gold:'rgba(255,255,255,.65)'}}>{dayName}</div>
//   <div style={{fontSize:11,fontWeight:500,color:'var(--tx5)'}}>{fullDate}</div>
//   <div style={{flex:1,height:1,background:'rgba(255,255,255,.07)'}}/>
//   <div style={{display:'flex',gap:8,fontSize:11,fontWeight:600}}>
//     <span style={{color:'var(--tx5)'}}>{count} {label}</span>
//   </div>
// </div>
