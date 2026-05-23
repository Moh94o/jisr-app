import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildBookmarklet, buildPdfBookmarklet } from './sbcSyncBookmarklet.js'

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
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</span>
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

// Reusable collapsible card — click header to expand/collapse. Used for cards
// that contain a lot of fields the user usually skips (e.g. WPS compliance).
// Matches the same chrome + chevron pattern as ActivitiesCard below.
function CollapsibleCard({ title, color, badge, defaultExpanded = false, children, showSbcIcon = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <div style={cardChrome}>
      <div
        onClick={() => setExpanded(v => !v)}
        style={{ ...cardHeader, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
        {showSbcIcon && <SbcSourceIcon />}
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
function DragBookmark({ href, label, accent, title, icon }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.setAttribute('href', href) }, [href])
  return (
    <a
      ref={ref}
      title={title}
      onClick={e => e.preventDefault()}
      draggable="true"
      style={{
        height: 38, padding: '0 16px', borderRadius: 10,
        background: `linear-gradient(180deg, ${accent}26 0%, ${accent}14 100%)`,
        border: `1.5px solid ${accent}`,
        color: accent,
        textDecoration: 'none', fontFamily: F, fontSize: 12.5, fontWeight: 800,
        cursor: 'grab',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        boxShadow: `0 4px 14px ${accent}33, inset 0 1px 0 rgba(255,255,255,.06)`,
        transition: '.15s', userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `linear-gradient(180deg, ${accent}3A 0%, ${accent}22 100%)`; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.background = `linear-gradient(180deg, ${accent}26 0%, ${accent}14 100%)`; e.currentTarget.style.transform = 'translateY(0)' }}>
      {icon}
      {label}
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
      label={T('مزامنة المركز السعودي', 'Sync SBC')}
      icon={(
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      )}
    />
  )
}

export default function SbcFacilities({ sb, toast, user, lang, personFilter, onTriggerSync, syncPersonId, onBack }) {
  const T = (ar, en) => (lang || 'ar') !== 'en' ? ar : en

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({ owner: '', partnersMin: '', partnersMax: '', city: '', status: '', crNumber: '', crNational: '', managersMin: '', managersMax: '', sortConfirm: '', sortIssue: '', nitaq: '' })
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
  // Person-scoped MoC violations stats fetched from sbc_dashboard_stats via sync_persons.
  const [personStats, setPersonStats] = useState(null)
  // Extended per-facility data pulled from sbc_sync_debug (response bodies for
  // each endpoint we synced). Keyed by short endpoint name → latest payload.
  // Populated on detail open via the useEffect below; reset when detail closes.
  const [extDetail, setExtDetail] = useState(null)
  const [extDetailLoading, setExtDetailLoading] = useState(false)

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

  useEffect(() => { load() }, [load])
  useEffect(() => { loadProvenance() }, [loadProvenance, rows.length])

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

  // Distinct HRSD Nitaq values present in the loaded rows — powers the
  // nitaq dropdown filter. Empty rows (no HRSD data yet) are skipped.
  const nitaqOptions = useMemo(() => {
    const set = new Set()
    for (const r of rows) if (r.hrsd_nitaq_name) set.add(r.hrsd_nitaq_name)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [rows])

  // Distinct partner roster across all (operator-scoped) rows — powers the
  // owner/partner dropdown filter. Keyed by national id when present, falling
  // back to the display name for entities with no id surfaced by SBC.
  const partnerOptions = useMemo(() => {
    const map = new Map()
    for (const r of normalized) {
      for (const p of (r._partners || [])) {
        const { name, id } = extractPartyDisplay(p)
        if (!name && !id) continue
        const key = id || name
        if (!map.has(key)) map.set(key, { id: id || '', name: name || '—' })
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
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
      out = out.filter(r => {
        if ([r.entity_full_name_ar, r.entity_full_name_en, r.cr_number, r.cr_national_number, r._city, r._status]
          .some(v => String(v || '').toLowerCase().includes(q))) return true
        if ((r._partners || []).some(p => personBlob(p).includes(q))) return true
        if ((r._managers || []).some(p => personBlob(p).includes(q))) return true
        return false
      })
    }
    const oq = (adv.owner || '').trim()
    if (oq) out = out.filter(r => (r._partners || []).some(p => {
      const pid = String(p?.personInfo?.identifierNo || extractPartyDisplay(p).id || '')
      return pid === oq
    }))
    if (adv.crNumber.trim()) out = out.filter(r => String(r.cr_number || '').includes(adv.crNumber.trim()))
    if (adv.crNational.trim()) out = out.filter(r => String(r.cr_national_number || '').includes(adv.crNational.trim()))
    if (adv.city.trim()) out = out.filter(r => String(r._city || '').toLowerCase().includes(adv.city.trim().toLowerCase()))
    if (adv.status.trim()) out = out.filter(r => String(r._status || '').toLowerCase().includes(adv.status.trim().toLowerCase()))
    const pMin = parseInt(adv.partnersMin), pMax = parseInt(adv.partnersMax)
    if (!isNaN(pMin)) out = out.filter(r => (r._partnersCount ?? 0) >= pMin)
    if (!isNaN(pMax)) out = out.filter(r => (r._partnersCount ?? 0) <= pMax)
    const mMin = parseInt(adv.managersMin), mMax = parseInt(adv.managersMax)
    if (!isNaN(mMin)) out = out.filter(r => ((r._managers || []).length) >= mMin)
    if (!isNaN(mMax)) out = out.filter(r => ((r._managers || []).length) <= mMax)
    if (adv.nitaq) out = out.filter(r => r.hrsd_nitaq_name === adv.nitaq)
    return out
  }, [normalized, search, filter, adv, personFilter])

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
        <div style={{ flex: 1, minWidth: 0 }}>
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
              {T('المنشآت والعمالة', 'Facilities & workforce')}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            {T('جميع المنشآت والعمّال — كل قيمة تحمل مصدرها وآخر تاريخ مزامنة.',
               'All facilities and workers — every value carries its source and last sync time.')}
          </div>
        </div>
        <SbcSyncBookmarklet syncPersonId={syncPersonId} T={T} />
      </div>

      {err && <Card style={{ marginBottom: 14, borderColor: 'rgba(192,57,43,.35)', background: 'rgba(192,57,43,.06)' }}>
        <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{err}</div>
      </Card>}

      {isInitiallyEmpty && (
        <div style={{
          position: 'relative',
          padding: '64px 32px',
          borderRadius: 20,
          background: 'linear-gradient(180deg,#222 0%,#1a1a1a 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 8px 28px rgba(0,0,0,.28)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', gap: 14,
        }}>
          {/* radial glow */}
          <div style={{ position: 'absolute', insetInlineStart: '50%', top: -120, width: 360, height: 360, transform: 'translateX(-50%)', borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}1A 0%, transparent 65%)`, pointerEvents: 'none' }} />

          {/* Icon mark */}
          <div style={{
            position: 'relative',
            width: 72, height: 72, borderRadius: 18,
            background: `linear-gradient(135deg, ${C.gold}26, ${C.gold}08)`,
            border: `1.5px solid ${C.gold}55`,
            color: C.gold,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px ${C.gold}22, inset 0 1px 0 rgba(255,255,255,.08)`,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/>
            </svg>
          </div>

          <div style={{ position: 'relative', fontSize: 20, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.3px' }}>
            {T('ابدأ بمزامنة سجلاتك التجارية', 'Start syncing your commercial records')}
          </div>
          <div style={{ position: 'relative', fontSize: 13, fontWeight: 500, color: 'var(--tx4)', lineHeight: 1.7, maxWidth: 540 }}>
            {T(
              'اسحب زر «مزامنة المركز السعودي» إلى شريط الإشارات في متصفحك، افتح بوابة تيسير وسجّل بنفاذ، ثم اضغط الإشارة. كل المنشآت اللي يقدر حسابك يشوفها بتنزل هنا تلقائياً.',
              'Drag the "Sync SBC" button to your browser bookmarks bar, open the Tayseer portal and log in with Nafath, then click the bookmark. Every facility your account can see will land here automatically.',
            )}
          </div>

          <div style={{ position: 'relative', marginTop: 8 }}>
            <SbcSyncBookmarklet syncPersonId={syncPersonId} T={T} />
          </div>

          {/* 3-step mini guide */}
          <div style={{ position: 'relative', marginTop: 18, display: 'inline-flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 720 }}>
            {[
              { n: '1', t: T('ثبّت الإشارة', 'Install bookmark'), s: T('اسحب الزر الذهبي إلى شريط الإشارات', 'Drag the gold button to bookmarks bar') },
              { n: '2', t: T('افتح تيسير', 'Open Tayseer'), s: T('سجّل دخول بنفاذ بهوية مهدي', 'Login via Nafath') },
              { n: '3', t: T('اضغط الإشارة', 'Click bookmark'), s: T('انتظر «✅» — كل السجلات تنزل تلقائياً', 'Wait for "✅" — records flow in') },
            ].map(step => (
              <div key={step.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: '0 1 220px' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${C.gold}1A`, border: `1px solid ${C.gold}40`, color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {step.n}
                </div>
                <div style={{ textAlign: 'start' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx2)' }}>{step.t}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--tx5)', marginTop: 2, lineHeight: 1.5 }}>{step.s}</div>
                </div>
              </div>
            ))}
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
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي المنشآت','Total Facilities')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(counts.total)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold }} /> {num(counts.main)} {T('رئيسية','main')}
            </span>
            <span style={{ fontSize: 11, color: C.blue, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} /> {num(counts.branches)} {T('فرع','branch')}
            </span>
            {counts.liquidation > 0 && (
              <span style={{ fontSize: 11, color: C.red, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} /> {num(counts.liquidation)} {T('تصفية','liquidation')}
              </span>
            )}
          </div>
        </div>

        {/* CR status — donut chart, 4 states:
            نشط (annual confirm date not yet due) / في فترة التأكيد السنوي (within 90-day grace) /
            معلّق (past grace, active concern) / مشطوب (permanently removed). */}
        {(() => {
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
            { k: 'confirm',   l: T('في فترة التأكيد السنوي','In annual confirm'),  v: statusBuckets.confirm,   c: C.gold },
            { k: 'suspended', l: T('معلّق','Suspended'),                           v: statusBuckets.suspended, c: C.red },
            { k: 'cancelled', l: T('مشطوب','Struck off'),                          v: statusBuckets.cancelled, c: C.gray },
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
        {(() => {
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

      {/* Search bar + advanced toggle — matches Invoices page filter row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: advOpen ? 10 : 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', top: '50%', insetInlineEnd: 14, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={T('ابحث بالاسم، السجل، المدينة، المالك، المدير…', 'Search by name, CR, city, owner, manager…')}
            style={{ width: '100%', height: 44, padding: '0 38px 0 14px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <button type="button" onClick={() => setAdvOpen(v => !v)}
          style={{ padding: '0 16px', height: 44, borderRadius: 12,
            border: `1px solid ${advOpen || advCount ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.05)'}`,
            background: advOpen || advCount ? 'rgba(212,160,23,.08)' : 'rgba(0,0,0,.18)',
            color: advOpen || advCount ? C.gold : 'var(--tx)',
            fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8, transition: '.15s' }}>
          <span>{T('بحث متقدم', 'Advanced')}</span>
          {advCount > 0 ? (
            <span style={{ background: C.gold, color: '#1a1a1a', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999 }}>{advCount}</span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          )}
        </button>
        {(search || advCount > 0) && <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{resultCount} {T('نتيجة', 'results')}</span>}
      </div>

      {/* Advanced search panel — matches Invoices page filter panel */}
      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>{T('فلاتر متقدمة', 'Advanced Filters')}</div>
            {advCount > 0 && (
              <button type="button" onClick={() => setAdv({ owner: '', partnersMin: '', partnersMax: '', city: '', status: '', crNumber: '', crNational: '', managersMin: '', managersMax: '', sortConfirm: '', sortIssue: '', nitaq: '' })} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.08)', color: C.red, fontFamily: F, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{T('مسح الكل', 'Clear all')}</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={advLbl}>{T('اسم المالك / الشريك', 'Owner / Partner')}</label>
              <select value={adv.owner} onChange={e => setAdv(a => ({ ...a, owner: e.target.value }))} style={{ ...advInp, padding: '0 10px', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center' }}>
                <option value="">{T('الكل', 'All')} ({partnerOptions.length})</option>
                {partnerOptions.map(p => (
                  <option key={p.id || p.name} value={p.id || p.name}>{p.name}{p.id ? ` · ${p.id}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={advLbl}>{T('رقم السجل التجاري', 'CR Number')}</label>
              <input value={adv.crNumber} onChange={e => setAdv(a => ({ ...a, crNumber: e.target.value }))} placeholder="10XXXXXXXX" style={{ ...advInp, direction: 'ltr', textAlign: 'center' }}/>
            </div>
            <div>
              <label style={advLbl}>{T('الرقم الموحد', 'Unified Nat. No.')}</label>
              <input value={adv.crNational} onChange={e => setAdv(a => ({ ...a, crNational: e.target.value }))} placeholder="7XXXXXXXXX" style={{ ...advInp, direction: 'ltr', textAlign: 'center' }}/>
            </div>
            <div>
              <label style={advLbl}>{T('المدينة', 'City')}</label>
              <input value={adv.city} onChange={e => setAdv(a => ({ ...a, city: e.target.value }))} placeholder={T('الرياض، جدة…', 'Riyadh, Jeddah…')} style={advInp}/>
            </div>
            <div>
              <label style={advLbl}>{T('حالة السجل', 'CR Status')}</label>
              <input value={adv.status} onChange={e => setAdv(a => ({ ...a, status: e.target.value }))} placeholder={T('سارٍ، منتهي…', 'Active, expired…')} style={advInp}/>
            </div>
            <div>
              <label style={advLbl}>{T('نطاق المنشأة', 'Nitaq')}</label>
              <select value={adv.nitaq} onChange={e => setAdv(a => ({ ...a, nitaq: e.target.value }))} style={{ ...advInp, padding: '0 10px', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center' }}>
                <option value="">{T('الكل', 'All')} ({nitaqOptions.length})</option>
                {nitaqOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={advLbl}>{T('عدد الملاك', 'Partners count')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input inputMode="numeric" value={adv.partnersMin} onChange={e => setAdv(a => ({ ...a, partnersMin: e.target.value.replace(/\D/g,'') }))} placeholder={T('من', 'Min')} style={{ ...advInp, direction: 'ltr', textAlign: 'center' }}/>
                <input inputMode="numeric" value={adv.partnersMax} onChange={e => setAdv(a => ({ ...a, partnersMax: e.target.value.replace(/\D/g,'') }))} placeholder={T('إلى', 'Max')} style={{ ...advInp, direction: 'ltr', textAlign: 'center' }}/>
              </div>
            </div>
            <div>
              <label style={advLbl}>{T('عدد المدراء', 'Managers count')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input inputMode="numeric" value={adv.managersMin} onChange={e => setAdv(a => ({ ...a, managersMin: e.target.value.replace(/\D/g,'') }))} placeholder={T('من', 'Min')} style={{ ...advInp, direction: 'ltr', textAlign: 'center' }}/>
                <input inputMode="numeric" value={adv.managersMax} onChange={e => setAdv(a => ({ ...a, managersMax: e.target.value.replace(/\D/g,'') }))} placeholder={T('إلى', 'Max')} style={{ ...advInp, direction: 'ltr', textAlign: 'center' }}/>
              </div>
            </div>
            <div>
              <label style={advLbl}>
                {T('ترتيب حسب تاريخ التأكيد', 'Sort by confirm date')}
                {adv.sortConfirm && adv.sortIssue && <span style={{ marginInlineStart: 6, fontSize: 10, color: C.gold, fontWeight: 700 }}>{T('· رئيسي', '· primary')}</span>}
              </label>
              <select value={adv.sortConfirm} onChange={e => setAdv(a => ({ ...a, sortConfirm: e.target.value }))} style={{ ...advInp, padding: '0 10px', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center' }}>
                <option value="">{T('بدون ترتيب', 'No sort')}</option>
                <option value="asc">{T('تصاعدي · الأقدم أولاً', 'Ascending · oldest first')}</option>
                <option value="desc">{T('تنازلي · الأحدث أولاً', 'Descending · newest first')}</option>
              </select>
            </div>
            <div>
              <label style={advLbl}>
                {T('ترتيب حسب تاريخ الإصدار', 'Sort by issue date')}
                {adv.sortConfirm && adv.sortIssue && <span style={{ marginInlineStart: 6, fontSize: 10, color: C.blue, fontWeight: 700 }}>{T('· ثانوي', '· secondary')}</span>}
              </label>
              <select value={adv.sortIssue} onChange={e => setAdv(a => ({ ...a, sortIssue: e.target.value }))} style={{ ...advInp, padding: '0 10px', cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 12px center' }}>
                <option value="">{T('بدون ترتيب', 'No sort')}</option>
                <option value="asc">{T('تصاعدي · الأقدم أولاً', 'Ascending · oldest first')}</option>
                <option value="desc">{T('تنازلي · الأحدث أولاً', 'Descending · newest first')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{num(displayRows.length)} {T('منشأة','facilities')}</span>
        {displayRows.length !== rows.length && <span style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('من أصل','out of')} {num(rows.length)}</span>}
      </div>

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
          .sbcv-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12.5px;font-weight:700;text-align:center;padding:14px 5px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
          .sbcv-tbl thead .hd-icon{color:${C.gold};display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;vertical-align:middle}
          .sbcv-tbl thead .hd-icon svg{width:14px;height:14px;display:block}
          .sbcv-tbl tbody td{padding:10px 5px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.02)}
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

        {/* Facility table */}
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
                        <DateRow label={T('الإصدار','Issued')} value={r._issueDate} T={T} />
                        <DateRow label={T('التأكيد','Confirm')} value={r._confirmDate} T={T} confirm />
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
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

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
          gosi: 'التأمينات', chambers: 'الغرف التجارية', ajeer: 'أجير',
          mudad: 'مدد', zatca: 'الزكاة والدخل',
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

        const Field = ({ k, v, prov = sbcProv }) => (
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
            <span style={{ fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span>
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
        const PersonRow = ({ p, roleAr }) => {
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
            <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
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
                </div>
                {expanded && (hasDetails || p.partnerShare || p.parityType) && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {idValue && <span style={{ fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>{idLabel}: {idValue}</span>}
                    {natAr && !isCompany && <span>· {natAr}</span>}
                    {dob && <span>· {T('مواليد', 'DOB')} {dob}</span>}
                    {/* Partner-specific extras — only when partnerShare data is present.
                        Show parityType (e.g. "شريك") + share counts. */}
                    {p.parityType?.parityTypeDescriptionAr && (
                      <span>· {p.parityType.parityTypeDescriptionAr}</span>
                    )}
                    {p.partnerShare?.totalContributionCount != null && (
                      <span style={{ color: C.gold, fontWeight: 700 }}>
                        · {T('إجمالي الحصص', 'Total shares')}: {fmtNum(p.partnerShare.totalContributionCount)}
                      </span>
                    )}
                    {p.partnerShare?.cashContributionCount != null && Number(p.partnerShare.cashContributionCount) > 0 && (
                      <span>· {T('نقدية', 'Cash')}: {fmtNum(p.partnerShare.cashContributionCount)}</span>
                    )}
                    {p.partnerShare?.inkindContributionCount != null && Number(p.partnerShare.inkindContributionCount) > 0 && (
                      <span>· {T('عينية', 'In-kind')}: {fmtNum(p.partnerShare.inkindContributionCount)}</span>
                    )}
                    {/* Company-partner extras — CR number when the partner is an entity */}
                    {isCompany && extracted.id && extracted.id !== idValue && (
                      <span style={{ fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>
                        · {T('سجل', 'CR')}: {extracted.id}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {roleAr && <span style={{ fontSize: 9.5, fontWeight: 800, color: C.gold, whiteSpace: 'nowrap', textAlign: 'end' }}>{roleAr}</span>}
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
        const hrsd = {
          officeId: liveHrsd?.establishmentFileNumber?.laborOfficeIdField ?? detail.hrsd_labor_office_id,
          sequenceNumber: liveHrsd?.establishmentFileNumber?.sequenceNumberField ?? detail.hrsd_sequence_number,
          officeName: liveHrsd?.laboerOfficeName ?? detail.hrsd_labor_office_name,
          nitaqCode: liveHrsd?.nitaq?.code ?? detail.hrsd_nitaq_code,
          nitaqName: liveHrsd?.nitaq?.nameLocal ?? detail.hrsd_nitaq_name,
          activityName: liveHrsd?.nitaqatEconomicActivity?.nameLocal ?? detail.hrsd_nitaqat_activity_name,
          saudiLaborers: liveHrsd?.saudiLaborers ?? detail.hrsd_saudi_laborers,
          foreignLaborers: liveHrsd?.foreignLaborers ?? detail.hrsd_foreign_laborers,
          totalLaborers: liveHrsd?.totalLaborers ?? detail.hrsd_total_laborers,
          issuedPermits: liveHrsd?.totalIssuedWorkPermits ?? detail.hrsd_total_issued_permits,
          expiredPermits: liveHrsd?.totalExpiredWorkPermits ?? detail.hrsd_total_expired_permits,
          expiringPermits: liveHrsd?.totalAboutToExpireWorkPermits ?? detail.hrsd_total_expiring_permits,
          saudiPercentage: liveHrsd?.entity_Saudi_Percentage ?? detail.hrsd_saudi_percentage,
        }
        // Always show both sections now (per user request to always fetch). Loading/error states handle UX.
        const hasGosi = true
        const hasHrsd = true
        const prov = provByCr[detail.cr_number] || []
        return (
        <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
          {/* Top bar — Back + sync trigger (mirrors FacilityDetailPage top bar) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setDetail(null)} title={T('رجوع','Back')}
              style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              <span>{T('رجوع','Back')}</span>
            </button>
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
          </div>

          {/* 2-column layout — main content + sidebar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
            {/* Main column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Identifiers card — CR/national numbers + all government authority registrations
                  consolidated into a single panel so the user sees every "official number" in one place.
                  Compact inline layout (label left + value right) to stay within original card height. */}
              {(() => {
                const authorities = [
                  { ar: 'الزكاة والضريبة', en: 'ZATCA',                    fullAr: 'هيئة الزكاة والضريبة والجمارك',              color: '#0f766e', n: detail.zakat_tax_number },
                  { ar: 'التأمينات الاجتماعية', en: 'GOSI',                  fullAr: 'المؤسسة العامة للتأمينات الاجتماعية',          color: '#22c55e', n: detail.gosi_registration_number },
                  { ar: 'العنوان الوطني',  en: 'SPL',                      fullAr: 'اشتراك العنوان الوطني للسجل التجاري',         color: '#06b6d4', n: detail.spl_national_address_id },
                  { ar: 'الغرف التجارية',  en: 'Chamber of Commerce',      fullAr: 'اتحاد الغرف التجارية السعودية',               color: '#0ea5e9', n: detail.coc_chamber_number },
                  { ar: 'المقاولين',       en: 'Contractors Authority',    fullAr: 'الهيئة السعودية للمقاولين',                   color: '#f59e0b', n: detail.sca_contractor_number },
                  { ar: 'الموارد البشرية', en: 'HRSD / Qiwa',              fullAr: 'وزارة الموارد البشرية والتنمية الاجتماعية',    color: '#16a085', n: detail.hrsd_labor_office_id != null && detail.hrsd_sequence_number != null ? `${detail.hrsd_labor_office_id}-${detail.hrsd_sequence_number}` : (detail.hrsd_labor_office_id != null ? String(detail.hrsd_labor_office_id) : null) },
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
                      <div style={rowGold}>
                        <span style={{ ...lbl, color: C.gold }}>{T('السجل التجاري', 'CR Number')}</span>
                        <CopyableNumber value={detail.cr_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                      </div>
                      {authorities.map((row, i) => (
                        <div key={i} style={rowGold} title={T(row.fullAr, row.en)}>
                          <span style={{ ...lbl, color: C.gold, overflow: 'hidden', textOverflow: 'ellipsis' }}>{T(row.ar, row.en)}</span>
                          <CopyableNumber value={row.n} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                        </div>
                      ))}
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
                    {partners.map((p, i) => {
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
                    {managers.map((m, i) => <PersonRow key={i} p={m} roleAr={T('مدير', 'Manager')} />)}
                  </div>
                </div>
              )}

              {/* Classification card — merged with the "Full CR Data" fields
                   so all non-duplicate CR attributes live in one place. The
                   pair Gregorian/Hijri date row appears at the bottom. */}
              {(() => {
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
                const Row = ({ k, v, fullWidth }) => (
                  <div style={{ ...rowBase, ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
                    <span style={lbl}>{k}</span>
                    <span style={val} title={typeof v === 'string' ? v : undefined}>{v != null && v !== '' ? v : '—'}</span>
                  </div>
                )
                return (
                  <CollapsibleCard title={T('معلومات الاتصال', 'Contact Information')} color="#5dade2" showSbcIcon>
                    <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <Row k={T('الهاتف', 'Phone')} v={contact.phoneNo} />
                      <Row k={T('الجوال', 'Mobile')} v={contact.mobileNo} />
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
                          <Field k={T('الرقم الموحد (وزارة العمل)', 'MoL Unified No.')} v={molUnified} />
                          <Field k={T('معرّف مكتب العمل', 'MoL Office ID')} v={gosiFile?.molofficeID} />
                          <Field k={T('الرقم الموحد (موارد بشرية)', 'MoL Unified ID')} v={gosiFile?.moluniID} />
                          <Field k={T('معرّف الملف (MoL Est ID)', 'MoL Establishment ID')} v={gosiFile?.molEstID} />
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
                    {hrsdState === 'error' && hrsd.totalLaborers == null && !hrsd.officeName && (
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
                      <div style={cardChrome}>
                        <div style={cardHeader}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />
                          <SbcSourceIcon />
                          <span style={cardTitle}>{T('رخص البلدية', 'Municipal Licenses')}</span>
                          <span style={{ marginInlineStart: 'auto', fontSize: 11, color: '#f97316', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f9731614' }}>{num(momrahList.length)}</span>
                        </div>
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
                      </div>
                    )}

                    {/* ملفات السجل (PDF) — with inline thumbnail previews.
                        Each available PDF renders inside a sandboxed <iframe>
                        zoomed-to-fit; clicking the preview (or its label) opens
                        the file full-screen in a new tab. Unavailable variants
                        get a dim placeholder so the layout stays balanced. */}
                    <div style={cardChrome}>
                      <div style={cardHeader}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9b59b6' }} />
                        <SbcSourceIcon />
                        <span style={cardTitle}>{T('ملفات السجل (PDF)', 'CR Documents (PDF)')}</span>
                      </div>
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
                    </div>

                    {/* (Contact info card was moved up — now sits right
                         after the Facility card per user request) */}
                  </>
                )
              })()}

            </div>

            {/* Sidebar */}
            <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Status summary */}
              <div style={cardChrome}>
                <div style={cardHeader}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.fg }} />
                  <span style={cardTitle}>{T('حالة السجل التجاري','CR Status')}</span>
                  {(() => {
                    if (!detail._confirmDate) return null
                    const t = new Date(detail._confirmDate).getTime()
                    if (Number.isNaN(t)) return null
                    const daysDiff = Math.floor((Date.now() - t) / 86400000)
                    let remain, nextColor, tip
                    if (daysDiff < 0) {
                      remain = -daysDiff
                      nextColor = '#eab308'
                      tip = T('يوم حتى الدخول في فترة التأكيد', 'days until confirmation window')
                    } else if (daysDiff <= 90) {
                      remain = 90 - daysDiff
                      nextColor = '#ef4444'
                      tip = T('يوم قبل تعليق السجل', 'days before suspension')
                    } else {
                      return null
                    }
                    return (
                      <span title={`${remain} ${tip}`}
                        style={{
                          marginInlineStart: 'auto',
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          color: nextColor, fontSize: 10.5, fontWeight: 800,
                          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                        }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span style={{ direction: 'ltr' }}>{remain}</span>
                        <span style={{ fontWeight: 600, opacity: .85 }}>{T('يوم','d')}</span>
                      </span>
                    )
                  })()}
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

              {/* Quick stats */}
              <div style={cardChrome}>
                <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} /><span style={cardTitle}>{T('السجلات','Records')}</span></div>
                <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    [T('الأنشطة','Activities'), activities.length],
                    [T('المدراء','Managers'), managers.length],
                    [T('الشركاء','Partners'), partners.length],
                    [T('عمال GOSI','GOSI Workers'), gosi.total],
                    [T('عمال HRSD','HRSD Workers'), hrsd.totalLaborers],
                    [T('رخص عمل','Permits'), hrsd.issuedPermits],
                  ].map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--tx4)' }}>{l}</span>
                      <span style={{ color: v != null && v > 0 ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{v != null ? num(v) : '—'}</span>
                    </div>
                  ))}
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
                      <FieldRow k={T('الجوال', 'Mobile')} v={contact.mobileNo} />
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

    </div>
  )
}
