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
const STATUS_THEME = {
  active:      { c: C.ok,     label_ar: 'نشط',          label_en: 'Active' },
  absconded:   { c: C.red,    label_ar: 'هارب',         label_en: 'Absconded' },
  final_exit:  { c: C.gray,   label_ar: 'خروج نهائي',   label_en: 'Final Exit' },
  transferred: { c: C.orange, label_ar: 'منقول',        label_en: 'Transferred' },
  suspended:   { c: C.warn,   label_ar: 'معلّق',        label_en: 'Suspended' },
}
const JOIN_THEME = {
  recruitment: { c: C.blue,   label_ar: 'استقدام',     label_en: 'Recruitment' },
  transfer:    { c: C.purple, label_ar: 'نقل كفالة',   label_en: 'Transfer' },
}
const VAL_AR = {
  male:'ذكر', female:'أنثى', single:'أعزب', married:'متزوج', divorced:'مطلق', widowed:'أرمل',
  citizen:'مواطن', resident:'مقيم', basic:'أساسي', skilled:'ماهر', highly_skilled:'عالي المهارة',
  registered:'مسجّل', not_registered:'غير مسجّل', true:'نعم', false:'لا',
  active:'نشط', absconded:'هارب', suspended:'معلّق', final_exit:'خروج نهائي', transferred:'منقول',
  recruitment:'استقدام', transfer:'نقل كفالة',
}
const NAT_CODES = {
  'أردني':'JO','أفغاني':'AF','أوغندي':'UG','إثيوبي':'ET','إندونيسي':'ID','باكستاني':'PK','بنغلاديشي':'BD',
  'تركي':'TR','تونسي':'TN','سريلانكي':'LK','سعودي':'SA','سعودية':'SA','سوداني':'SD','سوري':'SY',
  'فلبيني':'PH','كيني':'KE','مصري':'EG','مغربي':'MA','ميانمار':'MM','نيبالي':'NP','هندي':'IN','يمني':'YE',
}

/* ─── Tiny bits ─── */
const StatusBadge = ({ status, T }) => {
  const t = STATUS_THEME[status] || { c: C.gray, label_ar: status || '—', label_en: status || '—' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: t.c + '18', border: '1px solid ' + t.c + '38', color: t.c, fontSize: 10.5, fontWeight: 700 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.c, boxShadow: '0 0 5px ' + t.c }} />
      {T(t.label_ar, t.label_en)}
    </span>
  )
}

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

const NatFlag = ({ nationality, size = 22 }) => {
  const cc = NAT_CODES[nationality]
  if (!cc) return null
  return <img src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`} alt={nationality} title={nationality} style={{ width: size, height: Math.round(size * .72), objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
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

/* ═══════════════════════════════════════════════════════════════ */
export default function WorkforcePage({ sb, toast, user, lang, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [workers, setWorkers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [brokers, setBrokers] = useState([])
  const [branches, setBranches] = useState([])
  const [permits, setPermits] = useState([])
  const [iqamas, setIqamas] = useState([])
  const [insurance, setInsurance] = useState([])
  const [passports, setPassports] = useState([])
  const [licenses, setLicenses] = useState([])
  const [dependents, setDependents] = useState([])
  const [contracts, setContracts] = useState([])
  const [salaryHistory, setSalaryHistory] = useState([])
  const [visas, setVisas] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [timeline, setTimeline] = useState([])
  const [transferReqs, setTransferReqs] = useState([])
  const [gosiSubs, setGosiSubs] = useState([])
  const [attFiles, setAttFiles] = useState([])
  const [occMap, setOccMap] = useState({})

  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [nationalityFilter, setNationalityFilter] = useState('')
  const [facilityFilter, setFacilityFilter] = useState('')
  const [joiningFilter, setJoiningFilter] = useState('')
  const [iqamaFilter, setIqamaFilter] = useState('') // expired | 30d | 90d | valid
  const [genderFilter, setGenderFilter] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)

  // Edit form modal
  const [pop, setPop] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { onTabChange && onTabChange({ tab: 'workers' }) }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [w, f, b, br] = await Promise.all([
      sb.from('workers').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      sb.from('facilities').select('id,name_ar,unified_national_number').is('deleted_at', null),
      sb.from('brokers').select('id,name_ar').is('deleted_at', null),
      sb.from('branches').select('id,name_ar').is('deleted_at', null),
    ])
    setWorkers(w.data || []); setFacilities(f.data || []); setBrokers(b.data || []); setBranches(br.data || [])
    setLoading(false)

    Promise.all([
      sb.from('work_permits').select('*').is('deleted_at', null).order('wp_expiry_date', { ascending: false }),
      sb.from('iqama_cards').select('*').is('deleted_at', null).order('iqama_expiry_date', { ascending: false }),
      sb.from('worker_insurance').select('*').is('deleted_at', null).order('end_date', { ascending: false }),
      sb.from('worker_passports').select('*').order('expiry_date', { ascending: false }),
      sb.from('worker_licenses').select('*').order('expiry_date', { ascending: false }),
      sb.from('worker_dependents').select('*').order('created_at', { ascending: false }),
      sb.from('contracts').select('*').order('start_date', { ascending: false }),
      sb.from('worker_salary_history').select('*').order('change_date', { ascending: false }),
      sb.from('worker_visas').select('*').order('created_at', { ascending: false }),
      sb.from('worker_vehicles').select('*').order('created_at', { ascending: false }),
      sb.from('worker_timeline').select('*').order('event_date', { ascending: false }),
      sb.from('transfer_requests').select('*').order('created_at', { ascending: false }),
      sb.from('gosi_subscriptions').select('*').order('created_at', { ascending: false }),
      sb.from('attachments').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
    ]).then(([wp, iq, ins, pp, lic, dep, ctr, sh, vi, vh, tl, treq, gs, att]) => {
      setPermits(wp.data || []); setIqamas(iq.data || []); setInsurance(ins.data || [])
      setPassports(pp.data || []); setLicenses(lic.data || []); setDependents(dep.data || [])
      setContracts(ctr.data || []); setSalaryHistory(sh.data || []); setVisas(vi.data || [])
      setVehicles(vh.data || []); setTimeline(tl.data || []); setTransferReqs(treq.data || [])
      setGosiSubs(gs.data || []); setAttFiles(att.data || [])
    })
  }, [sb])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!sb || !workers.length) return
    const ids = [...new Set(workers.map(w => w.occupation_id).filter(Boolean))]
    if (!ids.length) return
    sb.from('lookup_items').select('id,value_ar').in('id', ids).then(({ data }) => {
      const m = {}; (data || []).forEach(r => m[r.id] = r.value_ar); setOccMap(m)
    })
  }, [sb, workers])

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
  const now = new Date()
  const stats = useMemo(() => {
    const total = workers.length
    const active = workers.filter(r => r.worker_status === 'active').length
    const absconded = workers.filter(r => r.worker_status === 'absconded').length
    const finalExit = workers.filter(r => r.worker_status === 'final_exit').length
    const suspended = workers.filter(r => r.worker_status === 'suspended').length
    const recruit = workers.filter(r => r.joining_method === 'recruitment').length
    const transfer = workers.filter(r => r.joining_method === 'transfer').length
    const expired = workers.filter(r => r.iqama_expiry_date && new Date(r.iqama_expiry_date) < now).length
    const exp30 = workers.filter(r => { if (!r.iqama_expiry_date) return false; const d = Math.ceil((new Date(r.iqama_expiry_date) - now) / 86400000); return d >= 0 && d <= 30 }).length
    const exp90 = workers.filter(r => { if (!r.iqama_expiry_date) return false; const d = Math.ceil((new Date(r.iqama_expiry_date) - now) / 86400000); return d > 30 && d <= 90 }).length
    const valid = workers.filter(r => { if (!r.iqama_expiry_date) return false; const d = Math.ceil((new Date(r.iqama_expiry_date) - now) / 86400000); return d > 90 }).length
    return { total, active, absconded, finalExit, suspended, recruit, transfer, expired, exp30, exp90, valid }
  }, [workers])

  const natList = useMemo(() => [...new Set(workers.map(w => w.nationality).filter(Boolean))].sort(), [workers])

  /* ─── Filtered list ─── */
  const filtered = useMemo(() => {
    return workers.filter(r => {
      if (statusFilter && r.worker_status !== statusFilter) return false
      if (nationalityFilter && r.nationality !== nationalityFilter) return false
      if (facilityFilter && r.facility_id !== facilityFilter) return false
      if (joiningFilter && r.joining_method !== joiningFilter) return false
      if (genderFilter && r.gender !== genderFilter) return false
      if (iqamaFilter) {
        const d = r.iqama_expiry_date ? Math.ceil((new Date(r.iqama_expiry_date) - now) / 86400000) : null
        if (iqamaFilter === 'expired' && !(d != null && d < 0)) return false
        if (iqamaFilter === '30d' && !(d != null && d >= 0 && d <= 30)) return false
        if (iqamaFilter === '90d' && !(d != null && d > 30 && d <= 90)) return false
        if (iqamaFilter === 'valid' && !(d != null && d > 90)) return false
      }
      if (q.trim()) {
        const s = q.toLowerCase()
        if (!((r.name_ar || '').includes(s) || (r.name_en || '').toLowerCase().includes(s) || (r.iqama_number || '').includes(s) || (r.worker_number || '').includes(s) || (r.phone || '').includes(s) || (r.passport_number || '').toLowerCase().includes(s) || (r.border_number || '').includes(s))) return false
      }
      return true
    })
  }, [workers, statusFilter, nationalityFilter, facilityFilter, joiningFilter, genderFilter, iqamaFilter, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE)

  /* ─── Edit form fields ─── */
  const wFields = [
    { k: 'worker_number', l: T('رقم العامل','Worker No'), d: 1 },
    { k: 'name_ar', l: T('الاسم بالعربي','Name (AR)'), r: 1 },
    { k: 'name_en', l: T('الاسم بالإنجليزي','Name (EN)'), d: 1 },
    { k: 'gender', l: T('الجنس','Gender'), opts: [{ v: 'male', l: T('ذكر','Male') }, { v: 'female', l: T('أنثى','Female') }] },
    { k: 'nationality', l: T('الجنسية','Nationality') },
    { k: 'phone', l: T('الجوال','Phone'), d: 1 },
    { k: 'iqama_number', l: T('رقم الإقامة','Iqama No'), d: 1, r: 1 },
    { k: 'border_number', l: T('رقم الحدود','Border No'), d: 1 },
    { k: 'passport_number', l: T('رقم الجواز','Passport'), d: 1 },
    { k: 'passport_expiry', l: T('انتهاء الجواز','Passport Expiry'), t: 'date' },
    { k: 'facility_id', l: T('المنشأة','Facility'), opts: facilities.map(f => ({ v: f.id, l: f.name_ar })) },
    { k: 'broker_id', l: T('الوسيط','Broker'), opts: brokers.map(b => ({ v: b.id, l: b.name_ar })) },
    { k: 'birth_date_g', l: T('تاريخ الميلاد','Birth Date'), t: 'date' },
    { k: 'gosi_salary', l: T('راتب التأمينات','GOSI Salary'), d: 1 },
    { k: 'qiwa_salary', l: T('راتب قوى','Qiwa Salary'), d: 1 },
    { k: 'worker_status', l: T('الحالة','Status'), opts: Object.entries(STATUS_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) })), r: 1 },
    { k: 'identity_type', l: T('نوع الهوية','ID Type'), opts: [{ v: 'citizen', l: T('مواطن','Citizen') }, { v: 'resident', l: T('مقيم','Resident') }] },
    { k: 'marital_status', l: T('الحالة الاجتماعية','Marital'), opts: ['single','married','divorced','widowed'].map(v => ({ v, l: T(VAL_AR[v], v) })) },
    { k: 'joining_method', l: T('طريقة الانضمام','Joining'), opts: Object.entries(JOIN_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) })) },
    { k: 'iqama_expiry_date', l: T('انتهاء الإقامة','Iqama Expiry'), t: 'date' },
    { k: 'entry_port', l: T('منفذ الدخول','Entry Port') },
    { k: 'dependents_count', l: T('عدد المرافقين','Dependents'), d: 1 },
    { k: 'notes', l: T('ملاحظات','Notes'), w: 1 },
  ]
  const openAdd = () => { const init = {}; wFields.forEach(f => init[f.k] = ''); init.worker_status = 'active'; init.gender = 'male'; setForm(init); setPop('worker') }
  const openEdit = (r) => { const init = { _id: r.id }; wFields.forEach(f => init[f.k] = r[f.k] ?? ''); setForm(init); setPop('worker') }

  /* ─── Detail page ─── */
  if (detail) {
    return (
      <WorkerDetailPage
        worker={detail}
        sb={sb}
        toast={toast}
        T={T}
        isAr={isAr}
        onBack={() => setDetail(null)}
        onEdit={() => { openEdit(detail); setDetail(null) }}
        onDelete={() => { del('workers', detail.id); setDetail(null) }}
        bundle={{
          facilities, brokers, branches, occMap,
          permits: permits.filter(p => p.worker_id === detail.id),
          iqamas: iqamas.filter(p => p.worker_id === detail.id),
          insurance: insurance.filter(p => p.worker_id === detail.id),
          passports: passports.filter(p => p.worker_id === detail.id),
          licenses: licenses.filter(p => p.worker_id === detail.id),
          dependents: dependents.filter(p => p.worker_id === detail.id),
          contracts: contracts.filter(p => p.worker_id === detail.id),
          salaryHistory: salaryHistory.filter(p => p.worker_id === detail.id),
          visas: visas.filter(p => p.worker_id === detail.id),
          vehicles: vehicles.filter(p => p.worker_id === detail.id),
          timeline: timeline.filter(p => p.worker_id === detail.id),
          transferReqs: transferReqs.filter(p => p.worker_id === detail.id),
          gosiSubs: gosiSubs.filter(p => p.worker_id === detail.id),
          attFiles: attFiles.filter(a => a.entity_type === 'worker' && a.entity_id === detail.id),
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
          <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>{T('العمالة','Workforce')}</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>{T('إدارة بيانات العمّال والوثائق والعقود والتنقلات','Manage worker records, documents, contracts and transfers')}</div>
        </div>
        <button onClick={openAdd} style={btnGold}>+ {T('إضافة عامل','Add Worker')}</button>
      </div>

      {/* Stats — Hero + Iqama health + Joining method */}
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
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T('إجمالي العمّال','Total Workers')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.gold, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.ok }} /> {num(stats.active)} {T('نشط','active')}
            </span>
            {stats.absconded > 0 && (
              <span style={{ fontSize: 11, color: C.red, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} /> {num(stats.absconded)} {T('هارب','absconded')}
              </span>
            )}
            {stats.finalExit > 0 && (
              <span style={{ fontSize: 11, color: C.gray, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gray }} /> {num(stats.finalExit)} {T('خروج','exit')}
              </span>
            )}
          </div>
        </div>

        {/* Iqama health */}
        {(() => {
          const tot = Math.max(1, stats.total)
          const segs = [
            { l: T('سارية','Valid'), v: stats.valid, c: C.ok },
            { l: T('≤ 90 يوم','≤90d'), v: stats.exp90, c: C.orange },
            { l: T('≤ 30 يوم','≤30d'), v: stats.exp30, c: C.gold },
            { l: T('منتهية','Expired'), v: stats.expired, c: C.red },
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
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('صحة الإقامات','Iqama Health')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600 }}>
                  <span style={{ color: C.ok, fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{Math.round(stats.valid / tot * 100)}%</span> {T('سارية','valid')}
                </span>
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                {segs.filter(s => s.v > 0).map(s => (
                  <div key={s.l} title={`${s.l}: ${s.v}`} style={{ width: (s.v / tot * 100) + '%', background: s.c, transition: 'width .3s' }} />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 16px' }}>
                {segs.map(s => (
                  <button key={s.l} onClick={() => { setIqamaFilter(p => p === s.l ? '' : ['valid','90d','30d','expired'][segs.indexOf(s)]); setPage(0) }} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.45 : 1, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F, textAlign: 'right' }}>
                    <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 20, textAlign: 'center', flexShrink: 0, fontWeight: 700 }}>{num(s.v)}</span>
                    <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.l}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Joining method */}
        {(() => {
          const tot = Math.max(1, stats.total)
          const recPct = Math.round(stats.recruit / tot * 100)
          const trPct = Math.round(stats.transfer / tot * 100)
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
                <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('طريقة الانضمام','Joining Method')}</span>
                <span style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{num(stats.recruit + stats.transfer)}</span>
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.04)' }}>
                {stats.recruit > 0 && <div style={{ width: recPct + '%', background: C.blue }} />}
                {stats.transfer > 0 && <div style={{ width: trPct + '%', background: C.purple }} />}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
                {[
                  { code: 'recruitment', v: stats.recruit, pct: recPct, t: JOIN_THEME.recruitment },
                  { code: 'transfer', v: stats.transfer, pct: trPct, t: JOIN_THEME.transfer },
                ].map(s => (
                  <button key={s.code} onClick={() => { setJoiningFilter(joiningFilter === s.code ? '' : s.code); setPage(0) }} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F, textAlign: 'right' }}>
                    <span style={{ color: s.t.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', minWidth: 28, textAlign: 'center', fontWeight: 800, fontSize: 13 }}>{s.pct}%</span>
                    <span style={{ color: 'var(--tx2)', flex: 1 }}>{T(s.t.label_ar, s.t.label_en)}</span>
                    <span style={{ color: 'var(--tx4)', fontWeight: 700, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(s.v)}</span>
                  </button>
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
            placeholder={T('ابحث بالاسم/الإقامة/الجوال…','Search by name/iqama/phone…')}
            value={q}
            onChange={e => { setQ(e.target.value); setPage(0) }}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box' }}
          />
        </div>
        {(() => {
          const hasFilters = !!(statusFilter || nationalityFilter || facilityFilter || joiningFilter || iqamaFilter || genderFilter)
          const clearAll = () => { setStatusFilter(''); setNationalityFilter(''); setFacilityFilter(''); setJoiningFilter(''); setIqamaFilter(''); setGenderFilter(''); setPage(0) }
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
                <div style={fLbl}>{T('الحالة','Status')}</div>
                <Sel value={statusFilter} onChange={v => { setStatusFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...Object.entries(STATUS_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('المنشأة','Facility')}</div>
                <Sel value={facilityFilter} onChange={v => { setFacilityFilter(v); setPage(0) }} placeholder={T('كل المنشآت','All')} options={[{ v: '', l: T('كل المنشآت','All') }, ...facilities.map(f => ({ v: f.id, l: f.name_ar }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('الجنسية','Nationality')}</div>
                <Sel value={nationalityFilter} onChange={v => { setNationalityFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...natList.map(n => ({ v: n, l: n }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('طريقة الانضمام','Joining')}</div>
                <Sel value={joiningFilter} onChange={v => { setJoiningFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, ...Object.entries(JOIN_THEME).map(([v, t]) => ({ v, l: T(t.label_ar, t.label_en) }))]} />
              </div>
              <div>
                <div style={fLbl}>{T('الإقامة','Iqama')}</div>
                <Sel value={iqamaFilter} onChange={v => { setIqamaFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, { v: 'valid', l: T('سارية','Valid') }, { v: '90d', l: T('≤ 90 يوم','≤90d') }, { v: '30d', l: T('≤ 30 يوم','≤30d') }, { v: 'expired', l: T('منتهية','Expired') }]} />
              </div>
              <div>
                <div style={fLbl}>{T('الجنس','Gender')}</div>
                <Sel value={genderFilter} onChange={v => { setGenderFilter(v); setPage(0) }} placeholder={T('الكل','All')} options={[{ v: '', l: T('الكل','All') }, { v: 'male', l: T('ذكر','Male') }, { v: 'female', l: T('أنثى','Female') }]} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{num(filtered.length)} {T('عامل','workers')}</span>
        {filtered.length !== workers.length && <span style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('من أصل','out of')} {num(workers.length)}</span>}
      </div>

      {/* Cards grid */}
      {loading && <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--tx4)', fontSize: 13, border: '1px dashed rgba(255,255,255,.08)', borderRadius: 14 }}>
          {T('لا يوجد عمّال','No workers')}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(380px,1fr))', gap: 12 }}>
          {paged.map(r => {
            const fac = facilities.find(f => f.id === r.facility_id)
            const status = STATUS_THEME[r.worker_status] || STATUS_THEME.active
            const join = JOIN_THEME[r.joining_method]
            const iqDays = r.iqama_expiry_date ? Math.ceil((new Date(r.iqama_expiry_date) - now) / 86400000) : null
            const iqClr = iqDays === null ? C.gray : iqDays < 0 ? C.red : iqDays <= 30 ? C.gold : iqDays <= 90 ? C.orange : C.ok
            const iqText = iqDays === null ? '—' : iqDays < 0 ? T('منتهية','Expired') : iqDays + ' ' + T('يوم','d')
            const iqPct = iqDays === null ? 0 : iqDays < 0 ? 100 : Math.max(2, Math.min(100, Math.round(((365 - Math.min(365, iqDays)) / 365) * 100)))
            const occ = occMap[r.occupation_id]

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
                onMouseEnter={e => { e.currentTarget.style.borderColor = status.c + '55' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }}
              >
                <div style={{ padding: '16px 22px 14px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 130px', gap: 18, alignItems: 'center' }}>
                    {/* Right: identity */}
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <NatFlag nationality={r.nationality} size={26} />
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, letterSpacing: '-.2px' }}>{r.name_ar || r.name_en || '—'}</span>
                        <StatusBadge status={r.worker_status} T={T} />
                      </div>

                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        {r.iqama_number && (
                          <span title={T('رقم الإقامة','Iqama')} style={{ fontSize: 11, color: 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h2M15 12h2M7 16h10"/></svg>
                            <span style={{ direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>{r.iqama_number}</span>
                            <CopyBtn value={r.iqama_number} toast={toast} T={T} />
                          </span>
                        )}
                        {r.phone && (
                          <a href={`tel:${r.phone}`} onClick={e => e.stopPropagation()} title={r.phone} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--tx3)', direction: 'ltr', textDecoration: 'none', fontWeight: 600 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            {String(r.phone).replace(/^966/, '0')}
                          </a>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {join && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 6, background: join.c + '1f', border: '1px solid ' + join.c + '40', color: join.c, fontSize: 10.5, fontWeight: 700 }}>
                            {T(join.label_ar, join.label_en)}
                          </span>
                        )}
                        {occ && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 6, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.28)', color: C.gold, fontSize: 10.5, fontWeight: 700 }}>{occ}</span>
                        )}
                        {fac?.name_ar && (
                          <span title={fac.name_ar} style={{ marginInlineStart: 'auto', fontSize: 11, color: 'var(--tx4)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/></svg>
                            {fac.name_ar}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', minHeight: 60 }} />

                    {/* Left: iqama countdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase' }}>{T('الإقامة','Iqama')}</span>
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: iqClr, fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-.5px', lineHeight: 1, textAlign: 'center' }}>{iqText}</div>
                      <div style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{r.iqama_expiry_date || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Bottom progress strip — iqama validity */}
                <div style={{ height: 5, background: 'rgba(255,255,255,.05)' }}>
                  <div style={{ height: '100%', width: `${iqPct}%`, background: iqClr, transition: 'width .3s' }} />
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
              .wf-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
              .wf-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
              .wf-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
              .wf-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
              .wf-pg-input::-webkit-outer-spin-button,.wf-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(filtered.length)}</span>
              <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{T('صفحة','Page')} {page + 1} {T('من','of')} {totalPages}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <button className="wf-pg-btn" disabled={page === 0} onClick={goPrev} aria-label={T('السابق','Prev')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <input className="wf-pg-input" type="number" min={1} max={totalPages} value={page + 1} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) goTo(v - 1) }} />
              <button className="wf-pg-btn" disabled={page + 1 >= totalPages} onClick={goNext} aria-label={T('التالي','Next')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
            </div>
          </div>
        )
      })()}

      {/* Edit form modal */}
      {pop === 'worker' && <FormPopup title={form._id ? T('تعديل عامل','Edit Worker') : T('إضافة عامل','Add Worker')} fields={wFields} form={form} setForm={setForm} onSave={() => saveG('workers', form)} onClose={() => setPop(null)} saving={saving} T={T} lang={lang} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Worker Detail Page (full page replacing the modal)
   ═══════════════════════════════════════════════════════════════ */
function WorkerDetailPage({ worker, sb, toast, T, isAr, onBack, onEdit, onDelete, bundle }) {
  const r = worker
  const fac = bundle.facilities.find(f => f.id === r.facility_id)
  const br = bundle.branches.find(b => b.id === r.branch_id)
  const broker = bundle.brokers.find(b => b.id === r.broker_id)
  const occ = bundle.occMap[r.occupation_id]
  const status = STATUS_THEME[r.worker_status] || STATUS_THEME.active
  const join = JOIN_THEME[r.joining_method]
  const now = new Date()
  const iqDays = r.iqama_expiry_date ? Math.ceil((new Date(r.iqama_expiry_date) - now) / 86400000) : null
  const iqClr = iqDays === null ? C.gray : iqDays < 0 ? C.red : iqDays <= 30 ? C.gold : iqDays <= 90 ? C.orange : C.ok
  const iqPct = iqDays === null ? 0 : iqDays < 0 ? 100 : Math.max(2, Math.min(100, Math.round(((365 - Math.min(365, iqDays)) / 365) * 100)))

  const hasIns = bundle.insurance.some(i => i.end_date && new Date(i.end_date) >= now)

  return (
    <div style={{ fontFamily: F, paddingTop: 0, color: 'var(--tx2)' }}>
      {/* Top bar: back + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <button onClick={onBack} title={T('رجوع','Back')} style={{ height: 40, padding: '0 14px', borderRadius: 11, background: 'linear-gradient(180deg,#363636 0%,#2A2A2A 100%)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.78)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F, fontSize: 12, fontWeight: 500, transition: '.2s', boxShadow: '0 2px 8px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05)' }}
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

      {/* Heading: name + tags */}
      <div style={{ marginBottom: 18, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <NatFlag nationality={r.nationality} size={28} />
          <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.2px' }}>{r.name_ar || r.name_en || T('عامل','Worker')}</div>
          <StatusBadge status={r.worker_status} T={T} />
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--tx3)' }}>
          {r.name_en && <><span>{r.name_en}</span><span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} /></>}
          {r.iqama_number && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
              <span style={{ color: C.gold, fontFamily: 'monospace', fontWeight: 700 }}>#{r.iqama_number}</span>
              <CopyBtn value={r.iqama_number} toast={toast} T={T} />
            </span>
          )}
          {r.nationality && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ color: 'var(--tx3)', fontWeight: 600 }}>{r.nationality}</span>
            </>
          )}
          {fac && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ color: C.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/></svg>
                {fac.name_ar}
              </span>
            </>
          )}
          {iqDays !== null && iqDays < 0 && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.18)' }} />
              <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(229,134,122,.10)', border: '1px solid ' + C.red, color: C.red, fontSize: 10.5, fontWeight: 800, letterSpacing: '.3px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {T('الإقامة منتهية','Iqama expired')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, alignItems: 'flex-start' }}>
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Identity */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} /><span style={cardTitle}>{T('الهوية','Identity')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailRow label={T('رقم العامل','Worker No')} value={r.worker_number} mono toast={toast} T={T} />
              <DetailRow label={T('رقم الإقامة','Iqama No')} value={r.iqama_number} mono toast={toast} T={T} />
              <DetailRow label={T('رقم الحدود','Border No')} value={r.border_number} mono toast={toast} T={T} />
              <DetailRow label={T('رقم الجواز','Passport No')} value={r.passport_number} mono toast={toast} T={T} />
              <DetailRow label={T('انتهاء الجواز','Passport Expiry')} value={r.passport_expiry} />
              <DetailRow label={T('نوع الهوية','ID Type')} value={VAL_AR[r.identity_type] || r.identity_type} />
              <DetailRow label={T('تاريخ الميلاد','Birth Date')} value={r.birth_date_g} />
              <DetailRow label={T('الجنس','Gender')} value={VAL_AR[r.gender] || r.gender} />
              <DetailRow label={T('الجنسية','Nationality')} value={r.nationality} />
              <DetailRow label={T('الحالة الاجتماعية','Marital')} value={VAL_AR[r.marital_status] || r.marital_status} />
              <DetailRow label={T('عدد المرافقين','Dependents')} value={r.dependents_count} />
              <DetailRow label={T('الجوال','Phone')} value={r.phone} mono toast={toast} T={T} />
            </div>
          </div>

          {/* Work */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('بيانات العمل','Work Information')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px' }}>
              <DetailRow label={T('المنشأة','Facility')} value={fac?.name_ar} />
              <DetailRow label={T('المهنة','Occupation')} value={occ} />
              <DetailRow label={T('المكتب','Branch')} value={br?.name_ar} />
              <DetailRow label={T('الوسيط','Broker')} value={broker?.name_ar} />
              <DetailRow label={T('طريقة الانضمام','Joining')} value={join ? T(join.label_ar, join.label_en) : null} />
              <DetailRow label={T('تاريخ الدخول','Entry Date')} value={r.entry_date_saudi} />
              <DetailRow label={T('منفذ الدخول','Entry Port')} value={r.entry_port} />
              <DetailRow label={T('انتهاء الإقامة','Iqama Expiry')} value={r.iqama_expiry_date} />
              <DetailRow label={T('راتب التأمينات','GOSI Salary')} value={r.gosi_salary ? num(r.gosi_salary) + ' ' + T('ر.س','SAR') : null} mono />
              <DetailRow label={T('راتب قوى','Qiwa Salary')} value={r.qiwa_salary ? num(r.qiwa_salary) + ' ' + T('ر.س','SAR') : null} mono />
              <DetailRow label={T('حالة التأمينات','GOSI Status')} value={VAL_AR[r.gosi_status] || r.gosi_status} />
              <DetailRow label={T('حالة عقد قوى','Qiwa Contract')} value={VAL_AR[r.qiwa_contract_status] || r.qiwa_contract_status} />
            </div>
          </div>

          {/* Documents */}
          <DetailListCard title={T('الوثائق','Documents')} color={C.cyan} count={bundle.iqamas.length + bundle.passports.length + bundle.visas.length + bundle.licenses.length}>
            {bundle.iqamas.length === 0 && bundle.passports.length === 0 && bundle.visas.length === 0 && bundle.licenses.length === 0 ? (
              <EmptyHint T={T} text={T('لا توجد وثائق','No documents')} />
            ) : (
              <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {bundle.iqamas.length > 0 && <DocList title={T('الإقامات','Iqama Cards')} items={bundle.iqamas} render={(i) => ({
                  primary: i.version_number ? `v${i.version_number}` : (i.iqama_number || '—'),
                  cells: [
                    { l: T('الإصدار','Issue'), v: i.iqama_issue_date || i.issue_date },
                    { l: T('الانتهاء','Expiry'), v: i.iqama_expiry_date || i.expiry_date, expiry: true },
                    { l: T('المدة','Duration'), v: i.duration_months ? i.duration_months + ' ' + T('شهر','m') : null },
                  ],
                })} T={T} />}
                {bundle.passports.length > 0 && <DocList title={T('الجوازات','Passports')} items={bundle.passports} render={(p) => ({
                  primary: p.passport_number, mono: true,
                  cells: [
                    { l: T('الإصدار','Issue'), v: p.issue_date },
                    { l: T('الانتهاء','Expiry'), v: p.expiry_date, expiry: true },
                    { l: T('مكان الإصدار','Issue Place'), v: p.issue_place },
                  ],
                })} T={T} />}
                {bundle.visas.length > 0 && <DocList title={T('التأشيرات','Visas')} items={bundle.visas} render={(v) => ({
                  primary: v.visa_number,
                  cells: [
                    { l: T('النوع','Type'), v: v.visa_type },
                    { l: T('الإصدار','Issue'), v: v.issue_date },
                    { l: T('الخروج قبل','Exit Before'), v: v.exit_before, expiry: true },
                  ],
                })} T={T} />}
                {bundle.licenses.length > 0 && <DocList title={T('رخص السياقة','Licenses')} items={bundle.licenses} render={(l) => ({
                  primary: l.license_type || T('رخصة','License'),
                  cells: [
                    { l: T('الإصدار','Issue'), v: l.issue_date },
                    { l: T('الانتهاء','Expiry'), v: l.expiry_date, expiry: true },
                  ],
                })} T={T} />}
              </div>
            )}
          </DetailListCard>

          {/* Contracts & Salary */}
          <DetailListCard title={T('العقود والرواتب','Contracts & Salary')} color={C.gold} count={bundle.contracts.length + bundle.salaryHistory.length}>
            {bundle.contracts.length === 0 && bundle.salaryHistory.length === 0 ? (
              <EmptyHint T={T} text={T('لا توجد عقود','No contracts')} />
            ) : (
              <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {bundle.contracts.length > 0 && <DocList title={T('العقود','Contracts')} items={bundle.contracts} render={(c) => ({
                  primary: c.contract_number ? '#' + c.contract_number : (c.contract_type || T('عقد','Contract')),
                  cells: [
                    { l: T('البداية','Start'), v: c.start_date },
                    { l: T('النهاية','End'), v: c.end_date || T('غير محدد','Open') },
                    { l: T('المدة','Duration'), v: c.duration_months ? c.duration_months + ' ' + T('شهر','m') : (c.duration_type || null) },
                  ],
                })} T={T} />}
                {bundle.salaryHistory.length > 0 && <DocList title={T('سجل الرواتب','Salary History')} items={bundle.salaryHistory} render={(s) => ({
                  primary: s.change_date,
                  cells: [
                    { l: T('من','From'), v: s.old_salary ? num(s.old_salary) : null },
                    { l: T('إلى','To'), v: s.new_salary ? num(s.new_salary) : null },
                    { l: T('السبب','Reason'), v: s.reason },
                  ],
                })} T={T} />}
              </div>
            )}
          </DetailListCard>

          {/* Permits & Insurance */}
          <DetailListCard title={T('رخص العمل والتأمينات','Permits & Insurance')} color={C.blue} count={bundle.permits.length + bundle.insurance.length + bundle.gosiSubs.length}>
            {bundle.permits.length === 0 && bundle.insurance.length === 0 && bundle.gosiSubs.length === 0 ? (
              <EmptyHint T={T} text={T('لا توجد بيانات','No data')} />
            ) : (
              <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {bundle.permits.length > 0 && <DocList title={T('رخص العمل','Work Permits')} items={bundle.permits} render={(p) => ({
                  primary: p.wp_order ? '#' + p.wp_order : T('رخصة','Permit'),
                  cells: [
                    { l: T('الإصدار','Issue'), v: p.wp_issue_date },
                    { l: T('الانتهاء','Expiry'), v: p.wp_expiry_date, expiry: true },
                    { l: T('المدة','Duration'), v: p.duration_months ? p.duration_months + ' ' + T('شهر','m') : null },
                  ],
                })} T={T} />}
                {bundle.insurance.length > 0 && <DocList title={T('التأمين الطبي','Medical Insurance')} items={bundle.insurance} render={(i) => ({
                  primary: i.insurance_company,
                  cells: [
                    { l: T('البداية','Start'), v: i.start_date },
                    { l: T('النهاية','End'), v: i.end_date, expiry: true },
                    { l: T('الوثيقة','Policy'), v: i.policy_number },
                  ],
                })} T={T} />}
                {bundle.gosiSubs.length > 0 && <DocList title={T('اشتراكات التأمينات','GOSI Subscriptions')} items={bundle.gosiSubs} render={(g) => ({
                  primary: g.subscription_start || '—',
                  cells: [
                    { l: T('الراتب الأساسي','Base'), v: g.base_salary ? num(g.base_salary) : null },
                    { l: T('الإجمالي','Total'), v: g.total_amount ? num(g.total_amount) : null },
                  ],
                })} T={T} />}
              </div>
            )}
          </DetailListCard>

          {/* Family & Vehicles */}
          <DetailListCard title={T('المرافقون والمركبات','Family & Vehicles')} color={C.purple} count={bundle.dependents.length + bundle.vehicles.length}>
            {bundle.dependents.length === 0 && bundle.vehicles.length === 0 ? (
              <EmptyHint T={T} text={T('لا توجد بيانات','No data')} />
            ) : (
              <div style={{ padding: '10px 22px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {bundle.dependents.length > 0 && <DocList title={T('التابعون','Dependents')} items={bundle.dependents} render={(d) => ({
                  primary: d.full_name || '—',
                  cells: [
                    { l: T('الصلة','Relation'), v: d.relation_type },
                    { l: T('تاريخ الميلاد','Birth Date'), v: d.date_of_birth },
                    { l: T('رقم الهوية','ID No'), v: d.identity_number },
                  ],
                })} T={T} />}
                {bundle.vehicles.length > 0 && <DocList title={T('المركبات','Vehicles')} items={bundle.vehicles} render={(v) => ({
                  primary: v.plate_number || '—',
                  cells: [
                    { l: T('النوع','Type'), v: v.vehicle_type },
                    { l: T('الموديل','Model'), v: v.model },
                    { l: T('السنة','Year'), v: v.year },
                  ],
                })} T={T} />}
              </div>
            )}
          </DetailListCard>

          {/* Timeline */}
          {bundle.timeline.length > 0 && (
            <div style={cardChrome}>
              <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.orange }} /><span style={cardTitle}>{T('السجل الزمني','Timeline')}</span></div>
              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {bundle.timeline.map((ev, i) => (
                  <div key={ev.id} style={{ display: 'flex', gap: 14, paddingBottom: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: i === 0 ? C.gold : 'rgba(255,255,255,.18)', boxShadow: i === 0 ? '0 0 8px ' + C.gold : 'none' }} />
                      {i < bundle.timeline.length - 1 && <div style={{ width: 2, flex: 1, background: 'rgba(255,255,255,.06)', marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx2)' }}>{ev.title || ev.event_type || '—'}</span>
                        <span style={{ fontSize: 10.5, color: 'var(--tx5)', direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{ev.event_date}</span>
                      </div>
                      {ev.description && <div style={{ fontSize: 11.5, color: 'var(--tx4)' }}>{ev.description}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
          {/* Iqama health card */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: iqClr }} /><span style={cardTitle}>{T('حالة الإقامة','Iqama Status')}</span></div>
            <div style={{ padding: '20px 22px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 6 }}>{iqDays === null ? T('غير محدد','Not set') : iqDays < 0 ? T('متأخر','Overdue') : T('متبقي','Remaining')}</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: iqClr, fontVariantNumeric: 'tabular-nums', direction: 'ltr', letterSpacing: '-1px', lineHeight: 1 }}>
                {iqDays === null ? '—' : Math.abs(iqDays)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 600, marginTop: 4 }}>{iqDays === null ? '' : T('يوم','days')}</div>
              <div style={{ marginTop: 14, height: 6, borderRadius: 999, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: iqPct + '%', background: iqClr, transition: 'width .3s' }} />
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{r.iqama_expiry_date || '—'}</div>
            </div>
          </div>

          {/* Compliance grid */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} /><span style={cardTitle}>{T('الالتزام','Compliance')}</span></div>
            <div style={{ padding: '14px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { l: T('رخصة العمل','Permit'), ok: bundle.permits.some(p => p.wp_expiry_date && new Date(p.wp_expiry_date) >= now) },
                { l: T('التأمينات','GOSI'), ok: r.gosi_status === 'active' || r.gosi_status === 'registered' || hasIns },
                { l: T('عقد قوى','Qiwa'), ok: r.qiwa_contract_status === 'active' || r.qiwa_contract_status === 'registered' },
                { l: T('تأمين طبي','Insurance'), ok: hasIns },
              ].map(s => (
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

          {/* Counters card */}
          <div style={cardChrome}>
            <div style={cardHeader}><span style={{ width: 6, height: 6, borderRadius: '50%', background: C.cyan }} /><span style={cardTitle}>{T('السجلات','Records')}</span></div>
            <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                [T('وثائق','Documents'), bundle.iqamas.length + bundle.passports.length + bundle.visas.length + bundle.licenses.length],
                [T('عقود','Contracts'), bundle.contracts.length],
                [T('رخص عمل','Permits'), bundle.permits.length],
                [T('طلبات نقل','Transfer Reqs'), bundle.transferReqs.length],
                [T('تابعون','Dependents'), bundle.dependents.length],
                [T('مركبات','Vehicles'), bundle.vehicles.length],
                [T('مرفقات','Attachments'), bundle.attFiles.length],
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

const EmptyHint = ({ T, text }) => (
  <div style={{ padding: '24px 22px', textAlign: 'center', color: 'var(--tx5)', fontSize: 12, fontWeight: 600 }}>{text || T('لا توجد بيانات','No data')}</div>
)

const DocList = ({ title, items, render, T }) => {
  const now = new Date()
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, letterSpacing: '.4px', textTransform: 'uppercase' }}>{title}</span>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.05)' }} />
        <span style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{items.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((it, idx) => {
          const meta = render(it)
          const cells = (meta.cells || []).filter(c => c.v != null && c.v !== '')
          return (
            <div key={it.id || idx} style={{ padding: '10px 12px', borderRadius: 10, background: 'linear-gradient(180deg,#252525 0%,#1f1f1f 100%)', border: '1px solid rgba(255,255,255,.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: cells.length ? 6 : 0, gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', direction: meta.mono ? 'ltr' : undefined, fontFamily: meta.mono ? 'monospace' : F, fontVariantNumeric: meta.mono ? 'tabular-nums' : undefined }}>{meta.primary || '—'}</span>
              </div>
              {cells.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(3, cells.length)}, 1fr)`, gap: 6 }}>
                  {cells.map((c, i) => {
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
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Form popup (used for add/edit)
   ═══════════════════════════════════════════════════════════════ */
function FormPopup({ title, fields, form, setForm, onSave, onClose, saving, T, lang }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, fontFamily: F }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
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
