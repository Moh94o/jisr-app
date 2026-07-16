import React, { useEffect, useMemo, useState } from 'react'
import BackButton from '../components/BackButton'
import { navSetHere } from '../lib/navStack.js'
import { EmptyState } from '../components/ui/FormKit.jsx'
import PageSkeleton from '../components/ui/Skeleton.jsx'
import { can as canPerm } from '../lib/permissions.js'
import SaudizationRequestPage from './SaudizationRequestPage.jsx'
import { Plus, ShieldCheck, Building2, IdCard, FileText, Wallet, FileCheck, Receipt, Search } from 'lucide-react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#B07D00', ok: '#2ecc71', blue: '#5dade2', red: '#e87265', purple: '#bb8fce' }
const PAGE = 40

const STATUS_THEME = {
  new: { c: C.blue, ar: 'جديد' }, in_progress: { c: C.blue, ar: 'قيد التنفيذ' },
  done: { c: C.ok, ar: 'منجز' }, cancelled: { c: C.red, ar: 'ملغي' }, on_hold: { c: C.purple, ar: 'معلق' },
}
const REASON_EN = { 'رفع نطاق - تأشيرات': 'Nitaqat - visas', 'رفع نطاق - نقل كفالة': 'Nitaqat - transfer', 'تجديد إقامة': 'Iqama renewal', 'نقل كفالة': 'Transfer', 'أجير': 'Ajeer' }
const dOnly = (s) => s ? String(s).slice(0, 10) : null
const num = (v) => Number(v || 0).toLocaleString('en-US')

export default function SaudizationRequestsPage({ sb, user, toast, lang, branchId, emptyIcon }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [tick, setTick] = useState(0)

  const load = async () => {
    if (!sb) return
    setLoading(true)
    // resolve saudization service_type id
    const { data: svc } = await sb.from('lookup_items').select('id,category:lookup_categories!inner(category_key)').eq('code', 'saudization').eq('category.category_key', 'service_type').maybeSingle()
    if (!svc?.id) { setRows([]); setLoading(false); return }
    let qb = sb.from('service_requests')
      .select('id, request_ref_no, request_date, slip_no, branch_id, facility_id, created_at, status:status_id(code,value_ar,value_en), facility:facility_id(name_ar,unified_number,gosi_number,hrsd_number), other_applications(id,details)')
      .eq('service_type_id', svc.id).is('deleted_at', null).order('created_at', { ascending: false })
    if (branchId) qb = qb.eq('branch_id', branchId)
    const { data, error } = await qb
    if (error) { toast?.(T('تعذّر تحميل الطلبات', 'Failed to load requests')); setRows([]); setLoading(false); return }
    const mapped = (data || []).map(r => {
      const oa = Array.isArray(r.other_applications) ? r.other_applications[0] : r.other_applications
      return { ...r, oaId: oa?.id || null, d: oa?.details || {}, fac: r.facility || null }
    })
    setRows(mapped)
    setLoading(false)
  }
  useEffect(() => { load() }, [sb, branchId, tick])

  // سجّل نقطة الرجوع عند فتح تفاصيل طلب
  useEffect(() => {
    if (detail) navSetHere({ event: 'saudization-open', detail: { id: detail.id }, label: { ar: 'طلب سعودة ' + (detail.d?.saudi_name || detail.request_ref_no || ''), en: 'Saudization: ' + (detail.d?.saudi_name || detail.request_ref_no || '') } })
    else navSetHere(null)
    return () => navSetHere(null)
  }, [detail])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => [r.d?.saudi_name, r.d?.saudi_national_id, r.d?.reason, r.request_ref_no, r.slip_no, r.fac?.name_ar, r.fac?.unified_number]
      .some(v => String(v || '').toLowerCase().includes(q)))
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE)
  useEffect(() => { setPage(0) }, [search])

  const stats = useMemo(() => {
    const now = new Date()
    const startWeek = new Date(now); startWeek.setDate(now.getDate() - 7)
    const isToday = (iso) => iso && String(iso).slice(0, 10) === now.toISOString().slice(0, 10)
    return {
      total: rows.length,
      today: rows.filter(r => isToday(r.request_date || r.created_at)).length,
      week: rows.filter(r => new Date(r.created_at) >= startWeek).length,
      done: rows.filter(r => r.status?.code === 'done').length,
      inprog: rows.filter(r => (r.status?.code || 'in_progress') === 'in_progress').length,
      cancelled: rows.filter(r => r.status?.code === 'cancelled').length,
    }
  }, [rows])

  if (detail) {
    return <SaudDetail row={detail} sb={sb} T={T} isAr={isAr} onBack={() => setDetail(null)} onRefresh={() => setTick(t => t + 1)} />
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {showNew && (
        <SaudizationRequestPage sb={sb} toast={toast} user={user} lang={lang} branchId={branchId}
          onClose={() => { setShowNew(false); setTick(t => t + 1) }} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0%', minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('السعودة', 'Saudization')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('إصدار ومتابعة طلبات السعودة', 'Issue and track Saudization requests')}</div>
        </div>
        {canPerm(user, 'invoices.create') && (
          <button onClick={() => setShowNew(true)} className="btn-primary-modal" title={T('طلب السعودة جديد', 'New Saudization request')}
            style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {T('طلب سعودة جديد', 'New request')}<Plus size={16} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {loading ? <PageSkeleton columns={['22%', '16%', '16%', '13%', '13%', '20%']} rows={8} /> : (<>
        {/* Stats — Overview hero + status breakdown (نفس تصميم صفحة المعاملات) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, marginBottom: 24 }}>
          <div style={{ position: 'relative', padding: '18px 22px', borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', height: 188, boxSizing: 'border-box' }}>
            <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
              <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي الطلبات', 'Total requests')}</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 8, direction: 'ltr' }}>
              <span style={{ fontSize: 44, fontWeight: 600, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--bd)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('اليوم', 'Today')}</span>
                <span style={{ fontSize: 18, color: 'var(--tx)', fontWeight: 600, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(stats.today)}</span>
              </div>
              <div style={{ width: 1, background: 'var(--bd)', margin: '6px 4px' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('هذا الأسبوع', 'This week')}</span>
                <span style={{ fontSize: 18, color: 'var(--tx)', fontWeight: 600, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(stats.week)}</span>
              </div>
            </div>
          </div>
          <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12, height: 188, boxSizing: 'border-box' }}>
            <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600 }}>{T('الحالات', 'Statuses')}</span>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              {[{ k: 'inprog', label: T('قيد التنفيذ', 'In progress'), c: C.blue }, { k: 'done', label: T('منجز', 'Done'), c: C.ok }, { k: 'cancelled', label: T('ملغي', 'Cancelled'), c: C.red }].map(s => {
                const cnt = stats[s.k]
                return (
                  <div key={s.k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, background: 'var(--bd2)', border: '1px solid var(--bd)', opacity: cnt === 0 ? 0.55 : 1 }}>
                    <span style={{ fontSize: 26, fontWeight: 600, color: s.c, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(cnt)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx2)', fontWeight: 600, textAlign: 'center' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.c, flexShrink: 0 }} />{s.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 18 }}>
          <Search size={18} strokeWidth={2} color="var(--tx4)" style={{ position: 'absolute', top: '50%', insetInlineStart: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={T('ابحث بالاسم أو الهوية أو المنشأة أو رقم الطلب…', 'Search by name, ID, facility, or request no…')}
            style={{ width: '100%', height: 46, padding: '0 44px', borderRadius: 12, background: 'var(--search-bg)', border: '1px solid transparent', fontFamily: F, fontSize: 13.5, fontWeight: 500, color: 'var(--tx)', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={emptyIcon} title={T('لا توجد طلبات سعودة', 'No saudization requests')} desc={T('أنشئ أول طلب من زر «طلب سعودة جديد»', 'Create your first request using “New request”')} />
        ) : (<>
          <style>{`
            .saud-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:${F};background:var(--card-grad2);border-radius:10px;border:1px solid var(--bd)}
            .saud-tbl thead th{position:sticky;top:0;background:var(--hd);color:var(--hdtx);font-size:13.5px;font-weight:600;text-align:center;padding:13px 6px 11px;box-shadow:inset 0 -2px 0 rgba(176,125,0,.55);white-space:nowrap;z-index:2}
            .saud-tbl tbody td{padding:12px 8px;font-size:12.5px;color:var(--tx);text-align:center;vertical-align:middle;border-bottom:1px solid var(--bd2)}
            .saud-tbl tbody tr{cursor:pointer;transition:background .12s}
            .saud-tbl tbody tr:nth-child(even) td{background:var(--bd2)}
            .saud-tbl tbody tr:hover td{background:rgba(176,125,0,.06)}
            .saud-tbl .num{direction:ltr;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:600}
            .saud-tbl .muted{color:var(--tx5)}
            .saud-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(176,125,0,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
            .saud-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
          `}</style>
          <div style={{ borderRadius: 10 }}>
            <table className="saud-tbl">
              <colgroup>
                <col style={{ width: '22%' }} /><col style={{ width: '18%' }} /><col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} /><col style={{ width: '13%' }} /><col style={{ width: '18%' }} />
              </colgroup>
              <thead><tr>
                <th>{T('السعودي', 'Saudi')}</th><th>{T('المنشأة', 'Facility')}</th><th>{T('السبب', 'Reason')}</th>
                <th>{T('نوع السعودي', 'Type')}</th><th>{T('تاريخ التسجيل', 'Reg. date')}</th><th>{T('الحالة', 'Status')}</th>
              </tr></thead>
              <tbody>
                {paged.map(r => {
                  const stCode = r.status?.code || 'in_progress'
                  const st = STATUS_THEME[stCode] || STATUS_THEME.in_progress
                  const stLabel = isAr ? (r.status?.value_ar || st.ar) : (r.status?.value_en || st.ar)
                  return (
                    <tr key={r.id} onClick={() => setDetail(r)}>
                      <td style={{ paddingInline: 12 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.d?.saudi_name || '—'}</span>
                          {r.d?.saudi_national_id && <span className="num" style={{ fontSize: 10.5, color: 'var(--tx4)' }}>{r.d.saudi_national_id}</span>}
                        </div>
                      </td>
                      <td title={r.fac?.name_ar || ''} style={{ paddingInline: 8 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '100%' }}>{r.fac?.name_ar || '—'}</span>
                      </td>
                      <td><span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>{r.d?.reason || '—'}</span></td>
                      <td>
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: r.d?.saudi_type === 'new' ? C.gold : 'var(--tx3)', background: r.d?.saudi_type === 'new' ? 'rgba(176,125,0,.12)' : 'var(--bd2)', border: '1px solid ' + (r.d?.saudi_type === 'new' ? 'rgba(176,125,0,.3)' : 'var(--bd)') }}>{r.d?.saudi_type === 'new' ? T('جديد', 'New') : T('عادي', 'Regular')}</span>
                      </td>
                      <td><span className="num" style={{ fontSize: 12 }}>{dOnly(r.d?.registration_date) || '—'}</span></td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: st.c }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.c }} />{stLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 4px', borderTop: '1px solid var(--bd)', marginTop: 18 }}>
              <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}><span style={{ color: C.gold }}>{page * PAGE + 1}–{Math.min(filtered.length, (page + 1) * PAGE)}</span> {T('من', 'of')} {filtered.length}</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <button className="saud-pg-btn" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>‹</button>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>{page + 1} / {totalPages}</span>
                <button className="saud-pg-btn" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}
        </>)}
      </>)}
    </div>
  )
}

// ═══════════════════ Detail ═══════════════════
function SaudDetail({ row, sb, T, isAr, onBack, onRefresh }) {
  const d = row.d || {}
  const fac = row.fac || {}
  const [atts, setAtts] = useState({})

  useEffect(() => {
    if (!sb || !row.oaId) return
    ;(async () => {
      const { data } = await sb.from('attachments').select('id,file_name,file_url,notes,mime_type,created_at')
        .eq('entity_type', 'other_application').eq('entity_id', row.oaId).is('deleted_at', null)
        .order('created_at', { ascending: false })
      const m = {}
      for (const a of (data || [])) if (!m[a.notes]) m[a.notes] = a
      setAtts(m)
    })()
  }, [sb, row.oaId])

  const stCode = row.status?.code || 'in_progress'
  const st = STATUS_THEME[stCode] || STATUS_THEME.in_progress
  const stLabel = isAr ? (row.status?.value_ar || st.ar) : (row.status?.value_en || st.ar)
  const isNew = d.saudi_type === 'new'

  const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
  const CardHead = ({ Icon, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
      {Icon && <Icon size={16} strokeWidth={2} color={C.gold} />}
      <span style={{ fontSize: 15, fontWeight: 600, color: C.gold }}>{children}</span>
    </div>
  )
  const Field = ({ k, v, mono, color, full }) => {
    const empty = v == null || v === ''
    return (
      <div style={{ gridColumn: full ? '1 / -1' : undefined, background: 'var(--fk-input-bg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{k}</span>
        <span className={mono ? 'num' : undefined} style={{ fontSize: 13, fontWeight: 600, color: empty ? 'var(--tx4)' : (color || 'var(--tx)'), direction: mono ? 'ltr' : undefined, textAlign: mono ? 'start' : undefined, wordBreak: 'break-word' }}>{empty ? '—' : v}</span>
      </div>
    )
  }
  const FILE_SLOTS = [
    { key: 'qiwa_contract', ar: 'عقد قوى موثّق', en: 'Certified Qiwa contract' },
    { key: 'gosi_subscription', ar: 'اشتراك التأمينات (المنشأة)', en: 'GOSI subscription (facility)' },
    ...(isNew ? [
      { key: 'verify_qiwa_account', ar: 'حساب قوى السعودي', en: 'Saudi Qiwa account' },
      { key: 'verify_gosi_account', ar: 'اشتراك التأمينات (حساب السعودي)', en: 'GOSI (Saudi account)' },
    ] : []),
  ]

  return (
    <div style={{ fontFamily: F, paddingBottom: 60, color: 'var(--tx2)' }}>
      <div style={{ marginBottom: 16 }}>
        <BackButton onBack={onBack} label={T('رجوع', 'Back')} navKind="saudization_req" navId={row.id} isAr={isAr} />
      </div>
      <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={24} color={C.gold} strokeWidth={1.8} />
            <div style={{ fontSize: 22, fontWeight: 600, color: C.gold }}>{T('تفاصيل طلب السعودة', 'Saudization Request Details')}</div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--tx4)', marginTop: 10 }}>{T('رقم الطلب', 'Request no.')}: <span className="num" style={{ color: 'var(--tx2)', fontWeight: 600 }}>{row.request_ref_no || '—'}</span></div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: st.c, background: st.c + '1f', border: '1px solid ' + st.c + '4d', borderRadius: 999, padding: '6px 14px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: st.c }} />{stLabel}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* بيانات الطلب */}
        <div style={cardChrome}>
          <CardHead Icon={FileText}>{T('بيانات الطلب', 'Request info')}</CardHead>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <Field k={T('تاريخ التسجيل', 'Registration date')} v={dOnly(d.registration_date)} mono />
            <Field k={T('السبب', 'Reason')} v={isAr ? d.reason : (REASON_EN[d.reason] || d.reason)} />
            <Field k={T('نوع السعودي', 'Saudi type')} v={isNew ? T('سعودي جديد', 'New Saudi') : T('سعودي عادي', 'Regular Saudi')} color={isNew ? C.gold : undefined} />
          </div>
        </div>

        {/* بيانات السعودي */}
        <div style={cardChrome}>
          <CardHead Icon={IdCard}>{T('بيانات السعودي', 'Saudi data')}</CardHead>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <Field full k={T('الاسم', 'Name')} v={d.saudi_name} />
            <Field k={T('رقم الهوية', 'National ID')} v={d.saudi_national_id} mono />
            <Field k={T('تاريخ الميلاد (هجري)', 'Birth (Hijri)')} v={d.birth_date_hijri} mono />
            <Field k={T('تاريخ الميلاد (ميلادي)', 'Birth (Gregorian)')} v={d.birth_date_gregorian} mono />
            <Field k={T('العمر', 'Age')} v={(d.age_hijri != null || d.age_gregorian != null) ? `${d.age_hijri ?? '—'} ${T('هجري', 'H')} · ${d.age_gregorian ?? '—'} ${T('ميلادي', 'G')}` : null} color={C.gold} />
          </div>
        </div>

        {/* المنشأة */}
        <div style={cardChrome}>
          <CardHead Icon={Building2}>{T('المنشأة', 'Facility')}</CardHead>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <Field full k={T('اسم المنشأة', 'Facility name')} v={fac.name_ar} />
            <Field k={T('الرقم الموحد', 'Unified no.')} v={fac.unified_number} mono />
            <Field k={T('التأمينات', 'GOSI')} v={fac.gosi_number} mono />
            <Field k={T('الموارد البشرية', 'HRSD')} v={fac.hrsd_number} mono />
          </div>
        </div>

        {/* الفاتورة / السند */}
        <div style={cardChrome}>
          <CardHead Icon={Receipt}>{T('الفاتورة / سند القبض', 'Invoice / receipt')}</CardHead>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <Field k={T('الرقم', 'Number')} v={d.invoice_or_receipt_no} mono color={C.gold} />
            <Field k={T('النوع', 'Type')} v={d.invoice_ref_kind === 'receipt' ? T('سند قبض', 'Receipt') : (d.invoice_ref_kind === 'invoice' ? T('فاتورة', 'Invoice') : null)} />
          </div>
        </div>

        {/* الحساب البنكي */}
        <div style={cardChrome}>
          <CardHead Icon={Wallet}>{T('المعقب والحساب البنكي', 'Muaqqib & bank account')}</CardHead>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            <Field k={T('اسم المعقب', 'Muaqqib')} v={d.muaqqib_name} />
            <Field k={T('البنك', 'Bank')} v={d.bank} />
            <Field k={T('اسم الحساب', 'Account name')} v={d.account_name} />
            <Field full k={T('رقم الآيبان', 'IBAN')} v={d.iban} mono />
          </div>
        </div>

        {/* المرفقات */}
        <div style={cardChrome}>
          <CardHead Icon={FileCheck}>{T('المرفقات', 'Attachments')}</CardHead>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {FILE_SLOTS.map(slot => {
              const a = atts[slot.key]
              const url = a?.file_url || null
              const isImg = a && String(a.mime_type || '').startsWith('image/')
              return (
                <div key={slot.key} style={{ borderRadius: 10, border: '1px solid var(--bd)', overflow: 'hidden', background: 'var(--fk-input-bg)' }}>
                  <div style={{ aspectRatio: '3 / 2', background: url ? '#fff' : 'var(--bd2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {url ? (isImg
                      ? <img src={url} alt={slot.ar} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : <iframe src={`${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title={slot.ar} loading="lazy" style={{ width: '100%', height: '100%', border: 'none' }} />)
                      : <FileCheck size={26} strokeWidth={1.5} color="var(--tx5)" />}
                  </div>
                  <div style={{ padding: '9px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{T(slot.ar, slot.en)}</span>
                    {url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 600, color: C.gold, flexShrink: 0 }}>{T('فتح', 'Open')}</a>
                      : <span style={{ fontSize: 10.5, color: 'var(--tx5)', flexShrink: 0 }}>{T('لا يوجد', 'None')}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
