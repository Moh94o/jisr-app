import React, { useState, useMemo } from 'react'

// Five visually distinct ways to render the same facility list. Mounted in
// SbcFacilities behind a switcher so the user can pick what they like; once
// picked we lock that variant. All five accept the same `rows` shape and the
// same `onRowClick` handler — they only differ in layout/density.
//
// Rows are pre-shaped by the parent (entity name, CR numbers, partners/managers,
// status, dates, source provenance, etc.) so this file stays purely presentational.

const C = {
  gold: '#B07D00',
  blue: '#3483b4',
  green: '#27a046',
  red: '#c0392b',
  purple: '#9b59b6',
  cyan: '#06b6d4',
  yellow: '#facc15',
}
const F = "'Cairo','Tajawal',sans-serif"

// Status → color theme. Active = green, expired/cancelled = red, etc.
function statusColor(status) {
  if (!status) return '#888'
  const s = String(status)
  if (/سارٍ|active|نشط|قائم/i.test(s)) return C.green
  if (/منتهي|expired|ملغى|cancelled|إلغاء/i.test(s)) return C.red
  if (/تصفية|liquidation/i.test(s)) return C.red
  if (/تأكيد|confirm|معلّق|pending/i.test(s)) return C.yellow
  return C.gold
}

function Tag({ color, children, small }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '1px 6px' : '2px 8px',
      fontSize: small ? 9 : 10,
      borderRadius: 999,
      background: `${color}1A`, color, border: `1px solid ${color}44`,
      fontWeight: 600, whiteSpace: 'nowrap',
      letterSpacing: '.2px',
    }}>{children}</span>
  )
}

function PartnerDots({ count, color = C.gold }) {
  if (!count) return <span style={{ color: 'var(--tx5)', fontSize: 10 }}>—</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      {count}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════════
// VARIANT A — "Classic table"
// Tight data-dense table. Familiar spreadsheet feel. Best for scanning
// many rows + comparing columns quickly.
// ════════════════════════════════════════════════════════════════════
function ClassicTable({ rows, onRowClick, T, lang }) {
  return (
    <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.06)', background: '#141414', boxShadow: '0 4px 16px rgba(0,0,0,.18)', overflow: 'auto', scrollbarWidth: 'none' }}>
      <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
        <thead>
          <tr>
            {[
              [T('المنشأة', 'Facility'), { width: '32%' }],
              [T('السجل', 'CR'), { width: '15%' }],
              [T('شركاء', 'Partners'), { width: '10%' }],
              [T('مدراء', 'Managers'), { width: '10%' }],
              [T('الحالة', 'Status'), { width: '15%' }],
              [T('التواريخ', 'Dates'), { width: '18%' }],
            ].map(([h, extra], i) => (
              <th key={i} style={{
                position: 'sticky', top: 0, zIndex: 5,
                padding: '12px 10px', textAlign: 'start',
                fontWeight: 600, color: 'rgba(255,255,255,.72)',
                fontSize: 10, textTransform: 'uppercase', letterSpacing: '.6px',
                background: '#1b1b1b', borderBottom: '1px solid rgba(255,255,255,.08)',
                ...extra,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const stColor = statusColor(r._status)
            return (
              <tr key={(r.cr_national_number || i) + (r._isBranch ? '_b' : '')}
                onClick={() => onRowClick(r)}
                style={{
                  background: i % 2 ? 'rgba(255,255,255,.02)' : 'transparent',
                  borderTop: '1px solid rgba(255,255,255,.04)',
                  cursor: 'pointer', transition: 'background .12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,125,0,.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = i % 2 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
                <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--tx)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingInlineStart: r._isBranch ? 18 : 0 }}>
                    {r._isBranch && <span style={{ color: C.blue, fontSize: 11, fontWeight: 600 }}>↳</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 }}>
                      {r.entity_full_name_ar || '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', paddingInlineStart: r._isBranch ? 18 : 0 }}>
                    {r.is_main && <Tag color={C.gold} small>{T('رئيسي', 'Main')}</Tag>}
                    {r._isBranch && <Tag color={C.blue} small>{T('فرع', 'Branch')}</Tag>}
                    {r.in_liquidation_process && <Tag color={C.red} small>{T('تصفية', 'Liq.')}</Tag>}
                    {r.has_ecommerce && <Tag color={C.cyan} small>{T('إلكتروني', 'E-com')}</Tag>}
                  </div>
                </td>
                <td style={{ padding: '10px 10px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--tx2)', direction: 'ltr' }}>
                  {r.cr_national_number || '—'}
                </td>
                <td style={{ padding: '10px 10px' }}>
                  <PartnerDots count={(r._partners || []).length} color={C.purple} />
                </td>
                <td style={{ padding: '10px 10px' }}>
                  <PartnerDots count={(r._managers || []).length} color={C.cyan} />
                </td>
                <td style={{ padding: '10px 10px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: stColor }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: stColor, boxShadow: `0 0 6px ${stColor}aa` }} />
                    {r._status || '—'}
                  </span>
                  {r.is_in_confirmation_period && (
                    <div style={{ fontSize: 9.5, color: C.yellow, fontWeight: 600, marginTop: 3 }}>{T('فترة تأكيد', 'In confirm')}</div>
                  )}
                </td>
                <td style={{ padding: '10px 10px', fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'var(--tx3)', direction: 'ltr' }}>
                  <div>{T('إصدار', 'Iss')}: {r._issueDate || '—'}</div>
                  <div>{T('تأكيد', 'Cnf')}: {r._confirmDate || '—'}</div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// VARIANT B — "Stacked cards"
// One large horizontal card per facility. Maximum info per item.
// Best when there are 10-30 facilities and the user wants context per
// row without clicking through.
// ════════════════════════════════════════════════════════════════════
function StackedCards({ rows, onRowClick, T, lang }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r, i) => {
        const stColor = statusColor(r._status)
        return (
          <div key={(r.cr_national_number || i) + (r._isBranch ? '_b' : '')}
            onClick={() => onRowClick(r)}
            style={{
              padding: '14px 18px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, #1d1d1d 0%, #181818 100%)',
              border: `1px solid ${r._isBranch ? `${C.blue}33` : 'rgba(255,255,255,.06)'}`,
              boxShadow: '0 3px 12px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)',
              cursor: 'pointer', transition: '.15s',
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              gap: 18,
              alignItems: 'center',
              borderInlineStart: `3px solid ${stColor}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 22px rgba(0,0,0,.28), 0 0 0 3px ${C.gold}10, inset 0 1px 0 rgba(255,255,255,.05)` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            {/* Name + tags */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                {r._isBranch && <span style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>↳</span>}
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.entity_full_name_ar || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                {r.is_main && <Tag color={C.gold}>{T('رئيسي', 'Main')}</Tag>}
                {r._isBranch && <Tag color={C.blue}>{T('فرع', 'Branch')}</Tag>}
                {r.in_liquidation_process && <Tag color={C.red}>{T('تصفية', 'Liquidation')}</Tag>}
                {r.has_ecommerce && <Tag color={C.cyan}>{T('إلكتروني', 'E-com')}</Tag>}
                {r._form && (
                  <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>· {r._form}</span>
                )}
                {r._city && (
                  <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>· 📍 {r._city}</span>
                )}
              </div>
            </div>

            {/* CR + GOSI + HRSD */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: 'var(--tx3)', direction: 'ltr', textAlign: 'end' }}>
              <div>
                <span style={{ color: 'var(--tx5)', fontSize: 9, marginInlineEnd: 5 }}>CR</span>
                {r.cr_national_number || '—'}
              </div>
              {r.gosi_registration_number && <div>
                <span style={{ color: 'var(--tx5)', fontSize: 9, marginInlineEnd: 5 }}>GOSI</span>
                {r.gosi_registration_number}
              </div>}
              {r.hrsd_labor_office_id != null && <div>
                <span style={{ color: 'var(--tx5)', fontSize: 9, marginInlineEnd: 5 }}>HRSD</span>
                {r.hrsd_labor_office_id}-{r.hrsd_sequence_number || ''}
              </div>}
            </div>

            {/* People */}
            <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 600, color: 'var(--tx2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 16, color: C.purple, fontWeight: 600 }}>{(r._partners || []).length}</span>
                <span style={{ fontSize: 9, color: 'var(--tx5)' }}>{T('شركاء', 'Partners')}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 16, color: C.cyan, fontWeight: 600 }}>{(r._managers || []).length}</span>
                <span style={{ fontSize: 9, color: 'var(--tx5)' }}>{T('مدراء', 'Managers')}</span>
              </div>
            </div>

            {/* Status + dates */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 130 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: stColor }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: stColor, boxShadow: `0 0 8px ${stColor}aa` }} />
                {r._status || '—'}
              </span>
              <div style={{ fontSize: 9.5, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>
                {T('إصدار', 'iss')}: {r._issueDate || '—'} · {T('تأكيد', 'cnf')}: {r._confirmDate || '—'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// VARIANT C — "Tile grid"
// 2-column compact tiles. Visual at-a-glance scan; best when you mostly
// look at status / who-owns-what across many facilities.
// ════════════════════════════════════════════════════════════════════
function TileGrid({ rows, onRowClick, T, lang }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
      {rows.map((r, i) => {
        const stColor = statusColor(r._status)
        return (
          <div key={(r.cr_national_number || i) + (r._isBranch ? '_b' : '')}
            onClick={() => onRowClick(r)}
            style={{
              padding: '13px 14px 11px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, #1d1d1d 0%, #181818 100%)',
              border: '1px solid rgba(255,255,255,.06)',
              boxShadow: '0 3px 10px rgba(0,0,0,.18)',
              cursor: 'pointer', transition: '.15s',
              position: 'relative', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${stColor}66`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 10px 22px rgba(0,0,0,.3), 0 0 0 3px ${stColor}15` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,.18)' }}>
            <div style={{ position: 'absolute', insetInlineEnd: -40, top: -40, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${stColor}14 0%, transparent 65%)`, pointerEvents: 'none' }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {r._isBranch && <span style={{ color: C.blue, marginInlineEnd: 4 }}>↳</span>}
                  {r.entity_full_name_ar || '—'}
                </div>
              </div>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: stColor, boxShadow: `0 0 10px ${stColor}`, flexShrink: 0, marginTop: 4 }} />
            </div>

            <div style={{ position: 'relative', fontSize: 10.5, fontFamily: 'ui-monospace, monospace', color: 'var(--tx3)', direction: 'ltr', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span><span style={{ color: 'var(--tx5)' }}>CR</span> {r.cr_national_number || '—'}</span>
              {r.gosi_registration_number && <span>· <span style={{ color: 'var(--tx5)' }}>GOSI</span> {r.gosi_registration_number}</span>}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {r.is_main && <Tag color={C.gold} small>{T('رئيسي', 'Main')}</Tag>}
                {r._isBranch && <Tag color={C.blue} small>{T('فرع', 'Branch')}</Tag>}
                {r.in_liquidation_process && <Tag color={C.red} small>{T('تصفية', 'Liq.')}</Tag>}
                {r.has_ecommerce && <Tag color={C.cyan} small>{T('إلكتروني', 'E-com')}</Tag>}
                {r.is_in_confirmation_period && <Tag color={C.yellow} small>{T('تأكيد', 'Confirm')}</Tag>}
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>
                <span><span style={{ color: C.purple }}>●</span> {(r._partners || []).length}</span>
                <span><span style={{ color: C.cyan }}>●</span> {(r._managers || []).length}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// VARIANT D — "Roster list"
// Single-line minimal list, like contacts. Maximum density — hundreds of
// items fit on screen. Color dot left, name middle, key facts right.
// ════════════════════════════════════════════════════════════════════
function RosterList({ rows, onRowClick, T, lang }) {
  return (
    <div style={{ borderRadius: 12, background: '#141414', border: '1px solid rgba(255,255,255,.06)', boxShadow: '0 3px 12px rgba(0,0,0,.18)', overflow: 'hidden' }}>
      {rows.map((r, i) => {
        const stColor = statusColor(r._status)
        return (
          <div key={(r.cr_national_number || i) + (r._isBranch ? '_b' : '')}
            onClick={() => onRowClick(r)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px',
              borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(255,255,255,.04)',
              cursor: 'pointer', transition: 'background .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,125,0,.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            {/* Status dot */}
            <span title={r._status || ''} style={{ width: 9, height: 9, borderRadius: '50%', background: stColor, boxShadow: `0 0 8px ${stColor}`, flexShrink: 0 }} />

            {/* Name */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              {r._isBranch && <span style={{ color: C.blue, fontSize: 11, fontWeight: 600 }}>↳</span>}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.entity_full_name_ar || '—'}
              </span>
              {r.is_main && <Tag color={C.gold} small>{T('رئيسي', 'Main')}</Tag>}
              {r.in_liquidation_process && <Tag color={C.red} small>{T('تصفية', 'Liq.')}</Tag>}
            </div>

            {/* CR */}
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: 'var(--tx3)', direction: 'ltr', flexShrink: 0 }}>
              {r.cr_national_number || '—'}
            </span>

            {/* People count */}
            <span style={{ display: 'inline-flex', gap: 6, fontSize: 10, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0, minWidth: 60, justifyContent: 'flex-end' }}>
              <span><span style={{ color: C.purple }}>●</span>{(r._partners || []).length}</span>
              <span><span style={{ color: C.cyan }}>●</span>{(r._managers || []).length}</span>
            </span>

            {/* Status text */}
            <span style={{ fontSize: 10.5, fontWeight: 600, color: stColor, flexShrink: 0, minWidth: 70, textAlign: 'end' }}>
              {r._status || '—'}
            </span>

            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--tx5)', opacity: .5, flexShrink: 0 }}>
              <path d={(lang || 'ar') !== 'en' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}/>
            </svg>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// VARIANT E — "Kanban by status"
// Columns grouped by CR status. Cards drop into the right column. Best
// when the user thinks in terms of "what's expired / in confirm period
// / active" and wants to see the buckets visually.
// ════════════════════════════════════════════════════════════════════
function KanbanByStatus({ rows, onRowClick, T, lang }) {
  const groups = useMemo(() => {
    const m = new Map()
    for (const r of rows) {
      const key = r._status || T('بدون حالة', 'No status')
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(r)
    }
    return Array.from(m.entries()).map(([k, items]) => ({ key: k, items, color: statusColor(k) }))
      .sort((a, b) => b.items.length - a.items.length)
  }, [rows, T])

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, alignItems: 'flex-start' }}>
      {groups.map(g => (
        <div key={g.key} style={{
          borderRadius: 12,
          background: '#141414',
          border: `1px solid ${g.color}33`,
          boxShadow: '0 3px 10px rgba(0,0,0,.18)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Column header */}
          <div style={{ padding: '11px 14px', borderBottom: `1px solid ${g.color}26`, background: `${g.color}0E`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, boxShadow: `0 0 8px ${g.color}` }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: g.color }}>{g.key}</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: g.color, background: `${g.color}1A`, padding: '2px 8px', borderRadius: 999, direction: 'ltr' }}>{g.items.length}</span>
          </div>

          {/* Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, maxHeight: 600, overflow: 'auto', scrollbarWidth: 'thin' }}>
            {g.items.map((r, i) => (
              <div key={(r.cr_national_number || i) + (r._isBranch ? '_b' : '')}
                onClick={() => onRowClick(r)}
                style={{
                  padding: '9px 11px',
                  borderRadius: 9,
                  background: 'rgba(255,255,255,.025)',
                  border: '1px solid rgba(255,255,255,.05)',
                  cursor: 'pointer', transition: '.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${g.color}10`; e.currentTarget.style.borderColor = `${g.color}55` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.025)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {r._isBranch && <span style={{ color: C.blue, fontSize: 10, fontWeight: 600 }}>↳</span>}
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {r.entity_full_name_ar || '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontSize: 10, color: 'var(--tx4)' }}>
                  <span style={{ fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>{r.cr_national_number || '—'}</span>
                  <span style={{ display: 'inline-flex', gap: 5 }}>
                    {r.is_main && <span style={{ color: C.gold, fontWeight: 600 }}>{T('رئيسي', 'M')}</span>}
                    {r._isBranch && <span style={{ color: C.blue, fontWeight: 600 }}>{T('فرع', 'B')}</span>}
                    <span style={{ color: C.purple }}>{(r._partners || []).length}</span>
                    <span style={{ color: C.cyan }}>{(r._managers || []).length}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Public — switchable lab
// ════════════════════════════════════════════════════════════════════
export default function SbcFacilityVariants({ rows, onRowClick, T, lang }) {
  const [variant, setVariant] = useState(() => {
    try { return localStorage.getItem('sbc.facility.variant') || 'a' } catch { return 'a' }
  })
  const pick = (id) => { setVariant(id); try { localStorage.setItem('sbc.facility.variant', id) } catch {} }

  const variants = [
    { id: 'a', label: T('كلاسيكي', 'Classic'),      desc: T('جدول مضغوط', 'Compact table'),      el: ClassicTable },
    { id: 'b', label: T('بطاقات', 'Stacked cards'),  desc: T('كرت كبير لكل منشأة', 'One card each'), el: StackedCards },
    { id: 'c', label: T('شبكة', 'Tile grid'),         desc: T('عمودان من البطاقات', '2-col tiles'),  el: TileGrid },
    { id: 'd', label: T('قائمة سجل', 'Roster'),       desc: T('سطر واحد لكل منشأة', 'One-line list'), el: RosterList },
    { id: 'e', label: T('كانبان', 'Kanban'),          desc: T('مجمّعة حسب الحالة', 'Grouped by status'), el: KanbanByStatus },
  ]
  const Active = variants.find(v => v.id === variant)?.el || ClassicTable

  return (
    <div>
      {/* Variant switcher */}
      <div style={{
        marginBottom: 14, padding: '10px 12px',
        background: 'linear-gradient(180deg, #1d1d1d 0%, #181818 100%)',
        border: '1px solid rgba(255,255,255,.06)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        boxShadow: '0 3px 10px rgba(0,0,0,.18)',
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx5)', letterSpacing: '.5px', textTransform: 'uppercase', marginInlineEnd: 6 }}>
          {T('اختر التصميم', 'Pick a design')}
        </div>
        {variants.map(v => {
          const active = v.id === variant
          return (
            <button key={v.id} onClick={() => pick(v.id)}
              style={{
                padding: '7px 13px', borderRadius: 8,
                background: active ? `${C.gold}1A` : 'rgba(255,255,255,.025)',
                border: `1px solid ${active ? `${C.gold}77` : 'rgba(255,255,255,.06)'}`,
                color: active ? C.gold : 'var(--tx3)',
                fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
                lineHeight: 1.2, transition: '.15s',
              }}>
              <span>{v.label}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: active ? `${C.gold}cc` : 'var(--tx5)', textTransform: 'none', letterSpacing: 0 }}>{v.desc}</span>
            </button>
          )
        })}
      </div>

      <Active rows={rows} onRowClick={onRowClick} T={T} lang={lang} />
    </div>
  )
}
