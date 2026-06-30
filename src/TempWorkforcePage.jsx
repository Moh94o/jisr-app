import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import BackButton from './components/BackButton'
import { can as canPerm, can, cardVisible, canCardBtn } from './lib/permissions.js'
import { UserPlus, Building2, Search, X, Hash, FileText, ShieldCheck, Users, MapPin, Check, Plus, Pencil, Trash2, Phone, ChevronLeft, ChevronRight, HeartPulse, RefreshCw, AlertCircle, LogOut } from 'lucide-react'
import { Modal as FKModal, ModalSection, ActionButton, SuccessView, GRID, TextField, IdField, DateField, Select, FileField, PhoneField, PhoneListField, EmptyState } from './components/ui/FormKit.jsx'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#D4A017',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 24

const num = (v) => Number(v || 0).toLocaleString('en-US')
// صيغة العدد العربية: 3–10 تأخذ الجمع، وغيرها المفرد (نفس منطق صفحة المنشآت).
const arCount = (n, one, few) => (Number(n) >= 3 && Number(n) <= 10) ? few : one
const fmtDate = (s) => { if (!s) return '—'; try { return new Date(s).toISOString().slice(0,10) } catch { return '—' } }
// جوال: مخزَّن بصيغة 9665XXXXXXXX؛ الحقول تُدخِل/تُخرِج المحلّي 5XXXXXXXX، والعرض 05XXXXXXXX.
const phoneLocal = (v) => String(v || '').replace(/\D/g, '').replace(/^966/, '').replace(/^0/, '').slice(-9)
const fmtMobile = (v) => { const s = phoneLocal(v); return s ? '0' + s : '' }
// تاريخ + وقت لسجل التعديلات (نفس صيغة صفحة المنشآت/الفواتير).
const fmtDateTime = (iso) => {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch { return '—' }
}
// تسميات حقول العامل لعرضها في سجل التعديلات.
const WORKER_LBL = {
  name: ['اسم العامل', 'Worker name'],
  nationality_id: ['الجنسية', 'Nationality'],
  occupation_id: ['المهنة الرسمية', 'Official Occupation'],
  official_occupation_id: ['المهنة الفعلية', 'Actual Occupation'],
  official_mobile: ['رقم جوال ابشر', 'Absher mobile'],
  billing_mobiles: ['أرقام جوال الفواتير', 'Billing mobiles'],
  birth_date: ['تاريخ الميلاد', 'Date of birth'],
  iqama_number: ['رقم الإقامة', 'Iqama no.'],
  iqama_expiry_date: ['تاريخ انتهاء الإقامة', 'Iqama expiry'],
  work_permit_expiry: ['تاريخ انتهاء كرت العمل', 'Work permit expiry'],
  border_number: ['رقم الحدود', 'Border no.'],
  passport_number: ['رقم الجواز', 'Passport no.'],
  passport_expiry: ['تاريخ انتهاء الجواز', 'Passport expiry'],
  insurance_company: ['شركة التأمين', 'Insurance company'],
  insurance_policy_number: ['رقم البوليصة', 'Policy no.'],
  insurance_expiry_date: ['تاريخ انتهاء التأمين', 'Insurance expiry'],
  hq_city_id: ['مدينة المقر', 'HQ city'],
  exit_visa_type: ['نوع تأشيرة الخروج', 'Exit visa type'],
  exit_visa_number: ['رقم التأشيرة', 'Visa no.'],
  exit_visa_expiry: ['تاريخ انتهاء التأشيرة', 'Visa expiry'],
  final_exit_kind: ['نوع الخروج النهائي', 'Final exit kind'],
  muqeem_file: ['ملف مقيم', 'Muqeem file'],
  work_visa_file: ['ملف تأشيرة العمل', 'Work visa file'],
  work_permit_file: ['ملف رخصة العمل', 'Work permit file'],
  exit_visa_file: ['ملف التأشيرة', 'Visa file'],
}
const fmtAgo = (iso, isAr) => {
  if (!iso) return '—'
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return isAr ? 'الآن' : 'now'
  if (d < 3600) return isAr ? `قبل ${Math.floor(d/60)}د` : `${Math.floor(d/60)}m`
  if (d < 86400) return isAr ? `قبل ${Math.floor(d/3600)}س` : `${Math.floor(d/3600)}h`
  return isAr ? `قبل ${Math.floor(d/86400)}ي` : `${Math.floor(d/86400)}d`
}
const daysUntil = (iso) => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

// العمر بالسنوات الكاملة من تاريخ الميلاد — يُحسب آلياً (لا يُخزَّن).
const calcAge = (iso) => {
  if (!iso) return null
  const b = new Date(iso); if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 && age < 150 ? age : null
}

const cardChrome = {
  borderRadius: 14,
  background: 'var(--card-grad2)',
  border: '1px solid var(--bd)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
  overflow: 'hidden',
}
const cardHeader = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 22px',
  borderBottom: '1px solid var(--bd)',
}
const cardTitle = { fontSize: 12, color: 'var(--tx2)', fontWeight: 700, letterSpacing: '.2px' }

const STATUS_THEME = {
  active:    { c: C.ok,     label_ar: 'نشط',     label_en: 'Active' },
  suspended: { c: C.orange, label_ar: 'معلّق',   label_en: 'Suspended' },
}
const themeForStatus = (s) => STATUS_THEME[s] || { c: C.gray, label_ar: s || '—', label_en: s || '—' }

const NAT_CODES = {
  'أردني':'JO','أفغاني':'AF','افغانستان':'AF','أوغندي':'UG','إثيوبي':'ET','إندونيسي':'ID','باكستاني':'PK','باكستان':'PK','بنغلاديشي':'BD','بنغلادش':'BD',
  'تركي':'TR','تونسي':'TN','سريلانكي':'LK','سعودي':'SA','السعودية':'SA','سوداني':'SD','السودان':'SD','سوري':'SY',
  'فلبيني':'PH','كيني':'KE','مصري':'EG','مصر':'EG','مغربي':'MA','ميانمار':'MM','نيبالي':'NP','نيبال':'NP','هندي':'IN','الهند':'IN','يمني':'YE','اليمن':'YE','بريطانيا':'GB',
}
const NatFlag = ({ nationality, size = 18 }) => {
  const cc = NAT_CODES[(nationality || '').trim()]
  if (!cc) return null
  return <img src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`} alt={nationality} title={nationality}
    style={{ width: size, height: Math.round(size * .72), objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
    onError={e => { e.target.style.display = 'none' }} />
}

// زر النسخ — نفس تصميم الفواتير/المنشآت (NumberRow): بلا توستر، يتحوّل إلى
// علامة صح خضراء لمدة 1.5ث، وتمرير الفأرة يحوّل اللون إلى الذهبي.
const CopyBtn = ({ value, T }) => {
  const [copied, setCopied] = useState(false)
  const onCopy = async (e) => {
    e.stopPropagation()
    if (value == null || value === '') return
    try {
      await navigator.clipboard?.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard غير متاح — تجاهل بصمت */ }
  }
  return (
    <button type="button" onClick={onCopy} title={T ? T('نسخ', 'Copy') : 'Copy'}
      style={{ width: 16, height: 16, padding: 0, border: 'none', background: 'transparent', color: copied ? C.ok : 'var(--tx5)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, transition: 'color .15s', flexShrink: 0 }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.color = C.gold }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.color = 'var(--tx5)' }}>
      {copied ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
    </button>
  )
}

const Badge = ({ theme, T }) => theme ? (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: theme.c + '18', border: '1px solid ' + theme.c + '38', color: theme.c, fontSize: 10.5, fontWeight: 700 }}>
    <span style={{ width: 5, height: 5, borderRadius: '50%', background: theme.c, boxShadow: '0 0 5px ' + theme.c }} />
    {T(theme.label_ar, theme.label_en)}
  </span>
) : null

// Iqama remaining-days cell. Renders the expiry date (14px) on top and a plain
// coloured text line below — `N يوم متبقي` if still valid, `N يوم مضى` if expired.
// No chip/background — same plain-text style as the facilities date cell.
//
// Color thresholds:
//   green  → more than 30 days remaining
//   gold   → 1–30 days remaining (renewal window)
//   red    → expired (today or past) — counter shows days since expiry
const IqamaCell = ({ iso, T }) => {
  const d = daysUntil(iso)
  if (d == null) return <span style={{ color: 'var(--tx5)', fontSize: 14 }}>—</span>
  let c = C.ok
  if (d <= 0) c = C.red
  else if (d <= 30) c = C.gold
  const isExpired = d <= 0
  const value = Math.abs(d)
  const wordAr = isExpired ? 'يوم مضى' : 'يوم متبقي'
  const wordEn = isExpired ? 'd ago' : 'd left'
  const tooltip = T(`${value} ${wordAr}`, `${value} ${wordEn}`)
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 14, color: c, fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(iso)}</span>
      <span title={tooltip} style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 4,
        color: c, fontWeight: 600, fontSize: 10,
        direction: 'ltr', fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontSize: 9.5, opacity: .85 }}>{T(wordAr, wordEn)}</span>
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{value}</span>
      </span>
    </div>
  )
}

// Filter button style — matches SbcFacilities btnFilter
const btnFilter = (active) => ({
  height: 44, padding: '0 16px', borderRadius: 12,
  background: active ? 'rgba(212,160,23,.12)' : 'var(--card-grad2)',
  border: '1px solid ' + (active ? 'rgba(212,160,23,.3)' : 'var(--bd)'),
  color: active ? C.gold : 'var(--tx2)',
  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F,
  display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box',
})

/* ═══ منتقي منشأة العامل — بحث + كروت زجاجية بنفس تصميم اختيار العميل في الفاتورة ═══ */
// خلية معلومة داخل الكرت (الرقم الموحّد / التأمينات / الموارد …) — أيقونة + تسمية + قيمة LTR.
const FacInfoBox = ({ Icon, label, value }) => value ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, background: 'rgba(0,0,0,.18)', border: '1px solid var(--bd)', minWidth: 0 }}>
    <Icon size={12} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <span style={{ fontSize: 8.5, color: 'var(--tx5)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: 'var(--tx1)', fontWeight: 600, direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  </div>
) : null
// أفاتار المنشأة — أيقونة مبنى داخل مربّع، يتلوّن ذهبياً عند الاختيار.
const FacAvatar = ({ size, sel }) => (
  <div style={{ width: size, height: size, borderRadius: 12, background: 'rgba(0,0,0,.25)', border: sel ? '1.5px solid rgba(212,160,23,.4)' : '1px solid rgba(255,255,255,.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sel ? '0 2px 8px rgba(212,160,23,.15)' : 'none' }}>
    <Building2 size={Math.round(size * 0.5)} strokeWidth={1.7} color={sel ? C.gold : 'rgba(255,255,255,.5)'} />
  </div>
)
// تسمية الفرع: «كود الفرع — المدينة» إن وُجدت.
const facBranchLabel = (f, T) => f?.branch ? [f.branch.branch_code, f.branch.city ? T(f.branch.city.name_ar, f.branch.city.name_en || f.branch.city.name_ar) : null].filter(Boolean).join(' — ') : null
// تسمية نوع تأشيرة الخروج: خروج وعودة / خروج نهائي.
const exitVisaTypeLabel = (t, T = (a) => a) => t === 'exit_reentry' ? T('خروج وعودة', 'Exit & Re-entry') : t === 'final_exit' ? T('خروج نهائي', 'Final Exit') : null
// نوع الخروج النهائي: دائم / مؤقت.
const finalExitKindLabel = (k, T = (a) => a) => k === 'permanent' ? T('دائمة', 'Permanent') : k === 'temporary' ? T('مؤقتة', 'Temporary') : null

// ═══ استعلام التأمين الطبي (CHI) — كابتشا مثل تسعيرة تجديد الإقامة ═══
const CHI_FN_URL = '/.netlify/functions/check-chi-insurance'
const CHI_CAPTCHA_TTL = 120
const CHI_MAX_ATTEMPTS = 3
// توحيد تاريخ الانتهاء لصيغة YYYY-MM-DD (CHI قد يعيد YYYY/M/D أو D/M/YYYY)
const chiNormDate = s => {
  if (!s) return ''
  const t = String(s).trim()
  let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
  return ''
}
const ChiCountdown = ({ captchaKey, onExpire, color = '#3bb27a' }) => {
  const [rem, setRem] = useState(CHI_CAPTCHA_TTL)
  const fired = useRef(false)
  useEffect(() => {
    fired.current = false; setRem(CHI_CAPTCHA_TTL)
    const start = Date.now()
    const iv = setInterval(() => {
      const r = Math.max(0, CHI_CAPTCHA_TTL - Math.floor((Date.now() - start) / 1000))
      setRem(r)
      if (r === 0 && !fired.current) { fired.current = true; clearInterval(iv); onExpire && onExpire() }
    }, 250)
    return () => clearInterval(iv)
  }, [captchaKey])
  const urgent = rem <= 10
  return <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: urgent ? C.red : color, border: `2px solid ${urgent ? 'rgba(192,57,43,.4)' : 'rgba(59,178,122,.35)'}` }}>{rem}</div>
}

// المنتقي: حقل بحث ثم كروت نتائج؛ وعند الاختيار يُستبدل بكرت المنشأة كاملاً + زر إلغاء.
function FacilityPicker({ facilities, value, onChange, T }) {
  const [q, setQ] = useState('')
  const selected = facilities.find(f => f.id === value) || null
  // المنشآت المشطوبة لا تُعرض كخيار لإسناد عامل جديد.
  const active = facilities.filter(f => !f.struck_off)
  const ql = q.trim().toLowerCase()
  const results = ql
    ? active.filter(f =>
        (f.name_ar || '').toLowerCase().includes(ql) ||
        (f.name_en || '').toLowerCase().includes(ql) ||
        [f.unified_number, f.gosi_number, f.hrsd_number, f.cr_number].filter(Boolean).some(n => String(n).includes(ql)))
    : active
  const shown = results.slice(0, ql ? 6 : 2)

  // ── كرت المنشأة المختارة — كامل البيانات (موحّد / سجل تجاري / تأمينات / موارد / فرع) ──
  if (selected) {
    const both = selected.name_ar && selected.name_en
    return (
      <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', padding: 16, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button onClick={() => { onChange(null); setQ('') }} title={T('تغيير المنشأة', 'Change facility')}
          style={{ position: 'absolute', top: 8, left: 8, height: 28, padding: '0 12px', borderRadius: 8, background: 'rgba(232,114,101,.12)', border: '1px solid rgba(232,114,101,.35)', color: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, transition: '.15s', fontFamily: F, fontSize: 12, fontWeight: 600 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,114,101,.22)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(232,114,101,.12)' }}>
          {T('تغيير', 'Change')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <FacAvatar size={52} sel />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{selected.name_ar || selected.name_en || '—'}</span>
            </div>
            {both && <span style={{ fontSize: 11.5, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .75 }}>{selected.name_en}</span>}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <FacInfoBox Icon={Hash} label={T('الرقم الموحّد', 'Unified No.')} value={selected.unified_number} />
          <FacInfoBox Icon={FileText} label={T('السجل التجاري', 'CR No.')} value={selected.cr_number} />
          <FacInfoBox Icon={ShieldCheck} label={T('رقم التأمينات', 'GOSI No.')} value={selected.gosi_number} />
          <FacInfoBox Icon={Users} label={T('الموارد البشرية', 'HRSD No.')} value={selected.hrsd_number} />
          <FacInfoBox Icon={MapPin} label={T('الفرع', 'Branch')} value={facBranchLabel(selected, T)} />
        </div>
      </div>
    )
  }

  // ── وضع البحث: حقل + كروت نتائج مختصرة قابلة للضغط للاختيار ──
  const G = { base: 'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))', baseB: 'rgba(255,255,255,.08)', hover: 'linear-gradient(135deg,rgba(212,160,23,.08),rgba(255,255,255,.02))', hoverB: 'rgba(212,160,23,.25)' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`.fac-results::-webkit-scrollbar{width:0;height:0;display:none}`}</style>
      <div style={{ position: 'relative' }}>
        <Search size={18} color="var(--tx4)" strokeWidth={2} style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus
          placeholder={T('ابحث بالاسم أو الرقم الموحّد أو التأمينات أو الموارد البشرية…', 'Search by name, unified, GOSI or HRSD number…')}
          style={{ width: '100%', height: 42, padding: '0 14px 0 44px', borderRadius: 11, background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: 13, fontWeight: 600, fontFamily: F, outline: 'none', textAlign: 'right', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', boxSizing: 'border-box' }} />
      </div>
      {shown.length > 0 ? (
        <div className="fac-results" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 232, overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {shown.map(f => {
            const both = f.name_ar && f.name_en
            return (
              <div key={f.id} onClick={() => { onChange(f.id); setQ('') }}
                onMouseEnter={e => { e.currentTarget.style.background = G.hover; e.currentTarget.style.borderColor = G.hoverB }}
                onMouseLeave={e => { e.currentTarget.style.background = G.base; e.currentTarget.style.borderColor = G.baseB }}
                style={{ cursor: 'pointer', border: `1px solid ${G.baseB}`, background: G.base, boxShadow: '0 4px 16px rgba(0,0,0,.28)', transition: 'all .22s ease', padding: 8, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FacAvatar size={30} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name_ar || f.name_en || '—'}</span>
                    {both && <span style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name_en}</span>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  <FacInfoBox Icon={Hash} label={T('الرقم الموحّد', 'Unified No.')} value={f.unified_number} />
                  <FacInfoBox Icon={Users} label={T('رقم الموارد البشرية', 'HRSD No.')} value={f.hrsd_number} />
                  <FacInfoBox Icon={ShieldCheck} label={T('رقم التأمينات', 'GOSI No.')} value={f.gosi_number} />
                </div>
              </div>
            )
          })}
          {results.length > shown.length && (
            <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 600, textAlign: 'center', padding: '4px 0' }}>
              {T(`+${results.length - shown.length} منشأة أخرى — حدّد بحثك أكثر`, `+${results.length - shown.length} more — refine your search`)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '24px 20px', borderRadius: 12, border: '1px dashed var(--bd)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(212,160,23,.08)', border: '1px dashed rgba(212,160,23,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} strokeWidth={1.7} color="rgba(212,160,23,.65)" />
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600 }}>{T('لا توجد منشأة بهذا البحث', 'No facility matches this search')}</div>
        </div>
      )}
    </div>
  )
}

// هيكل تحميل — يظهر عند أول جلب للبيانات (مثل صفحة المنشآت تماماً) فلا تظهر
// بطاقات بأصفار. لمعان متحرّك لبطاقات المؤشرات ولصفوف الجدول حتى تجهز البيانات.
function WorkforceSkeleton() {
  const shimmer = {
    display: 'inline-block', borderRadius: 6,
    background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.11) 37%, rgba(255,255,255,.04) 63%)',
    backgroundSize: '400% 100%', animation: 'wf-shimmer 1.4s ease infinite',
  }
  const bar = (w, h = 11) => <span style={{ ...shimmer, width: w, height: h }} />
  const cols = ['22%', '16%', '13%', '18%', '18%', '13%']
  return (
    <div>
      <style>{`@keyframes wf-shimmer{0%{background-position:100% 0}100%{background-position:-100% 0}}@keyframes wf-spin{to{transform:rotate(360deg)}}`}</style>
      {/* بطاقات المؤشرات — ٣ بطاقات بنفس تخطيط الصفحة الحقيقي */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ padding: '18px 22px', borderRadius: 16, background: 'var(--card-grad2)', border: '1px solid var(--bd)', minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10 }}>
            {bar('45%', 16)}{bar('55%', 34)}{bar('70%', 11)}
          </div>
        ))}
      </div>
      {/* هيكل الجدول — ٨ صفوف */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bd)', background: '#161616' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: cols.join(' '), alignItems: 'center', gap: 8, padding: '13px 12px', borderBottom: i < 7 ? '1px solid var(--bd2)' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>{bar('72%')}{bar('45%', 8)}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('70%')}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('55%')}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('65%')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>{bar('60%')}{bar('40%', 8)}</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>{bar('45%')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export default function TempWorkforcePage({ sb, toast, lang, user, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [workers, setWorkers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)  // يبدأ محمّلاً ليظهر هيكل التحميل فوراً عند فتح الصفحة
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState({ status: '', iqama: '', nationality: '', facility: '', occupation: '' })
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState(null)
  // View lens — like SbcFacilities tableView (SBC | GOSI). For workers it's
  // "all" vs "active" vs "suspended".
  const [viewLens, setViewLens] = useState('all')
  // Manual "إضافة عامل مؤقت" modal — inserts straight into the `temproryworkers` table.
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addErr, setAddErr] = useState(null)
  const [addDone, setAddDone] = useState(null)
  const [addPage, setAddPage] = useState(0)        // ويزارد متحكَّم — للتحقق من تكرار الإقامة عند «التالي»
  const [checkingDup, setCheckingDup] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', iqama_number: '', iqama_expiry_date: '', birth_date: '', nationality_id: null, nationality_ar: '', occupation_id: null, occupation_ar: '', official_occupation_id: null, official_occupation_ar: '', official_mobile: '', facility_id: null })
  const setAdd = (k, v) => setAddForm(p => ({ ...p, [k]: v }))
  const [nationalities, setNationalities] = useState([])
  const [occupations, setOccupations] = useState([])
  const [cities, setCities] = useState([])
  // تعديل العامل — نفس نمط صفحة المنشآت: editRow + editForm + editSection ('data' | 'docs').
  const [editRow, setEditRow] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editSection, setEditSection] = useState(null)
  const [docStep, setDocStep] = useState(1)   // معالج البيانات المهنية على خطوتين: 1 الحقول، 2 رفع الملفات
  const [savingEdit, setSavingEdit] = useState(false)
  const [editErr, setEditErr] = useState(null)
  const [editDone, setEditDone] = useState(null)   // نجاح التعديل يُعرض داخل النافذة (SuccessView) لا توستر
  const [muqeemFile, setMuqeemFile] = useState(null)   // ملف مقيم المُرفق في نافذة التعديل
  const [workVisaFile, setWorkVisaFile] = useState(null)     // ملف تأشيرة العمل
  const [workPermitFile, setWorkPermitFile] = useState(null) // ملف رخصة العمل
  const [exitVisaFile, setExitVisaFile] = useState(null)     // ملف تأشيرة الخروج
  const [attKey, setAttKey] = useState(0)              // يُحدّث عند رفع مرفق لإعادة جلبه في صفحة التفاصيل
  useEffect(() => {
    if (!sb) return
    sb.from('nationalities').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').then(({ data }) => { if (data) setNationalities(data) })
    sb.from('occupations').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').limit(5000).then(({ data }) => { if (data) setOccupations(data) })
    sb.from('cities').select('id,name_ar,name_en').eq('is_active', true).order('name_ar').limit(5000).then(({ data }) => { if (data) setCities(data) })
  }, [sb])
  const saveManualWorker = useCallback(async () => {
    if (!sb || adding) return
    setAddErr(null)
    const name = (addForm.name || '').trim()
    if (!name) { setAddErr(T('أدخل اسم العامل', 'Enter worker name')); return }
    setAdding(true)
    try {
      const isArabicName = /[؀-ۿ]/.test(name)
      const payload = {
        name_ar: isArabicName ? name : null,
        name_en: !isArabicName ? name : null,
        iqama_number: (addForm.iqama_number || '').trim() || null,
        iqama_expiry_date: addForm.iqama_expiry_date || null,
        birth_date: addForm.birth_date || null,
        nationality_id: addForm.nationality_id || null,
        nationality_ar: addForm.nationality_ar || null,
        current_occupation_id: addForm.occupation_id || null,
        occupation_ar: addForm.occupation_ar || null,
        official_occupation_id: addForm.official_occupation_id || null,
        official_occupation_ar: addForm.official_occupation_ar || null,
        official_mobile: (addForm.official_mobile || '').trim() ? '966' + addForm.official_mobile.trim() : null,
        current_facility_id: addForm.facility_id || null,
        created_by: user?.id || null,
      }
      const { error } = await sb.from('temproryworkers').insert(payload)
      if (error) throw new Error(error.message)
      // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يُفرغ النموذج ويعيدنا للقائمة.
      setAddDone({ title: T('تمت إضافة العامل بنجاح', 'Worker added successfully') })
      load()
    } catch (e) {
      const m = String(e.message || e)
      // حارس قاعدة البيانات (سباق إدخالين بنفس اللحظة) — رسالة ودّية بدل خطأ Postgres الخام.
      if (/temproryworkers_iqama_number_unique|duplicate key/i.test(m)) {
        setAddErr(T('رقم الإقامة مسجّل مسبقاً لعامل آخر', 'This Iqama number is already registered to another worker'))
      } else {
        setAddErr(T('فشل الحفظ: ' + m, 'Save failed: ' + m))
      }
    } finally {
      setAdding(false)
    }
  }, [sb, addForm, adding, user, toast, T])

  // الانتقال للصفحة الثانية — يتحقق أولاً من عدم تكرار رقم الإقامة (فريد بين العمال).
  // عند وجود عامل بنفس الرقم يظهر إشعار في الشريط السفلي ولا ننتقل (مثل إضافة منشأة).
  const handleAddNext = useCallback(async () => {
    if (checkingDup) return
    setAddErr(null)
    const iqama = (addForm.iqama_number || '').trim()
    if (iqama && sb) {
      setCheckingDup(true)
      try {
        const { data, error } = await sb.from('temproryworkers').select('id, name_ar, name_en')
          .eq('iqama_number', iqama).is('deleted_at', null).limit(1)
        if (error) throw error
        if (data && data.length) {
          const w = data[0]
          const who = w.name_ar || w.name_en
          setAddErr(who
            ? T(`رقم الإقامة مسجّل مسبقاً للعامل «${who}»`, `This Iqama number is already registered to “${who}”`)
            : T('رقم الإقامة مسجّل مسبقاً لعامل آخر', 'This Iqama number is already registered to another worker'))
          return
        }
      } catch (e) {
        setAddErr(T('تعذّر التحقق من رقم الإقامة: ' + (e.message || e), 'Could not verify Iqama number: ' + (e.message || e)))
        return
      } finally {
        setCheckingDup(false)
      }
    }
    setAddPage(p => p + 1)
  }, [sb, addForm.iqama_number, checkingDup, T])

  useEffect(() => { onTabChange && onTabChange({ tab: 'temp_workers' }) }, [])

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const [w, f] = await Promise.all([
      sb.from('temproryworkers').select('*').is('deleted_at', null).order('name_ar', { ascending: true }),
      sb.from('facilities').select('id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number,struck_off,branch_id,branch:branches!facilities_branch_id_fkey(branch_code,city:cities(name_ar,name_en))').is('deleted_at', null),
    ])
    setWorkers(w.data || []); setFacilities(f.data || [])
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  // حذف ناعم للعامل — تعيين deleted_at فيختفي الصف من القائمة (الاستعلام يُرشّح
  // deleted_at IS NULL). نُغلق صفحة التفاصيل بعدها لأن العامل لم يعد معروضاً.
  const deleteWorker = useCallback(async (r) => {
    if (!sb || !r) return false
    const { error } = await sb.from('temproryworkers')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null })
      .eq('id', r.id)
    if (error) { toast?.(T('فشل الحذف: ' + error.message, 'Delete failed: ' + error.message)); return false }
    // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يعيدنا للقائمة.
    await load()
    return true
  }, [sb, user, toast, T, load])

  // نقل العامل إلى العمالة الدائمة — ننسخ صفّه كما هو إلى جدول workers مع
  // الإبقاء على نفس المعرّف (فتبقى الفواتير والمرفقات المرتبطة به سارية)، ثم نحذفه
  // حذفاً ناعماً من جدول العمالة المؤقتة. upsert يسمح بالنقل ذهاباً وإياباً دون
  // تعارض في المفتاح الأساسي (يُلغي الحذف الناعم لصفّ سابق إن وُجد).
  const transferToPermanent = useCallback(async (r) => {
    if (!sb || !r) return false
    const now = new Date().toISOString()
    // نسجّل حدث النقل في سجل العامل (مَن نقله ومتى ومن أين) ليظهر في «سجل الإضافات والتعديلات».
    const prevLog = Array.isArray(r.edit_log) ? r.edit_log : []
    const transferEntry = { at: now, by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, kind: 'transfer', from: 'temporary' }
    const payload = { ...r, edit_log: [...prevLog, transferEntry], deleted_at: null, deleted_by: null, updated_at: now, updated_by: user?.id || null }
    const { error: upErr } = await sb.from('workers').upsert(payload, { onConflict: 'id' })
    if (upErr) { toast?.(T('فشل النقل: ' + upErr.message, 'Transfer failed: ' + upErr.message)); return false }
    const { error: delErr } = await sb.from('temproryworkers')
      .update({ deleted_at: now, deleted_by: user?.id || null }).eq('id', r.id)
    if (delErr) { toast?.(T('فشل النقل: ' + delErr.message, 'Transfer failed: ' + delErr.message)); return false }
    // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يعيدنا للقائمة.
    await load()
    return true
  }, [sb, user, toast, T, load])

  // فتح نافذة التعديل — مُعبّأة من صف العامل. `section` يحدّد كرت الحقول المعروض.
  const openWorkerEdit = useCallback((r, section = null) => {
    if (!r) return
    setEditErr(null)
    setMuqeemFile(null); setWorkVisaFile(null); setWorkPermitFile(null); setExitVisaFile(null)
    setDocStep(1)
    setEditRow(r)
    setEditSection(section)
    setEditForm({
      name: r.name_ar || r.name_en || '',
      nationality_id: r.nationality_id || '',
      nationality_ar: r.nationality_ar || '',
      occupation_id: r.current_occupation_id || '',
      occupation_ar: r.occupation_ar || '',
      official_occupation_id: r.official_occupation_id || '',
      official_occupation_ar: r.official_occupation_ar || '',
      hq_city_id: r.hq_city_id || '',
      hq_city_ar: r.hq_city_ar || '',
      official_mobile: phoneLocal(r.official_mobile),
      billing_mobiles: Array.isArray(r.billing_mobiles) ? r.billing_mobiles : [],
      birth_date: r.birth_date ? String(r.birth_date).slice(0, 10) : '',
      iqama_number: r.iqama_number || '',
      iqama_expiry_date: r.iqama_expiry_date ? String(r.iqama_expiry_date).slice(0, 10) : '',
      work_permit_expiry: r.work_permit_expiry ? String(r.work_permit_expiry).slice(0, 10) : '',
      border_number: r.border_number || '',
      passport_number: r.passport_number || '',
      passport_expiry: r.passport_expiry ? String(r.passport_expiry).slice(0, 10) : '',
      insurance_company: r.insurance_company || '',
      insurance_policy_number: r.insurance_policy_number || '',
      insurance_expiry_date: r.insurance_expiry_date ? String(r.insurance_expiry_date).slice(0, 10) : '',
      exit_visa_type: r.exit_visa_type || '',
      exit_visa_number: r.exit_visa_number || '',
      exit_visa_expiry: r.exit_visa_expiry ? String(r.exit_visa_expiry).slice(0, 10) : '',
      final_exit_kind: r.final_exit_kind || '',
    })
  }, [])

  const saveWorkerEdit = useCallback(async () => {
    if (!sb || !editRow || savingEdit) return
    setEditErr(null)
    const name = (editForm?.name || '').trim()
    if (!name) { setEditErr(T('أدخل اسم العامل', 'Enter the worker name')); return }
    setSavingEdit(true)
    try {
      const isArabicName = /[؀-ۿ]/.test(name)
      const patch = {
        name_ar: isArabicName ? name : null,
        name_en: !isArabicName ? name : null,
        nationality_id: editForm.nationality_id || null,
        nationality_ar: editForm.nationality_ar || null,
        current_occupation_id: editForm.occupation_id || null,
        occupation_ar: editForm.occupation_ar || null,
        official_occupation_id: editForm.official_occupation_id || null,
        official_occupation_ar: editForm.official_occupation_ar || null,
        hq_city_id: editForm.hq_city_id || null,
        hq_city_ar: editForm.hq_city_ar || null,
        official_mobile: (editForm.official_mobile || '').trim() ? '966' + editForm.official_mobile.trim() : null,
        billing_mobiles: Array.isArray(editForm.billing_mobiles) ? editForm.billing_mobiles : [],
        birth_date: editForm.birth_date || null,
        iqama_number: (editForm.iqama_number || '').trim() || null,
        iqama_expiry_date: editForm.iqama_expiry_date || null,
        work_permit_expiry: editForm.work_permit_expiry || null,
        border_number: (editForm.border_number || '').trim() || null,
        passport_number: (editForm.passport_number || '').trim() || null,
        passport_expiry: editForm.passport_expiry || null,
        // ملاحظة: حقول التأمين (الشركة/البوليصة/الانتهاء) تُدار حصراً عبر «استعلام التأمين» (CHI)
        // ولا تُكتب من نافذة التعديل، حتى لا يُمحى ما جلبه الاستعلام عند حفظ أي تعديل آخر.
        exit_visa_type: editForm.exit_visa_type || null,
        exit_visa_number: (editForm.exit_visa_number || '').trim() || null,
        exit_visa_expiry: editForm.exit_visa_expiry || null,
        final_exit_kind: editForm.exit_visa_type === 'final_exit' ? (editForm.final_exit_kind || null) : null,
        updated_by: user?.id || null,
      }
      // فرق القيم (قديم/جديد) لسجل التعديلات — بقيم مقروءة (لا معرّفات).
      const oldName = editRow.name_ar || editRow.name_en || null
      const oldBirth = editRow.birth_date ? String(editRow.birth_date).slice(0, 10) : null
      const oldIqExp = editRow.iqama_expiry_date ? String(editRow.iqama_expiry_date).slice(0, 10) : null
      const oldWpExp = editRow.work_permit_expiry ? String(editRow.work_permit_expiry).slice(0, 10) : null
      const oldPpExp = editRow.passport_expiry ? String(editRow.passport_expiry).slice(0, 10) : null
      const oldExitExp = editRow.exit_visa_expiry ? String(editRow.exit_visa_expiry).slice(0, 10) : null
      const oldBilling = (Array.isArray(editRow.billing_mobiles) ? editRow.billing_mobiles : []).map(fmtMobile).join('، ')
      const newBilling = (patch.billing_mobiles || []).map(fmtMobile).join('، ')
      const changes = [
        ['name', oldName, name],
        ['nationality_id', editRow.nationality_ar || null, patch.nationality_ar],
        ['occupation_id', editRow.occupation_ar || null, patch.occupation_ar],
        ['official_occupation_id', editRow.official_occupation_ar || null, patch.official_occupation_ar],
        ['hq_city_id', editRow.hq_city_ar || null, patch.hq_city_ar],
        ['official_mobile', fmtMobile(editRow.official_mobile) || null, fmtMobile(patch.official_mobile) || null],
        ['billing_mobiles', oldBilling || null, newBilling || null],
        ['birth_date', oldBirth, patch.birth_date],
        ['iqama_number', editRow.iqama_number || null, patch.iqama_number],
        ['iqama_expiry_date', oldIqExp, patch.iqama_expiry_date],
        ['work_permit_expiry', oldWpExp, patch.work_permit_expiry],
        ['border_number', editRow.border_number || null, patch.border_number],
        ['passport_number', editRow.passport_number || null, patch.passport_number],
        ['passport_expiry', oldPpExp, patch.passport_expiry],
        ['exit_visa_type', exitVisaTypeLabel(editRow.exit_visa_type), exitVisaTypeLabel(patch.exit_visa_type)],
        ['exit_visa_number', editRow.exit_visa_number || null, patch.exit_visa_number],
        ['exit_visa_expiry', oldExitExp, patch.exit_visa_expiry],
        ['final_exit_kind', finalExitKindLabel(editRow.final_exit_kind), finalExitKindLabel(patch.final_exit_kind)],
      ].filter(([, from, to]) => String(from ?? '') !== String(to ?? ''))
       .map(([field, from, to]) => ({ field, from: from ?? null, to: to ?? null }))
      // الملفات المرفقة في النافذة (PDF) — تُسجَّل في سجل التعديلات وتُرفع بعد حفظ العامل.
      const fileUploads = [
        { notes: 'muqeem_file', folder: 'muqeem', file: muqeemFile, label: T('ملف مقيم', 'Muqeem file') },
        { notes: 'work_visa_file', folder: 'work_visa', file: workVisaFile, label: T('ملف تأشيرة العمل', 'Work visa file') },
        { notes: 'work_permit_file', folder: 'work_permit', file: workPermitFile, label: T('ملف رخصة العمل', 'Work permit file') },
        { notes: 'exit_visa_file', folder: 'exit_visa', file: exitVisaFile, label: T('ملف التأشيرة', 'Visa file') },
      ].filter(u => u.file && (!u.file.type || /pdf/i.test(u.file.type)))
      // الملفات الحالية لكل خانة — لتسجيل «الملف السابق» عند الاستبدال، وحذف الملف المُستبدَل.
      const prevFileNames = {}     // أحدث اسم ملف لكل خانة (للسجل)
      const prevFileIds = {}       // كل المعرّفات السابقة لكل خانة (للحذف الناعم)
      if (fileUploads.length) {
        const { data: exAtt } = await sb.from('attachments')
          .select('id,file_name,notes,created_at')
          .eq('entity_type', 'worker').eq('entity_id', editRow.id)
          .in('notes', fileUploads.map(u => u.notes)).is('deleted_at', null)
          .order('created_at', { ascending: false })
        for (const r of (exAtt || [])) {
          if (!prevFileNames[r.notes]) prevFileNames[r.notes] = r.file_name
          ;(prevFileIds[r.notes] = prevFileIds[r.notes] || []).push(r.id)
        }
      }
      for (const u of fileUploads) changes.push({ field: u.notes, from: prevFileNames[u.notes] || null, to: u.file.name || u.label })
      if (changes.length) {
        // نقرأ السجل الحالي من القاعدة (لا اللقطة المخزّنة عند فتح النافذة) حتى لا نمحو
        // قيوداً أُضيفت بعد الفتح (مثل قيد «استعلام التأمين»).
        const { data: freshRow } = await sb.from('temproryworkers').select('edit_log').eq('id', editRow.id).maybeSingle()
        const prevLog = Array.isArray(freshRow?.edit_log) ? freshRow.edit_log : (Array.isArray(editRow.edit_log) ? editRow.edit_log : [])
        patch.edit_log = [...prevLog, { at: new Date().toISOString(), by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, changes }]
      }
      const { error } = await sb.from('temproryworkers').update(patch).eq('id', editRow.id)
      if (error) throw new Error(error.message)
      // رفع الملفات (PDF) إلى bucket «attachments» وربطها بالعامل (entity_type='worker', notes=<النوع>).
      for (const u of fileUploads) {
        const safe = (u.file.name || `${u.folder}.pdf`).replace(/[^\w.\-]+/g, '_')
        const path = `workers/${editRow.id}/${u.folder}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safe}`
        const { error: upErr } = await sb.storage.from('attachments').upload(path, u.file, { cacheControl: '3600', upsert: false })
        if (upErr) { toast?.(T('تعذّر رفع ' + u.label + ': ' + (upErr.message || ''), 'Upload failed for ' + u.label + ': ' + (upErr.message || ''))) }
        else {
          const { data: pub } = sb.storage.from('attachments').getPublicUrl(path)
          await sb.from('attachments').insert({
            entity_type: 'worker', entity_id: editRow.id,
            file_name: u.file.name, file_url: pub?.publicUrl || path, storage_path: path,
            mime_type: u.file.type || null, size_bytes: u.file.size || null, notes: u.notes, uploaded_by: user?.id || null,
          })
          // حذف ناعم للملف المُستبدَل في نفس الخانة (يبقى المرفق الجديد فقط).
          if (prevFileIds[u.notes]?.length) {
            await sb.from('attachments').update({ deleted_at: new Date().toISOString() }).in('id', prevFileIds[u.notes])
          }
        }
      }
      // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ ويبقى النافذة مفتوحة حتى يغلقها المستخدم.
      setEditDone({ title: T('تم حفظ التعديلات', 'Changes saved') })
      setAttKey(k => k + 1)
      // إعادة جلب العامل لتحديث صفحة التفاصيل خلف النافذة + إعادة تحميل القائمة.
      const { data: fresh } = await sb.from('temproryworkers').select('*').eq('id', editRow.id).is('deleted_at', null).maybeSingle()
      if (fresh) setDetail(fresh)
      load()
    } catch (e) {
      const m = String(e.message || e)
      // حارس قاعدة البيانات للأرقام الفريدة (الإقامة/الحدود) — رسالة ودّية بدل خطأ Postgres الخام.
      if (/border_number_unique/i.test(m)) setEditErr(T('رقم الحدود مسجّل مسبقاً لعامل آخر', 'This border number is already registered to another worker'))
      else if (/iqama_number_unique|duplicate key/i.test(m)) setEditErr(T('رقم الإقامة مسجّل مسبقاً لعامل آخر', 'This Iqama number is already registered to another worker'))
      else setEditErr(T('فشل الحفظ: ' + m, 'Save failed: ' + m))
    } finally {
      setSavingEdit(false)
    }
  }, [sb, editRow, editForm, savingEdit, user, toast, T, load, muqeemFile, workVisaFile, workPermitFile, exitVisaFile])

  // Deep-link: فتح تفاصيل عامل معيّن عند الانتقال من صفحة أخرى (مثل صفحة المنشأة).
  useEffect(() => {
    const handler = async (e) => {
      const id = e?.detail?.id
      if (!id || !sb) return
      const { data } = await sb.from('temproryworkers').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
      if (data) setDetail(data)
    }
    window.addEventListener('temp-worker-open', handler)
    return () => window.removeEventListener('temp-worker-open', handler)
  }, [sb])

  const facById = useMemo(() => {
    const m = {}; facilities.forEach(f => { m[f.id] = f }); return m
  }, [facilities])

  // Lens-scoped rows (mirrors SbcFacilities scopedRows pattern).
  const scopedRows = useMemo(() => {
    if (viewLens === 'all') return workers
    return workers.filter(w => w.worker_status === viewLens)
  }, [workers, viewLens])

  const stats = useMemo(() => {
    const total = scopedRows.length
    const active = scopedRows.filter(w => w.worker_status === 'active').length
    const suspended = scopedRows.filter(w => w.worker_status === 'suspended').length
    // Iqama buckets — same thresholds as IqamaCell:
    //   expired ≤0 / renewal 1–30 / valid >30. Rows without an expiry date
    //   are excluded from all three so the donut percentages add up cleanly.
    const expired = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d <= 0 }).length
    const exp30 = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d > 0 && d <= 30 }).length
    const valid = scopedRows.filter(w => { const d = daysUntil(w.iqama_expiry_date); return d != null && d > 30 }).length
    const noIqama = scopedRows.filter(w => !w.iqama_expiry_date).length
    return { total, active, suspended, expired, exp30, valid, noIqama }
  }, [scopedRows])

  // Nationality leaderboard for the third stats card.
  const natTop = useMemo(() => {
    const counts = {}
    for (const w of scopedRows) {
      const n = (w.nationality_ar || '').trim()
      if (!n) continue
      counts[n] = (counts[n] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [scopedRows])

  const advCount = useMemo(() => Object.values(adv).filter(v => v).length, [adv])

  // Search + advanced filter
  const filtered = useMemo(() => {
    return scopedRows.filter(w => {
      if (adv.status && w.worker_status !== adv.status) return false
      if (adv.nationality && (w.nationality_ar || '') !== adv.nationality) return false
      if (adv.facility && w.current_facility_id !== adv.facility) return false
      if (adv.occupation && !(w.occupation_ar || '').includes(adv.occupation)) return false
      if (adv.iqama) {
        const d = daysUntil(w.iqama_expiry_date)
        if (adv.iqama === 'expired' && !(d != null && d <= 0)) return false
        if (adv.iqama === '30d' && !(d != null && d > 0 && d <= 30)) return false
        if (adv.iqama === 'valid' && !(d != null && d > 30)) return false
      }
      if (search.trim()) {
        const s = search.toLowerCase()
        // أرقام المنشأة التابع لها العامل — البحث بالرقم الموحّد/التأمينات/الموارد البشرية/السجل يُظهر كل عمالتها.
        const fac = facById[w.current_facility_id]
        const facMatch = fac && [fac.unified_number, fac.gosi_number, fac.hrsd_number, fac.cr_number]
          .some(n => String(n || '').toLowerCase().includes(s))
        // أي من أرقام جوال العامل (الرسمي أو أرقام الفواتير) — مطابقة بالأرقام فقط.
        const sDigits = s.replace(/\D/g, '')
        const phoneMatch = sDigits.length >= 3 && [w.official_mobile, ...(Array.isArray(w.billing_mobiles) ? w.billing_mobiles : [])]
          .some(p => String(p || '').replace(/\D/g, '').includes(sDigits))
        if (!((w.name_ar || '').includes(s) || (w.name_en || '').toLowerCase().includes(s) ||
              (w.iqama_number || '').includes(s) || (w.border_number || '').includes(s) ||
              (w.passport_number || '').toLowerCase().includes(s) || (w.occupation_ar || '').includes(s) ||
              (w.gosi_registration_no || '').includes(s) || facMatch || phoneMatch)) return false
      }
      return true
    })
  }, [scopedRows, adv, search, facById])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const paged = filtered.slice(page * PAGE, page * PAGE + PAGE)

  if (detail) {
    return (<>
      <WorkerDetail
        worker={detail}
        facility={facById[detail.current_facility_id]}
        sb={sb} toast={toast} T={T} isAr={isAr}
        onBack={() => setDetail(null)}
        onEdit={(section) => openWorkerEdit(detail, section)}
        onDelete={() => deleteWorker(detail)}
        onTransfer={() => transferToPermanent(detail)}
        canEdit={can(user, 'temp_workers.edit')}
        user={user}
        attKey={attKey}
      />
      {editRow && editForm && (
        <FKModal open onClose={() => { if (!savingEdit) { setEditErr(null); setEditDone(null); setEditRow(null); setEditForm(null); setEditSection(null); setDocStep(1); setMuqeemFile(null); setWorkVisaFile(null); setWorkPermitFile(null); setExitVisaFile(null) } }} width={520}
          height={editSection === 'docs' && !editDone ? 'min(560px, 92vh)' : undefined} scroll={editSection === 'docs' && !editDone}
          footerStart={editSection === 'docs' && !editDone && docStep === 2 ? (
            <ActionButton variant="ghost" dir="fwd" Icon={ChevronRight} disabled={savingEdit} onClick={() => setDocStep(1)}>
              {T('السابق', 'Back')}
            </ActionButton>
          ) : undefined}
          title={editSection === 'docs' ? T('تعديل البيانات المهنية', 'Edit Professional Data') : editSection === 'passport' ? T('تعديل بيانات الجواز', 'Edit Passport Data') : editSection === 'insurance' ? T('تعديل بيانات التأمين الطبي', 'Edit Medical Insurance Data') : editSection === 'data' ? T('تعديل البيانات الشخصية', 'Edit Personal Data') : editSection === 'contact' ? T('تعديل بيانات التواصل الفاتورية', 'Edit Billing Contact Data') : editSection === 'actual' ? T('تعديل البيانات الفعلية', 'Edit Actual Data') : editSection === 'exit_visa' ? T('تعديل بيانات تأشيرات الخروج', 'Edit Exit Visa Data') : T('تعديل العامل', 'Edit Worker')} Icon={Pencil}
          errorMsg={editErr}
          success={editDone ? <SuccessView title={editDone.title} /> : undefined}
          footer={
            editSection === 'docs' && !editDone ? (
              docStep === 1 ? (
                <ActionButton dir="back" Icon={ChevronLeft} disabled={savingEdit} onClick={() => setDocStep(2)}>
                  {T('التالي', 'Next')}
                </ActionButton>
              ) : (
                <ActionButton Icon={Pencil} disabled={savingEdit || !(editForm.name || '').trim()} onClick={saveWorkerEdit}>
                  {savingEdit ? T('جاري الحفظ…', 'Saving…') : T('تعديل', 'Save changes')}
                </ActionButton>
              )
            ) : (
              <ActionButton Icon={Pencil} disabled={savingEdit || !(editForm.name || '').trim()} onClick={saveWorkerEdit}>
                {savingEdit ? T('جاري الحفظ…', 'Saving…') : T('تعديل', 'Save changes')}
              </ActionButton>
            )
          }>
          {(!editSection || editSection === 'data') && (
            <ModalSection Icon={UserPlus} label={T('البيانات الشخصية', 'Personal Data')}>
              <div style={GRID}>
                <TextField full req label={T('اسم العامل (عربي أو إنجليزي)', 'Worker Name (Arabic or English)')}
                  value={editForm.name} onChange={v => { setEditErr(null); setEditForm(p => ({ ...p, name: v })) }} placeholder={T('الاسم الكامل', 'Full Name')} />
                <Select label={T('الجنسية', 'Nationality')} placeholder={T('اختر الجنسية…', 'Select nationality…')}
                  options={nationalities} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                  value={editForm.nationality_id}
                  onChange={(id, item) => setEditForm(p => ({ ...p, nationality_id: id, nationality_ar: item?.name_ar || '' }))} />
                <DateField label={T('تاريخ الميلاد', 'Date of Birth')}
                  value={editForm.birth_date} onChange={v => setEditForm(p => ({ ...p, birth_date: v }))} />
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'actual') && (
            <ModalSection Icon={UserPlus} label={T('البيانات الفعلية', 'Actual Data')}>
              <div style={GRID}>
                <PhoneField label={T('رقم جوال ابشر', 'Absher Mobile')}
                  value={editForm.official_mobile} onChange={v => setEditForm(p => ({ ...p, official_mobile: v }))} />
                <Select label={T('مدينة المقر', 'HQ City')} placeholder={T('اختر المدينة…', 'Select city…')}
                  options={cities} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                  value={editForm.hq_city_id}
                  onChange={(id, item) => setEditForm(p => ({ ...p, hq_city_id: id, hq_city_ar: item?.name_ar || '' }))} />
                <Select full label={T('المهنة الفعلية', 'Actual Occupation')} placeholder={T('اختر المهنة الفعلية…', 'Select actual occupation…')}
                  options={occupations} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                  value={editForm.official_occupation_id}
                  onChange={(id, item) => setEditForm(p => ({ ...p, official_occupation_id: id, official_occupation_ar: item?.name_ar || '' }))} />
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'contact') && (
            <ModalSection Icon={Phone} label={T('بيانات التواصل الفاتورية', 'Billing Contact Data')}>
              <div style={GRID}>
                <PhoneListField full label={T('أرقام جوال الفواتير', 'Billing Mobiles')}
                  hint={T('تُضاف تلقائياً من جوال الفاتورة', 'auto-added from invoice phone')}
                  value={editForm.billing_mobiles} onChange={v => setEditForm(p => ({ ...p, billing_mobiles: v }))} />
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'docs') && (
            <ModalSection Icon={ShieldCheck} label={editSection === 'docs'
              ? (docStep === 1 ? T('البيانات المهنية — ١. البيانات', 'Professional Data — 1. Details') : T('البيانات المهنية — ٢. الملفات', 'Professional Data — 2. Files'))
              : T('البيانات المهنية', 'Professional Data')}>
              <div style={{ ...GRID, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {(editSection !== 'docs' || docStep === 1) && (<>
                  <IdField label={T('رقم الإقامة', 'Iqama Number')} placeholder="2XXXXXXXXX"
                    value={editForm.iqama_number} onChange={v => setEditForm(p => ({ ...p, iqama_number: v }))} />
                  <IdField label={T('رقم الحدود', 'Border Number')} placeholder="3XXXXXXXXX"
                    value={editForm.border_number} onChange={v => setEditForm(p => ({ ...p, border_number: v }))} />
                  <DateField label={T('تاريخ انتهاء الإقامة', 'Iqama Expiry')}
                    value={editForm.iqama_expiry_date} onChange={v => setEditForm(p => ({ ...p, iqama_expiry_date: v }))} />
                  <DateField label={T('تاريخ انتهاء كرت العمل', 'Work Permit Expiry')}
                    value={editForm.work_permit_expiry} onChange={v => setEditForm(p => ({ ...p, work_permit_expiry: v }))} />
                  <Select full label={T('المهنة الرسمية', 'Official Occupation')} placeholder={T('اختر المهنة الرسمية…', 'Select official occupation…')}
                    options={occupations} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                    value={editForm.occupation_id}
                    onChange={(id, item) => setEditForm(p => ({ ...p, occupation_id: id, occupation_ar: item?.name_ar || '' }))} />
                </>)}
                {(editSection !== 'docs' || docStep === 2) && (<>
                  <FileField compact accept="application/pdf" label={T('ملف تأشيرة العمل (PDF)', 'Work visa file (PDF)')}
                    hint={T('ارفق ملف تأشيرة العمل بصيغة PDF', 'Attach the work visa as a PDF')}
                    value={workVisaFile} onChange={setWorkVisaFile} />
                  <FileField compact accept="application/pdf" label={T('ملف رخصة العمل (PDF)', 'Work permit file (PDF)')}
                    hint={T('ارفق ملف رخصة العمل بصيغة PDF', 'Attach the work permit as a PDF')}
                    value={workPermitFile} onChange={setWorkPermitFile} />
                  <FileField compact accept="application/pdf" label={T('ملف مقيم (PDF)', 'Muqeem file (PDF)')}
                    hint={T('ارفق ملف مقيم بصيغة PDF', 'Attach the Muqeem report as a PDF')}
                    value={muqeemFile} onChange={setMuqeemFile} />
                </>)}
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'passport') && (
            <ModalSection Icon={FileText} label={T('جواز السفر', 'Passport')}>
              <div style={{ ...GRID, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <TextField dir="ltr" label={T('رقم الجواز', 'Passport Number')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.passport_number} onChange={v => setEditForm(p => ({ ...p, passport_number: v }))} />
                <DateField label={T('تاريخ انتهاء الجواز', 'Passport Expiry')}
                  value={editForm.passport_expiry} onChange={v => setEditForm(p => ({ ...p, passport_expiry: v }))} />
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'insurance') && (
            <ModalSection Icon={ShieldCheck} label={T('التأمين الطبي', 'Medical Insurance')}>
              <div style={{ ...GRID, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <TextField label={T('شركة التأمين', 'Insurance Company')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.insurance_company} onChange={v => setEditForm(p => ({ ...p, insurance_company: v }))} />
                <TextField dir="ltr" label={T('رقم البوليصة', 'Policy Number')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.insurance_policy_number} onChange={v => setEditForm(p => ({ ...p, insurance_policy_number: v }))} />
                <DateField label={T('تاريخ انتهاء التأمين', 'Insurance Expiry')}
                  value={editForm.insurance_expiry_date} onChange={v => setEditForm(p => ({ ...p, insurance_expiry_date: v }))} />
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'exit_visa') && (
            <ModalSection Icon={ShieldCheck} label={T('تأشيرات الخروج والعودة والخروج النهائي', 'Exit & Final Exit Visas')}>
              <div style={{ ...GRID, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <Select label={T('نوع التأشيرة', 'Visa Type')} placeholder={T('اختر نوع التأشيرة…', 'Select visa type…')}
                  options={[{ id: 'exit_reentry', label: T('خروج وعودة', 'Exit & Re-entry') }, { id: 'final_exit', label: T('خروج نهائي', 'Final Exit') }]}
                  getKey={o => o.id} getLabel={o => o.label}
                  value={editForm.exit_visa_type}
                  onChange={(id) => setEditForm(p => ({ ...p, exit_visa_type: id, final_exit_kind: id === 'final_exit' ? p.final_exit_kind : '' }))} />
                {editForm.exit_visa_type === 'final_exit' && (
                  <Select label={T('نوع الخروج النهائي', 'Final Exit Kind')} placeholder={T('دائمة أو مؤقتة…', 'Permanent or temporary…')}
                    options={[{ id: 'permanent', label: T('دائمة', 'Permanent') }, { id: 'temporary', label: T('مؤقتة', 'Temporary') }]}
                    getKey={o => o.id} getLabel={o => o.label}
                    value={editForm.final_exit_kind}
                    onChange={(id) => setEditForm(p => ({ ...p, final_exit_kind: id }))} />
                )}
                <TextField dir="ltr" label={T('رقم التأشيرة', 'Visa Number')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.exit_visa_number} onChange={v => setEditForm(p => ({ ...p, exit_visa_number: v }))} />
                <DateField full={editForm.exit_visa_type !== 'final_exit'} label={T('تاريخ انتهاء التأشيرة', 'Visa Expiry Date')}
                  value={editForm.exit_visa_expiry} onChange={v => setEditForm(p => ({ ...p, exit_visa_expiry: v }))} />
                <FileField compact accept="application/pdf" label={T('ملف التأشيرة (PDF)', 'Visa file (PDF)')}
                  hint={T('ارفق ملف التأشيرة بصيغة PDF', 'Attach the visa as a PDF')}
                  value={exitVisaFile} onChange={setExitVisaFile} />
              </div>
            </ModalSection>
          )}
        </FKModal>
      )}
    </>)
  }

  // Iqama donut math — 3 buckets matching IqamaCell thresholds.
  const safe = (n) => Number.isFinite(n) ? n : 0
  const iqamaTot = Math.max(1, safe(stats.expired) + safe(stats.exp30) + safe(stats.valid))
  const iqamaSegs = [
    { k: 'valid',   l: T('سارية','Valid'),       v: safe(stats.valid),   c: C.ok },
    { k: '30d',     l: T('≤ 30 يوم','≤ 30 days'), v: safe(stats.exp30),   c: C.gold },
    { k: 'expired', l: T('منتهية','Expired'),    v: safe(stats.expired), c: C.red },
  ]
  const R = 42, CIRC = 2 * Math.PI * R
  let acc = 0
  const iqamaArcs = iqamaSegs.map(s => {
    const len = safe((s.v / iqamaTot) * CIRC)
    const arc = { ...s, dash: `${len} ${CIRC - len}`, offset: safe(-acc), len }
    acc += len
    return arc
  })
  const validPct = Math.round(safe(stats.valid) / iqamaTot * 100)
  // أول جلب (لا توجد بيانات بعد) — نعرض هيكل التحميل كاملاً بدل البطاقات الصفرية،
  // تماماً كصفحة المنشآت.
  const initialLoading = loading && workers.length === 0

  return (
    <div style={{ fontFamily: F, paddingTop: 0 }}>
      {/* Hero — title + description column with the add button beside it,
          mirroring the Facilities page header exactly (font, size, weight, gap,
          dashed button, hover behaviour). */}
      <div style={{ position: 'relative', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.3px', lineHeight: 1.2 }}>
              {T('العمالة المؤقتة','Temporary Workforce')}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            {T('سجلّ مستقل للعمالة المؤقتة وبياناتهم الشخصية والمهنية والمنشآت التابعين لها',
               'A separate registry of temporary workers, their personal and professional data and the facilities they belong to')}
          </div>
        </div>
        {can(user, 'temp_workers.create') && (
        <button
          onClick={() => { setAddErr(null); setAddPage(0); setShowAdd(true) }}
          title={T('إضافة عامل مؤقت', 'Add Temporary Worker')}
          className="btn-primary-modal"
          style={{
            height: 42, padding: '0 18px', borderRadius: 11,
            cursor: 'pointer',
            fontFamily: F, fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease',
          }}>
          <span>{T('إضافة عامل مؤقت', 'Add Temporary Worker')}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        )}
      </div>

      {initialLoading ? <WorkforceSkeleton /> : (<>
      {/* KPI Row — 3 cards (2.2fr 1.7fr 1.6fr) mirroring SbcFacilities */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.7fr 1.6fr', gap: 14, marginBottom: 24 }}>
        {/* Hero — Total workers */}
        <div style={{
          position: 'relative', padding: '18px 22px', borderRadius: 16,
          background: 'var(--card-grad2)',
          border: '1px solid var(--bd)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}26 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}aa` }} />
            <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{T(arCount(stats.total, 'عامل', 'عمال'),'Workers')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 800, color: C.blue, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--bd)', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.ok, fontWeight: 600, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.ok }} /> {num(stats.valid + stats.exp30)} {T('ساري','valid')}
            </span>
            <span style={{ fontSize: 12, color: C.red, fontWeight: 600, direction: 'rtl', fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} /> {num(stats.expired)} {T('منتهي','expired')}
            </span>
          </div>
        </div>

        {/* Iqama status donut — mirror of CR-status donut */}
        <div style={{
          borderRadius: 16,
          background: 'var(--card-grad2)',
          border: '1px solid var(--bd)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('انتهاء الإقامات','Iqama Status')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
              <svg width="112" height="112" viewBox="0 0 112 112" style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,.4))' }}>
                <defs>
                  <radialGradient id="iq-donut-core" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(255,255,255,.06)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                  {iqamaArcs.filter(a => a.v > 0).map(a => (
                    <linearGradient key={'g-' + a.k} id={`iq-seg-${a.k}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={a.c} stopOpacity="1" />
                      <stop offset="100%" stopColor={a.c} stopOpacity=".72" />
                    </linearGradient>
                  ))}
                </defs>
                <circle cx="56" cy="56" r="34" fill="url(#iq-donut-core)" />
                <g style={{ transform: 'rotate(-90deg)', transformOrigin: '56px 56px' }}>
                  <circle cx="56" cy="56" r={R} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="12" />
                  {iqamaArcs.filter(a => a.v > 0).map(a => (
                    <circle key={a.k} cx="56" cy="56" r={R} fill="none"
                      stroke={`url(#iq-seg-${a.k})`} strokeWidth="12" strokeLinecap="butt"
                      strokeDasharray={a.dash} strokeDashoffset={a.offset}
                      style={{ transition: 'stroke-dasharray .4s, stroke-dashoffset .4s' }} />
                  ))}
                  <circle cx="56" cy="56" r={R + 6} fill="none" stroke="rgba(255,255,255,.03)" strokeWidth="1" />
                  <circle cx="56" cy="56" r={R - 6} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth="1" />
                </g>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums', direction: 'ltr', color: 'var(--tx)' }}>{validPct}%</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, marginTop: 4, letterSpacing: '.2px', color: 'var(--tx2)' }}>{T('سارية','valid')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              {iqamaSegs.map(s => (
                <button key={s.k}
                  onClick={() => { setAdv(a => ({ ...a, iqama: a.iqama === s.k ? '' : s.k })); setPage(0) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.4 : 1, background: adv.iqama === s.k ? 'rgba(212,160,23,.08)' : 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontFamily: F, textAlign: 'right' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
                  <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{s.l}</span>
                  <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontWeight: 800, flexShrink: 0 }}>{num(s.v)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nationalities — top N tile breakdown (mirror of MoC violations card) */}
        <div style={{
          borderRadius: 16,
          background: 'var(--card-grad2)',
          border: '1px solid var(--bd)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الجنسيات','Nationalities')}</span>
            <span style={{ fontSize: 10.5, color: C.purple, fontWeight: 700 }}>{num(natTop.length)} {T('جنسية','total')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, flex: 1 }}>
            {natTop.slice(0, 4).map(([n, count]) => (
              <button key={n} onClick={() => { setAdv(a => ({ ...a, nationality: a.nationality === n ? '' : n })); setPage(0) }}
                style={{
                  borderRadius: 12, padding: '8px 10px',
                  background: adv.nationality === n ? 'rgba(212,160,23,.12)' : 'var(--bd2)',
                  border: '1px solid ' + (adv.nationality === n ? 'rgba(212,160,23,.4)' : 'var(--bd2)'),
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4,
                  cursor: 'pointer', textAlign: 'start', fontFamily: F,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <NatFlag nationality={n} size={16} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>{num(count)}</span>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--tx3)', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + filter button (mirror SbcFacilities) */}
      <div style={{ display: 'flex', gap: 10, marginBottom: advOpen ? 10 : 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', top: '50%', left: 14, transform: 'translateY(-50%)', color: 'var(--tx4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder={T('ابحث بالاسم، الإقامة، الحدود، الجواز، المهنة، رقم الجوال، أو رقم المنشأة (موحّد/تأمينات/موارد)…','Search by name, iqama, border, passport, occupation, mobile, or facility no. (unified/GOSI/HRSD)…')}
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'var(--card-grad2)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <button type="button" onClick={() => setAdvOpen(v => !v)} style={btnFilter(advOpen || advCount > 0)}>
          {T('تصفية', 'Filter')}
          {advCount > 0 ? (
            <span
              role="button" tabIndex={0}
              title={T('مسح الفلاتر', 'Clear filters')}
              onClick={e => { e.stopPropagation(); setAdv({ status: '', iqama: '', nationality: '', facility: '', occupation: '' }) }}
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

      {/* Advanced filter panel */}
      {advOpen && (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 14, boxShadow: '0 4px 16px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.04)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <FilterField label={T('الحالة','Status')}>
              <select value={adv.status} onChange={e => { setAdv(a => ({ ...a, status: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                <option value="active">{T('نشط','Active')}</option>
                <option value="suspended">{T('معلّق','Suspended')}</option>
              </select>
            </FilterField>
            <FilterField label={T('انتهاء الإقامة','Iqama Expiry')}>
              <select value={adv.iqama} onChange={e => { setAdv(a => ({ ...a, iqama: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                <option value="expired">{T('منتهية','Expired')}</option>
                <option value="30d">{T('≤ 30 يوم','≤ 30 days')}</option>
                <option value="valid">{T('سارية','Valid')}</option>
              </select>
            </FilterField>
            <FilterField label={T('الجنسية','Nationality')}>
              <select value={adv.nationality} onChange={e => { setAdv(a => ({ ...a, nationality: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                {natTop.map(([n, c]) => <option key={n} value={n}>{n} ({c})</option>)}
              </select>
            </FilterField>
            <FilterField label={T('المنشأة','Facility')}>
              <select value={adv.facility} onChange={e => { setAdv(a => ({ ...a, facility: e.target.value })); setPage(0) }} style={selStyle}>
                <option value="">{T('الكل','All')}</option>
                {facilities.map(f => <option key={f.id} value={f.id}>{f.name_ar || f.cr_number}</option>)}
              </select>
            </FilterField>
            <FilterField label={T('المهنة الرسمية','Official Occupation')}>
              <input value={adv.occupation} onChange={e => { setAdv(a => ({ ...a, occupation: e.target.value })); setPage(0) }} placeholder={T('سائق، بناء…','Driver, builder…')} style={selStyle}/>
            </FilterField>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('جاري التحميل...','Loading...')}</div>
      ) : filtered.length === 0 ? (
        <Empty T={T} hasData={workers.length > 0} />
      ) : (
        <>
          <style>{`
            .wf-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:${F};background:#161616;border-radius:10px;border:1px solid rgba(255,255,255,.06)}
            .wf-tbl thead th{position:sticky;top:0;background:#161616;color:rgba(255,255,255,.92);font-size:14px;font-weight:600;text-align:center;padding:14px 4px 11px;box-shadow:inset 0 -2px 0 rgba(212,160,23,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
            .wf-tbl thead .hd-icon{color:${C.gold};display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;vertical-align:middle}
            .wf-tbl thead .hd-icon svg{width:14px;height:14px;display:block}
            .wf-tbl tbody td{padding:10px 4px;font-size:11.5px;color:#fff;text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid rgba(255,255,255,.02)}
            .wf-tbl tbody tr{cursor:pointer;transition:background .12s}
            .wf-tbl tbody tr:nth-child(even) td{background:rgba(255,255,255,.02)}
            .wf-tbl tbody tr:hover td{background:rgba(212,160,23,.06)}
            .wf-tbl tbody tr:last-child td:first-child{border-bottom-right-radius:9px}
            .wf-tbl tbody tr:last-child td:last-child{border-bottom-left-radius:9px}
            .wf-tbl tbody tr:last-child td{border-bottom:none}
            .wf-tbl thead tr:first-child th:first-child{border-top-right-radius:9px}
            .wf-tbl thead tr:first-child th:last-child{border-top-left-radius:9px}
            .wf-tbl .num{direction:ltr;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:700}
            .wf-tbl .muted{color:var(--tx5)}
            .wf-tbl .name-cell{overflow:hidden;padding-inline:14px}
            /* Marquee — long text ellipsis by default, scrolls horizontally on row hover */
            .wf-tbl .name-marquee{display:block;max-width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
            .wf-tbl .name-marquee .marquee-inner{display:inline-block;will-change:transform}
            .wf-tbl tbody tr:hover .name-marquee{text-overflow:clip}
            .wf-tbl tbody tr:hover .name-marquee .marquee-inner{animation:wf-name-bounce 9s ease-in-out infinite}
            @keyframes wf-name-bounce{0%,12%{transform:translateX(0)}50%{transform:translateX(40%)}88%,100%{transform:translateX(0)}}
          `}</style>

          <div style={{ borderRadius: 10 }}>
            <table className="wf-tbl">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>{T('الاسم','Name')}</th>
                  <th>{T('رقم الإقامة','Iqama')}</th>
                  <th>{T('الجنسية','Nationality')}</th>
                  <th>{T('المهنة الرسمية','Official Occupation')}</th>
                  <th>{T('انتهاء الإقامة','Iqama Expiry')}</th>
                  <th>{T('الفرع','Branch')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(w => {
                  const f = facById[w.current_facility_id]
                  return (
                    <tr key={w.id} onClick={() => setDetail(w)}>
                      <td className="name-cell" title={w.name_ar || w.name_en || ''}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                          <div className="name-marquee" style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>
                            <span className="marquee-inner">{w.name_ar || w.name_en || '—'}</span>
                          </div>
                          {w.name_en && w.name_ar && (
                            <div className="name-marquee" style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>
                              <span className="marquee-inner">{w.name_en}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {w.iqama_number ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                            <CopyBtn value={w.iqama_number} toast={toast} T={T} />
                            <span className="num" style={{ fontSize: 14, color: C.gold }}>{w.iqama_number}</span>
                          </span>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td title={w.nationality_ar || ''} style={{ paddingInline: 8 }}>
                        {w.nationality_ar ? (
                          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
                            <span className="marquee-inner">{w.nationality_ar}</span>
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td title={w.occupation_ar || ''} style={{ paddingInline: 8 }}>
                        {w.occupation_ar ? (
                          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
                            <span className="marquee-inner">{w.occupation_ar}</span>
                          </div>
                        ) : <span className="muted">—</span>}
                      </td>
                      <td><IqamaCell iso={w.iqama_expiry_date} T={T} /></td>
                      <td title={f?.branch?.branch_code || ''}>
                        {(() => {
                          const asg = f?.branch
                          if (!asg) return <span className="muted">—</span>
                          const city = asg.city ? T(asg.city.name_ar, asg.city.name_en || asg.city.name_ar) : null
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0, width: '100%' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{asg.branch_code || '—'}</span>
                              {city && <span style={{ fontSize: 9.5, fontWeight: 500, color: 'rgba(255,255,255,.45)', whiteSpace: 'nowrap' }}>{city}</span>}
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  )
                })}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 4px', borderTop: '1px solid var(--bd)', marginTop: 18 }}>
                <style>{`
                  .wf-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(212,160,23,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
                  .wf-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
                  .wf-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:var(--bd)}
                  .wf-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:700;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
                  .wf-pg-input::-webkit-outer-spin-button,.wf-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
                `}</style>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 700 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(filtered.length)}</span>
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
        </>
      )}
      </>)}

      {/* ═══ Add Worker Modal — FormKit wizard: ١ بيانات العامل · ٢ منشأة العامل ═══ */}
      {showAdd && (
        <FKModal open onClose={() => {
            if (adding) return
            setAddErr(null); setAddPage(0); setShowAdd(false)
            if (addDone) { setAddDone(null); setAddForm({ name: '', iqama_number: '', iqama_expiry_date: '', birth_date: '', nationality_id: null, nationality_ar: '', occupation_id: null, occupation_ar: '', official_occupation_id: null, official_occupation_ar: '', official_mobile: '', facility_id: null }) }
          }} variant="create" width={640}
          title={T('إضافة عامل مؤقت', 'Add Temporary Worker')} Icon={UserPlus}
          success={addDone ? <SuccessView title={addDone.title} /> : undefined}
          onSubmit={saveManualWorker} submitting={adding}
          submitLabel={T('إضافة', 'Add')} submitIcon={Plus}
          nextLabel={T('التالي', 'Next')} backLabel={T('السابق', 'Back')}
          page={addPage}
          onNext={handleAddNext}
          onBack={() => { setAddErr(null); setAddPage(p => Math.max(0, p - 1)) }}
          pages={[
            {
              valid: !checkingDup && !!(
                (addForm.name || '').trim() &&
                (addForm.iqama_number || '').trim() &&
                addForm.iqama_expiry_date &&
                addForm.nationality_id &&
                addForm.birth_date &&
                addForm.occupation_id
              ),
              error: addPage === 0 ? addErr : null,
              content: (
                <ModalSection Icon={UserPlus} label={T('بيانات العامل', 'Worker Data')}>
                  <div style={GRID}>
                    <TextField full req dir="rtl" align="right" label={T('اسم العامل (عربي أو إنجليزي)', 'Worker Name (Arabic or English)')}
                      value={addForm.name} onChange={v => { setAddErr(null); setAdd('name', v) }} placeholder={T('الاسم الكامل', 'Full Name')} />
                    <Select req label={T('الجنسية', 'Nationality')} placeholder={T('اختر الجنسية…', 'Select nationality…')}
                      options={nationalities} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                      value={addForm.nationality_id}
                      onChange={(id, item) => setAddForm(p => ({ ...p, nationality_id: id, nationality_ar: item?.name_ar || '' }))} />
                    <DateField req label={T('تاريخ الميلاد', 'Date of Birth')}
                      value={addForm.birth_date} onChange={v => setAdd('birth_date', v)} />
                    <IdField req label={T('رقم الإقامة', 'Iqama Number')} placeholder="2XXXXXXXXX"
                      value={addForm.iqama_number} onChange={v => { setAddErr(null); setAdd('iqama_number', v) }} />
                    <DateField req label={T('تاريخ انتهاء الإقامة', 'Iqama Expiry Date')}
                      value={addForm.iqama_expiry_date} onChange={v => setAdd('iqama_expiry_date', v)} />
                    <Select full req label={T('المهنة الرسمية', 'Official Occupation')} placeholder={T('اختر المهنة الرسمية…', 'Select official occupation…')}
                      options={occupations} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''}
                      value={addForm.occupation_id}
                      onChange={(id, item) => setAddForm(p => ({ ...p, occupation_id: id, occupation_ar: item?.name_ar || '' }))} />
                  </div>
                </ModalSection>
              ),
            },
            {
              valid: !!addForm.facility_id,   // زر «إضافة» معطّل حتى تُحدَّد منشأة
              error: addPage === 1 ? addErr : null,
              content: (
                <ModalSection Icon={Building2} label={T('منشأة العامل', "Worker's Facility")}
                  style={{ marginTop: 14, padding: '14px 12px 10px' }}>
                  <FacilityPicker facilities={facilities} value={addForm.facility_id}
                    onChange={(id) => setAdd('facility_id', id)} T={T} />
                </ModalSection>
              ),
            },
          ]} />
      )}

    </div>
  )
}

const selStyle = { width: '100%', height: 40, padding: '0 12px', borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx)', fontSize: 12.5, fontFamily: F, outline: 'none', cursor: 'pointer' }
const FilterField = ({ label, children }) => (
  <div>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', marginBottom: 6 }}>{label}</div>
    {children}
  </div>
)
function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bd2)', border: '1px solid var(--bd)', color: disabled ? 'var(--tx5)' : 'var(--tx2)', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 700, opacity: disabled ? .4 : 1, fontFamily: F }}>{children}</button>
  )
}

function Empty({ T, hasData }) {
  return (
    <EmptyState
      icon={hasData
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
      title={hasData ? T('لا توجد نتائج للبحث', 'No results match the search') : T('لا يوجد عمال مؤقتون بعد', 'No temporary workers yet')}
      desc={hasData ? T('جرّب تعديل كلمة البحث', 'Try adjusting your search') : T('استخدم زر «إضافة عامل مؤقت» في الأعلى', 'Use the “Add Temporary Worker” button above')} />
  )
}

// سجل إضافات وتعديلات العامل — يطابق FacEditLog في صفحة المنشآت: حدث الإضافة (مَن
// أضاف العامل ومتى) ثم كل تعديل لاحق. `created` = { at, by_name, label }.
const FILE_FIELDS = new Set(['muqeem_file', 'work_visa_file', 'work_permit_file', 'exit_visa_file'])
function WorkerEditLog({ entries, created, fileUrls = {}, T }) {
  // اسم ملف ← رابط؛ يجعل أسماء الملفات في السجل قابلة للفتح.
  const fileLink = (name) => {
    const url = name && fileUrls[name]
    if (!url) return <>{name}</>
    return <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }} onClick={e => e.stopPropagation()}>{name}</a>
  }
  const logEntries = Array.isArray(entries) ? entries.filter(e => e && (e.kind === 'transfer' || (Array.isArray(e.changes) && e.changes.length))) : []
  const createdEntry = created?.at ? { at: created.at, by_name: created.by_name, label: created.label, kind: 'created' } : null
  const chrono = [...(createdEntry ? [createdEntry] : []), ...logEntries]
  if (!chrono.length) return null
  return (
    <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), 0 6px 18px rgba(0,0,0,.28)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.blue }}>{T('سجل الإضافات والتعديلات', 'Activity log')}</span>
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...chrono].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).map((c, i) => {
          const isCreate = c.kind === 'created'
          const isTransfer = c.kind === 'transfer'
          const accent = isCreate ? C.ok : isTransfer ? C.blue : C.gold
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', borderRadius: 10, background: 'rgba(0,0,0,.18)', border: '1px solid var(--bd)' }}>
              <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 7, background: accent + '1a', border: '1px solid ' + accent + '47', color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                {isCreate
                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  : isTransfer
                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>}
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 700 }}>{isCreate ? T('تمت الإضافة', 'Added') : isTransfer ? T('تم النقل', 'Transferred') : T('تم التعديل', 'Edited')}</span>
                    {c.via === 'insurance_check' && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.ok, background: C.ok + '1a', border: '1px solid ' + C.ok + '47', borderRadius: 6, padding: '1px 7px' }}>{T('عبر استعلام التأمين', 'via insurance check')}</span>
                    )}
                    {c.by_name && <span style={{ fontSize: 11, color: accent, fontWeight: 700 }}>{T('بواسطة', 'by')} {c.by_name}</span>}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>{fmtDateTime(c.at)}</span>
                </div>
                {isCreate ? (
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span>{T('تمت إضافة العامل', 'Worker added')}</span>
                    {c.label && <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{c.label}</span>}
                  </div>
                ) : isTransfer ? (
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{c.from === 'permanent' ? T('نُقل من العمالة الدائمة', 'Moved from permanent workforce') : T('نُقل من العمالة المؤقتة', 'Moved from temporary workforce')}</span>
                  </div>
                ) : c.changes.map((ch, j) => {
                  const isFile = FILE_FIELDS.has(ch.field)
                  return (
                  <div key={j} style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span>{T(WORKER_LBL[ch.field]?.[0] || ch.field, WORKER_LBL[ch.field]?.[1] || ch.field)}:</span>
                    <span style={{ color: 'var(--tx2)', fontWeight: 700 }}>{(ch.to == null || ch.to === '') ? '—' : (isFile ? fileLink(ch.to) : ch.to)}</span>
                    {(ch.from == null || ch.from === '')
                      ? <span style={{ color: 'var(--tx5)' }}>({T('جديد', 'new')})</span>
                      : <span style={{ color: 'var(--tx5)' }}>({T('كان', 'was')}: <span style={{ textDecoration: 'line-through' }}>{isFile ? fileLink(ch.from) : ch.from}</span>)</span>}
                  </div>
                )})}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════ Worker Detail (mirrors Facility detail) ═══════════════════════ */
function WorkerDetail({ worker: w, facility: f, sb, toast, T, isAr, onBack, onEdit, onDelete, onTransfer, canEdit, user, attKey }) {
  const t = themeForStatus(w.worker_status)
  const iqamaDays = daysUntil(w.iqama_expiry_date)

  const branchLabel = f?.branch ? ((f.branch.branch_code || '—') + (f.branch.city ? ' — ' + T(f.branch.city.name_ar, f.branch.city.name_en || f.branch.city.name_ar) : '')) : null
  // أرقام جوال الفواتير = جوال العامل نفسه + أي أرقام مخزّنة + كل أرقام عملاء فواتير العامل، منزوعة التكرار.
  const [invPhones, setInvPhones] = useState([])
  const billingList = useMemo(() => {
    const out = [], seen = new Set()
    const last9 = s => String(s || '').replace(/\D/g, '').slice(-9)
    const push = v => { const k = last9(v); if (k.length === 9 && !seen.has(k)) { seen.add(k); out.push(v) } }
    push(w.official_mobile)                                                   // جوال العامل نفسه أولاً
    ;(Array.isArray(w.billing_mobiles) ? w.billing_mobiles : []).forEach(push) // الأرقام المخزّنة
    invPhones.forEach(push)                                                    // أرقام عملاء كل الفواتير المرتبطة
    return out
  }, [w.official_mobile, w.billing_mobiles, invPhones])
  const goFacility = (id) => { try { window.dispatchEvent(new CustomEvent('app-navigate-facility', { detail: { id } })) } catch { /* ignore */ } }
  const goInvoice = (id) => { try { window.dispatchEvent(new CustomEvent('app-navigate-invoice', { detail: { id } })) } catch { /* ignore */ } }

  // حذف العامل / نقله للعمالة الدائمة — تأكيد قبل التنفيذ. confirm: null | 'delete' | 'transfer'
  // عند النجاح نعرض شاشة نجاح داخل النافذة (done) بدل التوستر، وإغلاقها يعيدنا للقائمة.
  const wName = w.name_ar || w.name_en || '—'
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const doDelete = async () => { setBusy(true); const ok = await onDelete?.(); setBusy(false); if (ok !== false) setDone({ title: T('تم حذف العامل', 'Worker deleted') }) }
  const doTransfer = async () => { setBusy(true); const ok = await onTransfer?.(); setBusy(false); if (ok !== false) setDone({ title: T('تم نقل العامل إلى العمالة الدائمة', 'Moved to permanent workforce') }) }
  // إغلاق نافذة التأكيد: بعد النجاح نعود للقائمة (onBack)، وإلا نكتفي بإلغاء التأكيد.
  const closeConfirm = () => { if (busy) return; const wasDone = !!done; setDone(null); setConfirm(null); if (wasDone) onBack?.() }

  // تصفير الحالة المؤقتة (override التأمين + قيود السجل المضافة) عند تبديل العامل المعروض.
  useEffect(() => { setInsOverride(null); setLogExtra([]) }, [w.id])
  // فواتير وخدمات العامل (تُحمّل عند فتح الصفحة) — نفس كرت صفحة المنشأة.
  const [facRows, setFacRows] = useState(null)
  useEffect(() => {
    if (!sb || !w?.id) { setFacRows([]); setInvPhones([]); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('v_worker_invoices').select('*').eq('worker_id', w.id)
      if (cancelled) return
      setFacRows(data || [])
      // أرقام جوال عملاء كل طلبات/فواتير العامل — للعرض ضمن «أرقام جوال الفواتير».
      const srIds = [...new Set((data || []).map(r => r.service_request_id).filter(Boolean))]
      if (!srIds.length) { setInvPhones([]); return }
      const { data: srRows } = await sb.from('service_requests')
        .select('client:clients!service_requests_client_id_fkey(phone)').in('id', srIds)
      if (cancelled) return
      setInvPhones([...new Set((srRows || []).map(r => r.client?.phone).filter(Boolean))])
    })()
    return () => { cancelled = true }
  }, [sb, w?.id])
  // اسم مُنشئ العامل — يُحلّ من created_by عبر users→persons (لا FK مضمَّن).
  const [creatorName, setCreatorName] = useState(null)
  useEffect(() => {
    if (!sb || !w?.created_by) { setCreatorName(null); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('users').select('person:persons!users_person_id_fkey(name_ar,name_en)').eq('id', w.created_by).maybeSingle()
      if (!cancelled) setCreatorName(data?.person?.name_ar || data?.person?.name_en || null)
    })()
    return () => { cancelled = true }
  }, [sb, w?.created_by])
  // إجماليات الفواتير (دون الملغاة) + قائمة الخدمات/الفواتير.
  const invById = {}
  for (const r of (facRows || [])) if (r.invoice_id) invById[r.invoice_id] = r
  const invoices = Object.values(invById)
  const totals = invoices.reduce((a, r) => {
    if (r.invoice_status === 'cancelled') return a
    a.tot += Number(r.total_amount) || 0; a.paid += Number(r.paid_amount) || 0; a.rem += Number(r.remaining_amount) || 0
    return a
  }, { tot: 0, paid: 0, rem: 0 })
  const facListRows = [...(facRows || [])].sort((a, b) => (b.invoice_no ? 1 : 0) - (a.invoice_no ? 1 : 0))

  // ملفات الوثائق المرفقة بالعامل (entity_type='worker') — ملف مقيم/تأشيرة العمل/رخصة العمل، أحدث نسخة لكل نوع.
  const [docFiles, setDocFiles] = useState({})
  const [attUrls, setAttUrls] = useState({})   // اسم الملف ← الرابط (يشمل المُستبدَلة) لجعل أسماء الملفات في السجل قابلة للفتح
  useEffect(() => {
    if (!sb || !w?.id) { setDocFiles({}); setAttUrls({}); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('attachments')
        .select('id,file_name,file_url,created_at,notes,deleted_at')
        .eq('entity_type', 'worker').eq('entity_id', w.id)
        .in('notes', ['muqeem_file', 'work_visa_file', 'work_permit_file', 'exit_visa_file'])
        .order('created_at', { ascending: false })
      if (!cancelled) {
        const map = {}, urls = {}
        for (const r of (data || [])) {
          if (r.file_name && r.file_url && !urls[r.file_name]) urls[r.file_name] = r.file_url
          if (!r.deleted_at && !map[r.notes]) map[r.notes] = r   // أحدث نسخة غير محذوفة لكل نوع
        }
        setDocFiles(map); setAttUrls(urls)
      }
    })()
    return () => { cancelled = true }
  }, [sb, w?.id, attKey])
  const muqeemAtt = docFiles.muqeem_file || null

  // ═══ استعلام التأمين الطبي (CHI) — نفس آلية تسعيرة تجديد الإقامة (كابتشا) ═══
  const [chi, setChi] = useState({ phase: 'idle', session: null, captchaImage: null, captchaInput: '', error: null, attempts: 0, result: null })
  const [insOverride, setInsOverride] = useState(null)   // قيم التأمين بعد الجلب — تُحدّث الكرت فوراً
  const [logExtra, setLogExtra] = useState([])           // قيود سجل أُضيفت في هذه الجلسة (استعلام التأمين) — تظهر فوراً
  async function callChiFn(body, timeoutMs = 25000) {
    const ctrl = new AbortController(); const tid = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(CHI_FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      return json
    } finally { clearTimeout(tid) }
  }
  async function startChiCheck() {
    if (!w?.iqama_number) { toast?.(T('لا يوجد رقم إقامة للعامل', 'Worker has no Iqama number')); return }
    setChi(c => ({ ...c, phase: 'loading', error: null, captchaInput: '', attempts: 0, result: null }))
    try {
      const r = await callChiFn({ action: 'init' })
      setChi(c => ({ ...c, phase: 'captcha', session: r.session, captchaImage: r.captchaImage, captchaInput: '' }))
    } catch (e) {
      setChi(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? T('انتهت مهلة الاتصال بمنصة التأمين', 'CHI connection timed out') : (e.message || T('خطأ في الاتصال', 'Connection error')) }))
    }
  }
  async function refreshChiCaptcha() {
    setChi(c => ({ ...c, captchaImage: null, captchaInput: '', error: null }))
    try { const r = await callChiFn({ action: 'init' }); setChi(c => ({ ...c, phase: 'captcha', session: r.session, captchaImage: r.captchaImage, captchaInput: '' })) } catch { /* تُعرض رسالة عند الإرسال */ }
  }
  const closeChi = () => setChi({ phase: 'idle', session: null, captchaImage: null, captchaInput: '', error: null, attempts: 0, result: null })
  async function submitChiCaptcha() {
    if (!chi.captchaInput || chi.captchaInput.length < 3) return
    setChi(c => ({ ...c, phase: 'verifying', error: null }))
    try {
      const r = await callChiFn({ action: 'verify', iqama: w.iqama_number, captcha: chi.captchaInput, session: chi.session })
      if (r.status === 'invalid_captcha') {
        const next = (chi.attempts || 0) + 1
        if (next >= CHI_MAX_ATTEMPTS) { setChi(c => ({ ...c, phase: 'error', error: T('تعذّر التحقق من رمز الكابتشا بعد عدة محاولات', 'Captcha verification failed after several attempts') })); return }
        const fresh = await callChiFn({ action: 'init' })
        setChi(c => ({ ...c, phase: 'captcha', session: fresh.session, captchaImage: fresh.captchaImage, captchaInput: '', error: T(`رمز التحقق غير صحيح — المحاولة ${next + 1} من ${CHI_MAX_ATTEMPTS}`, `Wrong code — attempt ${next + 1}/${CHI_MAX_ATTEMPTS}`), attempts: next }))
        return
      }
      if (r.code === 'SESSION_EXPIRED' || /expired/i.test(r.error || '')) {
        const fresh = await callChiFn({ action: 'init' })
        setChi(c => ({ ...c, phase: 'captcha', session: fresh.session, captchaImage: fresh.captchaImage, captchaInput: '', error: T('انتهت الجلسة — تم تحديث الرمز', 'Session expired — code refreshed') }))
        return
      }
      if (r.status === 'insured') {
        const end = chiNormDate(r.expiryDate)
        const company = r.company || null
        const policy = r.policyNumber || null
        const patch = { insurance_expiry_date: end || null, insurance_company: company, insurance_policy_number: policy, insurance_checked_at: new Date().toISOString() }
        // تسجيل الاستعلام في سجل التعديلات — القيم قبل/بعد، موسومة بأنها عبر «استعلام التأمين».
        const oldInsExp = w.insurance_expiry_date ? String(w.insurance_expiry_date).slice(0, 10) : null
        const insChanges = [
          ['insurance_company', w.insurance_company || null, company],
          ['insurance_policy_number', w.insurance_policy_number || null, policy],
          ['insurance_expiry_date', oldInsExp, end || null],
        ].filter(([, from, to]) => String(from ?? '') !== String(to ?? ''))
         .map(([field, from, to]) => ({ field, from: from ?? null, to: to ?? null }))
        let logEntry = null
        if (insChanges.length) {
          logEntry = { at: new Date().toISOString(), by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, via: 'insurance_check', changes: insChanges }
          const prevLog = Array.isArray(w.edit_log) ? w.edit_log : []
          patch.edit_log = [...prevLog, logEntry]
        }
        try { await sb.from('temproryworkers').update(patch).eq('id', w.id) } catch { /* العرض يبقى من النتيجة */ }
        if (logEntry) setLogExtra(prev => [...prev, logEntry])   // إظهار القيد في السجل فوراً دون إعادة تحميل
        setInsOverride({ insurance_expiry_date: end || null, insurance_company: company, insurance_policy_number: policy })
        setChi(c => ({ ...c, phase: 'done', result: { insured: true, end, company, policy } }))
      } else {
        setChi(c => ({ ...c, phase: 'done', result: { insured: false } }))
      }
    } catch (e) {
      setChi(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? T('انتهت مهلة الاستعلام', 'Check timed out') : (e.message || T('خطأ في الاستعلام', 'Check error')) }))
    }
  }
  // حقل بنفس تصميم صفحة تفاصيل المنشأة (صندوق داكن، التسمية أعلى، القيمة أسفل + نسخ).
  const Field = ({ k, v, mono, color, link, full }) => {
    const empty = v == null || v === ''
    return (
      <div onClick={link && !empty ? () => goFacility(link) : undefined}
        style={{ gridColumn: full ? '1 / -1' : undefined, background: 'rgba(0,0,0,.18)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, cursor: link && !empty ? 'pointer' : 'default', transition: 'border-color .15s' }}
        onMouseEnter={link && !empty ? (e => { e.currentTarget.style.borderColor = 'rgba(212,160,23,.5)' }) : undefined}
        onMouseLeave={link && !empty ? (e => { e.currentTarget.style.borderColor = 'var(--bd)' }) : undefined}>
        <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
          {!empty && !link && <CopyBtn value={v} toast={toast} T={T} />}
          {!empty && link && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>}
          <span style={{ fontSize: 13, color: empty ? 'var(--tx4)' : (link ? C.gold : (color || 'var(--tx1)')), fontWeight: 600, lineHeight: 1.4, direction: mono ? 'ltr' : 'rtl', fontFamily: mono ? 'ui-monospace, monospace' : F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{empty ? '—' : v}</span>
        </span>
      </div>
    )
  }
  // بطاقة ملف وثيقة (تصميم مربّع) — عرض الملف إن وُجد، وإلا «لا يوجد» (الرفع يتم من نافذة التعديل).
  const FileTile = ({ label, att }) => (
    <div style={{ background: 'rgba(0,0,0,.25)', border: att ? '1px solid rgba(212,160,23,.25)' : '1px dashed var(--bd)', borderRadius: 12, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', minWidth: 0 }}>
      {att ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5a5a55" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
      )}
      <span style={{ fontSize: 11, color: att ? 'var(--tx2)' : 'var(--tx4)', fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{label}</span>
      {att ? (
        <a href={att.file_url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 10.5, fontWeight: 700, color: C.gold, textDecoration: 'none' }}>{T('عرض الملف','View file')}</a>
      ) : (
        <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('لا يوجد','None')}</span>
      )}
    </div>
  )
  const EditBtn = ({ onClick, allow = canEdit }) => allow && onClick ? (
    <button onClick={onClick} title={T('تعديل', 'Edit')}
      style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'var(--accent-soft)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', boxShadow: '0 2px 8px var(--shadowClr)', cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-bg)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-soft)' }}>
      {T('تعديل', 'Edit')}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
    </button>
  ) : null
  const CardHead = ({ children, onEdit: onEditCard, action, allow }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />{children}
      </span>
      {action !== undefined ? action : <EditBtn onClick={onEditCard} allow={allow} />}
    </div>
  )
  // زر إجراء في الترويسة — نفس تصميم زر «حذف المنشأة» (إطار متقطّع بلون قابل للتمرير).
  const HeaderBtn = ({ onClick, color, label, children }) => (
    <button onClick={onClick} title={label}
      style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: `1px dashed ${color}80`, color, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, transition: 'background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}1f` }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
      <span>{label}</span>
      {children}
    </button>
  )

  // حالة الإقامة: أخضر >30، ذهبي 1–30، أحمر ≤0 (نفس عتبات IqamaCell).
  const iqColor = iqamaDays == null ? C.gray : iqamaDays <= 0 ? C.red : iqamaDays <= 30 ? C.gold : C.ok
  const iqShort = iqamaDays == null ? T('غير محدد', '—') : iqamaDays <= 0 ? T('منتهية', 'Expired') : iqamaDays <= 30 ? T('قريبة الانتهاء', 'Expiring') : T('سارية', 'Valid')
  // حالة التأمين الطبي: نفس عتبات الإقامة.
  const insDays = daysUntil(w.insurance_expiry_date)
  const insColor = insDays == null ? C.gray : insDays <= 0 ? C.red : insDays <= 30 ? C.gold : C.ok
  // حالة تأشيرة الخروج: نفس عتبات الإقامة.
  const exitVisaDays = daysUntil(w.exit_visa_expiry)
  const exitColor = exitVisaDays == null ? C.gray : exitVisaDays <= 0 ? C.red : exitVisaDays <= 30 ? C.gold : C.ok

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} />
      </div>
      {/* Header — أيقونة + عنوان عام + وصف + زر الحذف (نفس تصميم تفاصيل المنشأة) */}
      <div style={{ marginBottom: 18, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <div style={{ fontSize: 22, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{T('تفاصيل العامل المؤقت','Temporary Worker Details')}</div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx4)', marginTop: 12, lineHeight: 1.6 }}>
            {T('البيانات الشخصية والوثائق وحالة الإقامة والمنشأة والفرع التابع له.',
               'Personal data, documents, iqama status and the facility & branch he belongs to.')}
          </div>
        </div>
        {canEdit && (onDelete || onTransfer) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            {onTransfer && (
              <HeaderBtn onClick={() => setConfirm('transfer')} color={C.blue} label={T('نقل إلى العمالة الدائمة', 'Move to Permanent')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 3 4 4-4 4"/><path d="M21 7H7"/><path d="m7 13-4 4 4 4"/><path d="M3 17h14"/></svg>
              </HeaderBtn>
            )}
            {onDelete && can(user, 'temp_workers.delete') && (
              <HeaderBtn onClick={() => setConfirm('delete')} color={C.red} label={T('حذف العامل', 'Delete')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </HeaderBtn>
            )}
          </div>
        )}
      </div>

      {/* عمودان: كروت البيانات (يمين) + هيرو الحالة (يسار) — مثل تفاصيل المنشأة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 340px)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* بيانات العامل */}
          {cardVisible(user, 'temp_workers', 'personal_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('data') : undefined} allow={canCardBtn(user, 'temp_workers', 'personal_data', 'edit')}>{T('البيانات الشخصية','Personal Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field full k={T('اسم العامل','Worker Name')} v={w.name_ar || w.name_en} />
              <Field k={T('الجنسية','Nationality')} v={w.nationality_ar} />
              {/* تاريخ الميلاد — العمر كتاق بأيقونة كيكة بجانب التاريخ */}
              <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{T('تاريخ الميلاد','Date of Birth')}</span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, direction: 'ltr' }}>
                  {w.birth_date && calcAge(w.birth_date) != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: C.gold, background: 'rgba(212,160,23,.08)', borderRadius: 20, padding: '3px 10px', direction: 'rtl', fontFamily: F, flexShrink: 0 }}>
                      {T(`${calcAge(w.birth_date)} سنة`, `${calcAge(w.birth_date)} yrs`)}
                    </span>
                  )}
                  {w.birth_date && <CopyBtn value={fmtDate(w.birth_date)} toast={toast} T={T} />}
                  <span style={{ fontSize: 13, color: w.birth_date ? 'var(--tx1)' : 'var(--tx4)', fontWeight: 600, lineHeight: 1.4, direction: 'ltr', fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{w.birth_date ? fmtDate(w.birth_date) : '—'}</span>
                </span>
              </div>
            </div>
          </div>
          )}
          {/* الإقامة وتصريح العمل — وثائق الإقامة السعودية (الإقامة + رخصة العمل + الحدود + ملف مقيم) */}
          {cardVisible(user, 'temp_workers', 'professional_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('docs') : undefined} allow={canCardBtn(user, 'temp_workers', 'professional_data', 'edit')}>{T('البيانات المهنية','Professional Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('رقم الإقامة','Iqama No.')} v={w.iqama_number} mono color={C.gold} />
              <Field k={T('رقم الحدود','Border No.')} v={w.border_number} mono color={C.blue} />
              <Field k={T('تاريخ انتهاء الإقامة','Iqama Expiry')} v={w.iqama_expiry_date ? fmtDate(w.iqama_expiry_date) : null} mono color={iqColor} />
              <Field k={T('تاريخ انتهاء كرت العمل','Work Permit Expiry')} v={w.work_permit_expiry ? fmtDate(w.work_permit_expiry) : null} mono />
              <Field full k={T('المهنة الرسمية','Official Occupation')} v={w.occupation_ar} />
              {/* ملفات الوثائق — بطاقات مربّعة: تأشيرة العمل + رخصة العمل + ملف مقيم (عرض أو رفع PDF). */}
              <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <FileTile label={T('ملف تأشيرة العمل','Work visa file')} att={docFiles.work_visa_file || null} />
                <FileTile label={T('ملف رخصة العمل','Work permit file')} att={docFiles.work_permit_file || null} />
                <FileTile label={T('ملف مقيم','Muqeem file')} att={muqeemAtt} />
              </div>
            </div>
          </div>
          )}
          {/* جواز السفر — وثيقة سفر مستقلة عن الإقامة السعودية */}
          {cardVisible(user, 'temp_workers', 'passport_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('passport') : undefined} allow={canCardBtn(user, 'temp_workers', 'passport_data', 'edit')}>{T('بيانات الجواز','Passport Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('رقم الجواز','Passport No.')} v={w.passport_number} mono color={C.purple} />
              <Field k={T('تاريخ انتهاء الجواز','Passport Expiry')} v={w.passport_expiry ? fmtDate(w.passport_expiry) : null} mono />
            </div>
          </div>
          )}
          {/* التأمين الطبي — استعلام من منصة CHI بكابتشا (نفس تسعيرة تجديد الإقامة) */}
          {cardVisible(user, 'temp_workers', 'medical_insurance_data') && (() => {
            const insCompany = insOverride?.insurance_company ?? w.insurance_company
            const insPolicy = insOverride?.insurance_policy_number ?? w.insurance_policy_number
            const insExpiry = insOverride?.insurance_expiry_date ?? w.insurance_expiry_date
            const insD = daysUntil(insExpiry)
            const insClr = insD == null ? C.gray : insD <= 0 ? C.red : insD <= 30 ? C.gold : C.ok
            return (
              <div style={cardChrome}>
                <CardHead action={canCardBtn(user, 'temp_workers', 'medical_insurance_data', 'check_insurance') ? (
                  <button onClick={startChiCheck} disabled={!w.iqama_number} title={!w.iqama_number ? T('لا يوجد رقم إقامة', 'No Iqama number') : T('استعلام التأمين من منصة CHI', 'Check insurance via CHI')}
                    style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(59,178,122,.1)', border: '1px solid rgba(59,178,122,.5)', color: '#3bb27a', cursor: w.iqama_number ? 'pointer' : 'not-allowed', opacity: w.iqama_number ? 1 : .5, fontFamily: F, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .15s' }}
                    onMouseEnter={e => { if (w.iqama_number) e.currentTarget.style.background = 'rgba(59,178,122,.18)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,178,122,.1)' }}>
                    {T('استعلام التأمين', 'Check insurance')}
                    <HeartPulse size={13} />
                  </button>
                ) : null}>{T('بيانات التأمين الطبي','Medical Insurance Data')}</CardHead>
                <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field k={T('تاريخ انتهاء التأمين','Insurance Expiry')} v={insExpiry ? fmtDate(insExpiry) : null} mono color={insClr} />
                  <Field k={T('رقم البوليصة','Policy No.')} v={insPolicy} mono color={C.purple} />
                  <Field full k={T('شركة التأمين','Insurance Company')} v={insCompany} />
                </div>
              </div>
            )
          })()}
          {/* تأشيرات الخروج والعودة والخروج النهائي — النوع + رقم التأشيرة + تاريخ الانتهاء */}
          {cardVisible(user, 'temp_workers', 'exit_visa_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('exit_visa') : undefined} allow={canCardBtn(user, 'temp_workers', 'exit_visa_data', 'edit')}>{T('بيانات تأشيرات الخروج والعودة والخروج النهائي','Exit & Final Exit Visas Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* نوع التأشيرة — مع تاق نوع الخروج النهائي (دائمة/مؤقتة) بجانب القيمة عند الخروج النهائي */}
              <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{T('نوع التأشيرة','Visa Type')}</span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, direction: 'ltr' }}>
                  {w.exit_visa_type === 'final_exit' && finalExitKindLabel(w.final_exit_kind, T) && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: C.gold, background: 'rgba(212,160,23,.08)', borderRadius: 20, padding: '3px 10px', direction: 'rtl', fontFamily: F, flexShrink: 0 }}>
                      {finalExitKindLabel(w.final_exit_kind, T)}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: w.exit_visa_type ? (w.exit_visa_type === 'final_exit' ? C.red : C.blue) : 'var(--tx4)', fontWeight: 600, lineHeight: 1.4, direction: 'rtl', fontFamily: F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                    {exitVisaTypeLabel(w.exit_visa_type, T) || '—'}
                  </span>
                </span>
              </div>
              <Field k={T('رقم التأشيرة','Visa No.')} v={w.exit_visa_number} mono color={C.blue} />
              <Field full k={T('تاريخ انتهاء التأشيرة','Visa Expiry Date')} v={w.exit_visa_expiry ? fmtDate(w.exit_visa_expiry) : null} mono color={exitColor} />
              <div style={{ gridColumn: '1 / -1' }}>
                <FileTile label={T('ملف التأشيرة','Visa file')} att={docFiles.exit_visa_file || null} />
              </div>
            </div>
          </div>
          )}
          {/* أرقام التواصل — رقم جوال رسمي + أرقام جوال الفواتير (مصفوفة، تُضاف تلقائياً من جوال الفاتورة) */}
          {cardVisible(user, 'temp_workers', 'billing_contact_data') && (
          <div style={cardChrome}>
            <CardHead>{T('بيانات التواصل الفاتورية','Billing Contact Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,.18)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{T('أرقام جوال الفواتير','Billing Mobiles')}</span>
                {billingList.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {billingList.map((p, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.25)' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.gold, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{fmtMobile(p)}</span>
                        <CopyBtn value={fmtMobile(p)} toast={toast} T={T} />
                      </span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: 12.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('لا يوجد','None')}</span>
                )}
              </div>
            </div>
          </div>
          )}
          {/* البيانات الفعلية — رقم الجوال الرسمي + المهنة الفعلية + مدينة المقر */}
          {cardVisible(user, 'temp_workers', 'actual_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('actual') : undefined} allow={canCardBtn(user, 'temp_workers', 'actual_data', 'edit')}>{T('البيانات الفعلية','Actual Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('رقم جوال ابشر','Absher Mobile')} v={fmtMobile(w.official_mobile) || null} mono color={C.ok} />
              <Field k={T('مدينة المقر','HQ City')} v={w.hq_city_ar} />
              <Field full k={T('المهنة الفعلية','Actual Occupation')} v={w.official_occupation_ar} />
            </div>
          </div>
          )}
          {/* المنشأة والفرع */}
          {cardVisible(user, 'temp_workers', 'facility_and_branch') && (
          <div style={cardChrome}>
            <CardHead>{T('المنشأة والفرع','Facility & Branch')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('المنشأة','Facility')} v={f?.name_ar || f?.name_en} link={f?.id} />
              <Field k={T('الفرع التابع','Branch')} v={branchLabel} />
            </div>
          </div>
          )}

          {/* كرت الفواتير والخدمات — إجماليات + قائمة (نقرة على الفاتورة → تفاصيل الفاتورة). نفس صفحة المنشأة. */}
          {cardVisible(user, 'temp_workers', 'invoices_and_services') && (
          <div style={cardChrome}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.blue }}>{T('الفواتير والخدمات', 'Invoices & Services')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)' }}>{facRows ? `${num(facListRows.length)} ${T('طلب', 'requests')}` : '—'}</span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  { l: T('الإجمالي', 'Total'), v: totals.tot, c: C.gold },
                  { l: T('المدفوع', 'Paid'), v: totals.paid, c: C.ok },
                  { l: T('المتبقي', 'Remaining'), v: totals.rem, c: C.red },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,.22)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{s.l}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: s.c, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{num(Math.round(s.v))}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {facRows === null ? (
                  <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '8px 0' }}>{T('جارٍ التحميل…', 'Loading…')}</div>
                ) : facListRows.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '8px 0' }}>{T('لا توجد فواتير أو خدمات مرتبطة', 'No invoices or services linked')}</div>
                ) : facListRows.map((r, i) => {
                  const cancelled = r.invoice_status === 'cancelled'
                  const paidUp = r.invoice_id && Number(r.remaining_amount) <= 0 && !cancelled
                  const stt = cancelled ? { t: T('ملغاة', 'Cancelled'), c: C.red } : paidUp ? { t: T('مدفوعة', 'Paid'), c: C.ok } : r.invoice_id ? { t: `${num(Math.round(Number(r.remaining_amount) || 0))} ${T('متبقٍ', 'Due')}`, c: C.red } : null
                  return (
                    <div key={i} onClick={r.invoice_id ? () => goInvoice(r.invoice_id) : undefined} title={r.invoice_id ? T('عرض تفاصيل الفاتورة', 'View invoice') : ''}
                      style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: cancelled ? 'rgba(232,114,101,.07)' : 'rgba(0,0,0,.18)', border: `1px solid ${cancelled ? 'rgba(232,114,101,.28)' : 'var(--bd)'}`, borderRadius: 10, cursor: r.invoice_id ? 'pointer' : 'default', transition: 'border-color .15s' }}
                      onMouseEnter={e => { if (r.invoice_id) e.currentTarget.style.borderColor = cancelled ? 'rgba(232,114,101,.7)' : 'rgba(212,160,23,.5)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = cancelled ? 'rgba(232,114,101,.28)' : 'var(--bd)' }}>
                      {cancelled && (
                        <div aria-hidden="true" style={{ position: 'absolute', top: '50%', insetInlineStart: '50%', transform: 'translate(-50%, -50%) rotate(-16deg)', fontSize: 30, fontWeight: 800, letterSpacing: 2, color: 'rgba(232,114,101,.13)', border: '3px solid rgba(232,114,101,.16)', borderRadius: 10, padding: '2px 24px', pointerEvents: 'none', whiteSpace: 'nowrap', fontFamily: F }}>{T('ملغاة', 'Cancelled')}</div>
                      )}
                      <div style={{ position: 'relative', minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.service_ar || T('خدمة', 'Service')}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontFamily: 'ui-monospace, monospace', direction: 'ltr', marginTop: 2 }}>{T('مرجع', 'Ref')}: {r.request_ref_no || '—'}</div>
                      </div>
                      <div style={{ position: 'relative', textAlign: 'end', flexShrink: 0 }}>
                        {r.invoice_no ? (
                          <div style={{ fontSize: 11.5, fontWeight: 600, color: cancelled ? C.red : C.gold, direction: 'ltr', display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                            {r.invoice_no}
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>
                          </div>
                        ) : <span style={{ fontSize: 11, color: 'var(--tx5)' }}>{T('بدون فاتورة', 'No invoice')}</span>}
                        {stt && !cancelled && <div style={{ fontSize: 10.5, fontWeight: 600, color: stt.c, marginTop: 2, direction: 'rtl' }}>{stt.t}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          )}

          {/* سجل التعديلات — يظهر فقط عند وجود تعديلات (نفس صفحة المنشأة). */}
          {cardVisible(user, 'temp_workers', 'activity_log') && (
          <WorkerEditLog entries={[...(Array.isArray(w.edit_log) ? w.edit_log : []), ...logExtra]} created={w.created_at ? { at: w.created_at, by_name: creatorName, label: wName } : null} fileUrls={attUrls} T={T} />
          )}
        </div>

        {/* هيرو الحالة — حالة الإقامة (تصميم «حالة كبيرة») + تاق تأشيرة الخروج أسفله */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={cardChrome}>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--tx4)', letterSpacing: '.5px' }}>{T('حالة الإقامة','Iqama Status')}</span>
              <div style={{ margin: '10px 0 2px', fontSize: 28, fontWeight: 600, color: iqColor, lineHeight: 1.1 }}>{iqShort}</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', gap: 20, marginTop: 18 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx4)' }}>{T('تاريخ الانتهاء','Expiry')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: w.iqama_expiry_date ? iqColor : 'var(--tx4)', direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace' }}>{w.iqama_expiry_date ? fmtDate(w.iqama_expiry_date) : '—'}</div>
                </div>
                <div style={{ width: 1, background: 'var(--bd)' }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx4)' }}>{iqamaDays != null && iqamaDays < 0 ? T('منذ','Since') : T('متبقٍ','Remaining')}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, color: iqamaDays == null ? 'var(--tx4)' : iqColor, direction: 'rtl' }}>{iqamaDays != null ? `${Math.abs(iqamaDays)} ${T('يوم','days')}` : '—'}</div>
                </div>
              </div>
            </div>
          </div>
          {/* تاق تأشيرة الخروج — يظهر فقط عند وجود تأشيرة خروج وعودة / خروج نهائي */}
          {w.exit_visa_type && (() => {
            // لون التاق حسب النوع: خروج وعودة ذهبي، خروج نهائي دائمة أحمر، خروج نهائي مؤقتة أحمر+ذهبي.
            const isFinal = w.exit_visa_type === 'final_exit'
            const isTemp = isFinal && w.final_exit_kind === 'temporary'
            const c1 = isFinal ? C.red : C.gold        // اللون الأساسي (النوع)
            const c2 = isTemp ? C.gold : c1            // اللون الثانوي (نوع الخروج النهائي)
            const cdTxt = exitVisaDays == null ? null
              : exitVisaDays < 0 ? `${T('منذ','since')} ${Math.abs(exitVisaDays)} ${T('يوم','days')}`
              : exitVisaDays === 0 ? T('ينتهي اليوم','expires today')
              : `${T('متبقٍ','left')} ${exitVisaDays} ${T('يوم','days')}`
            // تصميم «مُحدّد بأيقونة» (Outline) — توزيع «العدّاد جانبي»: النوع+التاريخ مكدّسان والعدّاد على الجانب (وزن الخط ≤ 600)
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 11, background: 'transparent', border: `1.5px solid ${c1}70`, borderRadius: 14, padding: '9px 13px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LogOut size={15} style={{ color: c1, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, direction: 'rtl' }}>
                      <span style={{ color: c1 }}>{exitVisaTypeLabel(w.exit_visa_type, T)}</span>
                      {isFinal && finalExitKindLabel(w.final_exit_kind, T) ? <span style={{ color: c2 }}>{` - ${finalExitKindLabel(w.final_exit_kind, T)}`}</span> : null}
                    </span>
                  </div>
                  {w.exit_visa_expiry && (
                    <span style={{ alignSelf: 'center', fontSize: 11.5, fontWeight: 600, color: 'var(--tx2)', direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace' }}>{fmtDate(w.exit_visa_expiry)}</span>
                  )}
                </div>
                {cdTxt && (
                  <span style={{ background: exitColor, color: '#10100c', borderRadius: 10, padding: '6px 11px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', direction: 'rtl', flexShrink: 0 }}>{cdTxt}</span>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      {/* تأكيد حذف العامل (حذف ناعم — deleted_at) — نفس صفحة المنشأة. */}
      {confirm === 'delete' && (
        <FKModal open variant="delete" width={460} Icon={Trash2}
          onClose={closeConfirm}
          title={T('حذف العامل', 'Delete worker')}
          success={done ? <SuccessView title={done.title} /> : undefined}
          footer={
            <ActionButton Icon={Trash2} color={C.red} disabled={busy} onClick={doDelete}>
              {busy ? T('جارٍ الحذف…', 'Deleting…') : T('تأكيد الحذف', 'Confirm delete')}
            </ActionButton>
          }>
          <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.8, padding: '2px 2px 6px' }}>
            {T(`سيتم حذف العامل «${wName}» وإخفاؤه من قائمة العمالة المؤقتة. لن يظهر بعد الحذف في الواجهة.`,
               `The worker “${wName}” will be deleted and hidden from the temporary workers list.`)}
          </div>
        </FKModal>
      )}

      {/* تأكيد نقل العامل إلى العمالة الدائمة — نسخ إلى workers + حذف ناعم هنا. */}
      {confirm === 'transfer' && (
        <FKModal open variant="delete" width={460} accent={C.blue} Icon={Users}
          onClose={closeConfirm}
          title={T('نقل إلى العمالة الدائمة', 'Move to permanent workforce')}
          success={done ? <SuccessView title={done.title} /> : undefined}
          footer={
            <ActionButton Icon={Users} color={C.blue} disabled={busy} onClick={doTransfer}>
              {busy ? T('جارٍ النقل…', 'Moving…') : T('تأكيد النقل', 'Confirm move')}
            </ActionButton>
          }>
          <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.8, padding: '2px 2px 6px' }}>
            {T(`سيتم نقل العامل «${wName}» إلى قائمة العمالة الدائمة وإزالته من قائمة العمالة المؤقتة.`,
               `The worker “${wName}” will be moved to the permanent workforce and removed from the temporary list.`)}
          </div>
        </FKModal>
      )}

      {/* ═══ نافذة استعلام التأمين الطبي (CHI) — كابتشا، مثل تسعيرة تجديد الإقامة ═══ */}
      {chi.phase !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,5,8,.82)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: 16, fontFamily: F }} dir={isAr ? 'rtl' : 'ltr'}>
          <style>{`@keyframes rnw-spin{to{transform:rotate(360deg)}}`}</style>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', background: '#141518', borderRadius: 16, border: '1px solid rgba(11,109,61,.4)', padding: 22, boxShadow: '0 28px 70px rgba(0,0,0,.6)', position: 'relative' }}>
            <button onClick={closeChi} style={{ position: 'absolute', top: 12, [isAr ? 'left' : 'right']: 12, width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            <div style={{ textAlign: isAr ? 'right' : 'left', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(255,255,255,.06)', [isAr ? 'paddingLeft' : 'paddingRight']: 36 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.94)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
                <HeartPulse size={22} style={{ color: '#3bb27a' }} />
                <span>{T('التأمين الطبي (CHI)', 'Medical Insurance (CHI)')}</span>
              </div>
            </div>

            {chi.phase === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(11,109,61,.18)', borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'rnw-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{T('جاري الاتصال بمنصة التأمين…', 'Connecting to insurance platform…')}</div>
              </div>
            )}

            {chi.phase === 'captcha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', textAlign: isAr ? 'right' : 'left' }}>{T('أدخل رمز التحقق الظاهر بالصورة', 'Enter the captcha shown in the image')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 8px' }}>
                  {chi.captchaImage
                    ? <ChiCountdown captchaKey={chi.captchaImage} onExpire={refreshChiCaptcha} color="#3bb27a" />
                    : <div style={{ width: 38, height: 38, flexShrink: 0 }} aria-hidden="true" />}
                  {chi.captchaImage
                    ? <img src={chi.captchaImage} alt="captcha" style={{ height: 72, borderRadius: 12, background: '#fff', padding: 4 }} />
                    : <span style={{ fontSize: 14, color: '#888' }}>{T('...جاري التحميل', 'Loading...')}</span>}
                  <button type="button" onClick={refreshChiCaptcha} title={T('رمز تحقق جديد', 'New captcha')} style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', border: 'none', background: 'rgba(11,109,61,.12)', color: '#3bb27a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RefreshCw size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <input value={chi.captchaInput} onChange={e => setChi(c => ({ ...c, captchaInput: e.target.value.replace(/\s/g, '').slice(0, 8) }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitChiCaptcha() }} placeholder="______" autoFocus maxLength={8}
                  style={{ height: 48, width: 240, alignSelf: 'center', padding: '0 18px', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, fontFamily: F, fontSize: 20, fontWeight: 700, color: 'var(--tx)', outline: 'none', background: 'rgba(0,0,0,.25)', textAlign: 'center', letterSpacing: '8px', direction: 'ltr' }} />
                {chi.error && <div style={{ fontSize: 12, color: C.red, textAlign: 'center', marginTop: -10, marginBottom: -4 }}>{chi.error}</div>}
                <button onClick={submitChiCaptcha} disabled={!chi.captchaInput || chi.captchaInput.length < 3} style={{ height: 48, width: 240, alignSelf: 'center', borderRadius: 12, border: '1px solid rgba(59,178,122,.55)', background: 'linear-gradient(180deg,#4ac888 0%,#2d9963 100%)', color: '#fff', fontFamily: F, fontSize: 16, fontWeight: 700, cursor: (!chi.captchaInput || chi.captchaInput.length < 3) ? 'not-allowed' : 'pointer', opacity: (!chi.captchaInput || chi.captchaInput.length < 3) ? 0.45 : 1 }}>{T('استعلام', 'Check')}</button>
              </div>
            )}

            {chi.phase === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(11,109,61,.18)', borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'rnw-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{T('جاري الاستعلام…', 'Checking…')}</div>
              </div>
            )}

            {chi.phase === 'done' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {chi.result?.insured ? (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(39,160,70,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27a046' }}><Check size={30} strokeWidth={2.5} /></div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#27a046' }}>{T('تم جلب بيانات التأمين', 'Insurance data fetched')}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[[T('شركة التأمين', 'Company'), chi.result.company], [T('رقم البوليصة', 'Policy No.'), chi.result.policy], [T('تاريخ انتهاء التأمين', 'Expiry'), chi.result.end ? fmtDate(chi.result.end) : null]].map(([k, v], i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
                          <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>{k}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: v ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.4)', direction: 'ltr' }}>{v || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(212,160,23,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}><AlertCircle size={28} /></div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.gold, textAlign: 'center' }}>{T('لا يوجد تأمين ساري للعامل', 'No active insurance found')}</div>
                  </div>
                )}
                <button onClick={closeChi} style={{ height: 44, borderRadius: 11, border: '1px solid rgba(59,178,122,.4)', background: 'rgba(59,178,122,.12)', color: '#3bb27a', fontFamily: F, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{T('تم', 'Done')}</button>
              </div>
            )}

            {chi.phase === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}><AlertCircle size={28} /></div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.red, textAlign: 'center' }}>{T('تعذّر الاستعلام', 'Check failed')}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.55)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>{chi.error}</div>
                </div>
                <button onClick={startChiCheck} style={{ height: 40, borderRadius: 10, border: '1px solid rgba(11,109,61,.4)', background: 'rgba(11,109,61,.12)', color: '#3bb27a', fontFamily: F, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{T('إعادة المحاولة', 'Retry')}</button>
                <button onClick={closeChi} style={{ height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: 'rgba(255,255,255,.5)', fontFamily: F, fontSize: 14, cursor: 'pointer' }}>{T('إغلاق', 'Close')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FacChip({ label, value, toast, T }) {
  return (
    <div style={{ background: 'rgba(0,0,0,.18)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: value ? 'var(--tx)' : 'var(--tx5)', fontWeight: 700, direction: 'ltr', fontFamily: 'ui-monospace, monospace', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {value || '—'}
        {value && <CopyBtn value={value} toast={toast} T={T} />}
      </div>
    </div>
  )
}
