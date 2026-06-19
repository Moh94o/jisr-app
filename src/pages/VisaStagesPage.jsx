import React, { useState, useEffect } from 'react'
import BackButton from '../components/BackButton'
import { noDash } from '../lib/utils.js'
import { Modal, ModalSection, TextField, CurrencyField, FileField, GRID } from '../components/ui/FormKit.jsx'
import { SkeletonCards, SkeletonTable } from '../components/ui/Skeleton.jsx'
import { Wallet, Upload, IdCard, Truck, Building2, FileText, Landmark } from 'lucide-react'

// Post-visa lifecycle tabs (permanent work visas) — each tab mirrors the Work-Visas tab:
// stats header + search + a transactions TABLE; clicking a row opens a DISPLAY-ONLY detail
// page in the same layout as the work-visa transaction detail. Every display card carries
// its own button that opens a FormKit popup (نافذة منبثقة) holding that card's inputs —
// the page itself never hosts raw inputs.
const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#D4A017', blue: '#5dade2', cyan: '#16a085', purple: '#bb8fce', ok: '#2ecc71', warn: '#eab308', red: '#e87265', orange: '#f39c12' }
const cardChrome = { background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }
const cardHeader = { padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }
const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
const fm = v => Number(v || 0).toLocaleString('en-US')
const fmtGreg = iso => { if (!iso) return '—'; try { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` } catch { return '—' } }

const pill = c => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, color: c, background: c + '1f', border: '1px solid ' + c + '55' })
const tinyLbl = { fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.3px' }

const CheckIco = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
const ClockIco = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
const DocIco = ({ s = 26 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>

/* زر فتح النافذة — يسكن في رأس كرت العرض الخاص به */
const CardBtn = ({ onClick, children, disabled = false, color = C.gold }) => (
  <button type="button" disabled={disabled} onClick={onClick}
    style={{ height: 30, padding: '0 13px', borderRadius: 8, background: disabled ? 'transparent' : color + '12', border: '1px solid ' + (disabled ? 'rgba(255,255,255,.08)' : color + '55'), color: disabled ? 'var(--tx4)' : color, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: F, fontSize: 11.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = color + '22' }}
    onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = color + '12' }}>
    {children}
  </button>
)
const PlusIco = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>

function CopyRefBtn({ value }) {
  const [done, setDone] = useState(false)
  const copy = e => {
    e.stopPropagation()
    try { navigator.clipboard?.writeText(String(value || '')) } catch {}
    setDone(true); setTimeout(() => setDone(false), 1300)
  }
  return (
    <button onClick={copy} title="نسخ" onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }} onMouseLeave={e => { if (!done) e.currentTarget.style.color = 'var(--tx4)' }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: done ? C.ok : 'var(--tx4)', display: 'inline-flex', alignItems: 'center', padding: 2, lineHeight: 0, transition: 'color .15s' }}>
      {done
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
    </button>
  )
}

const Row = ({ label, value, mono, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10 }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
    <span style={{ fontSize: 13, color: color || 'var(--tx2)', fontVariantNumeric: mono ? 'tabular-nums' : undefined, fontFamily: mono ? 'monospace' : F, fontWeight: 600, direction: mono ? 'ltr' : undefined }}>{value || '—'}</span>
  </div>
)

/* قائمة ملفات للعرض فقط — الرفع يتم من النوافذ المنبثقة */
const FilesList = ({ label, files }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={tinyLbl}>{label}</span>
    {(files || []).length === 0 && <span style={{ fontSize: 11.5, color: 'var(--tx5)', fontWeight: 600 }}>—</span>}
    {(files || []).map(a => (
      <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.04)', textDecoration: 'none' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style={{ flex: 1, minWidth: 0, fontSize: 11, color: 'var(--tx2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name || '—'}</span>
      </a>
    ))}
  </div>
)

/* رفع مرفق — مشترك لكل النوافذ */
async function uploadAttachment(sb, user, entityType, entityId, kind, file) {
  const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
  const path = `${entityType}/${entityId}/${kind}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
  const { error: e1 } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
  if (e1) throw e1
  const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
  const { error: e2 } = await sb.from('attachments').insert({
    entity_type: entityType, entity_id: entityId,
    file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
    mime_type: file.type || null, size_bytes: file.size || null, notes: kind, uploaded_by: user?.id || null,
  })
  if (e2) throw e2
}

/* إدراج طلب سداد / سداد بطاقة — مشترك */
async function insertFee(sb, user, { setting, labelFallbackAr, srId, facilityId, visaAppId, iqamaAppId, sadad, amount, bankMsg, card = false, needsReview = false }) {
  const { error } = await sb.from('transaction_fees').insert({
    service_request_id: srId || null,
    facility_id: facilityId || null,
    visa_application_id: visaAppId || null,
    iqama_application_id: iqamaAppId || null,
    fee_label_ar: setting?.label_ar || labelFallbackAr,
    fee_label_en: setting?.label_en || null,
    amount: Number(amount),
    sadad_no: card ? null : String(sadad).trim(),
    bank_reference: card ? String(bankMsg).trim() : null,
    status: card ? 'paid' : 'pending',
    paid_amount: card ? Number(amount) : 0,
    payment_date: card ? new Date().toISOString() : null,
    notes: 'manual_pay_request',
    needs_review: needsReview,
    created_by: user?.id || null,
  })
  if (error) throw error
}

/* ─── نافذة سداد موحدة: طلب سداد (سداد/مبلغ) أو سداد بالبطاقة (رسالة بنك/مبلغ) ─── */
function FeeModal({ sb, user, toast, T, title, feeCode, settings, srId, facilityId, visaAppId, iqamaAppId, fixedSadad, card = false, onClose, onDone }) {
  const setting = settings?.[feeCode] || {}
  const fixedAmount = setting.amount_type === 'fixed' && Number(setting.fixed_amount) > 0 ? Number(setting.fixed_amount) : null
  const maxAmount = setting.amount_type !== 'fixed' && Number(setting.max_amount) > 0 ? Number(setting.max_amount) : null
  const overAction = setting.over_max_action || 'reject'
  const [sadad, setSadad] = useState('')
  const [amount, setAmount] = useState(fixedAmount != null ? String(fixedAmount) : '')
  const [bankMsg, setBankMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const amtNum = Number(fixedAmount ?? amount)
  const over = maxAmount != null && amtNum > maxAmount
  const blocked = over && overAction === 'reject'
  const review = over && overAction === 'review'
  const effSadad = fixedSadad ?? sadad
  const valid = amtNum > 0 && (card ? String(bankMsg).trim().length > 0 : String(effSadad || '').trim().length > 0) && !blocked
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true); setXErr(null)
    try {
      await insertFee(sb, user, { setting, labelFallbackAr: title, srId, facilityId, visaAppId, iqamaAppId, sadad: effSadad, amount: amtNum, bankMsg, card, needsReview: review })
      toast?.(card ? T('تم تسجيل السداد بالبطاقة','Card payment recorded') : (review ? T('أُرسل لسدادات الخدمات معلَّماً للمراجعة','Sent flagged for review') : T('أُرسل طلب السداد إلى سدادات الخدمات','Payment request sent to Service Payments')))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={title} Icon={Wallet} width={560} accent={C.gold}
      pages={[{ title: T('بيانات السداد','Payment details'), valid, error: (blocked ? T(`المبلغ يتجاوز الحد الأعلى (${fm(maxAmount)} ريال)`, `Exceeds the cap (${fm(maxAmount)} SAR)`) : undefined) || xErr, content: (
        <ModalSection Icon={Wallet} label={title}>
          <div style={GRID}>
            {card ? (
              <TextField full label={T('رسالة البنك المستلمة','Received bank message')} req value={bankMsg} onChange={setBankMsg} placeholder={T('نص الرسالة / مرجع العملية','Message text / reference')} />
            ) : (fixedSadad != null ? (
              <TextField full label={T('رقم السداد (تلقائي)','SADAD No. (auto)')} value={fixedSadad} onChange={() => {}} dir="ltr" placeholder="—" />
            ) : (
              <TextField full label={T('رقم السداد','SADAD No.')} req value={sadad} onChange={v => setSadad(v.replace(/[^\d]/g, ''))} dir="ltr" placeholder="—" />
            ))}
            <CurrencyField full label={T('المبلغ','Amount')} req unit={T('ريال','SAR')}
              hint={fixedAmount != null ? T('مبلغ ثابت من إعدادات الرسوم','Fixed by the fees settings') : (maxAmount != null ? `${T('الحد الأعلى','max')} ${fm(maxAmount)}${review ? ' — ' + T('التجاوز يُعلَّم للمراجعة','over = flagged for review') : ''}` : undefined)}
              value={amount} onChange={v => { if (fixedAmount == null) setAmount(v) }} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={card ? T('تسجيل السداد','Record payment') : T('إرسال للمدفوعات','Send to Payments')} />
  )
}

/* ─── نافذة رفع ملف فقط ─── */
function UploadModal({ sb, user, toast, T, title, fieldLabel, entityType, entityId, kind, onClose, onDone, extraPatch }) {
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const submit = async () => {
    if (!file || saving) return
    setSaving(true); setXErr(null)
    try {
      await uploadAttachment(sb, user, entityType, entityId, kind, file)
      if (extraPatch) await extraPatch()
      toast?.(T('تم الحفظ','Saved'))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={title} Icon={Upload} width={560} accent={C.gold}
      pages={[{ title: fieldLabel, valid: !!file, error: xErr, content: (
        <ModalSection Icon={Upload} label={fieldLabel}>
          <div style={GRID}>
            <FileField full req label={fieldLabel} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('حفظ وتأكيد','Save & Confirm')} />
  )
}

/* صف حالة رسم داخل كروت العرض */
const FeeRow = ({ label, paidRow, pendingRow, T, extra }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', alignItems: 'center', minHeight: 28, gap: 10, flexWrap: 'wrap' }}>
    <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {paidRow && <span style={pill(C.ok)}><CheckIco />{T('تم السداد','Paid')} · {fm(paidRow.amount)}</span>}
      {pendingRow && <span style={pill(C.warn)}><ClockIco />{T('بانتظار السداد','Pending')}{pendingRow.sadad_no ? ` · ${pendingRow.sadad_no}` : ''}</span>}
      {!paidRow && !pendingRow && <span style={{ fontSize: 12, color: 'var(--tx5)', fontWeight: 600 }}>—</span>}
      {extra}
    </span>
  </div>
)

/* ─── محمّل صفوف الدورة + رسومها + مرفقاتها ─── */
function useLifecycle(sb, tick) {
  const [rows, setRows] = useState([])
  const [fees, setFees] = useState([])
  const [atts, setAtts] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const { data } = await sb.from('iqama_issuance_applications').select(`
        id, service_request_id, visa_application_id, main_facility_id, worker_name_at_entry,
        medical_status, insurance_status, insurance_amount, insurance_expiry,
        work_permit_status, work_permit_amount, work_permit_expiry,
        iqama_status, iqama_number, iqama_expiry, iqama_amount,
        iqama_print_status, iqama_delivery_status, iqama_delivery_date, delivery_request_no, created_at,
        visa:visa_application_id(id,visa_number,border_number,file_number,wakalah_number,wakalah_office,
          nationality:nationality_id(name_ar,name_en), occupation:occupation_id(name_ar,name_en),
          embassy:embassy_id(name_ar,name_en)),
        facility:main_facility_id(id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number,muqeem_subscription_active),
        sr:service_request_id(id,request_ref_no,request_date, status:status_id(code), client:client_id(name_ar,name_en,phone,id_number), branch:branch_id(branch_code))
      `).not('visa_application_id', 'is', null).is('deleted_at', null).order('created_at', { ascending: false })
      if (!alive) return
      // استبعد الصفوف اليتيمة (فُكّ ربطها بتأشيرة) ومعاملاتٍ أُلغيت ماليًا — كي لا تبقى عملاً معلّقاً في تبويبات الأقسام.
      const list = (data || []).filter(r => r.visa_application_id && r.sr?.status?.code !== 'cancelled')
      setRows(list)
      const ids = list.map(r => r.id)
      const visaIds = list.map(r => r.visa_application_id).filter(Boolean)
      const facIds = [...new Set(list.map(r => r.main_facility_id).filter(Boolean))]
      const [feesQ, attsQ, attsV, setQ] = await Promise.all([
        ids.length ? sb.from('transaction_fees').select('id,fee_label_ar,amount,status,sadad_no,needs_review,facility_id,iqama_application_id,visa_application_id').or(`iqama_application_id.in.(${ids.join(',')})${facIds.length ? `,facility_id.in.(${facIds.join(',')})` : ''}`).is('deleted_at', null) : Promise.resolve({ data: [] }),
        ids.length ? sb.from('attachments').select('id,entity_type,entity_id,file_name,file_url,notes,created_at').eq('entity_type', 'iqama_issuance_application').in('entity_id', ids).is('deleted_at', null).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        visaIds.length ? sb.from('attachments').select('id,entity_type,entity_id,file_name,file_url,notes,created_at').eq('entity_type', 'visa_application').in('entity_id', visaIds).is('deleted_at', null).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
        sb.from('fee_settings').select('code,label_ar,label_en,amount_type,fixed_amount,max_amount,over_max_action'),
      ])
      if (!alive) return
      setFees(feesQ.data || [])
      setAtts([...(attsQ.data || []), ...(attsV.data || [])])
      setSettings(Object.fromEntries((setQ.data || []).map(s => [s.code, s])))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, tick])
  return { rows, fees, atts, settings, loading }
}

const done = v => v === 'done'
const natOf = (r, isAr) => (isAr ? r.visa?.nationality?.name_ar : (r.visa?.nationality?.name_en || r.visa?.nationality?.name_ar)) || '—'
const occOf = (r, isAr) => (isAr ? r.visa?.occupation?.name_ar : (r.visa?.occupation?.name_en || r.visa?.occupation?.name_ar)) || ''
const facName = (r, isAr) => (isAr ? r.facility?.name_ar : (r.facility?.name_en || r.facility?.name_ar)) || '—'
const clientName = (r, isAr) => (isAr ? r.sr?.client?.name_ar : (r.sr?.client?.name_en || r.sr?.client?.name_ar)) || '—'
const refOf = sr => noDash(['TXN', sr?.branch?.branch_code, String(sr?.request_ref_no || '').slice(-6)].filter(Boolean).join('-'))

const LIFECYCLE = [
  { k: 'medical',  ar: 'الفحص الطبي',  test: r => done(r.medical_status) },
  { k: 'insurance',ar: 'التأمين الطبي', test: r => done(r.insurance_status) },
  { k: 'workcard', ar: 'كرت العمل',    test: r => done(r.work_permit_status) },
  { k: 'iqama',    ar: 'إصدار الإقامة', test: r => done(r.iqama_status) },
  { k: 'delivery', ar: 'طباعة وتوصيل', test: r => done(r.iqama_delivery_status) },
]

/* ════════ القائمة — نفس بنية تبويب تأشيرات العمل ════════ */
function StageList({ T, isAr, title, desc, rows, stateOf, columns, onOpen, loading, searchKeys }) {
  const [q, setQ] = useState('')
  const [flt, setFlt] = useState('')
  const states = rows.map(r => ({ r, st: stateOf(r) }))
  const pendingN = states.filter(x => x.st.kind === 'pending').length
  const doneN = states.length - pendingN
  const filtered = states.filter(({ r, st }) => {
    if (flt && st.kind !== flt) return false
    if (!q.trim()) return true
    const needle = q.trim().toLowerCase()
    return searchKeys(r).some(s => String(s || '').toLowerCase().includes(needle))
  })
  return (
    <div style={{ fontFamily: F, paddingBottom: 40, color: 'var(--tx2)' }}>
      {title && (
        <div style={{ marginBottom: 18, marginTop: 6 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--tx1)', letterSpacing: '-.3px' }}>{title}</div>
          {desc && <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 8, lineHeight: 1.6 }}>{desc}</div>}
        </div>
      )}
      {loading && rows.length === 0 ? (<><SkeletonCards count={2} cols="1.2fr 1fr" minHeight={92} /><SkeletonTable columns={columns.length} rows={8} /></>) : (<>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ ...cardChrome, padding: '16px 20px', position: 'relative' }}>
          <span style={{ position: 'absolute', insetInlineEnd: 16, top: 16, width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx1)' }}>{T('إجمالي الطلبات','Total')}</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: C.gold, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{rows.length}</div>
        </div>
        <div style={{ ...cardChrome, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx1)', marginBottom: 10 }}>{T('الحالات','Statuses')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: C.warn, fontWeight: 700 }}>{T('بانتظار الإجراء','Pending')}</span>
              <span style={{ color: C.warn, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{pendingN}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: C.ok, fontWeight: 700 }}>{T('مكتملة','Done')}</span>
              <span style={{ color: C.ok, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{doneN}</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <span style={{ position: 'absolute', top: '50%', insetInlineStart: 12, transform: 'translateY(-50%)', color: 'var(--tx4)', display: 'inline-flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder={T('ابحث برقم الحدود أو التأشيرة أو المرجع…','Search by border, visa, or reference…')}
            style={{ width: '100%', height: 44, padding: '0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx1)', fontFamily: F, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {[{ v: '', l: T('الكل','All') }, { v: 'pending', l: T('بانتظار','Pending') }, { v: 'done', l: T('مكتملة','Done') }].map(o => (
          <button key={o.v} type="button" onClick={() => setFlt(o.v)}
            style={{ height: 44, padding: '0 16px', borderRadius: 12, background: flt === o.v ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (flt === o.v ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: flt === o.v ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
            {o.l}
          </button>
        ))}
      </div>
      {loading && rows.length > 0 && <div style={{ ...cardChrome, padding: '24px 22px', textAlign: 'center', color: 'var(--tx4)', fontSize: 12.5 }}>{T('جاري التحميل…','Loading…')}</div>}
      {!loading && filtered.length === 0 && <div style={{ ...cardChrome, padding: '24px 22px', textAlign: 'center', color: 'var(--tx4)', fontSize: 12.5 }}>{T('لا توجد معاملات.','No transactions.')}</div>}
      {!loading && filtered.length > 0 && (
        <div style={{ borderRadius: 10, overflow: 'hidden' }}>
          <style>{`
.stg-tbl{width:100%;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
.stg-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:12px;font-weight:700;text-align:center;padding:14px 12px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
.stg-tbl tbody td{padding:13px 12px;font-size:12px;color:#fff;text-align:center;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.03)}
.stg-tbl tbody tr{cursor:pointer;transition:background .12s}
.stg-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
.stg-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
.stg-tbl tbody tr:last-child td{border-bottom:none}
          `}</style>
          <table className="stg-tbl">
            <thead><tr>{columns.map(c => <th key={c.h}>{c.h}</th>)}</tr></thead>
            <tbody>
              {filtered.map(({ r, st }) => (
                <tr key={st.key} onClick={() => onOpen(r)}>
                  {columns.map(c => <td key={c.h}>{c.cell(r, st)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </>)}
    </div>
  )
}

const StatusCell = ({ st }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: st.c, background: st.c + '1f', border: '1px solid ' + st.c + '4d', borderRadius: 8, padding: '5px 12px', whiteSpace: 'nowrap' }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.c }} />
    {st.label}
  </span>
)

const lifecycleColumns = (T, isAr) => [
  { h: T('التاريخ','Date'), cell: r => <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtGreg(r.created_at)}</span> },
  { h: T('العامل','Worker'), cell: r => (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{natOf(r, isAr)}</span>
      <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{occOf(r, isAr)}</span>
    </div>
  ) },
  { h: T('رقم الحدود','Border No'), cell: r => <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 700, color: C.gold, fontVariantNumeric: 'tabular-nums' }}>{r.visa?.border_number || '—'}</span> },
  { h: T('رقم التأشيرة','Visa No'), cell: r => <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{r.visa?.visa_number || '—'}</span> },
  { h: T('المنشأة','Facility'), cell: r => (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 0 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis' }}>{facName(r, isAr)}</span>
      {r.facility?.unified_number && <span style={{ fontSize: 10.5, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace' }}>{r.facility.unified_number}</span>}
    </div>
  ) },
  { h: T('العميل','Client'), cell: r => <span style={{ fontSize: 12, fontWeight: 700 }}>{clientName(r, isAr)}</span> },
  { h: T('المرجع','Reference'), cell: r => { const ref = refOf(r.sr); return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.gold }}>{ref}</span>
      <CopyRefBtn value={ref} />
    </span>
  ) } },
  { h: T('الحالة','Status'), cell: (r, st) => <StatusCell st={st} /> },
]

/* ════════ صفحة التفاصيل — عرض فقط، وكل كرت يحمل زر نافذته ════════ */
function StageDetail({ T, isAr, title, desc, r, st, onBack, atts, children }) {
  const passport = atts.filter(a => a.entity_type === 'visa_application' && a.entity_id === r.visa_application_id && a.notes === 'passport')
  const lifeDone = LIFECYCLE.filter(s => s.test(r)).length
  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 60, color: 'var(--tx2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
      </div>
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <DocIco />
          <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', lineHeight: 1 }}>{title}</div>
          <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700, fontSize: 14, direction: 'ltr' }}>#{r.visa?.border_number || '—'}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>{desc}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('العميل','Client')}</span>
            </div>
            <div style={{ padding: '14px 22px' }}>
              <Row label={T('الاسم','Name')} value={clientName(r, isAr)} />
              <Row label={T('الهوية','ID No.')} value={r.sr?.client?.id_number} mono />
              <Row label={T('الجوال','Phone')} value={r.sr?.client?.phone} mono />
            </div>
          </div>
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('التأشيرة','Visa')}</span>
            </div>
            <div style={{ padding: '14px 22px' }}>
              <Row label={T('الجنسية','Nationality')} value={natOf(r, isAr)} />
              <Row label={T('المهنة','Occupation')} value={occOf(r, isAr)} />
              <Row label={T('رقم التأشيرة','Visa No.')} value={r.visa?.visa_number} mono color={C.gold} />
              <Row label={T('رقم الحدود','Border No.')} value={r.visa?.border_number} mono color={C.gold} />
              <Row label={T('رقم الوكالة','Wakalah No.')} value={r.visa?.wakalah_number} mono />
              <Row label={T('مكتب الوكالة','Wakalah office')} value={r.visa?.wakalah_office} />
              {passport.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{T('ملف الجواز','Passport')}</span>
                  {passport.map(a => <a key={a.id} href={a.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: C.gold, fontWeight: 700 }}>{a.file_name}</a>)}
                </div>
              )}
            </div>
          </div>
          <div style={cardChrome}>
            <div style={cardHeader}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={cardTitle}>{T('منشأة الإصدار','Issuing Facility')}</span>
            </div>
            <div style={{ padding: '14px 22px' }}>
              <Row label={T('الاسم','Name')} value={facName(r, isAr)} />
              <Row label={T('الرقم الموحد','Unified No.')} value={r.facility?.unified_number} mono />
              <Row label={T('السجل التجاري','CR No.')} value={r.facility?.cr_number} mono />
              <Row label={T('التأمينات','GOSI')} value={r.facility?.gosi_number} mono />
              <Row label={T('الموارد البشرية','HRSD')} value={r.facility?.hrsd_number} mono />
            </div>
          </div>
          {children}
        </div>

        <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            const tile = (l, v, c) => (
              <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4, letterSpacing: '.5px' }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: c || '#fff', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              </div>
            )
            const ref = refOf(r.sr)
            return (
              <div style={{ ...cardChrome, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.c, boxShadow: `0 0 10px ${st.c}aa` }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: st.c }}>{st.label}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {tile(T('تاريخ الإنشاء','Created'), fmtGreg(r.created_at))}
                  {tile(T('دفعة الإقامة','Iqama installment'), <span style={{ color: C.ok }}>{T('مدفوع ✓','Paid ✓')}</span>)}
                  {r.iqama_number ? tile(T('رقم الإقامة','Iqama No.'), <span style={{ color: C.ok, fontFamily: 'monospace', direction: 'ltr' }}>{r.iqama_number}</span>) : tile(T('رقم الحدود','Border'), <span style={{ color: C.gold, fontFamily: 'monospace', direction: 'ltr' }}>{r.visa?.border_number || '—'}</span>)}
                  {r.iqama_expiry ? tile(T('انتهاء الإقامة','Iqama expiry'), fmtGreg(r.iqama_expiry)) : tile(T('الملف','File'), r.visa?.file_number != null ? '#' + r.visa.file_number : '—')}
                </div>
                {tile(T('رقم المرجع','Reference'), (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.gold, fontFamily: 'monospace', direction: 'ltr' }}>{ref}<CopyRefBtn value={ref} /></span>
                ))}
                <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, fontSize: 10.5, color: 'var(--tx4)' }}>
                    <span>{T('تقدم الخدمة','Service progress')}</span>
                    <span style={{ color: C.gold, fontWeight: 700, direction: 'ltr' }}>{lifeDone}/5</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden', marginBottom: 9 }}>
                    <div style={{ height: '100%', width: (lifeDone / 5 * 100) + '%', background: `linear-gradient(90deg, ${C.gold}, ${C.gold}cc)`, transition: 'width .3s' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {LIFECYCLE.map(s => {
                      const ok = s.test(r)
                      return (
                        <div key={s.k} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, color: ok ? C.ok : 'var(--tx4)' }}>
                          {ok ? <CheckIco /> : <ClockIco />}
                          <span>{s.ar}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

/* كرت عرض المرحلة — العنوان + شارة الحالة + زر النافذة في رأس الكرت */
const WorkCard = ({ title, badge, action, children }) => (
  <div style={cardChrome}>
    <div style={cardHeader}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
      <span style={cardTitle}>{title}</span>
      <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {badge}
        {action}
      </span>
    </div>
    <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </div>
)

/* ════════ هيكل صفحة مرحلة: قائمة ↔ تفاصيل ════════ */
function StageShell({ sb, user, toast, lang, listTitle, listDesc, detailTitle, detailDesc, relevant, stateOf, Work }) {
  const isAr = lang !== 'en'; const T = (a, e) => isAr ? a : e
  const [tick, setTick] = useState(0)
  const bump = () => setTick(t => t + 1)
  const life = useLifecycle(sb, tick)
  const [detailId, setDetailId] = useState(null)
  const rows = life.rows.filter(relevant)
  const detail = detailId ? life.rows.find(x => x.id === detailId) : null

  if (detail) {
    const st = stateOf(detail)
    return (
      <StageDetail T={T} isAr={isAr} title={detailTitle} desc={detailDesc}
        r={detail} st={st} onBack={() => setDetailId(null)} atts={life.atts}>
        <Work r={detail} T={T} isAr={isAr} sb={sb} user={user} toast={toast} bump={bump} {...life} />
      </StageDetail>
    )
  }
  return (
    <StageList T={T} isAr={isAr} title={listTitle} desc={listDesc} rows={rows} loading={life.loading}
      stateOf={r => ({ ...stateOf(r), key: r.id })} columns={lifecycleColumns(T, isAr)} onOpen={r => setDetailId(r.id)}
      searchKeys={r => [r.visa?.border_number, r.visa?.visa_number, natOf(r, isAr), facName(r, isAr), clientName(r, isAr), refOf(r.sr), r.iqama_number]} />
  )
}

/* ═══ 1) الفحص والتأمين الطبي ═══ */
function MedicalWork({ r, T, sb, user, toast, bump, atts, fees, settings }) {
  const [modal, setModal] = useState(null) // 'exam' | 'insurance'
  const medFiles = atts.filter(a => a.entity_type === 'iqama_issuance_application' && a.entity_id === r.id && a.notes === 'medical_exam')
  const policy = atts.filter(a => a.entity_type === 'iqama_issuance_application' && a.entity_id === r.id && a.notes === 'insurance_policy')
  const mf = fees.filter(f => f.iqama_application_id === r.id)
  const insLabel = settings.medical_insurance?.label_ar || 'التأمين الطبي'
  const insPaid = mf.find(f => f.fee_label_ar === insLabel && f.status === 'paid')
  const insPending = !insPaid ? mf.find(f => f.fee_label_ar === insLabel && f.status === 'pending') : null
  const medDone = done(r.medical_status)
  const insDone = done(r.insurance_status)
  const insReady = medDone && policy.length > 0 && !!insPaid
  const confirmIns = async () => {
    const { error } = await sb.from('iqama_issuance_applications').update({ insurance_status: 'done' }).eq('id', r.id)
    if (error) { toast?.(T('تعذر الحفظ','Save failed'), 'error'); return }
    toast?.(T('اكتمل التأمين الطبي','Insurance completed')); bump()
  }
  return (
    <>
      <WorkCard title={T('الفحص الطبي','Medical Exam')}
        badge={medDone ? <span style={pill(C.ok)}><CheckIco />{T('معتمد','Approved')}</span> : <span style={pill(C.blue)}><ClockIco />{T('بانتظار الفحص','Awaiting exam')}</span>}
        action={!medDone && <CardBtn onClick={() => setModal('exam')}><PlusIco />{T('رفع واعتماد الفحص','Upload & approve')}</CardBtn>}>
        <FilesList label={T('صورة الفحص الطبي','Medical exam copy')} files={medFiles} />
      </WorkCard>
      <WorkCard title={T('التأمين الطبي','Medical Insurance')}
        badge={insDone ? <span style={pill(C.ok)}><CheckIco />{T('مكتمل','Done')}</span> : (medDone ? <span style={pill(C.cyan)}><ClockIco />{T('بانتظار التأمين','Awaiting insurance')}</span> : <span style={pill(C.warn)}><ClockIco />{T('بعد الفحص','After the exam')}</span>)}
        action={!insDone && (insReady
          ? <CardBtn onClick={confirmIns} color={C.ok}><CheckIco />{T('تأكيد الإتمام','Confirm done')}</CardBtn>
          : <CardBtn onClick={() => setModal('insurance')} disabled={!medDone || !!insPending}><PlusIco />{T('تسجيل التأمين','Record insurance')}</CardBtn>)}>
        <FeeRow label={T('سداد التأمين','Insurance payment')} paidRow={insPaid} pendingRow={insPending} T={T} />
        <FilesList label={T('بوليصة التأمين','Insurance policy')} files={policy} />
      </WorkCard>

      {modal === 'exam' && (
        <UploadModal sb={sb} user={user} toast={toast} T={T}
          title={T('رفع واعتماد الفحص الطبي','Upload & approve medical exam')}
          fieldLabel={T('صورة الفحص الطبي','Medical exam copy')}
          entityType="iqama_issuance_application" entityId={r.id} kind="medical_exam"
          extraPatch={async () => { const { error } = await sb.from('iqama_issuance_applications').update({ medical_status: 'done' }).eq('id', r.id); if (error) throw error }}
          onClose={() => setModal(null)} onDone={bump} />
      )}
      {modal === 'insurance' && (
        <InsuranceModal sb={sb} user={user} toast={toast} T={T} r={r} settings={settings} onClose={() => setModal(null)} onDone={bump} />
      )}
    </>
  )
}
/* نافذة التأمين: المبلغ + السداد + البوليصة في خطوة واحدة */
function InsuranceModal({ sb, user, toast, T, r, settings, onClose, onDone }) {
  const setting = settings.medical_insurance || {}
  const maxAmount = Number(setting.max_amount) > 0 ? Number(setting.max_amount) : null
  const overAction = setting.over_max_action || 'reject'
  const [sadad, setSadad] = useState('')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const amtNum = Number(amount)
  const over = maxAmount != null && amtNum > maxAmount
  const blocked = over && overAction === 'reject'
  const review = over && overAction === 'review'
  const valid = amtNum > 0 && String(sadad).trim().length > 0 && !!file && !blocked
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true); setXErr(null)
    try {
      await uploadAttachment(sb, user, 'iqama_issuance_application', r.id, 'insurance_policy', file)
      await insertFee(sb, user, { setting, labelFallbackAr: 'التأمين الطبي', srId: r.service_request_id, facilityId: r.main_facility_id, visaAppId: r.visa_application_id, iqamaAppId: r.id, sadad, amount: amtNum, needsReview: review })
      await sb.from('iqama_issuance_applications').update({ insurance_amount: amtNum }).eq('id', r.id)
      toast?.(T('أُرسل طلب سداد التأمين ورُفعت البوليصة','Insurance payment requested + policy uploaded'))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={T('تسجيل التأمين الطبي','Record medical insurance')} Icon={Wallet} width={620} accent={C.gold}
      pages={[{ title: T('التأمين الطبي','Medical insurance'), valid, error: (blocked ? T(`المبلغ يتجاوز الحد الأعلى (${fm(maxAmount)})`, 'Exceeds the cap') : undefined) || xErr, content: (
        <ModalSection Icon={Wallet} label={T('بيانات التأمين','Insurance details')}>
          <div style={GRID}>
            <CurrencyField label={T('مبلغ التأمين','Insurance amount')} req unit={T('ريال','SAR')}
              hint={maxAmount != null ? `${T('الحد الأعلى','max')} ${fm(maxAmount)}${review ? ' — ' + T('التجاوز يُعلَّم للمراجعة','over = flagged') : ''}` : undefined}
              value={amount} onChange={setAmount} />
            <TextField label={T('رقم السداد','SADAD No.')} req value={sadad} onChange={v => setSadad(v.replace(/[^\d]/g, ''))} dir="ltr" placeholder="—" />
            <FileField full req label={T('بوليصة التأمين','Insurance policy')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('إرسال للمدفوعات','Send to Payments')} />
  )
}

export function MedicalStagePage({ sb, user, toast, lang }) {
  const isArr = lang !== 'en'
  return (
    <StageShell sb={sb} user={user} toast={toast} lang={lang}
      listTitle={isArr ? 'الفحص والتأمين الطبي' : 'Medical Exam & Insurance'}
      listDesc={isArr ? 'كل تأشيرة دُفعت دفعة إصدار إقامتها تصبح معاملة مستقلة هنا — الفحص الطبي أولاً ثم التأمين الطبي.' : 'Each visa with a paid iqama installment becomes its own transaction here — medical exam first, then insurance.'}
      detailTitle={isArr ? 'الفحص والتأمين الطبي' : 'Medical & Insurance'}
      detailDesc={isArr ? 'صفحة عرض — استخدم زر كل كرت لفتح نافذة الإدخال الخاصة به.' : 'Display page — use each card\'s button to open its entry popup.'}
      relevant={() => true}
      stateOf={r => !done(r.medical_status)
        ? { kind: 'pending', label: isArr ? 'بانتظار الفحص' : 'Awaiting exam', c: C.blue }
        : (!done(r.insurance_status)
          ? { kind: 'pending', label: isArr ? 'بانتظار التأمين' : 'Awaiting insurance', c: C.cyan }
          : { kind: 'done', label: isArr ? 'مكتملة' : 'Done', c: C.ok })}
      Work={MedicalWork} />
  )
}

/* ═══ 2) كروت العمل ═══ */
function WorkCardWork({ r, T, sb, user, toast, bump, atts, fees, settings }) {
  const [modal, setModal] = useState(null) // 'card'
  const invFiles = atts.filter(a => a.entity_type === 'iqama_issuance_application' && a.entity_id === r.id && a.notes === 'work_card_invoice')
  const mf = fees.filter(f => f.iqama_application_id === r.id)
  const wcLabel = settings.work_card_fee?.label_ar || 'رسوم كرت العمل'
  const paid = mf.find(f => f.fee_label_ar === wcLabel && f.status === 'paid')
  const pending = !paid ? mf.find(f => f.fee_label_ar === wcLabel && f.status === 'pending') : null
  const isDone = done(r.work_permit_status)
  const ready = invFiles.length > 0 && !!paid
  const confirm = async () => {
    const { error } = await sb.from('iqama_issuance_applications').update({ work_permit_status: 'done' }).eq('id', r.id)
    if (error) { toast?.(T('تعذر الحفظ','Save failed'), 'error'); return }
    toast?.(T('اكتمل كرت العمل','Work card completed')); bump()
  }
  return (
    <>
      <WorkCard title={T('كرت العمل','Work Card')}
        badge={isDone ? <span style={pill(C.ok)}><CheckIco />{T('صدر الكرت','Issued')}</span> : <span style={pill(C.blue)}><ClockIco />{T('بانتظار الكرت','Awaiting card')}</span>}
        action={!isDone && (ready
          ? <CardBtn onClick={confirm} color={C.ok}><CheckIco />{T('تأكيد الإصدار','Confirm issued')}</CardBtn>
          : <CardBtn onClick={() => setModal('card')} disabled={!!pending}><PlusIco />{T('تسجيل كرت العمل','Record work card')}</CardBtn>)}>
        <FeeRow label={T('رسوم الكرت','Card fee')} paidRow={paid} pendingRow={pending} T={T} />
        <FilesList label={T('فاتورة كرت العمل','Work-card invoice')} files={invFiles} />
      </WorkCard>
      {modal === 'card' && <WorkCardModal sb={sb} user={user} toast={toast} T={T} r={r} settings={settings} onClose={() => setModal(null)} onDone={bump} />}
    </>
  )
}
function WorkCardModal({ sb, user, toast, T, r, settings, onClose, onDone }) {
  const setting = settings.work_card_fee || {}
  const maxAmount = Number(setting.max_amount) > 0 ? Number(setting.max_amount) : null
  const overAction = setting.over_max_action || 'reject'
  const [sadad, setSadad] = useState('')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const amtNum = Number(amount)
  const over = maxAmount != null && amtNum > maxAmount
  const blocked = over && overAction === 'reject'
  const review = over && overAction === 'review'
  const valid = amtNum > 0 && String(sadad).trim().length > 0 && !!file && !blocked
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true); setXErr(null)
    try {
      await uploadAttachment(sb, user, 'iqama_issuance_application', r.id, 'work_card_invoice', file)
      await insertFee(sb, user, { setting, labelFallbackAr: 'رسوم كرت العمل', srId: r.service_request_id, facilityId: r.main_facility_id, visaAppId: r.visa_application_id, iqamaAppId: r.id, sadad, amount: amtNum, needsReview: review })
      await sb.from('iqama_issuance_applications').update({ work_permit_amount: amtNum }).eq('id', r.id)
      toast?.(T('أُرسل طلب سداد الكرت ورُفعت الفاتورة','Card fee requested + invoice uploaded'))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={T('تسجيل كرت العمل','Record work card')} Icon={IdCard} width={620} accent={C.gold}
      pages={[{ title: T('كرت العمل','Work card'), valid, error: (blocked ? T(`المبلغ يتجاوز الحد الأعلى (${fm(maxAmount)})`, 'Exceeds the cap') : undefined) || xErr, content: (
        <ModalSection Icon={Wallet} label={T('فاتورة الكرت ورسومه','Card invoice & fee')}>
          <div style={GRID}>
            <CurrencyField label={T('رسوم كرت العمل','Work-card fee')} req unit={T('ريال','SAR')}
              hint={maxAmount != null ? `${T('الحد الأعلى','max')} ${fm(maxAmount)}` : undefined}
              value={amount} onChange={setAmount} />
            <TextField label={T('رقم السداد','SADAD No.')} req value={sadad} onChange={v => setSadad(v.replace(/[^\d]/g, ''))} dir="ltr" placeholder="—" />
            <FileField full req label={T('فاتورة كرت العمل','Work-card invoice')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('إرسال للمدفوعات','Send to Payments')} />
  )
}

export function WorkCardsStagePage({ sb, user, toast, lang }) {
  const isArr = lang !== 'en'
  return (
    <StageShell sb={sb} user={user} toast={toast} lang={lang}
      listTitle={isArr ? 'كروت العمل' : 'Work Cards'}
      listDesc={isArr ? 'التأشيرات التي اعتُمد فحصها الطبي — سجّل فاتورة الكرت ورسومه من نافذة الكرت.' : 'Visas with an approved medical exam — record the card invoice and fee from the card popup.'}
      detailTitle={isArr ? 'كرت العمل' : 'Work Card'}
      detailDesc={isArr ? 'صفحة عرض — استخدم زر كل كرت لفتح نافذة الإدخال الخاصة به.' : 'Display page — each card opens its own popup.'}
      relevant={r => done(r.medical_status)}
      stateOf={r => !done(r.work_permit_status)
        ? { kind: 'pending', label: isArr ? 'بانتظار الكرت' : 'Awaiting card', c: C.blue }
        : { kind: 'done', label: isArr ? 'مكتملة' : 'Done', c: C.ok }}
      Work={WorkCardWork} />
  )
}

/* ═══ 3) إصدار الإقامة ═══ */
function IqamaIssuanceWork({ r, T, sb, user, toast, bump, atts, fees, settings }) {
  const [modal, setModal] = useState(null) // 'subfee' | 'fee' | 'iqama'
  const mf = fees.filter(f => f.iqama_application_id === r.id)
  const subLabel = settings.muqeem_subscription?.label_ar || 'اشتراك مقيم'
  const subPaid = fees.some(f => f.facility_id === r.main_facility_id && f.fee_label_ar === subLabel && f.status === 'paid')
  const subActive = r.facility?.muqeem_subscription_active === true || subPaid
  const subPendingRow = !subActive ? fees.find(f => f.facility_id === r.main_facility_id && f.fee_label_ar === subLabel && f.status === 'pending') : null
  const feeLabel = settings.iqama_issuance_fee?.label_ar || 'رسوم إصدار الإقامة'
  const feePaid = mf.find(f => f.fee_label_ar === feeLabel && f.status === 'paid')
  const feePending = !feePaid ? mf.find(f => f.fee_label_ar === feeLabel && f.status === 'pending') : null
  const muqeemFiles = atts.filter(a => a.entity_type === 'iqama_issuance_application' && a.entity_id === r.id && a.notes === 'muqeem_pdf')
  const isDone = done(r.iqama_status)
  const unlocked = subActive && !!feePaid
  const markSubActive = async () => {
    const { error } = await sb.from('facilities').update({ muqeem_subscription_active: true }).eq('id', r.main_facility_id)
    if (error) { toast?.(T('تعذر الحفظ','Save failed'), 'error'); return }
    toast?.(T('تم تأكيد اشتراك مقيم','Muqeem subscription confirmed')); bump()
  }
  return (
    <>
      <WorkCard title={T('اشتراك مقيم للمنشأة','Facility Muqeem subscription')}
        badge={subActive ? <span style={pill(C.ok)}><CheckIco />{T('اشتراك فعّال','Active')}</span> : (subPendingRow ? <span style={pill(C.warn)}><ClockIco />{T('بانتظار السداد','Pending')}</span> : <span style={pill(C.orange)}><ClockIco />{T('غير محدد','Unset')}</span>)}
        action={!subActive && !subPendingRow && (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <CardBtn onClick={markSubActive} color={C.ok}><CheckIco />{T('نعم، فعّال','Yes, active')}</CardBtn>
            <CardBtn onClick={() => setModal('subfee')} color={C.warn}><PlusIco />{T('لا — طلب سداد','No — request')}</CardBtn>
          </span>
        )}>
        <FeeRow label={T('سداد الاشتراك','Subscription payment')} paidRow={subPaid ? { amount: fees.find(f => f.facility_id === r.main_facility_id && f.fee_label_ar === subLabel && f.status === 'paid')?.amount } : null} pendingRow={subPendingRow} T={T} />
      </WorkCard>
      <WorkCard title={T('رسوم إصدار الإقامة','Iqama issuance fee')}
        badge={feePaid ? <span style={pill(C.ok)}><CheckIco />{T('تم السداد','Paid')}</span> : (feePending ? <span style={pill(C.warn)}><ClockIco />{T('بانتظار السداد','Pending')}</span> : <span style={pill(C.orange)}><ClockIco />{T('لم تُرسل','Not sent')}</span>)}
        action={!feePaid && !feePending && <CardBtn onClick={() => setModal('fee')} disabled={!subActive && !subPendingRow}><PlusIco />{T('إرسال طلب السداد','Send request')}</CardBtn>}>
        <Row label={T('رقم السداد (= رقم الحدود)','SADAD (= border no.)')} value={r.visa?.border_number} mono color={C.gold} />
        <FeeRow label={T('حالة السداد','Payment status')} paidRow={feePaid} pendingRow={feePending} T={T} />
      </WorkCard>
      <WorkCard title={T('بيانات الإقامة','Iqama data')}
        badge={isDone ? <span style={pill(C.ok)}><CheckIco />{T('صدرت','Issued')}</span> : <span style={pill(C.orange)}><ClockIco />{T('بانتظار الإصدار','Awaiting issuance')}</span>}
        action={!isDone && <CardBtn onClick={() => setModal('iqama')} disabled={!unlocked}><PlusIco />{T('تسجيل بيانات الإقامة','Record iqama data')}</CardBtn>}>
        <Row label={T('رقم الإقامة','Iqama No.')} value={r.iqama_number} mono color={r.iqama_number ? C.ok : undefined} />
        <Row label={T('تاريخ الانتهاء','Expiry')} value={r.iqama_expiry ? fmtGreg(r.iqama_expiry) : null} mono />
        <FilesList label={T('ملف مقيم','Muqeem file')} files={muqeemFiles} />
      </WorkCard>

      {modal === 'subfee' && (
        <FeeModal sb={sb} user={user} toast={toast} T={T} title={T('سداد اشتراك مقيم','Muqeem subscription payment')}
          feeCode="muqeem_subscription" settings={settings} srId={r.service_request_id} facilityId={r.main_facility_id} iqamaAppId={r.id}
          onClose={() => setModal(null)} onDone={bump} />
      )}
      {modal === 'fee' && (
        <FeeModal sb={sb} user={user} toast={toast} T={T} title={T('سداد رسوم إصدار الإقامة','Iqama issuance fee')}
          feeCode="iqama_issuance_fee" settings={settings} srId={r.service_request_id} facilityId={r.main_facility_id} visaAppId={r.visa_application_id} iqamaAppId={r.id}
          fixedSadad={r.visa?.border_number || ''}
          onClose={() => setModal(null)} onDone={bump} />
      )}
      {modal === 'iqama' && <IqamaDataModal sb={sb} user={user} toast={toast} T={T} r={r} onClose={() => setModal(null)} onDone={bump} />}
    </>
  )
}
function IqamaDataModal({ sb, user, toast, T, r, onClose, onDone }) {
  const [iqamaNo, setIqamaNo] = useState(r.iqama_number || '')
  const [expiry, setExpiry] = useState(r.iqama_expiry || '')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const valid = String(iqamaNo).trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(expiry)
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true); setXErr(null)
    try {
      if (file) await uploadAttachment(sb, user, 'iqama_issuance_application', r.id, 'muqeem_pdf', file)
      const { error } = await sb.from('iqama_issuance_applications').update({ iqama_status: 'done', iqama_number: iqamaNo.trim(), iqama_expiry: expiry }).eq('id', r.id)
      if (error) throw error
      toast?.(T('صدرت الإقامة — انتقلت إلى طباعة وتوصيل الإقامات','Iqama issued — moved to print & delivery'))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={T('تسجيل بيانات الإقامة','Record iqama data')} Icon={IdCard} width={620} accent={C.gold}
      pages={[{ title: T('بيانات الإقامة','Iqama data'), valid, error: xErr, content: (
        <ModalSection Icon={IdCard} label={T('بيانات الإقامة','Iqama data')}>
          <div style={GRID}>
            <TextField label={T('رقم الإقامة','Iqama No.')} req value={iqamaNo} onChange={v => setIqamaNo(v.replace(/[^\d]/g, ''))} dir="ltr" placeholder="—" />
            <TextField label={T('تاريخ انتهاء الإقامة','Iqama expiry')} req value={expiry} onChange={v => setExpiry(v.replace(/[^0-9-]/g, '').slice(0, 10))} dir="ltr" placeholder="yyyy-mm-dd" />
            <FileField full label={T('ملف مقيم','Muqeem file')} hint={T('اختياري','optional')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('تأكيد إصدار الإقامة','Confirm iqama issued')} />
  )
}

export function IqamaIssuanceStagePage({ sb, user, toast, lang }) {
  const isArr = lang !== 'en'
  return (
    <div style={{ marginBottom: 26 }}>
      <StageShell sb={sb} user={user} toast={toast} lang={lang}
        listTitle={isArr ? 'إصدار الإقامة' : 'Iqama Issuance'}
        listDesc={isArr ? 'التأشيرات المكتمل تأمينها وكرت عملها — اشتراك مقيم ورسوم الإصدار وبيانات الإقامة، كلٌّ من نافذته.' : 'Visas with insurance + work card done — Muqeem subscription, issuance fee, and iqama data, each via its popup.'}
        detailTitle={isArr ? 'إصدار الإقامة' : 'Iqama Issuance'}
        detailDesc={isArr ? 'صفحة عرض — استخدم زر كل كرت لفتح نافذة الإدخال الخاصة به.' : 'Display page — each card opens its own popup.'}
        relevant={r => done(r.insurance_status) && done(r.work_permit_status)}
        stateOf={r => !done(r.iqama_status)
          ? { kind: 'pending', label: isArr ? 'بانتظار الإصدار' : 'Awaiting issuance', c: C.orange }
          : { kind: 'done', label: isArr ? 'صدرت' : 'Issued', c: C.ok }}
        Work={IqamaIssuanceWork} />
    </div>
  )
}

/* ═══ 4) طباعة وتوصيل الإقامة ═══ */
function IqamaPrintWork({ r, T, sb, user, toast, bump, atts, fees, settings }) {
  const [modal, setModal] = useState(null) // 'balance' | 'delivery'
  const [skipBal, setSkipBal] = useState(false)
  const mf = fees.filter(f => f.iqama_application_id === r.id)
  const balLabel = settings.muqeem_balance?.label_ar || 'رصيد مقيم'
  const balPaid = mf.find(f => f.fee_label_ar === balLabel && f.status === 'paid')
  const balPending = !balPaid ? mf.find(f => f.fee_label_ar === balLabel && f.status === 'pending') : null
  const balOk = skipBal || !!balPaid
  const photo = atts.filter(a => a.entity_type === 'iqama_issuance_application' && a.entity_id === r.id && a.notes === 'iqama_photo')
  const isDone = done(r.iqama_delivery_status)
  return (
    <>
      <WorkCard title={T('رصيد مقيم','Muqeem balance')}
        badge={balPaid ? <span style={pill(C.ok)}><CheckIco />{T('تم السداد','Paid')}</span> : (balPending ? <span style={pill(C.warn)}><ClockIco />{T('بانتظار السداد','Pending')}</span> : (skipBal ? <span style={pill(C.ok)}><CheckIco />{T('لا يحتاج رصيد','Not needed')}</span> : <span style={pill(C.purple)}><ClockIco />{T('غير محدد','Unset')}</span>))}
        action={!isDone && !balPaid && !balPending && !skipBal && (
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <CardBtn onClick={() => setModal('balance')} color={C.warn}><PlusIco />{T('نعم — طلب سداد','Yes — request')}</CardBtn>
            <CardBtn onClick={() => setSkipBal(true)}>{T('لا يحتاج','Not needed')}</CardBtn>
          </span>
        )}>
        <FeeRow label={T('شحن الرصيد','Top-up')} paidRow={balPaid} pendingRow={balPending} T={T} />
      </WorkCard>
      <WorkCard title={T('التوصيل وصورة الإقامة','Delivery & iqama photo')}
        badge={isDone ? <span style={pill(C.ok)}><CheckIco />{T('اكتملت الخدمة','Service complete')}</span> : <span style={pill(C.purple)}><ClockIco />{T('بانتظار التوصيل','Awaiting delivery')}</span>}
        action={!isDone && <CardBtn onClick={() => setModal('delivery')} disabled={!balOk}><PlusIco />{T('تسجيل التوصيل','Record delivery')}</CardBtn>}>
        <Row label={T('رقم طلب التوصيل','Delivery request no.')} value={r.delivery_request_no} mono />
        <Row label={T('تاريخ التوصيل','Delivery date')} value={r.iqama_delivery_date ? fmtGreg(r.iqama_delivery_date) : null} mono />
        <FilesList label={T('صورة الإقامة','Iqama photo')} files={photo} />
      </WorkCard>

      {modal === 'balance' && (
        <FeeModal sb={sb} user={user} toast={toast} T={T} title={T('شحن رصيد مقيم','Muqeem top-up')}
          feeCode="muqeem_balance" settings={settings} srId={r.service_request_id} facilityId={r.main_facility_id} visaAppId={r.visa_application_id} iqamaAppId={r.id}
          onClose={() => setModal(null)} onDone={bump} />
      )}
      {modal === 'delivery' && <DeliveryModal sb={sb} user={user} toast={toast} T={T} r={r} onClose={() => setModal(null)} onDone={bump} />}
    </>
  )
}
function DeliveryModal({ sb, user, toast, T, r, onClose, onDone }) {
  const [reqNo, setReqNo] = useState(r.delivery_request_no || '')
  const [dDate, setDDate] = useState(r.iqama_delivery_date || '')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const valid = String(reqNo).trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dDate) && !!file
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true); setXErr(null)
    try {
      await uploadAttachment(sb, user, 'iqama_issuance_application', r.id, 'iqama_photo', file)
      const { error } = await sb.from('iqama_issuance_applications').update({ iqama_print_status: 'done', iqama_delivery_status: 'done', delivery_request_no: reqNo.trim(), iqama_delivery_date: dDate }).eq('id', r.id)
      if (error) throw error
      toast?.(T('اكتملت خدمة التأشيرة بالكامل ✓','The visa service is fully complete ✓'))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={T('تسجيل التوصيل','Record delivery')} Icon={Truck} width={620} accent={C.gold}
      pages={[{ title: T('بيانات التوصيل','Delivery data'), valid, error: xErr, content: (
        <ModalSection Icon={Truck} label={T('بيانات التوصيل','Delivery data')}>
          <div style={GRID}>
            <TextField label={T('رقم طلب التوصيل','Delivery request no.')} req value={reqNo} onChange={setReqNo} dir="ltr" placeholder="—" />
            <TextField label={T('تاريخ التوصيل','Delivery date')} req value={dDate} onChange={v => setDDate(v.replace(/[^0-9-]/g, '').slice(0, 10))} dir="ltr" placeholder="yyyy-mm-dd" />
            <FileField full req label={T('صورة الإقامة','Iqama photo')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('تأكيد التوصيل — إنهاء الخدمة','Confirm delivery — finish')} />
  )
}

export function IqamaPrintStagePage({ sb, user, toast, lang }) {
  const isArr = lang !== 'en'
  return (
    <div style={{ marginBottom: 26 }}>
      <StageShell sb={sb} user={user} toast={toast} lang={lang}
        listTitle={isArr ? 'طباعة وتوصيل الإقامات' : 'Iqama Print & Delivery'}
        listDesc={isArr ? 'الإقامات الصادرة — رصيد مقيم إن لزم ثم بيانات التوصيل وصورة الإقامة من نافذة الكرت.' : 'Issued iqamas — Muqeem top-up if needed, then the delivery data and iqama photo via the card popup.'}
        detailTitle={isArr ? 'طباعة وتوصيل الإقامة' : 'Iqama Print & Delivery'}
        detailDesc={isArr ? 'صفحة عرض — استخدم زر كل كرت لفتح نافذة الإدخال الخاصة به.' : 'Display page — each card opens its own popup.'}
        relevant={r => done(r.iqama_status)}
        stateOf={r => !done(r.iqama_delivery_status)
          ? { kind: 'pending', label: isArr ? 'بانتظار التوصيل' : 'Awaiting delivery', c: C.purple }
          : { kind: 'done', label: isArr ? 'مكتملة' : 'Done', c: C.ok }}
        Work={IqamaPrintWork} />
    </div>
  )
}

/* ════════ وكالات التأشيرات (الغرفة التجارية) ════════ */
function OfficesModal({ sb, user, toast, T, isAr, g, onClose, onDone }) {
  const [master, setMaster] = useState('')
  const [vals, setVals] = useState(() => Object.fromEntries(g.map(v => [v.id, v.wakalah_office || ''])))
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const valid = g.some(v => (vals[v.id] || '') !== (v.wakalah_office || '')) || g.every(v => (vals[v.id] || '').trim())
  const submit = async () => {
    if (saving) return
    setSaving(true); setXErr(null)
    try {
      for (const v of g) {
        if ((vals[v.id] || '') === (v.wakalah_office || '')) continue
        const { error } = await sb.from('visa_applications').update({ wakalah_office: (vals[v.id] || '').trim() || null }).eq('id', v.id)
        if (error) throw error
      }
      toast?.(T('تم حفظ مكاتب التفويض','Offices saved'))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={T('تحديد مكاتب التفويض','Assign attorney offices')} Icon={Building2} width={640} accent={C.gold}
      pages={[{ title: T('مكاتب التفويض','Attorney offices'), valid, error: xErr, content: (
        <ModalSection Icon={Building2} label={T('واحد للكل أو مكتب مختلف لكل تأشيرة أو مجموعة','One for all, or a different office per visa/group')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <TextField full label={T('اسم المكتب (للتطبيق على الكل)','Office name (apply to all)')} value={master} onChange={setMaster} placeholder={T('مثال: مكتب السالم للاستقدام','e.g. Al-Salem office')} />
              </div>
              <button type="button" disabled={!master.trim()}
                onClick={() => { const o = master.trim(); if (!o) return; setVals(s => { const n = { ...s }; g.forEach(v => { if (!v.wakalah_number) n[v.id] = o }); return n }) }}
                style={{ height: 42, padding: '0 16px', borderRadius: 9, background: master.trim() ? 'rgba(212,160,23,.12)' : 'transparent', border: '1px solid ' + (master.trim() ? 'rgba(212,160,23,.5)' : 'rgba(255,255,255,.08)'), color: master.trim() ? C.gold : 'var(--tx4)', cursor: master.trim() ? 'pointer' : 'not-allowed', fontFamily: F, fontSize: 12, fontWeight: 800 }}>
                {T('تطبيق على الكل','Apply to all')}
              </button>
            </div>
            {g.map((v, i) => (
              <div key={v.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1.2fr', alignItems: 'center', gap: 10 }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--tx1)', fontWeight: 700 }}>{isAr ? v.nationality?.name_ar : (v.nationality?.name_en || v.nationality?.name_ar)}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontFamily: 'monospace', direction: 'ltr' }}>#{v.border_number}</div>
                </div>
                <TextField label="" value={vals[v.id] || ''} onChange={x => setVals(s => ({ ...s, [v.id]: x }))} placeholder={T('مكتب التفويض','Attorney office')} />
              </div>
            ))}
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('حفظ المكاتب','Save offices')} />
  )
}
function WakalahModal({ sb, user, toast, T, office, visas, onClose, onDone }) {
  const [number, setNumber] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [xErr, setXErr] = useState(null)
  const valid = String(number).trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)
  const submit = async () => {
    if (!valid || saving) return
    setSaving(true); setXErr(null)
    try {
      if (file) await uploadAttachment(sb, user, 'visa_application', visas[0].id, 'wakalah_pdf', file)
      const { error } = await sb.from('visa_applications').update({ wakalah_number: number.trim(), wakalah_date: date }).in('id', visas.map(v => v.id))
      if (error) throw error
      toast?.(T('تم حفظ الوكالة','Wakalah saved'))
      onDone?.(); onClose()
    } catch { setXErr(T('تعذر الحفظ','Save failed')) }
    finally { setSaving(false) }
  }
  return (
    <Modal open onClose={() => { setXErr(null); onClose() }} title={T('تسجيل الوكالة — ','Record wakalah — ') + office} Icon={FileText} width={620} accent={C.gold}
      pages={[{ title: T('بيانات الوكالة','Wakalah data'), valid, error: xErr, content: (
        <ModalSection Icon={FileText} label={T('بيانات الوكالة','Wakalah data')}>
          <div style={GRID}>
            <TextField label={T('رقم الوكالة','Wakalah No.')} req value={number} onChange={setNumber} dir="ltr" placeholder="—" />
            <TextField label={T('تاريخ الوكالة','Wakalah date')} req value={date} onChange={v => setDate(v.replace(/[^0-9-]/g, '').slice(0, 10))} dir="ltr" placeholder="yyyy-mm-dd" />
            <FileField full label={T('ملف الوكالة','Wakalah file')} hint={T('اختياري','optional')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={saving} submitLabel={T('حفظ الوكالة','Save wakalah')} />
  )
}

export function WakalahChamberPage({ sb, user, toast, lang }) {
  const isAr = lang !== 'en'; const T = (a, e) => isAr ? a : e
  const [tick, setTick] = useState(0)
  const bump = () => setTick(t => t + 1)
  const [rows, setRows] = useState([])
  const [atts, setAtts] = useState([])
  const [fees, setFees] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [detailSr, setDetailSr] = useState(null)
  const [modal, setModal] = useState(null) // {kind:'offices'} | {kind:'wakalah',office,visas} | {kind:'fee',office,visas} | {kind:'cr'}

  useEffect(() => {
    if (!sb) return
    let alive = true
    ;(async () => {
      const { data } = await sb.from('visa_applications').select(`
        id, visa_number, border_number, file_number, wakalah_office, wakalah_number, wakalah_date, created_at,
        main_facility:main_facility_id(id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number),
        nationality:nationality_id(name_ar,name_en), occupation:occupation_id(name_ar,name_en),
        sr:service_request_id(id,request_ref_no,request_date, status:status_id(code), service_type:service_type_id(code), client:client_id(name_ar,name_en,phone,id_number), branch:branch_id(branch_code))
      `).not('visa_number', 'is', null).is('deleted_at', null).order('created_at', { ascending: true })
      if (!alive) return
      // استبعد التأشيرات التابعة لمعاملاتٍ ملغاة كي لا تظهر «الوكالة» كعمل معلّق على معاملة أُلغيت.
      const list = (data || []).filter(v => /^work_visa/.test(v.sr?.service_type?.code || '') && v.border_number && v.sr?.status?.code !== 'cancelled')
      setRows(list)
      const visaIds = list.map(v => v.id)
      const facIds = [...new Set(list.map(v => v.main_facility?.id).filter(Boolean))]
      const [a1, a2, f1, s1] = await Promise.all([
        visaIds.length ? sb.from('attachments').select('id,entity_type,entity_id,file_name,file_url,notes').eq('entity_type', 'visa_application').in('entity_id', visaIds).eq('notes', 'wakalah_pdf').is('deleted_at', null) : Promise.resolve({ data: [] }),
        facIds.length ? sb.from('attachments').select('id,entity_type,entity_id,file_name,file_url,notes').eq('entity_type', 'facility').in('entity_id', facIds).eq('notes', 'cr_pdf').is('deleted_at', null) : Promise.resolve({ data: [] }),
        visaIds.length ? sb.from('transaction_fees').select('id,fee_label_ar,amount,status,bank_reference,visa_application_id').in('visa_application_id', visaIds).is('deleted_at', null) : Promise.resolve({ data: [] }),
        sb.from('fee_settings').select('code,label_ar,label_en,amount_type,fixed_amount,max_amount,over_max_action'),
      ])
      if (!alive) return
      setAtts([...(a1.data || []), ...(a2.data || [])])
      setFees(f1.data || [])
      setSettings(Object.fromEntries((s1.data || []).map(s => [s.code, s])))
      setLoading(false)
    })()
    return () => { alive = false }
  }, [sb, tick])

  const bySr = new Map()
  rows.forEach(v => { const k = v.sr?.id; if (!k) return; if (!bySr.has(k)) bySr.set(k, []); bySr.get(k).push(v) })
  const groups = [...bySr.values()]
  const stOf = g => g.every(v => v.wakalah_number)
    ? { kind: 'done', label: T('مكتملة','Done'), c: C.ok }
    : { kind: 'pending', label: T('بانتظار الوكالة','Awaiting wakalah'), c: C.warn }

  if (detailSr) {
    const g = groups.find(x => x[0].sr?.id === detailSr)
    if (!g) { setDetailSr(null); return null }
    const sr = g[0].sr
    const fac = g[0].main_facility
    const st = stOf(g)
    const crFiles = atts.filter(a => a.entity_type === 'facility' && a.entity_id === fac?.id && a.notes === 'cr_pdf')
    const allAssigned = g.every(v => (v.wakalah_office || '').trim())
    const byOffice = new Map()
    g.forEach(v => { const o = (v.wakalah_office || '').trim(); if (!o) return; if (!byOffice.has(o)) byOffice.set(o, []); byOffice.get(o).push(v) })
    const ref = refOf(sr)
    const tile = (l, v, c) => (
      <div style={{ padding: '10px 12px', background: 'rgba(0,0,0,.18)', borderRadius: 10, border: '1px solid rgba(255,255,255,.04)' }}>
        <div style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4, letterSpacing: '.5px' }}>{l}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: c || '#fff', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
      </div>
    )
    return (
      <div style={{ fontFamily: F, paddingBottom: 60, color: 'var(--tx2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <BackButton onBack={() => setDetailSr(null)} label={T('رجوع','Back')} />
        </div>
        <div style={{ marginBottom: 18, marginTop: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <DocIco />
            <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', lineHeight: 1 }}>{T('وكالة التأشيرات','Visa Wakalah')}</div>
            <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700, fontSize: 14, direction: 'ltr' }}>{ref}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 10, lineHeight: 1.6 }}>
            {T('صفحة عرض — استخدم زر كل كرت لفتح نافذة الإدخال الخاصة به.','Display page — each card opens its own popup.')}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                <span style={cardTitle}>{T('العميل','Client')}</span>
              </div>
              <div style={{ padding: '14px 22px' }}>
                <Row label={T('الاسم','Name')} value={isAr ? sr?.client?.name_ar : (sr?.client?.name_en || sr?.client?.name_ar)} />
                <Row label={T('الهوية','ID No.')} value={sr?.client?.id_number} mono />
                <Row label={T('الجوال','Phone')} value={sr?.client?.phone} mono />
              </div>
            </div>
            <WorkCard title={T('المنشأة','Facility')}
              action={<CardBtn onClick={() => setModal({ kind: 'cr' })}><PlusIco />{T('رفع السجل التجاري','Upload CR')}</CardBtn>}>
              <Row label={T('الاسم','Name')} value={isAr ? fac?.name_ar : (fac?.name_en || fac?.name_ar)} />
              <Row label={T('الرقم الموحد','Unified No.')} value={fac?.unified_number} mono />
              <Row label={T('السجل التجاري','CR No.')} value={fac?.cr_number} mono />
              <FilesList label={T('ملف السجل التجاري','CR file')} files={crFiles} />
            </WorkCard>
            <WorkCard title={T('مكاتب التفويض','Attorney offices')}
              badge={<StatusCell st={st} />}
              action={<CardBtn onClick={() => setModal({ kind: 'offices' })}><PlusIco />{T('تحديد المكاتب','Assign offices')}</CardBtn>}>
              {g.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '6px 0', minHeight: 28 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: '50%', background: 'rgba(212,160,23,.15)', border: '1px solid rgba(212,160,23,.35)', color: C.gold, fontSize: 10.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--tx1)', fontWeight: 700 }}>{isAr ? v.nationality?.name_ar : (v.nationality?.name_en || v.nationality?.name_ar)}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontFamily: 'monospace', direction: 'ltr' }}>#{v.border_number}</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: v.wakalah_office ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600 }}>{v.wakalah_office || T('غير محدد','Unset')}</span>
                    {v.wakalah_number && <span style={pill(C.ok)}><CheckIco />{T('موكَّلة','Done')}</span>}
                  </span>
                </div>
              ))}
            </WorkCard>
            {allAssigned && [...byOffice.entries()].map(([office, visas]) => {
              const doneW = visas.every(v => v.wakalah_number)
              const wFiles = atts.filter(a => a.entity_type === 'visa_application' && a.entity_id === visas[0].id && a.notes === 'wakalah_pdf')
              const myFees = fees.filter(x => x.visa_application_id === visas[0].id)
              const wkLabel = settings.wakalah_fee?.label_ar || 'رسوم وكالة التأشيرات'
              const feePaid = myFees.find(x => x.fee_label_ar === wkLabel && x.status === 'paid')
              return (
                <WorkCard key={office} title={T('وكالة — ','Wakalah — ') + office}
                  badge={doneW ? <span style={pill(C.ok)}><CheckIco />{T('تم التوكيل','Authorized')}</span> : <span style={pill(C.warn)}><ClockIco />{T('بانتظار التوكيل','Pending')}</span>}
                  action={<span style={{ display: 'inline-flex', gap: 6 }}>
                    {!doneW && <CardBtn onClick={() => setModal({ kind: 'wakalah', office, visas })}><PlusIco />{T('تسجيل الوكالة','Record wakalah')}</CardBtn>}
                    {!feePaid && <CardBtn onClick={() => setModal({ kind: 'fee', office, visas })} color={C.warn}><PlusIco />{T('سداد بالبطاقة','Card payment')}</CardBtn>}
                  </span>}>
                  <Row label={T('عدد التأشيرات','Visas')} value={String(visas.length)} mono />
                  <Row label={T('رقم الوكالة','Wakalah No.')} value={visas[0].wakalah_number} mono color={visas[0].wakalah_number ? C.gold : undefined} />
                  <Row label={T('تاريخ الوكالة','Wakalah date')} value={visas[0].wakalah_date ? fmtGreg(visas[0].wakalah_date) : null} mono />
                  <FeeRow label={T('رسوم الوكالة','Wakalah fee')} paidRow={feePaid} pendingRow={null} T={T} />
                  <FilesList label={T('ملف الوكالة','Wakalah file')} files={wFiles} />
                </WorkCard>
              )
            })}
          </div>
          <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...cardChrome, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 2 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: st.c, boxShadow: `0 0 10px ${st.c}aa` }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: st.c }}>{st.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {tile(T('تاريخ الطلب','Request date'), fmtGreg(sr?.request_date))}
                {tile(T('عدد التأشيرات','Visas'), String(g.length))}
                {tile(T('المكاتب','Offices'), String(byOffice.size || 0))}
                {tile(T('الموكَّلة','Authorized'), String(g.filter(v => v.wakalah_number).length) + '/' + g.length)}
              </div>
              {tile(T('رقم المرجع','Reference'), (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.gold, fontFamily: 'monospace', direction: 'ltr' }}>{ref}<CopyRefBtn value={ref} /></span>
              ))}
            </div>
          </div>
        </div>

        {modal?.kind === 'cr' && (
          <UploadModal sb={sb} user={user} toast={toast} T={T}
            title={T('رفع السجل التجاري','Upload the CR file')} fieldLabel={T('ملف السجل التجاري (PDF)','CR file (PDF)')}
            entityType="facility" entityId={fac?.id} kind="cr_pdf"
            onClose={() => setModal(null)} onDone={bump} />
        )}
        {modal?.kind === 'offices' && (
          <OfficesModal sb={sb} user={user} toast={toast} T={T} isAr={isAr} g={g} onClose={() => setModal(null)} onDone={bump} />
        )}
        {modal?.kind === 'wakalah' && (
          <WakalahModal sb={sb} user={user} toast={toast} T={T} office={modal.office} visas={modal.visas} onClose={() => setModal(null)} onDone={bump} />
        )}
        {modal?.kind === 'fee' && (
          <FeeModal sb={sb} user={user} toast={toast} T={T} title={T('رسوم الوكالة — سداد بالبطاقة','Wakalah fee — card payment')}
            feeCode="wakalah_fee" settings={settings} srId={sr.id} facilityId={fac?.id} visaAppId={modal.visas[0].id} card
            onClose={() => setModal(null)} onDone={bump} />
        )}
      </div>
    )
  }

  const columns = [
    { h: T('التاريخ','Date'), cell: g => <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtGreg(g[0].sr?.request_date)}</span> },
    { h: T('المنشأة','Facility'), cell: g => (
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, alignItems: 'center', minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{(isAr ? g[0].main_facility?.name_ar : (g[0].main_facility?.name_en || g[0].main_facility?.name_ar)) || '—'}</span>
        {g[0].main_facility?.unified_number && <span style={{ fontSize: 10.5, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'monospace' }}>{g[0].main_facility.unified_number}</span>}
      </div>
    ) },
    { h: T('العميل','Client'), cell: g => <span style={{ fontSize: 12, fontWeight: 700 }}>{(isAr ? g[0].sr?.client?.name_ar : (g[0].sr?.client?.name_en || g[0].sr?.client?.name_ar)) || '—'}</span> },
    { h: T('التأشيرات','Visas'), cell: g => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{g.length}</span> },
    { h: T('الموكَّلة','Authorized'), cell: g => <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: g.every(v => v.wakalah_number) ? C.ok : C.warn }}>{g.filter(v => v.wakalah_number).length}/{g.length}</span> },
    { h: T('المرجع','Reference'), cell: g => { const ref = refOf(g[0].sr); return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.gold }}>{ref}</span>
        <CopyRefBtn value={ref} />
      </span>
    ) } },
    { h: T('الحالة','Status'), cell: (g, st) => <StatusCell st={st} /> },
  ]
  return (
    <StageList T={T} isAr={isAr}
      title={null}
      rows={groups} loading={loading}
      stateOf={g => ({ ...stOf(g), key: g[0].sr?.id })}
      columns={columns}
      onOpen={g => setDetailSr(g[0].sr?.id)}
      searchKeys={g => [refOf(g[0].sr), g[0].main_facility?.name_ar, g[0].main_facility?.unified_number, g[0].sr?.client?.name_ar, ...g.map(v => v.border_number), ...g.map(v => v.visa_number)]} />
  )
}
