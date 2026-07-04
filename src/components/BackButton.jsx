import React from 'react'
import { navPeekFor, navBack } from '../lib/navStack'

// Shared back button used across every page. Minimal dashed outline that turns
// into the card background (borderless) with white text on hover. Arrow points
// right (→) for RTL "back". Pass `label` (e.g. T('رجوع','Back')) and `onClick`.
//
// Context-aware mode («الرجوع الذكي»): pass navKind + navId identifying the
// detail this button lives on (e.g. navKind="invoice" navId={inv.id}). When the
// navigation trail's top entry points at this exact detail — i.e. the user
// jumped here from another context (client file, worker file, transaction…) —
// the button reads «الرجوع إلى <ذلك السياق>» and returns there with its detail
// re-opened instead of falling back to the local list. Same visual style.
const F = "'Cairo','Tajawal',sans-serif"

export default function BackButton({ onClick, onBack, label = 'رجوع', title, navKind = null, navId = null, isAr = true }) {
  const handle = onClick || onBack
  const from = navKind ? navPeekFor(navKind, navId) : null

  // النمط واحد دائماً (إطار متقطّع محايد) — يتغيّر فقط النص والوجهة عند وجود
  // سياق سابق في سلسلة الرجوع: «الرجوع إلى <ملف العميل/الفاتورة…>».
  const text = from
    ? (isAr ? 'الرجوع إلى ' : 'Back to ') + (from.label
        ? (isAr ? (from.label.ar || from.label.en) : (from.label.en || from.label.ar))
        : (isAr ? 'الصفحة السابقة' : 'previous page'))
    : label
  const click = from ? () => { if (!navBack(navKind, navId)) handle?.() } : handle

  return (
    <button onClick={click} title={title || text}
      style={{ cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.2s', height: 38, padding: '0 16px', borderRadius: 10, gap: 8, background: 'transparent', border: '1px dashed var(--bd)', color: 'var(--tx3)', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 7px rgba(0,0,0,.12), inset 0 1px 0 rgba(176,125,0,.1)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--card-grad2)'; e.currentTarget.style.color = 'var(--tx)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx3)' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      <span>{text}</span>
    </button>
  )
}
