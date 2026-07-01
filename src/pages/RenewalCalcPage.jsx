import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { RefreshCw, Printer, BadgeCheck, MessageSquare, Plus, Paperclip, User, FileText, Banknote, Building2, AlertCircle } from 'lucide-react'
import { C, F, EmptyState, Modal as FKModal, ModalSection, TextArea, TextField, FileField, CurrencyField, YesNo, Select as FKSelect, DateField as FKDateField, GRID, SuccessView } from '../components/ui/FormKit.jsx'
import { can as canPerm, cardVisible, canCardBtn, tabOffices, fieldVisible, fieldEditable, modalAllowed } from '../lib/permissions.js'
import { noDash } from '../lib/utils.js'
import { getIqamaRenewalPricingConfig } from '../lib/kafalaPricing.js'
import { computeRenewalDerived } from '../lib/renewalDerived.js'
import OfficialStampBadge from '../components/ui/OfficialStampBadge.jsx'
import BackButton from '../components/BackButton'

const nm = v => Number(v || 0).toLocaleString('en-US')

// زر نسخ صغير — يظهر علامة صح للحظة بعد النسخ
const CopyBtn = ({ text, lang }) => {
  const [done, setDone] = useState(false)
  if (text === null || text === undefined || text === '' || text === '—') return null
  return <button type="button" title={(lang || 'ar') !== 'en' ? 'نسخ' : 'Copy'} onClick={() => { try { navigator.clipboard?.writeText(String(text)); setDone(true); setTimeout(() => setDone(false), 1200) } catch {} }}
    style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', color: done ? '#2ecc71' : 'var(--tx5)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, flexShrink: 0, transition: 'color .15s' }}>
    {done
      ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
  </button>
}
const USER_SELECT = 'id,primary_branch_id,person:persons(name_ar,name_en),branch:branches!users_primary_branch_id_fkey(code:branch_code)'

// ألوان ومسمّيات مصدر الحقل (نفس تفاصيل نقل الكفالة) — يُظهر مِن أين جاءت القيمة (مقيم/وزارة العمل/الضمان/موظف/نظام)
const SRC_META = { muqeem: { c: '#F47B20', l: { ar: 'مقيم', en: 'Muqeem' } }, chi: { c: '#5188C9', l: { ar: 'الضمان الصحي', en: 'CHI' } }, hrsd: { c: '#2DB174', l: { ar: 'وزارة العمل', en: 'HRSD' } }, employee: { c: '#888', l: { ar: 'موظف', en: 'Employee' } }, system: { c: '#666', l: { ar: 'نظام', en: 'System' } } }

// ── نافذة إضافة تعليق لتسعيرة التجديد — تُخزَّن في quotation_notes عبر iqama_renewal_calculation_id ──
function RenewalNoteModal({ sb, T, lang, rcId, user, onClose, onSaved }) {
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState(null)
  const [saved, setSaved] = useState(false)
  const submit = async () => {
    const note = text.trim(); if (!note) return
    setSubmitting(true); setErr(null)
    try {
      const { data: row, error } = await sb.from('quotation_notes')
        .insert({ iqama_renewal_calculation_id: rcId, note, created_by: user?.id || null }).select('id').single()
      if (error || !row) throw (error || new Error('insert failed'))
      if (file) {
        const safe = (file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `quotation-note/${row.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (!upErr) {
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          await sb.from('attachments').insert({ entity_type: 'quotation_note', entity_id: row.id, file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path, mime_type: file.type || null, size_bytes: file.size || null, uploaded_by: user?.id || null })
        }
      }
      await onSaved?.(); setSubmitting(false); setSaved(true)
    } catch (e) { setSubmitting(false); setErr(T('تعذّر إضافة التعليق: ', 'Failed to add comment: ') + (e?.message || e)) }
  }
  return (
    <FKModal open onClose={onClose} title={T('إضافة تعليق', 'Add comment')} Icon={MessageSquare} width={560} height={520} accent={C.gold}
      success={saved ? <SuccessView title={T('تمت إضافة التعليق', 'Comment added')} /> : null}
      pages={[{ valid: !!text.trim(), error: err, content: (
        <ModalSection Icon={MessageSquare} label={T('تفاصيل التعليق', 'Comment details')}>
          <div style={GRID}>
            <TextArea req full label={T('نص التعليق', 'Comment text')} value={text} onChange={v => { setText(v); setErr(null) }}
              placeholder={T('اكتب تعليقك…', 'Write your comment…')} rows={4} />
            <FileField full label={T('المرفق', 'Attachment')} hint={T('يمكن إرفاق ملف واحد', 'You can attach a single file')} value={file} onChange={setFile} />
          </div>
        </ModalSection>
      ) }]}
      onSubmit={submit} submitting={submitting} submitLabel={T('إضافة', 'Add')} submitIcon={Plus} />
  )
}

/* ───────────── هيكل تحميل (Skeleton) — نفس قياس وتخطيط كروت تسعيرة التنازل ───────────── */
function RnwSkeleton({ listRows = 6 }) {
  const shimmer = { display: 'inline-block', borderRadius: 6, background: 'linear-gradient(90deg, var(--bd2) 25%, var(--bd) 37%, var(--bd2) 63%)', backgroundSize: '400% 100%', animation: 'rnw-shimmer 1.4s ease infinite' }
  const bar = (w, h = 11, r = 6) => <span style={{ ...shimmer, width: w, height: h, borderRadius: r }} />
  const card = { borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', minHeight: 190 }
  return <>
    <style>{`@keyframes rnw-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
    <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
      <div style={{ ...card, padding: '18px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{bar(10, 10, 999)}{bar('30%', 22)}</div>
        {bar('55%', 40)}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--bd)' }}>{bar('30%', 10)}{bar('12%', 12)}</div>
      </div>
      <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
        {[0, 1].map(i => <div key={i} style={{ flex: 1, padding: '12px 16px', borderTop: i ? '1px solid var(--bd)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>{bar('60%', 11)}{bar('35%', 18)}</div>)}
      </div>
      <div style={{ ...card, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>{bar('40%', 11)}{bar('20%', 11)}</div>
        {bar('100%', 8, 999)}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px 16px', marginTop: 2 }}>
          {Array.from({ length: 4 }).map((_, i) => <span key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>{bar(14, 10)}{bar('70%', 10)}</span>)}
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from({ length: listRows }).map((_, i) => <div key={i} style={{ borderRadius: 18, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-md)', padding: '18px 22px 22px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 22, alignItems: 'center' }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{bar('30%', 14)}{bar(24, 16, 3)}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '9px 16px' }}>
            {Array.from({ length: 5 }).map((_, j) => <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{bar('45%', 8)}{bar('72%', 11)}</div>)}
          </div>
        </div>
        <div style={{ width: 96, height: 96, borderRadius: 12, ...shimmer }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, borderInlineStart: '1px dashed var(--bd)', paddingInlineStart: 24, paddingInlineEnd: 6, minWidth: 120 }}>
          {bar('70%', 26)}{bar('50%', 10)}
        </div>
      </div>)}
    </div>
  </>
}

/* RenewalCalcPage — قائمة تسعيرات تجديد الإقامة بنفس تصميم تسعيرات التنازل. */
export default function RenewalCalcPage({ sb, toast, user, lang, emptyIcon, onNewCalc }) {
  const isAr = (lang || 'ar') !== 'en'
  const T = (a, e) => isAr ? a : e
  const dir = isAr ? 'rtl' : 'ltr'
  // مكاتب المستخدم لتبويب حسبة التجديد: null = بلا قيد (المدير العام / «كل المكاتب»).
  const officeScope = useMemo(() => tabOffices(user, 'renewal_calc'), [user])
  const [rows, setRows] = useState([])
  const [nationalities, setNationalities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [listFilter, setListFilter] = useState('all')
  const [advOpen, setAdvOpen] = useState(false)
  const [advFilter, setAdvFilter] = useState({ from: '', to: '', status: '', employee: '', officeMin: '', officeMax: '' })
  const [detailsRow, setDetailsRow] = useState(null)
  const [copied, setCopied] = useState(false)
  const [approveForm, setApproveForm] = useState(null)
  const [approveSaving, setApproveSaving] = useState(false)
  const [approveSaved, setApproveSaved] = useState(false)
  const [cancelForm, setCancelForm] = useState(null)
  const [cancelSaving, setCancelSaving] = useState(false)
  const [cancelSaved, setCancelSaved] = useState(false)
  const [usersById, setUsersById] = useState({})
  const [detailsAudit, setDetailsAudit] = useState({})   // سجل التغييرات/المصادر مرتّب حسب اسم الحقل
  const [cardEdit, setCardEdit] = useState(null)          // تعديل كرت مفرد (نفس تفاصيل نقل الكفالة)
  const [cardSaving, setCardSaving] = useState(false)
  const [quoteNotes, setQuoteNotes] = useState([])        // تعليقات التسعيرة
  const [quoteNoteModal, setQuoteNoteModal] = useState(false)
  const [detailFacility, setDetailFacility] = useState(null)   // منشأة العامل (تُشتق من worker_id)
  const [detailWorkerOcc, setDetailWorkerOcc] = useState(null) // مهنة العامل الرسمية (احتياطي لو حقل التسعيرة فاضي)
  // إعدادات التسعير — لحساب أرضية خصم المكتب (سعر اليوم × أيام التجديد) عند التصديق
  const cfg = useMemo(() => getIqamaRenewalPricingConfig(), [])
  // هل خصم المكتب مسموح (سياسة الأدمن في الخدمات)؟
  const discountEnabled = cfg.iqamaOfficeDiscountEnabled !== false
  // خصم المكتب: مبلغ فقط، مفتوح بدون أرضية — يُسمح بخصم كامل رسوم المكتب حتى الصفر
  const computeApprovalDiscount = (af) => {
    const officeFee = Number(af?._officeFee || 0)
    const renewalMonths = Number(af?._renewalMonths || 0)
    const floor = 0
    const maxDiscount = discountEnabled ? officeFee : 0
    const want = Math.round(parseFloat(af?.discValue) || 0)
    const applied = Math.min(Math.max(0, want), maxDiscount)
    const newTotal = Math.max(0, Math.round(Number(af?._total || 0)) - applied)
    return { officeFee, floor, maxDiscount, want, applied, capped: want > maxDiscount, newTotal }
  }

  // ── خريطة الحالات (لون + اسم) ──
  const stClr = { draft: '#666', priced: '#eab308', approved: C.blue, invoiced: C.ok, completed: '#1a8a3e', cancelled: C.red }
  const stLabel = { draft: T('مسودة', 'Draft'), priced: T('مسعّرة', 'Priced'), approved: T('مصدّقة', 'Approved'), invoiced: T('مفوترة', 'Invoiced'), completed: T('مكتملة', 'Completed'), cancelled: T('ملغاة', 'Cancelled') }
  const nameOf = u => u ? (lang === 'en' ? (u.name_en || u.name_ar) : u.name_ar) : null
  const natOf = r => {
    const byId = r.nationality_id && nationalities.find(n => n.id === r.nationality_id)
    const byName = r.nationality && nationalities.find(n => n.name_ar === r.nationality || n.name_en === r.nationality)
    return byId || byName || null
  }

  // ── جلب البيانات (التسعيرات + المستخدمون + الفروع + الجنسيات) ──
  const load = async () => {
    if (!sb) return
    setLoading(true)
    // قيد المكتب: المستخدم غير المدير العام يرى حسبات مكاتبه فقط (القائمة والإحصاءات معاً، فهي محسوبة من الصفوف).
    let calcQ = sb.from('iqama_renewal_calculation').select('*').is('deleted_at', null).order('created_at', { ascending: false }).limit(500)
    if (officeScope) calcQ = calcQ.or(`branch_id.in.(${officeScope.join(',')}),branch_id.is.null`)
    const [rRes, uRes, bRes, nRes] = await Promise.all([
      calcQ,
      sb.from('users').select(USER_SELECT).is('deleted_at', null),
      sb.from('branches').select('id,code:branch_code').is('deleted_at', null),
      sb.from('nationalities').select('id,name_ar,name_en,flag_url'),
    ])
    const userMap = Object.fromEntries((uRes.data || []).map(u => [u.id, u]))
    const branchMap = Object.fromEntries((bRes.data || []).map(b => [b.id, b.code]))
    const flat = u => u ? { id: u.id, name_ar: u.person?.name_ar || null, name_en: u.person?.name_en || null, branch: u.branch ? { code: u.branch.code } : null } : null
    const list = (rRes.data || []).map(r => ({
      ...r,
      priced_user: flat(userMap[r.priced_by]),
      approved_user: flat(userMap[r.approved_by]),
      invoiced_user: flat(userMap[r.invoiced_by]),
      created_user: flat(userMap[r.created_by]),
      cancelled_user: flat(userMap[r.cancelled_by]),
      _branchCode: (r.branch_id && branchMap[r.branch_id]) || null,
    }))
    setRows(list)
    setUsersById(Object.fromEntries((uRes.data || []).map(u => [u.id, flat(u)])))
    setNationalities(nRes.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [sb, officeScope])

  // ── سجل التغييرات/المصادر للحقول (يُحمَّل عند فتح التفاصيل) ──
  const loadDetailAudit = useCallback(async () => {
    if (!detailsRow?.id) { setDetailsAudit({}); return }
    const { data } = await sb.from('iqama_renewal_calculation_audit').select('*').eq('quotation_id', detailsRow.id).order('changed_at', { ascending: true })
    const map = {}; (data || []).forEach(a => { (map[a.field_name] = map[a.field_name] || []).push(a) }); setDetailsAudit(map)
  }, [sb, detailsRow?.id])
  useEffect(() => { loadDetailAudit() }, [loadDetailAudit])

  // ── تعليقات التسعيرة (quotation_notes عبر iqama_renewal_calculation_id) + المرفقات ──
  const loadQuoteNotes = useCallback(async () => {
    if (!detailsRow?.id) { setQuoteNotes([]); return }
    const { data: notes } = await sb.from('quotation_notes').select('id,note,created_at,created_by').eq('iqama_renewal_calculation_id', detailsRow.id).is('deleted_at', null).order('created_at', { ascending: true })
    const list = notes || []; const ids = list.map(n => n.id); const attMap = {}
    if (ids.length) { const { data: atts } = await sb.from('attachments').select('id,entity_id,file_name,file_url').eq('entity_type', 'quotation_note').in('entity_id', ids).is('deleted_at', null); (atts || []).forEach(a => { (attMap[a.entity_id] = attMap[a.entity_id] || []).push(a) }) }
    setQuoteNotes(list.map(n => ({ ...n, attachments: attMap[n.id] || [] })))
  }, [sb, detailsRow?.id])
  useEffect(() => { loadQuoteNotes() }, [loadQuoteNotes])

  // ── منشأة العامل + مهنته الرسمية — تُشتق من worker_id → workers ──
  useEffect(() => {
    let alive = true
    if (!detailsRow?.worker_id) { setDetailFacility(null); setDetailWorkerOcc(null); return }
    ;(async () => {
      const { data: w } = await sb.from('workers').select('current_facility_id,occupation_ar,occ:current_occupation_id(name_ar,name_en)').eq('id', detailsRow.worker_id).maybeSingle()
      if (!alive) return
      setDetailWorkerOcc(w ? (w.occ?.name_ar || w.occ?.name_en || w.occupation_ar || null) : null)
      if (!w?.current_facility_id) { setDetailFacility(null); return }
      const { data: f } = await sb.from('facilities').select('id,name_ar,name_en,unified_number,hrsd_number,gosi_number').eq('id', w.current_facility_id).maybeSingle()
      if (alive) setDetailFacility(f || null)
    })()
    return () => { alive = false }
  }, [sb, detailsRow?.worker_id])
  // فتح تفاصيل تسعيرة عند الوصول عبر #renewal_calc?q=<quote_no> (من شاشة نجاح الحاسبة)
  useEffect(() => {
    if (!rows.length) return
    let q = ''; try { const m = (window.location.hash || '').match(/[?&]q=([^&]*)/); if (m) q = decodeURIComponent(m[1]) } catch {}
    if (!q) return
    const row = rows.find(r => r.quote_no === q)
    if (row) { setDetailsRow(row); try { window.history.replaceState(null, '', '#renewal_calc') } catch {} }
  }, [rows])
  // الحاسبة تُفتح فوق هذه الصفحة المُحمَّلة مسبقاً، فبياناتها قديمة — أعد الجلب عند وصول ?q=
  useEffect(() => {
    const onHash = () => { if (/[?&]q=/.test(window.location.hash || '')) load() }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // ── إحصاءات ── تُحسب أدناه من المجموعة المفلترة (searched) لتعكس البحث/الفلاتر الحالية.

  // بناء أختام المراحل (مسعّرة → مصدّقة → مفوترة) لكرت واحد
  const buildStamps = (r) => {
    const stamps = []
    const pricedBy = nameOf(r.priced_user || r.created_user)
    const approvedBy = nameOf(r.approved_user)
    const invoicedBy = nameOf(r.invoiced_user)
    const isApprovedLike = ['approved', 'invoiced', 'completed'].includes(r.status)
    const isInvoicedLike = ['invoiced', 'completed'].includes(r.status)
    if (r.status === 'cancelled') {
      stamps.push({ key: 'x', label: stLabel.cancelled, name: nameOf(r.cancelled_user) || pricedBy, branch: r.cancelled_user?.branch?.code || r._branchCode, date: r.cancelled_at || r.updated_at || r.created_at, color: stClr.cancelled })
      return stamps
    }
    if (r.priced_at && pricedBy) stamps.push({ key: 'p', label: stLabel.priced, name: pricedBy, branch: r.priced_user?.branch?.code || r._branchCode, date: r.priced_at, color: stClr.priced })
    if (isApprovedLike && (r.approved_at || r.invoiced_at) && (approvedBy || invoicedBy) && r.approved_by && r.approved_by !== r.priced_by) {
      stamps.push(isInvoicedLike
        ? { key: 'a', label: stLabel.invoiced, name: invoicedBy || approvedBy, branch: (r.invoiced_user || r.approved_user)?.branch?.code || r._branchCode, date: r.invoiced_at || r.approved_at, color: stClr.invoiced }
        : { key: 'a', label: stLabel.approved, name: approvedBy, branch: r.approved_user?.branch?.code || r._branchCode, date: r.approved_at, color: stClr.approved })
    }
    // إن بقي ختم واحد فقط وكانت الحالة متقدّمة — حدّث مسمّاه ليعكس آخر مرحلة
    if (stamps.length === 1 && isApprovedLike) {
      stamps[0].label = isInvoicedLike ? stLabel.invoiced : stLabel.approved
      stamps[0].date = (isInvoicedLike ? r.invoiced_at : r.approved_at) || r.approved_at || r.priced_at
      stamps[0].color = isInvoicedLike ? stClr.invoiced : stClr.approved
    }
    if (!stamps.length) stamps.push({ key: 'c', label: stLabel[r.status] || r.status, name: pricedBy, branch: r._branchCode, date: r.priced_at || r.created_at, color: stClr[r.status] || '#999' })
    return stamps
  }

  // أوسمة الخدمة لكل تسعيرة
  const tagsOf = (r) => {
    const tags = []
    if (Number(r.renewal_months) > 0) tags.push(T(r.renewal_months + ' شهر', r.renewal_months + 'mo'))
    if (Number(r.work_permit_fee || 0) > 0) tags.push(T('رخصة عمل', 'Work Permit'))
    if (Number(r.medical_fee || 0) > 0) tags.push(T('تأمين طبي', 'Medical'))
    if (r.change_profession) tags.push(T('تغيير مهنة', 'Prof Chg'))
    return tags
  }

  // ── تصديق الحسبة — تحديث مباشر (RLS مفتوحة للمستخدمين المصادَقين على iqama_renewal_calculation) ──
  const submitApproval = async () => {
    if (!approveForm || approveSaving) return
    setApproveSaving(true)
    try {
      const now = new Date().toISOString()
      const patch = { status: 'approved', approved_at: now, approved_by: user?.id || null, updated_at: now, updated_by: user?.id || null }
      const d = computeApprovalDiscount(approveForm)
      patch.manual_discount = d.applied
      patch.total_amount = d.newTotal
      const note = (approveForm.approval_note || '').trim()
      if (note) patch.approval_note = note
      // إعادة تجميد القيم المشتقّة بعد خصم المكتب (يتأثّر صافي رسوم المكتب)
      Object.assign(patch, computeRenewalDerived({ ...detailsRow, ...patch }))
      const { error } = await sb.from('iqama_renewal_calculation').update(patch).eq('id', approveForm._id).is('deleted_at', null)
      if (error) throw error
      setApproveSaved(true)
    } catch (e) {
      toast((lang === 'ar' ? 'خطأ: ' : 'Error: ') + (e.message || '').slice(0, 90))
    }
    setApproveSaving(false)
  }

  // ── إلغاء الحسبة — تحديث مباشر يضبط الحالة «ملغاة» + من ألغاها ومتى وسبب اختياري ──
  const submitCancel = async () => {
    if (!cancelForm || cancelSaving) return
    setCancelSaving(true)
    try {
      const now = new Date().toISOString()
      const reason = (cancelForm.reason || '').trim()
      const patch = { status: 'cancelled', cancelled_at: now, cancelled_by: user?.id || null, cancel_reason: reason || null, updated_at: now, updated_by: user?.id || null }
      const { error } = await sb.from('iqama_renewal_calculation').update(patch).eq('id', cancelForm._id).is('deleted_at', null)
      if (error) throw error
      setCancelSaved(true)
    } catch (e) {
      toast((lang === 'ar' ? 'خطأ: ' : 'Error: ') + (e.message || '').slice(0, 90))
    }
    setCancelSaving(false)
  }

  // ── تعديل لكل كرت (نفس تفاصيل نقل الكفالة) — تحديث مباشر + كتابة سجل التغييرات ──
  const CARD_FIELDS = {
    worker: ['worker_name', 'iqama_number', 'phone', 'nationality_id', 'dob'],
    professional: ['occupation_name_ar', 'iqama_expiry_gregorian', 'iqama_expiry_hijri'],
    renewal: ['renewal_months', 'change_profession', 'new_occupation_name_ar', 'exemption', 'work_permit_expiry'],
    pricing: ['office_fee', 'iqama_renewal_fee', 'late_fine_amount', 'work_permit_fee', 'medical_fee', 'prof_change_fee', 'gov_excess', 'absher_discount', 'manual_discount'],
  }
  const PRICING_KEYS = CARD_FIELDS.pricing
  const BOOL_KEYS = ['change_profession', 'exemption']
  const rcFieldLabel = (k) => ({ worker_name: T('الاسم', 'Name'), iqama_number: T('رقم الإقامة', 'Iqama'), phone: T('رقم الجوال', 'Mobile'), nationality_id: T('الجنسية', 'Nationality'), dob: T('تاريخ الميلاد', 'Date of Birth'), occupation_name_ar: T('المهنة', 'Occupation'), iqama_expiry_gregorian: T('انتهاء الإقامة (ميلادي)', 'Iqama Expiry (G)'), iqama_expiry_hijri: T('انتهاء الإقامة (هجري)', 'Iqama Expiry (H)'), renewal_months: T('مدة التجديد', 'Renewal Period'), change_profession: T('تغيير المهنة', 'Change Occupation'), new_occupation_name_ar: T('المهنة الجديدة', 'New Occupation'), exemption: T('الإعفاء', 'Exemption'), work_permit_expiry: T('انتهاء رخصة العمل', 'Work Permit Expiry'), office_fee: T('رسوم المكتب', 'Office Fee'), iqama_renewal_fee: T('تجديد الإقامة', 'Iqama Renewal'), late_fine_amount: T('غرامة تأخّر الإقامة', 'Late Fine'), work_permit_fee: T('رسوم رخصة العمل', 'Work Permit'), medical_fee: T('التأمين الطبي', 'Medical'), prof_change_fee: T('تغيير المهنة', 'Occupation Change'), gov_excess: T('الزائد عن الحدود الحكومية', 'Gov Excess'), absher_discount: T('خصم أبشر', 'Absher Discount'), manual_discount: T('خصم المكتب', 'Office Discount') }[k] || k)

  const openCardEdit = (card) => {
    const r = detailsRow || {}
    const f = { card, _id: r.id }
    CARD_FIELDS[card].forEach(k => { const v = r[k]; f[k] = (v === null || v === undefined) ? (BOOL_KEYS.includes(k) ? null : '') : v })
    if (card === 'worker' && !f.nationality_id && r.nationality) { const n = (nationalities || []).find(x => x.name_ar === r.nationality); if (n) f.nationality_id = n.id }
    setCardEdit(f)
  }
  const saveCardEdit = async () => {
    if (!cardEdit || cardSaving) return
    setCardSaving(true)
    try {
      const card = cardEdit.card, r = detailsRow
      const now = new Date().toISOString()
      const patch = {}, auditRows = []
      CARD_FIELDS[card].forEach(k => {
        let v = cardEdit[k]
        if (PRICING_KEYS.includes(k)) v = (v === '' || v == null) ? 0 : Number(v)
        else if (k === 'renewal_months') v = (v === '' || v == null) ? null : Number(v)
        else if (BOOL_KEYS.includes(k)) v = v === true ? true : v === false ? false : null
        else if (v === '') v = null
        const oldV = (r[k] === undefined ? null : r[k]), newV = (v === undefined ? null : v)
        if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
          patch[k] = v
          auditRows.push({ quotation_id: r.id, field_name: k, old_value: oldV, new_value: newV, source: 'employee', changed_by: user?.id || null, changed_at: now })
        }
      })
      if (card === 'worker' && patch.nationality_id) { const n = (nationalities || []).find(x => x.id === patch.nationality_id); if (n) patch.nationality = n.name_ar }
      if (card === 'pricing') {
        const sum = ['office_fee', 'iqama_renewal_fee', 'late_fine_amount', 'work_permit_fee', 'medical_fee', 'prof_change_fee', 'gov_excess'].reduce((s, k) => s + (Number(cardEdit[k]) || 0), 0)
        const newTotal = Math.max(0, sum - (Number(cardEdit.absher_discount) || 0) - (Number(cardEdit.manual_discount) || 0))
        patch.subtotal = sum
        patch.total_amount = newTotal
      }
      if (!auditRows.length) { setCardEdit(null); setCardSaving(false); return }
      // إعادة تجميد القيم المشتقّة بعد التعديل (الرسوم/مدة التجديد/انتهاء الإقامة كلها تؤثّر عليها)
      Object.assign(patch, computeRenewalDerived({ ...r, ...patch }))
      patch.updated_at = now; patch.updated_by = user?.id || null
      const { error } = await sb.from('iqama_renewal_calculation').update(patch).eq('id', r.id).is('deleted_at', null)
      if (error) throw error
      const { error: aErr } = await sb.from('iqama_renewal_calculation_audit').insert(auditRows)
      if (aErr) throw aErr
      setDetailsRow(prev => ({ ...prev, ...patch }))
      await loadDetailAudit()
      load()
      toast(T('تم حفظ التعديل', 'Changes saved'))
      setCardEdit(null)
    } catch (e) {
      toast((lang === 'ar' ? 'خطأ: ' : 'Error: ') + (e.message || '').slice(0, 90))
    }
    setCardSaving(false)
  }

  // ── طباعة تسعيرة التجديد — نفس تصميم تسعيرة التنازل (Royal Black & Gold، صفحة A4) ──
  // يأخذ لغة الطباعة مباشرةً (ar · en · hi · ur · bn) كما في طباعة التنازل.
  const printRenewalDoc = (r, printLang = 'ar') => {
    const rtl = printLang === 'ar' || printLang === 'ur'
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
    const nm2 = v => { const n = Number(v || 0); return (n < 0 ? '- ' : '') + Math.abs(n).toLocaleString('en-US') }
    const fmtD2 = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }
    const L = {
      renewalQuote: { ar: 'حسبة تجديد إقامة', en: 'Iqama Renewal Calc', hi: 'इक़ामा नवीनीकरण', ur: 'اقامہ تجدید حساب', bn: 'ইকামা নবায়ন হিসাব' },
      workerSection: { ar: 'بيانات العامل والمنشأة والتجديد', en: 'Worker, Facility & Renewal', hi: 'कर्मचारी, प्रतिष्ठान और नवीनीकरण', ur: 'ملازم، ادارہ اور تجدید', bn: 'কর্মী, প্রতিষ্ঠান ও নবায়ন' },
      workerCard: { ar: 'بيانات العامل', en: 'Worker Data', hi: 'कर्मचारी', ur: 'ملازم', bn: 'কর্মী' },
      facilityCard: { ar: 'بيانات المنشأة', en: 'Facility Data', hi: 'प्रतिष्ठान', ur: 'ادارہ', bn: 'প্রতিষ্ঠান' },
      renewalCard: { ar: 'بيانات التجديد', en: 'Renewal Data', hi: 'नवीनीकरण', ur: 'تجدید', bn: 'নবায়ন' },
      facilityName: { ar: 'اسم المنشأة', en: 'Facility', hi: 'प्रतिष्ठान', ur: 'ادارہ', bn: 'প্রতিষ্ঠান' },
      unifiedNo: { ar: 'الرقم الموحد', en: 'Unified No.', hi: 'एकीकृत संख्या', ur: 'متحدہ نمبر', bn: 'ইউনিফাইড নম্বর' },
      molNo: { ar: 'رقم وزارة العمل', en: 'MOL No.', hi: 'श्रम मंत्रालय', ur: 'محنت نمبر', bn: 'শ্রম নম্বর' },
      gosiNo: { ar: 'رقم التأمينات', en: 'GOSI No.', hi: 'जीओएसआई', ur: 'جوسی نمبر', bn: 'গোসি নম্বর' },
      changeOccupation: { ar: 'تغيير المهنة', en: 'Change Occupation', hi: 'पेशा परिवर्तन', ur: 'پیشہ تبدیلی', bn: 'পেশা পরিবর্তন' },
      exemptionLbl: { ar: 'الإعفاء', en: 'Exemption', hi: 'छूट', ur: 'استثنا', bn: 'অব্যাহতি' },
      yes: { ar: 'نعم', en: 'Yes', hi: 'हाँ', ur: 'ہاں', bn: 'হ্যাঁ' },
      no: { ar: 'لا', en: 'No', hi: 'नहीं', ur: 'نہیں', bn: 'না' },
      quoteNoLbl: { ar: 'رقم التسعيرة', en: 'Quote No.', hi: 'कोटेशन संख्या', ur: 'کوٹیشن نمبر', bn: 'কোটেশন নম্বর' },
      issueDate: { ar: 'تاريخ الإصدار', en: 'Issue Date', hi: 'जारी तिथि', ur: 'تاریخ اجرا', bn: 'ইস্যু তারিখ' },
      finalTotal: { ar: 'المجموع النهائي', en: 'Final Total', hi: 'कुल योग', ur: 'حتمی مجموعہ', bn: 'চূড়ান্ত মোট' },
      date: { ar: 'التاريخ', en: 'Date', hi: 'तारीख', ur: 'تاریخ', bn: 'তারিখ' },
      status: { ar: 'الحالة', en: 'Status', hi: 'स्थिति', ur: 'حالت', bn: 'অবস্থা' },
      expectedDuration: { ar: 'المدة المتوقعة', en: 'Expected Duration', hi: 'अपेक्षित अवधि', ur: 'متوقع مدت', bn: 'প্রত্যাশিত সময়কাল' },
      notGuaranteed: { ar: 'غير مضمونة', en: 'not guaranteed', hi: 'गारंटी नहीं', ur: 'ضمانت نہیں', bn: 'নিশ্চিত নয়' },
      workerData: { ar: 'بيانات العامل', en: 'Worker', hi: 'कर्मचारी', ur: 'ملازم', bn: 'কর্মী' },
      personalInfo: { ar: 'المعلومات الشخصية', en: 'Personal Info', hi: 'व्यक्तिगत जानकारी', ur: 'ذاتی معلومات', bn: 'ব্যক্তিগত তথ্য' },
      professional: { ar: 'البيانات المهنية', en: 'Professional Data', hi: 'पेशेवर जानकारी', ur: 'پیشہ ورانہ معلومات', bn: 'পেশাগত তথ্য' },
      pricing: { ar: 'بيانات التسعير والملخّص المالي', en: 'Pricing & Summary', hi: 'मूल्य एवं सारांश', ur: 'قیمت اور خلاصہ', bn: 'মূল্য ও সারসংক্ষেপ' },
      name: { ar: 'الاسم', en: 'Name', hi: 'नाम', ur: 'نام', bn: 'নাম' },
      iqamaNo: { ar: 'رقم الإقامة', en: 'Iqama No.', hi: 'इक़ामा संख्या', ur: 'اقامہ نمبر', bn: 'ইকামা নম্বর' },
      phoneLbl: { ar: 'الجوال', en: 'Phone', hi: 'फ़ोन', ur: 'فون', bn: 'ফোন' },
      birthDate: { ar: 'تاريخ الميلاد', en: 'Birth Date', hi: 'जन्म तिथि', ur: 'تاریخ پیدائش', bn: 'জন্ম তারিখ' },
      age: { ar: 'العمر', en: 'Age', hi: 'आयु', ur: 'عمر', bn: 'বয়স' },
      occupation: { ar: 'المهنة', en: 'Occupation', hi: 'पेशा', ur: 'پیشہ', bn: 'পেশা' },
      newOccupation: { ar: 'المهنة الجديدة', en: 'New Occupation', hi: 'नया पेशा', ur: 'نیا پیشہ', bn: 'নতুন পেশা' },
      iqamaExpiryG: { ar: 'انتهاء الإقامة (ميلادي)', en: 'Iqama Expiry (G)', hi: 'इक़ामा समाप्ति', ur: 'اقامہ میعاد', bn: 'ইকামা মেয়াদ' },
      iqamaExpiryH: { ar: 'انتهاء الإقامة (هجري)', en: 'Iqama Expiry (H)', hi: 'इक़ामा (हिजरी)', ur: 'اقامہ (ہجری)', bn: 'ইকামা (হিজরি)' },
      renewalPeriod: { ar: 'مدة التجديد', en: 'Renewal Period', hi: 'नवीनीकरण अवधि', ur: 'تجدید مدت', bn: 'নবায়ন মেয়াদ' },
      expectedExpiry: { ar: 'انتهاء الإقامة المتوقع', en: 'Expected Iqama Expiry', hi: 'अपेक्षित समाप्ति', ur: 'متوقع میعاد', bn: 'প্রত্যাশিত মেয়াদ' },
      officeFee: { ar: 'رسوم المكتب', en: 'Office Fee', hi: 'कार्यालय शुल्क', ur: 'دفتر فیس', bn: 'অফিস ফি' },
      iqamaRenewal: { ar: 'تجديد الإقامة', en: 'Iqama Renewal', hi: 'इक़ामा नवीनीकरण', ur: 'اقامہ تجدید', bn: 'ইকামা নবায়ন' },
      workPermit: { ar: 'رخصة العمل', en: 'Work Permit', hi: 'कार्य परमिट', ur: 'ورک پرمٹ', bn: 'ওয়ার্ক পারমিট' },
      profChange: { ar: 'تغيير المهنة', en: 'Occupation Change', hi: 'पेशा परिवर्तन', ur: 'پیشہ تبدیلی', bn: 'পেশা পরিবর্তন' },
      medical: { ar: 'التأمين الطبي', en: 'Medical Insurance', hi: 'चिकित्सा बीमा', ur: 'طبی بیمہ', bn: 'চিকিৎসা বীমা' },
      lateFine: { ar: 'غرامة تأخّر الإقامة', en: 'Iqama Late Fine', hi: 'विलंब जुर्माना', ur: 'تاخیر جرمانہ', bn: 'বিলম্ব জরিমানা' },
      discount: { ar: 'الخصم', en: 'Discount', hi: 'छूट', ur: 'رعایت', bn: 'ছাড়' },
      subtotal: { ar: 'إجمالي الرسوم', en: 'Subtotal', hi: 'उप-योग', ur: 'ذیلی کل', bn: 'উপমোট' },
      absherDiscount: { ar: 'خصم أبشر', en: 'Absher Discount', hi: 'अबशर छूट', ur: 'ابشر رعایت', bn: 'আবশের ছাড়' },
      officeDiscount: { ar: 'خصم المكتب', en: 'Office Discount', hi: 'कार्यालय छूट', ur: 'دفتر رعایت', bn: 'অফিস ছাড়' },
      item: { ar: 'البند', en: 'Item', hi: 'मद', ur: 'آئٹم', bn: 'আইটেম' },
      value: { ar: 'القيمة', en: 'Value', hi: 'मूल्य', ur: 'قیمت', bn: 'মূল্য' },
      importantNotice: { ar: 'إشعار هام', en: 'Important Notice', hi: 'महत्वपूर्ण सूचना', ur: 'اہم اطلاع', bn: 'গুরুত্বপূর্ণ বিজ্ঞপ্তি' },
      thankYou: { ar: 'شكراً لتعاملكم معنا', en: 'Thank You', hi: 'धन्यवाद', ur: 'شکریہ', bn: 'ধন্যবাদ' },
      cancelled: { ar: 'ملغاة', en: 'CANCELLED', hi: 'रद्द', ur: 'منسوخ', bn: 'বাতিল' },
      statusPriced: { ar: 'مسعّرة', en: 'Priced', hi: 'मूल्यांकित', ur: 'قیمت شدہ', bn: 'মূল্যায়িত' },
      statusApproved: { ar: 'مصدّقة', en: 'Approved', hi: 'अनुमोदित', ur: 'منظور شدہ', bn: 'অনুমোদিত' },
      statusInvoiced: { ar: 'مفوترة', en: 'Invoiced', hi: 'चालान जारी', ur: 'انوائس شدہ', bn: 'চালানকৃত' },
    }
    const lab = k => esc((L[k] && (L[k][printLang] || L[k].en || L[k].ar)) || k)
    const curTxt = printLang === 'ar' ? 'ريال' : printLang === 'ur' ? 'ریال' : 'SAR'
    const cur = `<span class="riyal">${curTxt}</span>`
    const num2 = v => `<span class="num">${esc(v)}</span>`
    const secTitle = k => `<div class="sec-title"><span class="bar"></span><h3>${lab(k)}</h3><span class="ln"></span></div>`
    const kvRow = (k, v, strong) => v ? `<div class="kv"><span class="k">${k}</span><span class="v${strong ? ' strong' : ''}">${v}</span></div>` : ''

    // ── استخراج البيانات (يطابق شاشة تفاصيل التسعيرة) ──
    const today = new Date()
    const workerName = r.worker_name || '—'
    const iqamaNo = r.iqama_number || '—'
    const phone = r.phone ? String(r.phone).replace(/^\+?966/, '0') : '—'
    const quoteNo = noDash(r.quote_no || ('R-' + String(r.id || '').slice(0, 8).toUpperCase()))
    const dob = r.dob
    const ageY = (() => { if (!dob) return null; const b = new Date(dob); if (isNaN(b)) return null; let a = today.getFullYear() - b.getFullYear(); const mo = today.getMonth() - b.getMonth(); if (mo < 0 || (mo === 0 && today.getDate() < b.getDate())) a--; return a })()
    const nat = natOf(r)
    const natObj = { ar: nat?.name_ar || r.nationality || '', en: nat?.name_en || '', flag: nat?.flag_url || '' }
    const pickNat = (printLang === 'ar' || printLang === 'ur') ? (natObj.ar || natObj.en) : (natObj.en || natObj.ar)
    const occ = r.occupation_name_ar || detailWorkerOcc || ''
    const changeProf = !!r.change_profession
    const newOcc = r.new_occupation_name_ar || ''
    const renMo = Number(r.renewal_months || 0)
    const fIqama = Number(r.iqama_renewal_fee || 0)
    const fWP = Number(r.work_permit_fee || 0)
    const fProf = Number(r.prof_change_fee || 0)
    const fMed = Number(r.medical_fee || 0)
    const fLate = Number(r.late_fine_amount || 0)
    const officeFee = Number(r.office_fee || 0)
    const govExcess = Number(r.gov_excess || 0)
    // الخصم = ما يغطيه المكتب من الرسوم الحكومية — مجمّد في عمود office_cover؛ الحساب احتياطي للسجلات القديمة
    const cover = r.office_cover != null ? Number(r.office_cover) : Math.max(0, fIqama + fWP + fMed - govExcess)
    const absher = Number(r.absher_discount || 0)
    const manualDisc = Number(r.manual_discount || 0)
    const finalTotal = Number(r.total_amount || 0)
    const subtotalV = Number(r.subtotal || 0) || (officeFee + govExcess + fLate + fProf)
    const extras = (Array.isArray(r.extras) ? r.extras : []).filter(e => Number(e?.amount) > 0)
    const dateVal = r.priced_at || r.created_at
    const cancelled = r.status === 'cancelled'
    const stKey = r.status === 'approved' ? 'statusApproved' : (r.status === 'invoiced' || r.status === 'completed') ? 'statusInvoiced' : r.status === 'cancelled' ? 'cancelled' : 'statusPriced'
    const moWord = printLang === 'ar' ? 'شهر' : printLang === 'en' ? (renMo === 1 ? 'month' : 'months') : printLang === 'hi' ? 'माह' : printLang === 'bn' ? 'মাস' : 'ماہ'
    const durLabel = renMo > 0 ? `${renMo} ${moWord}` : ''
    const billedMos = r.billed_renewal_months != null ? Number(r.billed_renewal_months) : (() => { let billed = renMo; const exp = r.iqama_expiry_gregorian ? new Date(r.iqama_expiry_gregorian) : null; if (exp && !isNaN(exp)) { const ref = dateVal ? new Date(dateVal) : new Date(); ref.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0); if (exp < ref) { const end = new Date(ref); end.setMonth(end.getMonth() + renMo); let mm = (end.getFullYear() - exp.getFullYear()) * 12 + (end.getMonth() - exp.getMonth()); let d = end.getDate() - exp.getDate(); if (d < 0) { mm -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() } billed = d > 0 ? mm + 1 : mm } } return billed })()
    const renIqamaSuffix = billedMos > 0 ? ` (${num2(billedMos)} ${moWord})` : ''
    const renSuffix = renMo > 0 ? ` (${num2(renMo)} ${moWord})` : ''
    const lineItems = [fIqama > 0 ? ['iqamaRenewal', fIqama] : null, fWP > 0 ? ['workPermit', fWP] : null, fProf > 0 ? ['profChange', fProf] : null, fMed > 0 ? ['medical', fMed] : null, fLate > 0 ? ['lateFine', fLate] : null].filter(Boolean)

    const natBadge = () => { if (natObj.flag) return ` <img class="flag" src="${esc(natObj.flag)}" alt="${esc(pickNat)}" title="${esc(pickNat)}"/>`; return (pickNat && pickNat !== '—') ? ` <span class="nat-txt">${esc(pickNat)}</span>` : '' }

    const heroBlk = `
<div class="hero-wrap">
<div class="svc-type"><span class="svc-name">${lab('renewalQuote')}</span></div>
<section class="hero">
<span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
<div class="hero-main">
<div class="hero-eyebrow"><span class="star">★</span> ${lab('finalTotal')}</div>
<div class="hero-amount"><span class="val">${num2(nm2(finalTotal))}</span><span class="cur">${curTxt}</span></div>
</div>
<div class="hero-side">
<div class="hero-fact"><div class="k">${lab('date')}</div><div class="v">${num2(fmtD2(dateVal))}</div></div>
<div class="hero-fact"><div class="k">${lab('status')}</div><div class="v">${lab(stKey)}</div></div>
${durLabel ? `<div class="hero-fact full"><div class="k">${lab('expectedDuration')}</div><div class="v remain">${esc(durLabel)}</div></div>` : ''}
</div>
</section></div>`

    const statusBlk = `<div class="office-code">${lab('status')}: <span style="color:var(--gold);font-weight:600;margin-inline-start:6px">${lab(stKey)}</span></div>`

    const idLine = (iqamaNo && iqamaNo !== '—') ? kvRow(lab('iqamaNo'), num2(iqamaNo)) : ''
    const phoneLine = (phone && phone !== '—') ? kvRow(lab('phoneLbl'), num2(phone)) : ''
    // كرت العامل (تصميم الاسم البارز): الاسم في الترويسة، والحقول خلايا مكدّسة (التسمية فوق والقيمة تحتها).
    const yrWord = printLang === 'ar' ? 'سنة' : printLang === 'en' ? 'yrs' : printLang === 'hi' ? 'वर्ष' : printLang === 'bn' ? 'বছর' : 'سال'
    const dobVal = dob ? `${ageY != null ? `<span style="font-size:8px;color:var(--ink-soft)">(${num2(ageY)} ${yrWord})</span> ` : ''}${num2(fmtD2(dob))}` : ''
    const nameDir = /[A-Za-z]/.test(workerName) ? 'ltr' : 'rtl'
    const wcell = (k, v) => v ? `<div class="wh-cell"><span class="wh-cl">${k}</span><span class="wh-cv">${v}</span></div>` : ''
    const workerFields = [
      wcell(lab('iqamaNo'), (iqamaNo && iqamaNo !== '—') ? num2(iqamaNo) : ''),
      wcell(lab('iqamaExpiryG'), r.iqama_expiry_gregorian ? num2(fmtD2(r.iqama_expiry_gregorian)) : ''),
      wcell(lab('occupation'), occ ? esc(occ) : '—'),
      wcell(lab('birthDate'), dobVal),
      wcell(lab('phoneLbl'), (phone && phone !== '—') ? num2(phone) : ''),
    ].filter(Boolean).join('')
    const workerCard = `<div class="card"><div class="wh-head"><span class="wh-name" style="direction:rtl">${natBadge()}<span style="direction:${nameDir}">${esc(workerName)}</span></span><span class="wh-tag">${lab('workerCard')}</span><span class="wh-line"></span></div><div class="wh-grid">${workerFields}</div></div>`
    // كرت المنشأة: منشأة العامل (مُشتقّة من سجل العامل)
    const fac = detailFacility
    const facName = fac ? ((printLang === 'en' ? (fac.name_en || fac.name_ar) : fac.name_ar) || '') : ''
    const facFields = [
      wcell(lab('unifiedNo'), fac && fac.unified_number ? num2(fac.unified_number) : ''),
      wcell(lab('molNo'), fac && fac.hrsd_number ? num2(fac.hrsd_number) : ''),
      wcell(lab('gosiNo'), fac && fac.gosi_number ? num2(fac.gosi_number) : ''),
    ].filter(Boolean).join('')
    const facIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b8932c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>`
    const facilityCard = fac ? `<div class="card"><div class="wh-head"><span class="wh-name" style="direction:rtl">${facIcon}${esc(facName)}</span><span class="wh-tag">${lab('facilityCard')}</span><span class="wh-line"></span></div><div class="wh-grid">${facFields}</div></div>` : ''
    // كرت التجديد (تصميم الاسم البارز): الإعفاء + مدة التجديد + التأمين الطبي + تغيير المهنة + المهنة الجديدة + انتهاء الإقامة
    const yesNoTxt = v => v === true ? lab('yes') : v === false ? lab('no') : '—'
    // تاريخ انتهاء الإقامة المتوقع = (تاريخ الانتهاء الحالي إن كان مستقبلاً، وإلا تاريخ التسعير) + مدة التجديد.
    // تاريخ الانتهاء المتوقع — مجمّد في عمود expected_expiry_date؛ الحساب احتياطي للسجلات القديمة
    const expExpiry = r.expected_expiry_date ? new Date(r.expected_expiry_date) : (() => {
      if (!renMo) return null
      const exp = r.iqama_expiry_gregorian ? new Date(r.iqama_expiry_gregorian) : null
      const ref = dateVal ? new Date(dateVal) : new Date(today)
      const base = (exp && !isNaN(exp) && exp > ref) ? new Date(exp) : new Date(ref)
      if (isNaN(base)) return null
      base.setMonth(base.getMonth() + renMo)
      return base
    })()
    const renewalFields = [
      wcell(lab('exemptionLbl'), yesNoTxt(r.exemption)),
      wcell(lab('renewalPeriod'), renMo > 0 ? `${num2(renMo)} ${moWord}` : ''),
      wcell(lab('expectedExpiry'), expExpiry ? num2(fmtD2(expExpiry)) : ''),
      // التأمين الطبي إجباري ويُحتسب دائماً — يظهر كرسم في جدول الأسعار، فلا داعي لصف «نعم/لا» المضلّل
      wcell(lab('changeOccupation'), yesNoTxt(r.change_profession)),
      (changeProf && newOcc) ? wcell(lab('newOccupation'), esc(newOcc)) : '',
      r.iqama_expiry_hijri ? wcell(lab('iqamaExpiryH'), num2(r.iqama_expiry_hijri)) : '',
    ].filter(Boolean).join('')
    const renIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b8932c" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`
    const renewalCard = renewalFields ? `<div class="card"${facilityCard ? ' style="grid-column:1/-1"' : ''}><div class="wh-head"><span class="wh-name" style="direction:rtl">${renIcon}${lab('renewalCard')}</span><span class="wh-line"></span></div><div class="wh-grid">${renewalFields}</div></div>` : ''
    const workerBlk = secTitle('workerSection') + `<div class="cards">${workerCard}${facilityCard}${renewalCard}</div>`

    const priceRows = lineItems.map(([k, amt]) => `<tr><td>${lab(k)}${k === 'iqamaRenewal' ? renIqamaSuffix : k === 'workPermit' ? renSuffix : ''}</td><td class="l">${num2(nm2(amt))} ${cur}</td></tr>`).join('')
    const extraRows = extras.map(e => `<tr><td>${esc(e.name || '')}</td><td class="l">${num2(nm2(Number(e.amount)))} ${cur}</td></tr>`).join('')
    const coverRow = cover > 0 ? `<tr><td>${lab('discount')}</td><td class="l" style="color:var(--ok)">${num2(nm2(cover))} ${cur}</td></tr>` : ''
    const officeRow = officeFee > 0 ? `<tr><td>${lab('officeFee')}</td><td class="l">${num2(nm2(officeFee))} ${cur}</td></tr>` : ''
    const priceTbl = `<table class="price-table"><thead><tr><th>${lab('item')}</th><th class="l">${lab('value')}</th></tr></thead><tbody>${priceRows}${extraRows}${officeRow}${coverRow}<tr class="total-row"><td>${lab('subtotal')}</td><td class="l">${num2(nm2(subtotalV))} ${cur}</td></tr></tbody></table>`
    const sumRows = `<div class="sum-row"><span class="k">${lab('subtotal')}</span><span class="v">${num2(nm2(subtotalV))} ${cur}</span></div>` + (absher > 0 ? `<div class="sum-row paid"><span class="k">${lab('absherDiscount')}</span><span class="v">${num2(nm2(absher))} ${cur}</span></div>` : '') + (manualDisc > 0 ? `<div class="sum-row paid"><span class="k">${lab('officeDiscount')}</span><span class="v">${num2(nm2(manualDisc))} ${cur}</span></div>` : '') + `<div class="sum-row remain"><span class="k">${lab('finalTotal')}</span><span class="v">${num2(nm2(finalTotal))} ${cur}</span></div>`
    const summaryBlk = `<div class="summary-card">${sumRows}</div>`
    const priceSummaryBlk = secTitle('pricing') + `<div class="price-summary">${priceTbl}${summaryBlk}</div>`

    const noticeByLang = {
      ar: 'هذه التسعيرة تقديرية وقابلة للتغيير وفق الرسوم الحكومية وقت تنفيذ المعاملة، وصلاحيتها 4 أيام من تاريخ إصدارها.',
      en: 'This quotation is an estimate, subject to change per government fees at the time of processing, and valid for 4 days from its issue date.',
      hi: 'यह कोटेशन एक अनुमान है, जो प्रसंस्करण के समय सरकारी शुल्क के अनुसार बदल सकता है, और जारी होने की तिथि से 4 दिनों के लिए वैध है।',
      ur: 'یہ کوٹیشن تخمینی ہے، کارروائی کے وقت سرکاری فیس کے مطابق تبدیل ہو سکتی ہے، اور اجرا کی تاریخ سے 4 دن کے لیے کارآمد ہے۔',
      bn: 'এই কোটেশনটি একটি প্রাক্কলন, যা প্রক্রিয়াকরণের সময় সরকারি ফি অনুযায়ী পরিবর্তিত হতে পারে এবং ইস্যু তারিখ থেকে ৪ দিনের জন্য বৈধ।',
    }
    const noticeFullByLang = {
      ar: 'هذه التسعيرة تقديرية وقابلة للتغيير وفق الرسوم الحكومية وقت تنفيذ المعاملة وصلاحيتها 4 أيام من تاريخ إصدارها، وتتأكد بعد التصديق عليها، والمستند المعتمد للمحاسبة هو الفاتورة الصادرة بعدها وليست هذه الحسبة.',
      en: 'This quotation is an estimate, subject to change per government fees at the time of processing and valid for 4 days from its issue date, confirmed only upon certification, with the invoice issued thereafter — not this quote — being the accountable document for billing.',
      hi: 'यह कोटेशन एक अनुमान है, जो प्रसंस्करण के समय सरकारी शुल्क के अनुसार बदल सकता है और जारी होने की तिथि से 4 दिनों के लिए वैध है, प्रमाणन के बाद ही पुष्ट होता है, तथा बिलिंग के लिए उत्तरदायी दस्तावेज़ बाद में जारी चालान है, यह कोटेशन नहीं।',
      ur: 'یہ کوٹیشن تخمینی ہے، کارروائی کے وقت سرکاری فیس کے مطابق تبدیل ہو سکتی ہے اور اجرا کی تاریخ سے 4 دن کے لیے کارآمد ہے، تصدیق کے بعد ہی حتمی ہوتی ہے، اور حساب کتاب کے لیے معتبر دستاویز بعد میں جاری ہونے والا انوائس ہے، یہ کوٹیشن نہیں۔',
      bn: 'এই কোটেশনটি একটি প্রাক্কলন, যা প্রক্রিয়াকরণের সময় সরকারি ফি অনুযায়ী পরিবর্তিত হতে পারে এবং ইস্যু তারিখ থেকে ৪ দিনের জন্য বৈধ, অনুমোদনের পরেই নিশ্চিত হয়, এবং বিলিংয়ের জন্য দায়বদ্ধ নথি হলো পরে ইস্যু করা চালান, এই কোটেশন নয়।',
    }
    const showBinding = !cancelled && r.status !== 'invoiced' && r.status !== 'completed'
    const noticeSrc = showBinding ? noticeFullByLang : noticeByLang
    const noticePrimary = noticeSrc[printLang] || noticeSrc.en
    const noticeBlk = `<div class="notice"><div class="ttl">⚠ ${lab('importantNotice')}</div><div class="ar">${esc(noticePrimary)}</div></div>`
    const wm = cancelled ? `<div class="cancel-wm">${lab('cancelled')}</div>` : ''

    const html = `<!DOCTYPE html><html dir="${rtl ? 'rtl' : 'ltr'}" lang="${printLang}"><head><meta charset="utf-8"><title>${lab('renewalQuote')} ${esc(quoteNo)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&family=Tajawal:wght@300;400;500;700;800&family=Noto+Sans+Devanagari:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;600;700&family=Playfair+Display:wght@700&display=swap">
<style>
:root{--ink:#1a1a1a;--ink-soft:#4a4640;--charcoal:#14110b;--gold:#d4af37;--gold-deep:#b8932c;--gold-soft:#e8d49a;--gold-faint:#f6efdc;--paper:#fff;--line:#e4ddcb;--hair:#cdbf95;--ok:#1c7a4a;--ok-bg:#e7f3ec;--warn:#a8741a;--warn-bg:#fbf2dd;--no:#9a2f2f;--no-bg:#f6e6e6}
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}
html,body{background:#cfcfcf}
body{font-family:'Tajawal','Noto Naskh Arabic','Noto Sans Devanagari','Noto Sans Bengali',sans-serif;color:var(--ink);font-size:12.5px;line-height:1.35;-webkit-font-smoothing:antialiased}
.num{direction:ltr;font-variant-numeric:tabular-nums;unicode-bidi:isolate;display:inline-block}
h1,h2,h3,h4,.kufi{font-family:'Reem Kufi','Tajawal',sans-serif}
@page{size:A4;margin:0}
.page{width:210mm;min-height:297mm;margin:0 auto;background:var(--paper);position:relative;overflow:hidden;box-shadow:0 2px 18px rgba(0,0,0,.25)}
.page2{display:flex;flex-direction:column}
.page2 .pad{flex:1;display:flex;flex-direction:column}
.page2-bottom{margin-top:auto}
.pad{padding:0 14mm}
.masthead{background:linear-gradient(135deg,#1f1a10 0%,#14110b 55%,#0e0b06 100%);color:#fff;padding:8mm 14mm 6mm;position:relative}
.masthead::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-soft),var(--gold),var(--gold-deep))}
.masthead .corner{position:absolute;width:24px;height:24px;opacity:.9}
.masthead .corner.tl{top:5mm;right:5mm;border-top:1.5px solid var(--gold);border-right:1.5px solid var(--gold)}
.masthead .corner.tr{top:5mm;left:5mm;border-top:1.5px solid var(--gold);border-left:1.5px solid var(--gold)}
.mast-row{display:flex;justify-content:space-between;align-items:stretch;gap:14px}
.inv-id{display:flex;flex-direction:column}
.inv-id .office-code{margin-top:8px;align-self:flex-end}
.brand{display:flex;flex-direction:column;align-items:flex-start}
.brand .group{font-family:'Playfair Display',serif;font-weight:600;font-size:23px;color:var(--gold);letter-spacing:.5px;direction:ltr;line-height:1.05;margin-bottom:16px}
.brand .name-ar{font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:16.5px;color:var(--gold-soft);letter-spacing:.3px;line-height:1.2}
.brand .name-en{font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:11px;color:#9b9482;letter-spacing:2.2px;margin-top:6px}
.brand .meta{margin-top:auto;padding-top:10px;font-size:12px;color:#d8d2c2;line-height:1.45}
.brand .meta .ar{display:block}
.brand .meta .en{display:block;color:#9b9482;font-size:10.5px;letter-spacing:.4px}
.brand .meta .mob{display:flex;align-items:center;gap:6px;margin-top:1px;font-size:12.5px;color:var(--gold-soft)}
.inv-id{text-align:end;align-items:flex-end}
.inv-id .tag{font-family:'Reem Kufi',sans-serif;font-size:13.5px;letter-spacing:1px;color:#fff;font-weight:600}
.inv-id .no-box{margin-top:7px;border:1px solid var(--gold);background:rgba(212,175,55,.07);padding:6px 14px;display:inline-block}
.inv-id .no-lbl{font-size:9.5px;color:#b9b09a;letter-spacing:1.5px}
.inv-id .no-val{font-family:'Reem Kufi',sans-serif;font-size:18px;color:var(--gold);font-weight:600}
.inv-id .date-line{margin-top:6px;font-size:10.5px;color:#cfc8b6}
.inv-id .date-line .num{color:#fff;font-weight:600}
.office-code{display:inline-flex;align-items:center;gap:7px;margin-top:8px;padding:5px 13px;border:1px solid var(--gold);background:rgba(212,175,55,.08);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:12px;letter-spacing:1px}
.office-code .num{color:var(--gold);font-weight:600;font-size:13.5px}
.hero-wrap{padding:5mm 14mm 0}
.svc-type{display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:3.5mm}
.svc-type .svc-name{font-family:'Reem Kufi',sans-serif;font-size:24px;font-weight:600;color:var(--charcoal);letter-spacing:.3px}
.hero{background:linear-gradient(140deg,#1c1810 0%,#14110b 60%,#0c0904 100%);color:#fff;position:relative;padding:3.5mm 8mm 3.5mm;display:flex;gap:8mm;align-items:center;border:1px solid #2c2517}
.hero::before{content:"";position:absolute;inset:0;border:1px solid rgba(212,175,55,.32);margin:5px;pointer-events:none}
.hero .corner{position:absolute;width:20px;height:20px;z-index:2}
.hero .corner.tl{top:0;right:0;border-top:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.tr{top:0;left:0;border-top:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero .corner.bl{bottom:0;right:0;border-bottom:2px solid var(--gold);border-right:2px solid var(--gold)}
.hero .corner.br{bottom:0;left:0;border-bottom:2px solid var(--gold);border-left:2px solid var(--gold)}
.hero-main{flex:0 0 auto;min-width:72mm;position:relative;z-index:1}
.hero-eyebrow{display:flex;align-items:center;gap:8px;font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:15.5px;letter-spacing:.5px;color:var(--gold-soft)}
.hero-eyebrow .star{color:var(--gold);font-size:14.5px}
.hero-amount{display:flex;align-items:baseline;gap:9px;margin-top:3px}
.hero-amount .val{font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:40px;line-height:1;color:var(--gold);letter-spacing:.5px;text-shadow:0 1px 0 rgba(0,0,0,.4)}
.hero-amount .cur{font-size:19px;color:var(--gold-soft);font-weight:500;font-family:'Reem Kufi',sans-serif}
.riyal{margin-inline-start:5px;white-space:nowrap}
.flag{width:21px;height:14px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.18);vertical-align:middle;margin-inline-start:7px}
.nat-txt{font-size:11px;color:var(--gold-deep);font-weight:600;margin-inline-start:6px}
.hero-sub{margin-top:7px;font-size:11px;color:#cdc6b4}
.hero-sub b{color:#fff;font-weight:600}
.hero-side{flex:1;position:relative;z-index:1;display:grid;grid-template-columns:1fr 1fr;align-content:center;border-inline-start:1px solid rgba(212,175,55,.25);padding-inline-start:8mm;margin-inline-start:2mm}
.hero-fact{padding:4px 10px 4px 0}
.hero-fact .k{font-size:10.5px;color:var(--gold-soft);letter-spacing:1.2px;font-family:'Reem Kufi',sans-serif;font-weight:600}
.hero-fact .v{font-size:14px;color:#fff;font-weight:600;margin-top:2px}
.hero-fact.full{grid-column:1 / -1;border-top:1px solid rgba(255,255,255,.08);margin-top:3px;padding-top:6px}
.hero-fact.full .k{color:var(--gold-soft);font-size:10.5px;font-weight:600}
.hero-fact .v.remain{color:var(--gold);font-family:'Reem Kufi',sans-serif;font-size:19px}
.hero-fact .dur-note{font-size:8.5px;color:#b9a86a;font-weight:400;margin-top:2px;letter-spacing:.2px}
.sec-title{display:flex;align-items:center;gap:9px;margin:4.5mm 0 2.5mm}
.sec-title .bar{width:4px;height:14px;background:var(--gold)}
.sec-title h3{font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:14px;color:var(--charcoal);letter-spacing:.3px}
.sec-title .ln{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--hair))}
[dir=ltr] .sec-title .ln{background:linear-gradient(90deg,var(--hair),transparent)}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.card{border:1px solid var(--line);background:#fff;padding:3.5mm 4mm 3mm}
.wh-head{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}
.wh-name{font-size:13px;font-weight:600;color:var(--ink);display:inline-flex;align-items:center;gap:6px;flex:0 1 auto;min-width:0;overflow-wrap:anywhere}
.wh-tag{font-size:9px;color:#9a917b;letter-spacing:.5px;white-space:nowrap;flex:0 0 auto}
.wh-line{flex:1;height:1px;background:#ece5d3;min-width:8px;align-self:center}
.wh-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 6mm}
.wh-cell{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:1.5px 0;border-bottom:1px dotted #ece5d3}
.wh-cl{font-size:9px;color:var(--ink-soft);white-space:nowrap}
.wh-cv{font-size:10px;font-weight:600;color:var(--ink);text-align:end}
.card h4{font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:12px;color:var(--gold-deep);margin-bottom:2.5mm;letter-spacing:.3px;display:flex;justify-content:flex-start;align-items:center}
.kv{display:flex;justify-content:space-between;gap:10px;padding:2.5px 0;border-bottom:1px dotted #ece5d3}
.kv:last-child{border-bottom:0}
.kv .k{color:var(--ink-soft);font-size:11px;white-space:nowrap}
.kv .v{color:var(--ink);font-weight:500;font-size:11.5px;text-align:end}
.kv .v.strong{font-weight:600}
table{width:100%;border-collapse:collapse}
thead th{background:var(--charcoal);color:var(--gold-soft);font-family:'Reem Kufi',sans-serif;font-weight:500;font-size:10.5px;letter-spacing:.5px;padding:5.5px 9px;text-align:start}
thead th.l{text-align:end}
tbody td{padding:5.5px 9px;font-size:11.5px;border-bottom:1px solid var(--line);color:var(--ink)}
tbody td.l{text-align:end}
tbody tr:nth-child(even){background:#faf7ee}
.price-summary{display:grid;grid-template-columns:1.25fr 1fr;gap:6mm;align-items:start}
.price-table .total-row td{background:var(--charcoal);color:var(--gold);font-family:'Reem Kufi',sans-serif;font-weight:600;font-size:14px;border-bottom:0}
.price-table .total-row td.l{white-space:nowrap}
.price-table .total-row td .num{color:var(--gold-soft)}
.summary-card{border:1px solid var(--charcoal);background:linear-gradient(160deg,#1c1810,#14110b);color:#fff;padding:5mm}
.summary-card .sum-row{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.09)}
.summary-card .sum-row .k{font-size:11.5px;color:#c9c0aa;font-family:'Reem Kufi',sans-serif}
.summary-card .sum-row .v{font-size:14.5px;font-weight:600;color:#E6B43C}
.summary-card .sum-row.paid .v{color:#2FA85A}
.summary-card .sum-row.remain{border-bottom:0;margin-top:2px;padding-top:7px;border-top:1.5px solid var(--gold)}
.summary-card .sum-row.remain .k{color:var(--gold-soft);font-size:13px}
.summary-card .sum-row.remain .v{color:var(--gold);font-family:'Reem Kufi',sans-serif;font-size:25px}
.notice{margin-top:4.5mm;background:var(--charcoal);color:#e9e2cf;padding:4mm 6mm;position:relative}
.notice::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold-deep),var(--gold),var(--gold-deep))}
.notice .ttl{font-family:'Reem Kufi',sans-serif;font-weight:600;color:var(--gold);font-size:12px;letter-spacing:.5px;margin-bottom:3px;display:flex;align-items:center;gap:7px}
.notice .ar{font-size:10.5px;line-height:1.55;color:#ddd5c1}
.notice .en{font-size:9.5px;line-height:1.5;color:#9b937e;direction:ltr;text-align:left;margin-top:4px;border-top:1px solid rgba(255,255,255,.08);padding-top:4px}
.footer-bar{display:flex;justify-content:space-between;align-items:center;padding:4mm 0;font-size:10px;color:#8a826b}
.footer-bar .kufi{color:var(--gold-deep);letter-spacing:1px}
.cancel-wm{position:absolute;top:46%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);font-family:'Reem Kufi',sans-serif;font-size:120px;font-weight:600;color:rgba(154,47,47,.10);letter-spacing:8px;white-space:nowrap;pointer-events:none;z-index:5}
@media print{html,body{background:#fff}.page{box-shadow:none;margin:0}}
</style></head><body>
<div class="page page2">
${wm}
<header class="masthead">
<span class="corner tl"></span><span class="corner tr"></span>
<div class="mast-row">
<div class="brand">
<div class="group">HUSSAIN OFFICES</div>
<div class="name-ar">تأشيرة البناء والإنشاء</div>
<div class="name-en">VISA ALBINA &amp; ALINSHA</div>
<div class="meta"><span class="ar">المملكة العربية السعودية، الجبيل</span><span class="en">Kingdom of Saudi Arabia – Al Jubail</span><span class="mob"><span>${lab('phoneLbl')}:</span><span class="num">0569036528</span></span></div>
</div>
<div class="inv-id">
<div class="tag">${lab('renewalQuote')}</div>
<div class="no-box"><div class="no-lbl">${lab('quoteNoLbl')}</div><div class="no-val"><span class="num">${esc(quoteNo)}</span></div></div>
<div class="date-line">${lab('issueDate')}: <span class="num">${fmtD2(dateVal)}</span></div>
${statusBlk}
</div>
</div>
</header>
${heroBlk}
<div class="pad">
${workerBlk}
${priceSummaryBlk}
<div class="page2-bottom">
${noticeBlk}
<div class="footer-bar" style="border-top:1px solid var(--hair);margin-top:5mm"><span class="kufi">تأشيرة البناء والإنشاء — VISA ALBINA &amp; ALINSHA</span><span>${printLang === 'ar' ? 'شكراً لتعاملكم معنا' : lab('thankYou')} · <span class="num">${esc(quoteNo)}</span> · <span class="num">${fmtD2(dateVal)}</span></span></div>
</div>
</div>
</div>
</body></html>`

    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:0;height:0;border:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.open(); doc.write(html); doc.close()
    const cleanup = () => { try { document.body.removeChild(iframe) } catch {} }
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.onafterprint = () => setTimeout(cleanup, 100); iframe.contentWindow.print() }
      catch { cleanup() }
    }, 900)
    setTimeout(cleanup, 60000)
  }

  // العنوان (يظهر فوراً عند فتح الصفحة) — يُعاد استخدامه في حالة التحميل وفي القائمة
  const listHeader = (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('حسبة تجديد الإقامات', 'Renewal Calculator')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>{T('حساب تكاليف تجديد الإقامة وإصدار التسعيرات ومتابعة حالتها', 'Iqama renewal cost calculation, quote issuance and status tracking')}</div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx3)', marginTop: 6, lineHeight: 1.6, opacity: .8 }}>{T('كروت الإحصاء إجمالي تراكمي دائم يشمل جميع التسعيرات (غير مرتبطة بيوم أو أسبوع)', 'The stat cards are all-time totals across every quote (not daily or weekly)')}</div>
        </div>
        {canPerm(user, 'renewal_calc.create') && <button onClick={() => onNewCalc?.()} className="btn-primary-modal"
          style={{ height: 42, padding: '0 18px', borderRadius: 11, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease' }}>
          {T('حسبة تجديد إقامة', 'New Renewal Quote')}
          <RefreshCw size={16} strokeWidth={2.2} />
        </button>}
      </div>
    </div>
  )

  if (loading) return <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, direction: dir }}>{listHeader}<RnwSkeleton /></div>

  // ═══════════════ شاشة التفاصيل ═══════════════
  if (detailsRow) {
    const r = detailsRow
    const fmt = v => (v === null || v === undefined || v === '') ? '—' : v
    const fmtD = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') }
    const ageYears = (() => { if (!r.dob) return null; const b = new Date(r.dob); if (isNaN(b)) return null; const t = new Date(); let y = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) y -= 1; return (y >= 0 && y < 130) ? y : null })()
    const yesNo = v => v === true ? T('نعم', 'Yes') : v === false ? T('لا', 'No') : '—'
    const nat = natOf(r)
    const natFlag = nat?.flag_url || null
    const quoteNo = r.quote_no || '#' + String(r.id || '').slice(0, 8).toUpperCase()
    const branchCode = r._branchCode || r.priced_user?.branch?.code || r.created_user?.branch?.code

    // ── كروت بتصميم تسعيرة التنازل: رأس + (اسم اختياري) + شبكة خلايا ──
    const cardChrome = { background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }
    const cardHeader = { padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }
    const cardTitle = { fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }
    const srcLabel = m => (m.l[lang === 'en' ? 'en' : 'ar'])
    // زر «تعديل» موحّد لرأس الكرت — مُقيَّد بصلاحية تعديل الكرت + السماح بفتح نافذة التعديل
    const EDIT_CARD_MAP = { worker: 'worker_data', professional: 'worker_data', renewal: 'renewal_options', pricing: 'pricing' }
    const editBtn = (card) => { const ck = EDIT_CARD_MAP[card] || card; return (!canCardBtn(user, 'renewal_calc', ck, 'edit') || !modalAllowed(user, 'renewal_calc', 'edit_card')) ? null : <button onClick={() => openCardEdit(card)} style={{ marginInlineStart: 'auto', height: 28, padding: '0 12px', borderRadius: 8, background: 'transparent', border: '1px dashed ' + C.gold + '80', color: C.gold, fontFamily: F, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, transition: '.15s' }} onMouseEnter={e => { e.currentTarget.style.background = C.gold + '1a' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>{T('تعديل', 'Edit')}</button> }
    // سجل تغييرات الكرت — يجمع قيود iqama_renewal_calculation_audit لحقول الكرت (الشخص · كان→صار · التاريخ والوقت)
    const fmtAuditVal = (k, v) => {
      if (v === null || v === undefined || v === '') return '—'
      if (typeof v === 'boolean') return v ? T('نعم', 'Yes') : T('لا', 'No')
      if (k === 'nationality_id') { const n = (nationalities || []).find(x => x.id === v); return n ? (lang === 'en' ? (n.name_en || n.name_ar) : n.name_ar) : String(v).slice(0, 20) }
      if (typeof v === 'object') return JSON.stringify(v).slice(0, 40)
      return String(v).slice(0, 40)
    }
    const auditLog = (keys) => {
      const entries = []
      keys.forEach(k => { (detailsAudit[k] || []).forEach(a => entries.push({ ...a, _k: k })) })
      if (!entries.length) return null
      entries.sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
      return <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>{T('سجل التغييرات', 'Change Log')}</div>
        {entries.map((a, i) => { const who = nameOf(usersById[a.changed_by]); const dt = new Date(a.changed_at); const hhmm = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0'); return <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 9, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.7, wordBreak: 'break-word' }}>{rcFieldLabel(a._k)}: <span style={{ color: 'var(--tx4)' }}>{T('كان', 'was')} </span><span style={{ color: '#e5867a', textDecoration: 'line-through' }}>{fmtAuditVal(a._k, a.old_value)}</span><span style={{ color: 'var(--tx4)' }}> {T('صار', '→')} </span><span style={{ color: '#27a046' }}>{fmtAuditVal(a._k, a.new_value)}</span></div>
          <div style={{ display: 'flex', direction: dir, justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--tx5)' }}>{who ? <span style={{ fontWeight: 600, color: C.gold }}>{who}</span> : <span />}<span style={{ display: 'inline-flex', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}><span>{fmtD(a.changed_at)}</span><span>{hhmm}</span></span></div>
        </div> })}
      </div>
    }
    // شارة مصدر الحقل (آخر مصدر سجّل القيمة) — تظهر فقط عند وجود قيود تدقيق للحقل
    const srcBadge = (key) => {
      const ents = key ? (detailsAudit[key] || []) : []
      if (!ents.length) return null
      const latest = ents[ents.length - 1]; const m = SRC_META[latest?.source] || SRC_META.employee
      const editorName = (latest?.source === 'employee') ? nameOf(usersById[latest.changed_by]) : null
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600, background: m.c + '18', color: m.c, letterSpacing: '.2px', whiteSpace: 'nowrap', flexShrink: 0 }}>{ents.length > 1 ? '✎ ' : ''}{editorName || srcLabel(m)}</span>
    }
    const gridCard = (title, nameField, cells, flagUrl, dotColor, editCard, auditKeys) => {
      const ff = cells.filter(Boolean).filter(c => fieldVisible(user, 'renewal_calc', c.fk || c.key))
      return <div style={cardChrome}>
        <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor || C.gold }} /><span style={cardTitle}>{title}</span>{flagUrl && <img src={flagUrl} alt="" style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}{editCard && editBtn(editCard)}</div>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nameField && <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{nameField.label}</span>{srcBadge(nameField.key)}</span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, direction: 'ltr' }}>
              <CopyBtn text={nameField.value} lang={lang} />
              <span style={{ fontSize: 14, color: 'var(--tx1)', fontWeight: 600, lineHeight: 1.4, direction: nameField.ltr ? 'ltr' : 'rtl', textAlign: 'right', minWidth: 0, wordBreak: 'break-word' }}>{nameField.value || '—'}</span>
            </span>
          </div>}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, ff.length))},1fr)`, gap: 8 }}>
            {ff.map((f, i) => <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.label}</span>{srcBadge(f.key)}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, direction: 'ltr' }}>
                {f.tag && <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, color: C.gold, background: 'rgba(176,125,0,.08)', borderRadius: 20, padding: '3px 10px', direction: 'rtl', flexShrink: 0 }}>{f.tag}</span>}
                <CopyBtn text={f.copy != null ? f.copy : f.value} lang={lang} />
                <span style={{ fontSize: 13, color: f.color || 'var(--tx2)', fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word', minWidth: 0, ...(f.mono ? { fontFamily: 'monospace', direction: 'ltr', fontVariantNumeric: 'tabular-nums' } : { direction: 'rtl', textAlign: 'right' }) }}>{f.value || '—'}</span>
              </span>
            </div>)}
          </div>
          {auditKeys && auditLog(auditKeys)}
        </div>
      </div>
    }

    // بطاقة «هيرو» للعامل/المنشأة — مطابقة لتصميم كرت «العامل والمنشأة» في تفاصيل الفاتورة.
    const EntityHero = ({ icon, primary, secondary, latin, cells }) => (
      <div style={{ position: 'relative', border: '1px solid rgba(176,125,0,.4)', background: 'linear-gradient(135deg,rgba(176,125,0,.12),rgba(176,125,0,.02))', boxShadow: 'var(--shadow-md)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(176,125,0,.1)', border: '1.5px solid rgba(176,125,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>{icon}</div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
              <CopyBtn text={primary} lang={lang} />
              <span style={{ minWidth: 0, fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px', direction: latin ? 'ltr' : 'rtl', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primary || '—'}</span>
            </span>
            {secondary && <span style={{ fontSize: 11, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .7 }}>{secondary}</span>}
          </div>
        </div>
        {cells.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, Math.max(1, cells.length))},1fr)`, gap: 8 }}>
            {cells.map((c, i) => (
              <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, ...(c.span ? { gridColumn: `span ${c.span}` } : {}) }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600 }}>{c.label}</span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
                  {!c.rtl && <CopyBtn text={c.value} lang={lang} />}
                  <span style={{ minWidth: 0, fontSize: 13, color: c.color || (c.value ? 'var(--tx2)' : 'var(--tx4)'), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...(c.value && !c.rtl ? { direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' } : { direction: 'rtl', textAlign: 'right' }) }}>{c.value || '—'}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    )

    // بطاقة التسعير — سطر لكل رسم، ثم الإجمالي
    const feeLine = (label, amount, opts = {}) => { if (!amount && !opts.always) return null; return <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px dashed var(--bd)', gap: 10 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: opts.color || 'var(--tx2)' }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: opts.color || 'var(--tx)', direction: 'rtl', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{opts.neg ? '− ' : ''}{nm(Math.abs(amount))}</span> <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>{T('ريال', 'SAR')}</span></span>
    </div> }
    const extras = Array.isArray(r.extras) ? r.extras.filter(e => Number(e?.amount) > 0) : []

    const doneStamps = (() => {
      const done = s => (['priced', 'approved', 'invoiced', 'completed'].includes(r.status) && s === 'priced') || (['approved', 'invoiced', 'completed'].includes(r.status) && s === 'approved') || (['invoiced', 'completed'].includes(r.status) && s === 'invoiced')
      const s = []
      if (r.status === 'cancelled') {
        // الحسبة الملغاة تُبقي أختام المراحل التي تمّت فعلاً (تُقرأ من طوابعها الزمنية) ثم يُضاف ختم «ملغاة».
        if (r.priced_at) s.push({ lbl: stLabel.priced, clr: stClr.priced, by: nameOf(r.priced_user || r.created_user) })
        if (r.approved_at) s.push({ lbl: stLabel.approved, clr: stClr.approved, by: nameOf(r.approved_user) })
        if (r.invoiced_at || r.invoice_id) s.push({ lbl: stLabel.invoiced, clr: stClr.invoiced, by: nameOf(r.invoiced_user) })
        s.push({ lbl: stLabel.cancelled, clr: stClr.cancelled, by: nameOf(r.cancelled_user) || nameOf(r.priced_user || r.created_user) })
      }
      else {
        if (done('priced')) s.push({ lbl: stLabel.priced, clr: stClr.priced, by: nameOf(r.priced_user || r.created_user) })
        if (done('approved')) s.push({ lbl: stLabel.approved, clr: stClr.approved, by: nameOf(r.approved_user) })
        if (done('invoiced')) s.push({ lbl: stLabel.invoiced, clr: stClr.invoiced, by: nameOf(r.invoiced_user) })
      }
      return s
    })()

    return <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)', direction: dir }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
          <BackButton onBack={() => setDetailsRow(null)} label={T('رجوع', 'Back')} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <RefreshCw size={24} color={C.gold} strokeWidth={1.8} />
              <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{T('تفاصيل حسبة تجديد الاقامة', 'Renewal Quote Details')}</div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', fontSize: 13, color: 'var(--tx3)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
                <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}>{noDash(quoteNo)}</span>
                <button onClick={() => { navigator.clipboard?.writeText(noDash(quoteNo)); setCopied(true); setTimeout(() => setCopied(false), 1500) }} title={T('نسخ رقم التسعيرة', 'Copy quote no')} style={{ width: 20, height: 20, background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: copied ? C.ok : 'var(--tx4)' }}>
                  {copied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>}
                </button>
              </span>
              {branchCode && <><span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'var(--bd)' }} /><span title={T('المكتب', 'Branch')} style={{ color: C.gold, fontWeight: 600, fontSize: 13.5, direction: 'ltr' }}>{branchCode}</span></>}
              <span style={{ width: 3.5, height: 3.5, borderRadius: '50%', background: 'var(--bd)' }} />
              <span style={{ color: 'var(--tx4)', fontSize: 12.5 }}>{fmtD(r.created_at)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
            {doneStamps.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center', flexShrink: 0 }}>
              {doneStamps.map((s, i) => <div key={i} style={{ transform: 'rotate(-5deg)', border: `2.5px solid ${s.clr}`, borderRadius: 8, color: s.clr, padding: '6px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: .92, boxShadow: `inset 0 0 0 2px ${s.clr}33`, flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '1.5px', lineHeight: 1.1 }}>{s.lbl}</span>
                {s.by && <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.3px', opacity: .85 }}>{s.by}</span>}
              </div>)}
            </div>}
            {/* عدّاد صلاحية التسعيرة (5 أيام) — يظهر فقط قبل الفوترة وأثناء الحالات النشطة */}
            {!['invoiced', 'completed', 'cancelled'].includes(r.status) && (() => {
              const pricedAt = r.priced_at ? new Date(r.priced_at).getTime() : 0
              if (!pricedAt) return null
              const remainingMs = Math.max(0, (5 * 86400000) - (Date.now() - pricedAt)); const expired = remainingMs <= 0
              const remDays = Math.floor(remainingMs / 86400000); const remHrs = Math.floor((remainingMs % 86400000) / 3600000)
              const progress = expired ? 0 : (remainingMs / (5 * 86400000)); const ringClr = expired ? C.red : (remDays <= 1 ? C.gold : '#27a046')
              return <div title={expired ? T('انتهت الصلاحية', 'Expired') : T(`متبقي ${remDays} يوم و ${remHrs} ساعة`, `${remDays}d ${remHrs}h left`)} style={{ padding: 8, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6, boxSizing: 'border-box' }}>
                <div style={{ position: 'relative', width: 74, height: 74, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="74" height="74" viewBox="0 0 74 74" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="37" cy="37" r="32" fill="none" stroke="var(--bd)" strokeWidth="5" />
                    <circle cx="37" cy="37" r="32" fill="none" stroke={ringClr} strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 32} strokeDashoffset={2 * Math.PI * 32 * (1 - progress)} style={{ transition: 'stroke-dashoffset .5s ease' }} />
                  </svg>
                  <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', color: ringClr, lineHeight: 1 }}>
                    <span style={{ fontSize: 23, fontWeight: 600, lineHeight: 1 }}>{expired ? '!' : remDays}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 600, opacity: .78, marginTop: 2 }}>{expired ? T('انتهت', 'exp') : T('من 5 أيام', 'of 5d')}</span>
                  </div>
                </div>
              </div>
            })()}
          </div>
        </div>
      </div>

      <div style={{ direction: dir, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* كرت «العامل والمنشأة» — تصميم هيرو مطابق لتفاصيل الفاتورة (هيرو العامل + هيرو المنشأة) */}
          {cardVisible(user, 'renewal_calc', 'worker_data') && (
            <div style={cardChrome}>
              <div style={cardHeader}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
                <span style={cardTitle}>{T('العامل والمنشأة', 'Worker & Facility')}</span>
                {natFlag && <img src={natFlag} alt="" style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                {editBtn('worker')}
              </div>
              <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <EntityHero
                  icon={natFlag ? <img src={natFlag} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 11 }} /> : <User size={24} color={C.gold} strokeWidth={1.8} />}
                  primary={fieldVisible(user, 'renewal_calc', 'worker_name') ? r.worker_name : '—'} secondary={null} latin={/[A-Za-z]/.test(r.worker_name || '')}
                  cells={[
                    { fk: 'iqama_number', label: T('رقم الإقامة', 'Iqama No'), value: r.iqama_number },
                    { fk: 'rd_iqama_expiry', label: T('انتهاء الإقامة', 'Iqama Expiry'), value: r.iqama_expiry_gregorian ? fmtD(r.iqama_expiry_gregorian) : null, color: r.iqama_expired ? C.red : (r.iqama_expiry_gregorian ? '#27a046' : undefined) },
                    { fk: 'rd_occupation', label: T('المهنة الحالية', 'Current Occupation'), value: r.occupation_name_ar || detailWorkerOcc || null, rtl: true },
                    { fk: 'dob', label: T('العمر', 'Age'), value: ageYears != null ? ageYears + ' ' + T('سنة', 'y') : null, rtl: true },
                    { fk: 'phone', label: T('رقم الجوال', 'Phone'), value: r.phone ? String(r.phone).replace(/^\+?966/, '0') : null, span: 2 },
                  ].filter(c => fieldVisible(user, 'renewal_calc', c.fk))} />
                {detailFacility && (
                  <EntityHero
                    icon={<Building2 size={24} color={C.gold} strokeWidth={1.8} />}
                    primary={lang === 'en' ? (detailFacility.name_en || detailFacility.name_ar) : detailFacility.name_ar} secondary={null} latin={false}
                    cells={[
                      { fk: 'rd_fac_unified', label: T('الرقم الموحد', 'Unified No'), value: detailFacility.unified_number },
                      { fk: 'rd_fac_hrsd', label: T('رقم وزارة العمل', 'MOL No'), value: detailFacility.hrsd_number },
                      { fk: 'rd_fac_gosi', label: T('رقم التأمينات', 'GOSI No'), value: detailFacility.gosi_number },
                    ].filter(c => fieldVisible(user, 'renewal_calc', c.fk))} />
                )}
                {auditLog(CARD_FIELDS.worker)}
              </div>
            </div>
          )}

          {cardVisible(user, 'renewal_calc', 'renewal_options') && gridCard(T('التجديد', 'Renewal'), null, [
            { label: T('الإعفاء', 'Exemption'), value: yesNo(r.exemption), color: r.exemption === true ? C.gold : (r.exemption === false ? 'var(--tx2)' : 'var(--tx5)'), key: 'exemption' },
            { label: T('مدة التجديد', 'Renewal Period'), value: r.renewal_months ? r.renewal_months + ' ' + T('شهر', 'mo') : null, color: C.gold, key: 'renewal_months' },
            { label: T('تغيير المهنة', 'Change Occupation'), value: yesNo(r.change_profession), color: r.change_profession === true ? C.gold : (r.change_profession === false ? 'var(--tx2)' : 'var(--tx5)'), key: 'change_profession' },
            r.change_profession && r.new_occupation_name_ar ? { label: T('المهنة الجديدة', 'New Occupation'), value: r.new_occupation_name_ar, color: C.gold, key: 'new_occupation_name_ar' } : null,
            r.work_permit_expiry ? { label: T('انتهاء رخصة العمل', 'Work Permit Expiry'), value: fmtD(r.work_permit_expiry), mono: true, key: 'work_permit_expiry' } : null,
          ], null, C.gold, 'renewal', CARD_FIELDS.renewal)}


          {cardVisible(user, 'renewal_calc', 'pricing') && (
          <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={{ fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '.2px' }}>{T('التسعيرة', 'Pricing')}</span>
              {editBtn('pricing')}
            </div>
            {/* نفس تخطيط تسعيرة نقل الكفالة: بنود الرسوم الكاملة بالأعلى ثم «الخصم» (تغطية المكتب)، يليها رسوم المكتب + الإجمالي الابتدائي + الخصومات، ثم الإجمالي النهائي.
                تغطية المكتب = (تجديد الإقامة + رخصة العمل + التأمين) − الزائد عن الحدود الحكومية. */}
            {(() => {
              const nmSar = v => (v === null || v === undefined || v === '') ? '—' : nm(v) + ' ' + T('ريال', 'SAR')
              const renMonths = Number(r.renewal_months || 0)
              // القيم المشتقّة مجمّدة في أعمدة وقت الإصدار؛ الحساب أدناه احتياطي للسجلات القديمة فقط.
              const billedIqamaMos = r.billed_renewal_months != null ? Number(r.billed_renewal_months) : (() => { let billed = renMonths; const exp = r.iqama_expiry_gregorian ? new Date(r.iqama_expiry_gregorian) : null; if (exp && !isNaN(exp)) { const ref = r.priced_at ? new Date(r.priced_at) : new Date(); ref.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0); if (exp < ref) { const end = new Date(ref); end.setMonth(end.getMonth() + renMonths); let m = (end.getFullYear() - exp.getFullYear()) * 12 + (end.getMonth() - exp.getMonth()); let d = end.getDate() - exp.getDate(); if (d < 0) { m -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() } billed = d > 0 ? m + 1 : m } } return billed })()
              const renIqamaSuffix = billedIqamaMos > 0 ? T(` (${billedIqamaMos} شهر)`, ` (${billedIqamaMos} mo)`) : ''
              const renSuffix = renMonths > 0 ? T(` (${renMonths} شهر)`, ` (${renMonths} mo)`) : ''
              const cover = r.office_cover != null ? Number(r.office_cover) : Math.max(0, Number(r.iqama_renewal_fee || 0) + Number(r.work_permit_fee || 0) + Number(r.medical_fee || 0) - Number(r.gov_excess || 0))
              const officeFeeV = Number(r.office_fee || 0); const subtotalV = Number(r.subtotal || 0); const totalV = Number(r.total_amount || 0)
              const lineItems = [
                Number(r.iqama_renewal_fee || 0) > 0 ? [T('تجديد الإقامة', 'Iqama Renewal') + renIqamaSuffix, r.iqama_renewal_fee, null] : null,
                Number(r.work_permit_fee || 0) > 0 ? [T('رخصة العمل', 'Work Permit') + renSuffix, r.work_permit_fee, null] : null,
                Number(r.prof_change_fee || 0) > 0 ? [T('تغيير المهنة', 'Change Occupation'), r.prof_change_fee, null] : null,
                Number(r.medical_fee || 0) > 0 ? [T('التأمين الطبي', 'Medical Insurance'), r.medical_fee, null] : null,
                Number(r.late_fine_amount || 0) > 0 ? [T('غرامة تأخّر الإقامة', 'Iqama Late Fine'), r.late_fine_amount, '#e5867a'] : null,
                ...extras.map(e => [e.name || T('بند إضافي', 'Extra'), Number(e.amount || 0), C.blue]),
              ].filter(Boolean)
              return <>
                <div style={{ padding: '8px 22px 2px' }}>
                  {lineItems.map((it, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', minHeight: 26 }}><span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{it[0]}</span><span style={{ fontSize: 12.5, color: it[2] || 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(it[1])}</span></div>)}
                  {officeFeeV > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', minHeight: 26 }}><span style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600 }}>{T('رسوم المكتب', 'Office Fees')}</span><span style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(officeFeeV)}</span></div>}
                  {cover > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', minHeight: 26 }}><span style={{ fontSize: 12, color: '#27a046', fontWeight: 600 }}>{T('الخصم', 'Discount')}</span><span style={{ fontSize: 12.5, color: '#27a046', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(cover)}</span></div>}
                </div>
                {(Number(r.absher_discount || 0) > 0 || Number(r.manual_discount || 0) > 0) && <div style={{ margin: '8px 22px 0', borderTop: '1px solid var(--bd)', paddingTop: 10 }}>
                  {Number(r.absher_discount || 0) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{T('خصم أبشر', 'Absher Discount')}</span><span style={{ fontSize: 14, color: '#27a046', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(Number(r.absher_discount || 0))}</span></div>}
                  {Number(r.manual_discount || 0) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}><span style={{ fontSize: 13, color: '#27a046', fontWeight: 600 }}>{T('خصم المكتب', 'Office Discount')}</span><span style={{ fontSize: 14, color: '#27a046', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{nmSar(Number(r.manual_discount || 0))}</span></div>}
                </div>}
                <div style={{ margin: '10px 22px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'linear-gradient(135deg, rgba(176,125,0,.15) 0%, rgba(176,125,0,.04) 100%)', borderRadius: 12, border: '1px solid rgba(176,125,0,.45)', boxShadow: 'inset 0 1px 0 var(--bd)' }}><span style={{ color: C.gold, fontWeight: 600, fontSize: 14.5 }}>{T('الإجمالي النهائي', 'Final Total')}</span><span style={{ color: C.gold, fontWeight: 700, fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>{nm(totalV)} <span style={{ fontSize: 12, fontWeight: 600, opacity: .7 }}>{T('ريال', 'SAR')}</span></span></div>
                <div style={{ padding: '0 22px 16px' }}>{auditLog(CARD_FIELDS.pricing)}</div>
              </>
            })()}
          </div>
          )}

          {/* كرت التعليقات — خط زمني يدمج التعليقات مع معالم المراحل (تسعير/تصديق/فوترة) */}
          {cardVisible(user, 'renewal_calc', 'comments') && (<div style={cardChrome}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={{ fontSize: 16, fontWeight: 600, color: C.blue, letterSpacing: '.2px' }}>{T('التعليقات', 'Comments')}</span></div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(() => {
                const milestones = [
                  { ts: r.priced_at, label: T('تم التسعير', 'Priced'), color: '#eab308' },
                  { ts: r.approved_at, label: T('تم التصديق', 'Approved'), color: C.blue },
                  { ts: r.invoiced_at, label: T('تمت الفوترة', 'Invoiced'), color: C.ok },
                  { ts: r.cancelled_at, label: T('تم الإلغاء', 'Cancelled'), color: C.red },
                ].filter(m => m.ts).map(m => ({ kind: 'ms', ...m }))
                const timeline = [...quoteNotes.map(n => ({ kind: 'note', ts: n.created_at, n })), ...milestones].sort((a, b) => new Date(a.ts) - new Date(b.ts))
                return timeline.map((ev, i) => {
                  if (ev.kind === 'ms') { const md = new Date(ev.ts); const mhhmm = String(md.getHours()).padStart(2, '0') + ':' + String(md.getMinutes()).padStart(2, '0'); return (
                    <div key={'ms-' + i} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0', direction: dir }}>
                      <span style={{ flex: 1, height: 1, background: ev.color + '33' }} />
                      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1, padding: '0 6px', flexShrink: 0 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: ev.color }} /><span style={{ fontSize: 11, fontWeight: 600, color: ev.color }}>{ev.label}</span></span>
                        <span style={{ fontSize: 9, color: 'var(--tx5)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fmtD(ev.ts)} · {mhhmm}</span>
                      </span>
                      <span style={{ flex: 1, height: 1, background: ev.color + '33' }} />
                    </div>) }
                  const n = ev.n; const who = (nameOf(usersById[n.created_by]) || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' '); const dt = new Date(n.created_at); const hhmm = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0'); return (
                    <div key={n.id} style={{ background: 'var(--inputBg)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--bd)' }}>
                      <span style={{ fontSize: 13, color: 'var(--tx2)', fontWeight: 600, lineHeight: 1.6, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{n.note}</span>
                      {Array.isArray(n.attachments) && n.attachments.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{n.attachments.map((a, j) => <a key={a.id || j} href={a.file_url} target="_blank" rel="noreferrer" title={a.file_name || T('مرفق', 'Attachment')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: C.gold, textDecoration: 'none' }}><Paperclip size={12} strokeWidth={2} /><span style={{ textDecoration: 'underline', textUnderlineOffset: 3, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{a.file_name || (T('مرفق', 'Attachment') + ' ' + (j + 1))}</span></a>)}</div>}
                      <div style={{ display: 'flex', direction: dir, justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--tx5)' }}>{who ? <span style={{ fontWeight: 600, color: C.gold }}>{who}</span> : <span />}<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}><span>{fmtD(n.created_at)}</span><span>{hhmm}</span></span></div>
                    </div>) })
              })()}
              {quoteNotes.length === 0 && <span style={{ fontSize: 11.5, color: 'var(--tx5)' }}>{T('لا توجد تعليقات بعد', 'No comments yet')}</span>}
              {modalAllowed(user, 'renewal_calc', 'add_comment') && <button onClick={() => setQuoteNoteModal(true)} onMouseEnter={e => { e.currentTarget.style.background = C.blue + '1f' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }} style={{ alignSelf: 'stretch', justifyContent: 'center', height: 42, padding: '0 16px', borderRadius: 9, background: 'transparent', border: '1px dashed ' + C.blue + '80', color: C.blue, fontFamily: F, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: '.15s' }}>{T('إضافة تعليق', 'Add comment')}<Plus size={15} strokeWidth={2.4} /></button>}
            </div>
          </div>)}
        </div>

        {/* العمود الجانبي — الملخص المالي + التصديق + الطباعة + سجل المراحل */}
        <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* الملخص المالي */}
          {cardVisible(user, 'renewal_calc', 'financial_summary') && (() => {
            const officeFee = Number(r.office_fee || 0)
            const total = Number(r.total_amount || 0)
            const absher = Number(r.absher_discount || 0)
            const manual = Number(r.manual_discount || 0)
            const govExcess = Number(r.gov_excess || 0)
            const renMo = Number(r.renewal_months || 0)
            // القيم المشتقّة مجمّدة في أعمدة وقت الإصدار/التصديق/التعديل؛ الحساب احتياطي للسجلات القديمة فقط.
            // الخصم (تغطية المكتب من الرسوم الحكومية) = (تجديد الإقامة + رخصة العمل + التأمين) − الزائد عن الحدود الحكومية
            const cover = r.office_cover != null ? Number(r.office_cover) : Math.max(0, Number(r.iqama_renewal_fee || 0) + Number(r.work_permit_fee || 0) + Number(r.medical_fee || 0) - govExcess)
            const officeNet = r.office_fee_net != null ? Number(r.office_fee_net) : Math.max(0, officeFee - cover - manual)
            // كل الرسوم الحكومية الكاملة (تجديد الإقامة + رخصة العمل + التأمين + غرامة التأخّر + تغيير المهنة)
            const govFeesTotal = r.government_fees != null ? Number(r.government_fees) : Number(r.iqama_renewal_fee || 0) + Number(r.work_permit_fee || 0) + Number(r.medical_fee || 0) + Number(r.late_fine_amount || 0) + Number(r.prof_change_fee || 0)
            const twoNames = (nameOf(r.priced_user || r.created_user) || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join(' ')
            // بطاقة داكنة بشريط لون عمودي — مطابقة لبطاقات كرت المبلغ الإجمالي في الفاتورة
            const Pill = ({ color, label, value }) => (
              <div style={{ position: 'relative', padding: '12px 14px', borderRadius: 12, background: 'var(--inputBg)', border: '1px solid var(--bd)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0, width: 4, background: color }} />
                <div style={{ fontSize: 12, color: 'var(--tx3)', fontWeight: 600, marginBottom: 5 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, direction: 'rtl' }}>
                  <span style={{ fontSize: 19, fontWeight: 600, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-.5px', direction: 'ltr', unicodeBidi: 'isolate' }}>{value}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color, opacity: .72 }}>{T('ريال', 'SAR')}</span>
                </div>
              </div>
            )
            const Meta = ({ label, value, color = 'var(--tx2)' }) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, gap: 10 }}>
                <span style={{ color: 'var(--tx4)' }}>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{value}</span>
              </div>
            )
            return <div style={cardChrome}>
              {/* رأس ذهبي متدرّج — العنوان + المُسعِّر + الإجمالي */}
              <div style={{ position: 'relative', padding: '16px 22px 20px', background: `linear-gradient(135deg, ${C.gold} 0%, #B07D00 100%)`, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -34, insetInlineEnd: -18, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,.10)' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000' }} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#000', letterSpacing: '.2px' }}>{T('الملخص المالي', 'Financial Summary')}</span>
                  {twoNames && <span style={{ marginInlineStart: 'auto', display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,.14)', color: '#000', fontSize: 9.5, fontWeight: 600 }}>{twoNames}</span>}
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 32, fontWeight: 600, color: '#000', direction: 'ltr', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{nm(Math.round(total))}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#000' }}>{T('ريال', 'SAR')}</span>
                </div>
              </div>
              {/* بطاقتا رسوم المكتب + الزائد الحكومي */}
              <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Pill color={C.gold} label={T('رسوم المكتب', 'Office Fee')} value={nm(officeNet)} />
                <Pill color={'var(--tx2)'} label={T('رسوم حكومية', 'Government Fees')} value={nm(govFeesTotal)} />
              </div>
              {/* فوتر: الخصومات + المدة المتوقعة + الإنتهاء المتوقع + الفاتورة — مطابق لتفاصيل نقل الكفالة */}
              {(() => {
                // القيم المشتقّة مجمّدة في أعمدة؛ الحساب احتياطي للسجلات القديمة فقط.
                const iqExp = r.iqama_expiry_gregorian ? new Date(r.iqama_expiry_gregorian) : null
                const base = (iqExp && !isNaN(iqExp) && iqExp > new Date()) ? new Date(iqExp) : new Date()
                const expExpiry = r.expected_expiry_date || (renMo > 0 ? (() => { const d = new Date(base); d.setMonth(d.getMonth() + renMo); return d.toISOString().slice(0, 10) })() : null)
                const durMo = r.expected_duration_months != null ? Number(r.expected_duration_months) : renMo
                const invoiced = ['invoiced', 'completed'].includes(r.status)
                const cover = r.office_cover != null ? Number(r.office_cover) : Math.max(0, Number(r.iqama_renewal_fee || 0) + Number(r.work_permit_fee || 0) + Number(r.medical_fee || 0) - Number(r.gov_excess || 0))
                return <div style={{ padding: '14px 22px', borderTop: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cover > 0 && <Meta label={T('الخصم', 'Discount')} color={C.ok} value={<span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}>{nm(cover)}</span>} />}
                  {absher > 0 && <Meta label={T('خصم أبشر', 'Absher Discount')} color={C.ok} value={<span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}>{nm(absher)}</span>} />}
                  {manual > 0 && <Meta label={T('خصم المكتب', 'Office Discount')} color={C.gold} value={<span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}>{nm(manual)}</span>} />}
                  <Meta label={T('المدة المتوقعة', 'Expected Duration')} color={C.gold} value={durMo > 0 ? durMo + ' ' + T('شهر', 'mo') : '—'} />
                  <Meta label={T('الإنتهاء المتوقع', 'Expected Expiry')} color={C.gold} value={expExpiry ? <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', unicodeBidi: 'isolate' }}>{fmtD(expExpiry)}</span> : '—'} />
                  {r.invoice_id && invoiced && <Meta label={T('الفاتورة', 'Invoice')} color={C.gold} value={<span onClick={() => { try { window.dispatchEvent(new CustomEvent('app-navigate-invoice', { detail: { id: r.invoice_id } })) } catch {} }} title={T('فتح تفاصيل الفاتورة', 'Open invoice details')} style={{ direction: 'ltr', unicodeBidi: 'isolate', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, fontVariantNumeric: 'tabular-nums' }}>{'INV-' + String(r.invoice_id).slice(0, 8).toUpperCase()}</span>} />}
                </div>
              })()}
            </div>
          })()}

          {/* الإجراءات + الطباعة */}
          {cardVisible(user, 'renewal_calc', 'actions_print') && (() => {
            const canApprove = canCardBtn(user, 'renewal_calc', 'actions_print', 'approve')
            const pricedAtMs = r.priced_at ? new Date(r.priced_at).getTime() : 0
            const expired = pricedAtMs ? (Date.now() - pricedAtMs) > 5 * 86400000 : false
            const showApprove = r.status === 'priced' && canApprove && modalAllowed(user, 'renewal_calc', 'approve_quote')
            const showCancel = ['priced', 'approved'].includes(r.status) && canApprove && canCardBtn(user, 'renewal_calc', 'actions_print', 'cancel') && modalAllowed(user, 'renewal_calc', 'cancel_quote')
            return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(showApprove || showCancel) && <div style={{ display: 'flex', gap: 8 }}>
              {showApprove && <button onClick={() => { if (expired) { toast(T('انتهت صلاحية التسعيرة — لا يمكن التصديق', 'Quote expired')); return } setApproveSaved(false); setApproveForm({ _id: r.id, _workerName: r.worker_name, _quoteNo: r.quote_no, _total: Number(r.total_amount || 0), _officeFee: Number(r.office_fee || 0), _renewalMonths: Number(r.renewal_months || 0), discValue: '', approval_note: '' }) }} disabled={expired}
                onMouseEnter={e => { if (!expired) e.currentTarget.style.filter = 'brightness(.93)' }} onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                style={{ flex: 1, height: 44, padding: '0 14px', borderRadius: 9, background: C.blue, border: '1px solid ' + C.blue, boxShadow: '0 3px 7px rgba(0,0,0,.2)', color: '#fff', cursor: expired ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: F, fontSize: 12.5, fontWeight: 600, opacity: expired ? .55 : 1, whiteSpace: 'nowrap', transition: 'filter .15s ease' }}>
                <span>{T('تصديق الحسبة', 'Approve Quote')}</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </button>}
              {showCancel && <button onClick={() => { setCancelSaved(false); setCancelForm({ _id: r.id, _workerName: r.worker_name, _quoteNo: r.quote_no, reason: '' }) }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(.93)' }} onMouseLeave={e => { e.currentTarget.style.filter = 'none' }}
                style={{ flex: 1, height: 44, padding: '0 14px', borderRadius: 9, background: C.red, border: '1px solid ' + C.red, boxShadow: '0 3px 7px rgba(0,0,0,.2)', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: F, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', transition: 'filter .15s ease' }}>
                <span>{T('إلغاء الحسبة', 'Cancel Quote')}</span><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              </button>}
              </div>}
              {/* رأس قسم الطباعة */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: (showApprove || showCancel) ? 6 : 0, paddingBottom: 2 }}>
                <Printer size={13} strokeWidth={2} style={{ color: C.gold }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.gold, letterSpacing: '.3px' }}>{T('طباعة', 'Print')}</span>
                <span style={{ flex: 1, height: 1, background: 'rgba(176,125,0,.18)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ k: 'ar', l: 'عربي', cc: 'sa' }, { k: 'en', l: 'English', cc: 'gb' }, { k: 'hi', l: 'हिन्दी', cc: 'in' }, { k: 'ur', l: 'اردو', cc: 'pk' }, { k: 'bn', l: 'বাংলা', cc: 'bd' }].map(o => (
                  <button key={o.k} onClick={() => printRenewalDoc(r, o.k)} title={T('طباعة بـ ', 'Print in ') + o.l} style={{ height: 40, padding: '0 10px', borderRadius: 10, background: 'rgba(176,125,0,.06)', border: '1px solid rgba(176,125,0,.22)', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 600, transition: '.15s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,125,0,.14)'; e.currentTarget.style.borderColor = 'rgba(176,125,0,.45)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(176,125,0,.06)'; e.currentTarget.style.borderColor = 'rgba(176,125,0,.22)' }}>
                    <img src={`https://flagcdn.com/w40/${o.cc}.png`} alt="" width="18" height="13" style={{ display: 'block', borderRadius: 2, objectFit: 'cover', flexShrink: 0 }} />
                    <span>{o.l}</span>
                  </button>
                ))}
              </div>
            </div>
          })()}

        </div>
      </div>
      {/* ═══ نافذة تصديق الحسبة — FormKit (نجاح داخل النافذة) ═══ */}
      {approveForm && (() => {
        const f = approveForm
        const setF = (k, v) => setApproveForm(p => ({ ...p, [k]: v }))
        const d = discountEnabled ? computeApprovalDiscount(f) : null
        const belowFloor = !!(d && d.capped)
        return <FKModal open onClose={() => { if (approveSaving) return; setApproveForm(null); if (approveSaved) { setApproveSaved(false); setDetailsRow(null); load() } }} width={520} variant="edit"
          success={approveSaved ? <SuccessView title={T('تم تصديق الحسبة', 'Quote approved')} code={f._quoteNo ? noDash(f._quoteNo) : undefined} /> : null}
          title={T('تصديق الحسبة', 'Approve Quote') + (f._quoteNo ? ' — ' + noDash(f._quoteNo) : '')} subtitle={f._workerName || undefined} Icon={BadgeCheck}
          onSubmit={submitApproval} submitting={approveSaving} submitLabel={T('تصديق الحسبة', 'Approve Quote')}
          pages={[{ valid: !belowFloor, content: (
            <ModalSection Icon={BadgeCheck} label={T('تأكيد التصديق', 'Confirm Approval')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 10, background: 'rgba(176,125,0,.08)', border: '1px solid rgba(176,125,0,.3)' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>{T('إجمالي التسعيرة', 'Quote Total')}</span>
                  <span style={{ color: C.gold, display: 'inline-flex', direction: 'rtl', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 18, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(Math.round(Number(f._total || 0)))}</span><span style={{ fontSize: 11, fontWeight: 600 }}>{T('ريال', 'SAR')}</span></span>
                </div>
                {discountEnabled && d && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 14px', borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)' }}>{T('خصم المكتب', 'Office Discount')} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--tx4)' }}>({T('اختياري', 'optional')})</span></div>
                      <input type="text" inputMode="decimal" value={f.discValue} onChange={e => setF('discValue', e.target.value.replace(/[^0-9.]/g, ''))} placeholder={T('مبلغ الخصم بالريال', 'Discount amount (SAR)')} style={{ width: '100%', height: 40, padding: '0 14px', border: `1px solid ${belowFloor ? 'rgba(192,57,43,.55)' : 'var(--bd)'}`, borderRadius: 9, fontFamily: F, fontSize: 15, fontWeight: 600, color: C.gold, outline: 'none', background: 'var(--inputBg)', boxSizing: 'border-box', textAlign: 'center', direction: 'ltr' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 7, borderTop: '1px dashed rgba(176,125,0,.3)' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)' }}>{T('الإجمالي بعد الخصم', 'Total after discount')}</span>
                        <span style={{ color: C.gold, display: 'inline-flex', direction: 'rtl', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 16, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(d.newTotal)}</span><span style={{ fontSize: 10, fontWeight: 600 }}>{T('ريال', 'SAR')}</span></span>
                      </div>
                    </div>
                )}
                <div style={{ fontSize: 12, color: 'var(--tx3)', lineHeight: 1.7 }}>{T('بالتصديق تنتقل الحسبة إلى حالة «مصدّقة» ويُسجَّل اسمك وتاريخ التصديق.', 'Approving moves the quote to “Approved” and records your name and the approval date.')}</div>
              </div>
            </ModalSection>
          ) }]} />
      })()}

      {/* ═══ نافذة إلغاء الحسبة — FormKit (نجاح داخل النافذة) ═══ */}
      {cancelForm && (() => {
        const f = cancelForm
        const setF = (k, v) => setCancelForm(p => ({ ...p, [k]: v }))
        return <FKModal open onClose={() => { if (cancelSaving) return; setCancelForm(null); if (cancelSaved) { setCancelSaved(false); setDetailsRow(null); load() } }} width={520} variant="edit"
          success={cancelSaved ? <SuccessView title={T('تم إلغاء الحسبة', 'Quote cancelled')} code={f._quoteNo ? noDash(f._quoteNo) : undefined} /> : null}
          title={T('إلغاء الحسبة', 'Cancel Quote') + (f._quoteNo ? ' — ' + noDash(f._quoteNo) : '')} subtitle={f._workerName || undefined} Icon={AlertCircle}
          onSubmit={submitCancel} submitting={cancelSaving} submitLabel={T('تأكيد الإلغاء', 'Confirm Cancellation')}
          pages={[{ valid: true, content: (
            <ModalSection Icon={AlertCircle} label={T('تأكيد الإلغاء', 'Confirm Cancellation')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 14px', borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx2)' }}>{T('سبب الإلغاء', 'Cancellation reason')} <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--tx4)' }}>({T('اختياري', 'optional')})</span></div>
                  <textarea value={f.reason} onChange={e => setF('reason', e.target.value.slice(0, 500))} placeholder={T('سبب الإلغاء (اختياري)…', 'Reason (optional)…')} rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--bd)', borderRadius: 9, fontFamily: F, fontSize: 13, fontWeight: 500, color: 'var(--tx)', outline: 'none', background: 'var(--inputBg)', boxSizing: 'border-box', resize: 'vertical', direction: dir }} />
                </div>
                <div style={{ fontSize: 12, color: C.red, lineHeight: 1.7, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.25)', borderRadius: 9, padding: '10px 12px' }}>{T('بالإلغاء تنتقل الحسبة إلى حالة «ملغاة» ويُسجَّل اسمك وتاريخ الإلغاء. ولا يمكن استخدامها في فاتورة بعد ذلك.', 'Cancelling moves the quote to “Cancelled”, records your name and the date, and it can no longer be invoiced.')}</div>
              </div>
            </ModalSection>
          ) }]} />
      })()}

      {/* ═══ نافذة تعديل كرت — FormKit (نفس تفاصيل نقل الكفالة) ═══ */}
      {cardEdit && (() => {
        const f = cardEdit; const setF = (k, v) => setCardEdit(p => ({ ...p, [k]: v }))
        const fVis = (k) => fieldVisible(user, 'renewal_calc', k), fEd = (k) => fieldEditable(user, 'renewal_calc', k)
        const titles = { worker: T('تعديل بيانات العامل', 'Edit Worker Data'), professional: T('تعديل البيانات المهنية', 'Edit Professional Data'), renewal: T('تعديل خيارات التجديد', 'Edit Renewal Options'), pricing: T('تعديل التسعيرة', 'Edit Pricing') }
        let content
        if (f.card === 'worker') content = <ModalSection Icon={User} label={T('بيانات العامل', 'Worker Data')}><div style={GRID}>
          {fVis('worker_name') && <TextField full label={T('الاسم', 'Name')} value={f.worker_name || ''} onChange={v => setF('worker_name', v)} disabled={!fEd('worker_name')} />}
          {fVis('iqama_number') && <TextField label={T('رقم الإقامة', 'Iqama Number')} dir="ltr" value={f.iqama_number || ''} onChange={v => setF('iqama_number', v)} disabled={!fEd('iqama_number')} />}
          {fVis('phone') && <TextField label={T('رقم الجوال', 'Mobile')} dir="ltr" value={f.phone || ''} onChange={v => setF('phone', v)} disabled={!fEd('phone')} />}
          {fVis('nationality_id') && <FKSelect label={T('الجنسية', 'Nationality')} value={f.nationality_id || ''} onChange={v => setF('nationality_id', v)} placeholder={'— ' + T('اختر', 'Select') + ' —'} options={nationalities} getKey={x => x.id} getLabel={x => lang === 'en' ? (x.name_en || x.name_ar) : x.name_ar} disabled={!fEd('nationality_id')} />}
          {fVis('dob') && <FKDateField label={T('تاريخ الميلاد', 'Date of Birth')} value={f.dob || ''} onChange={v => setF('dob', v)} disabled={!fEd('dob')} />}
        </div></ModalSection>
        else if (f.card === 'professional') content = <ModalSection Icon={FileText} label={T('البيانات المهنية', 'Professional Data')}><div style={GRID}>
          <TextField full label={T('المهنة', 'Occupation')} value={f.occupation_name_ar || ''} onChange={v => setF('occupation_name_ar', v)} />
          <FKDateField label={T('انتهاء الإقامة (ميلادي)', 'Iqama Expiry (G)')} value={f.iqama_expiry_gregorian || ''} onChange={v => setF('iqama_expiry_gregorian', v)} />
          <TextField label={T('انتهاء الإقامة (هجري)', 'Iqama Expiry (H)')} dir="ltr" value={f.iqama_expiry_hijri || ''} onChange={v => setF('iqama_expiry_hijri', v)} />
        </div></ModalSection>
        else if (f.card === 'renewal') content = <ModalSection Icon={RefreshCw} label={T('خيارات التجديد', 'Renewal Options')}><div style={GRID}>
          {fVis('renewal_months') && <TextField label={T('مدة التجديد (شهر)', 'Renewal Period (months)')} dir="ltr" value={f.renewal_months ?? ''} onChange={v => setF('renewal_months', String(v).replace(/[^0-9]/g, ''))} disabled={!fEd('renewal_months')} />}
          {fVis('change_profession') && <YesNo label={T('تغيير المهنة', 'Change Occupation')} value={f.change_profession} onChange={v => setF('change_profession', v)} disabled={!fEd('change_profession')} />}
          {f.change_profession && fVis('new_occupation_name_ar') ? <TextField label={T('المهنة الجديدة', 'New Occupation')} value={f.new_occupation_name_ar || ''} onChange={v => setF('new_occupation_name_ar', v)} disabled={!fEd('new_occupation_name_ar')} /> : null}
          {fVis('exemption') && <YesNo label={T('الإعفاء', 'Exemption')} value={f.exemption} onChange={v => setF('exemption', v)} disabled={!fEd('exemption')} />}
          {fVis('work_permit_expiry') && <FKDateField label={T('انتهاء رخصة العمل', 'Work Permit Expiry')} value={f.work_permit_expiry || ''} onChange={v => setF('work_permit_expiry', v)} disabled={!fEd('work_permit_expiry')} />}
        </div></ModalSection>
        else content = <ModalSection Icon={Banknote} label={T('الرسوم', 'Fees')}><div style={GRID}>
          {[['office_fee', T('رسوم المكتب', 'Office Fee')], ['iqama_renewal_fee', T('تجديد الإقامة', 'Iqama Renewal')], ['late_fine_amount', T('غرامة تأخّر الإقامة', 'Late Fine')], ['work_permit_fee', T('رسوم رخصة العمل', 'Work Permit')], ['medical_fee', T('التأمين الطبي', 'Medical')], ['prof_change_fee', T('تغيير المهنة', 'Occupation Change')], ['gov_excess', T('الزائد عن الحدود الحكومية', 'Gov Excess')], ['absher_discount', T('خصم أبشر', 'Absher Discount')], ['manual_discount', T('خصم المكتب', 'Office Discount')]].filter(([k]) => fVis(k)).map(([k, l]) => <CurrencyField key={k} label={l} value={f[k] ?? ''} onChange={v => setF(k, v)} disabled={!fEd(k)} />)}
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 9, background: 'rgba(176,125,0,.08)', border: '1px solid rgba(176,125,0,.3)', minHeight: 44 }}><span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>{T('الإجمالي بعد التعديل', 'New total')}</span><span style={{ flex: 1 }} /><span style={{ fontSize: 16, fontWeight: 600, color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{(() => { const sum = ['office_fee', 'iqama_renewal_fee', 'late_fine_amount', 'work_permit_fee', 'medical_fee', 'prof_change_fee', 'gov_excess'].reduce((s, k) => s + (Number(f[k]) || 0), 0); const tot = Math.max(0, sum - (Number(f.absher_discount) || 0) - (Number(f.manual_discount) || 0)); return nm(tot) + ' ' + T('ريال', 'SAR') })()}</span></div>
        </div></ModalSection>
        return <FKModal open onClose={() => { if (!cardSaving) setCardEdit(null) }} width={560} variant="edit" title={titles[f.card]} Icon={FileText}
          onSubmit={saveCardEdit} submitting={cardSaving} submitLabel={T('حفظ', 'Save')} pages={[{ valid: true, content }]} />
      })()}

      {/* ═══ نافذة إضافة تعليق ═══ */}
      {quoteNoteModal && <RenewalNoteModal sb={sb} T={T} lang={lang} rcId={r.id} user={user} onClose={() => setQuoteNoteModal(false)} onSaved={loadQuoteNotes} />}
    </div>
  }

  // ═══════════════ القائمة ═══════════════
  // فلترة + بحث
  const matches = (r) => {
    const term = searchQ.trim().toLowerCase()
    if (term && ![r.worker_name, r.iqama_number, r.quote_no, r.phone].some(v => String(v || '').toLowerCase().includes(term))) return false
    const d = (r.priced_at || r.created_at || '').slice(0, 10)
    if (advFilter.from && d && d < advFilter.from) return false
    if (advFilter.to && d && d > advFilter.to) return false
    if (advFilter.status && r.status !== advFilter.status) return false
    if (advFilter.employee) { const emp = advFilter.employee.trim().toLowerCase(); const names = [r.priced_user, r.approved_user, r.created_user].flatMap(u => u ? [u.name_ar, u.name_en] : []).map(v => String(v || '').toLowerCase()); if (!names.some(n => n.includes(emp))) return false }
    const off = Number(r.office_fee || 0)
    if (advFilter.officeMin !== '' && off < Number(advFilter.officeMin)) return false
    if (advFilter.officeMax !== '' && off > Number(advFilter.officeMax)) return false
    return true
  }
  const searched = rows.filter(matches)
  const filteredData = listFilter === 'all' ? searched : listFilter === 'invoiced' ? searched.filter(r => r.status === 'invoiced' || r.status === 'completed') : searched.filter(r => r.status === listFilter)
  // الإحصاءات تعكس التصفية: محسوبة من المجموعة المفلترة (البحث/التاريخ/الموظف/الرسوم) قبل تبويب الحالة.
  const sCounts = (() => { const c = { priced: 0, approved: 0, invoiced: 0, completed: 0, cancelled: 0 }; searched.forEach(r => { if (c[r.status] !== undefined) c[r.status]++ }); return c })()
  const avgStats = (() => { const total = searched.reduce((s, r) => s + Number(r.total_amount || 0), 0); return { value: searched.length ? Math.round(total / searched.length) : 0, count: searched.length } })()

  // تجميع حسب اليوم
  const todayStr = new Date().toISOString().slice(0, 10)
  const dayKey = r => { const d = r.status === 'priced' ? (r.priced_at || r.created_at) : (['approved', 'invoiced', 'completed'].includes(r.status)) ? (r.approved_at || r.priced_at || r.created_at) : r.created_at; return (d || '').slice(0, 10) || '—' }
  const groups = {}; const groupOrder = []
  filteredData.forEach(r => { const k = dayKey(r); if (!groups[k]) { groups[k] = []; groupOrder.push(k) } groups[k].push(r) })
  const dayNames = [T('الأحد', 'Sun'), T('الاثنين', 'Mon'), T('الثلاثاء', 'Tue'), T('الأربعاء', 'Wed'), T('الخميس', 'Thu'), T('الجمعة', 'Fri'), T('السبت', 'Sat')]
  const dayLabel = k => { if (k === todayStr) return T('اليوم', 'Today'); try { return dayNames[new Date(k + 'T12:00:00').getDay()] } catch { return k } }
  const dayFull = k => { try { const d = new Date(k + 'T12:00:00'); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } catch { return k } }

  const ico = p => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{p}</svg>
  const idIco = ico(<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M15 8h2M15 12h2M7 16h10" /></>)
  const phIco = ico(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />)
  const brIco = ico(<><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /></>)
  const svcIco = ico(<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>)
  const invIco = ico(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8M16 17H8M10 9H8" /></>)
  const gcell = (icon, label, value) => value ? <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, alignItems: 'flex-start' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.2px' }}>{icon}{label}</span><span style={{ display: 'inline-flex', minWidth: 0, maxWidth: '100%' }}>{value}</span></div> : null

  const hasAdv = Object.values(advFilter).some(Boolean)

  return <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, direction: dir }}>
    {/* ═══ العنوان ═══ */}
    {listHeader}

    {/* ═══ شريط الإحصاء — 3 كروت ═══ */}
    <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr 1.5fr', gap: 14, marginBottom: 24 }}>
      {/* المتوسط — متوسط رسوم المكتب لكل شهر */}
      <div style={{ position: 'relative', padding: '18px 22px', borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 190 }}>
        <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
          <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{T('المتوسط', 'Average')}</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
          <span style={{ fontSize: 42, fontWeight: 600, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{nm(avgStats.value)}</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--bd)' }}>
          <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{T('عدد التسعيرات', 'Quotes')}</span>
          <span style={{ fontSize: 13, color: C.gold, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(avgStats.count)}</span>
        </div>
      </div>

      {/* كرتان متراصّان — مصدّقة + مفوترة */}
      <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 190 }}>
        {[{ k: 'approved', l: T('مصدّقة', 'Approved'), v: sCounts.approved, c: C.blue }, { k: 'invoiced', l: T('مفوترة', 'Invoiced'), v: sCounts.invoiced + sCounts.completed, c: C.ok }].map((s, i) => {
          const isActive = listFilter === s.k
          return <div key={i} onClick={() => setListFilter(isActive ? 'all' : s.k)} style={{ position: 'relative', padding: '12px 16px', flex: 1, borderTop: i > 0 ? '1px solid var(--bd)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, overflow: 'hidden', cursor: 'pointer', background: isActive ? `${s.c}10` : 'transparent', transition: '.15s' }}>
            <div style={{ position: 'absolute', insetInlineStart: -25, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${s.c}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 5 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.c }} />
              <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}>{s.l}</span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', direction: 'ltr' }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: s.c, fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.5px' }}>{nm(s.v)}</span>
            </div>
          </div>
        })}
      </div>

      {/* كرت توزيع الحالات */}
      {(() => {
        const STATUSES = [{ k: 'priced', c: '#eab308', l: T('مسعّرة', 'Priced') }, { k: 'approved', c: C.blue, l: T('مصدّقة', 'Approved') }, { k: 'invoiced', c: C.ok, l: T('مفوترة', 'Invoiced') }, { k: 'cancelled', c: C.red, l: T('ملغاة', 'Cancelled') }]
        const totalSt = STATUSES.reduce((a, s) => a + (sCounts[s.k] || 0), 0)
        return <div style={{ borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', boxShadow: 'var(--shadow-sm)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 190 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الحالات', 'Statuses')}</span>
            <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}><span style={{ color: C.gold, fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{nm(totalSt)}</span> {T('تسعيرة', 'quotes')}</span>
          </div>
          {totalSt > 0 && <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--bd2)' }}>
            {STATUSES.filter(s => (sCounts[s.k] || 0) > 0).map(s => { const cnt = sCounts[s.k] || 0; const pct = (cnt / totalSt) * 100; return <div key={s.k} title={`${s.l}: ${cnt}`} style={{ width: pct + '%', background: s.c, transition: 'width .3s' }} /> })}
          </div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
            {STATUSES.map(s => { const cnt = sCounts[s.k] || 0; const isZero = cnt === 0; const isActive = listFilter === s.k; return <div key={s.k} onClick={() => setListFilter(isActive ? 'all' : s.k)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: isZero ? 0.45 : 1, cursor: 'pointer', color: isActive ? s.c : undefined, transition: '.15s' }}>
              <span style={{ color: isZero ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 14, textAlign: 'center', flexShrink: 0, fontWeight: 600 }}>{nm(cnt)}</span>
              <span style={{ color: isActive ? s.c : 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.l}</span>
            </div> })}
          </div>
        </div>
      })()}
    </div>

    <style>{`input.rnw-date::-webkit-calendar-picker-indicator{filter:invert(70%) sepia(60%) saturate(500%) hue-rotate(20deg)}`}</style>

    {/* ═══ البحث + التصفية ═══ */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 280px', position: 'relative' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder={T('ابحث باسم العامل أو رقم الإقامة أو رقم التسعيرة...', 'Search by worker name, iqama, or quote no...')} style={{ width: '100%', height: 44, paddingBlock: 0, paddingInlineStart: 14, paddingInlineEnd: 38, background: 'var(--search-bg)', border: '1px solid transparent', borderRadius: 12, fontFamily: F, fontSize: 13, fontWeight: 400, color: 'var(--tx)', outline: 'none', direction: dir, boxSizing: 'border-box', transition: '.2s' }} />
      </div>
      <button onClick={() => setAdvOpen(o => !o)} style={{ height: 44, padding: '0 16px', borderRadius: 12, border: advOpen || hasAdv ? '1px solid var(--accent-bd)' : '1px solid transparent', background: advOpen || hasAdv ? 'var(--accent-soft)' : 'var(--search-bg)', color: advOpen || hasAdv ? 'var(--accent)' : 'var(--tx2)', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0, transition: '.2s', boxSizing: 'border-box', boxShadow: advOpen || hasAdv ? 'var(--shadow-sm)' : 'none' }}>
        {T('تصفية', 'Filter')}
        <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{!hasAdv ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6" /><line x1="18" y1="6" x2="20" y2="6" /><circle cx="16" cy="6" r="2" /><line x1="4" y1="12" x2="8" y2="12" /><line x1="12" y1="12" x2="20" y2="12" /><circle cx="10" cy="12" r="2" /><line x1="4" y1="18" x2="16" y2="18" /><line x1="20" y1="18" x2="20" y2="18" /><circle cx="18" cy="18" r="2" /></svg> : <span role="button" tabIndex={0} title={T('مسح الفلاتر', 'Clear filters')} onClick={e => { e.stopPropagation(); setAdvFilter({ from: '', to: '', status: '', employee: '', officeMin: '', officeMax: '' }) }} onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }} onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }} style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg></span>}</span>
      </button>
    </div>
    {advOpen && (() => {
      const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
      const fInp = { height: 42, padding: '0 14px', borderRadius: 9, border: '1px solid var(--bd)', background: 'var(--inputBg)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 600, outline: 'none', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.08)', width: '100%', boxSizing: 'border-box' }
      return <div style={{ marginBottom: 14, padding: '16px 18px', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 14, boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
          <div><div style={fLbl}>{T('تاريخ من', 'Date From')}</div><FKDateField value={advFilter.from} onChange={v => setAdvFilter(p => ({ ...p, from: v }))} /></div>
          <div><div style={fLbl}>{T('تاريخ إلى', 'Date To')}</div><FKDateField value={advFilter.to} onChange={v => setAdvFilter(p => ({ ...p, to: v }))} /></div>
          <div><div style={fLbl}>{T('الحالة', 'Status')}</div><FKSelect value={advFilter.status} onChange={v => setAdvFilter(p => ({ ...p, status: v }))} placeholder={T('الكل', 'All')} getKey={o => o.v} getLabel={o => o.l} options={[{ v: '', l: T('الكل', 'All') }, { v: 'priced', l: T('مسعّرة', 'Priced') }, { v: 'approved', l: T('مصدّقة', 'Approved') }, { v: 'invoiced', l: T('مفوترة', 'Invoiced') }, { v: 'completed', l: T('مكتملة', 'Completed') }, { v: 'cancelled', l: T('ملغاة', 'Cancelled') }]} /></div>
          <div><div style={fLbl}>{T('اسم الموظف', 'Employee Name')}</div><input type="text" value={advFilter.employee} onChange={e => setAdvFilter(p => ({ ...p, employee: e.target.value }))} placeholder={T('مهدي اليامي', '...')} style={{ ...fInp, textAlign: 'center' }} /></div>
          <div><div style={fLbl}>{T('رسوم المكتب من', 'Office Fee Min')}</div><input type="number" inputMode="decimal" value={advFilter.officeMin} onChange={e => setAdvFilter(p => ({ ...p, officeMin: e.target.value }))} placeholder="0" style={{ ...fInp, textAlign: 'center', direction: 'ltr' }} /></div>
          <div><div style={fLbl}>{T('رسوم المكتب إلى', 'Office Fee Max')}</div><input type="number" inputMode="decimal" value={advFilter.officeMax} onChange={e => setAdvFilter(p => ({ ...p, officeMax: e.target.value }))} placeholder="∞" style={{ ...fInp, textAlign: 'center', direction: 'ltr' }} /></div>
        </div>
      </div>
    })()}

    {/* ═══ القائمة ═══ */}
    {filteredData.length === 0 ? <EmptyState icon={emptyIcon} title={T('لا توجد تسعيرات تجديد', 'No renewal quotes')} desc={T('أنشئ أول تسعيرة من زر «تسعيرة تجديد إقامة»', 'Create your first quote using “New Renewal Quote”')} /> :
      <div>{groupOrder.map(dateKey => {
        const items = groups[dateKey]; const isToday = dateKey === todayStr
        const dayCounts = { priced: items.filter(rr => rr.status === 'priced').length, approved: items.filter(rr => rr.status === 'approved').length, invoiced: items.filter(rr => rr.status === 'invoiced' || rr.status === 'completed').length }
        return <div key={dateKey} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}><span style={{ fontSize: 14, fontWeight: 600, color: isToday ? C.gold : 'var(--tx2)' }}>{dayLabel(dateKey)}</span><span style={{ fontSize: 12, color: 'var(--tx4)', fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{dayFull(dateKey)}</span></div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', display: 'flex', gap: 16, fontWeight: 600 }}>{dayCounts.priced > 0 && <span style={{ color: '#eab308', direction: lang === 'ar' ? 'rtl' : 'ltr', fontVariantNumeric: 'tabular-nums' }}>{dayCounts.priced} {T('مسعّرة', 'priced')}</span>}{dayCounts.approved > 0 && <span style={{ color: C.blue, direction: lang === 'ar' ? 'rtl' : 'ltr', fontVariantNumeric: 'tabular-nums' }}>{dayCounts.approved} {T('مصدّقة', 'approved')}</span>}{dayCounts.invoiced > 0 && <span style={{ color: C.ok, direction: lang === 'ar' ? 'rtl' : 'ltr', fontVariantNumeric: 'tabular-nums' }}>{dayCounts.invoiced} {T('مفوترة', 'invoiced')}</span>}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{items.map(r => {
            const sc = stClr[r.status] || '#999'
            const cc = Number(r.total_amount || 0)
            const nat = natOf(r); const natFlag = nat?.flag_url || null
            const tags = tagsOf(r); const svcPrimary = tags[0] || null
            const phoneVal = r.phone ? String(r.phone).replace(/^\+?966/, '0') : null
            const invoiceNo = r.invoice_id ? 'INV-' + String(r.invoice_id).slice(0, 8).toUpperCase() : null
            const branchCode = r._branchCode || r.priced_user?.branch?.code || r.created_user?.branch?.code || null
            const stamps = buildStamps(r)
            // حلقة صلاحية الـ5 أيام (من تاريخ التسعير)
            const pricedAtMs = r.priced_at ? new Date(r.priced_at).getTime() : 0
            const remainingMs = pricedAtMs ? (5 * 86400000) - (Date.now() - pricedAtMs) : 0
            const showValidity = (r.status === 'priced' || r.status === 'approved') && pricedAtMs > 0
            const isExpired = showValidity && remainingMs <= 0
            const isInvoiced = r.status === 'invoiced' || r.status === 'completed'
            const isCancelled = r.status === 'cancelled'
            return <div key={r.id} onClick={() => setDetailsRow(r)} style={{ background: 'var(--card-grad2)', borderRadius: 18, overflow: 'hidden', transition: 'all .15s', border: '1px solid ' + (isExpired ? 'rgba(192,57,43,.35)' : 'var(--bd)'), position: 'relative', cursor: 'pointer', padding: '18px 22px 22px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 22, alignItems: 'center', opacity: isExpired ? .7 : 1, boxShadow: 'var(--shadow-md)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = sc + '55' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = isExpired ? 'rgba(192,57,43,.35)' : 'var(--bd)' }}>
              {/* مؤشّر الصلاحية (5 أيام) */}
              <div title={showValidity ? (isExpired ? T('انتهت الصلاحية', 'Expired') : T('صالحة ضمن 5 أيام', 'Valid within 5 days')) : isCancelled ? T('ملغاة', 'Cancelled') : T('تفاصيل التسعيرة', 'Quote details')} style={{ position: 'absolute', top: 10, insetInlineEnd: 10, width: 28, height: 28, borderRadius: '50%', background: showValidity ? 'transparent' : (isCancelled ? 'rgba(192,57,43,.12)' : isInvoiced ? 'rgba(39,160,70,.12)' : 'rgba(176,125,0,.12)'), border: showValidity ? 'none' : '1px solid ' + (isCancelled ? 'rgba(192,57,43,.35)' : isInvoiced ? 'rgba(39,160,70,.35)' : 'rgba(176,125,0,.3)'), color: isCancelled ? C.red : isInvoiced ? '#27a046' : C.gold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}>
                {showValidity ? (() => {
                  const total = 5; const active = isExpired ? 0 : Math.min(total, Math.ceil(remainingMs / 86400000))
                  const sw = 2.4, size = 24, rr = (size - sw) / 2, cx = size / 2, cy = size / 2
                  const gapDeg = 22, segDeg = 360 / total, arcDeg = segDeg - gapDeg
                  const arc = startDeg => { const s = (startDeg - 90) * Math.PI / 180, e = (startDeg + arcDeg - 90) * Math.PI / 180; const x1 = cx + rr * Math.cos(s), y1 = cy + rr * Math.sin(s), x2 = cx + rr * Math.cos(e), y2 = cy + rr * Math.sin(e); return `M${x1.toFixed(2)},${y1.toFixed(2)} A${rr},${rr} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}` }
                  const onClr = isExpired ? 'rgba(192,57,43,.5)' : (active <= 1 ? C.gold : '#27a046')
                  return <svg width={size} height={size} style={{ display: 'block' }}>
                    {Array.from({ length: total }).map((_, i) => <path key={i} d={arc(i * segDeg)} fill="none" stroke={i < active ? onClr : 'var(--bd)'} strokeWidth={sw} strokeLinecap="round" />)}
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fontFamily={F} fill={onClr}>{active}</text>
                  </svg>
                })() : isCancelled ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> : isInvoiced ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>}
              </div>

              {/* القسم 1: الاسم + العلم + شبكة الحقول */}
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, direction: 'ltr', letterSpacing: '-.2px' }}>{r.worker_name || T('عامل', 'Worker')}</span>
                  {natFlag && <img src={natFlag} alt="" style={{ width: 24, height: 17, objectFit: 'cover', flexShrink: 0, borderRadius: 3 }} />}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '9px 16px' }}>
                  {gcell(idIco, T('رقم الإقامة', 'Iqama No'), r.iqama_number ? <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{r.iqama_number}</span> : null)}
                  {gcell(phIco, T('الجوال', 'Phone'), phoneVal ? <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{phoneVal}</span> : null)}
                  {gcell(brIco, T('المكتب', 'Branch'), branchCode ? <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, direction: 'ltr' }}>{branchCode}</span> : null)}
                  {gcell(svcIco, T('الخدمة', 'Service'), svcPrimary ? <span style={{ fontSize: 11.5, color: C.gold, fontWeight: 600 }}>{svcPrimary}</span> : null)}
                  {gcell(invIco, invoiceNo ? T('رقم الفاتورة', 'Invoice no') : T('رقم التسعيرة', 'Quote no'), <span style={{ fontSize: 11.5, color: invoiceNo ? C.ok : C.gold, fontWeight: 600, direction: 'ltr', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{noDash(invoiceNo || r.quote_no || '')}</span>)}
                </div>
              </div>

              {/* القسم 2: الختم الرسمي — آخر مرحلة فقط */}
              {(() => { const s = stamps[stamps.length - 1]; return s ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '0 6px' }}>
                <div style={{ transform: 'scale(0.85)', transformOrigin: 'center' }}>
                  <OfficialStampBadge status={s.label} employeeName={s.name} branchCode={s.branch} date={s.date} color={s.color} rotate={-5} variant="double" />
                </div>
              </div> : null })()}

              {/* القسم 3: الإجمالي */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0, borderInlineStart: '1px dashed var(--bd)', paddingInlineStart: 24, paddingInlineEnd: 6, paddingTop: 18, minWidth: 120 }}>
                <div style={{ lineHeight: 1, fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}><bdi style={{ fontSize: 38, fontWeight: 600, color: C.gold, letterSpacing: '-.5px' }}>{nm(Math.round(cc))}</bdi></div>
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 5, background: 'var(--bd2)' }}><div style={{ height: '100%', width: '100%', background: sc, opacity: .7 }} /></div>
            </div>
          })}</div>
        </div>
      })}</div>}
  </div>
}
