import React, { useEffect, useMemo, useRef, useState } from 'react'
import BackButton from '../components/BackButton'
import { Modal as FKModal, ModalSection, Select, TextField, IdField, PhoneField, CurrencyField, DateField, Segmented, Switch, SuccessView, ScrollBox, InfoRow, InfoGrid, GRID, FULL, C as FKC, useFKLang } from '../components/ui/FormKit.jsx'
import { FileText, User, Users, CreditCard, Pencil, Info } from 'lucide-react'
import { SkeletonCards, SkeletonTable } from '../components/ui/Skeleton.jsx'
import { useIsMobile, MStatStrip, MCardList, MChips, MSearch, MFab } from '../components/mobile/MobileKit.jsx'
import '../styles/m-synchub.css'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#B07D00', red: '#c0392b', blue: '#3483b4', ok: '#27a046', purple: '#bb8fce', orange: '#f39c12', cyan: '#16a085', gray: '#95a5a6', warn: '#eab308' }
const nm = v => Number(v || 0).toLocaleString('en-US')
const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

// The internal commercial-registration services (no client — office's own filings).
const SBC_CODES = ['sbc_name_reserve', 'sbc_cr_open', 'sbc_cr_renew', 'sbc_cr_amend', 'sbc_documents']
const SBC_META = {
  sbc_name_reserve: { ar: 'حجز إسم تجاري',  en: 'Trade Name Reservation', c: C.blue,   field: 'trade_name' },
  sbc_cr_open:      { ar: 'فتح سجل تجاري',  en: 'Open CR',                c: C.ok,     field: 'trade_name' },
  sbc_cr_renew:     { ar: 'تجديد سجل تجاري', en: 'Renew CR',               c: C.gold,   field: 'cr_number' },
  sbc_cr_amend:     { ar: 'تعديل سجل تجاري', en: 'Amend CR',               c: C.cyan,   field: 'cr_number' },
  sbc_documents:    { ar: 'مستندات',        en: 'Documents',              c: C.purple, field: 'trade_name' },
}
// Company legal forms (extend as needed — only LLC enabled for now).
const COMPANY_FORMS = [
  { v: 'llc', l: 'ذات مسؤولية محدودة', en: 'Limited liability (LLC)' },
]
const STATUS_THEME = {
  new:         { c: C.blue,   ar: 'جديد', en: 'New' },
  pending:     { c: C.warn,   ar: 'قيد الانتظار', en: 'Pending' },
  in_progress: { c: C.gold,   ar: 'قيد التنفيذ', en: 'In progress' },
  done:        { c: C.ok,     ar: 'منجز', en: 'Done' },
  cancelled:   { c: C.red,    ar: 'ملغي', en: 'Cancelled' },
}
const sbcMeta = (code) => SBC_META[code] || { ar: code, en: code, c: C.gray, field: 'trade_name' }
// اسم معروض حسب لغة الواجهة: {ar,en} للخدمات والحالات، و{l,en} لقوائم الخيارات.
const nameOf = (o, isAr) => (o ? (isAr ? o.ar : (o.en || o.ar)) : '')
const locOpts = (arr, isAr) => (isAr ? arr : arr.map(o => ({ ...o, l: o.en || o.l })))
// حالة المعاملة: الثيم المعرّف هنا أولاً، وإلا نص الحالة كما هو في القوائم.
const statusOf = (st, isAr) => {
  const th = STATUS_THEME[st?.code]
  if (th) return { c: th.c, label: nameOf(th, isAr) }
  return { c: C.gray, label: (isAr ? st?.value_ar : (st?.value_en || st?.value_ar)) || '—' }
}

const fmtGreg = (iso) => { if (!iso) return '—'; try { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` } catch { return '—' } }
const fmtDateTime = (iso, isAr = true) => {
  if (!iso) return '—'
  try { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); const h = d.getHours(); const ap = h < 12 ? (isAr ? 'ص' : 'AM') : (isAr ? 'م' : 'PM'); const h12 = ((h + 11) % 12) + 1; return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(h12)}:${p(d.getMinutes())} ${ap}` } catch { return '—' }
}

// Shared card chrome (identical to the Users page).
const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle = { fontSize: 16, fontWeight: 600, color: 'var(--tx)', letterSpacing: '.2px' }

// ── KPI hero card (matches Users page HeroStat) ──
function HeroStat({ tone, label, value, footer }) {
  return (
    <div style={{ position: 'relative', padding: '18px 22px', borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 150 }}>
      <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${tone}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone, boxShadow: `0 0 10px ${tone}aa` }} />
        <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
        <span style={{ fontSize: 42, fontWeight: 600, color: tone, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
        <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{footer}</span>
      </div>
    </div>
  )
}

// ── Info card with label/value rows (matches Users page InfoSectionCard) ──
function InfoSectionCard({ title, items, headerAction }) {
  return (
    <div style={cardChrome}>
      <div style={cardHeader}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
        <span style={cardTitle}>{title}</span>
        {headerAction}
      </div>
      <div style={{ padding: '6px 22px 12px' }}>
        {items.map((f, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < items.length - 1 ? '1px dashed var(--bd)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{f.label}</span>
            {f.node ? f.node : (
              <span style={{ fontSize: 13, color: f.value ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600, direction: f.mono ? 'ltr' : undefined, fontFamily: f.mono ? 'monospace' : 'inherit', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.value || ''}>{f.value || '—'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditAction({ onEdit, label }) {
  const { T } = useFKLang()
  return (
    <button onClick={onEdit}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,125,0,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(176,125,0,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s ease, border-color .15s ease' }}>
      {label || T('تعديل', 'Edit')}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
    </button>
  )
}

export default function SbcCenterPage({ sb, user, toast, lang = 'ar', branchId }) {
  const userBranchId = user?.primary_branch_id || branchId || null
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)

  const [types, setTypes] = useState([])
  const [statuses, setStatuses] = useState([])  // [{id, code, value_ar}]
  const [newStatusId, setNewStatusId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const isMobile = useIsMobile()
  const [mType, setMType] = useState('')

  const typeByCode = useMemo(() => Object.fromEntries(types.map(t => [t.code, t])), [types])
  const typeById = useMemo(() => Object.fromEntries(types.map(t => [t.id, t])), [types])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: ti }, { data: si }] = await Promise.all([
        sb.from('lookup_items').select('id,code,value_ar,value_en').in('code', SBC_CODES),
        sb.from('lookup_items').select('id,code,value_ar,category:lookup_categories!inner(category_key)').eq('category.category_key', 'request_status').eq('is_active', true),
      ])
      if (!alive) return
      setTypes(ti || [])
      setStatuses(si || [])
      setNewStatusId((si || []).find(s => s.code === 'in_progress')?.id || null) // initial status applied to newly-created requests
    })()
    return () => { alive = false }
  }, [sb])

  const reload = React.useCallback(async () => {
    if (!types.length) return
    setLoading(true)
    const ids = types.map(t => t.id)
    let qb = sb.from('service_requests')
      .select('id,request_ref_no,request_date,created_at,note,trade_name,cr_number,service_type_id,facility_id,document_type,new_confirmation_date,amendment,status:status_id(code,value_ar,value_en)')
      .is('deleted_at', null).in('service_type_id', ids)
      .order('request_date', { ascending: false, nullsFirst: false }).limit(5000)
    if (userBranchId) qb = qb.eq('branch_id', userBranchId)
    const { data, error } = await qb
    if (error) { toast?.(T('تعذر تحميل المعاملات', 'Could not load transactions'), 'error'); setRows([]); setLoading(false); return }
    setRows(data || []); setLoading(false)
  }, [sb, types, userBranchId])

  useEffect(() => { reload() }, [reload])

  // Search filter
  const filtered = useMemo(() => {
    const s = q.trim()
    if (!s) return rows
    return rows.filter(r => [r.request_ref_no, r.trade_name, r.cr_number, r.note].some(v => (v || '').includes(s)))
  }, [rows, q])

  // Donut distribution by type
  const dist = useMemo(() => SBC_CODES.map(code => ({ code, meta: sbcMeta(code), cnt: rows.filter(r => typeById[r.service_type_id]?.code === code).length })).filter(d => d.cnt > 0), [rows, typeById])

  const doneCount = rows.filter(r => r.status?.code === 'done').length

  if (selectedId) {
    const row = rows.find(r => r.id === selectedId)
    return <SbcDetailPage sb={sb} user={user} toast={toast} lang={lang} row={row} type={row ? typeById[row.service_type_id] : null}
      statuses={statuses} onBack={() => setSelectedId(null)} onChanged={reload} />
  }

  const initialLoading = loading && rows.length === 0
  /* ═══ الجوال: رأس مختصر + أرقام + شرائح الخدمة + بطاقات + زر عائم ═══ */
  if (isMobile) {
    const byType = (r) => typeById[r.service_type_id]?.code
    const list = mType ? filtered.filter(r => byType(r) === mType) : filtered
    const inProg = rows.filter(r => r.status?.code && r.status.code !== 'done' && r.status.code !== 'cancelled').length
    return (
      <div className="mvg" style={{ fontFamily: F }}>
        <div className="msync-head">
          <h1>{T('المركز السعودي للأعمال', 'Saudi Business Center')}</h1>
          <p>{nm(rows.length)} {T('معاملة', 'transactions')}{doneCount > 0 ? ` · ${nm(doneCount)} ${T('منجزة', 'done')}` : ''}</p>
        </div>
        <MStatStrip items={[
          { label: T('المعاملات', 'Transactions'), value: nm(rows.length), tone: 'gold' },
          { label: T('قيد العمل', 'In progress'), value: nm(inProg), tone: 'orange' },
          { label: T('منجزة', 'Done'), value: nm(doneCount), tone: 'green' },
        ]} />
        <MSearch value={q} onChange={setQ} placeholder={T('المرجع، الاسم التجاري، رقم السجل…', 'Reference, trade name, CR number…')} />
        {dist.length > 1 && (
          <MChips value={mType} onChange={setMType} options={[{ value: '', label: T('الكل', 'All'), count: filtered.length }, ...dist.map(d => ({ value: d.code, label: nameOf(d.meta, isAr), count: filtered.filter(r => byType(r) === d.code).length }))]} />
        )}
        <MCardList rows={list.map(r => {
          const m = sbcMeta(byType(r))
          const st = statusOf(r.status, isAr)
          return {
            key: r.id,
            leading: <span className="mvg-lead" style={{ '--c': m.c }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /><path d="M8 13h8M8 17h6" /></svg></span>,
            title: r.trade_name || r.cr_number || nameOf(m, isAr),
            subtitle: nameOf(m, isAr),
            badge: { text: st.label, tone: st.c },
            fields: [
              { label: T('المرجع', 'Reference'), value: '#' + (r.request_ref_no ?? '—'), ltr: true, tone: 'gold' },
              { label: T('التاريخ', 'Date'), value: fmtGreg(r.request_date), ltr: true },
            ],
            onClick: () => setSelectedId(r.id),
          }
        })} loading={initialLoading}
          empty={<div className="msync-empty small"><b>{q ? T('لا نتائج مطابقة', 'No matching results') : T('لا توجد معاملات بعد', 'No transactions yet')}</b><span>{q ? T('جرّب كلمة بحث أخرى', 'Try a different search term') : T('اضغط «معاملة جديدة» لإضافة أول معاملة', 'Tap "New transaction" to add the first one')}</span></div>} />
        <MFab label={T('معاملة جديدة', 'New transaction')} onClick={() => setShowAdd(true)} />
        {showAdd && <AddModal lang={lang} sb={sb} user={user} toast={toast} typeByCode={typeByCode} newStatusId={newStatusId} userBranchId={userBranchId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); reload() }} />}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <style>{`
        .sbc-hero-grid{display:grid;grid-template-columns:1.8fr 1fr;gap:14px;margin-bottom:24px}
        @media (max-width:720px){.sbc-hero-grid{grid-template-columns:1fr}}
        .sbc-row{transition:all .15s}
        .sbc-row:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.34) !important;border-color:rgba(176,125,0,.22) !important}
        .sbc-row-grid{display:grid;grid-template-columns:auto 1px 1fr auto;gap:18px;align-items:center}
        @media (max-width:720px){.sbc-row-grid{grid-template-columns:1fr;gap:12px}.sbc-row-vdiv{display:none}}
        .sbc-row-vdiv{width:1px;align-self:stretch;background:linear-gradient(180deg,transparent 0%,rgba(255,255,255,.08) 50%,transparent 100%);min-height:46px}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('المركز السعودي للأعمال', 'Saudi Business Center')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('إدارة السجل التجاري والكيان النظامي للمنشآت عبر المركز السعودي للأعمال. المعاملات تُضاف مباشرة من هذه الصفحة.', 'Commercial registration and legal-entity filings for facilities through the Saudi Business Center. Transactions are added directly from this page.')}</div>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary-modal"
          style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
          {T('إضافة معاملة', 'Add transaction')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      {initialLoading ? (<><SkeletonCards count={2} cols="1.8fr 1fr" minHeight={150} /><SkeletonTable columns={['18%','24%','28%','15%','15%']} rows={8} /></>) : (<>

      {/* Hero — total + distribution donut */}
      <div className="sbc-hero-grid">
        <HeroStat tone={C.gold} label={T('المعاملات', 'Transactions')} value={nm(rows.length)} footer={doneCount > 0 ? `${nm(doneCount)} ${T('منجزة', 'done')}` : (rows.length ? T('قيد العمل', 'In progress') : T('لا توجد معاملات', 'No transactions'))} />
        {(() => {
          const total = dist.reduce((s, r) => s + r.cnt, 0) || 1
          const R = 32, CIRC = 2 * Math.PI * R
          let offset = 0
          return (
            <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('التوزّع حسب الخدمة', 'Distribution by service')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.gold, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums', marginInlineEnd: 6 }}>{nm(rows.length)}</span>{T('معاملة', 'transactions')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <svg width="86" height="86" viewBox="-43 -43 86 86" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
                  <circle r={R} fill="none" stroke="var(--bd2)" strokeWidth="11" />
                  {dist.map((r) => { const dash = (r.cnt / total) * CIRC; const seg = (<circle key={r.code} r={R} fill="none" stroke={r.meta.c} strokeWidth="11" strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-offset} style={{ transition: 'stroke-dasharray .3s' }}><title>{`${nameOf(r.meta, isAr)}: ${r.cnt}`}</title></circle>); offset += dash; return seg })}
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" transform="rotate(90)" style={{ fill: 'var(--tx)', fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nm(rows.length)}</text>
                </svg>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 6, minWidth: 0 }}>
                  {dist.length === 0 ? <span style={{ fontSize: 11, color: 'var(--tx5)' }}>—</span> : dist.map((r) => (
                    <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.meta.c, flexShrink: 0 }} />
                      <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(r.meta, isAr)}</span>
                      <span style={{ color: r.meta.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', flexShrink: 0, fontWeight: 600 }}>{nm(r.cnt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx4)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={T('ابحث بالمرجع أو الاسم التجاري أو رقم السجل…', 'Search by reference, trade name or CR number…')}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      </div>

      {/* List — table view (matches Payments page) */}
      {filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed var(--bd)', borderRadius: 14 }}>
          {q ? T('لا نتائج مطابقة', 'No matching results') : T('لا توجد معاملات بعد — اضغط «إضافة معاملة».', 'No transactions yet — click "Add transaction".')}
        </div>
      ) : (
        <SbcTable rows={filtered} typeById={typeById} onRowClick={setSelectedId} lang={lang} />
      )}

      </>)}

      {showAdd && <AddModal lang={lang} sb={sb} user={user} toast={toast} typeByCode={typeByCode} newStatusId={newStatusId} userBranchId={userBranchId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); reload() }} />}
    </div>
  )
}

// ── Transactions table (matches Payments page FeesTable) ──
function SbcTable({ rows, typeById, onRowClick, lang }) {
  const { isAr, T } = useFKLang(lang)
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden' }}>
      <style>{`
.sbc-tbl{width:100%;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
.sbc-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12px;font-weight:600;text-align:center;padding:14px 12px 11px;box-shadow:inset 0 -2px 0 rgba(176,125,0,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
.sbc-tbl tbody td{padding:13px 12px;font-size:12px;color:#fff;text-align:center;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.03)}
.sbc-tbl tbody tr{cursor:pointer;transition:background .12s}
.sbc-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
.sbc-tbl tbody tr:hover td{background:rgba(176,125,0,.06)}
.sbc-tbl tbody tr:last-child td{border-bottom:none}
      `}</style>
      <table className="sbc-tbl">
        <thead>
          <tr>
            <th>{T('التاريخ', 'Date')}</th>
            <th>{T('نوع الخدمة', 'Service type')}</th>
            <th>{T('الاسم التجاري / السجل', 'Trade name / CR')}</th>
            <th>{T('المرجع', 'Reference')}</th>
            <th>{T('الحالة', 'Status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const meta = sbcMeta(typeById[r.service_type_id]?.code)
            const sTheme = statusOf(r.status, isAr)
            const title = r.trade_name || r.cr_number || '—'
            return (
              <tr key={r.id} onClick={() => onRowClick(r.id)} title={title}>
                <td>
                  <span style={{ direction: 'ltr', fontFamily: 'monospace', color: 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtGreg(r.request_date)}</span>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 11px', borderRadius: 7, background: meta.c + '18', border: '1px solid ' + meta.c + '38', color: meta.c, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.c, flexShrink: 0 }} />
                    {nameOf(meta, isAr)}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.92)' }}>{title}</span>
                </td>
                <td>
                  <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 600, color: C.gold }}>#{r.request_ref_no}</span>
                </td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: sTheme.c, background: tint(sTheme.c, 0.12), border: `1px solid ${tint(sTheme.c, 0.3)}`, borderRadius: 8, padding: '5px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sTheme.c }} />
                    {sTheme.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Transaction detail page — mirrors the Users page UserDetailPage layout.
// ═══════════════════════════════════════════════════════════════════
function SbcDetailPage({ sb, user, toast, lang, row, type, statuses, onBack, onChanged }) {
  const meta = sbcMeta(type?.code)
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const dir = isAr ? 'rtl' : 'ltr'
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ trade_name: row?.trade_name || '', cr_number: row?.cr_number || '', note: row?.note || '' })
  const [statusId, setStatusId] = useState(null)
  const [atts, setAtts] = useState([])
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const sTheme = statusOf(row?.status, isAr)
  const isTradeName = meta.field === 'trade_name'
  const isCrOpen = type?.code === 'sbc_cr_open'
  const isDocuments = type?.code === 'sbc_documents'

  // Post-payment completion workflow state
  const [fee, setFee] = useState(null)
  const [facility, setFacility] = useState(null)
  const [docFacility, setDocFacility] = useState(null)
  const [docFileRec, setDocFileRec] = useState(null)
  const [comp, setComp] = useState({ uni: '', gosi: '', hrsd: '' })
  const [crFile, setCrFile] = useState(null)
  const [completing, setCompleting] = useState(false)
  const crFileRef = useRef(null)

  useEffect(() => {
    setForm({ trade_name: row?.trade_name || '', cr_number: row?.cr_number || '', note: row?.note || '' })
    setStatusId(statuses.find(s => s.code === row?.status?.code)?.id || null)
  }, [row?.id])

  const loadWorkflow = React.useCallback(async () => {
    if (!row?.id || !(isCrOpen || isDocuments)) return
    const feeP = sb.from('transaction_fees').select('id,amount,paid_amount,status,sadad_no,payment_date').eq('service_request_id', row.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (isCrOpen) {
      const [{ data: f }, { data: fac }] = await Promise.all([feeP,
        sb.from('facilities').select('id,name_ar,unified_number,gosi_number,hrsd_number').eq('opening_request_id', row.id).is('deleted_at', null).maybeSingle()])
      setFee(f || null); setFacility(fac || null)
    } else {
      const [{ data: f }, { data: fac }, { data: doc }] = await Promise.all([feeP,
        row.facility_id ? sb.from('facilities').select('id,name_ar,unified_number').eq('id', row.facility_id).maybeSingle() : Promise.resolve({ data: null }),
        row.facility_id ? sb.from('attachments').select('id,file_name,file_url,created_at').eq('entity_type', 'facility').eq('entity_id', row.facility_id).ilike('notes', 'cr_document%').order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null })])
      setFee(f || null); setDocFacility(fac || null); setDocFileRec(doc || null)
    }
  }, [sb, row?.id, row?.facility_id, isCrOpen, isDocuments])
  useEffect(() => { loadWorkflow() }, [loadWorkflow])

  const completeCrOpen = async () => {
    if (!comp.uni.trim()) { toast?.(T('الرقم الموحد مطلوب', 'Unified number is required'), 'error'); return }
    setCompleting(true)
    try {
      const { data: fac, error: fe } = await sb.from('facilities').insert({
        name_ar: row.trade_name || null, unified_number: comp.uni.trim(),
        gosi_number: comp.gosi.trim() || null, hrsd_number: comp.hrsd.trim() || null,
        cr_number: row.cr_number || null, branch_id: user?.primary_branch_id || null,
        opening_request_id: row.id, created_by: user?.id || null,
      }).select('id,name_ar,unified_number,gosi_number,hrsd_number').single()
      if (fe) throw fe
      if (crFile) {
        const safe = (crFile.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `sbc/${row.id}/cr_${Date.now()}_${safe}`
        const { error: ue } = await sb.storage.from('attachments').upload(path, crFile, { cacheControl: '3600', upsert: false })
        if (!ue) { const { data: pub } = sb.storage.from('attachments').getPublicUrl(path); const { data: ins } = await sb.from('attachments').insert({ entity_type: 'service_request', entity_id: row.id, file_name: crFile.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: crFile.type || null, size_bytes: crFile.size || null, notes: 'cr_file' }).select('id,file_name,file_url,size_bytes,created_at').single(); if (ins) setAtts(p => [ins, ...p]) }
      }
      const doneId = statuses.find(s => s.code === 'done')?.id
      const { error: se } = doneId ? await sb.from('service_requests').update({ status_id: doneId }).eq('id', row.id) : {}
      setFacility(fac)
      if (se) throw se
      toast?.(T('تم إنجاز المعاملة وإضافة المنشأة', 'Transaction completed and facility added'))
      await onChanged?.()
    } catch (e) { toast?.(e.message || T('تعذر الإنجاز', 'Could not complete'), 'error') } finally { setCompleting(false) }
  }

  const completeDocuments = async () => {
    if (!crFile) { toast?.(T('أرفق ملف المستخرج', 'Attach the extract file'), 'error'); return }
    if (!row.facility_id) { toast?.(T('المنشأة غير مرتبطة بالمعاملة', 'The facility is not linked to this transaction'), 'error'); return }
    setCompleting(true)
    try {
      const safe = (crFile.name || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `sbc/${row.id}/doc_${Date.now()}_${safe}`
      const { error: ue } = await sb.storage.from('attachments').upload(path, crFile, { cacheControl: '3600', upsert: false })
      if (ue) throw ue
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const fileUrl = pub?.publicUrl || path
      // Attach to the facility's CR files + to the transaction record
      const { data: ins, error: ae } = await sb.from('attachments').insert({ entity_type: 'facility', entity_id: row.facility_id, file_name: crFile.name, file_url: fileUrl, storage_path: path, mime_type: crFile.type || null, size_bytes: crFile.size || null, notes: 'cr_document:' + (row.document_type || 'cr_extract') }).select('id,file_name,file_url,created_at').single()
      if (ae) throw ae
      await sb.from('attachments').insert({ entity_type: 'service_request', entity_id: row.id, file_name: crFile.name, file_url: fileUrl, storage_path: path, mime_type: crFile.type || null, size_bytes: crFile.size || null, notes: 'cr_document' })
      const doneId = statuses.find(s => s.code === 'done')?.id
      const { error: se } = doneId ? await sb.from('service_requests').update({ status_id: doneId }).eq('id', row.id) : {}
      if (se) throw se
      if (ins) setDocFileRec(ins)
      toast?.(T('تم إنجاز المعاملة وإرفاق المستخرج', 'Transaction completed and extract attached'))
      await onChanged?.()
    } catch (e) { toast?.(e.message || T('تعذر الإنجاز', 'Could not complete'), 'error') } finally { setCompleting(false) }
  }

  useEffect(() => {
    if (!row?.id) return
    let alive = true
    sb.from('attachments').select('id,file_name,file_url,size_bytes,created_at').eq('entity_type', 'service_request').eq('entity_id', row.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (alive) setAtts(data || []) })
    return () => { alive = false }
  }, [sb, row?.id])

  if (!row) return <div style={{ fontFamily: F, padding: 40, color: 'var(--tx4)' }}><BackButton onBack={onBack} /></div>

  const saveFields = async () => {
    setBusy(true)
    try {
      const upd = { note: form.note.trim() || null }
      if (isTradeName) upd.trade_name = form.trade_name.trim() || null
      else upd.cr_number = form.cr_number.trim() || null
      const { error } = await sb.from('service_requests').update(upd).eq('id', row.id)
      if (error) throw error
      toast?.(T('تم الحفظ', 'Saved')); setEditing(false); await onChanged?.()
    } catch (e) { toast?.(T('تعذر الحفظ', 'Could not save'), 'error') } finally { setBusy(false) }
  }

  const changeStatus = async (id) => {
    const prevId = statusId
    setStatusId(id); setBusy(true)
    try {
      const { error } = await sb.from('service_requests').update({ status_id: id }).eq('id', row.id)
      if (error) throw error
      toast?.(T('تم تحديث الحالة', 'Status updated')); await onChanged?.()
    } catch (e) { setStatusId(prevId); toast?.(T('تعذر التحديث', 'Could not update'), 'error') } finally { setBusy(false) }
  }

  const uploadFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `sbc/${row.id}/${Date.now()}_${safe}`
      const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const { data: ins } = await sb.from('attachments').insert({ entity_type: 'service_request', entity_id: row.id, file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: file.type || null, size_bytes: file.size || null, notes: 'sbc_doc' }).select('id,file_name,file_url,size_bytes,created_at').single()
      if (ins) setAtts(p => [ins, ...p])
      toast?.(T('تم رفع الملف', 'File uploaded'))
    } catch (e) { toast?.(T('تعذر رفع الملف', 'Could not upload the file'), 'error') } finally { setUploading(false) }
  }

  const inp = { width: '100%', fontFamily: F, fontSize: 13, color: 'var(--tx)', background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 9, padding: '9px 11px', outline: 'none', boxSizing: 'border-box', textAlign: 'end' }

  // Info card items
  const detailItems = [
    { label: T('نوع الخدمة', 'Service type'), value: nameOf(meta, isAr) },
    { label: T('المرجع', 'Reference'), value: '#' + row.request_ref_no, mono: true },
    isTradeName
      ? { label: T('الاسم التجاري', 'Trade name'), node: editing ? <input style={inp} value={form.trade_name} onChange={e => setForm(f => ({ ...f, trade_name: e.target.value }))} placeholder="—" /> : undefined, value: row.trade_name }
      : { label: T('رقم السجل التجاري', 'CR number'), node: editing ? <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr' }} value={form.cr_number} onChange={e => setForm(f => ({ ...f, cr_number: e.target.value }))} placeholder="—" /> : undefined, value: row.cr_number, mono: true },
    { label: T('تاريخ الإضافة', 'Added on'), value: fmtDateTime(row.created_at || row.request_date, isAr), mono: true },
  ]

  return (
    <div className="m-crd" style={{ fontFamily: F, paddingTop: 0, paddingBottom: 48, color: 'var(--tx2)', direction: dir }}>
      <div style={{ marginBottom: 16 }}><BackButton onBack={onBack} /></div>

      {/* Header */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={meta.c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /><path d="M8 13h8M8 17h6" /></svg>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{row.trade_name || row.cr_number || nameOf(meta, isAr)}</div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: meta.c + '20', color: meta.c }}>{nameOf(meta, isAr)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, background: tint(sTheme.c, 0.14), color: sTheme.c }}>{sTheme.label}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>{T('عرض تفاصيل المعاملة وتعديلها، وتحديث حالتها وإرفاق المستندات.', 'Transaction details, status and attached documents.')}</div>
      </div>

      <div className="sbcd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        <style>{`@media (max-width:900px){.sbcd-grid{grid-template-columns:1fr !important}.sbcd-side,.sbcd-main{grid-column:auto !important;position:static !important}}`}</style>

        {/* Main column — details + notes + attachments */}
        <div className="sbcd-main" style={{ gridColumn: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InfoSectionCard title={T('تفاصيل المعاملة', 'Transaction details')} items={detailItems}
            headerAction={editing
              ? <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditing(false); setForm({ trade_name: row.trade_name || '', cr_number: row.cr_number || '', note: row.note || '' }) }} style={{ height: 32, padding: '0 12px', borderRadius: 9, background: 'transparent', border: '1px solid var(--bd)', color: 'var(--tx3)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('إلغاء', 'Cancel')}</button>
                  <button onClick={saveFields} disabled={busy} style={{ height: 32, padding: '0 16px', borderRadius: 9, background: `linear-gradient(180deg,${C.gold},#b8881a)`, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{busy ? '…' : T('حفظ', 'Save')}</button>
                </div>
              : <EditAction onEdit={() => setEditing(true)} />} />

          {/* CR-open completion workflow (after payment) */}
          {isCrOpen && (facility ? (
            <div style={cardChrome}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} /><span style={cardTitle}>{T('المنشأة', 'Facility')}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: C.ok, background: 'rgba(39,160,70,.14)', borderRadius: 6, padding: '4px 10px' }}>{T('تم الإنجاز', 'Completed')}</span>
              </div>
              <div style={{ padding: '6px 22px 14px' }}>
                {[
                  { label: T('اسم المنشأة', 'Facility name'), value: facility.name_ar },
                  { label: T('الرقم الموحد', 'Unified number'), value: facility.unified_number, mono: true },
                  { label: T('التأمينات الاجتماعية', 'GOSI'), value: facility.gosi_number, mono: true },
                  { label: T('الموارد البشرية', 'HRSD'), value: facility.hrsd_number, mono: true },
                ].map((f, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px dashed var(--bd)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{f.label}</span>
                    <span style={{ fontSize: 13, color: f.value ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600, direction: f.mono ? 'ltr' : undefined, fontFamily: f.mono ? 'monospace' : 'inherit' }}>{f.value || '—'}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--tx4)', display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1.6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>
                  {T('أُضيفت إلى المنشآت. تُجلب بقية بيانات المنشأة من المزامنة عبر الرقم الموحد.', 'Added to facilities. The rest of the facility data comes from sync, matched by the unified number.')}
                </div>
              </div>
            </div>
          ) : fee?.status === 'paid' ? (
            <div style={{ ...cardChrome, border: `1px solid ${C.gold}44` }}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('إكمال فتح السجل', 'Complete CR opening')}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: C.gold, background: 'rgba(176,125,0,.14)', borderRadius: 6, padding: '4px 10px' }}>{T('تم السداد — مطلوب الإكمال', 'Paid — completion required')}</span>
              </div>
              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>{T('الرقم الموحد', 'Unified number')} <span style={{ color: C.red }}>*</span></div>
                  <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }} dir="ltr" value={comp.uni} onChange={e => setComp(c => ({ ...c, uni: e.target.value }))} placeholder="7000000000" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>{T('التأمينات الاجتماعية', 'GOSI')}</div>
                    <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }} dir="ltr" value={comp.gosi} onChange={e => setComp(c => ({ ...c, gosi: e.target.value }))} placeholder="—" /></div>
                  <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>{T('الموارد البشرية', 'HRSD')}</div>
                    <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }} dir="ltr" value={comp.hrsd} onChange={e => setComp(c => ({ ...c, hrsd: e.target.value }))} placeholder="—" /></div>
                </div>
                <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>{T('ملف السجل التجاري', 'CR file')}</div>
                  <input ref={crFileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => setCrFile(e.target.files?.[0] || null)} />
                  <button onClick={() => crFileRef.current?.click()} style={{ ...inp, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: crFile ? C.gold : 'var(--tx5)', fontWeight: 600 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crFile ? crFile.name : T('إرفاق ملف السجل', 'Attach CR file')}</span>
                  </button></div>
                <button onClick={completeCrOpen} disabled={completing} style={{ height: 42, borderRadius: 10, background: `linear-gradient(180deg,${C.gold},#b8881a)`, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: completing ? 'default' : 'pointer', marginTop: 4 }}>{completing ? T('جارٍ الإنجاز…', 'Completing…') : T('إنجاز المعاملة وإضافة المنشأة', 'Complete transaction and add facility')}</button>
              </div>
            </div>
          ) : (
            <div style={{ ...cardChrome, border: '1px dashed var(--bd)' }}>
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--tx4)', lineHeight: 1.6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                {T('بانتظار سداد رسم فتح السجل في صفحة سدادات الخدمات قبل إكمال بيانات المنشأة.', 'Waiting for the CR-opening fee to be paid on the Service Payments page before the facility data can be completed.')}
              </div>
            </div>
          ))}

          {/* Documents completion workflow (after payment) — attach CR extract */}
          {isDocuments && (row.status?.code === 'done' ? (
            <div style={cardChrome}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} /><span style={cardTitle}>{T('الوثيقة', 'Document')}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: C.ok, background: 'rgba(39,160,70,.14)', borderRadius: 6, padding: '4px 10px' }}>{T('تم الإنجاز', 'Completed')}</span>
              </div>
              <div style={{ padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {docFacility && <div style={{ fontSize: 12.5, color: 'var(--tx3)', lineHeight: 1.6 }}>{T('أُضيفت إلى «ملفات السجل» في منشأة', 'Added to "CR files" of facility')} «{docFacility.name_ar}».</div>}
                {docFileRec ? (
                  <a href={docFileRec.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'var(--bd2)', border: '1px solid var(--bd)', textDecoration: 'none', color: 'var(--tx2)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /></svg>
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'start' }}>{docFileRec.file_name}</span>
                  </a>
                ) : <div style={{ fontSize: 12, color: 'var(--tx5)' }}>—</div>}
              </div>
            </div>
          ) : fee?.status === 'paid' ? (
            <div style={{ ...cardChrome, border: `1px solid ${C.gold}44` }}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('إرفاق مستخرج السجل', 'Attach CR extract')}</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: C.gold, background: 'rgba(176,125,0,.14)', borderRadius: 6, padding: '4px 10px' }}>{T('تم السداد — مطلوب الإرفاق', 'Paid — attachment required')}</span>
              </div>
              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>{T('ملف مستخرج السجل التجاري', 'CR extract file')} <span style={{ color: C.red }}>*</span></div>
                  <input ref={crFileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => setCrFile(e.target.files?.[0] || null)} />
                  <button onClick={() => crFileRef.current?.click()} style={{ ...inp, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: crFile ? C.gold : 'var(--tx5)', fontWeight: 600 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crFile ? crFile.name : T('إرفاق ملف المستخرج', 'Attach extract file')}</span>
                  </button></div>
                <button onClick={completeDocuments} disabled={completing} style={{ height: 42, borderRadius: 10, background: `linear-gradient(180deg,${C.gold},#b8881a)`, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 13.5, fontWeight: 600, cursor: completing ? 'default' : 'pointer', marginTop: 4 }}>{completing ? T('جارٍ الإنجاز…', 'Completing…') : T('إنجاز المعاملة وإرفاق المستخرج', 'Complete transaction and attach extract')}</button>
              </div>
            </div>
          ) : (
            <div style={{ ...cardChrome, border: '1px dashed var(--bd)' }}>
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--tx4)', lineHeight: 1.6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                {T('بانتظار سداد رسم الوثيقة في صفحة سدادات الخدمات قبل إرفاق المستخرج.', 'Waiting for the document fee to be paid on the Service Payments page before the extract can be attached.')}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('ملاحظات', 'Notes')}</span></div>
            <div style={{ padding: '14px 22px' }}>
              {editing
                ? <textarea style={{ ...inp, minHeight: 80, resize: 'vertical', textAlign: 'start' }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder={T('اكتب ملاحظة…', 'Write a note…')} />
                : <div style={{ fontSize: 13, color: row.note ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 500, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{row.note || T('لا توجد ملاحظات', 'No notes')}</div>}
            </div>
          </div>

          {/* Attachments */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('المرفقات', 'Attachments')}</span>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => { uploadFile(e.target.files?.[0]); e.target.value = '' }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(176,125,0,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>{uploading ? T('جارٍ الرفع…', 'Uploading…') : T('إرفاق ملف', 'Attach file')}</button>
            </div>
            <div style={{ padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {atts.length === 0 ? <div style={{ fontSize: 12, color: 'var(--tx5)', padding: '6px 0' }}>{T('لا توجد مرفقات', 'No attachments')}</div> :
                atts.map(a => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'var(--bd2)', border: '1px solid var(--bd)', textDecoration: 'none', color: 'var(--tx2)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /></svg>
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'start' }}>{a.file_name}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--tx5)', direction: 'ltr' }}>{fmtGreg(a.created_at)}</span>
                  </a>
                ))}
            </div>
          </div>
        </div>

        {/* Side column — status (sticky) */}
        <div className="sbcd-side" style={{ gridColumn: 2, position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: sTheme.c }} /><span style={cardTitle}>{T('الحالة', 'Status')}</span></div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {statuses.filter(s => STATUS_THEME[s.code]).map(s => {
                const th = STATUS_THEME[s.code]; const on = statusId === s.id
                return (
                  <button key={s.id} onClick={() => changeStatus(s.id)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'start', background: on ? tint(th.c, 0.12) : 'var(--bd2)', border: `1px solid ${on ? tint(th.c, 0.4) : 'var(--bd)'}`, fontFamily: F }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: th.c, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: on ? th.c : 'var(--tx3)' }}>{nameOf(th, isAr)}</span>
                    {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={th.c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('القسم', 'Department')}</span></div>
            <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{T('المسؤول', 'Responsible')}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>{T('المركز السعودي', 'Saudi Business Center')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Small remove button used by the amend rows.
const xBtn = { width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--bd)', color: 'var(--tx3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }

// Per-service wizard step definitions (key + stepper label).
const STEP_DEFS = {
  sbc_name_reserve: [{ k: 'fields', l: 'الحجز', en: 'Reservation' }, { k: 'parties', l: 'الأطراف', en: 'Parties' }, { k: 'payment', l: 'السداد', en: 'Payment' }],
  sbc_cr_open:      [{ k: 'fields', l: 'المنشأة', en: 'Facility' }, { k: 'parties', l: 'الأطراف', en: 'Parties' }, { k: 'payment', l: 'السداد', en: 'Payment' }],
  sbc_cr_renew:     [{ k: 'facility', l: 'المنشأة', en: 'Facility' }, { k: 'payment', l: 'السداد', en: 'Payment' }],
  sbc_cr_amend:     [{ k: 'facility', l: 'المنشأة', en: 'Facility' }, { k: 'amend', l: 'التعديل', en: 'Amendment' }, { k: 'payment', l: 'السداد', en: 'Payment' }],
  sbc_documents:    [{ k: 'facility', l: 'المنشأة', en: 'Facility' }, { k: 'payment', l: 'السداد', en: 'Payment' }],
}
// Document types (extend later — only CR extract for now).
const DOC_TYPES = [{ v: 'cr_extract', l: 'مستخرج السجل التجاري', en: 'CR extract' }]
// CR-amend: basic-data editable fields, and the entity types.
const AMEND_BASIC_FIELDS = [
  { v: 'activities', l: 'الأنشطة التجارية', en: 'Business activities' }, { v: 'city', l: 'المدينة', en: 'City' }, { v: 'capital', l: 'رأس المال', en: 'Capital' },
  { v: 'phone', l: 'الهاتف', en: 'Phone' }, { v: 'mobile', l: 'الجوال', en: 'Mobile' }, { v: 'email', l: 'البريد الإلكتروني', en: 'Email' },
]
const ENTITY_TYPES = [{ v: 'individual', l: 'مؤسسة فردية', en: 'Sole establishment' }, { v: 'company', l: 'شركة', en: 'Company' }]

// ── Add-transaction modal (direct create — no invoice) ──
// FormKit Modal in pages mode — the per-service steps stay config-driven via STEP_DEFS,
// each step renders as a Modal page with its own valid gate (the original goNext checks).
function AddModal({ lang, sb, user, toast, typeByCode, newStatusId, userBranchId, onClose, onSaved }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const [code, setCode] = useState('')
  // simple-form fields (services without step definitions)
  const [tradeName, setTradeName] = useState('')
  const [crNumber, setCrNumber] = useState('')
  const [note] = useState('')
  const [file] = useState(null)
  // name-reserve wizard fields
  const [language, setLanguage] = useState('ar')
  const [reservationNo, setReservationNo] = useState('')
  const [benef, setBenef] = useState({ mode: 'search', person: null, query: '', name: '', idNumber: '' })
  const [muq, setMuq] = useState({ mode: 'search', selected: null, query: '', name: '', phone: '' })
  const [sadadNo, setSadadNo] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [entityKind, setEntityKind] = useState('individual') // 'individual' | 'company'
  const [companyForm, setCompanyForm] = useState('llc')
  const [fac, setFac] = useState({ facility: null, query: '' })
  const [newConfDate, setNewConfDate] = useState('')
  // CR-amend
  const [amendType, setAmendType] = useState('basic') // 'basic' | 'transfer' | 'entity'
  const [basicChanges, setBasicChanges] = useState([{ field: '', value: '' }])
  const [trOwners, setTrOwners] = useState({ enabled: false, person: null, query: '' })
  const [trManagers, setTrManagers] = useState({ enabled: false, person: null, query: '' })
  const [entityTo, setEntityTo] = useState('')
  const [docType, setDocType] = useState('cr_extract')
  // footer errors appear only after the user touches a field on that page
  const [touched, setTouched] = useState({})
  const touch = k => setTouched(t => (t[k] ? t : { ...t, [k]: true }))
  const isNameReserve = code === 'sbc_name_reserve'
  const isCrOpen = code === 'sbc_cr_open'
  const isCrRenew = code === 'sbc_cr_renew'
  const isCrAmend = code === 'sbc_cr_amend'
  const isDocuments = code === 'sbc_documents'
  const wizSteps = STEP_DEFS[code] || []
  const isWizard = wizSteps.length > 0
  const fieldKind = code ? sbcMeta(code).field : null
  const needsFacility = isCrRenew || isCrAmend || isDocuments
  const needsPersons = isNameReserve || isCrOpen || isCrAmend
  const needsMuq = isNameReserve || isCrOpen

  // Option lists for the FormKit Selects — same sources/columns as the old inline
  // searches, fetched once; the Select dropdown searches them internally.
  const [facOpts, setFacOpts] = useState([])
  const [personOpts, setPersonOpts] = useState([])
  const [muqOpts, setMuqOpts] = useState([])
  useEffect(() => {
    if (!needsFacility) return
    let alive = true
    sb.from('facilities')
      .select('id,name_ar,unified_number,gosi_number,hrsd_number,confirmation_date,opening:opening_request_id(entity_kind)')
      .is('deleted_at', null).order('name_ar').limit(5000)
      .then(({ data }) => { if (alive) setFacOpts(data || []) })
    return () => { alive = false }
  }, [sb, needsFacility])
  useEffect(() => {
    if (!needsPersons) return
    let alive = true
    sb.from('persons').select('id,name_ar,name_en,id_number').is('deleted_at', null).order('name_ar').limit(5000)
      .then(({ data }) => { if (alive) setPersonOpts(data || []) })
    return () => { alive = false }
  }, [sb, needsPersons])
  useEffect(() => {
    if (!needsMuq) return
    let alive = true
    sb.from('muaqqibs').select('id,name_ar,phone').is('deleted_at', null).order('name_ar').limit(5000)
      .then(({ data }) => { if (alive) setMuqOpts(data || []) })
    return () => { alive = false }
  }, [sb, needsMuq])

  const save = async () => {
    setErrMsg('')
    if (!code) { setErrMsg(T('اختر نوع الخدمة', 'Select the service type')); return }
    const typeRow = typeByCode[code]
    if (!typeRow?.id) { setErrMsg(T('نوع الخدمة غير متوفر', 'This service type is not available')); return }
    if (!newStatusId) { setErrMsg(T('حالة «قيد التنفيذ» غير متوفرة', 'The "In progress" status is not available')); return }
    setSaving(true)
    try {
      if (isWizard) {
        if (!sadadNo.trim()) throw new Error(T('أدخل رقم السداد', 'Enter the SADAD number'))
        if (!(Number(amount) > 0)) throw new Error(T('أدخل المبلغ', 'Enter the amount'))
        let beneficiaryId = null, muaqqibId = null, facilityId = null, amendmentObj = null
        if (isCrRenew || isCrAmend || isDocuments) {
          if (!fac.facility?.id) throw new Error(T('اختر المنشأة', 'Select the facility'))
          if (isCrRenew && !newConfDate) throw new Error(T('أدخل تاريخ التأكيد السنوي الجديد', 'Enter the new annual confirmation date'))
          facilityId = fac.facility.id
          if (isCrAmend) {
            if (amendType === 'basic') {
              const changes = basicChanges.filter(c => c.field && String(c.value).trim())
              if (!changes.length) throw new Error(T('أضف حقلاً واحداً وقيمته على الأقل', 'Add at least one field and its value'))
              amendmentObj = { type: 'basic', changes: changes.map(c => ({ field: c.field, value: String(c.value).trim() })) }
            } else if (amendType === 'transfer') {
              const sections = {}
              if (trOwners.enabled) { if (!trOwners.person?.id) throw new Error(T('اختر شخص الملاك والشركاء', 'Select the owners & partners person')); sections.owners_partners = { person_id: trOwners.person.id, name: trOwners.person.name_ar, id_number: trOwners.person.id_number } }
              if (trManagers.enabled) { if (!trManagers.person?.id) throw new Error(T('اختر شخص المدراء', 'Select the managers person')); sections.managers = { person_id: trManagers.person.id, name: trManagers.person.name_ar, id_number: trManagers.person.id_number } }
              if (!Object.keys(sections).length) throw new Error(T('اختر قسماً واحداً على الأقل', 'Select at least one section'))
              amendmentObj = { type: 'transfer', ...sections }
            } else if (amendType === 'entity') {
              if (!entityTo) throw new Error(T('اختر النوع الجديد', 'Select the new type'))
              amendmentObj = { type: 'entity', to: entityTo, from: fac.facility.opening?.entity_kind || null }
            }
          }
        } else {
          if (!tradeName.trim()) throw new Error(isCrOpen ? T('اسم المنشأة مطلوب', 'Facility name is required') : T('الاسم التجاري المحجوز مطلوب', 'The reserved trade name is required'))
          // Resolve beneficiary — existing person, or create one (dedup by id_number)
          beneficiaryId = benef.person?.id || null
          if (!beneficiaryId) {
            if (!benef.name.trim() || !benef.idNumber.trim()) throw new Error(T('أدخل اسم المستفيد ورقم هويته', 'Enter the beneficiary name and ID number'))
            const idn = benef.idNumber.trim()
            const { data: ex } = await sb.from('persons').select('id').eq('id_number', idn).is('deleted_at', null).maybeSingle()
            if (ex?.id) beneficiaryId = ex.id
            else {
              const { data: np, error: pe } = await sb.from('persons').insert({ name_ar: benef.name.trim(), id_number: idn, origin: 'manual', created_by: user?.id || null }).select('id').single()
              if (pe) throw pe
              beneficiaryId = np.id
            }
          }
          // Resolve muaqqib (optional)
          muaqqibId = muq.selected?.id || null
          if (!muaqqibId && muq.name.trim()) {
            const { data: nm, error: me } = await sb.from('muaqqibs').insert({ name_ar: muq.name.trim(), phone: muq.phone.trim() ? '+966' + muq.phone.trim() : null, branch_id: userBranchId, created_by: user?.id || null }).select('id').single()
            if (me) throw me
            muaqqibId = nm.id
          }
        }
        const refNo = String(Date.now()).slice(-10)
        const srPayload = {
          request_ref_no: refNo, branch_id: userBranchId, service_type_id: typeRow.id, status_id: newStatusId,
          request_date: new Date().toISOString(), quantity: 1, note: note.trim() || null,
          beneficiary_person_id: beneficiaryId, muaqqib_id: muaqqibId, created_by: user?.id || null,
        }
        if (isNameReserve) { srPayload.trade_name = tradeName.trim() || null; srPayload.language = language; srPayload.reservation_no = reservationNo.trim() || null }
        if (isCrOpen) { srPayload.trade_name = tradeName.trim() || null; srPayload.entity_kind = entityKind; srPayload.company_form = entityKind === 'company' ? companyForm : null }
        if (isCrRenew) { srPayload.trade_name = fac.facility.name_ar || null; srPayload.facility_id = facilityId; srPayload.new_confirmation_date = newConfDate }
        if (isCrAmend) { srPayload.trade_name = fac.facility.name_ar || null; srPayload.facility_id = facilityId; srPayload.amendment = amendmentObj }
        if (isDocuments) { srPayload.trade_name = fac.facility.name_ar || null; srPayload.facility_id = facilityId; srPayload.document_type = docType }
        const { data: sr, error } = await sb.from('service_requests').insert(srPayload).select('id').single()
        if (error || !sr?.id) throw error || new Error('insert failed')
        // Pending fee → surfaces in المدفوعات for settlement
        const { error: feeErr } = await sb.from('transaction_fees').insert({
          service_request_id: sr.id, amount: Number(amount || 0), paid_amount: 0, status: 'pending',
          sadad_no: sadadNo.trim() || null,
          fee_label_ar: isDocuments ? (DOC_TYPES.find(d => d.v === docType)?.l || 'مستندات') : isCrAmend ? 'تعديل سجل تجاري' : isCrRenew ? 'تجديد سجل تجاري' : (isCrOpen ? 'فتح سجل تجاري' : 'حجز إسم تجاري'),
          fee_label_en: isDocuments ? 'Document' : isCrAmend ? 'Amend CR' : isCrRenew ? 'Renew CR' : (isCrOpen ? 'Open CR' : 'Trade Name Reservation'),
          notes: 'manual_pay_request', sort_order: 0,
        })
        if (feeErr) toast?.(T('أُضيفت المعاملة لكن تعذر إنشاء رسم السداد: ', 'Transaction added, but the payment fee could not be created: ') + (feeErr.message || ''), 'error')
        else toast?.(T('تمت الإضافة — انتقل إلى سدادات الخدمات للسداد', 'Added — go to Service Payments to pay'))
        setSaved(true)
        setTimeout(() => { onSaved() }, 1400)
        return
      }
      const refNo = String(Date.now()).slice(-10)
      const { data: sr, error } = await sb.from('service_requests').insert({
        request_ref_no: refNo, branch_id: userBranchId, service_type_id: typeRow.id, status_id: newStatusId,
        request_date: new Date().toISOString(), quantity: 1, note: note.trim() || null,
        trade_name: fieldKind === 'trade_name' ? (tradeName.trim() || null) : null,
        cr_number: fieldKind === 'cr_number' ? (crNumber.trim() || null) : null,
        created_by: user?.id || null,
      }).select('id').single()
      if (error || !sr?.id) throw error || new Error('insert failed')
      if (file) {
        const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `sbc/${sr.id}/${Date.now()}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (!upErr) { const { data: pub } = sb.storage.from('attachments').getPublicUrl(path); await sb.from('attachments').insert({ entity_type: 'service_request', entity_id: sr.id, file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: file.type || null, size_bytes: file.size || null, notes: 'sbc_doc' }) }
      }
      toast?.(T('تمت إضافة المعاملة', 'Transaction added')); setSaved(true); setTimeout(() => onSaved(), 1400)
    } catch (e) { setErrMsg(e.message || T('تعذر الحفظ', 'Could not save')) } finally { setSaving(false) }
  }

  // ── Per-page validity (gates التالي/إرسال) — same checks the old goNext/save ran ──
  const fieldsValid = isNameReserve
    ? !!(tradeName.trim() && reservationNo.trim())
    : !!(tradeName.trim() && (entityKind !== 'company' || companyForm))
  const facilityValid = !!fac.facility?.id && (!isCrRenew || !!newConfDate)
  const firstValid = !!code && (wizSteps[0]?.k === 'facility' ? facilityValid : fieldsValid)
  const partiesValid = !!(benef.person || (benef.name.trim() && benef.idNumber.trim()))
  const amendValid =
    amendType === 'basic' ? basicChanges.some(c => c.field && String(c.value).trim())
    : amendType === 'transfer'
      ? ((trOwners.enabled || trManagers.enabled) && (!trOwners.enabled || !!trOwners.person?.id) && (!trManagers.enabled || !!trManagers.person?.id))
      : amendType === 'entity' ? !!entityTo : false
  const paymentValid = !!sadadNo.trim() && Number(amount) > 0

  // ── Per-page footer messages (shown only after touching the page) ──
  const firstError = (() => {
    if (!code) return ''
    if (wizSteps[0]?.k === 'facility') {
      if (!(touched.facility || touched.confDate)) return ''
      if (!fac.facility?.id) return T('اختر المنشأة', 'Select the facility')
      if (isCrRenew && !newConfDate) return T('أدخل تاريخ التأكيد السنوي الجديد', 'Enter the new annual confirmation date')
      return ''
    }
    if (!(touched.tradeName || touched.reservationNo || touched.companyForm)) return ''
    if (!tradeName.trim()) return isCrOpen ? T('أدخل اسم المنشأة', 'Enter the facility name') : T('أدخل الاسم التجاري المحجوز', 'Enter the reserved trade name')
    if (isNameReserve && !reservationNo.trim()) return T('أدخل رقم الحجز', 'Enter the reservation number')
    if (isCrOpen && entityKind === 'company' && !companyForm) return T('اختر شكل الشركة', 'Select the company form')
    return ''
  })()
  const partiesError = touched.benef && !partiesValid ? T('أدخل بيانات المستفيد أو اختره', 'Enter the beneficiary details or pick one') : ''
  const amendError = (() => {
    if (!touched.amend || amendValid) return ''
    if (amendType === 'basic') return T('أضف حقلاً وقيمته', 'Add a field and its value')
    if (amendType === 'transfer') {
      if (!trOwners.enabled && !trManagers.enabled) return T('اختر قسماً واحداً على الأقل', 'Select at least one section')
      if (trOwners.enabled && !trOwners.person?.id) return T('اختر شخص الملاك والشركاء', 'Select the owners & partners person')
      return T('اختر شخص المدراء', 'Select the managers person')
    }
    return T('اختر النوع الجديد', 'Select the new type')
  })()
  const paymentError = errMsg || (((touched.sadad || touched.amount) && !paymentValid)
    ? (!sadadNo.trim() ? T('أدخل رقم السداد', 'Enter the SADAD number') : T('أدخل المبلغ', 'Enter the amount')) : '')

  // ── Page contents — FormKit fields only ──
  const personSelectProps = {
    options: personOpts, getKey: o => o.id,
    getLabel: o => (isAr ? (o.name_ar || o.name_en) : (o.name_en || o.name_ar)) || '—', getSub: o => o.id_number || '',
    placeholder: T('ابحث بالاسم أو رقم الهوية…', 'Search by name or ID number…'),
  }

  const firstPage = (
    <ModalSection Icon={FileText} label={T('بيانات الخدمة', 'Service details')}>
      <div style={GRID}>
        <Select full label={T('نوع الخدمة', 'Service type')} req searchable={false} placeholder={T('— اختر —', '— Select —')}
          value={code} onChange={v => { setErrMsg(''); setCode(v) }}
          options={SBC_CODES.map(c => ({ v: c, l: nameOf(sbcMeta(c), isAr) }))} getKey={o => o.v} getLabel={o => o.l} />
        {isNameReserve && (<>
          <Segmented label={T('اللغة', 'Language')} req value={language} onChange={setLanguage}
            options={[{ v: 'ar', l: T('عربي', 'Arabic') }, { v: 'en', l: T('إنجليزي', 'English') }]} />
          <TextField label={T('الاسم التجاري المحجوز', 'Reserved trade name')} req value={tradeName}
            onChange={v => { setTradeName(v); touch('tradeName') }}
            placeholder={language === 'en' ? 'e.g. Horizon Co.' : T('مثال: مؤسسة الأفق', 'e.g. مؤسسة الأفق')} />
          <TextField full label={T('رقم الحجز', 'Reservation number')} req dir="ltr" value={reservationNo}
            onChange={v => { setReservationNo(v); touch('reservationNo') }} placeholder="—" />
        </>)}
        {isCrOpen && (<>
          <Segmented label={T('النوع', 'Type')} req value={entityKind} onChange={setEntityKind} options={locOpts(ENTITY_TYPES, isAr)} />
          {entityKind === 'company' && (
            <Select label={T('شكل الشركة', 'Company form')} req searchable={false} placeholder={T('— اختر —', '— Select —')}
              value={companyForm} onChange={v => { setErrMsg(''); setCompanyForm(v); touch('companyForm') }}
              options={locOpts(COMPANY_FORMS, isAr)} getKey={o => o.v} getLabel={o => o.l} />
          )}
          <TextField full label={T('اسم المنشأة', 'Facility name')} req value={tradeName}
            onChange={v => { setTradeName(v); touch('tradeName') }} placeholder={T('مثال: مؤسسة الأفق للتجارة', 'e.g. Al-Ofoq Trading Est.')} />
        </>)}
        {isDocuments && (
          <Select full label={T('الوثيقة', 'Document')} req searchable={false} placeholder={T('— اختر —', '— Select —')}
            value={docType} onChange={v => { setErrMsg(''); setDocType(v) }}
            options={locOpts(DOC_TYPES, isAr)} getKey={o => o.v} getLabel={o => o.l} />
        )}
        {needsFacility && (<>
          <Select full label={T('المنشأة', 'Facility')} req placeholder={T('ابحث بالرقم الموحد أو التأمينات أو الموارد…', 'Search by unified, GOSI or HRSD number…')}
            value={fac.facility?.id || ''}
            onChange={(id, row) => { setFac({ facility: row, query: '' }); touch('facility') }}
            options={facOpts} getKey={o => o.id} getLabel={o => o.name_ar || '—'}
            getSub={o => [o.unified_number, o.gosi_number, o.hrsd_number].filter(Boolean).join(' · ')} />
          {fac.facility && (
            <div style={FULL}>
              <InfoGrid>
                <InfoRow label={T('الرقم الموحد', 'Unified number')} value={fac.facility.unified_number} mono />
                <InfoRow label={T('التأمينات', 'GOSI')} value={fac.facility.gosi_number} mono />
                <InfoRow label={T('الموارد', 'HRSD')} value={fac.facility.hrsd_number} mono />
                <InfoRow label={T('التأكيد السنوي', 'Annual confirmation')} value={fac.facility.confirmation_date ? fmtGreg(fac.facility.confirmation_date) : ''} mono />
              </InfoGrid>
            </div>
          )}
        </>)}
        {isCrRenew && (
          <DateField full label={T('تاريخ التأكيد السنوي الجديد', 'New annual confirmation date')} req value={newConfDate}
            onChange={v => { setNewConfDate(v); touch('confDate') }} />
        )}
        {!isWizard && fieldKind === 'trade_name' && (
          <TextField full label={T('الاسم التجاري', 'Trade name')} value={tradeName} onChange={setTradeName} placeholder={T('مثال: مؤسسة الأفق', 'e.g. Al-Ofoq Est.')} />
        )}
        {!isWizard && fieldKind === 'cr_number' && (
          <TextField full label={T('رقم السجل التجاري', 'CR number')} dir="ltr" value={crNumber} onChange={setCrNumber} placeholder="1010xxxxxx" />
        )}
      </div>
    </ModalSection>
  )

  const partiesPage = (
    <>
      <ModalSection Icon={User} label={T('المستفيد', 'Beneficiary')}>
        <div style={GRID}>
          <Segmented full value={benef.mode} onChange={v => setBenef({ ...benef, mode: v })}
            options={[{ v: 'search', l: T('بحث', 'Search') }, { v: 'new', l: T('إضافة جديد', 'Add new') }]} />
          {benef.mode === 'new' ? (<>
            <TextField label={T('اسم المستفيد', 'Beneficiary name')} req value={benef.name}
              onChange={v => { setBenef({ ...benef, name: v }); touch('benef') }} placeholder={T('اسم المستفيد', 'Beneficiary name')} />
            <IdField label={T('رقم الهوية', 'ID number')} req value={benef.idNumber}
              onChange={v => { setBenef({ ...benef, idNumber: v }); touch('benef') }} />
          </>) : (
            <Select full label={T('البحث عن شخص', 'Find a person')} req {...personSelectProps}
              value={benef.person?.id || ''}
              onChange={(id, row) => { setBenef({ ...benef, person: row }); touch('benef') }} />
          )}
        </div>
      </ModalSection>
      <ModalSection Icon={Users} label={T('المعقّب', 'Muaqqib')} hint={T('اختياري', 'Optional')}>
        <div style={GRID}>
          <Segmented full value={muq.mode} onChange={v => setMuq({ ...muq, mode: v })}
            options={[{ v: 'search', l: T('بحث', 'Search') }, { v: 'new', l: T('إضافة جديد', 'Add new') }]} />
          {muq.mode === 'new' ? (<>
            <TextField label={T('اسم المعقّب', 'Muaqqib name')} value={muq.name} onChange={v => setMuq({ ...muq, name: v })} placeholder={T('اسم المعقّب', 'Muaqqib name')} />
            <PhoneField label={T('جوال المعقّب', 'Muaqqib mobile')} value={muq.phone} onChange={v => setMuq({ ...muq, phone: v })} />
          </>) : (
            <Select full label={T('البحث عن معقّب', 'Find a muaqqib')} placeholder={T('ابحث باسم المعقّب أو جواله…', 'Search by muaqqib name or mobile…')}
              value={muq.selected?.id || ''} onChange={(id, row) => setMuq({ ...muq, selected: row })}
              options={muqOpts} getKey={o => o.id} getLabel={o => o.name_ar || '—'} getSub={o => o.phone || ''} />
          )}
        </div>
      </ModalSection>
    </>
  )

  const amendPage = (
    <ModalSection Icon={Pencil} label={T('تفاصيل التعديل', 'Amendment details')}>
      <div style={GRID}>
        <Select full label={T('نوع التعديل', 'Amendment type')} req searchable={false} placeholder={T('— اختر —', '— Select —')}
          value={amendType} onChange={v => { setErrMsg(''); setAmendType(v) }}
          options={[{ v: 'basic', l: T('تغيير بيانات أساسية', 'Change basic data') }, { v: 'transfer', l: T('نقل السجل التجاري', 'Transfer the CR') }, { v: 'entity', l: T('نوع وكيان السجل التجاري', 'CR type & entity') }]}
          getKey={o => o.v} getLabel={o => o.l} />

        {amendType === 'basic' && (
          <div style={FULL}>
            <ScrollBox maxHeight={220}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {basicChanges.map((c, i) => {
                  const used = basicChanges.map((x, j) => (j !== i ? x.field : null)).filter(Boolean)
                  const opts = locOpts(AMEND_BASIC_FIELDS.filter(fd => !used.includes(fd.v)), isAr)
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '44% 1fr auto', gap: 8, alignItems: 'center' }}>
                      <Select searchable={false} placeholder={T('الحقل', 'Field')} value={c.field}
                        onChange={v => { setBasicChanges(arr => arr.map((x, j) => (j === i ? { ...x, field: v } : x))); touch('amend') }}
                        options={opts} getKey={o => o.v} getLabel={o => o.l} />
                      <TextField placeholder={T('القيمة الجديدة', 'New value')} value={c.value}
                        onChange={v => { setBasicChanges(arr => arr.map((x, j) => (j === i ? { ...x, value: v } : x))); touch('amend') }} />
                      {basicChanges.length > 1 && (
                        <button type="button" onClick={() => setBasicChanges(arr => arr.filter((_, j) => j !== i))}
                          style={{ ...xBtn, width: 32, height: 42, borderRadius: 9 }}>✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollBox>
            {basicChanges.length < AMEND_BASIC_FIELDS.length && (
              <button type="button" onClick={() => setBasicChanges(arr => [...arr, { field: '', value: '' }])}
                style={{ marginTop: 10, height: 34, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(176,125,0,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{T('+ إضافة حقل', '+ Add field')}</button>
            )}
          </div>
        )}

        {amendType === 'transfer' && (<>
          <Switch full label={T('الملاك والشركاء', 'Owners & partners')} hint={T('نقل هذا القسم', 'Transfer this section')} checked={trOwners.enabled}
            onChange={v => { setTrOwners(s => ({ ...s, enabled: v })); touch('amend') }} />
          {trOwners.enabled && (
            <Select full label={T('شخص الملاك والشركاء', 'Owners & partners person')} req {...personSelectProps}
              value={trOwners.person?.id || ''}
              onChange={(id, row) => { setTrOwners(s => ({ ...s, person: row })); touch('amend') }} />
          )}
          <Switch full label={T('المدراء', 'Managers')} hint={T('نقل هذا القسم', 'Transfer this section')} checked={trManagers.enabled}
            onChange={v => { setTrManagers(s => ({ ...s, enabled: v })); touch('amend') }} />
          {trManagers.enabled && (
            <Select full label={T('شخص المدراء', 'Managers person')} req {...personSelectProps}
              value={trManagers.person?.id || ''}
              onChange={(id, row) => { setTrManagers(s => ({ ...s, person: row })); touch('amend') }} />
          )}
        </>)}

        {amendType === 'entity' && (() => {
          const cur = fac.facility?.opening?.entity_kind
          return (
            <Select full label={T('النوع الجديد', 'New type')} req searchable={false} placeholder={T('— اختر —', '— Select —')}
              hint={cur ? T(`الحالي: ${cur === 'company' ? 'شركة' : 'مؤسسة فردية'} — لا يمكن اختياره`, `Current: ${cur === 'company' ? 'Company' : 'Sole establishment'} — cannot be selected`) : undefined}
              value={entityTo} onChange={v => { setEntityTo(v); touch('amend') }}
              options={locOpts(ENTITY_TYPES.filter(t => t.v !== cur), isAr)} getKey={o => o.v} getLabel={o => o.l} />
          )
        })()}
      </div>
    </ModalSection>
  )

  const paymentPage = (
    <ModalSection Icon={CreditCard} label={T('السداد', 'Payment')}>
      <div style={GRID}>
        <TextField label={T('رقم السداد', 'SADAD no.')} req dir="ltr" value={sadadNo}
          onChange={v => { setSadadNo(v); touch('sadad') }} placeholder="—" />
        <CurrencyField label={T('المبلغ', 'Amount')} req value={amount} onChange={v => { setAmount(v); touch('amount') }} />
        <div style={{ ...FULL, fontSize: 12, fontWeight: 500, color: FKC.tx4, display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1.6 }}>
          <Info size={13} color={C.gold} strokeWidth={2} style={{ flexShrink: 0 }} />
          {T('سيتم إنشاء رسم بانتظار السداد ثم الانتقال إلى صفحة سدادات الخدمات.', 'A pending fee is created, then you continue on the Service Payments page.')}
        </div>
      </div>
    </ModalSection>
  )

  // ── Pages — built from the per-service STEP_DEFS config (step 1 carries the service select) ──
  const pageByKey = {
    parties: { valid: partiesValid, error: partiesError, content: partiesPage },
    amend: { valid: amendValid, error: amendError, content: amendPage },
    payment: { valid: paymentValid, error: paymentError, content: paymentPage },
  }
  const pages = isWizard
    ? wizSteps.map((s, i) => (i === 0
        ? { title: isAr ? s.l : s.en, valid: firstValid, error: firstError, content: firstPage }
        : { title: isAr ? s.l : s.en, ...pageByKey[s.k] }))
    : [{ title: T('الخدمة', 'Service'), valid: !!code, error: errMsg, content: firstPage }]

  return (
    <FKModal open onClose={onClose} variant="create" width={560} title={T('معاملة جديدة', 'New transaction')} Icon={FileText}
      pages={pages} onSubmit={save} submitting={saving} submitLabel={isWizard ? T('إرسال', 'Submit') : T('إضافة', 'Add')}
      success={saved ? <SuccessView title={T('تمت إضافة المعاملة', 'Transaction added')} /> : null} />
  )
}
