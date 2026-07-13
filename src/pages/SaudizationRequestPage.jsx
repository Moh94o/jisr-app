import React, { useEffect, useMemo, useState } from 'react'
import { Modal as FKModal, ModalSection, TextField, Select, FileField, DateField, SuccessView, GRID, EmptyState } from '../components/ui/FormKit.jsx'
import { isGM, userOffices } from '../lib/permissions.js'
import { Building2, FileText, IdCard, Wallet, CheckCircle2, FileCheck, ShieldCheck, Receipt } from 'lucide-react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#B07D00', teal: '#16a085', ok: '#2ecc71' }

// ── تحويل هجري ↔ ميلادي عبر تقويم أم القرى (Intl) + حساب العمر ──
const _hijriFmt = (() => { try { return new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }) } catch { return null } })()
const _hijriParts = (date) => {
  if (!_hijriFmt) return null
  const p = {}
  for (const part of _hijriFmt.formatToParts(date)) {
    if (part.type === 'year') p.y = parseInt(part.value, 10)
    else if (part.type === 'month') p.m = parseInt(part.value, 10)
    else if (part.type === 'day') p.d = parseInt(part.value, 10)
  }
  return (p.y && p.m && p.d) ? p : null
}
// بحث ثنائي على الأيام: أصغر تاريخ ميلادي يطابق الهجري المطلوب (دقيق عبر أم القرى).
const hijriToGregorian = (hy, hm, hd) => {
  if (!_hijriFmt) return null
  const DAY = 86400000
  const gyApprox = Math.floor(hy * 0.970229 + 621.5643)
  let lo = Date.UTC(gyApprox - 2, 0, 1)
  let hi = Date.UTC(gyApprox + 2, 11, 31)
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / (2 * DAY)) * DAY
    const p = _hijriParts(new Date(mid))
    if (!p) return null
    const c = p.y !== hy ? (p.y < hy ? -1 : 1) : p.m !== hm ? (p.m < hm ? -1 : 1) : p.d !== hd ? (p.d < hd ? -1 : 1) : 0
    if (c === 0) return new Date(mid)
    if (c < 0) lo = mid + DAY; else hi = mid - DAY
  }
  return null
}
const _ages = (gregBirth) => {
  const now = new Date()
  let g = now.getUTCFullYear() - gregBirth.getUTCFullYear()
  const md = now.getUTCMonth() - gregBirth.getUTCMonth()
  if (md < 0 || (md === 0 && now.getUTCDate() < gregBirth.getUTCDate())) g--
  const bp = _hijriParts(gregBirth), tp = _hijriParts(now)
  let h = null
  if (bp && tp) { h = tp.y - bp.y; if (tp.m < bp.m || (tp.m === bp.m && tp.d < bp.d)) h-- }
  return { g, h }
}

/*
  معالج «طلب سعودة» — تدفّق مخصّص بسبع خطوات:
  المكتب → المنشأة → بيانات السعودي → رقم الفاتورة/السند → عقد قوى (رفع) →
  اشتراك التأمينات (رفع) → المعقب + البنك + الآيبان → حفظ.
  التخزين: service_requests (المكتب/المنشأة/نوع الخدمة/رقم السند) + other_applications.details
  (بيانات السعودي والبنك) + مرفقان في جدول attachments (entity_type='other_application').
*/
export default function SaudizationRequestPage({ sb, toast, user, lang, branchId, onClose }) {
  const isAr = lang !== 'en'
  const T = (a, e) => (isAr ? a : e)
  const gm = isGM(user)
  // تاريخ التسجيل: يُسمح فقط بآخر ٣ أيام — اليوم واليومان السابقان؛ الباقي (قبلها وبعدها) معطّل.
  const _fmtD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const maxRegDate = _fmtD(new Date())
  const minRegDate = (() => { const d = new Date(); d.setDate(d.getDate() - 2); return _fmtD(d) })()

  const [step, setStep] = useState(0)
  const [office, setOffice] = useState(user?.primary_branch_id || branchId || null)
  const [facilityId, setFacilityId] = useState(null)
  const [facQ, setFacQ] = useState('')
  const [saudiName, setSaudiName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [hY, setHY] = useState(''); const [hM, setHM] = useState(''); const [hD, setHD] = useState('')
  const [regDate, setRegDate] = useState('')
  const [reason, setReason] = useState('')
  const [saudiType, setSaudiType] = useState('normal') // 'normal' | 'new'
  // بحث رقم الفاتورة / سند القبض من قاعدة البيانات (invoices.invoice_no + payments.receipt_no).
  const [invQ, setInvQ] = useState('')
  const [invResults, setInvResults] = useState([])
  const [invLoading, setInvLoading] = useState(false)
  const [selInv, setSelInv] = useState(null) // { kind:'invoice'|'receipt', id, number, amount }
  const [qiwaFile, setQiwaFile] = useState(null)
  const [gosiFile, setGosiFile] = useState(null)
  // خطوة التحقق (تظهر فقط للسعودي الجديد): من حساب السعودي نفسه — حساب قوى (لا عقد/آخر عقد قبل 12 شهر) + اشتراك التأمينات.
  const [verQiwaFile, setVerQiwaFile] = useState(null)
  const [verGosiFile, setVerGosiFile] = useState(null)
  const [muaqqib, setMuaqqib] = useState('')
  const [bank, setBank] = useState('')
  const [accountName, setAccountName] = useState('')
  const [iban, setIban] = useState('')

  const [branches, setBranches] = useState([])
  const [facilities, setFacilities] = useState([])
  const [banks, setBanks] = useState([])

  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!sb) return
    sb.from('branches').select('id,branch_code,name_ar').is('deleted_at', null).eq('is_active', true).order('name_ar')
      .then(({ data }) => setBranches(data || []))
    sb.from('facilities').select('id,name_ar,unified_number,gosi_number,hrsd_number,branch_id').is('deleted_at', null).order('name_ar').limit(5000)
      .then(({ data }) => setFacilities(data || []))
    sb.from('lookup_items').select('value_ar,sort_order,lookup_categories!inner(category_key)')
      .eq('lookup_categories.category_key', 'saudi_banks').eq('is_active', true).order('sort_order')
      .then(({ data }) => setBanks(data || []))
  }, [sb])

  const officeOptions = useMemo(() => (gm ? branches : branches.filter(b => userOffices(user).includes(b.id))), [branches, gm, user])
  // لا تظهر أي منشآت قبل البحث؛ والبحث بالأرقام فقط: الموحد أو التأمينات أو الموارد البشرية.
  const facFiltered = useMemo(() => {
    const q = facQ.trim()
    if (!q) return []
    return facilities.filter(f =>
      String(f.unified_number || '').includes(q) ||
      String(f.gosi_number || '').includes(q) ||
      String(f.hrsd_number || '').includes(q))
  }, [facilities, facQ])

  // اشتقاق التاريخ الميلادي والعمر من تاريخ الميلاد الهجري المُدخل (عند اكتمال السنة/الشهر/اليوم).
  const birthDerived = useMemo(() => {
    const y = parseInt(hY, 10), m = parseInt(hM, 10), d = parseInt(hD, 10)
    if (!(y >= 1300 && y <= 1500) || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 30)) return null
    const greg = hijriToGregorian(y, m, d)
    if (!greg) return null
    return { gregIso: greg.toISOString().slice(0, 10), ages: _ages(greg) }
  }, [hY, hM, hD])

  // مكتب الجبيل JUB1: البحث في سندات القبض (jub1_receipts). بقية المكاتب: فواتير فقط (invoices.invoice_no).
  const isJub1Office = branches.find(b => b.id === office)?.branch_code === 'JUB1'
  // مطابقة الخدمة: تجديد إقامة/نقل كفالة/أجير → تُصفّى الفواتير/السندات لتطابق الخدمة فقط.
  const REASON_SVC = { 'تجديد إقامة': 'iqama_renewal', 'نقل كفالة': 'transfer', 'أجير': 'ajeer' }
  const reasonSvcCode = REASON_SVC[reason] || null
  useEffect(() => {
    const q = invQ.trim()
    if (!q || selInv) { setInvResults([]); setInvLoading(false); return }
    let alive = true
    setInvLoading(true)
    const t = setTimeout(async () => {
      try {
        if (isJub1Office) {
          let qb = sb.from('jub1_receipts')
            .select('id, primary_receipt_no, primary_receipt_amount, total_amount, receipt_date, client_name, service_code')
            .ilike('primary_receipt_no', `%${q}%`).is('deleted_at', null)
          if (reasonSvcCode) qb = qb.eq('service_code', reasonSvcCode)
          const { data } = await qb.limit(20)
          if (!alive) return
          setInvResults((data || []).filter(r => r.primary_receipt_no).map(r => ({
            kind: 'receipt', id: r.id, number: String(r.primary_receipt_no),
            amount: r.primary_receipt_amount ?? r.total_amount,
            date: r.receipt_date ? String(r.receipt_date).slice(0, 10) : null,
            service: r.client_name || T('سند قبض', 'Receipt'),
          })))
        } else {
          let qb = sb.from('invoices')
            .select('id, invoice_no, total_amount, created_at, service_type:lookup_items!invoices_service_type_id_fkey!inner(code,value_ar,value_en)')
            .ilike('invoice_no', `%${q}%`).is('deleted_at', null)
          if (reasonSvcCode) qb = qb.eq('service_type.code', reasonSvcCode)
          const { data: inv } = await qb.limit(20)
          if (!alive) return
          setInvResults((inv || []).filter(i => i.invoice_no).map(i => ({
            kind: 'invoice', id: i.id, number: String(i.invoice_no), amount: i.total_amount,
            date: i.created_at ? String(i.created_at).slice(0, 10) : null,
            service: i.service_type ? (isAr ? i.service_type.value_ar : (i.service_type.value_en || i.service_type.value_ar)) : null,
          })))
        }
      } catch { if (alive) setInvResults([]) } finally { if (alive) setInvLoading(false) }
    }, 250)
    return () => { alive = false; clearTimeout(t) }
  }, [invQ, selInv, sb, isJub1Office, reasonSvcCode])

  // خطوات ديناميكية — خطوة «التحقق» تظهر فقط للسعودي الجديد (بعد الفاتورة/السند).
  const isNewSaudi = saudiType === 'new'
  // خطوة الفاتورة/السند تُلغى لسببَي «رفع نطاق - تأشيرات» و«رفع نطاق - نقل كفالة».
  const skipInvoice = reason === 'رفع نطاق - تأشيرات' || reason === 'رفع نطاق - نقل كفالة'
  const steps = ['office', 'request', 'saudi', 'facility', ...(skipInvoice ? [] : ['invoice']), ...(isNewSaudi ? ['verify'] : []), 'attachments', 'bank']
  useEffect(() => { setStep(s => Math.min(s, steps.length - 1)) }, [steps.length])
  const stepKey = steps[step]
  const validFor = {
    office: !!office,
    request: !!regDate && !!reason,
    saudi: !!saudiName.trim() && /^\d{10}$/.test(nationalId.trim()) && !!hY.trim() && !!hM.trim() && !!hD.trim(),
    facility: !!facilityId,
    invoice: !!selInv,
    verify: !!verQiwaFile && !!verGosiFile,
    attachments: !!qiwaFile && !!gosiFile,
    bank: !!muaqqib.trim() && !!bank && !!accountName.trim() && !!iban.trim(),
  }
  const stepValid = validFor[stepKey]

  const cardStyle = (sel) => ({
    padding: '14px 10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
    border: `1px solid ${sel ? C.teal : 'var(--bd)'}`, background: sel ? 'rgba(22,160,133,.08)' : 'var(--card-grad2)',
    boxShadow: 'var(--shadow-sm)', transition: 'border-color .15s, background .15s',
  })
  const submit = async () => {
    setSaving(true); setErr(null)
    try {
      const [{ data: svcType }, { data: status }] = await Promise.all([
        sb.from('lookup_items').select('id,category:lookup_categories!inner(category_key)').eq('code', 'saudization').eq('category.category_key', 'service_type').maybeSingle(),
        sb.from('lookup_items').select('id,category:lookup_categories!inner(category_key)').eq('code', 'in_progress').eq('category.category_key', 'request_status').maybeSingle(),
      ])
      if (!svcType?.id || !status?.id) throw new Error(T('تعذّر جلب معرّفات الخدمة', 'Lookup ids not found'))

      const refNo = String(Date.now()).slice(-10)
      const birthHijri = `${hY.trim()}-${hM.trim().padStart(2, '0')}-${hD.trim().padStart(2, '0')}`

      const { data: sr, error: srErr } = await sb.from('service_requests').insert({
        request_ref_no: refNo,
        branch_id: office,
        facility_id: facilityId,
        service_type_id: svcType.id,
        status_id: status.id,
        request_date: new Date().toISOString(),
        slip_no: selInv?.number || null,
      }).select('id').single()
      if (srErr) throw srErr

      const details = {
        registration_date: regDate,
        reason,
        saudi_type: saudiType,
        saudi_name: saudiName.trim(),
        saudi_national_id: nationalId.trim(),
        birth_date_hijri: birthHijri,
        birth_date_gregorian: birthDerived?.gregIso || null,
        age_hijri: birthDerived?.ages?.h ?? null,
        age_gregorian: birthDerived?.ages?.g ?? null,
        invoice_or_receipt_no: selInv?.number || null,
        invoice_ref_kind: selInv?.kind || null,
        invoice_ref_id: selInv?.id || null,
        muaqqib_name: muaqqib.trim(),
        bank,
        account_name: accountName.trim(),
        iban: iban.trim(),
      }
      const { data: oa, error: oaErr } = await sb.from('other_applications').insert({
        service_request_id: sr.id,
        worker_facility_id: facilityId,
        description: T('السعودة', 'Saudization'),
        details,
      }).select('id').single()
      if (oaErr) throw oaErr

      const upload = async (file, kind) => {
        if (!file) return
        const safe = String(file.name || 'file').replace(/[^\w.\-]+/g, '_')
        const path = `saudization/${oa.id}/${Date.now()}_${kind}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr
        const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
        await sb.from('attachments').insert({
          entity_type: 'other_application', entity_id: oa.id,
          file_name: file.name, file_url: pub?.publicUrl || path, storage_path: path,
          mime_type: file.type || null, size_bytes: file.size || null,
          notes: kind, uploaded_by: user?.id || null,
        })
      }
      await upload(qiwaFile, 'qiwa_contract')
      await upload(gosiFile, 'gosi_subscription')
      if (isNewSaudi) {
        await upload(verQiwaFile, 'verify_qiwa_account')
        await upload(verGosiFile, 'verify_gosi_account')
      }

      setDone({ refNo })
    } catch (e) {
      setErr(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  const body = (() => {
    switch (stepKey) {
      case 'office':
        return (
          <ModalSection flex Icon={Building2} label={T('اختر المكتب', 'Select office')}>
            {officeOptions.length === 0 ? <EmptyState title={T('لا توجد مكاتب', 'No offices')} /> : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
                {officeOptions.map(b => {
                  const sel = office === b.id
                  return (
                    <div key={b.id} onClick={() => setOffice(b.id)} style={cardStyle(sel)}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: sel ? C.teal : 'var(--tx)' }}>{b.name_ar || b.branch_code}</div>
                      <div style={{ fontSize: 11, color: 'var(--tx4)', direction: 'ltr', marginTop: 3 }}>{b.branch_code}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </ModalSection>
        )
      case 'facility': {
        // نفس تصميم بطاقة العميل في «فاتورة جديدة»: خلفية زجاجية ذهبية + صناديق معلومات + زر «تغيير» بالزاوية.
        const G = {
          base: 'linear-gradient(135deg,rgba(176,125,0,.07),rgba(255,255,255,.015))', baseB: 'rgba(176,125,0,.22)',
          hover: 'linear-gradient(135deg,rgba(176,125,0,.12),rgba(255,255,255,.02))', hoverB: 'rgba(176,125,0,.32)',
          sel: 'linear-gradient(135deg,rgba(176,125,0,.16),rgba(255,255,255,.02))', selB: 'rgba(176,125,0,.45)',
        }
        const gold = C.gold
        const avatar = (sel, size = 40) => (
          <div style={{ width: size, height: size, borderRadius: 12, background: 'var(--fk-input-bg)', border: sel ? '1.5px solid rgba(176,125,0,.4)' : '1px solid var(--bd)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sel ? '0 2px 8px rgba(176,125,0,.15)' : 'none' }}>
            <Building2 size={Math.round(size * 0.48)} strokeWidth={1.8} color={gold} />
          </div>
        )
        const infoBox = (Icon, label, val) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, background: 'var(--fk-input-bg)', border: '1px solid rgba(176,125,0,.18)', minWidth: 118 }}>
            <Icon size={13} color={gold} strokeWidth={1.8} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 9, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600, direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
            </div>
          </div>
        )
        const facBoxes = (f) => (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
            {f.unified_number && infoBox(FileText, T('الرقم الموحد', 'Unified'), f.unified_number)}
            {f.gosi_number && infoBox(ShieldCheck, T('التأمينات', 'GOSI'), f.gosi_number)}
            {f.hrsd_number && infoBox(IdCard, T('الموارد البشرية', 'HRSD'), f.hrsd_number)}
          </div>
        )
        const emptyBox = (noMatch) => (
          <div style={{ padding: '24px 20px', borderRadius: 9, border: '1px dashed var(--bd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(176,125,0,.08)', border: '1px dashed rgba(176,125,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(176,125,0,.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />{noMatch && <line x1="8" y1="11" x2="14" y2="11" />}</svg>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, fontFamily: F }}>{noMatch ? T('لا توجد منشأة بهذا الرقم', 'No facility with this number') : T('ابحث عن المنشأة', 'Search for the facility')}</div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, fontFamily: F }}>{T('أدخل الرقم الموحد أو رقم التأمينات أو رقم الموارد البشرية', 'Enter the unified, GOSI, or HRSD number')}</div>
          </div>
        )
        const selFac = facilities.find(f => f.id === facilityId)
        return (
          <ModalSection flex Icon={Building2} label={T('اختر المنشأة', 'Select facility')} hint={selFac ? undefined : T('ابحث بالرقم الموحد أو رقم التأمينات أو رقم الموارد البشرية', 'Search by unified, GOSI, or HRSD number')}>
            {!selFac && (
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 14 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tx4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', insetInlineEnd: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input value={facQ} onChange={e => setFacQ(e.target.value.replace(/\D/g, ''))} inputMode="numeric"
                    placeholder={T('الرقم الموحد / التأمينات / الموارد البشرية', 'Unified / GOSI / HRSD number')}
                    style={{ width: '100%', height: 42, padding: '0 44px', borderRadius: 9, fontFamily: F, fontSize: 14, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'var(--fk-input-bg)', border: '1px solid var(--bd)', direction: 'rtl', textAlign: 'right', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}
            <div className="sr-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingInlineEnd: (!selFac && facQ.trim() && facFiltered.length > 0) ? 14 : 0 }}>
              {selFac ? (
                <div style={{ position: 'relative', border: `1px solid ${G.selB}`, background: G.sel, boxShadow: 'var(--shadow-md)', padding: '14px 18px 18px', borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}>
                    {avatar(true, 48)}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14.5, fontWeight: 600, color: gold, letterSpacing: '-.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selFac.name_ar || '—'}</span>
                      <button onClick={() => setFacilityId(null)} title={T('تغيير المنشأة', 'Change facility')} style={{ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 9, background: 'rgba(192,57,43,.10)', border: '1px solid rgba(192,57,43,.3)', color: '#c0392b', fontFamily: F, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', zIndex: 2 }}>{T('تغيير', 'Change')}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg></button>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                    {selFac.unified_number && infoBox(FileText, T('الرقم الموحد', 'Unified'), selFac.unified_number)}
                    {selFac.gosi_number && infoBox(ShieldCheck, T('التأمينات', 'GOSI'), selFac.gosi_number)}
                    {selFac.hrsd_number && infoBox(IdCard, T('الموارد البشرية', 'HRSD'), selFac.hrsd_number)}
                  </div>
                </div>
              ) : !facQ.trim() ? emptyBox(false)
                : facFiltered.length === 0 ? emptyBox(true)
                  : facFiltered.slice(0, 60).map(f => (
                    <div key={f.id} onClick={() => setFacilityId(f.id)}
                      onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.borderColor = G.hoverB }}
                      onMouseLeave={e => { e.currentTarget.style.background = G.base; e.currentTarget.style.borderColor = G.baseB }}
                      style={{ cursor: 'pointer', position: 'relative', border: `1px solid ${G.baseB}`, background: G.base, boxShadow: 'var(--shadow-md)', transition: 'all .22s ease', padding: '11px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {avatar(false)}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.2px' }}>{f.name_ar || '—'}</span>
                      </div>
                      {facBoxes(f)}
                    </div>
                  ))}
            </div>
          </ModalSection>
        )
      }
      case 'request': {
        const cLabel = (txt) => <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', marginBottom: 8, textAlign: 'right' }}>{txt}</div>
        const REASONS = [
          { k: 'رفع نطاق - تأشيرات', l: T('رفع نطاق - تأشيرات', 'Nitaqat raise - visas') },
          { k: 'رفع نطاق - نقل كفالة', l: T('رفع نطاق - نقل كفالة', 'Nitaqat raise - transfer') },
          { k: 'تجديد إقامة', l: T('تجديد إقامة', 'Iqama renewal') },
          { k: 'نقل كفالة', l: T('نقل كفالة', 'Transfer') },
          { k: 'أجير', l: T('أجير', 'Ajeer') },
        ]
        return (
          <ModalSection flex Icon={FileText} label={T('بيانات الطلب', 'Request info')}>
            <div style={GRID}>
              <div>{cLabel(T('تاريخ التسجيل', 'Registration date'))}<DateField value={regDate} onChange={setRegDate} min={minRegDate} max={maxRegDate} /></div>
              <div>{cLabel(T('السبب', 'Reason'))}<Select value={reason} onChange={setReason} options={REASONS} getKey={o => o.k} getLabel={o => o.l} placeholder={T('اختر السبب', 'Select reason')} /></div>
            </div>
            <div style={{ marginTop: 14 }}>
              {cLabel(T('نوع السعودي', 'Saudi type'))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[{ v: 'normal', t: T('سعودي عادي', 'Regular Saudi') }, { v: 'new', t: T('سعودي جديد', 'New Saudi') }].map(o => {
                  const act = saudiType === o.v
                  return (
                    <div key={o.v} onClick={() => setSaudiType(o.v)} style={{ cursor: 'pointer', padding: '11px 13px', borderRadius: 11, textAlign: 'center', fontSize: 13, fontWeight: 600, transition: '.15s', border: act ? '1px solid rgba(176,125,0,.45)' : '1px solid var(--bd)', background: act ? 'linear-gradient(135deg,rgba(176,125,0,.12),rgba(255,255,255,.02))' : 'var(--bd2)', color: act ? C.gold : 'var(--tx2)' }}>{o.t}</div>
                  )
                })}
              </div>
            </div>
          </ModalSection>
        )
      }
      case 'saudi': {
        const cLabel = (txt) => <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)', marginBottom: 8, textAlign: 'right' }}>{txt}</div>
        return (
          <ModalSection flex Icon={IdCard} label={T('بيانات السعودي', 'Saudi employee data')}>
            <div style={GRID}>
              <div>{cLabel(T('الاسم', 'Name'))}<TextField value={saudiName} onChange={setSaudiName} dir="rtl" placeholder={T('اسم السعودي', 'Saudi name')} /></div>
              <div>{cLabel(T('رقم الهوية', 'National ID'))}<TextField value={nationalId} onChange={v => setNationalId(v.replace(/\D/g, '').slice(0, 10))} dir="ltr" placeholder="1XXXXXXXXX" /></div>
            </div>
            <div style={{ marginTop: 14 }}>
              {cLabel(T('تاريخ الميلاد (هجري)', 'Birth date (Hijri)'))}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, direction: 'ltr' }}>
                <div>{cLabel(T('السنة', 'Year'))}<TextField value={hY} onChange={v => setHY(v.replace(/\D/g, '').slice(0, 4))} dir="ltr" placeholder="1400" /></div>
                <div>{cLabel(T('الشهر', 'Month'))}<TextField value={hM} onChange={v => setHM(v.replace(/\D/g, '').slice(0, 2))} dir="ltr" placeholder="05" /></div>
                <div>{cLabel(T('اليوم', 'Day'))}<TextField value={hD} onChange={v => setHD(v.replace(/\D/g, '').slice(0, 2))} dir="ltr" placeholder="12" /></div>
              </div>
              {birthDerived && (
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div style={{ background: 'var(--fk-input-bg)', borderRadius: 11, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 5 }}>{T('التاريخ الميلادي', 'Gregorian date')}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', direction: 'ltr' }}>{birthDerived.gregIso}</div>
                  </div>
                  <div style={{ background: 'var(--fk-input-bg)', borderRadius: 11, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 5 }}>{T('العمر (هجري)', 'Age (Hijri)')}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: C.gold }}>{birthDerived.ages.h} <span style={{ fontSize: 11, color: 'var(--tx4)' }}>{T('سنة', 'yr')}</span></div>
                  </div>
                  <div style={{ background: 'var(--fk-input-bg)', borderRadius: 11, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 5 }}>{T('العمر (ميلادي)', 'Age (Gregorian)')}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: C.gold }}>{birthDerived.ages.g} <span style={{ fontSize: 11, color: 'var(--tx4)' }}>{T('سنة', 'yr')}</span></div>
                  </div>
                </div>
              )}
            </div>
          </ModalSection>
        )
      }
      case 'invoice': {
        const G = {
          base: 'linear-gradient(135deg,rgba(176,125,0,.07),rgba(255,255,255,.015))', baseB: 'rgba(176,125,0,.22)',
          hover: 'linear-gradient(135deg,rgba(176,125,0,.12),rgba(255,255,255,.02))', hoverB: 'rgba(176,125,0,.32)',
          sel: 'linear-gradient(135deg,rgba(176,125,0,.16),rgba(255,255,255,.02))', selB: 'rgba(176,125,0,.45)',
        }
        const gold = C.gold
        const jub1 = isJub1Office
        const stepLabel = jub1 ? T('رقم سند القبض (JUB1)', 'Receipt no. (JUB1)') : T('رقم الفاتورة', 'Invoice no.')
        const stepHint = jub1 ? T('ابحث في سندات قبض JUB1 بالرقم', 'Search JUB1 receipts by number') : T('ابحث برقم الفاتورة', 'Search by invoice number')
        const kindIcon = (kind) => kind === 'invoice' ? FileText : Receipt
        const iconBox = (Icon, sel) => (
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--fk-input-bg)', border: sel ? '1.5px solid rgba(176,125,0,.4)' : '1px solid var(--bd)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sel ? '0 2px 8px rgba(176,125,0,.15)' : 'none' }}>
            <Icon size={20} strokeWidth={1.8} color={gold} />
          </div>
        )
        return (
          <ModalSection flex Icon={jub1 ? Receipt : FileText} label={stepLabel} hint={selInv ? undefined : stepHint}>
            {!selInv && (
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 8, marginBottom: 14 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--tx4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', insetInlineEnd: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input value={invQ} onChange={e => setInvQ(e.target.value)}
                    placeholder={jub1 ? T('رقم سند القبض', 'Receipt no.') : T('رقم الفاتورة', 'Invoice no.')}
                    style={{ width: '100%', height: 42, padding: '0 44px', borderRadius: 9, fontFamily: F, fontSize: 14, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'var(--fk-input-bg)', border: '1px solid var(--bd)', direction: 'rtl', textAlign: 'right', boxSizing: 'border-box' }} />
                </div>
              </div>
            )}
            <div className="sr-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', paddingInlineEnd: (!selInv && invResults.length > 0) ? 14 : 0 }}>
              {selInv ? (
                <div style={{ position: 'relative', border: `1px solid ${G.selB}`, background: G.sel, boxShadow: 'var(--shadow-md)', padding: '14px 16px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {iconBox(kindIcon(selInv.kind), true)}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selInv.service || (selInv.kind === 'invoice' ? T('فاتورة', 'Invoice') : T('سند قبض', 'Receipt'))}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: gold, direction: 'ltr', textAlign: 'start', marginTop: 2 }}>{selInv.number}</div>
                      {selInv.date && <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', direction: 'ltr', textAlign: 'start', marginTop: 2 }}>{T('بتاريخ', 'Issued')} {selInv.date}</div>}
                    </div>
                    <button onClick={() => { setSelInv(null); setInvQ('') }} title={T('تغيير', 'Change')} style={{ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 9, background: 'rgba(192,57,43,.10)', border: '1px solid rgba(192,57,43,.3)', color: '#c0392b', fontFamily: F, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', zIndex: 2 }}>{T('تغيير', 'Change')}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg></button>
                  </div>
                </div>
              ) : !invQ.trim() ? (
                <div style={{ padding: '24px 20px', borderRadius: 9, border: '1px dashed var(--bd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(176,125,0,.08)', border: '1px dashed rgba(176,125,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(176,125,0,.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, fontFamily: F }}>{jub1 ? T('ابحث عن سند القبض', 'Search receipt') : T('ابحث عن الفاتورة', 'Search invoice')}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, fontFamily: F }}>{jub1 ? T('أدخل رقم سند القبض', 'Enter the receipt number') : T('أدخل رقم الفاتورة', 'Enter the invoice number')}</div>
                </div>
              ) : invLoading ? (
                <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 12, color: 'var(--tx3)', fontWeight: 600 }}>{T('جارٍ البحث…', 'Searching…')}</div>
              ) : invResults.length === 0 ? (
                <div style={{ padding: '24px 20px', borderRadius: 9, border: '1px dashed var(--bd)', textAlign: 'center', fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600 }}>{jub1 ? T('لا يوجد سند بهذا الرقم', 'No receipt with this number') : T('لا توجد فاتورة بهذا الرقم', 'No invoice with this number')}</div>
              ) : invResults.map(r => {
                const Icon = kindIcon(r.kind)
                return (
                  <div key={r.kind + r.id} onClick={() => setSelInv(r)}
                    onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.borderColor = G.hoverB }}
                    onMouseLeave={e => { e.currentTarget.style.background = G.base; e.currentTarget.style.borderColor = G.baseB }}
                    style={{ cursor: 'pointer', border: `1px solid ${G.baseB}`, background: G.base, boxShadow: 'var(--shadow-md)', transition: 'all .22s ease', padding: '11px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {iconBox(Icon, false)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service || (r.kind === 'invoice' ? T('فاتورة', 'Invoice') : T('سند قبض', 'Receipt'))}</div>
                      {r.date && <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', marginTop: 3 }}>{T('بتاريخ', 'Issued')} <span style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{r.date}</span></div>}
                    </div>
                    <div style={{ flexShrink: 0, fontSize: 14.5, fontWeight: 600, color: gold, direction: 'ltr' }}>{r.number}</div>
                  </div>
                )
              })}
            </div>
          </ModalSection>
        )
      }
      case 'verify':
        return (
          <>
            <ModalSection flex Icon={FileCheck} label={T('حساب قوى السعودي', 'Saudi\'s Qiwa account')} hint={T('صورة تُثبت عدم وجود عقد أو أن آخر عقد قبل أكثر من 12 شهراً', 'Proof of no contract or last contract over 12 months ago')}>
              <FileField grow label={T('حساب قوى', 'Qiwa account')} value={verQiwaFile} onChange={setVerQiwaFile} accept="image/*,application/pdf" />
            </ModalSection>
            <ModalSection flex Icon={ShieldCheck} label={T('اشتراك التأمينات (حساب السعودي)', 'GOSI subscription (Saudi\'s account)')} hint={T('من حساب السعودي نفسه', 'From the Saudi\'s own account')}>
              <FileField grow label={T('اشتراك التأمينات', 'GOSI subscription')} value={verGosiFile} onChange={setVerGosiFile} accept="image/*,application/pdf" />
            </ModalSection>
          </>
        )
      case 'attachments': {
        const facName = facilities.find(f => f.id === facilityId)?.name_ar || ''
        return (
          <>
            <ModalSection flex Icon={FileCheck} label={T('عقد قوى موثّق', 'Certified Qiwa contract')} hint={T('ارفع صورة أو ملف PDF للعقد الموثّق', 'Upload an image or PDF of the certified contract')}>
              <FileField grow label={T('عقد قوى', 'Qiwa contract')} value={qiwaFile} onChange={setQiwaFile} accept="image/*,application/pdf" />
            </ModalSection>
            <ModalSection flex Icon={ShieldCheck} label={T('اشتراك السعودي في حساب التأمينات للمنشأة', 'Saudi\'s GOSI subscription for the facility')}
              hint={<>{T('ارفع صورة من اشتراك السعودي في التأمينات الاجتماعية', 'Upload the Saudi employee\'s GOSI subscription')}{facName ? <> <span style={{ color: C.gold, fontWeight: 600 }}>{facName}</span></> : null}</>}>
              <FileField grow label={T('اشتراك التأمينات', 'GOSI subscription')} value={gosiFile} onChange={setGosiFile} accept="image/*,application/pdf" />
            </ModalSection>
          </>
        )
      }
      case 'bank':
        return (
          <ModalSection flex Icon={Wallet} label={T('المعقب والحساب البنكي', 'Muaqqib & bank account')}>
            <TextField label={T('اسم المعقب', 'Muaqqib name')} value={muaqqib} onChange={setMuaqqib} align="start" dir="rtl" placeholder={T('اسم المعقب', 'Muaqqib name')} />
            <div style={{ ...GRID, marginTop: 12 }}>
              <Select label={T('البنك', 'Bank')} value={bank} onChange={setBank} options={banks} getKey={b => b.value_ar} getLabel={b => b.value_ar} placeholder={T('اختر البنك', 'Select bank')} />
              <TextField label={T('اسم الحساب البنكي', 'Bank account name')} value={accountName} onChange={setAccountName} align="start" dir="rtl" placeholder={T('اسم صاحب الحساب', 'Account holder name')} />
            </div>
            <div style={{ marginTop: 12 }}>
              <TextField full label={T('رقم الآيبان', 'IBAN')} value={iban} onChange={v => setIban(v.toUpperCase())} dir="ltr" placeholder="SA00 0000 0000 0000 0000 0000" />
            </div>
          </ModalSection>
        )
      default:
        return null
    }
  })()

  if (done) {
    return (
      <FKModal open onClose={onClose} title={T('طلب سعودة', 'Saudization Request')} Icon={ShieldCheck} variant="create" width={720}
        success={<SuccessView title={T('تم إنشاء طلب السعودة', 'Saudization request created')} code={done.refNo} />} />
    )
  }

  // مفتاح لكل خطوة يُجبر React على تركيب المحتوى من جديد بدل إعادة استخدام عقدة الإطار السابق —
  // يمنع أنيميشن ModalSection (transition) من تحريك الإطار عند تبديل بنية الخطوة.
  const pages = Array.from({ length: steps.length }, (_, i) => ({
    title: '',
    valid: i === step ? !!stepValid : true,
    error: i === step ? (err || '') : '',
    content: <React.Fragment key={stepKey}>{body}</React.Fragment>,
  }))

  return (
    <FKModal open onClose={onClose}
      title={T('طلب سعودة جديد', 'New Saudization Request')} Icon={ShieldCheck} variant="create" width={720}
      page={step}
      onNext={() => { setErr(null); setStep(s => Math.min(steps.length - 1, s + 1)) }}
      onBack={() => { setErr(null); setStep(s => Math.max(0, s - 1)) }}
      onSubmit={submit} submitting={saving} submitLabel={T('حفظ الطلب', 'Save request')} submitIcon={CheckCircle2}
      nextLabel={T('التالي', 'Next')} backLabel={T('السابق', 'Back')}
      pages={pages} />
  )
}
