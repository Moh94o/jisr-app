import React from 'react'

// Shared back button used across every page. Minimal dashed outline that turns
// into the card background (borderless) with white text on hover. Arrow points
// right (→) for RTL "back". Pass `label` (e.g. T('رجوع','Back')) and `onClick`.
const F = "'Cairo','Tajawal',sans-serif"

export default function BackButton({ onClick, onBack, label = 'رجوع', title }) {
  const handle = onClick || onBack
  return (
    <button onClick={handle} title={title || label}
      style={{ cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.2s', height: 38, padding: '0 16px', borderRadius: 10, gap: 8, background: 'transparent', border: '1px dashed rgba(255,255,255,.18)', color: 'var(--tx3)', fontSize: 12, fontWeight: 600 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)'; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx3)' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      <span>{label}</span>
    </button>
  )
}
