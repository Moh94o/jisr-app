import React, { useEffect, useMemo, useRef, useState } from 'react'
import BackButton from '../components/BackButton'
import { Dropdown, DateField, sF } from '../components/persons/PersonFormModal'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', red: '#c0392b', blue: '#3483b4', ok: '#27a046', purple: '#bb8fce', orange: '#f39c12', cyan: '#16a085', gray: '#95a5a6', warn: '#eab308' }
const nm = v => Number(v || 0).toLocaleString('en-US')
const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

// Adapter: keep the existing <Drop options={[{v,l}]} onChange={v} .../> call sites,
// but render the canonical searchable Dropdown from PersonFormModal for a unified look.
const Drop = ({ value, onChange, options, placeholder, searchable }) => (
  <Dropdown value={value} onChange={(k) => onChange(k)} options={options || []}
    getKey={o => o.v} getLabel={o => o.l} placeholder={placeholder}
    searchable={searchable ?? ((options || []).length > 5)}
    renderCell={(o, isSel) => (
      <span style={{ fontSize: 13, fontWeight: isSel ? 800 : 700, color: isSel ? '#D4A017' : 'rgba(255,255,255,.92)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {o.l}
        {isSel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
      </span>
    )} />
)
// Canonical label style (matches PersonFormModal's Lbl)
const LBL = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }

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
  { v: 'llc', l: 'ذات مسؤولية محدودة' },
]
const STATUS_THEME = {
  new:         { c: C.blue,   ar: 'جديد' },
  pending:     { c: C.warn,   ar: 'قيد الانتظار' },
  in_progress: { c: C.gold,   ar: 'قيد التنفيذ' },
  done:        { c: C.ok,     ar: 'منجز' },
  cancelled:   { c: C.red,    ar: 'ملغي' },
}
const sbcMeta = (code) => SBC_META[code] || { ar: code, en: code, c: C.gray, field: 'trade_name' }

const fmtGreg = (iso) => { if (!iso) return '—'; try { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` } catch { return '—' } }
const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); const h = d.getHours(); const ap = h < 12 ? 'ص' : 'م'; const h12 = ((h + 11) % 12) + 1; return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(h12)}:${p(d.getMinutes())} ${ap}` } catch { return '—' }
}

// Shared card chrome (identical to the Users page).
const cardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }
const cardTitle = { fontSize: 16, fontWeight: 600, color: '#fff', letterSpacing: '.2px' }

// ── KPI hero card (matches Users page HeroStat) ──
function HeroStat({ tone, label, value, footer }) {
  return (
    <div style={{ position: 'relative', padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 150 }}>
      <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${tone}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone, boxShadow: `0 0 10px ${tone}aa` }} />
        <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{label}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: tone, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)' }}>
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
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < items.length - 1 ? '1px dashed rgba(255,255,255,.07)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, flexShrink: 0 }}>{f.label}</span>
            {f.node ? f.node : (
              <span style={{ fontSize: 13, color: f.value ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600, direction: f.mono ? 'ltr' : 'rtl', fontFamily: f.mono ? 'monospace' : 'inherit', textAlign: 'end', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.value || ''}>{f.value || '—'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditAction({ onEdit, label = 'تعديل' }) {
  return (
    <button onClick={onEdit}
      onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
      style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s ease, border-color .15s ease' }}>
      {label}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
    </button>
  )
}

export default function SbcCenterPage({ sb, user, toast, lang = 'ar', branchId }) {
  const userBranchId = user?.primary_branch_id || branchId || null

  const [types, setTypes] = useState([])
  const [statuses, setStatuses] = useState([])  // [{id, code, value_ar}]
  const [newStatusId, setNewStatusId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const typeByCode = useMemo(() => Object.fromEntries(types.map(t => [t.code, t])), [types])
  const typeById = useMemo(() => Object.fromEntries(types.map(t => [t.id, t])), [types])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: ti }, { data: si }] = await Promise.all([
        sb.from('lookup_items').select('id,code,value_ar,value_en').in('code', SBC_CODES),
        sb.from('lookup_items').select('id,code,value_ar,category:lookup_categories!inner(category_key)').eq('category.category_key', 'request_status'),
      ])
      if (!alive) return
      setTypes(ti || [])
      setStatuses(si || [])
      setNewStatusId((si || []).find(s => s.code === 'new')?.id || null)
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
      .order('request_date', { ascending: false, nullsFirst: false }).limit(300)
    if (userBranchId) qb = qb.eq('branch_id', userBranchId)
    const { data, error } = await qb
    if (error) { toast?.('تعذر تحميل المعاملات', 'error'); setRows([]); setLoading(false); return }
    setRows(data || []); setLoading(false)
  }, [sb, types, userBranchId])

  useEffect(() => { reload() }, [reload])

  // Search filter
  const filtered = useMemo(() => {
    const s = q.trim()
    if (!s) return rows
    return rows.filter(r => [r.request_ref_no, r.trade_name, r.cr_number, r.note].some(v => (v || '').includes(s)))
  }, [rows, q])

  // Group by service type
  const groups = useMemo(() => {
    const m = new Map()
    SBC_CODES.forEach(code => { const t = typeByCode[code]; if (t) m.set(t.id, { id: t.id, code, meta: sbcMeta(code), items: [] }) })
    filtered.forEach(r => { const g = m.get(r.service_type_id); if (g) g.items.push(r) })
    return [...m.values()].filter(g => g.items.length)
  }, [filtered, typeByCode])

  // Donut distribution by type
  const dist = useMemo(() => SBC_CODES.map(code => ({ code, meta: sbcMeta(code), cnt: rows.filter(r => typeById[r.service_type_id]?.code === code).length })).filter(d => d.cnt > 0), [rows, typeById])

  const doneCount = rows.filter(r => r.status?.code === 'done').length

  if (selectedId) {
    const row = rows.find(r => r.id === selectedId)
    return <SbcDetailPage sb={sb} user={user} toast={toast} lang={lang} row={row} type={row ? typeById[row.service_type_id] : null}
      statuses={statuses} onBack={() => setSelectedId(null)} onChanged={reload} />
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <style>{`
        .sbc-hero-grid{display:grid;grid-template-columns:1.8fr 1fr;gap:14px;margin-bottom:24px}
        @media (max-width:720px){.sbc-hero-grid{grid-template-columns:1fr}}
        .sbc-row{transition:all .15s}
        .sbc-row:hover{transform:translateY(-1px);box-shadow:0 8px 22px rgba(0,0,0,.34) !important;border-color:rgba(212,160,23,.22) !important}
        .sbc-row-grid{display:grid;grid-template-columns:auto 1px 1fr auto;gap:18px;align-items:center}
        @media (max-width:720px){.sbc-row-grid{grid-template-columns:1fr;gap:12px}.sbc-row-vdiv{display:none}}
        .sbc-row-vdiv{width:1px;align-self:stretch;background:linear-gradient(180deg,transparent 0%,rgba(255,255,255,.08) 50%,transparent 100%);min-height:46px}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>المركز السعودي للأعمال</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>إدارة السجل التجاري والكيان النظامي للمنشآت عبر المركز السعودي للأعمال. المعاملات تُضاف مباشرة من هذه الصفحة.</div>
        </div>
        <button onClick={() => setShowAdd(true)}
          onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
          onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
          style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease' }}>
          إضافة معاملة
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      {/* Hero — total + distribution donut */}
      <div className="sbc-hero-grid">
        <HeroStat tone={C.gold} label="المعاملات" value={nm(rows.length)} footer={doneCount > 0 ? `${nm(doneCount)} منجزة` : (rows.length ? 'قيد العمل' : 'لا توجد معاملات')} />
        {(() => {
          const total = dist.reduce((s, r) => s + r.cnt, 0) || 1
          const R = 32, CIRC = 2 * Math.PI * R
          let offset = 0
          return (
            <div style={{ borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>التوزّع حسب الخدمة</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', marginLeft: 6 }}>{nm(rows.length)}</span>معاملة
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <svg width="86" height="86" viewBox="-43 -43 86 86" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
                  <circle r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="11" />
                  {dist.map((r) => { const dash = (r.cnt / total) * CIRC; const seg = (<circle key={r.code} r={R} fill="none" stroke={r.meta.c} strokeWidth="11" strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-offset} style={{ transition: 'stroke-dasharray .3s' }}><title>{`${r.meta.ar}: ${r.cnt}`}</title></circle>); offset += dash; return seg })}
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" transform="rotate(90)" style={{ fill: '#fff', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nm(rows.length)}</text>
                </svg>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 6, minWidth: 0 }}>
                  {dist.length === 0 ? <span style={{ fontSize: 11, color: 'var(--tx5)' }}>—</span> : dist.map((r) => (
                    <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.meta.c, flexShrink: 0 }} />
                      <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.meta.ar}</span>
                      <span style={{ color: r.meta.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', flexShrink: 0, fontWeight: 700 }}>{nm(r.cnt)}</span>
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
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالمرجع أو الاسم التجاري أو رقم السجل…"
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      </div>

      {/* List grouped by service type */}
      {loading ? (
        <div style={{ padding: 50, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>جاري التحميل…</div>
      ) : groups.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {q ? 'لا نتائج مطابقة' : 'لا توجد معاملات بعد — اضغط «إضافة معاملة».'}
        </div>
      ) : groups.map(g => (
        <div key={g.id} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.meta.c, transform: 'translateY(-2px)' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx2)' }}>{g.meta.ar}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{g.items.length} معاملة</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {g.items.map(r => <TxRowCard key={r.id} r={r} meta={g.meta} onClick={() => setSelectedId(r.id)} />)}
          </div>
        </div>
      ))}

      {showAdd && <AddModal lang={lang} sb={sb} user={user} toast={toast} typeByCode={typeByCode} newStatusId={newStatusId} userBranchId={userBranchId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); reload() }} />}
    </div>
  )
}

// ── Transaction row card (matches Users page UserCard) ──
function TxRowCard({ r, meta, onClick }) {
  const accent = meta.c
  const sTheme = STATUS_THEME[r.status?.code] || { c: C.gray, ar: r.status?.value_ar || '—' }
  const title = r.trade_name || r.cr_number || '—'
  return (
    <div onClick={onClick} className="sbc-row" style={{ position: 'relative', cursor: 'pointer', borderRadius: 14, background: `linear-gradient(135deg, ${accent}0e 0%, #232323 50%, #1f1f1f 100%)`, border: '1px solid rgba(255,255,255,.06)', boxShadow: '0 4px 14px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.03)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 26px 14px 18px' }}>
        <div className="sbc-row-grid">
          {/* Avatar — service-type icon tile */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 56 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${accent}33 0%, ${accent}14 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /><path d="M8 13h8M8 17h6" /></svg>
            </div>
          </div>
          <div className="sbc-row-vdiv" />
          {/* Metadata */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.92)', letterSpacing: '-.2px' }}>{title}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: accent + '20', color: accent }}>{meta.ar}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, fontSize: 11, color: 'var(--tx4)', fontWeight: 600, flexWrap: 'wrap' }}>
              <span style={{ direction: 'ltr', fontFamily: 'monospace', color: C.gold }}>#{r.request_ref_no}</span>
              <span style={{ direction: 'ltr', fontFamily: 'monospace' }}>{fmtGreg(r.request_date)}</span>
            </div>
          </div>
          {/* Status badge (left) */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: sTheme.c, background: tint(sTheme.c, 0.12), border: `1px solid ${tint(sTheme.c, 0.3)}`, borderRadius: 8, padding: '5px 11px' }}>{sTheme.ar}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// Transaction detail page — mirrors the Users page UserDetailPage layout.
// ═══════════════════════════════════════════════════════════════════
function SbcDetailPage({ sb, user, toast, lang, row, type, statuses, onBack, onChanged }) {
  const meta = sbcMeta(type?.code)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ trade_name: row?.trade_name || '', cr_number: row?.cr_number || '', note: row?.note || '' })
  const [statusId, setStatusId] = useState(null)
  const [atts, setAtts] = useState([])
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const sTheme = STATUS_THEME[row?.status?.code] || { c: C.gray, ar: row?.status?.value_ar || '—' }
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
    if (!comp.uni.trim()) { toast?.('الرقم الموحد مطلوب', 'error'); return }
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
      if (doneId) await sb.from('service_requests').update({ status_id: doneId }).eq('id', row.id)
      setFacility(fac)
      toast?.('تم إنجاز المعاملة وإضافة المنشأة')
      await onChanged?.()
    } catch (e) { toast?.(e.message || 'تعذر الإنجاز', 'error') } finally { setCompleting(false) }
  }

  const completeDocuments = async () => {
    if (!crFile) { toast?.('أرفق ملف المستخرج', 'error'); return }
    if (!row.facility_id) { toast?.('المنشأة غير مرتبطة بالمعاملة', 'error'); return }
    setCompleting(true)
    try {
      const safe = (crFile.name || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `sbc/${row.id}/doc_${Date.now()}_${safe}`
      const { error: ue } = await sb.storage.from('attachments').upload(path, crFile, { cacheControl: '3600', upsert: false })
      if (ue) throw ue
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const fileUrl = pub?.publicUrl || path
      // Attach to the facility's CR files + to the transaction record
      const { data: ins } = await sb.from('attachments').insert({ entity_type: 'facility', entity_id: row.facility_id, file_name: crFile.name, file_url: fileUrl, storage_path: path, mime_type: crFile.type || null, size_bytes: crFile.size || null, notes: 'cr_document:' + (row.document_type || 'cr_extract') }).select('id,file_name,file_url,created_at').single()
      await sb.from('attachments').insert({ entity_type: 'service_request', entity_id: row.id, file_name: crFile.name, file_url: fileUrl, storage_path: path, mime_type: crFile.type || null, size_bytes: crFile.size || null, notes: 'cr_document' })
      const doneId = statuses.find(s => s.code === 'done')?.id
      if (doneId) await sb.from('service_requests').update({ status_id: doneId }).eq('id', row.id)
      if (ins) setDocFileRec(ins)
      toast?.('تم إنجاز المعاملة وإرفاق المستخرج')
      await onChanged?.()
    } catch (e) { toast?.(e.message || 'تعذر الإنجاز', 'error') } finally { setCompleting(false) }
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
      toast?.('تم الحفظ'); setEditing(false); await onChanged?.()
    } catch (e) { toast?.('تعذر الحفظ', 'error') } finally { setBusy(false) }
  }

  const changeStatus = async (id) => {
    setStatusId(id); setBusy(true)
    try {
      const { error } = await sb.from('service_requests').update({ status_id: id }).eq('id', row.id)
      if (error) throw error
      toast?.('تم تحديث الحالة'); await onChanged?.()
    } catch (e) { toast?.('تعذر التحديث', 'error') } finally { setBusy(false) }
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
      toast?.('تم رفع الملف')
    } catch (e) { toast?.('تعذر رفع الملف', 'error') } finally { setUploading(false) }
  }

  const inp = { width: '100%', fontFamily: F, fontSize: 13, color: 'rgba(255,255,255,.9)', background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '9px 11px', outline: 'none', boxSizing: 'border-box', textAlign: 'end' }

  // Info card items
  const detailItems = [
    { label: 'نوع الخدمة', value: meta.ar },
    { label: 'المرجع', value: '#' + row.request_ref_no, mono: true },
    isTradeName
      ? { label: 'الاسم التجاري', node: editing ? <input style={inp} value={form.trade_name} onChange={e => setForm(f => ({ ...f, trade_name: e.target.value }))} placeholder="—" /> : undefined, value: row.trade_name }
      : { label: 'رقم السجل التجاري', node: editing ? <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr' }} value={form.cr_number} onChange={e => setForm(f => ({ ...f, cr_number: e.target.value }))} placeholder="—" /> : undefined, value: row.cr_number, mono: true },
    { label: 'تاريخ الإضافة', value: fmtDateTime(row.created_at || row.request_date), mono: true },
  ]

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 48, color: 'var(--tx2)', direction: 'rtl' }}>
      <div style={{ marginBottom: 4 }}><BackButton onBack={onBack} /></div>

      {/* Header */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={meta.c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /><path d="M8 13h8M8 17h6" /></svg>
          <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{row.trade_name || row.cr_number || meta.ar}</div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: meta.c + '20', color: meta.c }}>{meta.ar}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: tint(sTheme.c, 0.14), color: sTheme.c }}>{sTheme.ar}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>عرض تفاصيل المعاملة وتعديلها، وتحديث حالتها وإرفاق المستندات.</div>
      </div>

      <div className="sbcd-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        <style>{`@media (max-width:900px){.sbcd-grid{grid-template-columns:1fr !important}.sbcd-side,.sbcd-main{grid-column:auto !important;position:static !important}}`}</style>

        {/* Main column — details + notes + attachments */}
        <div className="sbcd-main" style={{ gridColumn: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <InfoSectionCard title="تفاصيل المعاملة" items={detailItems}
            headerAction={editing
              ? <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={() => { setEditing(false); setForm({ trade_name: row.trade_name || '', cr_number: row.cr_number || '', note: row.note || '' }) }} style={{ height: 32, padding: '0 12px', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,.14)', color: 'var(--tx3)', fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>إلغاء</button>
                  <button onClick={saveFields} disabled={busy} style={{ height: 32, padding: '0 16px', borderRadius: 9, background: `linear-gradient(180deg,${C.gold},#b8881a)`, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{busy ? '…' : 'حفظ'}</button>
                </div>
              : <EditAction onEdit={() => setEditing(true)} />} />

          {/* CR-open completion workflow (after payment) */}
          {isCrOpen && (facility ? (
            <div style={cardChrome}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} /><span style={cardTitle}>المنشأة</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, color: C.ok, background: 'rgba(39,160,70,.14)', borderRadius: 6, padding: '4px 10px' }}>تم الإنجاز</span>
              </div>
              <div style={{ padding: '6px 22px 14px' }}>
                {[
                  { label: 'اسم المنشأة', value: facility.name_ar },
                  { label: 'الرقم الموحد', value: facility.unified_number, mono: true },
                  { label: 'التأمينات الاجتماعية', value: facility.gosi_number, mono: true },
                  { label: 'الموارد البشرية', value: facility.hrsd_number, mono: true },
                ].map((f, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px dashed rgba(255,255,255,.07)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{f.label}</span>
                    <span style={{ fontSize: 13, color: f.value ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600, direction: f.mono ? 'ltr' : 'rtl', fontFamily: f.mono ? 'monospace' : 'inherit' }}>{f.value || '—'}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--tx4)', display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1.6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6 9 17l-5-5" /></svg>
                  أُضيفت إلى المنشآت. تُجلب بقية بيانات المنشأة من المزامنة عبر الرقم الموحد.
                </div>
              </div>
            </div>
          ) : fee?.status === 'paid' ? (
            <div style={{ ...cardChrome, border: `1px solid ${C.gold}44` }}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>إكمال فتح السجل</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, color: C.gold, background: 'rgba(212,160,23,.14)', borderRadius: 6, padding: '4px 10px' }}>تم السداد — مطلوب الإكمال</span>
              </div>
              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>الرقم الموحد <span style={{ color: C.red }}>*</span></div>
                  <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }} dir="ltr" value={comp.uni} onChange={e => setComp(c => ({ ...c, uni: e.target.value }))} placeholder="7000000000" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>التأمينات الاجتماعية</div>
                    <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }} dir="ltr" value={comp.gosi} onChange={e => setComp(c => ({ ...c, gosi: e.target.value }))} placeholder="—" /></div>
                  <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>الموارد البشرية</div>
                    <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr', textAlign: 'start' }} dir="ltr" value={comp.hrsd} onChange={e => setComp(c => ({ ...c, hrsd: e.target.value }))} placeholder="—" /></div>
                </div>
                <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>ملف السجل التجاري</div>
                  <input ref={crFileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => setCrFile(e.target.files?.[0] || null)} />
                  <button onClick={() => crFileRef.current?.click()} style={{ ...inp, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: crFile ? C.gold : 'var(--tx5)', fontWeight: 600 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crFile ? crFile.name : 'إرفاق ملف السجل'}</span>
                  </button></div>
                <button onClick={completeCrOpen} disabled={completing} style={{ height: 42, borderRadius: 10, background: `linear-gradient(180deg,${C.gold},#b8881a)`, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: completing ? 'default' : 'pointer', marginTop: 4 }}>{completing ? 'جارٍ الإنجاز…' : 'إنجاز المعاملة وإضافة المنشأة'}</button>
              </div>
            </div>
          ) : (
            <div style={{ ...cardChrome, border: '1px dashed rgba(255,255,255,.1)' }}>
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--tx4)', lineHeight: 1.6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                بانتظار سداد رسم فتح السجل في صفحة المدفوعات قبل إكمال بيانات المنشأة.
              </div>
            </div>
          ))}

          {/* Documents completion workflow (after payment) — attach CR extract */}
          {isDocuments && (row.status?.code === 'done' ? (
            <div style={cardChrome}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.ok }} /><span style={cardTitle}>الوثيقة</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, color: C.ok, background: 'rgba(39,160,70,.14)', borderRadius: 6, padding: '4px 10px' }}>تم الإنجاز</span>
              </div>
              <div style={{ padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {docFacility && <div style={{ fontSize: 12.5, color: 'var(--tx3)', lineHeight: 1.6 }}>أُضيفت إلى «ملفات السجل» في منشأة «{docFacility.name_ar}».</div>}
                {docFileRec ? (
                  <a href={docFileRec.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', textDecoration: 'none', color: 'var(--tx2)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /></svg>
                    <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'start' }}>{docFileRec.file_name}</span>
                  </a>
                ) : <div style={{ fontSize: 12, color: 'var(--tx5)' }}>—</div>}
              </div>
            </div>
          ) : fee?.status === 'paid' ? (
            <div style={{ ...cardChrome, border: `1px solid ${C.gold}44` }}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>إرفاق مستخرج السجل</span>
                <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 700, color: C.gold, background: 'rgba(212,160,23,.14)', borderRadius: 6, padding: '4px 10px' }}>تم السداد — مطلوب الإرفاق</span>
              </div>
              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div><div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginBottom: 6 }}>ملف مستخرج السجل التجاري <span style={{ color: C.red }}>*</span></div>
                  <input ref={crFileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => setCrFile(e.target.files?.[0] || null)} />
                  <button onClick={() => crFileRef.current?.click()} style={{ ...inp, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: crFile ? C.gold : 'var(--tx5)', fontWeight: 600 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crFile ? crFile.name : 'إرفاق ملف المستخرج'}</span>
                  </button></div>
                <button onClick={completeDocuments} disabled={completing} style={{ height: 42, borderRadius: 10, background: `linear-gradient(180deg,${C.gold},#b8881a)`, border: 'none', color: '#1a1a1a', fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: completing ? 'default' : 'pointer', marginTop: 4 }}>{completing ? 'جارٍ الإنجاز…' : 'إنجاز المعاملة وإرفاق المستخرج'}</button>
              </div>
            </div>
          ) : (
            <div style={{ ...cardChrome, border: '1px dashed rgba(255,255,255,.1)' }}>
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--tx4)', lineHeight: 1.6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.warn} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                بانتظار سداد رسم الوثيقة في صفحة المدفوعات قبل إرفاق المستخرج.
              </div>
            </div>
          ))}

          {/* Notes */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>ملاحظات</span></div>
            <div style={{ padding: '14px 22px' }}>
              {editing
                ? <textarea style={{ ...inp, minHeight: 80, resize: 'vertical', textAlign: 'start' }} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="اكتب ملاحظة…" />
                : <div style={{ fontSize: 13, color: row.note ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 500, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{row.note || 'لا توجد ملاحظات'}</div>}
            </div>
          </div>

          {/* Attachments */}
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>المرفقات</span>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={e => { uploadFile(e.target.files?.[0]); e.target.value = '' }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ marginInlineStart: 'auto', height: 32, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }}>{uploading ? 'جارٍ الرفع…' : 'إرفاق ملف'}</button>
            </div>
            <div style={{ padding: '12px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {atts.length === 0 ? <div style={{ fontSize: 12, color: 'var(--tx5)', padding: '6px 0' }}>لا توجد مرفقات</div> :
                atts.map(a => (
                  <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', textDecoration: 'none', color: 'var(--tx2)' }}>
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
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: sTheme.c }} /><span style={cardTitle}>الحالة</span></div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {statuses.filter(s => STATUS_THEME[s.code]).map(s => {
                const th = STATUS_THEME[s.code]; const on = statusId === s.id
                return (
                  <button key={s.id} onClick={() => changeStatus(s.id)} disabled={busy} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'start', background: on ? tint(th.c, 0.12) : 'rgba(255,255,255,.02)', border: `1px solid ${on ? tint(th.c, 0.4) : 'rgba(255,255,255,.05)'}`, fontFamily: F }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: th.c, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, fontWeight: on ? 800 : 600, color: on ? th.c : 'var(--tx3)' }}>{th.ar}</span>
                    {on && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={th.c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>القسم</span></div>
            <div style={{ padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>المسؤول</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>المركز السعودي</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Shared styles + searchable person/muaqqib pickers (used by the name-reserve wizard) ──
const segBtn = (on) => ({ flex: 1, height: 36, borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 700, border: '1px solid ' + (on ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.08)'), background: on ? 'rgba(212,160,23,.12)' : 'transparent', color: on ? C.gold : 'var(--tx3)', transition: '.15s' })
const dropWrap = { position: 'absolute', top: 'calc(100% + 4px)', insetInline: 0, zIndex: 30, background: '#0f0f0f', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.7)', maxHeight: 210, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }
const dropRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.05)', fontSize: 13 }
const chipBox = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)' }
const xBtn = { width: 24, height: 24, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,.08)', color: 'var(--tx3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13 }
// Search inputs: RTL text from the right, magnifier icon pinned to the left.
const searchInpStyle = (inp) => ({ ...inp, textAlign: 'right', direction: 'rtl', padding: '0 14px 0 38px' })
const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>

// Chosen designs: person chip = «كرت 4» (avatar + green check), search-row id = «بحث 3» (gold chip).
const Avatar = ({ c = C.gold, s = 38 }) => <div style={{ width: s, height: s, borderRadius: '50%', background: `${c}22`, border: `1px solid ${c}55`, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><svg width={Math.round(s * 0.5)} height={Math.round(s * 0.5)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div>
const idChipStyle = { color: C.gold, direction: 'ltr', fontFamily: 'monospace', fontSize: 11, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.25)', borderRadius: 6, padding: '2px 7px', flexShrink: 0 }
function PersonChip({ name, sub, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'linear-gradient(135deg, rgba(212,160,23,.14), rgba(212,160,23,.04))', border: '1px solid rgba(212,160,23,.3)' }}>
      <Avatar name={name} s={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ok} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        {sub && <span style={{ fontSize: 11, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace' }}>{sub}</span>}
      </div>
      <button type="button" onClick={onRemove} style={xBtn}>✕</button>
    </div>
  )
}

function BeneficiaryField({ sb, value, setValue, inp, lbl, label = 'المستفيد', required = true, searchOnly = false }) {
  const [results, setResults] = useState([]); const [open, setOpen] = useState(false); const tRef = useRef(null)
  const mode = searchOnly ? 'search' : (value.mode || 'search')
  const search = (q) => {
    clearTimeout(tRef.current)
    setValue({ ...value, query: q, person: null })
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return }
    tRef.current = setTimeout(async () => {
      const { data } = await sb.from('persons').select('id,name_ar,name_en,id_number')
        .is('deleted_at', null).or(`id_number.ilike.%${q.trim()}%,name_ar.ilike.%${q.trim()}%`).order('name_ar').limit(8)
      setResults(data || []); setOpen(true)
    }, 250)
  }
  return (
    <div>
      <div style={lbl}>{label} {required && <span style={{ color: C.red }}>*</span>}</div>
      {!searchOnly && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button type="button" onClick={() => setValue({ ...value, mode: 'search' })} style={segBtn(mode === 'search')}>بحث</button>
          <button type="button" onClick={() => setValue({ ...value, mode: 'new' })} style={segBtn(mode === 'new')}>إضافة جديد</button>
        </div>
      )}
      {mode === 'new' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={inp} placeholder="اسم المستفيد" value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} />
          <input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr' }} dir="ltr" placeholder="رقم الهوية" value={value.idNumber} onChange={e => setValue({ ...value, idNumber: e.target.value })} />
        </div>
      ) : value.person ? (
        <PersonChip name={value.person.name_ar || value.person.name_en} sub={value.person.id_number} onRemove={() => setValue({ ...value, person: null, query: '' })} />
      ) : (
        <div style={{ position: 'relative' }}>
          <SearchIcon /><input style={searchInpStyle(inp)} placeholder="ابحث بالاسم أو رقم الهوية…" value={value.query || ''} onChange={e => search(e.target.value)} onFocus={() => results.length && setOpen(true)} />
          {open && results.length > 0 && (
            <div className="sbc-dd-scroll" style={dropWrap}>
              {results.map(r => (
                <div key={r.id} onClick={() => { setValue({ ...value, person: r }); setOpen(false) }} style={dropRow}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ color: 'var(--tx2)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar || r.name_en}</span>
                  <span style={idChipStyle}>{r.id_number}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MuaqqibField({ sb, value, setValue, inp, lbl }) {
  const [results, setResults] = useState([]); const [open, setOpen] = useState(false); const tRef = useRef(null)
  const search = (q) => {
    clearTimeout(tRef.current)
    setValue({ ...value, query: q, selected: null })
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return }
    tRef.current = setTimeout(async () => {
      const { data } = await sb.from('muaqqibs').select('id,name_ar,phone')
        .is('deleted_at', null).or(`name_ar.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`).order('name_ar').limit(8)
      setResults(data || []); setOpen(true)
    }, 250)
  }
  return (
    <div>
      <div style={lbl}>المعقّب</div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button type="button" onClick={() => setValue({ ...value, mode: 'search' })} style={segBtn(value.mode === 'search')}>بحث</button>
        <button type="button" onClick={() => setValue({ ...value, mode: 'new' })} style={segBtn(value.mode === 'new')}>إضافة جديد</button>
      </div>
      {value.mode === 'new' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={inp} placeholder="اسم المعقّب" value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} />
          <div style={{ display: 'flex', direction: 'ltr', border: '1px solid transparent', borderRadius: 9, overflow: 'hidden', background: 'rgba(0,0,0,.18)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', height: 42 }}>
            <div style={{ height: '100%', padding: '0 10px', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: C.gold, flexShrink: 0 }}>+966</div>
            <input value={value.phone} onChange={e => setValue({ ...value, phone: e.target.value.replace(/\D/g, '').slice(0, 9) })} placeholder="5X XXX XXXX" maxLength={9}
              style={{ width: '100%', height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 13, fontWeight: 600, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
          </div>
        </div>
      ) : value.selected ? (
        <PersonChip name={value.selected.name_ar} sub={value.selected.phone} onRemove={() => setValue({ ...value, selected: null, query: '' })} />
      ) : (
        <div style={{ position: 'relative' }}>
          <SearchIcon /><input style={searchInpStyle(inp)} placeholder="ابحث باسم المعقّب أو جواله…" value={value.query || ''} onChange={e => search(e.target.value)} onFocus={() => results.length && setOpen(true)} />
          {open && results.length > 0 && (
            <div className="sbc-dd-scroll" style={dropWrap}>
              {results.map(r => (
                <div key={r.id} onClick={() => { setValue({ ...value, selected: r }); setOpen(false) }} style={dropRow}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{r.name_ar}</span>
                  {r.phone ? <span style={idChipStyle}>{r.phone}</span> : <span />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Per-service wizard step definitions (key + stepper label).
const STEP_DEFS = {
  sbc_name_reserve: [{ k: 'fields', l: 'الحجز' }, { k: 'parties', l: 'الأطراف' }, { k: 'payment', l: 'السداد' }],
  sbc_cr_open:      [{ k: 'fields', l: 'المنشأة' }, { k: 'parties', l: 'الأطراف' }, { k: 'payment', l: 'السداد' }],
  sbc_cr_renew:     [{ k: 'facility', l: 'المنشأة' }, { k: 'payment', l: 'السداد' }],
  sbc_cr_amend:     [{ k: 'facility', l: 'المنشأة' }, { k: 'amend', l: 'التعديل' }, { k: 'payment', l: 'السداد' }],
  sbc_documents:    [{ k: 'facility', l: 'المنشأة' }, { k: 'payment', l: 'السداد' }],
}
// Document types (extend later — only CR extract for now).
const DOC_TYPES = [{ v: 'cr_extract', l: 'مستخرج السجل التجاري' }]
// CR-amend: basic-data editable fields, and the entity types.
const AMEND_BASIC_FIELDS = [
  { v: 'activities', l: 'الأنشطة التجارية' }, { v: 'city', l: 'المدينة' }, { v: 'capital', l: 'رأس المال' },
  { v: 'phone', l: 'الهاتف' }, { v: 'mobile', l: 'الجوال' }, { v: 'email', l: 'البريد الإلكتروني' },
]
const ENTITY_TYPES = [{ v: 'individual', l: 'مؤسسة فردية' }, { v: 'company', l: 'شركة' }]

// Facility search/select (by unified / GOSI / HRSD number) — used by CR-renew.
function FacilityField({ sb, value, setValue, inp, lbl }) {
  const [results, setResults] = useState([]); const [open, setOpen] = useState(false); const tRef = useRef(null)
  const search = (q) => {
    clearTimeout(tRef.current)
    setValue({ ...value, query: q, facility: null })
    if (!q || q.trim().length < 2) { setResults([]); setOpen(false); return }
    tRef.current = setTimeout(async () => {
      const t = q.trim()
      const { data } = await sb.from('facilities')
        .select('id,name_ar,unified_number,gosi_number,hrsd_number,confirmation_date,opening:opening_request_id(entity_kind)')
        .is('deleted_at', null)
        .or(`unified_number.ilike.%${t}%,gosi_number.ilike.%${t}%,hrsd_number.ilike.%${t}%`)
        .order('name_ar').limit(8)
      setResults(data || []); setOpen(true)
    }, 250)
  }
  const kindLabel = (f) => f?.opening?.entity_kind === 'company' ? 'شركة' : (f?.opening?.entity_kind === 'individual' ? 'مؤسسة فردية' : null)
  // Show the number field that actually matches what the user typed (unified / GOSI / HRSD).
  const matchedNo = (r) => {
    const q = (value.query || '').replace(/\s/g, '')
    if (q && String(r.unified_number || '').replace(/\s/g, '').includes(q)) return { l: 'موحد', v: r.unified_number }
    if (q && String(r.gosi_number || '').replace(/\s/g, '').includes(q)) return { l: 'تأمينات', v: r.gosi_number }
    if (q && String(r.hrsd_number || '').replace(/\s/g, '').includes(q)) return { l: 'موارد', v: r.hrsd_number }
    return { l: 'موحد', v: r.unified_number || r.gosi_number || r.hrsd_number || '' }
  }
  return (
    <div>
      <div style={lbl}>المنشأة <span style={{ color: C.red }}>*</span></div>
      {value.facility ? (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h.01M9 12h.01M9 15h.01M9 18h.01" /></svg>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.facility.name_ar || '—'}</span>
            {kindLabel(value.facility) && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(212,160,23,.18)', color: C.gold, flexShrink: 0 }}>{kindLabel(value.facility)}</span>}
            <button type="button" onClick={() => setValue({ ...value, facility: null, query: '' })} style={xBtn}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
            {[['الرقم الموحد', value.facility.unified_number], ['التأمينات', value.facility.gosi_number], ['الموارد', value.facility.hrsd_number]].map(([k, v], i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--tx5)', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 11, color: C.gold, direction: 'ltr', fontFamily: 'monospace' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 6, background: 'rgba(0,0,0,.2)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: 9.5, color: 'var(--tx5)', marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              التأكيد السنوي
            </div>
            <div style={{ fontSize: 13, color: C.gold, direction: 'ltr', fontFamily: 'monospace', fontWeight: 700 }}>{value.facility.confirmation_date ? fmtGreg(value.facility.confirmation_date) : '—'}</div>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <SearchIcon /><input style={searchInpStyle(inp)} placeholder="ابحث بالرقم الموحد أو التأمينات أو الموارد…" value={value.query || ''} onChange={e => search(e.target.value)} onFocus={() => results.length && setOpen(true)} />
          {open && results.length > 0 && (
            <div className="sbc-dd-scroll" style={dropWrap}>
              {results.map(r => (
                <div key={r.id} onClick={() => { setValue({ ...value, facility: r }); setOpen(false) }} style={dropRow}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,160,23,.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ color: 'var(--tx2)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name_ar || '—'}</span>
                  {(() => { const m = matchedNo(r); return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}><span style={{ fontSize: 10, color: 'var(--tx5)' }}>{m.l}</span><span style={idChipStyle}>{m.v || '—'}</span></span> })()}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Add-transaction modal (direct create — no invoice) ──
function AddModal({ lang, sb, user, toast, typeByCode, newStatusId, userBranchId, onClose, onSaved }) {
  const [code, setCode] = useState('')
  const [step, setStep] = useState(1)
  // simple-form fields (non name-reserve services)
  const [tradeName, setTradeName] = useState('')
  const [crNumber, setCrNumber] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  // name-reserve wizard fields
  const [language, setLanguage] = useState('ar')
  const [reservationNo, setReservationNo] = useState('')
  const [benef, setBenef] = useState({ mode: 'search', person: null, query: '', name: '', idNumber: '' })
  const [muq, setMuq] = useState({ mode: 'search', selected: null, query: '', name: '', phone: '' })
  const [sadadNo, setSadadNo] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const fileRef = useRef(null)
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
  const isNameReserve = code === 'sbc_name_reserve'
  const isCrOpen = code === 'sbc_cr_open'
  const isCrRenew = code === 'sbc_cr_renew'
  const isCrAmend = code === 'sbc_cr_amend'
  const isDocuments = code === 'sbc_documents'
  const wizSteps = STEP_DEFS[code] || []
  const isWizard = wizSteps.length > 0
  const curStepKey = wizSteps[step - 1]?.k
  const fieldKind = code ? sbcMeta(code).field : null

  const save = async () => {
    setErrMsg('')
    if (!code) { setErrMsg('اختر نوع الخدمة'); return }
    const typeRow = typeByCode[code]
    if (!typeRow?.id) { setErrMsg('نوع الخدمة غير متوفر'); return }
    if (!newStatusId) { setErrMsg('حالة «جديد» غير متوفرة'); return }
    setSaving(true)
    try {
      if (isWizard) {
        if (!sadadNo.trim()) throw new Error('أدخل رقم السداد')
        if (!(Number(amount) > 0)) throw new Error('أدخل المبلغ')
        let beneficiaryId = null, muaqqibId = null, facilityId = null, amendmentObj = null
        if (isCrRenew || isCrAmend || isDocuments) {
          if (!fac.facility?.id) throw new Error('اختر المنشأة')
          if (isCrRenew && !newConfDate) throw new Error('أدخل تاريخ التأكيد السنوي الجديد')
          facilityId = fac.facility.id
          if (isCrAmend) {
            if (amendType === 'basic') {
              const changes = basicChanges.filter(c => c.field && String(c.value).trim())
              if (!changes.length) throw new Error('أضف حقلاً واحداً وقيمته على الأقل')
              amendmentObj = { type: 'basic', changes: changes.map(c => ({ field: c.field, value: String(c.value).trim() })) }
            } else if (amendType === 'transfer') {
              const sections = {}
              if (trOwners.enabled) { if (!trOwners.person?.id) throw new Error('اختر شخص الملاك والشركاء'); sections.owners_partners = { person_id: trOwners.person.id, name: trOwners.person.name_ar, id_number: trOwners.person.id_number } }
              if (trManagers.enabled) { if (!trManagers.person?.id) throw new Error('اختر شخص المدراء'); sections.managers = { person_id: trManagers.person.id, name: trManagers.person.name_ar, id_number: trManagers.person.id_number } }
              if (!Object.keys(sections).length) throw new Error('اختر قسماً واحداً على الأقل')
              amendmentObj = { type: 'transfer', ...sections }
            } else if (amendType === 'entity') {
              if (!entityTo) throw new Error('اختر النوع الجديد')
              amendmentObj = { type: 'entity', to: entityTo, from: fac.facility.opening?.entity_kind || null }
            }
          }
        } else {
          if (!tradeName.trim()) throw new Error(isCrOpen ? 'اسم المنشأة مطلوب' : 'الاسم التجاري المحجوز مطلوب')
          // Resolve beneficiary — existing person, or create one (dedup by id_number)
          beneficiaryId = benef.person?.id || null
          if (!beneficiaryId) {
            if (!benef.name.trim() || !benef.idNumber.trim()) throw new Error('أدخل اسم المستفيد ورقم هويته')
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
        await sb.from('transaction_fees').insert({
          service_request_id: sr.id, amount: Number(amount || 0), paid_amount: 0, status: 'pending',
          sadad_no: sadadNo.trim() || null,
          fee_label_ar: isDocuments ? (DOC_TYPES.find(d => d.v === docType)?.l || 'مستندات') : isCrAmend ? 'تعديل سجل تجاري' : isCrRenew ? 'تجديد سجل تجاري' : (isCrOpen ? 'فتح سجل تجاري' : 'حجز إسم تجاري'),
          fee_label_en: isDocuments ? 'Document' : isCrAmend ? 'Amend CR' : isCrRenew ? 'Renew CR' : (isCrOpen ? 'Open CR' : 'Trade Name Reservation'),
          notes: 'manual_pay_request', sort_order: 0,
        })
        toast?.('تمت الإضافة — انتقل إلى المدفوعات للسداد')
        onSaved()
        window.dispatchEvent(new CustomEvent('app-navigate-payments'))
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
      toast?.('تمت إضافة المعاملة'); onSaved()
    } catch (e) { setErrMsg(e.message || 'تعذر الحفظ') } finally { setSaving(false) }
  }

  const goNext = () => {
    setErrMsg('')
    if (curStepKey === 'fields') {
      if (!tradeName.trim()) { setErrMsg(isCrOpen ? 'أدخل اسم المنشأة' : 'أدخل الاسم التجاري المحجوز'); return }
      if (isNameReserve && !reservationNo.trim()) { setErrMsg('أدخل رقم الحجز'); return }
      if (isCrOpen && entityKind === 'company' && !companyForm) { setErrMsg('اختر شكل الشركة'); return }
    }
    if (curStepKey === 'facility') {
      if (!fac.facility?.id) { setErrMsg('اختر المنشأة'); return }
      if (isCrRenew && !newConfDate) { setErrMsg('أدخل تاريخ التأكيد السنوي الجديد'); return }
    }
    if (curStepKey === 'amend') {
      if (amendType === 'basic' && !basicChanges.some(c => c.field && String(c.value).trim())) { setErrMsg('أضف حقلاً وقيمته'); return }
      if (amendType === 'transfer') {
        if (!trOwners.enabled && !trManagers.enabled) { setErrMsg('اختر قسماً واحداً على الأقل'); return }
        if (trOwners.enabled && !trOwners.person?.id) { setErrMsg('اختر شخص الملاك والشركاء'); return }
        if (trManagers.enabled && !trManagers.person?.id) { setErrMsg('اختر شخص المدراء'); return }
      }
      if (amendType === 'entity' && !entityTo) { setErrMsg('اختر النوع الجديد'); return }
    }
    if (curStepKey === 'parties' && !(benef.person || (benef.name.trim() && benef.idNumber.trim()))) { setErrMsg('أدخل بيانات المستفيد أو اختره'); return }
    setStep(s => Math.min(wizSteps.length, s + 1))
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500, padding: 16, fontFamily: F, direction: 'rtl' }
  const box = { background: '#1a1a1a', borderRadius: 18, width: 560, maxWidth: '95vw', height: 600, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)' }
  const fieldset = { position: 'relative', borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', padding: '20px 16px 16px' }
  const legend = { position: 'absolute', top: -9, right: 14, background: '#1a1a1a', padding: '0 8px', fontSize: 12, fontWeight: 800, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }
  const lbl = { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.6)', marginBottom: 8, textAlign: 'start' }
  const inp = { ...sF, textAlign: 'center' }

  return (
    <div style={overlay}>
      <div onClick={e => e.stopPropagation()} style={box}>
        {/* Top bar */}
        <div style={{ padding: '20px 24px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ color: C.gold, flexShrink: 0, display: 'inline-flex' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3h11l5 5v13H4z" /><path d="M15 3v5h5" /><path d="M8 13h8M8 17h6" /></svg>
              </span>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--tx)', lineHeight: 1.2 }}>معاملة جديدة</div>
            </div>
            <button onClick={onClose} aria-label="إغلاق"
              onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(180deg,rgba(192,57,43,.18) 0%,rgba(192,57,43,.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.4)'; e.currentTarget.style.color = '#e5867a' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(180deg,#323232 0%,#262626 100%)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.color = 'var(--tx3)' }}
              style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', border: '1px solid rgba(255,255,255,.07)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', transition: '.2s' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          {isWizard && (
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {wizSteps.map((s, i) => <div key={s.k} style={{ flex: 1, height: 3, borderRadius: 4, background: i < step ? 'linear-gradient(90deg, #D4A017, #F0C040)' : 'rgba(255,255,255,.06)', transition: '.35s' }} />)}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="sbc-dd-scroll" style={{ padding: '8px 24px 14px', overflowY: 'auto', flex: 1, minHeight: 0, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {isWizard ? (
            <div style={fieldset}>
              <div style={legend}><span>{wizSteps[step - 1]?.l}</span></div>

              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={lbl}>نوع الخدمة <span style={{ color: C.red }}>*</span></div>
                    <Drop value={code} onChange={v => { setErrMsg(''); setStep(1); setCode(v) }} placeholder="— اختر —" options={SBC_CODES.map(c => ({ v: c, l: sbcMeta(c).ar }))} />
                  </div>
                  {isNameReserve && (<>
                    <div>
                      <div style={lbl}>اللغة <span style={{ color: C.red }}>*</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => setLanguage('ar')} style={segBtn(language === 'ar')}>عربي</button>
                        <button type="button" onClick={() => setLanguage('en')} style={segBtn(language === 'en')}>إنجليزي</button>
                      </div>
                    </div>
                    <div><div style={lbl}>الاسم التجاري المحجوز <span style={{ color: C.red }}>*</span></div><input style={inp} value={tradeName} onChange={e => setTradeName(e.target.value)} placeholder={language === 'en' ? 'e.g. Horizon Co.' : 'مثال: مؤسسة الأفق'} /></div>
                    <div><div style={lbl}>رقم الحجز <span style={{ color: C.red }}>*</span></div><input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr' }} dir="ltr" value={reservationNo} onChange={e => setReservationNo(e.target.value)} placeholder="—" /></div>
                  </>)}
                  {isCrOpen && (<>
                    <div>
                      <div style={lbl}>النوع <span style={{ color: C.red }}>*</span></div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => setEntityKind('individual')} style={segBtn(entityKind === 'individual')}>مؤسسة فردية</button>
                        <button type="button" onClick={() => setEntityKind('company')} style={segBtn(entityKind === 'company')}>شركة</button>
                      </div>
                    </div>
                    {entityKind === 'company' && (
                      <div>
                        <div style={lbl}>شكل الشركة <span style={{ color: C.red }}>*</span></div>
                        <Drop value={companyForm} onChange={v => { setErrMsg(''); setCompanyForm(v) }} placeholder="— اختر —" options={COMPANY_FORMS} />
                      </div>
                    )}
                    <div><div style={lbl}>اسم المنشأة <span style={{ color: C.red }}>*</span></div><input style={inp} value={tradeName} onChange={e => setTradeName(e.target.value)} placeholder="مثال: مؤسسة الأفق للتجارة" /></div>
                  </>)}
                  {isDocuments && (
                    <div>
                      <div style={lbl}>الوثيقة <span style={{ color: C.red }}>*</span></div>
                      <Drop value={docType} onChange={v => { setErrMsg(''); setDocType(v) }} placeholder="— اختر —" options={DOC_TYPES} />
                    </div>
                  )}
                  {(isCrRenew || isCrAmend || isDocuments) && (
                    <FacilityField sb={sb} value={fac} setValue={setFac} inp={inp} lbl={lbl} />
                  )}
                  {isCrRenew && (
                    <div><div style={lbl}>تاريخ التأكيد السنوي الجديد <span style={{ color: C.red }}>*</span></div>
                      <DateField value={newConfDate} onChange={setNewConfDate} /></div>
                  )}
                </div>
              )}

              {curStepKey === 'parties' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <BeneficiaryField sb={sb} value={benef} setValue={setBenef} inp={inp} lbl={lbl} />
                  <MuaqqibField sb={sb} value={muq} setValue={setMuq} inp={inp} lbl={lbl} />
                </div>
              )}

              {curStepKey === 'amend' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={lbl}>نوع التعديل <span style={{ color: C.red }}>*</span></div>
                    <Drop value={amendType} onChange={v => { setErrMsg(''); setAmendType(v) }} placeholder="— اختر —"
                      options={[{ v: 'basic', l: 'تغيير بيانات أساسية' }, { v: 'transfer', l: 'نقل السجل التجاري' }, { v: 'entity', l: 'نوع وكيان السجل التجاري' }]} />
                  </div>

                  {amendType === 'basic' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {basicChanges.map((c, i) => {
                        const used = basicChanges.map((x, j) => j !== i ? x.field : null).filter(Boolean)
                        const opts = AMEND_BASIC_FIELDS.filter(f => !used.includes(f.v))
                        return (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ flex: '0 0 44%' }}>
                              <Drop value={c.field} onChange={v => setBasicChanges(arr => arr.map((x, j) => j === i ? { ...x, field: v } : x))} placeholder="الحقل" options={opts} />
                            </div>
                            <input style={{ ...inp, flex: 1, textAlign: 'start' }} value={c.value} onChange={e => setBasicChanges(arr => arr.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="القيمة الجديدة" />
                            {basicChanges.length > 1 && <button type="button" onClick={() => setBasicChanges(arr => arr.filter((_, j) => j !== i))} style={{ ...xBtn, height: 38, width: 32 }}>✕</button>}
                          </div>
                        )
                      })}
                      {basicChanges.length < AMEND_BASIC_FIELDS.length && (
                        <button type="button" onClick={() => setBasicChanges(arr => [...arr, { field: '', value: '' }])} style={{ alignSelf: 'flex-start', height: 34, padding: '0 14px', borderRadius: 9, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ إضافة حقل</button>
                      )}
                    </div>
                  )}

                  {amendType === 'transfer' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <button type="button" onClick={() => setTrOwners(s => ({ ...s, enabled: !s.enabled }))} style={{ ...segBtn(trOwners.enabled), width: '100%' }}>الملاك والشركاء</button>
                        {trOwners.enabled && <div style={{ marginTop: 10 }}><BeneficiaryField sb={sb} value={trOwners} setValue={setTrOwners} inp={inp} lbl={lbl} label="شخص الملاك والشركاء" searchOnly /></div>}
                      </div>
                      <div>
                        <button type="button" onClick={() => setTrManagers(s => ({ ...s, enabled: !s.enabled }))} style={{ ...segBtn(trManagers.enabled), width: '100%' }}>المدراء</button>
                        {trManagers.enabled && <div style={{ marginTop: 10 }}><BeneficiaryField sb={sb} value={trManagers} setValue={setTrManagers} inp={inp} lbl={lbl} label="شخص المدراء" searchOnly /></div>}
                      </div>
                    </div>
                  )}

                  {amendType === 'entity' && (() => {
                    const cur = fac.facility?.opening?.entity_kind
                    const opts = ENTITY_TYPES.filter(t => t.v !== cur)
                    return (
                      <div>
                        <div style={lbl}>النوع الجديد <span style={{ color: C.red }}>*</span></div>
                        <Drop value={entityTo} onChange={v => { setErrMsg(''); setEntityTo(v) }} placeholder="— اختر —" options={opts} />
                        {cur && <div style={{ fontSize: 11, color: 'var(--tx4)', marginTop: 6 }}>النوع الحالي: {cur === 'company' ? 'شركة' : 'مؤسسة فردية'} (لا يمكن اختياره)</div>}
                      </div>
                    )
                  })()}
                </div>
              )}

              {curStepKey === 'payment' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div><div style={lbl}>رقم السداد <span style={{ color: C.red }}>*</span></div><input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr' }} dir="ltr" value={sadadNo} onChange={e => setSadadNo(e.target.value)} placeholder="—" /></div>
                  <div><div style={lbl}>المبلغ <span style={{ color: C.red }}>*</span></div><input type="text" inputMode="decimal" style={{ ...inp, fontFamily: 'monospace', direction: 'ltr' }} dir="ltr" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" /></div>
                  <div style={{ fontSize: 11.5, color: 'var(--tx4)', display: 'flex', alignItems: 'center', gap: 7, lineHeight: 1.6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    سيتم إنشاء رسم بانتظار السداد ثم الانتقال إلى صفحة المدفوعات.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={fieldset}>
              <div style={legend}><span>الخدمة</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={lbl}>نوع الخدمة <span style={{ color: C.red }}>*</span></div>
                  <Drop value={code} onChange={v => { setErrMsg(''); setCode(v) }} placeholder="— اختر —" options={SBC_CODES.map(c => ({ v: c, l: sbcMeta(c).ar }))} />
                </div>
                {fieldKind === 'trade_name' && (
                  <div><div style={lbl}>الاسم التجاري</div><input style={inp} value={tradeName} onChange={e => setTradeName(e.target.value)} placeholder="مثال: مؤسسة الأفق" /></div>
                )}
                {fieldKind === 'cr_number' && (
                  <div><div style={lbl}>رقم السجل التجاري</div><input style={{ ...inp, fontFamily: 'monospace', direction: 'ltr' }} dir="ltr" value={crNumber} onChange={e => setCrNumber(e.target.value)} placeholder="1010xxxxxx" /></div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <style>{`.nu-nav-btn{height:40px;padding:0 6px;background:transparent;border:none;color:${C.gold};font-family:${F};font-size:15px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:.2s}.nu-nav-btn .nav-ico{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);display:flex;align-items:center;justify-content:center;transition:.2s;color:${C.gold}}.nu-nav-btn:hover:not(:disabled) .nav-ico{background:${C.gold};color:#000}.nu-nav-btn:disabled{opacity:.5;cursor:not-allowed}.sbc-dd-scroll::-webkit-scrollbar{width:0;height:0;display:none}`}</style>
        <div style={{ padding: '12px 24px 16px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ justifySelf: 'start' }}>
            {isWizard && step > 1 && (
              <button onClick={() => { setErrMsg(''); setStep(s => Math.max(1, s - 1)) }} className="nu-nav-btn" style={{ flexDirection: 'row-reverse' }}>
                <span>السابق</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg></span>
              </button>
            )}
          </div>
          <div style={{ justifySelf: 'center', textAlign: 'center', minHeight: 16 }}>
            {errMsg && <span style={{ fontSize: 12, fontWeight: 500, color: C.red, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {errMsg}
            </span>}
          </div>
          <div style={{ justifySelf: 'end' }}>
            {isWizard && step < wizSteps.length ? (
              <button onClick={goNext} disabled={!code} className="nu-nav-btn">
                <span>التالي</span>
                <span className="nav-ico"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg></span>
              </button>
            ) : (
              <button onClick={save} disabled={saving || !code} className="nu-nav-btn">
                <span>{saving ? 'جارٍ الإرسال…' : (isWizard ? 'إرسال' : 'إضافة')}</span>
                <span className="nav-ico"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg></span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
