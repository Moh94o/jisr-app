import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import SbcFacilities from './SbcFacilities.jsx'
import { buildBookmarklet } from './sbcSyncBookmarklet.js'
import { buildNafathBookmarklet } from './nafathSyncBookmarklet.js'
import NafathInAppLogin from './NafathInAppLogin.jsx'
import * as rolesService from '../services/rolesService.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4', purple: '#9b59b6' }

// Person color palette — used when a sync_person row has no color set yet.
const PERSON_PALETTE = ['#D4A017', '#3483b4', '#27a046', '#e67e22', '#9b59b6', '#ec4899', '#06b6d4', '#c0392b', '#f59e0b', '#14b8a6']

const fmtRelative = (iso, lang) => {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const sec = Math.floor((Date.now() - t) / 1000)
  const isAr = lang !== 'en'
  if (sec < 60) return isAr ? 'الآن' : 'just now'
  const mn = Math.floor(sec / 60); if (mn < 60) return isAr ? `قبل ${mn} دقيقة` : `${mn}m ago`
  const hr = Math.floor(mn / 60); if (hr < 24) return isAr ? `قبل ${hr} ساعة` : `${hr}h ago`
  const dy = Math.floor(hr / 24); if (dy < 30) return isAr ? `قبل ${dy} يوم` : `${dy}d ago`
  const mo = Math.floor(dy / 30); return isAr ? `قبل ${mo} شهر` : `${mo}mo ago`
}

const fmtTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
}

const personColor = (p) => p?.color || PERSON_PALETTE[0]

// Display-name selector — picks the right level of detail for each surface
// (avatar initial / compact chip / full official name) from the synced Nafath
// claims when available, otherwise from the operator alias.
//   mode='initial' → single character for avatars/badges
//   mode='short'   → "First Family" (e.g. "مهدي اليامي") for chips & lists
//   mode='full'    → full official name (e.g. "مهدي بن صالح بن محمد اليامي")
//                    for headers and canonical references
function personDisplayName(p, mode = 'short') {
  if (!p) return ''
  const raw = p.person?.nafath_raw || {}
  const fullAr = (p.person?.name_ar || raw.arFullName || p.name_ar || '').trim()
  const fullEn = (p.person?.name_en || raw.enFullName || p.name_en || '').trim()
  const first  = (raw.arFirst || '').trim()
  const family = (raw.arFamily || '').trim()
  const enFirst = (raw.enFirst || '').trim()
  const enFamily = (raw.enFamily || '').trim()

  if (mode === 'full') return fullAr || fullEn || '—'

  if (mode === 'short') {
    if (first && family) return `${first} ${family}`
    if (enFirst && enFamily) return `${enFirst} ${enFamily}`
    // Fallback: trim multi-part name to first+last word
    const src = fullAr || fullEn
    if (src) {
      const parts = src.split(/\s+/).filter(Boolean)
      if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1]}`
      return src
    }
    return '—'
  }

  // mode === 'initial' — prefer Latin letter for visual consistency in avatars.
  return (enFirst || fullEn || first || fullAr || '?').trim().charAt(0).toUpperCase()
}

const personInitial = (p) => personDisplayName(p, 'initial')

// Same ref-based bypass we used in SbcFacilities for javascript: URLs.
function BookmarkletLink({ href, title, children, style }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.setAttribute('href', href) }, [href])
  return (
    <a
      ref={ref}
      title={title}
      onClick={e => e.preventDefault()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: C.gold, color: '#1a1a1a', textDecoration: 'none', fontFamily: F, fontSize: 13, fontWeight: 900, borderRadius: 10, cursor: 'grab', boxShadow: '0 2px 8px rgba(212,160,23,.3)', ...style }}
    >
      {children}
    </a>
  )
}

// Sync-Hub source header: a draggable bookmarklet anchor styled as the
// brand-accent button, plus a copy-URL action. Clicking does nothing (the URL
// is for dragging to the bookmarks bar or copying). The "..." opens the full
// install panel with instructions.
function HeaderBookmarklet({ url, accent, label, buttonLabel, onMoreOptions, T }) {
  const ref = useRef(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (ref.current) ref.current.setAttribute('href', url) }, [url])
  const copy = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1400) } catch { /* ignore */ }
  }
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <a
        ref={ref}
        title={label}
        onClick={e => e.preventDefault()}
        draggable="true"
        style={{
          height: 34, padding: '0 14px', borderRadius: 8,
          background: 'transparent', border: `1px solid ${accent}`, color: accent,
          textDecoration: 'none', fontFamily: F, fontSize: 11, fontWeight: 800,
          cursor: 'grab', display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: '.15s', userSelect: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${accent}14` }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
        {buttonLabel}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
      </a>
      <button onClick={copy}
        title={T('نسخ رابط الإشارة','Copy bookmarklet URL')}
        style={{
          height: 34, width: 34, borderRadius: 8,
          background: copied ? '#22c55e18' : 'transparent',
          border: `1px solid ${copied ? '#22c55e88' : accent}`,
          color: copied ? '#22c55e' : accent,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.15s',
        }}
        onMouseEnter={e => { if (!copied) e.currentTarget.style.background = `${accent}14` }}
        onMouseLeave={e => { if (!copied) e.currentTarget.style.background = 'transparent' }}>
        {copied ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
      {onMoreOptions && (
        <button onClick={onMoreOptions}
          title={T('خيارات أخرى','More options')}
          style={{
            height: 34, width: 34, borderRadius: 8,
            background: 'transparent', border: `1px solid ${accent}55`, color: accent,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${accent}14` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
      )}
    </div>
  )
}

const SOURCE_GRADIENT = {
  sbc: 'linear-gradient(135deg, rgba(212,160,23,.12), rgba(212,160,23,.02))',
  qiwa: 'linear-gradient(135deg, rgba(39,160,70,.12), rgba(39,160,70,.02))',
  gosi: 'linear-gradient(135deg, rgba(52,131,180,.12), rgba(52,131,180,.02))',
  muqeem: 'linear-gradient(135deg, rgba(155,89,182,.12), rgba(155,89,182,.02))',
  mudad: 'linear-gradient(135deg, rgba(230,126,34,.12), rgba(230,126,34,.02))',
  zatca: 'linear-gradient(135deg, rgba(192,57,43,.12), rgba(192,57,43,.02))',
  ajeer: 'linear-gradient(135deg, rgba(6,182,212,.12), rgba(6,182,212,.02))',
  chambers: 'linear-gradient(135deg, rgba(236,72,153,.12), rgba(236,72,153,.02))',
}
const SOURCE_ACCENT = {
  sbc: '#9b59b6',      // المركز السعودي للأعمال — بنفسجي
  qiwa: '#3b82f6',     // قوى — أزرق
  muqeem: '#f59e0b',   // مقيم — برتقالي
  gosi: '#22c55e',     // التأمينات — أخضر
  chambers: '#06b6d4', // الغرف التجارية — أزرق مختلف (تركوازي)
  ajeer: '#eab308',    // أجير — أصفر
  mudad: '#0ea5e9',    // مدد — سماوي
  zatca: '#7dd3fc',    // هيئة الزكاة والدخل — سماوي فاتح
}

// Source-specific header meta — badge label and fallback description when
// sync_sources.description_ar is empty. Title itself comes from name_ar.
const SOURCE_META = {
  sbc:      { badgeAr: 'SBC · تيسير',            badgeEn: 'SBC · Tayseer',        descAr: 'استيراد ومقارنة سجلاتك التجارية من بوابة تيسير — كل مزامنة محفوظة بالتاريخ والتغييرات.', descEn: 'Import and diff your commercial records from Tayseer portal — every sync is timestamped and change-tracked.' },
  qiwa:     { badgeAr: 'قوى · وزارة الموارد',    badgeEn: 'Qiwa · MHRSD',         descAr: 'مزامنة العمالة والعقود والإنتاجية من منصة قوى.',                                      descEn: 'Sync workforce, contracts and productivity from Qiwa.' },
  gosi:     { badgeAr: 'GOSI · التأمينات',       badgeEn: 'GOSI',                 descAr: 'مزامنة اشتراكات التأمينات الاجتماعية والمشتركين.',                                     descEn: 'Sync GOSI subscriptions and registered employees.' },
  muqeem:   { badgeAr: 'مقيم · الجوازات',        badgeEn: 'Muqeem · MOI',         descAr: 'مزامنة بيانات الإقامات والرخص والمقيمين.',                                             descEn: 'Sync iqama, permits and resident data.' },
  mudad:    { badgeAr: 'مدد · حماية الأجور',     badgeEn: 'Mudad · WPS',          descAr: 'مزامنة الرواتب وحماية الأجور.',                                                       descEn: 'Sync payroll and wage-protection records.' },
  zatca:    { badgeAr: 'ZATCA · الزكاة والدخل',  badgeEn: 'ZATCA',                descAr: 'مزامنة الإقرارات الضريبية والفواتير الإلكترونية.',                                     descEn: 'Sync tax filings and e-invoices.' },
  ajeer:    { badgeAr: 'أجير · العمل المؤقت',    badgeEn: 'Ajeer',                descAr: 'مزامنة عقود العمل المؤقت.',                                                            descEn: 'Sync Ajeer temporary-work contracts.' },
  chambers: { badgeAr: 'الغرف التجارية',         badgeEn: 'Chambers',             descAr: 'مزامنة شهادات الغرف التجارية والعضويات.',                                              descEn: 'Sync chamber certifications and memberships.' },
}

export default function SyncHub({ sb, toast, user, lang }) {
  const T = (ar, en) => (lang || 'ar') !== 'en' ? ar : en

  const [persons, setPersons] = useState([])
  const [sources, setSources] = useState([])
  const [runs, setRuns] = useState([])
  const [changes, setChanges] = useState([])
  const [focused, setFocused] = useState(null)            // source.id being viewed in drill-down
  // Canonical totals + provenance rows for facilities — drives the
  // Facilities overview card on the hub.
  const [totalFacilities, setTotalFacilities] = useState(0)
  const [provRows, setProvRows] = useState([])

  useEffect(() => {
    const handler = (e) => {
      const sid = e.detail?.sourceId
      if (sid) setFocused(sid)
    }
    window.addEventListener('sync-focus-source', handler)
    return () => window.removeEventListener('sync-focus-source', handler)
  }, [])

  const load = useCallback(async () => {
    if (!sb) return
    const [pr, src, rn, ch, facCnt, prov] = await Promise.all([
      sb.from('sync_persons').select('*, person:persons!sync_persons_person_id_fkey(name_ar, name_en, id_number, nafath_raw, nafath_synced_at)').is('deleted_at', null).order('sort_order').order('name_ar'),
      sb.from('sync_sources').select('*').eq('enabled', true).order('sort_order'),
      sb.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(500),
      sb.from('sync_changes').select('*').order('detected_at', { ascending: false }).limit(200),
      sb.from('facilities').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      sb.from('v_facility_provenance').select('facility_id, source_id, sync_person_id, last_synced_at, person_name_ar, person_color'),
    ])
    setPersons(pr.data || [])
    setTotalFacilities(facCnt?.count || 0)
    setProvRows(prov?.data || [])
    const fallbackSources = [
      { id: 'sbc', name_ar: 'المركز السعودي للأعمال', name_en: 'Saudi Business Center', sort_order: 1 },
      { id: 'qiwa', name_ar: 'قوى', name_en: 'Qiwa', sort_order: 2 },
      { id: 'muqeem', name_ar: 'مقيم', name_en: 'Muqeem', sort_order: 3 },
      { id: 'gosi', name_ar: 'التأمينات الاجتماعية', name_en: 'GOSI', sort_order: 4 },
      { id: 'chambers', name_ar: 'الغرف التجارية', name_en: 'Chambers', sort_order: 5 },
      { id: 'ajeer', name_ar: 'أجير', name_en: 'Ajeer', sort_order: 6 },
      { id: 'mudad', name_ar: 'مدد', name_en: 'Mudad', sort_order: 7 },
      { id: 'zatca', name_ar: 'هيئة الزكاة والدخل', name_en: 'ZATCA', sort_order: 8 },
    ]
    const dbSources = src.data || []
    const merged = fallbackSources.map(fb => dbSources.find(d => d.id === fb.id) || fb)
    setSources(merged)
    setRuns(rn.data || [])
    setChanges(ch.data || [])
  }, [sb])

  useEffect(() => { load() }, [load])

  // Coverage per source: how many distinct facilities have at least one
  // provenance entry from this source, plus the most-recent sync timestamp.
  // Drives the source-contribution pills on the facilities overview card.
  const coverageBySource = useMemo(() => {
    const m = {}
    for (const p of provRows) {
      const e = (m[p.source_id] ||= { facilityIds: new Set(), lastSyncedAt: null })
      e.facilityIds.add(p.facility_id)
      if (!e.lastSyncedAt || (p.last_synced_at && p.last_synced_at > e.lastSyncedAt)) e.lastSyncedAt = p.last_synced_at
    }
    const out = {}
    for (const sid of Object.keys(m)) {
      out[sid] = { facilities: m[sid].facilityIds.size, lastSyncedAt: m[sid].lastSyncedAt }
    }
    return out
  }, [provRows])

  const coveredFacilitiesCount = useMemo(() => {
    const all = new Set()
    for (const p of provRows) all.add(p.facility_id)
    return all.size
  }, [provRows])

  // Drilldown panels still consume these — passed as props to scoped views.
  const personName = (id) => persons.find(p => p.id === id)?.name_ar || '—'
  const sourceName = (id) => sources.find(s => s.id === id)?.name_ar || id
  const filteredChanges = changes

  // The bookmarklet still needs a person_id to write provenance with. With
  // operator UI gone, we just auto-pick the first sync_persons row (sorted by
  // sort_order/name on load). If there's none, the bookmarklet uses '' and
  // facility rows get NULL person_id.
  const defaultPersonId = persons[0]?.id || ''

  // ── Render ──
  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {!focused && (
        <Header T={T} lang={lang}
          focusedSource={null}
          runs={runs} changes={changes}
          onSync={null}
          bookmarkletUrl={null}
          onBack={() => setFocused(null)}
          onManagePersons={null}
          personsCount={0} />
      )}

      {!focused && (
        <>
          <FacilitiesOverviewCard
            totalFacilities={totalFacilities}
            coveredFacilities={coveredFacilitiesCount}
            onOpen={() => setFocused('sbc')}
            T={T} lang={lang}
          />
          <SyncActivitiesCard
            runs={runs}
            changes={changes}
            sources={sources}
            persons={persons}
            T={T} lang={lang}
          />
        </>
      )}

      {focused === 'sbc' && (
        <SbcDrilldown
          sb={sb} toast={toast} user={user} lang={lang}
          persons={persons}
          syncPersonId={defaultPersonId}
          onBack={() => setFocused(null)}
          filteredChanges={filteredChanges.filter(c => c.source_id === 'sbc')}
          personName={personName}
          T={T}
        />
      )}

      {focused === 'gosi' && (
        <GosiPanel T={T} />
      )}

      {focused && focused !== 'sbc' && focused !== 'gosi' && (
        <ComingSoonPanel sourceId={focused} sourceName={sourceName(focused)} onBack={() => setFocused(null)} T={T} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Header — Persons-style for overview; source-branded for drilldown
// ═══════════════════════════════════════════════════════════════
function Header({ T, lang, focusedSource, runs, changes, onSync, bookmarkletUrl, onBack, onManagePersons, personsCount }) {
  const latestRun = runs[0]
  const changesLast7d = changes.filter(c => {
    const t = new Date(c.detected_at).getTime()
    return Date.now() - t < 7 * 86400000
  }).length

  const isAr = (lang || 'ar') !== 'en'

  // ── Drilldown mode (keeps source-branded look) ──
  if (focusedSource) {
    const meta = SOURCE_META[focusedSource.id] || {}
    const name = isAr ? focusedSource.name_ar : (focusedSource.name_en || focusedSource.name_ar)
    const title = T(`مزامنة ${name}`, `${name} Sync`)
    const badge = isAr ? (meta.badgeAr || focusedSource.name_ar) : (meta.badgeEn || focusedSource.name_en || focusedSource.id.toUpperCase())
    const description = focusedSource.description_ar || (isAr ? meta.descAr : meta.descEn) || ''
    const accent = SOURCE_ACCENT[focusedSource.id] || C.gold

    const metaBits = []
    if (latestRun) metaBits.push(`${T('آخر مزامنة', 'Last sync')}: ${fmtTime(latestRun.started_at)}`)
    if (changesLast7d > 0) metaBits.push(`${changesLast7d} ${T('تغيير خلال أسبوع', 'changes in 7d')}`)

    return (
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
              {description}
              {metaBits.length > 0 && ` · ${metaBits.join(' · ')}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            <button onClick={onBack} title={T('رجوع', 'Back')}
              style={{ height: 34, padding: '0 12px', borderRadius: 8,
                background: '#141414', border: '1px solid rgba(255,255,255,.06)',
                color: 'var(--tx2)', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: F, fontSize: 11, fontWeight: 700, transition: '.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)'; e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { e.currentTarget.style.background = '#141414'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--tx2)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
              {T('رجوع', 'Back')}
            </button>
            {bookmarkletUrl ? (
              <HeaderBookmarklet
                url={bookmarkletUrl}
                accent={accent}
                label={T('اسحب «مزامنة» لشريط الإشارات', 'Drag "Sync" to bookmarks')}
                buttonLabel={T('مزامنة', 'Sync')}
                onMoreOptions={onSync}
                T={T} />
            ) : onSync && (
              <button onClick={onSync}
                style={{ height: 34, padding: '0 14px', borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${accent}`, color: accent,
                  fontFamily: F, fontSize: 11, fontWeight: 800,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: '.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${accent}14` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                {T('مزامنة', 'Sync')}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Hub overview — matches Persons page layout ──
  return (
    <div style={{ marginBottom: 32, position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
          {T('مركز المزامنة', 'Sync Hub')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
          {T('نقطة واحدة لمتابعة جميع التحديثات من مصادر متنوعة', 'One point to track all updates from multiple sources.')}
        </div>
      </div>
      {onManagePersons && (
        <button onClick={onManagePersons}
          style={{ height: 36, padding: '0 14px', borderRadius: 9,
            background: `${C.gold}14`, border: `1px solid ${C.gold}55`, color: C.gold,
            fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0, transition: '.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = `${C.gold}22` }}
          onMouseLeave={e => { e.currentTarget.style.background = `${C.gold}14` }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {T('المشغّل', 'Operator')}
          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: `${C.gold}25`, fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
            {personsCount || 0}
          </span>
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Hub overview building blocks — redesigned 2026-05-17
// Single card style, clearer hierarchy:
//   1. HubStatsBar   — 4 headline KPIs
//   2. OperatorsStrip — who's syncing what
//   3. SourcesGrid   — coverage matrix per source
//   4. RecentActivity — last few sync runs
// ═══════════════════════════════════════════════════════════════

// Shared card style used across the overview. Flat dark surface with a subtle
// inner highlight — replaces the older heavy gradient + double-shadow look.
const HUB_CARD = {
  background: 'linear-gradient(180deg, #1d1d1d 0%, #181818 100%)',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 14,
  boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)',
}

// Per-source SVG icons. Centralized so all overview components share the same
// visual identity for a given platform.
const SOURCE_ICON = {
  sbc:      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>,
  qiwa:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  gosi:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  muqeem:   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>,
  mudad:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  zatca:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  ajeer:    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  chambers: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>,
}

// 4 headline KPIs that frame the entire hub: how much exists, how much is
// covered, who can sync, and when something last happened.
function HubStatsBar({ totalFacilities, coveredFacilities, operatorsCount, activeSourcesCount, totalSourcesCount, lastActivityIso, T, lang }) {
  const pct = totalFacilities ? Math.round((coveredFacilities / totalFacilities) * 100) : 0
  // Pre-sync state isn't an error — render coverage in muted gold instead of
  // alarmist red until at least one sync has produced provenance rows.
  const isPreSync = coveredFacilities === 0
  const covAccent = isPreSync ? '#6e6e6e' : (pct >= 70 ? '#22c55e' : pct >= 30 ? '#f59e0b' : '#ef4444')
  const covSub = isPreSync ? T('بانتظار أول مزامنة', 'awaiting first sync') : `${coveredFacilities} / ${totalFacilities}`
  const tiles = [
    { label: T('إجمالي المنشآت', 'Total Facilities'), value: totalFacilities.toLocaleString('en-US'), sub: T('في النظام', 'in system'), accent: C.gold },
    { label: T('التغطية', 'Coverage'), value: `${pct}%`, sub: covSub, accent: covAccent },
    { label: T('المشغّلون', 'Operators'), value: operatorsCount, sub: T('حساب نفاذ', 'Nafath accounts'), accent: '#3b82f6' },
    { label: T('مصادر نشطة', 'Active Sources'), value: `${activeSourcesCount}/${totalSourcesCount}`, sub: lastActivityIso ? `${T('آخر نشاط', 'last')} · ${fmtRelative(lastActivityIso, lang)}` : T('لا نشاط بعد', 'no activity yet'), accent: '#9b59b6' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 18 }}>
      {tiles.map(t => (
        <div key={t.label} style={{ ...HUB_CARD, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx4)', letterSpacing: '.3px' }}>{t.label}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: t.accent, letterSpacing: '-.5px', direction: 'ltr', lineHeight: 1.1 }}>{t.value}</div>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx5)' }}>{t.sub}</div>
        </div>
      ))}
    </div>
  )
}

// Facilities overview — the first card on the hub. One big clickable card that
// opens the full facilities page (SbcFacilities). Shows the aggregate count,
// coverage bar, and source-contribution pills. Workers were dropped from the
// hub in 2026-05-22 — the page is now strictly "Facilities + Activities".
function FacilitiesOverviewCard({ totalFacilities, coveredFacilities, onOpen, T, lang }) {
  const pct = totalFacilities ? Math.round((coveredFacilities / totalFacilities) * 100) : 0
  const accent = C.gold

  return (
    <div role="button" tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      style={{
        ...HUB_CARD,
        padding: '22px 26px',
        marginBottom: 14,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        borderColor: `${accent}26`,
        transition: '.18s cubic-bezier(.4,0,.2,1)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 26px rgba(0,0,0,.32), 0 0 0 3px ${accent}10, inset 0 1px 0 rgba(255,255,255,.05)` }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${accent}26`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = HUB_CARD.boxShadow }}>
      <div style={{ position: 'absolute', insetInlineEnd: -90, top: -90, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${accent}1A 0%, transparent 65%)`, pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${accent}28, ${accent}0A)`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${accent}55`, boxShadow: `0 6px 18px ${accent}22, inset 0 1px 0 rgba(255,255,255,.06)`, flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-.2px' }}>
            {T('المنشآت', 'Facilities')}
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: accent, opacity: .65, flexShrink: 0 }}>
          <path d={(lang || 'ar') !== 'en' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}/>
        </svg>
      </div>

      {/* Big number + coverage */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, direction: 'ltr' }}>
          <span style={{ fontSize: 56, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{totalFacilities.toLocaleString('en-US')}</span>
          <span style={{ fontSize: 14, color: 'var(--tx4)', fontWeight: 600 }}>{T('منشأة', 'facilities')}</span>
        </div>
        <div style={{ textAlign: 'end' }}>
          <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 700, marginBottom: 4, letterSpacing: '.3px' }}>{T('التغطية', 'Coverage')}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: pct ? accent : 'var(--tx5)', direction: 'ltr' }}>{pct}%</div>
          <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', marginTop: 2 }}>{coveredFacilities} / {totalFacilities}</div>
        </div>
      </div>

      {/* Coverage bar */}
      <div style={{ position: 'relative', height: 6, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})`, borderRadius: 999, transition: 'width .4s ease' }} />
      </div>
    </div>
  )
}


// Sync activities — each row is one sync_runs record. Expanding it reveals
// the specific sync_changes captured during that run's [started_at, completed_at]
// window (matched on source + operator). Replaces the old RecentActivity which
// only showed counters.
function SyncActivitiesCard({ runs, changes, sources, persons, T, lang }) {
  const personById = (id) => persons.find(p => p.id === id)
  const sourceById = (id) => sources.find(s => s.id === id)
  const [expanded, setExpanded] = useState(() => new Set())
  const [showAll, setShowAll] = useState(false)

  // Newest first; success and failures both shown (failures get a red dot).
  const allRuns = useMemo(() => [...runs].sort((a, b) => (b.started_at || '').localeCompare(a.started_at || '')), [runs])
  const visibleRuns = showAll ? allRuns : allRuns.slice(0, 8)

  // Map: run.id → list of sync_changes that fall inside its window AND share
  // the same (source_id, person_id). Time-window matching avoids needing a
  // sync_run_id column on sync_changes (which today's schema doesn't have).
  const changesByRun = useMemo(() => {
    const out = {}
    for (const r of allRuns) {
      const startMs = r.started_at ? new Date(r.started_at).getTime() : null
      // Open-ended end if the run never completed — still match anything detected after start.
      const endMs = r.completed_at ? new Date(r.completed_at).getTime() : (startMs ? startMs + 30 * 60_000 : null)
      if (startMs == null) { out[r.id] = []; continue }
      out[r.id] = changes.filter(c => {
        if (c.source_id !== r.source_id) return false
        if (r.person_id && c.person_id && c.person_id !== r.person_id) return false
        const tMs = c.detected_at ? new Date(c.detected_at).getTime() : 0
        return tMs >= startMs - 1500 && tMs <= (endMs || Infinity) + 90_000
      })
    }
    return out
  }, [allRuns, changes])

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  return (
    <div style={{ ...HUB_CARD, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,.12)', color: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(34,197,94,.28)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-.2px' }}>
              {T('أنشطة المزامنة', 'Sync Activities')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, marginTop: 2 }}>
              {T('كل مزامنة والتغييرات التي حصلت فيها', 'Every sync run and the changes it made')}
            </div>
          </div>
        </div>
        {allRuns.length > 8 && (
          <button onClick={() => setShowAll(s => !s)}
            style={{ height: 30, padding: '0 12px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {showAll ? T('عرض أقل', 'Show less') : T(`عرض الكل (${allRuns.length})`, `View all (${allRuns.length})`)}
          </button>
        )}
      </div>

      {visibleRuns.length === 0 ? (
        <div style={{ padding: '28px 8px', textAlign: 'center', fontSize: 11.5, color: 'var(--tx4)' }}>
          {T('لا يوجد نشاط بعد — شغّل أول مزامنة من زر "مزامنة" أعلاه.', 'No activity yet — run the first sync via the Sync button above.')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visibleRuns.map(r => {
            const s = sourceById(r.source_id)
            const p = personById(r.person_id)
            const accent = SOURCE_ACCENT[r.source_id] || C.gold
            const pClr = p ? personColor(p) : 'var(--tx5)'
            const added = r.records_added || 0, modified = r.records_modified || 0, removed = r.records_removed || 0
            const hasDiffs = (added + modified + removed) > 0
            const runChanges = changesByRun[r.id] || []
            const isOpen = expanded.has(r.id)
            const isFailed = r.status === 'failed'
            const isRunning = r.status === 'running'
            const statusColor = isFailed ? '#ef4444' : isRunning ? '#f59e0b' : '#22c55e'
            const canExpand = runChanges.length > 0
            return (
              <div key={r.id} style={{ borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', overflow: 'hidden' }}>
                <div role={canExpand ? 'button' : undefined} tabIndex={canExpand ? 0 : -1}
                  onClick={canExpand ? () => toggle(r.id) : undefined}
                  onKeyDown={canExpand ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(r.id) } } : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: canExpand ? 'pointer' : 'default' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accent}33`, position: 'relative' }}>
                    {SOURCE_ICON[r.source_id] || SOURCE_ICON.sbc}
                    <span style={{ position: 'absolute', bottom: -2, insetInlineEnd: -2, width: 8, height: 8, borderRadius: '50%', background: statusColor, border: '2px solid #181818' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx)' }}>
                      {s?.name_ar || r.source_id}
                      <span style={{ color: 'var(--tx5)', fontWeight: 500, marginInline: 6 }}>·</span>
                      <span style={{ color: pClr, fontWeight: 700 }}>{p ? personDisplayName(p, 'short') : T('بدون مشغّل', 'unattributed')}</span>
                      {isFailed && <span style={{ marginInlineStart: 8, fontSize: 9.5, padding: '1px 6px', borderRadius: 5, background: 'rgba(239,68,68,.15)', color: '#ef4444', fontWeight: 800, border: '1px solid rgba(239,68,68,.3)' }}>{T('فشلت', 'failed')}</span>}
                      {isRunning && <span style={{ marginInlineStart: 8, fontSize: 9.5, padding: '1px 6px', borderRadius: 5, background: 'rgba(245,158,11,.15)', color: '#f59e0b', fontWeight: 800, border: '1px solid rgba(245,158,11,.3)' }}>{T('قيد التشغيل', 'running')}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtRelative(r.started_at, lang)}</span>
                      <span style={{ opacity: .4 }}>·</span>
                      <span style={{ direction: 'ltr' }}>{r.records_fetched || 0} {T('سجل', 'records')}</span>
                      {runChanges.length > 0 && (<>
                        <span style={{ opacity: .4 }}>·</span>
                        <span style={{ color: C.gold, fontWeight: 700 }}>{runChanges.length} {T('تغيير', 'changes')}</span>
                      </>)}
                    </div>
                  </div>
                  {hasDiffs && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {added > 0 && <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(34,197,94,.12)', color: '#22c55e', fontWeight: 800, border: '1px solid rgba(34,197,94,.3)' }}>+{added}</span>}
                      {modified > 0 && <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(245,158,11,.12)', color: '#f59e0b', fontWeight: 800, border: '1px solid rgba(245,158,11,.3)' }}>✎{modified}</span>}
                      {removed > 0 && <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(239,68,68,.12)', color: '#ef4444', fontWeight: 800, border: '1px solid rgba(239,68,68,.3)' }}>−{removed}</span>}
                    </div>
                  )}
                  {canExpand && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--tx5)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.2s', flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  )}
                </div>

                {/* Expanded changes list */}
                {isOpen && canExpand && (
                  <div style={{ padding: '4px 14px 12px', borderTop: '1px dashed rgba(255,255,255,.06)' }}>
                    {runChanges.slice(0, 30).map((c, i) => {
                      const tone = c.change_type === 'added' ? '#22c55e' : c.change_type === 'removed' ? '#ef4444' : '#f59e0b'
                      const glyph = c.change_type === 'added' ? '+' : c.change_type === 'removed' ? '−' : '✎'
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0',
                          borderBottom: i < Math.min(runChanges.length, 30) - 1 ? '1px dashed rgba(255,255,255,.04)' : 'none' }}>
                          <span style={{ width: 18, height: 18, borderRadius: 5, background: `${tone}1A`, color: tone, fontSize: 11, fontWeight: 900, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${tone}33`, marginTop: 1 }}>{glyph}</span>
                          <div style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.55, flex: 1, minWidth: 0 }}>
                            {changeLabel(c, T)}
                            <span style={{ color: 'var(--tx5)', fontSize: 10, marginInlineStart: 6, fontFamily: 'ui-monospace, monospace' }}>· {fmtTime(c.detected_at)}</span>
                          </div>
                        </div>
                      )
                    })}
                    {runChanges.length > 30 && (
                      <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontStyle: 'italic', marginTop: 8 }}>
                        {T(`+${runChanges.length - 30} تغيير إضافي`, `+${runChanges.length - 30} more changes`)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


function changeLabel(c, T) {
  const label = c.record_label || c.record_key || '—'
  if (c.change_type === 'added') return <><span>{T('أُضيف سجل', 'Added record')}: </span><b>{label}</b></>
  if (c.change_type === 'removed') return <><span>{T('حُذف سجل', 'Removed record')}: </span><b>{label}</b></>
  const field = c.field_label_ar || c.field_path || '—'
  const oldV = formatValue(c.old_value)
  const newV = formatValue(c.new_value)
  return (
    <>
      <b>{label}</b>{' '}
      <span style={{ color: 'var(--tx4)' }}>·</span>{' '}
      <span>{field}</span>{' '}
      <span style={{ color: 'var(--tx4)' }}>{T('من', 'from')}</span>{' '}
      <span style={{ color: '#ef4444' }}>{oldV}</span>{' '}
      <span style={{ color: 'var(--tx4)' }}>{T('إلى', 'to')}</span>{' '}
      <span style={{ color: '#22c55e' }}>{newV}</span>
    </>
  )
}

function formatValue(v) {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try { return JSON.stringify(v).slice(0, 40) } catch { return '—' }
}

// ═══════════════════════════════════════════════════════════════
// SBC drill-down — uses existing SbcFacilities component
// ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════
// Role-filtered person tabs — used inside source drilldowns to scope
// the view to a specific person (owner/manager). Tabs persist in
// localStorage so the user keeps their selection across sessions.
// ═══════════════════════════════════════════════════════════════
function RolePersonTabs({ sb, toast, allowedRoles, T, tabs, setTabs, active, setActive }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [loadingCands, setLoadingCands] = useState(false)
  const [search, setSearch] = useState('')

  const openPicker = async () => {
    setPickerOpen(true)
    setLoadingCands(true)
    try {
      const lists = await Promise.all(allowedRoles.map(r => rolesService.listPersonsByRole(r)))
      const map = new Map()
      lists.flat().forEach(p => { if (!map.has(p.person_id)) map.set(p.person_id, p) })
      setCandidates(Array.from(map.values()))
    } catch (e) { toast?.('خطأ في تحميل الأشخاص: ' + (e?.message || '')) }
    finally { setLoadingCands(false) }
  }

  const addTab = (person) => {
    setTabs(prev => prev.find(t => t.person_id === person.person_id) ? prev : [...prev, person])
    setActive(person.person_id)
    setPickerOpen(false)
    setSearch('')
  }

  const removeTab = (personId) => {
    setTabs(prev => prev.filter(t => t.person_id !== personId))
    if (active === personId) setActive('all')
  }

  const colorFor = (i) => PERSON_PALETTE[i % PERSON_PALETTE.length]
  const filteredCands = candidates.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [p.name_ar, p.name_en, p.id_number, p.phone_primary]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
  })
  const tabIds = tabs.map(t => t.person_id)

  return (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.10)', marginBottom: 14, alignItems: 'stretch', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, flex: 1 }}>
        {[{ person_id: 'all', name_ar: T('الكل', 'All') }, ...tabs].map((p, i) => {
          const isActive = active === p.person_id
          const c = p.person_id === 'all' ? C.gold : colorFor(i - 1)
          return (
            <div key={p.person_id} onClick={() => setActive(p.person_id)}
              style={{ padding: '10px 16px 9px', cursor: 'pointer',
                color: isActive ? c : 'var(--tx3)',
                fontSize: 13, fontWeight: isActive ? 800 : 600,
                borderBottom: isActive ? `2px solid ${c}` : '2px solid transparent',
                marginBottom: -1, transition: '.15s', fontFamily: F,
                display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {p.person_id !== 'all' && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: c,
                  boxShadow: isActive ? `0 0 6px ${c}90` : 'none' }} />
              )}
              {p.name_ar}
              {p.person_id !== 'all' && (
                <span onClick={(e) => { e.stopPropagation(); removeTab(p.person_id) }} title={T('إزالة', 'Remove')}
                  style={{ width: 14, height: 14, borderRadius: '50%', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    color: 'var(--tx5)', marginInlineStart: 2 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </span>
              )}
            </div>
          )
        })}
      </div>
      <button onClick={openPicker} title={T('إضافة شخص', 'Add person')}
        style={{ alignSelf: 'center', height: 30, padding: '0 12px', borderRadius: 8,
          border: `1px solid ${C.gold}55`, background: `${C.gold}10`, color: C.gold,
          fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        {T('إضافة شخص', 'Add person')}
      </button>

      {pickerOpen && ReactDOM.createPortal(
        <div onClick={() => setPickerOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} dir="rtl"
            style={{ background: '#1a1a1a', borderRadius: 14, width: 480, maxWidth: '95vw',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
              border: '1px solid rgba(212,160,23,.2)', boxShadow: '0 24px 60px rgba(0,0,0,.5)',
              fontFamily: F }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>
                {T('اختر شخصاً', 'Pick a person')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tx4)', marginBottom: 10 }}>
                {T(`الأشخاص المعيّنون كـ${allowedRoles.map(r => ({ owner: 'مالك', manager: 'مدير', beneficiary: 'مستفيد', supervisor: 'مشرف' })[r] || r).join(' أو ')}`,
                   `Persons assigned as ${allowedRoles.join(' or ')}`)}
              </div>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={T('ابحث بالاسم أو الجوال أو الهوية...', 'Search by name, phone, or ID...')}
                style={{ width: '100%', height: 36, padding: '0 12px', borderRadius: 8,
                  background: '#141414', border: '1px solid rgba(255,255,255,.08)',
                  color: 'var(--tx)', fontFamily: F, fontSize: 12, outline: 'none' }} />
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
              {loadingCands ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--tx5)', fontSize: 12 }}>
                  {T('جاري التحميل...', 'Loading...')}
                </div>
              ) : filteredCands.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--tx5)', fontSize: 12 }}>
                  {T('لا يوجد أشخاص معيّنون بعد', 'No assigned persons yet')}
                </div>
              ) : filteredCands.map(p => {
                const already = tabIds.includes(p.person_id)
                return (
                  <div key={p.person_id} onClick={() => !already && addTab(p)}
                    style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                      cursor: already ? 'default' : 'pointer',
                      opacity: already ? .5 : 1,
                      background: 'rgba(255,255,255,.025)',
                      border: '1px solid rgba(255,255,255,.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                      transition: '.12s' }}
                    onMouseEnter={e => { if (!already) e.currentTarget.style.background = 'rgba(212,160,23,.08)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.025)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{p.name_ar}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--tx4)', marginTop: 2,
                        display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(p.roles_summary || []).filter(r => ['مالك', 'مدير', 'مستفيد', 'مشرف'].includes(r))
                          .map(r => <span key={r} style={{ color: C.gold }}>{r}</span>)}
                        {p.id_number && <span style={{ direction: 'ltr' }}>{p.id_number}</span>}
                      </div>
                    </div>
                    {already && <span style={{ fontSize: 10, color: C.ok, fontWeight: 800 }}>✓ {T('مُضاف', 'added')}</span>}
                  </div>
                )
              })}
            </div>
            <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,.06)',
              display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setPickerOpen(false)}
                style={{ height: 32, padding: '0 14px', borderRadius: 8,
                  background: 'transparent', border: '1px solid rgba(255,255,255,.15)',
                  color: 'var(--tx2)', fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                {T('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}

function SbcDrilldown({ sb, toast, user, lang, persons, syncPersonId, onBack, filteredChanges, personName, T }) {
  const [changesOpen, setChangesOpen] = useState(false)

  return (
    <div>
      <SbcFacilities sb={sb} toast={toast} user={user} lang={lang}
        syncPersonId={syncPersonId}
        onBack={onBack} />
      {filteredChanges.length > 0 && (
        <div style={{ marginTop: 20, borderRadius: 14, background: '#141414',
          border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden' }}>
          <button onClick={() => setChangesOpen(o => !o)}
            style={{ width: '100%', padding: '14px 16px', background: 'transparent', border: 'none',
              color: 'var(--tx)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', fontFamily: F, gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{T('تغييرات المركز السعودي للأعمال', 'SBC Changes')}</span>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999,
                background: `${C.gold}1A`, color: C.gold, fontWeight: 800,
                border: `1px solid ${C.gold}40` }}>{filteredChanges.length}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: changesOpen ? 'rotate(180deg)' : 'none', transition: '.2s', color: 'var(--tx4)' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {changesOpen && (
            <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
              {filteredChanges.slice(0, 20).map((c, i) => (
                <div key={c.id} style={{ fontSize: 11.5, padding: '8px 0',
                  borderBottom: i < Math.min(filteredChanges.length, 20) - 1 ? '1px dashed rgba(255,255,255,.06)' : 'none',
                  color: 'var(--tx2)' }}>
                  {changeLabel(c, T)} <span style={{ color: 'var(--tx4)', fontSize: 10 }}>· {personName(c.person_id)} · {fmtRelative(c.detected_at, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// GOSI Panel — three feature cards
// ═══════════════════════════════════════════════════════════════
function GosiPanel({ T }) {
  const accent = SOURCE_ACCENT.gosi
  const cards = [
    {
      key: 'facilities',
      title: T('بيانات المنشآت', 'Facilities Data'),
      desc: T('مزامنة سجلات المنشآت المسجّلة في التأمينات.', 'Sync facility records registered with GOSI.'),
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="14" rx="2"/><path d="M7 8V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/><line x1="8" y1="12" x2="8" y2="12.01"/><line x1="12" y1="12" x2="12" y2="12.01"/><line x1="16" y1="12" x2="16" y2="12.01"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="12" y1="16" x2="12" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/></svg>,
    },
    {
      key: 'owners',
      title: T('الملاك والمشرفين', 'Owners & Supervisors'),
      desc: T('مزامنة الملاك والمشرفين المرتبطين بالمنشآت.', 'Sync owners and supervisors linked to facilities.'),
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="9" r="2.5"/><path d="M21 21v-1.5a3 3 0 0 0-3-3"/></svg>,
    },
    {
      key: 'link',
      title: T('الربط', 'Linking'),
      desc: T('ربط حساب التأمينات بالمنشآت في النظام.', 'Link GOSI account with facilities in the system.'),
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>,
    },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      {cards.map(c => (
        <div key={c.key} style={{
          padding: 18, borderRadius: 16,
          background: 'linear-gradient(160deg,#333 0%,#2A2A2A 50%,#232323 100%)',
          backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: '1px solid rgba(255,255,255,.08)',
          transition: '.25s cubic-bezier(.4,0,.2,1)',
          cursor: 'pointer',
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)',
          display: 'flex', flexDirection: 'column'
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.4), 0 4px 10px rgba(0,0,0,.25), inset 0 1px 0 rgba(255,255,255,.08), inset 0 -1px 0 rgba(0,0,0,.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.32), 0 2px 6px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.06), inset 0 -1px 0 rgba(0,0,0,.2)'
          }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {c.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: accent, letterSpacing: '.1px' }}>{c.title}</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--tx3)', lineHeight: 1.6, marginBottom: 16 }}>{c.desc}</div>
          <button style={{
            marginTop: 'auto', padding: '8px 10px', border: '1px solid rgba(255,255,255,.1)',
            background: 'rgba(255,255,255,.03)', color: 'var(--tx2)', borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: F,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: '.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.07)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {T('فتح', 'Open')}
          </button>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Coming Soon (non-SBC sources)
// ═══════════════════════════════════════════════════════════════
function ComingSoonPanel({ sourceId, sourceName, onBack, T }) {
  return (
    <div style={{ padding: 40, borderRadius: 14, background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{sourceName}</div>
      <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{T('قيد التطوير — سيتم تفعيل المزامنة قريباً.', 'Under development — sync will be enabled soon.')}</div>
    </div>
  )
}

