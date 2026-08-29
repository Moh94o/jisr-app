import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import BackButton from './components/BackButton'
import { can as canPerm, cardVisible, canCardBtn, isGM } from './lib/permissions.js'
import { navSetHere } from './lib/navStack.js'
import { UserPlus, Building2, Search, X, Hash, FileText, ShieldCheck, Users, MapPin, Check, Plus, Pencil, Trash2, Phone, ChevronLeft, ChevronRight, HeartPulse, RefreshCw, AlertCircle, LogOut } from 'lucide-react'
import { Modal as FKModal, ModalSection, ActionButton, SuccessView, GRID, TextField, IdField, DateField, Select, Dropdown as FKDropdown, FileField, PhoneField, PhoneListField, EmptyState } from './components/ui/FormKit.jsx'
import InvoiceReceiptCard from './components/ui/InvoiceReceiptCard.jsx'
import { buildMuqeemRenewBookmarklet } from './pages/muqeemRenewBookmarklet.js'

const F = "'Cairo','Tajawal',sans-serif"
const C = {
  gold: '#B07D00',
  blue: '#5dade2', purple: '#bb8fce', cyan: '#16a085', orange: '#f39c12', gray: '#95a5a6',
  ok: '#2ecc71', warn: '#eab308', red: '#e87265',
}
const PAGE = 100

// صورة العامل تأتي من مزامنة مقيم (bucket عام muqeem-pdfs) عبر workers.photo_path.
const WORKER_PHOTO_BASE = 'https://gcvshzutdslmdkwqwteh.supabase.co/storage/v1/object/public/muqeem-pdfs/'
const workerPhotoUrl = (path) => path ? WORKER_PHOTO_BASE + String(path).split('/').map(encodeURIComponent).join('/') : null

// منصات المصدر — تُغذّي شارات مصدر الحقل المخزّنة في workers.field_sources
// (يكتبها النقل المدمج promote_sync_to_canonical بترتيب الموثوقية). logo = شعار
// المنصة في public/ (نفس ملفات أيقونات المصدر في مركز المزامنة).
const SOURCE_BRAND = {
  sbc: { color: '#9b59b6', ar: 'المركز السعودي', en: 'SBC', logo: '/sbc-logo.jpg', short: 'م.س' },
  muqeem: { color: '#f59e0b', ar: 'مقيم', en: 'Muqeem', logo: '/muqeem-logo.png', short: 'مقيم' },
  qiwa: { color: '#3b82f6', ar: 'قوى', en: 'Qiwa', logo: '/qiwa-logo.jpg', short: 'قوى' },
  gosi: { color: '#22c55e', ar: 'التأمينات', en: 'GOSI', logo: '/gosi.logo.png', short: 'تأ' },
  mudad: { color: '#0ea5e9', ar: 'مدد', en: 'Mudad', logo: '/mudad.jpg', short: 'مدد' },
  ajeer: { color: '#eab308', ar: 'أجير', en: 'Ajeer', logo: '/ajeer.png', short: 'أجير' },
}
// شعار المنصة مصدر الحقل — صورة دائرية صغيرة بحدّ بلون المنصة، مع بديل نصّي
// (اختصار عربي) لو تعذّر تحميل الشعار. يظهر فقط عندما يعرف الحقل مصدره.
const SrcPill = ({ src, isAr, size = 16 }) => {
  const b = SOURCE_BRAND[src]
  const [failed, setFailed] = useState(false)
  if (!b) return null
  const title = isAr ? b.ar : b.en
  if (failed || !b.logo) return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, borderRadius: '50%', background: `${b.color}22`, color: b.color, fontSize: Math.round(size * 0.42), fontWeight: 600, lineHeight: 1, flexShrink: 0, fontFamily: F }}>
      {b.short}
    </span>
  )
  return (
    <img src={b.logo} alt={title} title={title} width={size} height={size} loading="lazy" onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', background: '#fff', border: `1.5px solid ${b.color}`, padding: 1, flexShrink: 0 }} />
  )
}
// صورة رمزية للعامل: صورة مقيم إن وُجدت وإلا الحرف الأول من الاسم داخل دائرة.
const WorkerAvatar = ({ w, size = 34, radius }) => {
  const [err, setErr] = useState(false)
  const url = workerPhotoUrl(w?.photo_path)
  const initial = (w?.name_ar || w?.name_en || '؟').trim().charAt(0)
  if (url && !err) return (
    <img src={url} alt="" loading="lazy" onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: radius ?? '50%', objectFit: 'cover', objectPosition: 'top', border: '1px solid rgba(176,125,0,.35)', background: 'var(--inputBg)', flexShrink: 0 }} />
  )
  return (
    <span style={{ width: size, height: size, borderRadius: radius ?? '50%', background: 'rgba(176,125,0,.1)', border: '1px solid rgba(176,125,0,.25)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * .42, fontWeight: 600, color: C.gold, flexShrink: 0 }}>
      {initial}
    </span>
  )
}

const num = (v) => Number(v || 0).toLocaleString('en-US')
// صيغة العدد العربية: 3–10 تأخذ الجمع، وغيرها المفرد (نفس منطق صفحة المنشآت).
const arCount = (n, one, few) => (Number(n) >= 3 && Number(n) <= 10) ? few : one
const fmtDate = (s) => { if (!s) return '—'; try { return new Date(s).toISOString().slice(0,10) } catch { return '—' } }
// تواريخ مقيم قد تأتي «يوم/شهر/سنة» أو ISO — تُحوَّل لصيغة سنة-شهر-يوم للعرض.
const fmtMDate = (s) => {
  if (!s) return null
  const str = String(s).trim()
  const dmy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2,'0')}-${String(dmy[1]).padStart(2,'0')}`
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0,10)
  return str
}
// آخر عنصر تأشيرة (الأحدث بتاريخ المعاملة) من مصفوفة تقارير مقيم.
const latestVisa = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return null
  return [...arr].sort((a,b) => String(b?.transactionDate||'').localeCompare(String(a?.transactionDate||'')))[0]
}
// تحويل تاريخ هجري (تقويم جدولي) إلى ميلادي — كافٍ لمقارنة سارية/منتهية.
const hijriToGreg = (hy, hm, hd) => {
  const jd = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm - Math.floor((hm - 1) / 2) + hd + 1948440 - 385
  let l = jd + 68569
  const n = Math.floor((4 * l) / 146097); l -= Math.floor((146097 * n + 3) / 4)
  const i = Math.floor((4000 * (l + 1)) / 1461001); l = l - Math.floor((1461 * i) / 4) + 31
  const j = Math.floor((80 * l) / 2447); const d = l - Math.floor((2447 * j) / 80)
  l = Math.floor(j / 11); const m = j + 2 - 12 * l; const y = 100 * (n - 49) + i + l
  return new Date(y, m - 1, d)
}
// «العودة قبل» لتأشيرة الخروج والعودة كتاريخ ميلادي (ISO ميلادي أو d/m/yyyy ميلادي/هجري).
const visaReturnDate = (v) => {
  const raw = v?.visaNewReturnBefore || v?.visaReturnBefore
  if (!raw) return null
  const s = String(raw).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3])
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) {
    const dd = +dmy[1], mm = +dmy[2], yy = +dmy[3]
    return yy >= 1900 ? new Date(yy, mm - 1, dd) : hijriToGreg(yy, mm, dd)
  }
  return null
}
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
  occupation_ar: ['المهنة الرسمية', 'Official Occupation'],
  official_occupation_id: ['المهنة الفعلية', 'Actual Occupation'],
  residency_status_ar: ['حالة الإقامة في مقيم', 'Muqeem Residency Status'],
  sponsor_changes: ['عدد مرات النقل', 'Sponsor Transfers'],
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
  branch_id: ['الفرع التابع', 'Branch'],
  exit_visa_type: ['نوع تأشيرة الخروج', 'Exit visa type'],
  exit_visa_number: ['رقم التأشيرة', 'Visa no.'],
  exit_visa_issue_date: ['تاريخ إصدار التأشيرة', 'Visa issue date'],
  exit_visa_expiry: ['تاريخ انتهاء التأشيرة', 'Visa expiry'],
  final_exit_kind: ['نوع الخروج النهائي', 'Final exit kind'],
  final_exit_reason: ['سبب الخروج النهائي', 'Final exit reason'],
  exit_reentry_kind: ['نوع تأشيرة الخروج والعودة', 'Exit & re-entry kind'],
  exit_final_invoice_no: ['رقم فاتورة الخروج النهائي', 'Final exit invoice no.'],
  muqeem_file: ['ملف مقيم', 'Muqeem file'],
  work_visa_file: ['ملف تأشيرة العمل', 'Work visa file'],
  work_permit_file: ['ملف رخصة العمل', 'Work permit file'],
  exit_visa_file: ['ملف التأشيرة', 'Visa file'],
}
const fmtAgo = (iso, isAr) => {
  if (!iso) return '—'
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return isAr ? 'الآن' : 'now'
  if (d < 3600) { const n = Math.floor(d/60); return isAr ? `قبل ${n} ${arCount(n,'دقيقة','دقائق')}` : `${n}m ago` }
  if (d < 86400) { const n = Math.floor(d/3600); return isAr ? `قبل ${n} ${arCount(n,'ساعة','ساعات')}` : `${n}h ago` }
  const n = Math.floor(d/86400); return isAr ? `قبل ${n} ${arCount(n,'يوم','أيام')}` : `${n}d ago`
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

// ═══ مصنّفات الشرائح لكرت التصفية — تحوّل قيمة خام إلى مفتاح شريحة ثابت ═══
// تصنيف تاريخ الانتهاء (إقامة/رخصة/جواز/تأمين) إلى شريحة زمنية موحّدة.
// السعودي = الجنسية «سعودي/سعودية» أو رقم الإقامة يبدأ بـ1 (الهوية الوطنية تبدأ بـ1،
// الإقامة بـ2). يُستبعد من سجل العمالة الدائمة (المخصّص للعمالة الوافدة).
const isSaudiWorker = (w) => {
  if (String(w?.nationality_ar || '').includes('سعودي')) return true
  return /^1/.test(String(w?.iqama_number || '').trim())
}
// شريحة رصيد الجوازات من مقيم (خريطة رقم الإقامة → الرصيد).
const balBucketOf = (w, balMap) => {
  const b = balMap[String(w.iqama_number)]
  if (b == null || b === '') return 'none'
  const n = Number(b)
  if (isNaN(n)) return 'none'
  return n > 0 ? 'has' : 'zero'
}
// شريحة المتبقي من فواتير العامل (خريطة worker.id → ملخّص الفواتير).
const invRemBucketOf = (w, invMap) => {
  const inv = invMap[w.id]
  if (!inv || !inv.list || !inv.list.length) return 'none'
  return inv.remaining > 0 ? 'due' : 'zero'
}
const expBucket = (iso) => {
  const d = daysUntil(iso)
  if (d == null) return 'none'
  if (d <= 0) return 'expired'
  if (d <= 10) return '10d'
  if (d <= 30) return '30d'
  if (d <= 60) return '60d'
  if (d <= 90) return '90d'
  if (d <= 180) return '6m'   // 91 يوم حتى 6 أشهر (180 يوم)
  return 'valid'
}
// تصنيف الراتب (الأجر الكلي) إلى شريحة.
const wageBucket = (v) => {
  const n = v == null || v === '' ? NaN : Number(v)
  if (isNaN(n) || n <= 0) return 'none'
  if (n <= 400) return 'w1'
  if (n <= 500) return 'w2'
  if (n <= 2800) return 'w3'
  if (n <= 10000) return 'w4'
  return 'w5'
}
// شريحة الخروج النهائي — من تاريخ المغادرة النهائية (fe) متى وُجد. ثلاث شرائح.
// (لا نشترط علم «خارج المملكة» لأنه غير موثوق في البيانات؛ وجود التاريخ نفسه هو الإشارة).
const finalExitBucket = (w, exitMap) => {
  const d = daysUntil(exitMap[String(w.iqama_number)]?.fe)
  if (d == null) return null
  if (d <= 0) return 'expired'
  if (d <= 30) return '30d'
  if (d <= 60) return '60d'
  return null
}
// شريحة خروج وعودة — من تاريخ العودة (er) متى وُجد. خمس شرائح.
const exitReturnBucket = (w, exitMap) => {
  const d = daysUntil(exitMap[String(w.iqama_number)]?.er)
  if (d == null) return null
  if (d <= 0) return 'expired'
  if (d <= 30) return '30d'
  if (d <= 60) return '60d'
  if (d <= 90) return '90d'
  return '90p'
}
// تصنيف العمر إلى شريحة عمرية.
const ageBucket = (iso) => {
  const a = calcAge(iso)
  if (a == null) return 'none'
  if (a < 25) return 'a1'
  if (a <= 35) return 'a2'
  if (a <= 45) return 'a3'
  if (a <= 60) return 'a4'
  return 'a5'
}

const cardChrome = {
  borderRadius: 14,
  background: 'var(--card-grad2)',
  border: '1px solid var(--bd)',
  boxShadow: 'var(--shadow-sm)',
  overflow: 'hidden',
}
const cardHeader = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '12px 22px',
  borderBottom: '1px solid var(--bd)',
}
const cardTitle = { fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }

const STATUS_THEME = {
  active:    { c: C.ok,     label_ar: 'نشط',     label_en: 'Active' },
  suspended: { c: C.orange, label_ar: 'معلّق',   label_en: 'Suspended' },
}
const themeForStatus = (s) => STATUS_THEME[s] || { c: C.gray, label_ar: s || '—', label_en: s || '—' }

// كل صيغة جنسية (اسم دولة أو صفة) → رمز الدولة. مصدرٌ واحد لتوحيد الصيغتين وعرض العلم.
const NAT_CODES = {
  'أردني':'JO','الأردن':'JO','أفغاني':'AF','أفغانستان':'AF','افغانستان':'AF','أوغندي':'UG','أوغندا':'UG','إثيوبي':'ET','إثيوبيا':'ET','إندونيسي':'ID','إندونيسيا':'ID',
  'باكستاني':'PK','باكستان':'PK','بنجلاديش':'BD','بنجلاديشي':'BD','بنغلاديشي':'BD','بنغلادش':'BD',
  'تركي':'TR','تركيا':'TR','تونسي':'TN','تونس':'TN','سريلانكي':'LK','سريلانكا':'LK','سعودي':'SA','السعودية':'SA','سوداني':'SD','السودان':'SD','سوري':'SY','سوريا':'SY',
  'فلبيني':'PH','الفلبين':'PH','كيني':'KE','كينيا':'KE','مصري':'EG','مصر':'EG','مغربي':'MA','المغرب':'MA','ميانمار':'MM','نيبالي':'NP','نيبال':'NP','هندي':'IN','الهند':'IN','يمني':'YE','اليمن':'YE','بريطاني':'GB','بريطانيا':'GB',
}
// رمز الدولة → اسمها المعتمد (اسم الدولة لا الصفة) — يُوحّد «مصري»/«مصر» إلى «مصر».
const NAT_CODE_NAME = {
  JO:'الأردن', AF:'أفغانستان', UG:'أوغندا', ET:'إثيوبيا', ID:'إندونيسيا', PK:'باكستان', BD:'بنجلاديش',
  TR:'تركيا', TN:'تونس', LK:'سريلانكا', SA:'السعودية', SD:'السودان', SY:'سوريا',
  PH:'الفلبين', KE:'كينيا', EG:'مصر', MA:'المغرب', MM:'ميانمار', NP:'نيبال', IN:'الهند', YE:'اليمن', GB:'بريطانيا',
}
// توحيد إملاءات الجنسية المتعددة إلى شكل واحد معتمد (بنجلادشي/بنغلادش/… → بنجلاديش).
const NAT_ALIASES = {
  'بنجلادش':'بنجلاديش','بنجلادشي':'بنجلاديش','بنجلاديشي':'بنجلاديش',
  'بنغلادش':'بنجلاديش','بنغلادشي':'بنجلاديش','بنغلاديش':'بنجلاديش','بنغلاديشي':'بنجلاديش',
}
const normNat = (s) => { const t = (s || '').trim(); return NAT_ALIASES[t] || t }
// اسم مختصر للمنشأة في القوائم — نوع الكيان + أول كلمة مميّزة (مثال: «شركة العنود صالح اليامي» → «شركة العنود»).
const shortFacName = (s) => {
  const t = (s || '').trim().replace(/\s+/g, ' ')
  if (!t) return t
  const parts = t.split(' ')
  return parts.length <= 2 ? t : parts.slice(0, 2).join(' ')
}
// اسم الجنسية الموحّد للعرض والتصفية — يُرجع اسم الدولة إن عُرف رمزها، وإلا الصيغة المُطبَّعة.
const canonNat = (s) => {
  const t = normNat(s)
  const code = NAT_CODES[t] || NAT_CODES[(s || '').trim()]
  return (code && NAT_CODE_NAME[code]) || t
}
const NatFlag = ({ nationality, size = 18 }) => {
  const cc = NAT_CODES[(nationality || '').trim()]
  if (!cc) return null
  return <img src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`} alt={nationality} title={nationality}
    style={{ width: size, height: Math.round(size * .72), objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
    onError={e => { e.target.style.display = 'none' }} />
}

// مبدّل «العرض» — نفس تصميم مبدّل مركز المزامنة (SbcFacilities): يختار مجموعة أعمدة الجدول.
function _ViewDropdown({ VIEWS, tableView, setTableView, T, F }) {
  const [open, setOpen] = useState(false)
  const active = VIEWS.find(v => v.v === tableView) || VIEWS[0]
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        cursor: 'pointer', height: 44, padding: '0 16px', fontSize: 13, fontWeight: 600,
        borderRadius: 12, border: '1px solid ' + (open ? 'var(--accent-bd)' : 'transparent'),
        background: 'var(--search-bg)', color: 'var(--tx)',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        fontFamily: F, minWidth: 200, justifyContent: 'space-between', boxSizing: 'border-box',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: active.c }} />
          <span style={{ color: 'var(--tx5)', fontWeight: 500, fontSize: 10 }}>{T('العرض:', 'View:')}</span>
          {active.l}
        </span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: '.15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', insetInlineStart: 0,
          background: 'var(--modal-bg)', border: '1px solid var(--bd)',
          borderRadius: 10, padding: 4, minWidth: 240, zIndex: 10,
          boxShadow: 'var(--shadow-md)',
        }}>
          {VIEWS.map(p => {
            const isActive = tableView === p.v
            return (
              <button key={p.v} onClick={() => { setTableView(p.v); setOpen(false) }} style={{
                cursor: 'pointer', display: 'flex', width: '100%',
                padding: '8px 10px', border: 0, borderRadius: 6,
                background: isActive ? 'rgba(176,125,0,.08)' : 'transparent',
                color: 'var(--tx)', textAlign: 'start', alignItems: 'center', gap: 10,
                fontFamily: F,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.c, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.l}</span>
                  <span style={{ fontSize: 10, color: 'var(--tx5)' }}>{p.sub}</span>
                </div>
                {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
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
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: theme.c + '18', border: '1px solid ' + theme.c + '38', color: theme.c, fontSize: 10.5, fontWeight: 600 }}>
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
const IqamaCell = ({ iso, T, compact = false }) => {
  const d = daysUntil(iso)
  if (d == null) return <span style={{ color: 'var(--tx5)', fontSize: compact ? 11.5 : 14 }}>—</span>
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
      <span style={{ fontSize: compact ? 9.5 : 14, color: c, fontWeight: 600, direction: 'ltr', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtDate(iso)}</span>
      <span title={tooltip} style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 4,
        color: c, fontWeight: 600, fontSize: compact ? 8.5 : 10,
        direction: 'ltr', fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ fontSize: compact ? 8 : 9.5, opacity: .85 }}>{T(wordAr, wordEn)}</span>
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{value}</span>
      </span>
    </div>
  )
}

// Filter button style — matches SbcFacilities btnFilter
const btnFilter = (active) => ({
  height: 44, padding: '0 16px', borderRadius: 12,
  background: active ? 'var(--accent-soft)' : 'var(--search-bg)',
  border: '1px solid ' + (active ? 'var(--accent-bd)' : 'transparent'),
  color: active ? 'var(--accent)' : 'var(--tx2)',
  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F,
  display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box',
  boxShadow: active ? 'var(--shadow-sm)' : 'none',
})

/* ═══ منتقي منشأة العامل — بحث + كروت زجاجية بنفس تصميم اختيار العميل في الفاتورة ═══ */
// خلية معلومة داخل الكرت (الرقم الموحّد / التأمينات / الموارد …) — أيقونة + تسمية + قيمة LTR.
const FacInfoBox = ({ Icon, label, value }) => value ? (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, background: 'var(--inputBg)', border: '1px solid var(--bd)', minWidth: 0 }}>
    <Icon size={12} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
      <span style={{ fontSize: 8.5, color: 'var(--tx5)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 11.5, color: 'var(--tx1)', fontWeight: 600, direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  </div>
) : null
// أفاتار المنشأة — أيقونة مبنى داخل مربّع، يتلوّن ذهبياً عند الاختيار.
const FacAvatar = ({ size, sel }) => (
  <div style={{ width: size, height: size, borderRadius: 12, background: 'rgba(0,0,0,.25)', border: sel ? '1.5px solid rgba(176,125,0,.4)' : '1px solid var(--bd)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: sel ? '0 2px 8px rgba(176,125,0,.15)' : 'none' }}>
    <Building2 size={Math.round(size * 0.5)} strokeWidth={1.7} color={sel ? C.gold : 'rgba(255,255,255,.5)'} />
  </div>
)
// تسمية الفرع: «كود الفرع — المدينة» إن وُجدت.
const facBranchLabel = (f, T) => f?.branch ? [f.branch.branch_code, f.branch.city ? T(f.branch.city.name_ar, f.branch.city.name_en || f.branch.city.name_ar) : null].filter(Boolean).join(' — ') : null
// تسمية نوع تأشيرة الخروج: خروج وعودة / خروج نهائي.
const exitVisaTypeLabel = (t, T = (a) => a) => t === 'exit_reentry' ? T('خروج وعودة', 'Exit & Re-entry') : t === 'final_exit' ? T('خروج نهائي', 'Final Exit') : null
// نوع الخروج النهائي: دائم / مؤقت.
const finalExitKindLabel = (k, T = (a) => a) => k === 'permanent' ? T('دائمة', 'Permanent') : k === 'temporary' ? T('مؤقتة', 'Temporary') : null
// سبب الخروج النهائي.
const finalExitReasonLabel = (r, T = (a) => a) => r === 'unpaid_invoice' ? T('عدم تسديد فاتورة', 'Unpaid invoice') : r === 'iqama_not_renewed' ? T('عدم تجديد الإقامة', 'Iqama not renewed') : r === 'client_request' ? T('طلب العميل', 'Client request') : r === 'other' ? T('مشكلة أخرى', 'Other issue') : null
// نوع تأشيرة الخروج والعودة: مفردة / متعددة.
const exitReentryKindLabel = (k, T = (a) => a) => k === 'single' ? T('مفردة', 'Single') : k === 'multiple' ? T('متعددة', 'Multiple') : null

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
  return <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: urgent ? C.red : color, border: `2px solid ${urgent ? 'rgba(192,57,43,.4)' : 'rgba(59,178,122,.35)'}` }}>{rem}</div>
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
      <div style={{ position: 'relative', border: '1px solid rgba(176,125,0,.4)', background: 'linear-gradient(135deg,rgba(176,125,0,.12),rgba(255,255,255,.02))', boxShadow: '0 4px 16px rgba(0,0,0,.28)', padding: 16, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
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
  const G = { base: 'linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.012))', baseB: 'rgba(255,255,255,.08)', hover: 'linear-gradient(135deg,rgba(176,125,0,.08),rgba(255,255,255,.02))', hoverB: 'rgba(176,125,0,.25)' }
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
        <div style={{ padding: '24px 20px', borderRadius: 12, border: '1px dashed rgba(255,255,255,.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(176,125,0,.08)', border: '1px dashed rgba(176,125,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} strokeWidth={1.7} color="rgba(176,125,0,.65)" />
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
    background: 'linear-gradient(90deg, var(--bd2) 25%, var(--bd) 37%, var(--bd2) 63%)',
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
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--bd)', background: 'var(--card-grad2)' }}>
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
export default function WorkforcePage({ sb, toast, lang, user, onTabChange }) {
  const isAr = lang !== 'en'
  const T = (a, e) => isAr ? a : e

  const [workers, setWorkers] = useState([])
  const [facilities, setFacilities] = useState([])
  const [branchList, setBranchList] = useState([])   // كل الفروع — لحلّ فرع العامل الخاص (branch_id) في الجدول
  const [loading, setLoading] = useState(true)  // يبدأ محمّلاً ليظهر هيكل التحميل فوراً عند فتح الصفحة
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  // كرت التصفية — كل عامل تصفية قائمة اختيارات متعددة (OR داخل الحقل، AND بين الحقول)،
  // فيمكن تفعيل أكثر من عامل تصفية معاً وأكثر من قيمة داخل العامل الواحد.
  const ADV_EMPTY = {
    nationality: [], branch: [], facility: [], city: [],
    occupation: [], actualOcc: [], iqama: [], workPermit: [], passport: [],
    insurance: [], wage: [], age: [], location: [], finalExit: [], exitReturn: [],
    employment: [], vehicles: [], balance: [], invoiceRemaining: [],
  }
  const [adv, setAdv] = useState(ADV_EMPTY)
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })   // ترتيب الجدول
  const [page, setPage] = useState(0)
  const [tableView, setTableView] = useState('v1')   // مبدّل «العرض» — يتحكّم بأعمدة الجدول
  const [muqeemExit, setMuqeemExit] = useState({})   // خريطة رقم الإقامة → { er, fe } لتواريخ انتهاء الخروج من مقيم
  const [muqeemVehicles, setMuqeemVehicles] = useState({})   // خريطة رقم الإقامة → عدد المركبات من مقيم
  const [muqeemBalance, setMuqeemBalance] = useState({})   // خريطة رقم الإقامة → رصيد الجوازات من مقيم
  const [workerInvoices, setWorkerInvoices] = useState({})   // خريطة worker.id → { list:[{id,no,service,remaining,cancelled}], remaining, services:[] } — للعرض الرابع
  const [detail, setDetail] = useState(null)
  // View lens — like SbcFacilities tableView (SBC | GOSI). For workers it's
  // "all" vs "active" vs "suspended".
  const [viewLens, setViewLens] = useState('all')
  // Manual "إضافة عامل" modal — inserts straight into the canonical `workers` table.
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
  const [editInvoices, setEditInvoices] = useState([])   // فواتير العامل — لقائمة «رقم الفاتورة» في سبب الخروج النهائي
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
      const { error } = await sb.from('workers').insert(payload)
      if (error) throw new Error(error.message)
      // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يُفرغ النموذج ويعيدنا للقائمة.
      setAddDone({ title: T('تمت إضافة العامل بنجاح', 'Worker added successfully') })
      load()
    } catch (e) {
      const m = String(e.message || e)
      // حارس قاعدة البيانات (سباق إدخالين بنفس اللحظة) — رسالة ودّية بدل خطأ Postgres الخام.
      if (/workers_iqama_number_unique|duplicate key/i.test(m)) {
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
        const { data, error } = await sb.from('workers').select('id, name_ar, name_en')
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

  useEffect(() => { onTabChange && onTabChange({ tab: 'workers' }) }, [])

  const load = useCallback(async () => {
    if (!sb) return
    setLoading(true)
    const [w, f, mc, mr, br] = await Promise.all([
      sb.from('workers').select('*').is('deleted_at', null).order('name_ar', { ascending: true }),
      sb.from('facilities').select('id,name_ar,name_en,unified_number,cr_number,gosi_number,hrsd_number,struck_off,branch_id,branch_ids,branch:branches!facilities_branch_id_fkey(branch_code,city:cities(name_ar,name_en))').is('deleted_at', null),
      sb.from('muqeem_companies').select('report_issued_er_visa_raw,report_extended_er_visa_raw,report_final_exit_raw,report_probation_final_exit_raw'),
      sb.from('muqeem_residents').select('iqama_number,veh:detail_raw->vehicles->vehiclesList,bal:detail_raw->jawazat_balance->balance'),
      sb.from('branches').select('id,branch_code,name_ar,city:cities(name_ar,name_en)').is('deleted_at', null),
    ])
    // استبعاد السعوديين (جنسية سعودية أو إقامة تبدأ بـ1) — هذا سجل العمالة الوافدة.
    setWorkers((w.data || []).filter(r => !isSaudiWorker(r))); setFacilities(f.data || []); setBranchList(br.data || [])
    // خريطتا المركبات والرصيد من مقيم: رقم الإقامة → عدد المركبات / رصيد الجوازات (من detail_raw).
    const vehMap = {}, balMap = {}
    for (const r of (mr.data || [])) {
      const iq = String(r?.iqama_number || ''); if (!iq) continue
      vehMap[iq] = Array.isArray(r?.veh) ? r.veh.length : 0
      if (r?.bal != null) balMap[iq] = r.bal
    }
    setMuqeemVehicles(vehMap); setMuqeemBalance(balMap)
    // خريطة تواريخ انتهاء الخروج من مقيم: رقم الإقامة → { er: تاريخ العودة, fe: تاريخ المغادرة النهائية } — أحدث تأشيرة لكل نوع (نفس منطق صفحة التفاصيل).
    const arrOf = (x) => Array.isArray(x) ? x : (Array.isArray(x?.content) ? x.content : (Array.isArray(x?.rows) ? x.rows : []))
    const erByIq = {}, feByIq = {}
    for (const c of (mc.data || [])) {
      for (const v of [...arrOf(c.report_issued_er_visa_raw), ...arrOf(c.report_extended_er_visa_raw)]) {
        const iq = String(v?.alienId || ''); if (!iq) continue; (erByIq[iq] || (erByIq[iq] = [])).push(v)
      }
      for (const v of [...arrOf(c.report_final_exit_raw), ...arrOf(c.report_probation_final_exit_raw)]) {
        const iq = String(v?.alienId || ''); if (!iq) continue; (feByIq[iq] || (feByIq[iq] = [])).push(v)
      }
    }
    const p2 = (n) => String(n).padStart(2, '0')
    const exitMap = {}
    for (const iq of new Set([...Object.keys(erByIq), ...Object.keys(feByIq)])) {
      const erV = latestVisa(erByIq[iq]); const feV = latestVisa(feByIq[iq])
      const erRet = erV ? visaReturnDate(erV) : null
      exitMap[iq] = {
        er: erRet ? `${erRet.getFullYear()}-${p2(erRet.getMonth() + 1)}-${p2(erRet.getDate())}` : null,
        fe: feV ? fmtMDate(feV.visaFinalDepartureDateG) : null,
      }
    }
    setMuqeemExit(exitMap)
    setLoading(false)
  }, [sb])
  useEffect(() => { load() }, [load])

  // فتح تفاصيل فاتورة (العرض الرابع) — نفس آلية التنقّل العامة في التطبيق.
  const goInvoice = (id) => { try { window.dispatchEvent(new CustomEvent('app-navigate-invoice', { detail: { id } })) } catch { /* ignore */ } }

  // فواتير العمّال — الربط عبر RPC يمرّ من المعاملة (service_request → worker_id)
  // للفاتورة. الخريطة: worker.id → ملخّص فواتيره. تُحمَّل دائماً (يحتاجها عمود
  // العرض الرابع وفلتر «المتبقي للفواتير»).
  useEffect(() => {
    if (!sb) return
    const ids = (workers || []).map(w => w.id).filter(Boolean)
    if (!ids.length) { setWorkerInvoices({}); return }
    let cancelled = false
    ;(async () => {
      const { data, error } = await sb.rpc('worker_invoices_summary', { p_worker_ids: ids })
      if (cancelled || error) return
      const map = {}
      for (const r of (data || [])) {
        const wid = r.worker_id; if (!wid) continue
        const isCancelled = r.status_code === 'cancelled'
        const m = map[wid] || (map[wid] = { list: [], remaining: 0, services: [] })
        m.list.push({ id: r.invoice_id, no: r.invoice_no, service: r.service_ar, remaining: Number(r.remaining) || 0, cancelled: isCancelled })
        if (!isCancelled) m.remaining += Number(r.remaining) || 0   // الملغاة لا تُحتسب في المتبقي
        if (r.service_ar && !m.services.includes(r.service_ar)) m.services.push(r.service_ar)
      }
      setWorkerInvoices(map)
    })()
    return () => { cancelled = true }
  }, [sb, workers])

  // حذف ناعم للعامل — تعيين deleted_at فيختفي الصف من القائمة (الاستعلام يُرشّح
  // deleted_at IS NULL). نُغلق صفحة التفاصيل بعدها لأن العامل لم يعد معروضاً.
  const deleteWorker = useCallback(async (r) => {
    if (!sb || !r) return false
    const { error } = await sb.from('workers')
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id || null })
      .eq('id', r.id)
    if (error) { toast?.(T('فشل الحذف: ' + error.message, 'Delete failed: ' + error.message)); return false }
    // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يعيدنا للقائمة.
    await load()
    return true
  }, [sb, user, toast, T, load])

  // نقل العامل إلى العمالة المؤقتة — ننسخ صفّه كما هو إلى جدول temproryworkers مع
  // الإبقاء على نفس المعرّف (فتبقى الفواتير والمرفقات المرتبطة به سارية)، ثم نحذفه
  // حذفاً ناعماً من جدول العمالة الدائمة. upsert يسمح بالنقل ذهاباً وإياباً دون
  // تعارض في المفتاح الأساسي (يُلغي الحذف الناعم لصفّ سابق إن وُجد).
  const transferToTemp = useCallback(async (r) => {
    if (!sb || !r) return false
    const now = new Date().toISOString()
    // نسجّل حدث النقل في سجل العامل (مَن نقله ومتى ومن أين) ليظهر في «سجل الإضافات والتعديلات».
    const prevLog = Array.isArray(r.edit_log) ? r.edit_log : []
    const transferEntry = { at: now, by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, kind: 'transfer', from: 'permanent' }
    const payload = { ...r, edit_log: [...prevLog, transferEntry], deleted_at: null, deleted_by: null, updated_at: now, updated_by: user?.id || null }
    const { error: upErr } = await sb.from('temproryworkers').upsert(payload, { onConflict: 'id' })
    if (upErr) { toast?.(T('فشل النقل: ' + upErr.message, 'Transfer failed: ' + upErr.message)); return false }
    const { error: delErr } = await sb.from('workers')
      .update({ deleted_at: now, deleted_by: user?.id || null }).eq('id', r.id)
    if (delErr) { toast?.(T('فشل النقل: ' + delErr.message, 'Transfer failed: ' + delErr.message)); return false }
    // النجاح يُعرض داخل النافذة (SuccessView)، لا توستر؛ وإغلاق النافذة يعيدنا للقائمة.
    await load()
    return true
  }, [sb, user, toast, T, load])

  // فتح نافذة التعديل — مُعبّأة من صف العامل. `section` يحدّد كرت الحقول المعروض.
  const openWorkerEdit = useCallback((r, section = null, preset = null) => {
    if (!r) return
    setEditErr(null)
    setMuqeemFile(null); setWorkVisaFile(null); setWorkPermitFile(null); setExitVisaFile(null)
    setDocStep(1)
    setEditRow(r)
    setEditSection(section)
    // فواتير العامل (لقائمة رقم الفاتورة في سبب الخروج النهائي) — فقط ذات رقم فاتورة، بلا تكرار.
    setEditInvoices([])
    if (r.id) {
      sb.from('v_worker_invoices').select('invoice_no,service_ar').eq('worker_id', r.id).then(({ data }) => {
        const seen = new Set(), list = []
        for (const row of (data || [])) {
          const no = row?.invoice_no
          if (!no || seen.has(no)) continue
          seen.add(no); list.push({ no: String(no), service_ar: row.service_ar || '' })
        }
        setEditInvoices(list)
      })
    }
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
      exit_visa_issue_date: r.exit_visa_issue_date ? String(r.exit_visa_issue_date).slice(0, 10) : '',
      exit_visa_expiry: r.exit_visa_expiry ? String(r.exit_visa_expiry).slice(0, 10) : '',
      final_exit_kind: r.final_exit_kind || '',
      final_exit_reason: r.final_exit_reason || '',
      exit_reentry_kind: r.exit_reentry_kind || '',
      // الأجر والاشتراك (تأمينات)
      wage_basic: r.wage_basic != null ? String(r.wage_basic) : '',
      wage_total: r.wage_total != null ? String(r.wage_total) : '',
      joining_date: r.joining_date ? String(r.joining_date).slice(0, 10) : '',
      worker_status: r.worker_status || '',
      // رخصة العمل والعقد (قوى)
      work_permit_number: r.work_permit_number || '',
      work_permit_status: r.work_permit_status || '',
      work_permit_start: r.work_permit_start ? String(r.work_permit_start).slice(0, 10) : '',
      contract_number: r.contract_number || '',
      contract_type_ar: r.contract_type_ar || '',
      contract_start_date: r.contract_start_date ? String(r.contract_start_date).slice(0, 10) : '',
      contract_expiry_date: r.contract_expiry_date ? String(r.contract_expiry_date).slice(0, 10) : '',
      employment_status_ar: r.employment_status_ar || '',
      exit_final_invoice_no: r.exit_final_invoice_no || '',
      ...(preset || {}),   // تعبئة مسبقة (مثلاً تحديد نوع تأشيرة الخروج من زر الترويسة)
    })
  }, [sb])

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
        // التأمين الطبي — تعديل يدوي (قد يُحدَّث أيضاً عبر «استعلام التأمين» CHI).
        insurance_company: (editForm.insurance_company || '').trim() || null,
        insurance_policy_number: (editForm.insurance_policy_number || '').trim() || null,
        insurance_expiry_date: editForm.insurance_expiry_date || null,
        exit_visa_type: editForm.exit_visa_type || null,
        exit_visa_number: (editForm.exit_visa_number || '').trim() || null,
        exit_visa_issue_date: editForm.exit_visa_issue_date || null,
        exit_visa_expiry: editForm.exit_visa_expiry || null,
        final_exit_kind: editForm.exit_visa_type === 'final_exit' ? (editForm.final_exit_kind || null) : null,
        final_exit_reason: editForm.exit_visa_type === 'final_exit' ? (editForm.final_exit_reason || null) : null,
        exit_reentry_kind: editForm.exit_visa_type === 'exit_reentry' ? (editForm.exit_reentry_kind || null) : null,
        // رقم الفاتورة — للخروج والعودة، أو للخروج النهائي بسبب «عدم تسديد»/«طلب العميل».
        exit_final_invoice_no: (editForm.exit_visa_type === 'exit_reentry' || (editForm.exit_visa_type === 'final_exit' && (editForm.final_exit_reason === 'unpaid_invoice' || editForm.final_exit_reason === 'client_request'))) ? (editForm.exit_final_invoice_no || null) : null,
        // الأجر والاشتراك (تأمينات) — تعديل يدوي.
        wage_basic: (editForm.wage_basic || '').trim() === '' ? null : Number(editForm.wage_basic),
        wage_total: (editForm.wage_total || '').trim() === '' ? null : Number(editForm.wage_total),
        joining_date: editForm.joining_date || null,
        worker_status: editForm.worker_status || null,
        // رخصة العمل والعقد (قوى) — تعديل يدوي.
        work_permit_number: (editForm.work_permit_number || '').trim() || null,
        work_permit_status: editForm.work_permit_status || null,
        work_permit_start: editForm.work_permit_start || null,
        contract_number: (editForm.contract_number || '').trim() || null,
        contract_type_ar: (editForm.contract_type_ar || '').trim() || null,
        contract_start_date: editForm.contract_start_date || null,
        contract_expiry_date: editForm.contract_expiry_date || null,
        employment_status_ar: (editForm.employment_status_ar || '').trim() || null,
        updated_by: user?.id || null,
      }
      // فرق القيم (قديم/جديد) لسجل التعديلات — بقيم مقروءة (لا معرّفات).
      const oldName = editRow.name_ar || editRow.name_en || null
      const oldBirth = editRow.birth_date ? String(editRow.birth_date).slice(0, 10) : null
      const oldIqExp = editRow.iqama_expiry_date ? String(editRow.iqama_expiry_date).slice(0, 10) : null
      const oldWpExp = editRow.work_permit_expiry ? String(editRow.work_permit_expiry).slice(0, 10) : null
      const oldPpExp = editRow.passport_expiry ? String(editRow.passport_expiry).slice(0, 10) : null
      const oldExitExp = editRow.exit_visa_expiry ? String(editRow.exit_visa_expiry).slice(0, 10) : null
      const oldExitIssue = editRow.exit_visa_issue_date ? String(editRow.exit_visa_issue_date).slice(0, 10) : null
      const oldInsExp = editRow.insurance_expiry_date ? String(editRow.insurance_expiry_date).slice(0, 10) : null
      const oldJoin = editRow.joining_date ? String(editRow.joining_date).slice(0, 10) : null
      const oldWpStart = editRow.work_permit_start ? String(editRow.work_permit_start).slice(0, 10) : null
      const oldCtStart = editRow.contract_start_date ? String(editRow.contract_start_date).slice(0, 10) : null
      const oldCtExp = editRow.contract_expiry_date ? String(editRow.contract_expiry_date).slice(0, 10) : null
      const wStatusLbl = (s) => s === 'active' ? T('نشط','Active') : s === 'suspended' ? T('غير نشط','Inactive') : (s || null)
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
        ['exit_visa_issue_date', oldExitIssue, patch.exit_visa_issue_date],
        ['exit_visa_expiry', oldExitExp, patch.exit_visa_expiry],
        ['final_exit_kind', finalExitKindLabel(editRow.final_exit_kind), finalExitKindLabel(patch.final_exit_kind)],
        ['final_exit_reason', finalExitReasonLabel(editRow.final_exit_reason), finalExitReasonLabel(patch.final_exit_reason)],
        ['exit_reentry_kind', exitReentryKindLabel(editRow.exit_reentry_kind), exitReentryKindLabel(patch.exit_reentry_kind)],
        ['exit_final_invoice_no', editRow.exit_final_invoice_no || null, patch.exit_final_invoice_no],
        ['insurance_company', editRow.insurance_company || null, patch.insurance_company],
        ['insurance_policy_number', editRow.insurance_policy_number || null, patch.insurance_policy_number],
        ['insurance_expiry_date', oldInsExp, patch.insurance_expiry_date],
        ['wage_basic', editRow.wage_basic != null ? String(editRow.wage_basic) : null, patch.wage_basic != null ? String(patch.wage_basic) : null],
        ['wage_total', editRow.wage_total != null ? String(editRow.wage_total) : null, patch.wage_total != null ? String(patch.wage_total) : null],
        ['joining_date', oldJoin, patch.joining_date],
        ['worker_status', wStatusLbl(editRow.worker_status), wStatusLbl(patch.worker_status)],
        ['work_permit_number', editRow.work_permit_number || null, patch.work_permit_number],
        ['work_permit_status', editRow.work_permit_status || null, patch.work_permit_status],
        ['work_permit_start', oldWpStart, patch.work_permit_start],
        ['contract_number', editRow.contract_number || null, patch.contract_number],
        ['contract_type_ar', editRow.contract_type_ar || null, patch.contract_type_ar],
        ['contract_start_date', oldCtStart, patch.contract_start_date],
        ['contract_expiry_date', oldCtExp, patch.contract_expiry_date],
        ['employment_status_ar', editRow.employment_status_ar || null, patch.employment_status_ar],
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
        const { data: freshRow } = await sb.from('workers').select('edit_log').eq('id', editRow.id).maybeSingle()
        const prevLog = Array.isArray(freshRow?.edit_log) ? freshRow.edit_log : (Array.isArray(editRow.edit_log) ? editRow.edit_log : [])
        patch.edit_log = [...prevLog, { at: new Date().toISOString(), by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, changes }]
      }
      // .select() ليس تجميلاً: تحديثٌ تُصفّيه RLS (أو معرّف لسجلّ محذوف) يعود بلا خطأ
      // وبصفر صفوف، فتُعرض «تم الحفظ» ولا شيء كُتب. نتحقّق من الصفّ العائد ونُفشل صراحةً.
      const { data: updRows, error } = await sb.from('workers').update(patch).eq('id', editRow.id).select('id')
      if (error) throw new Error(error.message)
      if (!updRows || updRows.length === 0) {
        throw new Error(T('لم يُحفظ أي تغيير — تحقّق من الصلاحيات أو أن سجلّ العامل لم يُحذف',
                          'Nothing was saved — check your permissions or whether the worker record was deleted'))
      }
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
      const { data: fresh } = await sb.from('workers').select('*').eq('id', editRow.id).is('deleted_at', null).maybeSingle()
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
      const { data } = await sb.from('workers').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
      if (data) setDetail(data)
    }
    window.addEventListener('worker-open', handler)
    return () => window.removeEventListener('worker-open', handler)
  }, [sb])

  // سلسلة الرجوع الذكية: تسجيل ملف العامل المفتوح كموقع حالي — القفزات منه
  // (منشأة/فاتورة) يعود زرّها الذهبي إلى ملف هذا العامل نفسه.
  useEffect(() => {
    if (detail) {
      const nm = detail.name_ar || detail.name_en || ''
      navSetHere({ event: 'worker-open', detail: { id: detail.id }, label: { ar: 'ملف العامل ' + nm, en: 'Worker: ' + (detail.name_en || detail.name_ar || '') } })
    } else navSetHere(null)
    return () => navSetHere(null)
  }, [detail])

  const facById = useMemo(() => {
    const m = {}; facilities.forEach(f => { m[f.id] = f }); return m
  }, [facilities])
  const branchAllById = useMemo(() => {
    const m = {}; branchList.forEach(b => { m[b.id] = b }); return m
  }, [branchList])
  // الفرع الفعّال للعامل: فرعه الخاص (branch_id) إن حُدّد، وإلا فرع منشأته.
  const workerBranch = (w) => {
    const own = w.branch_id ? branchAllById[w.branch_id] : null
    if (own) return own
    const f = facById[w.current_facility_id]
    return f?.branch || (f?.branch_id ? branchAllById[f.branch_id] : null) || null
  }

  // كروت الإحصاء (الإجمالي/الإقامات/الجنسيات) تُعرض بقيمة 0 لكل المستخدمين ما عدا
  // المدير العام. القائمة والبحث يبقيان كما هما لكل من له صلاحية العرض.
  const statsVisible = isGM(user)

  // Lens-scoped rows (mirrors SbcFacilities scopedRows pattern).
  const scopedRows = useMemo(() => {
    if (viewLens === 'all') return workers
    return workers.filter(w => w.worker_status === viewLens)
  }, [workers, viewLens])

  const stats = useMemo(() => {
    // غير المدير العام: تُصفّر كروت الإحصاء (لا يظهر أي عدد).
    if (!statsVisible) return { total: 0, active: 0, suspended: 0, expired: 0, exp30: 0, valid: 0, noIqama: 0 }
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
  }, [scopedRows, statsVisible])

  // Nationality leaderboard for the third stats card. غير المدير العام ⇒ فارغ (0).
  const natTop = useMemo(() => {
    if (!statsVisible) return []
    const counts = {}
    for (const w of scopedRows) {
      const n = canonNat(w.nationality_ar)
      if (!n) continue
      counts[n] = (counts[n] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [scopedRows, statsVisible])

  // عدد عوامل التصفية المفعّلة (كل حقل به اختيار = 1) — يظهر زر المسح متى تجاوز صفراً.
  const advCount = useMemo(() => Object.values(adv).filter(v => Array.isArray(v) ? v.length : v).length, [adv])

  // ═══ قوائم خيارات كرت التصفية — تُبنى من البيانات المعروضة فعلاً (قيم موجودة فقط) ═══
  // كل قائمة قيمية تحمل عدد العمّال لكل قيمة وتُرتَّب تنازلياً، فتظهر أكثر القيم شيوعاً أولاً.
  const filterOpts = useMemo(() => {
    const nat = new Map(), fac = new Map(), br = new Map(), city = new Map(),
          occ = new Map(), aocc = new Map(), emp = new Map()
    const facMeta = {}, brMeta = {}
    const none = { nat: 0, fac: 0, br: 0, city: 0, occ: 0, aocc: 0, emp: 0 }
    // يزيد عدّاد القيمة إن وُجدت، وإلا يزيد عدّاد «بدون» لنفس الحقل.
    const put = (m, k, field) => { if (k != null && k !== '') m.set(k, (m.get(k) || 0) + 1); else none[field]++ }
    for (const w of scopedRows) {
      put(nat, canonNat(w.nationality_ar), 'nat')
      const f = facById[w.current_facility_id]
      if (w.current_facility_id && f) {
        fac.set(w.current_facility_id, (fac.get(w.current_facility_id) || 0) + 1)
        facMeta[w.current_facility_id] = f
      } else none.fac++
      // الفرع يُحتسب بفرع العامل الفعّال (الخاص إن حُدّد وإلا فرع المنشأة).
      const eb = workerBranch(w)
      if (eb) {
        br.set(eb.id, (br.get(eb.id) || 0) + 1)
        brMeta[eb.id] = { code: eb.branch_code, city: eb.city ? (eb.city.name_ar || eb.city.name_en) : null }
      } else none.br++
      put(city, w.hq_city_ar, 'city')
      put(occ, w.occupation_ar, 'occ')
      put(aocc, w.official_occupation_ar, 'aocc')
      put(emp, w.employment_status_ar, 'emp')
    }
    const byCount = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])
    // يذيّل القائمة بخيار «بدون …» للقيم الخالية متى وُجدت.
    const withNone = (arr, cnt, lbl) => cnt > 0 ? [...arr, { v: '__none', l: `${lbl} (${num(cnt)})` }] : arr
    const valOpts = (m, cnt, lbl) => withNone(byCount(m).map(([v, c]) => ({ v, l: `${v} (${num(c)})` })), cnt, lbl)
    // خيارات الشرائح: تحسب عدد العمّال لكل شريحة وتُبقي الموجود منها فقط مع العدد.
    const bkt = (fn, defs) => {
      const c = {}
      for (const w of scopedRows) { const k = fn(w); c[k] = (c[k] || 0) + 1 }
      return defs.filter(d => c[d.v] > 0).map(d => ({ v: d.v, l: `${d.l} (${num(c[d.v])})` }))
    }
    const EXP_DEFS = [
      { v: 'expired', l: T('منتهية', 'Expired') },
      { v: '10d', l: T('خلال 10 أيام', 'Within 10 days') },
      { v: '30d', l: T('11 – 30 يوم', '11–30 days') },
      { v: '60d', l: T('31 – 60 يوم', '31–60 days') },
      { v: '90d', l: T('61 – 90 يوم', '61–90 days') },
      { v: '6m', l: T('91 – 180 يوم', '91–180 days') },
      { v: 'valid', l: T('سارية (أكثر من 180 يوم)', 'Valid (>180 days)') },
      { v: 'none', l: T('بدون تاريخ', 'No date') },
    ]
    const WAGE_DEFS = [
      { v: 'none', l: T('بدون', 'None') }, { v: 'w1', l: T('حتى 400', 'Up to 400') },
      { v: 'w2', l: T('401 – 500', '401–500') }, { v: 'w3', l: T('501 – 2800', '501–2800') },
      { v: 'w4', l: T('2801 – 10000', '2801–10000') }, { v: 'w5', l: T('أكثر من 10000', 'Over 10000') },
    ]
    const AGE_DEFS = [
      { v: 'a1', l: T('أقل من 25', 'Under 25') }, { v: 'a2', l: T('25 – 35', '25–35') },
      { v: 'a3', l: T('36 – 45', '36–45') }, { v: 'a4', l: T('46 – 60', '46–60') },
      { v: 'a5', l: T('أكثر من 60', 'Over 60') }, { v: 'none', l: T('غير معروف', 'Unknown') },
    ]
    const LOC_DEFS = [
      { v: 'inside', l: T('داخل المملكة', 'Inside Kingdom') }, { v: 'outside', l: T('خارج المملكة', 'Outside Kingdom') },
      { v: '__none', l: T('غير محدد', 'Unspecified') },
    ]
    const FINAL_EXIT_DEFS = [
      { v: 'expired', l: T('منتهية', 'Expired') },
      { v: '30d', l: T('تنتهي خلال 30 يوم', 'Within 30 days') },
      { v: '60d', l: T('31 – 60 يوم', '31–60 days') },
    ]
    const EXIT_RETURN_DEFS = [
      { v: 'expired', l: T('منتهية', 'Expired') },
      { v: '30d', l: T('تنتهي خلال 30 يوم', 'Within 30 days') },
      { v: '60d', l: T('31 – 60 يوم', '31–60 days') },
      { v: '90d', l: T('61 – 90 يوم', '61–90 days') },
      { v: '90p', l: T('أكثر من 90 يوم', 'Over 90 days') },
    ]
    const VEH_DEFS = [
      { v: 'has', l: T('لديه مركبة', 'Has vehicle') }, { v: 'none', l: T('بدون', 'None') },
    ]
    const BAL_DEFS = [
      { v: 'has', l: T('لديه رصيد', 'Has balance') },
      { v: 'zero', l: T('صفر', 'Zero') },
      { v: 'none', l: T('بدون بيانات', 'No data') },
    ]
    const INV_REM_DEFS = [
      { v: 'due', l: T('عليه متبقٍ', 'Has remaining') },
      { v: 'zero', l: T('مسدّدة بالكامل', 'Fully paid') },
      { v: 'none', l: T('بدون فواتير', 'No invoices') },
    ]
    // بطاقة المنشأة: الاسم + الرقم الموحّد؛ البحث يشمل الموحّد/التأمينات/الموارد/السجل/الاسم.
    const facOpts = byCount(fac).map(([id, c]) => {
      const f = facMeta[id] || {}
      const name = f.name_ar || f.name_en || f.cr_number || '—'
      const nums = [f.unified_number, f.gosi_number, f.hrsd_number, f.cr_number].filter(Boolean).map(String)
      // نص البحث يضمّ الأرقام كما هي + صيغة مجرّدة (بلا شرطة/رموز) فيطابق رقم الموارد سواء كُتبت الشرطة أم لا.
      const numsDigits = nums.map(n => n.replace(/\D/g, '')).filter(Boolean)
      return { v: id, name, short: shortFacName(name), unified: f.unified_number || null, gosi: f.gosi_number || null, hrsd: f.hrsd_number || null, cr: f.cr_number || null, c, l: `${name} ${nums.join(' ')} ${numsDigits.join(' ')}` }
    })
    return {
      nat: valOpts(nat, none.nat, T('بدون جنسية', 'No nationality')),
      city: valOpts(city, none.city, T('بدون مدينة', 'No city')),
      occ: valOpts(occ, none.occ, T('بدون مهنة', 'No occupation')),
      aocc: valOpts(aocc, none.aocc, T('بدون مهنة فعلية', 'No actual occupation')),
      emp: valOpts(emp, none.emp, T('بدون حالة عقد قوى', 'No Qiwa contract status')),
      fac: withNone(facOpts, none.fac, T('بدون منشأة', 'No facility')),
      br: withNone(byCount(br).map(([id, c]) => ({ v: id, code: brMeta[id]?.code || '—', city: brMeta[id]?.city, c, l: `${brMeta[id]?.code || '—'}${brMeta[id]?.city ? ' · ' + brMeta[id].city : ''} (${num(c)})` })), none.br, T('بدون مكتب', 'No office')),
      iqama: bkt(w => expBucket(w.iqama_expiry_date), EXP_DEFS),
      workPermit: bkt(w => expBucket(w.work_permit_expiry), EXP_DEFS),
      passport: bkt(w => expBucket(w.passport_expiry), EXP_DEFS),
      insurance: bkt(w => expBucket(w.insurance_expiry_date), EXP_DEFS),
      wage: bkt(w => wageBucket(w.wage_total), WAGE_DEFS),
      age: bkt(w => ageBucket(w.birth_date), AGE_DEFS),
      location: bkt(w => w.is_outside_kingdom == null ? '__none' : (w.is_outside_kingdom ? 'outside' : 'inside'), LOC_DEFS),
      finalExit: bkt(w => finalExitBucket(w, muqeemExit), FINAL_EXIT_DEFS),
      exitReturn: bkt(w => exitReturnBucket(w, muqeemExit), EXIT_RETURN_DEFS),
      vehicles: bkt(w => { const n = muqeemVehicles[String(w.iqama_number)]; return n != null && n > 0 ? 'has' : 'none' }, VEH_DEFS),
      balance: bkt(w => balBucketOf(w, muqeemBalance), BAL_DEFS),
      invoiceRemaining: bkt(w => invRemBucketOf(w, workerInvoices), INV_REM_DEFS),
    }
  }, [scopedRows, facById, branchAllById, muqeemVehicles, muqeemExit, muqeemBalance, workerInvoices])

  // Search + advanced filter — القوائم داخل الحقل تعمل بمنطق OR، والحقول فيما بينها بمنطق AND.
  const filtered = useMemo(() => {
    const has = (arr) => Array.isArray(arr) && arr.length > 0
    // يوحّد القيمة الخالية إلى مفتاح «__none» لتطابق خيار «بدون …» في القوائم.
    const orNone = (v) => (v == null || v === '') ? '__none' : v
    return scopedRows.filter(w => {
      if (has(adv.nationality) && !adv.nationality.includes(orNone(canonNat(w.nationality_ar)))) return false
      if (has(adv.facility) && !adv.facility.includes(facById[w.current_facility_id] ? w.current_facility_id : '__none')) return false
      if (has(adv.branch)) { const eb = workerBranch(w); if (!adv.branch.includes(eb ? eb.id : '__none')) return false }
      if (has(adv.city) && !adv.city.includes(orNone(w.hq_city_ar))) return false
      if (has(adv.occupation) && !adv.occupation.includes(orNone(w.occupation_ar))) return false
      if (has(adv.actualOcc) && !adv.actualOcc.includes(orNone(w.official_occupation_ar))) return false
      if (has(adv.employment) && !adv.employment.includes(orNone(w.employment_status_ar))) return false
      if (has(adv.iqama) && !adv.iqama.includes(expBucket(w.iqama_expiry_date))) return false
      if (has(adv.workPermit) && !adv.workPermit.includes(expBucket(w.work_permit_expiry))) return false
      if (has(adv.passport) && !adv.passport.includes(expBucket(w.passport_expiry))) return false
      if (has(adv.insurance) && !adv.insurance.includes(expBucket(w.insurance_expiry_date))) return false
      if (has(adv.wage) && !adv.wage.includes(wageBucket(w.wage_total))) return false
      if (has(adv.age) && !adv.age.includes(ageBucket(w.birth_date))) return false
      if (has(adv.location)) {
        const loc = w.is_outside_kingdom == null ? '__none' : (w.is_outside_kingdom ? 'outside' : 'inside')
        if (!adv.location.includes(loc)) return false
      }
      if (has(adv.finalExit)) { const b = finalExitBucket(w, muqeemExit); if (!b || !adv.finalExit.includes(b)) return false }
      if (has(adv.exitReturn)) { const b = exitReturnBucket(w, muqeemExit); if (!b || !adv.exitReturn.includes(b)) return false }
      if (has(adv.vehicles)) {
        const n = muqeemVehicles[String(w.iqama_number)]
        if (!adv.vehicles.includes(n != null && n > 0 ? 'has' : 'none')) return false
      }
      if (has(adv.balance) && !adv.balance.includes(balBucketOf(w, muqeemBalance))) return false
      if (has(adv.invoiceRemaining) && !adv.invoiceRemaining.includes(invRemBucketOf(w, workerInvoices))) return false
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
  }, [scopedRows, adv, search, facById, branchAllById, muqeemVehicles, muqeemExit, muqeemBalance, workerInvoices])

  // ═══ الترتيب — قائمة شاملة بكل ما يمكن الترتيب عليه (نصوص/أرقام/تواريخ) ═══
  const SORT_OPTS = [
    { v: 'name', l: T('الاسم', 'Name'), t: 'str' },
    { v: 'iqama_number', l: T('رقم الإقامة', 'Iqama no.'), t: 'str' },
    { v: 'border_number', l: T('رقم الحدود', 'Border no.'), t: 'str' },
    { v: 'nationality_ar', l: T('الجنسية', 'Nationality'), t: 'str' },
    { v: 'occupation_ar', l: T('المهنة الرسمية', 'Official occupation'), t: 'str' },
    { v: 'official_occupation_ar', l: T('المهنة الفعلية', 'Actual occupation'), t: 'str' },
    { v: 'hq_city_ar', l: T('مدينة المقر', 'HQ city'), t: 'str' },
    { v: 'facility', l: T('المنشأة', 'Facility'), t: 'str' },
    { v: 'branch', l: T('الفرع', 'Branch'), t: 'str' },
    { v: 'wage_total', l: T('الراتب', 'Salary'), t: 'num' },
    { v: 'iqama_expiry_date', l: T('انتهاء الإقامة', 'Iqama expiry'), t: 'date' },
    { v: 'iqama_issue_date', l: T('إصدار الإقامة', 'Iqama issue'), t: 'date' },
    { v: 'work_permit_expiry', l: T('انتهاء رخصة العمل', 'Work permit expiry'), t: 'date' },
    { v: 'passport_expiry', l: T('انتهاء الجواز', 'Passport expiry'), t: 'date' },
    { v: 'insurance_expiry_date', l: T('انتهاء التأمين', 'Insurance expiry'), t: 'date' },
    { v: 'birth_date', l: T('تاريخ الميلاد (العمر)', 'Birth date (age)'), t: 'date' },
    { v: 'jawazat_balance', l: T('رصيد الجوازات', 'Jawazat balance'), t: 'num' },
    { v: 'vehicles', l: T('عدد المركبات', 'Vehicles'), t: 'num' },
    { v: 'sponsor_changes', l: T('عدد مرات النقل', 'Sponsor transfers'), t: 'num' },
    { v: 'invoice_remaining', l: T('المتبقي للفواتير', 'Invoice remaining'), t: 'num' },
    { v: 'invoice_count', l: T('عدد الفواتير', 'Invoice count'), t: 'num' },
    { v: 'created_at', l: T('تاريخ الإضافة', 'Date added'), t: 'date' },
  ]
  const SORT_TYPE = Object.fromEntries(SORT_OPTS.map(o => [o.v, o.t]))
  // قيمة الترتيب لعامل حسب المفتاح. الأرقام الغائبة → -1 (تُدفع للأسفل تصاعدياً).
  const sortVal = (w, key) => {
    switch (key) {
      case 'name': return w.name_ar || w.name_en || ''
      case 'iqama_number': return w.iqama_number || ''
      case 'border_number': return w.border_number || ''
      case 'nationality_ar': return w.nationality_ar || ''
      case 'occupation_ar': return w.occupation_ar || ''
      case 'official_occupation_ar': return w.official_occupation_ar || ''
      case 'hq_city_ar': return w.hq_city_ar || ''
      case 'facility': { const f = facById[w.current_facility_id]; return f ? (f.name_ar || f.name_en || '') : '' }
      case 'branch': { const b = workerBranch(w); return b?.branch_code || '' }
      case 'wage_total': { const n = Number(w.wage_total); return isNaN(n) ? -1 : n }
      case 'sponsor_changes': return w.sponsor_changes == null ? -1 : Number(w.sponsor_changes)
      case 'jawazat_balance': { const b = muqeemBalance[String(w.iqama_number)]; return (b == null || b === '' || isNaN(Number(b))) ? -1 : Number(b) }
      case 'vehicles': { const n = muqeemVehicles[String(w.iqama_number)]; return n == null ? -1 : Number(n) }
      case 'invoice_remaining': { const inv = workerInvoices[w.id]; return inv ? inv.remaining : -1 }
      case 'invoice_count': { const inv = workerInvoices[w.id]; return inv ? inv.list.length : 0 }
      case 'iqama_expiry_date': return w.iqama_expiry_date || ''
      case 'iqama_issue_date': return w.iqama_issue_date || ''
      case 'work_permit_expiry': return w.work_permit_expiry || ''
      case 'passport_expiry': return w.passport_expiry || ''
      case 'insurance_expiry_date': return w.insurance_expiry_date || ''
      case 'birth_date': return w.birth_date || ''
      case 'created_at': return w.created_at || ''
      default: return w.name_ar || ''
    }
  }
  const sorted = useMemo(() => {
    const arr = [...filtered]
    const { key, dir } = sort
    const mul = dir === 'desc' ? -1 : 1
    const type = SORT_TYPE[key] || 'str'
    arr.sort((a, b) => {
      const va = sortVal(a, key), vb = sortVal(b, key)
      if (type === 'num') return ((va ?? 0) - (vb ?? 0)) * mul
      if (type === 'date') {
        // القيم الفارغة تُدفع للأسفل دائماً بغضّ النظر عن الاتجاه
        const ea = !va, eb = !vb
        if (ea && eb) return 0
        if (ea) return 1
        if (eb) return -1
        return (String(va) < String(vb) ? -1 : String(va) > String(vb) ? 1 : 0) * mul
      }
      return String(va).localeCompare(String(vb), 'ar') * mul
    })
    return arr
  }, [filtered, sort, muqeemBalance, muqeemVehicles, workerInvoices, facById, branchAllById])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const paged = sorted.slice(page * PAGE, page * PAGE + PAGE)

  // ═══ سجل أعمدة الجدول — كل عمود له عرض + عنوان + خلية. العروض تختار مجموعة أعمدة ═══
  const COLS = {
    photo: { w: '7%', h: '', cell: (w) => (
      <td style={{ textAlign: 'center', paddingInline: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WorkerAvatar w={w} size={38} />
        </div>
      </td>
    ) },
    name: { w: '22%', h: T('الاسم','Name'), cell: (w) => (
      <td className="name-cell" title={w.name_ar || w.name_en || ''}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div className="name-marquee" style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>
            <span className="marquee-inner">{w.name_ar || w.name_en || '—'}</span>
          </div>
          {w.name_en && w.name_ar && (
            <div className="name-marquee" style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--tx4)' }}>
              <span className="marquee-inner">{w.name_en}</span>
            </div>
          )}
        </div>
      </td>
    ) },
    iqama: { w: '15%', h: T('الهوية','Iqama'), cell: (w) => (
      <td>
        {w.iqama_number ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
            <CopyBtn value={w.iqama_number} toast={toast} T={T} />
            <span className="num" style={{ fontSize: 12.5, color: C.gold }}>{w.iqama_number}</span>
          </span>
        ) : <span className="muted">—</span>}
      </td>
    ) },
    nationality: { w: '12%', h: T('الجنسية','Nationality'), cell: (w) => (
      <td title={w.nationality_ar || ''} style={{ paddingInline: 8 }}>
        {w.nationality_ar ? (
          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
            <span className="marquee-inner">{w.nationality_ar}</span>
          </div>
        ) : <span className="muted">—</span>}
      </td>
    ) },
    occupation: { w: '18%', h: T('المهنة الرسمية','Official Occupation'), cell: (w) => (
      <td title={w.occupation_ar || ''} style={{ paddingInline: 8 }}>
        {w.occupation_ar ? (
          <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>
            <span className="marquee-inner">{w.occupation_ar}</span>
          </div>
        ) : <span className="muted">—</span>}
      </td>
    ) },
    salary: { w: '10%', h: T('الراتب','Salary'), cell: (w) => (
      <td>
        {w.wage_total != null && Number(w.wage_total) > 0 ? (
          <span className="num" style={{ fontSize: 13.5, fontWeight: 600, color: Number(w.wage_total) > 410 ? C.red : C.ok, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{Number(w.wage_total).toLocaleString('en-US')}</span>
        ) : <span className="muted">—</span>}
      </td>
    ) },
    iqama_expiry: { w: '16%', h: T('الإقامة','Iqama'), cell: (w) => (
      <td><IqamaCell iso={w.iqama_expiry_date} T={T} /></td>
    ) },
    work_permit_expiry: { w: '15%', h: T('الرخصة','Work Permit'), cell: (w) => (
      <td><IqamaCell iso={w.work_permit_expiry} T={T} compact /></td>
    ) },
    exit_return_expiry: { w: '11%', h: T('خروج وعودة','Exit & Return'), hStyle: { paddingInline: 12 }, cell: (w) => (
      // يظهر تاريخ العودة فقط إذا كان العامل خارج المملكة؛ داخل المملكة → «—».
      <td style={{ paddingInline: 12 }}>
        {w.is_outside_kingdom
          ? <IqamaCell iso={muqeemExit[String(w.iqama_number)]?.er} T={T} compact />
          : <span className="muted">—</span>}
      </td>
    ) },
    final_exit_expiry: { w: '11%', h: T('خروج نهائي','Final Exit'), hStyle: { paddingInline: 12 }, cell: (w) => (
      <td style={{ paddingInline: 12 }}><IqamaCell iso={muqeemExit[String(w.iqama_number)]?.fe} T={T} compact /></td>
    ) },
    passport_expiry: { w: '13%', h: T('الجواز','Passport'), cell: (w) => (
      <td><IqamaCell iso={w.passport_expiry} T={T} compact /></td>
    ) },
    jawazat_balance: { w: '9%', h: T('الرصيد','Balance'), cell: (w) => {
      const b = muqeemBalance[String(w.iqama_number)]
      const n = b == null || b === '' ? null : Number(b)
      return (
        <td>
          {n != null && !isNaN(n)
            ? <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: n > 0 ? C.ok : 'var(--tx4)' }}>{n.toLocaleString('en-US')}</span>
            : <span className="muted">—</span>}
        </td>
      )
    } },
    absher_mobile: { w: '13%', h: T('رقم ابشر','Absher Mobile'), cell: (w) => {
      const m = fmtMobile(w.official_mobile)
      return (
        <td>
          {m
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, direction: 'ltr' }}>
                <CopyBtn value={m} toast={toast} T={T} />
                <span className="num" style={{ fontSize: 12.5, color: C.ok }}>{m}</span>
              </span>
            : <span className="muted">—</span>}
        </td>
      )
    } },
    hq_city: { w: '10%', h: T('المدينة','City'), cell: (w) => (
      <td title={w.hq_city_ar || ''} style={{ paddingInline: 8 }}>
        {w.hq_city_ar
          ? <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}><span className="marquee-inner">{w.hq_city_ar}</span></div>
          : <span className="muted">—</span>}
      </td>
    ) },
    official_occupation: { w: '15%', h: T('المهنة الفعلية','Actual Occupation'), cell: (w) => (
      <td title={w.official_occupation_ar || ''} style={{ paddingInline: 8 }}>
        {w.official_occupation_ar
          ? <div className="name-marquee" style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}><span className="marquee-inner">{w.official_occupation_ar}</span></div>
          : <span className="muted">—</span>}
      </td>
    ) },
    vehicles: { w: '8%', h: T('المركبة','Vehicle'), cell: (w) => {
      const n = muqeemVehicles[String(w.iqama_number)]
      return (
        <td>
          {n != null && n > 0
            ? <span className="num" style={{ fontSize: 13.5, fontWeight: 600, color: C.gold }}>{n}</span>
            : n === 0
              ? <span style={{ fontSize: 13, color: 'var(--tx4)', fontWeight: 600 }}>0</span>
              : <span className="muted">—</span>}
        </td>
      )
    } },
    branch: { w: '10%', h: T('الفرع','Branch'), cell: (w) => {
      const asg0 = workerBranch(w)
      return (
        <td title={asg0?.branch_code || ''}>
          {(() => {
            const asg = asg0
            if (!asg) return <span className="muted">—</span>
            const city = asg.city ? T(asg.city.name_ar, asg.city.name_en || asg.city.name_ar) : null
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0, width: '100%' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{asg.branch_code || '—'}</span>
                {city && <span style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--tx4)', whiteSpace: 'nowrap' }}>{city}</span>}
              </div>
            )
          })()}
        </td>
      )
    } },
    // ── أعمدة الفواتير (العرض الرابع) ──
    // كل أرقام فواتير العامل كأزرار؛ الضغط يفتح تفاصيل الفاتورة. الملغاة تُشطب بخط أحمر.
    invoices: { w: '20%', h: T('الفواتير','Invoices'), hStyle: { paddingInline: 8 }, cell: (w) => {
      const inv = workerInvoices[w.id]
      if (!inv || !inv.list.length) return <td><span className="muted">—</span></td>
      return (
        <td style={{ paddingInline: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
            {inv.list.map(iv => (
              <button key={iv.id} type="button" onClick={(e) => { e.stopPropagation(); goInvoice(iv.id) }}
                title={`${iv.no}${iv.service ? ' — ' + iv.service : ''}${iv.cancelled ? T(' (ملغاة)',' (cancelled)') : ''}`}
                style={{ fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace', direction: 'ltr', color: iv.cancelled ? C.red : C.gold, background: iv.cancelled ? 'rgba(232,114,101,.08)' : 'rgba(176,125,0,.08)', border: `1px solid ${iv.cancelled ? 'rgba(232,114,101,.3)' : 'rgba(176,125,0,.28)'}`, borderRadius: 6, padding: '2px 7px', cursor: 'pointer', textDecoration: iv.cancelled ? 'line-through' : 'none', transition: 'background .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = iv.cancelled ? 'rgba(232,114,101,.16)' : 'rgba(176,125,0,.16)' }}
                onMouseLeave={e => { e.currentTarget.style.background = iv.cancelled ? 'rgba(232,114,101,.08)' : 'rgba(176,125,0,.08)' }}>
                {iv.no}
              </button>
            ))}
          </div>
        </td>
      )
    } },
    invoice_types: { w: '16%', h: T('نوع الفواتير','Invoice Type'), hStyle: { paddingInline: 8 }, cell: (w) => {
      const inv = workerInvoices[w.id]
      if (!inv || !inv.services.length) return <td><span className="muted">—</span></td>
      const txt = inv.services.join('، ')
      return (
        <td title={txt} style={{ paddingInline: 8 }}>
          <div className="name-marquee" style={{ fontSize: 11, color: 'var(--tx2)', fontWeight: 600 }}><span className="marquee-inner">{txt}</span></div>
        </td>
      )
    } },
    invoice_remaining: { w: '11%', h: T('المتبقي','Remaining'), cell: (w) => {
      const inv = workerInvoices[w.id]
      if (!inv || !inv.list.length) return <td><span className="muted">—</span></td>
      const r = inv.remaining
      return (
        <td>
          <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: r > 0 ? C.red : C.ok, fontVariantNumeric: 'tabular-nums', direction: 'ltr' }}>{num(r)}</span>
        </td>
      )
    } },
  }
  // العروض الأربعة — العرض الأول: الأعمدة الحالية بدون «الراتب». الثاني/الثالث/الرابع: أعمدتها تُحدَّد لاحقاً (مؤقتاً نفس الأول).
  const VIEWS = [
    { v: 'v1', l: T('العرض الأول','View 1'),  sub: T('البيانات الأساسية','Core data'),      c: C.blue,   cols: ['photo', 'name', 'iqama', 'nationality', 'occupation', 'iqama_expiry', 'salary', 'jawazat_balance', 'branch'],
      w: { photo: '6%', name: '18%', iqama: '13%', nationality: '10%', occupation: '15%', iqama_expiry: '13%', salary: '8%', jawazat_balance: '9%', branch: '8%' } },
    { v: 'v2', l: T('العرض الثاني','View 2'), sub: T('التواريخ والتأشيرات','Dates & visas'),   c: C.gold,   cols: ['photo', 'name', 'iqama', 'nationality', 'iqama_expiry', 'work_permit_expiry', 'final_exit_expiry', 'exit_return_expiry', 'passport_expiry', 'vehicles', 'branch'],
      w: { photo: '6%', name: '14%', iqama: '13%', nationality: '9%', iqama_expiry: '14%', work_permit_expiry: '8%', final_exit_expiry: '8%', exit_return_expiry: '8%', passport_expiry: '8%', vehicles: '6%', branch: '6%' } },
    { v: 'v3', l: T('العرض الثالث','View 3'), sub: T('البيانات الفعلية','Actual data'),        c: C.purple, cols: ['photo', 'name', 'iqama', 'occupation', 'absher_mobile', 'hq_city', 'official_occupation', 'branch'],
      w: { photo: '6%', name: '20%', iqama: '14%', occupation: '15%', absher_mobile: '13%', hq_city: '10%', official_occupation: '15%', branch: '7%' } },
    { v: 'v4', l: T('العرض الرابع','View 4'), sub: T('الفواتير','Invoices'),                  c: C.ok,     cols: ['photo', 'name', 'iqama', 'nationality', 'invoices', 'invoice_types', 'invoice_remaining', 'branch'],
      w: { photo: '6%', name: '16%', iqama: '13%', nationality: '9%', invoices: '21%', invoice_types: '16%', invoice_remaining: '10%', branch: '9%' } },
  ]
  const activeView = VIEWS.find(v => v.v === tableView) || VIEWS[0]
  // عرض العمود: تخصيص لكل عرض (activeView.w) وإلا العرض الافتراضي من السجل.
  const viewCols = activeView.cols.map(k => ({ k, ...COLS[k], w: activeView.w?.[k] || COLS[k].w }))

  if (detail) {
    return (<>
      <WorkerDetail
        worker={detail}
        facility={facById[detail.current_facility_id]}
        sb={sb} toast={toast} T={T} isAr={isAr}
        onBack={() => setDetail(null)}
        onEdit={(section, preset) => openWorkerEdit(detail, section, preset)}
        onSaved={async () => { const { data } = await sb.from('workers').select('*').eq('id', detail.id).is('deleted_at', null).maybeSingle(); if (data) setDetail(data); load() }}
        onDelete={() => deleteWorker(detail)}
        onTransfer={() => transferToTemp(detail)}
        canEdit={canPerm(user, 'workers.edit')}
        canDelete={canPerm(user, 'workers.delete')}
        user={user}
        attKey={attKey}
      />
      {editRow && editForm && (
        <FKModal open onClose={() => { if (!savingEdit) { setEditErr(null); setEditDone(null); setEditRow(null); setEditForm(null); setEditSection(null); setDocStep(1); setMuqeemFile(null); setWorkVisaFile(null); setWorkPermitFile(null); setExitVisaFile(null) } }} width={520}
          height={editSection === 'docs' && docStep === 2 && !editDone ? 'min(560px, 92vh)' : editSection === 'exit_visa' && !editDone ? 'min(600px, 92vh)' : undefined} scroll={(editSection === 'docs' && docStep === 2 || editSection === 'exit_visa') && !editDone}
          footerStart={editSection === 'docs' && !editDone && docStep === 2 ? (
            <ActionButton variant="ghost" dir="fwd" Icon={ChevronRight} disabled={savingEdit} onClick={() => setDocStep(1)}>
              {T('السابق', 'Back')}
            </ActionButton>
          ) : undefined}
          title={editSection === 'docs' ? T('تعديل البيانات المهنية', 'Edit Professional Data') : editSection === 'passport' ? T('تعديل بيانات الجواز', 'Edit Passport Data') : editSection === 'insurance' ? T('تعديل بيانات التأمين الطبي', 'Edit Medical Insurance Data') : editSection === 'data' ? T('تعديل البيانات الشخصية', 'Edit Personal Data') : editSection === 'contact' ? T('تعديل بيانات التواصل الفاتورية', 'Edit Billing Contact Data') : editSection === 'actual' ? T('تعديل البيانات الفعلية', 'Edit Actual Data') : editSection === 'exit_visa' ? T('إضافة بيانات تأشيرات الخروج', 'Add Exit Visa Data') : editSection === 'wage' ? T('تعديل الأجر والاشتراك', 'Edit Wage & Subscription') : editSection === 'work_permit' ? T('تعديل رخصة العمل والعقد', 'Edit Work Permit & Contract') : T('تعديل العامل', 'Edit Worker')} Icon={Pencil}
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
              <ActionButton Icon={editSection === 'exit_visa' ? Plus : Pencil} disabled={savingEdit || !(editForm.name || '').trim()} onClick={saveWorkerEdit}>
                {savingEdit ? T('جاري الحفظ…', 'Saving…') : editSection === 'exit_visa' ? T('إضافة', 'Add') : T('تعديل', 'Save changes')}
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
                {/* صف ١: النوع + النوع الفرعي (يصير النوع بعرض كامل قبل اختياره) */}
                <Select full={!editForm.exit_visa_type} label={T('نوع التأشيرة', 'Visa Type')} placeholder={T('اختر نوع التأشيرة…', 'Select visa type…')}
                  options={[{ id: 'exit_reentry', label: T('خروج وعودة', 'Exit & Re-entry') }, { id: 'final_exit', label: T('خروج نهائي', 'Final Exit') }]}
                  getKey={o => o.id} getLabel={o => o.label}
                  value={editForm.exit_visa_type}
                  onChange={(id) => setEditForm(p => ({ ...p, exit_visa_type: id, exit_reentry_kind: id === 'exit_reentry' ? p.exit_reentry_kind : '', final_exit_reason: id === 'final_exit' ? p.final_exit_reason : '', exit_final_invoice_no: (id === 'final_exit' || id === 'exit_reentry') ? p.exit_final_invoice_no : '' }))} />
                {editForm.exit_visa_type === 'exit_reentry' && (
                  <Select label={T('نوع التأشيرة', 'Visa Kind')} placeholder={T('مفردة أو متعددة…', 'Single or multiple…')}
                    options={[{ id: 'single', label: T('مفردة', 'Single') }, { id: 'multiple', label: T('متعددة', 'Multiple') }]}
                    getKey={o => o.id} getLabel={o => o.label}
                    value={editForm.exit_reentry_kind}
                    onChange={(id) => setEditForm(p => ({ ...p, exit_reentry_kind: id }))} />
                )}
                {/* السبب — بجانب النوع في نفس الصف (للخروج النهائي) */}
                {editForm.exit_visa_type === 'final_exit' && (
                  <Select label={T('سبب الخروج النهائي', 'Final Exit Reason')} placeholder={T('اختر السبب…', 'Select reason…')}
                    options={[{ id: 'client_request', label: T('طلب العميل', 'Client request') }, { id: 'unpaid_invoice', label: T('عدم تسديد فاتورة', 'Unpaid invoice') }, { id: 'iqama_not_renewed', label: T('عدم تجديد الإقامة', 'Iqama not renewed') }, { id: 'other', label: T('مشكلة أخرى', 'Other issue') }]}
                    getKey={o => o.id} getLabel={o => o.label}
                    value={editForm.final_exit_reason}
                    onChange={(id) => setEditForm(p => ({ ...p, final_exit_reason: id, exit_final_invoice_no: (id === 'unpaid_invoice' || id === 'client_request') ? p.exit_final_invoice_no : '' }))} />
                )}
                {/* رقم الفاتورة (كامل) — من فواتير العامل، مفلترة حسب الحالة:
                    • خروج وعودة → فواتير خدمة «خروج وعودة».
                    • خروج نهائي + «طلب العميل» → فواتير خدمة «خروج نهائي».
                    • خروج نهائي + «عدم تسديد» → كل الفواتير. */}
                {(editForm.exit_visa_type === 'exit_reentry' || (editForm.exit_visa_type === 'final_exit' && (editForm.final_exit_reason === 'unpaid_invoice' || editForm.final_exit_reason === 'client_request'))) && (() => {
                  const svcFilter = editForm.exit_visa_type === 'exit_reentry' ? 'خروج وعودة'
                    : editForm.final_exit_reason === 'client_request' ? 'خروج نهائي' : null
                  const invOpts = svcFilter ? editInvoices.filter(o => (o.service_ar || '').includes(svcFilter)) : editInvoices
                  return (
                    <Select full label={T('رقم الفاتورة', 'Invoice Number')}
                      placeholder={invOpts.length
                        ? T('اختر فاتورة العامل…', 'Select worker invoice…')
                        : (svcFilter ? T(`لا توجد فواتير «${svcFilter}» لهذا العامل`, 'No matching invoices for this worker') : T('لا توجد فواتير لهذا العامل', 'No invoices for this worker'))}
                      options={invOpts} getKey={o => o.no} getLabel={o => o.service_ar ? `#${o.no} — ${o.service_ar}` : `#${o.no}`}
                      value={editForm.exit_final_invoice_no}
                      onChange={(id) => setEditForm(p => ({ ...p, exit_final_invoice_no: id }))} />
                  )
                })()}
                {/* رقم التأشيرة (كامل) — فوق التاريخين */}
                <TextField full dir="ltr" label={T('رقم التأشيرة', 'Visa Number')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.exit_visa_number} onChange={v => setEditForm(p => ({ ...p, exit_visa_number: v }))} />
                {/* التاريخان مزدوجان */}
                <DateField label={T('تاريخ إصدار التأشيرة', 'Visa Issue Date')}
                  value={editForm.exit_visa_issue_date} onChange={v => setEditForm(p => ({ ...p, exit_visa_issue_date: v }))} />
                <DateField label={T('تاريخ انتهاء التأشيرة', 'Visa Expiry Date')}
                  value={editForm.exit_visa_expiry} onChange={v => setEditForm(p => ({ ...p, exit_visa_expiry: v }))} />
                {/* ملف التأشيرة (كامل) */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <FileField compact accept="application/pdf" label={T('ملف التأشيرة (PDF)', 'Visa file (PDF)')}
                    hint={T('ارفق ملف التأشيرة بصيغة PDF', 'Attach the visa as a PDF')}
                    value={exitVisaFile} onChange={setExitVisaFile} />
                </div>
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'wage') && (
            <ModalSection Icon={FileText} label={T('الأجر والاشتراك', 'Wage & Subscription')}>
              <div style={{ ...GRID, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <TextField dir="ltr" label={T('الأجر الأساسي', 'Basic Wage')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.wage_basic} onChange={v => setEditForm(p => ({ ...p, wage_basic: v.replace(/[^\d.]/g, '') }))} />
                <TextField dir="ltr" label={T('الأجر الإجمالي', 'Total Wage')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.wage_total} onChange={v => setEditForm(p => ({ ...p, wage_total: v.replace(/[^\d.]/g, '') }))} />
                <DateField label={T('تاريخ الالتحاق', 'Joining Date')}
                  value={editForm.joining_date} onChange={v => setEditForm(p => ({ ...p, joining_date: v }))} />
                <Select label={T('الحالة', 'Status')} placeholder={T('اختر الحالة…', 'Select status…')}
                  options={[{ id: 'active', label: T('نشط', 'Active') }, { id: 'suspended', label: T('غير نشط', 'Inactive') }]}
                  getKey={o => o.id} getLabel={o => o.label}
                  value={editForm.worker_status} onChange={id => setEditForm(p => ({ ...p, worker_status: id }))} />
              </div>
            </ModalSection>
          )}
          {(!editSection || editSection === 'work_permit') && (
            <ModalSection Icon={FileText} label={T('رخصة العمل والعقد', 'Work Permit & Contract')}>
              <div style={{ ...GRID, gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <TextField dir="ltr" label={T('رقم رخصة العمل', 'Work Permit No.')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.work_permit_number} onChange={v => setEditForm(p => ({ ...p, work_permit_number: v }))} />
                <Select label={T('حالة الرخصة', 'Permit Status')} placeholder={T('اختر الحالة…', 'Select status…')}
                  options={[{ id: 'VALID', label: T('سارية', 'Valid') }, { id: 'EXPIRING_SOON', label: T('قريبة الانتهاء', 'Expiring soon') }, { id: 'EXPIRED', label: T('منتهية', 'Expired') }, { id: 'NO_WORKPERMIT', label: T('لا توجد رخصة', 'No work permit') }]}
                  getKey={o => o.id} getLabel={o => o.label}
                  value={editForm.work_permit_status} onChange={id => setEditForm(p => ({ ...p, work_permit_status: id }))} />
                <DateField label={T('تاريخ إصدار الرخصة', 'Permit Start')}
                  value={editForm.work_permit_start} onChange={v => setEditForm(p => ({ ...p, work_permit_start: v }))} />
                <DateField label={T('تاريخ انتهاء الرخصة', 'Permit Expiry')}
                  value={editForm.work_permit_expiry} onChange={v => setEditForm(p => ({ ...p, work_permit_expiry: v }))} />
                <TextField dir="ltr" label={T('رقم العقد', 'Contract No.')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.contract_number} onChange={v => setEditForm(p => ({ ...p, contract_number: v }))} />
                <TextField label={T('نوع العقد', 'Contract Type')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.contract_type_ar} onChange={v => setEditForm(p => ({ ...p, contract_type_ar: v }))} />
                <DateField label={T('بداية العقد', 'Contract Start')}
                  value={editForm.contract_start_date} onChange={v => setEditForm(p => ({ ...p, contract_start_date: v }))} />
                <DateField label={T('نهاية العقد', 'Contract Expiry')}
                  value={editForm.contract_expiry_date} onChange={v => setEditForm(p => ({ ...p, contract_expiry_date: v }))} />
                <TextField full label={T('الحالة الوظيفية', 'Employment Status')} placeholder={T('اختياري', 'Optional')}
                  value={editForm.employment_status_ar} onChange={v => setEditForm(p => ({ ...p, employment_status_ar: v }))} />
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
              {T('العمالة الدائمة','Permanent Workforce')}
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx2)', marginTop: 12, lineHeight: 1.6 }}>
            {T('سجل مستقل للعمالة الدائمة وبياناتهم الشخصية والمهنية والمنشآت التابعين لها',
               'A standalone registry of the permanent workforce, their personal and professional data and the facilities they belong to')}
          </div>
        </div>
        {canPerm(user, 'workers.create') && (
        <button
          onClick={() => { setAddErr(null); setAddPage(0); setShowAdd(true) }}
          title={T('إضافة عامل دائم', 'Add Permanent Worker')}
          className="btn-primary-modal"
          style={{
            height: 42, padding: '0 18px', borderRadius: 11,
            cursor: 'pointer',
            fontFamily: F, fontSize: 13, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'background .15s ease, border-color .15s ease, box-shadow .15s ease',
          }}>
          <span>{T('إضافة عامل دائم', 'Add Permanent Worker')}</span>
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
          boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          overflow: 'hidden', minHeight: 150,
        }}>
          <div style={{ position: 'absolute', insetInlineStart: -60, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}26 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: -6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 10px ${C.blue}aa` }} />
            <span style={{ fontSize: 24, color: 'var(--tx)', fontWeight: 600, letterSpacing: '.2px' }}>{T(arCount(stats.total, 'عامل', 'عمال'),'Workers')}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 7, justifyContent: 'flex-start', direction: 'ltr' }}>
            <span style={{ fontSize: 42, fontWeight: 600, color: C.blue, letterSpacing: '-1.5px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{num(stats.total)}</span>
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
          boxShadow: 'var(--shadow-sm)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('انتهاء الإقامات','Iqama Status')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
            <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0 }}>
              <svg width="112" height="112" viewBox="0 0 112 112">
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
                <span style={{ fontSize: 24, fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums', direction: 'ltr', color: 'var(--tx)' }}>{validPct}%</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, marginTop: 4, letterSpacing: '.2px', color: 'var(--tx2)' }}>{T('سارية','valid')}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              {iqamaSegs.map(s => (
                <button key={s.k}
                  onClick={() => { setAdv(a => ({ ...a, iqama: a.iqama === s.k ? '' : s.k })); setPage(0) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, opacity: s.v === 0 ? 0.4 : 1, background: adv.iqama === s.k ? 'rgba(176,125,0,.08)' : 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontFamily: F, textAlign: 'right' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c, flexShrink: 0 }} />
                  <span style={{ color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{s.l}</span>
                  <span style={{ color: s.v === 0 ? 'var(--tx4)' : s.c, fontVariantNumeric: 'tabular-nums', direction: 'ltr', fontWeight: 600, flexShrink: 0 }}>{num(s.v)}</span>
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
          boxShadow: 'var(--shadow-sm)',
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--tx2)', fontWeight: 600, letterSpacing: '.2px' }}>{T('الجنسيات','Nationalities')}</span>
            <span style={{ fontSize: 10.5, color: C.purple, fontWeight: 600 }}>{num(natTop.length)} {T('جنسية','total')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, flex: 1 }}>
            {natTop.slice(0, 4).map(([n, count]) => (
              <button key={n} onClick={() => { setAdv(a => ({ ...a, nationality: a.nationality === n ? '' : n })); setPage(0) }}
                style={{
                  borderRadius: 12, padding: '8px 10px',
                  background: adv.nationality === n ? 'rgba(176,125,0,.12)' : 'rgba(255,255,255,.025)',
                  border: '1px solid ' + (adv.nationality === n ? 'rgba(176,125,0,.4)' : 'rgba(255,255,255,.04)'),
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4,
                  cursor: 'pointer', textAlign: 'start', fontFamily: F,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <NatFlag nationality={n} size={16} />
                  <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)', fontVariantNumeric: 'tabular-nums', direction: 'ltr', lineHeight: 1 }}>{num(count)}</span>
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
            style={{ width: '100%', height: 44, padding: '0 14px 0 38px', borderRadius: 12, background: 'var(--search-bg)', border: '1px solid transparent', color: 'var(--tx)', fontSize: 13, fontFamily: F, boxSizing: 'border-box', outline: 'none' }}/>
        </div>
        <_ViewDropdown VIEWS={VIEWS} tableView={tableView} setTableView={setTableView} T={T} F={F} />
        <button type="button" onClick={() => setAdvOpen(v => !v)} style={btnFilter(advOpen || advCount > 0)}>
          {T('تصفية', 'Filter')}
          {advCount > 0 ? (
            <span
              role="button" tabIndex={0}
              title={T('مسح الفلاتر', 'Clear filters')}
              onClick={e => { e.stopPropagation(); setAdv(ADV_EMPTY); setPage(0) }}
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

      {/* Advanced filter panel — كل حقل اختيار متعدّد؛ يمكن دمج عدّة حقول وقيم معاً */}
      {advOpen && (() => {
        // مُولّد موحّد لحقل تصفية متعدّد الاختيار. يُستدعى كدالة (لا كعنصر <MF/>) عمداً:
        // فلو عُرّف كمكوّن لأُعيد إنشاء هويته كل تصيير فيُعاد تركيب القائمة وتُغلَق مع كل
        // اختيار — والاستدعاء الدالّي يبقيها بموضع ثابت في الشجرة فتظل مفتوحة للاختيار المتعدد.
        const mf = ({ label, k, options, searchable = true, renderCell }) => (
          options && options.length === 0 ? null : (
            <FilterField key={k} label={label}>
              <FKDropdown multi selectedKeys={adv[k]} onChange={arr => { setAdv(a => ({ ...a, [k]: arr })); setPage(0) }}
                placeholder={T('الكل','All')} searchable={searchable} getKey={o => o.v} getLabel={o => o.l}
                options={options} renderCell={renderCell} />
            </FilterField>
          )
        )
        return (
        <div style={{ marginBottom: 22, padding: '16px 18px', background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {mf({ label: T('المكتب','Office'), k: 'branch', searchable: false, options: filterOpts.br })}
            {mf({ label: T('الجنسية','Nationality'), k: 'nationality', options: filterOpts.nat })}
            {mf({ label: T('المنشأة','Facility'), k: 'facility', options: filterOpts.fac,
              renderCell: (o, sel, q) => {
                // الرقم المعروض = الموحّد افتراضياً، ويتحوّل لرقم التأمينات/الموارد/السجل إذا طابق البحث
                // (فيدرك المستخدم أنها نفس المنشأة رغم اختلاف الرقم الذي بحث به).
                const digits = String(q || '').replace(/\D/g, '')
                const dig = (n) => String(n || '').replace(/\D/g, '')   // مقارنة بلا شرطة/رموز
                let numShown = o.unified
                if (digits.length >= 3) {
                  if (o.gosi && dig(o.gosi).includes(digits)) numShown = o.gosi
                  else if (o.hrsd && dig(o.hrsd).includes(digits)) numShown = o.hrsd
                  else if (o.cr && dig(o.cr).includes(digits)) numShown = o.cr
                }
                return (
                <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span title={o.name || ''} style={{ minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'start' }}>{o.short || o.name || o.l}{o.c != null ? ` (${num(o.c)})` : ''}</span>
                  {numShown && <span style={{ fontSize: 10, fontWeight: 600, color: C.gold, fontFamily: 'ui-monospace, monospace', direction: 'ltr', background: 'rgba(176,125,0,.1)', border: '1px solid rgba(176,125,0,.3)', borderRadius: 2, padding: '1px 7px', flexShrink: 0 }}>{numShown}</span>}
                </span>
                )
              } })}
            {mf({ label: T('المدينة','City'), k: 'city', options: filterOpts.city })}
            {mf({ label: T('المهنة الرسمية','Official Occupation'), k: 'occupation', options: filterOpts.occ })}
            {mf({ label: T('المهنة الفعلية','Actual Occupation'), k: 'actualOcc', options: filterOpts.aocc })}
            {mf({ label: T('انتهاء الإقامة','Iqama Expiry'), k: 'iqama', searchable: false, options: filterOpts.iqama })}
            {mf({ label: T('انتهاء رخصة العمل','Work Permit Expiry'), k: 'workPermit', searchable: false, options: filterOpts.workPermit })}
            {mf({ label: T('انتهاء الجواز','Passport Expiry'), k: 'passport', searchable: false, options: filterOpts.passport })}
            {mf({ label: T('انتهاء التأمين','Insurance Expiry'), k: 'insurance', searchable: false, options: filterOpts.insurance })}
            {mf({ label: T('الراتب','Salary'), k: 'wage', searchable: false, options: filterOpts.wage })}
            {mf({ label: T('العمر','Age'), k: 'age', searchable: false, options: filterOpts.age })}
            {mf({ label: T('الموقع','Location'), k: 'location', searchable: false, options: filterOpts.location })}
            {mf({ label: T('الخروج النهائي','Final Exit'), k: 'finalExit', searchable: false, options: filterOpts.finalExit })}
            {mf({ label: T('خروج وعودة','Exit & Re-entry'), k: 'exitReturn', searchable: false, options: filterOpts.exitReturn })}
            {mf({ label: T('حالة عقد قوى','Qiwa Contract Status'), k: 'employment', options: filterOpts.emp })}
            {mf({ label: T('المركبات','Vehicles'), k: 'vehicles', searchable: false, options: filterOpts.vehicles })}
            {mf({ label: T('رصيد الجوازات','Jawazat Balance'), k: 'balance', searchable: false, options: filterOpts.balance })}
            {mf({ label: T('المتبقي للفواتير','Invoice Remaining'), k: 'invoiceRemaining', searchable: false, options: filterOpts.invoiceRemaining })}
            {/* الترتيب: آخر حقل — معيار الترتيب + زر عكس الاتجاه (تصاعدي/تنازلي) */}
            <FilterField label={T('الترتيب حسب','Sort by')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <FKDropdown value={sort.key} onChange={k => { setSort(s => ({ ...s, key: k })); setPage(0) }}
                    options={SORT_OPTS} getKey={o => o.v} getLabel={o => o.l} searchable={false} placeholder={T('الترتيب حسب','Sort by')} />
                </div>
                <button type="button" title={sort.dir === 'asc' ? T('تصاعدي','Ascending') : T('تنازلي','Descending')}
                  onClick={() => { setSort(s => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' })); setPage(0) }}
                  style={{ height: 42, width: 42, borderRadius: 9, background: 'var(--fk-input-bg)', border: '1px solid var(--bd)', color: C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}>
                  {sort.dir === 'asc'
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h10"/><path d="M11 8h7"/><path d="M11 12h4"/></svg>}
                </button>
              </div>
            </FilterField>
          </div>
        </div>
        )
      })()}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--tx4)', fontSize: 13 }}>{T('جاري التحميل...','Loading...')}</div>
      ) : filtered.length === 0 ? (
        <Empty T={T} hasData={workers.length > 0} />
      ) : (
        <>
          <style>{`
            .wf-tbl{width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;font-family:${F};background:var(--card-grad2);border-radius:10px;border:1px solid var(--bd)}
            .wf-tbl thead th{position:sticky;top:0;background:var(--hd);color:var(--hdtx);font-size:12px;font-weight:600;text-align:center;padding:14px 4px 11px;box-shadow:inset 0 -2px 0 rgba(176,125,0,.55);white-space:nowrap;z-index:2;letter-spacing:.2px}
            .wf-tbl thead .hd-icon{color:${C.gold};display:inline-flex;align-items:center;justify-content:center;margin-inline-end:6px;vertical-align:middle}
            .wf-tbl thead .hd-icon svg{width:14px;height:14px;display:block}
            .wf-tbl tbody td{padding:10px 4px;font-size:11.5px;color:var(--tx);text-align:center;vertical-align:middle;overflow:hidden;border-bottom:1px solid var(--bd2)}
            /* فاصل عمودي خفيف متقطع بين الأعمدة */
            .wf-tbl thead th + th,.wf-tbl tbody td + td{border-inline-start:1px dashed var(--bd)}
            .wf-tbl tbody tr{cursor:pointer;transition:background .12s}
            .wf-tbl tbody tr:nth-child(even) td{background:var(--bd2)}
            .wf-tbl tbody tr:hover td{background:rgba(176,125,0,.06)}
            .wf-tbl tbody tr:last-child td:first-child{border-bottom-right-radius:9px}
            .wf-tbl tbody tr:last-child td:last-child{border-bottom-left-radius:9px}
            .wf-tbl tbody tr:last-child td{border-bottom:none}
            .wf-tbl thead tr:first-child th:first-child{border-top-right-radius:9px}
            .wf-tbl thead tr:first-child th:last-child{border-top-left-radius:9px}
            .wf-tbl .num{direction:ltr;font-family:ui-monospace,monospace;font-variant-numeric:tabular-nums;font-weight:600}
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
                {viewCols.map(c => <col key={c.k} style={{ width: c.w }} />)}
              </colgroup>
              <thead>
                <tr>
                  {viewCols.map(c => <th key={c.k} style={c.hStyle}>{c.h}</th>)}
                </tr>
              </thead>
              <tbody>
                {paged.map(w => (
                  <tr key={w.id} onClick={() => setDetail(w)}>
                    {viewCols.map(c => <React.Fragment key={c.k}>{c.cell(w)}</React.Fragment>)}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px 4px', borderTop: '1px solid var(--bd)', marginTop: 18 }}>
                <style>{`
                  .wf-pg-btn{width:32px;height:32px;border-radius:50%;background:rgba(176,125,0,.1);border:none;color:${C.gold};cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:.2s;font-family:${F}}
                  .wf-pg-btn:hover:not(:disabled){background:${C.gold};color:#000}
                  .wf-pg-btn:disabled{cursor:not-allowed;color:var(--tx4);background:rgba(255,255,255,.06)}
                  .wf-pg-input{width:42px;height:32px;background:transparent;border:none;outline:none;color:${C.gold};font-family:${F};font-size:14px;font-weight:600;text-align:center;direction:ltr;-moz-appearance:textfield;font-variant-numeric:tabular-nums}
                  .wf-pg-input::-webkit-outer-spin-button,.wf-pg-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
                `}</style>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: 'var(--tx)', fontWeight: 600 }}><span style={{ color: C.gold }}>{fromN}–{toN}</span> {T('من','of')} {num(filtered.length)}</span>
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
          title={T('إضافة عامل دائم', 'Add Permanent Worker')} Icon={UserPlus}
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
    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx3)', paddingInlineStart: 2, marginBottom: 7 }}>{label}</div>
    {children}
  </div>
)
function PageBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid var(--bd)', color: disabled ? 'var(--tx5)' : 'var(--tx2)', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 16, fontWeight: 600, opacity: disabled ? .4 : 1, fontFamily: F }}>{children}</button>
  )
}

function Empty({ T, hasData }) {
  return (
    <EmptyState
      icon={hasData
        ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B07D00" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B07D00" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>}
      title={hasData ? T('لا توجد نتائج للبحث', 'No results match the search') : T('لا يوجد عمال بعد', 'No workers yet')}
      desc={hasData ? T('جرّب تعديل كلمة البحث', 'Try adjusting your search') : T('استخدم زر «نقل إلى المنشآت» في مركز المزامنة', 'Use “Promote to sidebar” from the Sync Hub')} />
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
    <div style={{ background: 'var(--card-grad2)', border: '1px solid var(--bd)', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
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
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '9px 11px', borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)' }}>
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
                    <span style={{ fontSize: 11.5, color: 'var(--tx2)', fontWeight: 600 }}>{isCreate ? T('تمت الإضافة', 'Added') : isTransfer ? T('تم النقل', 'Transferred') : T('تم التعديل', 'Edited')}</span>
                    {c.via === 'insurance_check' && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.ok, background: C.ok + '1a', border: '1px solid ' + C.ok + '47', borderRadius: 6, padding: '1px 7px' }}>{T('عبر استعلام التأمين', 'via insurance check')}</span>
                    )}
                    {c.by_name && <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{T('بواسطة', 'by')} {c.by_name}</span>}
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, direction: 'ltr', flexShrink: 0 }}>{fmtDateTime(c.at)}</span>
                </div>
                {isCreate ? (
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span>{T('تمت إضافة العامل', 'Worker added')}</span>
                    {c.label && <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{c.label}</span>}
                  </div>
                ) : isTransfer ? (
                  <div style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{c.from === 'permanent' ? T('نُقل من العمالة الدائمة', 'Moved from permanent workforce') : T('نُقل من العمالة المؤقتة', 'Moved from temporary workforce')}</span>
                  </div>
                ) : c.changes.map((ch, j) => {
                  const isFile = FILE_FIELDS.has(ch.field)
                  return (
                  <div key={j} style={{ fontSize: 11, color: 'var(--tx4)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span>{T(WORKER_LBL[ch.field]?.[0] || ch.field, WORKER_LBL[ch.field]?.[1] || ch.field)}:</span>
                    <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{(ch.to == null || ch.to === '') ? '—' : (isFile ? fileLink(ch.to) : ch.to)}</span>
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

/* ═══════════════════════ كرت التجديد (بوكماركت مقيم) ═══════════════════════ */
// حاجز أخطاء — يمنع أي استثناء داخل كرت التجديد (مثلاً رد مقيم بشكل غير متوقع)
// من تبييض صفحة تفاصيل العامل بالكامل؛ يعرض بديلاً هادئاً بدل الانهيار.
class CardBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch() {}
  render() { return this.state.err ? (this.props.fallback ?? null) : this.props.children }
}


// يولّد بوكماركت مقيم لتجديد إقامة العامل: المستخدم يختار المدة (3/6/9/12 شهر)،
// يسحب الزر إلى شريط الإشارات، يفتح مقيم ويضغطه → يرسل POST renew/validate
// بجلسة المستخدم نفسها، يحفظ رد مقيم في muqeem_renewal_checks عبر جسر مقيم،
// ويظهر الرد هنا مباشرة عبر Realtime. راجع src/pages/muqeemRenewBookmarklet.js.
function RenewalCard({ w, f, sb, T, isAr, toast }) {
  const DURATIONS = [3, 6, 9, 12]
  const [duration, setDuration] = useState(12)
  const [latest, setLatest] = useState(undefined)   // undefined=جارٍ التحميل، null=لا يوجد فحص بعد
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)

  const iqama = String(w?.iqama_number || '').trim()
  const validIqama = /^[12]\d{9}$/.test(iqama)
  const proxyBaseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  // كفيل العامل = الرقم الموحد للمنشأة (= رقم مقيم moiNumber). يُبَك في البوكماركت
  // ليسكّ توكن هذه المنشأة تلقائياً عبر الدخول الموحد بدل تبديل يدوي في مقيم.
  const targetMoi = f?.unified_number || null
  const href = validIqama
    ? buildMuqeemRenewBookmarklet({ iqama, duration, workerId: w.id, personId: w.person_id || null, targetMoi, proxyBaseUrl })
    : '#'
  const dragRef = useRef(null)
  useEffect(() => { if (dragRef.current) dragRef.current.setAttribute('href', href) }, [href])

  const loadLatest = useCallback(async () => {
    if (!sb || !w?.id) return
    const { data } = await sb.from('muqeem_renewal_checks')
      .select('*').eq('worker_id', w.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setLatest(data || null)
  }, [sb, w?.id])
  useEffect(() => { loadLatest() }, [loadLatest])

  // Realtime — يظهر رد مقيم فور وصوله من البوكماركت (يعمل في تبويب مقيم الآخر).
  useEffect(() => {
    if (!sb || !w?.id) return
    const ch = sb.channel('jisr-renew-' + w.id)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'muqeem_renewal_checks', filter: 'worker_id=eq.' + w.id },
        (payload) => { setLatest(payload.new); toast?.(T('وصل رد مقيم', 'Muqeem reply received')) })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [sb, w?.id, toast, T])

  const copyHref = async () => {
    if (!validIqama) return
    try { await navigator.clipboard.writeText(href); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { toast?.(T('تعذّر النسخ', 'Copy failed')) }
  }

  // استخراج رقم رسوم لو وُجد في رد مقيم (شكل الرد قد يختلف).
  const feeOf = (r) => {
    if (!r || typeof r !== 'object') return null
    for (const k of ['totalAmount', 'total', 'amount', 'fees', 'renewalFees', 'fee']) {
      if (r[k] != null && !Number.isNaN(Number(r[k]))) return Number(r[k])
    }
    return null
  }
  // رسالة الخطأ قد تأتي من مقيم/elm ككائن ({arabic,english}) أو مصفوفة — نُعيدها
  // دائماً نصاً، فعرض كائن كعنصر React يبيّض الصفحة.
  const asText = (x) => {
    if (x == null) return null
    if (typeof x === 'string') return x
    if (typeof x !== 'object') return String(x)
    if (x.arabic || x.english) return x.arabic || x.english
    if (x.ar || x.en) return x.ar || x.en
    if (Array.isArray(x)) return x.map(asText).filter(Boolean).join(' • ')
    try { return JSON.stringify(x) } catch { return String(x) }
  }
  const errOf = (r) => {
    if (!r || typeof r !== 'object') return null
    return asText(r.errorMessage ?? r.message ?? r.error ?? r.errors ?? null)
  }
  const fmtWhen = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso); if (Number.isNaN(d.getTime())) return '—'
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  }

  const resp = latest?.response
  const fee = feeOf(resp)
  const err = errOf(resp)
  // 403 من مقيم على التجديد. السبب الأول (مؤكَّد بالبيانات): اشتراك المنشأة في مقيم
  // منتهٍ. السبب الثاني: المنشأة النشطة ليست كفيل العامل / لا صلاحية تجديد.
  const forbidden = latest && latest.http_status === 403
  const subExpired = forbidden && latest?.request?._subExpired === true
  const subExpiry = latest?.request?._subExpiry || null
  const sessionMoi = latest?.request?._sessionMoi || null
  const wrongSponsor = forbidden && !subExpired
  const scalarRows = (resp && typeof resp === 'object' && !Array.isArray(resp))
    ? Object.entries(resp).filter(([, v]) => v != null && typeof v !== 'object')
    : []

  const chip = (val) => {
    const active = duration === val
    return (
      <button key={val} type="button" onClick={() => setDuration(val)}
        style={{
          minWidth: 62, height: 40, borderRadius: 10, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600,
          background: active ? 'rgba(176,125,0,.14)' : 'var(--inputBg)',
          border: `1.5px solid ${active ? C.gold : 'var(--bd)'}`,
          color: active ? C.gold : 'var(--tx2)', transition: 'all .15s',
        }}>
        {T(`${val} شهر`, `${val}m`)}
      </button>
    )
  }

  return (
    <div style={cardChrome}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
        <img src="/muqeem-logo.png" alt="" width="18" height="18" style={{ borderRadius: '50%', objectFit: 'contain', background: '#fff', border: '1.5px solid #f59e0b', padding: 1, flexShrink: 0 }} />
        <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.gold }}>{T('التجديد', 'Renewal')}</span>
        <span style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--tx4)' }}>{T('عبر مقيم', 'via Muqeem')}</span>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!validIqama ? (
          <div style={{ fontSize: 12.5, color: 'var(--tx4)', fontWeight: 600, textAlign: 'center', padding: '8px 0' }}>
            {T('لا يوجد رقم إقامة صالح للعامل لتجديده', 'Worker has no valid iqama number to renew')}
          </div>
        ) : (
          <>
            {/* رقم الإقامة + اختيار المدة */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>{T('رقم الإقامة', 'Iqama No.')}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.gold, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{iqama}</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)', marginBottom: 8 }}>{T('مدة التجديد', 'Renewal duration')}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{DURATIONS.map(chip)}</div>
            </div>

            {/* الزر القابل للسحب + نسخ الرابط */}
            <div style={{ background: 'var(--inputBg)', border: '1px dashed var(--bd)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)', lineHeight: 1.7 }}>
                {T('اسحب الزر إلى شريط الإشارات (أو انسخ الرابط وأنشئ إشارة يدويًا)، ثم افتح مقيم واضغطه لتجديد إقامة هذا العامل بالمدة المختارة.',
                   'Drag the button to your bookmarks bar (or copy the link and create a bookmark), then open Muqeem and click it to renew this worker for the chosen duration.')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <a ref={dragRef} href={href} title={T('اسحبني إلى شريط الإشارات', 'Drag me to the bookmarks bar')}
                  draggable="true" onClick={e => e.preventDefault()}
                  style={{
                    height: 40, paddingInline: 16, borderRadius: 10, direction: 'ltr',
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
                    textDecoration: 'none', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'grab',
                    display: 'inline-flex', alignItems: 'center', gap: 9, userSelect: 'none',
                    boxShadow: '0 2px 10px rgba(245,158,11,.35)',
                  }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                  <span>{T(`تجديد ${duration} شهر`, `Renew ${duration}m`)}</span>
                </a>
                <button type="button" onClick={copyHref}
                  style={{ height: 40, paddingInline: 14, borderRadius: 10, background: 'var(--card-grad2)', border: '1px solid var(--bd)', color: 'var(--tx2)', cursor: 'pointer', fontFamily: F, fontSize: 12.5, fontWeight: 600 }}>
                  {copied ? T('✓ نُسخ', '✓ Copied') : T('نسخ الرابط', 'Copy link')}
                </button>
              </div>
            </div>

            {/* آخر رد من مقيم */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx2)' }}>{T('آخر رد من مقيم', 'Latest Muqeem reply')}</span>
                <button type="button" onClick={loadLatest} title={T('تحديث', 'Refresh')}
                  style={{ marginInlineStart: 'auto', height: 28, width: 28, borderRadius: 8, background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={13} />
                </button>
              </div>
              {latest === undefined ? (
                <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('جارٍ التحميل…', 'Loading…')}</div>
              ) : latest === null ? (
                <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '10px 0' }}>{T('لم يُجرَ أي فحص تجديد بعد', 'No renewal check yet')}</div>
              ) : (
                <div style={{ border: `1px solid ${latest.ok ? 'rgba(46,204,113,.4)' : 'rgba(232,114,101,.4)'}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 12px', background: latest.ok ? 'rgba(46,204,113,.08)' : 'rgba(232,114,101,.08)' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: latest.ok ? C.ok : C.red }}>
                      {latest.ok ? T('✓ نجح الفحص', '✓ Check succeeded') : T('⚠ رفض/خطأ', '⚠ Rejected/Error')}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)' }}>HTTP {latest.http_status ?? '—'}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)' }}>{T(`المدة ${latest.renew_duration} شهر`, `${latest.renew_duration}m`)}</span>
                    <span style={{ marginInlineStart: 'auto', fontSize: 10.5, fontWeight: 600, color: 'var(--tx4)', direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{fmtWhen(latest.created_at)}</span>
                  </div>
                  <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {subExpired && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.red, background: 'rgba(232,114,101,.06)', border: '1px solid rgba(232,114,101,.25)', borderRadius: 8, padding: '9px 11px', lineHeight: 1.7 }}>
                        {T('اشتراك المنشأة في مقيم منتهٍ — التجديد لا يعمل باشتراك منتهٍ. جدّد اشتراك المنشأة في مقيم (تجديد الاشتراك) ثم أعد الضغط على الزر.',
                           'The establishment’s Muqeem subscription has expired — renewal cannot run without an active subscription. Renew the establishment’s Muqeem subscription first, then click the button again.')}
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
                          {subExpiry && (
                            <span style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 7, padding: '4px 8px', color: 'var(--tx2)' }}>
                              {T('انتهى الاشتراك في', 'Subscription expired')}: <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{subExpiry}</span>
                            </span>
                          )}
                          {(f?.name_ar || f?.name_en) && (
                            <span style={{ background: 'rgba(176,125,0,.08)', border: `1px solid ${C.gold}55`, borderRadius: 7, padding: '4px 8px', color: C.gold, fontWeight: 600 }}>
                              {T('المنشأة', 'Establishment')}: {f.name_ar || f.name_en}{sessionMoi ? ` — ${sessionMoi}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {wrongSponsor && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.red, background: 'rgba(232,114,101,.06)', border: '1px solid rgba(232,114,101,.25)', borderRadius: 8, padding: '9px 11px', lineHeight: 1.7 }}>
                        {T('المنشأة النشطة في مقيم ليست كفيل هذا العامل (أو لا تملك صلاحية تجديده). افتح مقيم بمنشأة كفيل العامل ثم أعد الضغط على الزر.',
                           'The establishment active in Muqeem is not this worker’s sponsor (or lacks renewal permission). Open Muqeem under the worker’s sponsor establishment, then click the button again.')}
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
                          {sessionMoi && (
                            <span style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 7, padding: '4px 8px', color: 'var(--tx2)' }}>
                              {T('المنشأة النشطة وقت المحاولة', 'Active establishment')}: <span style={{ direction: 'ltr', fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>{sessionMoi}</span>
                            </span>
                          )}
                          {(f?.name_ar || f?.name_en) && (
                            <span style={{ background: 'rgba(176,125,0,.08)', border: `1px solid ${C.gold}55`, borderRadius: 7, padding: '4px 8px', color: C.gold, fontWeight: 600 }}>
                              {T('كفيل العامل', 'Worker’s sponsor')}: {f.name_ar || f.name_en}{f?.unified_number ? ` — ${f.unified_number}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {fee != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx3)' }}>{T('رسوم التجديد', 'Renewal fees')}</span>
                        <span style={{ marginInlineStart: 'auto', fontSize: 15, fontWeight: 600, color: C.gold, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{fee.toLocaleString('en-US')} {T('ريال', 'SAR')}</span>
                      </div>
                    )}
                    {err && !wrongSponsor && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.red, background: 'rgba(232,114,101,.06)', border: '1px solid rgba(232,114,101,.25)', borderRadius: 8, padding: '8px 10px', lineHeight: 1.6, wordBreak: 'break-word' }}>{err}</div>
                    )}
                    {scalarRows.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {scalarRows.map(([k, v]) => (
                          <div key={k} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 8, padding: '7px 9px', display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                            <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx1)', direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(v)}>{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" onClick={() => setShowRaw(s => !s)}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontFamily: F, fontSize: 11.5, fontWeight: 600, padding: 0, textDecoration: 'underline' }}>
                      {showRaw ? T('إخفاء الرد الكامل', 'Hide full reply') : T('عرض الرد الكامل', 'Show full reply')}
                    </button>
                    {showRaw && (
                      <pre style={{ margin: 0, maxHeight: 220, overflow: 'auto', background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 8, padding: 10, fontSize: 11, direction: 'ltr', color: 'var(--tx2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {typeof resp === 'string' ? resp : JSON.stringify(resp, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════ Worker Detail (mirrors Facility detail) ═══════════════════════ */
function WorkerDetail({ worker: w, facility: f, sb, toast, T, isAr, onBack, onEdit, onSaved, onDelete, onTransfer, canEdit, canDelete, user, attKey }) {
  const t = themeForStatus(w.worker_status)
  const iqamaDays = daysUntil(w.iqama_expiry_date)

  // الفرع التابع للعامل: افتراضياً يتبع فرع منشأته تلقائياً؛ ويمكن تخصيصه يدوياً (workers.branch_id)
  // لحالة كون المنشأة لفرع والعامل لفرع آخر. المصدر الفعّال = فرع العامل الخاص إن حُدِّد، وإلا فرع المنشأة.
  // تسمية الفرع: «الرمز — الاسم المستعار (name_ar)»؛ يسقط للمدينة إن لم يوجد اسم مستعار.
  const brLabelOf = (b) => {
    if (!b) return null
    const code = b.branch_code || '—'
    const nick = b.name_ar || (b.city ? T(b.city.name_ar, b.city.name_en || b.city.name_ar) : null)
    return nick ? `${code} — ${nick}` : code
  }
  // الكود فقط + تلميح بالاسم المستعار والمدينة (لحقول الفرع المختصرة).
  const brCodeOf = (b) => b?.branch_code || '—'
  const brTipOf = (b) => {
    if (!b) return null
    const nick = b.name_ar || null
    const city = b.city ? T(b.city.name_ar, b.city.name_en || b.city.name_ar) : null
    return [nick, city].filter(Boolean).join(' — ') || b.branch_code || null
  }
  const [branches, setBranches] = useState([])
  const [branchOverride, setBranchOverride] = useState(w.branch_id || null)
  useEffect(() => { setBranchOverride(w.branch_id || null) }, [w.id, w.branch_id])
  useEffect(() => {
    if (!sb) return
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('branches').select('id,branch_code,name_ar,is_active,city:cities(name_ar,name_en)').is('deleted_at', null).order('branch_code', { ascending: true })
      if (!cancelled) setBranches(data || [])
    })()
    return () => { cancelled = true }
  }, [sb])
  const branchById = useMemo(() => Object.fromEntries((branches || []).map(b => [b.id, b])), [branches])
  const ownBranch = branchOverride ? (branchById[branchOverride] || null) : null
  const facBranchLabel = brLabelOf(branchById[f?.branch_id] || f?.branch)
  const branchLabel = ownBranch ? brLabelOf(ownBranch) : facBranchLabel
  const branchIsOverride = !!ownBranch
  // نافذة تخصيص فرع العامل — «تلقائي (حسب المنشأة)» يمسح التخصيص (branch_id = null).
  const [brEdit, setBrEdit] = useState(false)
  const [brSel, setBrSel] = useState(null)
  const [brBusy, setBrBusy] = useState(false)
  const [brDone, setBrDone] = useState(false)
  const [brErr, setBrErr] = useState(null)
  const openBranchEdit = () => { setBrSel(branchOverride || null); setBrDone(false); setBrErr(null); setBrEdit(true) }
  const saveBranch = async () => {
    setBrBusy(true); setBrErr(null)
    try {
      const { data: freshRow } = await sb.from('workers').select('edit_log').eq('id', w.id).maybeSingle()
      const prevLog = Array.isArray(freshRow?.edit_log) ? freshRow.edit_log : []
      const fromLabel = brLabelOf(ownBranch) || null
      const toLabel = brSel ? (brLabelOf(branchById[brSel]) || null) : null
      const entry = { at: new Date().toISOString(), by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, changes: [{ field: 'branch_id', from: fromLabel, to: toLabel }] }
      const { error } = await sb.from('workers').update({ branch_id: brSel || null, updated_by: user?.id || null, edit_log: [...prevLog, entry] }).eq('id', w.id)
      if (error) throw new Error(error.message)
      setBranchOverride(brSel || null)
      setBrDone(true)
      onSaved?.()
    } catch (e) { setBrErr(T('فشل الحفظ: ' + (e.message || ''), 'Save failed: ' + (e.message || ''))) }
    finally { setBrBusy(false) }
  }
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

  // حذف العامل / نقله للعمالة المؤقتة — تأكيد قبل التنفيذ. confirm: null | 'delete' | 'transfer'
  // عند النجاح نعرض شاشة نجاح داخل النافذة (done) بدل التوستر، وإغلاقها يعيدنا للقائمة.
  const wName = w.name_ar || w.name_en || '—'
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)
  const doDelete = async () => { setBusy(true); const ok = await onDelete?.(); setBusy(false); if (ok !== false) setDone({ title: T('تم حذف العامل', 'Worker deleted') }) }
  const doTransfer = async () => { setBusy(true); const ok = await onTransfer?.(); setBusy(false); if (ok !== false) setDone({ title: T('تم نقل العامل إلى العمالة المؤقتة', 'Moved to temporary workforce') }) }
  // إغلاق نافذة التأكيد: بعد النجاح نعود للقائمة (onBack)، وإلا نكتفي بإلغاء التأكيد.
  const closeConfirm = () => { if (busy) return; const wasDone = !!done; setDone(null); setConfirm(null); if (wasDone) onBack?.() }

  // تصفير الحالة المؤقتة (override التأمين + قيود السجل المضافة) عند تبديل العامل المعروض.
  useEffect(() => { setInsOverride(null); setLogExtra([]) }, [w.id])
  // فواتير وخدمات العامل (تُحمّل عند فتح الصفحة) — نفس كرت صفحة المنشأة.
  const [facRows, setFacRows] = useState(null)
  // عميل ووسيط كل فاتورة — لكرت «عميل ووسيط الفاتورة» (خاصة تأشيرة بإقامة/نقل الكفالة
  // حيث الفاتورة على عميل مختلف عن العامل، لكنها مرتبطة برقم حدوده).
  const [invParties, setInvParties] = useState([])
  useEffect(() => {
    if (!sb || !w?.id) { setFacRows([]); setInvPhones([]); setInvParties([]); return }
    let cancelled = false
    ;(async () => {
      const { data } = await sb.from('v_worker_invoices').select('*').eq('worker_id', w.id)
      if (cancelled) return
      setFacRows(data || [])
      const rows = data || []
      const srIds = [...new Set(rows.map(r => r.service_request_id).filter(Boolean))]
      const invIds = [...new Set(rows.map(r => r.invoice_id).filter(Boolean))]
      const [{ data: srRows }, { data: invRows }] = await Promise.all([
        srIds.length ? sb.from('service_requests')
          .select('id, client:clients!service_requests_client_id_fkey(name_ar,name_en,phone)').in('id', srIds)
          : Promise.resolve({ data: [] }),
        invIds.length ? sb.from('invoices')
          .select('id, service_request_id, agent:agents!invoices_agent_id_fkey(name_ar,name_en,phone)').in('id', invIds)
          : Promise.resolve({ data: [] }),
      ])
      if (cancelled) return
      // أرقام جوال العملاء — للعرض ضمن «أرقام جوال الفواتير».
      setInvPhones([...new Set((srRows || []).map(r => r.client?.phone).filter(Boolean))])
      // عميل لكل طلب + وسيط لكل فاتورة، مدموجَين على مستوى صف الفاتورة.
      const clientBySr = Object.fromEntries((srRows || []).map(r => [r.id, r.client || null]))
      const agentByInv = Object.fromEntries((invRows || []).map(r => [r.id, r.agent || null]))
      const seen = new Set()
      const parties = []
      for (const r of rows) {
        const key = r.invoice_id || r.service_request_id
        if (!key || seen.has(key)) continue
        seen.add(key)
        const client = clientBySr[r.service_request_id] || null
        const agent = r.invoice_id ? agentByInv[r.invoice_id] : null
        if (!client && !agent) continue
        parties.push({ key, service_ar: r.service_ar, invoice_no: r.invoice_no, client, agent })
      }
      setInvParties(parties)
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
  // بيانات مقيم للعامل: ملف التقرير PDF + التأمين الطبي + تأشيرات الخروج/العودة
  // والخروج النهائي (من تقارير المنشأة في مقيم، مطابقة برقم الإقامة alienId).
  const [muqeemSyncedPdf, setMuqeemSyncedPdf] = useState(null)
  const [muqeemData, setMuqeemData] = useState(null)  // { insurance, er:[], fe:[] }
  useEffect(() => {
    if (!sb || !w?.iqama_number) { setMuqeemSyncedPdf(null); setMuqeemData(null); return }
    let cancelled = false
    const iqama = String(w.iqama_number)
    ;(async () => {
      const [{ data: res }, { data: comp }] = await Promise.all([
        sb.from('muqeem_residents').select('profile_pdf_path,detail_raw').eq('iqama_number', iqama).maybeSingle(),
        f?.unified_number
          ? sb.from('muqeem_companies').select('report_issued_er_visa_raw,report_extended_er_visa_raw,report_final_exit_raw,report_probation_final_exit_raw').eq('moi_number', f.unified_number).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (cancelled) return
      setMuqeemSyncedPdf(res?.profile_pdf_path
        ? { file_url: WORKER_PHOTO_BASE + String(res.profile_pdf_path).split('/').map(encodeURIComponent).join('/'), synced: true }
        : null)
      const arrOf = (x) => Array.isArray(x) ? x : (Array.isArray(x?.content) ? x.content : (Array.isArray(x?.rows) ? x.rows : []))
      const byAlien = (raw) => arrOf(raw).filter(v => String(v?.alienId || '') === iqama)
      const er = [...byAlien(comp?.report_issued_er_visa_raw), ...byAlien(comp?.report_extended_er_visa_raw)]
      const fe = [...byAlien(comp?.report_final_exit_raw), ...byAlien(comp?.report_probation_final_exit_raw)]
      const dr = res?.detail_raw || null
      const vehicles = Array.isArray(dr?.vehicles?.vehiclesList) ? dr.vehicles.vehiclesList.length : null
      const jawazatBalance = dr?.jawazat_balance?.balance ?? null
      setMuqeemData({ insurance: dr?.insurance || null, er, fe, vehicles, jawazatBalance, hasDetail: !!dr })
    })()
    return () => { cancelled = true }
  }, [sb, w?.iqama_number, f?.unified_number])
  const muqeemAtt = docFiles.muqeem_file || muqeemSyncedPdf || null

  // ── جلب من مقيم ──
  // يستعلم ببوت مقيم (نفس مسار حسبة نقل الكفالة: Edge Function query-muqeem) برقم
  // إقامة العامل، ويحدّث حالة الإقامة والمهنة الرسمية وتاريخ انتهاء الإقامة وعدد
  // مرات النقل. يسجّل التغييرات في سجل التعديلات موسومةً بأنها عبر «جلب من مقيم».
  const [mqPullBusy, setMqPullBusy] = useState(false)
  const MUQEEM_FN_URL = 'https://gcvshzutdslmdkwqwteh.supabase.co/functions/v1/query-muqeem'
  const MUQEEM_FN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjdnNoenV0ZHNsbWRrd3F3dGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTkwNjgsImV4cCI6MjA5MDQ3NTA2OH0.5R0I5VvB7lp3wpSrtay3DMcXKsT9l1uK0Ukd1F4_ImM'
  const pullFromMuqeem = async () => {
    const iqama = String(w.iqama_number || '').trim()
    if (!/^[12]\d{9}$/.test(iqama)) { toast?.(T('رقم إقامة غير صالح للاستعلام', 'Invalid iqama number')); return }
    setMqPullBusy(true)
    try {
      const res = await fetch(MUQEEM_FN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: MUQEEM_FN_KEY, Authorization: `Bearer ${MUQEEM_FN_KEY}` },
        body: JSON.stringify({ iqama }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        toast?.(data.status === 400
          ? T('لا توجد بيانات لهذا العامل في مقيم', 'No Muqeem data for this worker')
          : T('خدمة مقيم غير متاحة حالياً — حاول لاحقاً', 'Muqeem service unavailable — try again later'))
        return
      }
      const m = data.result || {}
      // مطابقة المهنة الرسمية باسمها العربي للحصول على معرّفها.
      let occId = null
      if (m.occupationAr) {
        const { data: occ } = await sb.from('occupations').select('id').eq('name_ar', m.occupationAr).limit(1).maybeSingle()
        occId = occ?.id || null
      }
      const newExp = m.iqamaExpiryGregorian || null
      const newStatus = m.statusAr || null
      const newOcc = m.occupationAr || null
      const newSc = m.sponsorChanges != null ? Math.max(0, m.sponsorChanges) : null
      const oldExp = w.iqama_expiry_date ? String(w.iqama_expiry_date).slice(0, 10) : null
      const changes = [
        ['residency_status_ar', w.residency_status_ar || null, newStatus],
        ['occupation_ar', w.occupation_ar || null, newOcc],
        ['iqama_expiry_date', oldExp, newExp],
        ['sponsor_changes', w.sponsor_changes ?? null, newSc],
      ].filter(([, from, to]) => to != null && String(from ?? '') !== String(to ?? ''))
       .map(([field, from, to]) => ({ field, from: from ?? null, to: to ?? null }))
      const patch = { updated_at: new Date().toISOString(), updated_by: user?.id || null }
      if (newStatus != null) patch.residency_status_ar = newStatus
      if (newOcc != null) { patch.occupation_ar = newOcc; if (occId) patch.current_occupation_id = occId }
      if (newExp) patch.iqama_expiry_date = newExp
      if (newSc != null) patch.sponsor_changes = newSc
      if (changes.length) {
        const prevLog = Array.isArray(w.edit_log) ? w.edit_log : []
        patch.edit_log = [...prevLog, { at: new Date().toISOString(), by: user?.id || null, by_name: user?.person?.name_ar || user?.person?.name_en || null, via: 'muqeem_fetch', changes }]
      }
      const { error } = await sb.from('workers').update(patch).eq('id', w.id)
      if (error) { toast?.(T('فشل الحفظ: ', 'Save failed: ') + error.message); return }
      toast?.(changes.length ? T('تم الجلب والتحديث من مقيم', 'Fetched & updated from Muqeem') : T('بيانات مقيم محدّثة أصلاً', 'Muqeem data already up to date'))
      onSaved?.()
    } catch {
      toast?.(T('تعذّر الاتصال بمقيم', 'Could not reach Muqeem'))
    } finally { setMqPullBusy(false) }
  }

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
        try { await sb.from('workers').update(patch).eq('id', w.id) } catch { /* العرض يبقى من النتيجة */ }
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
  // مصدر الحقل من workers.field_sources — يكتبه النقل المدمج بترتيب الموثوقية.
  const srcOf = (key) => {
    const s = w?.field_sources?.[key]
    return (typeof s === 'string' && SOURCE_BRAND[s]) ? s : null
  }
  // حقل بنفس تصميم صفحة تفاصيل المنشأة (صندوق داكن، التسمية أعلى، القيمة أسفل + نسخ).
  // src: مفتاح الحقل في field_sources — يعرض شارة المنصة التي جاءت منها القيمة.
  const Field = ({ k, v, mono, color, link, full, src, suffix, title, srcName, wrap }) => {
    const empty = v == null || v === ''
    const srcKey = !empty ? (src ? srcOf(src) : (srcName || null)) : null
    return (
      <div onClick={link && !empty ? () => goFacility(link) : undefined}
        style={{ gridColumn: full ? '1 / -1' : undefined, background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5, cursor: link && !empty ? 'pointer' : 'default', transition: 'border-color .15s', minWidth: 0 }}
        onMouseEnter={link && !empty ? (e => { e.currentTarget.style.borderColor = 'rgba(176,125,0,.5)' }) : undefined}
        onMouseLeave={link && !empty ? (e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.05)' }) : undefined}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9.5, color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{k}</span>
          {srcKey && <SrcPill src={srcKey} isAr={isAr} />}
        </span>
        <span style={{ display: 'flex', alignItems: wrap ? 'flex-start' : 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr', minWidth: 0 }}>
          {!empty && !link && <CopyBtn value={v} toast={toast} T={T} />}
          {!empty && link && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>}
          {!empty && suffix && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx4)', flexShrink: 0, direction: 'rtl' }}>{suffix}</span>}
          <span title={title || undefined} style={{ fontSize: 13, color: empty ? 'var(--tx4)' : (link ? C.gold : (color || 'var(--tx1)')), fontWeight: 600, lineHeight: 1.4, direction: mono ? 'ltr' : 'rtl', fontFamily: mono ? 'ui-monospace, monospace' : F, overflow: wrap ? 'visible' : 'hidden', textOverflow: wrap ? 'clip' : 'ellipsis', whiteSpace: wrap ? 'normal' : 'nowrap', wordBreak: wrap ? 'break-word' : undefined, minWidth: 0, cursor: title ? 'help' : undefined }}>{empty ? '—' : v}</span>
        </span>
      </div>
    )
  }
  // رأس كرت مصدره منصة مزامنة: شارة المنصة + عمر آخر مزامنة (من field_sources._synced).
  const SrcHead = ({ src }) => {
    const b = SOURCE_BRAND[src]
    if (!b) return null
    const at = w?.field_sources?._synced?.[src]
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        {at && <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtAgo(at, isAr)}</span>}
        <SrcPill src={src} isAr={isAr} size={20} />
      </span>
    )
  }
  // بطاقة ملف وثيقة (تصميم مربّع) — عرض الملف إن وُجد، وإلا «لا يوجد» (الرفع يتم من نافذة التعديل).
  const FileTile = ({ label, att }) => (
    <div style={{ background: 'var(--inputBg)', border: att ? '1px solid rgba(176,125,0,.25)' : '1px dashed var(--bd)', borderRadius: 12, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', minWidth: 0 }}>
      {att ? (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>
      ) : (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--tx4)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
      )}
      <span style={{ fontSize: 11, color: att ? 'var(--tx2)' : 'var(--tx4)', fontWeight: 600, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{label}</span>
      {att ? (
        <a href={att.file_url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 10.5, fontWeight: 600, color: C.gold, textDecoration: 'none' }}>{T('عرض الملف','View file')}</a>
      ) : (
        <span style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600 }}>{T('لا يوجد','None')}</span>
      )}
    </div>
  )
  // نفس تصميم زر التعديل في صفحة تفاصيل الفاتورة (خلفية خفيفة جداً، بلا ظل).
  const EditBtn = ({ onClick, allow }) => (allow !== undefined ? allow : canEdit) && onClick ? (
    <button onClick={onClick} title={T('تعديل', 'Edit')}
      style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(176,125,0,.06)', border: '1px dashed var(--accent-bd)', color: 'var(--accent)', cursor: 'pointer', fontFamily: F, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(176,125,0,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(176,125,0,.06)' }}>
      <span>{T('تعديل', 'Edit')}</span>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
    </button>
  ) : null
  const CardHead = ({ children, onEdit: onEditCard, action, allowEdit }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
      <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />{children}
      </span>
      {action !== undefined ? action : <EditBtn onClick={onEditCard} allow={allowEdit} />}
    </div>
  )
  // زر إجراء في الترويسة — نفس تصميم زر «حذف المنشأة» (إطار متقطّع بلون قابل للتمرير).
  const HeaderBtn = ({ onClick, color, label, children, fullWidth }) => (
    <button onClick={onClick} title={label}
      style={{ height: 42, padding: '0 18px', borderRadius: 11, background: 'transparent', border: `1px dashed ${color}80`, color, cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap', flexShrink: 0, width: fullWidth ? '100%' : undefined, transition: 'background .15s' }}
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

  return (
    <div style={{ fontFamily: F, paddingTop: 0, paddingBottom: 80, color: 'var(--tx2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <BackButton onBack={onBack} label={T('رجوع','Back')} navKind="worker" navId={w.id} isAr={isAr} />
      </div>
      {/* الترويسة — صورة العامل + الاسم على جهة، وأزرار الإجراءات على الجهة الأخرى، ثم الوصف */}
      <div style={{ marginTop: 6, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', minWidth: 240, display: 'flex', alignItems: 'center', gap: 16 }}>
            <WorkerAvatar w={w} size={72} radius={16} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 21, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{w.name_ar || w.name_en || T('تفاصيل العامل الدائم','Permanent Worker Details')}</div>
                {w.field_sources?.photo_path === 'muqeem' && w.photo_path && <SrcPill src="muqeem" isAr={isAr} />}
              </div>
              {w.name_ar && w.name_en && (
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--tx4)', marginTop: 4, direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}>{w.name_en}</div>
              )}
            </div>
          </div>
          {((canEdit && onEdit) || (canEdit && onTransfer) || (canDelete && onDelete)) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8, flexShrink: 0 }}>
              {/* الصف الأول: نقل العمالة + حذف العامل */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {canEdit && onTransfer && (
                  <HeaderBtn onClick={() => setConfirm('transfer')} color={C.blue} label={T('نقل إلى العمالة المؤقتة', 'Move to Temporary')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m17 3 4 4-4 4"/><path d="M21 7H7"/><path d="m7 13-4 4 4 4"/><path d="M3 17h14"/></svg>
                  </HeaderBtn>
                )}
                {canDelete && onDelete && (
                  <HeaderBtn onClick={() => setConfirm('delete')} color={C.red} label={T('حذف العامل', 'Delete')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </HeaderBtn>
                )}
              </div>
              {/* الصف الثاني: خروج وعودة وخروج نهائي — يمتد بعرض الصف الأول */}
              {canEdit && onEdit && (
                <HeaderBtn onClick={() => onEdit('exit_visa')} color={C.gold} label={T('خروج وعودة وخروج نهائي', 'Exit & Final Exit')} fullWidth>
                  <LogOut size={16} />
                </HeaderBtn>
              )}
            </div>
          )}
        </div>
        {/* الوصف — سطر كامل العرض تحت الترويسة */}
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: 'var(--tx2)', lineHeight: 1.6 }}>
          {T('البيانات الشخصية والوثائق وحالة الإقامة والمنشأة والفرع التابع له.',
             'Personal data, documents, iqama status and the facility & branch he belongs to.')}
        </div>
      </div>

      {/* عمودان: كروت البيانات (يمين) + هيرو الحالة (يسار) — مثل تفاصيل المنشأة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(280px, 340px)', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          {/* بيانات العامل */}
          {cardVisible(user, 'workers', 'personal_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('data') : undefined} allowEdit={canCardBtn(user, 'workers', 'personal_data', 'edit')}>{T('البيانات الشخصية','Personal Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field full k={T('اسم العامل','Worker Name')} v={w.name_ar || w.name_en} src="name_ar" />
              <Field k={T('الجنسية','Nationality')} v={w.nationality_ar} src="nationality_ar" />
              {/* تاريخ الميلاد — العمر كتاق بأيقونة كيكة بجانب التاريخ */}
              <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9.5, color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{T('تاريخ الميلاد','Date of Birth')}</span>
                  {w.birth_date && srcOf('birth_date') && <SrcPill src={srcOf('birth_date')} isAr={isAr} />}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, direction: 'ltr' }}>
                  {w.birth_date && calcAge(w.birth_date) != null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: C.gold, background: 'rgba(176,125,0,.08)', borderRadius: 20, padding: '3px 10px', direction: 'rtl', fontFamily: F, flexShrink: 0 }}>
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
          {/* كرت «البيانات المهنية» أُزيل — حقوله موزّعة على «بيانات الإقامة»
              و«رخصة العمل والعقد»، والتعديل ورفع الملفات انتقلا إليهما. */}
          {/* بيانات الإقامة — الإقامة والحدود والمهنة وحالة مقيم وتواريخها (لكل حقل مصدره).
              يحمل زر التعديل الذي كان في «البيانات المهنية» (يفتح محرّر الوثائق:
              الإقامة/الحدود/المهنة + رفع ملفات مقيم/تأشيرة/رخصة العمل). فوق كرت الجواز. */}
          {cardVisible(user, 'workers', 'residency_data') && (w.iqama_number || w.border_number || w.occupation_ar || w.residency_status_ar || w.iqama_issue_date || w.iqama_expiry_date || w.is_outside_kingdom != null) && (
          <div style={cardChrome}>
            <CardHead action={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <SrcHead src="muqeem" />
                {canCardBtn(user, 'workers', 'professional_data', 'edit') && (
                  <button onClick={pullFromMuqeem} disabled={mqPullBusy || !w.iqama_number}
                    title={T('جلب حالة الإقامة والمهنة وتاريخ الانتهاء وعدد مرات النقل من مقيم', 'Fetch residency status, occupation, expiry and transfer count from Muqeem')}
                    style={{ height: 32, padding: '0 12px', borderRadius: 9, background: 'rgba(245,158,11,.08)', border: '1px dashed rgba(245,158,11,.5)', color: '#b45309', cursor: (mqPullBusy || !w.iqama_number) ? 'default' : 'pointer', opacity: !w.iqama_number ? .45 : 1, fontFamily: F, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'background .15s' }}
                    onMouseEnter={e => { if (!mqPullBusy && w.iqama_number) e.currentTarget.style.background = 'rgba(245,158,11,.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,.08)' }}>
                    <img src="/muqeem-logo.png" alt="" width="15" height="15" style={{ borderRadius: '50%', objectFit: 'contain', background: '#fff', border: '1.5px solid #f59e0b', padding: 1, flexShrink: 0 }} />
                    <span>{mqPullBusy ? T('جاري الجلب…', 'Fetching…') : T('جلب من مقيم', 'Fetch from Muqeem')}</span>
                  </button>
                )}
                {onEdit && <EditBtn onClick={() => onEdit('docs')} allow={canCardBtn(user, 'workers', 'professional_data', 'edit')} />}
              </span>
            }>{T('بيانات الإقامة','Residency Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('رقم الإقامة','Iqama No.')} v={w.iqama_number} mono color={C.gold} src="iqama_number" />
              <Field k={T('رقم الحدود','Border No.')} v={w.border_number} mono color={C.blue} src="border_number" />
              <Field k={T('حالة الإقامة في مقيم','Muqeem Residency Status')} v={w.residency_status_ar}
                color={w.residency_status_ar === 'صالح' ? C.ok : C.red} src="residency_status_ar" />
              <Field k={T('المهنة الرسمية','Official Occupation')} v={w.occupation_ar} src="occupation_ar" />
              {/* تاريخ الإصدار ثم الانتهاء في صف واحد */}
              <Field k={T('تاريخ إصدار الإقامة','Iqama Issue Date')} v={w.iqama_issue_date ? fmtDate(w.iqama_issue_date) : null} mono src="iqama_issue_date" />
              <Field k={T('تاريخ انتهاء الإقامة','Iqama Expiry')} v={w.iqama_expiry_date ? fmtDate(w.iqama_expiry_date) : null} mono color={iqColor} src="iqama_expiry_date" />
              {/* عدد المركبات — من مقيم (detail_raw.vehicles) */}
              {muqeemData?.hasDetail && (
                <Field k={T('عدد المركبات','Vehicles Count')} v={String(muqeemData.vehicles ?? 0)} mono
                  color={muqeemData.vehicles > 0 ? C.gold : undefined} srcName="muqeem" />
              )}
              {w.is_outside_kingdom != null && (
                <Field k={T('التواجد','Presence')}
                  v={w.is_outside_kingdom ? T('خارج المملكة','Outside the Kingdom') : T('داخل المملكة','Inside the Kingdom')}
                  color={w.is_outside_kingdom ? C.orange : C.ok} src="is_outside_kingdom" />
              )}
              {/* عدد مرات النقل + رصيد الجوازات في صف واحد (شبكة فرعية بعرض كامل تضمن بقاءهما جنباً لجنب) */}
              {(w.sponsor_changes != null || (muqeemData?.hasDetail && muqeemData.jawazatBalance != null)) && (
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* عدد مرات النقل — من مقيم (numberOfSponsorChanges)، يُخزَّن على العامل عبر «جلب من مقيم» */}
                  {w.sponsor_changes != null && (
                    <Field k={T('عدد مرات النقل','Sponsor Transfers')} v={String(w.sponsor_changes)} mono
                      color={C.gold} srcName="muqeem" />
                  )}
                  {/* رصيد الجوازات — من مقيم (detail_raw.jawazat_balance) */}
                  {muqeemData?.hasDetail && muqeemData.jawazatBalance != null && (
                    <Field k={T('رصيد الجوازات','Jawazat Balance')} v={num(muqeemData.jawazatBalance)} mono
                      color={C.gold} suffix={T('ريال','SAR')} srcName="muqeem" />
                  )}
                </div>
              )}
              {/* ملف مقيم — المرفوع يدوياً وإلا تقرير مقيم PDF المزامَن تلقائياً */}
              <div style={{ gridColumn: '1 / -1' }}>
                <FileTile label={T('ملف مقيم','Muqeem file')} att={muqeemAtt} />
              </div>
            </div>
          </div>
          )}
          {/* المنشأة والفرع — تحت بيانات الإقامة. أرقام المنشأة + فروع المكتب التابعة لها + فرع العامل. */}
          {cardVisible(user, 'workers', 'facility_branch') && (() => {
            // فروع المكتب التي تنتمي إليها المنشأة (facilities.branch_ids) محلولة لأسمائها.
            const facBranchIds = Array.isArray(f?.branch_ids) ? f.branch_ids : (f?.branch_id ? [f.branch_id] : [])
            const facBranches = facBranchIds.map(id => branches.find(b => b.id === id)).filter(Boolean)
            // فرع مكتب العامل الفعّال (تخصيص يدوي وإلا فرع المنشأة).
            const workerBranchObj = ownBranch || branchById[f?.branch_id] || f?.branch
            return (
            <div style={cardChrome}>
              <CardHead onEdit={openBranchEdit} allowEdit={canCardBtn(user, 'workers', 'facility_branch', 'edit')}>{T('المنشأة والفرع','Facility & Branch')}</CardHead>
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field full k={T('المنشأة','Facility')} v={f?.name_ar || f?.name_en} link={f?.id} />
                {/* أرقام المنشأة الثلاثة في صندوق واحد (ثلاثة أعمدة بفواصل) */}
                <div style={{ gridColumn: '1 / -1', background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
                  {[
                    { k: T('الرقم الموحد','Unified No.'), v: f?.unified_number, c: C.gold },
                    { k: T('رقم الموارد البشرية','HRSD No.'), v: f?.hrsd_number, c: C.blue },
                    { k: T('رقم التأمينات','GOSI No.'), v: f?.gosi_number, c: C.ok },
                  ].map((n, i) => {
                    const empty = n.v == null || n.v === ''
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5, paddingInline: 12, borderInlineStart: i > 0 ? '1px solid var(--bd)' : 'none' }}>
                        <span style={{ fontSize: 9.5, color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{n.k}</span>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, direction: 'ltr' }}>
                          {!empty && <CopyBtn value={n.v} toast={toast} T={T} />}
                          <span style={{ fontSize: 13, color: empty ? 'var(--tx4)' : n.c, fontWeight: 600, lineHeight: 1.4, direction: 'ltr', fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{empty ? '—' : n.v}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
                {/* فروع المكتب قبل الفرع التابع للعامل — كود المكتب فقط، والتلميح يظهر الاسم المستعار والمدينة */}
                <Field k={T('فرع مكتب المنشأة','Facility Office Branch')}
                  v={facBranches.length ? facBranches.map(brCodeOf).join('، ') : null}
                  title={facBranches.length ? facBranches.map(brTipOf).filter(Boolean).join('، ') : null} />
                <Field k={T('فرع مكتب العامل','Worker Office Branch')}
                  v={brCodeOf(workerBranchObj)} color={C.gold} title={brTipOf(workerBranchObj)} />
                <div style={{ gridColumn: '1 / -1', fontSize: 10.5, fontWeight: 600, color: branchIsOverride ? C.gold : 'var(--tx4)', display: 'flex', alignItems: 'center', gap: 6, paddingInlineStart: 2 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: branchIsOverride ? C.gold : 'var(--tx4)', flexShrink: 0 }} />
                  {branchIsOverride
                    ? T('فرع العامل مخصّص يدويًا (مختلف عن فرع المنشأة)', 'Worker branch set manually (differs from facility branch)')
                    : T('فرع العامل يتبع فرع المنشأة تلقائيًا', 'Worker branch follows the facility branch automatically')}
                </div>
              </div>
            </div>
            )
          })()}
          {/* جواز السفر — وثيقة سفر مستقلة عن الإقامة السعودية */}
          {cardVisible(user, 'workers', 'passport_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('passport') : undefined} allowEdit={canCardBtn(user, 'workers', 'passport_data', 'edit')}>{T('بيانات الجواز','Passport Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('رقم الجواز','Passport No.')} v={w.passport_number} mono color={C.purple} src="passport_number" />
              <Field k={T('تاريخ انتهاء الجواز','Passport Expiry')} v={w.passport_expiry ? fmtDate(w.passport_expiry) : null} mono src="passport_expiry" />
            </div>
          </div>
          )}
          {/* رخصة العمل والعقد من قوى — تظهر عند وجود بيانات قوى أو ملفات العمل */}
          {cardVisible(user, 'workers', 'work_contract_data') && (w.work_permit_number || w.work_permit_status || w.work_permit_start || w.work_permit_expiry || w.contract_number || w.contract_type_ar || w.contract_start_date || w.contract_expiry_date || w.employment_status_ar || docFiles.work_visa_file || docFiles.work_permit_file) && (() => {
            const WP_STATUS = {
              VALID: [T('سارية','Valid'), C.ok],
              EXPIRED: [T('منتهية','Expired'), C.red],
              EXPIRING_SOON: [T('قريبة الانتهاء','Expiring soon'), C.gold],
              NO_WORKPERMIT: [T('لا توجد رخصة','No work permit'), C.gray],
            }
            const wpStatusLabel = WP_STATUS[w.work_permit_status]?.[0] ?? w.work_permit_status
            const wpClr = WP_STATUS[w.work_permit_status]?.[1]
            const ctDays = daysUntil(w.contract_expiry_date)
            const ctClr = ctDays == null ? undefined : ctDays <= 0 ? C.red : ctDays <= 30 ? C.gold : C.ok
            return (
              <div style={cardChrome}>
                <CardHead action={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <SrcHead src="qiwa" />
                    {onEdit && <EditBtn onClick={() => onEdit('work_permit')} />}
                  </span>
                }>{T('رخصة العمل والعقد','Work Permit & Contract')}</CardHead>
                <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field k={T('رقم رخصة العمل','Work Permit No.')} v={w.work_permit_number} mono color={C.blue} src="work_permit_number" />
                  <Field k={T('حالة الرخصة','Permit Status')} v={wpStatusLabel} color={wpClr} src="work_permit_status" />
                  <Field k={T('تاريخ إصدار الرخصة','Permit Start')} v={w.work_permit_start ? fmtDate(w.work_permit_start) : null} mono src="work_permit_start" />
                  <Field k={T('تاريخ انتهاء الرخصة','Permit Expiry')} v={w.work_permit_expiry ? fmtDate(w.work_permit_expiry) : null} mono src="work_permit_expiry" />
                  <Field k={T('رقم العقد','Contract No.')} v={w.contract_number} mono src="contract_number" />
                  <Field k={T('نوع العقد','Contract Type')} v={w.contract_type_ar} src="contract_type_ar" />
                  <Field k={T('بداية العقد','Contract Start')} v={w.contract_start_date ? fmtDate(w.contract_start_date) : null} mono src="contract_start_date" />
                  <Field k={T('نهاية العقد','Contract Expiry')} v={w.contract_expiry_date ? fmtDate(w.contract_expiry_date) : null} mono color={ctClr} src="contract_expiry_date" />
                  <Field full k={T('الحالة الوظيفية','Employment Status')} v={w.employment_status_ar} src="employment_status_ar" />
                  {/* ملفات العمل — تأشيرة العمل + رخصة العمل (تُرفع من محرّر الوثائق) */}
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <FileTile label={T('ملف تأشيرة العمل','Work visa file')} att={docFiles.work_visa_file || null} />
                    <FileTile label={T('ملف رخصة العمل','Work permit file')} att={docFiles.work_permit_file || null} />
                  </div>
                </div>
              </div>
            )
          })()}
          {/* الأجر والاشتراك من التأمينات — تظهر فقط عند وجود بيانات */}
          {cardVisible(user, 'workers', 'wage_data') && (w.wage_total != null || w.wage_basic != null || w.joining_date || w.worker_status || w.gosi_registration_no) && (() => {
            // حالة الاشتراك في التأمينات — نشط/غير نشط (المصدر يحمل ACTIVE/INACTIVE فقط)
            const stLabel = w.worker_status === 'active' ? T('نشط','Active')
              : w.worker_status === 'suspended' ? T('غير نشط','Inactive')
              : w.worker_status || null
            const stClr = w.worker_status === 'active' ? C.ok : w.worker_status === 'suspended' ? C.orange : undefined
            return (
            <div style={cardChrome}>
              <CardHead action={
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  <SrcHead src="gosi" />
                  {onEdit && <EditBtn onClick={() => onEdit('wage')} />}
                </span>
              }>{T('الأجر والاشتراك','Wage & Subscription')}</CardHead>
              <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field k={T('الأجر الأساسي','Basic Wage')} v={w.wage_basic != null ? num(w.wage_basic) : null} mono src="wage_basic" suffix={T('ريال','SAR')} />
                <Field k={T('الأجر الإجمالي','Total Wage')} v={w.wage_total != null ? num(w.wage_total) : null} mono color={C.gold} src="wage_total" suffix={T('ريال','SAR')} />
                <Field k={T('تاريخ الالتحاق','Joining Date')} v={w.joining_date ? fmtDate(w.joining_date) : null} mono src="joining_date" />
                <Field k={T('الحالة','Status')} v={stLabel} color={stClr} src="worker_status" />
              </div>
            </div>
            )
          })()}
          {/* التأمين الطبي — يُعرض من مقيم، ويمكن تحديثه بالاستعلام من منصة CHI (كابتشا).
              الأولوية: قيمة استعلام CHI ← المخزّن ← مقيم. */}
          {cardVisible(user, 'workers', 'medical_insurance_data') && (() => {
            const mIns = muqeemData?.insurance || null
            const insCompany = insOverride?.insurance_company ?? w.insurance_company ?? mIns?.companyNameAr ?? null
            const insPolicy = insOverride?.insurance_policy_number ?? w.insurance_policy_number ?? mIns?.policyNumber ?? null
            const insExpiry = insOverride?.insurance_expiry_date ?? w.insurance_expiry_date ?? mIns?.endDate?.gregorian ?? null
            const insStart = mIns?.startDate?.gregorian || null
            // هل القيم المعروضة مصدرها مقيم؟ (لا استعلام CHI ولا قيمة مخزّنة)
            const fromMuqeem = !insOverride?.insurance_company && !w.insurance_company && !!mIns?.companyNameAr
            const insD = daysUntil(insExpiry)
            const insClr = insD == null ? C.gray : insD <= 0 ? C.red : insD <= 30 ? C.gold : C.ok
            return (
              <div style={cardChrome}>
                <CardHead action={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {fromMuqeem && <SrcPill src="muqeem" isAr={isAr} />}
                    {canCardBtn(user, 'workers', 'medical_insurance_data', 'check_insurance') ? (
                      <button onClick={startChiCheck} disabled={!w.iqama_number} title={!w.iqama_number ? T('لا يوجد رقم إقامة', 'No Iqama number') : T('استعلام التأمين من منصة CHI', 'Check insurance via CHI')}
                        style={{ height: 32, padding: '0 14px', borderRadius: 9, background: 'rgba(59,178,122,.1)', border: '1px solid rgba(59,178,122,.5)', color: '#3bb27a', cursor: w.iqama_number ? 'pointer' : 'not-allowed', opacity: w.iqama_number ? 1 : .5, fontFamily: F, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background .15s' }}
                        onMouseEnter={e => { if (w.iqama_number) e.currentTarget.style.background = 'rgba(59,178,122,.18)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,178,122,.1)' }}>
                        {T('استعلام التأمين', 'Check insurance')}
                        <HeartPulse size={13} />
                      </button>
                    ) : null}
                    {onEdit && <EditBtn onClick={() => onEdit('insurance')} />}
                  </span>
                }>{T('بيانات التأمين الطبي','Medical Insurance Data')}</CardHead>
                <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field k={T('تاريخ بداية التأمين','Insurance Start')} v={insStart ? fmtDate(insStart) : null} mono />
                  <Field k={T('تاريخ انتهاء التأمين','Insurance Expiry')} v={insExpiry ? fmtDate(insExpiry) : null} mono color={insClr} />
                  <Field k={T('رقم البوليصة','Policy No.')} v={insPolicy} mono color={C.purple} />
                  <Field k={T('شركة التأمين','Insurance Company')} v={insCompany} full wrap />
                </div>
              </div>
            )
          })()}
          {/* كرت تأشيرات الخروج اليدوي القديم أُزيل — استُبدل بكرتي مقيم أدناه. */}
          {/* تأشيرة الخروج والعودة من مقيم — تظهر فقط إذا كانت سارية (تاريخ العودة لم يمضِ) */}
          {cardVisible(user, 'workers', 'muqeem_exit_return') && muqeemData?.er?.length > 0 && (() => {
            const v = latestVisa(muqeemData.er)
            if (!v) return null
            const retDate = visaReturnDate(v)
            // سارية = تاريخ العودة اليوم أو في المستقبل. بلا تاريخ عودة → لا نعتبرها سارية.
            const today = new Date(); today.setHours(0, 0, 0, 0)
            if (!retDate || retDate < today) return null
            const retDays = Math.ceil((retDate.getTime() - today.getTime()) / 86400000)
            const retClr = retDays <= 30 ? C.gold : C.ok
            const p = (n) => String(n).padStart(2, '0')
            const retStr = `${retDate.getFullYear()}-${p(retDate.getMonth() + 1)}-${p(retDate.getDate())}`
            return (
              <div style={cardChrome}>
                <CardHead action={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <SrcHead src="muqeem" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.ok, background: 'rgba(46,204,113,.1)', borderInlineStart: `3px solid ${C.ok}`, padding: '6px 11px' }}>{T('سارية','Valid')}</span>
                    {onEdit && <EditBtn onClick={() => onEdit('exit_visa')} />}
                  </span>
                }>{T('تأشيرة الخروج والعودة','Exit & Return Visa')}</CardHead>
                <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field k={T('رقم التأشيرة','Visa No.')} v={v.visaNumber} mono color={C.blue} />
                  <Field k={T('نوع التأشيرة','Visa Type')} v={v.visaType?.ar} color={C.gold} />
                  <Field k={T('تاريخ الإصدار','Issue Date')} v={fmtMDate(v.visaIssueDateg)} mono />
                  <Field k={T('العودة قبل','Return Before')} v={retStr} mono color={retClr} suffix={T(`(${retDays} يوم)`, `(${retDays}d)`)} />
                </div>
              </div>
            )
          })()}
          {/* الخروج النهائي من مقيم — بيانات كاملة، تظهر فقط عند وجود تأشيرة خروج نهائي */}
          {cardVisible(user, 'workers', 'muqeem_final_exit') && muqeemData?.fe?.length > 0 && (() => {
            const v = latestVisa(muqeemData.fe)
            if (!v) return null
            const depDays = daysUntil(fmtMDate(v.visaFinalDepartureDateG))
            const depClr = depDays == null ? undefined : depDays <= 0 ? C.red : depDays <= 30 ? C.gold : C.ok
            return (
              <div style={cardChrome}>
                <CardHead action={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <SrcHead src="muqeem" />
                    {onEdit && <EditBtn onClick={() => onEdit('exit_visa')} />}
                  </span>
                }>{T('الخروج النهائي','Final Exit')}</CardHead>
                <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field k={T('رقم التأشيرة','Visa No.')} v={v.visaNumber} mono color={C.red} />
                  <Field k={T('تاريخ الإصدار','Issue Date')} v={fmtMDate(v.visaIssueDateG)} mono />
                  <Field full k={T('تاريخ المغادرة النهائية','Final Departure Date')} v={fmtMDate(v.visaFinalDepartureDateG)} mono color={depClr}
                    suffix={depDays == null ? undefined : depDays >= 0 ? T(`(${depDays} يوم)`, `(${depDays}d)`) : T(`(منذ ${Math.abs(depDays)} يوم)`, `(${Math.abs(depDays)}d ago)`)} />
                </div>
              </div>
            )
          })()}
          {/* كرت «بيانات التواصل الفاتورية» أُزيل — أرقام جوال الفواتير انتقلت إلى «البيانات الفعلية». */}
          {/* البيانات الفعلية — رقم الجوال الرسمي + المهنة الفعلية + مدينة المقر + أرقام جوال الفواتير */}
          {cardVisible(user, 'workers', 'actual_data') && (
          <div style={cardChrome}>
            <CardHead onEdit={onEdit ? () => onEdit('actual') : undefined} allowEdit={canCardBtn(user, 'workers', 'actual_data', 'edit')}>{T('البيانات الفعلية','Actual Data')}</CardHead>
            <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field k={T('رقم جوال ابشر','Absher Mobile')} v={fmtMobile(w.official_mobile) || null} mono color={C.ok} />
              <Field k={T('مدينة المقر','HQ City')} v={w.hq_city_ar} />
              <Field full k={T('المهنة الفعلية','Actual Occupation')} v={w.official_occupation_ar} />
              {/* أرقام جوال الفواتير — مصفوفة قابلة للنسخ */}
              <div style={{ gridColumn: '1 / -1', background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 9.5, color: 'var(--tx3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{T('أرقام جوال الفواتير','Billing Mobiles')}</span>
                {billingList.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {billingList.map((p, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderInlineStart: `3px solid ${C.gold}`, background: 'rgba(176,125,0,.1)' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.gold, direction: 'ltr', fontFamily: 'ui-monospace, monospace', letterSpacing: '.3px' }}>{fmtMobile(p)}</span>
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
          {/* كرت الفواتير والخدمات — إجماليات + قائمة (نقرة على الفاتورة → تفاصيل الفاتورة). نفس صفحة المنشأة. */}
          {cardVisible(user, 'workers', 'invoices_services') && (
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
                  <div key={i} style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--tx4)', fontWeight: 500 }}>{s.l}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: s.c, direction: 'ltr', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(Math.round(s.v))}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {facRows === null ? (
                  <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '8px 0' }}>{T('جارٍ التحميل…', 'Loading…')}</div>
                ) : facListRows.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: '8px 0' }}>{T('لا توجد فواتير أو خدمات مرتبطة', 'No invoices or services linked')}</div>
                ) : facListRows.map((r, i) => (
                  <InvoiceReceiptCard key={i} r={r} workerName={w.name_ar || w.name_en} onOpen={goInvoice} T={T} />
                ))}
              </div>
            </div>
          </div>
          )}

          {/* عميل ووسيط الفاتورة — لكل فاتورة (نقل كفالة / تأشيرة بإقامة …) العميل
              الأصلي للفاتورة والوسيط. الفاتورة قد تكون على عميل مختلف عن العامل. */}
          {cardVisible(user, 'workers', 'invoice_parties') && invParties.length > 0 && (
          <div style={cardChrome}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold }} />
              <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '.2px', color: C.gold }}>{T('عميل ووسيط الفاتورة', 'Invoice Client & Agent')}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 11.5, fontWeight: 600, color: 'var(--tx4)' }}>{`${num(invParties.length)} ${T('فاتورة', 'invoices')}`}</span>
            </div>
            <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {invParties.map((p) => {
                const Party = ({ label, party, color }) => (
                  <div style={{ flex: 1, minWidth: 0, background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--tx4)', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: party ? color : 'var(--tx4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{party ? (party.name_ar || party.name_en || '—') : '—'}</span>
                    {party?.phone && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, direction: 'ltr', justifyContent: 'flex-end' }}>
                        <CopyBtn value={fmtMobile(party.phone) || party.phone} toast={toast} T={T} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx3)', direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>{fmtMobile(party.phone) || party.phone}</span>
                      </span>
                    )}
                  </div>
                )
                return (
                  <div key={p.key} style={{ border: '1px solid var(--bd)', borderRadius: 12, padding: 10, background: 'var(--card-grad2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx1)' }}>{p.service_ar || T('خدمة', 'Service')}</span>
                      {p.invoice_no && <span style={{ fontSize: 10.5, fontWeight: 600, color: C.gold, direction: 'ltr', fontFamily: 'ui-monospace, monospace' }}>#{p.invoice_no}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Party label={T('العميل', 'Client')} party={p.client} color={C.blue} />
                      <Party label={T('الوسيط', 'Agent')} party={p.agent} color={C.purple} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )}

          {/* سجل التعديلات — يظهر فقط عند وجود تعديلات (نفس صفحة المنشأة). */}
          {cardVisible(user, 'workers', 'activity_log') && (
          <WorkerEditLog entries={[...(Array.isArray(w.edit_log) ? w.edit_log : []), ...logExtra]} created={w.created_at ? { at: w.created_at, by_name: creatorName, label: wName } : null} fileUrls={attUrls} T={T} />
          )}

          {/* التجديد — بوكماركت مقيم لتجديد إقامة العامل (آخر كرت). محاط بحاجز
              أخطاء حتى لا يبيّض رد غير متوقع من مقيم صفحة العامل. */}
          {cardVisible(user, 'workers', 'residency_data') && (
          <CardBoundary fallback={
            <div style={{ ...cardChrome, padding: 16, fontSize: 12.5, fontWeight: 600, color: 'var(--tx4)', textAlign: 'center' }}>
              {T('تعذّر عرض كرت التجديد', 'Could not render the renewal card')}
            </div>
          }>
            <RenewalCard w={w} f={f} sb={sb} T={T} isAr={isAr} toast={toast} />
          </CardBoundary>
          )}
        </div>

        {/* هيرو الحالة — حالة الإقامة (تصميم «حالة كبيرة») + تاق تأشيرة الخروج أسفله */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cardVisible(user, 'workers', 'iqama_status') && (
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
          )}
          {/* تاق تأشيرة الخروج — من مقيم: الخروج النهائي له الأولوية، ثم خروج وعودة سارية */}
          {cardVisible(user, 'workers', 'exit_visa_status') && (() => {
            // خروج نهائي من مقيم (له الأولوية) → تاريخ المغادرة النهائية.
            const feV = latestVisa(muqeemData?.fe)
            // خروج وعودة من مقيم — سارية فقط (تاريخ العودة اليوم أو مستقبلاً).
            const erV = latestVisa(muqeemData?.er)
            const today = new Date(); today.setHours(0, 0, 0, 0)
            const erRet = erV ? visaReturnDate(erV) : null
            const erValid = erRet && erRet >= today
            const p = (n) => String(n).padStart(2, '0')
            let isFinal = false, label = null, dateStr = null, days = null
            if (feV) {
              isFinal = true
              label = T('خروج نهائي', 'Final Exit')
              dateStr = fmtMDate(feV.visaFinalDepartureDateG)
              days = daysUntil(dateStr)
            } else if (erValid) {
              label = T('خروج وعودة', 'Exit & Re-entry')
              dateStr = `${erRet.getFullYear()}-${p(erRet.getMonth() + 1)}-${p(erRet.getDate())}`
              days = Math.ceil((erRet.getTime() - today.getTime()) / 86400000)
            }
            if (!label) return null
            // إنذار: ٥ أيام أو أقل (أو انتهت) → التاق كامله أحمر أغمق.
            const urgent = days != null && days <= 5
            const c1 = urgent ? '#c0392b' : isFinal ? C.red : C.blue   // اللون الأساسي: إنذار أغمق، خروج نهائي أحمر، خروج وعودة أزرق
            const cdColor = c1                          // العدّاد بنفس لون النوع (موحّد)
            const cdTxt = days == null ? null
              : days < 0 ? `${T('منذ','since')} ${Math.abs(days)} ${T('يوم','days')}`
              : days === 0 ? T('ينتهي اليوم','expires today')
              : `${T('متبقٍ','left')} ${days} ${T('يوم','days')}`
            // تصميم «مُحدّد بأيقونة» (Outline) — توزيع «العدّاد جانبي»: النوع+التاريخ مكدّسان والعدّاد على الجانب (وزن الخط ≤ 600)
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 11, background: isFinal ? 'rgba(231,76,60,.08)' : 'transparent', border: `1.5px solid ${isFinal ? c1 : c1 + '70'}`, borderRadius: 14, padding: '9px 13px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <LogOut size={15} style={{ color: c1, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, direction: 'rtl' }}>
                      <span style={{ color: c1 }}>{label}</span>
                    </span>
                    <SrcHead src="muqeem" />
                  </div>
                  {dateStr && (
                    <span style={{ alignSelf: 'center', fontSize: 12.5, fontWeight: 600, color: 'var(--tx1)', direction: 'ltr', fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-monospace, monospace', letterSpacing: '.3px' }}>{dateStr}</span>
                  )}
                </div>
                {cdTxt && (
                  <span style={{ background: `${cdColor}1a`, color: cdColor, borderInlineStart: `3px solid ${cdColor}`, padding: '8px 11px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', direction: 'rtl', flexShrink: 0 }}>{cdTxt}</span>
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
            {T(`سيتم حذف العامل «${wName}» وإخفاؤه من قائمة العمال. لن يظهر بعد الحذف في الواجهة.`,
               `The worker “${wName}” will be deleted and hidden from the workers list.`)}
          </div>
        </FKModal>
      )}

      {/* تأكيد نقل العامل إلى العمالة المؤقتة — نسخ إلى temproryworkers + حذف ناعم هنا. */}
      {confirm === 'transfer' && (
        <FKModal open variant="delete" width={460} accent={C.blue} Icon={Users}
          onClose={closeConfirm}
          title={T('نقل إلى العمالة المؤقتة', 'Move to temporary workforce')}
          success={done ? <SuccessView title={done.title} /> : undefined}
          footer={
            <ActionButton Icon={Users} color={C.blue} disabled={busy} onClick={doTransfer}>
              {busy ? T('جارٍ النقل…', 'Moving…') : T('تأكيد النقل', 'Confirm move')}
            </ActionButton>
          }>
          <div style={{ fontSize: 14, color: 'var(--tx2)', lineHeight: 1.8, padding: '2px 2px 6px' }}>
            {T(`سيتم نقل العامل «${wName}» إلى قائمة العمالة المؤقتة وإزالته من قائمة العمالة الدائمة.`,
               `The worker “${wName}” will be moved to the temporary workforce and removed from the permanent list.`)}
          </div>
        </FKModal>
      )}

      {/* تعديل فرع العامل — «تلقائي (حسب المنشأة)» يمسح التخصيص فيعود العامل لفرع منشأته. */}
      {brEdit && (() => {
        const AUTO = '__auto__'
        const brOptions = [{ id: AUTO, _auto: true }, ...branches.filter(b => b.is_active !== false)]
        return (
          <FKModal open width={480} Icon={MapPin} accent={C.gold}
            onClose={() => { if (!brBusy) { setBrEdit(false); setBrErr(null); setBrDone(false) } }}
            title={T('تعديل الفرع التابع', 'Edit branch')}
            errorMsg={brErr}
            success={brDone ? <SuccessView title={T('تم حفظ الفرع', 'Branch saved')} /> : undefined}
            footer={
              <ActionButton Icon={Check} color={C.gold} disabled={brBusy} onClick={saveBranch}>
                {brBusy ? T('جارٍ الحفظ…', 'Saving…') : T('حفظ', 'Save')}
              </ActionButton>
            }>
            <ModalSection Icon={MapPin} label={T('الفرع التابع', 'Branch')}>
              <div style={GRID}>
                <Select full label={T('الفرع', 'Branch')} placeholder={T('اختر الفرع…', 'Select branch…')}
                  options={brOptions} getKey={o => o.id}
                  getLabel={o => o._auto ? T(`تلقائي — حسب المنشأة${facBranchLabel ? ` (${facBranchLabel})` : ''}`, `Automatic — follow facility${facBranchLabel ? ` (${facBranchLabel})` : ''}`) : brLabelOf(o)}
                  getSub={o => o._auto ? '' : (o.name_ar || '')}
                  value={brSel || AUTO}
                  onChange={(id) => setBrSel(id === AUTO ? null : id)} />
                <div style={{ gridColumn: '1 / -1', fontSize: 11.5, color: 'var(--tx3)', lineHeight: 1.7, paddingInlineStart: 2 }}>
                  {T('يتبع العامل فرع منشأته تلقائيًا. اختر فرعًا محددًا فقط إذا كان العامل تابعًا لفرع مختلف عن فرع المنشأة.',
                     'The worker follows the facility branch automatically. Pick a specific branch only if the worker belongs to a different branch than the facility.')}
                </div>
              </div>
            </ModalSection>
          </FKModal>
        )
      })()}

      {/* ═══ نافذة استعلام التأمين الطبي (CHI) — كابتشا، مثل تسعيرة تجديد الإقامة ═══ */}
      {chi.phase !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlayBg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: 16, fontFamily: F }} dir={isAr ? 'rtl' : 'ltr'}>
          <style>{`@keyframes rnw-spin{to{transform:rotate(360deg)}}`}</style>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', background: 'var(--modal-bg)', borderRadius: 16, border: '1px solid rgba(11,109,61,.4)', padding: 22, boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
            <button onClick={closeChi} style={{ position: 'absolute', top: 12, [isAr ? 'left' : 'right']: 12, width: 30, height: 30, borderRadius: 8, background: 'var(--hoverBg)', border: '1px solid var(--bd)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            <div style={{ textAlign: isAr ? 'right' : 'left', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--bd)', [isAr ? 'paddingLeft' : 'paddingRight']: 36 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
                <HeartPulse size={22} style={{ color: '#3bb27a' }} />
                <span>{T('التأمين الطبي (CHI)', 'Medical Insurance (CHI)')}</span>
              </div>
            </div>

            {chi.phase === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(11,109,61,.18)', borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'rnw-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'var(--tx3)' }}>{T('جاري الاتصال بمنصة التأمين…', 'Connecting to insurance platform…')}</div>
              </div>
            )}

            {chi.phase === 'captcha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: isAr ? 'right' : 'left' }}>{T('أدخل رمز التحقق الظاهر بالصورة', 'Enter the captcha shown in the image')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 8px' }}>
                  {chi.captchaImage
                    ? <ChiCountdown captchaKey={chi.captchaImage} onExpire={refreshChiCaptcha} color="#3bb27a" />
                    : <div style={{ width: 38, height: 38, flexShrink: 0 }} aria-hidden="true" />}
                  {chi.captchaImage
                    ? <img src={chi.captchaImage} alt="captcha" style={{ height: 72, borderRadius: 12, background: '#fff', padding: 4 }} />
                    : <span style={{ fontSize: 14, color: 'var(--tx4)' }}>{T('...جاري التحميل', 'Loading...')}</span>}
                  <button type="button" onClick={refreshChiCaptcha} title={T('رمز تحقق جديد', 'New captcha')} style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', border: 'none', background: 'rgba(11,109,61,.12)', color: '#3bb27a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RefreshCw size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <input value={chi.captchaInput} onChange={e => setChi(c => ({ ...c, captchaInput: e.target.value.replace(/\s/g, '').slice(0, 8) }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitChiCaptcha() }} placeholder="______" autoFocus maxLength={8}
                  style={{ height: 48, width: 240, alignSelf: 'center', padding: '0 18px', border: '1px solid var(--bd)', borderRadius: 12, fontFamily: F, fontSize: 20, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'var(--inputBg)', textAlign: 'center', letterSpacing: '8px', direction: 'ltr' }} />
                {chi.error && <div style={{ fontSize: 12, color: C.red, textAlign: 'center', marginTop: -10, marginBottom: -4 }}>{chi.error}</div>}
                <button onClick={submitChiCaptcha} disabled={!chi.captchaInput || chi.captchaInput.length < 3} style={{ height: 48, width: 240, alignSelf: 'center', borderRadius: 12, border: '1px solid rgba(59,178,122,.55)', background: 'linear-gradient(180deg,#4ac888 0%,#2d9963 100%)', color: '#fff', fontFamily: F, fontSize: 16, fontWeight: 600, cursor: (!chi.captchaInput || chi.captchaInput.length < 3) ? 'not-allowed' : 'pointer', opacity: (!chi.captchaInput || chi.captchaInput.length < 3) ? 0.45 : 1 }}>{T('استعلام', 'Check')}</button>
              </div>
            )}

            {chi.phase === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(11,109,61,.18)', borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'rnw-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'var(--tx3)' }}>{T('جاري الاستعلام…', 'Checking…')}</div>
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
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: 'var(--inputBg)', border: '1px solid var(--bd)' }}>
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--tx3)', fontWeight: 600 }}>{k}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: v ? 'var(--tx)' : 'var(--tx4)', direction: 'ltr' }}>{v || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(176,125,0,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold }}><AlertCircle size={28} /></div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.gold, textAlign: 'center' }}>{T('لا يوجد تأمين ساري للعامل', 'No active insurance found')}</div>
                  </div>
                )}
                <button onClick={closeChi} style={{ height: 44, borderRadius: 11, border: '1px solid rgba(59,178,122,.4)', background: 'rgba(59,178,122,.12)', color: '#3bb27a', fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{T('تم', 'Done')}</button>
              </div>
            )}

            {chi.phase === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0' }}>
                  <div style={{ width: 58, height: 58, borderRadius: '50%', background: 'rgba(192,57,43,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.red }}><AlertCircle size={28} /></div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.red, textAlign: 'center' }}>{T('تعذّر الاستعلام', 'Check failed')}</div>
                  <div style={{ fontSize: 13, color: 'var(--tx3)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>{chi.error}</div>
                </div>
                <button onClick={startChiCheck} style={{ height: 40, borderRadius: 10, border: '1px solid rgba(11,109,61,.4)', background: 'rgba(11,109,61,.12)', color: '#3bb27a', fontFamily: F, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>{T('إعادة المحاولة', 'Retry')}</button>
                <button onClick={closeChi} style={{ height: 38, borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--tx3)', fontFamily: F, fontSize: 14, cursor: 'pointer' }}>{T('إغلاق', 'Close')}</button>
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
    <div style={{ background: 'var(--inputBg)', border: '1px solid var(--bd)', borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--tx4)', fontWeight: 600, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12.5, color: value ? 'var(--tx)' : 'var(--tx5)', fontWeight: 600, direction: 'ltr', fontFamily: 'ui-monospace, monospace', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {value || '—'}
        {value && <CopyBtn value={value} toast={toast} T={T} />}
      </div>
    </div>
  )
}
