import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { can as canPerm, cardVisible } from './lib/permissions.js'
import { Check, Pencil, ShieldCheck } from 'lucide-react'
import { Modal as FKModal, ModalSection, ActionButton, SuccessView, GRID, Select, EmptyState } from './components/ui/FormKit.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 24
const num = (v) => Number(v || 0).toLocaleString('en-US')
const arCount = (n, one, few) => (Number(n) >= 3 && Number(n) <= 10) ? few : one

// المدة المنقضية كعبارة واحدة — مطابقة لشريط حالة عقد أجير. مثال: «2 يوم 5 ساعة» / «5 ساعة».
const fmtDuration = (fromIso, toIso, ar = true) => {
  if (!fromIso || !toIso) return ''
  try {
    const ms = new Date(toIso) - new Date(fromIso)
    if (!(ms > 0)) return ''
    const totalHours = Math.floor(ms / 3600000)
    const days = Math.floor(totalHours / 24)
    const hours = totalHours % 24
    const dU = (n) => ar ? ((n >= 3 && n <= 10) ? 'أيام' : 'يوم') : 'day'
    const hU = (n) => ar ? ((n >= 3 && n <= 10) ? 'ساعات' : 'ساعة') : 'hr'
    const out = []
    if (days > 0) { out.push(`${days} ${dU(days)}`); if (hours > 0) out.push(`${hours} ${hU(hours)}`) }
    else if (hours > 0) { out.push(`${hours} ${hU(hours)}`) }
    else out.push(`<1 ${ar ? 'ساعة' : 'hr'}`)
    return out.join(' ')
  } catch { return '' }
}

// حالة استخدام التأشيرة (visa_usage_status في lookup_items).
const VISA_STATUS = {
  unused: { c: C.gray, ar: 'غير مستخدمة', en: 'Unused' },
  used: { c: C.ok, ar: 'مستخدمة', en: 'Used' },
  awaiting_cancellation: { c: C.gold, ar: 'في انتظار الإلغاء', en: 'Awaiting Cancellation' },
  cancelled: { c: C.red, ar: 'ألغيت', en: 'Cancelled' },
}
const statusTheme = (code) => VISA_STATUS[code] || { c: C.gray, ar: '—', en: '—' }

// ═══ أعلام الجنسيات ═══
// المصدر الأساسي: الاسم الإنجليزي (الصفة) → كود ISO alpha-2 (خريطة شاملة)؛ ثم الاسم العربي كاحتياط.
// ملاحظة: عمود nationalities.code أرقام سعودية (414/311…) لا أكواد ISO، فلا يصلح للأعلام.
const NAT_EN_CODES = {
  saudi:'sa',emirati:'ae',kuwaiti:'kw',qatari:'qa',bahraini:'bh',omani:'om',yemeni:'ye',
  jordanian:'jo',palestinian:'ps',lebanese:'lb',syrian:'sy',iraqi:'iq',egyptian:'eg',sudanese:'sd',
  libyan:'ly',tunisian:'tn',algerian:'dz',moroccan:'ma',mauritanian:'mr',somali:'so',djiboutian:'dj',comoran:'km',
  ethiopian:'et',eritrean:'er',kenyan:'ke',ugandan:'ug',tanzanian:'tz',nigerian:'ng',ghanaian:'gh',cameroonian:'cm',
  senegalese:'sn',malian:'ml',chadian:'td',nigerien:'ne',burkinabe:'bf',ivorian:'ci',beninese:'bj',togolese:'tg',
  guinean:'gn','sierra leonean':'sl',liberian:'lr',gambian:'gm',rwandan:'rw',burundian:'bi',congolese:'cd',
  angolan:'ao',mozambican:'mz',zambian:'zm',zimbabwean:'zw',malawian:'mw','south african':'za',malagasy:'mg',
  indian:'in',pakistani:'pk',bangladeshi:'bd','sri lankan':'lk',nepali:'np',nepalese:'np',bhutanese:'bt',maldivian:'mv',afghan:'af',
  filipino:'ph',indonesian:'id',malaysian:'my',thai:'th',vietnamese:'vn',burmese:'mm',myanmar:'mm',cambodian:'kh',lao:'la',laotian:'la',singaporean:'sg',bruneian:'bn',
  chinese:'cn',japanese:'jp',korean:'kr','south korean':'kr',mongolian:'mn',
  uzbek:'uz',kazakh:'kz',turkmen:'tm',tajik:'tj',kyrgyz:'kg',azerbaijani:'az',armenian:'am',georgian:'ge',
  turkish:'tr',iranian:'ir',
  british:'gb',english:'gb',irish:'ie',french:'fr',german:'de',italian:'it',spanish:'es',portuguese:'pt',dutch:'nl',
  belgian:'be',swiss:'ch',austrian:'at',swedish:'se',norwegian:'no',danish:'dk',finnish:'fi',polish:'pl',
  russian:'ru',ukrainian:'ua',romanian:'ro',bulgarian:'bg',greek:'gr',czech:'cz',hungarian:'hu',albanian:'al',
  serbian:'rs',croatian:'hr',bosnian:'ba',estonian:'ee',latvian:'lv',lithuanian:'lt',
  american:'us',canadian:'ca',mexican:'mx',brazilian:'br',argentine:'ar',argentinian:'ar',colombian:'co',
  peruvian:'pe',chilean:'cl',venezuelan:'ve',ecuadorian:'ec',uruguayan:'uy',bolivian:'bo',paraguayan:'py',
  australian:'au','new zealander':'nz',fijian:'fj',
}
const NAT_AR_CODES = {
  'سعودي':'sa','إماراتي':'ae','اماراتي':'ae','كويتي':'kw','قطري':'qa','بحريني':'bh','عماني':'om','يمني':'ye',
  'أردني':'jo','اردني':'jo','فلسطيني':'ps','لبناني':'lb','سوري':'sy','عراقي':'iq','مصري':'eg','سوداني':'sd',
  'تونسي':'tn','جزائري':'dz','مغربي':'ma','صومالي':'so','أثيوبي':'et','إثيوبي':'et','اثيوبي':'et','إريتري':'er',
  'كيني':'ke','أوغندي':'ug','اوغندي':'ug','نيجيري':'ng','غاني':'gh','هندي':'in','باكستاني':'pk','بنجلادشي':'bd',
  'بنغلاديشي':'bd','سريلانكي':'lk','نيبالي':'np','أفغاني':'af','افغاني':'af','فلبيني':'ph','أندونيسي':'id','إندونيسي':'id',
  'تركي':'tr','إيراني':'ir','بريطاني':'gb','أمريكي':'us','امريكي':'us','أسترالي':'au','استرالي':'au',
  'أرجنتيني':'ar','ارجنتيني':'ar','أوكراني':'ua','اوكراني':'ua','أوزبكستاني':'uz','اوزبكستاني':'uz','روسي':'ru',
}
const flagCode = (name_en, name_ar) =>
  NAT_EN_CODES[(name_en || '').trim().toLowerCase()] || NAT_AR_CODES[(name_ar || '').trim()] || null
const NatFlag = ({ name_ar, name_en, size = 16 }) => {
  const cc = flagCode(name_en, name_ar)
  if (!cc) return null
  return <img src={`https://flagcdn.com/w40/${cc}.png`} alt={name_ar || name_en} title={name_ar || name_en}
    style={{ width: size, height: Math.round(size * .72), objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
    onError={e => { e.target.style.display = 'none' }} />
}

const CopyBtn = ({ value, T }) => {
  const [copied, setCopied] = useState(false)
  const onCopy = async (e) => {
    e.stopPropagation()
    if (value == null || value === '') return
    try { await navigator.clipboard?.writeText(String(value)); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* تجاهل */ }
  }
  return (
    <button type="button" onClick={onCopy} title={T ? T('نسخ', 'Copy') : 'Copy'}
      style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', color: copied ? C.ok : 'rgba(255,255,255,.3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, transition: 'color .15s', flexShrink: 0 }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'rgba(255,255,255,.3)' }}>
      {copied
        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}
    </button>
  )
}

const StatusBadge = ({ code, T }) => {
  const th = statusTheme(code)
  if (!code) return <span style={{ color: 'var(--tx5)' }}>—</span>
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: th.c + '18', border: '1px solid ' + th.c + '38', color: th.c, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: th.c, boxShadow: '0 0 5px ' + th.c }} />
      {T(th.ar, th.en)}
    </span>
  )
}

const btnFilter = (active) => ({
  height: 44, padding: '0 16px', borderRadius: 12,
  background: active ? 'rgba(212,160,23,.12)' : 'rgba(0,0,0,.18)',
  border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'rgba(255,255,255,.05)'),
  color: active ? C.gold : 'var(--tx2)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
  display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box',
})
const selStyle = { width: '100%', height: 40, padding: '0 12px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.06)', color: '#fff', fontSize: 12.5, fontFamily: F, outline: 'none', cursor: 'pointer' }
const FilterField = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6 }}>{label}</div>
    {children}
  </div>
)

function VisasSkeleton() {
  const shimmer = { display: 'inline-block', borderRadius: 6, background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.11) 37%, rgba(255,255,255,.04) 63%)', backgroundSize: '400% 100%', animation: 'wf-shimmer 1.4s ease infinite' }
  const bar = (w, h = 11) => <span style={{ ...shimmer, width: w, height: h }} />
  const cols = ['12%', '17%', '14%', '19%', '22%', '16%']
  return (
    <div>
      <style>{`@keyframes wf-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
            {bar('45%', 16)}{bar('55%', 34)}{bar('70%', 11)}
          </div>
        ))}
      </div>
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', background: '#161616' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: cols.join(' '), alignItems: 'center', gap: 8, padding: '13px 12px', borderBottom: i < 7 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
            {cols.map((_, j) => <div key={j} style={{ display: 'flex', justifyContent: 'center' }}>{bar(j === 0 ? '72%' : '55%')}</div>)}
          </div>
        ))}
      </div>
    </div>
  )
}

const Empty = ({ T, hasData }) => (
  <EmptyState
    icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14a2 2 0 0 0 2-2V7l-5-5H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2z"/><path d="M14 2v5h5"/><circle cx="10" cy="13" r="2"/><path d="M10 15v3"/></svg>}
    title={hasData ? T('لا توجد نتائج للبحث', 'No results match the search') : T('لا توجد تأشيرات بعد', 'No visas yet')}
    desc={hasData ? T('جرّب تعديل كلمة البحث أو الفلاتر', 'Try adjusting your search or filters') : T('تظهر هنا تأشيرات العمل من فواتير «تأشيرة وإقامة»', 'Work visas from “visa + residence” invoices appear here')} />
)

// شكل الجلب — visa_applications لخدمات تأشيرة العمل، بنمط embedded-FK.
const VISA_SELECT = `
  id, visa_number, border_number, gender, usage_status_id, usage_status_changed_at, created_at,
  nationality:nationality_id(id,name_ar,name_en),
  occupation:occupation_id(id,name_ar,name_en),
  embassy:embassy_id(id,name_ar,name_en),
  visa_type:visa_type_id(code,value_ar,value_en),
  usage_status:usage_status_id(id,code,value_ar,value_en),
  facility:main_facility_id(id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number),
  sr:service_request_id(id,request_ref_no,request_date,branch:branch_id(id,branch_code),status:status_id(code),service_type:service_type_id(code,value_ar,value_en))
`

/* ═══════════════════════════════════════════════════════════════ */
export default function WorkVisasPage({ sb, toast, lang, user, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e
  const canEdit = canPerm(user, 'work_visas.edit')
  const goFacility = (id) => { if (!id) return; try { window.dispatchEvent(new CustomEvent('app-navigate-facility', { detail: { id } })) } catch { /* ignore */ } }

  const [rows, setRows] = useState([])
  const [statusOptions, setStatusOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({ status: '', nationality: '', embassy: '', facility: '', visa_type: '' })
  const [page, setPage] = useState(0)

  // نافذة تغيير الحالة — الإجراء الوحيد القابل للتعديل في هذه الصفحة (جدول فقط، بلا صفحة تفاصيل).
  const [statusVisa, setStatusVisa] = useState(null)
  const [statusVal, setStatusVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [editErr, setEditErr] = useState(null)
  const [editDone, setEditDone] = useState(null)

  useEffect(() => { onTabChange && onTabChange({ tab: 'work_visas' }) }, [])

  useEffect(() => {
    if (!sb) return
    ;(async () => {
      const { data: cat } = await sb.from('lookup_categories').select('id').eq('category_key', 'visa_usage_status').maybeSingle()
      if (!cat) return
      const { data } = await sb.from('lookup_items').select('id,code,value_ar,value_en,sort_order').eq('category_id', cat.id).eq('is_active', true).order('sort_order')
      if (data) setStatusOptions(data)
    })()
  }, [sb])

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const { data } = await sb.from('visa_applications').select(VISA_SELECT).is('deleted_at', null).order('created_at', { ascending: false })
    const list = (data || []).filter(v => /^work_visa/.test(v.sr?.service_type?.code || ''))
    // اسم العامل/الجواز (للبحث فقط — لا عمود لهما) يأتيان من خطوة استخراج الإقامة المرتبطة بالتأشيرة.
    const visaIds = list.map(v => v.id)
    const issByVisa = {}
    if (visaIds.length) {
      const { data: iss } = await sb.from('iqama_issuance_applications')
        .select('visa_application_id,worker_name_at_entry,iqama_number,worker:worker_id(name_ar,name_en,passport_number)')
        .in('visa_application_id', visaIds).is('deleted_at', null).order('created_at', { ascending: false })
      for (const r of (iss || [])) if (!issByVisa[r.visa_application_id]) issByVisa[r.visa_application_id] = r
    }
    setRows(list.map(v => {
      const i = issByVisa[v.id] || null
      return { ...v, worker_name: i?.worker?.name_ar || i?.worker?.name_en || i?.worker_name_at_entry || null, passport_number: i?.worker?.passport_number || null }
    }))
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  const openStatus = (v) => { if (!canEdit) return; setEditErr(null); setEditDone(null); setStatusVal(v.usage_status_id || ''); setStatusVisa(v) }
  const closeStatus = () => { if (!saving) { setStatusVisa(null); setEditErr(null); setEditDone(null) } }
  const saveStatus = async () => {
    if (!sb || saving || !statusVal || !statusVisa) return
    setSaving(true); setEditErr(null)
    try {
      const changedAt = new Date().toISOString()
      const { error } = await sb.from('visa_applications')
        .update({ usage_status_id: statusVal, usage_status_changed_at: changedAt, usage_status_changed_by: user?.id || null })
        .eq('id', statusVisa.id)
      if (error) throw new Error(error.message)
      const newObj = statusOptions.find(o => o.id === statusVal) || null
      setRows(rs => rs.map(r => r.id === statusVisa.id ? { ...r, usage_status_id: statusVal, usage_status: newObj, usage_status_changed_at: changedAt } : r))
      setEditDone({ title: T('تم تحديث حالة التأشيرة', 'Visa status updated') })
    } catch (e) {
      setEditErr(T('فشل الحفظ: ' + (e.message || e), 'Save failed: ' + (e.message || e)))
    } finally { setSaving(false) }
  }

  const stats = useMemo(() => {
    const s = { total: rows.length, used: 0, unused: 0, awaiting: 0, cancelled: 0 }
    for (const r of rows) {
      const c = r.usage_status?.code
      if (c === 'used') s.used++
      else if (c === 'unused') s.unused++
      else if (c === 'awaiting_cancellation') s.awaiting++
      else if (c === 'cancelled') s.cancelled++
    }
    return s
  }, [rows])
  const statusSegs = [
    { k: 'unused', l: T('غير مستخدمة', 'Unused'), v: stats.unused, c: C.gray },
    { k: 'used', l: T('مستخدمة', 'Used'), v: stats.used, c: C.ok },
    { k: 'awaiting_cancellation', l: T('بانتظار الإلغاء', 'Awaiting'), v: stats.awaiting, c: C.gold },
    { k: 'cancelled', l: T('ألغيت', 'Cancelled'), v: stats.cancelled, c: C.red },
  ]
  const statusTot = Math.max(1, stats.used + stats.unused + stats.awaiting + stats.cancelled)
  const usedPct = Math.round(stats.used / statusTot * 100)
  const R = 42, CIRC = 2 * Math.PI * R
  let acc = 0
  const statusArcs = statusSegs.map(s => {
    const len = (s.v / statusTot) * CIRC
    const arc = { ...s, dash: `${len} ${CIRC - len}`, offset: -acc }
    acc += len
    return arc
  })

  const natTop = useMemo(() => {
    const m = new Map()
    for (const r of rows) { const ar = r.nationality?.name_ar; if (!ar) continue; const e = m.get(ar) || { ar, en: r.nationality?.name_en, count: 0 }; e.count++; m.set(ar, e) }
    return [...m.values()].sort((a, b) => b.count - a.count)
  }, [rows])
  const embassyOpts = useMemo(() => {
    const seen = new Set(), out = []
    for (const r of rows) { const n = r.embassy?.name_ar; if (n && !seen.has(n)) { seen.add(n); out.push(n) } }
    return out.sort()
  }, [rows])
  const facilityOpts = useMemo(() => {
    const map = new Map()
    for (const r of rows) { const f = r.facility; if (f?.id && !map.has(f.id)) map.set(f.id, f.name_ar || f.name_en || f.unified_number || '—') }
    return [...map.entries()]
  }, [rows])
  const visaTypeOpts = useMemo(() => {
    const map = new Map()
    for (const r of rows) { const t = r.visa_type; if (t?.code && !map.has(t.code)) map.set(t.code, t.value_ar || t.value_en || t.code) }
    return [...map.entries()]
  }, [rows])

  const advCount = useMemo(() => Object.values(adv).filter(v => v).length, [adv])

  const filtered = useMemo(() => rows.filter(r => {
    if (adv.status && r.usage_status?.code !== adv.status) return false
    if (adv.nationality && r.nationality?.name_ar !== adv.nationality) return false
    if (adv.embassy && r.embassy?.name_ar !== adv.embassy) return false
    if (adv.facility && r.facility?.id !== adv.facility) return false
    if (adv.visa_type && r.visa_type?.code !== adv.visa_type) return false
    if (search.trim()) {
      const s = search.toLowerCase()
      const fac = r.facility
      const facMatch = fac && [fac.unified_number, fac.gosi_number, fac.hrsd_number, fac.cr_number].some(n => String(n || '').toLowerCase().includes(s))
      const hit = (r.visa_number || '').toLowerCase().includes(s)
        || (r.border_number || '').toLowerCase().includes(s)
        || (r.passport_number || '').toLowerCase().includes(s)
        || (r.worker_name || '').toLowerCase().includes(s)
        || (r.nationality?.name_ar || '').includes(s)
        || (r.embassy?.name_ar || '').includes(s)
        || (fac?.name_ar || '').toLowerCase().includes(s)
        || facMatch
      if (!hit) return false
    }
    return true
  }), [rows, adv, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE)
  const initialLoading = loading && rows.length === 0

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero — عنوان + وصف (نفس ترويسة صفحة العمالة) */}
      <div style={{ position: 'relative', marginBottom: 22 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
          {T('تأشيرات العمل', 'Work Visas')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
          {T('كل تأشيرات العمل الناتجة عن فواتير «تأشيرة وإقامة» — تحكّم بحالة التأشيرة، وتُملأ بقية الحقول من المعاملة حتى استخراج الإقامة.',
             'All work visas from “visa + residence” invoices — control the visa status; the rest of the fields are filled from the transaction until the Iqama is issued.')}
        </div>
      </div>

      {initialLoading ? <VisasSkeleton /> : (<>
      {/* KPI Row — ٣ بطاقات */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {/* إجمالي التأشيرات */}
        <div style={{ position: 'relative', padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', minHeight: 150 }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}26 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}aa` }} />
            <span style={{ fontSize: 24, color: '#fff', fontWeight: 600, letterSpacing: '.2px' }}>{T(arCount(stats.total, 'تأشيرة', 'تأشيرات'), 'Visas')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.blue, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.06)', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.ok, fontWeight: 600, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.ok }} /> {num(stats.used)} {T('مستخدمة', 'used')}
            </span>
            <span style={{ fontSize: 12, color: C.gray, fontWeight: 600, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gray }} /> {num(stats.unused)} {T('غير مستخدمة', 'unused')}
            </span>
          </div>
        </div>

        {/* Donut — توزيع الحالات */}
        <div style={{ borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150 }}>
          <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('حالة التأشيرات', 'Visa Status')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.4))' }}>
                <defs>
                  <radialGradient id="vs-donut-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,.06)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                  {statusArcs.filter(a => a.v > 0).map(a => (
                    <linearGradient key={'g-' + a.k} id={`vs-seg-${a.k}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={a.c} stopOpacity="1" /><stop offset="100%" stopColor={a.c} stopOpacity=".72" />
                    </linearGradient>
                  ))}
                </defs>
                <circle cx="56" cy="56" r="34" fill="url(#vs-donut-core)" />
                <g style={{ transform: 'rotate(-90deg)', transformOrigin: '56px 56px' }}>
                  <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                  {statusArcs.filter(a => a.v > 0).map(a => (
                    <circle key={a.k} cx="56" cy="56" r={R} fill="none" stroke={`url(#vs-seg-${a.k})`} strokeWidth="12" strokeLinecap="butt"
                      strokeDasharray={a.dash} strokeDashoffset={a.offset} style={{ transition: 'stroke-dasharray .4s, stroke-dashoffset .4s' }} />
                  ))}
                </g>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', direction: 'ltr', color: 'var(--tx)' }}>{usedPct}%</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, marginTop: 4, letterSpacing: '.2px', color: 'var(--tx2)' }}>{T('مستخدمة', 'used')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              {statusSegs.map(s => (
                <button key={s.k} onClick={() => { setAdv(a => ({ ...a, status: a.status === s.k ? '' : s.k })); setPage(0) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.4 : 1, background: adv.status === s.k ? 'rgba(212,160,23,.08)' : 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontFamily: F, textAlign: 'right' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
                  <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{s.l}</span>
                  <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontWeight: 800, flexShrink: 0 }}>{num(s.v)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* الجنسيات — أعلى ٤ */}
        <div style={{ borderRadius: 16, background: 'linear-gradient(180deg,#2A2A2A 0%,#222 100%)', border: '1px solid rgba(255,255,255,.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الجنسيات', 'Nationalities')}</span>
            <span style={{ fontSize: 10.5, color: C.purple, fontWeight: 700 }}>{num(natTop.length)} {T('جنسية', 'total')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, flex: 1 }}>
            {natTop.slice(0, 4).map(n => (
              <button key={n.ar} onClick={() => { setAdv(a => ({ ...a, nationality: a.nationality === n.ar ? '' : n.ar })); setPage(0) }}
                style={{ borderRadius: 12, padding: '8px 10px', background: adv.nationality === n.ar ? 'rgba(212,160,23,.12)' : 'rgba(255,255,255,.025)', border: '1px solid ' + (adv.nationality === n.ar ? 'rgba(212,160,23,.4)' : 'rgba(255,255,255,.04)'), display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4, cursor: 'pointer', textAlign: 'start', fontFamily: F }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <NatFlag name_ar={n.ar} name_en={n.en} size={16} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>{num(n.count)}</span>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.ar}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: advOpen ? 10 : 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={T('ابحث برقم التأشيرة، الحدود، الجواز، اسم العامل، الجنسية، السفارة، أو المنشأة…', 'Search by visa, border, passport, worker, nationality, embassy, or facility…')}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'rgba(0,0,0,.18)', border: '1px solid rgba(255,255,255,.05)', color: '#fff', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <button type="button" onClick={() => setAdvOpen(v => !v)} style={btnFilter(advOpen || advCount > 0)}>
          {T('تصفية', 'Filter')}
          {advCount > 0 ? (
            <span role="button" tabIndex={0} title={T('مسح الفلاتر', 'Clear filters')}
              onClick={e => { e.stopPropagation(); setAdv({ status: '', nationality: '', embassy: '', facility: '', visa_type: '' }) }}
              onMouseEnter={e => { e.currentTarget.style.background = C.red; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = '#000' }}
              style={{ background: C.gold, color: '#000', width: 18, height: 18, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '.18s' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </span>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="14" y2="6"/><line x1="18" y1="6" x2="20" y2="6"/><circle cx="16" cy="6" r="2"/><line x1="4" y1="12" x2="8" y2="12"/><line x1="12" y1="12" x2="20" y2="12"/><circle cx="10" cy="12" r="2"/><line x1="4" y1="18" x2="16" y2="18"/><line x1="20" y1="18" x2="20" y2="18"/><circle cx="18" cy="18" r="2"/></svg>
          )}
        </button>
      </div>

      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--modal-bg)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FilterField label={T('الحالة', 'Status')}>
              <select value={adv.status} onChange={e => { setAdv(a => ({ ...a, status: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل', 'All')}</option>
                {statusSegs.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
              </select>
            </FilterField>
            <FilterField label={T('الجنسية', 'Nationality')}>
              <select value={adv.nationality} onChange={e => { setAdv(a => ({ ...a, nationality: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل', 'All')}</option>
                {natTop.map(n => <option key={n.ar} value={n.ar}>{n.ar} ({n.count})</option>)}
              </select>
            </FilterField>
            <FilterField label={T('السفارة', 'Embassy')}>
              <select value={adv.embassy} onChange={e => { setAdv(a => ({ ...a, embassy: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل', 'All')}</option>
                {embassyOpts.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </FilterField>
            <FilterField label={T('المنشأة', 'Facility')}>
              <select value={adv.facility} onChange={e => { setAdv(a => ({ ...a, facility: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل', 'All')}</option>
                {facilityOpts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
            </FilterField>
            <FilterField label={T('نوع التأشيرة', 'Visa Type')}>
              <select value={adv.visa_type} onChange={e => { setAdv(a => ({ ...a, visa_type: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل', 'All')}</option>
                {visaTypeOpts.map(([code, n]) => <option key={code} value={code}>{n}</option>)}
              </select>
            </FilterField>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('جاري التحميل...', 'Loading...')}</div>
      ) : filtered.length === 0 ? (
        <Empty T={T} hasData={rows.length > 0} />
      ) : (
        <>
          <style>{`
            .wf-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
            .wf-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:14px;font-weight:600;text-align:center;padding:14px 4px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
            .wf-tbl tbody td{padding:10px 4px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.02)}
            .wf-tbl tbody tr{transition:background .12s}
            .wf-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
            .wf-tbl tbody tr.clk:hover td{background:rgba(212,160,23,.06)}
            .wf-tbl tbody tr:last-child td:first-child{border-bottom-right-radius:9px}
            .wf-tbl tbody tr:last-child td:last-child{border-bottom-left-radius:9px}
            .wf-tbl tbody tr:last-child td{border-bottom:none}
            .wf-tbl thead tr:first-child th:first-child{border-top-right-radius:9px}
            .wf-tbl thead tr:first-child th:last-child{border-top-left-radius:9px}
            .wf-tbl .num{direction:ltr;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:700}
            .wf-tbl .muted{color:var(--tx5)}
            .wf-tbl .name-marquee{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
            .wf-tbl .fac-link:hover{color:${C.gold};text-decoration:underline}
            @keyframes wf-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.78)}}
            .wf-tbl .wf-dot-pulse{animation:wf-pulse 1.5s ease-in-out infinite}
            .wf-tbl .wf-status.clk{transition:filter .15s,box-shadow .15s}
            .wf-tbl .wf-status.clk:hover{filter:brightness(1.18);box-shadow:0 0 0 1px rgba(212,160,23,.35)}
          `}</style>

          <div style={{ borderRadius: 10 }}>
            <table className="wf-tbl">
              <colgroup>
                <col style={{ width: '11%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} /><col style={{ width: '13%' }} /><col style={{ width: '20%' }} /><col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>{T('المكتب', 'Office')}</th>
                  <th>{T('رقم التأشيرة', 'Visa No.')}</th>
                  <th>{T('رقم الحدود', 'Border No.')}</th>
                  <th>{T('المهنة', 'Occupation')}</th>
                  <th>{T('الجنسية', 'Nationality')}</th>
                  <th>{T('المنشأة', 'Facility')}</th>
                  <th>{T('الحالة', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(v => (
                  <tr key={v.id}>
                    <td>
                      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                        <span style={{ direction: 'ltr', fontFamily: 'monospace', fontWeight: 700, fontSize: 14.5, letterSpacing: '.3px', color: v.sr?.branch?.branch_code ? C.gold : 'var(--tx4)' }}>{v.sr?.branch?.branch_code || '—'}</span>
                        {v.sr?.request_date && <span style={{ direction: 'ltr', fontFamily: 'monospace', color: 'var(--tx4)', fontWeight: 500, fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>{String(v.sr.request_date).slice(0, 10)}</span>}
                      </span>
                    </td>
                    <td>
                      {v.visa_number ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                          <CopyBtn value={v.visa_number} T={T} />
                          <span className="num" style={{ fontSize: 13.5, color: C.gold }}>{v.visa_number}</span>
                        </span>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      {v.border_number ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                          <CopyBtn value={v.border_number} T={T} />
                          <span className="num" style={{ fontSize: 13, color: C.blue }}>{v.border_number}</span>
                        </span>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td title={isAr ? (v.occupation?.name_ar || '') : (v.occupation?.name_en || v.occupation?.name_ar || '')} style={{ paddingInline: 8 }}>
                      {v.occupation ? (
                        <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, textAlign: 'center' }}>{isAr ? (v.occupation.name_ar || v.occupation.name_en) : (v.occupation.name_en || v.occupation.name_ar)}</div>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td title={[v.nationality?.name_ar, v.embassy?.name_ar].filter(Boolean).join(' — ')} style={{ paddingInline: 8 }}>
                      {(v.nationality?.name_ar || v.embassy?.name_ar) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
                          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>{v.nationality?.name_ar || '—'}</div>
                          {v.embassy?.name_ar && <div className="name-marquee" style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600 }}>{v.embassy.name_ar}</div>}
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td title={v.facility?.name_ar || ''} style={{ paddingInline: 8 }}>
                      {v.facility ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                          <div className="name-marquee fac-link" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600, cursor: 'pointer' }}
                            title={T('عرض تفاصيل المنشأة', 'View facility details')}
                            onClick={e => { e.stopPropagation(); goFacility(v.facility.id) }}>{v.facility.name_ar || v.facility.name_en || v.facility.unified_number}</div>
                          {v.facility.hrsd_number && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }} onClick={e => e.stopPropagation()}>
                              <CopyBtn value={v.facility.hrsd_number} T={T} />
                              <span className="num" style={{ fontSize: 11, color: 'var(--tx3)' }}>{v.facility.hrsd_number}</span>
                            </span>
                          )}
                        </div>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      {(() => {
                        const code = v.usage_status?.code
                        const th = statusTheme(code)
                        const c = th.c
                        const settled = code === 'used' || code === 'cancelled'
                        const live = !settled
                        // المدة منذ آخر تغيير للحالة (يسقط لتاريخ الإنشاء إن لم تتغيّر الحالة بعد).
                        const dur = fmtDuration(v.usage_status_changed_at || v.created_at, new Date().toISOString(), isAr)
                        const tip = canEdit ? T('تغيير حالة التأشيرة', 'Change visa status') : T('منذ آخر تغيير للحالة', 'Since last status change')
                        const onClick = canEdit ? (e) => { e.stopPropagation(); openStatus(v) } : undefined
                        const badge = code ? (
                          <div className={canEdit ? 'wf-status clk' : 'wf-status'} title={tip} onClick={onClick}
                            style={{ display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 100, borderInlineStart: `3px solid ${c}`, background: `${c}10`, padding: '8px 11px', direction: isAr ? 'rtl' : 'ltr', textAlign: isAr ? 'right' : 'left', cursor: canEdit ? 'pointer' : 'default' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: c, whiteSpace: 'nowrap' }}>
                              {live && <span className="wf-dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />}{T(th.ar, th.en)}
                            </span>
                            {dur && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx4)', whiteSpace: 'nowrap' }}>{dur}</span>}
                          </div>
                        ) : <span style={{ color: 'var(--tx5)' }}>—</span>
                        return badge
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > PAGE && (() => {
            const goPrev = () => setPage(p => Math.max(0, p - 1))
            const goNext = () => setPage(p => p + 1)
            const goTo = nn => setPage(Math.max(0, Math.min(totalPages - 1, nn)))
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
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من', 'of')} {num(filtered.length)}</span>
                  <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{T('صفحة', 'Page')} {page + 1} {T('من', 'of')} {totalPages}</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <button className="wf-pg-btn" disabled={page === 0} onClick={goPrev} aria-label={T('السابق', 'Prev')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  <input className="wf-pg-input" type="number" min={1} max={totalPages} value={page + 1} onChange={e => { const vv = parseInt(e.target.value, 10); if (!isNaN(vv)) goTo(vv - 1) }} />
                  <button className="wf-pg-btn" disabled={page + 1 >= totalPages} onClick={goNext} aria-label={T('التالي', 'Next')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                </div>
              </div>
            )
          })()}
        </>
      )}
      </>)}

      {/* نافذة تغيير حالة التأشيرة — الإجراء الوحيد القابل للتعديل (نجاح داخل النافذة) */}
      {statusVisa && (
        <FKModal open onClose={closeStatus} width={460}
          title={T('تغيير حالة التأشيرة', 'Change Visa Status')} Icon={Pencil}
          errorMsg={editErr}
          success={editDone ? <SuccessView title={editDone.title} /> : undefined}
          footer={
            <ActionButton Icon={Check} disabled={saving || !statusVal} onClick={saveStatus}>
              {saving ? T('جاري الحفظ…', 'Saving…') : T('حفظ الحالة', 'Save status')}
            </ActionButton>
          }>
          <ModalSection Icon={ShieldCheck} label={`${T('تأشيرة', 'Visa')} ${statusVisa.visa_number || ''}`.trim()}>
            <div style={{ ...GRID, minHeight: 320, alignContent: 'start', paddingBlock: 10 }}>
              <Select full label={T('حالة التأشيرة', 'Visa Status')} placeholder={T('اختر الحالة…', 'Select status…')}
                options={statusOptions} getKey={o => o.id} getLabel={o => isAr ? o.value_ar : (o.value_en || o.value_ar)}
                value={statusVal} onChange={(id) => setStatusVal(id)} />
            </div>
          </ModalSection>
        </FKModal>
      )}
    </div>
  )
}
