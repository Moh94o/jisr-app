import React, { useCallback, useEffect, useMemo, useState } from 'react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', ok: '#27a046', red: '#c0392b', blue: '#3483b4', purple: '#9b59b6' }

function CopyableNumber({ value, onToast, copyLabel }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span style={{ color: 'rgba(255,255,255,.35)' }}>—</span>
  const onCopy = async (e) => {
    e.stopPropagation()
    try { await navigator.clipboard.writeText(String(value)); setCopied(true); onToast?.(copyLabel || 'Copied'); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
      <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--tx)', fontWeight: 700 }}>{value}</span>
      <button type="button" onClick={onCopy} title={copyLabel || 'Copy'} style={{ width: 20, height: 20, padding: 0, border: 'none', background: 'transparent', color: copied ? C.gold : 'rgba(255,255,255,.35)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
        {copied
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
      </button>
    </span>
  )
}

// Qiwa nitaqat color → visual hex (the `color-code` in raw data is sometimes
// wrong, so we map from the known categories used across the platform).
const nitaqTheme = (name) => {
  const v = String(name || '').toLowerCase()
  if (v.includes('بلاتيني') || v.includes('platinum')) return { fg: '#9333ea', bg: 'rgba(147,51,234,.12)' }
  if (v.includes('اخضر') || v.includes('أخضر') || v.includes('green')) return { fg: '#22c55e', bg: 'rgba(34,197,94,.12)' }
  if (v.includes('اصفر') || v.includes('أصفر') || v.includes('yellow')) return { fg: '#eab308', bg: 'rgba(234,179,8,.12)' }
  if (v.includes('احمر') || v.includes('أحمر') || v.includes('red')) return { fg: '#ef4444', bg: 'rgba(239,68,68,.12)' }
  return { fg: 'rgba(255,255,255,.7)', bg: 'rgba(255,255,255,.05)' }
}

const statusTheme = (s) => {
  const v = String(s || '').toLowerCase()
  if (v.includes('enabled') || v.includes('نشط') || v.includes('قائم')) return { fg: '#22c55e' }
  if (v.includes('soon')) return { fg: '#f59e0b' }
  if (v.includes('disable') || v.includes('معلق') || v.includes('موقوف')) return { fg: '#f59e0b' }
  if (v.includes('cancel') || v.includes('ملغ') || v.includes('suspended')) return { fg: '#ef4444' }
  return { fg: 'rgba(255,255,255,.7)' }
}

const fmtDate = (s) => { if (!s) return '—'; const d = new Date(s); return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10) }
const fmtNum = (n) => n != null ? Number(n).toLocaleString('en-US') : null

export default function QiwaFacilities({ sb, toast, user, lang }) {
  const T = (ar, en) => (lang || 'ar') !== 'en' ? ar : en

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [filter, setFilter] = useState('all') // all | main | soon_expired | with_cases

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true); setErr(null)
    try {
      const { data, error } = await sb.from('qiwa_companies').select('*').order('company_name', { ascending: true })
      if (error) throw error
      setRows(data || [])
    } catch (e) {
      setErr(String(e.message || e))
    } finally { setLoading(false) }
  }, [sb])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let out = rows
    if (filter === 'main') out = out.filter(r => r.company_main_branch)
    else if (filter === 'soon_expired') out = out.filter(r => r.soon_expired)
    else if (filter === 'with_cases') out = out.filter(r => (r.cases_total || 0) > 0)
    const q = search.trim().toLowerCase()
    if (!q) return out
    return out.filter(r => [r.company_name, r.company_unified_number_id, r.cr_national_number, r.cr_number, r.city_name_ar]
      .some(v => String(v || '').toLowerCase().includes(q)))
  }, [rows, search, filter])

  const counts = useMemo(() => ({
    total: rows.length,
    main: rows.filter(r => r.company_main_branch).length,
    soon: rows.filter(r => r.soon_expired).length,
    cases: rows.filter(r => (r.cases_total || 0) > 0).length,
  }), [rows])

  // File number composed from labor office + sequence (Qiwa canonical form).
  const fileNo = (r) => r.company_labor_office_id != null && r.company_sequence_number != null
    ? `${r.company_labor_office_id}-${r.company_sequence_number}` : null

  const Tag = ({ children, color }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: color || 'rgba(255,255,255,.7)', lineHeight: 1.2 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color || 'rgba(255,255,255,.4)', flexShrink: 0 }} />
      {children}
    </span>
  )

  const Pill = ({ children, bg, color }) => (
    <span style={{ display: 'inline-block', fontSize: 9.5, fontWeight: 700, color: color || 'rgba(255,255,255,.7)', background: bg || 'rgba(255,255,255,.04)', padding: '2px 8px', borderRadius: 999, border: '1px solid ' + (color ? color + '33' : 'rgba(255,255,255,.08)'), letterSpacing: '.2px' }}>{children}</span>
  )

  const Filter = ({ k, label, count }) => (
    <button onClick={() => setFilter(k)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid ' + (filter === k ? C.ok + '55' : 'rgba(255,255,255,.08)'), background: filter === k ? 'rgba(39,160,70,.08)' : 'transparent', color: filter === k ? C.ok : 'rgba(255,255,255,.7)', cursor: 'pointer', fontFamily: F, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {label} <span style={{ fontSize: 9.5, opacity: .7 }}>{count}</span>
    </button>
  )

  return (
    <div style={{ fontFamily: F }}>
      {err && (
        <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.3)', fontSize: 12, color: C.red, fontWeight: 600 }}>{err}</div>
      )}

      {/* Filters + search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter k="all" label={T('الكل', 'All')} count={counts.total} />
        <Filter k="main" label={T('رئيسية', 'Main')} count={counts.main} />
        <Filter k="soon_expired" label={T('ينتهي الاشتراك قريباً', 'Expiring soon')} count={counts.soon} />
        <Filter k="with_cases" label={T('عليها ملاحظات', 'With cases')} count={counts.cases} />
        <div style={{ flex: 1, minWidth: 160 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T('بحث…', 'Search…')} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'var(--tx)', fontFamily: F, fontSize: 12, outline: 'none' }} />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,.07)', background: 'rgba(255,255,255,.012)', boxShadow: '0 4px 16px rgba(0,0,0,.18)', overflow: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
            <thead>
              <tr>
                {[
                  [T('المنشأة', 'Company'), { width: '28%' }],
                  [T('الأرقام', 'Numbers'), { width: '15%', whiteSpace: 'nowrap' }],
                  [T('النطاق', 'Nitaqat'), { width: '14%', whiteSpace: 'nowrap' }],
                  [T('العمال', 'Labor'), { width: '13%', whiteSpace: 'nowrap' }],
                  [T('الاشتراك', 'Subscription'), { width: '13%', whiteSpace: 'nowrap' }],
                  [T('الحالة', 'Status'), { width: '10%', whiteSpace: 'nowrap' }],
                  ['', { width: '7%', whiteSpace: 'nowrap' }],
                ].map(([h, extra], i) => (
                  <th key={i} style={{ position: 'sticky', top: 0, zIndex: 5, padding: '13px 10px', textAlign: 'center', fontWeight: 800, color: 'rgba(255,255,255,.72)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.6px', background: '#1b1b1b', boxShadow: '0 1px 0 0 rgba(255,255,255,.08), 0 2px 6px rgba(0,0,0,.25)', ...extra }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const bandBg = i % 2 ? 'rgba(255,255,255,.02)' : 'transparent'
                const subTheme = r.soon_expired ? { fg: '#f59e0b' } : statusTheme(r.status)
                const nitaq = nitaqTheme(r.nitaqat_color_ar || r.color_name)
                const subExpiry = r.subscription_expiry_date ? fmtDate(r.subscription_expiry_date) : null
                return (
                  <tr key={r.company_id} style={{ background: bandBg, transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(39,160,70,.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = bandBg}>
                    <td style={{ padding: '8px 10px', color: 'var(--tx)' }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.company_name || '—'}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {r.company_main_branch && <Tag color={C.gold}>{T('رئيسي', 'Main')}</Tag>}
                        {r.is_vip && <Tag color={C.purple}>VIP</Tag>}
                        {r.establishment_type_name && <Pill>{r.establishment_type_name}</Pill>}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                        <CopyableNumber value={r.company_unified_number_id} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                        <CopyableNumber value={fileNo(r)} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                        {r.cr_national_number && <CopyableNumber value={r.cr_national_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />}
                      </div>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      {r.nitaqat_color_ar || r.color_name ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: nitaq.fg, padding: '3px 10px', borderRadius: 999, background: nitaq.bg, border: `1px solid ${nitaq.fg}33`, whiteSpace: 'nowrap' }}>{r.nitaqat_color_ar || r.color_name}</span>
                          {r.entity_saudi_percentage != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>{T('سعودة', 'Saudization')}: {Number(r.entity_saudi_percentage).toFixed(1)}%</span>}
                        </div>
                      ) : <span style={{ color: 'rgba(255,255,255,.35)' }}>—</span>}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      {r.nitaq_total_laborers != null ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                          <span style={{ color: 'var(--tx)', fontWeight: 800 }}>{r.nitaq_total_laborers}</span>
                          <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,.55)' }}>
                            <span style={{ color: '#22c55e' }}>{r.nitaq_saudis ?? 0}</span>
                            {' / '}
                            <span style={{ color: C.purple }}>{r.nitaq_foreigners ?? 0}</span>
                          </span>
                        </div>
                      ) : <span style={{ color: 'rgba(255,255,255,.35)' }}>—</span>}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      {subExpiry ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 10.5, fontFamily: 'ui-monospace, monospace', color: r.soon_expired ? '#f59e0b' : 'rgba(255,255,255,.8)', direction: 'ltr' }}>{subExpiry}</span>
                          {r.soon_expired && r.remaining_days != null && (
                            <span style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b' }}>{T('باقي', 'remaining')} {r.remaining_days} {T('يوم', 'd')}</span>
                          )}
                        </div>
                      ) : <span style={{ color: 'rgba(255,255,255,.35)' }}>—</span>}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: subTheme.fg, whiteSpace: 'nowrap' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: subTheme.fg, boxShadow: `0 0 6px ${subTheme.fg}aa` }} />
                          {r.cr_status_ar || r.status || '—'}
                        </span>
                        {(r.cases_total || 0) > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b' }}>{r.cases_total} {T('قضايا', 'cases')}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                      <button onClick={() => setDetail(r)} title={T('تفاصيل', 'Details')} style={{ width: 28, height: 28, padding: 0, border: '1px solid rgba(255,255,255,.1)', borderRadius: 7, background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(39,160,70,.1)'; e.currentTarget.style.color = C.ok; e.currentTarget.style.borderColor = 'rgba(39,160,70,.3)' }}
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
        <div style={{ padding: 40, borderRadius: 14, background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
          {T('لا توجد منشآت بعد — شغّل الإشارة المرجعية على بوابة قوى.', 'No companies yet — run the Qiwa bookmarklet on the portal.')}
        </div>
      ) : null}

      {/* Detail modal */}
      {detail && (() => {
        const nitaq = nitaqTheme(detail.nitaqat_color_ar || detail.color_name)
        const Field = ({ k, v }) => (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: 'rgba(255,255,255,.025)', borderRadius: 8, border: '1px solid rgba(255,255,255,.05)', gap: 10 }}>
            <span style={{ color: 'rgba(255,255,255,.5)', fontWeight: 600, fontSize: 11 }}>{k}</span>
            <span style={{ fontWeight: 700, color: 'var(--tx)', direction: 'ltr', fontSize: 11.5, textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || '—'}</span>
          </div>
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
        const SectionTitle = ({ children }) => (
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.45)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6, paddingInlineStart: 2 }}>{children}</div>
        )
        return (
          <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 680, maxHeight: '88vh', overflowY: 'auto', background: 'linear-gradient(180deg, #1d1d1d, #151515)', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', padding: 0, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
              {/* Header */}
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,.06)', background: `linear-gradient(135deg, ${nitaq.bg}, rgba(255,255,255,.01))`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', lineHeight: 1.3 }}>{detail.establishment_name || detail.company_name || '—'}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(detail.nitaqat_color_ar || detail.color_name) && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: nitaq.fg, padding: '3px 10px', borderRadius: 999, background: nitaq.bg, border: `1px solid ${nitaq.fg}55` }}>{detail.nitaqat_color_ar || detail.color_name}</span>
                    )}
                    {detail.company_main_branch && <Tag color={C.gold}>{T('رئيسي', 'Main')}</Tag>}
                    {detail.is_vip && <Tag color={C.purple}>VIP</Tag>}
                    {detail.establishment_type_name && <Pill>{detail.establishment_type_name}</Pill>}
                  </div>
                </div>
                <button onClick={() => setDetail(null)} title={T('إغلاق', 'Close')} style={{ width: 32, height: 32, padding: 0, borderRadius: 8, border: '1px solid rgba(255,255,255,.1)', background: 'rgba(255,255,255,.04)', color: 'rgba(255,255,255,.75)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <SectionTitle>{T('المعرّفات', 'Identifiers')}</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(39,160,70,.06)', borderRadius: 8, border: '1px solid rgba(39,160,70,.18)', gap: 10 }}>
                      <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11 }}>{T('الرقم الموحد', 'Unified no.')}</span>
                      <CopyableNumber value={detail.company_unified_number_id} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(39,160,70,.06)', borderRadius: 8, border: '1px solid rgba(39,160,70,.18)', gap: 10 }}>
                      <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11 }}>{T('رقم ملف المنشأة', 'File no.')}</span>
                      <CopyableNumber value={fileNo(detail)} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                    </div>
                    {detail.cr_national_number && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(212,160,23,.06)', borderRadius: 8, border: '1px solid rgba(212,160,23,.18)', gap: 10 }}>
                        <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11 }}>{T('الرقم الوطني للسجل', 'CR national no.')}</span>
                        <CopyableNumber value={detail.cr_national_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                      </div>
                    )}
                    {detail.cr_number && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(212,160,23,.06)', borderRadius: 8, border: '1px solid rgba(212,160,23,.18)', gap: 10 }}>
                        <span style={{ color: 'rgba(255,255,255,.55)', fontWeight: 600, fontSize: 11 }}>{T('رقم السجل التجاري', 'CR no.')}</span>
                        <CopyableNumber value={detail.cr_number} onToast={toast} copyLabel={T('نُسخ', 'Copied')} />
                      </div>
                    )}
                  </div>
                </div>

                {(detail.main_economic_activity || detail.sub_economic_activity || detail.city_name_ar) && (
                  <div>
                    <SectionTitle>{T('النشاط والموقع', 'Activity & Location')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <Field k={T('النشاط الرئيسي', 'Main activity')} v={detail.main_economic_activity} />
                      <Field k={T('النشاط الفرعي', 'Sub activity')} v={detail.sub_economic_activity} />
                      <Field k={T('المدينة', 'City')} v={detail.city_name_ar} />
                      <Field k={T('نوع المنشأة', 'Type')} v={detail.establishment_type_name} />
                      {detail.district && <Field k={T('الحي', 'District')} v={detail.district} />}
                      {detail.street && <Field k={T('الشارع', 'Street')} v={detail.street} />}
                      {detail.building_no && <Field k={T('المبنى', 'Building')} v={detail.building_no} />}
                      {detail.additional_number && <Field k={T('الرقم الإضافي', 'Additional no.')} v={detail.additional_number} />}
                      {detail.zip_code && <Field k={T('الرمز البريدي', 'Zip code')} v={detail.zip_code} />}
                      {detail.financial_year_gregorian && <Field k={T('نهاية السنة المالية', 'Financial year end')} v={fmtDate(detail.financial_year_gregorian)} />}
                    </div>
                  </div>
                )}

                {detail.nitaq_total_laborers != null && (
                  <div>
                    <SectionTitle>{T('العمالة والسعودة', 'Labor & Saudization')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                      <Stat k={T('الإجمالي', 'Total')} v={fmtNum(detail.nitaq_total_laborers)} />
                      <Stat k={T('سعوديين', 'Saudi')} v={fmtNum(detail.nitaq_saudis)} color="#22c55e" />
                      <Stat k={T('غير سعوديين', 'Non-Saudi')} v={fmtNum(detail.nitaq_foreigners)} color={C.purple} />
                      <Stat k={T('نسبة السعودة', 'Saudization')} v={detail.entity_saudi_percentage != null ? Number(detail.entity_saudi_percentage).toFixed(1) : null} unit="%" color={Number(detail.entity_saudi_percentage) > 0 ? '#22c55e' : 'rgba(255,255,255,.7)'} />
                    </div>
                    {(detail.nitaqat_factorized_saudis != null || detail.nitaqat_factorized_expats != null || detail.nitaqat_saudis_to_be_hired != null) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        <Stat k={T('سعوديين مرجّحون', 'Factorized Saudi')} v={fmtNum(detail.nitaqat_factorized_saudis)} color="#22c55e" />
                        <Stat k={T('غير سعوديين مرجّحون', 'Factorized non-Saudi')} v={fmtNum(detail.nitaqat_factorized_expats)} color={C.purple} />
                        <Stat k={T('سعوديين مطلوب توظيفهم', 'Saudis to hire')} v={fmtNum(detail.nitaqat_saudis_to_be_hired)} color="#f59e0b" />
                      </div>
                    )}
                    {(detail.nitaqat_activity_name || detail.nitaqat_entity_size_name || detail.nitaqat_calculation_method) && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                        <Field k={T('نشاط النطاق', 'Nitaq activity')} v={detail.nitaqat_activity_name} />
                        <Field k={T('حجم المنشأة', 'Entity size')} v={detail.nitaqat_entity_size_name} />
                        <Field k={T('طريقة الاحتساب', 'Calculation method')} v={detail.nitaqat_calculation_method} />
                        <Field k={T('النطاق التالي', 'Next nitaq')} v={detail.nitaqat_next_color_ar} />
                      </div>
                    )}
                    {detail.nitaqat_is_grace_period && (detail.nitaqat_grace_start || detail.nitaqat_grace_end) && (
                      <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', fontSize: 11, color: '#f59e0b', fontWeight: 700, textAlign: 'center' }}>
                        {T('فترة سماح', 'Grace period')}: {detail.nitaqat_grace_start || '—'} → {detail.nitaqat_grace_end || '—'}
                      </div>
                    )}
                  </div>
                )}

                {detail.score_compliance != null && (
                  <div>
                    <SectionTitle>{T('مؤشرات الالتزام', 'Compliance scores')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <Stat k={T('الالتزام العام', 'Overall')} v={detail.score_compliance} unit="%" color={detail.score_compliance >= 70 ? '#22c55e' : '#f59e0b'} />
                      <Stat k={T('النطاقات', 'Nitaqat')} v={detail.score_nitaqat} unit="%" />
                      <Stat k={T('رخص العمل', 'Work permits')} v={detail.score_work_permits} unit="%" color="#22c55e" />
                      <Stat k={T('توثيق العقود', 'Contracts')} v={detail.score_contract_authentication} unit="%" color="#22c55e" />
                      <Stat k={T('موقع العامل', 'Laborer location')} v={detail.score_laborer_location} unit="%" color="#22c55e" />
                      <Stat k={T('ملاحظات WPS', 'WPS notes')} v={detail.score_notes_in_wps} unit="%" />
                    </div>
                  </div>
                )}

                {detail.work_permits_total != null && (
                  <div>
                    <SectionTitle>{T('رخص العمل — المنشأة', 'Work Permits — Establishment')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                      <Stat k={T('الإجمالي', 'Total')} v={fmtNum(detail.work_permits_total)} />
                      <Stat k={T('سارية', 'Valid')} v={fmtNum(detail.work_permits_valid)} color="#22c55e" />
                      <Stat k={T('منتهية', 'Expired')} v={fmtNum(detail.work_permits_expired)} color="#ef4444" />
                    </div>
                    {(detail.wp_establishment_pending != null || detail.wp_no_wp_over_90 != null || detail.wp_no_wp_under_90 != null) && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        <Stat k={T('دفعات معلّقة', 'Pending payments')} v={fmtNum(detail.wp_establishment_pending)} color="#f59e0b" />
                        <Stat k={T('بدون رخصة <90 يوم', 'No WP <90d')} v={fmtNum(detail.wp_no_wp_under_90)} color="#f59e0b" />
                        <Stat k={T('بدون رخصة >90 يوم', 'No WP >90d')} v={fmtNum(detail.wp_no_wp_over_90)} color="#ef4444" />
                      </div>
                    )}
                  </div>
                )}

                {detail.wp_unified_total != null && (
                  <div>
                    <SectionTitle>{T('رخص العمل — الكيان الموحّد', 'Work Permits — Unified Entity')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <Stat k={T('الإجمالي', 'Total')} v={fmtNum(detail.wp_unified_total)} />
                      <Stat k={T('سارية', 'Valid')} v={fmtNum(detail.wp_unified_valid)} color="#22c55e" />
                      <Stat k={T('منتهية', 'Expired')} v={fmtNum(detail.wp_unified_expired)} color="#ef4444" />
                    </div>
                  </div>
                )}

                {(detail.contracts_authenticated != null || detail.contracts_unauthenticated != null) && (
                  <div>
                    <SectionTitle>{T('توثيق العقود', 'Contract Authentication')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <Stat k={T('موثّقة', 'Authenticated')} v={fmtNum(detail.contracts_authenticated)} color="#22c55e" />
                      <Stat k={T('غير موثّقة', 'Unauthenticated')} v={fmtNum(detail.contracts_unauthenticated)} color="#ef4444" />
                      <Stat k={T('النسبة', 'Percentage')} v={detail.contract_auth_percentage != null ? Number(detail.contract_auth_percentage).toFixed(0) : null} unit="%" color={Number(detail.contract_auth_percentage) >= 90 ? '#22c55e' : '#f59e0b'} />
                    </div>
                  </div>
                )}

                {(detail.laborer_assigned != null || detail.laborer_not_assigned != null) && (
                  <div>
                    <SectionTitle>{T('موقع العامل', 'Laborer Location')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <Stat k={T('محدّد الموقع', 'Assigned')} v={fmtNum(detail.laborer_assigned)} color="#22c55e" />
                      <Stat k={T('غير محدّد', 'Not assigned')} v={fmtNum(detail.laborer_not_assigned)} color="#ef4444" />
                    </div>
                  </div>
                )}

                {(detail.visa_approved != null || detail.visa_used != null || detail.visa_cancelled != null) && (
                  <div>
                    <SectionTitle>{T('التأشيرات', 'Visas')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                      <Stat k={T('المعتمدة', 'Approved')} v={fmtNum(detail.visa_approved)} color="#22c55e" />
                      <Stat k={T('مستخدمة', 'Used')} v={fmtNum(detail.visa_used)} />
                      <Stat k={T('غير مستخدمة', 'Not used')} v={fmtNum(detail.visa_not_used)} color="#f59e0b" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <Stat k={T('ملغاة', 'Cancelled')} v={fmtNum(detail.visa_cancelled)} color="#ef4444" />
                      <Stat k={T('جديدة', 'New')} v={fmtNum(detail.visa_new)} />
                      <Stat k={T('مصدرة', 'Issued')} v={fmtNum(detail.visa_issued)} color="#22c55e" />
                    </div>
                  </div>
                )}

                {(detail.est_phase_status || detail.in_allowance_period) && (
                  <div>
                    <SectionTitle>{T('مرحلة المنشأة', 'Establishment Phase')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <Field k={T('المرحلة', 'Phase')} v={detail.est_phase_status} />
                      <Field k={T('فترة سماح', 'In allowance')} v={detail.in_allowance_period == null ? null : (detail.in_allowance_period ? T('نعم', 'Yes') : T('لا', 'No'))} />
                      {detail.est_allowance_end_date && <Field k={T('نهاية فترة السماح', 'Allowance end')} v={detail.est_allowance_end_date} />}
                    </div>
                  </div>
                )}

                {detail.absher_account_number && (
                  <div>
                    <SectionTitle>{T('رصيد أبشر للتأشيرات', 'Absher Visa Balance')}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      <Stat k={T('الرصيد', 'Balance')} v={fmtNum(detail.absher_balance)} unit={T('ر.س', 'SAR')} color="#22c55e" />
                      <Stat k={T('تكلفة التأشيرة', 'Per visa')} v={fmtNum(detail.absher_amount_per_visa)} unit={T('ر.س', 'SAR')} />
                      <Field k={T('الحساب', 'Account')} v={detail.absher_account_number} />
                    </div>
                  </div>
                )}

                <div>
                  <SectionTitle>{T('الاشتراك', 'Subscription')}</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Field k={T('الحالة', 'Status')} v={detail.status} />
                    <Field k={T('تاريخ الانتهاء', 'Expires on')} v={detail.subscription_expiry_date ? fmtDate(detail.subscription_expiry_date) : null} />
                    {detail.remaining_days != null && <Field k={T('أيام متبقية', 'Days remaining')} v={String(detail.remaining_days)} />}
                    <Field k={T('دور المستخدم', 'User role')} v={detail.user_role} />
                  </div>
                </div>

                {detail.detail_synced_at && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)', textAlign: 'center', padding: '6px 0' }}>
                    {T('آخر جلب للتفاصيل', 'Details last fetched')}: {new Date(detail.detail_synced_at).toLocaleString('en-GB')}
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
