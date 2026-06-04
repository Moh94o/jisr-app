import React, { useMemo, useState } from 'react'
import {
  DEPARTMENTS, STAGES, PIPELINES,
  stagesOfDept, servicesThroughDept, serviceLabel,
} from './workflowConfig'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085',
  orange: '#f39c12', gray: '#95a5a6', ok: '#2ecc71', red: '#e87265',
}

// Soft tinted background / border derived from a department's accent color.
const tint = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// Tiny inline icon set (matches the app's stroke style).
function Icon({ name, size = 16, color = 'currentColor' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'invoice':  return <svg {...p}><path d="M4 2h12l4 4v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
    case 'calendar': return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    case 'role':     return <svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>
    case 'broker':   return <svg {...p}><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" /></svg>
    case 'notes':    return <svg {...p}><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /><path d="M8 13h8M8 17h6" /></svg>
    case 'settings': return <svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
    case 'arrow':    return <svg {...p}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
    case 'layers':   return <svg {...p}><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></svg>
    default:         return <svg {...p}><circle cx="12" cy="12" r="9" /></svg>
  }
}

// Chip: a single stage label with the department accent.
function StageChip({ ar, en, lang, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
      color: 'rgba(255,255,255,.82)', background: tint(color, 0.12), border: `1px solid ${tint(color, 0.28)}`,
      borderRadius: 8, padding: '5px 10px', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
      {lang === 'ar' ? ar : en}
    </span>
  )
}

export default function DepartmentsPage({ lang = 'ar', user }) {
  const T = (ar, en) => (lang === 'ar' ? ar : en)
  const [openDept, setOpenDept] = useState(null) // department code expanded to show flow

  const data = useMemo(() => DEPARTMENTS.map(d => ({
    ...d,
    stages: stagesOfDept(d.code),
    services: servicesThroughDept(d.code),
  })), [])

  const totalStages = STAGES.length
  const totalServices = Object.keys(PIPELINES).length

  return (
    <div style={{ fontFamily: F, color: 'var(--tx2)', paddingBottom: 60 }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,.95)', letterSpacing: '-0.3px' }}>
          {T('المعاملات — الأقسام', 'Transactions — Departments')}
        </div>
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--tx3)', lineHeight: 1.7, maxWidth: 720 }}>
          {T(
            'كل معاملة تمرّ بمراحل، وكل مرحلة يملكها قسم. القسم يستلم مهامه ويُنجزها فتنتقل المعاملة تلقائياً للقسم التالي. هذه خريطة الأقسام الستة والمراحل التي يملكها كل قسم.',
            'Each transaction flows through stages; every stage is owned by a department. A department completes its tasks and the transaction moves on to the next. This is the map of the six departments and the stages each owns.'
          )}
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        <SummaryPill icon="layers"   label={T('أقسام', 'Departments')} value={DEPARTMENTS.length} color={C.gold} />
        <SummaryPill icon="arrow"    label={T('مراحل', 'Stages')}      value={totalStages}        color={C.blue} />
        <SummaryPill icon="calendar" label={T('خدمات', 'Services')}    value={totalServices}      color={C.ok} />
      </div>

      {/* ── Department cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {data.map(d => {
          const open = openDept === d.code
          return (
            <div key={d.code} style={{
              background: 'var(--card, rgba(255,255,255,.02))',
              border: `1px solid ${tint(d.color, 0.22)}`,
              borderRadius: 14, overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,.18)',
            }}>
              {/* Card header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                background: `linear-gradient(180deg, ${tint(d.color, 0.14)}, ${tint(d.color, 0.04)})`,
                borderBottom: `1px solid ${tint(d.color, 0.18)}`,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  background: tint(d.color, 0.16), border: `1px solid ${tint(d.color, 0.34)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={d.icon} size={19} color={d.color} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,.92)' }}>
                    {lang === 'ar' ? d.ar : d.en}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 7 }}>
                    {d.role
                      ? <span>{T('الدور:', 'Role:')} <b style={{ color: tint(d.color, 0.95) }}>{d.role}</b></span>
                      : <span style={{ color: C.orange, fontWeight: 700 }}>{T('دور جديد سيُضاف', 'New role — pending')}</span>}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 800, color: d.color, background: tint(d.color, 0.12),
                  border: `1px solid ${tint(d.color, 0.3)}`, borderRadius: 8, padding: '4px 9px', whiteSpace: 'nowrap',
                }}>
                  {d.stages.length} {T('مرحلة', 'stages')}
                </div>
              </div>

              {/* Stage chips */}
              <div style={{ padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {d.stages.map(s => <StageChip key={s.code} ar={s.ar} en={s.en} lang={lang} color={d.color} />)}
              </div>

              {/* Services-through toggle */}
              <div style={{ padding: '0 16px 14px' }}>
                <button onClick={() => setOpenDept(open ? null : d.code)} style={{
                  width: '100%', cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700,
                  color: 'var(--tx3)', background: 'transparent', border: '1px dashed rgba(255,255,255,.14)',
                  borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span>{T('الخدمات المارّة بهذا القسم', 'Services flowing through')} ({d.services.length})</span>
                  <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: '.2s', display: 'inline-flex' }}>
                    <Icon name="arrow" size={13} />
                  </span>
                </button>
                {open && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {d.services.map(svc => (
                      <span key={svc} style={{
                        fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.7)',
                        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                        borderRadius: 7, padding: '4px 9px',
                      }}>
                        {serviceLabel(svc, lang)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Footnote ── */}
      <div style={{
        marginTop: 24, fontSize: 12, color: 'var(--tx4)', lineHeight: 1.7,
        background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 12, padding: '14px 16px',
      }}>
        {T(
          'الأقسام ثابتة حالياً. الخطوة التالية: ربط الأدوار والصلاحيات بكل قسم، ثم تفعيل توجيه المهام بين الأقسام (عدّاد المعاملات النشطة يظهر هنا بعد تفعيل المحرّك).',
          'Departments are fixed for now. Next: link roles & permissions to each department, then enable task routing between departments (live active-transaction counts appear here once the engine is on).'
        )}
      </div>
    </div>
  )
}

function SummaryPill({ icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', borderRadius: 11,
      background: tint(color, 0.08), border: `1px solid ${tint(color, 0.22)}`,
    }}>
      <Icon name={icon} size={16} color={color} />
      <span style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.92)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>{label}</span>
    </div>
  )
}
