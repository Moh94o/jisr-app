import React from 'react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017' }

// Placeholder page for transaction sections not yet built out. Keeps the nav
// structure complete and on-brand while each section is implemented (SBC-style).
export default function SectionStub({ title, subtitle, lang = 'ar' }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
          {subtitle || T('هذا القسم ضمن خطة المعاملات.', 'This section is part of the transactions plan.')}
        </div>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '64px 24px', textAlign: 'center',
        background: 'var(--card-grad2)',
        border: '1px dashed rgba(212,160,23,.28)', borderRadius: 16,
      }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,.9)' }}>{T('قيد الإنشاء', 'Under construction')}</div>
        <div style={{ fontSize: 13, color: 'var(--tx4)', lineHeight: 1.7, maxWidth: 460 }}>
          {T('هذا القسم سيتم بناؤه بنفس تصميم «المركز السعودي» — قائمة، تفاصيل، وإضافة معاملة. قل لي متى تبيه فأبنيه.',
             'This section will be built like “Saudi Business Center” — list, detail, and add. Tell me when to build it.')}
        </div>
      </div>
    </div>
  )
}
