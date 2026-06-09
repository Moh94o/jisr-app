import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BackButton from './components/BackButton'
import { buildBookmarklet, buildPdfBookmarklet } from './pages/sbcSyncBookmarklet.js'
import { buildGosiBookmarklet } from './pages/gosiSyncBookmarklet.js'
import { buildQiwaBookmarklet } from './pages/qiwaSyncBookmarklet.js'
import { Sel } from './pages/KafalaCalculator.jsx'
import { can as canPerm } from './lib/permissions.js'
import { Building2 } from 'lucide-react'
import { Modal as FKModal } from './components/ui/FormKit.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 24
const num = (v) => Number(v || 0).toLocaleString('en-US')

const cardChrome = {
  borderRadius: 14,
  background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
  border: '1px solid rgba(255,255,255,.05)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
  overflow: 'hidden',
}
const cardHeader = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 22px',
  borderBottom: '1px solid rgba(255,255,255,.06)',
}
const cardTitle = { fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '.2px' }
const btnGold = { height: 40, padding: '0 16px', borderRadius: 11, background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)', border: '1px solid rgba(212,160,23,.45)', color: '#D4A017', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 12, fontWeight: 700, transition: '.2s', boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)' }
const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? '#D4A017' : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })

// Brand colors + short labels per sync source. Used by the provenance strip to
// signal "this facility's data came from {source} via {operator}".
const SOURCE_BRAND = {
  sbc:      { color: '#9b59b6', ar: 'SBC',    en: 'SBC' },
  qiwa:     { color: '#3b82f6', ar: 'قوى',    en: 'Qiwa' },
  gosi:     { color: '#22c55e', ar: 'تأمينات', en: 'GOSI' },
  muqeem:   { color: '#f59e0b', ar: 'مقيم',   en: 'Muqeem' },
  mudad:    { color: '#0ea5e9', ar: 'مدد',    en: 'Mudad' },
  zatca:    { color: '#7dd3fc', ar: 'زكاة',   en: 'ZATCA' },
  ajeer:    { color: '#eab308', ar: 'أجير',   en: 'Ajeer' },
  chambers: { color: '#06b6d4', ar: 'الغرف',  en: 'Chambers' },
}

const fmtAgo = (iso, lang) => {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const sec = Math.floor((Date.now() - t) / 1000)
  const isAr = (lang || 'ar') !== 'en'
  if (sec < 60) return isAr ? 'الآن' : 'just now'
  const m = Math.floor(sec / 60); if (m < 60) return isAr ? `قبل ${m}د` : `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return isAr ? `قبل ${h}س` : `${h}h`
  const d = Math.floor(h / 24); if (d < 30) return isAr ? `قبل ${d}ي` : `${d}d`
  const mo = Math.floor(d / 30); return isAr ? `قبل ${mo}ش` : `${mo}mo`
}

// Monospace number + trailing copy icon. Flashes gold briefly on successful copy.
function CopyableNumber({ value, onToast, copyLabel }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span style={{ color: 'rgba(255,255,255,.35)' }}>—</span>
  const onCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      onToast?.(copyLabel || 'Copied')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard api unavailable — ignore silently
    }
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--tx)', fontWeight: 700 }}>{value}</span>
      <button type="button" onClick={onCopy} title={copyLabel || 'Copy'} style={{ width: 20, height: 20, padding: 0, border: 'none', background: 'transparent', color: copied ? C.gold : 'rgba(255,255,255,.35)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'color .15s' }}
        onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.75)' }}
        onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.35)' }}>
        {copied ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
    </span>
  )
}

// Compact row used inside the merged "الأرقام" cell: a colored dot + label on
// the start side, the value + inline copy button on the end side.
function NumberRow({ color, label, value, toast, T }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async (e) => {
    e.stopPropagation()
    if (!value) return
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      toast?.(T ? T('نُسخ', 'Copied') : 'Copied')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard api unavailable — ignore silently
    }
  }
  const hasVal = !!value
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '3px 0' }} title={label}>
      {hasVal ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr', minWidth: 0 }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</span>
          <button type="button" onClick={onCopy} title={T ? T('نُسخ', 'Copy') : 'Copy'} style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', color: copied ? C.gold : 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, transition: 'color .15s', flexShrink: 0 }}
            onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.7)' }}
            onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.3)' }}>
            {copied ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
          </button>
        </span>
      ) : (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11.5, color: 'rgba(255,255,255,.3)' }}>—</span>
      )}
    </div>
  )
}

// Compact person/entity entry used inside the merged "الملاك" / "المدراء" cells.
// For individuals: shows first + last name + national ID.
// For company/entity partners (Saudi co, establishment, foreign co, gov, etc.),
// SBC nests the data under a non-null entity block (saudiCompany, establishment,
// etc.) instead of personInfo. We pull the company/entity name and CR number
// from whichever block is populated.
function extractPartyDisplay(p) {
  if (!p) return { name: '—', id: '', isCompany: false }
  const info = p.personInfo
  if (info && (info.firstNameAr || info.firstNameEn)) {
    const first = info.firstNameAr || info.firstNameEn || ''
    const last  = info.familyNameAr || info.familyNameEn || ''
    return {
      name: `${first} ${last}`.trim() || info.firstNameAr || '—',
      id: info.identifierNo || '',
      isCompany: false,
    }
  }
  // Entity blocks SBC may use; we just take whichever is populated and pull
  // the most-likely name + CR/ID fields out of it.
  const entityKeys = [
    'saudiCompany', 'establishment', 'foreignCompany', 'civilAssociation',
    'pressInstitution', 'cooperativeSociety', 'governmentalEntity',
    'specialPurposeEntity', 'gccGovernmentalEntity', 'foreignGovernmentalEntity',
    'gccCompany', 'organization', 'endowment', 'institute',
  ]
  for (const k of entityKeys) {
    const e = p[k]
    if (e && typeof e === 'object') {
      const name = e.companyNameAr || e.entityNameAr || e.nameAr || e.institutionNameAr
        || e.organizationNameAr || e.companyNameEn || e.entityNameEn || e.nameEn
        || e.institutionNameEn || e.organizationNameEn || '—'
      const id = e.crNationalNumber || e.identifierNo || e.crNumber || e.commercialRegistrationNumber || e.identifier || ''
      return { name, id, isCompany: true }
    }
  }
  return { name: '—', id: '', isCompany: false }
}

function PersonCompact({ p, dotColor }) {
  const { name, id, isCompany } = extractPartyDisplay(p)
  // Companies get the gold "entity" color regardless of context (owners or
  // managers); individuals keep the caller's hue (blue for owners, purple for
  // managers). Visual distinction makes it easy to scan who's a person vs an
  // owning/managing entity.
  const color = isCompany ? C.gold : (dotColor || 'rgba(255,255,255,.85)')
  const words = (name || '').split(/\s+/).filter(Boolean)
  const isLong = words.length > 3
  const shortName = isLong ? words.slice(0, 3).join(' ') + '…' : name
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '2px 0', minWidth: 0, width: '100%' }}>
      <div className={isLong ? 'pc-marquee pc-marquee-long' : 'pc-marquee'} title={name} style={{ fontSize: 10.5, fontWeight: 700, color }}>
        <span className="pc-short">{shortName}</span>
        {isLong && <span className="pc-full">{name}</span>}
      </div>
      {id && (
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,.55)', direction: 'ltr', fontVariantNumeric: 'tabular-nums', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{id}</span>
      )}
    </div>
  )
}

// Sibling of NumberRow used inside the merged "التواريخ" cell. Labels on the
// start side, date value on the end side. Missing dates show a faint "—".
function DateRow({ label, value, T, confirm }) {
  const hasVal = value && value !== '—'
  let valColor = hasVal ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.3)'
  if (confirm && hasVal) {
    const t = new Date(value).getTime()
    if (!Number.isNaN(t)) {
      const daysDiff = Math.floor((Date.now() - t) / 86400000)
      if (daysDiff < 0) valColor = '#22c55e'
      else if (daysDiff <= 90) valColor = '#eab308'
      else valColor = '#ef4444'
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '2px 0' }} title={hasVal ? `${label}: ${value}` : label}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 700, color: valColor, fontVariantNumeric: 'tabular-nums', direction: 'ltr', whiteSpace: 'nowrap' }}>{hasVal ? value : '—'}</span>
    </div>
  )
}

// Countdown to the CR's next status transition, driven by the annual
// confirmation date. Before that date it counts days until the confirmation
// window opens (yellow); within the 90-day window it counts days left before
// suspension (red). Returns null outside both ranges — nothing actionable.
// `compact` shrinks it for table cells; the status card uses the default size.
function CrCountdown({ confirmDate, T, compact, style }) {
  if (!confirmDate) return null
  const t = new Date(confirmDate).getTime()
  if (Number.isNaN(t)) return null
  const daysDiff = Math.floor((Date.now() - t) / 86400000)
  let remain, color, tip
  if (daysDiff < 0) {
    remain = -daysDiff
    color = '#eab308'
    tip = T('يوم حتى الدخول في فترة التأكيد', 'days until confirmation window')
  } else if (daysDiff <= 90) {
    remain = 90 - daysDiff
    color = '#ef4444'
    tip = T('يوم قبل تعليق السجل', 'days before suspension')
  } else {
    return null
  }
  const sz = compact ? 9 : 10
  return (
    <span title={`${remain} ${tip}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 5,
      color, fontSize: compact ? 9.5 : 10.5, fontWeight: 800,
      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
      ...style,
    }}>
      <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
      <span style={{ direction: 'ltr' }}>{remain}</span>
      <span style={{ fontWeight: 600, opacity: .85 }}>{T('يوم','d')}</span>
    </span>
  )
}

// Activities card — collapsed by default; click the header to expand/collapse.
// Small source-attribution icon — flags a card as being sourced from the
// Saudi Business Center (SBC). Image lives at public/sbc-logo.jpg. If the
// image fails to load (file not present yet), we swap to a small text
// badge "م.س" so the chrome doesn't show a broken-image icon.
function SbcSourceIcon({ size = 16 }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        title="المركز السعودي للأعمال"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: size, height: size, borderRadius: 4,
          background: 'rgba(212,160,23,.18)', color: '#D4A017',
          fontSize: Math.round(size * 0.55), fontWeight: 800,
          flexShrink: 0, lineHeight: 1, fontFamily: F,
        }}>م.س</span>
    )
  }
  return (
    <img
      src="/sbc-logo.jpg"
      alt="SBC"
      title="المركز السعودي للأعمال"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

// GOSI source icon — uses the official logo at public/gosi.logo.png. Same
// img-with-text-fallback pattern as SbcSourceIcon so the chrome stays
// consistent if the image is ever missing.
function GosiSourceIcon({ size = 16 }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        title="المؤسسة العامة للتأمينات الاجتماعية"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: size, height: size, borderRadius: 4,
          background: 'rgba(34,197,94,.18)', color: '#22c55e',
          fontSize: Math.round(size * 0.55), fontWeight: 800,
          flexShrink: 0, lineHeight: 1, fontFamily: F,
        }}>تأ</span>
    )
  }
  return (
    <img
      src="/gosi.logo.png"
      alt="GOSI"
      title="المؤسسة العامة للتأمينات الاجتماعية"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

// Qiwa visa-requests history card — lazy-loads rows from qiwa_visa_requests
// for the given company_id when expanded. Empty state when no rows exist.
function QiwaVisaRequestsCard({ sb, companyId, T }) {
  const [rows, setRows] = useState(null) // null = not loaded, [] = empty, [...] = loaded
  const [loading, setLoading] = useState(false)
  // Lazy: only query when companyId is set; cache by companyId
  useEffect(() => {
    if (!sb || !companyId) { setRows(null); return }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data } = await sb.from('qiwa_visa_requests')
        .select('id, request_id, type_name, subtype, status, starting_date, approval_date, visa_number, visa_number_sum, rejection_reason')
        .eq('company_id', companyId)
        .order('starting_date', { ascending: false, nullsFirst: false })
      if (!cancelled) { setRows(data || []); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [sb, companyId])

  if (!rows && !loading) return null
  if (rows && rows.length === 0) return null

  return (
    <CollapsibleCard
      title={T('سجل طلبات التأشيرات', 'Visa Requests History')}
      color="#3b82f6" showQiwaIcon
      badge={rows?.length}>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <div style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('جارٍ التحميل…', 'Loading…')}</div>}
        {rows && rows.map(r => {
          const accepted = r.status === 'accepted'
          const dotColor = accepted ? '#22c55e' : (r.status === 'rejected' ? '#ef4444' : '#f59e0b')
          return (
            <div key={r.id}
              style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,.025)',
                border: '1px solid rgba(255,255,255,.06)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 4, columnGap: 16,
                fontSize: 11.5,
              }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <span style={{ fontWeight: 800, color: 'var(--tx)', direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{r.request_id || `#${r.id}`}</span>
                <span style={{ fontSize: 10, color: dotColor, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: dotColor + '14' }}>{r.status}</span>
                {r.visa_number_sum > 0 && <span style={{ marginInlineStart: 'auto', fontSize: 10, color: 'var(--tx5)', fontWeight: 700 }}>{r.visa_number_sum} {T('تأشيرة', 'visa(s)')}</span>}
              </div>
              {r.type_name && <div style={{ color: 'var(--tx4)' }}>{T('النوع', 'Type')}: <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{r.type_name}</span></div>}
              {r.subtype && <div style={{ color: 'var(--tx4)' }}>{T('الفئة', 'Subtype')}: <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{r.subtype}</span></div>}
              {r.visa_number && <div style={{ color: 'var(--tx4)' }}>{T('رقم التأشيرة', 'Visa no.')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>{r.visa_number}</span></div>}
              {r.approval_date && <div style={{ color: 'var(--tx4)' }}>{T('تاريخ الموافقة', 'Approved')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{r.approval_date.slice(0, 10)}</span></div>}
              {r.starting_date && <div style={{ color: 'var(--tx4)' }}>{T('تاريخ البدء', 'Started')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{r.starting_date.slice(0, 10)}</span></div>}
              {r.rejection_reason && <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: 10.5 }}>{T('سبب الرفض', 'Rejection reason')}: {r.rejection_reason}</div>}
            </div>
          )
        })}
      </div>
    </CollapsibleCard>
  )
}

// Qiwa work-permit requests history card — lazy-loads from qiwa_wp_requests
// (one row per sadad-paid WP request).
function QiwaWpRequestsCard({ sb, companyId, T }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!sb || !companyId) { setRows(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('qiwa_wp_requests')
        .select('request_reference_number, request_submission_date, number_of_employees, sadad_number, wp_status_code, wp_status_ar, total_fees, is_premium')
        .eq('company_id', companyId)
        .order('request_submission_date', { ascending: false, nullsFirst: false })
      if (!cancelled) setRows(data || [])
    })()
    return () => { cancelled = true }
  }, [sb, companyId])
  if (!rows || rows.length === 0) return null
  return (
    <CollapsibleCard
      title={T('سجل طلبات رخص العمل', 'Work Permit Requests')}
      color="#3b82f6" showQiwaIcon
      badge={rows.length}>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => {
          const paid = r.wp_status_code === 3
          const dotColor = paid ? '#22c55e' : '#f59e0b'
          return (
            <div key={r.request_reference_number}
              style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,.025)',
                border: '1px solid rgba(255,255,255,.06)',
                display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 4, columnGap: 16,
                fontSize: 11.5,
              }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <span style={{ fontWeight: 800, color: 'var(--tx)', direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{r.request_reference_number}</span>
                <span style={{ fontSize: 10, color: dotColor, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: dotColor + '14' }}>{r.wp_status_ar}</span>
                {r.is_premium && <span style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#a78bfa14' }}>{T('بريميوم', 'Premium')}</span>}
              </div>
              <div style={{ color: 'var(--tx4)' }}>{T('عدد الموظفين', 'Employees')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{r.number_of_employees}</span></div>
              <div style={{ color: 'var(--tx4)' }}>{T('إجمالي الرسوم', 'Total fees')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{r.total_fees} {T('ر.س', 'SAR')}</span></div>
              <div style={{ color: 'var(--tx4)' }}>{T('رقم سداد', 'Sadad')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{r.sadad_number}</span></div>
              {r.request_submission_date && <div style={{ color: 'var(--tx4)' }}>{T('تاريخ التقديم', 'Submitted')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{r.request_submission_date.slice(0, 10)}</span></div>}
            </div>
          )
        })}
      </div>
    </CollapsibleCard>
  )
}

// Qiwa laborers card — current workers + their work-permit expiry. Shows
// expired-WP rows in red. Lazy-loaded by company_id.
// Per-laborer expandable detail block. Used inside QiwaWpLaborersCard so each
// row collapses by default (the list can run into hundreds) and expands to
// reveal every column qiwa_wp_laborers stores: personal, iqama, work permit,
// contract, occupation, transfer, GOSI/location.
function LaborerDetailRow({ r, T }) {
  const [open, setOpen] = useState(false)
  const expired = r.is_wp_expired
  const c = expired ? '#ef4444' : '#22c55e'
  const yesNo = (b) => b == null ? null : (b ? T('نعم', 'Yes') : T('لا', 'No'))
  const date = (s) => s ? String(s).slice(0, 10) : null
  // Tightly packed two-column key/value grid. Hides null/empty rows so the
  // user only sees populated fields per worker.
  const Field = ({ k, v, ltr, mono }) => (v == null || v === '' ? null : (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: ltr ? 'ltr' : undefined, fontFamily: mono ? 'ui-monospace, monospace' : undefined }} title={typeof v === 'string' ? v : undefined}>{v}</span>
    </div>
  ))
  const Section = ({ title, children }) => {
    const visible = React.Children.toArray(children).filter(Boolean)
    if (visible.length === 0) return null
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, color: 'rgba(255,255,255,.45)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 4, paddingInlineStart: 2 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>{visible}</div>
      </div>
    )
  }
  return (
    <div style={{
      borderRadius: 8,
      background: expired ? 'rgba(239,68,68,.05)' : 'rgba(255,255,255,.025)',
      border: `1px solid ${expired ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.06)'}`,
      overflow: 'hidden',
    }}>
      {/* Header — always visible, click to expand */}
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 4, columnGap: 12, alignItems: 'center', fontSize: 11.5, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'inherit', fontFamily: 'inherit' }}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
          <span style={{ fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.employee_name?.replace(/\s+/g, ' ').trim() || '—'}</span>
          <span style={{ fontSize: 10, color: 'var(--tx5)', fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>{r.employee_id}</span>
          {r.nationality_name_ar && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>· {r.nationality_name_ar}</span>}
          {r.job_title_ar && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>· {r.job_title_ar}</span>}
          {r.wp_status_text && <span style={{ fontSize: 9.5, color: c, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: c + '14', marginInlineStart: 'auto' }}>{r.wp_status_text}</span>}
          {r.gosi_registered && <span style={{ fontSize: 9.5, color: '#22c55e', fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: '#22c55e14' }}>GOSI ✓</span>}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--tx5)', transform: open ? 'rotate(180deg)' : 'none', transition: '.2s', marginInlineStart: r.wp_status_text || r.gosi_registered ? 0 : 'auto' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('انتهاء الإقامة', 'Iqama exp')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{date(r.employee_id_exp_date) || '—'}</span></div>
        <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('انتهاء الرخصة', 'WP exp')}: <span style={{ color: c, fontWeight: 700, direction: 'ltr' }}>{date(r.work_permit_exp_date) || '—'}</span></div>
      </button>

      {/* Expanded: every column on qiwa_wp_laborers, organized by section */}
      {open && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px dashed rgba(255,255,255,.06)' }}>
          <Section title={T('الهوية والبيانات الشخصية', 'Identity & personal')}>
            <Field k={T('الاسم الأول', 'First name')} v={r.first_name} />
            <Field k={T('الاسم الثاني', 'Second name')} v={r.second_name} />
            <Field k={T('الاسم الثالث', 'Third name')} v={r.third_name} />
            <Field k={T('الاسم الرابع', 'Fourth name')} v={r.fourth_name} />
            <Field k={T('سنة الميلاد', 'Year of birth')} v={r.year_of_birth} ltr />
            <Field k={T('تاريخ الميلاد', 'Date of birth')} v={date(r.date_of_birth)} ltr />
            <Field k={T('الجنس (id)', 'Gender id')} v={r.gender_id} ltr />
            <Field k={T('الجنسية (id)', 'Nationality id')} v={r.nationality_id} ltr />
            <Field k={T('الجنسية', 'Nationality')} v={r.nationality_name_ar || r.nationality_name_en} />
            <Field k={T('سعودي', 'Saudi')} v={yesNo(r.is_saudi)} />
            <Field k={T('طالب', 'Student')} v={yesNo(r.is_student)} />
            <Field k={T('دوام جزئي', 'Part-timer')} v={yesNo(r.is_part_timer)} />
            <Field k={T('عمل عن بُعد', 'Remote working')} v={yesNo(r.is_remote_working)} />
            <Field k={T('ذو إعاقة', 'Disabled')} v={yesNo(r.is_disabled)} />
            <Field k={T('Qiwa employee ID', 'Qiwa employee ID')} v={r.qiwa_employee_id} mono />
          </Section>

          <Section title={T('الإقامة والحدود', 'Iqama & border')}>
            <Field k={T('رقم الإقامة', 'Iqama no.')} v={r.employee_id} mono />
            <Field k={T('انتهاء الإقامة', 'Iqama expiry')} v={date(r.iqama_expiry_date) || date(r.employee_id_exp_date)} ltr />
            <Field k={T('وقت انتهاء الإقامة', 'Iqama expiry time')} v={r.iqama_expiry_time} ltr />
            <Field k={T('رقم الحدود', 'Border no.')} v={r.border_no} mono />
            <Field k={T('حالة العامل', 'Status')} v={r.status} />
          </Section>

          <Section title={T('رخصة العمل', 'Work permit')}>
            <Field k={T('حالة الرخصة', 'WP status')} v={r.wp_status_text} />
            <Field k={T('تاريخ بداية الرخصة', 'WP start date')} v={date(r.wp_start_date)} ltr />
            <Field k={T('انتهاء الرخصة', 'WP expiry')} v={date(r.work_permit_exp_date)} ltr />
            <Field k={T('وقت انتهاء الرخصة', 'WP expiry time')} v={r.wp_expiry_time} ltr />
            <Field k={T('رقم الرخصة', 'WP number')} v={r.wp_number} mono />
            <Field k={T('مدفوعة', 'WP paid')} v={yesNo(r.wp_paid)} />
            <Field k={T('رقم معاملة الرخصة', 'WP transaction no.')} v={r.wp_transaction_number} mono />
            <Field k={T('رسوم المعاملة', 'WP transaction fees')} v={r.wp_transaction_fees != null ? `${r.wp_transaction_fees} ${T('ر.س', 'SAR')}` : null} ltr />
            <Field k={T('انتهاء سداد الرخصة', 'Sadad expiry')} v={date(r.wp_transaction_sadad_expiry)} ltr />
            <Field k={T('رخصة منتهية', 'WP expired')} v={yesNo(r.is_wp_expired)} />
          </Section>

          <Section title={T('العقد', 'Contract')}>
            <Field k={T('نوع العقد (id)', 'Contract type id')} v={r.contract_type_id} ltr />
            <Field k={T('نوع العقد', 'Contract type')} v={r.contract_type_ar || r.contract_type_en} />
            <Field k={T('تاريخ بداية العقد', 'Contract start')} v={date(r.contract_start_date)} ltr />
            <Field k={T('تاريخ انتهاء العقد', 'Contract expiry')} v={date(r.contract_expiry_date)} ltr />
            <Field k={T('مدة العقد', 'Contract period')} v={r.contract_period != null ? `${r.contract_period} ${T('يوم', 'days')}` : null} ltr />
            <Field k={T('متبقي من العقد', 'Contract remaining')} v={r.remaining_contract_days != null ? `${r.remaining_contract_days} ${T('يوم', 'days')}` : null} ltr />
            <Field k={T('فترة الإشعار', 'Notice period')} v={r.notice_period != null ? `${r.notice_period} ${T('يوم', 'days')}` : null} ltr />
            <Field k={T('رقم العقد', 'Contract number')} v={r.contract_number} mono />
            <Field k={T('نسخة العقد', 'Contract version')} v={r.contract_version} ltr />
            <Field k={T('مهنة العقد', 'Contract occupation')} v={r.contract_occupation_ar || r.contract_occupation_en} />
            <Field k={T('كود حالة التوظيف', 'Employment status code')} v={r.employment_status_code} mono />
            <Field k={T('حالة التوظيف', 'Employment status')} v={r.employment_status_ar || r.employment_status_en} />
          </Section>

          <Section title={T('المهنة والتصنيف', 'Occupation & classification')}>
            <Field k={T('المهنة (id)', 'Job id')} v={r.job_id} ltr />
            <Field k={T('المسمى الوظيفي', 'Job title')} v={r.job_title_ar || r.job_title_en} />
            <Field k={T('المهنة صحيحة', 'Correct occupation')} v={yesNo(r.correct_occupation)} />
            <Field k={T('تحتاج تصحيح مهنة', 'Need occupation correction')} v={yesNo(r.need_occupation_correction)} />
            <Field k={T('تصنيف LMH', 'LMH classification')} v={r.lmh_classification} />
          </Section>

          <Section title={T('النقل والإنهاء', 'Transfer & termination')}>
            <Field k={T('رقم طلب النقل', 'Transfer request no.')} v={r.transfer_request_number} mono />
            <Field k={T('تاريخ إطلاق الإنهاء', 'Termination release date')} v={date(r.terminate_release_date)} ltr />
            <Field k={T('أيام متبقية للإنهاء', 'Remaining term days')} v={r.remaining_term_days != null ? `${r.remaining_term_days} ${T('يوم', 'days')}` : null} ltr />
          </Section>

          <Section title={T('الموقع والتأمينات', 'Location & GOSI')}>
            <Field k={T('معرّف الموقع', 'Location id')} v={r.assigned_location_id} ltr />
            <Field k={T('الموقع المعيّن', 'Assigned location')} v={r.assigned_location_name} />
            <Field k={T('مسجّل بالتأمينات', 'GOSI registered')} v={yesNo(r.gosi_registered)} />
          </Section>
        </div>
      )}
    </div>
  )
}

function QiwaWpLaborersCard({ sb, companyId, T }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!sb || !companyId) { setRows(null); return }
    let cancelled = false
    ;(async () => {
      // Pull every column the bookmarklet writes — each worker row expands to
      // show all of them, so we can't pre-pick a subset.
      const { data } = await sb.from('qiwa_wp_laborers')
        .select('*')
        .eq('company_id', companyId)
        .order('is_wp_expired', { ascending: false })
        .order('work_permit_exp_date', { ascending: true, nullsFirst: false })
      if (!cancelled) setRows(data || [])
    })()
    return () => { cancelled = true }
  }, [sb, companyId])
  if (!rows || rows.length === 0) return null
  const expiredCount = rows.filter(r => r.is_wp_expired).length
  return (
    <CollapsibleCard
      title={T('العمالة ورخص العمل', 'Laborers & Work Permits')}
      color="#3b82f6" showQiwaIcon
      badge={rows.length + (expiredCount > 0 ? ` · ${expiredCount} ${T('منتهية', 'expired')}` : '')}>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(r => <LaborerDetailRow key={r.employee_id} r={r} T={T} />)}
      </div>
    </CollapsibleCard>
  )
}

// Per-resident expandable detail block used inside the Muqeem residents card.
// Same UX pattern as LaborerDetailRow: collapsed header shows the essentials,
// expanded view reveals every column we store on muqeem_residents.
function MuqeemResidentRow({ r, T }) {
  const [open, setOpen] = useState(false)
  const date = (s) => s ? String(s).slice(0, 10) : null
  const today = new Date(); today.setHours(0,0,0,0)
  const iqamaExp = r.iqama_expiry_date ? new Date(r.iqama_expiry_date).getTime() : null
  const daysToExpiry = iqamaExp ? Math.ceil((iqamaExp - today.getTime()) / 86400000) : null
  const expired = daysToExpiry != null && daysToExpiry < 0
  const expiringSoon = daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry <= 30
  const c = expired ? '#ef4444' : (expiringSoon ? '#f59e0b' : '#22c55e')
  const Field = ({ k, v, ltr, mono }) => (v == null || v === '' ? null : (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
      <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: ltr ? 'ltr' : undefined, fontFamily: mono ? 'ui-monospace, monospace' : undefined }} title={typeof v === 'string' ? v : undefined}>{v}</span>
    </div>
  ))
  const Section = ({ title, children }) => {
    const visible = React.Children.toArray(children).filter(Boolean)
    if (visible.length === 0) return null
    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, color: 'rgba(255,255,255,.45)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 4, paddingInlineStart: 2 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>{visible}</div>
      </div>
    )
  }
  return (
    <div style={{
      borderRadius: 8,
      background: expired ? 'rgba(239,68,68,.05)' : (expiringSoon ? 'rgba(245,158,11,.05)' : 'rgba(255,255,255,.025)'),
      border: `1px solid ${expired ? 'rgba(239,68,68,.2)' : (expiringSoon ? 'rgba(245,158,11,.22)' : 'rgba(255,255,255,.06)')}`,
      overflow: 'hidden',
    }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 4, columnGap: 12, alignItems: 'center', fontSize: 11.5, background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'inherit', fontFamily: 'inherit' }}>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
          <span style={{ fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar || r.name_en || '—'}</span>
          <span style={{ fontSize: 10, color: 'var(--tx5)', fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>{r.iqama_number}</span>
          {r.nationality_ar && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>· {r.nationality_ar}</span>}
          {r.occupation_ar && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>· {r.occupation_ar}</span>}
          {r.is_outside_kingdom && <span style={{ fontSize: 9.5, color: '#f59e0b', fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: '#f59e0b14' }}>{T('خارج المملكة', 'Outside KSA')}</span>}
          {r.status_ar && <span style={{ fontSize: 9.5, color: c, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: c + '14', marginInlineStart: 'auto' }}>{r.status_ar}</span>}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--tx5)', transform: open ? 'rotate(180deg)' : 'none', transition: '.2s', marginInlineStart: r.status_ar ? 0 : 'auto' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('انتهاء الإقامة', 'Iqama exp')}: <span style={{ color: c, fontWeight: 700, direction: 'ltr' }}>{date(r.iqama_expiry_date) || '—'}</span>{daysToExpiry != null && <span style={{ marginInlineStart: 6, fontSize: 10, color: 'var(--tx5)' }}>({daysToExpiry >= 0 ? `${daysToExpiry} ${T('يوم', 'd')}` : T('منتهية', 'expired')})</span>}</div>
        <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('انتهاء الجواز', 'Passport exp')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{date(r.passport_expiry) || '—'}</span></div>
      </button>

      {open && (
        <div style={{ padding: '0 12px 10px', borderTop: '1px dashed rgba(255,255,255,.06)' }}>
          <Section title={T('الهوية والبيانات الشخصية', 'Identity & personal')}>
            <Field k={T('الاسم بالعربي', 'Name (AR)')} v={r.name_ar} />
            <Field k={T('الاسم بالإنجليزي', 'Name (EN)')} v={r.name_en} />
            <Field k={T('رقم الإقامة', 'Iqama no.')} v={r.iqama_number} mono />
            <Field k={T('رقم كفيل (MOI)', 'Sponsor MOI')} v={r.sponsor_moi_number} mono />
            <Field k={T('تاريخ الميلاد', 'Date of birth')} v={date(r.birth_date)} ltr />
            <Field k={T('الجنس (AR)', 'Gender (AR)')} v={r.gender_ar} />
            <Field k={T('الجنس (EN)', 'Gender (EN)')} v={r.gender_en} />
            <Field k={T('كود الجنس', 'Gender code')} v={r.gender_code} mono />
            <Field k={T('الجنسية', 'Nationality')} v={r.nationality_ar || r.nationality_en} />
            <Field k={T('كود الجنسية', 'Nationality code')} v={r.nationality_code} mono />
            <Field k={T('خارج المملكة', 'Outside kingdom')} v={r.is_outside_kingdom == null ? null : (r.is_outside_kingdom ? T('نعم', 'Yes') : T('لا', 'No'))} />
          </Section>

          <Section title={T('المهنة', 'Occupation')}>
            <Field k={T('المهنة (AR)', 'Occupation (AR)')} v={r.occupation_ar} />
            <Field k={T('المهنة (EN)', 'Occupation (EN)')} v={r.occupation_en} />
            <Field k={T('كود المهنة', 'Occupation code')} v={r.occupation_code} mono />
          </Section>

          <Section title={T('الإقامة', 'Iqama')}>
            <Field k={T('تاريخ إصدار الإقامة', 'Iqama issue date')} v={date(r.iqama_issue_date)} ltr />
            <Field k={T('تاريخ انتهاء الإقامة', 'Iqama expiry date')} v={date(r.iqama_expiry_date)} ltr />
            <Field k={T('انتهاء الإقامة (هجري)', 'Iqama expiry (H)')} v={r.iqama_expiry_hijri} ltr />
            <Field k={T('الحالة (AR)', 'Status (AR)')} v={r.status_ar} />
            <Field k={T('الحالة (EN)', 'Status (EN)')} v={r.status_en} />
            <Field k={T('كود الحالة', 'Status code')} v={r.status_code} mono />
          </Section>

          <Section title={T('الجواز', 'Passport')}>
            <Field k={T('رقم الجواز', 'Passport number')} v={r.passport_number} mono />
            <Field k={T('انتهاء الجواز', 'Passport expiry')} v={date(r.passport_expiry)} ltr />
          </Section>

          {r.profile_pdf_path && (
            <Section title={T('الملفات', 'Files')}>
              <Field k={T('ملف الإقامة (PDF)', 'Iqama profile PDF')} v={date(r.profile_pdf_at) || '✓'} ltr />
            </Section>
          )}
        </div>
      )}
    </div>
  )
}
// Qiwa employee-transfer requests — listed inline inside the transfer card
// when the parent expands. Splits received vs sent visually.
function QiwaTransferRequestsList({ sb, companyId, T }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!sb || !companyId) { setRows(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('qiwa_transfer_requests')
        .select('request_id, direction, status, status_ar, status_en, employee_id, employee_name, current_employer_name, new_employer_name, release_date, created_at_qiwa, expires_at')
        .eq('company_id', companyId)
        .order('created_at_qiwa', { ascending: false, nullsFirst: false })
      if (!cancelled) setRows(data || [])
    })()
    return () => { cancelled = true }
  }, [sb, companyId])
  if (!rows || rows.length === 0) return null
  const received = rows.filter(r => r.direction === 'received')
  const sent = rows.filter(r => r.direction === 'sent')
  const Item = ({ r }) => {
    const isCompleted = r.status === 'APPROVED' || r.status_id === 5
    const isRejected = (r.status || '').includes('REJECT')
    const c = isCompleted ? '#22c55e' : isRejected ? '#ef4444' : '#f59e0b'
    return (
      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', fontSize: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, color: 'var(--tx)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.employee_name || r.employee_id || r.request_id}</span>
          <span style={{ fontSize: 9.5, fontWeight: 700, color: c, padding: '1px 6px', borderRadius: 5, background: c + '14' }}>{r.status_ar || r.status_en || r.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 12, color: 'var(--tx5)', fontSize: 10, flexWrap: 'wrap', direction: 'ltr', justifyContent: 'flex-start' }}>
          {r.current_employer_name && <span>{T('من:', 'From:')} <span style={{ color: 'var(--tx3)' }}>{r.current_employer_name}</span></span>}
          {r.new_employer_name && <span>{T('إلى:', 'To:')} <span style={{ color: 'var(--tx3)' }}>{r.new_employer_name}</span></span>}
          {r.created_at_qiwa && <span style={{ marginInlineStart: 'auto' }}>{r.created_at_qiwa.slice(0, 10)}</span>}
        </div>
      </div>
    )
  }
  return (
    <div style={{ padding: '0 22px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {received.length > 0 && (
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--tx5)', marginBottom: 6, letterSpacing: '.4px' }}>{T(`طلبات واردة (${received.length})`, `Received (${received.length})`)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {received.map(r => <Item key={`r-${r.request_id}`} r={r} />)}
          </div>
        </div>
      )}
      {sent.length > 0 && (
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--tx5)', marginBottom: 6, letterSpacing: '.4px' }}>{T(`طلبات صادرة (${sent.length})`, `Sent (${sent.length})`)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sent.map(r => <Item key={`s-${r.request_id}`} r={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}

// Qiwa monthly company report card — fetches the most recent report row
// from qiwa_monthly_reports. The bookmarklet always writes the PREVIOUS
// calendar month, so this is effectively "last month's report card".
function QiwaMonthlyReportCard({ sb, companyId, T }) {
  const [row, setRow] = useState(null)
  useEffect(() => {
    if (!sb || !companyId) { setRow(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('qiwa_monthly_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('report_year', { ascending: false })
        .order('report_month', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) setRow(data || null)
    })()
    return () => { cancelled = true }
  }, [sb, companyId])
  if (!row) return null

  // Format the period as "MMM YYYY" in the user's locale.
  const periodLabel = `${String(row.report_month).padStart(2, '0')}/${row.report_year}`
  // Score row with diff badge — green up arrow if +, red down if -.
  const ScoreRow = ({ k, v, diff }) => (v == null ? null : (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px dashed rgba(255,255,255,.05)', fontSize: 12 }}>
      <span style={{ color: 'var(--tx4)' }}>{k}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--tx2)', fontWeight: 800, direction: 'ltr' }}>{Number(v).toFixed(0)}%</span>
        {diff != null && diff !== 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, direction: 'ltr',
            color: diff > 0 ? '#22c55e' : '#ef4444',
            background: diff > 0 ? 'rgba(34,197,94,.14)' : 'rgba(239,68,68,.14)' }}>
            {diff > 0 ? '▲' : '▼'} {Math.abs(Number(diff)).toFixed(0)}%
          </span>
        )}
      </span>
    </div>
  ))
  const EmpRow = ({ k, v, diff }) => (v == null ? null : (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px dashed rgba(255,255,255,.05)', fontSize: 12 }}>
      <span style={{ color: 'var(--tx4)' }}>{k}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--tx2)', fontWeight: 800, direction: 'ltr' }}>{v}</span>
        {diff != null && diff !== 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, direction: 'ltr',
            color: diff > 0 ? '#22c55e' : '#ef4444',
            background: diff > 0 ? 'rgba(34,197,94,.14)' : 'rgba(239,68,68,.14)' }}>
            {diff > 0 ? '+' : ''}{diff}
          </span>
        )}
      </span>
    </div>
  ))
  return (
    <CollapsibleCard
      title={T(`التقرير الشهري · ${periodLabel}`, `Monthly Report · ${periodLabel}`)}
      color="#3b82f6" showQiwaIcon
      badge={row.score_primary != null ? `${Number(row.score_primary).toFixed(0)}%` : null}>
      <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24 }}>
        {/* Scores column */}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.5px', marginBottom: 6, textTransform: 'uppercase' }}>{T('المؤشرات', 'Scores')}</div>
          <ScoreRow k={T('الدرجة العامة', 'Primary score')} v={row.score_primary} diff={row.score_primary_diff} />
          <ScoreRow k={T('النطاقات', 'Nitaqat')} v={row.score_nitaqat} diff={row.score_nitaqat_diff} />
          <ScoreRow k={T('رخص العمل', 'Work permits')} v={row.score_work_permits} diff={row.score_work_permits_diff} />
          <ScoreRow k={T('ملاحظات WPS', 'WPS notes')} v={row.score_notes_in_wps} diff={row.score_notes_in_wps_diff} />
          <ScoreRow k={T('توثيق العقود', 'Contract auth')} v={row.score_contract_auth} diff={row.score_contract_auth_diff} />
          <ScoreRow k={T('موقع العامل', 'Laborer location')} v={row.score_labourer_location} diff={row.score_labourer_location_diff} />
        </div>
        {/* Workforce + WP + Phase column */}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.5px', marginBottom: 6, textTransform: 'uppercase' }}>{T('العمالة', 'Workforce')}</div>
          <EmpRow k={T('الإجمالي', 'Total')} v={row.emp_total} diff={row.emp_total_diff} />
          <EmpRow k={T('سعوديون', 'Saudis')} v={row.emp_saudis} diff={row.emp_saudis_diff} />
          <EmpRow k={T('غير سعوديين', 'Foreigners')} v={row.emp_foreigners} diff={row.emp_foreigners_diff} />
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.5px', margin: '10px 0 6px', textTransform: 'uppercase' }}>{T('رخص العمل', 'Work Permits')}</div>
          <EmpRow k={T('سارية', 'Valid')} v={row.wp_valid_est} />
          <EmpRow k={T('منتهية', 'Expired')} v={row.wp_expired_est} />
          <EmpRow k={T('عقود موثقة', 'Auth. contracts')} v={row.total_authenticated_contracts} />
        </div>
      </div>
      <div style={{ padding: '0 22px 14px', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 11, color: 'var(--tx5)' }}>
        {row.phase_status && <span><strong>{T('مرحلة المنشأة', 'Phase')}:</strong> {row.phase_status}</span>}
        {row.nitaqat_ar && <span><strong>{T('النطاق', 'Nitaq')}:</strong> {row.nitaqat_ar}</span>}
        {row.company_size_ar && <span><strong>{T('الحجم', 'Size')}:</strong> {row.company_size_ar}</span>}
        {row.created_time && <span style={{ marginInlineStart: 'auto', direction: 'ltr' }}>{T('صدر في', 'Created')}: {row.created_time.slice(0, 10)}</span>}
      </div>
    </CollapsibleCard>
  )
}

// Qiwa contracts card — per-contract list with GOSI sync result. Lazy-loaded
// by company_id. Active contracts are green, terminated red, others amber.
function QiwaContractsCard({ sb, companyId, T }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!sb || !companyId) { setRows(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('qiwa_contracts')
        .select('contract_id, laborer_name, personal_number, contract_type_ar, status_id, status_ar, expiry_date_gregorian, last_modified_gregorian, gosi_status, gosi_description, is_unified')
        .eq('company_id', companyId)
        .order('last_modified_gregorian', { ascending: false, nullsFirst: false })
      if (!cancelled) setRows(data || [])
    })()
    return () => { cancelled = true }
  }, [sb, companyId])
  if (!rows || rows.length === 0) return null
  const errCount = rows.filter(r => r.gosi_status === 'ERROR').length
  return (
    <CollapsibleCard
      title={T('سجل العقود', 'Contracts Log')}
      color="#3b82f6" showQiwaIcon
      badge={rows.length + (errCount > 0 ? ` · ${errCount} GOSI` : '')}>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => {
          const statusColor = r.status_id === '15' ? '#22c55e' : r.status_id === '11' ? '#ef4444' : '#f59e0b'
          const gosiColor = r.gosi_status === 'SUCCESS' ? '#22c55e' : r.gosi_status === 'ERROR' ? '#ef4444' : 'var(--tx5)'
          return (
            <div key={r.contract_id}
              style={{
                padding: '10px 12px', borderRadius: 8,
                background: r.gosi_status === 'ERROR' ? 'rgba(239,68,68,.05)' : 'rgba(255,255,255,.025)',
                border: `1px solid ${r.gosi_status === 'ERROR' ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.06)'}`,
                display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 4, columnGap: 12,
                fontSize: 11.5,
              }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                <span style={{ fontWeight: 800, color: 'var(--tx)' }}>{r.laborer_name?.replace(/\s+/g, ' ').trim() || '—'}</span>
                <span style={{ fontSize: 10, color: 'var(--tx5)', fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>{r.personal_number}</span>
                <span style={{ fontSize: 9.5, color: statusColor, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: statusColor + '14' }}>{r.status_ar}</span>
                {r.is_unified && <span style={{ fontSize: 9.5, color: '#a78bfa', fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: '#a78bfa14' }}>{T('موحّد', 'Unified')}</span>}
                <span style={{ marginInlineStart: 'auto', fontSize: 9.5, color: gosiColor, fontWeight: 700 }}>GOSI: {r.gosi_status || '—'}</span>
              </div>
              <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('نوع العقد', 'Contract type')}: <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{r.contract_type_ar}</span></div>
              <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('انتهاء العقد', 'Expires')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{r.expiry_date_gregorian?.slice(0, 10)}</span></div>
              <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('رقم العقد', 'Contract no.')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{r.contract_id}</span></div>
              <div style={{ color: 'var(--tx4)', fontSize: 10.5 }}>{T('آخر تعديل', 'Last modified')}: <span style={{ color: 'var(--tx2)', fontWeight: 700, direction: 'ltr' }}>{r.last_modified_gregorian?.slice(0, 10)}</span></div>
              {r.gosi_description && r.gosi_status === 'ERROR' && (
                <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: 10, lineHeight: 1.5, marginTop: 4, paddingTop: 6, borderTop: '1px dashed rgba(239,68,68,.2)' }}>
                  ⚠ {r.gosi_description}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </CollapsibleCard>
  )
}

// Qiwa source icon — uses the official logo at public/qiwa-logo.jpg. Same
// img-with-text-fallback pattern as SbcSourceIcon / GosiSourceIcon.
function QiwaSourceIcon({ size = 16 }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        title="منصة قوى"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: size, height: size, borderRadius: 4,
          background: 'rgba(59,130,246,.18)', color: '#3b82f6',
          fontSize: Math.round(size * 0.55), fontWeight: 800,
          flexShrink: 0, lineHeight: 1, fontFamily: F,
        }}>قوى</span>
    )
  }
  return (
    <img
      src="/qiwa-logo.jpg"
      alt="Qiwa"
      title="منصة قوى"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

// Muqeem source icon — uses the official logo at public/muqeem-logo.png.
// Same img-with-text-fallback pattern as the other source icons.
function MuqeemSourceIcon({ size = 16 }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span
        title="منصة مقيم"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: size, height: size, borderRadius: 4,
          background: 'rgba(245,158,11,.18)', color: '#f59e0b',
          fontSize: Math.round(size * 0.55), fontWeight: 800,
          flexShrink: 0, lineHeight: 1, fontFamily: F,
        }}>مقيم</span>
    )
  }
  return (
    <img
      src="/muqeem-logo.png"
      alt="Muqeem"
      title="منصة مقيم"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      onError={() => setFailed(true)}
    />
  )
}

// Reusable collapsible card — click header to expand/collapse. Used for cards
// that contain a lot of fields the user usually skips (e.g. WPS compliance).
// Matches the same chrome + chevron pattern as ActivitiesCard below.
function CollapsibleCard({ title, color, badge, defaultExpanded = false, children, showSbcIcon = false, showGosiIcon = false, showQiwaIcon = false, showMuqeemIcon = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div style={cardChrome}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ ...cardHeader, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        {showSbcIcon && <SbcSourceIcon />}
        {showGosiIcon && <GosiSourceIcon />}
        {showQiwaIcon && <QiwaSourceIcon />}
        {showMuqeemIcon && <MuqeemSourceIcon />}
        <span style={cardTitle}>{title}</span>
        {badge != null && (
          <span style={{ marginInlineStart: 'auto', fontSize: 11, color, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: color + '14' }}>{badge}</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'rgba(255,255,255,.5)', marginInlineStart: badge != null ? 0 : 'auto', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {expanded && children}
    </div>
  )
}

function ActivitiesCard({ activities, lang, T }) {
  const [expanded, setExpanded] = useState(false)
  if (!activities?.length) return null
  return (
    <div style={cardChrome}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ ...cardHeader, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.orange }} />
        <SbcSourceIcon />
        <span style={cardTitle}>{T('الأنشطة التجارية', 'Commercial Activities')}</span>
        <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.orange, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.orange + '14' }}>{num(activities.length)}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: 'rgba(255,255,255,.5)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {expanded && (
        <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activities.map((a, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'linear-gradient(180deg,#252525 0%,#1f1f1f 100%)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11.5, color: 'var(--tx)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? (a.activityDescriptionEn || a.activityDescriptionAr) : (a.activityDescriptionAr || a.activityDescriptionEn)}</span>
              <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'rgba(255,255,255,.5)', direction: 'ltr', whiteSpace: 'nowrap' }}>({a.activityID})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button type="button" onClick={onCopy} title="نسخ"
      style={{ width: 20, height: 20, padding: 0, border: 'none', background: 'transparent',
        color: copied ? C.gold : 'rgba(255,255,255,.35)', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 4, transition: 'color .15s', flexShrink: 0 }}>
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  )
}

// GOSI establishment card — renders the full /v1/establishment/{regNo}
// response. Source data lives in public.gosi_establishments.raw_main and is
// populated by the GOSI sync bookmarklet. Sections mirror the field groups
// the user shared (basic info / activity / CR / dates / MOL / contact / etc).
function GosiEstablishmentCard({ data, T, lang }) {
  const r = data?.raw_main || {}
  const isAr = (lang || 'ar') !== 'en'
  const pickLang = (obj) => obj ? (isAr ? (obj.arabic || obj.english) : (obj.english || obj.arabic)) : null
  const fmtDate = (d) => {
    if (!d) return null
    const g = d.gregorian ? String(d.gregorian).slice(0, 10) : null
    const h = d.hijiri || null
    if (!g && !h) return null
    return (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25 }}>
        {g && <span>{g}</span>}
        {h && <span style={{ color: 'rgba(255,255,255,.45)', fontSize: 10, fontWeight: 500 }}>{h}</span>}
      </span>
    )
  }
  const yesNo = (v) => v == null ? null : (v ? T('نعم', 'Yes') : T('لا', 'No'))

  const Row = ({ k, v, mono, full, gold, copy }) => (v == null || v === '' ? null : (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '9px 12px', borderRadius: 8, gap: 10,
      background: gold ? 'rgba(212,160,23,.06)' : 'rgba(255,255,255,.025)',
      border: '1px solid ' + (gold ? 'rgba(212,160,23,.22)' : 'rgba(255,255,255,.05)'),
      gridColumn: full ? '1 / -1' : undefined,
    }}>
      <span style={{ color: gold ? C.gold : 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }}>{k}</span>
      {copy ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', minWidth: 0 }}>
          <span style={{
            fontWeight: 700, color: 'var(--tx)', fontSize: 11.5, textAlign: 'end',
            fontFamily: mono ? 'ui-monospace, monospace' : undefined,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{v}</span>
          <CopyBtn value={v} />
        </span>
      ) : (
        <span style={{
          fontWeight: 700, color: 'var(--tx)', fontSize: 11.5, textAlign: 'end',
          direction: mono ? 'ltr' : undefined,
          fontFamily: mono ? 'ui-monospace, monospace' : undefined,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{v}</span>
      )}
    </div>
  ))

  const Section = ({ title, children }) => {
    const kids = React.Children.toArray(children).filter(Boolean)
    if (!kids.length) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', letterSpacing: '.4px', textTransform: 'uppercase', paddingInlineStart: 2 }}>{title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{kids}</div>
      </div>
    )
  }

  // Most fields are scalar — these helpers extract the right localised value.
  const addr = r.contactDetails?.addresses?.[0] || null
  const addrLine = addr
    ? [pickLang(addr.city), addr.district, addr.streetName, addr.buildingNo && (T('مبنى', 'Bldg') + ' ' + addr.buildingNo), addr.postalCode]
        .filter(Boolean).join(' · ')
    : null

  const accent = '#22c55e'
  return (
    <CollapsibleCard
      title={T('الملف الرئيسي للمنشأة', 'Main Establishment File')}
      color={accent}
      showGosiIcon
      defaultExpanded={false}>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Section title={T('بيانات أساسية', 'Basic')}>
          {/* GOSI registration number sits at the top in a gold full-width row
              — same treatment as the "authority numbers" section on the SBC
              facility card, where the primary identifier leads the section. */}
          <Row k={T('التأمينات الإجتماعية', 'GOSI')} v={r.registrationNo} mono full gold copy />
          <Row k={T('اسم المنشأة بالعربي', 'Facility name (AR)')} v={r.name?.arabic} full />
          <Row k={T('اسم المنشأة بالإنجليزي', 'Facility name (EN)')} v={r.name?.english} full />
          <Row k={T('الكيان القانوني', 'Legal entity')} v={pickLang(r.legalEntity)} />
          <Row k={T('الكيان (وزارة التجارة)', 'MCI legal entity')} v={pickLang(r.mciLegalEntity)} />
          <Row k={T('نوع المنشأة', 'Type')} v={pickLang(r.establishmentType)} />
          <Row k={T('الحالة', 'Status')} v={pickLang(r.status)} />
          {/* الرقم الموحد + رقم الاستقدام pinned side-by-side in one row (full-width
              sub-grid) so the section's auto-flow can't split them apart. */}
          {((r.unifiedNationalNumber != null && r.unifiedNationalNumber !== '') || (r.recruitmentNo != null && r.recruitmentNo !== '')) && (
            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Row k={T('الرقم الموحد', 'Unified National No.')} v={r.unifiedNationalNumber} mono gold copy />
              <Row k={T('رقم الاستقدام', 'Recruitment no.')} v={r.recruitmentNo} mono gold copy />
            </div>
          )}
          {/* Only show "Main establishment" when it actually points to a DIFFERENT
              establishment (i.e. this is a branch). Otherwise the value equals
              رقم التسجيل right above and is just visual noise. */}
          {r.mainEstablishmentRegNo != null && String(r.mainEstablishmentRegNo) !== String(r.registrationNo) && (
            <Row k={T('المنشأة الرئيسية', 'Main est. reg. no.')} v={r.mainEstablishmentRegNo} mono />
          )}
          {/* HIDDEN per user request — kept for easy revert
          <Row k={T('الجنسية', 'Nationality')} v={pickLang(r.nationalityCode)} />
          <Row k={T('دولة خليجية', 'GCC country')} v={yesNo(r.gccCountry)} />
          */}
        </Section>

        <Section title={T('النشاط والتصنيف', 'Activity & classification')}>
          <Row k={T('النشاط', 'Activity')} v={pickLang(r.activityType)} />
          <Row k={T('نظام معمول به', 'Law type')} v={pickLang(r.lawType)} />
          {/* HIDDEN per user request — kept for easy revert
          <Row k={T('القطاع', 'Sector')} v={r.classification?.sector} />
          <Row k={T('الحجم', 'Size')} v={r.classification?.size} />
          <Row k={T('رمز التصنيف', 'Class. code')} v={r.classification?.code} mono />
          */}
        </Section>

        <Section title={T('السجل التجاري', 'Commercial Register')}>
          <Row k={T('السجل التجاري', 'CR number')} v={r.crn?.number} mono gold copy />
          <Row k={T('موثّق وزارة التجارة', 'MCI verified')} v={yesNo(r.crn?.mciVerified)} />
          <Row k={T('تاريخ الإصدار', 'Issue date')} v={fmtDate(r.crn?.issueDate)} mono />
          <Row k={T('تاريخ الانتهاء', 'Expiry date')} v={fmtDate(r.crn?.expiryDate)} mono />
          <Row k={T('تاريخ التأكيد', 'Confirm date')} v={fmtDate(r.crn?.confirmDate)} mono />
          <Row k={T('اسم المنشأة (سجل)', 'CR name')} v={r.crn?.estNameArb} />
        </Section>

        {/* HIDDEN per user request — kept for easy revert
        <Section title={T('تواريخ مهمة', 'Key dates')}>
          <Row k={T('تاريخ البداية', 'Start date')} v={fmtDate(r.startDate)} mono />
          <Row k={T('تاريخ التسجيل', 'GOSI reg. date')} v={fmtDate(r.gosiRegistrationDate)} mono />
          <Row k={T('بداية المعاش', 'Annuity start')} v={fmtDate(r.annuityStartDate)} mono />
          <Row k={T('بداية الأخطار المهنية', 'OH start')} v={fmtDate(r.ohStartDate)} mono />
          <Row k={T('بداية التعطل', 'UI start')} v={fmtDate(r.uiStartDate)} mono />
          <Row k={T('إصلاح المعاشات (OH)', 'Pension reform OH')} v={fmtDate(r.pensionReformOhEnableDate)} mono />
          <Row k={T('تاريخ الإغلاق', 'Close date')} v={fmtDate(r.closeDate)} mono />
          <Row k={T('إغلاق بعد إعادة فتح', 'Close after reopen')} v={fmtDate(r.closureDateAfterReopen)} mono />
        </Section>
        */}

        <Section title={T('وزارة العمل', 'MOL identifiers')}>
          {/* GOSI returns 4 MOL identifiers that form two "<office>-<id>" pairs:
                pair A — "ملف المنشأة"          (molEstablishmentOfficeId-molEstablishmentId)
                pair B — "الرقم الموحد للعمل"   (molOfficeId-molunId)
              They USUALLY collapse to the same value (e.g. 18-4036523), but
              not always — so we render BOTH when they differ, and just ONE
              labelled "ملف العمل" when they match. */}
          {(() => {
            const m = r.molEstablishmentIds || {}
            const join = (a, b) => [a, b].filter(v => v != null && v !== '').join('-') || null
            const pairA = join(m.molEstablishmentOfficeId, m.molEstablishmentId)
            const pairB = join(m.molOfficeId, m.molunId)
            if (pairA && pairA === pairB) {
              return <Row k={T('رقم ملف العمل (الموارد البشرية)', 'HRSD file no.')} v={pairA} mono gold copy />
            }
            return (
              <>
                <Row k={T('ملف المنشأة (العمل)', 'MOL establishment file')} v={pairA} mono gold copy />
                <Row k={T('الرقم الموحد (العمل)', 'MOL unified no.')} v={pairB} mono gold copy />
              </>
            )
          })()}
          <Row k={T('حالة ملف العمل', 'MOL file status')} v={pickLang(r.molFileStatus)} />
          <Row k={T('فرع مكتب العمل', 'Labor office branch')} v={pickLang(r.fieldOfficeName)} />
        </Section>

        <Section title={T('بيانات الاتصال', 'Contact')}>
          <Row k={T('البريد الأساسي', 'Primary email')} v={r.contactDetails?.emailId?.primary} mono />
          <Row k={T('الجوال الأساسي', 'Primary mobile')} v={r.contactDetails?.mobileNo?.primary} mono />
          <Row k={T('الجوال الثانوي', 'Secondary mobile')} v={r.contactDetails?.mobileNo?.secondary} mono />
          <Row k={T('الهاتف الأساسي', 'Primary phone')} v={r.contactDetails?.telephoneNo?.primary} mono />
          {addrLine && (
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8,
              border: '1px solid rgba(255,255,255,.05)', gap: 10,
            }}>
              <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }}>{T('العنوان الوطني', 'National address')}</span>
              <span style={{ fontWeight: 700, color: 'var(--tx)', fontSize: 11.5, textAlign: 'end' }}>{addrLine}</span>
            </div>
          )}
        </Section>

        <Section title={T('الحساب والشهادة', 'Account & certificate')}>
          <Row k={T('نوع الدفع', 'Payment type')} v={pickLang(r.establishmentAccount?.paymentType)} />
          <Row k={T('بداية الحساب', 'Account start')} v={fmtDate(r.establishmentAccount?.startDate)} mono />
          <Row k={T('اسم البنك', 'Bank')} v={r.establishmentAccount?.bankAccount?.bankName} />
          <Row k={T('رقم الآيبان', 'IBAN')} v={r.establishmentAccount?.bankAccount?.ibanAccountNo} mono />
          <Row k={T('حالة الحساب', 'Account status')} v={r.establishmentAccount?.bankAccount?.accountStatus} />
          <Row k={T('حالة الشهادة', 'Certificate active')} v={yesNo(r.certificateStatus)} />
          <Row k={T('نسبة الأخطار المهنية', 'Current OH rate')} v={r.currentOHRate != null ? r.currentOHRate + '%' : null} />
        </Section>

        {/* HIDDEN per user request — kept for easy revert
        <Section title={T('خصائص', 'Flags')}>
          <Row k={T('استباقية', 'Proactive')} v={yesNo(r.proactive)} />
          <Row k={T('استباقية خليجية', 'GCC proactive')} v={yesNo(r.gccProactive)} />
          <Row k={T('خارج السوق', 'Out of market')} v={yesNo(r.outOfMarket)} />
          <Row k={T('شريك واحد', 'One partner')} v={yesNo(r.onePartner)} />
          <Row k={T('نادي رياضي', 'Sports club')} v={yesNo(r.sportsClub)} />
          <Row k={T('منشأة PPA', 'PPA establishment')} v={yesNo(r.ppaEstablishment)} />
          <Row k={T('مسجّل إدارياً', 'Admin registered')} v={yesNo(r.adminRegistered)} />
          <Row k={T('مسموح تأمين ممتد', 'Extended insurance')} v={yesNo(r.allowedForExtendedInsurance)} />
          <Row k={T('اكتمل التسجيل', 'Registration completed')} v={yesNo(r.registrationCompleted)} />
          <Row k={T('حالة الاستباقية', 'Proactive status')} v={r.proactiveStatus} mono />
        </Section>
        */}

        {/* HIDDEN per user request — kept for easy revert
        {Array.isArray(r.violation) && r.violation.length > 0 && (
          <Section title={T('المخالفات', 'Violations')}>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.violation.map((v, i) => (
                <div key={i} style={{ padding: '10px 12px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.18)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx)' }}>{v.description}</div>
                  {v.violationDate && <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 4, direction: 'ltr' }}>{String(v.violationDate).slice(0, 10)}</div>}
                </div>
              ))}
            </div>
          </Section>
        )}

        <div style={{ fontSize: 10, color: 'var(--tx5)', textAlign: 'end', paddingTop: 4, borderTop: '1px dashed rgba(255,255,255,.06)' }}>
          {T('آخر مزامنة', 'Last synced')}: {data.synced_at ? new Date(data.synced_at).toLocaleString() : '—'}
        </div>
        */}
      </div>
    </CollapsibleCard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// GOSI sub-table cards — same visual language as the SBC facility cards
// (cardChrome wrapper + colored dot + GosiSourceIcon + title + count badge +
// rowBase grid). Surface the data from gosi_establishment_{owners,admins,
// contributors,bills} and the account_* / violations_* columns the bookmarklet
// writes onto gosi_establishments.
// ═══════════════════════════════════════════════════════════════════════════

// Shared formatting helpers used by every GOSI sub-card.
const _gosiMoney = (n) => {
  if (n == null || n === '') return null
  const num = Number(n)
  if (isNaN(num)) return null
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
// ALL dates display as YYYY-MM-DD (e.g. 2026-05-27), read left-to-right as
// year → month → day. One canonical ISO shape used everywhere — Gregorian
// and Hijri alike — so every date in the app stays consistent. Do NOT flip
// the segments: GOSI already sends Gregorian in this shape.
const _gosiDate = (s) => s ? String(s).slice(0, 10) : null
// Hijri normalized to the same YYYY-MM-DD shape. GOSI sometimes sends it
// day-first (DD-MM-YYYY) — detected by a short (≤2-char) first segment — so
// we flip those back to year-first.
const _gosiHijriNorm = (h) => {
  if (!h) return null
  const s = String(h).slice(0, 10)
  const parts = s.split('-')
  return parts.length === 3 && parts[0].length <= 2 ? parts.reverse().join('-') : s
}
// Whole-day span between two YYYY-MM-DD dates. Drives the employment duration
// shown for non-active contributors. Returns null for missing/invalid/negative.
const _gosiDaysBetween = (start, end) => {
  if (!start || !end) return null
  const s = new Date(String(start).slice(0, 10))
  const e = new Date(String(end).slice(0, 10))
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return null
  const d = Math.round((e - s) / 86400000)
  return d >= 0 ? d : null
}
// Normalize dates embedded inside GOSI free-text (e.g. a violation description
// "الغاء مدة من 22/02/2026 الى 28/02/2026") from DD/MM/YYYY to the app-wide
// YYYY-MM-DD shape, leaving the surrounding text untouched, so dates inside
// sentences match every other date field.
const _gosiTextDates = (str) => {
  if (!str) return str
  return String(str).replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
    (_, d, m, y) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'))
}
const _gosiDatePair = (greg, hijri) => {
  const g = _gosiDate(greg)
  const h = _gosiHijriNorm(hijri)
  if (g && h) return g + ' · ' + h
  return g || h || null
}
// Stacked variant: Gregorian on top, Hijri muted below. Used in row metadata
// where the inline " · " format crowds the line and hides the hijri half on
// narrow grid columns. Returns a string when only one half is present so the
// caller can still display it as a simple value.
const _GosiDatePair = (greg, hijri) => {
  const g = _gosiDate(greg)
  const h = _gosiHijriNorm(hijri)
  if (!g && !h) return null
  if (!g) return h
  if (!h) return g
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.15 }}>
      <span>{g}</span>
      <span style={{ opacity: .55, fontWeight: 600, fontSize: '.88em' }}>{h}</span>
    </span>
  )
}

// Plain-text version of a date pair for the copy button — both calendars on
// one line, e.g. "1987-10-31 / 1408-03-09".
const _gosiDateCopy = (greg, hijri) => {
  const g = _gosiDate(greg)
  const h = _gosiHijriNorm(hijri)
  return [g, h].filter(Boolean).join(' / ')
}

// Row styles mirror the SBC facility card (rowBase + lbl + gold variants).
// Stored as module-level constants so they're not re-allocated on every render.
const _gosiRowBase = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 12px', borderRadius: 8, gap: 10, minWidth: 0,
  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)',
}
const _gosiRowDanger = { ..._gosiRowBase, background: 'rgba(232,114,101,.06)', border: '1px solid rgba(232,114,101,.22)' }
const _gosiRowOk = { ..._gosiRowBase, background: 'rgba(46,204,113,.06)', border: '1px solid rgba(46,204,113,.22)' }
const _gosiLbl = { color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }
const _gosiSectionLbl = { fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '.4px', textTransform: 'uppercase', paddingInlineStart: 2, marginBottom: 8 }
const _gosiVal = { fontSize: 12, fontWeight: 700, color: 'var(--tx)', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const _gosiValMono = { ..._gosiVal, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }

// "Primary + breakdown" group tile — mirrors the SBC GOSI summary card
// layout. One headline metric on the start side (big number + label),
// and a stacked list of related sub-metrics on the end side, joined by
// a thin divider. Lets the user grasp the headline instantly and read
// the supporting breakdown without scanning a flat field grid.
function _GosiGroup({ primary, items, accent }) {
  const visible = (items || []).filter(it => it && it.v != null && it.v !== '')
  if (primary?.v == null && visible.length === 0) return null
  const isAccent = !!accent
  const bg = isAccent ? 'rgba(232,114,101,.06)' : 'rgba(255,255,255,.024)'
  const border = isAccent ? 'rgba(232,114,101,.22)' : 'rgba(255,255,255,.05)'
  const primaryColor = primary?.color || (isAccent ? C.red : 'var(--tx)')
  return (
    <div style={{
      display: 'flex', background: bg, borderRadius: 8,
      border: `1px solid ${border}`, overflow: 'hidden',
    }}>
      <div style={{
        flex: 1.1, padding: '10px 14px', textAlign: 'center',
        borderInlineEnd: `1px solid ${border}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
      }}>
        <div style={{ fontSize: 10.5, color: '#fff', fontWeight: 700, letterSpacing: '.3px' }}>{primary?.k}</div>
        <div style={{
          fontSize: 20, fontWeight: 800, color: primaryColor,
          direction: primary?.mono === false ? undefined : 'ltr',
          lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{primary?.v ?? '—'}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {visible.map((c, i) => (
          <div key={i} style={{
            flex: 1, padding: '6px 12px', minHeight: 28,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            borderBottom: i === visible.length - 1 ? 'none' : `1px solid ${border}`,
          }}>
            <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.k}</span>
            <span style={{
              fontSize: 12.5, fontWeight: 800, color: c.color || 'var(--tx)',
              direction: c.mono === false ? undefined : 'ltr',
              fontVariantNumeric: 'tabular-nums',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{c.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Vertical label-over-value field. Reserves a full line for the number so it
// can never truncate, even in tight 2-column grids. Tone tints only when the
// value actually represents risk (debt > 0, unpaid penalty); zero/neutral
// stays plain to avoid drowning the card in red.
function _GosiField({ k, v, mono, tone, hero }) {
  if (v == null || v === '') return null
  const isDanger = tone === 'danger'
  const isOk = tone === 'ok'
  const bg = isDanger ? 'rgba(232,114,101,.07)' : isOk ? 'rgba(46,204,113,.07)' : 'rgba(255,255,255,.025)'
  const border = isDanger ? 'rgba(232,114,101,.25)' : isOk ? 'rgba(46,204,113,.22)' : 'rgba(255,255,255,.05)'
  const valColor = isDanger ? C.red : isOk ? C.ok : 'var(--tx)'
  const labelColor = isDanger ? 'rgba(232,114,101,.85)' : isOk ? 'rgba(46,204,113,.85)' : 'rgba(255,255,255,.45)'
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 5,
      padding: hero ? '12px 14px' : '9px 12px', borderRadius: 8,
      background: bg, border: `1px solid ${border}`,
      minWidth: 0,
    }}>
      <span style={{ color: labelColor, fontWeight: 600, fontSize: 10.5, letterSpacing: '.1px' }}>{k}</span>
      <span style={{
        fontSize: hero ? 17 : 13, fontWeight: 800, color: valColor, lineHeight: 1.1,
        direction: mono ? 'ltr' : undefined,
        fontFamily: mono ? 'ui-monospace, monospace' : undefined,
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'start',
      }}>{v}</span>
    </div>
  )
}

// Count-badge for card headers — colored chip with the running total. Matches
// the SBC pattern (e.g. "الأنشطة (4)" with the 4 in an orange chip).
function _GosiCountBadge({ n, color }) {
  return (
    <span style={{
      marginInlineStart: 'auto', fontSize: 11, color, fontWeight: 700,
      padding: '2px 8px', borderRadius: 6, background: color + '14',
    }}>{num(n)}</span>
  )
}

function GosiAccountCard({ data, bills, contributors, T, lang }) {
  if (!data || (data.account_synced_at == null && data.outstanding_amount == null)) return null
  const isAr = (lang || 'ar') !== 'en'
  const hasDebt = (data.outstanding_amount || 0) > 0
  // Accent flips red on outstanding debt, green on a clean account — same hue
  // logic as SBC "violations" / "compliance" cards.
  const accent = hasDebt ? C.red : C.ok
  const billsList = Array.isArray(bills) ? bills : []
  // SIN → contributor name, so a violation's socialInsuranceNoList can be shown
  // as the actual person rather than a bare number.
  const sinToName = {}
  for (const c of (contributors || [])) {
    if (c.social_insurance_no == null) continue
    const nm = isAr
      ? [c.first_name_ar, c.second_name_ar, c.third_name_ar, c.family_name_ar].filter(Boolean).join(' ')
      : c.full_name_en
    sinToName[String(c.social_insurance_no)] = nm || c.full_name_en || String(c.social_insurance_no)
  }
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
        <GosiSourceIcon />
        <span style={cardTitle}>{T('الحساب والفواتير', 'Account & Bills')}</span>
        {hasDebt && (
          <span style={{
            marginInlineStart: 'auto', fontSize: 11, color: accent, fontWeight: 700,
            padding: '2px 8px', borderRadius: 6, background: accent + '14', direction: 'ltr',
          }}>{_gosiMoney(data.outstanding_amount)}</span>
        )}
      </div>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Bills first — they're the most actionable surface: a bill is what
            actually has to be paid. The aggregate balances/payments below
            show context (how the bill rolled up, when it was last paid). */}
        {billsList.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ..._gosiSectionLbl, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 0 }}>
              <span>{T('الفواتير', 'Bills')}</span>
              <span style={{ fontSize: 9.5, color: C.gold, background: C.gold + '14', padding: '1px 6px', borderRadius: 999, fontWeight: 800 }}>{num(billsList.length)}</span>
            </div>
            {billsList.map((b) => <_GosiBillRow key={b.id} bill={b} isAr={isAr} T={T} />)}
          </div>
        )}

        {billsList.length > 0 && <div style={_gosiSectionLbl}>{T('الحساب والمديونية', 'Account & balance')}</div>}

        {/* Group 1 — what's due now. Outstanding amount is the headline;
            breakdown shows the two components (subscriptions + penalties)
            plus the human-readable payment status. */}
        <_GosiGroup
          accent={hasDebt}
          primary={{
            k: T('المبلغ المستحق', 'Outstanding'),
            v: _gosiMoney(data.outstanding_amount) ?? '0.00',
            color: hasDebt ? C.red : C.ok,
          }}
          items={[
            { k: T('اشتراكات', 'Contributions'), v: _gosiMoney(data.account_debit_total_contribution) },
            { k: T('غرامات', 'Penalties'), v: _gosiMoney(data.account_debit_total_penalty), color: (data.account_debit_total_penalty || 0) > 0 ? '#f59e0b' : undefined },
            (data.bill_payment_status_ar || data.bill_payment_status_en) && {
              k: T('الحالة', 'Status'),
              v: isAr ? data.bill_payment_status_ar : data.bill_payment_status_en,
              color: hasDebt ? C.red : C.ok, mono: false,
            },
          ]}
        />

        {/* Group 3 — payment history. "Last payment date" as headline so the
            user immediately sees how long ago payment was made; breakdown
            shows the amount, months unpaid, and whether the balance is
            refundable. */}
        {(data.account_last_payment_date || data.account_last_payment_amount != null
          || data.months_since_last_paid != null || data.account_eligible_for_refund != null) && (
          <_GosiGroup
            primary={{
              k: T('آخر دفعة', 'Last payment'),
              v: _gosiDate(data.account_last_payment_date) ?? '—',
            }}
            items={[
              data.account_last_payment_amount != null && { k: T('القيمة', 'Amount'), v: _gosiMoney(data.account_last_payment_amount) },
              data.months_since_last_paid != null && { k: T('شهور بدون سداد', 'Months unpaid'), v: data.months_since_last_paid, color: (data.months_since_last_paid || 0) > 0 ? C.red : undefined },
              data.account_eligible_for_refund != null && { k: T('قابل للاسترداد', 'Refundable'), v: data.account_eligible_for_refund ? T('نعم', 'Yes') : T('لا', 'No'), mono: false },
            ]}
          />
        )}

        {/* Group 4 — debt timeline. Only shown when we actually have one of
            these two dates; "first bill" is the headline because it anchors
            the establishment's billing history. */}
        {(data.debt_start_date || data.first_bill_issue_date) && (
          <_GosiGroup
            primary={{
              k: T('أول فاتورة', 'First bill'),
              v: _gosiDate(data.first_bill_issue_date) ?? '—',
            }}
            items={[
              data.debt_start_date && { k: T('بداية المديونية', 'Debt start'), v: _gosiDate(data.debt_start_date) },
            ]}
          />
        )}

        {data.violations_total > 0 && (
          <_GosiGroup
            accent={(data.violations_unpaid || 0) > 0}
            primary={{
              k: T('إجمالي المخالفات', 'Violations'),
              v: data.violations_total,
              color: (data.violations_unpaid || 0) > 0 ? C.red : 'var(--tx)',
            }}
            items={[
              { k: T('مدفوعة', 'Paid'), v: data.violations_paid, color: C.ok },
              { k: T('غير مدفوعة', 'Unpaid'), v: data.violations_unpaid, color: (data.violations_unpaid || 0) > 0 ? C.red : undefined },
            ]}
          />
        )}

        {/* Unpaid violation details — type, amount, status, date, channel,
            class — from the /unpaid-violation endpoint (stored raw in the
            unpaid_violations jsonb column). */}
        {(() => {
          const list = data.unpaid_violations && data.unpaid_violations.violationSummaryDtoList
          if (!Array.isArray(list) || !list.length) return null
          // Map violationId → full detail (from /violation/{id}); carries the
          // offending contributor's name + national id + the engagement reason.
          const detailById = {}
          for (const d of (Array.isArray(data.violation_details) ? data.violation_details : [])) {
            if (d && d.violationId != null) detailById[String(d.violationId)] = d
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={_gosiSectionLbl}>{T('تفاصيل المخالفات', 'Violation details')}</div>
              {list.map((v, i) => {
                const det = v.violationId != null ? detailById[String(v.violationId)] : null
                const detContribs = det && Array.isArray(det.contributors) ? det.contributors : []
                const date = _gosiDate(v.dateReported && v.dateReported.gregorian)
                // Fallback contributor names — used only when the per-violation
                // detail (with full contributor info) wasn't synced; matched from
                // the summary's SIN list against synced contributor names.
                const fallbackNames = !detContribs.length && Array.isArray(v.socialInsuranceNoList)
                  ? v.socialInsuranceNoList.map(s => sinToName[String(s)] || String(s)) : []
                const reason = det && det.inspectionInfo && det.inspectionInfo.rasedRecommendation
                  ? (isAr ? det.inspectionInfo.rasedRecommendation.arabic : det.inspectionInfo.rasedRecommendation.english)
                  : null
                const meta = [
                  { k: T('رقم المخالفة', 'Violation no.'), v: v.violationId != null ? String(v.violationId) : null, mono: true },
                  { k: T('الحالة', 'Status'), v: isAr ? (v.status && v.status.arabic) : (v.status && v.status.english) },
                  { k: T('تاريخ الرصد', 'Reported'), v: date, mono: true },
                  { k: T('المصدر', 'Channel'), v: isAr ? (v.channel && v.channel.arabic) : (v.channel && v.channel.english) },
                  { k: T('الفئة', 'Class'), v: isAr ? (v.approvedViolationClass && v.approvedViolationClass.arabic) : (v.approvedViolationClass && v.approvedViolationClass.english) },
                  { k: T('المشترك', 'Contributor'), v: fallbackNames.length ? fallbackNames.join('، ') : null },
                ].filter(m => m.v != null && m.v !== '')
                return (
                  <div key={v.violationId || i} style={{ ..._gosiRowDanger, flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.45, flex: 1 }}>{isAr ? (v.violationType && v.violationType.arabic) : (v.violationType && v.violationType.english)}</span>
                      <span style={{ fontSize: 19, fontWeight: 800, color: C.red, direction: 'ltr', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{_gosiMoney(v.penaltyAmount)}</span>
                    </div>
                    {meta.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 10.5, paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,.08)' }}>
                        {meta.map((m, mi) => (
                          <span key={mi} style={{ color: 'var(--tx3)' }}>{m.k}: <span style={{ color: 'var(--tx)', fontWeight: 700, direction: m.mono ? 'ltr' : undefined }}>{m.v}</span></span>
                        ))}
                      </div>
                    )}
                    {reason && (
                      <div style={{ fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5 }}>{T('السبب', 'Reason')}: <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{_gosiTextDates(reason)}</span></div>
                    )}
                    {/* Per-contributor block — name, national id, birth (greg/hijri)
                        and each engagement's join/termination + violation desc. */}
                    {detContribs.map((c, ci) => {
                      const cname = isAr ? (c.contributorName && c.contributorName.arabic) : (c.contributorName && c.contributorName.english)
                      const birth = _gosiDateCopy(c.dateOfBirth && c.dateOfBirth.gregorian, c.dateOfBirth && c.dateOfBirth.hijiri)
                      const engs = Array.isArray(c.engagementInfo) ? c.engagementInfo : []
                      // National id + birth (copyable) then each engagement's
                      // join / termination dates — laid out in one tidy 2-col grid.
                      const fields = [
                        { k: T('الهوية', 'National ID'), v: c.nationalId != null ? String(c.nationalId) : null, copy: true },
                        // Birth stacked: Gregorian on top, Hijri muted below (node);
                        // copy still yields the flat "greg / hijri" string.
                        { k: T('الميلاد', 'Born'), v: _GosiDatePair(c.dateOfBirth && c.dateOfBirth.gregorian, c.dateOfBirth && c.dateOfBirth.hijiri), copy: true, copyText: birth },
                      ]
                      for (const e of engs) {
                        const jd = _gosiDate(e.joiningDate && e.joiningDate.gregorian)
                        const td = _gosiDate(e.terminationDate && e.terminationDate.gregorian)
                        if (jd) fields.push({ k: T('الالتحاق', 'Joined'), v: jd })
                        if (td) fields.push({ k: T('الفصل', 'Terminated'), v: td })
                      }
                      const shownFields = fields.filter(f => f.v != null && f.v !== '')
                      const descs = engs.map(e => e.violationDesc ? (isAr ? e.violationDesc.arabic : e.violationDesc.english) : null).filter(Boolean)
                      return (
                        <div key={ci} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 11, display: 'flex', flexDirection: 'column', gap: 9 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, background: 'rgba(34,197,94,.14)', color: C.ok, flexShrink: 0 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx)' }}>{cname || '—'}</span>
                          </div>
                          {shownFields.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
                              {shownFields.map((f, fi) => (
                                <div key={fi} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, minWidth: 0 }}>
                                  <span style={{ color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.k}</span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
                                    {f.copy && <CopyBtn value={f.copyText != null ? f.copyText : f.v} />}
                                    <span style={{ color: 'var(--tx)', fontWeight: 700, direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.v}</span>
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {descs.map((d, di) => (
                            <div key={di} style={{ fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5, paddingTop: 7, borderTop: '1px dashed rgba(255,255,255,.07)' }}>{T('وصف المخالفة', 'Description')}: <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{_gosiTextDates(d)}</span></div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// Single bill row — extracted so GosiAccountCard can render bills at the
// top of the merged "Account & Bills" card. Status detection prefers the
// explicit GOSI status text, then falls back to an explicit outstanding=0;
// when neither is known, the badge says "غير معروف" rather than silently
// claiming "مدفوعة".
function _GosiBillRow({ bill: b, isAr, T }) {
  const statusRaw = String(b.bill_payment_status_ar || b.bill_payment_status_en || '').toLowerCase()
  const statusSaysPaid = /مدفوع|مسدد|دفع|paid|settled/.test(statusRaw) && !/غير|un/.test(statusRaw)
  const statusSaysUnpaid = /غير مدفوع|غير مسدد|مستحق|unpaid|due/.test(statusRaw)
  // GOSI returns no explicit paid/unpaid text on the bill or its summary —
  // Ameen derives the status from the money still owed. outstanding_amount is
  // usually null, so fall back to balance_due / total_due_amount.
  const owed = [b.outstanding_amount, b.balance_due, b.total_due_amount].find(x => x != null)
  const amountKnown = owed != null
  const amountZero = amountKnown && Number(owed) === 0
  const isPaid = statusSaysPaid || (!statusSaysUnpaid && amountZero)
  const isUnknown = !statusRaw && !amountKnown
  const statusAr = isAr ? b.bill_payment_status_ar : b.bill_payment_status_en
  const statusFallback = isUnknown ? T('غير معروف', 'Unknown') : (isPaid ? T('مسددة', 'Paid') : T('غير مسددة', 'Unpaid'))
  const statusColor = isUnknown ? 'rgba(255,255,255,.4)' : (isPaid ? C.ok : C.red)
  return (
    <div style={{ ..._gosiRowBase, padding: 10, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--tx)', direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>#{b.bill_number}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'rgba(255,255,255,.45)' }}>
          {b.issue_date && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{_gosiDate(b.issue_date)}</span>}
          {b.issue_date && b.due_date && <span style={{ opacity: .5 }}>←</span>}
          {b.due_date && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{_gosiDate(b.due_date)}</span>}
          <span style={{
            marginInlineStart: 4,
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            color: statusColor, background: isUnknown ? 'rgba(255,255,255,.06)' : (statusColor + '14'),
            border: `1px solid ${isUnknown ? 'rgba(255,255,255,.1)' : statusColor + '33'}`,
          }}>{statusAr || statusFallback}</span>
        </div>
      </div>
      <_GosiGroup
        accent={!isPaid && !isUnknown}
        primary={{
          k: T('الإجمالي', 'Total'),
          v: _gosiMoney(b.total_due_amount || b.outstanding_amount) ?? '0.00',
          color: statusColor,
        }}
        items={[
          b.total_contribution != null && { k: T('الاشتراك', 'Contrib.'), v: _gosiMoney(b.total_contribution) },
          b.total_late_fee != null && b.total_late_fee > 0 && { k: T('رسوم تأخير', 'Late fee'), v: _gosiMoney(b.total_late_fee), color: C.red },
          b.previous_bill != null && b.previous_bill > 0 && { k: T('سابق', 'Prior'), v: _gosiMoney(b.previous_bill) },
        ]}
      />
    </div>
  )
}

// Dropdown selector used by toggle design #4 — clicked button shows active
// platform with brand dot, menu lists all 4 with name + subtitle.
function _PlatformDropdown({ PLATFORMS, tableView, setTableView, counter, T, F }) {
  const [open, setOpen] = useState(false)
  const active = PLATFORMS.find(p => p.v === tableView) || PLATFORMS[0]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, justifyContent: 'space-between', padding: '0 14px', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <button onClick={() => setOpen(v => !v)} style={{
          cursor: 'pointer', padding: '8px 14px', fontSize: 12, fontWeight: 700,
          borderRadius: 10, border: '1px solid rgba(255,255,255,.1)',
          background: 'rgba(255,255,255,.04)', color: 'var(--tx)',
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontFamily: F, minWidth: 200, justifyContent: 'space-between',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: active.c }} />
            <span style={{ color: 'var(--tx5)', fontWeight: 500, fontSize: 10 }}>{T('العرض:', 'View:')}</span>
            {active.l}
          </span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '.15s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', insetInlineStart: 0,
            background: '#161616', border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 10, padding: 4, minWidth: 240, zIndex: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          }}>
            {PLATFORMS.map(p => {
              const isActive = tableView === p.v
              return (
                <button key={p.v} onClick={() => { setTableView(p.v); setOpen(false) }} style={{
                  cursor: 'pointer', display: 'flex', width: '100%',
                  padding: '8px 10px', border: 0, borderRadius: 6,
                  background: isActive ? 'rgba(255,255,255,.04)' : 'transparent',
                  color: 'var(--tx)', textAlign: 'start', alignItems: 'center', gap: 10,
                  fontFamily: F,
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.c, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{p.l}</span>
                    <span style={{ fontSize: 10, color: 'var(--tx5)' }}>{p.sub}</span>
                  </div>
                  {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {counter}
    </div>
  )
}

// Cell renderer for the GOSI lens of the facilities table — count badge at
// the top, then a column of contributor IDs (iqama for non-Saudis,
// national_id for Saudis). Names are dropped to keep the column narrow and
// scannable; the IDs uniquely identify each person and the user can open the
// row's detail for the full name. Up to MAX_VISIBLE IDs render inline, the
// rest collapse into a "+N" muted overflow chip.
const _GOSI_CELL_MAX = 6
// Pick the best ID for a contributor — preferred field first, then any other
// document on file. Inactive Saudis often have only national_id (no iqama),
// and inactive non-Saudis sometimes have only a border_no/passport_no, so
// blindly pulling iqama_no leaves the column empty even when GOSI has perfect
// data on file. The "primary" hint just biases the order.
function _bestContribId(c, primary) {
  if (!c) return null
  const order = primary === 'national_id'
    ? ['national_id', 'iqama_no', 'border_no', 'passport_no']
    : ['iqama_no', 'national_id', 'border_no', 'passport_no']
  for (const f of order) if (c[f]) return c[f]
  return null
}
function _GosiContribCell({ list, color, idField }) {
  if (!list || list.length === 0) return <span className="muted">—</span>
  const ids = list.map(c => _bestContribId(c, idField)).filter(Boolean)
  const shown = ids.slice(0, _GOSI_CELL_MAX)
  const extra = ids.length - shown.length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1, marginBottom: 2 }}>{list.length}</span>
      {shown.map((id, i) => (
        <span key={i} className="num" style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', lineHeight: 1.3 }}>{id}</span>
      ))}
      {extra > 0 && (
        <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 700 }}>+{extra}</span>
      )}
    </div>
  )
}

// Sorted-wages cell — lists every non-zero wage on this facility in ascending
// order. Mirrors the contributor-cell density with a count badge on top so
// the user can spot how many real paychecks the facility actually has.
function _GosiWagesCell({ contributors }) {
  if (!contributors || contributors.length === 0) return <span className="muted">—</span>
  const wages = contributors
    .map(c => c.wage_total != null ? Number(c.wage_total) : null)
    .filter(w => w != null && w > 0)
    .sort((a, b) => a - b)
  if (!wages.length) return <span className="muted">—</span>
  const shown = wages.slice(0, _GOSI_CELL_MAX)
  const extra = wages.length - shown.length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: 2 }}>{wages.length}</span>
      {shown.map((w, i) => (
        <span key={i} className="num" style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.7)', lineHeight: 1.3 }}>{w.toLocaleString('en-US')}</span>
      ))}
      {extra > 0 && (
        <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 700 }}>+{extra}</span>
      )}
    </div>
  )
}

// Shared person-row helper used by Owners / Admins / Contributors.
// Mirrors SBC's PersonRow density: single-line by default, click to expand
// the metadata strip. Always an "individual" icon — GOSI owners/admins are
// always natural persons (rows carry national_id, not unified company nos).
function _GosiPersonRow({ name, badge, badgeColor, tags, meta }) {
  const [expanded, setExpanded] = useState(false)
  const items = (meta || []).filter(Boolean)
  const hasDetails = items.length > 0
  const tagList = Array.isArray(tags) ? tags.filter(Boolean) : []
  return (
    // Single column: name row at top (tags + badge inlined on the far end so
    // they stay glued next to the name even when the metadata grows), then
    // optional metadata grid below. Mirrors the SBC PersonRow layout fix.
    <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ minWidth: 0 }}>
        <div
          onClick={hasDetails ? () => setExpanded(v => !v) : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: hasDetails ? 'pointer' : 'default', userSelect: 'none' }}>
          <span title="شخص" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,.08)', color: 'var(--tx)', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
          </span>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{name || '—'}</div>
          {hasDetails && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--tx)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
          {/* Tags + badge inlined on the end via a flex spacer — keeps them
              next to the name regardless of whether the row is expanded. */}
          {(tagList.length > 0 || badge) && <span style={{ flex: 1 }} />}
          {tagList.map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {i > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.25)' }}>·</span>}
              <span style={{
                fontSize: 11, fontWeight: 800,
                color: t.color || C.gold,
                whiteSpace: 'nowrap',
              }}>{t.label}</span>
            </span>
          ))}
          {badge && (
            <span style={{
              fontSize: 9.5, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
              color: badgeColor || 'var(--tx4)',
              background: (badgeColor || 'rgba(255,255,255,.18)') + (badgeColor ? '14' : ''),
              whiteSpace: 'nowrap', textAlign: 'end', flexShrink: 0,
            }}>{badge}</span>
          )}
        </div>
        {expanded && hasDetails && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'baseline',
            columnGap: 24, rowGap: 10,
            marginTop: 10, paddingTop: 10,
            borderTop: '1px dashed rgba(255,255,255,.07)',
          }}>
            {items.map((m, i) => (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                <span style={{ color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{m.k}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {m.copy && <CopyBtn value={m.copyText != null ? m.copyText : m.v} />}
                  <span style={{
                    color: 'var(--tx)', fontWeight: 700,
                    fontFamily: m.mono ? 'ui-monospace, monospace' : undefined,
                    direction: m.mono ? 'ltr' : undefined,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{m.v}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GosiOwnersCard({ owners, T, lang }) {
  if (!owners || !owners.length) return null
  const isAr = (lang || 'ar') !== 'en'
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
        <GosiSourceIcon />
        <span style={cardTitle}>{T('الملاك والشركاء', 'Owners & Partners')}</span>
        <_GosiCountBadge n={owners.length} color={C.blue} />
      </div>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {owners.map((o) => {
          const personName = isAr
            ? [o.first_name_ar, o.second_name_ar, o.third_name_ar, o.family_name_ar].filter(Boolean).join(' ')
            : o.full_name_en
          // Company owners carry no person record — their name + identifier live
          // under raw.estOwner instead. Fall back to that so company partners
          // don't render as an empty "—" row.
          const estOwner = o.raw && o.raw.estOwner ? o.raw.estOwner : null
          const partnerType = o.raw && o.raw.partnerType ? (isAr ? o.raw.partnerType.arabic : o.raw.partnerType.english) : null
          const partnershipType = o.raw && o.raw.partnershipType ? (isAr ? o.raw.partnershipType.arabic : o.raw.partnershipType.english) : null
          const name = personName || (estOwner && estOwner.name) || o.full_name_en
          const active = !o.end_date
          return (
            <_GosiPersonRow
              key={o.id}
              name={name}
              badge={active ? T('نشط', 'Active') : T('غير نشط', 'Inactive')}
              badgeColor={active ? C.ok : C.gray}
              meta={[
                o.national_id && { k: T('الهوية', 'NID'), v: o.national_id, mono: true, copy: true },
                (estOwner && estOwner.partyId) && { k: T('الرقم الموحد', 'Unified no.'), v: estOwner.partyId, mono: true, copy: true },
                (o.nationality_ar || o.nationality_en) && { k: T('الجنسية', 'Nationality'), v: isAr ? o.nationality_ar : o.nationality_en },
                partnerType && { k: T('نوع الشريك', 'Partner type'), v: partnerType },
                partnershipType && { k: T('نوع الشراكة', 'Partnership'), v: partnershipType },
                o.birth_date && { k: T('الميلاد', 'Born'), v: _GosiDatePair(o.birth_date, o.birth_date_hijri), mono: true, copy: true, copyText: _gosiDateCopy(o.birth_date, o.birth_date_hijri) },
                o.start_date && { k: T('بداية الملكية', 'Since'), v: _gosiDate(o.start_date), mono: true },
                o.end_date && { k: T('نهاية الملكية', 'Until'), v: _gosiDate(o.end_date), mono: true },
              ]}
            />
          )
        })}
      </div>
    </div>
  )
}

// GOSI numeric role codes → human labels. Code 2 is confirmed as branch-account
// manager (per user feedback); every other code is just a generic admin, so we
// label it "مشرف" rather than exposing the raw role number.
const GOSI_ADMIN_ROLE_LABELS = {
  2: { ar: 'مدير حساب الفروع', en: 'Branch account manager' },
}
const gosiAdminRoleLabel = (code, isAr) => {
  const m = GOSI_ADMIN_ROLE_LABELS[Number(code)]
  if (m) return isAr ? m.ar : m.en
  return isAr ? 'مشرف' : 'Admin'
}

function GosiAdminsCard({ admins, T, lang }) {
  if (!admins || !admins.length) return null
  const isAr = (lang || 'ar') !== 'en'
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />
        <GosiSourceIcon />
        <span style={cardTitle}>{T('المشرفون', 'Admins')}</span>
        <_GosiCountBadge n={admins.length} color={C.purple} />
      </div>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {admins.map((a) => {
          const name = isAr
            ? [a.first_name_ar, a.second_name_ar, a.third_name_ar, a.family_name_ar].filter(Boolean).join(' ')
            : a.full_name_en
          // Role chips beside the name. The "primary" role (branch-account
          // manager = 2) gets gold; the rest stay muted purple so the primary
          // pops first to the eye.
          const roleTags = Array.isArray(a.roles) && a.roles.length
            ? a.roles.map(r => ({
                label: gosiAdminRoleLabel(r, isAr),
                color: Number(r) === 2 ? C.gold : C.purple,
              }))
            : null
          return (
            <_GosiPersonRow
              key={a.id}
              name={name || a.full_name_en}
              tags={roleTags}
              meta={[
                a.national_id && { k: T('الهوية', 'NID'), v: a.national_id, mono: true, copy: true },
                (a.nationality_ar || a.nationality_en) && { k: T('الجنسية', 'Nationality'), v: isAr ? a.nationality_ar : a.nationality_en },
                a.birth_date && { k: T('الميلاد', 'Born'), v: _GosiDatePair(a.birth_date, a.birth_date_hijri), mono: true, copy: true, copyText: _gosiDateCopy(a.birth_date, a.birth_date_hijri) },
                a.social_insurance_number && { k: T('رقم التأمين', 'SIN'), v: a.social_insurance_number, mono: true },
              ]}
            />
          )
        })}
      </div>
    </div>
  )
}

// GOSI certificate PDFs card — three rows (one per cert_type), each linking
// to the file in the public 'gosi-certificates' storage bucket. Rendered when
// the bookmarklet has uploaded at least one PDF for the establishment. The
// rows use the same `_gosiRowBase` chrome as the other GOSI rows so the card
// visually matches the rest of the GOSI section.
//
// cert_type → label mapping is defined here (not in a shared file) because
// these three types are the only certificates we currently download and the
// labels are user-facing copy.
function GosiCertificatesCard({ certificates, T }) {
  if (!certificates || !certificates.length) return null
  // Map by cert_type so we can render the rows in a stable, opinionated order
  // (compliance → zakat → OH) regardless of how Supabase returned them.
  const byType = {}
  for (const c of certificates) byType[c.cert_type] = c
  const CERT_LABELS = {
    '17_02_0011': { ar: 'شهادة الالتزام', en: 'Compliance certificate' },
    '17_02_0050': { ar: 'شهادة الزكاة والدخل', en: 'Zakat & Income certificate' },
    '22_07_0007': { ar: 'شهادة السلامة والصحة المهنية', en: 'OH certificate' },
  }
  const STORAGE_BASE = 'https://gcvshzutdslmdkwqwteh.supabase.co/storage/v1/object/public/gosi-certificates/'
  const order = ['17_02_0011', '17_02_0050', '22_07_0007']
  const fmtDate = (s) => s ? String(s).slice(0, 10) : null
  const fmtSize = (n) => {
    if (n == null) return null
    if (n < 1024) return n + ' B'
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB'
    return (n / (1024 * 1024)).toFixed(1) + ' MB'
  }
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} />
        <GosiSourceIcon />
        <span style={cardTitle}>{T('ملفات التأمينات الاجتماعية', 'GOSI Certificates')}</span>
        <_GosiCountBadge n={certificates.length} color={C.cyan} />
      </div>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {order.map((type) => {
          const c = byType[type]
          if (!c) return null
          const meta = CERT_LABELS[type] || { ar: type, en: type }
          const url = STORAGE_BASE + c.storage_path
          // Newest (to_date) on the left, oldest (from_date) on the right —
          // reads right-to-left from old → new.
          const dateRange = (c.from_date && c.to_date)
            ? (fmtDate(c.to_date) + ' ← ' + fmtDate(c.from_date))
            : null
          return (
            <a
              key={type}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ..._gosiRowBase,
                padding: '10px 12px',
                gap: 10,
                textDecoration: 'none',
                cursor: 'pointer',
              }}>
              {/* PDF icon — same chrome-on-tile look as the person/role icons. */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 26, height: 26, borderRadius: 6,
                background: 'rgba(231, 76, 60, .12)', color: '#e74c3c', flexShrink: 0,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </span>
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {T(meta.ar, meta.en)}
                </span>
                {/* Subtle metadata strip: certificate number on the left,
                    date range / size on the right. Stays muted so the title
                    keeps prominence. */}
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'rgba(255,255,255,.45)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {c.certificate_no && (
                    <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>#{c.certificate_no}</span>
                  )}
                  {dateRange && <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{dateRange}</span>}
                  {c.pdf_size_bytes != null && <span style={{ direction: 'ltr' }}>{fmtSize(c.pdf_size_bytes)}</span>}
                </div>
              </div>
              {/* External-link arrow on the end side as a tactile cue. */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'rgba(255,255,255,.4)', flexShrink: 0 }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// Same compact click-to-expand pattern as _GosiPersonRow, but keeps the
// monthly wage anchored on the end side so it stays scannable when collapsed.
// The expanded panel accepts a `groups` prop: an array of { title, items }
// sections so personal info, documents, and employment details each get their
// own visually distinct block. Items inside a group render as a 2-column grid
// with label on the start and value on the end, giving the user a structured
// "definition list" feel instead of a flat run-on wrap of pairs.
//
// `statusType` is the GOSI engagement status string (ACTIVE/INACTIVE/SUSPENDED
// /…). When present, we render a small colored pill next to the name so the
// per-row status is visible without needing the user to compare against the
// summary strip above.
function _GosiContribRow({ name, wage, statusType, groups, T }) {
  const [expanded, setExpanded] = useState(false)
  const sections = (groups || [])
    .map(g => ({ title: g?.title, items: (g?.items || []).filter(Boolean) }))
    .filter(g => g.items.length > 0)
  const hasDetails = sections.length > 0
  // Map the raw GOSI status string to a localized label + accent color. Falls
  // back to "—" / muted gray when GOSI returns an unrecognised value (e.g.
  // FUTURE, ENDED) so we don't silently misclassify it.
  const s = String(statusType || '').toUpperCase()
  let statusLabel = null, statusColor = null
  if (s === 'ACTIVE') { statusLabel = T('نشط', 'Active'); statusColor = C.ok }
  else if (s === 'INACTIVE') { statusLabel = T('غير نشط', 'Inactive'); statusColor = C.red }
  else if (s === 'SUSPENDED') { statusLabel = T('معلق', 'Suspended'); statusColor = C.warn }
  else if (s) { statusLabel = statusType; statusColor = 'rgba(255,255,255,.45)' }
  return (
    <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div
          onClick={hasDetails ? () => setExpanded(v => !v) : undefined}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: hasDetails ? 'pointer' : 'default', userSelect: 'none', minWidth: 0, flex: 1 }}>
          <span title="موظف" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: 'rgba(255,255,255,.08)', color: 'var(--tx)', flexShrink: 0 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
          </span>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{name || '—'}</div>
          {hasDetails && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--tx)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
        {/* Wage + status stacked vertically on the end so the two badges
            don't compete horizontally. Wage is the headline metric (kept
            green and bold), status pill sits below it muted/smaller — same
            visual hierarchy as a price + tag pair on a product card. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, minWidth: 0 }}>
          {wage != null && wage > 0 && (
            <span style={{ fontSize: 13, fontWeight: 800, color: C.ok, direction: 'ltr', whiteSpace: 'nowrap', lineHeight: 1 }}>{_gosiMoney(wage)}</span>
          )}
          {statusLabel && (
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999,
              color: statusColor, background: statusColor + '14',
              border: `1px solid ${statusColor}33`, whiteSpace: 'nowrap',
            }}>{statusLabel}</span>
          )}
        </div>
      </div>
      {expanded && hasDetails && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,.07)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sections.map((g, gi) => (
            <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.title && (
                <div style={{ fontSize: 9.5, fontWeight: 800, color: 'rgba(255,255,255,.5)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 2 }}>{g.title}</div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 24, rowGap: 10 }}>
                {g.items.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 11, minWidth: 0 }}>
                    <span style={{ color: 'rgba(255,255,255,.45)', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.k}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                      {m.copy && <CopyBtn value={m.copyText != null ? m.copyText : m.v} />}
                      <span style={{
                        color: 'var(--tx)', fontWeight: 700,
                        fontFamily: m.mono ? 'ui-monospace, monospace' : undefined,
                        direction: m.mono ? 'ltr' : undefined,
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{m.v}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Saudi detection — GOSI's establishment-level saudi/non-saudi counts are
// unreliable, so we detect per-contributor: has a national_id (NIN) or its
// nationality reads Saudi Arabia.
const gosiIsSaudi = (c) => !!c.national_id
  || /السعودية|saudi/i.test(String(c.nationality_ar || '') + ' ' + String(c.nationality_en || ''))

function GosiContributorsCard({ contributors, est, T, lang, title }) {
  if (!contributors || !contributors.length) return null
  const isAr = (lang || 'ar') !== 'en'
  // Status classification — matches the GOSI portal: a contributor with
  // statusType=ACTIVE but hasLiveEngagementInEstablishment=false is treated
  // as "معلق" (suspended), not active. Without this fix, suspended workers
  // get counted in the active bucket which doesn't match what the user sees
  // on ameen.gosi.gov.sa.
  const statusOf = (c) => String(c.status_type || '').toUpperCase()
  const hasLive = (c) => c.has_live_engagement_in_establishment === true
  const activeCount    = contributors.filter(c => statusOf(c) === 'ACTIVE' && hasLive(c)).length
  const inactiveCount  = contributors.filter(c => statusOf(c) === 'INACTIVE').length
  const suspendedCount = contributors.filter(c => statusOf(c) === 'SUSPENDED' || (statusOf(c) === 'ACTIVE' && !hasLive(c))).length
  // Effective status of a single contributor — drives the per-row status pill
  // so it agrees with the strip totals above.
  const effectiveStatus = (c) => {
    if (statusOf(c) === 'INACTIVE') return 'INACTIVE'
    if (statusOf(c) === 'SUSPENDED') return 'SUSPENDED'
    if (statusOf(c) === 'ACTIVE' && hasLive(c)) return 'ACTIVE'
    return 'SUSPENDED' // ACTIVE without live engagement = suspended subscription
  }
  // Mini stat tile for the summary strip — mirrors how SBC shows facility
  // counts on the sidebar (label below a big bold number).
  const Stat = ({ n, label, color }) => n == null ? null : (
    <div style={{ textAlign: 'center', padding: '6px 4px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: color || 'var(--tx)', direction: 'ltr' }}>{n}</div>
      <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 2 }}>{label}</div>
    </div>
  )
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} />
        <GosiSourceIcon />
        <span style={cardTitle}>{title || T('الموظفون / المشتركون', 'Contributors')}</span>
        <_GosiCountBadge n={contributors.length} color={C.cyan} />
      </div>
      <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Status strip — active / inactive / suspended. Computed from the
            contributors array so it stays accurate after we sync INACTIVE and
            SUSPENDED separately. */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
          padding: 8, borderRadius: 10,
          background: 'rgba(22,160,133,.06)',
          border: '1px solid rgba(22,160,133,.22)',
        }}>
          <Stat n={activeCount} label={T('نشطون', 'Active')} color={C.ok} />
          <Stat n={inactiveCount} label={T('غير نشطون', 'Inactive')} color={inactiveCount > 0 ? C.red : undefined} />
          <Stat n={suspendedCount} label={T('معلقون', 'Suspended')} color={suspendedCount > 0 ? C.warn : undefined} />
        </div>

        {contributors.map((c) => {
          const name = isAr
            ? [c.first_name_ar, c.second_name_ar, c.third_name_ar, c.family_name_ar].filter(Boolean).join(' ')
            : c.full_name_en
          // GOSI sometimes stores non-Saudi names in English even under .arabic
          // — fall back to full_name_en if the arabic compose was empty.
          const displayName = name || c.full_name_en || '—'
          const occ = isAr ? c.occupation_ar : c.occupation_en
          return (
            <_GosiContribRow
              key={c.id}
              name={displayName}
              wage={c.wage_total}
              statusType={effectiveStatus(c)}
              T={T}
              groups={(() => {
                // Pull passport expiry from the raw payload — bookmarklet
                // doesn't surface it as a dedicated column yet, but GOSI
                // returns it under person.identity[type=PASSPORT].expiryDate.
                const passportRaw = Array.isArray(c.raw?.person?.identity)
                  ? c.raw.person.identity.find(x => x && x.idType === 'PASSPORT') : null
                const passportExpiry = passportRaw && passportRaw.expiryDate
                  ? _gosiDate(passportRaw.expiryDate.gregorian || passportRaw.expiryDate) : null
                return [
                  {
                    title: T('بيانات شخصية', 'Personal'),
                    items: [
                      (c.nationality_ar || c.nationality_en) && { k: T('الجنسية', 'Nationality'), v: isAr ? c.nationality_ar : c.nationality_en },
                      c.birth_date && { k: T('الميلاد', 'Born'), v: _GosiDatePair(c.birth_date, c.birth_date_hijri), mono: true, copy: true, copyText: _gosiDateCopy(c.birth_date, c.birth_date_hijri) },
                    ],
                  },
                  {
                    title: T('الوثائق', 'Documents'),
                    items: [
                      // National ID first for Saudis — it's the primary identifier.
                      // For non-Saudis the column is null and the entry is dropped.
                      c.national_id && { k: T('الهوية', 'NID'), v: c.national_id, mono: true, copy: true },
                      c.iqama_no && { k: T('إقامة', 'Iqama'), v: c.iqama_no, mono: true, copy: true },
                      c.iqama_expiry_date && { k: T('انتهاء الإقامة', 'Iqama exp.'), v: _gosiDate(c.iqama_expiry_date), mono: true },
                      c.passport_no && { k: T('رقم الجواز', 'Passport'), v: c.passport_no, mono: true },
                      passportExpiry && { k: T('انتهاء الجواز', 'Passport exp.'), v: passportExpiry, mono: true },
                      c.border_no && { k: T('رقم الحدود', 'Border no.'), v: c.border_no, mono: true, copy: true },
                    ],
                  },
                  (() => {
                    // Exit date — only shown when GOSI gives us a REAL
                    // termination/suspension date. We used to fall back to
                    // latest_period_update, but GOSI sets that equal to the
                    // joining date when no real exit is recorded, so it ended
                    // up showing the join date as the exit date (wrong). Now
                    // we strictly use suspended_date / suspended_terminated_date
                    // and just omit the row when those are null — better to
                    // hide than to display a misleading "تاريخ الفصل" that
                    // matches the joining date.
                    const status = String(c.status_type || '').toUpperCase()
                    let exitLabel = null, exitDate = null
                    if (status === 'SUSPENDED') {
                      exitDate = c.suspended_date || null
                      exitLabel = T('تاريخ التعليق', 'Suspended on')
                    } else if (status === 'INACTIVE' || status === 'ENDED') {
                      // Prefer the engagement endpoint's endDate (accurate stint
                      // termination) over the suspension-derived date.
                      exitDate = c.engagement_end_date || c.suspended_terminated_date || null
                      exitLabel = T('تاريخ الفصل', 'Ended on')
                    }
                    // Joining date: GOSI sets `joining_date` only when the
                    // wageDetails call succeeded — for inactive contributors
                    // (no wage call) it's null, so fall back to the engagement
                    // endpoint's startDate, then latest_joining_date.
                    const joinDate = c.joining_date || c.engagement_start_date || c.latest_joining_date
                    return {
                      title: T('العمل', 'Employment'),
                      items: [
                        occ && { k: T('المهنة', 'Occupation'), v: occ },
                        joinDate && { k: T('تاريخ الالتحاق', 'Joined'), v: _gosiDate(joinDate), mono: true },
                        exitDate && exitLabel && { k: exitLabel, v: _gosiDate(exitDate), mono: true },
                        // Employment duration in days for non-active stints —
                        // computed from the joining and termination dates.
                        (() => {
                          const days = (status === 'INACTIVE' || status === 'ENDED') ? _gosiDaysBetween(joinDate, exitDate) : null
                          return days != null && { k: T('المدة', 'Duration'), v: <span style={{ direction: 'ltr' }}>{days} {T('يوم', days === 1 ? 'day' : 'days')}</span> }
                        })(),
                        c.wage_contributory != null && c.wage_contributory !== c.wage_total && { k: T('الخاضع', 'Contrib.'), v: _gosiMoney(c.wage_contributory), mono: true },
                      ],
                    }
                  })(),
                ]
              })()}
            />
          )
        })}
      </div>
    </div>
  )
}

// Detect whether a partner / manager entry is a company (vs a natural person).
// SBC flags this via identifierType ("الرقم الموحد" / "commercial registration"),
// or via ID heuristic: 10-digit Unified National Numbers start with 7.
function isCompanyParty(p) {
  const info = p?.personInfo || {}
  const typeAr = info.identifierType?.identifierTypeDescAr || ''
  const typeEn = info.identifierType?.identifierTypeDescEn || ''
  if (/موحد|تجاري|منشأ|commercial|unified|company|establishment/i.test(`${typeAr} ${typeEn}`)) return true
  const id = String(info.identifierNo || '')
  if (/^7\d{9}$/.test(id)) return true
  return false
}

// Compact list of people (managers / partners) — name on top, ID below.
// For company partners: shows the full company name + unified national number.
// For person partners: shows the first name + national ID.
// Limits to 3 entries; collapses the rest as "+N".
function PersonList({ people, lang }) {
  if (!Array.isArray(people) || people.length === 0) {
    return <span style={{ color: 'rgba(255,255,255,.3)', fontSize: 11 }}>—</span>
  }
  const isAr = (lang || 'ar') !== 'en'
  const shown = people.slice(0, 3)
  const extra = people.length - shown.length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {shown.map((p, i) => {
        const info = p?.personInfo || {}
        const isCompany = isCompanyParty(p)
        const name = isCompany
          ? (isAr
              ? [info.firstNameAr, info.fatherNameAr, info.grandFatherNameAr, info.familyNameAr].filter(Boolean).join(' ')
              : (info.firstNameEn || info.firstNameAr))
          : (isAr ? (info.firstNameAr || info.firstNameEn) : (info.firstNameEn || info.firstNameAr))
        return (
          <div key={i} style={{ maxWidth: '100%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx)', marginBottom: 4, ...(isCompany
              ? { whiteSpace: 'normal', lineHeight: 1.35 }
              : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>{name || '—'}</div>
            <div style={{ fontSize: 9.5, fontFamily: 'ui-monospace, monospace', color: 'rgba(255,255,255,.45)', direction: 'ltr' }}>{info.identifierNo || ''}</div>
          </div>
        )
      })}
      {extra > 0 && <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>+{extra}</div>}
    </div>
  )
}

const fmtDate = (s) => {
  if (!s) return '—'
  let v = s
  if (typeof v === 'string' && v.trim().startsWith('{')) {
    try { v = JSON.parse(v) } catch {}
  }
  if (v && typeof v === 'object') {
    const g = v.gregorianDate || v.dateG || v.date || v.gregorian || v.Gregorian
    if (g) return String(g).slice(0, 10)
    return '—'
  }
  return String(v).slice(0, 10)
}

// SBC returns lookups as { xId, xDescAr, xDescEn } objects. PostgREST returns them as JSON strings.
// Parse-on-demand and extract the Ar/En label.
const label = (v, lang) => {
  if (v == null) return null
  let obj = v
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s.startsWith('{') && !s.startsWith('[')) return s
    try { obj = JSON.parse(s) } catch { return s }
  }
  if (typeof obj !== 'object' || obj == null) return null
  const want = lang === 'en' ? 'En' : 'Ar'
  for (const k of Object.keys(obj)) {
    if (/^(.*?)(Desc|Description|Name)(Ar|En)$/.test(k) && k.endsWith(want) && typeof obj[k] === 'string') {
      return obj[k]
    }
  }
  for (const k of Object.keys(obj)) {
    if (/desc|name/i.test(k) && typeof obj[k] === 'string') return obj[k]
  }
  return null
}

const fmtTime = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

const statusTheme = (s) => {
  const v = String(s || '').toLowerCase()
  if (v.includes('active') || v.includes('نشط')) return { fg: '#22c55e', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.35)' }
  if (v.includes('suspend') || v.includes('معلق') || v.includes('موقوف')) return { fg: '#e87265', bg: 'rgba(232,114,101,.12)', border: 'rgba(232,114,101,.35)' }
  if (v.includes('cancel') || v.includes('ملغ') || v.includes('مشطوب') || v.includes('struck') || v.includes('removed')) return { fg: '#ef4444', bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.35)' }
  if (v.includes('expired') || v.includes('منتهي')) return { fg: '#e67e22', bg: 'rgba(230,126,34,.12)', border: 'rgba(230,126,34,.35)' }
  return { fg: 'rgba(255,255,255,.75)', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)' }
}

// Abbreviate currency: "ريال سعودي" → "ر.س"
const currencyShort = (s, lang) => {
  if (!s) return ''
  if (lang === 'en') return 'SAR'
  const v = String(s)
  if (v.includes('ريال') || v.toLowerCase().includes('saudi')) return 'ر.س'
  return v
}

// Normalize a Saudi mobile to local 0-prefixed form: strip +966 / 00966 / 966
// and replace with a leading 0 (e.g. 00966537593464 → 0537593464). Numbers that
// aren't in a Saudi international form pass through unchanged.
const saMobile = (v) => {
  if (v == null || v === '') return v
  let s = String(v).trim().replace(/[\s-]/g, '')
  if (s.startsWith('+')) s = s.slice(1)
  if (s.startsWith('00966')) return '0' + s.slice(5)
  if (s.startsWith('966')) return '0' + s.slice(3)
  return String(v)
}

// Draggable SBC sync bookmarklet anchor — the gold "مزامنة المركز السعودي" pill
// shown at the top of the facilities page. Same drag-to-bookmarks-bar pattern
// used elsewhere: clicking it does nothing; the user drags it to the browser's
// bookmarks bar, opens the Tayseer portal, and clicks the bookmark to sync.
// Renders TWO draggable bookmarklets: one syncs facility data (fast, ~10
// min for ~216 facilities), the other downloads PDF certificates from
// printcr.mc.gov.sa using the URLs the data bookmarklet captured. They're
// split because PDFs require a different fetch strategy (direct browser
// fetch from the user's Saudi network) versus the API endpoints (which
// work fine through the saudibusiness gateway with CORS).
function DragBookmark({ href, label, accent, title }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.setAttribute('href', href) }, [href])
  const rest = `linear-gradient(180deg, ${accent}1f 0%, ${accent}0f 100%)`
  const hover = `linear-gradient(180deg, ${accent}33 0%, ${accent}1c 100%)`
  const restShadow = `0 1px 2px rgba(0,0,0,.25), inset 0 1px 0 ${accent}1a`
  const hoverShadow = `0 7px 18px ${accent}33, inset 0 1px 0 ${accent}2e`
  return (
    <a
      ref={ref}
      title={title}
      onClick={e => e.preventDefault()}
      draggable="true"
      style={{
        height: 40, paddingInlineStart: 6, paddingInlineEnd: 13, borderRadius: 12,
        background: rest,
        border: `1px solid ${accent}66`,
        color: accent,
        textDecoration: 'none', fontFamily: F, fontSize: 12.5, fontWeight: 800,
        cursor: 'grab',
        // Explicit LTR so the grip handle always sits on the physical right,
        // independent of the surrounding RTL/LTR context.
        direction: 'ltr',
        display: 'inline-flex', alignItems: 'center', gap: 9,
        boxShadow: restShadow,
        transition: 'transform .15s, box-shadow .15s, background .15s, border-color .15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = hover; e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = hoverShadow }}
      onMouseLeave={e => { e.currentTarget.style.background = rest; e.currentTarget.style.borderColor = `${accent}66`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = restShadow }}>
      {/* Drag-grip handle — signals "drag me to the bookmarks bar" */}
      <span aria-hidden="true" style={{ display: 'inline-flex', paddingInline: 2, opacity: .5 }}>
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/>
          <circle cx="3" cy="8" r="1.3"/><circle cx="7" cy="8" r="1.3"/>
          <circle cx="3" cy="13" r="1.3"/><circle cx="7" cy="13" r="1.3"/>
        </svg>
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </a>
  )
}

function SbcSyncBookmarklet({ syncPersonId, T }) {
  // Bake current site origin into the bookmarklet so it can POST to our
  // Netlify proxy from across the e2.business.sa origin. PDF upload is
  // fire-and-forget inside the data bookmarklet itself — token-expiry
  // prevented the previous split design (separate PDF button) from working.
  const proxyBaseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const dataHref = buildBookmarklet({ sourceId: 'sbc', personId: syncPersonId || '', proxyBaseUrl })
  return (
    <DragBookmark
      href={dataHref}
      accent="#9b59b6"
      title={T('اسحب الزر إلى شريط الإشارات، ثم افتح تيسير واضغط لمزامنة بيانات وملفات المنشآت', 'Drag to bookmarks bar, open Tayseer and click to sync facility data + PDFs')}
      label={T('المركز السعودي', 'SBC')}
      icon={(
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/>
        </svg>
      )}
    />
  )
}

// GOSI sync bookmarklet — drags to user's browser. When run on
// ameen.gosi.gov.sa it captures the bearer token, decodes the JWT to find
// every establishment regNo the account has access to, then pulls
// /v1/establishment/{regNo} for each into public.gosi_establishments.
function GosiSyncBookmarklet({ syncPersonId, T }) {
  const dataHref = buildGosiBookmarklet({ personId: syncPersonId || '', origin: window.location.origin })
  return (
    <DragBookmark
      href={dataHref}
      accent="#22c55e"
      title={T('اسحب الزر إلى شريط الإشارات، ثم افتح أمين التأمينات واضغط لمزامنة بيانات المنشآت', 'Drag to bookmarks bar, open Ameen and click to sync GOSI facility data')}
      label={T('التأمينات الإجتماعية', 'GOSI')}
      icon={(
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      )}
    />
  )
}

// Qiwa sync bookmarklet — drags to user's bookmarks bar. When run on any
// *.qiwa.sa origin, captures workspaces + active company detail + criteria
// + indicators + cases + employee-cases + absher into public.qiwa_companies
// (plus related sub-tables populated by qiwaSyncBookmarklet.js).
function QiwaSyncBookmarklet({ syncPersonId, T }) {
  const dataHref = buildQiwaBookmarklet({ sourceId: 'qiwa', personId: syncPersonId || '' })
  return (
    <DragBookmark
      href={dataHref}
      accent="#3b82f6"
      title={T('اسحب الزر إلى شريط الإشارات، ثم افتح بوابة قوى واضغط لمزامنة المنشآت', 'Drag to bookmarks bar, open Qiwa portal and click to sync facilities')}
      label={T('قوى', 'Qiwa')}
      icon={(
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )}
    />
  )
}

export default function FacilitiesPage({ sb, toast, user, lang, personFilter, onTriggerSync, syncPersonId, onBack, onTabChange }) {
  const T = (ar, en) => (lang || 'ar') !== 'en' ? ar : en

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({ owner: [], manager: [], partnersCount: [], adminsCount: [], city: '', status: [], sortConfirm: '', sortIssue: '', nitaq: [] })
  const [detail, setDetail] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [filter, setFilter] = useState('all') // all | main | manager | partner | confirmation
  const [page, setPage] = useState(0)
  // Live GOSI/HRSD data fetched per-facility when the detail modal opens.
  const [liveGosi, setLiveGosi] = useState(null)
  const [liveHrsd, setLiveHrsd] = useState(null)
  const [gosiState, setGosiState] = useState('idle') // idle | loading | ok | error
  const [hrsdState, setHrsdState] = useState('idle')
  const [sbcSessionErr, setSbcSessionErr] = useState(null)
  // Per-facility provenance — cr_number → [{ source_id, sync_person_id, person_name_ar, person_color, last_synced_at }]
  // Populated from v_facility_provenance and merged into rows so the table can
  // show "where did this facility's data come from" badges per row.
  const [provByCr, setProvByCr] = useState({})
  // GOSI admin counts keyed by GOSI registration_no. Powers the "عدد المشرفين"
  // filter. Loaded once in parallel with the facilities list so we can filter
  // without opening each row's detail.
  const [adminsCountByReg, setAdminsCountByReg] = useState({})
  // Table view mode: 'sbc' keeps the original SBC-derived columns; 'gosi' swaps
  // most columns to GOSI-derived data (owners, debt, contributors split by
  // status & nationality). The facility name + numbers columns stay constant
  // since they're the entry point regardless of which lens is active.
  const [tableView, setTableView] = useState('sbc')
  // GOSI rows for the table — keyed by registration_no so each table row can
  // O(1) look up its slice. Lazy-loaded the first time the user switches to
  // the GOSI view (no point fetching ~2500 contributors on initial page load
  // when most users stay in SBC mode).
  const [gosiOwnersByReg, setGosiOwnersByReg] = useState({})
  const [gosiContribByReg, setGosiContribByReg] = useState({})
  const [gosiEstByReg, setGosiEstByReg] = useState({})
  // Stores the schema version that was loaded (0 = not loaded yet). Bumping
  // GOSI_AGG_SCHEMA in the loader auto-invalidates this on the next mount.
  const [gosiAggLoaded, setGosiAggLoaded] = useState(0)
  const [gosiAggLoading, setGosiAggLoading] = useState(false)
  // Person-scoped MoC violations stats fetched from sbc_dashboard_stats via sync_persons.
  const [personStats, setPersonStats] = useState(null)
  // Extended per-facility data pulled from sbc_sync_debug (response bodies for
  // each endpoint we synced). Keyed by short endpoint name → latest payload.
  // Populated on detail open via the useEffect below; reset when detail closes.
  const [extDetail, setExtDetail] = useState(null)
  const [extDetailLoading, setExtDetailLoading] = useState(false)
  // GOSI establishment main info — pulled from public.gosi_establishments
  // (populated by the GOSI bookmarklet). Looked up by gosi_registration_number
  // when the facility detail opens.
  const [gosiEstablishment, setGosiEstablishment] = useState(null)
  // True while the "نقل إلى المنشآت" button is running its multi-step promote.
  const [promoting, setPromoting] = useState(false)
  // Manual "إضافة منشأة" modal
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name_ar: '', name_en: '', unified_number: '', gosi_number: '', hrsd_number: '' })
  // Qiwa company row — populated by the Qiwa bookmarklet (qiwaSyncBookmarklet.js)
  // and matched here by cr_number when a facility detail opens.
  const [qiwaCompany, setQiwaCompany] = useState(null)
  // Muqeem org row + residents — populated by the Muqeem bookmarklet
  // (muqeemSyncBookmarklet.js). Matched here by moi_number = the SBC
  // facility's gosi_unified_national_number.
  const [muqeemCompany, setMuqeemCompany] = useState(null)
  const [muqeemResidents, setMuqeemResidents] = useState([])
  const [muqeemSubscriptions, setMuqeemSubscriptions] = useState([])
  // 1-to-many sub-tables populated by the same bookmarklet (owner/admin/
  // contributor/bill endpoints). Loaded together with the establishment row.
  const [gosiOwners, setGosiOwners] = useState([])
  const [gosiAdmins, setGosiAdmins] = useState([])
  const [gosiContributors, setGosiContributors] = useState([])
  const [gosiBills, setGosiBills] = useState([])
  // GOSI PDF certificates (compliance / zakat / OH) — pulled by the GOSI
  // bookmarklet's section (h) and stored in gosi_establishment_certificates,
  // with the PDFs themselves in the public 'gosi-certificates' storage bucket.
  const [gosiCertificates, setGosiCertificates] = useState([])

  // Build GOSI + HRSD patch from Netlify response payloads.
  const buildFetchPatch = useCallback((g, h) => {
    const patch = {}
    if (g?.ok && g.data) {
      const gd = g.data; const gFirst = gd.establishmentList?.[0] || null
      patch.gosi_registration_number = gFirst?.registrationNumber || null
      patch.gosi_establishment_name = gFirst?.establishmentNameArb || null
      patch.gosi_contributors_total = gd.numberOfContributors != null ? Number(gd.numberOfContributors) : null
      patch.gosi_contributors_saudi = gd.numberOfSaudiContributors != null ? Number(gd.numberOfSaudiContributors) : null
      patch.gosi_contributors_non_saudi = gd.numberOfNonSaudiContributors != null ? Number(gd.numberOfNonSaudiContributors) : null
      patch.gosi_total_contribution = gd.totalContribution != null ? Number(gd.totalContribution) : null
      patch.gosi_total_debit = gd.totalDebit != null ? Number(gd.totalDebit) : null
      patch.gosi_total_penalties = gd.totalPenalties != null ? Number(gd.totalPenalties) : null
      patch.gosi_synced_at = new Date().toISOString()
      patch.gosi_raw = gd
    }
    if (h?.ok && h.data) {
      const hd = h.data
      patch.hrsd_labor_office_id = hd.establishmentFileNumber?.laborOfficeIdField ?? null
      patch.hrsd_sequence_number = hd.establishmentFileNumber?.sequenceNumberField ?? null
      patch.hrsd_labor_office_name = hd.laboerOfficeName || null
      patch.hrsd_nitaq_code = hd.nitaq?.code || null
      patch.hrsd_nitaq_name = hd.nitaq?.nameLocal || null
      patch.hrsd_nitaqat_activity_code = hd.nitaqatEconomicActivity?.code || null
      patch.hrsd_nitaqat_activity_name = hd.nitaqatEconomicActivity?.nameLocal || null
      patch.hrsd_saudi_laborers = hd.saudiLaborers ?? null
      patch.hrsd_foreign_laborers = hd.foreignLaborers ?? null
      patch.hrsd_total_laborers = hd.totalLaborers ?? null
      patch.hrsd_total_issued_permits = hd.totalIssuedWorkPermits ?? null
      patch.hrsd_total_expired_permits = hd.totalExpiredWorkPermits ?? null
      patch.hrsd_total_expiring_permits = hd.totalAboutToExpireWorkPermits ?? null
      patch.hrsd_saudi_percentage = hd.entity_Saudi_Percentage ?? null
      patch.hrsd_synced_at = new Date().toISOString()
      patch.hrsd_raw = hd
    }
    return patch
  }, [])

  // Background prefetch: on rows load, fetch GOSI + HRSD for rows missing that
  // data so the table shows all three numbers without needing to open details.
  // Runs with bounded concurrency and skips rows that already have the data.
  useEffect(() => {
    if (!rows.length || !sb) return
    const missing = rows.filter(r => r.encrypted_cr_national_number && (!r.gosi_registration_number || r.hrsd_labor_office_id == null))
    if (!missing.length) return
    let cancelled = false
    ;(async () => {
      const { data: s } = await sb.from('sbc_sessions').select('access_token,token_type,expires_at,client_id').eq('id', 'default').maybeSingle()
      if (cancelled || !s?.access_token) return
      const now = Math.floor(Date.now() / 1000)
      if (s.expires_at && s.expires_at <= now) return
      const session = { accessToken: s.access_token, tokenType: s.token_type || 'Bearer', expiresAt: s.expires_at, clientId: s.client_id }
      const call = (action, enc) => fetch('/.netlify/functions/query-sbc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, session, encryptedCrNatNo: enc }),
      }).then(r => r.json()).catch(e => ({ error: String(e?.message || e) }))
      const CONCURRENCY = 4
      let idx = 0; let sessionBroken = false
      const worker = async () => {
        while (!cancelled && !sessionBroken) {
          const i = idx++
          if (i >= missing.length) return
          const r = missing[i]
          const [g, h] = await Promise.all([call('gosi-info', r.encrypted_cr_national_number), call('hrsd-info', r.encrypted_cr_national_number)])
          if (cancelled) return
          if (g?.code === 'SESSION_INVALID' || g?.code === 'SESSION_EXPIRED' || h?.code === 'SESSION_INVALID' || h?.code === 'SESSION_EXPIRED') { sessionBroken = true; return }
          const patch = buildFetchPatch(g, h)
          if (Object.keys(patch).length) {
            setRows(prev => prev.map(row => row.cr_national_number === r.cr_national_number ? { ...row, ...patch } : row))
            sb.from('sbc_facilities').update(patch).eq('cr_national_number', r.cr_national_number).then(() => {}, () => {})
          }
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    })()
    return () => { cancelled = true }
  }, [rows.length, sb, buildFetchPatch])

  // Fetch GOSI + HRSD directly via Netlify function when the modal opens.
  // Falls back to cached columns (gosi_*, hrsd_*) if session missing/expired.
  useEffect(() => {
    const enc = detail?.encrypted_cr_national_number
    setLiveGosi(null); setLiveHrsd(null); setSbcSessionErr(null)
    setGosiState(enc ? 'loading' : 'idle')
    setHrsdState(enc ? 'loading' : 'idle')
    if (!enc || !sb) return
    let cancelled = false
    ;(async () => {
      const { data: s } = await sb.from('sbc_sessions').select('access_token,token_type,expires_at,client_id').eq('id', 'default').maybeSingle()
      if (cancelled) return
      if (!s?.access_token) { setSbcSessionErr('NO_SESSION'); setGosiState('error'); setHrsdState('error'); return }
      const session = { accessToken: s.access_token, tokenType: s.token_type || 'Bearer', expiresAt: s.expires_at, clientId: s.client_id }
      const call = (action) => fetch('/.netlify/functions/query-sbc', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, session, encryptedCrNatNo: enc }),
      }).then(r => r.json()).catch(e => ({ error: String(e?.message || e) }))
      const [g, h] = await Promise.all([call('gosi-info'), call('hrsd-info')])
      if (cancelled) return
      if (g?.ok) { setLiveGosi(g.data); setGosiState('ok') } else { setGosiState('error') }
      if (h?.ok) { setLiveHrsd(h.data); setHrsdState('ok') } else { setHrsdState('error') }
      if (g?.code === 'SESSION_INVALID' || g?.code === 'SESSION_EXPIRED' || h?.code === 'SESSION_INVALID' || h?.code === 'SESSION_EXPIRED') {
        setSbcSessionErr('EXPIRED')
      }

      // Persist live results into sbc_facilities so the table (and next modal open) shows them
      // without another round-trip. Also update local rows state for immediate UI feedback.
      const patch = {}
      if (g?.ok && g.data) {
        const gd = g.data; const gFirst = gd.establishmentList?.[0] || null
        patch.gosi_registration_number = gFirst?.registrationNumber || null
        patch.gosi_establishment_name = gFirst?.establishmentNameArb || null
        patch.gosi_contributors_total = gd.numberOfContributors != null ? Number(gd.numberOfContributors) : null
        patch.gosi_contributors_saudi = gd.numberOfSaudiContributors != null ? Number(gd.numberOfSaudiContributors) : null
        patch.gosi_contributors_non_saudi = gd.numberOfNonSaudiContributors != null ? Number(gd.numberOfNonSaudiContributors) : null
        patch.gosi_total_contribution = gd.totalContribution != null ? Number(gd.totalContribution) : null
        patch.gosi_total_debit = gd.totalDebit != null ? Number(gd.totalDebit) : null
        patch.gosi_total_penalties = gd.totalPenalties != null ? Number(gd.totalPenalties) : null
        patch.gosi_synced_at = new Date().toISOString()
        patch.gosi_raw = gd
      }
      if (h?.ok && h.data) {
        const hd = h.data
        patch.hrsd_labor_office_id = hd.establishmentFileNumber?.laborOfficeIdField ?? null
        patch.hrsd_sequence_number = hd.establishmentFileNumber?.sequenceNumberField ?? null
        patch.hrsd_labor_office_name = hd.laboerOfficeName || null
        patch.hrsd_nitaq_code = hd.nitaq?.code || null
        patch.hrsd_nitaq_name = hd.nitaq?.nameLocal || null
        patch.hrsd_nitaqat_activity_code = hd.nitaqatEconomicActivity?.code || null
        patch.hrsd_nitaqat_activity_name = hd.nitaqatEconomicActivity?.nameLocal || null
        patch.hrsd_saudi_laborers = hd.saudiLaborers ?? null
        patch.hrsd_foreign_laborers = hd.foreignLaborers ?? null
        patch.hrsd_total_laborers = hd.totalLaborers ?? null
        patch.hrsd_total_issued_permits = hd.totalIssuedWorkPermits ?? null
        patch.hrsd_total_expired_permits = hd.totalExpiredWorkPermits ?? null
        patch.hrsd_total_expiring_permits = hd.totalAboutToExpireWorkPermits ?? null
        patch.hrsd_saudi_percentage = hd.entity_Saudi_Percentage ?? null
        patch.hrsd_synced_at = new Date().toISOString()
        patch.hrsd_raw = hd
      }
      if (Object.keys(patch).length && detail.cr_national_number) {
        setRows(prev => prev.map(r => r.cr_national_number === detail.cr_national_number ? { ...r, ...patch } : r))
        sb.from('sbc_facilities').update(patch).eq('cr_national_number', detail.cr_national_number).then(() => {}, () => {})
      }
    })()
    return () => { cancelled = true }
  }, [detail?.encrypted_cr_national_number, sb])

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true); setErr(null)
    try {
      const { data, error } = await sb.from('sbc_facilities').select('*').order('entity_full_name_ar', { ascending: true })
      if (error) throw error
      setRows(data || [])
      setLastSync((data && data.length) ? data.reduce((m, r) => (r.synced_at && (!m || r.synced_at > m)) ? r.synced_at : m, null) : null)
    } catch (e) {
      setErr(String(e.message || e))
    } finally { setLoading(false) }
  }, [sb])

  const saveManualFacility = useCallback(async () => {
    if (!sb || adding) return
    const name_ar = (addForm.name_ar || '').trim()
    if (!name_ar) { toast?.(T('أدخل اسم المنشأة بالعربي', 'Enter the Arabic facility name')); return }
    setAdding(true)
    try {
      const payload = {
        name_ar,
        name_en: (addForm.name_en || '').trim() || null,
        unified_number: (addForm.unified_number || '').trim() || null,
        gosi_number: (addForm.gosi_number || '').trim() || null,
        hrsd_number: (addForm.hrsd_number || '').trim() || null,
        created_by: user?.id || null,
      }
      const { error } = await sb.from('facilities').insert(payload)
      if (error) throw new Error(error.message)
      toast?.(T('تمت إضافة المنشأة بنجاح', 'Facility added successfully'))
      setShowAdd(false)
      setAddForm({ name_ar: '', name_en: '', unified_number: '', gosi_number: '', hrsd_number: '' })
    } catch (e) {
      toast?.(T('فشل الحفظ: ' + (e.message || e), 'Save failed: ' + (e.message || e)))
    } finally {
      setAdding(false)
    }
  }, [sb, addForm, adding, user, toast, T])

  // Push the sync-layer facilities + their non-Saudi GOSI contributors into the
  // canonical `facilities` and `workers` tables (the ones the sidebar pages
  // read). Idempotent — uses sbc_facility_id and gosi_engagement_id as upsert
  // keys so re-clicking just refreshes existing rows.
  const promoteToCanonical = useCallback(async () => {
    if (!sb || !rows.length || promoting) return
    setPromoting(true)
    try {
      toast?.(T('جاري نقل المنشآت...', 'Promoting facilities...'))

      const crNumbers = rows.map(r => r.cr_number).filter(Boolean)
      const { data: gosiEsts } = await sb.from('gosi_establishments')
        .select('registration_no,cr_number,unified_national_number,email_primary,mobile_primary,city_ar')
        .in('cr_number', crNumbers.length ? crNumbers : ['__none__'])
      const gosiByCr = {}
      const gosiByReg = {}
      for (const g of (gosiEsts || [])) {
        if (g.cr_number && !gosiByCr[g.cr_number]) gosiByCr[g.cr_number] = g
        if (g.registration_no) gosiByReg[String(g.registration_no)] = g
      }

      const facilityPayloads = rows.map(r => {
        const g = gosiByCr[r.cr_number]
        const hrsd = (r.hrsd_labor_office_id && r.hrsd_sequence_number)
          ? `${r.hrsd_labor_office_id}-${r.hrsd_sequence_number}` : null
        return {
          sbc_facility_id: r.id,
          name_ar: r.entity_full_name_ar || null,
          name_en: r.entity_full_name_en || null,
          unified_number: r.gosi_unified_national_number || g?.unified_national_number || null,
          cr_number: r.cr_number || null,
          gosi_number: r.gosi_registration_number || g?.registration_no || null,
          vat_number: r.zakat_tax_number || null,
          chamber_number: r.coc_chamber_number || null,
          spl_number: r.spl_national_address_id || null,
          hrsd_number: hrsd,
          cr_status: r.cr_status_ar || r.cr_status || null,
          city_ar: r.headquarter_city_ar || g?.city_ar || null,
          mobile: r.mobile_no || g?.mobile_primary || null,
          email: r.email || g?.email_primary || null,
          workers_total: r.gosi_number_of_contributors ?? null,
          workers_saudi: r.gosi_number_of_saudi_contributors ?? null,
          workers_non_saudi: r.gosi_number_of_non_saudi_contributors ?? null,
          source_synced_at: new Date().toISOString(),
        }
      })

      for (let i = 0; i < facilityPayloads.length; i += 100) {
        const chunk = facilityPayloads.slice(i, i + 100)
        const { error } = await sb.from('facilities')
          .upsert(chunk, { onConflict: 'sbc_facility_id' })
        if (error) throw new Error('facilities: ' + error.message)
        toast?.(T(`المنشآت ${Math.min(i + 100, facilityPayloads.length)}/${facilityPayloads.length}`,
                  `Facilities ${Math.min(i + 100, facilityPayloads.length)}/${facilityPayloads.length}`))
      }

      // Build reg_no → facility_id map after upsert (so we know the canonical ids)
      const { data: facsAfter } = await sb.from('facilities')
        .select('id,cr_number,gosi_number')
        .in('sbc_facility_id', rows.map(r => r.id))
      const facByCr = {}
      const facByReg = {}
      for (const f of (facsAfter || [])) {
        if (f.cr_number) facByCr[f.cr_number] = f.id
        if (f.gosi_number) facByReg[String(f.gosi_number)] = f.id
      }
      // Fill registrations that only show up in gosi_establishments (branches etc.)
      for (const reg in gosiByReg) {
        if (facByReg[reg]) continue
        const cr = gosiByReg[reg].cr_number
        if (cr && facByCr[cr]) facByReg[reg] = facByCr[cr]
      }

      const regNos = Object.keys(facByReg)
      if (!regNos.length) {
        toast?.(T(`✅ ${facilityPayloads.length} منشأة (لا توجد بيانات GOSI لنقل عمالها)`,
                  `✅ ${facilityPayloads.length} facilities (no GOSI worker data)`))
        return
      }

      const allContribs = []
      for (let i = 0; i < regNos.length; i += 100) {
        const chunk = regNos.slice(i, i + 100)
        const { data: contribs, error } = await sb.from('gosi_establishment_contributors')
          .select('registration_no,engagement_id,latest_live_engagement_id,iqama_no,iqama_expiry_date,border_no,passport_no,nationality_ar,occupation_ar,first_name_ar,second_name_ar,third_name_ar,family_name_ar,full_name_en,sex_ar,birth_date,status_type,joining_date,wage_total')
          .in('registration_no', chunk)
          .in('status_type', ['ACTIVE', 'INACTIVE', 'active', 'suspended'])
        if (error) throw new Error('contributors: ' + error.message)
        allContribs.push(...(contribs || []))
      }

      // Exclude Saudis. GOSI nationality_ar uses several spellings — with/without
      // the "ال" prefix and gendered forms. Normalize by stripping ال + matching
      // both سعودي and سعودية.
      const isSaudi = (n) => {
        const s = (n || '').trim().replace(/^ال/, '')
        return s === 'سعودي' || s === 'سعودية' || s === 'سعوديه'
      }
      const nonSaudi = allContribs.filter(c => c.nationality_ar && !isSaudi(c.nationality_ar))

      if (!nonSaudi.length) {
        toast?.(T(`✅ ${facilityPayloads.length} منشأة · لا يوجد عمال غير سعوديين`,
                  `✅ ${facilityPayloads.length} facilities · no non-Saudi workers`))
        return
      }

      const workerPayloads = []
      const seenEng = new Set()
      for (const c of nonSaudi) {
        const engagementId = c.latest_live_engagement_id || c.engagement_id
        const facId = facByReg[String(c.registration_no)]
        if (!facId || !engagementId) continue
        const key = String(engagementId)
        if (seenEng.has(key)) continue
        seenEng.add(key)
        const nameParts = [c.first_name_ar, c.second_name_ar, c.third_name_ar, c.family_name_ar].filter(Boolean)
        const st = String(c.status_type || '').toLowerCase()
        const normStatus = (st === 'active') ? 'active'
                          : (st === 'inactive' || st === 'suspended') ? 'suspended'
                          : (c.status_type || null)
        workerPayloads.push({
          name_ar: nameParts.length ? nameParts.join(' ') : null,
          name_en: c.full_name_en || null,
          iqama_number: c.iqama_no || null,
          iqama_expiry_date: c.iqama_expiry_date || null,
          border_number: c.border_no || null,
          passport_number: c.passport_no || null,
          nationality_ar: c.nationality_ar || null,
          occupation_ar: c.occupation_ar || null,
          worker_status: normStatus,
          gosi_engagement_id: key,
          gosi_registration_no: String(c.registration_no),
          joining_date: c.joining_date || null,
          wage_total: c.wage_total ?? null,
          birth_date: c.birth_date || null,
          gender: c.sex_ar === 'أنثى' ? 'female' : (c.sex_ar === 'ذكر' ? 'male' : null),
          current_facility_id: facId,
          source_synced_at: new Date().toISOString(),
        })
      }

      for (let i = 0; i < workerPayloads.length; i += 100) {
        const chunk = workerPayloads.slice(i, i + 100)
        const { error } = await sb.from('workers')
          .upsert(chunk, { onConflict: 'gosi_engagement_id' })
        if (error) throw new Error('workers: ' + error.message)
        toast?.(T(`العمال ${Math.min(i + 100, workerPayloads.length)}/${workerPayloads.length}`,
                  `Workers ${Math.min(i + 100, workerPayloads.length)}/${workerPayloads.length}`))
      }

      toast?.(T(`✅ ${facilityPayloads.length} منشأة · ${workerPayloads.length} عامل`,
                `✅ ${facilityPayloads.length} facilities · ${workerPayloads.length} workers`))
    } catch (e) {
      toast?.(T('خطأ في النقل: ', 'Promote error: ') + (e.message || String(e)), 'error')
    } finally {
      setPromoting(false)
    }
  }, [sb, rows, toast, promoting])

  // Load cross-source provenance for all facilities: which operators have synced
  // each facility from which platforms (SBC, Qiwa, GOSI, Muqeem…). Keyed by
  // cr_number so it merges cleanly with sbc_facilities rows.
  const loadProvenance = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb.from('v_facility_provenance').select('*')
    if (error || !Array.isArray(data)) return
    const byCr = {}
    for (const p of data) {
      if (!p.cr_number) continue
      ;(byCr[p.cr_number] ||= []).push(p)
    }
    setProvByCr(byCr)
  }, [sb])

  // GOSI admin counts per registration_no — used by the "عدد المشرفين" filter.
  // One select pulls all rows; we group in JS so the count is exact regardless
  // of whether multiple roles are stored per admin.
  const loadAdminsCount = useCallback(async () => {
    if (!sb) return
    const { data, error } = await sb.from('gosi_establishment_admins').select('registration_no')
    if (error || !Array.isArray(data)) return
    const m = {}
    for (const r of data) {
      const reg = r?.registration_no
      if (!reg) continue
      m[String(reg)] = (m[String(reg)] || 0) + 1
    }
    setAdminsCountByReg(m)
  }, [sb])

  // Loads aggregate GOSI data for the table's GOSI view: owners,
  // contributors (with status + nationality + wage), and the establishment
  // row (for outstanding_amount). All three are bulk-fetched per call — we
  // group by registration_no in JS so each table row's GOSI cell can do an
  // O(1) lookup at render time. Idempotent: runs once when tableView flips
  // to 'gosi' for the first time.
  //
  // GOSI_AGG_SCHEMA bumps whenever the contributor/owner/est SELECT columns
  // change — when bumped, the cached data is invalidated and refetched even
  // if the in-memory state thinks it's loaded. Prevents the "you added a
  // column but old sessions still see the stale shape without it" footgun.
  const GOSI_AGG_SCHEMA = 7
  const loadGosiAggregates = useCallback(async () => {
    if (!sb || gosiAggLoading) return
    if (gosiAggLoaded === GOSI_AGG_SCHEMA) return
    setGosiAggLoading(true)
    try {
      const [own, con, est] = await Promise.all([
        // `individual` + `raw` (estOwner block) let the الملاك column show the
        // company name + unified number for corporate owners, like the SBC view.
        sb.from('gosi_establishment_owners').select('registration_no, first_name_ar, second_name_ar, third_name_ar, family_name_ar, full_name_en, national_id, nationality_ar, end_date, individual, raw'),
        sb.from('gosi_establishment_contributors').select('registration_no, first_name_ar, family_name_ar, full_name_en, status_type, contributor_type, nationality_ar, nationality_en, iqama_no, national_id, border_no, passport_no, wage_total, has_live_engagement_in_establishment'),
        sb.from('gosi_establishments').select('registration_no, outstanding_amount, account_total_debit_balance, recruitment_no, account_debit_total_contribution, account_debit_total_penalty, violations_total, main_est_reg_no, unpaid_violations'),
      ])
      const ownersMap = {}
      for (const r of own.data || []) {
        const k = String(r.registration_no)
        ;(ownersMap[k] ||= []).push(r)
      }
      const contribMap = {}
      for (const r of con.data || []) {
        const k = String(r.registration_no)
        ;(contribMap[k] ||= []).push(r)
      }
      const estMap = {}
      for (const r of est.data || []) {
        estMap[String(r.registration_no)] = r
      }
      setGosiOwnersByReg(ownersMap)
      setGosiContribByReg(contribMap)
      setGosiEstByReg(estMap)
      setGosiAggLoaded(GOSI_AGG_SCHEMA)
    } finally {
      setGosiAggLoading(false)
    }
  }, [sb, gosiAggLoaded, gosiAggLoading])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadProvenance() }, [loadProvenance, rows.length])
  useEffect(() => { loadAdminsCount() }, [loadAdminsCount, rows.length])
  useEffect(() => { if (tableView === 'gosi') loadGosiAggregates() }, [tableView, loadGosiAggregates])

  // Load GOSI establishment row by gosi_registration_number when the detail
  // opens. Populated by the GOSI bookmarklet (see gosiSyncBookmarklet.js).
  // Qiwa company lookup — match by cr_number (most reliable bridge between
  // sbc_facilities and qiwa_companies). Run separately from the GOSI lookup
  // since Qiwa data lives in a single row, not the 6-table fan-out.
  useEffect(() => {
    if (!sb || !detail?.cr_number) { setQiwaCompany(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('qiwa_companies').select('*').eq('cr_number', String(detail.cr_number)).maybeSingle()
      if (!cancelled) setQiwaCompany(data || null)
    })()
    return () => { cancelled = true }
  }, [sb, detail?.cr_number])

  // Muqeem lookup — moi_number on muqeem_companies = the SBC facility's
  // gosi_unified_national_number. Loads org row + residents + subscriptions
  // in parallel, all keyed off the same MOI number.
  useEffect(() => {
    const moi = detail?.gosi_unified_national_number
    if (!sb || !moi) { setMuqeemCompany(null); setMuqeemResidents([]); setMuqeemSubscriptions([]); return }
    let cancelled = false
    ;(async () => {
      const [orgRes, resRes, subRes] = await Promise.all([
        sb.from('muqeem_companies').select('*').eq('moi_number', String(moi)).maybeSingle(),
        sb.from('muqeem_residents').select('*').eq('sponsor_moi_number', String(moi)).order('iqama_expiry_date', { ascending: true, nullsFirst: false }),
        sb.from('muqeem_subscriptions').select('*').eq('moi_number', String(moi)).order('expiry_date', { ascending: false, nullsFirst: false }),
      ])
      if (cancelled) return
      setMuqeemCompany(orgRes.data || null)
      setMuqeemResidents(resRes.data || [])
      setMuqeemSubscriptions(subRes.data || [])
    })()
    return () => { cancelled = true }
  }, [sb, detail?.gosi_unified_national_number])

  useEffect(() => {
    if (!sb || !detail?.gosi_registration_number) {
      setGosiEstablishment(null); setGosiOwners([]); setGosiAdmins([])
      setGosiContributors([]); setGosiBills([]); setGosiCertificates([])
      return
    }
    let cancelled = false
    const reg = String(detail.gosi_registration_number)
    ;(async () => {
      // Fire all six lookups in parallel — each table is independent.
      const [est, own, adm, con, bil, cer] = await Promise.all([
        sb.from('gosi_establishments').select('*').eq('registration_no', reg).maybeSingle(),
        sb.from('gosi_establishment_owners').select('*').eq('registration_no', reg).order('start_date', { ascending: false, nullsFirst: false }),
        sb.from('gosi_establishment_admins').select('*').eq('registration_no', reg).order('full_name_en', { nullsFirst: false }),
        sb.from('gosi_establishment_contributors').select('*').eq('registration_no', reg).order('joining_date', { ascending: false, nullsFirst: false }),
        sb.from('gosi_establishment_bills').select('*').eq('registration_no', reg).order('issue_date', { ascending: false, nullsFirst: false }),
        sb.from('gosi_establishment_certificates').select('*').eq('registration_no', reg).order('cert_type'),
      ])
      if (cancelled) return
      setGosiEstablishment(est.data || null)
      setGosiOwners(own.data || [])
      setGosiAdmins(adm.data || [])
      setGosiContributors(con.data || [])
      setGosiBills(bil.data || [])
      setGosiCertificates(cer.data || [])
    })()
    return () => { cancelled = true }
  }, [sb, detail?.gosi_registration_number])

  // Load extended detail data from sbc_sync_debug whenever a facility detail
  // opens. Pulls the latest response body per (endpoint, cr) so we can show
  // the rich payloads (momrah list, gosi-file, gosi-compliance, qawaem,
  // emtethal, violations) without re-fetching from the SBC gateway. Keyed
  // by endpoint name in the returned object so the render can pluck what
  // it needs by name.
  useEffect(() => {
    if (!detail?.cr_national_number || !sb) { setExtDetail(null); return }
    let cancelled = false
    setExtDetailLoading(true)
    ;(async () => {
      const endpoints = [
        'mcV2/GetViolationsQuery',
        'mcV2/GetCaseViolationsQuery',
        'mcV2/GetEmtethalViolationsQuery',
        'Qawaem/GetQawaemStatistics',
        'gosi/establishments-main-info-by-cr-national-number',
        'gosi/establishments-file-info-by-registration-number',
        'gosi/establishment-compliance',
        'hrsd/get-establishment-statistics',
        'momrah/commercial-licenses-by-cr-number',
        'mcV2/get-print-cr-by-national-number',
        'mcV2/get-print-cr-by-national-number(en)',
        'mcV2/get-print-cr-contract-by-national-number',
      ]
      const cr = detail.cr_national_number
      // PostgREST eq filter — we issue one query per endpoint to avoid the
      // in.(...) paren-escaping headache we hit before with the (en) suffix.
      const out = {}
      await Promise.all(endpoints.map(async (ep) => {
        const { data } = await sb
          .from('sbc_sync_debug')
          .select('endpoint, response_status, response_body, request_body, created_at')
          .eq('endpoint', ep)
          .eq('request_body->>crNationalNumber', cr)
          .order('created_at', { ascending: false })
          .limit(1)
        if (Array.isArray(data) && data.length) out[ep] = data[0]
      }))
      if (!cancelled) {
        setExtDetail(out)
        setExtDetailLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [detail?.cr_national_number, sb])

  // Load MoC violations stats for the active person via sync_persons → sbc_dashboard_stats.
  useEffect(() => {
    if (!sb || !personFilter?.person_id) { setPersonStats(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb
        .from('sbc_dashboard_stats')
        .select('mc_financial_violations_count, mc_committee_violations_count, mc_violations_synced_at, sync_persons!inner(person_id)')
        .eq('sync_persons.person_id', personFilter.person_id)
        .limit(1)
      if (cancelled) return
      setPersonStats(Array.isArray(data) && data.length ? data[0] : null)
    })()
    return () => { cancelled = true }
  }, [sb, personFilter?.person_id])

  // Pick *_ar/*_en column based on language, falling back to whichever is present.
  // Also tolerates the legacy single-column JSON shape (`{descAr,descEn}`) via label().
  const pickLang = (r, base, lng) => {
    const want = (lng === 'en' ? '_en' : '_ar')
    const other = (lng === 'en' ? '_ar' : '_en')
    return r[base + want] || r[base + other] || label(r[base], lng) || null
  }
  const normalized = useMemo(() => rows.map(r => {
    const rawSrc = r.raw_cr_data ?? r.raw
    const raw = (typeof rawSrc === 'string') ? (() => { try { return JSON.parse(rawSrc) } catch { return null } })() : rawSrc
    const cr = raw?.crInformation || {}
    const partners = Array.isArray(r.partners) ? r.partners : (Array.isArray(raw?.parityList) ? raw.parityList : [])
    const managers = Array.isArray(r.managers) ? r.managers : (Array.isArray(raw?.mangmentInformation?.managerList) ? raw.mangmentInformation.managerList : [])
    return {
      ...r,
      _raw: raw,
      _form: pickLang(r, 'company_form', lang) || pickLang(r, 'entity_type', lang) || null,
      _entity: pickLang(r, 'entity_type', lang),
      _currency: currencyShort(pickLang(r, 'capital_currency', lang), lang),
      _city: pickLang(r, 'headquarter_city', lang),
      _status: pickLang(r, 'cr_status', lang),
      _issueDate: fmtDate(r.cr_issue_date_gregorian || r.cr_issue_date),
      _issueDateRaw: r.cr_issue_date_gregorian || r.cr_issue_date || null,
      _confirmDate: fmtDate(r.cr_confirm_date_gregorian || r.cr_confirm_date),
      _confirmDateRaw: r.cr_confirm_date_gregorian || r.cr_confirm_date || null,
      _parentNatNo: cr.mainCRNationalNumber || cr.mainCrNationalNumber || null,
      _partners: partners,
      _partnersCount: partners.length,
      _managers: managers,
    }
  }), [rows, lang])

  // HRSD Nitaq dropdown options — distinct values present in the data,
  // ordered best→worst by the canonical Nitaq tier ranking.
  const nitaqOptions = useMemo(() => {
    const set = new Set()
    for (const r of rows) if (r.hrsd_nitaq_name) set.add(r.hrsd_nitaq_name)
    const order = ['بلاتيني', 'أخضر مرتفع', 'أخضر متوسط', 'أخضر منخفض', 'أصفر', 'أحمر', 'اخضر صغير', 'احمر صغير']
    const rank = (s) => {
      const i = order.findIndex(k => s.includes(k))
      return i === -1 ? 999 : i
    }
    return Array.from(set).sort((a, b) => {
      const ra = rank(a), rb = rank(b)
      if (ra !== rb) return ra - rb
      return a.localeCompare(b, 'ar')
    })
  }, [rows])

  // Distinct partner/manager rosters across all (operator-scoped) rows — power
  // the owner and manager dropdown filters. Keyed by national id when present,
  // falling back to display name for entities with no id surfaced by SBC.
  const buildRoster = (key) => {
    const map = new Map()
    for (const r of normalized) {
      for (const p of (r[key] || [])) {
        const { name, id, isCompany } = extractPartyDisplay(p)
        if (!name && !id) continue
        const k = id || name
        if (!map.has(k)) map.set(k, { id: id || '', name: name || '—', isCompany: !!isCompany })
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.isCompany !== b.isCompany) return a.isCompany ? 1 : -1
      return (a.name || '').localeCompare(b.name || '', 'ar')
    })
  }
  const partnerOptions = useMemo(() => buildRoster('_partners'), [normalized])
  const managerOptions = useMemo(() => buildRoster('_managers'), [normalized])
  // Partners-count dropdown options. Capped at 3 with the final "or more"
  // bucket catching everything above that — keeps the list compact since
  // facilities with 4+ owners are rare and roll up into "ثلاثة أو أكثر".
  const partnersCountOptions = useMemo(() => {
    const arNames = ['', 'مالك واحد', 'اثنين', 'ثلاثة']
    const enNames = ['', '1 owner', '2', '3']
    const opts = []
    for (let n = 1; n <= 3; n++) {
      opts.push({ v: `eq:${n}`, l: T(arNames[n], enNames[n]) })
      opts.push({ v: `ge:${n}`, l: T(`${arNames[n]} أو أكثر`, `${enNames[n]} or more`) })
    }
    return opts
  }, [lang])
  // GOSI admins ("المشرفون") count options — mirrors partnersCountOptions but
  // sources data from gosi_establishment_admins (loaded into adminsCountByReg)
  // rather than the SBC manager list, since the user wants to filter by who
  // actually has GOSI admin access on each establishment.
  const adminsCountOptions = useMemo(() => {
    const arNames = ['', 'مشرف واحد', 'اثنين', 'ثلاثة']
    const enNames = ['', '1 admin', '2', '3']
    const opts = []
    for (let n = 1; n <= 3; n++) {
      opts.push({ v: `eq:${n}`, l: T(arNames[n], enNames[n]) })
      opts.push({ v: `ge:${n}`, l: T(`${arNames[n]} أو أكثر`, `${enNames[n]} or more`) })
    }
    // Plus an explicit zero bucket because facilities with no GOSI admin synced
    // yet are a meaningful slice to investigate.
    opts.unshift({ v: 'eq:0', l: T('بدون مشرفين', 'No admins') })
    return opts
  }, [lang])

  const statusOptions = useMemo(() => {
    const set = new Set()
    for (const r of normalized) {
      const s = String(r._status || '').trim()
      if (s) set.add(s)
    }
    // Canonical order: active → suspended → struck-off → expired → others.
    const order = ['نشط', 'معلق', 'موقوف', 'مشطوب', 'منتهي']
    const rank = (s) => {
      const i = order.findIndex(k => s.includes(k))
      return i === -1 ? 999 : i
    }
    return Array.from(set).sort((a, b) => {
      const ra = rank(a), rb = rank(b)
      if (ra !== rb) return ra - rb
      return a.localeCompare(b, 'ar')
    })
  }, [normalized])

  // Build a flat, searchable "blob" per partner/manager that covers both AR + EN names and the national id.
  const personBlob = (p) => {
    const i = p?.personInfo || {}
    return [i.firstNameAr, i.fatherNameAr, i.grandFatherNameAr, i.familyNameAr, i.firstNameEn, i.familyNameEn, i.identifierNo]
      .filter(Boolean).join(' ').toLowerCase()
  }
  const filtered = useMemo(() => {
    let out = normalized
    // Person tab filter — narrows to facilities where the active person is a partner or manager.
    if (personFilter?.id_number) {
      const pid = String(personFilter.id_number)
      out = out.filter(r => {
        const inPartners = (r._partners || []).some(p => String(p?.personInfo?.identifierNo || '') === pid)
        const inManagers = (r._managers || []).some(p => String(p?.personInfo?.identifierNo || '') === pid)
        return inPartners || inManagers
      })
    }
    if (filter === 'main') out = out.filter(r => r.is_main)
    else if (filter === 'manager') out = out.filter(r => r.is_manager)
    else if (filter === 'partner') out = out.filter(r => r.is_partner)
    else if (filter === 'confirmation') out = out.filter(r => r.is_in_confirmation_period)
    const q = search.trim().toLowerCase()
    if (q) {
      // Digits-only form of the query so a user can type a MOL number either
      // with or without the office-id/sequence dash and still match.
      const qDigits = q.replace(/\D/g, '')
      out = out.filter(r => {
        if ([r.entity_full_name_ar, r.entity_full_name_en, r.cr_number, r.cr_national_number, r.gosi_registration_number]
          .some(v => String(v || '').toLowerCase().includes(q))) return true
        if (qDigits) {
          const molCombined = (r.hrsd_labor_office_id != null && r.hrsd_sequence_number != null)
            ? `${r.hrsd_labor_office_id}${r.hrsd_sequence_number}` : ''
          if (molCombined && molCombined.includes(qDigits)) return true
          if (r.hrsd_labor_office_id != null && String(r.hrsd_labor_office_id).includes(qDigits)) return true
          if (r.hrsd_sequence_number != null && String(r.hrsd_sequence_number).includes(qDigits)) return true
        }
        return false
      })
    }
    // Advanced filter dropdowns combine with OR semantics: any row matching
    // at least one active filter group is included. Each group's own
    // multi-select is still OR internally.
    const owners = Array.isArray(adv.owner) ? adv.owner.filter(Boolean) : (adv.owner ? [adv.owner] : [])
    const managers = Array.isArray(adv.manager) ? adv.manager.filter(Boolean) : (adv.manager ? [adv.manager] : [])
    const statuses = Array.isArray(adv.status) ? adv.status.filter(Boolean) : (adv.status ? [adv.status] : [])
    const partnerCountPicks = Array.isArray(adv.partnersCount) ? adv.partnersCount.filter(Boolean) : []
    const nitaqs = Array.isArray(adv.nitaq) ? adv.nitaq.filter(Boolean) : (adv.nitaq ? [adv.nitaq] : [])
    const cityQ = adv.city.trim().toLowerCase()

    const advGroups = []
    if (owners.length) {
      advGroups.push(r => (r._partners || []).some(p => {
        const pid = String(p?.personInfo?.identifierNo || extractPartyDisplay(p).id || '')
        return owners.includes(pid)
      }))
    }
    if (managers.length) {
      advGroups.push(r => (r._managers || []).some(p => {
        const pid = String(p?.personInfo?.identifierNo || extractPartyDisplay(p).id || '')
        return managers.includes(pid)
      }))
    }
    if (cityQ) {
      advGroups.push(r => String(r._city || '').toLowerCase().includes(cityQ))
    }
    if (statuses.length) {
      const wantsActiveInConfirm = statuses.includes('__active_confirm__')
      const plainStatuses = statuses.filter(s => s !== '__active_confirm__')
      advGroups.push(r => {
        const s = String(r._status || '').trim()
        const isActive = /نشط|active/i.test(s)
        // Plain "نشط" excludes rows currently in the confirmation period —
        // those belong to the "نشط (ضمن فترة التأكيد)" sub-filter instead.
        if (plainStatuses.includes(s)) {
          if (isActive && r.is_in_confirmation_period) return false
          return true
        }
        if (wantsActiveInConfirm && isActive && r.is_in_confirmation_period) return true
        return false
      })
    }
    if (partnerCountPicks.length) {
      advGroups.push(r => {
        const c = r._partnersCount ?? 0
        return partnerCountPicks.some(p => {
          const [op, nStr] = p.split(':')
          const n = parseInt(nStr)
          if (isNaN(n)) return false
          return op === 'eq' ? c === n : op === 'ge' ? c >= n : false
        })
      })
    }
    const adminCountPicks = Array.isArray(adv.adminsCount) ? adv.adminsCount.filter(Boolean) : []
    if (adminCountPicks.length) {
      // GOSI admin count is looked up by gosi_registration_number; facilities
      // without a linked GOSI reg are treated as 0 admins (matches what the user
      // would see in the detail panel).
      advGroups.push(r => {
        const reg = r.gosi_registration_number ? String(r.gosi_registration_number) : null
        const c = (reg && adminsCountByReg[reg]) || 0
        return adminCountPicks.some(p => {
          const [op, nStr] = p.split(':')
          const n = parseInt(nStr)
          if (isNaN(n)) return false
          return op === 'eq' ? c === n : op === 'ge' ? c >= n : false
        })
      })
    }
    if (nitaqs.length) {
      advGroups.push(r => nitaqs.includes(r.hrsd_nitaq_name))
    }
    if (advGroups.length) {
      out = out.filter(r => advGroups.some(check => check(r)))
    }
    return out
  }, [normalized, search, filter, adv, personFilter, adminsCountByReg])

  // Group branches under their main parent, then produce a flat display list
  // where each branch row carries `_isBranch: true` and appears directly after
  // its main row. This gives hierarchy without a disruptive expand UI for
  // accounts with few branches.
  const displayRows = useMemo(() => {
    // When any date sort is active the branch grouping is intentionally
    // bypassed — chronological order trumps parent/branch adjacency. If both
    // confirm + issue sorts are set, confirm date is primary and issue date
    // breaks ties.
    if (adv.sortConfirm || adv.sortIssue) {
      const ts = (raw) => {
        if (!raw) return null
        const t = new Date(raw).getTime()
        return isNaN(t) ? null : t
      }
      const cmpField = (a, b, field, dir) => {
        const ta = ts(a[field]), tb = ts(b[field])
        if (ta == null && tb == null) return 0
        if (ta == null) return 1   // empties always at the bottom regardless of dir
        if (tb == null) return -1
        return ta === tb ? 0 : (ta > tb ? dir : -dir)
      }
      return [...filtered].sort((a, b) => {
        if (adv.sortConfirm) {
          const c = cmpField(a, b, '_confirmDateRaw', adv.sortConfirm === 'asc' ? 1 : -1)
          if (c !== 0) return c
        }
        if (adv.sortIssue) {
          const c = cmpField(a, b, '_issueDateRaw', adv.sortIssue === 'asc' ? 1 : -1)
          if (c !== 0) return c
        }
        return 0
      })
    }
    const branchesByParent = {}
    const mains = []
    const orphans = []
    for (const r of filtered) {
      if (r.is_main) {
        mains.push(r)
      } else if (r._parentNatNo) {
        if (!branchesByParent[r._parentNatNo]) branchesByParent[r._parentNatNo] = []
        branchesByParent[r._parentNatNo].push(r)
      } else {
        orphans.push(r)
      }
    }
    const out = []
    for (const m of mains) {
      out.push(m)
      const branches = branchesByParent[m.cr_national_number] || []
      for (const b of branches) out.push({ ...b, _isBranch: true })
    }
    // Any branches whose parent isn't in the current filter still deserve to be shown.
    const consumed = new Set()
    for (const m of mains) for (const b of (branchesByParent[m.cr_national_number] || [])) consumed.add(b.cr_national_number)
    for (const [, bs] of Object.entries(branchesByParent)) {
      for (const b of bs) if (!consumed.has(b.cr_national_number)) out.push({ ...b, _isBranch: true, _orphaned: true })
    }
    for (const o of orphans) out.push(o)
    return out
  }, [filtered, adv.sortConfirm, adv.sortIssue])

  const Tag = ({ children, color }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: color || 'rgba(255,255,255,.7)', lineHeight: 1.2 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color || 'rgba(255,255,255,.4)', flexShrink: 0 }} />
      {children}
    </span>
  )

  // Renders one chip per (source, operator) that has synced this facility.
  // Shows "{source} · {operator} · {ago}" so the user can answer "where did
  // this facility's data come from?" at a glance. Chips collapse if >3.
  const ProvenanceStrip = ({ entries }) => {
    if (!entries || entries.length === 0) {
      return (
        <span title={T('لم يتم جلب البيانات من أي مصدر بعد', 'Not yet synced from any source')}
          style={{ fontSize: 9.5, color: 'rgba(255,255,255,.3)', fontWeight: 700 }}>
          {T('بدون مصدر', 'No source')}
        </span>
      )
    }
    // Sort by most-recent first.
    const sorted = [...entries].sort((a, b) => (b.last_synced_at || '').localeCompare(a.last_synced_at || ''))
    const shown = sorted.slice(0, 3)
    const extra = sorted.length - shown.length
    return (
      <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {shown.map((p, i) => {
          const brand = SOURCE_BRAND[p.source_id] || { color: '#888', ar: p.source_id, en: p.source_id }
          const srcLabel = (lang || 'ar') !== 'en' ? brand.ar : brand.en
          const operator = (lang || 'ar') !== 'en'
            ? (p.person_name_ar || p.person_name_en || T('بدون مشغّل', 'unattributed'))
            : (p.person_name_en || p.person_name_ar || 'unattributed')
          const ago = fmtAgo(p.last_synced_at, lang)
          const dotColor = p.person_color || brand.color
          const title = `${srcLabel} · ${operator} · ${ago}`
          return (
            <span key={i} title={title}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 7px', borderRadius: 999,
                background: `${brand.color}14`,
                border: `1px solid ${brand.color}40`,
                fontSize: 9.5, fontWeight: 700,
                color: brand.color, lineHeight: 1.2, whiteSpace: 'nowrap',
              }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, boxShadow: `0 0 4px ${dotColor}99`, flexShrink: 0 }} />
              {srcLabel}
              <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600 }}>·</span>
              <span style={{ color: 'rgba(255,255,255,.8)' }}>{operator}</span>
              <span style={{ color: 'rgba(255,255,255,.45)', fontFamily: 'ui-monospace, monospace', fontSize: 9 }}>{ago}</span>
            </span>
          )
        })}
        {extra > 0 && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>+{extra}</span>
        )}
      </div>
    )
  }

  const Btn = ({ children, onClick, disabled, variant = 'primary', small, active }) => {
    const styles = {
      primary: { background: C.gold, color: '#1a1a1a' },
      ghost: { background: active ? 'rgba(212,160,23,.14)' : 'rgba(255,255,255,.04)', color: active ? C.gold : 'var(--tx)', border: '1px solid ' + (active ? 'rgba(212,160,23,.35)' : 'rgba(255,255,255,.1)') },
      danger: { background: 'rgba(192,57,43,.12)', color: C.red, border: '1px solid rgba(192,57,43,.3)' },
    }[variant]
    return (
      <button onClick={onClick} disabled={disabled} style={{
        padding: small ? '6px 12px' : '9px 16px', borderRadius: 9, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: F, fontSize: small ? 11 : 12, fontWeight: 700, opacity: disabled ? 0.5 : 1, transition: '.15s',
        ...styles,
      }}>{children}</button>
    )
  }

  const Card = ({ children, style }) => (
    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', ...style }}>{children}</div>
  )

  // When a person tab is active, the whole view (KPI + chart + table) is scoped
  // to facilities where that person appears as partner or manager.
  const scopedRows = useMemo(() => {
    if (!personFilter?.id_number) return rows
    const pid = String(personFilter.id_number)
    return rows.filter(r => {
      const partners = Array.isArray(r.partners) ? r.partners : []
      const managers = Array.isArray(r.managers) ? r.managers : []
      const inP = partners.some(p => String(p?.personInfo?.identifierNo || '') === pid)
      const inM = managers.some(p => String(p?.personInfo?.identifierNo || '') === pid)
      return inP || inM
    })
  }, [rows, personFilter])

  const counts = useMemo(() => ({
    total: scopedRows.length,
    main: scopedRows.filter(r => r.is_main).length,
    branches: scopedRows.filter(r => !r.is_main).length,
    manager: scopedRows.filter(r => r.is_manager).length,
    partner: scopedRows.filter(r => r.is_partner).length,
    confirmation: scopedRows.filter(r => r.is_in_confirmation_period).length,
    liquidation: scopedRows.filter(r => r.in_liquidation_process).length,
  }), [scopedRows])

  // GOSI-sourced establishment counts — drive the hero card when the GOSI view
  // is active. A GOSI establishment is "main" (رئيسية) when it has no parent
  // (main_est_reg_no null or equal to its own reg), otherwise it's a branch.
  const gosiCounts = useMemo(() => {
    const ests = Object.values(gosiEstByReg || {})
    let main = 0
    for (const e of ests) {
      const m = e.main_est_reg_no
      if (m == null || String(m) === String(e.registration_no)) main++
    }
    return { total: ests.length, main, branches: ests.length - main, liquidation: 0 }
  }, [gosiEstByReg])
  const heroCounts = tableView === 'gosi' ? gosiCounts : counts

  // 12-month CR registration trend — buckets `cr_issue_date` per calendar month.
  const periodSeries = useMemo(() => {
    const today = new Date()
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1)
      return { date: d, main: 0, branch: 0, total: 0 }
    })
    scopedRows.forEach(r => {
      let raw = r.cr_issue_date
      if (typeof raw === 'string' && raw.startsWith('{')) { try { raw = JSON.parse(raw) } catch {} }
      const iso = (raw && typeof raw === 'object') ? (raw.gregorianDate || raw.dateG || raw.gregorian) : raw
      if (!iso) return
      const d = new Date(String(iso).slice(0, 10))
      if (Number.isNaN(d.getTime())) return
      const months = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth())
      if (months < 0 || months >= 12) return
      const idx = 11 - months
      if (r.is_main) buckets[idx].main += 1
      else buckets[idx].branch += 1
      buckets[idx].total += 1
    })
    return buckets
  }, [scopedRows])

  // Quick count of non-empty advanced fields (for the badge on the "بحث متقدم" button).
  const advCount = Object.values(adv).filter(v => String(v || '').trim() !== '').length
  const advInp = { width: '100%', height: 42, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 500, outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', boxSizing: 'border-box' }
  const advLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7, display: 'block' }
  const resultCount = filtered.length

  // KPI row helpers (matches Invoices page StatCard aesthetic)
  const glassCard = {
    background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
    border: '1px solid rgba(255,255,255,.05)',
    borderRadius: 16,
    padding: '14px 16px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
    transition: '.2s',
  }
  const innerBox = { background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)' }

  // Build smooth area chart paths for the 12-month trend
  const n = periodSeries.length
  const W = 560, H = 88, padL = 22, padR = 12, padT = 12, padB = 12
  const cw = W - padL - padR, ch = H - padT - padB
  const mx = Math.max(1, ...periodSeries.flatMap(p => [p.main, p.branch]))
  const niceMx = Math.max(2, Math.ceil(mx / 2) * 2)
  const xAt = i => (padL + (i / Math.max(1, n - 1)) * cw).toFixed(1)
  const yAt = v => (padT + ch - (v / niceMx) * ch).toFixed(1)
  const smooth = (pts) => {
    if (pts.length < 2) return ''
    let d = 'M' + pts[0][0] + ',' + pts[0][1]
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[i]
      const [x2, y2] = pts[i + 1], [x3, y3] = pts[Math.min(pts.length - 1, i + 2)]
      const tt = .22
      const c1x = x1 + (x2 - x0) * tt, c1y = y1 + (y2 - y0) * tt
      const c2x = x2 - (x3 - x1) * tt, c2y = y2 - (y3 - y1) * tt
      d += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + x2 + ',' + y2
    }
    return d
  }
  const ptsOf = (k) => periodSeries.map((p, i) => [Number(xAt(i)), Number(yAt(p[k]))])
  const lineP = (k) => smooth(ptsOf(k))
  const areaP = (k) => {
    const p = ptsOf(k); if (p.length < 2) return ''
    return smooth(p) + ' L' + p[p.length - 1][0] + ',' + (padT + ch) + ' L' + p[0][0] + ',' + (padT + ch) + ' Z'
  }
  const yTicks = [0, niceMx / 2, niceMx]

  // Hero empty state — shown when the table truly has 0 records (no sync has
  // run yet for any operator). Single-CTA layout matching Transfer Pricing's
  // clean centered hero; replaces the noisy KPI + filter row when there's
  // nothing meaningful to show.
  const isInitiallyEmpty = !loading && rows.length === 0

  return (
    <div style={{ fontFamily: F }}>
      <style>{`.sbc-tbl-scroll::-webkit-scrollbar{display:none}`}</style>
      {!detail && (<>
      {/* Page title + description + sync anchor */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        {/* Title + description claim the full row (flex-basis 100%) so the sync
            buttons wrap onto their own row below instead of squeezing the title. */}
        <div style={{ flex: '1 1 100%', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {onBack && (
              <button onClick={onBack}
                title={T('رجوع لمركز المزامنة', 'Back to Sync Hub')}
                style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: 'var(--tx3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.15s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.4)'; e.currentTarget.style.color = '#D4A017' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'var(--tx3)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {(lang || 'ar') !== 'en' ? (<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>) : (<><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>)}
                </svg>
              </button>
            )}
            <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
              {T('المنشآت', 'Facilities')}
            </div>
            {canPerm(user, 'facilities.create') && (
            <button
              onClick={() => setShowAdd(true)}
              title={T('إضافة منشأة', 'Add Facility')}
              style={{
                height: 36, paddingInline: 14, borderRadius: 10,
                background: 'transparent',
                border: '1px solid rgba(212,160,23,.45)',
                color: '#D4A017',
                cursor: 'pointer',
                fontFamily: F, fontSize: 12.5, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 7,
                marginInlineStart: 'auto',
                boxShadow: 'none',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg, rgba(212,160,23,.22) 0%, rgba(212,160,23,.10) 100%)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <span>{T('إضافة منشأة', 'Add Facility')}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            )}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            {T('سجلّ موحّد لجميع المنشآت التابعة لك، يجمع بياناتها الأساسية وأرقامها الرسمية وحالة سجلاتها التجارية وملّاكها ومدرائها وتواريخها النظامية في مكان واحد.',
               'A unified registry of all your facilities — gathering core data, official numbers, commercial registration status, owners, managers, and regulatory dates in one place.')}
          </div>
        </div>
      </div>

      {err && <Card style={{ marginBottom: 14, borderColor: 'rgba(192,57,43,.35)', background: 'rgba(192,57,43,.06)' }}>
        <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{err}</div>
      </Card>}

      {isInitiallyEmpty && (
        <div style={{ padding: 48, textAlign: 'center', borderRadius: 16, background: 'linear-gradient(180deg,#222 0%,#1a1a1a 100%)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ fontSize: 32, color: 'var(--tx5)', marginBottom: 12, fontWeight: 700 }}>—</div>
          <div style={{ fontSize: 15, color: 'var(--tx2)', fontWeight: 600 }}>
            {T('لا توجد منشآت بعد — اضغط على "إضافة منشأة" لإضافة منشأة جديدة', 'No facilities yet — click "Add Facility" to add one')}
          </div>
        </div>
      )}

      {!isInitiallyEmpty && (<>
      {/* KPI Row — matches Facilities page (Total hero + CR status bar + Roles bar) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — Total */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column',
          justifyContent: tableView === 'gosi' ? 'center' : 'space-between',
          gap: tableView === 'gosi' ? 16 : 0,
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي المنشآت','Total Facilities')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: tableView === 'gosi' ? 52 : 42, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(heroCounts.total)}</span>
          </div>
          {tableView !== 'gosi' && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold }} /> {num(heroCounts.main)} {T('رئيسية','main')}
            </span>
            <span style={{ fontSize: 11, color: C.blue, fontWeight: 700, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} /> {num(heroCounts.branches)} {T('فرعية','branches')}
            </span>
            {heroCounts.liquidation > 0 && (
              <span style={{ fontSize: 11, color: C.red, fontWeight: 700, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} /> {num(heroCounts.liquidation)} {T('تصفية','liquidation')}
              </span>
            )}
          </div>
          )}
        </div>

        {/* CR status — donut chart, 4 states:
            نشط (annual confirm date not yet due) / في فترة التأكيد السنوي (within 90-day grace) /
            معلّق (past grace, active concern) / مشطوب (permanently removed). */}
        {tableView === 'gosi' ? (() => {
          // GOSI view — non-Saudi contributors that are active or suspended
          // (excludes inactive/ended). Computed from the loaded aggregate map.
          let active = 0, suspended = 0
          for (const reg in gosiContribByReg) {
            for (const c of gosiContribByReg[reg]) {
              if (gosiIsSaudi(c)) continue
              const st = String(c.status_type || '').toUpperCase()
              if (st === 'INACTIVE') continue
              if (st === 'ACTIVE' && c.has_live_engagement_in_establishment === true) active++
              else suspended++
            }
          }
          const total = active + suspended
          return (
            <div style={{ borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150 }}>
              <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('المشتركون الأجانب', 'Foreign contributors')}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, direction: 'ltr', flex: 1 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: C.cyan, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(total)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
                <span style={{ fontSize: 11, color: C.ok, fontWeight: 700, direction: 'rtl', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.ok }} /> {num(active)} {T('نشط', 'active')}
                </span>
                <span style={{ fontSize: 11, color: C.warn, fontWeight: 700, direction: 'rtl', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.warn }} /> {num(suspended)} {T('معلّق', 'suspended')}
                </span>
              </div>
            </div>
          )
        })() : (() => {
          const statusBuckets = { active: 0, confirm: 0, suspended: 0, cancelled: 0 }
          for (const r of scopedRows) {
            const v = String(r._status || r.cr_status_ar || r.cr_status_en || '').toLowerCase()
            const isCancelledLike = v.includes('cancel') || v.includes('ملغ') || v.includes('مشطوب') || v.includes('struck') || v.includes('removed')
            const isSuspendedLike = v.includes('suspend') || v.includes('معلق') || v.includes('موقوف') || v.includes('expired') || v.includes('منتهي')
            if (isCancelledLike) statusBuckets.cancelled += 1
            else if (isSuspendedLike) statusBuckets.suspended += 1
            else if (r.is_in_confirmation_period) statusBuckets.confirm += 1
            else statusBuckets.active += 1
          }
          const tot = Math.max(1, counts.total)
          const segs = [
            { k: 'active',    l: T('نشط','Active'),                                v: statusBuckets.active,    c: C.ok },
            { k: 'confirm',   l: T('ضمن فترة التأكيد','In annual confirm'),  v: statusBuckets.confirm,   c: C.gold },
            { k: 'suspended', l: T('معلّق','Suspended'),                           v: statusBuckets.suspended, c: C.red },
            { k: 'cancelled', l: T('مشطوب','Struck off'),                          v: statusBuckets.cancelled, c: '#ef4444' },
          ]
          // Donut geometry: continuous ring, butt caps. Each segment carries
          // a subtle radial→darker tint via per-segment SVG linearGradient.
          const R = 42
          const CIRC = 2 * Math.PI * R
          let acc = 0
          const arcs = segs.map(s => {
            const len = (s.v / tot) * CIRC
            const arc = { ...s, dash: `${len} ${CIRC - len}`, offset: -acc, len }
            acc += len
            return arc
          })
          // "Active" rate counts both fully-active and those still inside the
          // annual-confirm 90-day grace window — both still operate normally.
          const activePct = Math.round((statusBuckets.active + statusBuckets.confirm) / tot * 100)
          return (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
            }}>
              <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('حالة السجل التجاري','CR Status')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                {/* Donut */}
                <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
                  <svg width="112" height="112" viewBox="0 0 112 112" style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.4))' }}>
                    <defs>
                      <radialGradient id="cr-donut-core" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                      </radialGradient>
                      {arcs.filter(a => a.v > 0).map(a => (
                        <linearGradient key={'g-' + a.k} id={`cr-seg-${a.k}`} x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={a.c} stopOpacity="1" />
                          <stop offset="100%" stopColor={a.c} stopOpacity=".72" />
                        </linearGradient>
                      ))}
                    </defs>
                    {/* Soft inner glow behind the text */}
                    <circle cx="56" cy="56" r="34" fill="url(#cr-donut-core)" />
                    <g style={{ transform: 'rotate(-90deg)', transformOrigin: '56px 56px' }}>
                      {/* Continuous track */}
                      <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                      {/* Segments (butt caps, no gaps — clean continuous ring) */}
                      {arcs.filter(a => a.v > 0).map(a => (
                        <circle key={a.k} cx="56" cy="56" r={R} fill="none"
                          stroke={`url(#cr-seg-${a.k})`} strokeWidth="12" strokeLinecap="butt"
                          strokeDasharray={a.dash} strokeDashoffset={a.offset}
                          style={{ transition: 'stroke-dasharray .4s, stroke-dashoffset .4s' }} />
                      ))}
                      {/* Thin highlight rim — gives a soft 3D feel along the outer edge */}
                      <circle cx="56" cy="56" r={R + 6} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth="1" />
                      <circle cx="56" cy="56" r={R - 6} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1" />
                    </g>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', direction: 'ltr', color: 'var(--tx)' }}>{activePct}%</span>
                    <span style={{ fontSize: 9.5, fontWeight: 800, marginTop: 4, letterSpacing: '.2px', color: 'var(--tx2)' }}>{T('سارية','operating')}</span>
                  </div>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                  {segs.map(s => (
                    <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.4 : 1 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
                      <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.l}</span>
                      <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontWeight: 800, flexShrink: 0 }}>{num(s.v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}

        {/* MoC violations — person-scoped, no progress bar.
            Empty/clean state shows a check; danger state highlights the count in red. */}
        {tableView === 'gosi' ? (() => {
          // GOSI view — total debt with components: contributions + penalties +
          // violation fines (all amounts). Violation amount = sum of penaltyAmount
          // across each establishment's unpaid_violations list.
          let contrib = 0, penalty = 0, violations = 0, debt = 0
          for (const reg in gosiEstByReg) {
            const e = gosiEstByReg[reg]
            contrib += Number(e.account_debit_total_contribution || 0)
            penalty += Number(e.account_debit_total_penalty || 0)
            const vlist = e.unpaid_violations && e.unpaid_violations.violationSummaryDtoList
            if (Array.isArray(vlist)) for (const v of vlist) violations += Number(v.penaltyAmount || 0)
            // إجمالي المديونيات = Σ المبلغ المستحق per establishment — GOSI's
            // authoritative figure, already inclusive of contributions, penalties
            // and violations (and net of any partial payments).
            debt += Number(e.outstanding_amount || 0)
          }
          const danger = debt > 0
          const tiles = [
            { k: 'contrib', l: T('اشتراكات', 'Contributions'), v: _gosiMoney(contrib), hot: false },
            { k: 'penalty', l: T('غرامات', 'Penalties'), v: _gosiMoney(penalty), hot: penalty > 0 },
            { k: 'viol', l: T('المخالفات', 'Violations'), v: _gosiMoney(violations), hot: violations > 0 },
          ]
          return (
            <div style={{ borderRadius: 16, background: danger ? 'linear-gradient(180deg, rgba(232,114,101,.10) 0%, #222 70%)' : 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: `1px solid ${danger ? 'rgba(232,114,101,.25)' : 'rgba(255,255,255,.05)'}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي المديونيات', 'Total debt')}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: danger ? C.red : C.ok, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{_gosiMoney(debt)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, flex: 1 }}>
                {tiles.map(t => (
                  <div key={t.k} style={{ borderRadius: 12, padding: '10px 12px', background: t.hot ? 'rgba(232,114,101,.10)' : 'rgba(255,255,255,.025)', border: `1px solid ${t.hot ? 'rgba(232,114,101,.28)' : 'rgba(255,255,255,.04)'}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: t.hot ? C.red : 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1.1 }}>{t.v}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.3 }}>{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })() : (() => {
          const fin = personStats?.mc_financial_violations_count
          const com = personStats?.mc_committee_violations_count
          const finN = Number.isFinite(fin) ? fin : null
          const comN = Number.isFinite(com) ? com : null
          const total = (finN ?? 0) + (comN ?? 0)
          const hasData = finN != null || comN != null
          const danger = total > 0
          const tiles = [
            { k: 'fin', l: T('عدم إيداع القوائم','Financial statements'), v: finN },
            { k: 'com', l: T('مخالفات اللجان','Committees'),               v: comN },
          ]
          return (
            <div style={{
              borderRadius: 16,
              background: danger
                ? 'linear-gradient(180deg, rgba(232,114,101,.10) 0%, #222 70%)'
                : 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: `1px solid ${danger ? 'rgba(232,114,101,.25)' : 'rgba(255,255,255,.05)'}`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('مخالفات وزارة التجارة','MoC Violations')}</span>
                {!hasData ? (
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('— لم تتم المزامنة','— not synced')}</span>
                ) : danger ? (
                  <span style={{ fontSize: 10.5, color: C.red, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    {T('مخالفات قائمة','violations open')}
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, flex: 1 }}>
                {tiles.map(t => {
                  const v = t.v
                  const isUnsynced = v == null
                  const isHot = !isUnsynced && v > 0
                  const tileColor = isUnsynced ? 'var(--tx4)' : (isHot ? C.red : C.ok)
                  return (
                    <div key={t.k} style={{
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: isHot ? 'rgba(232,114,101,.10)' : 'rgba(255,255,255,.025)',
                      border: `1px solid ${isHot ? 'rgba(232,114,101,.28)' : 'rgba(255,255,255,.04)'}`,
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4,
                    }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: tileColor, fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>
                        {isUnsynced ? '—' : num(v)}
                      </span>
                      <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.3 }}>{t.l}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Search bar + filter toggle — matches Invoices page filter row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: advOpen ? 10 : 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={T('ابحث بالاسم، السجل، الرقم الموحد، التأمينات، الموارد…', 'Search by name, CR, unified no., GOSI, MOL…')}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        {(() => {
          const hasFilters = advCount > 0
          const clearAll = () => setAdv({ owner: [], manager: [], partnersCount: [], adminsCount: [], city: '', status: [], sortConfirm: '', sortIssue: '', nitaq: [] })
          return (
            <button type="button" onClick={() => setAdvOpen(v => !v)} style={btnFilter(advOpen || hasFilters)}>
              {T('تصفية', 'Filter')}
              {hasFilters ? (
                <span
                  role="button"
                  tabIndex={0}
                  title={T('مسح الفلاتر', 'Clear filters')}
                  onClick={e => { e.stopPropagation(); clearAll() }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
                  style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
              )}
            </button>
          )
        })()}
      </div>

      {/* Advanced search panel — matches Invoices page filter panel */}
      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <div style={advLbl}>{T('المالك / الشريك', 'Owner / Partner')}</div>
              <Sel value={adv.owner} onChange={v => setAdv(a => ({ ...a, owner: v }))}
                placeholder={`${T('الكل', 'All')} (${partnerOptions.length})`}
                maxVisible={4}
                searchable
                multiple
                searchPlaceholder={T('ابحث بالاسم أو الرقم…', 'Search by name or ID…')}
                options={(() => {
                  const persons = partnerOptions.filter(p => !p.isCompany)
                  const companies = partnerOptions.filter(p => p.isCompany)
                  const toOpt = p => ({ v: p.id || p.name, l: p.name || '—', sub: p.id || undefined })
                  const out = [{ v: '', l: `${T('الكل', 'All')} (${partnerOptions.length})` }]
                  if (persons.length) out.push(...persons.map(toOpt))
                  if (persons.length && companies.length) out.push({ divider: true, l: T('المنشآت', 'Facilities') })
                  if (companies.length) out.push(...companies.map(toOpt))
                  return out
                })()}/>
            </div>
            <div>
              <div style={advLbl}>{T('المدير / المدراء', 'Manager / Managers')}</div>
              <Sel value={adv.manager} onChange={v => setAdv(a => ({ ...a, manager: v }))}
                placeholder={`${T('الكل', 'All')} (${managerOptions.length})`}
                maxVisible={4}
                searchable
                multiple
                searchPlaceholder={T('ابحث بالاسم أو الرقم…', 'Search by name or ID…')}
                options={(() => {
                  const persons = managerOptions.filter(p => !p.isCompany)
                  const companies = managerOptions.filter(p => p.isCompany)
                  const toOpt = p => ({ v: p.id || p.name, l: p.name || '—', sub: p.id || undefined })
                  const out = [{ v: '', l: `${T('الكل', 'All')} (${managerOptions.length})` }]
                  if (persons.length) out.push(...persons.map(toOpt))
                  if (persons.length && companies.length) out.push({ divider: true, l: T('المنشآت', 'Facilities') })
                  if (companies.length) out.push(...companies.map(toOpt))
                  return out
                })()}/>
            </div>
            <div>
              <div style={advLbl}>{T('المدينة', 'City')}</div>
              <input value={adv.city} onChange={e => setAdv(a => ({ ...a, city: e.target.value }))} placeholder={T('الرياض، جدة…', 'Riyadh, Jeddah…')} style={advInp}/>
            </div>
            <div>
              <div style={advLbl}>{T('حالة السجل', 'CR Status')}</div>
              <Sel value={adv.status} onChange={v => setAdv(a => ({ ...a, status: v }))}
                placeholder={T('الكل', 'All')}
                maxVisible={4}
                multiple
                options={(() => {
                  const out = [{ v: '', l: T('الكل', 'All') }]
                  for (const s of statusOptions) {
                    out.push({ v: s, l: s })
                    // Slot the "in confirmation" sub-filter directly after the
                    // plain "نشط" entry so related options stay adjacent.
                    if (/نشط|active/i.test(s)) {
                      out.push({ v: '__active_confirm__', l: T('نشط (ضمن فترة التأكيد)', 'Active (within confirmation)') })
                    }
                  }
                  return out
                })()}/>
            </div>
            <div>
              <div style={advLbl}>{T('نطاق المنشأة', 'Nitaq')}</div>
              <Sel value={adv.nitaq} onChange={v => setAdv(a => ({ ...a, nitaq: v }))}
                placeholder={T('الكل', 'All')}
                maxVisible={4}
                multiple
                options={[
                  { v: '', l: T('الكل', 'All') },
                  ...nitaqOptions.map(n => ({ v: n, l: n })),
                ]}/>
            </div>
            <div>
              <div style={advLbl}>{T('عدد الملاك', 'Partners count')}</div>
              <Sel value={adv.partnersCount} onChange={v => setAdv(a => ({ ...a, partnersCount: v }))}
                placeholder={T('الكل', 'All')}
                maxVisible={4}
                multiple
                options={[
                  { v: '', l: T('الكل', 'All') },
                  ...partnersCountOptions,
                ]}/>
            </div>
            <div>
              <div style={advLbl}>{T('عدد المشرفين', 'Admins count')}</div>
              <Sel value={adv.adminsCount} onChange={v => setAdv(a => ({ ...a, adminsCount: v }))}
                placeholder={T('الكل', 'All')}
                maxVisible={4}
                multiple
                options={[
                  { v: '', l: T('الكل', 'All') },
                  ...adminsCountOptions,
                ]}/>
            </div>
            <div>
              <div style={advLbl}>
                {T('ترتيب حسب تاريخ التأكيد', 'Sort by confirm date')}
                {adv.sortConfirm && adv.sortIssue && <span style={{ marginInlineStart: 6, fontSize: 10, color: C.gold, fontWeight: 700 }}>{T('· رئيسي', '· primary')}</span>}
              </div>
              <Sel value={adv.sortConfirm} onChange={v => setAdv(a => ({ ...a, sortConfirm: v }))}
                placeholder={T('بدون ترتيب', 'No sort')}
                options={[
                  { v: '', l: T('بدون ترتيب', 'No sort') },
                  { v: 'asc', l: T('تصاعدي · الأقدم أولاً', 'Ascending · oldest first') },
                  { v: 'desc', l: T('تنازلي · الأحدث أولاً', 'Descending · newest first') },
                ]}/>
            </div>
            <div>
              <div style={advLbl}>
                {T('ترتيب حسب تاريخ الإصدار', 'Sort by issue date')}
                {adv.sortConfirm && adv.sortIssue && <span style={{ marginInlineStart: 6, fontSize: 10, color: C.blue, fontWeight: 700 }}>{T('· ثانوي', '· secondary')}</span>}
              </div>
              <Sel value={adv.sortIssue} onChange={v => setAdv(a => ({ ...a, sortIssue: v }))}
                placeholder={T('بدون ترتيب', 'No sort')}
                options={[
                  { v: '', l: T('بدون ترتيب', 'No sort') },
                  { v: 'asc', l: T('تصاعدي · الأقدم أولاً', 'Ascending · oldest first') },
                  { v: 'desc', l: T('تنازلي · الأحدث أولاً', 'Descending · newest first') },
                ]}/>
            </div>
          </div>
        </div>
      )}

      {/* 4-platform toggle — dropdown selector showing the active platform
          (label + brand dot) with all 4 in a menu below. PLATFORMS is the
          source of truth and counter shows row totals on the opposite end. */}
      {(() => {
        const PLATFORMS = [
          { v: 'sbc',    l: T('المركز السعودي', 'SBC'),       c: C.gold,   sub: T('سجلات تجارية', 'CR registry') },
          { v: 'gosi',   l: T('التأمينات الاجتماعية', 'GOSI'), c: C.ok,     sub: T('اشتراكات ومديونية', 'Contributors & debt') },
          { v: 'qiwa',   l: T('قوى', 'Qiwa'),                 c: C.blue,   sub: T('الموارد البشرية', 'HR & labor') },
          { v: 'muqeem', l: T('مقيم', 'Muqeem'),              c: C.purple, sub: T('الإقامات', 'Residency') },
        ]
        const counter = (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tableView === 'gosi' && gosiAggLoading && <span style={{ fontSize: 9.5, color: 'var(--tx5)' }}>{T('جاري التحميل…', 'Loading…')}</span>}
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx2)' }}>{num(displayRows.length)} {T('منشأة','facilities')}</span>
            {displayRows.length !== rows.length && <span style={{ fontSize: 9.5, color: 'var(--tx5)' }}>{T('من أصل','out of')} {num(rows.length)}</span>}
          </div>
        )
        return <_PlatformDropdown PLATFORMS={PLATFORMS} tableView={tableView} setTableView={setTableView} counter={counter} T={T} F={F} />
      })()}

      {/* Card grid — one card per facility, matches Facilities page design */}
      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>…</div>}
      {!loading && displayRows.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {T('لا توجد نتائج مطابقة للبحث.', 'No matching results.')}
        </div>
      )}

      {!loading && displayRows.length > 0 && (() => {
        const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE))
        const paged = displayRows.slice(page * PAGE, page * PAGE + PAGE)
        return (<>

        <style>{`
          .sbcv-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
          .sbcv-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12px;font-weight:700;text-align:center;padding:14px 4px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
          .sbcv-tbl thead .hd-icon{color:${C.gold};display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;vertical-align:middle}
          .sbcv-tbl thead .hd-icon svg{width:14px;height:14px;display:block}
          .sbcv-tbl tbody td{padding:10px 4px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.02)}
          .sbcv-tbl tbody tr{cursor:pointer;transition:background .12s}
          .sbcv-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
          .sbcv-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
          .sbcv-tbl tbody tr:last-child td:first-child{border-bottom-right-radius:9px}
          .sbcv-tbl tbody tr:last-child td:last-child{border-bottom-left-radius:9px}
          .sbcv-tbl tbody tr:last-child td{border-bottom:none}
          .sbcv-tbl thead tr:first-child th:first-child{border-top-right-radius:9px}
          .sbcv-tbl thead tr:first-child th:last-child{border-top-left-radius:9px}
          .sbcv-tbl .num{direction:ltr;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:700}
          .sbcv-tbl .muted{color:var(--tx5)}
          .sbcv-tbl .name-cell{overflow:hidden;padding-inline:14px}
          .sbcv-tbl .name-marquee{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:12px;font-weight:700;color:var(--tx)}
          .sbcv-tbl .name-marquee .marquee-inner{display:inline-block;will-change:transform}
          .sbcv-tbl tbody tr:hover .name-marquee{text-overflow:clip}
          .sbcv-tbl tbody tr:hover .name-marquee .marquee-inner{animation:name-bounce 9s ease-in-out infinite}
          @keyframes name-bounce{0%,12%{transform:translateX(0)}50%{transform:translateX(40%)}88%,100%{transform:translateX(0)}}
          .sbcv-tbl .pc-marquee{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-align:center}
          .sbcv-tbl .pc-marquee .pc-short{display:inline-block}
          .sbcv-tbl .pc-marquee .pc-full{display:none}
          .sbcv-tbl tbody tr:hover .pc-marquee-long .pc-short{display:none}
          .sbcv-tbl tbody tr:hover .pc-marquee-long .pc-full{display:inline-block;animation:name-bounce 9s ease-in-out infinite}
          .sbcv-pill{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;white-space:nowrap;line-height:1.5}
          .sbcv-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
        `}</style>

        {/* Facility table — SBC lens (default).
            When tableView === 'gosi' we render an alternate table below
            instead. The two are mutually exclusive so the user sees only
            the lens they picked. */}
        {tableView === 'sbc' && (
        <div style={{ borderRadius: 10 }}>
          <table className="sbcv-tbl">
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '13%' }} />
              <col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr>
                <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg></span>{T('المنشأة','Facility')}</th>
                <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg></span>{T('الكيان','Entity')}</th>
                <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg></span>{T('الأرقام','Numbers')}</th>
                <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 19l2-12 4 4 4-7 4 7 4-4 2 12z"/><line x1="3" y1="21" x2="21" y2="21"/></svg></span>{T('الملاك','Owners')}</th>
                <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>{T('المدراء','Managers')}</th>
                <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>{T('التواريخ','Dates')}</th>
                <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg></span>{T('السجل','Status')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(r => {
                const theme = statusTheme(r._status)
                const branch = !!r._isBranch
                // Sort persons before companies for consistent visual scanning.
                const partySort = (a, b) => Number(extractPartyDisplay(a).isCompany) - Number(extractPartyDisplay(b).isCompany)
                const partners = [...(r._partners || [])].sort(partySort)
                const managers = [...(r._managers || [])].sort(partySort)
                const partnerCount = partners.length
                const managerCount = managers.length
                const unifiedNo = r.cr_national_number
                const gosiNo   = r.gosi_registration_number
                const molNo    = (r.hrsd_labor_office_id != null && r.hrsd_sequence_number != null)
                  ? `${r.hrsd_labor_office_id}-${r.hrsd_sequence_number}`
                  : (r.hrsd_labor_office_id != null ? String(r.hrsd_labor_office_id) : null)
                const key = (r.cr_national_number || r.cr_number) + (branch ? '_b' : '')

                return (
                  <tr key={key} onClick={() => setDetail(r)}>
                    <td className="name-cell" title={r.entity_full_name_ar || ''}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0, width: '100%' }}>
                        <div className="name-marquee">
                          <span className="marquee-inner">{r.entity_full_name_ar || '—'}</span>
                        </div>
                        {r.entity_full_name_en && (
                          <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,.4)', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{r.entity_full_name_en}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const entity = r._entity || (lang === 'en' ? r.entity_type_en : r.entity_type_ar) || r.entity_type_ar || r.entity_type_en
                        const form = (lang === 'en' ? r.company_form_en : r.company_form_ar) || r.company_form_ar || r.company_form_en
                        const formDiffers = form && entity && form !== entity
                        const roleColor = r.is_main ? C.gold : branch ? C.blue : null
                        const roleText = r.is_main ? T('رئيسي','Main') : branch ? T('فرع','Branch') : null
                        if (!entity && !form && !roleText) return <span className="muted">—</span>
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
                            {entity && <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{entity}</span>}
                            {formDiffers && <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }} title={form}>{form}</span>}
                            {roleText && (
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: roleColor, letterSpacing: '.3px', whiteSpace: 'nowrap', marginTop: 1 }}>{roleText}</span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <NumberRow color={C.gold} label={T('الموحد','Unified')} value={unifiedNo} toast={toast} T={T} />
                        <NumberRow color={C.ok}   label={T('التأمينات','GOSI')}  value={gosiNo}    toast={toast} T={T} />
                        <NumberRow color={C.blue} label={T('مكتب العمل','MOL')}  value={molNo}     toast={toast} T={T} />
                      </div>
                    </td>
                    <td>
                      {partnerCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {partners.map((p, i) => <PersonCompact key={`p${i}`} p={p} dotColor={C.blue} />)}
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      {managerCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {managers.map((m, i) => <PersonCompact key={`m${i}`} p={m} dotColor={C.purple} />)}
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <DateRow label={T('إصدار السجل','CR issued')} value={r._issueDate} T={T} />
                        <DateRow label={T('التأكيد السنوي','Annual confirmation')} value={r._confirmDate} T={T} confirm />
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span className="sbcv-pill" style={{ background: theme.fg + '18', border: '1px solid ' + theme.fg + '38', color: theme.fg }}>
                          <span className="sbcv-dot" style={{ background: theme.fg }} />
                          {r._status || '—'}
                        </span>
                        {r.is_in_confirmation_period && (
                          <span className="sbcv-pill" style={{ background: '#facc1518', border: '1px solid #facc1538', color: '#facc15' }}>
                            <span className="sbcv-dot" style={{ background: '#facc15' }} />
                            {T('ضمن فترة التأكيد','In Confirm Period')}
                          </span>
                        )}
                        <CrCountdown confirmDate={r._confirmDate} T={T} compact />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* GOSI lens table — alternate columns sourced from
            gosi_establishment_{owners,contributors} and gosi_establishments.
            Facility name + numbers stay the same so the user keeps a stable
            entry point regardless of lens. */}
        {tableView === 'gosi' && (
        <div style={{ borderRadius: 10 }}>
          <table className="sbcv-tbl">
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>{T('المنشأة','Facility')}</th>
                <th>{T('الأرقام','Numbers')}</th>
                <th>{T('الاستقدام','Recruitment')}</th>
                <th>{T('الملاك','Owners')}</th>
                <th>{T('المديونية','Debt')}</th>
                <th>{T('نشط','Active')}</th>
                <th>{T('غير نشط','Inactive')}</th>
                <th>{T('معلق','Suspended')}</th>
                <th>{T('سعودي نشط','Saudi active')}</th>
                <th>{T('الأجانب','Foreigners')}</th>
                <th>{T('الرواتب','Wages')}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(r => {
                const branch = !!r._isBranch
                const unifiedNo = r.cr_national_number
                const gosiNo   = r.gosi_registration_number
                const molNo    = (r.hrsd_labor_office_id != null && r.hrsd_sequence_number != null)
                  ? `${r.hrsd_labor_office_id}-${r.hrsd_sequence_number}`
                  : (r.hrsd_labor_office_id != null ? String(r.hrsd_labor_office_id) : null)
                const key = (r.cr_national_number || r.cr_number) + (branch ? '_b' : '')
                const regKey = gosiNo ? String(gosiNo) : null
                const gosiOwners = (regKey && gosiOwnersByReg[regKey]) || []
                const allContrib = (regKey && gosiContribByReg[regKey]) || []
                const gosiEst = regKey ? gosiEstByReg[regKey] : null
                // Split contributors using GOSI's portal logic. The raw
                // status_type alone isn't enough: GOSI returns "ACTIVE" for
                // suspended subscriptions but flags them with
                // has_live_engagement_in_establishment === false. The portal
                // groups them under "الاشتراكات المعلقة" (Suspended). So:
                //   نشط    = status ACTIVE  AND has_live_engagement (truly active)
                //   معلق   = status ACTIVE  AND NOT has_live_engagement, OR status SUSPENDED
                //   غير نشط = status INACTIVE
                const statusOf = (c) => String(c.status_type || '').toUpperCase()
                const hasLive = (c) => c.has_live_engagement_in_establishment === true
                const isSaudi = (c) => !!c.national_id || /السعودية|saudi/i.test(String(c.nationality_ar || '') + ' ' + String(c.nationality_en || ''))
                const activeList    = allContrib.filter(c => statusOf(c) === 'ACTIVE' && hasLive(c))
                const suspendedList = allContrib.filter(c => statusOf(c) === 'SUSPENDED' || (statusOf(c) === 'ACTIVE' && !hasLive(c)))
                const inactiveList  = allContrib.filter(c => statusOf(c) === 'INACTIVE')
                const saudiActiveList = activeList.filter(isSaudi)
                const debt = gosiEst && gosiEst.outstanding_amount != null ? Number(gosiEst.outstanding_amount) : null
                return (
                  <tr key={key} onClick={() => setDetail(r)}>
                    {/* Facility name — same as SBC view */}
                    <td className="name-cell" title={r.entity_full_name_ar || ''}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0, width: '100%' }}>
                        <div className="name-marquee">
                          <span className="marquee-inner">{r.entity_full_name_ar || '—'}</span>
                        </div>
                        {r.entity_full_name_en && (
                          <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,.4)', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{r.entity_full_name_en}</span>
                        )}
                      </div>
                    </td>
                    {/* Numbers — same as SBC view */}
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <NumberRow color={C.gold} label={T('الموحد','Unified')} value={unifiedNo} toast={toast} T={T} />
                        <NumberRow color={C.ok}   label={T('التأمينات','GOSI')}  value={gosiNo}    toast={toast} T={T} />
                        <NumberRow color={C.blue} label={T('مكتب العمل','MOL')}  value={molNo}     toast={toast} T={T} />
                      </div>
                    </td>
                    {/* Recruitment number — comes from gosi_establishments.recruitment_no.
                        Stays empty when the facility has no recruitment file. */}
                    <td>
                      {gosiEst && gosiEst.recruitment_no
                        ? <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--tx)' }}>{gosiEst.recruitment_no}</span>
                        : <span className="muted">—</span>}
                    </td>
                    {/* Owners (from GOSI) — exited owners (end_date is set)
                        are filtered out entirely. The user wants the column to
                        reflect *current* ownership only; ended partners just
                        confuse the at-a-glance read. */}
                    <td>
                      {(() => {
                        const activeOwners = gosiOwners.filter(o => !o.end_date)
                        if (activeOwners.length === 0) return <span className="muted">—</span>
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 10.5 }}>
                            {activeOwners.slice(0, 3).map((o, i) => {
                              // Mirror the SBC view's PersonCompact: company owners
                              // show the establishment name in gold + the unified
                              // number below; long names reveal in full via the
                              // pc-marquee hover scroll (the .sbcv-tbl CSS handles it).
                              const estOwner = o.raw && o.raw.estOwner ? o.raw.estOwner : null
                              const isCompany = !!estOwner || o.individual === false
                              const personName = [o.first_name_ar, o.second_name_ar, o.third_name_ar, o.family_name_ar].filter(Boolean).join(' ') || o.full_name_en
                              const nm = (isCompany ? (estOwner && estOwner.name) : personName) || personName || '—'
                              const id = isCompany ? (estOwner && estOwner.partyId) : o.national_id
                              const color = isCompany ? C.gold : 'var(--tx)'
                              const words = String(nm || '').split(/\s+/).filter(Boolean)
                              const isLong = words.length > 3
                              const shortName = isLong ? words.slice(0, 3).join(' ') + '…' : nm
                              return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
                                  <div className={isLong ? 'pc-marquee pc-marquee-long' : 'pc-marquee'} title={nm} style={{ fontWeight: 700, color }}>
                                    <span className="pc-short">{shortName}</span>
                                    {isLong && <span className="pc-full">{nm}</span>}
                                  </div>
                                  {id && <span className="num" style={{ fontSize: 9.5, color: 'rgba(255,255,255,.45)', direction: 'ltr' }}>{id}</span>}
                                </div>
                              )
                            })}
                            {activeOwners.length > 3 && (
                              <span style={{ fontSize: 9.5, color: 'var(--tx5)' }}>+{activeOwners.length - 3}</span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    {/* GOSI debt (outstanding_amount) */}
                    <td>
                      {debt != null ? (
                        <span className="num" style={{
                          fontSize: 12, fontWeight: 800,
                          color: debt > 0 ? C.red : C.ok,
                        }}>{debt > 0 ? Number(debt).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'}</span>
                      ) : <span className="muted">—</span>}
                    </td>
                    {/* Active / Inactive / Suspended / Saudi-active — each cell
                        shows: count badge + first contributor's name + iqama/nid + wage */}
                    <td>{_GosiContribCell({ list: activeList, color: C.ok, idField: 'iqama_no' })}</td>
                    <td>{_GosiContribCell({ list: inactiveList, color: C.red, idField: 'iqama_no' })}</td>
                    <td>{_GosiContribCell({ list: suspendedList, color: C.warn, idField: 'iqama_no' })}</td>
                    <td>{_GosiContribCell({ list: saudiActiveList, color: C.ok, idField: 'national_id' })}</td>
                    {/* عدد الأجانب — non-Saudi contributors that are active or suspended */}
                    <td>{(() => {
                      const n = [...activeList, ...suspendedList].filter(c => !isSaudi(c)).length
                      return n > 0
                        ? <span className="num" style={{ fontSize: 13, fontWeight: 800, color: C.cyan }}>{n}</span>
                        : <span className="muted">—</span>
                    })()}</td>
                    <td>{_GosiWagesCell({ contributors: allContrib })}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* Coming-soon placeholder for the Qiwa and Muqeem lenses — these
            platforms aren't wired up yet, but rendering an empty table for
            them would look broken. Show a clear "soon" message instead. */}
        {(tableView === 'qiwa' || tableView === 'muqeem') && (
          <div style={{
            padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13,
            border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14,
          }}>
            {tableView === 'qiwa'
              ? T('عرض قوى — قريباً', 'Qiwa view — coming soon')
              : T('عرض مقيم — قريباً', 'Muqeem view — coming soon')}
          </div>
        )}

        {/* Pagination */}
        {displayRows.length > PAGE && (() => {
          const goPrev = () => setPage(p => Math.max(0, p - 1))
          const goNext = () => setPage(p => p + 1)
          const goTo = nn => setPage(Math.max(0, Math.min(totalPages - 1, nn)))
          const fromN = page * PAGE + 1
          const toN = Math.min(displayRows.length, (page + 1) * PAGE)
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 4px', borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 18 }}>
              <style>{`
                .sbc-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
                .sbc-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
                .sbc-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
                .sbc-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
                .sbc-pg-input::-webkit-outer-spin-button,.sbc-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
              `}</style>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(displayRows.length)}</span>
                <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{T('صفحة','Page')} {page + 1} {T('من','of')} {totalPages}</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <button className="sbc-pg-btn" disabled={page === 0} onClick={goPrev} aria-label={T('السابق','Prev')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
                <input className="sbc-pg-input" type="number" min={1} max={totalPages} value={page + 1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v - 1) }} />
                <button className="sbc-pg-btn" disabled={page + 1 >= totalPages} onClick={goNext} aria-label={T('التالي','Next')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              </div>
            </div>
          )
        })()}
        </>)
      })()}
      </>)}
      </>)}

      {/* Full-page detail */}
      {detail && (() => {
        const theme = statusTheme(detail._status)

        // ─── Provenance plumbing ───
        // Every field on this detail page carries a visual marker showing
        // which source brought it in and which operator account ran the sync.
        // We pull from v_facility_provenance via `provByCr` (see loadProvenance
        // up top). Per-source entries are matched on source_id; if missing we
        // synthesize a fallback so the marker still renders.
        const SOURCE_COLORS = {
          sbc: '#9b59b6', qiwa: '#3b82f6', muqeem: '#f59e0b',
          gosi: '#22c55e', chambers: '#06b6d4', ajeer: '#eab308',
          mudad: '#0ea5e9', zatca: '#7dd3fc',
        }
        const SOURCE_NAMES_AR = {
          sbc: 'المركز السعودي للأعمال', qiwa: 'قوى', muqeem: 'مقيم',
          gosi: 'التأمينات الاجتماعية', chambers: 'الغرف التجارية', ajeer: 'أجير',
          mudad: 'مدد', zatca: 'الزكاة والدخل',
        }
        const SOURCE_NAMES_EN = {
          sbc: 'Saudi Business Center', qiwa: 'Qiwa', muqeem: 'Muqeem',
          gosi: 'GOSI', chambers: 'Chambers', ajeer: 'Ajeer',
          mudad: 'Mudad', zatca: 'ZATCA',
        }
        const provEntries = provByCr[detail.cr_number] || []
        const provFor = (sourceId) => provEntries.find(e => e.source_id === sourceId) || null
        const fallbackProv = (sourceId) => ({
          source_id: sourceId,
          person_name_ar: '—',
          person_color: SOURCE_COLORS[sourceId] || '#888',
          last_synced_at: detail.last_synced_at,
        })
        const sbcProv = provFor('sbc') || fallbackProv('sbc')

        // Provenance markers were removed at user's request — kept as no-op
        // so the rest of the code can keep passing a `prov` prop without conditionals.
        const ProvMarker = () => null

        const Field = ({ k, v, prov = sbcProv, copy }) => (
          <div style={{
            position: 'relative',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 12px',
            background: 'rgba(255,255,255,.025)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,.05)',
            gap: 10,
          }}>
            {prov && <ProvMarker prov={prov} />}
            <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }}>{k}</span>
            {copy && v != null && v !== ''
              // No onToast: the global toast re-renders this card; the inline ✓ confirms.
              ? <CopyableNumber value={v} copyLabel={T('نُسخ', 'Copied')} />
              : <span style={{ fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span>}
          </div>
        )
        const SectionTitle = ({ children }) => (
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.45)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6, paddingInlineStart: 2 }}>{children}</div>
        )
        const Stat = ({ k, v, color, unit, prov = sbcProv }) => (
          <div style={{
            position: 'relative',
            padding: '10px 10px',
            background: 'rgba(255,255,255,.025)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,.05)',
            textAlign: 'center',
          }}>
            {prov && <ProvMarker prov={prov} />}
            <div style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 10, marginBottom: 4 }}>{k}</div>
            <div style={{ fontWeight: 800, color: color || 'var(--tx)', fontSize: 13, direction: 'ltr', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 3 }}>
              <span>{v != null ? v : '—'}</span>
              {unit && v != null && <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{unit}</span>}
            </div>
          </div>
        )
        const fmtNum = (n) => n != null ? Number(n).toLocaleString('en-US') : null
        const PersonRow = ({ p, roleAr, isManager }) => {
          const [expanded, setExpanded] = useState(false)
          if (!p) return null
          const info = p.personInfo
          const isCompany = !info || !!extractPartyDisplay(p).isCompany
          // For individuals we use the full Arabic name composition; for company
          // partners the saudiCompany/establishment block carries the name + CR.
          const extracted = extractPartyDisplay(p)
          const fullName = info && (info.firstNameAr || info.familyNameAr)
            ? [info.firstNameAr, info.fatherNameAr, info.grandFatherNameAr, info.familyNameAr].filter(Boolean).join(' ')
            : extracted.name
          if (!fullName || fullName === '—') return null
          const natAr = info?.nationality?.nationalityDescriptionAr
          // Best-effort DOB extraction — handles multiple shapes SBC might return.
          const dobRaw = info?.dateOfBirth || info?.birthDate || info?.dob || info?.dateOfBirthHijri || info?.dateOfBirthGregorian
            || info?.birthDateGregorian || info?.birthDateHijri || null
          const dob = dobRaw ? fmtDate(dobRaw) : null
          const idLabel = info?.identifierType?.identifierTypeDescAr || info?.identifierType?.identifierTypeDescEn
            || (isCompany ? T('رقم موحد', 'Unified no.') : T('هوية', 'ID'))
          const idValue = info?.identifierNo || extracted.id
          // hasDetails drives whether the row is expandable. Partner-specific
          // data (share counts, parity type) also counts as "details", so the
          // chevron + click handler stay enabled when only those are present.
          const hasPartnerExtras = !!(p.partnerShare?.totalContributionCount != null
            || p.partnerShare?.cashContributionCount > 0
            || p.partnerShare?.inkindContributionCount > 0
            || p.parityType?.parityTypeDescriptionAr)
          const hasDetails = !!(idValue || (natAr && !isCompany) || dob || hasPartnerExtras)
          return (
            // Single column: name-row at top (with role label inline on the
            // far end so it stays aligned with the name even after the row
            // expands), then optional metadata grid below. Previously the row
            // was a 2-column flex and the role sat in the right column, which
            // pushed it to vertical center when the metadata grew — making it
            // look like the role was on a separate line under the name.
            <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ minWidth: 0 }}>
                <div
                  onClick={hasDetails ? () => setExpanded(v => !v) : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: hasDetails ? 'pointer' : 'default', userSelect: 'none' }}>
                  <span title={isCompany ? T('شركة / منشأة', 'Company / Entity') : T('شخص', 'Person')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: isCompany ? 'rgba(212,160,23,.15)' : 'rgba(255,255,255,.08)', color: isCompany ? C.gold : 'var(--tx)', flexShrink: 0 }}>
                    {isCompany ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
                    )}
                  </span>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isCompany ? C.gold : 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{fullName}</div>
                  {hasDetails && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: isCompany ? C.gold : 'var(--tx)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                  {/* Role label moved inline on the end of the name row — flex
                      spacer pushes it to the far end so it stays glued next to
                      the name regardless of expanded state. */}
                  {roleAr && (
                    <>
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: C.gold, whiteSpace: 'nowrap', flexShrink: 0 }}>{roleAr}</span>
                    </>
                  )}
                </div>
                {expanded && (hasDetails || p.partnerShare || p.parityType) && (() => {
                  // Build structured metadata pairs (label + value) mirroring
                  // the GOSI _GosiContribRow group layout. Partner shares stay
                  // gold to keep the headline ownership info visible. Using a
                  // 2-col grid + key/value alignment removes the bus-stop "·"
                  // chain that was hard to scan.
                  // Field order is tuned for the RTL 2-col grid (fills right→left):
                  // pushing نوع الشريك before رقم موحد, and نقدية before إجمالي الحصص,
                  // places نوع الشريك + نقدية in the right column.
                  const items = []
                  if (p.parityType?.parityTypeDescriptionAr) {
                    items.push({ k: T('نوع الشريك', 'Partner type'), v: p.parityType.parityTypeDescriptionAr })
                  }
                  // Managers show الجنسية قبل الهوية; elsewhere الهوية أولاً.
                  const idItem = idValue ? { k: idLabel, v: idValue, mono: true, copy: true } : null
                  const natItem = (natAr && !isCompany) ? { k: T('الجنسية', 'Nationality'), v: natAr } : null
                  if (isManager) {
                    if (natItem) items.push(natItem)
                    if (idItem) items.push(idItem)
                  } else {
                    if (idItem) items.push(idItem)
                    if (natItem) items.push(natItem)
                  }
                  if (dob) items.push({ k: T('مواليد', 'DOB'), v: dob, mono: true })
                  if (p.partnerShare?.cashContributionCount != null && Number(p.partnerShare.cashContributionCount) > 0) {
                    items.push({ k: T('نقدية', 'Cash'), v: fmtNum(p.partnerShare.cashContributionCount), mono: true })
                  }
                  if (p.partnerShare?.totalContributionCount != null) {
                    items.push({ k: T('إجمالي الحصص', 'Total shares'), v: fmtNum(p.partnerShare.totalContributionCount), color: C.gold, mono: true })
                  }
                  if (p.partnerShare?.inkindContributionCount != null && Number(p.partnerShare.inkindContributionCount) > 0) {
                    items.push({ k: T('عينية', 'In-kind'), v: fmtNum(p.partnerShare.inkindContributionCount), mono: true })
                  }
                  if (isCompany && extracted.id && extracted.id !== idValue) {
                    items.push({ k: T('سجل', 'CR'), v: extracted.id, mono: true })
                  }
                  if (!items.length) return null
                  return (
                    <div style={{
                      marginTop: 10, paddingTop: 10,
                      borderTop: '1px dashed rgba(255,255,255,.07)',
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      columnGap: 24, rowGap: 10,
                    }}>
                      {items.map((m, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'baseline', gap: 10, fontSize: 11, minWidth: 0,
                        }}>
                          <span style={{ color: 'rgba(255,255,255,.45)', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.k}</span>
                          {m.copy ? (
                            // No onToast here on purpose: the global toast lives on
                            // DashPage, so firing it re-renders SbcFacilities and
                            // remounts this (render-defined) PersonRow, collapsing the
                            // expanded row. The inline ✓ already confirms the copy.
                            <CopyableNumber value={m.v} copyLabel={T('نُسخ', 'Copied')} />
                          ) : (
                            <span style={{
                              color: m.color || 'var(--tx)', fontWeight: 700,
                              fontFamily: m.mono ? 'ui-monospace, monospace' : undefined,
                              direction: m.mono ? 'ltr' : undefined,
                              fontVariantNumeric: 'tabular-nums',
                              textAlign: 'end', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{m.v}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          )
        }
        const activities = detail.activities?.activityList || detail._raw?.crActivities?.activityList || []
        const managers = detail.managers || detail._raw?.mangmentInformation?.managerList || []
        const partners = detail.partners || detail._raw?.parityList || []
        const mgmtStructureAr = detail.management_structure?.managementStructureDescriptionAr
          || detail._raw?.mangmentInformation?.managementStructure?.managementStructureDescriptionAr || null
        const companyCharAr = Array.isArray(detail.company_character)
          ? detail.company_character.map(c => c.companyCharacterDescriptionAr).filter(Boolean).join(' · ')
          : null
        // Merge live (fresh fetch) with cached (from last bulk sync).
        // Live wins when available; otherwise fall back to the denormalized columns.
        const gosiLiveFirst = liveGosi?.establishmentList?.[0] || null
        const gosi = {
          regNo: gosiLiveFirst?.registrationNumber ?? detail.gosi_registration_number,
          name: gosiLiveFirst?.establishmentNameArb ?? detail.gosi_establishment_name,
          total: liveGosi?.numberOfContributors != null ? Number(liveGosi.numberOfContributors) : detail.gosi_number_of_contributors,
          saudi: liveGosi?.numberOfSaudiContributors != null ? Number(liveGosi.numberOfSaudiContributors) : detail.gosi_number_of_saudi_contributors,
          nonSaudi: liveGosi?.numberOfNonSaudiContributors != null ? Number(liveGosi.numberOfNonSaudiContributors) : detail.gosi_number_of_non_saudi_contributors,
          contribution: liveGosi?.totalContribution != null ? Number(liveGosi.totalContribution) : detail.gosi_total_contribution,
          debit: liveGosi?.totalDebit != null ? Number(liveGosi.totalDebit) : detail.gosi_total_debit,
          penalties: liveGosi?.totalPenalties != null ? Number(liveGosi.totalPenalties) : detail.gosi_total_penalties,
        }
        // HRSD raw payload, in priority order: live fetch (needs an SBC
        // session, usually absent) → the raw response captured by the sync
        // bookmarklet (stored in sbc_sync_debug, loaded into extDetail) →
        // the denormalized hrsd_* columns. The bulk-sync RPC only persists
        // the labor-office id/sequence into hrsd_* columns; the laborer
        // counts, nitaq, and office name live only in this raw payload, so
        // without the extDetail fallback the card is empty whenever there's
        // no live session.
        const _hrsdRaw = liveHrsd || ((extDetail || {})['hrsd/get-establishment-statistics']?.response_body) || null
        const hrsd = {
          officeId: _hrsdRaw?.establishmentFileNumber?.laborOfficeIdField ?? detail.hrsd_labor_office_id,
          sequenceNumber: _hrsdRaw?.establishmentFileNumber?.sequenceNumberField ?? detail.hrsd_sequence_number,
          officeName: _hrsdRaw?.laboerOfficeName ?? detail.hrsd_labor_office_name,
          nitaqCode: _hrsdRaw?.nitaq?.code ?? detail.hrsd_nitaq_code,
          nitaqName: _hrsdRaw?.nitaq?.nameLocal ?? detail.hrsd_nitaq_name,
          activityName: _hrsdRaw?.nitaqatEconomicActivity?.nameLocal ?? detail.hrsd_nitaqat_activity_name,
          saudiLaborers: _hrsdRaw?.saudiLaborers ?? detail.hrsd_saudi_laborers,
          foreignLaborers: _hrsdRaw?.foreignLaborers ?? detail.hrsd_foreign_laborers,
          totalLaborers: _hrsdRaw?.totalLaborers ?? detail.hrsd_total_laborers,
          issuedPermits: _hrsdRaw?.totalIssuedWorkPermits ?? detail.hrsd_total_issued_permits,
          expiredPermits: _hrsdRaw?.totalExpiredWorkPermits ?? detail.hrsd_total_expired_permits,
          expiringPermits: _hrsdRaw?.totalAboutToExpireWorkPermits ?? detail.hrsd_total_expiring_permits,
          saudiPercentage: _hrsdRaw?.entity_Saudi_Percentage ?? detail.hrsd_saudi_percentage,
        }
        // Always show both sections now (per user request to always fetch). Loading/error states handle UX.
        const hasGosi = true
        const hasHrsd = true
        const prov = provByCr[detail.cr_number] || []
        // SBC data is only present when we have the actual SBC raw payload —
        // facilities created from a GOSI-only sync have detail rows (name,
        // CR no., etc. populated from CR registration) but no SBC payload.
        // Without this gate the SBC-labeled cards would render filled with
        // data the user never synced from SBC.
        const hasSbcData = !!(detail?.raw_cr_data || detail?._raw) || prov.some(p => p.source_id === 'sbc')
        return (
        <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
          {/* Top bar — Back + sync trigger (mirrors FacilityDetailPage top bar) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
            <BackButton onBack={() => setDetail(null)} label={T('رجوع','Back')} />
          </div>

          {/* Hero header — facility name + main/partner tag only */}
          <div style={{ marginBottom: 18, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M3 21h18"/>
                <path d="M5 21V7l8-4v18"/>
                <path d="M19 21V11l-6-4"/>
                <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
              </svg>
              {detail.is_partner && !detail.is_manager && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: C.blue + '18', border: '1px solid ' + C.blue + '38', color: C.blue, fontSize: 10.5, fontWeight: 700 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} />
                  {T('شريك','Partner')}
                </span>
              )}
              {detail.in_liquidation_process && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: C.red + '18', border: '1px solid ' + C.red + '38', color: C.red, fontSize: 10.5, fontWeight: 700 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} />
                  {T('تصفية','Liquidation')}
                </span>
              )}
              <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.2px' }}>{detail.entity_full_name_ar || T('منشأة','Facility')}</div>
            </div>
            {/* Data-source chips moved into the "مصادر البيانات" card in the
                right sidebar to free up the facility header. */}
          </div>

          {/* 2-column layout — main content + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
            {/* Main column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Identifiers card — CR/national numbers + all government authority registrations
                  consolidated into a single panel so the user sees every "official number" in one place.
                  Compact inline layout (label left + value right) to stay within original card height.
                  Gated on hasSbcData: this card is sourced from SBC's CR registration
                  payload; without SBC sync, the row data would be a misleading mix
                  of empty/partial values from other syncs. */}
              {hasSbcData && (() => {
                // MoL/labor file number "office-sequence" (e.g. 18-4044360). Prefer the
                // synced columns; fall back to the live HRSD/GOSI-file responses so the
                // chip still appears for facilities mapped from staging (where the
                // hrsd_* columns aren't populated yet).
                const _gf = (extDetail || {})['gosi/establishments-file-info-by-registration-number']?.response_body
                const _hr = (extDetail || {})['hrsd/get-establishment-statistics']?.response_body
                const molFileNo =
                  (detail.hrsd_labor_office_id != null && detail.hrsd_sequence_number != null)
                    ? `${detail.hrsd_labor_office_id}-${detail.hrsd_sequence_number}`
                    : (_hr?.unifiedNumber?.laborOfficeIdField != null && _hr?.unifiedNumber?.sequenceNumberField != null)
                      ? `${_hr.unifiedNumber.laborOfficeIdField}-${_hr.unifiedNumber.sequenceNumberField}`
                      : (_gf?.molofficeID != null && _gf?.molEstID != null)
                        ? `${_gf.molofficeID}-${_gf.molEstID}`
                        : (detail.hrsd_labor_office_id != null ? String(detail.hrsd_labor_office_id) : null)
                const authorities = [
                  { ar: 'الزكاة والضريبة', en: 'ZATCA',                    fullAr: 'هيئة الزكاة والضريبة والجمارك',              color: '#0f766e', n: detail.zakat_tax_number },
                  { ar: 'التأمينات الاجتماعية', en: 'GOSI',                  fullAr: 'المؤسسة العامة للتأمينات الاجتماعية',          color: '#22c55e', n: detail.gosi_registration_number },
                  { ar: 'العنوان الوطني',  en: 'SPL',                      fullAr: 'اشتراك العنوان الوطني للسجل التجاري',         color: '#06b6d4', n: detail.spl_national_address_id },
                  { ar: 'الغرف التجارية',  en: 'Chamber of Commerce',      fullAr: 'اتحاد الغرف التجارية السعودية',               color: '#0ea5e9', n: detail.coc_chamber_number },
                  { ar: 'المقاولين',       en: 'Contractors Authority',    fullAr: 'الهيئة السعودية للمقاولين',                   color: '#f59e0b', n: detail.sca_contractor_number },
                  { ar: 'الموارد البشرية', en: 'HRSD / Qiwa',              fullAr: 'وزارة الموارد البشرية والتنمية الاجتماعية',    color: '#16a085', n: molFileNo },
                  { ar: 'وزارة العدل',     en: 'MOJ Contract',             fullAr: 'وزارة العدل · رقم العقد',                     color: '#8b5cf6', n: detail.moj_contract_number },
                  { ar: 'وزارة التجارة',   en: 'MC Contract Auth.',        fullAr: 'وزارة التجارة · رقم توثيق العقد',              color: '#D4A017', n: detail.mc_contract_number },
                ].filter(row => row.n)

                const rowBase = {
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8, gap: 10, minWidth: 0,
                  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)',
                }
                const rowGold = { ...rowBase, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.22)' }
                const lbl = { color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }

                return (
                  <div style={cardChrome}>
                    <div style={cardHeader}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                      <SbcSourceIcon />
                      <span style={cardTitle}>{T('المنشأة','Facility')}</span>
                    </div>
                    <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {detail.entity_full_name_ar && (
                        <div style={{ ...rowBase, gridColumn: '1 / -1' }}>
                          <span style={lbl}>{T('اسم المنشأة بالعربي', 'Facility name (AR)')}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detail.entity_full_name_ar}>{detail.entity_full_name_ar}</span>
                        </div>
                      )}
                      {detail.entity_full_name_en && (
                        <div style={{ ...rowBase, gridColumn: '1 / -1' }}>
                          <span style={lbl}>{T('اسم المنشأة بالإنجليزي', 'Facility name (EN)')}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', direction: 'ltr', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detail.entity_full_name_en}>{detail.entity_full_name_en}</span>
                        </div>
                      )}
                      {/* Name language — moved here from the Classification card
                          per user request. Belongs with the name fields above. */}
                      {detail.entity_name_lang_ar && (
                        <div style={{ ...rowBase, gridColumn: '1 / -1' }}>
                          <span style={lbl}>{T('لغة اسم المنشأة', 'Name Language')}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={detail.entity_name_lang_ar}>{detail.entity_name_lang_ar}</span>
                        </div>
                      )}
                      <div style={rowGold}>
                        <span style={{ ...lbl, color: C.gold }}>{T('الرقم الموحد', 'Unified No.')}</span>
                        <CopyableNumber value={detail.cr_national_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                      </div>
                      {authorities.map((row, i) => (
                        <div key={i} style={rowGold} title={T(row.fullAr, row.en)}>
                          <span style={{ ...lbl, color: C.gold, overflow: 'hidden', textOverflow: 'ellipsis' }}>{T(row.ar, row.en)}</span>
                          <CopyableNumber value={row.n} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                        </div>
                      ))}
                      {/* السجل التجاري آخر حقل بناءً على طلب المستخدم */}
                      <div style={rowGold}>
                        <span style={{ ...lbl, color: C.gold }}>{T('السجل التجاري', 'CR Number')}</span>
                        <CopyableNumber value={detail.cr_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Partners */}
              {partners.length > 0 && (
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
                    <SbcSourceIcon />
                    <span style={cardTitle}>{T('الملاك والشركاء', 'Partners')}</span>
                    <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.blue, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.blue + '14' }}>{num(partners.length)}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[...partners]
                      // الأشخاص أولاً ثم المنشآت (إن وُجدت منشأة كشريك). نفس منطق
                      // تصنيف PersonRow: غياب personInfo أو isCompany = منشأة.
                      .sort((a, b) => {
                        const ca = (!a.personInfo || !!extractPartyDisplay(a).isCompany) ? 1 : 0
                        const cb = (!b.personInfo || !!extractPartyDisplay(b).isCompany) ? 1 : 0
                        return ca - cb
                      })
                      .map((p, i) => {
                        const types = Array.isArray(p.partnershipTypeList) ? p.partnershipTypeList.map(t => t.partnershipTypeDescriptionAr).filter(Boolean).join(' · ') : null
                        return <PersonRow key={i} p={p} roleAr={types} />
                      })}
                  </div>
                </div>
              )}

              {/* Managers */}
              {managers.length > 0 && (
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} />
                    <SbcSourceIcon />
                    <span style={cardTitle}>{T('المدراء', 'Managers')}</span>
                    <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.purple, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: C.purple + '14' }}>{num(managers.length)}</span>
                  </div>
                  <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {managers.map((m, i) => <PersonRow key={i} p={m} roleAr={T('مدير', 'Manager')} isManager />)}
                  </div>
                </div>
              )}

              {/* Classification card — merged with the "Full CR Data" fields
                   so all non-duplicate CR attributes live in one place. The
                   pair Gregorian/Hijri date row appears at the bottom.
                   Gated on hasSbcData: every field here comes from the SBC
                   CR payload. */}
              {hasSbcData && (() => {
                const yesNo = (b) => b ? T('نعم', 'Yes') : T('لا', 'No')
                // API returns Hijri dates as DD-MM-YYYY; user prefers YYYY-MM-DD
                // (same order as Gregorian ISO dates shown elsewhere on the page).
                const reverseHijri = (s) => {
                  if (!s || typeof s !== 'string') return s
                  const parts = s.split('-')
                  return parts.length === 3 ? parts.reverse().join('-') : s
                }
                return (
                  <div style={cardChrome}>
                    <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><SbcSourceIcon /><span style={cardTitle}>{T('السجل التجاري','Commercial Register')}</span></div>
                    <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {/* Each Field is now conditional — null/empty/undefined
                          values are hidden entirely per user request. Boolean
                          fields render only when the underlying flag is non-null
                          (so explicit "لا" still shows; missing data doesn't). */}
                      {detail._entity && <Field k={T('النوع', 'Entity')} v={detail._entity} />}
                      {detail._form && <Field k={T('الشكل', 'Form')} v={detail._form} />}
                      {companyCharAr && <Field k={T('صفات الشركة', 'Company character')} v={companyCharAr} />}
                      {detail._city && <Field k={T('المدينة', 'City')} v={detail._city} />}
                      {detail.capital != null && <Field k={T('رأس المال', 'Capital')} v={Number(detail.capital).toLocaleString('en-US')} />}
                      {detail.company_duration != null && detail.company_duration !== 0 && detail.company_duration !== '' && <Field k={T('مدة الشركة', 'Company Duration')} v={detail.company_duration} />}
                      {/* Yes/no flags grouped into one full-width split row —
                          three compact cells separated by vertical dividers. */}
                      {(() => {
                        const flags = [
                          detail.is_license_based != null ? { k: T('قائم على ترخيص', 'License-based'), v: detail.is_license_based } : null,
                          detail.has_ecommerce != null ? { k: T('تجارة إلكترونية', 'E-commerce'), v: detail.has_ecommerce } : null,
                          detail.in_liquidation_process != null ? { k: T('تحت التصفية', 'In Liquidation'), v: detail.in_liquidation_process } : null,
                        ].filter(Boolean)
                        if (flags.length === 0) return null
                        const lblS = { color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }
                        const valS = { fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                        return (
                          <div style={{ gridColumn: '1 / -1', position: 'relative', padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'stretch', gap: 0 }}>
                            {flags.map((f, i) => (
                              <React.Fragment key={f.k}>
                                {i > 0 && <div style={{ width: 1, background: 'rgba(255,255,255,.05)' }} />}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingInlineStart: i === 0 ? 0 : 14, paddingInlineEnd: i === flags.length - 1 ? 0 : 14 }}>
                                  <span style={lblS}>{f.k}</span>
                                  <span style={valS}>{yesNo(f.v)}</span>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        )
                      })()}
                      {detail.company_contract_from_date && <Field k={T('تاريخ عقد التأسيس', 'Contract Date')} v={detail.company_contract_from_date} />}
                      {detail.last_cr_suspension_date && <Field k={T('تاريخ آخر تعليق', 'Last Suspension')} v={detail.last_cr_suspension_date} />}
                      {detail.last_cr_reactivation_date && <Field k={T('تاريخ آخر تفعيل', 'Last Reactivation')} v={detail.last_cr_reactivation_date} />}
                      {detail.delete_date && <Field k={T('تاريخ الشطب', 'Strike-off')} v={detail.delete_date} />}
                      {/* Combined issue/confirm dates — one full-width row split
                          into two columns by a vertical divider. Each column
                          shows the gregorian date prominently on top and the
                          matching hijri date dimmed underneath. */}
                      <div style={{ gridColumn: '1 / -1', position: 'relative', padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'stretch', gap: 0 }}>
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingInlineEnd: 14 }}>
                          <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }}>{T('تاريخ الإصدار', 'Issue date')}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail._issueDate || '—'}</span>
                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,.45)', direction: 'ltr', fontSize: 10, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reverseHijri(detail.cr_issue_date_hijri) || '—'}</span>
                          </div>
                        </div>
                        <div style={{ width: 1, background: 'rgba(255,255,255,.05)' }} />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingInlineStart: 14 }}>
                          <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }}>{T('تاريخ التأكيد', 'Confirm date')}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, minWidth: 0 }}>
                            <span style={{ fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail._confirmDate || '—'}</span>
                            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,.45)', direction: 'ltr', fontSize: 10, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reverseHijri(detail.cr_confirm_date_hijri) || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Contact info — collapsible card, sits right under the
                  Commercial Register. Uses CollapsibleCard so it matches the
                  ActivitiesCard / WPS chevron pattern. */}
              {(() => {
                const contact = (detail.raw_cr_data || detail._raw || {}).contactInformation || {}
                if (!contact.phoneNo && !contact.mobileNo && !contact.email && !contact.websiteURL) return null
                const rowBase = {
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8, gap: 10, minWidth: 0,
                  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)',
                }
                const lbl = { color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }
                const val = { fontSize: 12, fontWeight: 700, color: 'var(--tx)', textAlign: 'end', direction: 'ltr', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                const Row = ({ k, v, fullWidth }) => {
                  const [copied, setCopied] = useState(false)
                  const has = v != null && v !== ''
                  // Local checkmark feedback only — no global toast (it lives on
                  // DashPage and would re-render this card on every copy).
                  const copy = async (e) => {
                    e.stopPropagation()
                    if (!has) return
                    try { await navigator.clipboard.writeText(String(v)); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard unavailable */ }
                  }
                  return (
                    <div style={{ ...rowBase, ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
                      <span style={lbl}>{k}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', minWidth: 0 }}>
                        <span style={val} title={typeof v === 'string' ? v : undefined}>{has ? v : '—'}</span>
                        {has && (
                          <button type="button" onClick={copy} title={T('نُسخ', 'Copy')}
                            style={{ width: 20, height: 20, padding: 0, border: 'none', background: 'transparent', color: copied ? C.gold : 'rgba(255,255,255,.35)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0, transition: 'color .15s' }}
                            onMouseEnter={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.75)' }}
                            onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.35)' }}>
                            {copied ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            )}
                          </button>
                        )}
                      </span>
                    </div>
                  )
                }
                return (
                  <CollapsibleCard title={T('معلومات الاتصال', 'Contact Information')} color="#5dade2" showSbcIcon>
                    <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <Row k={T('الهاتف', 'Phone')} v={contact.phoneNo} />
                      <Row k={T('الجوال', 'Mobile')} v={saMobile(contact.mobileNo)} />
                      <Row k={T('البريد الإلكتروني', 'Email')} v={contact.email} />
                      <Row k={T('الموقع', 'Website')} v={contact.websiteURL} />
                    </div>
                  </CollapsibleCard>
                )
              })()}

              {/* GOSI — social insurance */}
              {hasGosi && (
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} />
                    <SbcSourceIcon />
                    <span style={cardTitle}>{T('المؤسسة العامة للتأمينات الإجتماعية', 'General Organization for Social Insurance')}</span>
                    {gosiState === 'loading' && <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: 'var(--tx5)' }}>{T('جارٍ الجلب…','loading…')}</span>}
                  </div>
                  <div style={{ padding: '14px 22px' }}>
                    {gosi.name && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 8 }}>
                        <Field k={T('اسم المؤسسة في التأمينات', 'GOSI name')} v={gosi.name} />
                      </div>
                    )}
                    {(() => {
                      const groupBox = {
                        display: 'flex', background: 'rgba(255,255,255,.024)',
                        borderRadius: 8, border: '1px solid rgba(255,255,255,.05)',
                        overflow: 'hidden', marginBottom: 8,
                      }
                      const primaryCell = {
                        flex: 1.1, padding: '10px 14px', textAlign: 'center',
                        borderInlineEnd: '1px solid rgba(255,255,255,.05)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
                      }
                      const breakdownCol = {
                        flex: 1, display: 'flex', flexDirection: 'column',
                      }
                      const breakdownRow = (isLast) => ({
                        flex: 1, padding: '6px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.05)',
                      })
                      const primaryLbl = { fontSize: 10.5, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.3px' }
                      const primaryVal = (color) => ({ fontSize: 22, fontWeight: 800, color: color || 'var(--tx)', direction: 'ltr', lineHeight: 1 })
                      const subLbl = { fontSize: 10.5, color: 'rgba(255,255,255,.55)', fontWeight: 600 }
                      const subVal = (color) => ({ fontSize: 13, fontWeight: 800, color: color || 'var(--tx)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' })

                      const renderGroup = (primary, children, marginBottom) => (
                        <div style={{ ...groupBox, marginBottom }}>
                          <div style={primaryCell}>
                            <div style={primaryLbl}>{primary.k}</div>
                            <div style={primaryVal(primary.color)}>{primary.v}</div>
                          </div>
                          <div style={breakdownCol}>
                            {children.map((c, i) => (
                              <div key={i} style={breakdownRow(i === children.length - 1)}>
                                <span style={subLbl}>{c.k}</span>
                                <span style={subVal(c.color)}>{c.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )

                      return (
                        <>
                          {renderGroup(
                            { k: T('عدد المشتركين', 'Contributors'), v: fmtNum(gosi.total), color: null },
                            [
                              { k: T('سعوديين', 'Saudi'),       v: fmtNum(gosi.saudi),    color: '#22c55e' },
                              { k: T('غير سعوديين', 'Non-Saudi'), v: fmtNum(gosi.nonSaudi), color: C.purple },
                            ],
                            8,
                          )}
                          {renderGroup(
                            { k: T('المديونية', 'Total debt'), v: fmtNum(gosi.debit), color: '#ef4444' },
                            [
                              { k: T('مبالغ الاشتراكات', 'Contributions'), v: fmtNum(gosi.contribution), color: null },
                              { k: T('الغرامات', 'Penalties'),             v: fmtNum(gosi.penalties),    color: '#f59e0b' },
                            ],
                            0,
                          )}
                        </>
                      )
                    })()}
                    {gosiState === 'error' && gosi.total == null && !gosi.regNo && (
                      <div style={{ marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,.45)', textAlign: 'center' }}>
                        {sbcSessionErr === 'NO_SESSION' ? T('لا توجد جلسة SBC — شغّل المزامنة أولاً', 'No SBC session — run sync first')
                          : sbcSessionErr === 'EXPIRED' ? T('انتهت جلسة SBC — أعد المزامنة', 'SBC session expired — sync again')
                          : T('تعذّر جلب بيانات التأمينات', 'Could not fetch GOSI data')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* HRSD / Qiwa — labor office */}
              {hasHrsd && (
                <div style={cardChrome}>
                  <div style={cardHeader}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} />
                    <SbcSourceIcon />
                    <span style={cardTitle}>{T('وزارة الموارد البشرية والتنمية الإجتماعية', 'Ministry of Human Resources and Social Development')}</span>
                    {hrsdState === 'loading' && <span style={{ marginInlineStart: 'auto', fontSize: 10.5, color: 'var(--tx5)' }}>{T('جارٍ الجلب…','loading…')}</span>}
                  </div>
                  <div style={{ padding: '14px 22px' }}>
                    {(() => {
                      const nitaqColor = (name) => {
                        if (!name) return null
                        const n = name.toString()
                        if (n.includes('بلاتيني')) return '#cbd5e1'
                        if (n.includes('أحمر') || n.includes('احمر')) return '#ef4444'
                        if (n.includes('أصفر') || n.includes('اصفر')) return '#eab308'
                        if (n.includes('أخضر') || n.includes('اخضر')) {
                          if (n.includes('مرتفع')) return '#22c55e'
                          if (n.includes('متوسط')) return '#16a085'
                          if (n.includes('منخفض') || n.includes('صغير')) return '#84cc16'
                          return '#22c55e'
                        }
                        return null
                      }
                      const fieldChrome = {
                        position: 'relative', padding: '9px 12px',
                        background: 'rgba(255,255,255,.025)', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,.05)',
                      }
                      const lbl = { color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }
                      const val = { fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                      const nColor = nitaqColor(hrsd.nitaqName)
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <Field k={T('فرع مكتب العمل', 'Labor office')} v={hrsd.officeName} />
                          <div style={{ ...fieldChrome, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <span style={lbl}>{T('نطاق المنشأة', 'Nitaq')}</span>
                              <span style={{ ...val, color: nColor || 'var(--tx)' }} title={hrsd.nitaqName || ''}>{hrsd.nitaqName || '—'}</span>
                            </div>
                            {hrsd.activityName && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 6 }}>
                                <span style={lbl}>{T('النشاط', 'Activity')}</span>
                                <span style={val} title={hrsd.activityName}>{hrsd.activityName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                    {/* MoL / HRSD identifiers — show only when at least one
                        value differs from the consolidated «الموارد البشرية»
                        field already shown on the Facility card above. The
                        facility card shows `${labor_office_id}-${sequence}`,
                        so if every individual ID here is just a piece of that
                        same value, the whole row is hidden. */}
                    {(() => {
                      const gosiFile = (extDetail || {})['gosi/establishments-file-info-by-registration-number']?.response_body || null
                      const hrsdR = (extDetail || {})['hrsd/get-establishment-statistics']?.response_body || null
                      const molUnified = hrsdR?.unifiedNumber
                        ? `${hrsdR.unifiedNumber.laborOfficeIdField}-${hrsdR.unifiedNumber.sequenceNumberField}`
                        : null
                      // Nothing at all to show
                      if (!molUnified && gosiFile?.molofficeID == null && gosiFile?.moluniID == null && gosiFile?.molEstID == null) return null
                      // Compare each value to its facility-card counterpart.
                      // If they all match (or are unset), the row is redundant.
                      const facilityCombined = (detail.hrsd_labor_office_id != null && detail.hrsd_sequence_number != null)
                        ? `${detail.hrsd_labor_office_id}-${detail.hrsd_sequence_number}` : null
                      const eqOrAbsent = (a, b) => a == null || String(a) === String(b)
                      const allMatchFacility = (
                        eqOrAbsent(molUnified, facilityCombined) &&
                        eqOrAbsent(gosiFile?.molofficeID, detail.hrsd_labor_office_id) &&
                        eqOrAbsent(gosiFile?.moluniID, detail.hrsd_sequence_number) &&
                        eqOrAbsent(gosiFile?.molEstID, detail.hrsd_sequence_number)
                      )
                      if (allMatchFacility) return null
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <Field k={T('الرقم الموحد (وزارة العمل)', 'MoL Unified No.')} v={molUnified} copy />
                          <Field k={T('رقم الملف (مكتب العمل)', 'MoL Office / Est. ID')} copy
                            v={(gosiFile?.molofficeID != null && gosiFile?.molEstID != null)
                                 ? `${gosiFile.molofficeID}-${gosiFile.molEstID}`
                                 : (gosiFile?.molEstID ?? gosiFile?.molofficeID ?? null)} />
                        </div>
                      )
                    })()}
                    {(() => {
                      const groupBox = {
                        display: 'flex', background: 'rgba(255,255,255,.024)',
                        borderRadius: 8, border: '1px solid rgba(255,255,255,.05)',
                        overflow: 'hidden', marginBottom: 8,
                      }
                      const primaryCell = {
                        flex: 1.1, padding: '10px 14px', textAlign: 'center',
                        borderInlineEnd: '1px solid rgba(255,255,255,.05)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
                      }
                      const breakdownCol = { flex: 1, display: 'flex', flexDirection: 'column' }
                      const breakdownRow = (isLast) => ({
                        flex: 1, padding: '6px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.05)',
                      })
                      const primaryLbl = { fontSize: 10.5, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.3px' }
                      const primaryVal = { fontSize: 22, fontWeight: 800, color: 'var(--tx)', direction: 'ltr', lineHeight: 1 }
                      const subLbl = { fontSize: 10.5, color: 'rgba(255,255,255,.55)', fontWeight: 600 }
                      const subVal = (color) => ({ fontSize: 13, fontWeight: 800, color: color || 'var(--tx)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' })
                      const children = [
                        { k: T('سعوديين', 'Saudi'),       v: fmtNum(hrsd.saudiLaborers),  color: '#22c55e' },
                        { k: T('غير سعوديين', 'Non-Saudi'), v: fmtNum(hrsd.foreignLaborers), color: C.purple },
                        { k: T('نسبة السعودة', 'Saudization'), v: hrsd.saudiPercentage != null ? `${Number(hrsd.saudiPercentage).toFixed(1)}%` : '—', color: Number(hrsd.saudiPercentage) > 0 ? '#22c55e' : 'rgba(255,255,255,.7)' },
                      ]
                      return (
                        <div style={groupBox}>
                          <div style={primaryCell}>
                            <div style={primaryLbl}>{T('إجمالي العمال', 'Total workers')}</div>
                            <div style={primaryVal}>{fmtNum(hrsd.totalLaborers)}</div>
                          </div>
                          <div style={breakdownCol}>
                            {children.map((c, i) => (
                              <div key={i} style={breakdownRow(i === children.length - 1)}>
                                <span style={subLbl}>{c.k}</span>
                                <span style={subVal(c.color)}>{c.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    {(() => {
                      const groupBox = {
                        display: 'flex', background: 'rgba(255,255,255,.024)',
                        borderRadius: 8, border: '1px solid rgba(255,255,255,.05)',
                        overflow: 'hidden',
                      }
                      const primaryCell = {
                        flex: 1.1, padding: '10px 14px', textAlign: 'center',
                        borderInlineEnd: '1px solid rgba(255,255,255,.05)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
                      }
                      const breakdownCol = { flex: 1, display: 'flex', flexDirection: 'column' }
                      const breakdownRow = (isLast) => ({
                        flex: 1, padding: '6px 12px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,.05)',
                      })
                      const primaryLbl = { fontSize: 10.5, color: 'rgba(255,255,255,.5)', fontWeight: 700, letterSpacing: '.3px' }
                      const primaryVal = { fontSize: 22, fontWeight: 800, color: 'var(--tx)', direction: 'ltr', lineHeight: 1 }
                      const subLbl = { fontSize: 10.5, color: 'rgba(255,255,255,.55)', fontWeight: 600 }
                      const subVal = (color) => ({ fontSize: 13, fontWeight: 800, color: color || 'var(--tx)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' })
                      const children = [
                        { k: T('رخص تنتهي قريباً', 'Expiring soon'), v: fmtNum(hrsd.expiringPermits), color: '#f59e0b' },
                        { k: T('رخص منتهية', 'Expired'),             v: fmtNum(hrsd.expiredPermits),  color: '#ef4444' },
                      ]
                      return (
                        <div style={groupBox}>
                          <div style={primaryCell}>
                            <div style={primaryLbl}>{T('رخص عمل مصدرة', 'Issued permits')}</div>
                            <div style={primaryVal}>{fmtNum(hrsd.issuedPermits)}</div>
                          </div>
                          <div style={breakdownCol}>
                            {children.map((c, i) => (
                              <div key={i} style={breakdownRow(i === children.length - 1)}>
                                <span style={subLbl}>{c.k}</span>
                                <span style={subVal(c.color)}>{c.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    {hrsdState === 'error' && !extDetailLoading && hrsd.totalLaborers == null && !hrsd.officeName && (
                      <div style={{ marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,.45)', textAlign: 'center' }}>
                        {sbcSessionErr === 'NO_SESSION' ? T('لا توجد جلسة SBC — شغّل المزامنة أولاً', 'No SBC session — run sync first')
                          : sbcSessionErr === 'EXPIRED' ? T('انتهت جلسة SBC — أعد المزامنة', 'SBC session expired — sync again')
                          : T('تعذّر جلب بيانات مكتب العمل', 'Could not fetch labor office data')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activities */}
              <ActivitiesCard activities={activities} lang={lang} T={T} />

              {/* ─── New cards — built in the same shape as the Facility card
                   above (cardChrome + cardHeader + rowBase/rowGold pill rows).
                   Anything visually marked «مكرر» means the same field already
                   exists in another panel on this page; the tooltip names it. */}
              {(() => {
                const ext = extDetail || {}
                const raw = detail.raw_cr_data || detail._raw || {}
                const contact = raw.contactInformation || {}

                const gosiFile = ext['gosi/establishments-file-info-by-registration-number']?.response_body || null
                const gosiComp = ext['gosi/establishment-compliance']?.response_body || null
                const hrsdRaw = ext['hrsd/get-establishment-statistics']?.response_body || null
                const momrahData = ext['momrah/commercial-licenses-by-cr-number']?.response_body || null
                const momrahList = momrahData?.data?.result?.list || []
                const emtethal = ext['mcV2/GetEmtethalViolationsQuery']?.response_body || null
                const qawaem = ext['Qawaem/GetQawaemStatistics']?.response_body || null
                const violations = ext['mcV2/GetViolationsQuery']?.response_body || null
                const caseViolations = ext['mcV2/GetCaseViolationsQuery']?.response_body || null
                const printAr = ext['mcV2/get-print-cr-by-national-number']?.response_body || null
                const printEn = ext['mcV2/get-print-cr-by-national-number(en)']?.response_body || null
                const printContract = ext['mcV2/get-print-cr-contract-by-national-number']?.response_body || null

                const STORAGE_BASE = `https://gcvshzutdslmdkwqwteh.supabase.co/storage/v1/object/public/documents/sbc-cr-certificates/${detail.cr_national_number}`

                // Match existing facility-card styles exactly
                const rowBase = {
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8, gap: 10, minWidth: 0,
                  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)',
                }
                const rowGold = { ...rowBase, background: 'rgba(212,160,23,.06)', border: '1px solid rgba(212,160,23,.22)' }
                const lbl = { color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }
                const val = { fontSize: 12, fontWeight: 700, color: 'var(--tx)', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                const valLtr = { ...val, direction: 'ltr' }

                // Small pill that flags a field as "already visible in another
                // card on this page". Hover shows where.
                const DupBadge = ({ where }) => (
                  <span title={`مكرر · ${where}`} style={{
                    fontSize: 9, padding: '1px 5px', borderRadius: 4,
                    background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.35)',
                    color: '#D4A017', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>{T('مكرر', 'DUP')}</span>
                )

                const Row = ({ k, v, dup, gold, fullWidth, ltr }) => (
                  <div style={{ ...(gold ? rowGold : rowBase), ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
                    <span style={{ ...lbl, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {dup && <DupBadge where={dup} />}
                      {k}
                    </span>
                    <span style={ltr ? valLtr : val} title={typeof v === 'string' ? v : undefined}>{v != null && v !== '' ? v : '—'}</span>
                  </div>
                )

                const yesNo = (b) => b ? T('نعم', 'Yes') : T('لا', 'No')
                const numS = (n) => n != null ? num(Number(n)) : null

                return (
                  <>
                    {/* GOSI Details and HRSD Details cards were removed — all
                        their fields were either duplicates of the existing
                        GOSI/HRSD cards above or have been migrated into them
                        (MoL IDs now live inside the existing HRSD card). */}

                    {/* Qiwa cards moved — they now render after the GOSI sub-cards
                        block below to keep the visual order SBC → GOSI → Qiwa. */}

                    {/* WPS Compliance — collapsible (starts closed). */}
                    {gosiComp && (
                      <CollapsibleCard title={T('التزام حماية الأجور (WPS)', 'WPS Compliance')} color="#0ea5e9" showSbcIcon>
                        <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <Row k={T('نسبة الالتزام بحماية الأجور', 'WPS Compliance %')} v={gosiComp.wpsCompliancePercentage != null ? `${gosiComp.wpsCompliancePercentage}%` : null} ltr />
                          <Row k={T('حالة الالتزام', 'WPS Status')} v={gosiComp.wpsComplianceStatus} />
                          <Row k={T('عمال تم صرف أجورهم', 'Paid Workers')} v={numS(gosiComp.numberOfPaidLaborers)} ltr />
                          <Row k={T('عمال لم تُصرف أجورهم', 'Unpaid Workers')} v={numS(gosiComp.numberOfUnPaidLaborers)} ltr />
                          <Row k={T('نسبة العقود الموثقة', 'Contract Auth %')} v={gosiComp.caCompliancePercentage != null ? `${gosiComp.caCompliancePercentage}%` : null} ltr />
                          <Row k={T('عقود موثقة', 'Authenticated')} v={numS(gosiComp.numberOfAUthenicated)} ltr />
                          <Row k={T('عقود غير موثقة', 'Unauthenticated')} v={numS(gosiComp.numberOfUNAUthenicated)} ltr />
                          <Row k={T('فترة الالتزام', 'Period')} v={gosiComp.compliancePeriod} />
                        </div>
                      </CollapsibleCard>
                    )}

                    {/* MoC Violations — collapsible */}
                    <CollapsibleCard title={T('مخالفات وزارة التجارة', 'MoC Violations')} color="#ef4444" showSbcIcon>
                      <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        <Row k={T('عدم إيداع القوائم', 'Financial Filing')} v={violations?.totalViolationCount != null ? num(violations.totalViolationCount) : null} ltr />
                        <Row k={T('مخالفات اللجان', 'Committee')} v={caseViolations?.totalViolationCount != null ? num(caseViolations.totalViolationCount) : null} ltr />
                        <Row k={T('الامتثال', 'Emtethal')} v={emtethal?.totalViolationCount != null ? num(emtethal.totalViolationCount) : (emtethal?.error ? T('غير متاح', 'N/A') : null)} ltr />
                      </div>
                    </CollapsibleCard>

                    {/* Filed financial statements (Qawaem) — collapsible */}
                    {qawaem?.qawaemList && qawaem.qawaemList.length > 0 && (
                      <CollapsibleCard title={T('القوائم المالية المُودَعة', 'Filed Statements')} color="#a78bfa" badge={num(qawaem.total)} showSbcIcon>
                        <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {/* Sort by year ascending — API returns newest-first
                              but we display oldest → newest per user request. */}
                          {[...qawaem.qawaemList].sort((a, b) => (a.year || 0) - (b.year || 0)).map(y => (
                            <Row key={y.year} k={`${T('سنة', 'Year')} ${y.year}`} v={y.count} ltr />
                          ))}
                        </div>
                      </CollapsibleCard>
                    )}

                    {/* رخص البلدية (Momrah) */}
                    {momrahList.length > 0 && (
                      <CollapsibleCard title={T('رخص البلدية', 'Municipal Licenses')} color="#f97316" badge={num(momrahList.length)} showSbcIcon>
                        <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {momrahList.map((lic, i) => (
                            <div key={lic.licenseId || i} style={{ ...rowBase, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{lic.shopName}</div>
                                  <div style={{ fontSize: 10.5, color: 'var(--tx5)', marginTop: 2 }}>{lic.amanaName} · {lic.baladiaName}</div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: lic.licenseStatus === 'سارية' ? 'rgba(34,197,94,.15)' : 'rgba(234,179,8,.15)', color: lic.licenseStatus === 'سارية' ? '#22c55e' : '#eab308', whiteSpace: 'nowrap' }}>{lic.licenseStatus}</span>
                              </div>
                              {(() => {
                                // City — derived from baladiaName by stripping
                                // the "بلدية " / "محافظة " prefixes (e.g.
                                // "بلدية محافظة الخبر" → "الخبر"). The raw
                                // baladiaName is already shown in the subtitle
                                // above, so here we surface just the city name.
                                const city = (lic.baladiaName || '').replace(/^بلدية\s+/, '').replace(/^محافظة\s+/, '').trim() || null
                                const cell = { display: 'flex', justifyContent: 'space-between', color: 'var(--tx5)' }
                                const val = { color: 'var(--tx2)' }
                                return (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6, columnGap: 24, fontSize: 10.5 }}>
                                    <div style={cell}><span>{T('رقم الرخصة', 'License ID')}</span><span style={{ ...val, direction: 'ltr', fontWeight: 700 }}>{lic.licenseId}</span></div>
                                    <div style={cell}><span>{T('الحي', 'District')}</span><span style={val}>{lic.districtName}</span></div>
                                    {city && <div style={cell}><span>{T('المدينة', 'City')}</span><span style={val}>{city}</span></div>}
                                    <div style={cell}><span>{T('انتهاء (هجري)', 'End H.')}</span><span style={{ ...val, direction: 'ltr' }}>{lic.licenseEndDateH}</span></div>
                                    <div style={cell}><span>{T('انتهاء (ميلادي)', 'End G.')}</span><span style={{ ...val, direction: 'ltr' }}>{lic.licenseEndDateM}</span></div>
                                    <div style={cell}><span>{T('متبقي', 'Days Left')}</span><span style={{ ...val, direction: 'ltr' }}>{lic.expirationLeftPeriod}</span></div>
                                    {/* Activity name is long — give it the full
                                        row so it doesn't truncate weirdly. */}
                                    <div style={{ ...cell, gridColumn: '1 / -1' }}><span>{T('النشاط', 'Activity')}</span><span style={val}>{lic.mainDetailActivity}</span></div>
                                  </div>
                                )
                              })()}
                              {/* Prefer the Supabase Storage copy of the
                                  license PDF (uploaded during data sync) over
                                  the upstream momra.gov.sa link — so the app
                                  stays self-contained. Fall back to the live
                                  URL only when we haven't captured the file yet. */}
                              {lic.licenseId && (
                                <a
                                  href={`https://gcvshzutdslmdkwqwteh.supabase.co/storage/v1/object/public/documents/sbc-municipal-licenses/${encodeURIComponent(lic.licenseId)}.pdf`}
                                  target="_blank" rel="noopener noreferrer"
                                  style={{ alignSelf: 'flex-start', fontSize: 11, color: C.gold, textDecoration: 'none', fontWeight: 700 }}>
                                  ⇲ {T('طباعة الرخصة', 'Print License')}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </CollapsibleCard>
                    )}

                    {/* ملفات السجل (PDF) — with inline thumbnail previews.
                        Each available PDF renders inside a sandboxed <iframe>
                        zoomed-to-fit; clicking the preview (or its label) opens
                        the file full-screen in a new tab. Unavailable variants
                        get a dim placeholder so the layout stays balanced. */}
                    <CollapsibleCard title={T('ملفات السجل (PDF)', 'CR Documents (PDF)')} color="#9b59b6" showSbcIcon>
                      {/* Min card width 280px — Chrome's PDF viewer needs
                          enough room to apply FitH cleanly; below ~220px it
                          falls back to native zoom and shows scrollbars
                          inside an otherwise-empty thumbnail. */}
                      <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {[
                          { lang: 'ar', label: T('السجل التجاري — عربي', 'CR — Arabic'), available: !!printAr?.downloadUrl },
                          { lang: 'en', label: T('السجل التجاري — إنجليزي', 'CR — English'), available: !!printEn?.downloadUrl },
                          { lang: 'contract', label: T('عقد التأسيس', 'Founding Contract'), available: !!printContract?.downloadUrl && detail.entity_type_ar === 'شركة' },
                        ].map(({ lang: lng, label, available }) => {
                          const href = `${STORAGE_BASE}-${lng}.pdf`
                          if (!available) {
                            return (
                              <div key={lng} style={{ borderRadius: 10, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ aspectRatio: '3 / 2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx5)', background: 'rgba(0,0,0,.18)' }}>
                                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                </div>
                                <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--tx5)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,.04)' }}>
                                  {label}
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div key={lng}
                              style={{ borderRadius: 10, background: 'rgba(155,89,182,.08)', border: '1px solid rgba(155,89,182,.32)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: '.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(155,89,182,.6)' }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(155,89,182,.32)' }}>
                              {/* PDF preview thumbnail. Wrapper aspect is set
                                  slightly wider (3:2) than the SBC certificate's
                                  natural A4 landscape (≈1.41:1) — combined with
                                  iframe height 200% and overflow:hidden, this
                                  guarantees the page renders at full width from
                                  the top of the iframe and the bottom gets
                                  clipped (no empty strip) at every viewport. */}
                              <div style={{ position: 'relative', aspectRatio: '3 / 2', background: '#fff', overflow: 'hidden' }}>
                                <iframe
                                  src={`${href}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                                  title={label}
                                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '200%', border: 0, display: 'block' }}
                                  loading="lazy"
                                  scrolling="no"
                                />
                              </div>
                              <a href={href} target="_blank" rel="noopener noreferrer"
                                title={T('فتح في تاب جديد', 'Open in new tab')}
                                style={{ padding: '8px 10px', fontSize: 11, fontWeight: 800, color: '#bb8fce', textAlign: 'center', borderTop: '1px solid rgba(155,89,182,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', cursor: 'pointer', transition: 'background .15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(155,89,182,.18)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                </svg>
                                {label}
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    </CollapsibleCard>

                    {/* Thin white separator between SBC cards and the GOSI
                        establishment card below — visual cue that the source
                        changes. */}
                    {gosiEstablishment && gosiEstablishment.raw_main && (
                      <>
                        <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '8px 0' }} />
                        <GosiEstablishmentCard data={gosiEstablishment} T={T} lang={lang} />
                        <GosiAccountCard data={gosiEstablishment} bills={gosiBills} contributors={gosiContributors} T={T} lang={lang} />
                        <GosiContributorsCard contributors={gosiContributors.filter(gosiIsSaudi)} title={T('المشتركون السعوديون', 'Saudi contributors')} est={gosiEstablishment} T={T} lang={lang} />
                        <GosiContributorsCard contributors={gosiContributors.filter(c => !gosiIsSaudi(c))} title={T('المشتركون غير السعوديين', 'Non-Saudi contributors')} est={gosiEstablishment} T={T} lang={lang} />
                        <GosiOwnersCard owners={gosiOwners} T={T} lang={lang} />
                        <GosiAdminsCard admins={gosiAdmins} T={T} lang={lang} />
                        <GosiCertificatesCard certificates={gosiCertificates} T={T} />
                      </>
                    )}

                    {/* ── Qiwa cards (populated by qiwaSyncBookmarklet.js).
                        Only render when qiwa_companies has a row matching
                        this facility's cr_number. Split into 4 logical cards
                        so each can collapse independently. */}
                    {qiwaCompany && (() => {
                      const q = qiwaCompany
                      const qRow = ({ k, v, mono, ltr }) => (v == null || v === '' ? null : (
                        <Row k={k} v={v} mono={mono} ltr={ltr} />
                      ))
                      const pct = (n) => n != null ? `${Number(n).toFixed(n % 1 ? 1 : 0)}%` : null
                      return (
                        <>
                          {/* النطاقات والسعودة — open by default since these are
                              the headline numbers most operators look at first. */}
                          <CollapsibleCard
                            title={T('النطاقات والسعودة', 'Nitaqat & Saudization')}
                            color="#3b82f6" showQiwaIcon defaultExpanded
                            badge={q.nitaqat_color_ar || q.color_name}>
                            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {qRow({ k: T('النطاق', 'Nitaq band'), v: q.nitaqat_color_ar || q.color_name })}
                              {qRow({ k: T('النطاق التالي', 'Next band'), v: q.nitaqat_next_color_ar })}
                              {qRow({ k: T('حجم المنشأة', 'Entity size'), v: q.nitaqat_entity_size_name || q.size_name })}
                              {qRow({ k: T('نشاط النطاق', 'Nitaq activity'), v: q.nitaqat_activity_name || q.nitaq_economic_activity_name })}
                              {qRow({ k: T('طريقة الاحتساب', 'Calc method'), v: q.nitaqat_calculation_method })}
                              {qRow({ k: T('نسبة السعودة', 'Saudization %'), v: pct(q.entity_saudi_percentage || q.indicator_saudization_rate), ltr: true })}
                              {qRow({ k: T('إجمالي العمالة', 'Total workforce'), v: fmtNum(q.nitaq_total_laborers), ltr: true })}
                              {qRow({ k: T('عمالة سعودية', 'Saudi workers'), v: fmtNum(q.nitaq_saudis), ltr: true })}
                              {qRow({ k: T('عمالة غير سعودية', 'Foreign workers'), v: fmtNum(q.nitaq_foreigners), ltr: true })}
                              {qRow({ k: T('سعوديون مرجّحون', 'Factorized Saudi'), v: fmtNum(q.nitaqat_factorized_saudis), ltr: true })}
                              {qRow({ k: T('غير سعوديين مرجّحون', 'Factorized non-Saudi'), v: fmtNum(q.nitaqat_factorized_expats), ltr: true })}
                              {qRow({ k: T('سعوديون مطلوب توظيفهم', 'Saudis to hire'), v: fmtNum(q.nitaqat_saudis_to_be_hired), ltr: true })}
                              {q.nitaqat_is_grace_period && qRow({ k: T('فترة سماح', 'Grace period'), v: `${q.nitaqat_grace_start || '—'} → ${q.nitaqat_grace_end || '—'}` })}
                            </div>
                          </CollapsibleCard>

                          {/* مؤشرات الالتزام + رخص العمل + المخالفات + القضايا */}
                          <CollapsibleCard
                            title={T('الالتزام ورخص العمل', 'Compliance & Work Permits')}
                            color="#3b82f6" showQiwaIcon>
                            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {qRow({ k: T('الالتزام العام', 'Overall compliance'), v: pct(q.score_compliance || q.indicator_compliance_score), ltr: true })}
                              {qRow({ k: T('درجة النطاقات', 'Nitaqat score'), v: pct(q.score_nitaqat), ltr: true })}
                              {qRow({ k: T('درجة رخص العمل', 'Work permits score'), v: pct(q.score_work_permits), ltr: true })}
                              {qRow({ k: T('درجة موقع العامل', 'Laborer location score'), v: pct(q.score_laborer_location), ltr: true })}
                              {qRow({ k: T('درجة توثيق العقود', 'Contract auth score'), v: pct(q.score_contract_authentication), ltr: true })}
                              {qRow({ k: T('درجة ملاحظات WPS', 'WPS notes score'), v: pct(q.score_notes_in_wps), ltr: true })}
                              {qRow({ k: T('رخص العمل — الإجمالي', 'Work permits total'), v: fmtNum(q.work_permits_total), ltr: true })}
                              {qRow({ k: T('سارية', 'Valid'), v: fmtNum(q.work_permits_valid), ltr: true })}
                              {qRow({ k: T('منتهية', 'Expired'), v: fmtNum(q.work_permits_expired), ltr: true })}
                              {qRow({ k: T('بدون رخصة (>90 يوم)', 'No WP >90d'), v: fmtNum(q.wp_no_wp_over_90), ltr: true })}
                              {qRow({ k: T('بدون رخصة (<90 يوم)', 'No WP <90d'), v: fmtNum(q.wp_no_wp_under_90), ltr: true })}
                              {qRow({ k: T('دفعات معلّقة', 'Pending payments'), v: fmtNum(q.wp_establishment_pending), ltr: true })}
                              {qRow({ k: T('المخالفات — مفتوحة', 'Violations open'), v: fmtNum(q.violations_open), ltr: true })}
                              {qRow({ k: T('غير مدفوعة', 'Not paid'), v: fmtNum(q.violations_not_paid), ltr: true })}
                              {qRow({ k: T('قيد الاعتراض', 'Under objection'), v: fmtNum(q.violations_objection), ltr: true })}
                              {qRow({ k: T('ملغاة', 'Cancelled'), v: fmtNum(q.violations_cancelled), ltr: true })}
                              {qRow({ k: T('قضايا المنشأة', 'Establishment cases'), v: fmtNum(q.cases_total), ltr: true })}
                              {qRow({ k: T('قضايا الموظفين', 'Employee cases'), v: fmtNum(q.employee_cases_total), ltr: true })}
                              {qRow({ k: T('إقامات منتهية', 'Expired iqamas'), v: fmtNum(q.employee_cases_expired_iqamas), ltr: true })}
                              {qRow({ k: T('عقود غير موثقة', 'Unauth. contracts'), v: fmtNum(q.employee_cases_unauth_contracts), ltr: true })}
                              {qRow({ k: T('مهن غير صحيحة', 'Wrong occupations'), v: fmtNum(q.employee_cases_incorrect_occupations), ltr: true })}
                            </div>
                          </CollapsibleCard>

                          {/* WPS + توثيق العقود (Qiwa-side) */}
                          {(q.wps_cert_number || q.wps_compliance_rate != null || q.contract_auth_percentage != null) && (
                            <CollapsibleCard
                              title={T('حماية الأجور وتوثيق العقود', 'WPS & Contract Authentication')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('رقم شهادة WPS', 'WPS certificate no.'), v: q.wps_cert_number, mono: true })}
                                {qRow({ k: T('حالة الشهادة', 'Certificate status'), v: q.wps_cert_status })}
                                {qRow({ k: T('تاريخ الإصدار', 'Issue date'), v: q.wps_cert_issue_date, ltr: true })}
                                {qRow({ k: T('تاريخ الانتهاء', 'Expiry date'), v: q.wps_cert_expiry_date, ltr: true })}
                                {qRow({ k: T('مؤهلة للشهادة', 'Eligible'), v: q.wps_cert_eligible == null ? null : (q.wps_cert_eligible ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('نسبة الالتزام الموحدة', 'Unified compliance rate'), v: pct(q.wps_compliance_rate), ltr: true })}
                                {qRow({ k: T('نسبة العقود الموثقة', 'Contract auth %'), v: pct(q.contract_auth_percentage), ltr: true })}
                                {qRow({ k: T('عقود موثقة', 'Authenticated contracts'), v: fmtNum(q.contracts_authenticated), ltr: true })}
                                {qRow({ k: T('عقود غير موثقة', 'Unauthenticated contracts'), v: fmtNum(q.contracts_unauthenticated), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* التأشيرات — أرصدة + حالات + أهلية + أبشر */}
                          {(q.visa_approved != null || q.visa_work_quota != null || q.visa_balances_raw || q.absher_balance != null) && (
                            <CollapsibleCard
                              title={T('التأشيرات', 'Visas')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('تأشيرات عمل — المسموح', 'Work — quota'), v: fmtNum(q.visa_work_quota), ltr: true })}
                                {qRow({ k: T('تأشيرات عمل — متبقية', 'Work — remaining'), v: fmtNum(q.visa_work_unused), ltr: true })}
                                {qRow({ k: T('تأشيرات زيارة — المسموح', 'Visit — quota'), v: fmtNum(q.visa_visit_quota), ltr: true })}
                                {qRow({ k: T('تأشيرات زيارة — متبقية', 'Visit — remaining'), v: fmtNum(q.visa_visit_unused), ltr: true })}
                                {qRow({ k: T('انتهاء باقة الزيارة', 'Visit pkg expiry'), v: q.visa_visit_pkg_expiry, ltr: true })}
                                {qRow({ k: T('تأشيرات موسمية — المسموح', 'Seasonal — quota'), v: fmtNum(q.visa_seasonal_quota), ltr: true })}
                                {qRow({ k: T('تأشيرات موسمية — متبقية', 'Seasonal — remaining'), v: fmtNum(q.visa_seasonal_unused), ltr: true })}
                                {qRow({ k: T('رصيد تأشيرات التوسّع', 'Expansion balance'), v: fmtNum(q.visa_expansion_balance), ltr: true })}
                                {qRow({ k: T('تأشيرات أخرى (count)', 'Other visas count'), v: fmtNum(q.visa_other_count), ltr: true })}
                                {qRow({ k: T('تأشيرات معتمدة', 'Approved visas'), v: fmtNum(q.visa_approved), ltr: true })}
                                {qRow({ k: T('مستخدمة', 'Used'), v: fmtNum(q.visa_used), ltr: true })}
                                {qRow({ k: T('غير مستخدمة', 'Not used'), v: fmtNum(q.visa_not_used), ltr: true })}
                                {qRow({ k: T('ملغاة', 'Cancelled'), v: fmtNum(q.visa_cancelled), ltr: true })}
                                {qRow({ k: T('مصدّرة', 'Issued'), v: fmtNum(q.visa_issued), ltr: true })}
                                {qRow({ k: T('رصيد أبشر', 'Absher balance'), v: q.absher_balance != null ? `${num(q.absher_balance)} ${T('ر.س', 'SAR')}` : null, ltr: true })}
                                {qRow({ k: T('حساب أبشر', 'Absher account'), v: q.absher_account_number, mono: true })}
                              </div>
                              {q.visa_work_eligibility_msg_ar && (
                                <div style={{ margin: '0 22px 14px', padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', fontSize: 11, color: '#ef4444', lineHeight: 1.6 }}>
                                  <div style={{ fontWeight: 800, marginBottom: 4 }}>
                                    {T('حالة أهلية تأشيرات العمل', 'Work-visa eligibility')}
                                    {q.visa_work_eligibility_code ? ` · ${q.visa_work_eligibility_code}` : ''}
                                  </div>
                                  <div>{q.visa_work_eligibility_msg_ar}</div>
                                </div>
                              )}
                            </CollapsibleCard>
                          )}

                          {/* المواقع — كرت منفصل (أوضح للتنقل) */}
                          {q.locations_total != null && (
                            <CollapsibleCard
                              title={T('المواقع', 'Locations')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('المواقع — الإجمالي', 'Locations total'), v: fmtNum(q.locations_total), ltr: true })}
                                {qRow({ k: T('نشطة', 'Active'), v: fmtNum(q.locations_active), ltr: true })}
                                {qRow({ k: T('عمال محددو الموقع', 'Assigned laborers'), v: fmtNum(q.locations_assigned), ltr: true })}
                                {qRow({ k: T('غير محددي الموقع', 'Unassigned laborers'), v: fmtNum(q.locations_unassigned), ltr: true })}
                                {qRow({ k: T('نسبة التحديد', 'Assigned %'), v: pct(q.locations_assigned_pct), ltr: true })}
                                {qRow({ k: T('ثابتو الموقع', 'Stationary'), v: fmtNum(q.locations_stationary), ltr: true })}
                                {qRow({ k: T('متنقلون', 'Rotary'), v: fmtNum(q.locations_rotary), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* سجل طلبات التأشيرات — جدول منفصل (qiwa_visa_requests) */}
                          <QiwaVisaRequestsCard sb={sb} companyId={q.company_id} T={T} />

                          {/* رخص العمل — أعداد + حالة المنشأة */}
                          {(q.wp_validate_raw || q.wp_requests_total != null || q.wp_laborers_total != null) && (
                            <CollapsibleCard
                              title={T('رخص العمل (تفاصيل)', 'Work Permits (detailed)')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('المنشأة مؤهلة', 'Establishment valid'), v: q.wp_is_valid == null ? null : (q.wp_is_valid ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('رصيد استثنائي', 'Exceptional balance'), v: q.wp_has_exceptional_balance == null ? null : (q.wp_has_exceptional_balance ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('منشأة استثمارية', 'Investment establishment'), v: q.wp_is_investment_establishment == null ? null : (q.wp_is_investment_establishment ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('في النطاق الأحمر', 'In red nitaq'), v: q.wp_is_in_red_ntiqat == null ? null : (q.wp_is_in_red_ntiqat ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('قيد التأسيس', 'Establishing'), v: q.wp_is_establishing == null ? null : (q.wp_is_establishing ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('عدد طلبات WP', 'WP requests'), v: fmtNum(q.wp_requests_total), ltr: true })}
                                {qRow({ k: T('طلبات بريميوم', 'Premium requests'), v: fmtNum(q.wp_premiums_total), ltr: true })}
                                {qRow({ k: T('عمالة (WP)', 'Laborers (WP)'), v: fmtNum(q.wp_laborers_total), ltr: true })}
                                {qRow({ k: T('رخص منتهية', 'Expired WPs'), v: fmtNum(q.wp_laborers_expired_total), ltr: true })}
                                {qRow({ k: T('مديونيات', 'Debts'), v: fmtNum(q.wp_debts_total), ltr: true })}
                                {qRow({ k: T('مديونيات الخروج النهائي', 'Final-exit debts'), v: fmtNum(q.wp_debts_final_exit_total), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — إدارة المهن (correct + change occupation) */}
                          {(q.occ_total_laborers != null || q.occ_corrected_pct != null) && (
                            <CollapsibleCard
                              title={T('إدارة المهن', 'Occupation Management')}
                              color="#3b82f6" showQiwaIcon
                              badge={q.occ_matched_pct != null ? `${q.occ_matched_pct}%` : null}>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('إجمالي العمال', 'Total laborers'), v: fmtNum(q.occ_total_laborers), ltr: true })}
                                {qRow({ k: T('مهن متطابقة', 'Matched occupations'), v: fmtNum(q.occ_matched_count), ltr: true })}
                                {qRow({ k: T('غير متطابقة', 'Not matched'), v: fmtNum(q.occ_not_matched_count), ltr: true })}
                                {qRow({ k: T('مهن مصحّحة', 'Corrected'), v: fmtNum(q.occ_corrected_count), ltr: true })}
                                {qRow({ k: T('غير مصحّحة', 'Not corrected'), v: fmtNum(q.occ_not_corrected_count), ltr: true })}
                                {qRow({ k: T('نسبة التطابق', 'Matched %'), v: pct(q.occ_matched_pct), ltr: true })}
                                {qRow({ k: T('نسبة التصحيح', 'Corrected %'), v: pct(q.occ_corrected_pct), ltr: true })}
                                {qRow({ k: T('عمال للتغيير', 'Laborers for change'), v: fmtNum(q.occ_change_laborers_total), ltr: true })}
                                {qRow({ k: T('طلبات تغيير المهنة', 'Change requests'), v: fmtNum(q.occ_change_requests_total), ltr: true })}
                                {qRow({ k: T('طلبات تصحيح المهنة', 'Correct requests'), v: fmtNum(q.occ_correct_requests_total), ltr: true })}
                                {qRow({ k: T('عمال لتصحيح المهنة', 'Laborers to correct'), v: fmtNum(q.occ_correct_laborers_total), ltr: true })}
                              </div>
                              {Array.isArray(q.occ_change_errors_raw) && q.occ_change_errors_raw.length > 0 && (
                                <div style={{ margin: '0 22px 14px', padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', fontSize: 11, color: '#ef4444', lineHeight: 1.7 }}>
                                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{T('قيود على خدمة تغيير المهنة', 'Change-occupation restrictions')}</div>
                                  {q.occ_change_errors_raw.map((e, i) => (
                                    <div key={e.id || i} style={{ marginBottom: 4 }}>
                                      <strong>{e.attributes?.code || e.id}:</strong> {e.attributes?.['ar-SA']?.details}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CollapsibleCard>
                          )}

                          {/* قوى — نقل خدمات الموظفين */}
                          {(q.transfer_available_balance != null || q.transfer_eligibility_raw) && (
                            <CollapsibleCard
                              title={T('نقل الخدمات', 'Employee Transfer')}
                              color="#3b82f6" showQiwaIcon
                              badge={q.transfer_available_balance != null ? `${q.transfer_available_balance}` : null}>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('نوع المنشأة', 'Establishment type'), v: q.transfer_establishment_type })}
                                {qRow({ k: T('الرصيد المتاح', 'Available balance'), v: fmtNum(q.transfer_available_balance), ltr: true })}
                                {qRow({ k: T('المهارات المهنية', 'Professional skills'), v: q.transfer_professional_skills == null ? null : (q.transfer_professional_skills ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('فئة التيار', 'Tier'), v: fmtNum(q.transfer_tier_id), ltr: true })}
                                {qRow({ k: T('بداية فترة السماح', 'Allowance start'), v: q.transfer_allowance_start, ltr: true })}
                                {qRow({ k: T('نهاية فترة السماح', 'Allowance end'), v: q.transfer_allowance_end, ltr: true })}
                                {qRow({ k: T('الرصيد المقدَّر بعد السماح', 'Est. after allowance'), v: fmtNum(q.transfer_est_after_allowance), ltr: true })}
                                {qRow({ k: T('طلبات واردة', 'Received'), v: fmtNum(q.transfer_received_total), ltr: true })}
                                {qRow({ k: T('واردة بانتظار الموافقة', 'Received pending'), v: fmtNum(q.transfer_received_pending_total), ltr: true })}
                                {qRow({ k: T('طلبات صادرة', 'Sent'), v: fmtNum(q.transfer_sent_total), ltr: true })}
                              </div>
                              {/* Lazy-loaded per-request list from qiwa_transfer_requests */}
                              <QiwaTransferRequestsList sb={sb} companyId={q.company_id} T={T} />

                              {/* Eligibility warnings — show only the modals that are true */}
                              {(() => {
                                const flags = [
                                  ['transfer_show_wp_expiration_modal',              T('انتهاء رخص العمل يمنع النقل', 'Work-permit expiration blocks transfer')],
                                  ['transfer_show_location_missing_modal',           T('بيانات الموقع الناقصة تمنع النقل', 'Missing location data blocks transfer')],
                                  ['transfer_show_non_compliance_self_assess_modal', T('عدم اكتمال التقييم الذاتي يمنع النقل', 'Self-assessment non-compliance blocks transfer')],
                                  ['transfer_show_suspended_nic_portal_modal',       T('موقوف في المنصة الموحدة لإيقاف الخدمات', 'Suspended in NIC unified portal')],
                                  ['transfer_show_uncorrected_occupation_modal',     T('مهن غير مصححة تمنع النقل', 'Uncorrected occupations block transfer')],
                                  ['transfer_show_occ_correction_check_failed_modal', T('فشل فحص نسبة تصحيح المهن', 'Occupation correction check failed')],
                                ].filter(([k]) => q[k] === true)
                                if (flags.length === 0) return null
                                return (
                                  <div style={{ margin: '0 22px 14px', padding: '10px 12px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', fontSize: 11, color: '#ef4444', lineHeight: 1.7 }}>
                                    <div style={{ fontWeight: 800, marginBottom: 6 }}>⚠ {T('تنبيهات تمنع النقل', 'Transfer-blocking issues')}</div>
                                    {flags.map(([k, label]) => <div key={k}>• {label}</div>)}
                                  </div>
                                )
                              })()}
                            </CollapsibleCard>
                          )}

                          {/* قوى — التقرير الشهري (آخر شهر متاح من qiwa_monthly_reports) */}
                          <QiwaMonthlyReportCard sb={sb} companyId={q.company_id} T={T} />

                          {/* قوى — شهادات (التوطين + المديونية) */}
                          {(q.sc_certificate_number || q.dc_status) && (
                            <CollapsibleCard
                              title={T('الشهادات', 'Certificates')}
                              color="#3b82f6" showQiwaIcon
                              badge={q.sc_status_ar || null}>
                              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {q.sc_certificate_number && (
                                  <div style={{ padding: 12, borderRadius: 8, background: 'rgba(34,197,94,.05)', border: '1px solid rgba(34,197,94,.18)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                      <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>{T('شهادة التوطين', 'Saudization Certificate')}</span>
                                      <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,.15)' }}>{q.sc_status_ar}</span>
                                      {q.sc_nitaqat_color_ar && <span style={{ marginInlineStart: 'auto', fontSize: 10, color: 'var(--tx2)', fontWeight: 700 }}>{q.sc_nitaqat_color_ar}</span>}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                      {qRow({ k: T('رقم الشهادة', 'Certificate no.'), v: q.sc_certificate_number, mono: true })}
                                      {qRow({ k: T('نسبة السعودة', 'Saudi rate'), v: pct(q.sc_saudi_rate), ltr: true })}
                                      {qRow({ k: T('تاريخ الإصدار', 'Issue date'), v: q.sc_issue_date, ltr: true })}
                                      {qRow({ k: T('تاريخ الانتهاء', 'Expiry date'), v: q.sc_expiry_date, ltr: true })}
                                      {qRow({ k: T('بداية التجديد', 'Renew start'), v: q.sc_renew_start_date, ltr: true })}
                                      {qRow({ k: T('آخر تعديل', 'Modified'), v: q.sc_modified_date, ltr: true })}
                                      {qRow({ k: T('الرقم الموحد', 'Unified no.'), v: q.sc_unified_establishment_number, mono: true })}
                                      {q.sc_license_number && qRow({ k: T('رقم الترخيص', 'License no.'), v: q.sc_license_number, mono: true })}
                                    </div>
                                  </div>
                                )}
                                {q.dc_status && (
                                  <div style={{ padding: 10, borderRadius: 8, background: q.dc_status === 'not_found' ? 'rgba(245,158,11,.06)' : 'rgba(34,197,94,.05)', border: q.dc_status === 'not_found' ? '1px solid rgba(245,158,11,.2)' : '1px solid rgba(34,197,94,.18)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{ fontSize: 12, fontWeight: 800, color: q.dc_status === 'not_found' ? '#f59e0b' : '#22c55e' }}>{T('شهادة عدم المديونية', 'Debt Certificate')}</span>
                                      <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{q.dc_status === 'not_found' ? T('لا توجد شهادة سارية', 'No active certificate') : q.dc_status}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — توثيق العقود وعدّاد العقود */}
                          {(q.ca_all_total != null || q.contracts_counts_raw) && (
                            <CollapsibleCard
                              title={T('توثيق العقود', 'Contract Authentication')}
                              color="#3b82f6" showQiwaIcon
                              badge={q.ca_all_percentage != null ? `${q.ca_all_percentage}%` : null}>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('إجمالي', 'Total'), v: fmtNum(q.ca_all_total), ltr: true })}
                                {qRow({ k: T('موثّقة', 'Authenticated'), v: fmtNum(q.ca_all_authenticated), ltr: true })}
                                {qRow({ k: T('نسبة التوثيق الكلية', 'Total auth %'), v: pct(q.ca_all_percentage), ltr: true })}
                                {qRow({ k: T('متطلب الوزارة', 'MHRSD requirement'), v: pct(q.ca_mhrsd_requirement_percentage), ltr: true })}
                                {qRow({ k: T('سعوديون', 'Saudis'), v: fmtNum(q.ca_saudis_total), ltr: true })}
                                {qRow({ k: T('عقود سعوديين موثقة', 'Saudis authenticated'), v: fmtNum(q.ca_saudis_authenticated), ltr: true })}
                                {qRow({ k: T('نسبة السعوديين', 'Saudis %'), v: pct(q.ca_saudis_percentage), ltr: true })}
                                {qRow({ k: T('غير سعوديين', 'Non-Saudis'), v: fmtNum(q.ca_non_saudis_total), ltr: true })}
                                {qRow({ k: T('عقود غير سعوديين موثقة', 'Non-Saudis authenticated'), v: fmtNum(q.ca_non_saudis_authenticated), ltr: true })}
                                {qRow({ k: T('نسبة غير السعوديين', 'Non-Saudis %'), v: pct(q.ca_non_saudis_percentage), ltr: true })}
                                {qRow({ k: T('موثقة بالمملكة (KSA)', 'KSA authenticated'), v: fmtNum(q.ca_ksa_authenticated_count), ltr: true })}
                                {qRow({ k: T('عقود سارية', 'Active contracts'), v: fmtNum(q.contracts_signed_active), ltr: true })}
                                {qRow({ k: T('عقود معتمدة', 'Approved'), v: fmtNum(q.contracts_signed_approved), ltr: true })}
                                {qRow({ k: T('عقود معلّقة', 'Pending'), v: fmtNum(q.contracts_pending_total), ltr: true })}
                                {qRow({ k: T('قيد الإنهاء', 'Termination'), v: fmtNum(q.contracts_termination_total), ltr: true })}
                                {qRow({ k: T('ملغاة', 'Cancelled'), v: fmtNum(q.contracts_cancelled_total), ltr: true })}
                                {qRow({ k: T('غير موثقة (count)', 'Unauthenticated count'), v: fmtNum(q.contracts_unauthenticated_total), ltr: true })}
                                {qRow({ k: T('مؤهلة لإعادة الإرسال', 'Resend-eligible'), v: fmtNum(q.contracts_resend_eligible), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — سجل العقود (qiwa_contracts + GOSI status) */}
                          <QiwaContractsCard sb={sb} companyId={q.company_id} T={T} />

                          {/* قوى — إحصائيات الموظفين (من employee-management-api) */}
                          {(q.emp_total != null || q.emp_wp_valid != null || q.emp_contract_auth_total_pct != null) && (
                            <CollapsibleCard
                              title={T('إحصائيات الموظفين', 'Employee Statistics')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('إجمالي الموظفين', 'Total'), v: fmtNum(q.emp_total), ltr: true })}
                                {qRow({ k: T('سعوديون', 'Saudis'), v: fmtNum(q.emp_saudis), ltr: true })}
                                {qRow({ k: T('غير سعوديين', 'Foreigners'), v: fmtNum(q.emp_foreigners), ltr: true })}
                                {qRow({ k: T('برقم حدود', 'With border no.'), v: fmtNum(q.emp_with_border_no), ltr: true })}
                                {qRow({ k: T('استثنائية', 'Special'), v: fmtNum(q.emp_special), ltr: true })}
                                {qRow({ k: T('خليجيون', 'GCC'), v: fmtNum(q.emp_gcc), ltr: true })}
                                {qRow({ k: T('عقود موثقة', 'Authenticated contracts'), v: fmtNum(q.emp_contracts_authenticated), ltr: true })}
                                {qRow({ k: T('عقود غير موثقة', 'Unauth. contracts'), v: fmtNum(q.emp_contracts_unauthenticated), ltr: true })}
                                {qRow({ k: T('توثيق العقود — سعوديون', 'Saudi auth %'), v: pct(q.emp_contract_auth_saudi_pct), ltr: true })}
                                {qRow({ k: T('توثيق العقود — غير سعوديين', 'Foreign auth %'), v: pct(q.emp_contract_auth_foreign_pct), ltr: true })}
                                {qRow({ k: T('توثيق العقود — الإجمالي', 'Total auth %'), v: pct(q.emp_contract_auth_total_pct), ltr: true })}
                                {qRow({ k: T('رخص سارية', 'Valid WPs'), v: fmtNum(q.emp_wp_valid), ltr: true })}
                                {qRow({ k: T('رخص قارب انتهاؤها', 'Expiring soon WPs'), v: fmtNum(q.emp_wp_expiring_soon), ltr: true })}
                                {qRow({ k: T('رخص منتهية', 'Expired WPs'), v: fmtNum(q.emp_wp_expired), ltr: true })}
                                {qRow({ k: T('بحاجة تجديد', 'To renew'), v: fmtNum(q.emp_wp_to_renew), ltr: true })}
                                {qRow({ k: T('بدون رخصة', 'No WP'), v: fmtNum(q.emp_wp_none), ltr: true })}
                                {qRow({ k: T('طلبات نقل معلّقة', 'Pending transfers'), v: fmtNum(q.emp_action_pending_transfers), ltr: true })}
                                {qRow({ k: T('طلبات إنهاء معلّقة', 'Pending terminations'), v: fmtNum(q.emp_action_pending_terminations), ltr: true })}
                                {qRow({ k: T('بدون عقد ساري', 'No active contract'), v: fmtNum(q.emp_action_no_active_contracts), ltr: true })}
                                {qRow({ k: T('بحاجة تصحيح مهنة', 'Need occupation fix'), v: fmtNum(q.emp_action_correct_occupation), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* سجل طلبات رخص العمل (qiwa_wp_requests) + العمالة (qiwa_wp_laborers) */}
                          <QiwaWpRequestsCard sb={sb} companyId={q.company_id} T={T} />
                          <QiwaWpLaborersCard sb={sb} companyId={q.company_id} T={T} />


                          {/* العنوان المفصّل من establishment-file-api */}
                          {(q.addr_city_ar || q.addr_district_ar || q.addr_street_ar) && (
                            <CollapsibleCard
                              title={T('العنوان المفصّل', 'Detailed Address')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('المدينة', 'City'), v: q.addr_city_ar })}
                                {qRow({ k: T('الحي', 'District'), v: q.addr_district_ar })}
                                {qRow({ k: T('الشارع', 'Street'), v: q.addr_street_ar })}
                                {qRow({ k: T('رقم المبنى', 'Building no.'), v: q.addr_building_no, ltr: true })}
                                {qRow({ k: T('الرقم الإضافي', 'Additional no.'), v: q.addr_additional_no, ltr: true })}
                                {qRow({ k: T('الرمز البريدي', 'ZIP code'), v: q.addr_zip_code, ltr: true })}
                                {qRow({ k: T('الوحدة', 'Unit no.'), v: q.addr_unit_no, ltr: true })}
                                {qRow({ k: T('معرّف ZATCA', 'ZATCA ID'), v: q.addr_zatca_id, mono: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — هوية المنشأة (Identity) — كل حقول التعريف من context/company */}
                          <CollapsibleCard
                            title={T('هوية المنشأة', 'Establishment Identity')}
                            color="#3b82f6" showQiwaIcon>
                            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {qRow({ k: T('معرّف المنشأة (Qiwa ID)', 'Qiwa company ID'), v: fmtNum(q.company_id), mono: true })}
                              {qRow({ k: T('Establishment ID', 'Establishment ID'), v: q.establishment_id, mono: true })}
                              {qRow({ k: T('اسم المنشأة', 'Establishment name'), v: q.establishment_name })}
                              {qRow({ k: T('حالة المنشأة', 'Establishment status'), v: q.establishment_status_ar || q.establishment_status_en })}
                              {qRow({ k: T('نوع المنشأة', 'Establishment type'), v: q.establishment_type_name })}
                              {qRow({ k: T('فرع رئيسي', 'Main branch'), v: q.company_main_branch == null ? null : (q.company_main_branch ? T('نعم', 'Yes') : T('لا', 'No')) })}
                              {qRow({ k: T('النشاط الاقتصادي الرئيسي', 'Main economic activity'), v: q.main_economic_activity })}
                              {qRow({ k: T('النشاط الاقتصادي الفرعي', 'Sub economic activity'), v: q.sub_economic_activity })}
                              {qRow({ k: T('السجل التجاري (Qiwa)', 'CR number (Qiwa)'), v: q.cr_number, mono: true })}
                              {qRow({ k: T('الرقم الموحد للسجل', 'CR national number'), v: q.cr_national_number, mono: true })}
                              {qRow({ k: T('حالة السجل', 'CR status'), v: q.cr_status_ar || q.cr_status_en })}
                              {qRow({ k: T('تاريخ إصدار السجل', 'CR release date'), v: q.cr_release_date, ltr: true })}
                              {qRow({ k: T('تاريخ انتهاء السجل', 'CR end date'), v: q.cr_end_date, ltr: true })}
                              {qRow({ k: T('السنة المالية ميلادي', 'Fiscal year (G)'), v: q.financial_year_gregorian, ltr: true })}
                              {qRow({ k: T('السنة المالية هجري', 'Fiscal year (H)'), v: q.financial_year_hijri, ltr: true })}
                              {qRow({ k: T('الرقم الموحد (Unified)', 'Unified number'), v: q.company_unified_number_id, mono: true })}
                              {qRow({ k: T('رقم الكيان', 'Entity number'), v: q.entity_number, mono: true })}
                              {qRow({ k: T('رقم 700', '700 number'), v: q.seven_hundred_number, mono: true })}
                              {qRow({ k: T('الرقم الضريبي', 'VAT number'), v: q.vat_number, mono: true })}
                              {qRow({ k: T('حساب NIC', 'NIC account'), v: q.nic_account_number, mono: true })}
                              {qRow({ k: T('البريد الإلكتروني', 'Email'), v: q.establishment_email, ltr: true })}
                              {qRow({ k: T('اللون (id)', 'Color id'), v: fmtNum(q.color_id), ltr: true })}
                              {qRow({ k: T('اللون', 'Color name'), v: q.color_name })}
                              {qRow({ k: T('كود اللون', 'Color code'), v: q.color_code, mono: true })}
                              {qRow({ k: T('الحجم (id)', 'Size id'), v: fmtNum(q.size_id), ltr: true })}
                              {qRow({ k: T('الحجم', 'Size name'), v: q.size_name })}
                            </div>
                          </CollapsibleCard>

                          {/* قوى — العنوان الأساسي (من context/company) */}
                          {(q.city_name_ar || q.district || q.street || q.building_no) && (
                            <CollapsibleCard
                              title={T('العنوان (من السياق)', 'Address (context)')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('كود المدينة', 'City code'), v: q.city_code, mono: true })}
                                {qRow({ k: T('المدينة', 'City'), v: q.city_name_ar || q.city_name_en })}
                                {qRow({ k: T('الحي', 'District'), v: q.district })}
                                {qRow({ k: T('الشارع', 'Street'), v: q.street })}
                                {qRow({ k: T('الرمز البريدي', 'Postal code'), v: q.postal_code, ltr: true })}
                                {qRow({ k: T('الرمز البريدي (ZIP)', 'ZIP'), v: q.zip_code, ltr: true })}
                                {qRow({ k: T('رقم المبنى', 'Building no.'), v: q.building_no, ltr: true })}
                                {qRow({ k: T('الرقم الإضافي', 'Additional no.'), v: q.additional_number, ltr: true })}
                                {qRow({ k: T('الوحدة', 'Unit no.'), v: q.unit_no, ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — ملخص الموظفين (الكيان vs المنشأة) */}
                          {(q.entity_employees_total != null || q.est_employees_total != null) && (
                            <CollapsibleCard
                              title={T('ملخص الموظفين (كيان vs منشأة)', 'Employees Summary (entity vs establishment)')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('الكيان — الإجمالي', 'Entity — total'), v: fmtNum(q.entity_employees_total), ltr: true })}
                                {qRow({ k: T('الكيان — سعوديون', 'Entity — Saudis'), v: fmtNum(q.entity_employees_saudis), ltr: true })}
                                {qRow({ k: T('الكيان — غير سعوديين', 'Entity — non-Saudis'), v: fmtNum(q.entity_employees_non_saudis), ltr: true })}
                                {qRow({ k: T('المنشأة — الإجمالي', 'Estab. — total'), v: fmtNum(q.est_employees_total), ltr: true })}
                                {qRow({ k: T('المنشأة — سعوديون', 'Estab. — Saudis'), v: fmtNum(q.est_employees_saudis), ltr: true })}
                                {qRow({ k: T('المنشأة — غير سعوديين', 'Estab. — non-Saudis'), v: fmtNum(q.est_employees_non_saudis), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — معلومات المجموعة (group-information) */}
                          {(q.group_total_entities != null || q.group_total_establishments != null) && (
                            <CollapsibleCard
                              title={T('معلومات المجموعة', 'Group Information')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('إجمالي الكيانات في المجموعة', 'Group entities'), v: fmtNum(q.group_total_entities), ltr: true })}
                                {qRow({ k: T('إجمالي المنشآت في المجموعة', 'Group establishments'), v: fmtNum(q.group_total_establishments), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — الكوتا والمؤشرات ومرحلة المنشأة */}
                          {(q.indicator_quota_allowed != null
                            || q.indicator_unrelated_occupations != null
                            || q.indicator_nitaqat_level_ar
                            || q.est_phase_status
                            || q.absher_amount_per_visa != null) && (
                            <CollapsibleCard
                              title={T('الكوتا والمؤشرات ومرحلة المنشأة', 'Quota / Indicators / Phase')}
                              color="#3b82f6" showQiwaIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('الكوتا المسموحة', 'Allowed quota'), v: fmtNum(q.indicator_quota_allowed), ltr: true })}
                                {qRow({ k: T('سبب رفض الكوتا', 'Quota error reason'), v: q.indicator_quota_error_ar })}
                                {qRow({ k: T('كود رفض الكوتا', 'Quota error code'), v: q.indicator_quota_error_code, mono: true })}
                                {qRow({ k: T('مهن غير ذات صلة', 'Unrelated occupations'), v: fmtNum(q.indicator_unrelated_occupations), ltr: true })}
                                {qRow({ k: T('حد المهن غير ذات الصلة', 'Unrelated occupations limit'), v: fmtNum(q.indicator_unrelated_occupations_limit), ltr: true })}
                                {qRow({ k: T('حالة الالتزام (مؤشر)', 'Compliance status (indicator)'), v: q.indicator_compliance_status == null ? null : (q.indicator_compliance_status ? T('ملتزمة', 'Compliant') : T('غير ملتزمة', 'Non-compliant')) })}
                                {qRow({ k: T('مستوى النطاقات (id)', 'Nitaqat level id'), v: q.indicator_nitaqat_level_id, mono: true })}
                                {qRow({ k: T('مستوى النطاقات', 'Nitaqat level'), v: q.indicator_nitaqat_level_ar || q.indicator_nitaqat_level_en })}
                                {qRow({ k: T('مرحلة المنشأة', 'Establishment phase'), v: q.est_phase_status })}
                                {qRow({ k: T('نهاية فترة السماح', 'Allowance end'), v: q.est_allowance_end_date, ltr: true })}
                                {qRow({ k: T('في فترة السماح', 'In allowance period'), v: q.in_allowance_period == null ? null : (q.in_allowance_period ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('قيمة التأشيرة (أبشر)', 'Visa fee (Absher)'), v: q.absher_amount_per_visa != null ? `${num(q.absher_amount_per_visa)} ${T('ر.س', 'SAR')}` : null, ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — تفصيل قضايا الموظفين (Employee Cases Breakdown) */}
                          {(q.employee_cases_waiting_approval != null
                            || q.employee_cases_work_permit != null
                            || q.employee_cases_other != null) && (
                            <CollapsibleCard
                              title={T('تفصيل قضايا الموظفين', 'Employee Cases (breakdown)')}
                              color="#3b82f6" showQiwaIcon
                              badge={q.employee_cases_total != null ? `${q.employee_cases_total}` : null}>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('بانتظار الموافقة', 'Waiting approval'), v: fmtNum(q.employee_cases_waiting_approval), ltr: true })}
                                {qRow({ k: T('قضايا رخص العمل', 'Work permit cases'), v: fmtNum(q.employee_cases_work_permit), ltr: true })}
                                {qRow({ k: T('قضايا أخرى للموظفين', 'Other employee cases'), v: fmtNum(q.employee_cases_other), ltr: true })}
                                {qRow({ k: T('رخص قارب انتهاؤها (30 يوم)', 'WP expiring in 30 days'), v: fmtNum(q.employee_cases_wp_expiring_30d), ltr: true })}
                                {qRow({ k: T('رخص للإصدار/التجديد/الدفع', 'WP to issue/renew/pay'), v: fmtNum(q.employee_cases_wp_to_issue), ltr: true })}
                                {qRow({ k: T('طلبات عقود معلّقة', 'Pending contract reqs'), v: fmtNum(q.employee_cases_contract_pending), ltr: true })}
                                {qRow({ k: T('طلبات نقل معلّقة', 'Pending transfer reqs'), v: fmtNum(q.employee_cases_transfer_pending), ltr: true })}
                                {qRow({ k: T('موظفون بدون موقع محدد', 'Unassigned to location'), v: fmtNum(q.employee_cases_unassigned_location), ltr: true })}
                                {qRow({ k: T('ملاحظات (قضايا المنشأة)', 'Notes (estab. cases)'), v: fmtNum(q.cases_notes), ltr: true })}
                                {qRow({ k: T('مخالفات (قضايا المنشأة)', 'Violations (estab. cases)'), v: fmtNum(q.cases_violations), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* قوى — الاشتراك وحالة الحساب (نظام Qiwa الداخلي) */}
                          {(q.subscription_expiry_date || q.user_role || q.is_vip != null || q.status) && (
                            <CollapsibleCard
                              title={T('الاشتراك وحالة حساب Qiwa', 'Subscription & Account Status')}
                              color="#3b82f6" showQiwaIcon
                              badge={q.soon_expired ? T('قريب الانتهاء', 'Expiring') : null}>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {qRow({ k: T('تاريخ انتهاء الاشتراك', 'Subscription expiry'), v: q.subscription_expiry_date, ltr: true })}
                                {qRow({ k: T('قريب الانتهاء', 'Soon expired'), v: q.soon_expired == null ? null : (q.soon_expired ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('أيام متبقية', 'Remaining days'), v: fmtNum(q.remaining_days), ltr: true })}
                                {qRow({ k: T('حالة الدفع', 'Payment status'), v: q.payment_status })}
                                {qRow({ k: T('معرّف الدفع', 'Payment ID'), v: q.payment_id, mono: true })}
                                {qRow({ k: T('VIP', 'VIP'), v: q.is_vip == null ? null : (q.is_vip ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('مؤهلة للاشتراك الذاتي', 'Self-subscription eligible'), v: q.eligible_for_self_subscription == null ? null : (q.eligible_for_self_subscription ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('حالة الحساب', 'Account status'), v: q.status })}
                                {qRow({ k: T('دور المستخدم', 'User role'), v: q.user_role })}
                                {qRow({ k: T('مفضّلة', 'Favorite'), v: q.is_favorite == null ? null : (q.is_favorite ? T('نعم', 'Yes') : T('لا', 'No')) })}
                                {qRow({ k: T('حالة اللوحة', 'Panel status'), v: q.panel_status })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {q.detail_synced_at && (
                            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--tx5)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {T('آخر مزامنة قوى', 'Qiwa last synced')}: {new Date(q.detail_synced_at).toLocaleString('en-GB')}
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {/* ── Muqeem cards (populated by muqeemSyncBookmarklet.js).
                        Match on moi_number = facility's gosi_unified_national_number.
                        Same orange accent as the Muqeem sync bookmarklet so the
                        source is recognizable at a glance. */}
                    {muqeemCompany && (() => {
                      const m = muqeemCompany
                      const muqAccent = '#f59e0b'
                      const mRow = ({ k, v, mono, ltr }) => (v == null || v === '' ? null : (
                        <Row k={k} v={v} mono={mono} ltr={ltr} />
                      ))
                      const fmtDate = (s) => s ? String(s).slice(0, 10) : null
                      const yesNo = (b) => b == null ? null : (b ? T('نعم', 'Yes') : T('لا', 'No'))
                      return (
                        <>
                          {/* Identity + CR + address — opens by default since it's
                              the most-used Muqeem view. */}
                          <CollapsibleCard
                            title={T('هوية المنشأة', 'Organization')}
                            color={muqAccent} defaultExpanded showMuqeemIcon
                            badge={m.residents_count != null ? `${m.residents_count} ${T('مقيم', 'residents')}` : null}>
                            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {mRow({ k: T('رقم المنشأة (MOI)', 'MOI number'), v: m.moi_number, mono: true })}
                              {mRow({ k: T('Organization ID', 'Organization ID'), v: fmtNum(m.organization_id), ltr: true })}
                              {mRow({ k: T('الاسم العربي', 'Name (AR)'), v: m.name_ar })}
                              {mRow({ k: T('الاسم الإنجليزي', 'Name (EN)'), v: m.name_en })}
                              {mRow({ k: T('الاسم المختصر (AR)', 'Short name (AR)'), v: m.short_name_ar })}
                              {mRow({ k: T('الاسم المختصر (EN)', 'Short name (EN)'), v: m.short_name_en })}
                              {mRow({ k: T('اسم المالك', 'Owner name'), v: m.owner_name })}
                              {mRow({ k: T('الهاتف', 'Phone'), v: m.phone_number, ltr: true })}
                              {mRow({ k: T('الفاكس', 'Fax'), v: m.fax_number, ltr: true })}
                              {mRow({ k: T('رقم العضوية (CCI)', 'CCI number'), v: m.cci_number, mono: true })}
                              {mRow({ k: T('تاريخ إصدار العضوية (هـ)', 'CCI issue date (H)'), v: m.cci_issue_date_h, ltr: true })}
                              {mRow({ k: T('سجل تجاري', 'Has CR'), v: yesNo(m.has_cr) })}
                              {mRow({ k: T('اسم السجل', 'CR name'), v: m.cr_name })}
                              {mRow({ k: T('رقم السجل', 'CR number'), v: m.cr_number, mono: true })}
                              {mRow({ k: T('رقم الكيان', 'CR entity no.'), v: m.cr_entity_number, mono: true })}
                              {mRow({ k: T('تاريخ إصدار السجل', 'CR issue date'), v: fmtDate(m.cr_issue_date), ltr: true })}
                              {mRow({ k: T('تاريخ انتهاء السجل', 'CR expiry date'), v: fmtDate(m.cr_expiry_date), ltr: true })}
                              {mRow({ k: T('حالة السجل', 'CR status'), v: m.cr_status })}
                              {mRow({ k: T('نوع النشاط', 'Business type'), v: m.business_type })}
                              {mRow({ k: T('الرقم الضريبي', 'VAT number'), v: m.vat_number, mono: true })}
                            </div>
                          </CollapsibleCard>

                          {/* Address */}
                          {(m.city_name || m.district || m.street_name) && (
                            <CollapsibleCard
                              title={T('العنوان', 'Address')}
                              color={muqAccent} showMuqeemIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {mRow({ k: T('المدينة', 'City'), v: m.city_name || m.city_name_en })}
                                {mRow({ k: T('معرّف المدينة', 'City ID'), v: fmtNum(m.city_id), ltr: true })}
                                {mRow({ k: T('الحي', 'District'), v: m.district || m.district_en })}
                                {mRow({ k: T('الشارع', 'Street'), v: m.street_name || m.street_name_en })}
                                {mRow({ k: T('رقم المبنى', 'Building no.'), v: fmtNum(m.building_number), ltr: true })}
                                {mRow({ k: T('الرقم الإضافي', 'Additional no.'), v: fmtNum(m.additional_number), ltr: true })}
                                {mRow({ k: T('الرمز البريدي', 'ZIP'), v: fmtNum(m.zip_code), ltr: true })}
                                {mRow({ k: T('الوحدة', 'Unit no.'), v: fmtNum(m.unit_no), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* Subscription + balances */}
                          {(m.latest_package_name_ar || m.point_balance != null || m.sms_balance != null) && (
                            <CollapsibleCard
                              title={T('الاشتراك والأرصدة', 'Subscription & balances')}
                              color={muqAccent} showMuqeemIcon
                              badge={m.subscription_expired ? T('منتهي', 'Expired') : (m.latest_expiry_date ? fmtDate(m.latest_expiry_date) : null)}>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {mRow({ k: T('الباقة الحالية', 'Current package'), v: m.latest_package_name_ar || m.latest_package_name_en })}
                                {mRow({ k: T('معرّف الباقة', 'Package ID'), v: fmtNum(m.latest_package_id), ltr: true })}
                                {mRow({ k: T('حد المقيمين (من)', 'Resident count from'), v: fmtNum(m.latest_resident_count_from), ltr: true })}
                                {mRow({ k: T('حد المقيمين (إلى)', 'Resident count to'), v: fmtNum(m.latest_resident_count_to), ltr: true })}
                                {mRow({ k: T('بداية الاشتراك', 'Subscription start'), v: fmtDate(m.latest_start_date), ltr: true })}
                                {mRow({ k: T('نهاية الاشتراك', 'Subscription expiry'), v: fmtDate(m.latest_expiry_date), ltr: true })}
                                {mRow({ k: T('حالة الاشتراك', 'Status code'), v: m.latest_status_code })}
                                {mRow({ k: T('منتهي', 'Expired'), v: yesNo(m.subscription_expired) })}
                                {mRow({ k: T('في انتظار الدفع', 'Awaiting payment'), v: yesNo(m.has_waiting_payment_sub) })}
                                {mRow({ k: T('اشتراك مستقبلي', 'Future subscription'), v: yesNo(m.has_future_sub) })}
                                {mRow({ k: T('رصيد النقاط', 'Points balance'), v: fmtNum(m.point_balance), ltr: true })}
                                {mRow({ k: T('نقاط معلّقة', 'Points pending'), v: fmtNum(m.point_total_pending), ltr: true })}
                                {mRow({ k: T('رصيد الرسائل (SMS)', 'SMS balance'), v: fmtNum(m.sms_balance), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* Subscription history (1-to-many) */}
                          {muqeemSubscriptions.length > 0 && (
                            <CollapsibleCard
                              title={T('تاريخ الاشتراكات', 'Subscription history')}
                              color={muqAccent} showMuqeemIcon badge={String(muqeemSubscriptions.length)}>
                              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {muqeemSubscriptions.map(s => (
                                  <div key={s.subscription_id} style={{
                                    padding: '8px 12px', borderRadius: 8,
                                    background: 'rgba(255,255,255,.025)',
                                    border: '1px solid rgba(255,255,255,.06)',
                                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center',
                                  }}>
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>{s.package_name_ar || s.package_name_en || '—'}</div>
                                      <div style={{ fontSize: 10, color: 'var(--tx5)', marginTop: 2, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>
                                        #{s.subscription_id} · {s.resident_count_from}–{s.resident_count_to} · {fmtDate(s.start_date)} → {fmtDate(s.expiry_date)}
                                      </div>
                                    </div>
                                    <span style={{
                                      fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap',
                                      color: s.status_code === 'EXPIRED' ? '#ef4444' : (s.status_code === 'ACTIVE' ? '#22c55e' : 'var(--tx3)'),
                                      background: s.status_code === 'EXPIRED' ? 'rgba(239,68,68,.12)' : (s.status_code === 'ACTIVE' ? 'rgba(34,197,94,.12)' : 'rgba(255,255,255,.05)'),
                                    }}>{s.status_code || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* Monthly report counts (issued/renewed iqama, exits, transfers, etc) */}
                          {(m.report_issued_iqama_count != null || m.report_renewed_iqama_count != null || m.report_final_exit_count != null) && (
                            <CollapsibleCard
                              title={T('أعداد التقارير الشهرية', 'Monthly report counts')}
                              color={muqAccent} showMuqeemIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {mRow({ k: T('إصدار إقامات', 'Issued iqama'), v: fmtNum(m.report_issued_iqama_count), ltr: true })}
                                {mRow({ k: T('تجديد إقامات', 'Renewed iqama'), v: fmtNum(m.report_renewed_iqama_count), ltr: true })}
                                {mRow({ k: T('إصدار خروج وعودة', 'Issued ER visa'), v: fmtNum(m.report_issued_er_visa_count), ltr: true })}
                                {mRow({ k: T('تمديد خروج وعودة', 'Extended ER visa'), v: fmtNum(m.report_extended_er_visa_count), ltr: true })}
                                {mRow({ k: T('تمديد تأشيرة زيارة', 'Extended visit visa'), v: fmtNum(m.report_extended_visit_visa_count), ltr: true })}
                                {mRow({ k: T('خروج نهائي', 'Final exit'), v: fmtNum(m.report_final_exit_count), ltr: true })}
                                {mRow({ k: T('خروج نهائي (فترة تجربة)', 'Probation final exit'), v: fmtNum(m.report_probation_final_exit_count), ltr: true })}
                                {mRow({ k: T('تغيير المهنة', 'Change occupation'), v: fmtNum(m.report_change_occupation_count), ltr: true })}
                                {mRow({ k: T('نقل خدمات', 'Transferred iqama'), v: fmtNum(m.report_transferred_iqama_count), ltr: true })}
                                {mRow({ k: T('إسقاط عمالة', 'Drop resident'), v: fmtNum(m.report_drop_resident_count), ltr: true })}
                                {mRow({ k: T('تحديث الاسم المترجم', 'Update translated name'), v: fmtNum(m.report_update_translated_name_count), ltr: true })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* Service provider + OTP flags */}
                          {(m.service_provider_name_ar || m.approval_otp_activated != null) && (
                            <CollapsibleCard
                              title={T('مزوّد الخدمة وOTP', 'Service provider & OTP')}
                              color={muqAccent} showMuqeemIcon>
                              <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {mRow({ k: T('اسم مزوّد الخدمة', 'Provider name'), v: m.service_provider_name_ar || m.service_provider_name_en })}
                                {mRow({ k: T('رقم تواصل المزوّد', 'Provider contact'), v: m.service_provider_contact, ltr: true })}
                                {mRow({ k: T('موقع المزوّد', 'Provider location'), v: m.service_provider_location })}
                                {mRow({ k: T('OTP مفعّل', 'OTP activated'), v: yesNo(m.approval_otp_activated) })}
                                {mRow({ k: T('OTP مسموح', 'OTP allowed'), v: yesNo(m.approval_otp_allowed) })}
                              </div>
                            </CollapsibleCard>
                          )}

                          {/* Residents list — collapsible. Each resident expands to show full record. */}
                          {muqeemResidents.length > 0 && (
                            <CollapsibleCard
                              title={T('المقيمون', 'Residents')}
                              color={muqAccent} showMuqeemIcon badge={String(muqeemResidents.length)}>
                              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {muqeemResidents.map(r => <MuqeemResidentRow key={r.iqama_number} r={r} T={T} />)}
                              </div>
                            </CollapsibleCard>
                          )}

                          {m.detail_synced_at && (
                            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--tx5)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                              {T('آخر مزامنة مقيم', 'Muqeem last synced')}: {new Date(m.detail_synced_at).toLocaleString('en-GB')}
                            </div>
                          )}
                        </>
                      )
                    })()}

                    {/* (Contact info card was moved up — now sits right
                         after the Facility card per user request) */}
                  </>
                )
              })()}

            </div>

            {/* Sidebar */}
            <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Status summary — gated on hasSbcData since the CR issue/confirm
                  dates that drive the status come from the SBC payload. */}
              {hasSbcData && (
              <div style={cardChrome}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.fg }} />
                  <span style={cardTitle}>{T('حالة السجل التجاري','CR Status')}</span>
                  <CrCountdown confirmDate={detail._confirmDate} T={T} style={{ marginInlineStart: 'auto' }} />
                </div>
                <div style={{ padding: '20px 22px 14px', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: theme.fg + '18', border: '1px solid ' + theme.fg + '38' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.fg, boxShadow: `0 0 8px ${theme.fg}aa` }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: theme.fg }}>{detail._status || '—'}</span>
                  </div>
                  {detail.is_in_confirmation_period && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: '#facc1518', border: '1px solid #facc1538', color: '#facc15', fontSize: 10.5, fontWeight: 700 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#facc15' }} />
                        {T('ضمن فترة التأكيد','In Confirm Period')}
                      </span>
                    </div>
                  )}
                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10, color: 'var(--tx4)' }}>
                    <div>
                      <div style={{ fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('إصدار','Issue')}</div>
                      <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 700, marginTop: 2, direction: 'ltr' }}>{detail._issueDate}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('تأكيد','Confirm')}</div>
                      {(() => {
                        const cd = detail._confirmDate
                        let color = 'var(--tx2)'
                        if (cd) {
                          const t = new Date(cd).getTime()
                          if (!Number.isNaN(t)) {
                            const daysDiff = Math.floor((Date.now() - t) / 86400000)
                            // Before confirm date → green (no action needed yet)
                            // Within 90 days after → yellow (confirmation window)
                            // > 90 days past → red (overdue / suspended)
                            if (daysDiff < 0) color = '#22c55e'
                            else if (daysDiff <= 90) color = '#eab308'
                            else color = '#ef4444'
                          }
                        }
                        return <div style={{ fontSize: 12, color, fontWeight: 700, marginTop: 2, direction: 'ltr' }}>{cd}</div>
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              )}

              {/* Data sources — moved from the inline chip strip above the
                  2-column layout. Each row is one source we have synced data
                  from, colored by brand, with a check on the end to confirm
                  we actually have data from it (vs. just "supported"). */}
              <div style={cardChrome}>
                <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} /><span style={cardTitle}>{T('مصادر البيانات','Data sources')}</span></div>
                <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(() => {
                    // Only list sources we actually have data from. The page
                    // shell (SbcDrilldown) doesn't itself imply SBC was synced
                    // — facilities can be created from a GOSI sync alone, in
                    // which case the SBC raw payload (raw_cr_data) is empty.
                    const hasSbc = !!(detail?.raw_cr_data || detail?._raw)
                      || prov.some(p => p.source_id === 'sbc')
                    const hasGosi = !!(gosiEstablishment || gosiOwners?.length
                      || gosiContributors?.length || gosiBills?.length || gosiAdmins?.length
                      || gosiCertificates?.length)
                      || prov.some(p => p.source_id === 'gosi')
                    const hasQiwa = !!qiwaCompany || prov.some(p => p.source_id === 'qiwa')
                    const hasMuqeem = !!muqeemCompany || muqeemResidents?.length > 0
                      || prov.some(p => p.source_id === 'muqeem')
                    const derived = [hasSbc && 'sbc', hasQiwa && 'qiwa', hasGosi && 'gosi', hasMuqeem && 'muqeem'].filter(Boolean)
                    const sourceIds = Array.from(new Set([...derived, ...prov.map(p => p.source_id).filter(Boolean)]))
                    return sourceIds.map(sid => {
                      const brand = SOURCE_BRAND[sid] || { color: '#888' }
                      const fullName = (lang === 'en' ? SOURCE_NAMES_EN[sid] : SOURCE_NAMES_AR[sid]) || sid
                      const op = provFor(sid)
                      const opLabel = op
                        ? (lang === 'en' ? (op.person_name_en || op.person_name_ar) : (op.person_name_ar || op.person_name_en))
                        : null
                      const ago = op ? fmtAgo(op.last_synced_at, lang) : null
                      const title = [fullName, opLabel, ago].filter(Boolean).join(' · ')
                      return (
                        <div key={sid} title={title}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 8,
                            background: `${brand.color}10`,
                            border: `1px solid ${brand.color}30`,
                          }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: brand.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: brand.color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</span>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* The extended details previously rendered here have been moved
              inline above (inside the left column, same design as existing
              facility cards). */}
          {false && (() => {
            // dead block — left here only for reference; will be deleted later.
            const ext = extDetail || {}
            const raw = detail.raw_cr_data || detail._raw || {}
            const cr = detail.crInformation || raw.crInformation || {}
            const contact = raw.contactInformation || {}
            const mg = raw.mangmentInformation || {}
            const acts = raw.crActivities?.activityList || []
            const procedures = cr.procedures || []
            const licenses = cr.licenses || []
            const partnersList = raw.parityList || []
            const managersList = mg.managerList || []

            const gosiFile = ext['gosi/establishments-file-info-by-registration-number']?.response_body || null
            const gosiComp = ext['gosi/establishment-compliance']?.response_body || null
            const hrsdRaw = ext['hrsd/get-establishment-statistics']?.response_body || null
            const momrahData = ext['momrah/commercial-licenses-by-cr-number']?.response_body || null
            const momrahList = momrahData?.data?.result?.list || []
            const emtethal = ext['mcV2/GetEmtethalViolationsQuery']?.response_body || null
            const qawaem = ext['Qawaem/GetQawaemStatistics']?.response_body || null
            const violations = ext['mcV2/GetViolationsQuery']?.response_body || null
            const caseViolations = ext['mcV2/GetCaseViolationsQuery']?.response_body || null
            const printAr = ext['mcV2/get-print-cr-by-national-number']?.response_body || null
            const printEn = ext['mcV2/get-print-cr-by-national-number(en)']?.response_body || null
            const printContract = ext['mcV2/get-print-cr-contract-by-national-number']?.response_body || null

            const STORAGE_BASE = `https://gcvshzutdslmdkwqwteh.supabase.co/storage/v1/object/public/documents/sbc-cr-certificates/${detail.cr_national_number}`

            const SectionCard = ({ title, color, children, count }) => (
              <div style={{ ...cardChrome, marginTop: 14 }}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                  <span style={cardTitle}>{title}</span>
                  {count != null && <span style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx5)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(count)}</span>}
                </div>
                <div style={{ padding: '14px 18px' }}>{children}</div>
              </div>
            )

            const FieldRow = ({ k, v }) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px dashed rgba(255,255,255,.05)', fontSize: 12 }}>
                <span style={{ color: 'var(--tx4)' }}>{k}</span>
                <span style={{ color: v != null && v !== '' ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 700, direction: 'ltr', textAlign: 'end' }}>{v != null && v !== '' ? v : '—'}</span>
              </div>
            )

            const fmtMoney = (n, cur) => n != null ? `${num(Number(n))} ${cur || ''}`.trim() : null
            const yesNo = (b) => b ? T('نعم', 'Yes') : T('لا', 'No')

            return (
              <>
                {extDetailLoading && (
                  <div style={{ marginTop: 14, padding: 12, textAlign: 'center', color: 'var(--tx5)', fontSize: 12 }}>
                    {T('جارٍ تحميل البيانات التفصيلية...', 'Loading extended details...')}
                  </div>
                )}

                {/* ── Full CR information ── */}
                <SectionCard title={T('بيانات السجل الكاملة', 'Full CR Information')} color={C.gold}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 24px' }}>
                    <FieldRow k={T('رأس المال', 'Capital')} v={fmtMoney(detail.capital, detail.capital_currency_ar)} />
                    <FieldRow k={T('الشكل القانوني', 'Legal Form')} v={detail.company_form_ar} />
                    <FieldRow k={T('نوع المنشأة', 'Entity Type')} v={detail.entity_type_ar} />
                    <FieldRow k={T('لغة اسم المنشأة', 'Entity Name Lang')} v={detail.entity_name_lang_ar} />
                    <FieldRow k={T('مدة الشركة', 'Company Duration')} v={detail.company_duration} />
                    <FieldRow k={T('مدينة المركز', 'HQ City')} v={detail.headquarter_city_ar} />
                    <FieldRow k={T('جنسية الشركاء', 'Partners Nationality')} v={detail.partners_nationality_ar} />
                    <FieldRow k={T('تاريخ الإصدار (هجري)', 'Issue Date (Hijri)')} v={detail.cr_issue_date_hijri} />
                    <FieldRow k={T('تاريخ التأكيد (هجري)', 'Confirm Date (Hijri)')} v={detail.cr_confirm_date_hijri} />
                    <FieldRow k={T('تاريخ عقد التأسيس', 'Contract Date')} v={detail.company_contract_from_date} />
                    <FieldRow k={T('تاريخ آخر تعليق', 'Last Suspension')} v={detail.last_cr_suspension_date} />
                    <FieldRow k={T('تاريخ آخر تفعيل', 'Last Reactivation')} v={detail.last_cr_reactivation_date} />
                    <FieldRow k={T('تاريخ الشطب', 'Strike-off Date')} v={detail.delete_date} />
                    <FieldRow k={T('قائم على ترخيص', 'License-based')} v={yesNo(detail.is_license_based)} />
                    <FieldRow k={T('تجارة إلكترونية', 'E-commerce')} v={yesNo(detail.has_ecommerce)} />
                    <FieldRow k={T('تحت التصفية', 'In Liquidation')} v={yesNo(detail.in_liquidation_process)} />
                    <FieldRow k={T('في فترة التأكيد', 'In Confirm Period')} v={yesNo(detail.is_in_confirmation_period)} />
                    <FieldRow k={T('سجل رئيسي', 'Main')} v={yesNo(detail.is_main)} />
                  </div>
                </SectionCard>

                {/* ── GOSI Details (full) ── */}
                <SectionCard title={T('بيانات التأمينات الاجتماعية (GOSI)', 'GOSI Details')} color="#22c55e">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 24px' }}>
                    <FieldRow k={T('رقم التسجيل', 'Registration No.')} v={gosi.regNo} />
                    <FieldRow k={T('اسم المنشأة', 'Establishment Name')} v={gosi.name || gosiFile?.establishmentNamArb} />
                    <FieldRow k={T('عدد المشتركين', 'Contributors')} v={fmtNum(gosi.total)} />
                    <FieldRow k={T('مشتركون سعوديون', 'Saudi')} v={fmtNum(gosi.saudi)} />
                    <FieldRow k={T('مشتركون غير سعوديين', 'Non-Saudi')} v={fmtNum(gosi.nonSaudi)} />
                    <FieldRow k={T('إجمالي الاشتراكات', 'Total Contribution')} v={gosi.contribution != null ? num(gosi.contribution) + ' ر.س' : null} />
                    <FieldRow k={T('إجمالي المديونية', 'Total Debit')} v={gosi.debit != null ? num(gosi.debit) + ' ر.س' : null} />
                    <FieldRow k={T('إجمالي الغرامات', 'Total Penalties')} v={gosi.penalties != null ? num(gosi.penalties) + ' ر.س' : null} />
                    {gosiFile && (
                      <>
                        <FieldRow k={T('معرّف ملف العمل', 'MoL Establishment ID')} v={gosiFile.molEstID} />
                        <FieldRow k={T('معرّف مكتب العمل', 'MoL Office ID')} v={gosiFile.molofficeID} />
                        <FieldRow k={T('الرقم الموحد (موارد بشرية)', 'MoL Unified ID')} v={gosiFile.moluniID} />
                      </>
                    )}
                  </div>
                </SectionCard>

                {/* ── HRSD / Nitaqat Details (full) ── */}
                <SectionCard title={T('بيانات الموارد البشرية (HRSD/Nitaqat)', 'HRSD / Nitaqat Details')} color="#16a085">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 24px' }}>
                    <FieldRow k={T('مكتب العمل', 'Labor Office')} v={hrsd.officeName} />
                    <FieldRow k={T('رقم ملف المنشأة', 'Est. File No.')} v={hrsd.officeId != null && hrsd.sequenceNumber != null ? `${hrsd.officeId}-${hrsd.sequenceNumber}` : null} />
                    <FieldRow k={T('النطاق', 'Nitaq Band')} v={hrsd.nitaqName ? `${hrsd.nitaqName}${hrsd.nitaqCode ? ' (' + hrsd.nitaqCode + ')' : ''}` : null} />
                    <FieldRow k={T('نشاط نطاقات', 'Nitaqat Activity')} v={hrsd.activityName} />
                    <FieldRow k={T('نسبة السعودة', 'Saudization %')} v={hrsd.saudiPercentage != null ? `${Number(hrsd.saudiPercentage).toFixed(2)}%` : null} />
                    <FieldRow k={T('إجمالي العمالة', 'Total Workers')} v={fmtNum(hrsd.totalLaborers)} />
                    <FieldRow k={T('عمالة سعودية', 'Saudi Workers')} v={fmtNum(hrsd.saudiLaborers)} />
                    <FieldRow k={T('عمالة غير سعودية', 'Foreign Workers')} v={fmtNum(hrsd.foreignLaborers)} />
                    <FieldRow k={T('رخص عمل صادرة', 'Issued Permits')} v={fmtNum(hrsd.issuedPermits)} />
                    <FieldRow k={T('رخص منتهية', 'Expired Permits')} v={fmtNum(hrsd.expiredPermits)} />
                    <FieldRow k={T('قاربة الانتهاء', 'About-to-expire')} v={fmtNum(hrsd.expiringPermits)} />
                    {hrsdRaw?.unifiedNumber && (
                      <FieldRow k={T('الرقم الموحد', 'Unified No.')} v={`${hrsdRaw.unifiedNumber.laborOfficeIdField}-${hrsdRaw.unifiedNumber.sequenceNumberField}`} />
                    )}
                  </div>
                </SectionCard>

                {/* ── WPS / Wage protection compliance ── */}
                {gosiComp && (
                  <SectionCard title={T('التزام حماية الأجور (WPS)', 'WPS Compliance')} color="#0ea5e9">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 24px' }}>
                      <FieldRow k={T('نسبة الالتزام بحماية الأجور', 'WPS %')} v={gosiComp.wpsCompliancePercentage != null ? `${gosiComp.wpsCompliancePercentage}%` : null} />
                      <FieldRow k={T('حالة الالتزام', 'WPS Status')} v={gosiComp.wpsComplianceStatus} />
                      <FieldRow k={T('عمال تم صرف أجورهم', 'Paid Workers')} v={fmtNum(gosiComp.numberOfPaidLaborers)} />
                      <FieldRow k={T('عمال لم تُصرف أجورهم', 'Unpaid Workers')} v={fmtNum(gosiComp.numberOfUnPaidLaborers)} />
                      <FieldRow k={T('نسبة العقود الموثقة', 'Contract Auth %')} v={gosiComp.caCompliancePercentage != null ? `${gosiComp.caCompliancePercentage}%` : null} />
                      <FieldRow k={T('عقود موثقة', 'Authenticated')} v={fmtNum(gosiComp.numberOfAUthenicated)} />
                      <FieldRow k={T('عقود غير موثقة', 'Unauthenticated')} v={fmtNum(gosiComp.numberOfUNAUthenicated)} />
                      <FieldRow k={T('فترة الالتزام', 'Period')} v={gosiComp.compliancePeriod} />
                    </div>
                  </SectionCard>
                )}

                {/* ── MoC Violations (financial + committee + emtethal) ── */}
                <SectionCard title={T('مخالفات وزارة التجارة', 'MoC Violations')} color="#ef4444">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <div style={{ padding: 12, background: 'rgba(239,68,68,.06)', borderRadius: 10, border: '1px solid rgba(239,68,68,.2)' }}>
                      <div style={{ fontSize: 11, color: 'var(--tx4)', marginBottom: 4 }}>{T('عدم إيداع القوائم', 'Financial Filing')}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: violations?.totalViolationCount > 0 ? C.red : 'var(--tx2)', direction: 'ltr' }}>{violations?.totalViolationCount ?? '—'}</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(239,68,68,.06)', borderRadius: 10, border: '1px solid rgba(239,68,68,.2)' }}>
                      <div style={{ fontSize: 11, color: 'var(--tx4)', marginBottom: 4 }}>{T('مخالفات اللجان', 'Committee')}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: caseViolations?.totalViolationCount > 0 ? C.red : 'var(--tx2)', direction: 'ltr' }}>{caseViolations?.totalViolationCount ?? '—'}</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(239,68,68,.06)', borderRadius: 10, border: '1px solid rgba(239,68,68,.2)' }}>
                      <div style={{ fontSize: 11, color: 'var(--tx4)', marginBottom: 4 }}>{T('الامتثال', 'Emtethal')}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: emtethal?.totalViolationCount > 0 ? C.red : 'var(--tx2)', direction: 'ltr' }}>
                        {emtethal?.totalViolationCount ?? (emtethal?.error ? T('غير متاح','N/A') : '—')}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* ── Qawaem yearly filing ── */}
                {qawaem?.qawaemList && (
                  <SectionCard title={T('القوائم المالية المُودَعة', 'Filed Financial Statements')} color="#a78bfa" count={qawaem.total}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                      {qawaem.qawaemList.map(y => (
                        <div key={y.year} style={{ padding: '10px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--tx5)', marginBottom: 4 }}>{T('سنة', 'Year')} {y.year}</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: y.count > 0 ? '#22c55e' : '#ef4444', direction: 'ltr' }}>{y.count}</div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* ── Momrah municipal licenses ── */}
                {momrahList.length > 0 && (
                  <SectionCard title={T('رخص البلدية', 'Municipal Licenses')} color="#f97316" count={momrahList.length}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {momrahList.map((lic, i) => (
                        <div key={lic.licenseId || i} style={{ padding: 12, background: 'rgba(255,255,255,.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>{lic.shopName}</div>
                              <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 2 }}>{lic.amanaName} · {lic.baladiaName}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: lic.licenseStatus === 'سارية' ? 'rgba(34,197,94,.15)' : 'rgba(234,179,8,.15)', color: lic.licenseStatus === 'سارية' ? '#22c55e' : '#eab308', whiteSpace: 'nowrap' }}>{lic.licenseStatus}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0 16px' }}>
                            <FieldRow k={T('رقم الرخصة', 'License ID')} v={lic.licenseId} />
                            <FieldRow k={T('الحي', 'District')} v={lic.districtName} />
                            <FieldRow k={T('انتهاء (هجري)', 'End (Hijri)')} v={lic.licenseEndDateH} />
                            <FieldRow k={T('انتهاء (ميلادي)', 'End (Gregorian)')} v={lic.licenseEndDateM} />
                            <FieldRow k={T('متبقي (يوم)', 'Days Left')} v={lic.expirationLeftPeriod} />
                            <FieldRow k={T('النشاط', 'Activity')} v={lic.mainDetailActivity} />
                          </div>
                          {lic.printLicenseUrl && (
                            <a href={lic.printLicenseUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: C.gold, textDecoration: 'none', fontWeight: 700 }}>
                              ⇲ {T('طباعة الرخصة', 'Print License')}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* ── Documents (PDF downloads from Storage) ── */}
                <SectionCard title={T('ملفات السجل (PDF)', 'CR Documents (PDF)')} color="#9b59b6">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {[
                      { lang: 'ar', label: T('السجل التجاري — عربي', 'CR — Arabic'), available: !!printAr?.downloadUrl },
                      { lang: 'en', label: T('السجل التجاري — إنجليزي', 'CR — English'), available: !!printEn?.downloadUrl },
                      { lang: 'contract', label: T('عقد التأسيس', 'Founding Contract'), available: !!printContract?.downloadUrl && detail.entity_type_ar === 'شركة' },
                    ].map(({ lang, label, available }) => available ? (
                      <a key={lang}
                        href={`${STORAGE_BASE}-${lang}.pdf`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(155,89,182,.1)', border: '1px solid rgba(155,89,182,.4)', borderRadius: 10, color: '#bb8fce', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                        </svg>
                        {label}
                      </a>
                    ) : (
                      <div key={lang} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, color: 'var(--tx5)', fontSize: 12, fontWeight: 600 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {label} — {T('غير متاح', 'N/A')}
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* ── Detailed managers + partners (full data, beyond the right-rail summary) ── */}
                {(managersList.length > 0 || partnersList.length > 0) && (
                  <SectionCard title={T('المدراء والشركاء — تفاصيل كاملة', 'Managers & Partners — Full')} color="#bb8fce">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx5)', marginBottom: 8 }}>{T('المدراء', 'Managers')} ({managersList.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {managersList.map((m, i) => {
                            const pi = m.personInfo || {}
                            const name = [pi.firstNameAr, pi.fatherNameAr, pi.grandFatherNameAr, pi.familyNameAr].filter(Boolean).join(' ')
                            return (
                              <div key={i} style={{ padding: 10, background: 'rgba(255,255,255,.025)', borderRadius: 8, fontSize: 11.5 }}>
                                <div style={{ fontWeight: 700, color: 'var(--tx2)' }}>{name || '—'}</div>
                                <div style={{ color: 'var(--tx5)', marginTop: 3 }}>
                                  {m.managerType?.managerTypeDescriptionAr} · {pi.nationality?.nationalityDescriptionAr}
                                </div>
                                {pi.identifierNo && <div style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--tx4)', direction: 'ltr', marginTop: 3 }}>{pi.identifierType?.identifierTypeDescAr}: {pi.identifierNo}</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx5)', marginBottom: 8 }}>{T('الشركاء', 'Partners')} ({partnersList.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {partnersList.map((p, i) => {
                            const pi = p.personInfo
                            const name = pi
                              ? [pi.firstNameAr, pi.fatherNameAr, pi.grandFatherNameAr, pi.familyNameAr].filter(Boolean).join(' ')
                              : (p.saudiCompany?.nameAr || p.establishment?.nameAr || p.gccCompany?.nameAr || p.foreignCompany?.nameAr || '—')
                            const share = p.partnerShare
                            return (
                              <div key={i} style={{ padding: 10, background: 'rgba(255,255,255,.025)', borderRadius: 8, fontSize: 11.5 }}>
                                <div style={{ fontWeight: 700, color: 'var(--tx2)' }}>{name}</div>
                                <div style={{ color: 'var(--tx5)', marginTop: 3 }}>{p.parityType?.parityTypeDescriptionAr}</div>
                                {share?.totalContributionCount != null && (
                                  <div style={{ color: 'var(--tx4)', marginTop: 3, direction: 'ltr' }}>
                                    {T('الحصص', 'Shares')}: {num(share.totalContributionCount)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                )}

                {/* ── Contact info ── */}
                {(contact.phoneNo || contact.mobileNo || contact.email || contact.websiteURL) && (
                  <SectionCard title={T('معلومات الاتصال', 'Contact Information')} color="#5dade2">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 24px' }}>
                      <FieldRow k={T('الهاتف', 'Phone')} v={contact.phoneNo} />
                      <FieldRow k={T('الجوال', 'Mobile')} v={saMobile(contact.mobileNo)} />
                      <FieldRow k={T('البريد الإلكتروني', 'Email')} v={contact.email} />
                      <FieldRow k={T('الموقع', 'Website')} v={contact.websiteURL} />
                    </div>
                  </SectionCard>
                )}
              </>
            )
          })()}
        </div>
        )
      })()}

      {/* ═══ Add Facility Modal — FormKit ═══ */}
      {showAdd && (
        <FKModal open onClose={() => { if (!adding) setShowAdd(false) }} accent={C.gold} width={640} scroll
          title={T('إضافة منشأة', 'Add Facility')} Icon={Building2}
          footer={
            <button onClick={saveManualFacility} disabled={adding} className="fac-add-btn">
              <span>{adding ? T('جاري الحفظ…', 'Saving…') : T('حفظ', 'Save')}</span>
              <span className="nav-ico">
                {adding
                  ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'fac-spin .7s linear infinite' }} />
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </span>
            </button>
          }>
          <style>{`.fac-add-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.fac-add-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.fac-add-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.fac-add-btn:disabled{opacity:.5;cursor:not-allowed}@keyframes fac-spin{to{transform:rotate(360deg)}}`}</style>
                <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '20px 22px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -10, [lang === 'en' ? 'left' : 'right']: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 22V12h6v10"/><line x1="3" y1="12" x2="21" y2="12"/>
                    </svg>
                    <span>{T('بيانات المنشأة', 'Facility Data')}</span>
                  </div>
                  {(() => {
                    const sF = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxSizing: 'border-box', textAlign: 'center', transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }
                    const Lbl = ({ children, req }) => <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }}>{children}{req && <span style={{ color: C.red, marginRight: 2 }}>*</span>}</div>
                    const set = (k, v) => setAddForm(p => ({ ...p, [k]: v }))
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 16 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <Lbl req>{T('اسم المنشأة بالعربي', 'Arabic Facility Name')}</Lbl>
                          <input value={addForm.name_ar} onChange={e => set('name_ar', e.target.value)} placeholder={T('شركة …', 'Company …')} style={{ ...sF, direction: 'rtl', textAlign: 'right' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <Lbl>{T('اسم المنشأة بالإنجليزي', 'English Facility Name')}</Lbl>
                          <input value={addForm.name_en} onChange={e => set('name_en', e.target.value)} placeholder="Company …" style={{ ...sF, direction: 'ltr', textAlign: 'left' }} />
                        </div>
                        <div>
                          <Lbl>{T('الرقم الموحد', 'Unified Number')}</Lbl>
                          <input value={addForm.unified_number} onChange={e => set('unified_number', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="7XXXXXXXXX" inputMode="numeric" maxLength={10} style={{ ...sF, direction: 'ltr' }} />
                        </div>
                        <div>
                          <Lbl>{T('رقم التأمينات', 'GOSI Number')}</Lbl>
                          <input value={addForm.gosi_number} onChange={e => set('gosi_number', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="XXXXXXXXX" inputMode="numeric" maxLength={12} style={{ ...sF, direction: 'ltr' }} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <Lbl>{T('رقم الموارد البشرية', 'HRSD Number')}</Lbl>
                          <input value={addForm.hrsd_number} onChange={e => set('hrsd_number', e.target.value)} placeholder="18-XXXXXXX" style={{ ...sF, direction: 'ltr' }} />
                        </div>
                      </div>
                    )
                  })()}
                </div>
        </FKModal>
      )}

    </div>
  )
}
