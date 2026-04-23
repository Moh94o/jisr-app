import React, { useCallback, useEffect, useMemo, useState } from 'react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4', purple: '#9b59b6' }

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
  if (v.includes('suspend') || v.includes('معلق') || v.includes('موقوف')) return { fg: '#f59e0b', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.35)' }
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

export default function SbcFacilities({ sb, toast, user, lang }) {
  const T = (ar, en) => (lang || 'ar') !== 'en' ? ar : en

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({ owner: '', partnersMin: '', partnersMax: '', city: '', status: '', crNumber: '', crNational: '', managersMin: '', managersMax: '' })
  const [detail, setDetail] = useState(null)
  const [lastSync, setLastSync] = useState(null)
  const [filter, setFilter] = useState('all') // all | main | manager | partner | confirmation
  // Live GOSI/HRSD data fetched per-facility when the detail modal opens.
  const [liveGosi, setLiveGosi] = useState(null)
  const [liveHrsd, setLiveHrsd] = useState(null)
  const [gosiState, setGosiState] = useState('idle') // idle | loading | ok | error
  const [hrsdState, setHrsdState] = useState('idle')
  const [sbcSessionErr, setSbcSessionErr] = useState(null)

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

  useEffect(() => { load() }, [load])

  const normalized = useMemo(() => rows.map(r => {
    const raw = (typeof r.raw === 'string') ? (() => { try { return JSON.parse(r.raw) } catch { return null } })() : r.raw
    const cr = raw?.crInformation || {}
    const partners = Array.isArray(r.partners) ? r.partners : (Array.isArray(raw?.parityList) ? raw.parityList : [])
    const managers = Array.isArray(r.managers) ? r.managers : (Array.isArray(raw?.mangmentInformation?.managerList) ? raw.mangmentInformation.managerList : [])
    return {
      ...r,
      _raw: raw,
      _form: label(r.company_form, lang) || label(r.entity_type, lang) || null,
      _entity: label(r.entity_type, lang),
      _currency: currencyShort(label(r.capital_currency, lang), lang),
      _city: label(r.headquarter_city, lang),
      _status: label(r.cr_status, lang),
      _issueDate: fmtDate(r.cr_issue_date),
      _confirmDate: fmtDate(r.cr_confirm_date),
      _parentNatNo: cr.mainCRNationalNumber || cr.mainCrNationalNumber || null,
      _partners: partners,
      _partnersCount: partners.length,
      _managers: managers,
    }
  }), [rows, lang])

  // Build a flat, searchable "blob" per partner/manager that covers both AR + EN names and the national id.
  const personBlob = (p) => {
    const i = p?.personInfo || {}
    return [i.firstNameAr, i.fatherNameAr, i.grandFatherNameAr, i.familyNameAr, i.firstNameEn, i.familyNameEn, i.identifierNo]
      .filter(Boolean).join(' ').toLowerCase()
  }
  const filtered = useMemo(() => {
    let out = normalized
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
    const oq = (adv.owner || '').trim().toLowerCase()
    if (oq) out = out.filter(r => (r._partners || []).some(p => personBlob(p).includes(oq)))
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
    return out
  }, [normalized, search, filter, adv])

  // Group branches under their main parent, then produce a flat display list
  // where each branch row carries `_isBranch: true` and appears directly after
  // its main row. This gives hierarchy without a disruptive expand UI for
  // accounts with few branches.
  const displayRows = useMemo(() => {
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
  }, [filtered])

  const Tag = ({ children, color }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: color || 'rgba(255,255,255,.7)', lineHeight: 1.2 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color || 'rgba(255,255,255,.4)', flexShrink: 0 }} />
      {children}
    </span>
  )

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

  const counts = useMemo(() => ({
    total: rows.length,
    main: rows.filter(r => r.is_main).length,
    manager: rows.filter(r => r.is_manager).length,
    partner: rows.filter(r => r.is_partner).length,
    confirmation: rows.filter(r => r.is_in_confirmation_period).length,
    liquidation: rows.filter(r => r.in_liquidation_process).length,
  }), [rows])

  // Quick count of non-empty advanced fields (for the badge on the "بحث متقدم" button).
  const advCount = Object.values(adv).filter(v => String(v || '').trim() !== '').length
  const advInp = { width: '100%', height: 34, padding: '0 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(0,0,0,.25)', color: 'var(--tx)', fontFamily: F, fontSize: 12, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }
  const advLbl = { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', marginBottom: 4, display: 'block' }
  const resultCount = filtered.length

  return (
    <div style={{ fontFamily: F }}>
      {err && <Card style={{ marginBottom: 14, borderColor: 'rgba(192,57,43,.35)', background: 'rgba(192,57,43,.06)' }}>
        <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{err}</div>
      </Card>}

      {/* Search bar + advanced toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: advOpen ? 10 : 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', top: '50%', insetInlineEnd: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={T('ابحث بالاسم، السجل، المدينة، المالك، المدير…', 'Search by name, CR, city, owner, manager…')}
            style={{ width: '100%', height: 38, padding: '0 14px 0 38px', borderRadius: 9, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(0,0,0,.25)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}/>
        </div>
        <button type="button" onClick={() => setAdvOpen(v => !v)} style={{ padding: '0 14px', height: 38, borderRadius: 9, border: `1px solid ${advOpen || advCount ? 'rgba(212,160,23,.45)' : 'rgba(255,255,255,.1)'}`, background: advOpen || advCount ? 'rgba(212,160,23,.08)' : 'rgba(255,255,255,.03)', color: advOpen || advCount ? C.gold : 'var(--tx)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <span>{T('بحث متقدم', 'Advanced')}</span>
          {advCount > 0 && <span style={{ background: C.gold, color: '#1a1a1a', fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 999 }}>{advCount}</span>}
        </button>
        {(search || advCount > 0) && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>{resultCount} {T('نتيجة', 'results')}</span>}
      </div>

      {/* Advanced search panel */}
      {advOpen && (
        <div style={{ marginBottom: 14, padding: 14, borderRadius: 11, background: 'rgba(212,160,23,.03)', border: '1px dashed rgba(212,160,23,.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.gold }}>{T('فلاتر متقدمة', 'Advanced Filters')}</div>
            {advCount > 0 && (
              <button type="button" onClick={() => setAdv({ owner: '', partnersMin: '', partnersMax: '', city: '', status: '', crNumber: '', crNational: '', managersMin: '', managersMax: '' })} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(192,57,43,.3)', background: 'rgba(192,57,43,.08)', color: C.red, fontFamily: F, fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>{T('مسح الكل', 'Clear all')}</button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <div>
              <label style={advLbl}>{T('اسم المالك / الشريك', 'Owner / Partner')}</label>
              <input value={adv.owner} onChange={e => setAdv(a => ({ ...a, owner: e.target.value }))} placeholder={T('بحث بالاسم أو الهوية', 'Name or ID')} style={advInp}/>
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
          </div>
        </div>
      )}

      {/* Table — compact rows, combined dates, semantic status chip, branches indented under their main */}
      {displayRows.length > 0 ? (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.012)', boxShadow: '0 4px 16px rgba(0,0,0,.18)', overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
            <thead>
              <tr>
                {[
                  [T('المنشأة', 'Facility'), { width: '23%' }],
                  [T('أرقام المنشأة', 'Facility IDs'), { width: '18%', whiteSpace: 'nowrap' }],
                  [T('الملاك والشركاء', 'Partners'), { width: '14%', whiteSpace: 'nowrap' }],
                  [T('المدراء', 'Managers'), { width: '14%', whiteSpace: 'nowrap' }],
                  [T('حالة السجل', 'CR Status'), { width: '11%', whiteSpace: 'nowrap' }],
                  [T('التواريخ', 'Dates'), { width: '14%', whiteSpace: 'nowrap' }],
                  ['', { width: '6%', whiteSpace: 'nowrap' }],
                ].map(([h, extra], i) => (
                  <th key={i} style={{
                    position: 'sticky', top: 0, zIndex: 5,
                    padding: '13px 10px', textAlign: 'center',
                    fontWeight: 800, color: 'rgba(255,255,255,.72)',
                    fontSize: 10, textTransform: 'uppercase', letterSpacing: '.6px',
                    background: '#1b1b1b',
                    boxShadow: '0 1px 0 0 rgba(255,255,255,.08), 0 2px 6px rgba(0,0,0,.25)',
                    ...extra,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((r, i) => {
                const theme = statusTheme(r._status)
                const bandBg = i % 2 ? 'rgba(255,255,255,.02)' : 'transparent'
                const branch = !!r._isBranch
                return (
                  <tr key={(r.cr_national_number || i) + (branch ? '_b' : '')} style={{ background: bandBg, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.055)'}
                    onMouseLeave={e => e.currentTarget.style.background = bandBg}>
                    <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--tx)', maxWidth: 320, borderRight: branch ? `2px solid ${C.blue}55` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingInlineStart: branch ? 18 : 0 }}>
                        {branch && <span style={{ fontSize: 10, color: C.blue, fontWeight: 800 }}>↳</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11.5 }}>{r.entity_full_name_ar || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center', paddingInlineStart: branch ? 18 : 0 }}>
                        {r.is_main && <Tag color={C.gold}>{T('رئيسي', 'Main')}</Tag>}
                        {branch && <Tag color={C.blue}>{T('فرع', 'Branch')}</Tag>}
                        {r.in_liquidation_process && <Tag color={C.red}>{T('تصفية', 'Liquidation')}</Tag>}
                        {r.has_ecommerce && <Tag color="#06b6d4">{T('إلكتروني', 'E-com')}</Tag>}
                        {(r._entity || r._form) && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,.55)', background: 'rgba(255,255,255,.04)', padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,.08)', letterSpacing: '.2px', whiteSpace: 'nowrap' }}>
                            {r._entity && r._form && r._entity !== r._form ? `${r._entity} · ${r._form}` : (r._form || r._entity)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                        <CopyableNumber value={r.cr_national_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                        {r.gosi_registration_number && (
                          <CopyableNumber value={r.gosi_registration_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                        )}
                        {r.hrsd_labor_office_id != null && (
                          <CopyableNumber value={`${r.hrsd_labor_office_id}-${r.hrsd_sequence_number || ''}`} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                      <PersonList people={r._partners} lang={lang} />
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                      <PersonList people={r._managers} lang={lang} />
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: theme.fg, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.fg, boxShadow: `0 0 6px ${theme.fg}aa`, flexShrink: 0 }} />
                          {r._status || '—'}
                        </span>
                        {r.is_in_confirmation_period && (
                          <span style={{ fontSize: 9.5, fontWeight: 700, color: '#facc15', letterSpacing: '.2px' }}>{T('ضمن فترة التأكيد', 'In Confirm Period')}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontFamily: 'ui-monospace, monospace', fontSize: 10 }}>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,.38)', fontSize: 9, fontWeight: 700, letterSpacing: '.3px' }}>{T('إصدار', 'ISS')}</span>
                          <span style={{ color: 'rgba(255,255,255,.8)', direction: 'ltr' }}>{r._issueDate}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                          <span style={{ color: 'rgba(255,255,255,.38)', fontSize: 9, fontWeight: 700, letterSpacing: '.3px' }}>{T('تأكيد', 'CNF')}</span>
                          <span style={{ color: 'rgba(255,255,255,.8)', direction: 'ltr' }}>{r._confirmDate}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <button onClick={() => setDetail(r)} title={T('تفاصيل', 'Details')} style={{ width: 28, height: 28, padding: 0, border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,.1)'; e.currentTarget.style.color = C.gold; e.currentTarget.style.borderColor = 'rgba(212,160,23,.3)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.color = 'rgba(255,255,255,.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : !loading ? (
        <Card><div style={{ textAlign: 'center', color: 'rgba(255,255,255,.45)', fontSize: 12, padding: 20 }}>{T('لا توجد سجلات بعد.', 'No records yet.')}</div></Card>
      ) : null}

      {/* Detail modal */}
      {detail && (() => {
        const theme = statusTheme(detail._status)
        const Field = ({ k, v }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }}>{k}</span>
            <span style={{ fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span>
          </div>
        )
        const SectionTitle = ({ children }) => (
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.45)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6, paddingInlineStart: 2 }}>{children}</div>
        )
        const Stat = ({ k, v, color, unit }) => (
          <div style={{ padding: '10px 10px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 10, marginBottom: 4 }}>{k}</div>
            <div style={{ fontWeight: 800, color: color || 'var(--tx)', fontSize: 13, direction: 'ltr', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 3 }}>
              <span>{v != null ? v : '—'}</span>
              {unit && v != null && <span style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', fontWeight: 600 }}>{unit}</span>}
            </div>
          </div>
        )
        const fmtNum = (n) => n != null ? Number(n).toLocaleString('en-US') : null
        const PersonRow = ({ p, roleAr }) => {
          const info = p?.personInfo
          if (!info) return null
          const fullName = [info.firstNameAr, info.fatherNameAr, info.grandFatherNameAr, info.familyNameAr].filter(Boolean).join(' ')
          const natAr = info.nationality?.nationalityDescriptionAr
          // Best-effort DOB extraction — handles multiple shapes SBC might return.
          const dobRaw = info.dateOfBirth || info.birthDate || info.dob || info.dateOfBirthHijri || info.dateOfBirthGregorian
            || info.birthDateGregorian || info.birthDateHijri || null
          const dob = dobRaw ? fmtDate(dobRaw) : null
          const isCompany = isCompanyParty(p)
          const idLabel = info.identifierType?.identifierTypeDescAr || info.identifierType?.identifierTypeDescEn
            || (isCompany ? T('رقم موحد', 'Unified no.') : T('هوية', 'ID'))
          return (
            <div style={{ padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isCompany && (
                    <span title={T('شركة / منشأة', 'Company / Entity')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: 'rgba(52,131,180,.15)', color: C.blue, flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg>
                    </span>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName || '—'}</div>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                  {info.identifierNo && <span style={{ fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>{idLabel}: {info.identifierNo}</span>}
                  {natAr && !isCompany && <span>· {natAr}</span>}
                  {dob && <span>· {T('مواليد', 'DOB')} {dob}</span>}
                </div>
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
          total: liveGosi?.numberOfContributors != null ? Number(liveGosi.numberOfContributors) : detail.gosi_contributors_total,
          saudi: liveGosi?.numberOfSaudiContributors != null ? Number(liveGosi.numberOfSaudiContributors) : detail.gosi_contributors_saudi,
          nonSaudi: liveGosi?.numberOfNonSaudiContributors != null ? Number(liveGosi.numberOfNonSaudiContributors) : detail.gosi_contributors_non_saudi,
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
        return (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(180deg, #1d1d1d, #151515)', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', padding: 0, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
            {/* Header */}
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', background: `linear-gradient(135deg, ${theme.bg}, rgba(255,255,255,.01))` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.3 }}>{detail.entity_full_name_ar || '—'}</div>
                  {detail.entity_full_name_en && (
                    <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.55)', fontWeight: 600, direction: 'ltr', textAlign: 'start', marginTop: 3, letterSpacing: '.2px' }}>{detail.entity_full_name_en}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: theme.fg }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme.fg, boxShadow: `0 0 8px ${theme.fg}aa` }} />
                      {detail._status || '—'}
                    </span>
                    {detail.is_main && <Tag color={C.gold}>{T('رئيسي', 'Main')}</Tag>}
                    {detail.is_manager && <Tag color={C.purple}>{T('مدير', 'Manager')}</Tag>}
                    {detail.is_partner && !detail.is_manager && <Tag color={C.blue}>{T('شريك', 'Partner')}</Tag>}
                    {detail.in_liquidation_process && <Tag color={C.red}>{T('تصفية', 'Liquidation')}</Tag>}
                    {detail.has_ecommerce && <Tag color="#06b6d4">{T('إلكتروني', 'E-com')}</Tag>}
                    {detail.is_in_confirmation_period && <Tag color="#facc15">{T('ضمن فترة التأكيد', 'In Confirm Period')}</Tag>}
                  </div>
                </div>
                <button onClick={() => setDetail(null)} title={T('إغلاق', 'Close')} style={{ width: 32, height: 32, padding: 0, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.75)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Identification — numbers with copy */}
              <div>
                <SectionTitle>{T('المعرّفات', 'Identifiers')}</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(212,160,23,.06)', borderRadius: 8, border: '1px solid rgba(212,160,23,.18)', gap: 10 }}>
                    <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11 }}>{T('الرقم الموحد', 'Unified No.')}</span>
                    <CopyableNumber value={detail.cr_national_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(212,160,23,.06)', borderRadius: 8, border: '1px solid rgba(212,160,23,.18)', gap: 10 }}>
                    <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11 }}>{T('رقم السجل التجاري', 'CR Number')}</span>
                    <CopyableNumber value={detail.cr_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                  </div>
                </div>
                {detail.encrypted_cr_national_number && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', gap: 10, marginTop: 8 }}>
                    <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11 }}>{T('رمز المنشأة', 'Facility code')}</span>
                    <CopyableNumber value={detail.encrypted_cr_national_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                  </div>
                )}
              </div>

              {/* Classification */}
              <div>
                <SectionTitle>{T('التصنيف', 'Classification')}</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Field k={T('النوع', 'Entity')} v={detail._entity} />
                  <Field k={T('الشكل', 'Form')} v={detail._form} />
                  <Field k={T('صفات الشركة', 'Company character')} v={companyCharAr} />
                  <Field k={T('المدينة', 'City')} v={detail._city} />
                  <Field k={T('رأس المال', 'Capital')} v={detail.capital != null ? `${Number(detail.capital).toLocaleString('en-US')} ${detail._currency || ''}` : null} />
                </div>
              </div>

              {/* Dates */}
              <div>
                <SectionTitle>{T('التواريخ', 'Dates')}</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Field k={T('تاريخ الإصدار', 'Issue date')} v={detail._issueDate} />
                  <Field k={T('تاريخ التأكيد', 'Confirm date')} v={detail._confirmDate} />
                </div>
              </div>

              {/* GOSI — social insurance */}
              {hasGosi && (
                <div>
                  <SectionTitle>{T('التأمينات الاجتماعية · GOSI', 'Social Insurance · GOSI')}{gosiState === 'loading' ? ` · ${T('جارٍ الجلب…', 'loading…')}` : ''}</SectionTitle>
                  {(gosi.regNo || gosi.name) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <Field k={T('رقم الاشتراك', 'Registration no.')} v={gosi.regNo} />
                      <Field k={T('اسم المؤسسة في التأمينات', 'GOSI name')} v={gosi.name} />
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                    <Stat k={T('عدد المشتركين', 'Contributors')} v={fmtNum(gosi.total)} />
                    <Stat k={T('سعوديين', 'Saudi')} v={fmtNum(gosi.saudi)} color="#22c55e" />
                    <Stat k={T('غير سعوديين', 'Non-Saudi')} v={fmtNum(gosi.nonSaudi)} color={C.purple} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <Stat k={T('مبالغ الاشتراكات', 'Contributions')} v={fmtNum(gosi.contribution)} unit={T('ر.س', 'SAR')} />
                    <Stat k={T('المديونية', 'Total debt')} v={fmtNum(gosi.debit)} unit={T('ر.س', 'SAR')} color="#ef4444" />
                    <Stat k={T('الغرامات', 'Penalties')} v={fmtNum(gosi.penalties)} unit={T('ر.س', 'SAR')} color="#f59e0b" />
                  </div>
                  {gosiState === 'error' && gosi.total == null && !gosi.regNo && (
                    <div style={{ marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,.45)', textAlign: 'center' }}>
                      {sbcSessionErr === 'NO_SESSION' ? T('لا توجد جلسة SBC — شغّل المزامنة أولاً', 'No SBC session — run sync first')
                        : sbcSessionErr === 'EXPIRED' ? T('انتهت جلسة SBC — أعد المزامنة', 'SBC session expired — sync again')
                        : T('تعذّر جلب بيانات التأمينات', 'Could not fetch GOSI data')}
                    </div>
                  )}
                </div>
              )}

              {/* HRSD / Qiwa — labor office */}
              {hasHrsd && (
                <div>
                  <SectionTitle>{T('مكتب العمل · قوى', 'Labor Office · Qiwa')}{hrsdState === 'loading' ? ` · ${T('جارٍ الجلب…', 'loading…')}` : ''}</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <Field k={T('فرع مكتب العمل', 'Labor office')} v={hrsd.officeName} />
                    <Field k={T('رقم ملف المنشأة', 'File no.')} v={hrsd.officeId != null ? `${hrsd.officeId}-${hrsd.sequenceNumber || ''}` : null} />
                    <Field k={T('نطاق المنشأة', 'Nitaq')} v={hrsd.nitaqName} />
                    <Field k={T('نشاط النطاق', 'Nitaq activity')} v={hrsd.activityName} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                    <Stat k={T('إجمالي العمال', 'Total')} v={fmtNum(hrsd.totalLaborers)} />
                    <Stat k={T('سعوديين', 'Saudi')} v={fmtNum(hrsd.saudiLaborers)} color="#22c55e" />
                    <Stat k={T('غير سعوديين', 'Non-Saudi')} v={fmtNum(hrsd.foreignLaborers)} color={C.purple} />
                    <Stat k={T('نسبة السعودة', 'Saudization')} v={hrsd.saudiPercentage != null ? Number(hrsd.saudiPercentage).toFixed(1) : null} unit="%" color={Number(hrsd.saudiPercentage) > 0 ? '#22c55e' : 'rgba(255,255,255,.7)'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <Stat k={T('رخص عمل مصدرة', 'Issued permits')} v={fmtNum(hrsd.issuedPermits)} />
                    <Stat k={T('رخص تنتهي قريباً', 'Expiring soon')} v={fmtNum(hrsd.expiringPermits)} color="#f59e0b" />
                    <Stat k={T('رخص منتهية', 'Expired')} v={fmtNum(hrsd.expiredPermits)} color="#ef4444" />
                  </div>
                  {hrsdState === 'error' && hrsd.totalLaborers == null && !hrsd.officeName && (
                    <div style={{ marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,.45)', textAlign: 'center' }}>
                      {sbcSessionErr === 'NO_SESSION' ? T('لا توجد جلسة SBC — شغّل المزامنة أولاً', 'No SBC session — run sync first')
                        : sbcSessionErr === 'EXPIRED' ? T('انتهت جلسة SBC — أعد المزامنة', 'SBC session expired — sync again')
                        : T('تعذّر جلب بيانات مكتب العمل', 'Could not fetch labor office data')}
                    </div>
                  )}
                </div>
              )}

              {/* Activities */}
              {activities.length > 0 && (
                <div>
                  <SectionTitle>{T('الأنشطة التجارية', 'Commercial Activities')}</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activities.map((a, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--tx)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang === 'en' ? (a.activityDescriptionEn || a.activityDescriptionAr) : (a.activityDescriptionAr || a.activityDescriptionEn)}</span>
                        <span style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'rgba(255,255,255,.5)', direction: 'ltr', whiteSpace: 'nowrap' }}>({a.activityID})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Managers */}
              {managers.length > 0 && (
                <div>
                  <SectionTitle>{T('المدراء', 'Managers')}{mgmtStructureAr ? ` · ${mgmtStructureAr}` : ''}</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {managers.map((m, i) => <PersonRow key={i} p={m} roleAr={T('مدير', 'Manager')} />)}
                  </div>
                </div>
              )}

              {/* Partners */}
              {partners.length > 0 && (
                <div>
                  <SectionTitle>{T('الملاك والشركاء', 'Partners')}</SectionTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {partners.map((p, i) => {
                      const types = Array.isArray(p.partnershipTypeList) ? p.partnershipTypeList.map(t => t.partnershipTypeDescriptionAr).filter(Boolean).join(' · ') : null
                      return <PersonRow key={i} p={p} roleAr={types} />
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
        )
      })()}

    </div>
  )
}
