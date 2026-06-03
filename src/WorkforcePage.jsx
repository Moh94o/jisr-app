import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { DateField, Sel, OccSelect } from './pages/KafalaCalculator.jsx'
import BackButton from './components/BackButton'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 24

const num = (v) => Number(v || 0).toLocaleString('en-US')
const fmtDate = (s) => { if (!s) return '—'; try { return new Date(s).toISOString().slice(0,10) } catch { return '—' } }
const fmtAgo = (iso, isAr) => {
  if (!iso) return '—'
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return isAr ? 'الآن' : 'now'
  if (d < 3600) return isAr ? `قبل ${Math.floor(d/60)}د` : `${Math.floor(d/60)}m`
  if (d < 86400) return isAr ? `قبل ${Math.floor(d/3600)}س` : `${Math.floor(d/3600)}h`
  return isAr ? `قبل ${Math.floor(d/86400)}ي` : `${Math.floor(d/86400)}d`
}
const daysUntil = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

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

const STATUS_THEME = {
  active:    { c: C.ok,     label_ar: 'نشط',     label_en: 'Active' },
  suspended: { c: C.orange, label_ar: 'معلّق',   label_en: 'Suspended' },
}
const themeForStatus = (s) => STATUS_THEME[s] || { c: C.gray, label_ar: s || '—', label_en: s || '—' }

const NAT_CODES = {
  'أردني':'JO','أفغاني':'AF','افغانستان':'AF','أوغندي':'UG','إثيوبي':'ET','إندونيسي':'ID','باكستاني':'PK','باكستان':'PK','بنغلاديشي':'BD','بنغلادش':'BD',
  'تركي':'TR','تونسي':'TN','سريلانكي':'LK','سعودي':'SA','السعودية':'SA','سوداني':'SD','السودان':'SD','سوري':'SY',
  'فلبيني':'PH','كيني':'KE','مصري':'EG','مصر':'EG','مغربي':'MA','ميانمار':'MM','نيبالي':'NP','نيبال':'NP','هندي':'IN','الهند':'IN','يمني':'YE','اليمن':'YE','بريطانيا':'GB',
}
const NatFlag = ({ nationality, size = 18 }) => {
  const cc = NAT_CODES[(nationality || '').trim()]
  if (!cc) return null
  return <img src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`} alt={nationality} title={nationality}
    style={{ width: size, height: Math.round(size * .72), objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
    onError={e => { e.target.style.display = 'none' }} />
}

const CopyBtn = ({ value, toast, T }) => (
  <button
    onClick={(e) => { e.stopPropagation(); try { navigator.clipboard?.writeText(String(value)); toast?.(T('تم النسخ','Copied')) } catch {} }}
    title={T('نسخ','Copy')}
    style={{ width: 16, height: 16, padding: 0, borderRadius: 3, background: 'transparent', border: 'none', color: 'currentColor', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: .65, transition: '.18s' }}
    onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
    onMouseLeave={e => { e.currentTarget.style.opacity = '.65' }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
  </button>
)

const Badge = ({ theme, T }) => theme ? (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: theme.c + '18', border: '1px solid ' + theme.c + '38', color: theme.c, fontSize: 10.5, fontWeight: 700 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.c, boxShadow: '0 0 5px ' + theme.c }} />
    {T(theme.label_ar, theme.label_en)}
  </span>
) : null

// Iqama remaining-days badge. Renders the expiry date on top and a solid
// filled chip below — `N يوم متبقي` if still valid, `N يوم مضى` if expired.
//
// Color thresholds:
//   green  → more than 30 days remaining
//   gold   → 1–30 days remaining (renewal window)
//   red    → expired (today or past) — counter shows days since expiry
const IqamaCell = ({ iso, T }) => {
  const d = daysUntil(iso)
  if (d == null) return <span style={{ color: 'var(--tx5)', fontSize: 11 }}>—</span>
  // Brighter accent (for the date on top + tinted badge color); muted shade
  // used as the badge background so the chip feels softer.
  let c = C.ok, bg = '#1e7e43'
  if (d <= 0) { c = C.red; bg = '#8b3b32' }
  else if (d <= 30) { c = C.gold; bg = '#7a5c0f' }
  const isExpired = d <= 0
  const value = Math.abs(d)
  const wordAr = isExpired ? 'يوم مضى' : 'يوم متبقي'
  const wordEn = isExpired ? 'd ago' : 'd left'
  const tooltip = T(`${value} ${wordAr}`, `${value} ${wordEn}`)
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 11, color: c, fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(iso)}</span>
      <span title={tooltip} style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 4,
        padding: '3px 10px', borderRadius: 6,
        background: bg, color: '#fff', fontWeight: 800, fontSize: 10.5,
        direction: 'ltr', fontVariantNumeric: 'tabular-nums',
        boxShadow: `0 1px 4px ${bg}66`,
      }}>
        <span style={{ fontSize: 9, opacity: .85, fontWeight: 700 }}>{T(wordAr, wordEn)}</span>
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{value}</span>
      </span>
    </div>
  )
}

// Filter button style — matches SbcFacilities btnFilter
const btnFilter = (active) => ({
  height: 44, padding: '0 16px', borderRadius: 12,
  background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)',
  border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'),
  color: active ? C.gold : 'var(--tx2)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
  display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box',
})

/* ═══════════════════════════════════════════════════════════════ */
export default function WorkforcePage({ sb, toast, lang, user, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [workers, setWorkers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({ status: '', iqama: '', nationality: '', facility: '', occupation: '' })
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)
  // View lens — like SbcFacilities tableView (SBC | GOSI). For workers it's
  // "all" vs "active" vs "suspended".
  const [viewLens, setViewLens] = useState('all')
  // Manual "إضافة عامل" modal — inserts straight into the canonical `workers` table.
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', iqama_number: '', iqama_expiry_date: '', nationality_id: null, nationality_ar: '', occupation_id: null, occupation_ar: '' })
  const [nationalities, setNationalities] = useState([])
  const [occupations, setOccupations] = useState([])
  useEffect(() => {
    if (!sb) return
    sb.from('nationalities').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').then(({ data }) => { if (data) setNationalities(data) })
    sb.from('occupations').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').limit(5000).then(({ data }) => { if (data) setOccupations(data) })
  }, [sb])
  const saveManualWorker = useCallback(async () => {
    if (!sb || adding) return
    const name = (addForm.name || '').trim()
    if (!name) { toast?.(T('أدخل اسم العامل', 'Enter worker name')); return }
    setAdding(true)
    try {
      const isArabicName = /[؀-ۿ]/.test(name)
      const payload = {
        name_ar: isArabicName ? name : null,
        name_en: !isArabicName ? name : null,
        iqama_number: (addForm.iqama_number || '').trim() || null,
        iqama_expiry_date: addForm.iqama_expiry_date || null,
        nationality_id: addForm.nationality_id || null,
        nationality_ar: addForm.nationality_ar || null,
        current_occupation_id: addForm.occupation_id || null,
        occupation_ar: addForm.occupation_ar || null,
        created_by: user?.id || null,
      }
      const { error } = await sb.from('workers').insert(payload)
      if (error) throw new Error(error.message)
      toast?.(T('تمت إضافة العامل بنجاح', 'Worker added successfully'))
      setShowAdd(false)
      setAddForm({ name: '', iqama_number: '', iqama_expiry_date: '', nationality_id: null, nationality_ar: '', occupation_id: null, occupation_ar: '' })
      load()
    } catch (e) {
      toast?.(T('فشل الحفظ: ' + (e.message || e), 'Save failed: ' + (e.message || e)))
    } finally {
      setAdding(false)
    }
  }, [sb, addForm, adding, user, toast, T])

  useEffect(() => { onTabChange && onTabChange({ tab: 'workers' }) }, [])

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const [w, f] = await Promise.all([
      sb.from('workers').select('*').is('deleted_at', null).order('name_ar', { ascending: true }),
      sb.from('facilities').select('id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number').is('deleted_at', null),
    ])
    setWorkers(w.data || []); setFacilities(f.data || [])
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  const facById = useMemo(() => {
    const m = {}; facilities.forEach(f => { m[f.id] = f }); return m
  }, [facilities])

  // Lens-scoped rows (mirrors SbcFacilities scopedRows pattern).
  const scopedRows = useMemo(() => {
    if (viewLens === 'all') return workers
    return workers.filter(w => w.worker_status === viewLens)
  }, [workers, viewLens])

  const stats = useMemo(() => {
    const total = scopedRows.length
    const active = scopedRows.filter(w => w.worker_status === 'active').length
    const suspended = scopedRows.filter(w => w.worker_status === 'suspended').length
    // Iqama buckets — same thresholds as IqamaCell:
    //   expired ≤0 / renewal 1–30 / valid >30. Rows without an expiry date
    //   are excluded from all three so the donut percentages add up cleanly.
    const expired = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d <= 0 }).length
    const exp30 = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d > 0 && d <= 30 }).length
    const valid = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d > 30 }).length
    const noIqama = scopedRows.filter(w => !w.iqama_expiry_date).length
    return { total, active, suspended, expired, exp30, valid, noIqama }
  }, [scopedRows])

  // Nationality leaderboard for the third stats card.
  const natTop = useMemo(() => {
    const counts = {}
    for (const w of scopedRows) {
      const n = (w.nationality_ar || '').trim()
      if (!n) continue
      counts[n] = (counts[n] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [scopedRows])

  const advCount = useMemo(() => Object.values(adv).filter(v => v).length, [adv])

  // Search + advanced filter
  const filtered = useMemo(() => {
    return scopedRows.filter(w => {
      if (adv.status && w.worker_status !== adv.status) return false
      if (adv.nationality && (w.nationality_ar || '') !== adv.nationality) return false
      if (adv.facility && w.current_facility_id !== adv.facility) return false
      if (adv.occupation && !(w.occupation_ar || '').includes(adv.occupation)) return false
      if (adv.iqama) {
        const d = daysUntil(w.iqama_expiry_date)
        if (adv.iqama === 'expired' && !(d != null && d <= 0)) return false
        if (adv.iqama === '30d' && !(d != null && d > 0 && d <= 30)) return false
        if (adv.iqama === 'valid' && !(d != null && d > 30)) return false
      }
      if (search.trim()) {
        const s = search.toLowerCase()
        if (!((w.name_ar || '').includes(s) || (w.name_en || '').toLowerCase().includes(s) ||
              (w.iqama_number || '').includes(s) || (w.border_number || '').includes(s) ||
              (w.passport_number || '').toLowerCase().includes(s) || (w.occupation_ar || '').includes(s) ||
              (w.gosi_registration_no || '').includes(s))) return false
      }
      return true
    })
  }, [scopedRows, adv, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE)

  if (detail) {
    return <WorkerDetail
      worker={detail}
      facility={facById[detail.current_facility_id]}
      sb={sb} toast={toast} T={T} isAr={isAr}
      onBack={() => setDetail(null)}
    />
  }

  // Iqama donut math — 3 buckets matching IqamaCell thresholds.
  const safe = (n) => Number.isFinite(n) ? n : 0
  const iqamaTot = Math.max(1, safe(stats.expired) + safe(stats.exp30) + safe(stats.valid))
  const iqamaSegs = [
    { k: 'valid',   l: T('سارية','Valid'),       v: safe(stats.valid),   c: C.ok },
    { k: '30d',     l: T('≤ 30 يوم','≤ 30 days'), v: safe(stats.exp30),   c: C.gold },
    { k: 'expired', l: T('منتهية','Expired'),    v: safe(stats.expired), c: C.red },
  ]
  const R = 42, CIRC = 2 * Math.PI * R
  let acc = 0
  const iqamaArcs = iqamaSegs.map(s => {
    const len = safe((s.v / iqamaTot) * CIRC)
    const arc = { ...s, dash: `${len} ${CIRC - len}`, offset: safe(-acc), len }
    acc += len
    return arc
  })
  const validPct = Math.round(safe(stats.valid) / iqamaTot * 100)

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
            {T('العمالة','Workforce')}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            title={T('إضافة عامل', 'Add Worker')}
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
            <span>{T('إضافة عامل', 'Add Worker')}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
          {T('سجلّ موحّد لجميع العمّال غير السعوديين المشتركين في التأمينات الاجتماعية، يجمع بياناتهم الشخصية وأرقامهم الرسمية وحالة إقاماتهم ورخص عملهم ومنشآتهم المرتبطة بهم في مكان واحد.',
             'A unified registry of all non-Saudi GOSI contributors — gathering personal data, official numbers, residency and work permit status, and their linked facilities in one place.')}
        </div>
      </div>

      {/* KPI Row — 3 cards (2.2fr 1.7fr 1.6fr) mirroring SbcFacilities */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — Total workers */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}26 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي العمالة','Total Workers')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.blue, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.ok, fontWeight: 700, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.ok }} /> {num(stats.active)} {T('نشط','active')}
            </span>
            <span style={{ fontSize: 11, color: C.orange, fontWeight: 700, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.orange }} /> {num(stats.suspended)} {T('معلّق','suspended')}
            </span>
            {natTop.length > 0 && (
              <span style={{ fontSize: 11, color: C.purple, fontWeight: 700, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.purple }} /> {num(natTop.length)} {T('جنسية','nationalities')}
              </span>
            )}
          </div>
        </div>

        {/* Iqama status donut — mirror of CR-status donut */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('انتهاء الإقامات','Iqama Status')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.4))' }}>
                <defs>
                  <radialGradient id="iq-donut-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                  {iqamaArcs.filter(a => a.v > 0).map(a => (
                    <linearGradient key={'g-' + a.k} id={`iq-seg-${a.k}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={a.c} stopOpacity="1" />
                      <stop offset="100%" stopColor={a.c} stopOpacity=".72" />
                    </linearGradient>
                  ))}
                </defs>
                <circle cx="56" cy="56" r="34" fill="url(#iq-donut-core)" />
                <g style={{ transform: 'rotate(-90deg)', transformOrigin: '56px 56px' }}>
                  <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                  {iqamaArcs.filter(a => a.v > 0).map(a => (
                    <circle key={a.k} cx="56" cy="56" r={R} fill="none"
                      stroke={`url(#iq-seg-${a.k})`} strokeWidth="12" strokeLinecap="butt"
                      strokeDasharray={a.dash} strokeDashoffset={a.offset}
                      style={{ transition: 'stroke-dasharray .4s, stroke-dashoffset .4s' }} />
                  ))}
                  <circle cx="56" cy="56" r={R + 6} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth="1" />
                  <circle cx="56" cy="56" r={R - 6} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1" />
                </g>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', direction: 'ltr', color: 'var(--tx)' }}>{validPct}%</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, marginTop: 4, letterSpacing: '.2px', color: 'var(--tx2)' }}>{T('سارية','valid')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              {iqamaSegs.map(s => (
                <button key={s.k}
                  onClick={() => { setAdv(a => ({ ...a, iqama: a.iqama === s.k ? '' : s.k })); setPage(0) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.4 : 1, background: adv.iqama === s.k ? 'rgba(212,160,23,.08)' : 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontFamily: F, textAlign: 'right' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
                  <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{s.l}</span>
                  <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontWeight: 800, flexShrink: 0 }}>{num(s.v)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nationalities — top N tile breakdown (mirror of MoC violations card) */}
        <div style={{
          borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الجنسيات','Nationalities')}</span>
            <span style={{ fontSize: 10.5, color: C.purple, fontWeight: 700 }}>{num(natTop.length)} {T('جنسية','total')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, flex: 1 }}>
            {natTop.slice(0, 4).map(([n, count]) => (
              <button key={n} onClick={() => { setAdv(a => ({ ...a, nationality: a.nationality === n ? '' : n })); setPage(0) }}
                style={{
                  borderRadius: 12, padding: '8px 10px',
                  background: adv.nationality === n ? 'rgba(212,160,23,.12)' : 'rgba(255,255,255,.025)',
                  border: '1px solid ' + (adv.nationality === n ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.04)'),
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4,
                  cursor: 'pointer', textAlign: 'start', fontFamily: F,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <NatFlag nationality={n} size={16} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>{num(count)}</span>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + filter button (mirror SbcFacilities) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: advOpen ? 10 : 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={T('ابحث بالاسم، رقم الإقامة، الحدود، الجواز، المهنة، رقم التسجيل…','Search by name, iqama, border, passport, occupation, registration…')}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <button type="button" onClick={() => setAdvOpen(v => !v)} style={btnFilter(advOpen || advCount > 0)}>
          {T('تصفية', 'Filter')}
          {advCount > 0 ? (
            <span
              role="button" tabIndex={0}
              title={T('مسح الفلاتر', 'Clear filters')}
              onClick={e => { e.stopPropagation(); setAdv({ status: '', iqama: '', nationality: '', facility: '', occupation: '' }) }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
              style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
          )}
        </button>
      </div>

      {/* Advanced filter panel */}
      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FilterField label={T('الحالة','Status')}>
              <select value={adv.status} onChange={e => { setAdv(a => ({ ...a, status: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                <option value="active">{T('نشط','Active')}</option>
                <option value="suspended">{T('معلّق','Suspended')}</option>
              </select>
            </FilterField>
            <FilterField label={T('انتهاء الإقامة','Iqama Expiry')}>
              <select value={adv.iqama} onChange={e => { setAdv(a => ({ ...a, iqama: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                <option value="expired">{T('منتهية','Expired')}</option>
                <option value="30d">{T('≤ 30 يوم','≤ 30 days')}</option>
                <option value="valid">{T('سارية','Valid')}</option>
              </select>
            </FilterField>
            <FilterField label={T('الجنسية','Nationality')}>
              <select value={adv.nationality} onChange={e => { setAdv(a => ({ ...a, nationality: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                {natTop.map(([n, c]) => <option key={n} value={n}>{n} ({c})</option>)}
              </select>
            </FilterField>
            <FilterField label={T('المنشأة','Facility')}>
              <select value={adv.facility} onChange={e => { setAdv(a => ({ ...a, facility: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name_ar || f.cr_number}</option>)}
              </select>
            </FilterField>
            <FilterField label={T('المهنة','Occupation')}>
              <input value={adv.occupation} onChange={e => { setAdv(a => ({ ...a, occupation: e.target.value })); setPage(0) }} placeholder={T('سائق، بناء…','Driver, builder…')} style={selStyle}/>
            </FilterField>
          </div>
        </div>
      )}

      {/* Counts row — view lens toggle (left) + total count (right) — mirror SbcFacilities */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { v: 'all',       l: T('الكل','All'),         c: C.blue },
            { v: 'active',    l: T('نشط','Active'),       c: C.ok },
            { v: 'suspended', l: T('معلّق','Suspended'),   c: C.orange },
          ].map(opt => (
            <button key={opt.v} onClick={() => { setViewLens(opt.v); setPage(0) }}
              style={{
                padding: '8px 14px', borderRadius: 10,
                background: viewLens === opt.v ? `${opt.c}1f` : 'transparent',
                border: '1px solid ' + (viewLens === opt.v ? `${opt.c}66` : 'rgba(255,255,255,.06)'),
                color: viewLens === opt.v ? opt.c : 'var(--tx3)',
                cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: opt.c }} />
              {T('العرض','View')}: {opt.l}
            </button>
          ))}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx2)' }}>{num(filtered.length)} {T('عامل','workers')}</span>
          {filtered.length !== workers.length && <span style={{ fontSize: 9.5, color: 'var(--tx5)' }}>{T('من أصل','out of')} {num(workers.length)}</span>}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('جاري التحميل...','Loading...')}</div>
      ) : filtered.length === 0 ? (
        <Empty T={T} hasData={workers.length > 0} />
      ) : (
        <>
          <style>{`
            .wf-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
            .wf-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12px;font-weight:700;text-align:center;padding:14px 4px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
            .wf-tbl thead .hd-icon{color:${C.gold};display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;vertical-align:middle}
            .wf-tbl thead .hd-icon svg{width:14px;height:14px;display:block}
            .wf-tbl tbody td{padding:10px 4px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.02)}
            .wf-tbl tbody tr{cursor:pointer;transition:background .12s}
            .wf-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
            .wf-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
            .wf-tbl tbody tr:last-child td:first-child{border-bottom-right-radius:9px}
            .wf-tbl tbody tr:last-child td:last-child{border-bottom-left-radius:9px}
            .wf-tbl tbody tr:last-child td{border-bottom:none}
            .wf-tbl thead tr:first-child th:first-child{border-top-right-radius:9px}
            .wf-tbl thead tr:first-child th:last-child{border-top-left-radius:9px}
            .wf-tbl .num{direction:ltr;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:700}
            .wf-tbl .muted{color:var(--tx5)}
            .wf-tbl .name-cell{overflow:hidden;padding-inline:14px}
            /* Marquee — long text ellipsis by default, scrolls horizontally on row hover */
            .wf-tbl .name-marquee{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
            .wf-tbl .name-marquee .marquee-inner{display:inline-block;will-change:transform}
            .wf-tbl tbody tr:hover .name-marquee{text-overflow:clip}
            .wf-tbl tbody tr:hover .name-marquee .marquee-inner{animation:wf-name-bounce 9s ease-in-out infinite}
            @keyframes wf-name-bounce{0%,12%{transform:translateX(0)}50%{transform:translateX(40%)}88%,100%{transform:translateX(0)}}
          `}</style>

          <div style={{ borderRadius: 10 }}>
            <table className="wf-tbl">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '17%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>{T('الاسم','Name')}</th>
                  <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>{T('رقم الإقامة','Iqama')}</th>
                  <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>{T('الجنسية','Nationality')}</th>
                  <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></span>{T('المهنة','Occupation')}</th>
                  <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg></span>{T('المنشأة','Facility')}</th>
                  <th><span className="hd-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>{T('انتهاء الإقامة','Iqama Expiry')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(w => {
                  const f = facById[w.current_facility_id]
                  return (
                    <tr key={w.id} onClick={() => setDetail(w)}>
                      <td className="name-cell" title={w.name_ar || w.name_en || ''}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <div className="name-marquee" style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>
                            <span className="marquee-inner">{w.name_ar || w.name_en || '—'}</span>
                          </div>
                          {w.name_en && w.name_ar && (
                            <div className="name-marquee" style={{ fontSize: 9.5, color: 'var(--tx5)' }}>
                              <span className="marquee-inner">{w.name_en}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {w.iqama_number ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <CopyBtn value={w.iqama_number} toast={toast} T={T} />
                            <span className="num">{w.iqama_number}</span>
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td title={w.nationality_ar || ''}>
                        {w.nationality_ar
                          ? (<NatFlag nationality={w.nationality_ar} size={22} />)
                          : <span className="muted">—</span>}
                      </td>
                      <td title={w.occupation_ar || ''} style={{ paddingInline: 8 }}>
                        {w.occupation_ar ? (
                          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
                            <span className="marquee-inner">{w.occupation_ar}</span>
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td title={f?.name_ar || ''} style={{ paddingInline: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
                          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
                            <span className="marquee-inner">{f?.name_ar || '—'}</span>
                          </div>
                          {f?.unified_number && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>
                              {f.unified_number}
                              <CopyBtn value={f.unified_number} toast={toast} T={T} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td><IqamaCell iso={w.iqama_expiry_date} T={T} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE && (() => {
            const goPrev = () => setPage(p => Math.max(0, p - 1))
            const goNext = () => setPage(p => p + 1)
            const goTo = nn => setPage(Math.max(0, Math.min(totalPages - 1, nn)))
            const fromN = page * PAGE + 1
            const toN = Math.min(filtered.length, (page + 1) * PAGE)
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 4px', borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 18 }}>
                <style>{`
                  .wf-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
                  .wf-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
                  .wf-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
                  .wf-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
                  .wf-pg-input::-webkit-outer-spin-button,.wf-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
                `}</style>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(filtered.length)}</span>
                  <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{T('صفحة','Page')} {page + 1} {T('من','of')} {totalPages}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <button className="wf-pg-btn" disabled={page === 0} onClick={goPrev} aria-label={T('السابق','Prev')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  <input className="wf-pg-input" type="number" min={1} max={totalPages} value={page + 1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v - 1) }} />
                  <button className="wf-pg-btn" disabled={page + 1 >= totalPages} onClick={goNext} aria-label={T('التالي','Next')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                </div>
              </div>
            )
          })()}
        </>
      )}

      {/* ═══ Add Worker Modal — mirrors Kafala "تسعيرة تنازل" styling ═══ */}
      {showAdd && (
        <div onClick={() => { if (!adding) setShowAdd(false) }}
             style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <style>{`.wkr-add-scroll::-webkit-scrollbar{width:0;display:none}.wkr-add-scroll{scrollbar-width:none;-ms-overflow-style:none}.wkr-add-scroll input:focus{border-color:rgba(255,255,255,.16)!important;box-shadow:none!important}.wkr-add-btn{height:40px;padding:0 6px;background:transparent;border:none;color:#D4A017;font-family:${F};font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.wkr-add-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:#D4A017}.wkr-add-btn:hover:not(:disabled) .nav-ico{background:#D4A017;color:#000}.wkr-add-btn:hover:not(:disabled) .nav-ico{transform:translateX(4px)}[dir=rtl] .wkr-add-btn:hover:not(:disabled) .nav-ico{transform:translateX(-4px)}.wkr-add-btn:disabled{opacity:.5;cursor:not-allowed}@keyframes wkr-spin{to{transform:rotate(360deg)}}`}</style>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--modal-bg)', borderRadius: 16, width: 640, maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
            <div dir={isAr ? 'rtl' : 'ltr'} style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '20px 24px 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx)', fontFamily: F, lineHeight: 1.2 }}>{T('إضافة عامل', 'Add Worker')}</div>
                  </div>
                  <button onClick={() => { if (!adding) setShowAdd(false) }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.4)'; e.currentTarget.style.color = '#e5867a' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(180deg,#323232 0%,#262626 100%)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'var(--tx3)' }}
                    style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: F, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}
                    aria-label={T('إغلاق', 'Close')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 4, background: 'linear-gradient(90deg, #D4A017, #F0C040)' }} />
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="wkr-add-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '20px 22px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -10, [isAr ? 'right' : 'left']: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span>{T('بيانات العامل', 'Worker Data')}</span>
                  </div>
                  {(() => {
                    const sF = { width: '100%', height: 42, padding: '0 14px', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, fontFamily: F, fontSize: 14, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', boxSizing: 'border-box', textAlign: 'center', transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }
                    const Lbl = ({ children, req }) => <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }}>{children}{req && <span style={{ color: C.red, marginRight: 2 }}>*</span>}</div>
                    const set = (k, v) => setAddForm(p => ({ ...p, [k]: v }))
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 20, rowGap: 16 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <Lbl req>{T('اسم العامل (عربي أو إنجليزي)', 'Worker Name (Arabic or English)')}</Lbl>
                          <input value={addForm.name} onChange={e => set('name', e.target.value)} placeholder={T('الاسم الكامل', 'Full Name')} style={{ ...sF }} />
                        </div>
                        <div>
                          <Lbl>{T('رقم الإقامة', 'Iqama Number')}</Lbl>
                          <input value={addForm.iqama_number} onChange={e => set('iqama_number', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="2XXXXXXXXX" inputMode="numeric" maxLength={10} style={{ ...sF, direction: 'ltr' }} />
                        </div>
                        <div>
                          <DateField value={addForm.iqama_expiry_date} onChange={v => set('iqama_expiry_date', v)} label={T('تاريخ انتهاء الإقامة', 'Iqama Expiry Date')} lang={lang} />
                        </div>
                        <div>
                          <Lbl>{T('الجنسية', 'Nationality')}</Lbl>
                          <OccSelect
                            value={addForm.nationality_ar || ''}
                            onChange={(v, item) => setAddForm(p => ({ ...p, nationality_ar: v, nationality_id: item?.id || null }))}
                            items={nationalities}
                            lang={lang}
                            placeholder={T('اختر الجنسية…', 'Select nationality…')}
                          />
                        </div>
                        <div>
                          <Lbl>{T('المهنة', 'Occupation')}</Lbl>
                          <OccSelect
                            value={addForm.occupation_ar || ''}
                            onChange={(v, item) => setAddForm(p => ({ ...p, occupation_ar: v, occupation_id: item?.id || null }))}
                            items={occupations}
                            lang={lang}
                            placeholder={T('اختر المهنة…', 'Select occupation…')}
                          />
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '4px 24px 16px', flexShrink: 0 }}>
                <div />
                <div />
                <div style={{ justifySelf: 'end' }}>
                  <button onClick={saveManualWorker} disabled={adding} className="wkr-add-btn">
                    <span>{adding ? T('جاري الحفظ…', 'Saving…') : T('حفظ', 'Save')}</span>
                    <span className="nav-ico">
                      {adding
                        ? <span style={{ width: 12, height: 12, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'wkr-spin .7s linear infinite' }} />
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

const selStyle = { width: '100%', height: 40, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: '#fff', fontSize: 12.5, fontFamily: F, outline: 'none', cursor: 'pointer' }
const FilterField = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6 }}>{label}</div>
    {children}
  </div>
)
function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: disabled ? 'var(--tx5)' : 'var(--tx2)', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, opacity: disabled ? .4 : 1, fontFamily: F }}>{children}</button>
  )
}

function Empty({ T, hasData }) {
  return (
    <div style={{ ...cardChrome, padding: 48, textAlign: 'center' }}>
      <div style={{ fontSize: 32, color: 'var(--tx5)', marginBottom: 12, fontWeight: 700 }}>—</div>
      <div style={{ fontSize: 15, color: 'var(--tx2)', fontWeight: 600 }}>
        {hasData ? T('لا توجد نتائج للبحث','No results match the search')
                 : T('لا يوجد عمال — استخدم زر "نقل إلى المنشآت" في مركز المزامنة','No workers — use "Promote to sidebar" from the Sync Hub')}
      </div>
    </div>
  )
}

/* ═══════════════════════ Worker Detail (mirrors Facility detail) ═══════════════════════ */
function WorkerDetail({ worker: w, facility: f, sb, toast, T, isAr, onBack }) {
  const t = themeForStatus(w.worker_status)
  const iqamaDays = daysUntil(w.iqama_expiry_date)

  const InfoRow = ({ k, v, copyable, mono }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.05)', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{k}</span>
      <span style={{ fontSize: 12.5, color: v ? 'var(--tx)' : 'var(--tx5)', fontWeight: 700, direction: 'ltr', fontFamily: mono ? 'ui-monospace, monospace' : F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {v || '—'}
        {v && copyable && <CopyBtn value={v} toast={toast} T={T} />}
      </span>
    </div>
  )

  // Iqama status card values (left sidebar — replaces CR status). Same
  // thresholds as the IqamaCell badge: green >30, gold 1–30, red ≤0.
  let iqColor = C.gray, iqLabelAr = '—', iqLabelEn = '—', iqHint = null
  if (iqamaDays != null) {
    if (iqamaDays <= 0) {
      iqColor = C.red
      iqLabelAr = `منتهية منذ ${Math.abs(iqamaDays)} يوم`
      iqLabelEn = `Expired ${Math.abs(iqamaDays)}d ago`
      iqHint = T('تحتاج تجديد فوري', 'Renew immediately')
    } else if (iqamaDays <= 30) {
      iqColor = C.gold
      iqLabelAr = `${iqamaDays} يوم متبقّي`
      iqLabelEn = `${iqamaDays} days left`
      iqHint = T('قرب الانتهاء — تجديد عاجل', 'Approaching expiry — renew')
    } else {
      iqColor = C.ok
      iqLabelAr = `${iqamaDays} يوم متبقّي`
      iqLabelEn = `${iqamaDays} days left`
      iqHint = T('سارية', 'Valid')
    }
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Header with back + name + status badge */}
      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <NatFlag nationality={w.nationality_ar} size={28} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>{w.name_ar || w.name_en || '—'}</div>
            {w.name_en && w.name_ar && <div style={{ fontSize: 12, color: 'var(--tx4)', marginTop: 4 }}>{w.name_en}</div>}
          </div>
        </div>
        <Badge theme={t} T={T} />
      </div>

      {/* 2-column layout — main right + sidebar left (1fr 340px, mirrors SbcFacilities) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Facility info card (top) */}
          {f && (
            <div style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                <span style={cardTitle}>{T('المنشأة التابع لها','Facility')}</span>
              </div>
              <div style={{ padding: '14px 22px' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>{f.name_ar || '—'}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <FacChip label={T('الرقم الموحّد','Unified No')} value={f.unified_number} toast={toast} T={T} />
                  <FacChip label={T('السجل التجاري','CR No')} value={f.cr_number} toast={toast} T={T} />
                  <FacChip label={T('رقم التأمينات','GOSI No')} value={f.gosi_number} toast={toast} T={T} />
                  <FacChip label={T('رقم الموارد البشرية','HRSD No')} value={f.hrsd_number} toast={toast} T={T} />
                </div>
              </div>
            </div>
          )}

          {/* Identity card */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
              <span style={cardTitle}>{T('بيانات الإقامة والهوية','Iqama & identity')}</span>
            </div>
            <div style={{ padding: '14px 22px' }}>
              <InfoRow k={T('رقم الإقامة','Iqama No')} v={w.iqama_number} copyable mono />
              <InfoRow k={T('انتهاء الإقامة','Iqama Expiry')} v={fmtDate(w.iqama_expiry_date)} mono />
              <InfoRow k={T('رقم الحدود','Border No')} v={w.border_number} copyable mono />
              <InfoRow k={T('رقم الجواز','Passport No')} v={w.passport_number} copyable mono />
              <InfoRow k={T('الجنسية','Nationality')} v={w.nationality_ar} />
              <InfoRow k={T('تاريخ الميلاد','Date of Birth')} v={fmtDate(w.birth_date)} mono />
              <InfoRow k={T('الجنس','Gender')} v={w.gender === 'female' ? T('أنثى','Female') : w.gender === 'male' ? T('ذكر','Male') : null} />
            </div>
          </div>

          {/* Employment card */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} />
              <span style={cardTitle}>{T('بيانات العمل','Employment')}</span>
            </div>
            <div style={{ padding: '14px 22px' }}>
              <InfoRow k={T('المهنة','Occupation')} v={w.occupation_ar} />
              <InfoRow k={T('تاريخ الالتحاق','Joining date')} v={fmtDate(w.joining_date)} mono />
              <InfoRow k={T('حالة الاشتراك','Subscription status')} v={t ? T(t.label_ar, t.label_en) : null} />
              <InfoRow k={T('الأجر الإجمالي','Total wage')} v={w.wage_total != null ? num(w.wage_total) + ' ' + T('ر.س','SAR') : null} mono />
              <InfoRow k={T('رقم التسجيل (التأمينات)','GOSI registration')} v={w.gosi_registration_no} copyable mono />
              <InfoRow k={T('رقم الارتباط (التأمينات)','GOSI engagement')} v={w.gosi_engagement_id} copyable mono />
            </div>
          </div>
        </div>

        {/* Sidebar column (left) — Iqama Status + Data Sources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Iqama Status card (replaces CR Status) */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: iqColor }} />
              <span style={cardTitle}>{T('حالة الإقامة','Iqama Status')}</span>
            </div>
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              {/* Big badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 999,
                background: iqColor + '18', border: '1px solid ' + iqColor + '50',
                color: iqColor, fontSize: 13, fontWeight: 800,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: iqColor, boxShadow: `0 0 8px ${iqColor}` }} />
                {T(iqLabelAr, iqLabelEn)}
              </div>
              {iqHint && (
                <div style={{ fontSize: 11, fontWeight: 700, color: iqColor, opacity: .9 }}>{iqHint}</div>
              )}
              {/* Expiry date row */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0 0', borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 6, gap: 12 }}>
                <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('تاريخ الانتهاء','Expiry date')}</span>
                <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 800, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{fmtDate(w.iqama_expiry_date)}</span>
              </div>
            </div>
          </div>

          {/* Data Sources card */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} />
              <span style={cardTitle}>{T('مصادر البيانات','Data sources')}</span>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(() => {
                const sources = []
                if (w.gosi_engagement_id) sources.push({ id: 'gosi', name_ar: 'التأمينات الاجتماعية', name_en: 'GOSI', color: '#22c55e' })
                if (sources.length === 0) sources.push({ id: 'none', name_ar: 'لم تتم المزامنة بعد', name_en: 'Not synced yet', color: C.gray })
                return sources.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8,
                    background: `${s.color}10`, border: `1px solid ${s.color}30`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color, flex: 1 }}>{T(s.name_ar, s.name_en)}</span>
                    {s.id !== 'none' && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                ))
              })()}
              {/* Last synced timestamp */}
              <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                <span>{T('آخر تحديث','Last synced')}</span>
                <span style={{ color: 'var(--tx2)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtAgo(w.source_synced_at, isAr)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FacChip({ label, value, toast, T }) {
  return (
    <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: value ? 'var(--tx)' : 'var(--tx5)', fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {value || '—'}
        {value && <CopyBtn value={value} toast={toast} T={T} />}
      </div>
    </div>
  )
}
