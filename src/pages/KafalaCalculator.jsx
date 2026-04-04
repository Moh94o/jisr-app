import React, { useState, useMemo } from 'react'
import { User, FileText, Calculator, ChevronRight, ChevronLeft, Plus, Trash2, Check, X, AlertCircle, Briefcase, Phone, Calendar, ArrowLeftRight, Search, Shield, CreditCard, Clock, Building2, CheckCircle2, Info } from 'lucide-react'

const F = "'Cairo','Tajawal',sans-serif"
const C = { gold: '#c9a84c', ok: '#27a046', red: '#c0392b', blue: '#3483b4', bg: '#171717', sf: '#1e1e1e', bd: 'rgba(255,255,255,.06)' }

// ═══ Hijri Conversion ═══
function gregorianToHijri(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  const JD = Math.floor(d.getTime() / 86400000) + 2440588
  const l = JD - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n + 354
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238)
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const month = Math.floor((24 * l3) / 709)
  const day = l3 - Math.floor((709 * month) / 24)
  const year = 30 * n + j - 30
  const months = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة']
  if (month < 1 || month > 12) return ''
  return `${day} ${months[month - 1]} ${year} هـ`
}

function gregorianToHijriParts(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  const JD = Math.floor(d.getTime() / 86400000) + 2440588
  const l = JD - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n + 354
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238)
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const month = Math.floor((24 * l3) / 709)
  const day = l3 - Math.floor((709 * month) / 24)
  const year = 30 * n + j - 30
  if (month < 1 || month > 12) return null
  return { day, month, year }
}

function hijriToGregorian(hYear, hMonth, hDay) {
  const jd = Math.floor((11 * hYear + 3) / 30) + 354 * hYear + 30 * hMonth - Math.floor((hMonth - 1) / 2) + hDay + 1948440 - 385
  const la = jd + 68569
  const n = Math.floor(4 * la / 146097)
  const la2 = la - Math.floor((146097 * n + 3) / 4)
  const i = Math.floor(4000 * (la2 + 1) / 1461001)
  const la3 = la2 - Math.floor(1461 * i / 4) + 31
  const j = Math.floor(80 * la3 / 2447)
  const gDay = la3 - Math.floor(2447 * j / 80)
  const la4 = Math.floor(j / 11)
  const gMonth = j + 2 - 12 * la4
  const gYear = 100 * (n - 49) + i + la4
  return `${gYear}-${String(gMonth).padStart(2,'0')}-${String(gDay).padStart(2,'0')}`
}

// Generate Hijri year options (current range)
function getHijriYears() {
  const parts = gregorianToHijriParts(new Date().toISOString().slice(0,10))
  if (!parts) return []
  const years = []
  for (let y = parts.year - 2; y <= parts.year + 5; y++) years.push(y)
  return years
}

function daysSinceExpiry(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  return diff > 0 ? diff : 0
}

const NATIONALITIES = ['يمني', 'مصري', 'باكستاني', 'هندي', 'بنغلاديشي', 'إثيوبي', 'فلبيني', 'سوداني', 'سوري', 'أردني', 'لبناني', 'عراقي', 'فلسطيني', 'إندونيسي', 'سريلانكي', 'نيبالي', 'إريتري', 'أخرى']
const OCCUPATIONS = ['عامل بناء', 'نجار', 'حداد', 'كهربائي', 'سباك', 'دهان', 'مشغل معدات', 'سائق', 'مقاول', 'فني تكييف', 'حارس أمن', 'عامل نظافة', 'بائع', 'موظف إداري', 'أخرى']

// ═══ Shared UI Components ═══
const sF = { width: '100%', height: 44, padding: '0 14px', border: '1.5px solid rgba(255,255,255,.1)', borderRadius: 10, fontFamily: F, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', outline: 'none', background: 'rgba(255,255,255,.04)', boxSizing: 'border-box', transition: '.2s' }

const Lbl = ({ children, req }) => <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', marginBottom: 6 }}>{children}{req && <span style={{ color: C.red }}> *</span>}</div>

const Inp = ({ value, onChange, placeholder, type, dir, maxLength }) => (
  <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type || 'text'} maxLength={maxLength}
    style={{ ...sF, textAlign: dir === 'ltr' ? 'left' : 'right', direction: dir || 'rtl' }}
    onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,.4)'; e.target.style.background = 'rgba(201,168,76,.04)' }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.background = 'rgba(255,255,255,.04)' }} />
)

const DateInp = ({ value, onChange }) => (
  <input type="date" value={value || ''} onChange={e => onChange(e.target.value)}
    style={{ ...sF, direction: 'ltr', colorScheme: 'dark' }}
    onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,.4)' }}
    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)' }} />
)

const Sel = ({ value, onChange, options, placeholder }) => (
  <select value={value || ''} onChange={e => onChange(e.target.value)}
    style={{ ...sF, textAlign: 'right', appearance: 'none', WebkitAppearance: 'none', colorScheme: 'dark', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23c9a84c' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: '14px center' }}>
    <option value="">{placeholder || '— اختر —'}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
)

const ToggleGroup = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', gap: 0, borderRadius: 10, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,.08)' }}>
    {options.map(o => (
      <button key={o.v} onClick={() => onChange(o.v)} style={{
        flex: 1, height: 44, border: 'none', fontFamily: F, fontSize: 11, fontWeight: value === o.v ? 700 : 500,
        color: value === o.v ? (o.c || C.gold) : 'rgba(255,255,255,.35)',
        background: value === o.v ? (o.c || C.gold) + '15' : 'rgba(255,255,255,.02)',
        cursor: 'pointer', transition: '.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2
      }}>
        <span>{o.l}</span>
        {o.sub && <span style={{ fontSize: 9, opacity: .6 }}>{o.sub}</span>}
      </button>
    ))}
  </div>
)

const YesNo = ({ value, onChange }) => (
  <ToggleGroup value={value} onChange={onChange} options={[
    { v: true, l: 'نعم', c: C.ok },
    { v: false, l: 'لا', c: C.red }
  ]} />
)

const nm = v => Number(v || 0).toLocaleString('en-US')

// ═══ Main Component ═══
export default function KafalaCalculator({ toast, lang, onClose }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e

  // Screen: 'home' | 'form'
  const [screen, setScreen] = useState('home')
  const [tab, setTab] = useState(0)
  const [workerMode, setWorkerMode] = useState('new')
  const [searchIqama, setSearchIqama] = useState('')
  const [errors, setErrors] = useState({})
  const [tried, setTried] = useState([false, false, false, false])
  const [calendarType, setCalendarType] = useState('gregorian') // 'gregorian' | 'hijri'

  // Form state
  const [f, setF] = useState({
    name: '', iqama: '', phone: '', iqamaExpiry: '', dob: '', nationality: '', gender: 'ذكر', occupation: '', legalStatus: 'نظامي',
    changeProfession: false, newOccupation: '', wpExpiry: '', hasNoticePeriod: false, employerConsent: false,
    transferCount: '1', renewalMonths: '12', iqamaFineCount: '1',
    profChangeInput: '200', workPermitRate: '100', medicalFee: '800', officeFee: '500',
    extras: []
  })

  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  // ═══ Calculations ═══
  const iqamaExpired = useMemo(() => {
    if (!f.iqamaExpiry) return false
    return new Date(f.iqamaExpiry) < new Date()
  }, [f.iqamaExpiry])

  const expiredDays = useMemo(() => daysSinceExpiry(f.iqamaExpiry), [f.iqamaExpiry])
  const hijriExpiry = useMemo(() => gregorianToHijri(f.iqamaExpiry), [f.iqamaExpiry])

  const transferFee = f.transferCount === '1' ? 2000 : f.transferCount === '2' ? 4000 : 6000
  const renewalMonths = parseInt(f.renewalMonths) || 12
  const iqamaRenewalFee = Math.round((650 / 12) * renewalMonths)
  const iqamaFineFee = iqamaExpired ? (f.iqamaFineCount === '1' ? 500 : 1000) : 0
  const workPermitFee = Math.round((parseFloat(f.workPermitRate) || 0) * renewalMonths)
  const profChangeFee = f.changeProfession ? (parseFloat(f.profChangeInput) || 200) : 0
  const medicalFee = parseFloat(f.medicalFee) || 0
  const officeFee = parseFloat(f.officeFee) || 0
  const extrasTotal = f.extras.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const grandTotal = transferFee + iqamaRenewalFee + iqamaFineFee + workPermitFee + profChangeFee + medicalFee + officeFee + extrasTotal

  // Extras management
  const [extraName, setExtraName] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const addExtra = () => {
    if (!extraName || !extraAmount) return
    set('extras', [...f.extras, { name: extraName, amount: extraAmount }])
    setExtraName(''); setExtraAmount('')
  }
  const removeExtra = i => set('extras', f.extras.filter((_, idx) => idx !== i))

  // Validation
  const validateTab0 = () => {
    const e = {}
    if (!f.name.trim()) e.name = 'مطلوب'
    if (!f.iqama || !/^\d{10}$/.test(f.iqama)) e.iqama = 'يجب أن يكون 10 أرقام'
    if (!f.iqamaExpiry) e.iqamaExpiry = 'مطلوب'
    if (!f.nationality) e.nationality = 'مطلوب'
    if (!f.occupation) e.occupation = 'مطلوب'
    return e
  }
  const validateTab1 = () => {
    const e = {}
    if (f.changeProfession === null || f.changeProfession === undefined) e.changeProfession = 'مطلوب'
    if (f.hasNoticePeriod === null || f.hasNoticePeriod === undefined) e.hasNoticePeriod = 'مطلوب'
    if (f.employerConsent === null || f.employerConsent === undefined) e.employerConsent = 'مطلوب'
    return e
  }
  const tryNextTab = () => {
    const newTried = [...tried]; newTried[tab] = true; setTried(newTried)
    if (tab === 0) { const e = validateTab0(); setErrors(e); if (Object.keys(e).length > 0) return }
    if (tab === 1) { const e = validateTab1(); setErrors(e); if (Object.keys(e).length > 0) return }
    setErrors({}); setTab(tab + 1)
  }
  const tryGoTab = (i) => {
    if (i <= tab) { setTab(i); return }
    if (i > tab + 1) return
    tryNextTab()
  }
  const Err = ({ k }) => tried[tab] && errors[k] ? <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>{errors[k]}</div> : null

  const tabComplete = [
    !!(f.name && f.iqama && f.iqamaExpiry && f.nationality && f.occupation),
    true,
    true,
    true
  ]

  // ═══════════════════════════════════════
  // SCREEN 1: HOME
  // ═══════════════════════════════════════
  const tabs = [
    { id: 'worker', title: 'بيانات العامل', Icon: User },
    { id: 'transfer', title: 'بيانات النقل', Icon: ArrowLeftRight },
    { id: 'pricing', title: 'التسعيرة', Icon: Calculator },
    { id: 'review', title: 'مراجعة', Icon: CheckCircle2 }
  ]

  const headerSubtitle = screen === 'home' ? 'حساب تكاليف نقل خدمات العمال والرسوم الحكومية' : (workerMode === 'existing' ? 'عامل مسجّل' : 'عامل جديد') + (f.name ? ` — ${f.name}` : '')

  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(10,10,10,.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }
  const modalBox = { background: '#1a1a1a', borderRadius: 16, width: 'min(880px,95vw)', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.6)', border: '1px solid rgba(201,168,76,.12)' }
  const headerBar = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(201,168,76,.1)', flexShrink: 0, fontFamily: F, direction: 'rtl' }

  if (screen === 'home') return (
    <div onClick={() => onClose && onClose()} style={modalOverlay}><div onClick={e => e.stopPropagation()} style={modalBox}>
    <div style={headerBar}>
      <div><div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.9)' }}>حسبة نقل الكفالة</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{headerSubtitle}</div></div>
      <button onClick={() => onClose && onClose()} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
    </div>
    <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 500 }}>
        {[
          { mode: 'new', title: 'عامل جديد', desc: 'تسجيل بيانات عامل جديد', Icon: Plus },
          { mode: 'existing', title: 'عامل مسجّل مسبقاً', desc: 'البحث برقم الإقامة', Icon: Search }
        ].map(({ mode, title, desc, Icon }) => (
          <button key={mode} onClick={() => { setWorkerMode(mode); if (mode === 'new') { setScreen('form'); setTab(0) } else { setWorkerMode('existing') } }}
            style={{ flex: 1, padding: '28px 20px', borderRadius: 14, border: '1.5px solid ' + (workerMode === mode && mode === 'existing' ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.06)'), background: 'rgba(255,255,255,.02)', cursor: 'pointer', textAlign: 'center', transition: '.2s', fontFamily: F }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(52,131,180,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Icon size={18} color={C.blue} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.85)', marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{desc}</div>
          </button>
        ))}
      </div>

      {workerMode === 'existing' && (
        <div style={{ width: '100%', maxWidth: 500, marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={searchIqama} onChange={e => setSearchIqama(e.target.value)} placeholder="ادخل رقم الإقامة..." maxLength={10}
              style={{ ...sF, flex: 1, direction: 'ltr', textAlign: 'center', fontSize: 16, letterSpacing: 2 }} />
            <button onClick={() => { if (searchIqama.length >= 10) { set('iqama', searchIqama); setScreen('form'); setTab(0) } else { toast && toast('ادخل رقم إقامة صحيح') } }}
              style={{ height: 44, padding: '0 20px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Search size={14} /> بحث
            </button>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.25)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Info size={10} /> سيتم ربط البحث بقاعدة البيانات لاحقاً
          </div>
        </div>
      )}
    </div>
    </div></div>
  )

  // ═══════════════════════════════════════
  // SCREEN 2: FORM WITH TABS
  // ═══════════════════════════════════════
  return (
    <div onClick={() => onClose && onClose()} style={modalOverlay}><div onClick={e => e.stopPropagation()} style={modalBox}>
    <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={headerBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { setScreen('home'); setWorkerMode('new') }} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={16} /></button>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,.9)' }}>حسبة نقل الكفالة</div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{headerSubtitle}</div></div>
        </div>
        <button onClick={() => onClose && onClose()} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
      </div>

      {/* ═══ Step Wizard Bar ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 24px', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
        {tabs.map((t, i) => {
          const active = tab === i
          const done = tabComplete[i] && i < tab
          const circleSize = 36
          const circleColor = done ? C.ok : active ? C.gold : 'rgba(255,255,255,.15)'
          const circleBg = done ? C.ok + '18' : active ? C.gold + '12' : 'transparent'
          const textColor = done ? C.ok : active ? C.gold : 'rgba(255,255,255,.3)'
          return (
            <React.Fragment key={t.id}>
              {/* Connecting line before (not for first) */}
              {i > 0 && <div style={{ flex: 1, height: 2, background: done || active ? C.ok : 'rgba(255,255,255,.08)', borderRadius: 1, margin: '0 4px', marginBottom: 20 }} />}
              {/* Step circle + label */}
              <div onClick={() => tryGoTab(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 60 }}>
                <div style={{ width: circleSize, height: circleSize, borderRadius: '50%', border: `2px solid ${circleColor}`, background: circleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.2s' }}>
                  {done ? <Check size={16} color={C.ok} strokeWidth={3} /> : <span style={{ fontSize: 14, fontWeight: 800, color: circleColor, fontFamily: F }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color: textColor, whiteSpace: 'nowrap' }}>{t.title}</span>
              </div>
            </React.Fragment>
          )
        })}
      </div>

      {/* ═══ Scrollable Content ═══ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

      {/* ═══════════════════════════════════════ */}
      {/* TAB 0: بيانات العامل */}
      {/* ═══════════════════════════════════════ */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><Lbl req>اسم العامل</Lbl><Inp value={f.name} onChange={v => set('name', v)} /><Err k="name"/></div>
              <div><Lbl req>رقم الإقامة</Lbl><Inp value={f.iqama} onChange={v => set('iqama', v.replace(/\D/g,''))} dir="ltr" maxLength={10} /><Err k="iqama"/></div>
              <div><Lbl req>الجنسية</Lbl><Sel value={f.nationality} onChange={v => set('nationality', v)} options={NATIONALITIES} /><Err k="nationality"/></div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <Lbl req>تاريخ انتهاء الإقامة</Lbl>
                  <div style={{display:'flex',gap:0,borderRadius:6,overflow:'hidden',border:'1px solid rgba(255,255,255,.08)'}}>
                    {[{v:'gregorian',l:'ميلادي'},{v:'hijri',l:'هجري'}].map(o=><button key={o.v} onClick={()=>setCalendarType(o.v)} style={{padding:'3px 10px',border:'none',fontSize:9,fontWeight:calendarType===o.v?700:500,color:calendarType===o.v?C.gold:'rgba(255,255,255,.3)',background:calendarType===o.v?'rgba(201,168,76,.1)':'transparent',cursor:'pointer',fontFamily:F}}>{o.l}</button>)}
                  </div>
                </div>
                {calendarType==='gregorian'?<>
                  <DateInp value={f.iqamaExpiry} onChange={v => set('iqamaExpiry', v)} />
                  {hijriExpiry && <div style={{ fontSize: 9, color: '#5b9bd5', marginTop: 3 }}><Calendar size={9} style={{display:'inline',verticalAlign:'middle',marginLeft:3}} /> {hijriExpiry}</div>}
                </>:<>
                  <div style={{display:'flex',gap:6}}>
                    <select value={f._hDay||''} onChange={e=>{const nd={...f,_hDay:e.target.value};if(nd._hDay&&nd._hMonth&&nd._hYear){nd.iqamaExpiry=hijriToGregorian(Number(nd._hYear),Number(nd._hMonth),Number(nd._hDay))};setF(nd)}} style={{...sF,flex:1,textAlign:'center',colorScheme:'dark'}}><option value="">يوم</option>{Array.from({length:30},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}</select>
                    <select value={f._hMonth||''} onChange={e=>{const nd={...f,_hMonth:e.target.value};if(nd._hDay&&nd._hMonth&&nd._hYear){nd.iqamaExpiry=hijriToGregorian(Number(nd._hYear),Number(nd._hMonth),Number(nd._hDay))};setF(nd)}} style={{...sF,flex:2,textAlign:'center',colorScheme:'dark'}}><option value="">شهر</option>{['محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الثانية','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'].map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
                    <select value={f._hYear||''} onChange={e=>{const nd={...f,_hYear:e.target.value};if(nd._hDay&&nd._hMonth&&nd._hYear){nd.iqamaExpiry=hijriToGregorian(Number(nd._hYear),Number(nd._hMonth),Number(nd._hDay))};setF(nd)}} style={{...sF,flex:1,textAlign:'center',colorScheme:'dark'}}><option value="">سنة</option>{getHijriYears().map(y=><option key={y} value={y}>{y}</option>)}</select>
                  </div>
                  {f.iqamaExpiry && <div style={{ fontSize: 9, color: C.gold, marginTop: 3 }}><Calendar size={9} style={{display:'inline',verticalAlign:'middle',marginLeft:3}} /> {f.iqamaExpiry}</div>}
                </>}
                {iqamaExpired && <div style={{ fontSize: 9, color: C.red, marginTop: 3 }}><AlertCircle size={9} style={{display:'inline',verticalAlign:'middle',marginLeft:3}} /> منتهية منذ {expiredDays} يوم</div>}
                <Err k="iqamaExpiry"/>
              </div>
            <div><Lbl>تاريخ الميلاد</Lbl><DateInp value={f.dob} onChange={v => set('dob', v)} /></div>
            <div><Lbl>الجنس</Lbl>
              <ToggleGroup value={f.gender} onChange={v => set('gender', v)} options={[
                { v: 'ذكر', l: 'ذكر', c: C.blue }, { v: 'أنثى', l: 'أنثى', c: '#9b59b6' }
              ]} />
            </div>
            <div><Lbl req>المهنة الحالية</Lbl><Sel value={f.occupation} onChange={v => set('occupation', v)} options={OCCUPATIONS} /><Err k="occupation"/></div>
            <div><Lbl>رقم الجوال</Lbl><Inp value={f.phone} onChange={v => set('phone', v)} dir="ltr" /></div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 1: بيانات النقل */}
      {/* ═══════════════════════════════════════ */}
      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* حالة العامل القانونية */}
          <div>
            <Lbl req>حالة العامل القانونية</Lbl>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[{v:'صالح',l:'صالح',c:C.ok},{v:'متغيب عن العمل',l:'متغيب عن العمل',c:'#e67e22'},{v:'منقطع عن العمل',l:'منقطع عن العمل',c:C.red},{v:'خروج نهائي',l:'خروج نهائي',c:C.blue}].map(o=><button key={o.v} onClick={()=>set('legalStatus',o.v)} style={{height:44,borderRadius:10,border:'1.5px solid '+(f.legalStatus===o.v?(o.c||C.gold)+'40':'rgba(255,255,255,.08)'),background:f.legalStatus===o.v?(o.c||C.gold)+'12':'rgba(255,255,255,.02)',color:f.legalStatus===o.v?(o.c||C.gold):'rgba(255,255,255,.35)',fontFamily:F,fontSize:12,fontWeight:f.legalStatus===o.v?700:500,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,transition:'.2s'}}>{o.l}</button>)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <Lbl>هل يطلب تعديل المهنة؟</Lbl>
              <YesNo value={f.changeProfession} onChange={v => set('changeProfession', v)} />
            </div>
            {f.changeProfession && (
              <div><Lbl>المهنة الجديدة</Lbl><Sel value={f.newOccupation} onChange={v => set('newOccupation', v)} options={OCCUPATIONS} /></div>
            )}
            <div><Lbl>تاريخ انتهاء رخصة العمل</Lbl><DateInp value={f.wpExpiry} onChange={v => set('wpExpiry', v)} /></div>
            <div><Lbl>هل يوجد فترة إشعار؟</Lbl><YesNo value={f.hasNoticePeriod} onChange={v => set('hasNoticePeriod', v)} /></div>
            <div><Lbl>موافقة صاحب العمل الحالي</Lbl><YesNo value={f.employerConsent} onChange={v => set('employerConsent', v)} /></div>
          </div>

          <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <Lbl>كم مرة تم نقل الكفالة؟</Lbl>
            <ToggleGroup value={f.transferCount} onChange={v => set('transferCount', v)} options={[
              { v: '1', l: 'أول مرة', sub: '2,000 ر.س', c: C.ok },
              { v: '2', l: 'ثاني مرة', sub: '4,000 ر.س', c: '#e67e22' },
              { v: '3', l: 'أكثر من مرتين', sub: '6,000 ر.س', c: C.red }
            ]} />
          </div>

          <div>
            <Lbl>عدد أشهر تجديد الإقامة</Lbl>
            <ToggleGroup value={f.renewalMonths} onChange={v => set('renewalMonths', v)} options={[
              { v: '3', l: '3 أشهر', sub: `${Math.round(650 / 12 * 3)} ر.س` },
              { v: '6', l: '6 أشهر', sub: `${Math.round(650 / 12 * 6)} ر.س` },
              { v: '9', l: '9 أشهر', sub: `${Math.round(650 / 12 * 9)} ر.س` },
              { v: '12', l: '12 شهر', sub: '650 ر.س' }
            ]} />
          </div>

          {iqamaExpired && (
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(192,57,43,.06)', border: '1px solid rgba(192,57,43,.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={14} /> غرامة تأخير تجديد الإقامة</div>
              <ToggleGroup value={f.iqamaFineCount} onChange={v => set('iqamaFineCount', v)} options={[
                { v: '1', l: 'المرة الأولى', sub: '500 ر.س', c: '#e67e22' },
                { v: '2', l: 'المرة الثانية', sub: '1,000 ر.س', c: C.red }
              ]} />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 2: التسعيرة */}
      {/* ═══════════════════════════════════════ */}
      {tab === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Auto-calculated fees */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={14} /> رسوم محسوبة تلقائياً</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['رسوم نقل الكفالة', transferFee, `${f.transferCount === '1' ? 'أول' : f.transferCount === '2' ? 'ثاني' : 'ثالث+'} مرة`],
                ['رسوم تجديد الإقامة', iqamaRenewalFee, `${renewalMonths} شهر`],
                ...(iqamaExpired ? [['غرامة تأخير الإقامة', iqamaFineFee, `المرة ${f.iqamaFineCount === '1' ? 'الأولى' : 'الثانية'}`]] : []),
                ...(f.changeProfession ? [['رسوم تغيير المهنة', profChangeFee, null]] : [])
              ].map(([label, amount, note], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(201,168,76,.03)', border: '1px solid rgba(201,168,76,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>{label}</span>
                    {note && <span style={{ fontSize: 9, color: 'rgba(201,168,76,.4)', background: 'rgba(201,168,76,.06)', padding: '2px 6px', borderRadius: 4 }}>{note}</span>}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.gold, direction: 'ltr' }}>{nm(amount)} ر.س</span>
                </div>
              ))}
              {f.changeProfession && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Lbl>رسوم تغيير المهنة (قابل للتعديل)</Lbl>
                    <div style={{ width: 120 }}><input type="number" value={f.profChangeInput} onChange={e => set('profChangeInput', e.target.value)} style={{ ...sF, height: 36, fontSize: 13, fontWeight: 700, textAlign: 'center', direction: 'ltr' }} /></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual input fees */}
          <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={14} /> رسوم يدوية</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Work permit */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>رخصة العمل (شهرياً)</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.blue, direction: 'ltr' }}>{nm(workPermitFee)} ر.س ({renewalMonths} شهر)</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="number" value={f.workPermitRate} onChange={e => set('workPermitRate', e.target.value)} style={{ ...sF, height: 36, width: 100, textAlign: 'center', direction: 'ltr', fontSize: 13, fontWeight: 700 }} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>ر.س/شهر</span>
                  <div style={{ flex: 1 }} />
                  {[['100', 'مخفض', C.ok], ['400', 'عادي', C.gold], ['800', 'تجاري', C.red]].map(([v, l, c]) => (
                    <button key={v} onClick={() => set('workPermitRate', v)} style={{
                      height: 28, padding: '0 10px', borderRadius: 6,
                      border: '1px solid ' + (f.workPermitRate === v ? c + '40' : 'rgba(255,255,255,.06)'),
                      background: f.workPermitRate === v ? c + '12' : 'transparent',
                      color: f.workPermitRate === v ? c : 'rgba(255,255,255,.3)',
                      fontFamily: F, fontSize: 9, fontWeight: 600, cursor: 'pointer'
                    }}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Medical + Office */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>التأمين الطبي</div>
                  <input type="number" value={f.medicalFee} onChange={e => set('medicalFee', e.target.value)} style={{ ...sF, height: 38, fontSize: 14, fontWeight: 700, textAlign: 'center', direction: 'ltr' }} />
                </div>
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', marginBottom: 6 }}>رسوم المكتب</div>
                  <input type="number" value={f.officeFee} onChange={e => set('officeFee', e.target.value)} style={{ ...sF, height: 38, fontSize: 14, fontWeight: 700, textAlign: 'center', direction: 'ltr' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Absher balance */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Info size={14} color="rgba(255,255,255,.3)" />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', flex: 1 }}>العامل يدفع من رصيد أبشر الشخصي</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!f.absherDeduct} onChange={e => set('absherDeduct', e.target.checked)} style={{ accentColor: C.gold, width: 16, height: 16 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: f.absherDeduct ? C.gold : 'rgba(255,255,255,.3)' }}>تفعيل</span>
            </label>
          </div>

          {/* Extra fees */}
          <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9b59b6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> رسوم إضافية</div>
            {f.extras.map((ex, i) => (
              <div key={i} style={{ marginBottom: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{ex.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, direction: 'ltr' }}>{nm(ex.amount)} ر.س</span>
                  <button onClick={() => removeExtra(i)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(192,57,43,.12)', background: 'rgba(192,57,43,.04)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                </div>
                <input value={ex.note||''} onChange={e=>{const up=[...f.extras];up[i]={...up[i],note:e.target.value};set('extras',up)}} placeholder="ملاحظة..." style={{...sF,height:28,fontSize:10,marginTop:4,background:'transparent',border:'1px solid rgba(255,255,255,.03)',padding:'0 8px'}}/>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={extraName} onChange={e => setExtraName(e.target.value)} placeholder="اسم الرسم" style={{ ...sF, flex: 1, height: 38, fontSize: 11 }} />
              <input value={extraAmount} onChange={e => setExtraAmount(e.target.value)} placeholder="المبلغ" type="number" style={{ ...sF, width: 100, height: 38, fontSize: 11, textAlign: 'center', direction: 'ltr' }} />
              <button onClick={addExtra} style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid rgba(155,89,182,.2)', background: 'rgba(155,89,182,.08)', color: '#9b59b6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={16} /></button>
            </div>
          </div>

          {/* ═══ Grand Total Card ═══ */}
          <div style={{ padding: '20px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))', border: '1.5px solid rgba(201,168,76,.15)', marginTop: 8 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: 'rgba(201,168,76,.5)', marginBottom: 4 }}>الإجمالي</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: C.gold, direction: 'ltr' }}>{nm(grandTotal)} <span style={{ fontSize: 14 }}>ر.س</span></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
              {[
                ['النقل', transferFee, C.red],
                ['الإقامة', iqamaRenewalFee + iqamaFineFee, C.blue],
                ['رخصة العمل', workPermitFee, '#e67e22'],
                ['المكتب', officeFee, '#9b59b6']
              ].map(([l, v, c], i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,.3)', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{nm(v)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,.2)', textAlign: 'center', marginBottom: 14 }}>* التقدير أولي — الرسوم الفعلية قد تختلف</div>
            <button onClick={() => { toast && toast('تم حفظ الحسبة') }}
              style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,' + C.ok + ',' + C.ok + 'cc)', color: '#fff', fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CheckCircle2 size={18} /> حفظ وإصدار العرض
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 3: مراجعة */}
      {/* ═══════════════════════════════════════ */}
      {tab === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Worker summary */}
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(52,131,180,.04)', border: '1px solid rgba(52,131,180,.1)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><User size={14} /> بيانات العامل</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['الاسم', f.name], ['رقم الإقامة', f.iqama], ['الجنسية', f.nationality], ['المهنة', f.occupation], ['الجنس', f.gender], ['الوضع القانوني', f.legalStatus], ['انتهاء الإقامة', f.iqamaExpiry ? f.iqamaExpiry + (hijriExpiry ? ' — ' + hijriExpiry : '') : '—'], ['الجوال', f.phone || '—']].map(([l, v], i) => (
                <div key={i} style={{ fontSize: 11 }}><span style={{ color: 'rgba(255,255,255,.4)' }}>{l}: </span><span style={{ fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{v || '—'}</span></div>
              ))}
            </div>
          </div>

          {/* Transfer summary */}
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(201,168,76,.04)', border: '1px solid rgba(201,168,76,.1)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeftRight size={14} /> بيانات النقل</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['عدد مرات النقل', f.transferCount === '1' ? 'أول مرة' : f.transferCount === '2' ? 'ثاني مرة' : 'أكثر من مرتين'], ['أشهر التجديد', f.renewalMonths + ' شهر'], ['تعديل مهنة', f.changeProfession ? 'نعم — ' + (f.newOccupation || '') : 'لا'], ['فترة إشعار', f.hasNoticePeriod ? 'نعم' : 'لا'], ['موافقة صاحب العمل', f.employerConsent ? 'نعم' : 'لا'], ...(iqamaExpired ? [['غرامة التأخير', f.iqamaFineCount === '1' ? 'المرة الأولى — 500 ر.س' : 'المرة الثانية — 1,000 ر.س']] : [])].map(([l, v], i) => (
                <div key={i} style={{ fontSize: 11 }}><span style={{ color: 'rgba(255,255,255,.4)' }}>{l}: </span><span style={{ fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{v}</span></div>
              ))}
            </div>
          </div>

          {/* Cost summary */}
          <div style={{ padding: '16px 18px', borderRadius: 12, background: 'rgba(39,160,70,.04)', border: '1px solid rgba(39,160,70,.1)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ok, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Calculator size={14} /> ملخص التكاليف</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[['رسوم نقل الكفالة', transferFee], ['تجديد الإقامة', iqamaRenewalFee], ...(iqamaFineFee > 0 ? [['غرامة التأخير', iqamaFineFee]] : []), ['رخصة العمل', workPermitFee], ...(profChangeFee > 0 ? [['تغيير المهنة', profChangeFee]] : []), ['التأمين الطبي', medicalFee], ['رسوم المكتب', officeFee], ...f.extras.map(ex => [ex.name, Number(ex.amount)])].map(([l, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,.03)', fontSize: 11 }}>
                  <span style={{ color: 'rgba(255,255,255,.5)' }}>{l}</span>
                  <span style={{ fontWeight: 700, color: 'rgba(255,255,255,.8)', direction: 'ltr' }}>{nm(v)} ر.س</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grand total */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '18px', borderRadius: 14, background: 'linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))', border: '1.5px solid rgba(201,168,76,.15)' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: C.red, marginBottom: 4 }}>إجمالي التكلفة</div><div style={{ fontSize: 26, fontWeight: 900, color: C.red }}>{nm(grandTotal)}</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: C.gold, marginBottom: 4 }}>المطلوب من العميل</div><input type="number" value={f.clientCharge||''} onChange={e=>set('clientCharge',e.target.value)} style={{ ...sF, height: 40, fontSize: 18, fontWeight: 800, color: C.gold, background: 'rgba(201,168,76,.08)', border: '1.5px solid rgba(201,168,76,.25)', textAlign: 'center' }} /></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 10, color: (Number(f.clientCharge||0) - grandTotal) >= 0 ? C.ok : C.red, marginBottom: 4 }}>الربح</div><div style={{ fontSize: 26, fontWeight: 900, color: (Number(f.clientCharge||0) - grandTotal) >= 0 ? C.ok : C.red }}>{nm(Number(f.clientCharge||0) - grandTotal)}</div></div>
          </div>

          {/* Notes */}
          <div>
            <Lbl>ملاحظات</Lbl>
            <textarea value={f.notes||''} onChange={e=>set('notes',e.target.value)} rows={3} style={{ ...sF, height: 'auto', padding: 12, resize: 'vertical', textAlign: 'right' }} placeholder="ملاحظات إضافية..." />
          </div>

          {/* Save button */}
          <button onClick={() => { toast && toast('تم حفظ الحسبة') }}
            style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,' + C.ok + ',' + C.ok + 'cc)', color: '#fff', fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <CheckCircle2 size={18} /> حفظ وإصدار العرض
          </button>
        </div>
      )}

      </div>{/* end scrollable */}

      {/* ═══ Footer Navigation ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,.06)', flexShrink: 0 }}>
        <button onClick={() => tab > 0 ? setTab(tab - 1) : setScreen('home')}
          style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.08)', background: 'transparent', color: 'rgba(255,255,255,.4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronRight size={14} /> {tab > 0 ? 'السابق' : 'رجوع'}
        </button>
        {tab < 3 && (
          <button onClick={tryNextTab}
            style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            التالي <ChevronLeft size={14} />
          </button>
        )}
      </div>
    </div>
    </div></div>
  )
}
