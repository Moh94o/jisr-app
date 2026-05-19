import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import SbcFacilities from './SbcFacilities.jsx'
import QiwaFacilities from './QiwaFacilities.jsx'
import { buildBookmarklet } from './sbcSyncBookmarklet.js'
import { buildQiwaBookmarklet } from './qiwaSyncBookmarklet.js'
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
  const [activePerson, setActivePerson] = useState('all') // 'all' or person.id
  const [focused, setFocused] = useState(null)            // source.id being viewed in drill-down
  const [focusedOperator, setFocusedOperator] = useState(null) // sync_person.id being drilled into
  const [syncModal, setSyncModal] = useState(null)        // { sourceId, personId }
  const [refreshTick, setRefreshTick] = useState(0)
  const [showPersonMgr, setShowPersonMgr] = useState(false)
  // Canonical totals (facilities + workers) + provenance rows on both domains
  // — drives the Facilities/Workers summary cards on the overview.
  const [totalFacilities, setTotalFacilities] = useState(0)
  const [totalWorkers, setTotalWorkers] = useState(0)
  const [provRows, setProvRows] = useState([])
  const [workerProvRows, setWorkerProvRows] = useState([])

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
    const [pr, src, rn, ch, facCnt, prov, wkCnt, wkProv] = await Promise.all([
      // Embed the linked persons row so the chips can show the official Nafath
      // name (arFirst + arFamily) once a sync has run, instead of the operator
      // alias the user originally typed.
      sb.from('sync_persons').select('*, person:persons!sync_persons_person_id_fkey(name_ar, name_en, id_number, nafath_raw, nafath_synced_at)').is('deleted_at', null).order('sort_order').order('name_ar'),
      sb.from('sync_sources').select('*').eq('enabled', true).order('sort_order'),
      sb.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(500),
      sb.from('sync_changes').select('*').order('detected_at', { ascending: false }).limit(200),
      sb.from('facilities').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      sb.from('v_facility_provenance').select('facility_id, source_id, sync_person_id, last_synced_at, person_name_ar, person_color'),
      sb.from('workers').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      sb.from('worker_sources').select('worker_id, source_id, person_id, last_synced_at'),
    ])
    setPersons(pr.data || [])
    setTotalFacilities(facCnt?.count || 0)
    setTotalWorkers(wkCnt?.count || 0)
    setProvRows(prov?.data || [])
    setWorkerProvRows(wkProv?.data || [])
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

  useEffect(() => { load() }, [load, refreshTick])

  // Latest successful run per (source, person) — for stat cards.
  const latestRunBy = useMemo(() => {
    const m = {}
    for (const r of runs) {
      if (r.status !== 'success') continue
      const k = r.source_id + '|' + (r.person_id || '')
      if (!m[k] || r.started_at > m[k].started_at) m[k] = r
    }
    return m
  }, [runs])

  // Coverage per source: how many distinct facilities have at least one
  // provenance entry from this source, plus the most-recent sync timestamp
  // across all operators. Drives the "0/447 · 0%" headline on each card.
  const coverageBySource = useMemo(() => {
    const m = {}
    for (const p of provRows) {
      const e = (m[p.source_id] ||= { facilityIds: new Set(), operatorIds: new Set(), lastSyncedAt: null })
      e.facilityIds.add(p.facility_id)
      if (p.sync_person_id) e.operatorIds.add(p.sync_person_id)
      if (!e.lastSyncedAt || (p.last_synced_at && p.last_synced_at > e.lastSyncedAt)) e.lastSyncedAt = p.last_synced_at
    }
    const out = {}
    for (const sid of Object.keys(m)) {
      out[sid] = { facilities: m[sid].facilityIds.size, operators: m[sid].operatorIds.size, lastSyncedAt: m[sid].lastSyncedAt }
    }
    return out
  }, [provRows])

  // Per-operator activity: facilities touched + sources covered + last activity.
  // Drives the operator chips strip on the overview.
  const activityByOperator = useMemo(() => {
    const m = {}
    for (const p of provRows) {
      if (!p.sync_person_id) continue
      const e = (m[p.sync_person_id] ||= { facilityIds: new Set(), sources: new Set(), lastActive: null })
      e.facilityIds.add(p.facility_id)
      e.sources.add(p.source_id)
      if (!e.lastActive || (p.last_synced_at && p.last_synced_at > e.lastActive)) e.lastActive = p.last_synced_at
    }
    const out = {}
    for (const pid of Object.keys(m)) {
      out[pid] = { facilities: m[pid].facilityIds.size, sources: Array.from(m[pid].sources), lastActive: m[pid].lastActive }
    }
    return out
  }, [provRows])

  // Most recent sync (any source/operator) — drives the "last activity" KPI.
  const lastActivityIso = useMemo(() => {
    let max = null
    for (const v of Object.values(coverageBySource)) {
      if (v.lastSyncedAt && (!max || v.lastSyncedAt > max)) max = v.lastSyncedAt
    }
    return max
  }, [coverageBySource])

  const activeSourcesCount = Object.keys(coverageBySource).length
  const coveredFacilitiesCount = useMemo(() => {
    const all = new Set()
    for (const p of provRows) all.add(p.facility_id)
    return all.size
  }, [provRows])

  // Worker coverage per source — same shape as coverageBySource but keyed on
  // worker_sources rows. Drives the "العمالة" summary card on the overview.
  const workerCoverageBySource = useMemo(() => {
    const m = {}
    for (const w of workerProvRows) {
      const e = (m[w.source_id] ||= { workerIds: new Set(), lastSyncedAt: null })
      e.workerIds.add(w.worker_id)
      if (!e.lastSyncedAt || (w.last_synced_at && w.last_synced_at > e.lastSyncedAt)) e.lastSyncedAt = w.last_synced_at
    }
    const out = {}
    for (const sid of Object.keys(m)) {
      out[sid] = { workers: m[sid].workerIds.size, lastSyncedAt: m[sid].lastSyncedAt }
    }
    return out
  }, [workerProvRows])
  const coveredWorkersCount = useMemo(() => {
    const all = new Set()
    for (const w of workerProvRows) all.add(w.worker_id)
    return all.size
  }, [workerProvRows])

  const getSourceStats = (sourceId) => {
    if (activePerson === 'all') {
      const personRuns = persons.map(p => latestRunBy[sourceId + '|' + p.id]).filter(Boolean)
      const total = personRuns.reduce((s, r) => s + (r.records_fetched || 0), 0)
      const mostRecent = personRuns.reduce((a, b) => (!a || (b.started_at > a.started_at) ? b : a), null)
      return { total, lastRun: mostRecent, runCount: personRuns.length }
    }
    const r = latestRunBy[sourceId + '|' + activePerson]
    return { total: r?.records_fetched || 0, lastRun: r || null, runCount: r ? 1 : 0 }
  }

  const filteredChanges = useMemo(() => {
    if (activePerson === 'all') return changes
    return changes.filter(c => c.person_id === activePerson)
  }, [changes, activePerson])

  const personName = (id) => persons.find(p => p.id === id)?.name_ar || '—'
  const personById = (id) => persons.find(p => p.id === id)
  const sourceName = (id) => sources.find(s => s.id === id)?.name_ar || id
  const sourceAccent = (id) => SOURCE_ACCENT[id] || C.gold

  // Resolve the sync_persons row for the currently active selection (drilldown tab
  // first, otherwise hub-level activePerson). Auto-creates the bridging row if
  // a real person was picked from the role tabs but has no sync_persons record yet.
  const resolveActiveSyncPerson = async (sourceId) => {
    if (focused === sourceId) {
      try {
        const drillActive = localStorage.getItem(`syncDrilldown.${sourceId}.active`)
        const drillTabs = JSON.parse(localStorage.getItem(`syncDrilldown.${sourceId}.tabs`) || '[]')
        if (drillActive && drillActive !== 'all') {
          const dp = drillTabs.find(t => t.person_id === drillActive)
          if (dp) {
            let { data: spRow } = await sb.from('sync_persons')
              .select('id, name_ar, name_en, color, note_ar, person_id')
              .eq('person_id', dp.person_id)
              .is('deleted_at', null)
              .maybeSingle()
            if (!spRow) {
              const { data: maxRow } = await sb.from('sync_persons')
                .select('sort_order')
                .order('sort_order', { ascending: false })
                .limit(1)
                .maybeSingle()
              const nextOrder = (maxRow?.sort_order || 0) + 10
              const { data: created } = await sb.from('sync_persons').insert({
                person_id: dp.person_id,
                name_ar: dp.name_ar,
                name_en: dp.name_en,
                sort_order: nextOrder,
              }).select('id, name_ar, name_en, color, note_ar, person_id').single()
              spRow = created
            }
            return spRow
          }
        }
      } catch { /* fall through */ }
    }
    if (activePerson === 'all') return null
    return personById(activePerson) || null
  }

  // "Sync Now" — opens the bookmarklet install/run panel for the active person.
  // The bookmarklet runs inside the source portal (e.g. e2.business.sa) under the
  // user's own Nafath session, fetches data, and writes directly to Supabase.
  const onOpenSync = async (sourceId) => {
    const person = await resolveActiveSyncPerson(sourceId)
    if (!person) {
      toast?.(T('اختر شخصاً أولاً من التبويبات أعلاه', 'Select a person tab first'))
      return
    }
    setSyncModal({ sourceId, personId: person.id, person })
  }

  // ── Render ──
  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {!focused && !focusedOperator && (
        <Header T={T} lang={lang}
          focusedSource={null}
          runs={runs} changes={changes}
          onSync={null}
          bookmarkletUrl={null}
          onBack={() => setFocused(null)}
          onManagePersons={() => setShowPersonMgr(true)}
          personsCount={persons.length} />
      )}

      {!focused && !focusedOperator && (
        <>
          {/* Operators-first hero — pick the person to drill into */}
          <div style={{ ...HUB_CARD, padding: '22px 26px', marginBottom: 14, position: 'relative', overflow: 'hidden', borderColor: `${C.gold}33` }}>
            <div style={{ position: 'absolute', insetInlineStart: -80, top: -80, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}1A 0%, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-.2px', marginBottom: 14 }}>{T('اختر المشغّل', 'Choose operator')}</div>
              <OperatorsStrip
                persons={persons}
                activityByOperator={activityByOperator}
                onManagePersons={() => setShowPersonMgr(true)}
                onSelectOperator={(id) => setFocusedOperator(id)}
                T={T} lang={lang}
              />
            </div>
          </div>
          <DomainSummary
            sources={sources}
            facilityCoverage={coverageBySource}
            workerCoverage={workerCoverageBySource}
            totalFacilities={totalFacilities}
            totalWorkers={totalWorkers}
            coveredFacilities={coveredFacilitiesCount}
            coveredWorkers={coveredWorkersCount}
            onOpenFacilities={() => setFocused('sbc')}
            T={T} lang={lang}
          />
          <RecentActivity
            runs={runs}
            sources={sources}
            persons={persons}
            T={T} lang={lang}
          />
        </>
      )}

      {!focused && focusedOperator && (() => {
        const op = personById(focusedOperator)
        if (!op) { setFocusedOperator(null); return null }
        return (
          <OperatorDrilldown
            sb={sb}
            operator={op}
            sources={sources}
            provRows={provRows}
            runs={runs}
            refreshTick={refreshTick}
            onBack={() => setFocusedOperator(null)}
            onOpenSync={(sourceId, opId) => setSyncModal({ sourceId, personId: opId, person: personById(opId) })}
            onOpenSource={(sourceId) => setFocused(sourceId)}
            T={T} lang={lang} toast={toast}
          />
        )
      })()}

      {focused === 'sbc' && (
        <SbcDrilldown
          sb={sb} toast={toast} user={user} lang={lang}
          activePerson={activePerson}
          persons={persons}
          // Carry forward the operator the user clicked in from so the SBC
          // page is strictly that operator's facilities. focusedOperator is
          // their sync_persons.id; we resolve to the full row here.
          scopedOperator={focusedOperator ? personById(focusedOperator) : null}
          onBack={() => setFocused(null)}
          onOpenSync={onOpenSync}
          filteredChanges={filteredChanges.filter(c => c.source_id === 'sbc')}
          personName={personName}
          T={T}
        />
      )}

      {focused === 'qiwa' && (
        <QiwaDrilldown
          sb={sb} toast={toast} user={user} lang={lang}
          activePerson={activePerson}
          onBack={() => setFocused(null)}
          filteredChanges={filteredChanges.filter(c => c.source_id === 'qiwa')}
          personName={personName}
          T={T}
        />
      )}

      {focused === 'gosi' && (
        <GosiPanel T={T} />
      )}

      {focused && focused !== 'sbc' && focused !== 'qiwa' && focused !== 'gosi' && (
        <ComingSoonPanel sourceId={focused} sourceName={sourceName(focused)} onBack={() => setFocused(null)} T={T} />
      )}

      {syncModal && (
        <SyncInstallPanel
          sourceId={syncModal.sourceId}
          person={syncModal.person || personById(syncModal.personId)}
          sourceObj={sources.find(s => s.id === syncModal.sourceId)}
          onClose={() => setSyncModal(null)}
          T={T}
          lang={lang}
        />
      )}

      {showPersonMgr && (
        <PersonManagerPanel
          sb={sb} toast={toast} lang={lang} user={user}
          persons={persons}
          onClose={() => setShowPersonMgr(false)}
          onChanged={() => setRefreshTick(t => t + 1)}
          T={T}
        />
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

// Operator roster. Each chip = one sync_persons row with their assigned color,
// how many facilities they've supplied data for (any source), and when they
// were last active. Click a chip to focus that operator and see their per-source
// dashboard. Empty state shows a prominent "+ Add first operator" CTA.
function OperatorsStrip({ persons, activityByOperator, onManagePersons, onSelectOperator, T, lang }) {
  const isEmpty = persons.length === 0
  return (
    <>
      {isEmpty ? (
        <div style={{ padding: '22px 16px 18px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.gold}26, ${C.gold}08)`, border: `1.5px solid ${C.gold}55`, color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${C.gold}22` }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>
            {T('لم يتم إضافة أي مشغّل بعد', 'No operators yet')}
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--tx4)', maxWidth: 480, lineHeight: 1.7 }}>
            {T('كل مشغّل = حساب نفاذ مستقل. أضف الاسم ورقم الهوية، ثم ادخل لكل منصة وشغّل المزامنة — كل بيانات الشخص ومنشآته وعمّاله تنزل تلقائياً.',
               'An operator = one Nafath account. Add a name and ID, then enter each platform and run sync — all the person\'s data, facilities, and workers flow in automatically.')}
          </div>
          <button onClick={onManagePersons}
            style={{ marginTop: 4, height: 40, padding: '0 24px', borderRadius: 11, background: C.gold, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: `0 6px 16px ${C.gold}44, inset 0 1px 0 rgba(255,255,255,.25)`, transition: '.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            {T('إضافة أول مشغّل', 'Add first operator')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {persons.map(p => {
            const a = activityByOperator[p.id] || { facilities: 0, sources: [], lastActive: null }
            const clr = personColor(p)
            const id = p.person?.id_number
            const isSynced = a.lastActive != null
            return (
              <button key={p.id}
                onClick={() => onSelectOperator?.(p.id)}
                title={T('فتح ملف المشغّل', 'Open operator dashboard')}
                style={{
                  padding: '18px 16px 14px', borderRadius: 14,
                  background: `linear-gradient(180deg, ${clr}12 0%, ${clr}04 100%)`,
                  border: `1px solid ${clr}38`,
                  fontFamily: F, cursor: 'pointer', transition: '.18s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${clr}77`; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = `${clr}38`; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ position: 'absolute', top: 10, insetInlineEnd: 10, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: isSynced ? 'rgba(39,160,70,.14)' : 'rgba(255,255,255,.05)', color: isSynced ? C.ok : 'var(--tx5)', border: `1px solid ${isSynced ? 'rgba(39,160,70,.3)' : 'rgba(255,255,255,.08)'}` }}>
                  {isSynced ? T('● مزامن', '● synced') : T('بانتظار', 'pending')}
                </div>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${clr}40, ${clr}12)`, border: `2px solid ${clr}77`, color: clr, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 22, flexShrink: 0, boxShadow: `0 6px 16px ${clr}33` }}>
                  {personInitial(p)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', textAlign: 'center', lineHeight: 1.2 }}>{personDisplayName(p, 'short')}</div>
                {id && (
                  <div style={{ fontSize: 10.5, fontFamily: 'ui-monospace, monospace', color: 'var(--tx4)', direction: 'ltr', padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>{id}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6, paddingTop: 10, borderTop: '1px dashed rgba(255,255,255,.08)', width: '100%', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: clr, direction: 'ltr', lineHeight: 1 }}>{a.facilities}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx5)', fontWeight: 700, marginTop: 3 }}>{T('منشأة', 'facility')}</div>
                  </div>
                  <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,.08)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--tx2)', lineHeight: 1 }}>{a.lastActive ? fmtRelative(a.lastActive, lang) : '—'}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx5)', fontWeight: 700, marginTop: 3 }}>{T('آخر مزامنة', 'last sync')}</div>
                  </div>
                </div>
                {a.sources.length > 0 && (
                  <div style={{ display: 'inline-flex', gap: 4, marginTop: 4 }}>
                    {a.sources.slice(0, 6).map(sid => (
                      <span key={sid} title={sid} style={{ width: 7, height: 7, borderRadius: '50%', background: SOURCE_ACCENT[sid] || '#888', boxShadow: `0 0 4px ${SOURCE_ACCENT[sid] || '#888'}66` }} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

// Operator drill-down — opened when a chip is clicked. Shows the operator's
// identity, the Nafath capture card (run this first to lock in identity), then
// a per-source grid where each card shows that operator's own coverage and a
// "Sync now" button that opens the bookmarklet panel scoped to (this operator
// × this source).
function OperatorDrilldown({ sb, operator, sources, provRows, runs, refreshTick, onBack, onOpenSync, onOpenSource, T, lang, toast }) {
  const clr = personColor(operator)
  const initial = personInitial(operator)

  // Pull linked persons row to know Nafath sync status + show the verified
  // identity if it differs from what the user typed.
  const [personRow, setPersonRow] = useState(null)
  // Operator drilldown landing: a hub of two cards. Click a card to drill into
  // either the Personal profile (Nafath + SBC profile) or the Facilities & workers file.
  const [activeTab, setActiveTab] = useState('hub') // 'hub' | 'profile' | 'facilities'
  const showNafathPage = activeTab === 'profile'
  const setShowNafathPage = () => {} // legacy no-op, retained while we phase out call sites
  const [showOpsLog, setShowOpsLog] = useState(false)
  // Local refresh tick lets the in-app Nafath login re-fetch the persons row
  // after `nafath-proxy` finishes patching it server-side, without depending
  // on the parent SyncHub to refresh.
  const [localTick, setLocalTick] = useState(0)
  const bumpLocal = () => setLocalTick(t => t + 1)
  useEffect(() => {
    if (!sb || !operator.person_id) { setPersonRow(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('persons')
        .select('id, name_ar, name_en, id_number, birth_date, gender, email, phone_primary, nafath_synced_at, nafath_raw, nafath_auth_logs, sbc_basic_info, sbc_basic_info_synced_at')
        .eq('id', operator.person_id).maybeSingle()
      if (!cancelled) setPersonRow(data || null)
    })()
    return () => { cancelled = true }
  }, [sb, operator.person_id, refreshTick, localTick])

  const nafathSynced = !!personRow?.nafath_synced_at
  const nafathBookmarklet = useMemo(
    () => buildNafathBookmarklet({ personId: operator.person_id || '', syncPersonId: operator.id }),
    [operator.person_id, operator.id],
  )

  // Coverage per source for THIS operator only.
  const opCoverage = useMemo(() => {
    const m = {}
    for (const p of provRows) {
      if (p.sync_person_id !== operator.id) continue
      const e = (m[p.source_id] ||= { facilityIds: new Set(), lastSyncedAt: null })
      e.facilityIds.add(p.facility_id)
      if (!e.lastSyncedAt || (p.last_synced_at && p.last_synced_at > e.lastSyncedAt)) e.lastSyncedAt = p.last_synced_at
    }
    return m
  }, [provRows, operator.id])

  // Latest sync_run per source for this operator (status display).
  const lastRunBySource = useMemo(() => {
    const m = {}
    for (const r of runs) {
      if (r.person_id !== operator.id) continue
      if (!m[r.source_id] || (r.started_at && r.started_at > m[r.source_id].started_at)) m[r.source_id] = r
    }
    return m
  }, [runs, operator.id])

  const IMPLEMENTED = new Set(['sbc', 'qiwa'])

  // Identity field definitions — single source of truth for both pre-sync
  // preview (showing what *will* be captured) and post-sync display. Reads
  // from the iam.gov.sa /auth/trans payload (rich) and falls back to OIDC
  // claim shapes for portals that only expose a JWT.
  const identityFields = (() => {
    const raw = personRow?.nafath_raw || {}
    const fmtMobile = (m) => {
      if (m == null || m === '') return null
      const s = String(m).replace(/\D/g, '')
      if (!s) return null
      if (s.startsWith('966')) return '+966 ' + s.slice(3)
      if (s.startsWith('5')) return '+966 ' + s
      return s
    }
    return [
      // ─── الهوية ─── (الاسم العربي/الإنجليزي، رقم الهوية، إصدارها وتواريخها)
      { k: T('الاسم العربي', 'Arabic name'),         v: personRow?.name_ar || raw.arFullName },
      { k: T('الاسم الإنجليزي', 'English name'),     v: personRow?.name_en || raw.enFullName, ltr: true },
      { k: T('رقم الهوية', 'ID number'),             v: personRow?.id_number || (raw.id != null ? String(raw.id) : null), ltr: true, mono: true },
      { k: T('رقم الإصدار', 'ID issuance no.'),      v: raw.idVersion != null ? String(raw.idVersion) : null, ltr: true, mono: true },
      { k: T('تاريخ إصدار الهوية', 'ID issued'),     v: raw.idIssueDate, ltr: true, mono: true },
      { k: T('تاريخ انتهاء الهوية', 'ID expiry'),    v: raw.idExpDate, ltr: true, mono: true },
      // ─── البيانات الشخصية ───
      { k: T('تاريخ الميلاد', 'Date of birth'),      v: personRow?.birth_date || raw.dob, ltr: true, mono: true },
      { k: T('الجنس', 'Gender'),                     v: personRow?.gender === 'female' ? T('أنثى', 'Female') : (personRow?.gender === 'male' || raw.gender === 'M') ? T('ذكر', 'Male') : (raw.gender === 'F' ? T('أنثى', 'Female') : null) },
      { k: T('الجنسية', 'Nationality'),              v: raw.arNationalityDescription || raw.enNationalityDescription || raw.Nationality || raw.nationality || null },
      // ─── التواصل ───
      { k: T('الجوال', 'Mobile'),                    v: fmtMobile(personRow?.phone_primary || raw.mobile || raw.Mobile || raw.phone_number), ltr: true, mono: true },
      { k: T('البريد الإلكتروني', 'Email'),          v: personRow?.email || raw.email || raw.Email || null, ltr: true },
      // ─── جواز السفر ───
      { k: T('رقم جواز السفر', 'Passport no.'),      v: raw.passportNumber, ltr: true, mono: true },
      { k: T('تاريخ انتهاء الجواز', 'Passport expiry'), v: raw.passportExpDate, ltr: true, mono: true },
      // ─── نفاذ ───
      { k: T('اسم المستخدم في نفاذ', 'Nafath username'), v: raw.username, ltr: true, mono: true },
    ]
  })()

  // Auth log entries from iam.gov.sa /auth/authLogs — recent sign-ins at
  // government services. Used as the *real* operations log when present.
  const authLogs = Array.isArray(personRow?.nafath_auth_logs) ? personRow.nafath_auth_logs : []

  // Best-effort portal name from the JWT issuer claim — lets us tell the user
  // *where* their Nafath identity came from in the operations log.
  const nafathPortal = (() => {
    const iss = personRow?.nafath_raw?.iss || personRow?.nafath_raw?.issuer || ''
    if (!iss) return null
    if (/tayseer|sbc/i.test(iss)) return T('تيسير · المركز السعودي للأعمال', 'Tayseer · SBC')
    if (/qiwa/i.test(iss))        return T('قوى', 'Qiwa')
    if (/muqeem/i.test(iss))      return T('مقيم', 'Muqeem')
    if (/gosi/i.test(iss))        return T('التأمينات الاجتماعية', 'GOSI')
    if (/zatca/i.test(iss))       return T('هيئة الزكاة والدخل', 'ZATCA')
    if (/nafath|elm/i.test(iss))  return T('نفاذ الوطني', 'Nafath National')
    return iss.replace(/^https?:\/\//, '').split('/')[0]
  })()

  // The identity header is clickable (when not already on the Nafath page) to
  // open the dedicated Nafath details view. Click on the back button itself
  // bubbles through stopPropagation so the card-level click doesn't fire.
  const handleHeaderClick = () => {
    if (!showNafathPage) setShowNafathPage(true)
  }

  return (
    <div>
      {/* ═══ Top bar — back button + personalized SBC sync anchor ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => { if (activeTab !== 'hub') setActiveTab('hub'); else onBack() }}
          title={T(activeTab !== 'hub' ? 'رجوع للمشغّل' : 'رجوع', activeTab !== 'hub' ? 'Back to operator' : 'Back')}
          style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg, #363636 0%, #2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = C.gold }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {(lang || 'ar') !== 'en' ? (<><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>) : (<><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>)}
          </svg>
          <span>{T('رجوع', 'Back')}</span>
        </button>
        {/* Drag-to-bookmarks SBC sync — personalized with operator's first + father
            name so the user knows which operator's session this bookmarklet captures.
            Single anchor (no copy/more-options buttons) per user preference. */}
        {(() => {
          const raw = operator?.person?.nafath_raw || {}
          const arFirst = (raw.arFirst || '').trim()
          const arFather = (raw.arFather || raw.arSecond || '').trim()
          const enFirst = (raw.enFirst || '').trim()
          const enFather = (raw.enFather || raw.enSecond || '').trim()
          // Fallback: parse the full name, dropping the " بن " tokens that appear
          // between parts in the canonical Saudi name format.
          const partsAr = (operator?.person?.name_ar || operator?.name_ar || '').split(/\s+/).filter(p => p && p !== 'بن')
          const partsEn = (operator?.person?.name_en || operator?.name_en || '').split(/\s+/).filter(Boolean)
          const ar = (arFirst && arFather) ? `${arFirst} ${arFather}` : (partsAr.length >= 2 ? `${partsAr[0]} ${partsAr[1]}` : (partsAr[0] || ''))
          const en = (enFirst && enFather) ? `${enFirst} ${enFather}` : (partsEn.length >= 2 ? `${partsEn[0]} ${partsEn[1]}` : (partsEn[0] || ''))
          const label = (lang || 'ar') !== 'en'
            ? `مزامنة ${ar || ''} SBC`.replace(/\s+/g, ' ').trim()
            : `${en || ''} SBC Sync`.replace(/\s+/g, ' ').trim()
          const accent = SOURCE_ACCENT.sbc || '#9b59b6'
          return (
            <BookmarkletLink
              href={buildBookmarklet({ sourceId: 'sbc', personId: operator.id })}
              title={T('اسحب لشريط الإشارات لمزامنة منشآت هذا المشغّل', 'Drag to bookmarks to sync this operator')}
              style={{ background: 'transparent', color: accent, border: `1.5px solid ${accent}`, height: 38, fontSize: 12, fontWeight: 800, boxShadow: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              {label}
            </BookmarkletLink>
          )
        })()}
      </div>

      {/* ═══ Identity header ═══ */}
      <div
        style={{
          ...HUB_CARD,
          padding: '10px 18px',
          marginBottom: 14,
          position: 'relative',
          overflow: 'hidden',
          borderColor: nafathSynced ? '#22c55e33' : `${clr}33`,
        }}
      >
        <div style={{ position: 'absolute', insetInlineStart: -80, top: -80, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${clr}18 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* English name pinned to the RTL start (= far right edge of the card) */}
          {(personRow?.name_en || operator.name_en) && (
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx4)', direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0 }}>
              {personRow?.name_en || operator.name_en}
            </div>
          )}
          {/* Arabic name + ID — pushed to the opposite (left) end */}
          <div style={{ minWidth: 0, marginInlineStart: 'auto', textAlign: 'end' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
              {personRow?.name_ar || personDisplayName(operator, 'full')}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx5)', marginTop: 3, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              <span>{T('رقم الهوية', 'ID number')}</span>
              {personRow?.id_number && <>
                <span style={{ opacity: .4 }}>·</span>
                <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace', color: 'var(--tx3)' }}>{personRow.id_number}</span>
              </>}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Hub view — two big-icon cards: Identity / Business ═══ */}
      {activeTab === 'hub' && (() => {
        const profileIcon = (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        )
        const facilitiesIcon = (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/>
          </svg>
        )
        const cards = [
          { id: 'profile', name: T('الملف الشخصي','Personal Profile'), desc: T('في كل المنصات','Across all platforms'), accent: C.gold, icon: profileIcon, meta: nafathSynced ? T('موثّق من نفاذ','Nafath verified') : T('بانتظار توثيق نفاذ','awaiting Nafath'), metaColor: nafathSynced ? '#22c55e' : C.gold },
          { id: 'facilities', name: T('الأعمال','Business'), desc: T('منشآت + عمالة','Facilities + workforce'), accent: SOURCE_ACCENT.sbc || '#9b59b6', icon: facilitiesIcon, meta: (opCoverage.sbc?.facilityIds?.size || 0) + ' ' + T('منشأة','fac.'), metaColor: 'var(--tx3)' },
        ]
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14 }}>
            {cards.map(card => (
              <div key={card.id} role="button" tabIndex={0}
                onClick={() => setActiveTab(card.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab(card.id) } }}
                style={{
                  padding: '32px 24px', borderRadius: 16,
                  background: 'radial-gradient(ellipse at top, ' + card.accent + '12 0%, #1a1a1a 65%)',
                  border: '1px solid ' + card.accent + '33',
                  cursor: 'pointer', transition: '.2s', minHeight: 200,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = card.accent + '77'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = card.accent + '33'; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: `${card.accent}1F`, border: `1.5px solid ${card.accent}66`, color: card.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 8px 22px ${card.accent}33` }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', letterSpacing: '-.2px' }}>{card.name}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)' }}>{card.desc}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: card.metaColor, marginTop: 4 }}>{card.meta}</div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ═══ Dedicated Nafath card — only visible on the Nafath details page ═══ */}
      {showNafathPage && (
      <><div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${C.gold}1A`, border: `1px solid ${C.gold}55`, color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0-3.5 2.5-6 6-6 1.5 0 3 .5 4 1.5"/><path d="M12 11v10"/><path d="M6 7c-2 .5-4 2-4 4 0 3 3 5 7 5"/><circle cx="12" cy="6" r="3"/></svg>
        </span>
        {T('هوية نفاذ', 'Nafath identity')}
      </div>

      {/* Pre-sync: in-app Nafath login. Replaces the old bookmarklet flow.
          Calls the `nafath-proxy` Edge Function to hit iam.gov.sa server-side
          (CORS+cookies are blocked from the browser). */}
      {!nafathSynced && (
        <div style={{ marginBottom: 18 }}>
          <NafathInAppLogin T={T} lang={lang} operator={operator} />
        </div>
      )}

      {/* Post-sync: identity data grid + operations log. */}
      {nafathSynced && (
      <div style={{
        ...HUB_CARD,
        marginBottom: 18,
        position: 'relative',
        overflow: 'hidden',
        borderColor: '#22c55e3a',
        boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)',
      }}>
        <div style={{ position: 'absolute', insetInlineEnd: -100, top: -100, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,.10) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {nafathSynced ? (
          /* ─── POST-SYNC: identity data grid + operations log ─── */
          <>
            <div style={{ position: 'relative', padding: '16px 20px', borderBottom: '1px dashed rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,.16)', border: '1px solid rgba(34,197,94,.4)', color: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--tx)' }}>{T('بيانات الهوية الموثّقة', 'Verified identity data')}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, marginTop: 2 }}>
                    {T('مصدر: نفاذ', 'source: Nafath')} · {fmtRelative(personRow.nafath_synced_at, lang)}
                  </div>
                </div>
              </div>
              <BookmarkletLink href={nafathBookmarklet}
                title={T('اسحب لشريط الإشارات وأعد التشغيل من بوابة حكومية لتحديث البيانات', 'Drag to bookmarks bar and re-run from a portal to refresh data')}
                style={{ height: 30, padding: '0 12px', borderRadius: 8, background: 'transparent', color: C.gold, border: `1.5px solid ${C.gold}66`, fontSize: 11, fontWeight: 800, flexShrink: 0, boxShadow: 'none' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                {T('إعادة المزامنة', 'Resync')}
              </BookmarkletLink>
            </div>

            <div style={{ position: 'relative', padding: '14px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {identityFields.filter(r => r.v).map(r => (
                  <div key={r.k} style={{ padding: '8px 11px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)', minWidth: 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--tx5)', letterSpacing: '.3px' }}>{r.k}</div>
                    <div style={{
                      fontSize: 12.5, fontWeight: 700, marginTop: 3, color: 'var(--tx)',
                      direction: r.ltr ? 'ltr' : undefined,
                      textAlign: r.ltr ? 'start' : undefined,
                      fontFamily: r.mono ? 'ui-monospace, monospace' : undefined,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {r.v}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operations log — real authentication history pulled from
                iam.gov.sa /auth/authLogs (Nafath, GOSI, SBC, …) plus the
                local Jisr sync event itself. */}
            <div style={{ position: 'relative', padding: '12px 20px 16px', borderTop: '1px dashed rgba(255,255,255,.06)' }}>
              <button
                onClick={() => setShowOpsLog(s => !s)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  fontFamily: F, fontSize: 10, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.5px',
                  textTransform: 'uppercase', marginBottom: showOpsLog ? 10 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--tx3)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx5)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {T('سجل عمليات نفاذ', 'Nafath operations log')}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {authLogs.length > 0 && (
                    <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>
                      {T(`${authLogs.length} عملية دخول`, `${authLogs.length} sign-ins`)}
                    </span>
                  )}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .15s', transform: showOpsLog ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </button>
              {showOpsLog && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {/* Jisr sync event (always shown first when synced) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.18)' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,197,94,.18)', color: '#22c55e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx)' }}>{T('تم استيراد الهوية إلى جسر', 'Identity imported into Jisr')}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--tx4)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{fmtTime(personRow.nafath_synced_at)}</span>
                      <span style={{ opacity: .35 }}>·</span>
                      <span>{fmtRelative(personRow.nafath_synced_at, lang)}</span>
                      {nafathPortal && <>
                        <span style={{ opacity: .35 }}>·</span>
                        <span>{T('عبر', 'via')} <b style={{ color: 'var(--tx3)' }}>{nafathPortal}</b></span>
                      </>}
                      <span style={{ opacity: .35 }}>·</span>
                      <span><b style={{ color: '#22c55e' }}>{identityFields.filter(r => r.v).length}</b> {T('حقل', 'fields')}</span>
                    </div>
                  </div>
                </div>

                {/* Auth history from iam.gov.sa — sign-ins at gov services */}
                {authLogs.map((log, i) => {
                  const name = (lang === 'en' ? log.enName : log.arName) || log.enName || log.arName || (T('خدمة #', 'Service #') + log.spId)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${C.gold}1A`, border: `1px solid ${C.gold}44`, color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {T('تسجيل دخول إلى ', 'Sign-in at ')}<span style={{ color: C.gold }}>{name}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--tx4)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                          <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{fmtTime(log.authTime)}</span>
                          <span style={{ opacity: .35 }}>·</span>
                          <span>{fmtRelative(log.authTime, lang)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {authLogs.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--tx5)', fontStyle: 'italic', padding: '6px 2px' }}>
                    {T('لم يُجلب سجل الدخول هذه المرة — أعد المزامنة من بوابة نفاذ لتظهر آخر العمليات.', 'Sign-in history wasn\'t captured this time — resync from the Nafath portal to populate it.')}
                  </div>
                )}
              </div>
              )}
            </div>
          </>
        ) : null}
      </div>
      )}

      {/* ═══ SBC personal profile — pulled from saudibusiness.gov.sa/userprofile/basicInfo ═══ */}
      {(() => {
        const sbc = personRow?.sbc_basic_info
        const sbcSyncedAt = personRow?.sbc_basic_info_synced_at
        const accent = SOURCE_ACCENT.sbc

        const fmtSbcDate = (s) => {
          if (!s) return null
          const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/)
          return m ? `${m[1]}-${m[2]}-${m[3]}` : String(s).split('T')[0] || s
        }
        const fmtBirthdate = (s) => {
          if (!s) return null
          const m = String(s).match(/^\d{4}-\d{2}-\d{2}/)
          if (m) return m[0]
          const d = new Date(s)
          return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10)
        }
        const fmtSbcPhone = (p) => {
          if (!p) return null
          const s = String(p).replace(/\D/g, '')
          if (s.startsWith('00966')) return '+966 ' + s.slice(5)
          if (s.startsWith('966'))   return '+966 ' + s.slice(3)
          if (s.startsWith('5'))     return '+966 ' + s
          return s
        }

        const sbcFields = sbc ? [
          { k: T('الاسم العربي', 'Arabic name'),         v: [sbc.arabicFirstName, sbc.arabicMiddleName, sbc.arabicGrandName, sbc.arabicFamilyName].filter(Boolean).join(' ') || null },
          { k: T('الاسم الإنجليزي', 'English name'),     v: [sbc.englishFirstName, sbc.englishMiddleName, sbc.englishGrandName, sbc.englishFamilyName].filter(Boolean).join(' ') || null, ltr: true },
          { k: T('رقم الهوية', 'ID number'),             v: sbc.identifierID, ltr: true, mono: true },
          { k: T('تاريخ إصدار الهوية', 'ID issued'),     v: fmtSbcDate(sbc.identifierIssueDate), ltr: true, mono: true },
          { k: T('تاريخ انتهاء الهوية', 'ID expiry'),    v: fmtSbcDate(sbc.identifierExpireDate), ltr: true, mono: true },
          { k: T('تاريخ الميلاد', 'Date of birth'),      v: fmtBirthdate(sbc.birthdate), ltr: true, mono: true },
          { k: T('الميلاد هجري', 'Birthdate (Hijri)'),    v: sbc.birthdateHijri, ltr: true, mono: true },
          { k: T('الجنس', 'Gender'),                     v: sbc.gender === 1 ? T('ذكر', 'Male') : sbc.gender === 2 ? T('أنثى', 'Female') : null },
          { k: T('الجنسية', 'Nationality'),              v: (lang || 'ar') !== 'en' ? sbc.arabicNationality : sbc.englishNationality },
          { k: T('الجوال', 'Mobile'),                    v: fmtSbcPhone(sbc.phoneNumber), ltr: true, mono: true },
          { k: T('البريد الإلكتروني', 'Email'),          v: sbc.email, ltr: true },
          { k: T('المهنة', 'Profession'),                v: sbc.profession },
        ].filter(r => r.v) : []

        return (
          <>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx2)', marginBottom: 10, marginTop: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${accent}1A`, border: `1px solid ${accent}55`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
              </span>
              {T('المركز السعودي للأعمال', 'Saudi Business Center')}
            </div>

            {sbc ? (
              <div style={{ ...HUB_CARD, marginBottom: 18, position: 'relative', overflow: 'hidden', borderColor: `${accent}3a`, boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
                <div style={{ position: 'absolute', insetInlineEnd: -100, top: -100, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${accent}1A 0%, transparent 65%)`, pointerEvents: 'none' }} />

                <div style={{ position: 'relative', padding: '16px 20px', borderBottom: '1px dashed rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}1A`, border: `1px solid ${accent}66`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {SOURCE_ICON.sbc}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {T('البيانات الشخصية في المركز السعودي', 'SBC personal data')}
                        {sbc.isVerified && (
                          <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(34,197,94,.14)', color: '#22c55e', fontWeight: 800, border: '1px solid rgba(34,197,94,.34)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {T('موثّق', 'verified')}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, marginTop: 2 }}>
                        {T('مصدر: تيسير · SBC', 'source: Tayseer · SBC')} · {fmtRelative(sbcSyncedAt, lang)}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onOpenSync('sbc', operator.id)}
                    title={T('إعادة مزامنة الملف الشخصي', 'Resync personal profile')}
                    style={{ height: 30, padding: '0 12px', borderRadius: 8, background: 'transparent', color: accent, border: `1.5px solid ${accent}66`, fontFamily: F, fontSize: 11, fontWeight: 800, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}14` }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    {T('إعادة المزامنة', 'Resync')}
                  </button>
                </div>

                <div style={{ position: 'relative', padding: '14px 20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                    {sbcFields.map(r => (
                      <div key={r.k} style={{ padding: '8px 11px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)', minWidth: 0 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--tx5)', letterSpacing: '.3px' }}>{r.k}</div>
                        <div style={{
                          fontSize: 12.5, fontWeight: 700, marginTop: 3, color: 'var(--tx)',
                          direction: r.ltr ? 'ltr' : undefined,
                          textAlign: r.ltr ? 'start' : undefined,
                          fontFamily: r.mono ? 'ui-monospace, monospace' : undefined,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {r.v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ ...HUB_CARD, marginBottom: 18, position: 'relative', overflow: 'hidden', borderColor: `${accent}33`, padding: '20px 22px' }}>
                <div style={{ position: 'absolute', insetInlineEnd: -80, top: -80, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${accent}1A 0%, transparent 65%)`, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${accent}26, ${accent}08)`, border: `1.5px solid ${accent}55`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {SOURCE_ICON.sbc}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.3 }}>
                      {T('لم تتم مزامنة الملف الشخصي من المركز السعودي بعد', 'SBC personal profile hasn\'t been synced yet')}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 500, marginTop: 4, lineHeight: 1.6 }}>
                      {T('سجّل دخول لبوابة تيسير بنفاذ وشغّل المزامنة — راح ننسخ بياناتك الشخصية من المركز السعودي (الاسم، الميلاد، الجوال، البريد، المهنة، حالة التوثيق).',
                         'Sign into the Tayseer portal with Nafath and run sync — we\'ll pull your personal data from SBC (name, DOB, mobile, email, profession, verification status).')}
                    </div>
                  </div>
                  <button onClick={() => onOpenSync('sbc', operator.id)}
                    style={{ height: 38, padding: '0 16px', borderRadius: 10, background: accent, color: '#fff', border: 'none', fontFamily: F, fontSize: 12.5, fontWeight: 900, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: `0 4px 14px ${accent}66, inset 0 1px 0 rgba(255,255,255,.2)` }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    {T('ابدأ المزامنة', 'Start sync')}
                  </button>
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* — pre-sync drag/bookmarklet block (legacy) removed; in-app login above covers it — */}
      {false && (
      <>
        <div style={{ position: 'relative', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${C.gold}26, ${C.gold}08)`, border: `1.5px solid ${C.gold}55`, color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 6px 18px ${C.gold}22` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0-3.5 2.5-6 6-6 1.5 0 3 .5 4 1.5"/><path d="M12 11v10"/><path d="M6 7c-2 .5-4 2-4 4 0 3 3 5 7 5"/><circle cx="12" cy="6" r="3"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.3 }}>
                  {T('لم تتم مزامنة نفاذ لهذا الحساب بعد', 'Nafath sync hasn\'t run for this account yet')}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 500, marginTop: 4, lineHeight: 1.6 }}>
                  {T('سجّل دخول لبوابة نفاذ الوطنية برقم الهوية وكلمة المرور، ثم اضغط الإشارة من شريط الإشارات — راح ننسخ بيانات الهوية الكاملة (اسم، رقم هوية، ميلاد، جنس، جنسية) من جلستك مباشرة.',
                     'Sign in to the Nafath portal with your ID number and password, then click the bookmark — we\'ll pull your full identity (name, ID, DOB, gender, nationality) straight from your session.')}
                </div>
              </div>
            </div>

            {/* Action buttons — drag bookmarklet + open Nafath portal */}
            <div style={{ position: 'relative', padding: '0 20px 14px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <BookmarkletLink href={nafathBookmarklet}
                title={T(`اسحب لشريط الإشارات (إعداد لمرة واحدة) ثم سجّل دخول نفاذ واضغط الإشارة لاستيراد بيانات ${operator.name_ar} الموثّقة`, `Drag to bookmarks bar (one-time setup), then sign into Nafath and click the bookmark to import ${operator.name_en || operator.name_ar} identity`)}
                style={{
                  height: 40, padding: '0 16px', borderRadius: 10,
                  background: C.gold, color: '#1a1a1a', border: 'none',
                  fontSize: 12.5, fontWeight: 900, flexShrink: 0,
                  boxShadow: `0 6px 18px ${C.gold}55, inset 0 1px 0 rgba(255,255,255,.3)`,
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0-3.5 2.5-6 6-6 1.5 0 3 .5 4 1.5"/><path d="M12 11v10"/><path d="M6 7c-2 .5-4 2-4 4 0 3 3 5 7 5"/><circle cx="12" cy="6" r="3"/></svg>
                {T('اسحب «نفاذ» لشريط الإشارات', 'Drag "Nafath" to bookmarks')}
              </BookmarkletLink>
              <a href="https://www.iam.gov.sa/sso/" target="_blank" rel="noreferrer"
                title={T('افتح بوابة نفاذ الوطنية وسجّل دخول برقم الهوية وكلمة المرور', 'Open the National Nafath portal and sign in with your ID and password')}
                style={{
                  height: 40, padding: '0 16px', borderRadius: 10,
                  background: 'rgba(255,255,255,.04)', color: 'var(--tx)',
                  border: `1.5px solid ${C.gold}66`, textDecoration: 'none',
                  fontFamily: F, fontSize: 12.5, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', transition: '.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `${C.gold}14`; e.currentTarget.style.borderColor = `${C.gold}aa` }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.borderColor = `${C.gold}66` }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                {T('افتح بوابة نفاذ الوطنية', 'Open Nafath portal')}
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx5)', direction: 'ltr', fontFamily: 'ui-monospace, monospace', marginInlineStart: 2 }}>iam.gov.sa</span>
              </a>
            </div>

            {/* Steps */}
            <div style={{ position: 'relative', padding: '14px 20px 6px', borderTop: '1px dashed rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                {T('خطوات التشغيل', 'How to run')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                {[
                  { n: 1, t: T('اسحب الزر الذهبي «نفاذ» إلى شريط إشارات المتصفح (مرة واحدة فقط).', 'Drag the gold "Nafath" button onto your browser\'s bookmarks bar (one-time only).') },
                  { n: 2, t: T('افتح بوابة نفاذ الوطنية (iam.gov.sa) واختر «اسم المستخدم وكلمة المرور».', 'Open the National Nafath portal (iam.gov.sa) and choose "Username & password".') },
                  { n: 3, t: T('سجّل دخول برقم الهوية وكلمة المرور الخاصة بك في نفاذ.', 'Sign in with your ID number and Nafath password.') },
                  { n: 4, t: T('من شريط الإشارات اضغط «نفاذ» — تنسخ الهوية وترجع تلقائياً هنا.', 'From your bookmarks bar, click "Nafath" — identity is captured and shown here automatically.') },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${C.gold}1A`, border: `1px solid ${C.gold}55`, color: C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>{s.n}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.6, fontWeight: 500 }}>{s.t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fields preview — what will be registered */}
            <div style={{ position: 'relative', padding: '12px 20px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--tx5)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{T('البيانات التي ستُسجَّل', 'Data that will be registered')}</span>
                <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>
                  {T(`${identityFields.length} حقول`, `${identityFields.length} fields`)}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {identityFields.map(r => (
                  <div key={r.k} style={{ padding: '8px 11px', borderRadius: 8, background: 'rgba(255,255,255,.018)', border: '1px dashed rgba(255,255,255,.07)', minWidth: 0, opacity: .72 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--tx5)', letterSpacing: '.3px' }}>{r.k}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: 'var(--tx5)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, opacity: .55 }} />
                      {T('بانتظار', 'pending')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </>
      )}

      {/* ═══ Tab 2 — Facilities & workers (SBC drilldown, scoped to this operator) ═══ */}
      {activeTab === 'facilities' && (
        <SbcFacilities sb={sb} toast={toast} lang={lang}
          personFilter={operator.person_id ? { person_id: operator.person_id, name_ar: operator.name_ar } : null}
          onTriggerSync={() => onOpenSync && onOpenSync('sbc', operator.id)} />
      )}

      {/* ═══ Legacy platforms grid — kept disabled while tabs replace it ═══ */}
      {false && (
      <>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: clr, boxShadow: `0 0 6px ${clr}aa` }} />
        {T('المنصات — مزامنة المنشآت والعمالة', 'Platforms — sync facilities & workers')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {sources.map(s => {
          const accent = SOURCE_ACCENT[s.id] || C.gold
          const cov = opCoverage[s.id] || { facilityIds: new Set(), lastSyncedAt: null }
          const facilityCount = cov.facilityIds instanceof Set ? cov.facilityIds.size : (cov.facilities || 0)
          const available = IMPLEMENTED.has(s.id)
          const lastRun = lastRunBySource[s.id]
          const synced = facilityCount > 0
          // Card-level click opens the source's facilities page for sources
          // we've implemented (SBC, Qiwa). The inner "Sync now" button stops
          // propagation so it still opens the bookmarklet modal directly.
          const openSource = available && onOpenSource ? () => onOpenSource(s.id) : null
          return (
            <div key={s.id}
              role={openSource ? 'button' : undefined}
              tabIndex={openSource ? 0 : undefined}
              onClick={openSource || undefined}
              onKeyDown={openSource ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSource() } } : undefined}
              title={openSource ? T('فتح صفحة ' + s.name_ar, 'Open ' + (s.name_en || s.name_ar)) : undefined}
              style={{
                ...HUB_CARD,
                padding: '14px 14px 12px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column', gap: 10,
                borderColor: synced ? `${accent}33` : 'rgba(255,255,255,.06)',
                cursor: openSource ? 'pointer' : 'default',
                transition: 'border-color .15s, transform .15s, box-shadow .15s',
              }}
              onMouseEnter={openSource ? (e) => {
                e.currentTarget.style.borderColor = `${accent}77`
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = `0 8px 22px rgba(0,0,0,.28), 0 0 0 3px ${accent}10, inset 0 1px 0 rgba(255,255,255,.05)`
              } : undefined}
              onMouseLeave={openSource ? (e) => {
                e.currentTarget.style.borderColor = synced ? `${accent}33` : 'rgba(255,255,255,.06)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = HUB_CARD.boxShadow
              } : undefined}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}1A`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accent}33` }}>
                  {SOURCE_ICON[s.id] || SOURCE_ICON.sbc}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 800, color: 'var(--tx)',
                    lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', wordBreak: 'break-word',
                  }}>{s.name_ar}</div>
                </div>
                {openSource && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: accent, opacity: .6, flexShrink: 0 }}>
                    <path d={(lang || 'ar') !== 'en' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}/>
                  </svg>
                )}
              </div>

              {/* Status */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: synced ? accent : 'var(--tx3)', letterSpacing: '-.4px', direction: 'ltr', lineHeight: 1 }}>{facilityCount}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('منشأة', 'fac.')}</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {cov.lastSyncedAt ? fmtRelative(cov.lastSyncedAt, lang) : T('لم تتم المزامنة بعد', 'never synced')}
              </div>

              {/* Sync button — stops propagation so the card-level click
                  doesn't fire and switch the page. */}
              <div style={{ marginTop: 'auto' }}>
                {available ? (
                  <button onClick={(e) => { e.stopPropagation(); onOpenSync(s.id, operator.id) }}
                    style={{ width: '100%', height: 32, borderRadius: 8,
                      background: synced ? `${accent}14` : accent,
                      border: synced ? `1px solid ${accent}55` : 'none',
                      color: synced ? accent : '#1a1a1a',
                      fontFamily: F, fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: synced ? 'none' : `0 4px 12px ${accent}44, inset 0 1px 0 rgba(255,255,255,.25)`,
                      transition: '.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    {synced ? T('مزامنة جديدة', 'Sync again') : T('ابدأ المزامنة', 'Start sync')}
                  </button>
                ) : (
                  <div style={{ width: '100%', height: 32, borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px dashed rgba(255,255,255,.1)', color: 'var(--tx5)', fontFamily: F, fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '.3px' }}>
                    {T('قريباً', 'Coming soon')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Hint card */}
      <div style={{ ...HUB_CARD, padding: '12px 16px', marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, borderColor: `${clr}26` }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clr} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <div style={{ fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.6 }}>
          {T('كل مزامنة من منصة معيّنة تنزّل بيانات هذا الشخص ومنشآته وعمّاله. الـ provenance يحفظ بالضبط أي بيانات جاءت من أي منصة وفي أي وقت.',
             'Each sync from a platform pulls this person\'s data, facilities, and workers. Provenance tracks exactly which data came from which platform and when.')}
        </div>
      </div>
      </>
      )}
    </div>
  )
}

// Domain summary — two big cards (facilities + workers) showing the aggregate
// state of each domain across ALL operators and ALL platforms. Replaces the
// platform-by-platform grid at the overview level — platforms only matter
// inside an operator's drilldown.
function DomainSummary({ sources, facilityCoverage, workerCoverage, totalFacilities, totalWorkers, coveredFacilities, coveredWorkers, onOpenFacilities, T, lang }) {
  const sourceName = (id) => sources.find(s => s.id === id)?.name_ar || id

  // Sort source pills by contribution descending — most-active source first.
  const sourcePills = (covMap, valueKey) => {
    const entries = Object.entries(covMap || {})
      .map(([sid, v]) => ({ sid, count: v[valueKey] || 0, lastSyncedAt: v.lastSyncedAt }))
      .filter(e => e.count > 0)
      .sort((a, b) => b.count - a.count)
    return entries
  }

  const Card = ({ icon, accent, title, total, covered, covMap, valueKey, hint, onOpen, emptyHint }) => {
    const pills = sourcePills(covMap, valueKey)
    const pct = total ? Math.round((covered / total) * 100) : 0
    return (
      <div style={{
        ...HUB_CARD,
        padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', overflow: 'hidden',
        minHeight: 180,
      }}>
        <div style={{ position: 'absolute', insetInlineStart: -50, top: -50, width: 170, height: 170, borderRadius: '50%', background: `radial-gradient(circle, ${accent}1A 0%, transparent 65%)`, pointerEvents: 'none' }} />

        {/* Header row */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}1A`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accent}33` }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--tx)' }}>{title}</div>
            <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, marginTop: 2 }}>
              {pills.length > 0
                ? T(`من ${pills.length} مصدر`, `from ${pills.length} sources`)
                : T('لا يوجد مصدر مساهم بعد', 'no contributing source yet')}
            </div>
          </div>
        </div>

        {/* Big total + coverage bar */}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, direction: 'ltr', justifyContent: 'flex-start' }}>
            <span style={{ fontSize: 38, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.8px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{total.toLocaleString('en-US')}</span>
            <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{hint}</span>
            <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 800, color: pct ? accent : 'var(--tx5)', direction: 'ltr' }}>{pct}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.05)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})`, transition: 'width .4s ease' }} />
          </div>
        </div>

        {/* Per-source contribution pills */}
        <div style={{ position: 'relative', minHeight: 24, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {pills.length === 0 ? (
            <span style={{ fontSize: 10.5, color: 'var(--tx5)', fontStyle: 'italic' }}>{emptyHint}</span>
          ) : (
            pills.map(p => {
              const c = SOURCE_ACCENT[p.sid] || '#888'
              return (
                <span key={p.sid} title={`${sourceName(p.sid)}: ${p.count}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '3px 9px', borderRadius: 999,
                    background: `${c}16`, border: `1px solid ${c}3A`,
                    fontSize: 10.5, fontWeight: 700, color: c,
                  }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                  {sourceName(p.sid)}
                  <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 800, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{p.count}</span>
                </span>
              )
            })
          )}
        </div>

        {/* Footer action */}
        {onOpen && total > 0 && (
          <div style={{ position: 'relative', marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onOpen}
              style={{ height: 30, padding: '0 14px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${accent}55`, color: accent,
                fontFamily: F, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 5, transition: '.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${accent}14` }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              {T('عرض الكل', 'View all')}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d={(lang || 'ar') !== 'en' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}/>
              </svg>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, boxShadow: `0 0 6px ${C.gold}aa` }} />
        {T('البيانات المجمّعة', 'Aggregated Data')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
        <Card
          accent={C.gold}
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg>}
          title={T('المنشآت', 'Facilities')}
          total={totalFacilities}
          covered={coveredFacilities}
          covMap={facilityCoverage}
          valueKey='facilities'
          hint={T('منشأة', 'facilities')}
          onOpen={onOpenFacilities}
          emptyHint={T('شغّل أول مزامنة من تيسير ليتدفّق هنا', 'Run first sync from Tayseer to populate')}
        />
        <Card
          accent='#3b82f6'
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          title={T('العمالة', 'Workers')}
          total={totalWorkers}
          covered={coveredWorkers}
          covMap={workerCoverage}
          valueKey='workers'
          hint={T('عامل', 'workers')}
          emptyHint={T('شغّل مزامنة قوى / مقيم لتدفّق العمالة', 'Run Qiwa / Muqeem sync to populate')}
        />
      </div>
    </div>
  )
}

// Source coverage grid (kept available for use inside operator drilldown context;
// no longer rendered on the hub overview).
function SourcesGrid({ sources, coverage, latestRunBy, persons, totalFacilities, onOpen, onSync, T, lang }) {
  const IMPLEMENTED = new Set(['sbc', 'qiwa'])
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx2)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, boxShadow: `0 0 6px ${C.gold}aa` }} />
        {T('المصادر', 'Sources')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {sources.map(s => {
          const accent = SOURCE_ACCENT[s.id] || C.gold
          const cov = coverage[s.id] || { facilities: 0, operators: 0, lastSyncedAt: null }
          const pct = totalFacilities ? Math.round((cov.facilities / totalFacilities) * 100) : 0
          const available = IMPLEMENTED.has(s.id)
          const fresh = cov.lastSyncedAt ? (() => {
            const hrs = (Date.now() - new Date(cov.lastSyncedAt).getTime()) / 3600000
            if (hrs < 24) return { color: '#22c55e', label: T('حديثة', 'Fresh') }
            if (hrs < 24 * 7) return { color: '#f59e0b', label: T('قديمة', 'Stale') }
            return { color: '#ef4444', label: T('متأخرة', 'Overdue') }
          })() : null
          return (
            <div key={s.id}
              onClick={() => onOpen(s.id)}
              style={{
                ...HUB_CARD,
                padding: '14px 14px 12px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex', flexDirection: 'column', gap: 10,
                transition: '.18s cubic-bezier(.4,0,.2,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${accent}50` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)' }}>

              {/* Top-right freshness dot — silent freshness signal */}
              {fresh && (
                <span title={fresh.label} style={{ position: 'absolute', top: 10, [lang === 'en' ? 'right' : 'left']: 10, width: 8, height: 8, borderRadius: '50%', background: fresh.color, boxShadow: `0 0 7px ${fresh.color}aa` }} />
              )}

              {/* Header: icon + name. Name wraps to 2 lines max if long; the
                  English fallback is dropped to save horizontal room because the
                  icon already identifies the source. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}1A`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accent}33` }}>
                  {SOURCE_ICON[s.id] || SOURCE_ICON.sbc}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 800, color: 'var(--tx)',
                    lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', wordBreak: 'break-word',
                  }}>{s.name_ar}</div>
                </div>
              </div>

              {/* Coverage hero number */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.4px', direction: 'ltr', lineHeight: 1 }}>{cov.facilities}</span>
                  <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>/ {totalFacilities}</span>
                  <span style={{ marginInlineStart: 'auto', fontSize: 10.5, fontWeight: 800, color: accent, direction: 'ltr' }}>{pct}%</span>
                </div>
                {/* Coverage bar */}
                <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,.05)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${accent}99, ${accent})`, borderRadius: 999, transition: 'width .4s ease' }} />
                </div>
              </div>

              {/* Footer: operators + last sync + sync button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {cov.lastSyncedAt ? fmtRelative(cov.lastSyncedAt, lang) : T('لم تُزامَن', 'never')}
                </div>
                {available ? (
                  <button onClick={e => { e.stopPropagation(); onSync(s.id) }}
                    style={{ height: 26, padding: '0 10px', borderRadius: 7,
                      background: `${accent}18`, border: `1px solid ${accent}55`, color: accent,
                      fontFamily: F, fontSize: 10.5, fontWeight: 800, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 4, transition: '.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}28` }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${accent}18` }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    {T('مزامنة', 'Sync')}
                  </button>
                ) : (
                  <span style={{ fontSize: 9.5, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,.04)', color: 'var(--tx5)', fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase' }}>
                    {T('قريباً', 'Soon')}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Latest sync runs across all sources — compact timeline so the user sees
// activity at a glance without opening any drill-down.
function RecentActivity({ runs, sources, persons, T, lang }) {
  const personById = (id) => persons.find(p => p.id === id)
  const sourceById = (id) => sources.find(s => s.id === id)
  const items = runs.filter(r => r.status === 'success').slice(0, 8)
  return (
    <div style={{ ...HUB_CARD, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55eaa' }} />
          {T('آخر النشاط', 'Recent Activity')}
        </div>
        <div style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>{T('آخر 8 عمليات مزامنة', 'last 8 syncs')}</div>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: '20px 8px', textAlign: 'center', fontSize: 11.5, color: 'var(--tx4)' }}>
          {T('لا يوجد نشاط بعد — شغّل أول مزامنة من أي مصدر أعلاه.', 'No activity yet — run the first sync from any source above.')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(r => {
            const s = sourceById(r.source_id)
            const p = personById(r.person_id)
            const accent = SOURCE_ACCENT[r.source_id] || C.gold
            const pClr = p ? personColor(p) : 'var(--tx5)'
            const added = r.records_added || 0, modified = r.records_modified || 0, removed = r.records_removed || 0
            const hasDiffs = (added + modified + removed) > 0
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${accent}33` }}>
                  {SOURCE_ICON[r.source_id] || SOURCE_ICON.sbc}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--tx)' }}>
                    {s?.name_ar || r.source_id}
                    <span style={{ color: 'var(--tx5)', fontWeight: 500, marginInline: 6 }}>·</span>
                    <span style={{ color: pClr, fontWeight: 700 }}>{p?.name_ar || T('بدون مشغّل', 'unattributed')}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtRelative(r.started_at, lang)}</span>
                    <span style={{ opacity: .4 }}>·</span>
                    <span style={{ direction: 'ltr' }}>{r.records_fetched || 0} {T('سجل', 'records')}</span>
                  </div>
                </div>
                {hasDiffs && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {added > 0 && <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(34,197,94,.12)', color: '#22c55e', fontWeight: 800, border: '1px solid rgba(34,197,94,.3)' }}>+{added}</span>}
                    {modified > 0 && <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(245,158,11,.12)', color: '#f59e0b', fontWeight: 800, border: '1px solid rgba(245,158,11,.3)' }}>✎{modified}</span>}
                    {removed > 0 && <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 999, background: 'rgba(239,68,68,.12)', color: '#ef4444', fontWeight: 800, border: '1px solid rgba(239,68,68,.3)' }}>−{removed}</span>}
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

function SbcDrilldown({ sb, toast, user, lang, activePerson, persons, scopedOperator, onBack, onOpenSync, filteredChanges, personName, T }) {
  const [changesOpen, setChangesOpen] = useState(false)

  const operatorAsPersonFilter = scopedOperator ? {
    person_id: scopedOperator.person_id,
    name_ar: scopedOperator.name_ar,
  } : null

  return (
    <div>
      <SbcFacilities sb={sb} toast={toast} user={user} lang={lang}
        personFilter={operatorAsPersonFilter}
        onTriggerSync={() => onOpenSync('sbc', scopedOperator?.id)} />
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
// Qiwa drill-down — mirrors the SBC panel shape.
// ═══════════════════════════════════════════════════════════════
function QiwaDrilldown({ sb, toast, user, lang, activePerson, onBack, filteredChanges, personName, T }) {
  return (
    <div>
      <QiwaFacilities sb={sb} toast={toast} user={user} lang={lang} />
      {filteredChanges.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 10 }}>{T('تغييرات قوى', 'Qiwa Changes')}</div>
          {filteredChanges.slice(0, 20).map((c, i) => (
            <div key={c.id} style={{ fontSize: 11.5, padding: '6px 0', borderBottom: i < Math.min(filteredChanges.length, 20) - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', color: 'var(--tx2)' }}>
              {changeLabel(c, T)} <span style={{ color: 'var(--tx4)', fontSize: 10 }}>· {personName(c.person_id)} · {fmtRelative(c.detected_at, lang)}</span>
            </div>
          ))}
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

// ═══════════════════════════════════════════════════════════════
// Shared side-panel primitives — matches the profile panel design
// (480px slide-out, gold dividers, header/content/footer sections).
// ═══════════════════════════════════════════════════════════════
function SidePanel({ onClose, lang, accent = C.gold, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const isAr = (lang || 'ar') !== 'en'
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', zIndex: 9997 }} />
      <div style={{ position: 'fixed', top: 0, [isAr ? 'left' : 'right']: 0, width: 'min(480px,94vw)', height: '100vh', background: 'var(--sf)', zIndex: 9998, display: 'flex', flexDirection: 'column', fontFamily: F, direction: isAr ? 'rtl' : 'ltr', boxShadow: isAr ? '8px 0 40px rgba(0,0,0,.5)' : '-8px 0 40px rgba(0,0,0,.5)', borderRight: isAr ? `1px solid ${accent}1F` : 'none', borderLeft: isAr ? 'none' : `1px solid ${accent}1F`, animation: (isAr ? 'slideInLeft' : 'slideInRight') + ' .25s ease' }}>
        {children}
      </div>
    </>
  )
}

function PanelHeader({ accent = C.gold, avatar, title, subtitle, meta, onClose }) {
  return (
    <div style={{ padding: '20px 22px 14px', borderBottom: `1px solid ${accent}1F`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10, color: `${accent}`, opacity: .72, marginTop: 2 }}>{subtitle}</div>}
        {meta && <div style={{ fontSize: 9, color: 'var(--tx5)', marginTop: 1 }}>{meta}</div>}
      </div>
      <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
      </button>
    </div>
  )
}

function FieldLabel({ children, muted }) {
  return <div style={{ fontSize: 10, fontWeight: 600, color: muted ? 'var(--tx4)' : 'var(--tx3)', marginBottom: 4 }}>{children}</div>
}

const panelInputS = { width: '100%', height: 38, padding: '0 12px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 8, fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--tx)', background: 'rgba(255,255,255,.04)', outline: 'none', textAlign: 'center' }

// ═══════════════════════════════════════════════════════════════
// Person Manager — side drawer matching the profile panel design
// ═══════════════════════════════════════════════════════════════
function PersonManagerPanel({ sb, toast, lang, user, persons, onClose, onChanged, T }) {
  // Minimal capture: the temporary alias, the ID, and the Nafath password.
  // Everything else (official full name, phone, email, facilities, GOSI,
  // iqamas, …) flows in from the sync sources after the first run.
  const isAr = (lang || 'ar') !== 'en'
  const emptyForm = { name_ar: '', id_number: '', password: '' }
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState({})
  const [tried, setTried] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name_ar.trim()) e.name_ar = T('أدخل الاسم', 'Enter the name')
    if (!form.id_number.trim()) e.id_number = T('أدخل رقم الهوية', 'Enter the ID number')
    else if (!/^[12]\d{9}$/.test(form.id_number.trim())) e.id_number = T('رقم الهوية يجب أن يبدأ بـ 1 أو 2 ومكوّن من 10 أرقام', 'ID must start with 1 or 2 and be 10 digits')
    return e
  }

  const save = async () => {
    const e = validate()
    setErr(e); setTried(true)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      const nameAr = form.name_ar.trim()
      const idNum = form.id_number.trim() || null

      // Reuse an existing persons row if the ID is already on file; else
      // create a fresh one. Either way we end up with a linked sync_persons.
      let personId = null
      if (idNum) {
        const { data: dup } = await sb.from('persons')
          .select('id').eq('id_number', idNum).is('deleted_at', null).maybeSingle()
        if (dup?.id) personId = dup.id
      }
      if (!personId) {
        const { data: created, error: pErr } = await sb.from('persons').insert({
          name_ar: nameAr, id_number: idNum,
        }).select('id').single()
        if (pErr) throw pErr
        personId = created.id
      }
      const color = PERSON_PALETTE[persons.length % PERSON_PALETTE.length]
      const maxOrder = (persons[persons.length - 1]?.sort_order || 0) + 10
      const { error: sErr } = await sb.from('sync_persons').insert({
        person_id: personId,
        name_ar: nameAr,
        color,
        sort_order: maxOrder,
      })
      if (sErr) throw sErr
      toast?.(T('تم إضافة المشغّل', 'Operator added'))
      setForm(emptyForm); setErr({}); setTried(false)
      onChanged?.()
      onClose?.()
    } catch (e2) { toast?.('خطأ: ' + (e2.message || e2)) }
    setSaving(false)
  }

  // Escape closes the modal.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // KafalaCalculator-matched primitives — same input/label rhythm.
  const sF = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxSizing: 'border-box', textAlign: 'center', transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }
  const Lbl = ({ children, req }) => <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }}>{children}{req && <span style={{ color: C.red, marginInlineStart: 2 }}>*</span>}</div>
  const firstErr = Object.values(err)[0]

  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }
  const modalBox = { background: 'var(--modal-bg)', borderRadius: 16, width: 640, maxWidth: '95vw', height: 'auto', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 60 }

  return (
    <div onClick={onClose} style={modalOverlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* Header — matches KafalaCalculator */}
          <div style={{ padding: '20px 24px 0', flexShrink: 0, display: 'flex', flexDirection: 'column', direction: isAr ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx)', fontFamily: F, lineHeight: 1.2 }}>{T('المشغّل','Operator')}</div>
              </div>
              <button onClick={onClose} aria-label={T('إغلاق','Close')}
                onMouseEnter={e=>{e.currentTarget.style.background='linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)';e.currentTarget.style.borderColor='rgba(192,57,43,.4)';e.currentTarget.style.color='#e5867a'}}
                onMouseLeave={e=>{e.currentTarget.style.background='linear-gradient(180deg,#323232 0%,#262626 100%)';e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.color='var(--tx3)'}}
                style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <style>{`.pm-scroll::-webkit-scrollbar{width:0;display:none}.pm-scroll{scrollbar-width:none;-ms-overflow-style:none}.pm-scroll input:focus{border-color:rgba(255,255,255,.16)!important;box-shadow:none!important}`}</style>
          <div className="pm-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Bordered card — kafala-style with floating gold title */}
            <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '20px 22px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -10, [isAr ? 'right' : 'left']: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>{T('بيانات المشغّل','Operator Data')}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name (temporary alias) */}
                <div>
                  <Lbl req>{T('الاسم (مؤقت)','Name (temporary)')}</Lbl>
                  <input autoFocus value={form.name_ar}
                    onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))}
                    placeholder={T('مثال: مهدي صالح اليامي','e.g., Mahdi Saleh Alyami')}
                    style={{ ...sF, direction: 'rtl', border: tried && err.name_ar ? '1px solid rgba(192,57,43,.5)' : sF.border }} />
                  <div style={{ fontSize: 11, color: 'var(--tx5)', marginTop: 6, lineHeight: 1.6, textAlign: 'start' }}>
                    {T('يُحدّث تلقائياً بالاسم الرسمي الكامل بعد أول مزامنة مع نفاذ.','Auto-replaced with the official full name after the first Nafath sync.')}
                  </div>
                </div>

                {/* ID number */}
                <div>
                  <Lbl req>{T('رقم الهوية','ID Number')}</Lbl>
                  <input value={form.id_number}
                    onChange={e => setForm(f => ({ ...f, id_number: e.target.value.replace(/\D/g,'').slice(0,10) }))}
                    placeholder="2XXXXXXXXX" dir="ltr" inputMode="numeric" maxLength={10}
                    style={{ ...sF, direction: 'ltr', border: tried && err.id_number ? '1px solid rgba(192,57,43,.5)' : sF.border }} />
                </div>

                {/* Nafath password */}
                <div>
                  <Lbl>{T('كلمة مرور نفاذ','Nafath Password')}</Lbl>
                  <div style={{ position: 'relative' }}>
                    <input value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') save() }}
                      type={showPwd ? 'text' : 'password'} placeholder="••••••••"
                      style={{ ...sF, direction: 'ltr', paddingInlineEnd: 42 }} />
                    <button type="button" onClick={() => setShowPwd(s => !s)} aria-label={showPwd ? T('إخفاء','Hide') : T('إظهار','Show')}
                      style={{ position: 'absolute', top: '50%', [isAr ? 'left' : 'right']: 8, transform: 'translateY(-50%)', width: 30, height: 30, background: 'transparent', border: 'none', color: 'var(--tx4)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                      {showPwd ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Info hint */}
            <div style={{ fontSize: 12, color: 'var(--tx4)', lineHeight: 1.75, padding: '12px 14px', borderRadius: 10, background: 'rgba(212,160,23,.04)', border: '1px dashed rgba(212,160,23,.18)', textAlign: 'start' }}>
              {T('بعد الحفظ، باقي البيانات (الاسم الرسمي، الجوال، البريد، المنشآت، التأمينات، الإقامات…) بتنزل تلقائياً مع كل مزامنة من نفاذ، تيسير، قوى، التأمينات، ومقيم.',
                 'After saving, the rest (official name, phone, email, facilities, GOSI, iqamas…) flows in automatically with each sync from Nafath, Tayseer, Qiwa, GOSI, and Muqeem.')}
            </div>
          </div>

          {/* Footer — kafala kc-nav-btn style */}
          <style>{`.pm-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.pm-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.pm-nav-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.pm-nav-btn:hover:not(:disabled) .nav-ico{transform:translateX(${isAr ? '-4px' : '4px'})}.pm-nav-btn:disabled{opacity:.5;cursor:not-allowed}@keyframes pm-spin{to{transform:rotate(360deg)}}`}</style>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '4px 24px 16px', flexShrink: 0 }}>
            <div style={{ justifySelf: 'start' }} />
            <div style={{ justifySelf: 'center', textAlign: 'center', minHeight: 16 }}>
              {tried && firstErr && (
                <span style={{ fontSize: 12, fontWeight: 400, color: C.red, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {firstErr}
                </span>
              )}
            </div>
            <div style={{ justifySelf: 'end' }}>
              <button onClick={save} disabled={saving} className="pm-nav-btn">
                <span>{saving ? T('جاري الحفظ…','Saving…') : T('حفظ','Save')}</span>
                <span className="nav-ico">
                  {saving ? (
                    <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'pm-spin 0.7s linear infinite' }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {isAr ? <polyline points="15 18 9 12 15 6"/> : <polyline points="9 18 15 12 9 6"/>}
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sync Install Panel — side drawer with bookmarklet + instructions
// ═══════════════════════════════════════════════════════════════
function SyncInstallPanel({ sourceId, person, sourceObj, onClose, T, lang }) {
  const isQiwa = sourceId === 'qiwa'
  const accent = SOURCE_ACCENT[sourceId] || C.gold
  const pClr = personColor(person)
  const portalUrl = isQiwa ? 'https://qiwa.sa' : 'https://www.saudibusiness.gov.sa'
  const portalLabel = isQiwa ? 'qiwa.sa' : 'saudibusiness.gov.sa'
  const bookmarklet = useMemo(
    () => (isQiwa ? buildQiwaBookmarklet({ sourceId, personId: person?.id }) : buildBookmarklet({ sourceId, personId: person?.id })),
    [isQiwa, sourceId, person?.id]
  )
  // Version stamp — bump when bookmarklet code changes so users can spot stale installs vs. new ones in their bookmarks bar.
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const bookmarkLabel = isQiwa ? `جسر قوى — ${person?.name_ar || ''} · ${stamp}` : `مزامنة جسر — ${person?.name_ar || ''} · ${stamp}`

  const [copied, setCopied] = useState(false)
  const copyBookmarklet = async () => {
    try {
      await navigator.clipboard.writeText(bookmarklet)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked — the drag/install flow still works */ }
  }

  return (
    <SidePanel onClose={onClose} lang={lang} accent={accent}>
      <PanelHeader
        accent={accent}
        avatar={
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}28, ${accent}08)`, border: `2px solid ${accent}44`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </div>
        }
        title={T(`مزامنة ${sourceObj?.name_ar || sourceId}`, `${sourceObj?.name_en || sourceId} Sync`)}
        subtitle={sourceObj?.description_ar || (SOURCE_META[sourceId]?.descAr) || ''}
        onClose={onClose}
      />

      {/* Content */}
      <div className='dash-content' style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>

        {/* Person info card */}
        <div style={{ padding: '12px 14px', borderRadius: 12, background: `linear-gradient(135deg, ${pClr}16, ${pClr}04)`, border: `1px solid ${pClr}33`, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${pClr}30, ${pClr}08)`, border: `2px solid ${pClr}55`, color: pClr, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
            {personInitial(person)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, marginBottom: 1 }}>{T('الحساب المستخدم', 'Account used')}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--tx)' }}>{person?.name_ar}</div>
            {person?.note_ar && <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{person.note_ar}</div>}
          </div>
          <div style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, background: `${accent}18`, color: accent, fontWeight: 800, border: `1px solid ${accent}40`, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {sourceObj?.name_ar || sourceId}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.7, marginBottom: 14 }}>
          {T('كل السجلات التي تستوردها هذه الإشارة المرجعية ستُحفظ تحت اسم ', 'All records imported by this bookmarklet will be saved under ')}
          <b style={{ color: pClr }}>{person?.name_ar}</b>
          {T(' مع وقت الاستيراد والفوارق التفصيلية. يمكنك تبديل الأشخاص بإعادة فتح هذه النافذة من تبويب آخر.', ' with timestamps and detailed diffs. Switch people by reopening this panel from a different tab.')}
        </div>

        {/* Step 1 */}
        <div style={{ padding: 14, borderRadius: 12, background: `${accent}0F`, border: `1px solid ${accent}33`, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: accent, color: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>1</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: accent }}>{T('ثبّت الإشارة في المتصفح', 'Install the bookmark')}</div>
          </div>
          <ol style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.8, margin: '0 0 12px 0', paddingInlineStart: 20 }}>
            <li>{T('اضغط ', 'Press ')}<kbd style={{ background: 'rgba(0,0,0,.3)', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontFamily: 'ui-monospace, monospace', border: '1px solid rgba(255,255,255,.1)' }}>Ctrl+Shift+B</kbd>{T(' لإظهار شريط الإشارات.', ' to show the bookmark bar.')}</li>
            <li>{T('اسحب الزر الملوّن أدناه إلى الشريط.', 'Drag the colored button below onto the bar.')}</li>
          </ol>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <BookmarkletLink href={bookmarklet} title={bookmarkLabel} style={{ background: accent, color: '#1a1a1a' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              {bookmarkLabel}
            </BookmarkletLink>
            <button onClick={copyBookmarklet} title={T('نسخ رابط الإشارة', 'Copy bookmarklet URL')} style={{ height: 'auto', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: 'var(--tx2)', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {copied ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{T('تم النسخ', 'Copied')}</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>{T('نسخ', 'Copy')}</>
              )}
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ padding: 14, borderRadius: 12, background: 'rgba(52,131,180,.08)', border: '1px solid rgba(52,131,180,.28)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }}>2</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>{T('شغّل الإشارة من داخل البوابة', 'Run it from inside the portal')}</div>
          </div>
          <ol style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.8, margin: 0, paddingInlineStart: 20 }}>
            <li>{T('افتح ', 'Open ')}<a href={portalUrl} target='_blank' rel='noreferrer' style={{ color: accent, fontWeight: 700 }}>{portalLabel}</a>{T(' وسجّل الدخول بنفاذ باسم ', ' and log in via Nafath as ')}<b>{person?.name_ar}</b>.</li>
            <li>{isQiwa
              ? T('اضغط الإشارة من صفحة قائمة المنشآت (لقائمة كاملة) أو من لوحة تحكم منشأة (لتفاصيلها).', 'Click the bookmark on the workspaces page (full list) or inside a company dashboard (its details).')
              : <>{T('اضغط إشارة «', 'Click the "')}{bookmarkLabel}{T('» المثبّتة في الشريط.', '" bookmark you just installed.')}</>}</li>
            <li>{T('انتظر رسالة «تمت المزامنة» — الفوارق تُسجَّل تلقائياً وتظهر في السجل الزمني.', 'Wait for "Sync done" — diffs are logged automatically and appear in the timeline.')}</li>
          </ol>
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 14, fontSize: 10, color: 'var(--tx4)', lineHeight: 1.7 }}>
          {T('ملاحظة: هذه الإشارة مرتبطة بهذا الشخص فقط. لا يمكن استخدامها لحساب شخص آخر — افتح النافذة من تبويب الشخص المطلوب.', 'Note: this bookmark is tied to this person only. To sync a different account, open the panel from that person\'s tab.')}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${accent}1F`, display: 'flex', gap: 10, flexDirection: 'row-reverse', flexShrink: 0 }}>
        <button onClick={onClose} style={{ height: 38, padding: '0 28px', borderRadius: 11, background: accent, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
          {T('تم', 'Done')}
        </button>
        <a href={portalUrl} target='_blank' rel='noreferrer' style={{ height: 38, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1.5px solid rgba(255,255,255,.12)', color: 'var(--tx4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          {portalLabel}
        </a>
      </div>
    </SidePanel>
  )
}
