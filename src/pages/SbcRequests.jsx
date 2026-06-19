import React, { useCallback, useEffect, useMemo, useState } from 'react'
import BackButton from '../components/BackButton'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', ok: '#22c55e', warn: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', cyan: '#06b6d4', purple: '#a78bfa', teal: '#16a085',
  zatca: '#0f766e', spl: '#06b6d4', chamber: '#0ea5e9', sca: '#f59e0b',
  hrsd: '#16a085', moj: '#8b5cf6', mc: '#D4A017', gosi: '#22c55e',
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

const fmtDate = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? String(s).slice(0, 10) : d.toLocaleDateString('en-GB')
}

// Color a status name by its semantic meaning. Status names come back from
// SBC localised — we match on the canonical Arabic substring so the same
// heuristic works for both `status_name_ar` and `status_name_en`.
const statusTheme = (s) => {
  const v = String(s || '').toLowerCase()
  if (v.includes('مكتمل') || v.includes('complete')) return { fg: C.ok, bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.35)' }
  if (v.includes('جاري') || v.includes('process') || v.includes('under')) return { fg: C.warn, bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.35)' }
  if (v.includes('مرفوض') || v.includes('reject')) return { fg: C.red, bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.35)' }
  if (v.includes('ملغ') || v.includes('cancel')) return { fg: 'rgba(255,255,255,.5)', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)' }
  if (v.includes('انتهت') || v.includes('expired')) return { fg: '#e67e22', bg: 'rgba(230,126,34,.12)', border: 'rgba(230,126,34,.35)' }
  if (v.includes('انتظار') || v.includes('waiting')) return { fg: C.blue, bg: 'rgba(59,130,246,.12)', border: 'rgba(59,130,246,.35)' }
  return { fg: 'rgba(255,255,255,.7)', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)' }
}

function CopyableNumber({ value, onToast, copyLabel }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span style={{ color: 'rgba(255,255,255,.3)' }}>—</span>
  const onCopy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: 'var(--tx)', fontWeight: 800 }}>{value}</span>
      <button type="button" onClick={onCopy} title={copyLabel || 'Copy'} style={{ width: 18, height: 18, padding: 0, border: 'none', background: 'transparent', color: copied ? C.ok : 'rgba(255,255,255,.35)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, transition: 'color .15s' }}
        onMouseEnter={e => { if (!copied) e.currentTarget.style.color = C.gold }}
        onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.35)' }}>
        {copied ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
    </span>
  )
}

// One badge per sub-service — mirrors the SBC "خدمات سيتم تسجيلكم بها" cards.
// `bucket` controls left-border accent: 'done' = green, 'processing' = amber.
function AuthorityCard({ ar, en, num, color, statusAr, statusEn, bucket, lang, onCopy }) {
  const isAr = (lang || 'ar') !== 'en'
  const borderL = bucket === 'done' ? C.ok : (bucket === 'processing' ? C.warn : 'rgba(255,255,255,.1)')
  return (
    <div style={{
      padding: '12px 14px',
      background: 'rgba(255,255,255,.025)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,.06)',
      borderInlineStart: `3px solid ${borderL}`,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.3 }}>
          {isAr ? ar : (en || ar)}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>
          {isAr ? 'رقم التسجيل' : 'Reg. no.'}
        </span>
        <CopyableNumber value={num} onToast={onCopy} copyLabel={isAr ? 'نُسخ' : 'Copied'} />
      </div>
      {(statusAr || statusEn) && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', textAlign: 'end' }}>
          {isAr ? (statusAr || statusEn) : (statusEn || statusAr)}
        </div>
      )}
    </div>
  )
}

// Convert one sbc_requests row into the authority cards array. Each authority
// maps to a sub-service slot in the smartFlow response. We split into done /
// processing buckets purely from status_id (1=completed, 2=under processing).
function authorityList(req, lang) {
  const out = []
  const push = (slot, ar, en, color, num, statusId, statusAr, statusEn, notAllowed) => {
    if (notAllowed || !num) return
    const bucket = statusId === 1 ? 'done' : (statusId === 2 ? 'processing' : null)
    out.push({ slot, ar, en, color, num, statusAr, statusEn, bucket })
  }
  push('zakat', 'هيئة الزكاة والضريبة والجمارك', 'ZATCA', C.zatca, req.zakat_file_number, req.zakat_status_id, req.zakat_status_ar, req.zakat_status_en, req.zakat_not_allowed)
  push('gosi', 'المؤسسة العامة للتأمينات الاجتماعية', 'GOSI', C.gosi, req.gosi_file_number, req.gosi_status_id, req.gosi_status_ar, req.gosi_status_en, req.gosi_not_allowed)
  push('spl', 'اشتراك العنوان الوطني للسجل التجاري', 'SPL · National Address', C.spl, req.spl_file_number, req.spl_status_id, req.spl_status_ar, req.spl_status_en, req.spl_not_allowed)
  push('coc', 'اتحاد الغرف التجارية السعودية', 'Chamber of Commerce', C.chamber, req.coc_file_number, req.coc_status_id, req.coc_status_ar, req.coc_status_en, req.coc_not_allowed)
  push('hrsd', 'وزارة الموارد البشرية والتنمية الاجتماعية', 'HRSD / Qiwa', C.hrsd, req.hrsd_file_number, req.hrsd_status_id, req.hrsd_status_ar, req.hrsd_status_en, req.hrsd_not_allowed)
  push('sca', 'الهيئة السعودية للمقاولين', 'Saudi Contractors Authority', C.sca, req.sca_file_number, req.sca_status_id, req.sca_status_ar, req.sca_status_en, req.sca_not_allowed)
  push('moj', 'وزارة العدل · رقم العقد', 'MOJ · Contract', C.moj, req.moj_file_number, req.moj_status_id, req.moj_status_ar, req.moj_status_en, req.moj_not_allowed)
  push('mc', 'وزارة التجارة · توثيق العقد', 'MC · Contract Auth.', C.mc, req.mc_contract_number, 1, 'مكتمل', 'Completed', false)
  return out
}

export default function SbcRequests({ sb, toast, lang, personFilter }) {
  const T = (ar, en) => (lang || 'ar') !== 'en' ? ar : en
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | completed | processing | other
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true); setErr(null)
    try {
      let q = sb.from('sbc_requests').select('*').order('creation_time', { ascending: false })
      if (personFilter?.id) q = q.eq('person_id', personFilter.id)
      const { data, error } = await q
      if (error) throw error
      setRows(data || [])
    } catch (e) { setErr(String(e.message || e)) }
    finally { setLoading(false) }
  }, [sb, personFilter?.id])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let out = rows
    const q = search.trim().toLowerCase()
    if (q) {
      out = out.filter(r =>
        [r.request_reference, r.mc_company_name, r.cr_national_number, r.service_name_ar, r.service_name_en, r.numeric_request_id]
          .some(v => String(v || '').toLowerCase().includes(q))
      )
    }
    if (statusFilter === 'completed') out = out.filter(r => /مكتمل|complete/i.test(String(r.status_name_ar || r.status_name_en || '')))
    else if (statusFilter === 'processing') out = out.filter(r => /جاري|process|انتظار|waiting/i.test(String(r.status_name_ar || r.status_name_en || '')))
    else if (statusFilter === 'other') out = out.filter(r => !/مكتمل|complete|جاري|process|انتظار|waiting/i.test(String(r.status_name_ar || r.status_name_en || '')))
    return out
  }, [rows, search, statusFilter])

  const counts = useMemo(() => ({
    all: rows.length,
    completed: rows.filter(r => /مكتمل|complete/i.test(String(r.status_name_ar || r.status_name_en || ''))).length,
    processing: rows.filter(r => /جاري|process|انتظار|waiting/i.test(String(r.status_name_ar || r.status_name_en || ''))).length,
  }), [rows])

  // Detail panel — full smartFlow breakdown for a single request. Mirrors the
  // SBC "متابعة حالة الملفات لدى الجهات" screen with two columns: completed +
  // in-progress.
  if (detail) {
    const isAr = (lang || 'ar') !== 'en'
    const auths = authorityList(detail, lang)
    const done = auths.filter(a => a.bucket === 'done')
    const processing = auths.filter(a => a.bucket === 'processing')
    const other = auths.filter(a => !a.bucket)
    const theme = statusTheme(detail.status_name_ar || detail.status_name_en)
    return (
      <div style={{ fontFamily: F, color: 'var(--tx2)' }}>
        <div style={{ marginBottom: 16 }}>
          <BackButton onBack={() => setDetail(null)} label={T('رجوع', 'Back')} />
        </div>

        {/* Header card — request meta */}
        <div style={{ ...cardChrome, marginBottom: 14 }}>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6 }}>
                  {T(detail.service_name_ar, detail.service_name_en) || T('طلب', 'Request')}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.93)' }}>
                  {detail.mc_company_name || detail.request_reference || '—'}
                </div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 12, fontSize: 12 }}>
                  <div><span style={{ color: 'var(--tx5)' }}>{T('رقم الطلب', 'Request no.')} </span><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--tx)' }}>{detail.request_reference || '—'}</span></div>
                  {detail.cr_national_number && <div><span style={{ color: 'var(--tx5)' }}>{T('الرقم الموحد', 'Unified no.')} </span><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--tx)' }}>{detail.cr_national_number}</span></div>}
                  {detail.company_type_ar && <div><span style={{ color: 'var(--tx5)' }}>{T('نوع الطلب', 'Type')} </span><span style={{ fontWeight: 700, color: 'var(--tx)' }}>{isAr ? detail.company_type_ar : (detail.company_type_en || detail.company_type_ar)}</span></div>}
                  {detail.creation_time && <div><span style={{ color: 'var(--tx5)' }}>{T('تاريخ', 'Date')} </span><span style={{ fontWeight: 700, color: 'var(--tx)' }}>{fmtDate(detail.creation_time)}</span></div>}
                </div>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: theme.bg, border: '1px solid ' + theme.border }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.fg, boxShadow: `0 0 8px ${theme.fg}aa` }} />
                <span style={{ fontSize: 13, fontWeight: 800, color: theme.fg }}>{isAr ? (detail.status_name_ar || detail.status_name_en) : (detail.status_name_en || detail.status_name_ar)}</span>
              </div>
            </div>
          </div>
        </div>

        {done.length > 0 && (
          <div style={{ ...cardChrome, marginBottom: 14 }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} />
              <span style={cardTitle}>{T('خدمات تم تسجيلكم بها · مكتمل', 'Registered · Completed')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.ok, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,197,94,.14)' }}>{done.length}</span>
            </div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {done.map(a => <AuthorityCard key={a.slot} {...a} lang={lang} onCopy={toast} />)}
            </div>
          </div>
        )}

        {processing.length > 0 && (
          <div style={{ ...cardChrome, marginBottom: 14 }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.warn }} />
              <span style={cardTitle}>{T('جاري المعالجة', 'Under Processing')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11, color: C.warn, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,.14)' }}>{processing.length}</span>
            </div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {processing.map(a => <AuthorityCard key={a.slot} {...a} lang={lang} onCopy={toast} />)}
            </div>
          </div>
        )}

        {other.length > 0 && (
          <div style={{ ...cardChrome, marginBottom: 14 }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,.3)' }} />
              <span style={cardTitle}>{T('أخرى', 'Other')}</span>
            </div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
              {other.map(a => <AuthorityCard key={a.slot} {...a} lang={lang} onCopy={toast} />)}
            </div>
          </div>
        )}

        {detail.mc_aamaly_url && (
          <div style={{ ...cardChrome, marginBottom: 14 }}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.mc }} />
              <span style={cardTitle}>{T('وزارة التجارة', 'Ministry of Commerce')}</span>
            </div>
            <div style={{ padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--tx5)' }}>{T('رابط بوابة أعمالي', 'Aamaly portal link')}</span>
              <a href={detail.mc_aamaly_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, fontWeight: 700, color: C.gold, textDecoration: 'none', padding: '6px 14px', borderRadius: 8, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)' }}>
                {T('فتح', 'Open')}
              </a>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List view
  return (
    <div style={{ fontFamily: F, color: 'var(--tx2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.92)' }}>{T('طلبات SBC', 'SBC Requests')}</h2>
          <div style={{ fontSize: 11.5, color: 'var(--tx5)', marginTop: 4 }}>{T('متابعة حالة الملفات لدى الجهات', 'Track sub-service registration progress')}</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T('بحث برقم الطلب أو اسم الشركة...', 'Search by request no. or company...')}
          style={{ flex: 1, maxWidth: 380, height: 36, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(0,0,0,.18)', color: 'var(--tx)', fontFamily: F, fontSize: 12 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          ['all', T('الكل', 'All'), counts.all],
          ['completed', T('مكتمل', 'Completed'), counts.completed],
          ['processing', T('جاري', 'Processing'), counts.processing],
          ['other', T('أخرى', 'Other'), counts.all - counts.completed - counts.processing],
        ].map(([k, l, n]) => {
          const active = statusFilter === k
          return (
            <button key={k} onClick={() => setStatusFilter(k)}
              style={{ height: 36, padding: '0 14px', borderRadius: 10, background: active ? 'rgba(212,160,23,.14)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.35)' : 'rgba(255,255,255,.06)'), color: active ? C.gold : 'var(--tx2)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {l}
              <span style={{ fontSize: 10.5, color: active ? C.gold : 'var(--tx5)', fontWeight: 800 }}>{n}</span>
            </button>
          )
        })}
      </div>

      {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx5)' }}>{T('جارٍ التحميل...', 'Loading...')}</div>}
      {err && <div style={{ padding: 14, color: C.red, fontSize: 12 }}>{err}</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx5)', background: 'rgba(255,255,255,.025)', borderRadius: 12, border: '1px dashed rgba(255,255,255,.1)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{T('لا توجد طلبات', 'No requests')}</div>
          <div style={{ fontSize: 11.5 }}>{T('شغّل مزامنة SBC لجلب طلباتك من البوابة', 'Run an SBC sync to fetch your portal requests')}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
        {filtered.map(r => {
          const theme = statusTheme(r.status_name_ar || r.status_name_en)
          const auths = authorityList(r, lang)
          const done = auths.filter(a => a.bucket === 'done').length
          const proc = auths.filter(a => a.bucket === 'processing').length
          const isAr = (lang || 'ar') !== 'en'
          return (
            <div key={r.request_uuid} onClick={() => setDetail(r)}
              style={{ ...cardChrome, cursor: 'pointer', transition: '.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.35)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 10.5, color: C.gold, fontWeight: 700, letterSpacing: '.3px', marginBottom: 4, textTransform: 'uppercase' }}>
                      {isAr ? (r.service_name_ar || r.service_name_en) : (r.service_name_en || r.service_name_ar)}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.mc_company_name || r.request_reference || '—'}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--tx5)', marginTop: 4, fontFamily: 'ui-monospace, monospace', direction: 'ltr' }}>
                      {r.request_reference || ''}{r.cr_national_number ? ' · ' + r.cr_national_number : ''}
                    </div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: theme.bg, border: '1px solid ' + theme.border, whiteSpace: 'nowrap' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.fg }} />
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: theme.fg }}>{isAr ? (r.status_name_ar || r.status_name_en) : (r.status_name_en || r.status_name_ar)}</span>
                  </span>
                </div>
              </div>
              <div style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ color: C.ok, fontWeight: 700 }}>● {done} {T('مكتمل', 'done')}</span>
                  {proc > 0 && <span style={{ color: C.warn, fontWeight: 700 }}>● {proc} {T('جاري', 'processing')}</span>}
                </div>
                <span style={{ color: 'var(--tx5)' }}>{fmtDate(r.creation_time)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
