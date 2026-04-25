import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SbcFacilities from './SbcFacilities.jsx'
import QiwaFacilities from './QiwaFacilities.jsx'
import { buildBookmarklet } from './sbcSyncBookmarklet.js'
import { buildQiwaBookmarklet } from './qiwaSyncBookmarklet.js'

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
const personInitial = (p) => (p?.name_ar || p?.name_en || '?').trim().charAt(0)

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
  sbc: C.gold, qiwa: C.ok, gosi: C.blue, muqeem: C.purple,
  mudad: '#e67e22', zatca: C.red, ajeer: '#06b6d4', chambers: '#ec4899',
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
  const [personMgr, setPersonMgr] = useState(false)
  const [syncModal, setSyncModal] = useState(null)        // { sourceId, personId }
  const [refreshTick, setRefreshTick] = useState(0)

  const load = useCallback(async () => {
    if (!sb) return
    const [pr, src, rn, ch] = await Promise.all([
      sb.from('sync_persons').select('*').is('deleted_at', null).order('sort_order').order('name_ar'),
      sb.from('sync_sources').select('*').eq('enabled', true).order('sort_order'),
      sb.from('sync_runs').select('*').order('started_at', { ascending: false }).limit(500),
      sb.from('sync_changes').select('*').order('detected_at', { ascending: false }).limit(200),
    ])
    setPersons(pr.data || [])
    setSources(src.data || [])
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

  const onOpenSync = (sourceId) => {
    if (activePerson === 'all') {
      toast?.(T('اختر شخصاً أولاً من التبويبات أعلاه', 'Select a person tab first'))
      return
    }
    setSyncModal({ sourceId, personId: activePerson })
  }

  // ── Render ──
  return (
    <div style={{ fontFamily: F, paddingTop: 16 }}>
      <Header T={T} lang={lang} focusedSource={focused ? sources.find(s => s.id === focused) : null} runs={runs} changes={changes} onSync={focused ? () => onOpenSync(focused) : null} />

      <PersonTabs
        persons={persons}
        active={activePerson}
        onChange={setActivePerson}
        onManage={() => setPersonMgr(true)}
        T={T}
      />

      {!focused && (
        <>
          <SourceGrid
            sources={sources}
            stats={sources.reduce((acc, s) => { acc[s.id] = getSourceStats(s.id); return acc }, {})}
            onOpen={setFocused}
            onSync={onOpenSync}
            T={T}
            lang={lang}
            activePerson={activePerson}
            personName={personName}
          />

          <ChangeTimeline
            changes={filteredChanges}
            persons={persons}
            sourceName={sourceName}
            sourceAccent={sourceAccent}
            T={T}
            lang={lang}
          />
        </>
      )}

      {focused === 'sbc' && (
        <SbcDrilldown
          sb={sb} toast={toast} user={user} lang={lang}
          activePerson={activePerson}
          persons={persons}
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

      {focused && focused !== 'sbc' && focused !== 'qiwa' && (
        <ComingSoonPanel sourceId={focused} sourceName={sourceName(focused)} onBack={() => setFocused(null)} T={T} />
      )}

      {personMgr && (
        <PersonManagerPanel
          sb={sb} toast={toast} lang={lang} user={user}
          persons={persons}
          onClose={() => setPersonMgr(false)}
          onChanged={() => setRefreshTick(t => t + 1)}
          T={T}
        />
      )}

      {syncModal && (
        <SyncInstallPanel
          sourceId={syncModal.sourceId}
          person={personById(syncModal.personId)}
          sourceObj={sources.find(s => s.id === syncModal.sourceId)}
          onClose={() => setSyncModal(null)}
          T={T}
          lang={lang}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Header — adapts to focused source (or all-sources overview)
// ═══════════════════════════════════════════════════════════════
function Header({ T, lang, focusedSource, runs, changes, onSync }) {
  const latestRun = runs[0]
  const changesLast7d = changes.filter(c => {
    const t = new Date(c.detected_at).getTime()
    return Date.now() - t < 7 * 86400000
  }).length

  const isAr = (lang || 'ar') !== 'en'
  let title, badge, description, accent
  if (focusedSource) {
    const meta = SOURCE_META[focusedSource.id] || {}
    const name = isAr ? focusedSource.name_ar : (focusedSource.name_en || focusedSource.name_ar)
    title = T(`مزامنة ${name}`, `${name} Sync`)
    badge = isAr ? (meta.badgeAr || focusedSource.name_ar) : (meta.badgeEn || focusedSource.name_en || focusedSource.id.toUpperCase())
    description = focusedSource.description_ar || (isAr ? meta.descAr : meta.descEn) || ''
    accent = SOURCE_ACCENT[focusedSource.id] || C.gold
  } else {
    title = T('مزامنة البيانات', 'Data Sync')
    badge = T('جميع المصادر', 'All Sources')
    description = T('مركز موحد لمزامنة بياناتك من جميع المصادر الحكومية — كل تغيير مسجّل ومحفوظ بالتاريخ.', 'Unified hub to sync data from all government sources — every change tracked and timestamped.')
    accent = C.gold
  }

  return (
    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)' }}>{title}</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: `${accent}1A`, color: accent, fontWeight: 700, border: `1px solid ${accent}40`, whiteSpace: 'nowrap' }}>{badge}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 6, lineHeight: 1.7 }}>
          {description}
          {latestRun && ` · ${T('آخر مزامنة', 'Last sync')}: ${fmtTime(latestRun.started_at)}`}
          {changesLast7d > 0 && ` · ${changesLast7d} ${T('تغيير خلال أسبوع', 'changes in 7d')}`}
        </div>
        {!focusedSource && (
          <div style={{ fontSize: 10.5, color: 'var(--tx4)', marginTop: 4 }}>
            {T('قوى · التأمينات · مقيم · مدد · هيئة الزكاة والدخل — قريباً في تبويبات منفصلة', 'Qiwa · GOSI · Muqeem · Mudad · ZATCA — coming soon in separate tabs')}
          </div>
        )}
      </div>
      {focusedSource && onSync && (
        <button onClick={onSync} style={{ padding: '10px 18px', border: `1px solid ${accent}55`, background: 'rgba(0,0,0,.35)', color: 'var(--tx)', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 800, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 7, transition: '.15s', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.55)'; e.currentTarget.style.borderColor = accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}15` }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.35)'; e.currentTarget.style.borderColor = `${accent}55`; e.currentTarget.style.boxShadow = 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          {T('مزامنة', 'Sync')}
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Person Tabs — underline tabs with a tiny colored dot per person
// ═══════════════════════════════════════════════════════════════
function PersonTabs({ persons, active, onChange, onManage, T }) {
  const activePerson = persons.find(p => p.id === active)
  const activeColor = activePerson ? personColor(activePerson) : C.gold
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.15)', marginBottom: 18, justifyContent: 'space-between', alignItems: 'stretch', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {[{ id: 'all', name_ar: T('الكل', 'All'), color: C.gold }, ...persons].map(p => {
          const isActive = active === p.id
          const dotColor = p.id === 'all' ? C.gold : personColor(p)
          const underline = p.id === 'all' ? C.gold : personColor(p)
          return (
            <div key={p.id} onClick={() => onChange(p.id)} style={{ padding: '10px 20px 9px', cursor: 'pointer', color: isActive ? underline : 'var(--tx3)', fontSize: 14, fontWeight: isActive ? 800 : 600, borderBottom: isActive ? `2px solid ${underline}` : '2px solid transparent', marginBottom: -1, transition: '.15s', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {p.id !== 'all' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, boxShadow: isActive ? `0 0 6px ${dotColor}90` : 'none', transition: '.15s' }}/>}
              {p.name_ar}
            </div>
          )
        })}
      </div>
      <button onClick={onManage} title={T('إدارة الأشخاص', 'Manage people')} style={{ alignSelf: 'center', width: 34, height: 34, borderRadius: 8, border: `1px solid ${activeColor}30`, background: `${activeColor}10`, color: activeColor, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Source Grid
// ═══════════════════════════════════════════════════════════════
function SourceGrid({ sources, stats, onOpen, onSync, T, activePerson, personName, lang }) {
  const IMPLEMENTED = new Set(['sbc', 'qiwa'])
  const SOURCE_ICON = {
    sbc: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>,
    qiwa: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    gosi: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    muqeem: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>,
    mudad: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    zatca: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
    ajeer: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
    chambers: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>,
  }
  const freshnessFor = (iso) => {
    if (!iso) return null
    const hrs = (Date.now() - new Date(iso).getTime()) / 3600000
    if (hrs < 24) return { color: '#22c55e', label: T('حديثة', 'Fresh') }
    if (hrs < 24 * 7) return { color: '#f59e0b', label: T('قديمة', 'Stale') }
    return { color: '#ef4444', label: T('متأخرة', 'Overdue') }
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
      {sources.map(s => {
        const st = stats[s.id] || { total: 0, lastRun: null, runCount: 0 }
        const accent = SOURCE_ACCENT[s.id] || C.gold
        const bg = SOURCE_GRADIENT[s.id]
        const available = IMPLEMENTED.has(s.id)
        const fresh = freshnessFor(st.lastRun?.started_at)
        const added = st.lastRun?.records_added || 0
        const modified = st.lastRun?.records_modified || 0
        const removed = st.lastRun?.records_removed || 0
        const hasDiffs = !st.lastRun?.is_baseline && (added + modified + removed) > 0
        return (
          <div key={s.id} style={{ padding: 18, borderRadius: 14, background: bg, border: `1px solid ${accent}22`, opacity: available ? 1 : 0.55, transition: 'transform .18s, box-shadow .18s', cursor: available ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}
            onClick={() => available && onOpen(s.id)}
            onMouseEnter={e => { if (available) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 20px ${accent}15` } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>

            {/* Header: icon + name + status */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {SOURCE_ICON[s.id] || SOURCE_ICON.sbc}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name_ar}</div>
                  {available && fresh && <span title={fresh.label} style={{ width: 7, height: 7, borderRadius: '50%', background: fresh.color, flexShrink: 0, boxShadow: `0 0 6px ${fresh.color}80` }} />}
                </div>
                <div style={{ fontSize: 10, color: 'var(--tx4)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.description_ar || s.name_en}</div>
              </div>
              {!available && <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,.06)', color: 'var(--tx3)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{T('قريباً', 'Soon')}</span>}
            </div>

            {/* Number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 34, fontWeight: 900, color: 'var(--tx)', fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>{Number(st.total).toLocaleString('en-US')}</span>
              <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('سجل', 'records')}</span>
            </div>

            {/* Diff badges (only after a non-baseline sync with changes) */}
            {hasDiffs && (
              <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
                {added > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(34,197,94,.12)', color: '#22c55e', fontWeight: 700, border: '1px solid rgba(34,197,94,.3)' }}>+{added}</span>}
                {modified > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,.12)', color: '#f59e0b', fontWeight: 700, border: '1px solid rgba(245,158,11,.3)' }}>✎ {modified}</span>}
                {removed > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'rgba(239,68,68,.12)', color: '#ef4444', fontWeight: 700, border: '1px solid rgba(239,68,68,.3)' }}>−{removed}</span>}
              </div>
            )}

            {/* Last sync line */}
            <div style={{ fontSize: 10.5, color: 'var(--tx3)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {st.lastRun ? `${T('آخر مزامنة', 'Last')}: ${fmtRelative(st.lastRun.started_at, lang)}` : T('لا توجد مزامنة بعد', 'Never synced')}
            </div>

            {/* Actions */}
            {available && (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); onOpen(s.id) }} style={{ flex: 1, padding: '8px 10px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'var(--tx2)', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, fontFamily: F, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: '.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.07)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {T('عرض', 'View')}
                </button>
                <button onClick={e => { e.stopPropagation(); onSync(s.id) }} style={{ flex: 1, padding: '8px 10px', border: `1px solid ${accent}55`, background: 'rgba(0,0,0,.35)', color: 'var(--tx)', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, fontWeight: 800, fontFamily: F, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: '.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.55)'; e.currentTarget.style.borderColor = accent }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.35)'; e.currentTarget.style.borderColor = `${accent}55` }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  {T('مزامنة', 'Sync')}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Change Timeline (aggregate across all sources)
// ═══════════════════════════════════════════════════════════════
function ChangeTimeline({ changes, persons, sourceName, sourceAccent, T, lang }) {
  const [limit, setLimit] = useState(30)
  const [typeFilter, setTypeFilter] = useState('all')
  const list = useMemo(() => {
    let out = changes
    if (typeFilter !== 'all') out = out.filter(c => c.change_type === typeFilter)
    return out.slice(0, limit)
  }, [changes, limit, typeFilter])

  const personById = (id) => persons.find(p => p.id === id)

  if (!changes.length) {
    return (
      <div style={{ padding: 20, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', textAlign: 'center', fontSize: 12, color: 'var(--tx3)' }}>
        {T('لا توجد تغييرات مسجّلة بعد. كل مزامنة جديدة ستقارن مع السابقة وتسجّل الفوارق هنا.', 'No changes recorded yet. Each new sync will diff against the previous and log changes here.')}
      </div>
    )
  }

  const TYPE_ICON = {
    added: { icon: '+', color: '#22c55e' },
    removed: { icon: '−', color: '#ef4444' },
    modified: { icon: '✎', color: '#f59e0b' },
  }

  return (
    <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)' }}>{T('السجل الزمني للتغييرات', 'Change Timeline')}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all', T('الكل', 'All')], ['added', T('مُضاف', 'Added')], ['modified', T('مُعدّل', 'Modified')], ['removed', T('محذوف', 'Removed')]].map(([k, l]) => {
            const on = typeFilter === k
            return (
              <button key={k} onClick={() => setTypeFilter(k)} style={{ padding: '4px 10px', border: '1px solid ' + (on ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.08)'), background: on ? 'rgba(212,160,23,.12)' : 'transparent', color: on ? C.gold : 'var(--tx3)', borderRadius: 6, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, fontFamily: F }}>{l}</button>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {list.map((c, i) => {
          const TI = TYPE_ICON[c.change_type] || TYPE_ICON.modified
          const srcClr = sourceAccent(c.source_id)
          const p = personById(c.person_id)
          const pClr = p ? personColor(p) : 'var(--tx4)'
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 4px', borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: TI.color + '18', color: TI.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>{TI.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--tx)', fontWeight: 600, lineHeight: 1.5 }}>
                  {changeLabel(c, T)}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--tx4)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: srcClr, fontWeight: 700 }}>{sourceName(c.source_id)}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {p && <span style={{ width: 6, height: 6, borderRadius: '50%', background: pClr }}/>}
                    {p?.name_ar || '—'}
                  </span>
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>{fmtRelative(c.detected_at, lang)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {changes.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <button onClick={() => setLimit(l => l + 30)} style={{ padding: '6px 14px', border: '1px solid rgba(255,255,255,.08)', background: 'transparent', color: 'var(--tx3)', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: F }}>{T('عرض المزيد', 'Show more')}</button>
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
function SbcDrilldown({ sb, toast, user, lang, activePerson, persons, onBack, onOpenSync, filteredChanges, personName, T }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
        <button onClick={onBack} style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'var(--tx)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          {T('رجوع لكل المصادر', 'All sources')}
        </button>
      </div>
      <SbcFacilities sb={sb} toast={toast} user={user} lang={lang} />
      {filteredChanges.length > 0 && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', marginBottom: 10 }}>{T('تغييرات المركز السعودي للأعمال', 'SBC Changes')}</div>
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
// Qiwa drill-down — mirrors the SBC panel shape.
// ═══════════════════════════════════════════════════════════════
function QiwaDrilldown({ sb, toast, user, lang, activePerson, onBack, filteredChanges, personName, T }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12 }}>
        <button onClick={onBack} style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'var(--tx)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: F, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          {T('رجوع لكل المصادر', 'All sources')}
        </button>
      </div>
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
// Coming Soon (non-SBC sources)
// ═══════════════════════════════════════════════════════════════
function ComingSoonPanel({ sourceId, sourceName, onBack, T }) {
  return (
    <div>
      <button onClick={onBack} style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.03)', color: 'var(--tx)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: F, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        {T('رجوع', 'Back')}
      </button>
      <div style={{ padding: 40, borderRadius: 14, background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--tx)', marginBottom: 8 }}>{sourceName}</div>
        <div style={{ fontSize: 12, color: 'var(--tx3)' }}>{T('قيد التطوير — سيتم تفعيل المزامنة قريباً.', 'Under development — sync will be enabled soon.')}</div>
      </div>
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
  const emptyForm = { name_ar: '', name_en: '', color: PERSON_PALETTE[0], note_ar: '' }
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [err, setErr] = useState({})
  const [saving, setSaving] = useState(false)

  const save = async () => {
    const e = {}
    if (!form.name_ar.trim()) e.name_ar = T('الاسم العربي مطلوب', 'Arabic name required')
    setErr(e); if (Object.keys(e).length) return
    setSaving(true)
    try {
      if (editingId) {
        await sb.from('sync_persons').update({
          name_ar: form.name_ar.trim(),
          name_en: form.name_en?.trim() || null,
          color: form.color,
          note_ar: form.note_ar?.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingId)
        toast?.(T('تم تحديث الشخص', 'Person updated'))
      } else {
        const maxOrder = (persons[persons.length - 1]?.sort_order || 0) + 10
        await sb.from('sync_persons').insert({
          name_ar: form.name_ar.trim(),
          name_en: form.name_en?.trim() || null,
          color: form.color,
          note_ar: form.note_ar?.trim() || null,
          sort_order: maxOrder,
        })
        toast?.(T('تم إضافة الشخص', 'Person added'))
      }
      setForm(emptyForm); setEditingId(null); setErr({})
      onChanged?.()
    } catch (e2) { toast?.('خطأ: ' + (e2.message || e2)) }
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm(T('حذف هذا الشخص؟ لن تُمحى سجلات المزامنة المرتبطة به.', 'Delete this person? Their sync records will be preserved.'))) return
    await sb.from('sync_persons').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    toast?.(T('تم الحذف', 'Deleted'))
    if (editingId === id) { setEditingId(null); setForm(emptyForm) }
    onChanged?.()
  }

  const startEdit = (p) => { setEditingId(p.id); setForm({ name_ar: p.name_ar || '', name_en: p.name_en || '', color: p.color || PERSON_PALETTE[0], note_ar: p.note_ar || '' }); setErr({}) }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setErr({}) }

  return (
    <SidePanel onClose={onClose} lang={lang} accent={C.gold}>
      <PanelHeader
        accent={C.gold}
        avatar={
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(212,160,23,.15),rgba(212,160,23,.05))', border: '2px solid rgba(212,160,23,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
        }
        title={T('إدارة أشخاص المزامنة', 'Sync People Manager')}
        subtitle={T('كل شخص يمثل حساب نفاذ مستقل', 'Each person represents a distinct Nafath account')}
        meta={`${persons.length} ${T('شخص مسجّل', 'registered')}`}
        onClose={onClose}
      />

      {/* Content */}
      <div className='dash-content' style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>

        {/* Add / Edit form card */}
        <div style={{ padding: 14, borderRadius: 12, background: editingId ? 'rgba(212,160,23,.04)' : 'rgba(255,255,255,.02)', border: editingId ? '1px solid rgba(212,160,23,.22)' : '1px solid rgba(255,255,255,.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: `${form.color}22`, border: `1px solid ${form.color}55`, color: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>
              {form.name_ar?.trim()?.[0] || '+'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: editingId ? C.gold : 'var(--tx2)' }}>
              {editingId ? T('تعديل شخص', 'Edit person') : T('إضافة شخص جديد', 'Add a new person')}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <FieldLabel>{T('الاسم بالعربي', 'Name (Arabic)')}</FieldLabel>
                <input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} style={{ ...panelInputS, border: err.name_ar ? '1.5px solid rgba(192,57,43,.5)' : panelInputS.border }} />
                {err.name_ar && <div style={{ fontSize: 10, color: 'rgba(192,57,43,.7)', marginTop: 2 }}>{err.name_ar}</div>}
              </div>
              <div>
                <FieldLabel>{T('الاسم بالإنجليزي', 'Name (English)')}</FieldLabel>
                <input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} style={{ ...panelInputS, direction: 'ltr' }} />
              </div>
            </div>

            <div>
              <FieldLabel>{T('ملاحظة قصيرة', 'Short note')}</FieldLabel>
              <input value={form.note_ar} onChange={e => setForm(f => ({ ...f, note_ar: e.target.value }))} placeholder={T('مثال: مالك المنشأة الرئيسية · مدير فرع الرياض', 'e.g., Main owner · Riyadh branch manager')} style={{ ...panelInputS, textAlign: 'right' }} />
            </div>

            <div>
              <FieldLabel>{T('اللون المميّز', 'Accent color')}</FieldLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {PERSON_PALETTE.map(clr => {
                  const on = form.color === clr
                  return (
                    <button key={clr} type='button' onClick={() => setForm(f => ({ ...f, color: clr }))} title={clr} style={{ width: 28, height: 28, borderRadius: 8, border: on ? `2px solid ${clr}` : '1.5px solid rgba(255,255,255,.1)', background: `${clr}28`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s', padding: 0 }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: clr, boxShadow: on ? `0 0 8px ${clr}` : 'none' }}/>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Person list */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
            {T(`الأشخاص المسجّلون (${persons.length})`, `Registered People (${persons.length})`)}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {persons.length === 0 && (
              <div style={{ padding: 16, borderRadius: 10, border: '1px dashed rgba(255,255,255,.1)', background: 'rgba(255,255,255,.02)', textAlign: 'center', fontSize: 11, color: 'var(--tx4)' }}>
                {T('لا يوجد أشخاص بعد — استخدم النموذج أعلاه لإضافة أول شخص.', 'No people yet — use the form above to add the first one.')}
              </div>
            )}
            {persons.map(p => {
              const clr = personColor(p)
              const isEd = editingId === p.id
              return (
                <div key={p.id} style={{ padding: '10px 12px', borderRadius: 10, background: isEd ? `${clr}10` : 'rgba(255,255,255,.03)', border: isEd ? `1px solid ${clr}55` : '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', gap: 10, transition: '.15s' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg, ${clr}30, ${clr}08)`, border: `2px solid ${clr}44`, color: clr, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                    {personInitial(p)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)' }}>{p.name_ar}</div>
                    {p.name_en && <div style={{ fontSize: 10, color: 'var(--tx4)', direction: 'ltr', marginTop: 1 }}>{p.name_en}</div>}
                    {p.note_ar && <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.note_ar}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => startEdit(p)} title={T('تعديل', 'Edit')} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,.08)', background: 'transparent', color: 'var(--tx3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => remove(p.id)} title={T('حذف', 'Delete')} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(192,57,43,.2)', background: 'rgba(192,57,43,.06)', color: C.red, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 20px 16px', borderTop: '1px solid rgba(212,160,23,.12)', display: 'flex', gap: 10, flexDirection: 'row-reverse', flexShrink: 0 }}>
        <button disabled={saving} onClick={save} style={{ height: 38, padding: '0 24px', borderRadius: 11, background: C.gold, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer', opacity: saving ? .7 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {saving ? '...' : (editingId ? T('حفظ التعديلات', 'Save Changes') : T('إضافة', 'Add Person'))}
        </button>
        {editingId && (
          <button onClick={cancelEdit} style={{ height: 38, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1.5px solid rgba(255,255,255,.12)', color: 'var(--tx4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('إلغاء التعديل', 'Cancel edit')}</button>
        )}
        <button onClick={onClose} style={{ height: 38, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1.5px solid rgba(255,255,255,.12)', color: 'var(--tx4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}>{T('إغلاق', 'Close')}</button>
      </div>
    </SidePanel>
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
  const bookmarkLabel = isQiwa ? `جسر قوى — ${person?.name_ar || ''}` : `مزامنة جسر — ${person?.name_ar || ''}`

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
            <li>{T('اسحب الزر الذهبي أدناه إلى الشريط.', 'Drag the gold button below onto the bar.')}</li>
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
