import React, { useEffect, useMemo, useState } from 'react'
import BackButton from '../components/BackButton'
import { Dropdown, DateField, sF } from '../components/persons/PersonFormModal'
import { Modal as FKModal, ModalSection as FKSection, Select as FKSelect, TextField as FKText, CurrencyField as FKCurrency } from '../components/ui/FormKit.jsx'
import { FileText } from 'lucide-react'

// ── المركز السعودي-style transactions page, for municipal licenses (رخص بلدي)
//    and safety certificates (شهادات السلامة). Backed by service_requests filtered
//    to the four baladi service-type codes. Mirrors SbcCenterPage's layout. ──
const F = "'Cairo','Tajawal',sans-serif"
const MONO = "'JetBrains Mono','Cairo',sans-serif"
const C = { gold: '#D4A017', red: '#c0392b', blue: '#3483b4', ok: '#27a046', purple: '#bb8fce', orange: '#f39c12', cyan: '#16a085', gray: '#95a5a6', warn: '#eab308' }
const nm = v => Number(v || 0).toLocaleString('en-US')
const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }

const Drop = ({ value, onChange, options, placeholder, searchable }) => (
  <Dropdown value={value} onChange={(k) => onChange(k)} options={options || []}
    getKey={o => o.v} getLabel={o => o.l} placeholder={placeholder}
    searchable={searchable ?? ((options || []).length > 5)} />
)
const LBL = { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.58)', marginBottom: 5, textAlign: 'start' }

const BALADI_CODES = ['baladi_license_issue', 'baladi_license_renew', 'safety_cert_issue', 'safety_cert_renew']
const BALADI_META = {
  baladi_license_issue: { ar: 'إصدار رخصة بلدية', c: C.ok },
  baladi_license_renew: { ar: 'تجديد رخصة بلدية', c: C.gold },
  safety_cert_issue:    { ar: 'إصدار شهادة سلامة', c: C.blue },
  safety_cert_renew:    { ar: 'تجديد شهادة سلامة', c: C.purple },
}
const meta = (code) => BALADI_META[code] || { ar: code, c: C.gray }
const STATUS_THEME = {
  new: { c: C.blue, ar: 'جديد' }, in_progress: { c: C.gold, ar: 'قيد التنفيذ' },
  on_hold: { c: C.warn, ar: 'معلق' }, done: { c: C.ok, ar: 'منجز' }, cancelled: { c: C.red, ar: 'ملغي' },
}
const fmtGreg = (iso) => { if (!iso) return '—'; try { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` } catch { return '—' } }

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

export default function BaladiCenterPage({ sb, user, toast, lang, branchId }) {
  const userBranchId = branchId || null
  const [types, setTypes] = useState([])
  const [statuses, setStatuses] = useState([])
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
        sb.from('lookup_items').select('id,code,value_ar,value_en').in('code', BALADI_CODES),
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
      .select('id,request_ref_no,request_date,created_at,note,trade_name,cr_number,service_type_id,facility_id,new_confirmation_date,status:status_id(code,value_ar),facility:facility_id(name_ar,unified_number)')
      .is('deleted_at', null).in('service_type_id', ids)
      .order('request_date', { ascending: false, nullsFirst: false }).limit(300)
    if (userBranchId) qb = qb.eq('branch_id', userBranchId)
    const { data, error } = await qb
    if (error) { toast?.('تعذر تحميل المعاملات', 'error'); setRows([]); setLoading(false); return }
    setRows(data || []); setLoading(false)
  }, [sb, types, userBranchId]) // eslint-disable-line
  useEffect(() => { reload() }, [reload])

  const rowName = (r) => r.facility?.name_ar || r.trade_name || r.cr_number || '—'
  const filtered = useMemo(() => {
    const s = q.trim()
    if (!s) return rows
    return rows.filter(r => [r.request_ref_no, r.cr_number, r.note, r.facility?.name_ar, r.facility?.unified_number].some(v => (v || '').includes(s)))
  }, [rows, q])

  const dist = useMemo(() => BALADI_CODES.map(code => ({ code, m: meta(code), cnt: rows.filter(r => typeById[r.service_type_id]?.code === code).length })).filter(d => d.cnt > 0), [rows, typeById])
  const doneCount = rows.filter(r => r.status?.code === 'done').length

  if (selectedId) {
    const row = rows.find(r => r.id === selectedId)
    return <BaladiDetail sb={sb} user={user} toast={toast} row={row} type={row ? typeById[row.service_type_id] : null}
      statuses={statuses} onBack={() => setSelectedId(null)} onChanged={reload} />
  }

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <style>{`
        .sbc-hero-grid{display:grid;grid-template-columns:1.8fr 1fr;gap:14px;margin-bottom:24px}
        @media (max-width:720px){.sbc-hero-grid{grid-template-columns:1fr}}
      `}</style>

      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>الرخص البلدية وشهادات السلامة</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>إصدار وتجديد رخص البلدية وشهادات السلامة للمنشآت. المعاملات تُضاف مباشرة من هذه الصفحة.</div>
        </div>
        <button onClick={() => setShowAdd(true)}
          onMouseEnter={e => { e.currentTarget.style.borderStyle = 'solid'; e.currentTarget.style.background = 'rgba(212,160,23,.12)' }}
          onMouseLeave={e => { e.currentTarget.style.borderStyle = 'dashed'; e.currentTarget.style.background = 'transparent' }}
          style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: '1px dashed rgba(212,160,23,.5)', color: C.gold, fontFamily: F, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease' }}>
          إضافة معاملة
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

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
                  {dist.map((r) => { const dash = (r.cnt / total) * CIRC; const seg = (<circle key={r.code} r={R} fill="none" stroke={r.m.c} strokeWidth="11" strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-offset} style={{ transition: 'stroke-dasharray .3s' }}><title>{`${r.m.ar}: ${r.cnt}`}</title></circle>); offset += dash; return seg })}
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" transform="rotate(90)" style={{ fill: '#fff', fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{nm(rows.length)}</text>
                </svg>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 6, minWidth: 0 }}>
                  {dist.length === 0 ? <span style={{ fontSize: 11, color: 'var(--tx5)' }}>—</span> : dist.map((r) => (
                    <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, minWidth: 0 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.m.c, flexShrink: 0 }} />
                      <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.m.ar}</span>
                      <span style={{ color: r.m.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', flexShrink: 0, fontWeight: 700 }}>{nm(r.cnt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--tx4)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالمرجع أو المنشأة أو رقم الرخصة…"
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 50, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>جاري التحميل…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {q ? 'لا نتائج مطابقة' : 'لا توجد معاملات بعد — اضغط «إضافة معاملة».'}
        </div>
      ) : (
        <BaladiTable rows={filtered} typeById={typeById} rowName={rowName} onRowClick={setSelectedId} />
      )}

      {showAdd && <AddModal sb={sb} user={user} toast={toast} typeByCode={typeByCode} newStatusId={newStatusId} userBranchId={userBranchId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); reload() }} />}
    </div>
  )
}

function BaladiTable({ rows, typeById, rowName, onRowClick }) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden' }}>
      <style>{`
.sbc-tbl{width:100%;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
.sbc-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12px;font-weight:700;text-align:center;padding:14px 12px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
.sbc-tbl tbody td{padding:13px 12px;font-size:12px;color:#fff;text-align:center;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.03)}
.sbc-tbl tbody tr{cursor:pointer;transition:background .12s}
.sbc-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
.sbc-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
.sbc-tbl tbody tr:last-child td{border-bottom:none}
      `}</style>
      <table className="sbc-tbl">
        <thead>
          <tr><th>التاريخ</th><th>نوع الخدمة</th><th>المنشأة / الرخصة</th><th>المرجع</th><th>الحالة</th></tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const m = meta(typeById[r.service_type_id]?.code)
            const st = STATUS_THEME[r.status?.code] || { c: C.gray, ar: r.status?.value_ar || '—' }
            return (
              <tr key={r.id} onClick={() => onRowClick(r.id)} title={rowName(r)}>
                <td><span style={{ direction: 'ltr', fontFamily: MONO, color: 'var(--tx2)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtGreg(r.request_date)}</span></td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 11px', borderRadius: 7, background: m.c + '18', border: '1px solid ' + m.c + '38', color: m.c, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.c, flexShrink: 0 }} />{m.ar}
                  </span>
                </td>
                <td><span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.92)' }}>{rowName(r)}</span></td>
                <td><span style={{ direction: 'ltr', fontFamily: MONO, fontWeight: 700, color: C.gold }}>#{r.request_ref_no}</span></td>
                <td>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: st.c, background: tint(st.c, 0.12), border: `1px solid ${tint(st.c, 0.3)}`, borderRadius: 8, padding: '5px 12px', whiteSpace: 'nowrap' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.c }} />{st.ar}
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

// ── Add transaction ──
function AddModal({ sb, user, toast, typeByCode, newStatusId, userBranchId, onClose, onSaved }) {
  const [f, setF] = useState({ code: '', facility_id: '', facility_label: '', license_number: '', amount: '', sadad: '' })
  const [saving, setSaving] = useState(false)
  const [facQ, setFacQ] = useState('')
  const [facRes, setFacRes] = useState([])
  const [licQ, setLicQ] = useState('')      // renewal: search existing licenses
  const [licRes, setLicRes] = useState([])
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const isRenew = f.code === 'baladi_license_renew' || f.code === 'safety_cert_renew'

  // Facility search (issue) — by name / unified / CR number.
  useEffect(() => {
    if (!sb) return
    const s = facQ.trim()
    if (s.length < 2) { setFacRes([]); return }
    const t = setTimeout(async () => {
      const { data } = await sb.from('facilities').select('id,name_ar,unified_number,cr_number')
        .or(`name_ar.ilike.%${s}%,unified_number.ilike.%${s}%,cr_number.ilike.%${s}%`).is('deleted_at', null).limit(8)
      setFacRes(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [sb, facQ])

  // Renewal: search prior baladi transactions by license number / reference.
  useEffect(() => {
    if (!sb || !isRenew) return
    const s = licQ.trim()
    if (s.length < 2) { setLicRes([]); return }
    const ids = BALADI_CODES.map(c => typeByCode[c]?.id).filter(Boolean)
    const t = setTimeout(async () => {
      const { data } = await sb.from('service_requests')
        .select('id,request_ref_no,cr_number,facility_id,facility:facility_id(name_ar,unified_number)')
        .is('deleted_at', null).in('service_type_id', ids)
        .or(`cr_number.ilike.%${s}%,request_ref_no.ilike.%${s}%`).limit(8)
      setLicRes(data || [])
    }, 250)
    return () => clearTimeout(t)
  }, [sb, licQ, isRenew]) // eslint-disable-line

  const valid = !!f.code && !!f.facility_id && Number(f.amount) > 0
  const save = async () => {
    if (!valid) { toast?.('أكمل الخدمة والمنشأة والمبلغ', 'error'); return }
    setSaving(true)
    try {
      const ref = String(Date.now()).slice(-10)
      const { data: sr, error } = await sb.from('service_requests').insert({
        request_ref_no: ref, branch_id: userBranchId || null,
        service_type_id: typeByCode[f.code]?.id, status_id: newStatusId,
        facility_id: f.facility_id, cr_number: f.license_number.trim() || null,
        request_date: new Date().toISOString(), created_by: user?.id || null,
      }).select('id').single()
      if (error || !sr?.id) throw error || new Error('insert failed')
      // Pending fee → surfaces in المدفوعات for settlement.
      await sb.from('transaction_fees').insert({
        service_request_id: sr.id, amount: Number(f.amount) || 0, paid_amount: 0, status: 'pending',
        sadad_no: f.sadad.trim() || null, fee_label_ar: meta(f.code).ar, notes: 'manual_pay_request', sort_order: 0,
      })
      toast?.('تمت الإضافة — انتقل إلى المدفوعات للسداد'); onSaved()
      window.dispatchEvent(new CustomEvent('app-navigate-payments'))
    } catch (e) {
      toast?.('تعذّر الحفظ: ' + (e.message || '').slice(0, 80), 'error'); setSaving(false)
    }
  }

  const lblS = { fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,.55)', marginBottom: 8, textAlign: 'start' }
  const selectedFacility = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 10, background: tint(C.gold, .08), border: `1px solid ${tint(C.gold, .3)}` }}>
      <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{f.facility_label}{f.license_number ? <span style={{ color: 'var(--tx4)', fontWeight: 600, marginInline: 6, fontFamily: MONO, direction: 'ltr' }}>· {f.license_number}</span> : null}</span>
      <button type="button" onClick={() => setF(p => ({ ...p, facility_id: '', facility_label: '', license_number: '' }))} style={{ background: 'transparent', border: 'none', color: C.gold, fontFamily: F, fontSize: 11, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>تغيير</button>
    </div>
  )

  return (
    <FKModal open onClose={onClose} accent={C.gold} width={560} scroll title="إضافة معاملة" Icon={FileText}
      footer={<button onClick={save} disabled={saving || !valid}
        style={{ height: 40, padding: '0 18px', borderRadius: 10, background: valid ? 'rgba(212,160,23,.12)' : 'transparent', border: '1px solid ' + (valid ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.1)'), color: valid ? C.gold : 'var(--tx5)', fontFamily: F, fontSize: 13, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed' }}>
        {saving ? 'جاري الحفظ...' : 'إضافة'}</button>}>
      <FKSection Icon={FileText} label="بيانات المعاملة">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FKSelect label="نوع الخدمة" req searchable={false} value={f.code}
          onChange={v => setF(p => ({ ...p, code: v, facility_id: '', facility_label: '', license_number: '' }))}
          options={BALADI_CODES.map(c => ({ k: c, l: meta(c).ar }))} getKey={o => o.k} getLabel={o => o.l} placeholder="اختر الخدمة..." />

        {isRenew ? (
          <div>
            <div style={lblS}>رقم الرخصة <span style={{ color: C.red }}>*</span> <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600 }}>(بحث في الرخص الحالية)</span></div>
            {f.facility_id ? selectedFacility : (
              <>
                <input value={licQ} onChange={e => setLicQ(e.target.value)} placeholder="ابحث برقم الرخصة أو المرجع…" dir="ltr"
                  style={{ ...sF, fontWeight: 600, direction: 'ltr', textAlign: 'right', fontFamily: MONO }} />
                {licRes.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {licRes.map(r => (
                      <button key={r.id} type="button" onClick={() => setF(p => ({ ...p, facility_id: r.facility_id || '', facility_label: r.facility?.name_ar || '—', license_number: r.cr_number || r.request_ref_no }))}
                        style={{ textAlign: 'start', cursor: 'pointer', fontFamily: F, padding: '10px 12px', borderRadius: 10, background: tint(C.gold, .1), border: `1px solid ${tint(C.gold, .28)}`, color: 'var(--tx)' }}>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{r.facility?.name_ar || '—'}</div>
                        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--tx4)', direction: 'ltr', textAlign: 'right', fontFamily: MONO }}>{r.cr_number || ('#' + r.request_ref_no)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div>
            <div style={lblS}>المنشأة <span style={{ color: C.red }}>*</span></div>
            {f.facility_id ? selectedFacility : (
              <>
                <input value={facQ} onChange={e => setFacQ(e.target.value)} placeholder="ابحث باسم المنشأة أو الرقم الموحّد…"
                  style={{ ...sF, fontWeight: 600 }} />
                {facRes.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                    {facRes.map(r => (
                      <button key={r.id} type="button" onClick={() => setF(p => ({ ...p, facility_id: r.id, facility_label: r.name_ar || r.unified_number || '—' }))}
                        style={{ textAlign: 'start', cursor: 'pointer', fontFamily: F, padding: '10px 12px', borderRadius: 10, background: tint(C.gold, .1), border: `1px solid ${tint(C.gold, .28)}`, color: 'var(--tx)' }}>
                        <div style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>{r.name_ar || '—'}</div>
                        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--tx4)', direction: 'ltr', textAlign: 'right', fontFamily: MONO }}>{r.unified_number || r.cr_number || ''}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 14 }}>
          <FKCurrency label="المبلغ" req value={f.amount} onChange={v => set('amount', v)} />
          <FKText label="رقم السداد" dir="ltr" value={f.sadad} onChange={v => set('sadad', v)} />
        </div>
      </div>
      </FKSection>
    </FKModal>
  )
}

// ── Detail page ──
function BaladiDetail({ sb, user, toast, row, type, statuses, onBack, onChanged }) {
  const [atts, setAtts] = useState([])
  const [busy, setBusy] = useState(false)
  if (!row) { onBack(); return null }
  const m = meta(type?.code)
  const st = STATUS_THEME[row.status?.code] || { c: C.gray, ar: row.status?.value_ar || '—' }

  useEffect(() => {
    let alive = true
    sb.from('attachments').select('id,file_name,file_url,created_at').eq('entity_type', 'service_request').eq('entity_id', row.id).order('created_at', { ascending: false })
      .then(({ data }) => { if (alive) setAtts(data || []) })
    return () => { alive = false }
  }, [sb, row.id])

  const setStatus = async (id) => { const { error } = await sb.from('service_requests').update({ status_id: id }).eq('id', row.id); if (error) { toast?.('تعذّر التحديث', 'error'); return } toast?.('تم تحديث الحالة'); onChanged?.() }
  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
      const path = `service_requests/${row.id}/${Date.now()}_${safe}`
      const { error: ue } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
      if (ue) throw ue
      const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
      const { data: ins } = await sb.from('attachments').insert({ entity_type: 'service_request', entity_id: row.id, file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: file.type || null, size_bytes: file.size || null, notes: 'baladi_doc' }).select('id,file_name,file_url,created_at').single()
      if (ins) setAtts(p => [ins, ...p])
      toast?.('تم رفع الملف')
    } catch (e) { toast?.('تعذّر رفع الملف', 'error') } finally { setBusy(false) }
  }

  const card = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }
  const cardHead = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }
  const fields = [
    { l: 'المنشأة', v: row.facility?.name_ar || '—' },
    { l: 'الرقم الموحّد', v: row.facility?.unified_number || '—', mono: true },
    { l: 'رقم الرخصة / الشهادة', v: row.cr_number || '—', mono: true },
    { l: 'تاريخ الانتهاء', v: fmtGreg(row.new_confirmation_date), mono: true },
    { l: 'تاريخ الطلب', v: fmtGreg(row.request_date), mono: true },
    { l: 'ملاحظات', v: row.note || '—' },
  ]

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      <div style={{ marginBottom: 16 }}><BackButton onClick={onBack} label="رجوع" /></div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{row.facility?.name_ar || meta(type?.code).ar}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 11px', borderRadius: 7, background: m.c + '18', border: '1px solid ' + m.c + '38', color: m.c, fontSize: 11.5, fontWeight: 700 }}>{m.ar}</span>
        <span style={{ direction: 'ltr', fontFamily: MONO, fontWeight: 700, color: C.gold }}>#{row.request_ref_no}</span>
        <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: st.c, background: tint(st.c, .12), border: `1px solid ${tint(st.c, .3)}`, borderRadius: 8, padding: '5px 12px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.c }} />{st.ar}
        </span>
      </div>

      <div style={card}>
        <div style={cardHead}><span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>تفاصيل المعاملة</span></div>
        <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {fields.map((x, i) => (
            <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}>
              <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4 }}>{x.l}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx2)', direction: x.mono ? 'ltr' : 'rtl', textAlign: x.mono ? 'left' : 'right', fontFamily: x.mono ? MONO : F }}>{x.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={cardHead}><span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>الحالة</span></div>
        <div style={{ padding: '14px 22px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {statuses.filter(s => STATUS_THEME[s.code]).map(s => {
            const sel = row.status?.code === s.code; const th = STATUS_THEME[s.code]
            return (
              <button key={s.id} onClick={() => setStatus(s.id)}
                style={{ padding: '7px 14px', borderRadius: 9, cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700, color: sel ? '#000' : th.c, background: sel ? th.c : tint(th.c, .12), border: `1px solid ${tint(th.c, .35)}` }}>
                {th.ar}
              </button>
            )
          })}
        </div>
      </div>

      <div style={card}>
        <div style={cardHead}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>المستندات</span>
          <label style={{ height: 32, padding: '0 12px', borderRadius: 9, background: tint(C.gold, .1), border: `1px solid ${tint(C.gold, .35)}`, color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {busy ? 'جارٍ الرفع…' : 'إرفاق ملف'}
            <input type="file" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0])} accept="image/*,application/pdf" />
          </label>
        </div>
        <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {atts.length === 0 ? <div style={{ color: 'var(--tx5)', fontSize: 12, textAlign: 'center', padding: 8 }}>لا توجد مستندات.</div> : atts.map(a => (
            <a key={a.id} href={a.file_url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 9, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', color: C.blue, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              <span style={{ flex: 1, color: 'var(--tx2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
