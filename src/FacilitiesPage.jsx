import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { DateField, Sel } from './pages/KafalaCalculator.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017', goldSoft: '#e8c77a',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 24

const num = (v) => Number(v || 0).toLocaleString('en-US')

/* ─── Theme maps ─── */
const NITAQAT_THEME = {
  red:        { c: C.red,                 label_ar: 'أحمر',           label_en: 'Red' },
  yellow:     { c: '#e6b422',             label_ar: 'أصفر',           label_en: 'Yellow' },
  green_low:  { c: '#27a046',             label_ar: 'أخضر منخفض',     label_en: 'Green Low' },
  green_mid:  { c: '#2ecc71',             label_ar: 'أخضر متوسط',     label_en: 'Green Mid' },
  green_high: { c: '#16a085',             label_ar: 'أخضر مرتفع',     label_en: 'Green High' },
  platinum:   { c: '#cdcdcd',             label_ar: 'بلاتيني',        label_en: 'Platinum' },
}
const CR_STATUS_THEME = {
  active:               { c: C.ok,     label_ar: 'نشط',            label_en: 'Active' },
  pending_confirmation: { c: C.gold,   label_ar: 'ضمن فترة التأكيد', label_en: 'Pending' },
  suspended:            { c: C.orange, label_ar: 'معلّق',           label_en: 'Suspended' },
  cancelled:            { c: C.red,    label_ar: 'مشطوب',           label_en: 'Cancelled' },
  expired:              { c: C.gray,   label_ar: 'منتهي',           label_en: 'Expired' },
  revoked:              { c: C.red,    label_ar: 'ملغى',            label_en: 'Revoked' },
}
const FAC_STATUS_THEME = {
  active:   { c: C.ok,  label_ar: 'نشطة',   label_en: 'Active' },
  issue:    { c: C.red, label_ar: 'مشكلة',  label_en: 'Issue' },
  inactive: { c: C.gray, label_ar: 'غير نشطة', label_en: 'Inactive' },
}
const VAL_AR = {
  active: 'نشط', inactive: 'غير نشط', registered: 'مسجّل', not_registered: 'غير مسجّل',
  deregistered: 'ملغى', compliant: 'متوافق', non_compliant: 'غير متوافق',
  suspended: 'معلّق', cancelled: 'ملغى', expired: 'منتهي',
  sole_proprietorship: 'مؤسسة فردية', limited_liability: 'ذات مسؤولية محدودة',
  general_partnership: 'تضامن', limited_partnership: 'توصية بسيطة',
  joint_stock: 'مساهمة', simplified_joint_stock: 'مساهمة مبسطة',
  one_person: 'شخص واحد', two_or_more: 'شخصين أو أكثر',
  establishment: 'مؤسسة فردية', company: 'شركة',
  micro: 'صغيرة جداً', small: 'صغيرة', medium: 'متوسطة', large: 'كبيرة', giant: 'عملاقة',
  true: 'نعم', false: 'لا',
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

const btnFilter = (active) => ({ height: 44, padding: '0 16px', borderRadius: 12, background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)', border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'), color: active ? C.gold : 'var(--tx2)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' })

const btnGold = { height: 40, padding: '0 16px', borderRadius: 11, background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)', border: '1px solid rgba(212,160,23,.45)', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 12, fontWeight: 700, transition: '.2s', boxShadow: '0 2px 8px rgba(212,160,23,.18), inset 0 1px 0 rgba(212,160,23,.18)' }

/* ─── Tiny bits ─── */
const Badge = ({ theme, T }) => theme ? (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: theme.c + '18', border: '1px solid ' + theme.c + '38', color: theme.c, fontSize: 10.5, fontWeight: 700 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.c, boxShadow: '0 0 5px ' + theme.c }} />
    {T(theme.label_ar, theme.label_en)}
  </span>
) : null

const CopyBtn = ({ value, toast, T }) => (
  <button
    onClick={(e) => { e.stopPropagation(); try { navigator.clipboard?.writeText(String(value)); toast?.(T('تم النسخ','Copied')) } catch {} }}
    title={T('نسخ','Copy')}
    style={{ width: 16, height: 16, padding: 0, borderRadius: 3, background: 'transparent', border: 'none', color: 'currentColor', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: .7, transition: '.18s' }}
    onMouseEnter={e => { e.currentTarget.style.opacity = '1' }}
    onMouseLeave={e => { e.currentTarget.style.opacity = '.7' }}
  >
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
  </button>
)

/* ═══════════════════════════════════════════════════════════════ */
export default function FacilitiesPage({ sb, toast, user, lang, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [data, setData] = useState([])
  const [subs, setSubs] = useState([])
  const [creds, setCreds] = useState([])
  const [partners, setPartners] = useState([])
  const [branches, setBranches] = useState([])
  const [regions, setRegions] = useState([])
  const [cities, setCities] = useState([])
  const [visas, setVisas] = useState([])
  const [weeklyStats, setWeeklyStats] = useState([])
  const [loading, setLoading] = useState(false)

  const [q, setQ] = useState('')
  const [crStatusFilter, setCrStatusFilter] = useState('')
  const [nitaqatFilter, setNitaqatFilter] = useState('')
  const [legalFormFilter, setLegalFormFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [advOpen, setAdvOpen] = useState(false)

  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)

  // Edit form modal
  const [pop, setPop] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { onTabChange && onTabChange({ tab: 'facilities' }) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [f, br, rg, ct] = await Promise.all([
      sb.from('facilities').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('branches').select('id,name_ar').is('deleted_at', null),
      sb.from('regions').select('id,name_ar').order('name_ar'),
      sb.from('cities').select('id,name_ar,region_id').order('name_ar'),
    ])
    setData(f.data || []); setBranches(br.data || []); setRegions(rg.data || []); setCities(ct.data || [])
    setLoading(false)

    Promise.all([
      sb.from('facility_subscriptions').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('platform_credentials').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('facility_visas').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('facility_weekly_stats').select('*').order('week_date', { ascending: false }).limit(500),
    ]).then(([s, c, v, ws]) => {
      setSubs(s.data || []); setCreds(c.data || []); setVisas(v.data || []); setWeeklyStats(ws.data || [])
    })
  }, [sb])
  useEffect(() => { load() }, [load])

  const saveG = async (table, fd) => {
    setSaving(true)
    try {
      const d = { ...fd }; const id = d._id; delete d._id
      Object.keys(d).forEach(k => { if (d[k] === '') d[k] = null; if (d[k] === 'true') d[k] = true; if (d[k] === 'false') d[k] = false })
      if (id) { d.updated_by = user?.id; const { error } = await sb.from(table).update(d).eq('id', id); if (error) throw error; toast?.(T('تم التعديل','Updated')) }
      else { d.created_by = user?.id; const { error } = await sb.from(table).insert(d); if (error) throw error; toast?.(T('تمت الإضافة','Added')) }
      setPop(null); load()
    } catch (e) { toast?.(T('خطأ: ','Error: ') + (e.message || '').slice(0, 80), 'error') }
    setSaving(false)
  }
  const del = async (t, id) => {
    if (!confirm(T('حذف؟','Delete?'))) return
    await sb.from(t).update({ deleted_at: new Date().toISOString() }).eq('id', id)
    toast?.(T('تم الحذف','Deleted'), 'delete'); load()
  }

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const total = data.length
    const sole = data.filter(r => r.legal_form === 'sole_proprietorship').length
    const llcOne = data.filter(r => r.legal_form === 'limited_liability' && r.character_count === 'one_person').length
    const llcMulti = data.filter(r => r.legal_form === 'limited_liability' && r.character_count !== 'one_person').length
    const otherForm = total - sole - llcOne - llcMulti
    const crActive = data.filter(r => r.cr_status === 'active').length
    const crPending = data.filter(r => r.cr_status === 'pending_confirmation').length
    const crSuspended = data.filter(r => r.cr_status === 'suspended').length
    const crDeleted = data.filter(r => r.cr_delete_date != null || r.cr_status === 'cancelled').length
    const issue = data.filter(r => r.facility_status === 'issue').length
    const exempt = data.filter(r => r.is_original_exempt === true).length
    const totalWorkers = data.reduce((s, r) => s + (Number(r.total_workers) || 0), 0)
    const totalVisas = data.reduce((s, r) => s + (Number(r.max_visas) || 0), 0)
    return { total, sole, llcOne, llcMulti, otherForm, crActive, crPending, crSuspended, crDeleted, issue, exempt, totalWorkers, totalVisas }
  }, [data])

  /* ─── Filtered ─── */
  const filtered = useMemo(() => {
    return data.filter(r => {
      if (crStatusFilter && r.cr_status !== crStatusFilter) return false
      if (nitaqatFilter && r.nitaqat_color !== nitaqatFilter) return false
      if (legalFormFilter && r.legal_form !== legalFormFilter) return false
      if (regionFilter && r.region_id !== regionFilter) return false
      if (q.trim()) {
        const s = q.toLowerCase()
        if (!((r.name_ar || '').includes(s) || (r.name_en || '').toLowerCase().includes(s) || (r.cr_number || '').includes(s) || (r.unified_national_number || '').includes(s) || (r.qiwa_file_number || '').includes(s) || (r.gosi_file_number || '').includes(s) || (r.mobile || '').includes(s) || (r.email || '').toLowerCase().includes(s))) return false
      }
      return true
    })
  }, [data, crStatusFilter, nitaqatFilter, legalFormFilter, regionFilter, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE)

  /* ─── Edit form fields ─── */
  const fFields = [
    { k: 'name_ar', l: T('الاسم بالعربي','Name (AR)'), r: 1 },
    { k: 'name_en', l: T('الاسم بالإنجليزي','Name (EN)'), d: 1 },
    { k: 'type', l: T('النوع','Type'), opts: [{ v: 'establishment', l: T('مؤسسة فردية','Establishment') }, { v: 'company', l: T('شركة','Company') }] },
    { k: 'legal_form', l: T('الشكل القانوني','Legal Form'), opts: ['sole_proprietorship','limited_liability','limited_partnership','general_partnership','joint_stock','simplified_joint_stock'].map(v => ({ v, l: T(VAL_AR[v], v) })) },
    { k: 'unified_national_number', l: T('الرقم الموحد','Unified No'), d: 1, r: 1 },
    { k: 'cr_number', l: T('رقم السجل التجاري','CR No'), d: 1 },
    { k: 'cr_status', l: T('حالة السجل','CR Status'), opts: Object.entries(CR_STATUS_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) })), r: 1 },
    { k: 'cr_issue_date', l: T('تاريخ الإصدار','CR Issue'), t: 'date' },
    { k: 'cr_confirm_date', l: T('تاريخ التصديق','Confirm Date'), t: 'date' },
    { k: 'cr_expiry_date', l: T('تاريخ الانتهاء','CR Expiry'), t: 'date' },
    { k: 'capital', l: T('رأس المال','Capital'), d: 1 },
    { k: 'qiwa_file_number', l: T('رقم ملف قوى','Qiwa File'), d: 1 },
    { k: 'gosi_file_number', l: T('رقم ملف التأمينات','GOSI File'), d: 1 },
    { k: 'chamber_membership_no', l: T('رقم الغرفة','Chamber No'), d: 1 },
    { k: 'chamber_membership_expiry', l: T('انتهاء الغرفة','Chamber Expiry'), t: 'date' },
    { k: 'vat_number', l: T('رقم ض.ق.م','VAT No'), d: 1 },
    { k: 'vat_status', l: T('حالة الضريبة','VAT Status'), opts: ['registered','not_registered','deregistered'].map(v => ({ v, l: T(VAL_AR[v], v) })) },
    { k: 'zakat_unique_number', l: T('الرقم المميز للزكاة','Zakat No'), d: 1 },
    { k: 'gosi_status', l: T('حالة التأمينات','GOSI Status'), opts: ['active','inactive'].map(v => ({ v, l: T(VAL_AR[v], v) })) },
    { k: 'mlsd_service_status', l: T('حالة خدمات العمل','Labor Status'), opts: ['active','suspended'].map(v => ({ v, l: T(VAL_AR[v], v) })) },
    { k: 'mudad_wps_compliance_status', l: T('حالة مدد','Mudad'), opts: ['compliant','non_compliant'].map(v => ({ v, l: T(VAL_AR[v], v) })) },
    { k: 'nitaqat_color', l: T('لون النطاق','Nitaqat Color'), opts: Object.entries(NITAQAT_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) })) },
    { k: 'nitaqat_size', l: T('حجم النطاق','Nitaqat Size'), opts: ['micro','small','medium','large','giant'].map(v => ({ v, l: T(VAL_AR[v], v) })) },
    { k: 'total_workers', l: T('إجمالي العمال','Total Workers'), d: 1 },
    { k: 'saudi_workers', l: T('سعوديون','Saudis'), d: 1 },
    { k: 'saudization_percentage', l: T('نسبة السعودة %','Saudization %'), d: 1 },
    { k: 'max_visas', l: T('الحد الأقصى للتأشيرات','Max Visas'), d: 1 },
    { k: 'branch_id', l: T('المكتب','Branch'), opts: branches.map(b => ({ v: b.id, l: b.name_ar })) },
    { k: 'region_id', l: T('المنطقة','Region'), opts: regions.map(r => ({ v: r.id, l: r.name_ar })) },
    { k: 'city_id', l: T('المدينة','City'), opts: cities.map(c => ({ v: c.id, l: c.name_ar })) },
    { k: 'address_ar', l: T('العنوان','Address'), w: 1 },
    { k: 'short_address', l: T('العنوان المختصر','Short Address'), d: 1 },
    { k: 'mobile', l: T('الجوال','Phone'), d: 1 },
    { k: 'email', l: T('البريد','Email'), d: 1 },
    { k: 'facility_status', l: T('حالة المنشأة','Status'), opts: Object.entries(FAC_STATUS_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) })), r: 1 },
    { k: 'notes', l: T('ملاحظات','Notes'), w: 1 },
  ]
  const openAdd = () => { const init = {}; fFields.forEach(f => init[f.k] = ''); init.facility_status = 'active'; init.cr_status = 'active'; init.type = 'establishment'; setForm(init); setPop('facility') }
  const openEdit = (r) => { const init = { _id: r.id }; fFields.forEach(f => init[f.k] = r[f.k] != null ? String(r[f.k]) : ''); setForm(init); setPop('facility') }

  /* ─── Detail ─── */
  if (detail) {
    return (
      <FacilityDetailPage
        facility={detail}
        sb={sb}
        toast={toast}
        T={T}
        isAr={isAr}
        onBack={() => setDetail(null)}
        onEdit={() => { openEdit(detail); setDetail(null) }}
        onDelete={() => { del('facilities', detail.id); setDetail(null) }}
        bundle={{
          branches, regions, cities, all: data,
          subs: subs.filter(s => s.facility_id === detail.id),
          creds: creds.filter(c => c.facility_id === detail.id),
          visas: visas.filter(v => v.facility_id === detail.id),
          weekly: weeklyStats.filter(w => w.facility_id === detail.id),
        }}
      />
    )
  }

  /* ═══════════════ List view ═══════════════ */
  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('المنشآت','Facilities')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('إدارة بيانات المنشآت والسجلات التجارية والامتثال','Manage facilities, commercial registrations and compliance')}</div>
        </div>
        <button onClick={openAdd} style={btnGold}>+ {T('إضافة منشأة','Add Facility')}</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — Total */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
          border: '1px solid rgba(255,255,255,.05)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.gold, boxShadow: `0 0 10px ${C.gold}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي المنشآت','Total Facilities')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.blue, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue }} /> {num(stats.totalWorkers)} {T('عامل','workers')}
            </span>
            <span style={{ fontSize: 11, color: C.cyan, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.cyan }} /> {num(stats.totalVisas)} {T('تأشيرة','visas')}
            </span>
            {stats.issue > 0 && (
              <span style={{ fontSize: 11, color: C.red, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} /> {num(stats.issue)} {T('مشاكل','issues')}
              </span>
            )}
          </div>
        </div>

        {/* CR status */}
        {(() => {
          const tot = Math.max(1, stats.total)
          const segs = [
            { k: 'active', l: T('نشط','Active'), v: stats.crActive, c: C.ok },
            { k: 'pending_confirmation', l: T('تأكيد','Pending'), v: stats.crPending, c: C.gold },
            { k: 'suspended', l: T('معلّق','Suspended'), v: stats.crSuspended, c: C.orange },
            { k: 'cancelled', l: T('مشطوب','Deleted'), v: stats.crDeleted, c: C.red },
          ]
          return (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('حالة السجل التجاري','CR Status')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{Math.round(stats.crActive / tot * 100)}%</span> {T('نشطة','active')}
                </span>
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                {segs.filter(s => s.v > 0).map(s => (
                  <div key={s.k} title={`${s.l}: ${s.v}`} style={{ width: (s.v / tot * 100) + '%', background: s.c, transition: 'width .3s' }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                {segs.map(s => (
                  <button key={s.k} onClick={() => { setCrStatusFilter(crStatusFilter === s.k ? '' : s.k); setPage(0) }} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.45 : 1, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F, textAlign: 'right' }}>
                    <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 20, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(s.v)}</span>
                    <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.l}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Legal form */}
        {(() => {
          const tot = Math.max(1, stats.total)
          const segs = [
            { l: T('مؤسسة فردية','Sole Est.'), v: stats.sole, c: C.purple },
            { l: T('ذ.م.م شخص','LLC One'), v: stats.llcOne, c: C.cyan },
            { l: T('ذ.م.م شركاء','LLC Multi'), v: stats.llcMulti, c: C.blue },
            { l: T('أخرى','Other'), v: stats.otherForm, c: C.gray },
          ]
          return (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
              border: '1px solid rgba(255,255,255,.05)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
              padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الشكل القانوني','Legal Form')}</span>
                {stats.exempt > 0 && (
                  <span style={{ fontSize: 11, color: C.gold, fontWeight: 700, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    {num(stats.exempt)} {T('معفاة','exempt')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                {segs.filter(s => s.v > 0).map((s, i) => (
                  <div key={i} title={`${s.l}: ${s.v}`} style={{ width: (s.v / tot * 100) + '%', background: s.c, transition: 'width .3s' }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                {segs.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.45 : 1 }}>
                    <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 20, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(s.v)}</span>
                    <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder={T('ابحث بالاسم/السجل/الرقم الموحد…','Search by name/CR/Unified…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(crStatusFilter || nitaqatFilter || legalFormFilter || regionFilter)
          const clearAll = () => { setCrStatusFilter(''); setNitaqatFilter(''); setLegalFormFilter(''); setRegionFilter(''); setPage(0) }
          return (
            <button onClick={() => setAdvOpen(o => !o)} style={btnFilter(advOpen || hasFilters)}>
              {T('تصفية','Filter')}
              {hasFilters ? (
                <span
                  role="button" tabIndex={0}
                  title={T('مسح الفلاتر','Clear filters')}
                  onClick={e => { e.stopPropagation(); clearAll() }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); clearAll() } }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
                  style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
              )}
            </button>
          )
        })()}
      </div>

      {/* Advanced filter panel */}
      {advOpen && (() => {
        const fLbl = { fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }
        return (
          <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <div>
                <div style={fLbl}>{T('حالة السجل','CR Status')}</div>
                <Sel value={crStatusFilter} onChange={v => { setCrStatusFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...Object.entries(CR_STATUS_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('لون النطاق','Nitaqat')}</div>
                <Sel value={nitaqatFilter} onChange={v => { setNitaqatFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...Object.entries(NITAQAT_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('الشكل القانوني','Legal Form')}</div>
                <Sel value={legalFormFilter} onChange={v => { setLegalFormFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...['sole_proprietorship','limited_liability','limited_partnership','general_partnership','joint_stock','simplified_joint_stock'].map(v => ({ v, l: T(VAL_AR[v], v) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('المنطقة','Region')}</div>
                <Sel value={regionFilter} onChange={v => { setRegionFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...regions.map(r => ({ v: r.id, l: r.name_ar }))]} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{num(filtered.length)} {T('منشأة','facilities')}</span>
        {filtered.length !== data.length && <span style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('من أصل','out of')} {num(data.length)}</span>}
      </div>

      {/* Cards */}
      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {T('لا توجد منشآت','No facilities')}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 12 }}>
          {paged.map(r => {
            const nit = NITAQAT_THEME[r.nitaqat_color] || { c: C.gray, label_ar: '—', label_en: '—' }
            const cr = CR_STATUS_THEME[r.cr_status]
            const facStatus = FAC_STATUS_THEME[r.facility_status] || FAC_STATUS_THEME.active
            const dLeft = r.cr_expiry_date ? Math.ceil((new Date(r.cr_expiry_date) - new Date()) / 86400000) : null
            const expiryClr = dLeft === null ? C.gray : dLeft < 0 ? C.red : dLeft <= 30 ? C.gold : dLeft <= 90 ? C.orange : C.ok
            const expPct = dLeft === null ? 0 : dLeft < 0 ? 100 : Math.max(2, Math.min(100, Math.round(((365 - Math.min(365, dLeft)) / 365) * 100)))
            const saudPct = r.saudization_percentage != null ? Math.round(Number(r.saudization_percentage)) : null

            return (
              <div key={r.id} onClick={() => setDetail(r)}
                style={{
                  position: 'relative', cursor: 'pointer',
                  borderRadius: 14,
                  background: 'radial-gradient(ellipse at top, rgba(212,160,23,.06) 0%, #222 60%)',
                  border: '1px solid rgba(255,255,255,.05)',
                  boxShadow: '0 4px 14px rgba(0,0,0,.22)',
                  transition: 'all .15s', overflow: 'hidden',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = nit.c + '55' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}
              >
                <div style={{ padding: '16px 22px 14px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 130px', gap: 18, alignItems: 'center' }}>
                    {/* Right: identity */}
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span title={T(nit.label_ar, nit.label_en)} style={{ width: 16, height: 16, borderRadius: '50%', background: nit.c + '22', border: '1.5px solid ' + nit.c + '55', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px ' + nit.c + '40', flexShrink: 0 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: nit.c }} />
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>{r.name_ar || r.name_en || '—'}</span>
                        {r.is_original_exempt && (
                          <span title={T('معفاة','Exempt')} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 5, background: 'rgba(212,160,23,.14)', color: C.gold }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        {r.unified_national_number && (
                          <span title={T('الرقم الموحد','Unified No')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>
                            <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{r.unified_national_number}</span>
                            <CopyBtn value={r.unified_national_number} toast={toast} T={T} />
                          </span>
                        )}
                        {r.cr_number && (
                          <span title={T('رقم السجل','CR No')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, direction: 'ltr' }}>
                            <span style={{ color: 'var(--tx5)' }}>CR</span>
                            <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{r.cr_number}</span>
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {cr && <Badge theme={cr} T={T} />}
                        <Badge theme={facStatus} T={T} />
                        {r.type && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 6, background: 'rgba(93,173,226,.12)', border: '1px solid rgba(93,173,226,.28)', color: C.blue, fontSize: 10.5, fontWeight: 700 }}>
                            {T(VAL_AR[r.type] || r.type, r.type)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />

                    {/* Left: workers + visas */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('العمال','Workers')}</span>
                        {saudPct !== null && (
                          <span style={{ fontSize: 10, color: saudPct < 20 ? C.red : C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{saudPct}%</span>
                        )}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1, textAlign: 'center' }}>{num(r.total_workers || 0)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, paddingTop: 4, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                        <span style={{ color: 'var(--tx4)', fontWeight: 600 }}>{T('تأشيرات','Visas')}</span>
                        <span style={{ color: C.cyan, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(r.max_visas || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: branch + CR expiry hint */}
                  {(r.cr_expiry_date || r.branch_id) && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {r.branch_id && (
                        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>
                          {(branches.find(b => b.id === r.branch_id)?.name_ar) || '—'}
                        </span>
                      )}
                      {r.cr_expiry_date && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: expiryClr, display: 'inline-flex', alignItems: 'center', gap: 5, direction: 'ltr' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          {dLeft === null ? '—' : dLeft < 0 ? T('منتهي','Expired') : dLeft + ' ' + T('يوم','d')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom progress strip — CR expiry */}
                <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
                  <div style={{ height: '100%', width: `${expPct}%`, background: expiryClr, transition: 'width .3s' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && filtered.length > PAGE && (() => {
        const goPrev = () => setPage(p => Math.max(0, p - 1))
        const goNext = () => setPage(p => p + 1)
        const goTo = n => setPage(Math.max(0, Math.min(totalPages - 1, n)))
        const fromN = page * PAGE + 1
        const toN = Math.min(filtered.length, (page + 1) * PAGE)
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 4px', borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 18 }}>
            <style>{`
              .fc-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
              .fc-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
              .fc-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
              .fc-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
              .fc-pg-input::-webkit-outer-spin-button,.fc-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(filtered.length)}</span>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{T('صفحة','Page')} {page + 1} {T('من','of')} {totalPages}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button className="fc-pg-btn" disabled={page === 0} onClick={goPrev} aria-label={T('السابق','Prev')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <input className="fc-pg-input" type="number" min={1} max={totalPages} value={page + 1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v - 1) }} />
              <button className="fc-pg-btn" disabled={page + 1 >= totalPages} onClick={goNext} aria-label={T('التالي','Next')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            </div>
          </div>
        )
      })()}

      {/* Edit form modal */}
      {pop === 'facility' && <FormPopup title={form._id ? T('تعديل منشأة','Edit Facility') : T('إضافة منشأة','Add Facility')} fields={fFields} form={form} setForm={setForm} onSave={() => saveG('facilities', form)} onClose={() => setPop(null)} saving={saving} T={T} lang={lang} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Facility Detail Page (full page replacing the modal)
   ═══════════════════════════════════════════════════════════════ */
function FacilityDetailPage({ facility, sb, toast, T, isAr, onBack, onEdit, onDelete, bundle }) {
  const r = facility
  const br = bundle.branches.find(b => b.id === r.branch_id)
  const region = bundle.regions.find(g => g.id === r.region_id)
  const city = bundle.cities.find(c => c.id === r.city_id)
  const parentFac = bundle.all.find(f => f.id === r.parent_facility_id)
  const nit = NITAQAT_THEME[r.nitaqat_color]
  const cr = CR_STATUS_THEME[r.cr_status]
  const facStatus = FAC_STATUS_THEME[r.facility_status] || FAC_STATUS_THEME.active

  const [facWorkers, setFacWorkers] = useState([])
  const [facInvoices, setFacInvoices] = useState([])
  const [facTransactions, setFacTransactions] = useState([])
  const [facMessages, setFacMessages] = useState([])
  const [facDocs, setFacDocs] = useState([])
  const [facWorkPermits, setFacWorkPermits] = useState([])
  const [facIqamas, setFacIqamas] = useState([])

  useEffect(() => {
    sb.from('workers').select('id,name_ar,worker_status,iqama_expiry_date,gender,nationality').eq('facility_id', r.id).is('deleted_at', null).then(({ data }) => setFacWorkers(data || []))
    sb.from('invoices').select('id,invoice_no,total_amount,paid_amount,created_at').eq('facility_id', r.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10).then(({ data }) => setFacInvoices(data || []))
    sb.from('transactions').select('id,amount,created_at').eq('facility_id', r.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(5).then(({ data }) => setFacTransactions(data || []))
    sb.from('communication_log').select('id,subject,created_at').eq('facility_id', r.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(5).then(({ data }) => setFacMessages(data || []))
    sb.from('documents').select('*').eq('facility_id', r.id).is('deleted_at', null).order('expiry_date').then(({ data }) => setFacDocs(data || []))
    sb.from('work_permits').select('*').eq('facility_id', r.id).is('deleted_at', null).limit(20).then(({ data }) => setFacWorkPermits(data || []))
    sb.from('iqama_cards').select('*').eq('facility_id', r.id).is('deleted_at', null).limit(20).then(({ data }) => setFacIqamas(data || []))
  }, [sb, r.id])

  const now = new Date()
  const dLeft = r.cr_expiry_date ? Math.ceil((new Date(r.cr_expiry_date) - now) / 86400000) : null
  const expiryClr = dLeft === null ? C.gray : dLeft < 0 ? C.red : dLeft <= 30 ? C.gold : dLeft <= 90 ? C.orange : C.ok
  const expPct = dLeft === null ? 0 : dLeft < 0 ? 100 : Math.max(2, Math.min(100, Math.round(((365 - Math.min(365, dLeft)) / 365) * 100)))

  const completionFields = ['name_ar','unified_national_number','cr_number','cr_issue_date','cr_expiry_date','type','legal_form','facility_status','capital','gosi_file_number','gosi_status','qiwa_file_number','vat_number','vat_status','zakat_unique_number','chamber_membership_no','mlsd_service_status','mudad_wps_compliance_status','nitaqat_color','total_workers','saudization_percentage','max_visas','region_id','city_id','address_ar','mobile','email']
  const filled = completionFields.filter(f => r[f] != null && r[f] !== '').length
  const completion = Math.round((filled / completionFields.length) * 100)
  const complClr = completion >= 90 ? C.ok : completion >= 60 ? C.gold : completion >= 30 ? C.orange : C.red

  const compliance = [
    { l: T('سجل تجاري','CR'), ok: r.cr_status === 'active' },
    { l: T('التأمينات','GOSI'), ok: r.gosi_status === 'active' },
    { l: T('قوى','Qiwa'), ok: !!r.qiwa_file_number },
    { l: T('ض.ق.م','VAT'), ok: r.vat_status === 'registered' },
    { l: T('خدمات العمل','Labor'), ok: r.mlsd_service_status === 'active' },
    { l: T('مدد','Mudad'), ok: r.mudad_wps_compliance_status === 'compliant' },
    { l: T('الغرفة','Chamber'), ok: !!r.chamber_membership_no },
    { l: T('سعودة','Saudi'), ok: r.saudization_percentage != null && Number(r.saudization_percentage) >= 20 },
  ]

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} title={T('رجوع','Back')} style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.45)'; e.currentTarget.style.color = C.gold }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'rgba(255,255,255,.78)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          <span>{T('رجوع','Back')}</span>
        </button>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          <button onClick={onEdit} style={btnGold}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            <span>{T('تعديل','Edit')}</span>
          </button>
          <button onClick={onDelete} title={T('حذف','Delete')} style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'rgba(232,114,101,.12)', border: '1px solid rgba(232,114,101,.32)', color: C.red, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: F, fontSize: 12, fontWeight: 700 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            <span>{T('حذف','Delete')}</span>
          </button>
        </div>
      </div>

      {/* Heading */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(180deg,rgba(212,160,23,.22) 0%,rgba(212,160,23,.10) 100%)', border: '1px solid rgba(212,160,23,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.2px' }}>{r.name_ar || r.name_en || T('منشأة','Facility')}</div>
          {nit && <Badge theme={nit} T={T} />}
          <Badge theme={facStatus} T={T} />
          {cr && <Badge theme={cr} T={T} />}
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)' }}>
          {r.name_en && <><span>{r.name_en}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} /></>}
          {r.unified_national_number && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
              <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700 }}>#{r.unified_national_number}</span>
              <CopyBtn value={r.unified_national_number} toast={toast} T={T} />
            </span>
          )}
          {r.cr_number && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                <span style={{ color: 'var(--tx5)', fontWeight: 600 }}>CR</span>
                <span style={{ color: 'var(--tx3)', fontFamily: 'monospace', fontWeight: 700 }}>{r.cr_number}</span>
                <CopyBtn value={r.cr_number} toast={toast} T={T} />
              </span>
            </>
          )}
          {br && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ color: C.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/></svg>
                {br.name_ar}
              </span>
            </>
          )}
          {r.is_original_exempt && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(212,160,23,.10)', border: '1px solid ' + C.gold, color: C.gold, fontSize: 10.5, fontWeight: 800, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {T('معفاة','Exempt')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Basic */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('البيانات الأساسية','Basic Information')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailRow label={T('النوع','Type')} value={VAL_AR[r.type] || r.type} />
              <DetailRow label={T('الشكل القانوني','Legal Form')} value={VAL_AR[r.legal_form] || r.legal_form} />
              <DetailRow label={T('عدد الشخصيات','Character Count')} value={VAL_AR[r.character_count] || r.character_count} />
              <DetailRow label={T('رأس المال','Capital')} value={r.capital ? num(r.capital) + ' ' + T('ر.س','SAR') : null} mono />
              <DetailRow label={T('المنشأة الأم','Parent Facility')} value={parentFac?.name_ar} />
              <DetailRow label={T('النشاط الاقتصادي','Economic Activity')} value={r.economic_activity_id} />
            </div>
          </div>

          {/* CR */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('السجل التجاري','Commercial Registration')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailRow label={T('الرقم الموحد','Unified No')} value={r.unified_national_number} mono toast={toast} T={T} />
              <DetailRow label={T('رقم السجل','CR No')} value={r.cr_number} mono toast={toast} T={T} />
              <DetailRow label={T('تاريخ الإصدار','Issue Date')} value={r.cr_issue_date} />
              <DetailRow label={T('تاريخ التصديق','Confirm Date')} value={r.cr_confirm_date} />
              <DetailRow label={T('تاريخ الانتهاء','Expiry Date')} value={r.cr_expiry_date} />
              <DetailRow label={T('سجل رئيسي','Main CR')} value={r.is_main_cr ? T('نعم','Yes') : T('لا','No')} />
              <DetailRow label={T('نسخة السجل','CR Version')} value={r.cr_version_no} />
              <DetailRow label={T('تاريخ الشطب','Delete Date')} value={r.cr_delete_date} />
            </div>
            {r.cr_activities && (
              <div style={{ padding: '0 22px 14px' }}>
                <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase', marginBottom: 6 }}>{T('أنشطة السجل','CR Activities')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx3)', lineHeight: 1.7 }}>{r.cr_activities}</div>
              </div>
            )}
          </div>

          {/* Files & Numbers */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} /><span style={cardTitle}>{T('الملفات والأرقام','Files & Numbers')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailRow label={T('ملف قوى','Qiwa File')} value={r.qiwa_file_number} mono toast={toast} T={T} />
              <DetailRow label={T('ملف التأمينات','GOSI File')} value={r.gosi_file_number} mono toast={toast} T={T} />
              <DetailRow label={T('رقم ض.ق.م','VAT No')} value={r.vat_number} mono toast={toast} T={T} />
              <DetailRow label={T('رقم الزكاة','Zakat No')} value={r.zakat_unique_number} mono toast={toast} T={T} />
              <DetailRow label={T('عضوية الغرفة','Chamber No')} value={r.chamber_membership_no} mono toast={toast} T={T} />
              <DetailRow label={T('انتهاء الغرفة','Chamber Expiry')} value={r.chamber_membership_expiry} />
              <DetailRow label={T('رقم سبل','Subl No')} value={r.subl_file_number} mono />
              <DetailRow label={T('حالة الضريبة','VAT Status')} value={VAL_AR[r.vat_status] || r.vat_status} />
              <DetailRow label={T('حالة التأمينات','GOSI Status')} value={VAL_AR[r.gosi_status] || r.gosi_status} />
              <DetailRow label={T('حالة خدمات العمل','Labor Status')} value={VAL_AR[r.mlsd_service_status] || r.mlsd_service_status} />
              <DetailRow label={T('حالة مدد','Mudad Status')} value={VAL_AR[r.mudad_wps_compliance_status] || r.mudad_wps_compliance_status} />
              <DetailRow label={T('نموذج التأمينات','GOSI Form')} value={r.gosi_form} />
            </div>
          </div>

          {/* Workforce */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.purple }} /><span style={cardTitle}>{T('النطاقات والعمالة','Nitaqat & Workforce')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailRow label={T('لون النطاق','Nitaqat Color')} value={nit ? T(nit.label_ar, nit.label_en) : null} />
              <DetailRow label={T('حجم النطاق','Nitaqat Size')} value={VAL_AR[r.nitaqat_size] || r.nitaqat_size} />
              <DetailRow label={T('إجمالي العمال','Total Workers')} value={r.total_workers ? num(r.total_workers) : null} mono />
              <DetailRow label={T('سعوديون','Saudi Workers')} value={r.saudi_workers ? num(r.saudi_workers) : null} mono />
              <DetailRow label={T('غير سعوديين','Non-Saudis')} value={r.non_saudi_workers ? num(r.non_saudi_workers) : null} mono />
              <DetailRow label={T('نسبة السعودة %','Saudization %')} value={r.saudization_percentage != null ? r.saudization_percentage + '%' : null} mono />
              <DetailRow label={T('الحد الأقصى للتأشيرات','Max Visas')} value={r.max_visas ? num(r.max_visas) : null} mono />
              <DetailRow label={T('الحد الأقصى للرخص','Max Permits')} value={r.max_work_permits ? num(r.max_work_permits) : null} mono />
            </div>
          </div>

          {/* Location */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.orange }} /><span style={cardTitle}>{T('الموقع والاتصال','Location & Contact')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailRow label={T('المنطقة','Region')} value={region?.name_ar} />
              <DetailRow label={T('المدينة','City')} value={city?.name_ar} />
              <DetailRow label={T('المكتب','Branch')} value={br?.name_ar} />
              <DetailRow label={T('العنوان المختصر','Short Address')} value={r.short_address} mono />
              <DetailRow label={T('الرمز البريدي','Postal Code')} value={r.postal_code} mono />
              <DetailRow label={T('الجوال','Phone')} value={r.mobile} mono toast={toast} T={T} />
              <DetailRow label={T('البريد','Email')} value={r.email} mono toast={toast} T={T} />
            </div>
            {r.address_ar && (
              <div style={{ padding: '0 22px 14px' }}>
                <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase', marginBottom: 6 }}>{T('العنوان','Address')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--tx3)', lineHeight: 1.7 }}>{r.address_ar}</div>
              </div>
            )}
          </div>

          {/* Subscriptions */}
          {bundle.subs.length > 0 && (
            <DetailListCard title={T('الاشتراكات','Subscriptions')} color={C.gold} count={bundle.subs.length}>
              <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bundle.subs.map(s => (
                  <DetailListRow key={s.id}
                    primary={s.subscription_type || s.platform_name || T('اشتراك','Subscription')}
                    cells={[
                      { l: T('البداية','Start'), v: s.start_date },
                      { l: T('النهاية','End'), v: s.end_date, expiry: true },
                      { l: T('الحالة','Status'), v: VAL_AR[s.subscription_status] || s.subscription_status },
                    ]}
                  />
                ))}
              </div>
            </DetailListCard>
          )}

          {/* Recent invoices */}
          {facInvoices.length > 0 && (
            <DetailListCard title={T('أحدث الفواتير','Recent Invoices')} color={C.gold} count={facInvoices.length}>
              <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {facInvoices.map(inv => (
                  <DetailListRow key={inv.id}
                    primary={'#' + (inv.invoice_no || '—')}
                    mono
                    cells={[
                      { l: T('الإجمالي','Total'), v: num(inv.total_amount || 0) },
                      { l: T('المدفوع','Paid'), v: num(inv.paid_amount || 0) },
                      { l: T('التاريخ','Date'), v: (inv.created_at || '').slice(0, 10) },
                    ]}
                  />
                ))}
              </div>
            </DetailListCard>
          )}

          {/* Workers list */}
          {facWorkers.length > 0 && (
            <DetailListCard title={T('العمّال','Workers')} color={C.blue} count={facWorkers.length}>
              <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {facWorkers.slice(0, 8).map(w => {
                  const wDays = w.iqama_expiry_date ? Math.ceil((new Date(w.iqama_expiry_date) - now) / 86400000) : null
                  const wClr = wDays === null ? C.gray : wDays < 0 ? C.red : wDays <= 30 ? C.gold : wDays <= 90 ? C.orange : C.ok
                  return (
                    <div key={w.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(180deg,#252525 0%,#1f1f1f 100%)', border: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{w.name_ar || '—'}</span>
                      {w.nationality && <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{w.nationality}</span>}
                      <span style={{ fontSize: 11, color: wClr, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: wClr }} />
                        {wDays === null ? '—' : wDays < 0 ? T('منتهية','Expired') : wDays + 'd'}
                      </span>
                    </div>
                  )
                })}
                {facWorkers.length > 8 && (
                  <div style={{ padding: '8px', textAlign: 'center', fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>{T('و','and')} {num(facWorkers.length - 8)} {T('آخرين','more')}</div>
                )}
              </div>
            </DetailListCard>
          )}

          {/* Notes */}
          {r.notes && (
            <div style={cardChrome}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gray }} /><span style={cardTitle}>{T('ملاحظات','Notes')}</span></div>
              <div style={{ padding: '14px 22px', fontSize: 13, color: 'var(--tx3)', lineHeight: 1.8 }}>{r.notes}</div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* CR expiry */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: expiryClr }} /><span style={cardTitle}>{T('انتهاء السجل','CR Expiry')}</span></div>
            <div style={{ padding: '20px 22px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6 }}>{dLeft === null ? T('غير محدد','Not set') : dLeft < 0 ? T('متأخر','Overdue') : T('متبقي','Remaining')}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: expiryClr, fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-1px', lineHeight: 1 }}>
                {dLeft === null ? '—' : Math.abs(dLeft)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginTop: 4 }}>{dLeft === null ? '' : T('يوم','days')}</div>
              <div style={{ marginTop: 14, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: expPct + '%', background: expiryClr, transition: 'width .3s' }} />
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{r.cr_expiry_date || '—'}</div>
            </div>
          </div>

          {/* Completion */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: complClr }} /><span style={cardTitle}>{T('اكتمال الملف','File Completion')}</span></div>
            <div style={{ padding: '18px 22px 14px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <svg width="68" height="68" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke={complClr} strokeWidth="3" strokeLinecap="round" strokeDasharray={2 * Math.PI * 14} strokeDashoffset={2 * Math.PI * 14 * (1 - completion / 100)} />
              </svg>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: complClr, lineHeight: 1, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{completion}%</div>
                <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, marginTop: 4 }}>{filled} / {completionFields.length} {T('حقل','fields')}</div>
              </div>
            </div>
          </div>

          {/* Compliance grid */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('الالتزام','Compliance')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {compliance.map(s => (
                <div key={s.l} style={{ padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}>{s.l}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: s.ok ? C.ok : C.gray, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.ok ? C.ok : C.gray, boxShadow: s.ok ? '0 0 6px ' + C.ok : 'none' }} />
                    {s.ok ? T('ساري','OK') : T('—','—')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} /><span style={cardTitle}>{T('السجلات','Records')}</span></div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                [T('عمّال','Workers'), facWorkers.length],
                [T('فواتير','Invoices'), facInvoices.length],
                [T('معاملات','Transactions'), facTransactions.length],
                [T('رخص عمل','Permits'), facWorkPermits.length],
                [T('إقامات','Iqama Cards'), facIqamas.length],
                [T('وثائق','Documents'), facDocs.length],
                [T('اشتراكات','Subscriptions'), bundle.subs.length],
                [T('تأشيرات','Visas'), bundle.visas.length],
                [T('رسائل','Messages'), facMessages.length],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--tx4)' }}>{l}</span>
                  <span style={{ color: v > 0 ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Detail helpers ─── */
const DetailRow = ({ label, value, mono, toast, T }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', minHeight: 28, gap: 8 }}>
    <span style={{ fontSize: 11.5, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: value ? 'var(--tx2)' : 'var(--tx5)', fontWeight: 600, direction: mono ? 'ltr' : undefined, fontFamily: mono ? 'monospace' : F, fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>
      {value || '—'}
      {value && mono && toast && <CopyBtn value={value} toast={toast} T={T} />}
    </span>
  </div>
)

const DetailListCard = ({ title, color, count, children }) => (
  <div style={cardChrome}>
    <div style={cardHeader}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
      <span style={cardTitle}>{title}</span>
      {count != null && <span style={{ marginInlineStart: 'auto', fontSize: 11, color: count > 0 ? color : 'var(--tx5)', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: count > 0 ? color + '14' : 'rgba(255,255,255,.04)' }}>{num(count)}</span>}
    </div>
    {children}
  </div>
)

const DetailListRow = ({ primary, mono, cells }) => {
  const now = new Date()
  const valid = (cells || []).filter(c => c.v != null && c.v !== '')
  return (
    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(180deg,#252525 0%,#1f1f1f 100%)', border: '1px solid rgba(255,255,255,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: valid.length ? 6 : 0, gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', direction: mono ? 'ltr' : undefined, fontFamily: mono ? 'monospace' : F, fontVariantNumeric: mono ? 'tabular-nums' : undefined }}>{primary || '—'}</span>
      </div>
      {valid.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, valid.length)}, 1fr)`, gap: 6 }}>
          {valid.map((c, i) => {
            const isExpired = c.expiry && c.v && (new Date(c.v) < now)
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx5)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{c.l}</span>
                <span style={{ fontSize: 11.5, color: isExpired ? C.red : 'var(--tx2)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{c.v}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Form popup
   ═══════════════════════════════════════════════════════════════ */
function FormPopup({ title, fields, form, setForm, onSave, onClose, saving, T, lang }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, fontFamily: F }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 720, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: 16,
        background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)',
        border: '1px solid rgba(255,255,255,.06)',
        boxShadow: '0 24px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)',
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${C.gold} 30%,${C.goldSoft} 50%,${C.gold} 70%,transparent)` }} />
        <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.93)' }}>{title}</div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {fields.map(f => <FormField key={f.k} f={f} form={form} setForm={setForm} T={T} lang={lang} />)}
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ height: 42, padding: '0 18px', borderRadius: 11, border: '1px solid rgba(255,255,255,.06)', background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', color: 'rgba(255,255,255,.78)', fontFamily: F, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{T('إلغاء','Cancel')}</button>
          <button onClick={onSave} disabled={saving} style={{ ...btnGold, height: 42, padding: '0 22px', opacity: saving ? .6 : 1 }}>{saving ? '...' : (form._id ? T('حفظ','Save') : T('إضافة','Add'))}</button>
        </div>
      </div>
    </div>
  )
}

function FormField({ f, form, setForm, T, lang }) {
  const v = form[f.k] || ''
  const set = val => setForm(p => ({ ...p, [f.k]: val }))
  const fS = { width: '100%', height: 42, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,.07)', background: 'linear-gradient(180deg,#323232 0%,#262626 100%)', color: 'var(--tx)', fontFamily: F, fontSize: 13, fontWeight: 500, outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)', boxSizing: 'border-box' }
  return (
    <div style={{ gridColumn: f.w ? '1 / -1' : undefined }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{f.l}{f.r && <span style={{ color: C.red }}> *</span>}</div>
      {f.opts ? (
        <Sel value={v} onChange={set} placeholder={T('— اختر —','— Select —')} options={f.opts} />
      ) : f.t === 'date' ? (
        <DateField value={v} onChange={set} lang={lang} />
      ) : f.w ? (
        <textarea value={v} onChange={e => set(e.target.value)} rows={3} style={{ ...fS, height: 'auto', padding: 12, resize: 'vertical' }} />
      ) : (
        <input value={v} onChange={e => set(e.target.value)} style={{ ...fS, direction: f.d ? 'ltr' : 'rtl', textAlign: f.d ? 'left' : 'right' }} />
      )}
    </div>
  )
}
