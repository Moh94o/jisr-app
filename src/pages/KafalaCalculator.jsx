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
export default function KafalaCalculator({ toast, lang }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e

  // Screen: 'home' | 'form'
  const [screen, setScreen] = useState('home')
  const [tab, setTab] = useState(0)
  const [workerMode, setWorkerMode] = useState('new') // 'new' | 'existing'
  const [searchIqama, setSearchIqama] = useState('')

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

  const tabComplete = [
    !!(f.name && f.iqama),
    true,
    true
  ]

  // ═══════════════════════════════════════
  // SCREEN 1: HOME
  // ═══════════════════════════════════════
  if (screen === 'home') return (
    <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(201,168,76,.1)', border: '1.5px solid rgba(201,168,76,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <ArrowLeftRight size={24} color={C.gold} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>حسبة نقل الكفالة</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>حساب تكاليف نقل خدمات العمال والرسوم الحكومية</div>
      </div>

      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 500 }}>
        {[
          { mode: 'new', title: 'عامل جديد', desc: 'تسجيل بيانات عامل جديد', Icon: Plus },
          { mode: 'existing', title: 'عامل مسجّل مسبقاً', desc: 'البحث برقم الإقامة', Icon: Search }
        ].map(({ mode, title, desc, Icon }) => (
          <button key={mode} onClick={() => { setWorkerMode(mode); if (mode === 'new') { setScreen('form'); setTab(0) } else { setWorkerMode('existing') } }}
            style={{ flex: 1, padding: '28px 20px', borderRadius: 14, border: '1.5px solid ' + (workerMode === mode && mode === 'existing' ? 'rgba(201,168,76,.3)' : 'rgba(255,255,255,.06)'), background: 'rgba(255,255,255,.02)', cursor: 'pointer', textAlign: 'center', transition: '.2s', fontFamily: F }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(201,168,76,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Icon size={18} color={C.gold} />
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
  )

  // ═══════════════════════════════════════
  // SCREEN 2: FORM WITH TABS
  // ═══════════════════════════════════════
  const tabs = [
    { id: 'worker', title: 'بيانات العامل', Icon: User },
    { id: 'procedures', title: 'الإجراءات', Icon: FileText },
    { id: 'pricing', title: 'التسعيرة', Icon: Calculator }
  ]

  return (
    <div dir="rtl" style={{ fontFamily: F, color: 'rgba(255,255,255,.85)' }}>
      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => { setScreen('home'); setWorkerMode('new') }}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} />
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>حسبة نقل الكفالة</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.35)' }}>{workerMode === 'existing' ? 'عامل مسجّل' : 'عامل جديد'}{f.name && ` — ${f.name}`}</div>
          </div>
        </div>
      </div>

      {/* ═══ Tab Bar ═══ */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,.06)' }}>
        {tabs.map((t, i) => {
          const active = tab === i
          const done = tabComplete[i] && i < tab
          return (
            <button key={t.id} onClick={() => setTab(i)} style={{
              flex: 1, height: 48, border: 'none', fontFamily: F, fontSize: 12, fontWeight: active ? 700 : 500,
              color: active ? C.gold : done ? C.ok : 'rgba(255,255,255,.3)',
              background: active ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.02)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: '.2s',
              borderBottom: active ? `2.5px solid ${C.gold}` : '2.5px solid transparent'
            }}>
              {done ? <CheckCircle2 size={14} /> : <t.Icon size={14} />}
              {t.title}
            </button>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* TAB 0: بيانات العامل */}
      {/* ═══════════════════════════════════════ */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><Lbl req>اسم العامل</Lbl><Inp value={f.name} onChange={v => set('name', v)} /></div>
            <div><Lbl req>رقم الإقامة</Lbl><Inp value={f.iqama} onChange={v => set('iqama', v)} dir="ltr" maxLength={10} /></div>
            <div><Lbl>رقم الجوال</Lbl><Inp value={f.phone} onChange={v => set('phone', v)} dir="ltr" /></div>
            <div>
              <Lbl>تاريخ انتهاء الإقامة</Lbl>
              <DateInp value={f.iqamaExpiry} onChange={v => set('iqamaExpiry', v)} />
              {hijriExpiry && <div style={{ fontSize: 10, color: 'rgba(201,168,76,.5)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={10} /> {hijriExpiry}</div>}
              {iqamaExpired && <div style={{ fontSize: 10, color: C.red, marginTop: 4, padding: '4px 10px', borderRadius: 6, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.12)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={10} /> منتهية منذ {expiredDays} يوم</div>}
            </div>
            <div><Lbl>تاريخ الميلاد</Lbl><DateInp value={f.dob} onChange={v => set('dob', v)} /></div>
            <div><Lbl req>الجنسية</Lbl><Sel value={f.nationality} onChange={v => set('nationality', v)} options={NATIONALITIES} /></div>
            <div><Lbl>الجنس</Lbl>
              <ToggleGroup value={f.gender} onChange={v => set('gender', v)} options={[
                { v: 'ذكر', l: 'ذكر', c: C.blue }, { v: 'أنثى', l: 'أنثى', c: '#9b59b6' }
              ]} />
            </div>
            <div><Lbl>المهنة الحالية</Lbl><Sel value={f.occupation} onChange={v => set('occupation', v)} options={OCCUPATIONS} /></div>
          </div>
          <div>
            <Lbl>الوضع القانوني</Lbl>
            <ToggleGroup value={f.legalStatus} onChange={v => set('legalStatus', v)} options={[
              { v: 'نظامي', l: 'نظامي', c: C.ok },
              { v: 'غير نظامي', l: 'غير نظامي', c: '#e67e22' },
              { v: 'هارب', l: 'هارب', c: C.red }
            ]} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 1: الإجراءات */}
      {/* ═══════════════════════════════════════ */}
      {tab === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                <span style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,.7)' }}>{ex.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.gold, direction: 'ltr' }}>{nm(ex.amount)} ر.س</span>
                <button onClick={() => removeExtra(i)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid rgba(192,57,43,.12)', background: 'rgba(192,57,43,.04)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
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

      {/* ═══ Footer Navigation ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.05)' }}>
        <button onClick={() => tab > 0 ? setTab(tab - 1) : setScreen('home')}
          style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.08)', background: 'transparent', color: 'rgba(255,255,255,.4)', fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ChevronRight size={14} /> {tab > 0 ? 'السابق' : 'رجوع'}
        </button>
        {tab < 2 && (
          <button onClick={() => setTab(tab + 1)}
            style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(201,168,76,.2)', background: 'rgba(201,168,76,.12)', color: C.gold, fontFamily: F, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            التالي <ChevronLeft size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
