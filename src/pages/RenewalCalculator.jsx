import React, { useState, useMemo, useEffect, useRef } from 'react'
import { RefreshCw, User, Search, Calendar, Briefcase, Building2, Calculator, Plus, X, Check, Send, ChevronLeft, ChevronRight, AlertCircle, ArrowLeftRight, ShieldAlert, BadgeCheck, IdCard, Copy, Hash, CheckCircle2, Circle, Phone, Globe, HeartPulse, Wallet } from 'lucide-react'
import { Modal as FKModal, C, F, ActionButton, Select } from '../components/ui/FormKit.jsx'
import { getIqamaRenewalPricingConfig } from '../lib/kafalaPricing.js'
import { noDash } from '../lib/utils.js'
import { computeRenewalDerived } from '../lib/renewalDerived.js'
import { stageVisible, fieldVisible, fieldEditable } from '../lib/permissions.js'

// حدود الرسوم الحكومية المشمولة في «رسوم المكتب» — ما يتجاوزها يُضاف. (تُنقل للإعدادات لاحقًا)
const COVER = { iqama: 650, workPermit: 100, medical: 1000 }
// حقول العامل المستخدمة في البحث والعيّنة العشوائية — مصدر موحّد
const WORKER_SEL = 'id,name_ar,name_en,iqama_number,phone,birth_date,iqama_expiry_date,work_permit_expiry,nationality_id,gender,current_occupation_id,occupation_ar,current_facility_id,facility:current_facility_id(id,name_ar,name_en,unified_number,hrsd_number,gosi_number)'
// عيّنة عشوائية محضّرة مسبقًا (double-buffer) — تُعرض فورًا عند الفتح، ويُحضَّر زوج جديد للفتحة التالية
let PREVIEW_CACHE = []
let WORKER_COUNT = null
async function rollWorkerPreview(sb) {
  if (!sb) return []
  if (WORKER_COUNT == null) {
    const { count } = await sb.from('workers').select('id', { count: 'exact', head: true }).is('deleted_at', null)
    WORKER_COUNT = count || 0
  }
  const total = WORKER_COUNT
  if (!total) return []
  const take = Math.min(6, total)
  const off = Math.floor(Math.random() * Math.max(1, total - take + 1))
  const { data } = await sb.from('workers').select(WORKER_SEL).is('deleted_at', null).order('id').range(off, off + take - 1)
  const rows = data || []
  for (let i = rows.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[rows[i], rows[j]] = [rows[j], rows[i]] }
  return rows.slice(0, 3)
}
// زر نسخ صغير لخلايا بيانات المنشأة (نفس نمط صفحة طلب الخدمة)
const CopyBtn = ({ value, size = 13, lang }) => {
  const [done, setDone] = useState(false)
  if (!value) return null
  const tt = (lang || 'ar') !== 'en' ? (done ? 'تم النسخ' : 'نسخ') : (done ? 'Copied' : 'Copy')
  return <button type="button" title={tt} onClick={e => { e.stopPropagation(); try { navigator.clipboard?.writeText(String(value)) } catch (_) {} setDone(true); setTimeout(() => setDone(false), 1300) }} style={{ padding: 3, background: 'transparent', border: 'none', cursor: 'pointer', color: done ? C.ok : 'var(--tx5)', display: 'flex', alignItems: 'center', borderRadius: 4, transition: '.15s', flexShrink: 0 }} onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }} onMouseLeave={e => { e.currentTarget.style.color = done ? C.ok : 'var(--tx5)' }}>{done ? <Check size={size + 2} strokeWidth={2.4} /> : <Copy size={size} />}</button>
}
// ═══ استعلام التأمين الطبي (CHI) — كابتشا مثل وزارة العمل ═══
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
const nm = v => Number(v || 0).toLocaleString('en-US')
const fmt = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })
// يُرجع 9 أرقام للجوال السعودي بعد إزالة +966 و الصفر البادئ
const normalizePhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('966')) d = d.slice(3); return d.replace(/^0+/, '').slice(0, 9) }

// ═══ تحويل هجري مبسّط (للعرض فقط في تبويب التفاصيل) ═══
function gregorianToHijri(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr); if (isNaN(d)) return ''
  const JD = Math.floor(d.getTime() / 86400000) + 2440588
  const l = JD - 1948440 + 10632
  const n = Math.floor((l - 1) / 10631)
  const l2 = l - 10631 * n + 354
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238)
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29
  const month = Math.floor((24 * l3) / 709)
  const day = l3 - Math.floor((709 * month) / 24)
  const year = 30 * n + j - 30
  if (month < 1 || month > 12) return ''
  return `${year}-${month}-${day}`
}

// ═══ ذرّات التصميم — مطابقة لنافذة تسعيرة التنازل ═══
const sF = { width: '100%', height: 42, padding: '0 14px', border: '1px solid transparent', borderRadius: 9, fontFamily: F, fontSize: 14, fontWeight: 600, color: 'var(--tx)', outline: 'none', background: 'var(--inputBg)', boxSizing: 'border-box', textAlign: 'center', transition: '.2s', boxShadow: 'none' }
const Lbl = ({ children, req }) => <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 9, textAlign: 'start' }}>{children}{req && <span style={{ color: C.red }}> *</span>}</div>

// خلية معلومة صغيرة (أيقونة + تسمية + قيمة) — نفس نمط كروت البحث في الفاتورة
const infoBox = (Icon, label, value, valColor) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'var(--inputBg)', border: '1px solid var(--bd)', minWidth: 0 }}>
    <Icon size={13} color={valColor || C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <span style={{ fontSize: 9, color: 'var(--tx5)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: valColor || 'var(--tx)', fontWeight: 600, direction: 'ltr', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    </div>
  </div>
)

// كرت بحدّ ذهبي وشارة عنوان عائمة — العنصر المميّز لنافذة التنازل
const KCard = ({ Icon, label, hint, children, span, style, bodyStyle }) => (
  <div style={{ gridColumn: span ? `span ${span}` : 'auto', borderRadius: 12, border: `1.5px solid ${C.gold}59`, padding: '18px 14px 12px', position: 'relative', transition: '.2s', ...style }}>
    <div style={{ position: 'absolute', top: -9, insetInlineStart: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {Icon && <Icon size={12} strokeWidth={2.2} />}
      <span>{label}</span>
      {hint && <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--tx4)', marginInlineStart: 4 }}>· {hint}</span>}
    </div>
    <div style={bodyStyle}>{children}</div>
  </div>
)

// مجموعة خيارات مقسّمة — مطابقة لمكوّن Segmented في معرض الفورمات (أيقونة دائرة + تحديد مسطّح)
const ToggleGroup = ({ options, value, onChange, height = 42 }) => (
  <div style={{ display: 'flex', gap: 6, height }}>
    {options.map(o => {
      const sel = value === o.v; const clr = o.c || C.gold
      return (
        <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} style={{ flex: 1, borderRadius: 9, border: `1px solid ${sel ? clr + '80' : 'var(--bd)'}`, background: sel ? clr + '14' : C.inputBg, color: sel ? clr : C.tx3, fontFamily: F, fontSize: 14, fontWeight: sel ? 600 : 500, cursor: 'pointer', transition: '.18s', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: sel ? 'none' : 'none' }}>
          {sel ? <CheckCircle2 size={16} strokeWidth={2} style={{ flexShrink: 0 }} /> : <Circle size={16} strokeWidth={2} style={{ flexShrink: 0, opacity: .5 }} />}
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span>{o.l}</span>
            {o.sub && <span style={{ fontSize: 10, opacity: .6 }}>{o.sub}</span>}
          </span>
        </button>
      )
    })}
  </div>
)
const YesNo = ({ value, onChange, lang, height }) => (
  <ToggleGroup value={value} onChange={onChange} height={height} options={[{ v: true, l: lang === 'en' ? 'Yes' : 'نعم', c: C.ok }, { v: false, l: lang === 'en' ? 'No' : 'لا', c: C.blue }]} />
)

/*
 * RenewalCalculator — حاسبة تسعيرة تجديد الإقامة (نافذة مستقلة بتصميم نافذة التنازل).
 * بيانات العامل من قاعدة البيانات مباشرة (بلا مقيم) ولا يوجد نقل.
 * خصوصية التجديد: رسوم المكتب تشمل الرسوم الحكومية ضمن الحدود، ويُضاف ما زاد عنها فقط.
 * تُحفظ في جدول iqama_renewal_calculation وتُستهلك لاحقًا في فاتورة تجديد الإقامة برقمها.
 */
export default function RenewalCalculator({ sb, user, toast, lang, onClose, onGoToRenewalCalc }) {
  const T = (a, e) => (lang || 'ar') !== 'en' ? a : e
  const isAr = (lang || 'ar') !== 'en'
  const dir = isAr ? 'rtl' : 'ltr'
  const [tab, setTab] = useState(0)
  const [tried, setTried] = useState(false)
  const [worker, setWorker] = useState(null)
  const [phone, setPhone] = useState('')
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [workerPreview, setWorkerPreview] = useState(PREVIEW_CACHE)
  const [nationalities, setNationalities] = useState([])
  const [occupations, setOccupations] = useState([])
  const [f, setF] = useState({ exemption: true, renewalMonths: '12', changeProfession: false, newOccupation: '', newOccupationId: null, repeatViolation: false, medInsured: false, medInsuranceEnd: '', medInsuranceCompany: '', medInsurancePolicy: '', officeFee: '', extras: [], absher_on: false, absher: '' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  // ── بوابات الصلاحيات (per-user) — حسبة تجديد الإقامة ──
  const stShow = (k) => stageVisible(user, 'renewal_calc', k)
  const fShow = (k) => fieldVisible(user, 'renewal_calc', k)
  const fEdit = (k) => fieldEditable(user, 'renewal_calc', k)
  const [submitting, setSubmitting] = useState(false)
  const [issuedQuote, setIssuedQuote] = useState(null)
  // استعلام التأمين الطبي (CHI) — phase: idle | loading | captcha | verifying | error
  const [chi, setChi] = useState({ phase: 'idle', session: null, captchaImage: null, captchaInput: '', result: null, error: null, attempts: 0 })
  // منع التكرار: حسبة تجديد مصدّقة/مفوترة سارية لنفس العامل تمنع إصدار حسبة جديدة حتى تُلغى
  const [dupQuote, setDupQuote] = useState(null)
  useEffect(() => {
    let alive = true
    if (!sb || !worker?.iqama_number) { setDupQuote(null); return }
    ;(async () => {
      const { data } = await sb.from('iqama_renewal_calculation')
        .select('id,quote_no,status,priced_at,branch_id')
        .eq('iqama_number', worker.iqama_number)
        .in('status', ['approved', 'invoiced', 'completed'])
        .is('deleted_at', null)
        .order('priced_at', { ascending: false }).limit(1).maybeSingle()
      // كود المكتب باستعلام منفصل — لا يوجد FK يسمح بالتضمين المباشر
      let dq = data || null
      if (dq?.branch_id) {
        const { data: br } = await sb.from('branches').select('branch_code').eq('id', dq.branch_id).maybeSingle()
        dq = { ...dq, branch_code: br?.branch_code || null }
      }
      if (alive) setDupQuote(dq)
    })()
    return () => { alive = false }
  }, [sb, worker?.iqama_number])

  const cfg = useMemo(() => getIqamaRenewalPricingConfig(), [])
  useEffect(() => { if (!sb) return; sb.from('nationalities').select('id,name_ar,name_en,code,flag_url').then(({ data }) => setNationalities(data || [])) }, [sb])
  // قائمة المهن (نفس مصدر تسعيرة التنازل) — لقائمة المهنة الجديدة عند تغيير المهنة
  useEffect(() => {
    if (!sb) return
    ;(async () => {
      const { data: arch } = await sb.from('lookup_items').select('id,lookup_categories!inner(category_key)').eq('code', 'archived').eq('lookup_categories.category_key', 'occupation_category').maybeSingle()
      let q2 = sb.from('occupations').select('id,name_ar,name_en,code').eq('is_active', true).order('sort_order', { nullsFirst: false }).order('name_ar').limit(5000)
      if (arch?.id) q2 = q2.neq('category_id', arch.id)
      const { data } = await q2
      if (data) setOccupations(data)
    })()
  }, [sb])

  // ── بحث العامل — مباشر أثناء الكتابة (بلا زر) ──
  useEffect(() => {
    const term = q.trim()
    if (worker || !term || !sb) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const { data } = await sb.from('workers')
          .select(WORKER_SEL)
          .or(`iqama_number.ilike.%${term}%,name_ar.ilike.%${term}%,name_en.ilike.%${term}%`)
          .is('deleted_at', null).limit(20)
        setResults(data || [])
      } catch { setResults([]) }
      setSearching(false)
    }, 280)
    return () => clearTimeout(t)
  }, [q, sb, worker])

  // ── عيّنة عشوائية تُعرض قبل البحث — جاهزة فورًا من الكاش، ثم يُحضَّر زوج جديد للفتحة التالية ──
  useEffect(() => {
    if (!sb) return
    let cancelled = false
    ;(async () => {
      const rows = await rollWorkerPreview(sb)
      if (cancelled || !rows.length) return
      if (!PREVIEW_CACHE.length) setWorkerPreview(rows)  // أول فتحة فقط — لا يوجد كاش جاهز لعرضه
      PREVIEW_CACHE = rows  // حضّر للفتحة التالية دون تبديل المعروض حاليًا
    })()
    return () => { cancelled = true }
  }, [sb])
  const pickWorker = w => { setWorker(w); setResults([]); setQ(''); setPhone(normalizePhone(w.phone)) }
  const natOf = w => { if (!w) return null; return nationalities.find(n => n.id === w.nationality_id) || null }
  const occOf = w => { if (!w?.current_occupation_id) return null; return occupations.find(o => o.id === w.current_occupation_id) || null }

  // ═══ استعلام التأمين الطبي من CHI (كابتشا مثل وزارة العمل) ═══
  async function callChiFn(body, timeoutMs = 25000) {
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(CHI_FN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
      const text = await res.text(); let data
      try { data = JSON.parse(text) } catch { throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`) }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return data
    } finally { clearTimeout(timer) }
  }
  async function startChiCheck() {
    if (!worker?.iqama_number) return
    setChi(c => ({ ...c, phase: 'loading', error: null, captchaInput: '' }))
    try {
      const r = await callChiFn({ action: 'init' })
      setChi(c => ({ ...c, phase: 'captcha', session: r.session, captchaImage: r.captchaImage, captchaInput: '' }))
    } catch (e) {
      setChi(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? T('انتهت مهلة الاتصال بمنصة التأمين', 'CHI connection timed out') : (e.message || T('خطأ في الاتصال', 'Connection error')) }))
    }
  }
  async function submitChiCaptcha() {
    if (!chi.captchaInput || chi.captchaInput.length < 3) return
    setChi(c => ({ ...c, phase: 'verifying', error: null }))
    try {
      const r = await callChiFn({ action: 'verify', iqama: worker.iqama_number, captcha: chi.captchaInput, session: chi.session })
      if (r.status === 'invalid_captcha') {
        const next = (chi.attempts || 0) + 1
        if (next >= CHI_MAX_ATTEMPTS) { setChi({ phase: 'idle', session: null, captchaImage: null, captchaInput: '', result: { status: 'failed' }, error: null, attempts: 0 }); return }
        const fresh = await callChiFn({ action: 'init' })
        setChi(c => ({ ...c, phase: 'captcha', session: fresh.session, captchaImage: fresh.captchaImage, captchaInput: '', error: T(`رمز التحقق غير صحيح — المحاولة ${next + 1} من ${CHI_MAX_ATTEMPTS}`, `Wrong code — attempt ${next + 1}/${CHI_MAX_ATTEMPTS}`), attempts: next }))
        return
      }
      if (r.code === 'SESSION_EXPIRED' || /expired/i.test(r.error || '')) {
        const fresh = await callChiFn({ action: 'init' })
        setChi(c => ({ ...c, phase: 'captcha', session: fresh.session, captchaImage: fresh.captchaImage, captchaInput: '', error: T('انتهت الجلسة — تم تحديث الرمز', 'Session expired — code refreshed') }))
        return
      }
      // تطبيق النتيجة على نموذج التأمين + حفظها على العامل للمرجعية لاحقاً
      if (r.status === 'insured') {
        const end = chiNormDate(r.expiryDate)
        const company = r.company || ''
        const policy = r.policyNumber || ''
        setF(p => ({ ...p, medInsured: true, medInsuranceEnd: end, medInsuranceCompany: company, medInsurancePolicy: policy }))
        try {
          await sb?.from('workers').update({
            insurance_expiry_date: end || null,
            insurance_company: company || null,
            insurance_policy_number: policy || null,
            insurance_checked_at: new Date().toISOString(),
          }).eq('id', worker.id)
          setWorker(w => w ? { ...w, insurance_expiry_date: end || null, insurance_company: company || null, insurance_policy_number: policy || null } : w)
        } catch (_) { /* حفظ على العامل best-effort */ }
      } else if (r.status === 'not_insured' || r.status === 'invalid_id') {
        setF(p => ({ ...p, medInsured: false, medInsuranceEnd: '', medInsuranceCompany: '', medInsurancePolicy: '' }))
      }
      setChi(c => ({ ...c, phase: 'idle', result: r }))
    } catch (e) {
      setChi(c => ({ ...c, phase: 'error', error: e.name === 'AbortError' ? T('انتهت مهلة التحقق', 'Verification timed out') : (e.message || T('خطأ في التحقق', 'Verification error')) }))
    }
  }
  async function refreshChiCaptcha() {
    setChi(c => ({ ...c, captchaImage: null, captchaInput: '', error: null }))
    try { const r = await callChiFn({ action: 'init' }); setChi(c => ({ ...c, phase: 'captcha', session: r.session, captchaImage: r.captchaImage, captchaInput: '' })) }
    catch (e) { setChi(c => ({ ...c, error: e.message || T('تعذّر تحديث الرمز', 'Could not refresh code') })) }
  }
  const closeChi = () => setChi(c => ({ ...c, phase: 'idle' }))

  // ── الحساب (نفس منطق الفاتورة + حدود التغطية) ──
  const calc = useMemo(() => {
    if (!worker) return null
    const renewalMonths = parseInt(f.renewalMonths) || 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const exp = worker.iqama_expiry_date ? new Date(worker.iqama_expiry_date) : null
    if (exp && !isNaN(exp)) exp.setHours(0, 0, 0, 0)
    const expired = !!(exp && !isNaN(exp) && exp < today)
    let billedMonths = renewalMonths
    if (expired) {
      const end = new Date(today); end.setMonth(end.getMonth() + renewalMonths)
      let m = (end.getFullYear() - exp.getFullYear()) * 12 + (end.getMonth() - exp.getMonth())
      let d = end.getDate() - exp.getDate()
      if (d < 0) { m -= 1; d += new Date(end.getFullYear(), end.getMonth(), 0).getDate() }
      billedMonths = d > 0 ? m + 1 : m
    }
    const grace = parseFloat(cfg.iqamaGraceDays) || 7
    const daysLeft = exp && !isNaN(exp) ? Math.round((exp - today) / 86400000) : Infinity
    const inGrace = daysLeft <= grace
    const fine = inGrace ? (f.repeatViolation ? (parseFloat(cfg.iqamaFine2) || 0) : (parseFloat(cfg.iqamaFine1) || 0)) : 0
    // تقريب لأقرب 0.1 ريال حتى تظهر القيم نظيفة (12 شهر × 54.17 = 650.04 ← 650 · 3 أشهر = 162.51 ← 162.5)
    const renewalBase = Math.round(billedMonths * (parseFloat(cfg.iqamaPerMonth) || 0) * 10) / 10
    const months = renewalMonths || 12
    const defaultProc = parseFloat(cfg.workPermitProcDays) || 7
    // ── أساس احتساب رخصة العمل: سياسة من إعدادات الخدمات (انتهاء الإقامة افتراضياً أو انتهاء كرت العمل) ──
    const wcExp = worker.work_permit_expiry ? new Date(worker.work_permit_expiry) : null
    if (wcExp && !isNaN(wcExp)) wcExp.setHours(0, 0, 0, 0)
    const wantWorkCard = cfg.iqamaWpBasis === 'workcard'
    const wpHasWorkCard = !!(wcExp && !isNaN(wcExp))
    const wpBasisFellBack = wantWorkCard && !wpHasWorkCard   // اختار كرت العمل لكن لا يوجد تاريخ مسجّل ← يُحتسب على الإقامة
    const wpExp = (wantWorkCard && wpHasWorkCard) ? wcExp : exp
    const wpExpired = !!(wpExp && !isNaN(wpExp) && wpExp < today)
    const daysSinceWpExp = wpExpired ? Math.floor((today - wpExp) / 86400000) : 0
    // قاعدة الإقامة المنتهية من مدة طويلة: عند تفعيلها وتجاوز التأخّر الحدّ ← إصدار جديد من اليوم (بلا احتساب شهور التأخّر)
    const wpResetEnabled = cfg.iqamaWpResetEnabled === true
    const wpResetAfterDays = parseFloat(cfg.iqamaWpResetAfterDays) || 365
    const wpLongExpired = wpResetEnabled && wpExpired && daysSinceWpExp > wpResetAfterDays
    // شهور رخصة العمل: منتهية حديثًا → شهور التأخّر + التجديد؛ سارية أو إصدار جديد (مدة طويلة) → شهور التجديد فقط
    let wpBilledMonths = renewalMonths
    if (wpExpired && !wpLongExpired) {
      const wend = new Date(today); wend.setMonth(wend.getMonth() + renewalMonths)
      let wm = (wend.getFullYear() - wpExp.getFullYear()) * 12 + (wend.getMonth() - wpExp.getMonth())
      let wd = wend.getDate() - wpExp.getDate()
      if (wd < 0) { wm -= 1; wd += new Date(wend.getFullYear(), wend.getMonth(), 0).getDate() }
      wpBilledMonths = wd > 0 ? wm + 1 : wm
    }
    const wpStart = (() => {
      if (wpExp && !isNaN(wpExp) && wpExp > today) return new Date(wpExp)   // سارية → من تاريخ الانتهاء
      // منتهية: تبدأ من اليوم + أيام الإصدار الجديد (للمدة الطويلة) أو أيام المعالجة (للحديثة)
      const startProc = wpLongExpired ? (parseFloat(cfg.iqamaWpIssuanceDays) || 5) : defaultProc
      const s = new Date(today); s.setDate(s.getDate() + startProc); return s
    })()
    const wpEnd = new Date(wpStart); wpEnd.setMonth(wpEnd.getMonth() + months)
    const cutoff = new Date(cfg.workPermitCutoffDate)
    const bracketFee = parseFloat(cfg['workPermit' + months + 'M']) || 0
    const dailyRate = parseFloat(cfg.workPermitDailyAfter) || 0
    let workPermit = 0
    if (isNaN(cutoff) || wpEnd <= cutoff) workPermit = bracketFee
    else if (wpStart >= cutoff) workPermit = Math.ceil((wpEnd - wpStart) / 86400000) * dailyRate
    else workPermit = bracketFee + Math.ceil((wpEnd - cutoff) / 86400000) * dailyRate
    workPermit = Math.round(workPermit)
    // بدون إعفاء: السعر الثابت للمدة (الجدول) + شهور التأخّر × سعر الشهر (مثل الإقامة). سعر الشهر = سعر 12 شهر ÷ 12.
    if (f.exemption === false) {
      const noExBracket = Number(cfg['workPermitNoExempt' + months + 'M']) || 0
      if (noExBracket > 0) {
        const noExPerMonth = (Number(cfg.workPermitNoExempt12M) || 0) / 12
        const overdueMonths = Math.max(0, wpBilledMonths - renewalMonths)
        workPermit = Math.round(noExBracket + overdueMonths * noExPerMonth)
      }
    }
    // التأمين الطبي: تأمين ساري متبقٍّ ≥ «المهلة» (قابلة للتعديل من الإعدادات: أشهر + أيام، الافتراضي شهرين و10 أيام) ← لا رسم
    const medGraceMonths = parseInt(cfg.medicalGraceMonths) || 2
    const medGraceDays = parseInt(cfg.medicalGraceDays) || 10
    const medThreshold = (() => { const t = new Date(today); t.setMonth(t.getMonth() + medGraceMonths); t.setDate(t.getDate() + medGraceDays); return t })()
    const medEnd = f.medInsuranceEnd ? new Date(f.medInsuranceEnd) : null
    if (medEnd && !isNaN(medEnd)) medEnd.setHours(0, 0, 0, 0)
    const medDaysLeft = medEnd && !isNaN(medEnd) ? Math.round((medEnd - today) / 86400000) : null
    // التأمين الطبي إجباري دائماً: لا يُعتدّ بأي تأمين ساري — يُحتسب الرسم دائماً حسب شريحة العمر
    const medInsuredValid = false
    let medical = 0
    if (worker.birth_date) { const bd = new Date(worker.birth_date), age = Math.floor((new Date() - bd) / 31557600000); const brk = cfg.medicalBrackets || []; const g = brk.find(x => age >= x.min && age < x.max); medical = g ? g.rate : 0 }
    // رسوم تغيير المهنة — تُعفى إذا كانت المهنة الحالية أو الجديدة ضمن قائمة المهن المعفاة (مثل نقل الكفالة)
    const profChangeFreeIds = Array.isArray(cfg.profChangeFreeOccupations) ? cfg.profChangeFreeOccupations : []
    const profChangeIsFree = profChangeFreeIds.length > 0 && (profChangeFreeIds.includes(worker.current_occupation_id) || profChangeFreeIds.includes(f.newOccupationId))
    const profChange = (f.changeProfession && !profChangeIsFree) ? (parseFloat(cfg.profChange) || 0) : 0
    // رسوم المكتب: وضع «يومي» = سعر اليوم × أيام التجديد (الشهور × 30)؛ وضع «ثابت» = القيمة المُدخلة أو الافتراضية
    const officeDailyRate = parseFloat(cfg.officeDailyRate) || 0
    const officeDays = renewalMonths * 30
    const officeMode = cfg.iqamaOfficeFeeMode === 'daily' ? 'daily' : 'flat'
    const officeFloor = Math.round(officeDailyRate * officeDays)   // الحد الأدنى المسموح للخصم عند التصديق
    const officeFee = officeMode === 'daily'
      ? officeFloor
      : (f.officeFee !== '' && !isNaN(parseFloat(f.officeFee)) ? parseFloat(f.officeFee) : (parseFloat(cfg.officeFee) || 0))
    // حدود التغطية كلها قابلة للتعديل من الإعدادات (الإدارة ← الخدمات ← تجديد الإقامة):
    //  • الإقامة: «حد التغطية الحكومية» السنوي (650) × عدد الأشهر ÷ 12 — يتناسب مع مدة التجديد.
    //  • رخصة العمل: سعر الكرت الثابت للمدة نفسها (workPermit{N}M) — 3 أشهر = 25 … 12 شهر = 100.
    //  • التأمين: حد ثابت «حد تغطية المكتب» (medGovCover، الافتراضي 1000/سنة).
    const coverIqama = Math.round((parseFloat(cfg.iqamaGovCover) || COVER.iqama) * renewalMonths / 12 * 10) / 10
    const coverWorkPermit = parseFloat(cfg['workPermit' + renewalMonths + 'M'])
      || Math.round((COVER.workPermit / 12) * renewalMonths * 10) / 10
    const medGovCover = parseFloat(cfg.medGovCover) || COVER.medical
    const iqamaExcess = Math.max(0, renewalBase - coverIqama)
    const wpExcess = Math.max(0, workPermit - coverWorkPermit)
    const medExcess = Math.max(0, medical - medGovCover)
    const govExcess = iqamaExcess + wpExcess + medExcess
    const extrasTotal = (f.extras || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const subtotal = officeFee + govExcess + fine + profChange + extrasTotal
    // المدة المتوقعة في الإقامة بعد التجديد
    const expBase = (exp && !isNaN(exp) && exp > today) ? new Date(exp) : new Date(today)
    const expectedExpiryDate = new Date(expBase); expectedExpiryDate.setMonth(expectedExpiryDate.getMonth() + renewalMonths)
    const expectedExpiry = expectedExpiryDate.toISOString().slice(0, 10)
    return { expired, inGrace, renewalBase, fine, workPermit, medical, officeFee, profChange, iqamaExcess, wpExcess, medExcess, govExcess, extrasTotal, subtotal, billedMonths, expectedExpiry, coverIqama, coverWorkPermit, medGovCover, medInsuredValid, medDaysLeft, wpBilledMonths, wpExpired, wpBasisFellBack, wpLongExpired, profChangeIsFree, officeMode, officeDays, officeDailyRate, officeFloor }
  }, [worker, f, cfg])

  const absher = f.absher_on ? (parseFloat(f.absher) || 0) : 0
  const grandTotal = Math.max(0, (calc?.subtotal || 0) - absher)
  // رقم الجوال إلزامي: 9 أرقام يبدأ بـ 5
  const phoneValid = /^5\d{8}$/.test(phone)

  // ── الحفظ ──
  const save = async () => {
    if (!worker || !calc || submitting) return
    setSubmitting(true)
    try {
      const renewalMonths = parseInt(f.renewalMonths) || 0
      const occ = occOf(worker)
      const occupationNameAr = occ ? (occ.name_ar || occ.name_en) : (worker.occupation_ar || null)
      const row = {
        worker_id: worker.id, iqama_number: worker.iqama_number, worker_name: worker.name_ar || worker.name_en,
        phone: phone ? '0' + phone : null, dob: worker.birth_date, nationality_id: worker.nationality_id, gender: worker.gender || null,
        occupation_name_ar: occupationNameAr,
        iqama_expiry_gregorian: worker.iqama_expiry_date, iqama_expired: calc.expired,
        renewal_months: renewalMonths, change_profession: f.changeProfession, new_occupation_name_ar: f.changeProfession ? (f.newOccupation?.trim() || null) : null, new_occupation_id: f.changeProfession ? (f.newOccupationId || null) : null, repeat_violation: f.repeatViolation, exemption: f.exemption !== false,
        iqama_renewal_fee: calc.renewalBase, late_fine_amount: calc.fine, work_permit_fee: calc.workPermit,
        prof_change_fee: calc.profChange, medical_fee: calc.medical, office_fee: calc.officeFee,
        medical_insured: !!calc.medInsuredValid, medical_insurance_end: f.medInsuranceEnd || null,
        medical_insurance_company: f.medInsuranceCompany || null, medical_insurance_policy: f.medInsurancePolicy || null,
        gov_excess: calc.govExcess, extras: f.extras || [], absher_discount: absher,
        subtotal: calc.subtotal, total_amount: grandTotal,
        status: 'priced', priced_at: new Date().toISOString(), created_by: user?.id || null,
        branch_id: user?.branch_id || user?.primary_branch_id || null,
      }
      // لقطة مجمّدة للقيم المشتقّة — تُخزَّن مع الصف فلا تتغيّر القيم التاريخية لاحقًا
      Object.assign(row, computeRenewalDerived(row))
      const { data, error } = await sb.from('iqama_renewal_calculation').insert(row).select('quote_no').maybeSingle()
      if (error) throw error
      const warnings = []
      if (calc.expired) warnings.push({ level: 'danger', text: T('الإقامة منتهية — احتُسبت غرامة التأخير', 'Iqama expired — late fine applied') })
      else if (calc.inGrace) warnings.push({ level: 'warn', text: T('الإقامة على وشك الانتهاء — يُنصح بالتجديد قبل الموعد', 'Iqama expiring soon — renew before the deadline') })
      setIssuedQuote({ quoteNo: data?.quote_no || '—', workerName: worker.name_ar || worker.name_en, iqNo: worker.iqama_number, total: grandTotal, warnings })
    } catch (e) { toast?.(T('تعذّر حفظ التسعيرة', 'Failed to save quote') + (e?.message ? ': ' + e.message : ''), 'error') }
    setSubmitting(false)
  }

  // ── تبويب 1: حقول عرض للقراءة فقط ──
  const Field = ({ label, value, color, span, ltr }) => (
    <div style={{ gridColumn: span === 2 ? '1 / -1' : 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, padding: '8px 11px', borderRadius: 9, background: 'var(--bd2)', border: '1px solid var(--bd)', minHeight: 40, minWidth: 0 }}>
      <span style={{ fontSize: 10, color: 'var(--tx5)', fontWeight: 600, letterSpacing: '.2px', lineHeight: 1.2 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: color || 'var(--tx)', lineHeight: 1.2, textAlign: isAr ? 'right' : 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...(ltr ? { direction: 'ltr' } : {}) }}>{value || '—'}</span>
    </div>
  )
  const Group = ({ title, Icon, children }) => (
    <div style={{ borderRadius: 12, border: `1.5px solid ${C.gold}59`, padding: '16px 12px 12px', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -9, insetInlineStart: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={12} strokeWidth={2.2} />}<span>{title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{children}</div>
    </div>
  )


  const fmtD = d => { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') }
  const ageStr = (() => { if (!worker?.birth_date) return null; const b = new Date(worker.birth_date); if (isNaN(b)) return null; const t = new Date(); let y = t.getFullYear() - b.getFullYear(); let m = t.getMonth() - b.getMonth(); if (t.getDate() < b.getDate()) m -= 1; if (m < 0) { y -= 1; m += 12 } return T(`${y} سنة و ${m} شهر`, `${y}y ${m}m`) })()

  // بيانات العامل الأساسية المطلوبة لإكمال التجديد — إن نقص أيٌّ منها يُمنع إكمال الطلب
  // أساس احتساب كرت العمل (من إعدادات تسعيرة تجديد الإقامة): يحدّد أي تاريخ انتهاء يكون إلزامياً.
  const wpBasisWorkCard = cfg.iqamaWpBasis === 'workcard'
  const missingWorkerFields = worker ? [
    !worker.iqama_number && T('رقم الإقامة', 'Iqama number'),
    !worker.birth_date && T('تاريخ الميلاد', 'Birth date'),
    wpBasisWorkCard
      ? (!worker.work_permit_expiry && T('تاريخ انتهاء رخصة العمل', 'Work permit expiry'))
      : (!worker.iqama_expiry_date && T('تاريخ انتهاء الإقامة', 'Iqama expiry')),
    !worker.current_occupation_id && !worker.occupation_ar && T('الوظيفة', 'Occupation'),
  ].filter(Boolean) : []
  const workerDataIncomplete = missingWorkerFields.length > 0

  // كرت الإجمالي المتوقع — يظهر فقط في خطوة المراجعة
  const heroTotal = (
    <div style={{ marginTop: 'auto', padding: '14px 18px', borderRadius: 16, background: 'linear-gradient(135deg, rgba(212,160,23,.12), var(--bd2))', border: '1px solid rgba(212,160,23,.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(212,160,23,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gold, flexShrink: 0 }}><Calculator size={19} strokeWidth={2.2} /></div>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.gold }}>{T('الإجمالي المتوقع', 'Expected Total')}</span>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, color: C.gold, direction: dir }}>
        <span style={{ fontSize: 27, fontWeight: 700, lineHeight: 1, letterSpacing: '.5px' }}>{nm(grandTotal.toFixed(2))}</span>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: .7 }}>{T('ريال', 'SAR')}</span>
      </span>
    </div>
  )

  // ── جدول تفصيل الرسوم الحكومية لوحده — يُعرض في خطوة التسعيرة (ضمن الكروت) وخطوة المراجعة (لحاله) ──
  const govFeesDetail = calc && (
    <KCard Icon={Building2} label={T('تفصيل الرسوم الحكومية', 'Government Fees')} span={2}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* تنبيه: السياسة على «كرت العمل» لكن لا يوجد تاريخ مسجّل للعامل ← احتُسبت على الإقامة */}
          {calc.wpBasisFellBack && (
            <div style={{ marginBottom: 9, display: 'flex', alignItems: 'center', gap: 7, fontSize: 9.5, fontWeight: 600, color: C.red, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.3)', borderRadius: 7, padding: '7px 9px' }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} />{T('سياسة الاحتساب «كرت العمل» لكن لا يوجد تاريخ مسجّل — احتُسبت رخصة العمل على انتهاء الإقامة.', 'Basis "work-card" but no date on file — work permit calculated on iqama expiry.')}
            </div>
          )}

          {/* جدول محاسبي: البند · الإجمالي · يشمله المكتب · الزائد على العميل */}
          {(() => {
            const rows = [
              { label: T('تجديد الإقامة', 'Iqama renewal'), amt: calc.renewalBase, excess: calc.iqamaExcess, months: calc.billedMonths },
              { label: T('رخصة العمل', 'Work permit'), amt: calc.workPermit, excess: calc.wpExcess, months: f.exemption === false ? calc.wpBilledMonths : (parseInt(f.renewalMonths) || 12), exempt: f.exemption !== false, fresh: calc.wpLongExpired },
              { label: T('التأمين الطبي', 'Medical'), amt: calc.medical, excess: calc.medExcess, insured: calc.medInsuredValid },
              ...(calc.profChange > 0 ? [{ label: T('تغيير المهنة', 'Occupation change'), amt: calc.profChange, excess: calc.profChange }] : []),
            ]
            const totAmt = rows.reduce((s, r) => s + r.amt, 0)
            const totCov = rows.reduce((s, r) => s + Math.max(0, r.amt - r.excess), 0)
            const totExcess = rows.reduce((s, r) => s + r.excess, 0)
            const cols = '1.5fr .8fr 1fr 1.05fr'
            const num = { fontVariantNumeric: 'tabular-nums', direction: 'ltr', textAlign: 'left' }
            return (
              <div>
                {/* رأس الجدول */}
                <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, padding: '0 2px 7px', fontSize: 9.5, fontWeight: 700, color: 'var(--tx4)', lineHeight: 1.3 }}>
                  <span style={{ textAlign: 'start' }}>{T('البند', 'Item')}</span>
                  <span style={num}>{T('الإجمالي', 'Total')}</span>
                  <span style={num}>{T('يشمله المكتب', 'Covered')}</span>
                  <span style={num}>{T('الزائد على العميل', 'Excess')}</span>
                </div>
                {rows.map((r, i) => {
                  const covered = Math.max(0, r.amt - r.excess)
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, alignItems: 'center', padding: '9px 2px', borderTop: '1px solid var(--bd)', fontSize: 12.5 }}>
                      <span style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
                        <span style={{ fontWeight: 600, color: 'var(--tx)' }}>{r.label}</span>
                        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                          {r.months ? <span style={{ fontSize: 9, fontWeight: 600, color: C.gold, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.25)', borderRadius: 20, padding: '1px 6px' }}>{r.months} {T('شهر', 'mo')}</span> : null}
                          {typeof r.exempt === 'boolean' && <span style={{ fontSize: 9, fontWeight: 600, color: r.exempt ? '#2ea043' : C.red, background: r.exempt ? 'rgba(46,160,67,.1)' : 'rgba(192,57,43,.1)', border: `1px solid ${r.exempt ? 'rgba(46,160,67,.3)' : 'rgba(192,57,43,.3)'}`, borderRadius: 20, padding: '1px 6px' }}>{r.exempt ? T('إعفاء', 'Exempt') : T('بدون إعفاء', 'No exempt')}</span>}
                          {r.fresh && <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, background: 'rgba(212,160,23,.12)', border: '1px solid rgba(212,160,23,.35)', borderRadius: 20, padding: '1px 6px' }}>{T('إصدار جديد', 'New')}</span>}
                          {r.insured && <span style={{ fontSize: 9, fontWeight: 600, color: '#2ea043', background: 'rgba(46,160,67,.1)', border: '1px solid rgba(46,160,67,.3)', borderRadius: 20, padding: '1px 6px' }}>{T('تأمين ساري', 'Insured')}</span>}
                        </span>
                      </span>
                      <span style={{ ...num, fontWeight: 700, color: 'var(--tx)' }}>{nm(r.amt)}</span>
                      <span style={{ ...num, fontWeight: 600, color: '#2ea043' }}>{nm(covered)}</span>
                      <span style={{ ...num, fontWeight: 700, color: r.excess > 0 ? C.red : 'var(--tx5)' }}>{r.excess > 0 ? `+${nm(r.excess)}` : '—'}</span>
                    </div>
                  )
                })}
                {/* صف الإجمالي */}
                <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 8, alignItems: 'center', padding: '9px 2px 1px', borderTop: '1px dashed rgba(212,160,23,.35)', fontSize: 12.5 }}>
                  <span style={{ fontWeight: 700, color: C.gold }}>{T('الإجمالي', 'Total')}</span>
                  <span style={{ ...num, fontWeight: 800, color: C.gold }}>{nm(totAmt)}</span>
                  <span style={{ ...num, fontWeight: 700, color: '#2ea043' }}>{nm(totCov)}</span>
                  <span style={{ ...num, fontWeight: 800, color: totExcess > 0 ? C.red : 'var(--tx5)' }}>{totExcess > 0 ? `+${nm(totExcess)}` : '—'}</span>
                </div>
              </div>
            )
          })()}
        </div>
      </KCard>
  )

  // ── كرتا الملخص: رسوم المكتب + الزائد على العميل — يُعرضان في خطوة التكلفة ──
  const summaryCards = calc && (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {/* رسوم المكتب — الرسم الأساسي للخدمة */}
      <div style={{ borderRadius: 13, padding: '13px 14px', background: 'linear-gradient(135deg, rgba(212,160,23,.14), rgba(212,160,23,.035))', border: '1px solid rgba(212,160,23,.32)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: C.gold }}><Briefcase size={15} strokeWidth={2.3} />{T('رسوم المكتب', 'Office Fee')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, fontVariantNumeric: 'tabular-nums' }}><span style={{ direction: 'ltr', fontSize: 22, fontWeight: 800, color: C.gold, lineHeight: 1 }}>{nm(calc.officeFee)}</span><span style={{ fontSize: 10.5, fontWeight: 600, color: C.gold, opacity: .65 }}>{T('ريال', 'SAR')}</span></span>
      </div>
      {/* الزائد على العميل — مجموع ما تجاوز حدود المكتب + رسوم تغيير المهنة (تُحمّل كاملةً على العميل) */}
      {(() => { const clientExcess = calc.govExcess + calc.profChange; return (
      <div style={{ borderRadius: 13, padding: '13px 14px', background: clientExcess > 0 ? 'linear-gradient(135deg, rgba(192,57,43,.13), rgba(192,57,43,.03))' : 'linear-gradient(135deg, rgba(46,160,67,.13), rgba(46,160,67,.03))', border: `1px solid ${clientExcess > 0 ? 'rgba(192,57,43,.32)' : 'rgba(46,160,67,.32)'}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: clientExcess > 0 ? C.red : '#2ea043' }}>{clientExcess > 0 ? <AlertCircle size={15} strokeWidth={2.3} /> : <Check size={15} strokeWidth={2.6} />}{T('الزائد على العميل', 'Excess on Customer')}</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, fontVariantNumeric: 'tabular-nums' }}><span style={{ direction: 'ltr', fontSize: 22, fontWeight: 800, color: clientExcess > 0 ? C.red : '#2ea043', lineHeight: 1 }}>{clientExcess > 0 ? '+' : ''}{nm(clientExcess)}</span><span style={{ fontSize: 10.5, fontWeight: 600, opacity: .65, color: clientExcess > 0 ? C.red : '#2ea043' }}>{T('ريال', 'SAR')}</span></span>
      </div>
      )})()}
    </div>
  )

  // ══════════ محتوى التبويبات ══════════
  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
      {/* ── تبويب 0: العامل ── */}
      {tab === 0 && (
        <KCard Icon={User} label={T('بيانات العامل', 'Worker')} span={2}
          style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '24px 14px 14px' }}
          bodyStyle={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!worker ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
              {stShow('rw_worker') && fShow('rw_search') && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Search size={16} strokeWidth={2} style={{ position: 'absolute', top: '50%', insetInlineEnd: 14, transform: 'translateY(-50%)', pointerEvents: 'none', color: searching ? C.gold : 'var(--tx4)', transition: 'color .2s' }} />
                <input value={q} onChange={e => setQ(e.target.value)} disabled={!fEdit('rw_search')} placeholder={T('ابحث بالاسم أو رقم الإقامة…', 'Search by name or Iqama…')} style={{ width: '100%', height: 42, paddingBlock: 0, paddingInlineStart: 14, paddingInlineEnd: 40, borderRadius: 10, background: 'var(--inputBg)', border: '1px solid var(--bd)', color: 'var(--tx)', fontFamily: F, fontSize: 12.5, fontWeight: 600, outline: 'none', boxSizing: 'border-box', textAlign: 'start' }} />
              </div>
              )}
              <style>{`.rnw-scroll{scrollbar-width:thin;scrollbar-color:rgba(212,160,23,.4) transparent}.rnw-scroll::-webkit-scrollbar{width:8px}.rnw-scroll::-webkit-scrollbar-track{background:transparent;margin:2px 0}.rnw-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(212,160,23,.6),rgba(212,160,23,.22));border-radius:99px;border:2px solid transparent;background-clip:padding-box}.rnw-scroll::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,rgba(240,201,71,.85),rgba(212,160,23,.45));background-clip:padding-box}`}</style>
              <div className="rnw-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingInline: 14 }}>
                {(q.trim() ? results : workerPreview.slice(0, 3)).map(w => {
                  const wnat = natOf(w)
                  const wname = (lang === 'en' ? (w.name_en || w.name_ar) : (w.name_ar || w.name_en)) || '—'
                  const expDt = w.iqama_expiry_date ? new Date(w.iqama_expiry_date) : null
                  const days = expDt && !isNaN(expDt) ? Math.round((expDt - new Date()) / 86400000) : null
                  const expColor = days == null ? 'var(--tx5)' : days < 0 ? C.red : days < 30 ? '#e5b534' : '#27a046'
                  return (
                    <div key={w.id} onClick={() => pickWorker(w)}
                      style={{ cursor: 'pointer', border: '1px solid rgba(212,160,23,.22)', background: 'linear-gradient(135deg,rgba(212,160,23,.07),rgba(255,255,255,.015))', boxShadow: 'var(--shadow-md)', transition: 'all .22s ease', padding: 14, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12 }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.12),rgba(255,255,255,.02))'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.32)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(212,160,23,.07),rgba(255,255,255,.015))'; e.currentTarget.style.borderColor = 'rgba(212,160,23,.22)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div title={wnat?.name_ar || ''} style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bd2)', border: '1px solid var(--bd)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {wnat?.flag_url ? <img src={wnat.flag_url} alt={wnat?.name_ar || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <Globe size={20} strokeWidth={1.6} color="var(--tx4)" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--tx)', letterSpacing: '-.2px' }}>{wname}</span>
                          {w.name_en && wname !== w.name_en && <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .9 }}>{w.name_en}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {w.iqama_number && infoBox(IdCard, T('رقم الإقامة', 'Iqama No'), w.iqama_number)}
                        {infoBox(Calendar, T('انتهاء الإقامة', 'Iqama Expiry'), fmtD(w.iqama_expiry_date), expColor)}
                        {w.phone && infoBox(Phone, T('الجوال', 'Phone'), w.phone)}
                      </div>
                    </div>
                  )
                })}
                {searching && results.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx4)', textAlign: 'center', padding: 16 }}>{T('جارٍ البحث…', 'Searching…')}</div>}
                {!searching && q.trim() && results.length === 0 && (
                  <div style={{ padding: '24px 20px', borderRadius: 9, background: 'transparent', border: '1px dashed var(--bd)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(212,160,23,.08)', border: '1px dashed rgba(212,160,23,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(212,160,23,.65)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--tx2)', fontWeight: 600, fontFamily: F }}>{T('لا يوجد عامل بهذا البحث', 'No worker matches this search')}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--tx5)', fontWeight: 500, fontFamily: F }}>{T('جرّب البحث باسم آخر أو رقم الإقامة', 'Try another name or Iqama number')}</div>
                  </div>
                )}
              </div>
            </div>
          ) : (() => {
            const nat = natOf(worker)
            const flagUrl = nat?.flag_url || null
            const natLabel = nat ? (lang === 'en' ? (nat.name_en || nat.name_ar) : nat.name_ar) : null
            const occ = occOf(worker)
            const occName = occ ? (lang === 'en' ? (occ.name_en || occ.name_ar) : occ.name_ar) : (worker.occupation_ar || null)
            const exD = worker.iqama_expiry_date ? new Date(worker.iqama_expiry_date) : null
            const exDays = exD && !isNaN(exD) ? Math.round((exD - new Date()) / 86400000) : null
            const expColor = exDays == null ? 'var(--tx5)' : exDays < 0 ? C.red : exDays < 30 ? '#e5b534' : '#27a046'
            const pillBase = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 9, background: 'var(--bd2)', border: '1px solid var(--bd)', minHeight: 40 }
            const pLbl = { fontSize: 10, color: 'var(--tx5)', fontWeight: 600, letterSpacing: '.2px', lineHeight: 1.2 }
            const pVal = { fontSize: 13, color: 'var(--tx)', fontWeight: 600, direction: 'ltr', lineHeight: 1.2, textAlign: isAr ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
            return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* بطاقة العامل المختار — نفس تصميم الفاتورة */}
              <div style={{ position: 'relative', border: '1px solid rgba(212,160,23,.4)', background: 'linear-gradient(135deg,rgba(212,160,23,.12),var(--bd2))', boxShadow: 'var(--shadow-md)', padding: 14, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div title={natLabel || ''} style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bd2)', border: '1px solid var(--bd)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {flagUrl ? <img src={flagUrl} alt={natLabel || ''} title={natLabel || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <Globe size={20} strokeWidth={1.6} color="var(--tx4)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15.5, fontWeight: 600, color: C.gold, letterSpacing: '-.2px' }}>{isAr ? (worker.name_ar || worker.name_en) : (worker.name_en || worker.name_ar)}</span>
                    <button type="button" onClick={() => setWorker(null)} title={T('تغيير العامل', 'Change worker')}
                      style={{ flexShrink: 0, height: 22, padding: '0 9px', borderRadius: 6, background: 'rgba(192,57,43,.10)', border: '1px solid rgba(192,57,43,.3)', color: C.red, fontFamily: F, fontSize: 10, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', zIndex: 2, transition: '.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(192,57,43,.18)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.55)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(192,57,43,.10)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,.3)' }}>
                      {T('تغيير', 'Change')}<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    </button>
                  </div>
                  {worker.name_en && (worker.name_ar || worker.name_en) !== worker.name_en && <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600, direction: 'ltr', textAlign: 'right', opacity: .9 }}>{worker.name_en}</span>}
                </div>
              </div>
              {/* إطار بيانات العامل — خلايا بنمط الفاتورة */}
              <KCard label={T('بيانات العامل', 'Worker Info')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {stShow('rw_worker') && fShow('rw_iqama') && (
                  <div style={pillBase}>
                    <IdCard size={13} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('رقم الإقامة', 'Iqama No')}</span><span style={pVal}>{worker.iqama_number || '—'}</span></div>
                    {worker.iqama_number && <CopyBtn value={worker.iqama_number} lang={lang} />}
                  </div>
                  )}
                  {stShow('rw_worker') && fShow('rw_occupation') && (
                  <div style={pillBase}>
                    <Briefcase size={13} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('الوظيفة', 'Occupation')}</span><span style={{ ...pVal, direction: dir }}>{occName || '—'}</span></div>
                  </div>
                  )}
                  {stShow('rw_worker') && fShow('rw_expiry') && (
                  <div style={pillBase}>
                    <Calendar size={13} color={expColor} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('انتهاء الإقامة', 'Iqama Expiry')}</span><span style={{ ...pVal, color: expColor }}>{fmtD(worker.iqama_expiry_date)}</span></div>
                  </div>
                  )}
                  {stShow('rw_worker') && fShow('rw_age') && (
                  <div style={pillBase}>
                    <User size={13} color={C.gold} strokeWidth={1.8} style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}><span style={pLbl}>{T('العمر', 'Age')}</span><span style={{ ...pVal, direction: dir }}>{ageStr || '—'}</span></div>
                  </div>
                  )}
                </div>
              </KCard>
              {/* رقم الجوال — إلزامي، ويُخفى عند نقص بيانات العامل (لا فائدة منه حينها) */}
              {!workerDataIncomplete && stShow('rw_worker') && fShow('rw_phone') && (
              <KCard label={<>{T('رقم الجوال', 'Mobile Number')}<span style={{ color: C.red }}> *</span></>}>
                <div style={{ display: 'flex', direction: 'ltr', border: '1px solid var(--bd)', borderRadius: 9, overflow: 'hidden', background: 'var(--inputBg)', height: 40, boxShadow: 'none', transition: '.2s' }}>
                  <div style={{ padding: '0 10px', background: 'var(--bd2)', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: C.gold, flexShrink: 0 }}>+966</div>
                  <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))} disabled={!fEdit('rw_phone')} placeholder="5X XXX XXXX" maxLength={9} inputMode="numeric" style={{ width: '100%', height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 600, color: 'var(--tx)', outline: 'none', textAlign: 'left' }} />
                </div>
              </KCard>
              )}
              {workerDataIncomplete ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: C.red, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.3)', borderRadius: 9, padding: '11px 13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldAlert size={15} style={{ flexShrink: 0 }} />{T('بيانات العامل غير مكتملة — لا يمكن إكمال الطلب', 'Worker data incomplete — cannot proceed')}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', lineHeight: 1.7 }}>{T('النواقص: ', 'Missing: ')}<span style={{ color: C.red, fontWeight: 600 }}>{missingWorkerFields.join(T('، ', ', '))}</span></div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx3)', lineHeight: 1.7 }}>{T('يرجى التواصل مع الموظف المختص لإكمال بيانات العامل.', 'Please contact the responsible employee to complete the worker data.')}</div>
                </div>
              ) : calc?.expired ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: C.red, background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.3)', borderRadius: 9, padding: '9px 12px' }}><ShieldAlert size={15} style={{ flexShrink: 0 }} />{T('الإقامة منتهية — تُحتسب المدة الكاملة بالتقويم وغرامة التأخير', 'Iqama expired — full calendar duration & late fine billed')}</div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--tx4)', fontWeight: 500, textAlign: 'center', padding: '4px 0' }}>{T('تابع لاستعراض بيانات العامل واحتساب التسعيرة', 'Continue to review worker data and price the quote')}</div>
              )}
            </div>
            )
          })()}
        </KCard>
      )}

      {/* ── تبويب 1: تفاصيل العامل ── */}
      {tab === 1 && worker && (() => {
        const occ = occOf(worker)
        const occName = occ ? (lang === 'en' ? (occ.name_en || occ.name_ar) : occ.name_ar) : (worker.occupation_ar || null)
        const dateColor = calc?.expired ? C.red : (worker.iqama_expiry_date ? '#27a046' : null)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Group title={T('بيانات العامل', 'Worker Data')} Icon={User}>
              {stShow('rw_details') && fShow('rw_d_name') && <Field label={T('الإسم', 'Name')} value={isAr ? (worker.name_ar || worker.name_en) : (worker.name_en || worker.name_ar)} span={2} />}
              {stShow('rw_details') && fShow('rw_d_iqama') && <Field label={T('رقم الإقامة', 'Iqama Number')} value={worker.iqama_number} ltr />}
              {stShow('rw_details') && fShow('rw_d_expiry') && <Field label={T('انتهاء الإقامة (ميلادي)', 'Iqama Expiry (Gregorian)')} value={fmtD(worker.iqama_expiry_date)} color={dateColor} ltr />}
              {stShow('rw_details') && fShow('rw_d_age') && <Field label={T('العمر', 'Age')} value={ageStr} />}
              {stShow('rw_details') && fShow('rw_d_occupation') && <Field label={T('الوظيفة', 'Occupation')} value={occName} />}
            </Group>
            {worker.facility ? (() => {
              const fac = worker.facility
              const pillBase = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 9, background: 'var(--bd2)', border: '1px solid var(--bd)', fontSize: 11, fontFamily: F, color: 'var(--tx3)', minHeight: 40 }
              const lbl = { fontSize: 10, color: 'var(--tx5)', fontWeight: 600, letterSpacing: '.2px', lineHeight: 1.2 }
              const val = { fontSize: 13, color: 'var(--tx)', fontWeight: 600, direction: 'ltr', lineHeight: 1.2, textAlign: isAr ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
              return (
                <div style={{ padding: '20px 14px 12px', borderRadius: 12, border: '1.5px solid rgba(212,160,23,.35)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ position: 'absolute', top: -9, insetInlineStart: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 12, fontWeight: 600, color: C.gold, fontFamily: F, maxWidth: 'calc(100% - 28px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(isAr ? (fac.name_ar || fac.name_en) : (fac.name_en || fac.name_ar)) || T('منشأة العامل', "Worker's Establishment")}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {stShow('rw_details') && fShow('rw_d_fac_unified') && (
                    <div style={pillBase}>
                      <Hash size={12} color={C.gold} strokeWidth={1.8} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}><span style={lbl}>{T('الرقم الموحد', 'Unified No.')}</span><span style={val}>{fac.unified_number || '—'}</span></div>
                      {fac.unified_number && <CopyBtn value={fac.unified_number} lang={lang} />}
                    </div>
                    )}
                    {stShow('rw_details') && fShow('rw_d_fac_hrsd') && (
                    <div style={pillBase}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}><span style={lbl}>{T('رقم الموارد البشرية', 'HRSD No.')}</span><span style={val}>{fac.hrsd_number || '—'}</span></div>
                      {fac.hrsd_number && <CopyBtn value={fac.hrsd_number} lang={lang} />}
                    </div>
                    )}
                    {stShow('rw_details') && fShow('rw_d_fac_gosi') && (
                    <div style={pillBase}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}><span style={lbl}>{T('رقم التأمينات', 'GOSI No.')}</span><span style={val}>{fac.gosi_number || '—'}</span></div>
                      {fac.gosi_number && <CopyBtn value={fac.gosi_number} lang={lang} />}
                    </div>
                    )}
                  </div>
                </div>
              )
            })() : (
              <Group title={T('منشأة العامل', "Worker's Establishment")} Icon={Building2}>
                <Field label={T('المنشأة', 'Establishment')} value={T('غير مرتبط بمنشأة', 'Not linked to an establishment')} span={2} />
              </Group>
            )}
            {/* التأمين الطبي إجباري: يُحتسب الرسم دائماً بدون استعلام ولا بطاقة في الواجهة */}
          </div>
        )
      })()}

      {/* ── تبويب 2: خيارات التجديد ── */}
      {tab === 2 && calc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1, minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 12px', flex: 1, alignContent: 'start' }}>
            {/* هل يوجد إعفاء؟ — «لا» تُحوّل رخصة العمل لسعر ثابت بدون إعفاء */}
            {stShow('rw_renewal_options') && fShow('rw_exemption') && (
            <KCard Icon={BadgeCheck} label={T('هل يوجد إعفاء؟', 'Exemption?')} hint={f.exemption === false ? T('رخصة العمل بسعر بدون إعفاء', 'no-exemption work-permit rate') : T('حساب رخصة العمل الاعتيادي', 'standard work-permit calc')} span={2}>
              <YesNo value={f.exemption !== false} onChange={v => set('exemption', v)} lang={lang} height={50} />
            </KCard>
            )}
            {/* مدة التجديد */}
            {stShow('rw_renewal_options') && fShow('rw_period') && (
            <KCard Icon={Calendar} label={T('مدة التجديد', 'Renewal Period')} span={2}>
              <ToggleGroup value={f.renewalMonths} onChange={v => set('renewalMonths', v)} height={60}
                options={['3', '6', '9', '12'].map(m => ({ v: m, l: m, sub: T('شهر', 'mo') }))} />
            </KCard>
            )}
            {/* تغيير المهنة */}
            {stShow('rw_renewal_options') && fShow('rw_change_profession') && (
            <KCard Icon={ArrowLeftRight} label={T('تغيير المهنة', 'Change Occupation')} span={2}>
              <YesNo value={f.changeProfession} onChange={v => set('changeProfession', v)} lang={lang} height={50} />
              {f.changeProfession && fShow('rw_new_occupation') && (
                <div style={{ marginTop: 12 }}>
                  <Select label={T('المهنة الجديدة', 'New Occupation')} placeholder={T('اختر المهنة…', 'Select occupation…')}
                    options={occupations} getKey={o => o.id} getLabel={o => o.name_ar || o.name_en || ''} getSub={o => o.name_en || ''} disabled={!fEdit('rw_new_occupation')}
                    value={f.newOccupationId || ''} onChange={(id, item) => setF(p => ({ ...p, newOccupationId: id, newOccupation: item?.name_ar || item?.name_en || '' }))} />
                  {calc.profChangeIsFree && (
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, color: '#2ea043', background: 'rgba(46,160,67,.08)', border: '1px solid rgba(46,160,67,.3)', borderRadius: 8, padding: '8px 10px' }}>
                      <Check size={14} strokeWidth={2.6} style={{ flexShrink: 0 }} />{T('المهنة معفاة — لن تُحتسب رسوم تغيير المهنة (0 ريال).', 'Occupation exempt — no profession-change fee (0 SAR).')}
                    </div>
                  )}
                </div>
              )}
            </KCard>
            )}
          </div>
        </div>
      )}

      {/* ── تبويب 3: التسعيرة (الرسوم) ── */}
      {tab === 3 && calc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, flex: 1, minHeight: 0 }}>
          {stShow('rw_pricing') && fShow('rw_fees') && govFeesDetail}
        </div>
      )}

      {/* ── تبويب 4: مراجعة بيانات العامل ── */}
      {tab === 4 && calc && stShow('rw_review') && fShow('rw_review') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0 }}>
          {/* خط زمني: الإقامة الحالية ← +المدة ← بعد التجديد */}
          <div style={{ background: 'var(--bd2)', border: '1px solid var(--bd)', borderRadius: 13, padding: '20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              {/* الإقامة الحالية */}
              <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--tx3)', marginBottom: 6 }}>{T('الإقامة الحالية', 'Current Iqama')}</div>
                <div style={{ fontSize: 15, fontWeight: 700, direction: 'ltr', color: calc.expired ? C.red : 'var(--tx)' }}>{fmtD(worker?.iqama_expiry_date)}</div>
              </div>
              {/* الموصل + مدة التجديد */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: C.gold, flex: 1.2 }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <span style={{ height: 2, flex: 1, background: 'rgba(212,160,23,.35)' }} />
                  {lang === 'en'
                    ? <ChevronRight size={18} strokeWidth={2.4} style={{ margin: '0 4px', flexShrink: 0 }} />
                    : <ChevronLeft size={18} strokeWidth={2.4} style={{ margin: '0 4px', flexShrink: 0 }} />}
                  <span style={{ height: 2, flex: 1, background: 'rgba(212,160,23,.35)' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(212,160,23,.14)', border: '1px solid rgba(212,160,23,.3)', borderRadius: 20, padding: '2px 12px', marginTop: 8, whiteSpace: 'nowrap' }}>{f.renewalMonths} {T('شهر', 'mo')}</span>
              </div>
              {/* بعد التجديد */}
              <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.gold, marginBottom: 6 }}>{T('بعد التجديد', 'After Renewal')}</div>
                <div style={{ fontSize: 15, fontWeight: 800, direction: 'ltr', color: C.gold }}>{fmtD(calc.expectedExpiry)}</div>
              </div>
            </div>
          </div>
          {/* كرتا رسوم المكتب + الزائد على العميل */}
          {summaryCards}
          {heroTotal}
        </div>
      )}

      {/* ── تبويب 5: ملخص التكاليف (الإصدار) ── */}
      {tab === 5 && calc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ملخص التكاليف (أخضر) */}
          <div style={{ padding: '10px 14px 8px', borderRadius: 12, background: 'rgba(39,160,70,.04)', border: '1px solid rgba(39,160,70,.25)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: -10, [lang === 'en' ? 'left' : 'right']: 14, background: 'var(--modal-bg)', padding: '0 8px', fontSize: 13, fontWeight: 600, color: C.ok, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Calculator size={12} strokeWidth={2.2} /><span>{T('ملخص التكاليف', 'Cost Summary')}</span></div>
            {(() => {
              const fine1 = parseFloat(cfg.iqamaFine1) || 0
              const fine2 = parseFloat(cfg.iqamaFine2) || 0
              const fineBump = Math.max(0, fine2 - fine1)   // قيمة إضافة المرة الثانية (مثل تسعيرة التنازل)
              // نموذج «كل الرسوم كاملة»: نعرض كل رسم بقيمته الحكومية الكاملة، ثم رسوم المكتب كاملة، ثم
              // «خصم المكتب» = مجموع ما يشمله المكتب من الرسوم الحكومية ضمن الحدود = (الإقامة+الرخصة+التأمين) − الزائد.
              const withinNote = T('ضمن حد المكتب', 'within office cap')
              const cover = Math.max(0, calc.renewalBase + calc.workPermit + calc.medical - calc.govExcess)
              const grossSubtotal = calc.renewalBase + calc.workPermit + calc.medical + calc.profChange + calc.fine + calc.extrasTotal + calc.officeFee
              const items = [
                {
                  label: T('تجديد الإقامة', 'Iqama Renewal'),
                  value: calc.renewalBase,
                  note: calc.iqamaExcess > 0 ? T(`زائد عن حد ${nm(calc.coverIqama)}`, `over ${nm(calc.coverIqama)} cap`) : withinNote,
                  color: null,
                  fineToggle: calc.inGrace,
                },
                ...(calc.fine > 0 ? [{ label: T('غرامة تأخّر الإقامة', 'Iqama Late Fine'), value: calc.fine, note: null, color: C.red }] : []),
                { label: T('رخصة العمل', 'Work Permit'), value: calc.workPermit, note: calc.wpExcess > 0 ? T(`زائد عن حد ${nm(calc.coverWorkPermit)}`, `over ${nm(calc.coverWorkPermit)} cap`) : withinNote, color: null },
                { label: T('التأمين الطبي', 'Medical'), value: calc.medical, note: calc.medInsuredValid ? T('تأمين ساري', 'insured') : (calc.medExcess > 0 ? T(`زائد عن حد ${nm(calc.medGovCover)}`, `over ${nm(calc.medGovCover)} cap`) : withinNote), color: null },
                ...(f.changeProfession ? [{ label: T('تغيير المهنة', 'Occupation Change'), value: calc.profChange, note: calc.profChangeIsFree ? T('مهنة معفاة', 'exempt occupation') : null, color: C.gold }] : []),
                ...(calc.extrasTotal > 0 ? [{ label: T('رسوم إضافية', 'Additional Fees'), value: calc.extrasTotal, note: null, color: null }] : []),
                { label: T('رسوم المكتب كاملة', 'Full Office Fee'), value: calc.officeFee, note: T('تشمل الرسوم الحكومية ضمن الحدود', 'incl. gov fees within limits'), color: C.gold },
              ]
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {stShow('rw_cost') && fShow('rw_cost_rows') && items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--bd2)', fontSize: 12, gap: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                        <span style={{ color: 'var(--tx3)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {it.label}
                          {it.fineToggle && (
                            <button type="button" onClick={() => set('repeatViolation', !f.repeatViolation)}
                              title={f.repeatViolation ? T(`إزالة غرامة المرة الثانية (−${nm(fineBump)})`, `Remove repeat fine (−${nm(fineBump)})`) : T(`إضافة غرامة المرة الثانية (+${nm(fineBump)})`, `Add repeat fine (+${nm(fineBump)})`)}
                              style={{ width: 20, height: 20, borderRadius: '50%', border: 'none', background: f.repeatViolation ? 'rgba(192,57,43,.18)' : 'rgba(212,160,23,.15)', color: f.repeatViolation ? C.red : C.gold, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, transition: '.15s' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                {!f.repeatViolation && <line x1="12" y1="5" x2="12" y2="19" />}
                              </svg>
                            </button>
                          )}
                        </span>
                        {it.note && <span style={{ fontSize: 9.5, fontWeight: 600, color: it.color || 'var(--tx5)' }}>{it.note}</span>}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--tx)', flexShrink: 0 }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(it.value)}</span> {T('ريال', 'SAR')}</span>
                    </div>
                  ))}
                  {/* إجمالي الرسوم — مجموع كل الرسوم الكاملة + رسوم المكتب */}
                  {stShow('rw_cost') && fShow('rw_cost_rows') && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0 2px', fontSize: 14 }}>
                    <span style={{ color: 'var(--tx2)', fontWeight: 500 }}>{T('إجمالي الرسوم', 'Subtotal')}</span>
                    <span style={{ fontWeight: 600, color: 'var(--tx)' }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(grossSubtotal)}</span> {T('ريال', 'SAR')}</span>
                  </div>
                  )}
                  {/* خصم المكتب — مجموع ما يشمله المكتب من الرسوم الحكومية */}
                  {cover > 0 && stShow('rw_cost') && fShow('rw_manual') && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
                      <span style={{ color: '#2ea043', fontWeight: 500, fontSize: 12 }}>{T('خصم المكتب', 'Office Discount')}</span>
                      <span style={{ fontWeight: 600, color: '#2ea043' }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(cover)}</span> {T('ريال', 'SAR')}</span>
                    </div>
                  )}
                  {/* خصم أبشر — صندوق مؤطّر: عنوان عائم + مفتاح تبديل مغروز في الإطار (نفس تصميم نقل الكفالة) */}
                  {stShow('rw_cost') && fShow('rw_absher') && (
                  <div style={{ position: 'relative', background: 'rgba(39,160,70,.04)', border: `1.5px solid ${f.absher_on ? '#27a04673' : 'rgba(39,160,70,.25)'}`, borderRadius: 12, padding: '13px 12px 9px', margin: '8px 0 2px', transition: '.2s' }}>
                    {/* العنوان العائم — أعلى اليمين */}
                    <span style={{ position: 'absolute', top: -9, [lang === 'en' ? 'left' : 'right']: 12, background: 'linear-gradient(rgba(39,160,70,.04),rgba(39,160,70,.04)), var(--modal-bg)', padding: '0 7px', fontSize: 12, fontWeight: 600, color: f.absher_on ? '#27a046' : 'var(--tx3)', display: 'inline-flex', alignItems: 'center', gap: 5, transition: '.2s' }}>
                      <Wallet size={13} strokeWidth={2.2} /> {T('خصم أبشر', 'Absher Discount')}
                    </span>
                    {/* مفتاح التبديل — أعلى اليسار، مغروز في الإطار */}
                    <span style={{ position: 'absolute', top: -11, [lang === 'en' ? 'right' : 'left']: 12, background: 'linear-gradient(rgba(39,160,70,.04),rgba(39,160,70,.04)), var(--modal-bg)', padding: '0 4px', lineHeight: 0 }}>
                      <button type="button" onClick={() => set('absher_on', !f.absher_on)} aria-label={T('تفعيل خصم أبشر', 'Toggle Absher discount')} style={{ width: 34, height: 19, borderRadius: 20, border: 'none', background: f.absher_on ? '#27a046' : 'var(--bd)', position: 'relative', cursor: 'pointer', padding: 0, transition: '.2s', display: 'inline-block', verticalAlign: 'middle' }}>
                        <span style={{ position: 'absolute', top: 2, left: f.absher_on ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: '#fff', transition: '.2s' }} />
                      </button>
                    </span>
                    {/* حقل المبلغ */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, direction: dir, opacity: f.absher_on ? 1 : .5, transition: '.2s' }}>
                      <input type="text" inputMode="decimal" disabled={!f.absher_on || !fEdit('rw_absher')} value={f.absher || ''} onChange={e => set('absher', e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0" style={{ flex: 1, height: 32, padding: '0 12px', borderRadius: 8, border: `1px solid ${f.absher_on ? '#27a0464d' : 'rgba(39,160,70,.22)'}`, background: f.absher_on ? '#27a0460f' : 'rgba(39,160,70,.06)', fontFamily: F, fontSize: 14, fontWeight: 500, color: f.absher_on ? '#27a046' : 'var(--tx5)', outline: 'none', textAlign: 'center', transition: '.2s' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: f.absher_on ? '#27a046' : 'var(--tx5)' }}>{T('ريال', 'SAR')}</span>
                    </div>
                  </div>
                  )}
                  {/* الإجمالي */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 0', marginTop: 2, borderTop: '1px dashed rgba(212,160,23,.25)' }}>
                    <span style={{ color: C.gold, fontWeight: 600, fontSize: 15 }}>{T('الإجمالي', 'Grand Total')}</span>
                    <span style={{ fontWeight: 700, color: C.gold, fontSize: 16 }}><span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{nm(grandTotal)}</span> {T('ريال', 'SAR')}</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )

  // ── بناء صفحات الويزارد ──
  const titles = [T('العامل', 'Worker'), T('التفاصيل', 'Details'), T('التجديد', 'Renewal'), T('التسعيرة', 'Pricing'), T('المراجعة', 'Review'), T('التكلفة', 'Cost')]
  // حسبة سابقة سارية تُعرض كتحذير فقط (في تذييل الصفحة) ولا تعطّل «التالي» — بطلب المستخدم.
  const tab0Valid = !!worker && phoneValid && !workerDataIncomplete
  const pages = titles.map((title, i) => ({
    title,
    content: body,
    valid: i === 0 ? tab0Valid : true,
    error: i === 0 && worker && dupQuote
      ? T(`يوجد حسبة تجديد ${dupQuote.status === 'approved' ? 'مصدّقة' : 'مفوترة'} سارية لهذا العامل (${dupQuote.branch_code || '—'})`, `An active ${dupQuote.status} renewal quote already exists for this worker (${dupQuote.branch_code || '—'})`)
      : (i === 0 && worker && workerDataIncomplete ? T('بيانات العامل غير مكتملة — راجع الموظف المختص', 'Worker data incomplete — contact the responsible employee') : ''),
  }))
  const onNext = () => {
    if (tab === 0 && !tab0Valid) return
    // التأمين الطبي إجباري: لا يُستعلم عن تأمين العامل — يُحتسب الرسم دائماً
    setTab(t => Math.min(5, t + 1))
  }

  return (
    <>
      <FKModal open onClose={() => onClose && onClose()}
        title={T('حسبة تجديد إقامة', 'Iqama Renewal Calc')} Icon={RefreshCw} variant="create"
        width={640} height={700}
        page={tab} pages={pages}
        onNext={onNext} onBack={() => setTab(t => Math.max(0, t - 1))}
        onSubmit={save} submitting={submitting}
        submitLabel={T('إصدار', 'Issue')} submitIcon={Send} />

      {/* ═══ نافذة استعلام التأمين الطبي (CHI) — كابتشا ═══ */}
      {chi.phase !== 'idle' && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlayBg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, padding: 16, fontFamily: F }} dir={lang === 'en' ? 'ltr' : 'rtl'}>
          <style>{`@keyframes rnw-spin{to{transform:rotate(360deg)}}`}</style>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, maxWidth: '94vw', background: 'var(--modal-bg)', borderRadius: 16, border: '1px solid rgba(11,109,61,.4)', padding: 22, boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
            <button onClick={closeChi} style={{ position: 'absolute', top: 12, [lang === 'en' ? 'right' : 'left']: 12, width: 30, height: 30, borderRadius: 8, background: 'var(--bd2)', border: '1px solid var(--bd)', color: 'var(--tx3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            <div style={{ textAlign: lang === 'en' ? 'left' : 'right', paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid var(--bd)', [lang === 'en' ? 'paddingRight' : 'paddingLeft']: 36 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-start' }}>
                <HeartPulse size={22} style={{ color: '#3bb27a' }} />
                <span>{T('التأمين الطبي (CHI)', 'Medical Insurance (CHI)')}</span>
              </div>
            </div>

            {chi.phase === 'loading' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(11,109,61,.18)', borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'rnw-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'var(--tx5)' }}>{T('جاري الاتصال بمنصة التأمين…', 'Connecting to insurance platform…')}</div>
              </div>
            )}

            {chi.phase === 'captcha' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--tx3)', textAlign: lang === 'en' ? 'left' : 'right' }}>{T('أدخل رمز التحقق الظاهر بالصورة', 'Enter the captcha shown in the image')}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 8px' }}>
                  {chi.captchaImage
                    ? <ChiCountdown captchaKey={chi.captchaImage} onExpire={refreshChiCaptcha} color="#3bb27a" />
                    : <div style={{ width: 38, height: 38, flexShrink: 0 }} aria-hidden="true" />}
                  {chi.captchaImage
                    ? <img src={chi.captchaImage} alt="captcha" style={{ height: 72, background: 'transparent', mixBlendMode: 'multiply', imageRendering: 'auto' }} />
                    : <span style={{ fontSize: 14, color: '#888' }}>{T('...جاري التحميل', 'Loading...')}</span>}
                  <button type="button" onClick={refreshChiCaptcha} title={T('رمز تحقق جديد', 'New captcha')} style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', border: 'none', background: 'rgba(11,109,61,.12)', color: '#3bb27a', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <RefreshCw size={16} strokeWidth={2.2} />
                  </button>
                </div>
                <input value={chi.captchaInput} onChange={e => setChi(c => ({ ...c, captchaInput: e.target.value.replace(/\s/g, '').slice(0, 8) }))}
                  onKeyDown={e => { if (e.key === 'Enter') submitChiCaptcha() }} placeholder="______" autoFocus maxLength={8}
                  style={{ height: 48, width: 240, alignSelf: 'center', padding: '0 18px', border: '1px solid var(--bd)', borderRadius: 12, fontFamily: F, fontSize: 20, fontWeight: 700, color: 'var(--tx)', outline: 'none', background: 'var(--bd2)', textAlign: 'center', letterSpacing: '8px', direction: 'ltr' }} />
                {chi.error && <div style={{ fontSize: 12, color: C.red, textAlign: 'center', marginTop: -10, marginBottom: -4 }}>{chi.error}</div>}
                <button onClick={submitChiCaptcha} disabled={!chi.captchaInput || chi.captchaInput.length < 3} style={{ height: 48, width: 240, alignSelf: 'center', borderRadius: 12, border: '1px solid rgba(59,178,122,.55)', background: 'linear-gradient(180deg,#4ac888 0%,#2d9963 100%)', color: '#fff', fontFamily: F, fontSize: 16, fontWeight: 700, cursor: (!chi.captchaInput || chi.captchaInput.length < 3) ? 'not-allowed' : 'pointer', opacity: (!chi.captchaInput || chi.captchaInput.length < 3) ? 0.45 : 1 }}>{T('استعلام', 'Check')}</button>
              </div>
            )}

            {chi.phase === 'verifying' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 0' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(11,109,61,.18)', borderTopColor: '#3bb27a', borderRadius: '50%', animation: 'rnw-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 14, color: 'var(--tx5)' }}>{T('جاري الاستعلام…', 'Checking…')}</div>
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

      {/* ═══ شاشة نجاح إصدار التسعيرة ═══ */}
      {issuedQuote && (() => {
        const CopyBtn = ({ text }) => {
          const [copied, setCopied] = useState(false)
          return (
            <button onClick={() => { try { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1200) } catch {} }} title={T('نسخ', 'Copy')}
              style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(212,160,23,.1)', border: '1px solid rgba(212,160,23,.3)', color: copied ? C.ok : C.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color .15s' }}>
              {copied ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
            </button>
          )
        }
        const row = (label, value, withCopy, isTotal) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: isTotal ? 'rgba(212,160,23,.08)' : 'var(--bd2)', border: `1px solid ${isTotal ? 'rgba(212,160,23,.3)' : 'var(--bd)'}` }}>
            <span style={{ flex: 1, fontSize: 14, color: isTotal ? C.gold : 'var(--tx3)', fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: isTotal ? C.gold : 'var(--tx)', direction: 'ltr' }}>{value}</span>
            {withCopy && <CopyBtn text={String(value)} />}
          </div>
        )
        return (
          <div onClick={() => setIssuedQuote(null)} style={{ position: 'fixed', inset: 0, background: 'var(--overlayBg)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2300, padding: 16, fontFamily: F }} dir={lang === 'en' ? 'ltr' : 'rtl'}>
            <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: '94vw', background: 'var(--modal-bg)', borderRadius: 16, border: '1px solid rgba(39,160,70,.3)', padding: 22, boxShadow: 'var(--shadow-lg)', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0 14px' }}>
                <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'rgba(39,160,70,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#27a046' }}><Check size={32} strokeWidth={2.5} /></div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#27a046', textAlign: 'center' }}>{T('تم إصدار التسعيرة', 'Quote Issued')}</div>
                <div style={{ fontSize: 14, color: 'var(--tx3)', textAlign: 'center', lineHeight: 1.7, padding: '0 4px' }}>{T(`تم إصدار تسعيرة تجديد لـ ${issuedQuote.workerName} بنجاح`, `Renewal quote successfully issued for ${issuedQuote.workerName}`)}</div>
                {issuedQuote.warnings && issuedQuote.warnings.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%', marginTop: 4 }}>
                    {issuedQuote.warnings.map((w, i) => {
                      const clr = w.level === 'danger' ? { bg: 'rgba(192,57,43,.08)', bd: 'rgba(192,57,43,.3)', tx: '#e67265' } : { bg: 'rgba(212,160,23,.08)', bd: 'rgba(212,160,23,.3)', tx: C.gold }
                      return (
                        <div key={i} style={{ background: clr.bg, border: `1px solid ${clr.bd}`, borderRadius: 8, padding: '7px 11px', fontSize: 14, color: clr.tx, fontWeight: 500, lineHeight: 1.55, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                          <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 2 }} /><span>{w.text}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {row(T('رقم طلب التسعيرة', 'Quote No.'), noDash(issuedQuote.quoteNo), true)}
                {row(T('رقم الإقامة', 'Iqama Number'), issuedQuote.iqNo, true)}
                {row(T('الإجمالي', 'Total'), `${nm(issuedQuote.total.toFixed(2))} ${T('ريال', 'SAR')}`, false, true)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <ActionButton dir="back" Icon={lang === 'en' ? ChevronRight : ChevronLeft} color={C.gold} onClick={() => { setIssuedQuote(null); if (typeof onGoToRenewalCalc === 'function') onGoToRenewalCalc(issuedQuote.quoteNo); else onClose && onClose() }}>{T('التسعيرة', 'Quote')}</ActionButton>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
