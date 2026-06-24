/* ════════════════════════════════════════════════════════════════════════
   FormKit — الفورمات الموحّد للنوافذ المنبثقة والحقول في موقع جسر
   ─────────────────────────────────────────────────────────────────────────
   هذا الملف هو "المرجع الواحد" لكل شكل حقل / نافذة في الموقع. أي نافذة جديدة
   تُبنى من هنا فقط — لا تنسخ ستايلات يدوياً.

   الثيم: داكن ثابت (ذهبي #D4A017 على خلفية #1a1a1a) — لا يتغيّر مع وضع الموقع.

   ── المحتويات ──────────────────────────────────────────────────────────
   • التوكنز:        F (الخط) · C (الألوان) · sF (ستايل الحقل) · GRID
   • الهيكل:         Modal · ModalSection (KCard) · ActionButton · Lbl · Field
   • شاشات الحالة:    SuccessScreen · ConfirmDialog
   • الحقول:         TextField · NumberField · CurrencyField · PhoneField
                     IdField · TextArea · Select · MultiSelect · DateField
                     Switch · Segmented · YesNo · Checkbox · RadioGroup · Stepper
   • مساعدات:        Dropdown · CalendarPopup · Flag · fmtDate

   كل حقل يستقبل: label, req, error, hint  →  يرسم العنوان + الحقل بنفسه.
   ════════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useId, useContext, createContext } from 'react'
import ReactDOM from 'react-dom'
import { X, ChevronDown, ChevronLeft, ChevronRight, Check, Search, Save, Calendar as CalIcon, Clock as ClockIcon, Minus, Plus, Upload, Paperclip, AlertTriangle, Info, Trash2, Copy, Circle, CheckCircle2 } from 'lucide-react'

/* ═══════════════════════════════ التوكنز ═══════════════════════════════ */

export const F = "'Cairo','Tajawal',sans-serif"

export const C = {
  gold:    '#D4A017',
  ok:      '#27a046',
  red:     '#c0392b',
  blue:    '#3483b4',
  modal:   '#1a1a1a',                 // خلفية النافذة
  modal2:  '#0f0f0f',                 // خلفية البورتال (دروب داون / تقويم)
  inputBg: 'rgba(0,0,0,.18)',         // خلفية الحقل
  line:    'rgba(255,255,255,.06)',   // فواصل
  tx:      'rgba(255,255,255,.92)',   // نص أساسي
  tx2:     'rgba(255,255,255,.82)',
  tx3:     'rgba(255,255,255,.55)',   // نص ثانوي / تلميح
  tx4:     'rgba(255,255,255,.40)',
  tx5:     'rgba(255,255,255,.28)',   // placeholder
}

/* ─────────────────────── نظام التصميم — التوكنز ──────────────────────────
   مرجع موحّد لكل قياس في الموقع. استورد منه بدل كتابة أرقام يدوية.
   استخدام: style={{ fontSize: TS.title, fontWeight: FW.extrabold }}
   ────────────────────────────────────────────────────────────────────── */

// أحجام الخطوط (px) — السلّم المعتمد
export const TS = {
  hero:    24,   // عنوان صفحة
  title:   20,   // عنوان النافذة / شاشة النجاح
  section: 16,   // عنوان قسم كبير
  body:    14,   // نص / أزرار
  input:   14,   // داخل الحقول وعناصر القوائم
  label:   14,   // عنوان الحقل (Lbl)
  hint:    12,   // تلميح / خطأ صغير / placeholder ثانوي
  micro:   11,   // شارات صغيرة جداً
}

// أوزان الخط — السقف 600 في كل الموقع (لا يتجاوزه أي عنصر).
// التمييز البصري يكون بالحجم واللون، لا بوزن أثقل من 600.
export const FW = {
  regular:  400,
  medium:   500,   // نص ثانوي / placeholder
  semibold: 600,   // عناوين / قيم / عناصر مختارة — الحد الأقصى
}
export const FW_MAX = 600

// أحجام الأيقونات (lucide size=) حسب موضعها
export const IS = {
  title:     26,  // أيقونة عنوان النافذة (مكشوفة ذهبية، بلا مربع — كنمط الفواتير)
  field:     15,  // أيقونة داخل حقل (تقويم، بحث)
  section:   12,  // أيقونة عنوان القسم
  inline:    12,  // شيفرون / علامات صغيرة
  check:     12,  // صح المربعات
  actionBtn: 14,  // أيقونة زر الإجراء (داخل دائرة 32)
}
export const IST = { thin: 1.8, default: 2, bold: 2.2, heavy: 2.5 }   // strokeWidth

// الارتفاعات (px)
export const H = {
  field:      42,  // كل الحقول والأزرار المقسّمة
  actionBtn:  40,  // زر الإجراء
  smallBtn:   30,  // زر صغير داخل القوائم
  iconCircle: 32,  // دائرة أيقونة الزر
  headerBox:  36,  // مربع أيقونة الترويسة + زر الإغلاق
  toggle:    [40, 22], // [عرض, ارتفاع] مفتاح التبديل
  dayCell:    30,  // خلية يوم في التقويم
}

// نصف أقطار الحواف (px)
export const R = {
  modal:   18,
  section: 12,
  field:   9,
  btn:     10,
  chip:    7,
  pill:    999,
}

// المسافات / الفجوات (px)
export const SP = {
  fieldGap:    14,  // بين الحقول في الشبكة
  sectionGap:  12,  // بين الأقسام
  modalPadX:   16,  // حشوة المحتوى الأفقية
  labelGap:    5,   // بين العنوان والحقل
}

// أبعاد جاهزة
export const W = { modal: 720, modalNarrow: 420, confirm: 440, fieldMin: 220 }

// ستايل الحقل المشترك — بلا حدود، يعتمد على ظل داخلي خفيف. هذا أساس كل الحقول.
export const sF = {
  width: '100%', height: 42, padding: '0 14px',
  border: '1px solid transparent', borderRadius: 9,
  fontFamily: F, fontSize: 14, fontWeight: 600,
  color: C.tx, outline: 'none',
  background: C.inputBg, boxSizing: 'border-box',
  boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)',
  textAlign: 'center', transition: '.2s',
}

// شبكة الحقول — عمودين يلتفّان تلقائياً. استعملها لتجميع الحقول.
export const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }
// لجعل حقل يأخذ عرض الصف كامل ضع style={FULL} على غلافه
export const FULL = { gridColumn: '1 / -1' }

const errBorder = err => (err ? C.red + '80' : 'transparent')
// حلقة خطأ بالظل (الحدود معطّلة عالمياً في index.html، فالظل يتجاوز القاعدة)
const SHADOW_BASE = 'inset 0 1px 2px rgba(0,0,0,.2)'
const errRing = err => (err ? `inset 0 0 0 1.6px ${C.red}, ${SHADOW_BASE}` : SHADOW_BASE)

/* ════════════════════════════ فلاتر الإدخال ════════════════════════════ */
const RE_AR = /[^؀-ۿ\s]/g          // عربي + مسافات فقط
const RE_EN = /[^a-zA-Z\s]/g                 // إنجليزي + مسافات فقط
const RE_DIGITS = /\D/g                       // أرقام فقط
const RE_DECIMAL = /[^0-9.]/g                 // أرقام + فاصلة عشرية
export const countWords = s => String(s || '').trim().split(/\s+/).filter(Boolean).length

// فاصلة الألوف للعرض: "1000000.5" → "1,000,000.5" (القيمة المخزّنة تبقى بلا فواصل)
export const fmtThousands = s => {
  if (s == null || s === '') return ''
  const [int, dec] = String(s).split('.')
  const intF = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec != null ? intF + '.' + dec : intF
}

/* ═══════════════════════ تحقق الأرقام الحقيقية ═══════════════════════════
   نمنع الأرقام الوهمية (كل الخانات متطابقة 1111… أو متسلسلة 12345…) في حقول
   الهوية/الإقامة والجوال. تُستخدم داخل IdField/PhoneField وتُصدَّر للاستخدام
   في تحقق الإرسال عند الحاجة. */

// مُعطَّل بناءً على طلب المستخدم: لا نرفض أي رقم بحجّة أنه "وهمي" في أي مكان
// بالبرنامج. نقبل كل الأرقام (حتى 2222222222 / 555555555) ما دامت الصيغة سليمة.
const isFakeNumber = () => false

// تحقق هوية/إقامة: 10 خانات تبدأ بـ1/2/3، وليست رقماً وهمياً.
// بسيط عمداً — لا نرفض أي رقم واقعي، فقط الأنماط الوهمية الواضحة.
// تُرجع نص الخطأ، أو '' إذا صحيحة/غير مكتملة. (لا نُزعج المستخدم قبل اكتمال 10 خانات)
export const validateSaudiId = id => {
  const s = String(id || '')
  if (s.length < 10) return ''
  if (!/^[123]\d{9}$/.test(s)) return 'رقم هوية غير صحيح'
  if (isFakeNumber(s)) return 'أدخل رقم هوية حقيقياً'
  return ''
}

// تحقق جوال سعودي: 9 خانات تبدأ بـ5 وليست وهمية. تُرجع نص الخطأ أو ''.
export const validatePhone = ph => {
  const s = String(ph || '')
  if (s.length < 9) return ''
  if (!/^5\d{8}$/.test(s)) return 'رقم جوال غير صحيح'
  if (isFakeNumber(s)) return 'أدخل رقم جوال حقيقياً'
  return ''
}

/* ═══════════════════════════ التاريخ (الصيغة) ══════════════════════════ */
// صيغة التخزين والكتابة الموحّدة في كل الموقع: yyyy-mm-dd (ميلادي)
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
const DAYS_AR   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
const DAYS_SHORT = ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت']   // مختصرة كي لا تتداخل في التقويم
const pad2 = n => String(n).padStart(2, '0')
export const fmtDate = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`           // (m صفري)
// عرض التاريخ للمستخدم: "12 مايو 2026"
export const fmtDateLong = v => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return v || ''
  const [y, m, d] = v.split('-').map(Number)
  return `${d} ${MONTHS_AR[m - 1]} ${y}`
}
// الوقت — صيغة التخزين الموحّدة: "HH:MM" (24 ساعة). العرض للمستخدم بنظام 12 ساعة + ص/م.
export const fmtTime12 = v => {
  if (!/^\d{2}:\d{2}$/.test(v || '')) return v || ''
  let [h, m] = v.split(':').map(Number)
  const ampm = h < 12 ? 'ص' : 'م'
  let h12 = h % 12; if (h12 === 0) h12 = 12
  return `${h12}:${pad2(m)} ${ampm}`
}

/* ════════════════════════════════ Lbl ═════════════════════════════════ */
// عنوان الحقل — موحّد. req = نجمة حمراء للحقل الإلزامي.
export const Lbl = ({ children, req, hint, err }) => (
  <div style={{ fontSize: 14, fontWeight: 600, color: err ? C.red : C.tx, marginBottom: 9, textAlign: 'start', display: 'flex', alignItems: 'baseline', gap: 6, transition: '.15s' }}>
    <span>{children}{req && <span style={{ color: C.red }}> *</span>}</span>
    {hint && <span style={{ fontSize: 10, fontWeight: 600, color: C.tx5 }}>{hint}</span>}
  </div>
)

// غلاف حقل: عنوان + المحتوى + رسالة خطأ. كل الحقول الجاهزة تستخدمه داخلياً.
export const Field = ({ label, req, hint, error, full, style, children }) => (
  <div style={{ ...(full ? FULL : {}), ...style }}>
    {label && <Lbl req={req} hint={hint} err={!!error}>{label}</Lbl>}
    {children}
    {error && typeof error === 'string' && (
      <div style={{ fontSize: 10, fontWeight: 600, color: C.red, marginTop: 4, textAlign: 'start' }}>{error}</div>
    )}
  </div>
)

// لون النافذة الأساسي يُمرَّر للأقسام عبر هذا الـContext (تضبطه Modal حسب variant).
export const AccentContext = createContext(C.gold)

/* ═══════════════════════════ ModalSection (KCard) ══════════════════════ */
// بطاقة بإطار وعنوان مقطوع في الأعلى — لونها يتبع لون النافذة الأساسي.
export const ModalSection = ({ Icon, label, hint, children, style, bodyStyle, flex }) => {
  const ac = useContext(AccentContext)
  return (
    <div style={{ borderRadius: 12, border: `1.5px solid ${ac}59`, padding: '18px 14px 14px', position: 'relative', marginTop: 20, transition: '.2s', ...(flex ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}), ...style }}>
      <div style={{ position: 'absolute', top: -9, right: 14, background: C.modal, padding: '0 8px', fontSize: 12, fontWeight: 600, color: ac, fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {Icon && <Icon size={12} strokeWidth={2.2} />}
        <span>{label}</span>
        {hint && <span style={{ fontSize: 11, fontWeight: 500, color: C.tx4, marginInlineStart: 4 }}>{hint}</span>}
      </div>
      <div style={flex ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...bodyStyle } : bodyStyle}>{children}</div>
    </div>
  )
}
export { ModalSection as KCard }

/* ════════════════════════════ الدروب داون ═════════════════════════════ */
// Dropdown أساسي بالبورتال + بحث + خلية مخصّصة. هو محرّك Select / MultiSelect.
export const Dropdown = ({ value, onChange, options, placeholder, getKey, getLabel, getSub, searchable = true, renderCell, renderSelected, error, multi = false, selectedKeys, disabled = false }) => {
  const ac = useContext(AccentContext)
  const btnRef = useRef(null)
  const portalRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxH: 300 })
  const getK = getKey || (o => o)
  const getL = getLabel || (o => String(o))
  const filtered = q
    ? options.filter(o => getL(o).toLowerCase().includes(q.toLowerCase()) || (getSub?.(o) || '').toLowerCase().includes(q.toLowerCase()))
    : options

  const toggle = () => {
    if (disabled) return
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const below = window.innerHeight - r.bottom - 16
      const above = r.top - 16
      const flipUp = below < 120 && above > below + 40
      const maxH = Math.max(120, Math.min(260, flipUp ? above : below))
      setPos({ top: flipUp ? r.top - maxH - 4 : r.bottom + 4, left: r.left, width: r.width, maxH })
    }
    setQ('')
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const onDoc = e => {
      if (btnRef.current && btnRef.current.contains(e.target)) return
      if (portalRef.current && portalRef.current.contains(e.target)) return
      setOpen(false)
    }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const selKeys = multi ? (selectedKeys || []) : []
  const selected = !multi ? options.find(o => getK(o) === value) : null
  const isChosen = o => multi ? selKeys.includes(getK(o)) : value === getK(o)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ ...sF, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: (selected || selKeys.length) ? C.tx : C.tx5, boxShadow: errRing(error), padding: '0 32px', position: 'relative' }}>
        <span style={{ flex: 1, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: (selected || selKeys.length) ? 600 : 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {multi
            ? (selKeys.length ? `${selKeys.length} مُختار` : (placeholder || '...'))
            : (selected ? (renderSelected ? renderSelected(selected) : getL(selected)) : (placeholder || '...'))}
        </span>
        <ChevronDown size={12} color={ac} strokeWidth={2.5}
          style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }} />
      </button>
      {open && ReactDOM.createPortal(
        <div ref={portalRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, background: C.modal2, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, maxHeight: pos.maxH, display: 'flex', flexDirection: 'column', zIndex: 3000, boxShadow: '0 12px 40px rgba(0,0,0,.7)', overflow: 'hidden', direction: 'rtl', fontFamily: F }}>
          <style>{`.fk-dd-scroll::-webkit-scrollbar{width:0;display:none}.fk-dd-scroll{scrollbar-width:none;-ms-overflow-style:none}
            .fk-dd-search{border:1px solid ${ac}73!important}
            .fk-dd-search:focus{border:1px solid ${ac}!important;box-shadow:0 0 0 1px ${ac}33, inset 0 1px 2px rgba(0,0,0,.2)!important}`}</style>
          {searchable && options.length > 5 && (
            <div style={{ padding: 8, borderBottom: `1px solid ${C.line}`, flexShrink: 0, position: 'relative' }}>
              {/* أيقونة على اليسار + حدّ بلون النافذة عند التركيز (سماوي للتعديل · ذهبي للإضافة) */}
              <Search size={14} color={ac} style={{ position: 'absolute', top: '50%', left: 20, transform: 'translateY(-50%)', pointerEvents: 'none', transition: '.15s' }} />
              <input className="fk-dd-search" value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث..." autoFocus
                style={{ width: '100%', height: 32, padding: '0 10px 0 34px', borderRadius: 7, background: 'rgba(0,0,0,.2)', fontFamily: F, fontSize: 12, fontWeight: 600, color: C.tx, outline: 'none', boxSizing: 'border-box', textAlign: 'center', transition: '.15s' }} />
            </div>
          )}
          <div className="fk-dd-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.tx5 }}>لا توجد نتائج</div>}
            {filtered.slice(0, 200).map(o => {
              const k = getK(o)
              const sel = isChosen(o)
              return (
                <div key={k} onClick={() => {
                    if (multi) { onChange(selKeys.includes(k) ? selKeys.filter(x => x !== k) : [...selKeys, k], o) }
                    else { onChange(k, o); setOpen(false); setQ('') }
                  }}
                  style={{ position: 'relative', padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,.03)', background: sel ? ac + '1a' : 'transparent', transition: '.12s', display: 'flex', alignItems: 'center', gap: 8, flexDirection: multi ? 'row' : 'column', justifyContent: multi ? 'flex-start' : 'center' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = ac + '1a' }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent' }}>
                  {multi && <span style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${sel ? ac : 'rgba(255,255,255,.2)'}`, background: sel ? ac : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{sel && <Check size={11} color="#000" strokeWidth={3.5} />}</span>}
                  {renderCell ? renderCell(o, sel) : (
                    <span style={{ fontSize: 14, fontWeight: 600, color: sel ? ac : 'rgba(255,255,255,.92)', textAlign: multi ? 'start' : 'center', flex: multi ? 1 : undefined, display: 'inline-flex', alignItems: 'center', gap: 8 }}>{getL(o)}</span>
                  )}
                  {!multi && !renderCell && getSub && getSub(o) && <span style={{ fontSize: 11, color: C.tx3, textAlign: 'center' }}>{getSub(o)}</span>}
                  {/* علامة صح للعنصر المختار — مكشوفة بلون النوع */}
                  {!multi && sel && <Check size={16} color={ac} strokeWidth={3} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />}
                </div>
              )
            })}
          </div>
        </div>, document.body
      )}
    </div>
  )
}

/* ════════════════════════════ التقويم (الكلايندر) ═════════════════════ */
const CalendarPopup = ({ value, onPick, onClose, anchor, min, max }) => {
  const ac = useContext(AccentContext)
  const today = new Date()
  const parsed = value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').map(Number) : null
  const initial = parsed ? { y: parsed[0], m: parsed[1] - 1 } : { y: today.getFullYear(), m: today.getMonth() }
  const [cur, setCur] = useState(initial)
  const firstDay = new Date(cur.y, cur.m, 1).getDay()
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate()
  const prevMonth = () => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })
  const nextMonth = () => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const isToday = (y, m, d) => today.getFullYear() === y && today.getMonth() === m && today.getDate() === d
  const navBtn = { width: 28, height: 28, borderRadius: 7, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.03)', color: ac, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, transition: '.15s' }
  const POPUP_H = 320, POPUP_W = Math.max(392, anchor.width)
  const flipUp = (window.innerHeight - anchor.bottom) < POPUP_H + 10
  const top = flipUp ? Math.max(8, anchor.top - POPUP_H - 6) : anchor.bottom + 6
  const left = Math.max(8, Math.min(window.innerWidth - POPUP_W - 8, anchor.left + anchor.width / 2 - POPUP_W / 2))
  return ReactDOM.createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 3000 }} />
      <div style={{ position: 'fixed', top, left, width: POPUP_W, background: C.modal2, border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: 12, zIndex: 3001, boxShadow: '0 12px 40px rgba(0,0,0,.7)', fontFamily: F, direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, direction: 'ltr' }}>
          <button type="button" onClick={prevMonth} style={navBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{MONTHS_AR[cur.m]} {cur.y}</div>
          <button type="button" onClick={nextMonth} style={navBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 10, fontWeight: 600, color: C.tx4, marginBottom: 6 }}>
          {DAYS_AR.map((d, i) => <div key={i} style={{ textAlign: 'center', padding: '4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const s = fmtDate(cur.y, cur.m, d)
            const isSel = value === s
            const isTd = isToday(cur.y, cur.m, d)
            const off = (min && s < min) || (max && s > max)   // خارج النطاق المسموح
            return (
              <button key={i} type="button" disabled={off} onClick={() => { if (off) return; onPick(s); onClose() }}
                onMouseEnter={e => { if (!isSel && !off) e.currentTarget.style.background = ac + '16' }}
                onMouseLeave={e => { if (!isSel && !off) e.currentTarget.style.background = isTd ? ac + '0a' : 'transparent' }}
                style={{ height: 30, borderRadius: 6, border: isTd && !isSel && !off ? `1px solid ${ac}55` : '1px solid transparent', background: isSel && !off ? ac : (isTd && !off ? ac + '0a' : 'transparent'), color: off ? 'rgba(255,255,255,.2)' : (isSel ? '#000' : (isTd ? ac : 'rgba(255,255,255,.8)')), fontFamily: F, fontSize: 12, fontWeight: isSel || isTd ? 600 : 500, cursor: off ? 'not-allowed' : 'pointer', transition: '.15s', padding: 0, textDecoration: off ? 'line-through' : 'none' }}>
                {d}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
          {(() => { const t = new Date(); const ts = fmtDate(t.getFullYear(), t.getMonth(), t.getDate()); const off = (min && ts < min) || (max && ts > max); return (
          <button type="button" disabled={off} onClick={() => { if (off) return; onPick(ts); onClose() }} style={{ fontSize: 11, color: off ? 'rgba(255,255,255,.25)' : ac, background: 'transparent', border: 'none', cursor: off ? 'not-allowed' : 'pointer', fontFamily: F, fontWeight: 600, padding: '4px 8px' }}>اليوم</button>
          ) })()}
          <button type="button" onClick={() => { onPick(''); onClose() }} style={{ fontSize: 11, color: C.tx3, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: F, fontWeight: 600, padding: '4px 8px' }}>مسح</button>
        </div>
      </div>
    </>, document.body)
}

/* ══════════════════════════════ Flag ══════════════════════════════════ */
// علم الدولة من flagcdn (ISO alpha-2 مثل 'SA' 'PK')
export const Flag = ({ code, size = 18 }) => {
  if (!code) return null
  const c = code.toLowerCase()
  return <img src={`https://flagcdn.com/w40/${c}.png`} srcSet={`https://flagcdn.com/w80/${c}.png 2x`} width={size} height={Math.round(size * 0.75)} alt="" style={{ borderRadius: 2, objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }} />
}

/* ════════════════════════════════════════════════════════════════════════
   الحقول الجاهزة — كلها تستقبل label / req / error / hint وترسم نفسها كاملة
   ════════════════════════════════════════════════════════════════════════ */

// نص عام. filter: 'ar' | 'en' | undefined ، upper لتحويل لحروف كبيرة (أسماء إنجليزية)
export const TextField = ({ label, req, error, hint, value, onChange, placeholder, dir = 'rtl', align = 'center', filter, upper, maxLength, full, disabled }) => {
  const clean = v => {
    let s = v
    if (filter === 'ar') s = s.replace(RE_AR, '')
    else if (filter === 'en') s = s.replace(RE_EN, '')
    else if (filter === 'digits') s = s.replace(RE_DIGITS, '')
    if (upper) s = s.toUpperCase()
    if (maxLength) s = s.slice(0, maxLength)
    return s
  }
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      <input value={value || ''} onChange={e => onChange(clean(e.target.value))} placeholder={placeholder} dir={dir} disabled={disabled}
        style={{ ...sF, direction: dir, textAlign: align, textTransform: upper ? 'uppercase' : 'none', boxShadow: errRing(error), ...(disabled ? { opacity: .5, cursor: 'not-allowed' } : {}) }} />
    </Field>
  )
}

// رقم صحيح. min/max اختياري.
export const NumberField = ({ label, req, error, hint, value, onChange, placeholder, min, max, full }) => (
  <Field label={label} req={req} error={error} hint={hint} full={full}>
    <input value={value ?? ''} inputMode="numeric"
      onChange={e => {
        let v = e.target.value.replace(RE_DIGITS, '')
        if (v !== '') { let n = parseInt(v, 10); if (min != null && n < min) n = min; if (max != null && n > max) n = max; v = String(n) }
        onChange(v)
      }}
      placeholder={placeholder} dir="ltr"
      style={{ ...sF, direction: 'ltr', textAlign: 'center', letterSpacing: '.5px', boxShadow: errRing(error) }} />
  </Field>
)

// مبلغ بالريال — الرقم و"ريال" مجموعة واحدة في منتصف الحقل.
// big: نسخة بارزة للحقل الأساسي (مثل المبلغ المدفوع) — أطول وأكبر خطّاً مع إبقاء شكل الإدخال
// العادي (خلفية غامقة) كي يبان كحقل إدخال لا كعرض؛ البروز من الحجم لا من التلوين.
export const CurrencyField = ({ label, req, error, hint, value, onChange, placeholder = '0.00', unit = 'ريال', full, padX, big }) => {
  const ac = useContext(AccentContext)
  const display = fmtThousands(value)
  const widthCh = Math.max(4, (display || placeholder).length) + 1
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full} style={padX ? { paddingLeft: padX, paddingRight: padX } : undefined}>
      <div style={{ display: 'flex', direction: 'ltr', alignItems: 'center', justifyContent: 'center', gap: big ? 8 : 6, border: '1px solid transparent', borderRadius: big ? 12 : 9, background: C.inputBg, boxShadow: errRing(error), height: big ? 58 : 42 }}>
        <span style={{ fontSize: big ? 16 : 14, fontWeight: 600, color: ac, flexShrink: 0 }}>{unit}</span>
        <input value={display} inputMode="decimal"
          onChange={e => { let v = e.target.value.replace(/,/g, '').replace(RE_DECIMAL, ''); const p = v.split('.'); if (p.length > 2) v = p[0] + '.' + p.slice(1).join(''); onChange(v) }}
          placeholder={placeholder}
          style={{ width: widthCh + 'ch', maxWidth: '70%', height: '100%', padding: 0, border: 'none', background: 'transparent', fontFamily: F, fontSize: big ? 26 : 14, fontWeight: big ? 700 : 600, color: C.tx, outline: 'none', textAlign: 'center', letterSpacing: big ? '.5px' : undefined }} />
      </div>
    </Field>
  )
}

// جوال سعودي — بادئة +966 ثابتة، 9 أرقام تبدأ بـ 5.
export const PhoneField = ({ label, req, error, hint, value, onChange, full, silent }) => {
  const ac = useContext(AccentContext)
  // silent: لا نلوّن الحقل ولا نُظهر ملاحظة تحته — التحقق يُعرض في الشريط السفلي للنافذة بدلاً منه.
  const err = silent ? (error || '') : (error || validatePhone(value))  // خطأ خارجي أو تحقق داخلي
  return (
    <Field label={label} req={req} error={err} hint={hint} full={full}>
      <div style={{ display: 'flex', direction: 'ltr', border: '1px solid transparent', borderRadius: 9, overflow: 'hidden', background: C.inputBg, boxShadow: errRing(err), height: 42 }}>
        <div style={{ height: '100%', padding: '0 10px', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600, color: ac, flexShrink: 0 }}>+966</div>
        <input value={value || ''} onChange={e => onChange(e.target.value.replace(RE_DIGITS, '').replace(/^[^5]+/, '').slice(0, 9))} placeholder="5X XXX XXXX" maxLength={9}
          style={{ width: '100%', height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 600, color: C.tx, outline: 'none', textAlign: 'left' }} />
      </div>
    </Field>
  )
}

// قائمة جوالات سعودية — مصفوفة أرقام مخزّنة بصيغة 9665XXXXXXXX (نفس صيغة عمود phone
// في الموقع). الإدخال محلي (5XXXXXXXX) ثم زر «إضافة» أو Enter؛ كل رقم يظهر كشريحة
// قابلة للحذف بصيغة العرض 05XXXXXXXX. تتفادى تكرار نفس الرقم تلقائياً.
export const PhoneListField = ({ label, req, error, hint, value, onChange, full, addTitle = 'إضافة رقم' }) => {
  const ac = useContext(AccentContext)
  const list = Array.isArray(value) ? value.filter(Boolean) : []
  const [draft, setDraft] = useState('')
  const localOf = v => String(v || '').replace(RE_DIGITS, '').replace(/^966/, '').replace(/^0/, '').slice(-9)
  const disp = v => { const s = localOf(v); return s ? '0' + s : '' }
  const ready = /^5\d{8}$/.test(draft)
  const add = () => {
    if (!ready) return
    if (list.some(x => localOf(x) === draft)) { setDraft(''); return }   // تفادي التكرار
    onChange([...list, '966' + draft]); setDraft('')
  }
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', direction: 'ltr', border: '1px solid transparent', borderRadius: 9, overflow: 'hidden', background: C.inputBg, boxShadow: errRing(error), height: 42 }}>
          <div style={{ height: '100%', padding: '0 10px', background: 'rgba(255,255,255,.04)', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600, color: ac, flexShrink: 0 }}>+966</div>
          <input value={draft} onChange={e => setDraft(e.target.value.replace(RE_DIGITS, '').replace(/^[^5]+/, '').slice(0, 9))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="5X XXX XXXX" maxLength={9}
            style={{ width: '100%', height: '100%', padding: '0 12px', border: 'none', background: 'transparent', fontFamily: F, fontSize: 14, fontWeight: 600, color: C.tx, outline: 'none', textAlign: 'left' }} />
        </div>
        <button type="button" onClick={add} disabled={!ready} title={addTitle}
          style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 9, border: 'none', background: ac + '1f', color: ac, cursor: ready ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ready ? 1 : .4, transition: '.15s' }}>
          <Plus size={18} strokeWidth={2.4} />
        </button>
      </div>
      {list.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {list.map((v, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 11px', borderRadius: 8, border: `1px solid ${ac}40`, background: `${ac}0d` }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.tx, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>{disp(v)}</span>
              <button type="button" onClick={() => onChange(list.filter((_, idx) => idx !== i))}
                style={{ width: 18, height: 18, borderRadius: 5, border: 'none', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  )
}

// رقم هوية/إقامة — 10 خانات، بادئة أولى اختيارية (1 وطنية / 2 إقامة).
export const IdField = ({ label, req, error, hint, value, onChange, prefix, placeholder = 'XXXXXXXXXX', full, silent, disabled }) => {
  // silent: لا نلوّن الحقل ولا نُظهر ملاحظة تحته — التحقق يُعرض في الشريط السفلي للنافذة بدلاً منه.
  const err = silent ? (error || '') : (error || validateSaudiId(value))   // خطأ خارجي أو تحقق داخلي
  return (
    <Field label={label} req={req} error={err} hint={hint} full={full}>
      <input value={value || ''} dir="ltr" maxLength={10} disabled={disabled}
        onChange={e => { let v = e.target.value.replace(RE_DIGITS, '').slice(0, 10); if (prefix) { if (v && v[0] !== prefix) v = prefix + v.slice(1) } else { v = v.replace(/^[^123]+/, '') } onChange(v) }}
        placeholder={prefix ? prefix + placeholder.slice(1) : placeholder}
        style={{ ...sF, direction: 'ltr', textAlign: 'center', letterSpacing: '.5px', boxShadow: errRing(err), ...(disabled ? { opacity: .5, cursor: 'not-allowed' } : {}) }} />
    </Field>
  )
}

// نص طويل.
export const TextArea = ({ label, req, error, hint, value, onChange, placeholder, rows = 3, dir = 'rtl', full = true }) => (
  <Field label={label} req={req} error={error} hint={hint} full={full}>
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} dir={dir}
      style={{ ...sF, height: 'auto', minHeight: rows * 22 + 16, padding: '10px 14px', textAlign: dir === 'ltr' ? 'left' : 'right', resize: 'vertical', lineHeight: 1.7, boxShadow: errRing(error) }} />
  </Field>
)

// حقل إرفاق ملف — اسحب وأفلت أو اضغط للاختيار.
// مفرد: value = ملف File (أو null). متعدّد (multiple): value = مصفوفة ملفات.
// compact: منطقة إفلات أصغر (لتوفير الارتفاع).
export const FileField = ({ label, req, error, hint, value, onChange, accept = 'image/*,application/pdf', full = true, multiple = false, compact = false }) => {
  const ac = useContext(AccentContext)
  const inputId = useId()
  const [drag, setDrag] = useState(false)
  const fmtSize = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB'
  const files = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : [])
  const add = list => {
    const arr = Array.from(list || []).filter(Boolean)
    if (!arr.length) return
    onChange(multiple ? [...files, ...arr] : arr[0])
  }
  const removeAt = i => onChange(multiple ? files.filter((_, idx) => idx !== i) : null)
  const showDrop = multiple || files.length === 0
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      {showDrop && (
        <label htmlFor={inputId}
          onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDrag(true) }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (!drag) setDrag(true) }}
          onDragLeave={e => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setDrag(false) }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); setDrag(false); add(e.dataTransfer.files) }}
          style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: compact ? 44 : 96, padding: compact ? '8px 14px' : '16px', borderRadius: 10, border: `1.5px dashed ${drag ? ac : (error ? C.red : ac + '59')}`, background: drag ? ac + '1a' : C.inputBg, cursor: 'pointer', transition: '.18s', transform: drag ? 'scale(1.01)' : 'scale(1)' }}>
          <Upload size={compact ? 18 : 22} color={ac} strokeWidth={2} />
          <div style={{ fontSize: compact ? 12 : 13, fontWeight: 600, color: C.tx2 }}>{drag ? (multiple ? 'أفلت الملفات هنا' : 'أفلت الملف هنا') : (multiple ? 'اسحب ملفات أو اضغط للإرفاق' : 'اسحب ملف هنا أو اضغط للإرفاق')}</div>
          <input id={inputId} type="file" accept={accept} multiple={multiple} onChange={e => { add(e.target.files); e.target.value = '' }} style={{ display: 'none' }} />
        </label>
      )}
      {files.length > 0 && (
        multiple ? (
          // عرض متعدّد — شارات صغيرة تلتف بسطور؛ ارتفاع محدود يتمرّر داخلياً فقط عند الكثرة.
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: showDrop ? 8 : 0, maxHeight: 104, overflowY: 'auto', paddingInlineEnd: 2 }}>
            {files.map((f, i) => (
              <span key={i} title={`${f.name} · ${fmtSize(f.size)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%', padding: '5px 6px 5px 10px', borderRadius: 8, border: `1px solid ${C.ok}40`, background: `${C.ok}0d` }}>
                <Paperclip size={12} color={C.ok} strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.tx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150, direction: 'ltr' }}>{f.name}</span>
                <button type="button" onClick={() => removeAt(i)} style={{ width: 18, height: 18, borderRadius: 5, border: 'none', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          // عرض مفرد — يأخذ نفس مساحة كرت الإرفاق (نفس الارتفاع والحشو والشكل) فلا يقفز الحجم عند الإرفاق.
          <div style={{ position: 'relative', display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: compact ? 10 : 8, minHeight: compact ? 44 : 96, padding: compact ? '8px 14px' : '16px', borderRadius: 10, border: `1px solid ${C.ok}40`, background: `${C.ok}0d` }}>
            <Paperclip size={compact ? 16 : 22} color={C.ok} strokeWidth={2} style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, maxWidth: '100%', flex: compact ? 1 : 'none', textAlign: compact ? 'start' : 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'ltr' }}>{files[0].name}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: C.tx4, marginTop: compact ? 0 : 2 }}>{fmtSize(files[0].size)}</div>
            </div>
            <button type="button" onClick={() => removeAt(0)}
              style={{ ...(compact ? { position: 'static' } : { position: 'absolute', top: 8, insetInlineEnd: 8 }), width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(192,57,43,.15)', color: C.red, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <X size={13} />
            </button>
          </div>
        )
      )}
    </Field>
  )
}

// قائمة منسدلة (اختيار واحد). options + getKey/getLabel كما في Dropdown.
export const Select = ({ label, req, error, hint, full, ...dd }) => (
  <Field label={label} req={req} error={error} hint={hint} full={full}>
    <Dropdown error={!!error} {...dd} />
  </Field>
)

// قائمة منسدلة (اختيار متعدّد). value = مصفوفة مفاتيح.
export const MultiSelect = ({ label, req, error, hint, full, value, onChange, ...dd }) => (
  <Field label={label} req={req} error={error} hint={hint} full={full}>
    <Dropdown multi error={!!error} selectedKeys={value || []} onChange={onChange} {...dd} />
  </Field>
)

// حالة فارغة موحّدة — أيقونة ذهبية + عنوان + وصف داخل بطاقة بحدّ منقّط.
// استعملها في كل القوائم/التبويبات الفارغة لتوحيد الشكل عبر الموقع.
// icon: عقدة SVG اختيارية (مرّر أيقونة مناسبة للسياق)؛ يسقط لأيقونة عامة إن لم تُمرَّر.
export const EmptyState = ({ icon, title, desc, style }) => (
  <div style={{ padding: '34px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, border: '1px dashed rgba(255,255,255,.1)', borderRadius: 14, ...style }}>
    <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(212,160,23,.08)', border: '1px solid rgba(212,160,23,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon || (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>
      )}
    </div>
    <div style={{ fontSize: 13.5, color: C.tx2, fontWeight: 600, fontFamily: F, textAlign: 'center' }}>{title}</div>
    {desc && <div style={{ fontSize: 11, color: C.tx4, fontFamily: F, textAlign: 'center', lineHeight: 1.6 }}>{desc}</div>}
  </div>
)

// حقل تاريخ — كتابة yyyy-mm-dd + أيقونة تقويم تفتح الكلايندر.
export const DateField = ({ label, req, error, hint, value, onChange, full, min, max }) => {
  const ac = useContext(AccentContext)
  const wrapRef = useRef(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value])
  const handleType = t => {
    let v = t.replace(/[^0-9-]/g, '')
    if (v.length > 4 && v[4] !== '-') v = v.slice(0, 4) + '-' + v.slice(4)
    if (v.length > 7 && v[7] !== '-') v = v.slice(0, 7) + '-' + v.slice(7)
    v = v.slice(0, 10)
    if (v.length >= 7) { const m = parseInt(v.slice(5, 7), 10); if (m > 12) v = v.slice(0, 5) + '12' + v.slice(7); else if (m === 0) v = v.slice(0, 5) + '01' + v.slice(7) }
    if (v.length >= 10) { const d = parseInt(v.slice(8, 10), 10); if (d > 31) v = v.slice(0, 8) + '31'; else if (d === 0) v = v.slice(0, 8) + '01' }
    setText(v)
    if (/^\d{4}-\d{2}-\d{2}$/.test(v) || v === '') onChange(v)
  }
  const openPicker = () => {
    if (!pickerOpen && wrapRef.current) { const r = wrapRef.current.getBoundingClientRect(); setAnchor({ top: r.top, bottom: r.bottom, left: r.left, width: r.width }) }
    setPickerOpen(o => !o)
  }
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      {/* الأيقونة في أقصى اليسار، والتاريخ في منتصف الحقل */}
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: 42 }}>
        <input type="text" value={text} onChange={e => handleType(e.target.value)} placeholder="yyyy-mm-dd"
          style={{ ...sF, direction: 'ltr', textAlign: 'center', letterSpacing: '.5px', cursor: 'text', boxShadow: errRing(error) }} />
        <button type="button" onClick={openPicker} aria-label="calendar"
          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, border: 'none', background: pickerOpen ? ac + '1f' : 'transparent', cursor: 'pointer', color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 7, transition: '.15s' }}>
          <CalIcon size={15} strokeWidth={2.2} />
        </button>
        {pickerOpen && anchor && <CalendarPopup value={value} onPick={onChange} onClose={() => setPickerOpen(false)} anchor={anchor} min={min} max={max} />}
      </div>
    </Field>
  )
}

// مفتاح تبديل (on/off). لونه عند التشغيل أخضر افتراضياً (color لتغييره).
export const Switch = ({ label, hint, checked, onChange, full, color = C.ok }) => (
  <Field full={full}>
    <div onClick={() => onChange(!checked)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 9, background: C.inputBg, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', cursor: 'pointer', height: 42 }}>
      <div style={{ textAlign: 'start' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.tx }}>{label}</div>
        {hint && <div style={{ fontSize: 10, color: C.tx4, marginTop: 1 }}>{hint}</div>}
      </div>
      <div style={{ width: 40, height: 22, borderRadius: 11, background: checked ? color : 'rgba(255,255,255,.12)', position: 'relative', flexShrink: 0, transition: '.2s' }}>
        <div style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '.2s' }} />
      </div>
    </div>
  </Field>
)

// أزرار مقسّمة (اختيار واحد ظاهر). options: [{v, l, c?, sub?}]
export const Segmented = ({ label, req, error, hint, options, value, onChange, height = 42, full }) => (
  <Field label={label} req={req} error={error} hint={hint} full={full}>
    <div style={{ display: 'flex', gap: 6, height }}>
      {options.map(o => {
        const sel = value === o.v
        const clr = o.c || C.gold
        return (
          <button key={String(o.v)} type="button" onClick={() => onChange(o.v)} style={{ flex: 1, borderRadius: 9, border: `1px solid ${sel ? clr + '80' : 'rgba(255,255,255,.08)'}`, background: sel ? clr + '14' : C.inputBg, color: sel ? clr : C.tx3, fontFamily: F, fontSize: 14, fontWeight: sel ? 600 : 500, cursor: 'pointer', transition: '.18s', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: sel ? 'none' : 'inset 0 1px 2px rgba(0,0,0,.2)' }}>
            {sel ? <CheckCircle2 size={16} strokeWidth={2} style={{ flexShrink: 0 }} /> : <Circle size={16} strokeWidth={2} style={{ flexShrink: 0, opacity: .5 }} />}
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span>{o.l}</span>
              {o.sub && <span style={{ fontSize: 10, opacity: .6 }}>{o.sub}</span>}
            </span>
          </button>
        )
      })}
    </div>
  </Field>
)

// نعم / لا
export const YesNo = ({ label, req, error, hint, value, onChange, full }) => (
  <Segmented label={label} req={req} error={error} hint={hint} value={value} onChange={onChange} full={full}
    options={[{ v: true, l: 'نعم', c: C.ok }, { v: false, l: 'لا', c: C.blue }]} />
)

// مربع اختيار واحد
export const Checkbox = ({ label, checked, onChange }) => {
  const ac = useContext(AccentContext)
  return (
    <div onClick={() => onChange(!checked)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? ac : 'rgba(255,255,255,.2)'}`, background: checked ? ac : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: '.15s' }}>{checked && <Check size={12} color="#000" strokeWidth={3} />}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.tx2 }}>{label}</span>
    </div>
  )
}

// مجموعة خيارات دائرية (اختيار واحد). options: [{v, l}]
export const RadioGroup = ({ label, req, error, hint, options, value, onChange, full }) => {
  const ac = useContext(AccentContext)
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {options.map(o => {
          const sel = value === o.v
          return (
            <div key={String(o.v)} onClick={() => onChange(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: `1px solid ${sel ? ac + '66' : 'transparent'}`, background: sel ? ac + '10' : C.inputBg, cursor: 'pointer', transition: '.15s' }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${sel ? ac : 'rgba(255,255,255,.2)'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{sel && <span style={{ width: 9, height: 9, borderRadius: '50%', background: ac }} />}</span>
              <span style={{ fontSize: 14, fontWeight: sel ? 600 : 500, color: sel ? C.tx : C.tx2 }}>{o.l}</span>
            </div>
          )
        })}
      </div>
    </Field>
  )
}

// عدّاد (− عدد +)
export const Stepper = ({ label, req, error, hint, value, onChange, min = 0, max = 9999, step = 1, full }) => {
  const ac = useContext(AccentContext)
  const v = Number(value) || 0
  const btn = { width: 42, height: 42, borderRadius: 9, border: '1px solid transparent', background: C.inputBg, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', color: ac, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button type="button" onClick={() => onChange(Math.max(min, v - step))} style={btn}><Minus size={15} strokeWidth={2.5} /></button>
        <input value={v} inputMode="numeric" onChange={e => { let n = parseInt(e.target.value.replace(RE_DIGITS, ''), 10); if (isNaN(n)) n = min; onChange(Math.max(min, Math.min(max, n))) }}
          style={{ ...sF, flex: 1, textAlign: 'center', boxShadow: errRing(error) }} />
        <button type="button" onClick={() => onChange(Math.min(max, v + step))} style={btn}><Plus size={15} strokeWidth={2.5} /></button>
      </div>
    </Field>
  )
}

/* ════════════════════════════ مُنتقي اللون ════════════════════════════ */
// لوحة الألوان المعتمدة في الموقع — تُستخدم لألوان الفروع/الأدوار/التصنيفات.
export const SWATCHES = ['#D4A017', '#36a8e6', '#27a046', '#c0392b', '#8e44ad', '#e67e22', '#16a085', '#2c3e50', '#d81b60', '#00838f', '#7f8c8d', '#2980b9']

// حقل اختيار لون — مربّع اللون + كوده، يفتح لوحة سواتش + منتقي مخصّص.
export const ColorField = ({ label, req, error, hint, value, onChange, swatches = SWATCHES, full }) => {
  const ac = useContext(AccentContext)
  const btnRef = useRef(null)
  const portalRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const toggle = () => {
    if (!open && btnRef.current) { const r = btnRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 4, left: r.left, width: r.width }) }
    setOpen(o => !o)
  }
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (btnRef.current?.contains(e.target)) return; if (portalRef.current?.contains(e.target)) return; setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      <button ref={btnRef} type="button" onClick={toggle}
        style={{ ...sF, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: errRing(error), position: 'relative' }}>
        <span style={{ width: 18, height: 18, borderRadius: 6, background: value || 'transparent', boxShadow: value ? '0 0 0 1px rgba(255,255,255,.2)' : 'inset 0 0 0 1px rgba(255,255,255,.15)', flexShrink: 0 }} />
        <span style={{ direction: 'ltr', letterSpacing: '.5px', color: value ? C.tx : C.tx5 }}>{value ? value.toUpperCase() : 'اختر لوناً'}</span>
        <ChevronDown size={12} color={ac} strokeWidth={2.5} style={{ position: 'absolute', left: 12, top: '50%', transform: `translateY(-50%) ${open ? 'rotate(180deg)' : ''}`, transition: '.2s' }} />
      </button>
      {open && ReactDOM.createPortal(
        <div ref={portalRef} style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 240), background: C.modal2, borderRadius: 10, padding: 12, zIndex: 3000, boxShadow: '0 12px 40px rgba(0,0,0,.7)', direction: 'rtl', fontFamily: F }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {swatches.map(s => {
              const sel = (value || '').toLowerCase() === s.toLowerCase()
              return (
                <button key={s} type="button" onClick={() => { onChange(s); setOpen(false) }}
                  style={{ width: 30, height: 30, borderRadius: 8, background: s, cursor: 'pointer', border: 'none', boxShadow: sel ? `0 0 0 2px ${C.modal2}, 0 0 0 4px ${s}` : '0 0 0 1px rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.12s' }}>
                  {sel && <Check size={14} color="#fff" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
          <label style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.tx3 }}>لون مخصّص</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.tx4, direction: 'ltr', fontFamily: SUCCESS_MONO }}>{(value || '#000000').toUpperCase()}</span>
              <input type="color" value={value || '#D4A017'} onChange={e => onChange(e.target.value)}
                style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 7, background: 'transparent', cursor: 'pointer' }} />
            </span>
          </label>
        </div>, document.body
      )}
    </Field>
  )
}

/* ════════════════════════════ مُنتقي الوقت ════════════════════════════ */
// حقل وقت — كتابة HH:MM + أيقونة ساعة تفتح منتقي (12 ساعة + ص/م). التخزين 24 ساعة.
export const TimeField = ({ label, req, error, hint, value, onChange, full, minuteStep = 5 }) => {
  const ac = useContext(AccentContext)
  const wrapRef = useRef(null)
  const portalRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value])
  const parts = /^(\d{2}):(\d{2})$/.test(value || '') ? value.split(':').map(Number) : null
  const h24 = parts ? parts[0] : 12
  const mm = parts ? parts[1] : 0
  const ampm = h24 < 12 ? 'AM' : 'PM'
  let h12 = h24 % 12; if (h12 === 0) h12 = 12
  const emit = (nh12, nmm, nap) => {
    let H = nh12 % 12; if (nap === 'PM') H += 12
    onChange(`${pad2(H)}:${pad2(nmm)}`)
  }
  const handleType = t => {
    let v = t.replace(/[^0-9:]/g, '')
    if (v.length > 2 && v[2] !== ':') v = v.slice(0, 2) + ':' + v.slice(2)
    v = v.slice(0, 5)
    if (v.length >= 2) { const hh = parseInt(v.slice(0, 2), 10); if (hh > 23) v = '23' + v.slice(2) }
    if (v.length >= 5) { const m = parseInt(v.slice(3, 5), 10); if (m > 59) v = v.slice(0, 3) + '59' }
    setText(v)
    if (/^\d{2}:\d{2}$/.test(v) || v === '') onChange(v)
  }
  const openPicker = () => {
    if (!open && wrapRef.current) { const r = wrapRef.current.getBoundingClientRect(); setPos({ top: r.bottom + 6, left: r.left, width: r.width }) }
    setOpen(o => !o)
  }
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (wrapRef.current?.contains(e.target)) return; if (portalRef.current?.contains(e.target)) return; setOpen(false) }
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const mins = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep)
  const colCell = (active) => ({ padding: '7px 0', textAlign: 'center', cursor: 'pointer', borderRadius: 7, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#000' : C.tx2, background: active ? ac : 'transparent', transition: '.12s' })
  return (
    <Field label={label} req={req} error={error} hint={hint} full={full}>
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: 42 }}>
        <input type="text" value={text} onChange={e => handleType(e.target.value)} placeholder="HH:MM" dir="ltr"
          style={{ ...sF, direction: 'ltr', textAlign: 'center', letterSpacing: '.5px', cursor: 'text', boxShadow: errRing(error) }} />
        <button type="button" onClick={openPicker} aria-label="time"
          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, border: 'none', background: open ? ac + '1f' : 'transparent', cursor: 'pointer', color: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 7, transition: '.15s' }}>
          <ClockIcon size={15} strokeWidth={2.2} />
        </button>
        {open && ReactDOM.createPortal(
          <div ref={portalRef} style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.max(pos.width, 240), background: C.modal2, borderRadius: 10, padding: 10, zIndex: 3001, boxShadow: '0 12px 40px rgba(0,0,0,.7)', direction: 'rtl', fontFamily: F, display: 'flex', gap: 8 }}>
            <style>{`.fk-time-col::-webkit-scrollbar{width:0;display:none}.fk-time-col{scrollbar-width:none}`}</style>
            <div className="fk-time-col" style={{ flex: 1, maxHeight: 168, overflowY: 'auto' }}>
              {mins.map(m => <div key={m} style={colCell(m === mm)} onClick={() => emit(h12, m, ampm)}>{pad2(m)}</div>)}
            </div>
            <div className="fk-time-col" style={{ flex: 1, maxHeight: 168, overflowY: 'auto' }}>
              {hours.map(h => <div key={h} style={colCell(h === h12)} onClick={() => emit(h, mm, ampm)}>{h}</div>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 52 }}>
              {['AM', 'PM'].map(ap => <div key={ap} style={{ ...colCell(ap === ampm), padding: '9px 0' }} onClick={() => emit(h12, mm, ap)}>{ap === 'AM' ? 'ص' : 'م'}</div>)}
            </div>
          </div>, document.body
        )}
      </div>
    </Field>
  )
}

/* ════════════════════════ صفوف العرض (للقراءة) ════════════════════════ */
// صف عرض للقراءة فقط — عنوان + قيمة. لبناء لوحات التفاصيل (عرض سجلّ/مستخدم/فرع).
export const InfoRow = ({ label, value, Icon, color, mono, copy, full }) => {
  const ac = useContext(AccentContext)
  const [done, setDone] = useState(false)
  const clr = color || ac
  return (
    <div style={full ? FULL : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '9px 12px', borderRadius: 9, background: C.inputBg, boxShadow: 'inset 0 1px 2px rgba(0,0,0,.2)', minHeight: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon && <Icon size={12} color={clr} strokeWidth={2.2} style={{ flexShrink: 0 }} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: C.tx4 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: value == null || value === '' ? C.tx5 : C.tx, direction: mono ? 'ltr' : 'rtl', fontFamily: mono ? SUCCESS_MONO : F, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }} title={value != null ? String(value) : ''}>
            {value == null || value === '' ? '—' : value}
          </span>
          {copy && value != null && value !== '' && (<>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => { try { navigator.clipboard?.writeText(String(value)); setDone(true); setTimeout(() => setDone(false), 1200) } catch {} }}
              onMouseEnter={e => { if (!done) e.currentTarget.style.color = C.gold }}
              onMouseLeave={e => { if (!done) e.currentTarget.style.color = C.tx4 }}
              style={{ width: 24, height: 24, padding: 0, borderRadius: 6, border: 'none', background: 'transparent', color: done ? C.ok : C.tx4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'color .15s' }}>
              {done ? <Check size={13} strokeWidth={3} /> : <Copy size={12} strokeWidth={2} />}
            </button>
          </>)}
        </div>
      </div>
    </div>
  )
}
// شبكة صفوف عرض — عمودان يلتفّان. لفّ بها مجموعة InfoRow.
export const InfoGrid = ({ children, style }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, ...style }}>{children}</div>
)

/* ════════════════════════════ زر الإجراء ══════════════════════════════ */
// زر التنقّل/الحفظ بلون الموقع. dir: 'back' (للحفظ) | 'fwd' · color لتغيير لونه
export const ActionButton = ({ children, Icon = Save, onClick, disabled, dir = 'back', variant = 'primary', color }) => {
  // بلا color صريح: يرث لون النافذة (variant) — تعديل=سماوي · إضافة=ذهبي · حذف=أحمر
  const ac = useContext(AccentContext)
  const clr = color || ac
  const isGhost = variant === 'ghost'
  const [hov, setHov] = useState(false)
  const txtColor = isGhost ? C.tx3 : clr
  const icoBg = isGhost ? 'rgba(255,255,255,.05)' : (hov && !disabled ? clr : clr + '1a')
  const icoColor = isGhost ? C.tx3 : (hov && !disabled ? '#000' : clr)
  const ico = (
    <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.2s', background: icoBg, color: icoColor }}>
      <Icon size={14} strokeWidth={2.5} />
    </span>
  )
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ height: 40, padding: '0 6px', background: 'transparent', border: 'none', fontFamily: F, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, transition: '.2s', color: txtColor, opacity: disabled ? .5 : 1 }}>
      {dir === 'fwd' && Icon && ico}
      <span>{children}</span>
      {dir !== 'fwd' && Icon && ico}
    </button>
  )
}

/* ════════════════════════════ ScrollBox (الاستثناء) ═══════════════════ */
// المنطقة الوحيدة المسموح لها بالتمرير داخل النافذة (مثل جدول السداد).
// النافذة نفسها لا تتمرّر أبداً — لو المحتوى كبير قسّمه لصفحات (pages) أو احصره هنا.
// شريط تمرير ذهبي رفيع موحّد لكل البرنامج. fill=true ليملأ المساحة المتبقّية داخل
// ModalSection flex (بدل ارتفاع ثابت) فلا يُقصّ ولا يتجاوز شريط الأزرار.
export const ScrollBox = ({ children, maxHeight = 300, fill = false, style }) => (
  <div className="fk-scrollbox" style={{ ...(fill ? { flex: 1, minHeight: 0 } : { maxHeight }), overflowY: 'auto', overflowX: 'hidden', borderRadius: 8, ...style }}>
    <style>{`.fk-scrollbox{scrollbar-width:thin;scrollbar-color:${C.gold}73 transparent}.fk-scrollbox::-webkit-scrollbar{width:6px}.fk-scrollbox::-webkit-scrollbar-track{background:transparent}.fk-scrollbox::-webkit-scrollbar-thumb{background:${C.gold}73;border-radius:3px}`}</style>
    {children}
  </div>
)

/* ═══════════════════════════════ Modal ════════════════════════════════ */
/* النافذة المنبثقة الأساسية — بلا تمرير. لو المحتوى لا يكفي، مرّر صفحات:

   صفحة واحدة:
   <Modal open onClose title Icon footer={<ActionButton onClick={save}>حفظ</ActionButton>}>
     <ModalSection label="...">...الحقول...</ModalSection>
   </Modal>

   عدة صفحات (مع تعطيل الأزرار حتى تُملأ الحقول الإلزامية):
   <Modal open onClose title Icon onSubmit={save} submitting={saving}
     pages={[
       { content: <>...صفحة 1...</>, valid: name && phone },   // valid=false يعطّل "التالي"
       { content: <>...صفحة 2...</>, valid: amount > 0 },
     ]} />
*/
// اللون الأساسي للنافذة حسب نوعها: إنشاء=ذهبي · تعديل=سماوي · حذف=أحمر · إضافة=أخضر
export const VARIANT_COLORS = { create: C.gold, edit: '#36a8e6', delete: C.red, add: C.ok }

export function Modal({ open, onClose, title, subtitle, Icon, width = 720, children, footer, footerStart, errorMsg,
  closeOnOverlay = false, headerExtra, variant = 'create', accent, scroll = false,
  hideHeader = false, height, success,
  tabs, tab, onTab,
  pages, onSubmit, submitting, submitLabel = 'حفظ', submitIcon, nextLabel = 'التالي', backLabel = 'السابق',
  page: pageCtl, onNext, onBack }) {
  const [page, setPage] = useState(0)
  const [tabUn, setTabUn] = useState(0)
  const [closeHov, setCloseHov] = useState(false)
  useEffect(() => { if (!open) { setPage(0); setTabUn(0) } }, [open])
  if (!open) return null

  // التبويبات — وصول حرّ بين الأقسام (للوحات العرض). تتعايش مع footer لكن ليس مع pages.
  const hasTabs = Array.isArray(tabs) && tabs.length > 0
  const curTab = tab != null ? tab : tabUn
  const setTab = onTab || setTabUn

  // اللون الأساسي — من variant أو accent المباشر
  const AC = accent || VARIANT_COLORS[variant] || C.gold

  const hasPages = Array.isArray(pages) && pages.length > 0
  // وضع الويزارد المتحكَّم: مرّر page (فهرس الصفحة) + onNext/onBack ليقود مكوّنك
  // التنقّلَ بنفسه (للويزاردات المتفرّعة حسب الخدمة) — والكروم يبقى موحّداً.
  const controlled = pageCtl != null
  const cur = hasPages ? Math.min(controlled ? pageCtl : page, pages.length - 1) : 0
  const isLast = !hasPages || cur === pages.length - 1
  const curValid = hasPages ? pages[cur].valid !== false : true
  const shownError = hasPages ? (pages[cur].error || '') : errorMsg
  const body = hasTabs ? tabs[Math.min(curTab, tabs.length - 1)].content : (hasPages ? pages[cur].content : children)
  // مسافة علوية إضافية حين تظهر صفحة بلا عنوان (شريط التقدّم فقط) — تفسح مجالاً
  // لشارة عنوان القسم العائمة بدل التصاقها بشريط التقدّم.
  const bodyPadTop = (hasPages && pages.length > 1 && !pages[cur].title) ? 16 : 2

  // أزرار التنقّل: السابق (أقصى اليمين) + التالي/حفظ (أقصى اليسار)، معطّلة حتى تُملأ الإلزامية
  const goBack = controlled ? (() => onBack?.()) : (() => setPage(p => Math.max(0, p - 1)))
  const goNext = controlled ? (() => onNext?.()) : (() => setPage(p => p + 1))
  const backNode = hasPages && cur > 0
    ? <ActionButton variant="ghost" dir="fwd" Icon={ChevronRight} onClick={goBack}>{backLabel}</ActionButton>
    : (footerStart || null)
  const forwardNode = hasPages
    ? (isLast
        ? <ActionButton dir="back" Icon={submitIcon || Save} color={AC} disabled={!curValid || submitting} onClick={() => onSubmit?.()}>{submitting ? 'جاري الحفظ...' : submitLabel}</ActionButton>
        : <ActionButton dir="back" Icon={ChevronLeft} color={AC} disabled={!curValid} onClick={goNext}>{nextLabel}</ActionButton>)
    : footer
  const showFooter = backNode || forwardNode || shownError != null
  // ارتفاع ثابت بين الخطوات في وضع الصفحات حتى لا يتغيّر شكل النافذة.
  // height يتجاوز كل شيء (لتضمين مكوّن طويل له ترويسته الخاصة عبر hideHeader).
  const boxHeight = height || (hasPages ? 'min(600px, 92vh)' : undefined)

  // وضع النجاح: يُعرض داخل نفس النافذة (لا قفزة) — زر إغلاق في الزاوية + محتوى
  // النجاح موسَّطاً. مرّر success={<SuccessView .../>} ليتوحّد شكل كل شاشات النجاح.
  if (success) {
    return ReactDOM.createPortal(
      <AccentContext.Provider value={AC}>
      <div onClick={() => closeOnOverlay && onClose?.()}
        style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: C.modal, borderRadius: 18, width: 'min(300px, 90vw)', aspectRatio: '1 / 1', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: `1px solid ${AC}24`, position: 'relative' }}>
          <button onClick={() => onClose?.()}
            onMouseEnter={() => setCloseHov(true)} onMouseLeave={() => setCloseHov(false)}
            style={{ position: 'absolute', top: 16, insetInlineEnd: 16, zIndex: 2, width: 36, height: 36, borderRadius: 10, background: closeHov ? 'rgba(192,57,43,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${closeHov ? C.red + '66' : 'rgba(255,255,255,.06)'}`, color: closeHov ? C.red : C.tx3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}>
            <X size={14} />
          </button>
          <div dir="rtl" style={{ fontFamily: F, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
            {success}
          </div>
        </div>
      </div>
      </AccentContext.Provider>,
      document.body
    )
  }

  return ReactDOM.createPortal(
    <AccentContext.Provider value={AC}>
    <div onClick={() => closeOnOverlay && onClose?.()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.modal, borderRadius: 18, width, maxWidth: '95vw', height: boxHeight, maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'visible', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: `1px solid ${AC}24` }}>
        <div dir="rtl" style={{ fontFamily: F, color: C.tx2, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

          {/* الترويسة — تُخفى عبر hideHeader عند تضمين مكوّن له ترويسته الخاصة */}
          {!hideHeader && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {Icon && <Icon size={26} color={AC} strokeWidth={1.8} style={{ flexShrink: 0 }} />}
              <div>
                <div style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,.95)', lineHeight: 1.2 }}>{title}</div>
                {subtitle && !hasPages && <div style={{ fontSize: 12, fontWeight: 600, color: C.tx4, marginTop: 2 }}>{subtitle}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {headerExtra}
              <button onClick={() => onClose?.()}
                onMouseEnter={() => setCloseHov(true)} onMouseLeave={() => setCloseHov(false)}
                style={{ width: 36, height: 36, borderRadius: 10, background: closeHov ? 'rgba(192,57,43,.15)' : 'rgba(255,255,255,.04)', border: `1px solid ${closeHov ? C.red + '66' : 'rgba(255,255,255,.06)'}`, color: closeHov ? C.red : C.tx3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '.15s' }}>
                <X size={14} />
              </button>
            </div>
          </div>
          )}

          {/* شريط التبويبات — وصول حرّ (للوحات العرض). تحت العنوان مباشرة. */}
          {hasTabs && (
            <div style={{ display: 'flex', gap: 4, padding: '0 16px 10px', flexShrink: 0, overflowX: 'auto' }}>
              {tabs.map((t, i) => {
                const sel = i === Math.min(curTab, tabs.length - 1)
                return (
                  <button key={i} type="button" onClick={() => setTab(i)}
                    style={{ flex: '1 1 auto', whiteSpace: 'nowrap', height: 34, padding: '0 14px', borderRadius: 9, border: 'none', background: sel ? AC + '1f' : 'rgba(255,255,255,.03)', color: sel ? AC : C.tx3, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: '.15s', boxShadow: sel ? `inset 0 0 0 1px ${AC}40` : 'none' }}>
                    {t.Icon && <t.Icon size={14} strokeWidth={2.2} />}
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* شريط التقدّم + اسم الخطوة الحالية — تحت العنوان مباشرة */}
          {hasPages && (pages.length > 1 || pages[cur].title) && (
            <div style={{ padding: '0 20px 3px', flexShrink: 0 }}>
              {pages.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: pages[cur].title ? 9 : 0 }}>
                  {pages.map((_, i) => (
                    <span key={i} style={{ flex: 1, height: 4, borderRadius: 3, background: i <= cur ? AC : 'rgba(255,255,255,.1)', transition: '.25s' }} />
                  ))}
                </div>
              )}
              {pages[cur].title && (
                <div style={{ fontSize: 13, fontWeight: 600, color: AC, textAlign: 'start' }}>{pages[cur].title}</div>
              )}
            </div>
          )}

          {/* المحتوى — كل صفحة مفترض تكفي بنفسها؛ يُسمح بالتمرير كأمان حين يفيض المحتوى فقط. */}
          <style>{`.fk-body input:focus,.fk-body select:focus,.fk-body textarea:focus,.fk-body button:focus{outline:none!important}
            .fk-body > *:first-child{margin-top:4px!important}
            .fk-body::-webkit-scrollbar{width:4px}.fk-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:4px}`}</style>
          <div className="fk-body" style={{ flex: 1, minHeight: 0, overflowY: hasTabs || scroll || hasPages ? 'auto' : 'hidden', overflowX: 'hidden', padding: `${bodyPadTop}px 16px 12px`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            {body}
          </div>

          {/* التذييل: السابق (يمين) · رسالة خطأ (وسط) · التالي/حفظ (يسار) */}
          {showFooter && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 12px', flexShrink: 0, gap: 12 }}>
              <div style={{ minWidth: 90, display: 'flex', justifyContent: 'flex-start' }}>{backNode}</div>
              <div style={{ flex: 1, minHeight: 18, fontSize: 12, fontWeight: 600, color: C.red, transition: '.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {shownError && <AlertTriangle size={14} strokeWidth={2.4} style={{ flexShrink: 0 }} />}
                <span>{shownError}</span>
              </div>
              <div style={{ minWidth: 90, display: 'flex', justifyContent: 'flex-end' }}>{forwardNode}</div>
            </div>
          )}
        </div>
      </div>
    </div>
    </AccentContext.Provider>,
    document.body
  )
}

/* ════════════════════════════ شاشة النجاح ═════════════════════════════ */
/* المحتوى الموحّد لكل شاشات النجاح في الموقع — صح أخضر متحرّك + عبارة واحدة فقط
   (مثل «تمت الإضافة» أو «تم التعديل»). موحّد للكل: بلا وصف ولا شارة كود ولا تفاصيل.
   كل نافذة تعرض نجاحها عبر هذا المكوّن فيتوحّد الشكل تماماً. يُمرَّر لـ Modal success. */
const SUCCESS_MONO = "'JetBrains Mono','Cairo',sans-serif"
export function SuccessView({ title = 'تمت العملية بنجاح', code, action }) {
  return (
    <div style={{ width: '100%', fontFamily: F, direction: 'rtl', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <style>{`@keyframes fkRingDraw{0%{stroke-dashoffset:151}100%{stroke-dashoffset:0}}@keyframes fkCheck{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}@keyframes fkFade{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width: 72, height: 72, flexShrink: 0, animation: 'fkFade .3s ease forwards' }}>
        <svg width={72} height={72} viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="24" stroke={C.ok} strokeWidth="3" fill="rgba(39,160,70,.06)"
            style={{ strokeDasharray: 151, strokeDashoffset: 151, animation: 'fkRingDraw .6s ease-out forwards' }} />
          <polyline points="16 27 23 34 37 18" stroke={C.ok} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
            style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: 'fkCheck .4s .55s ease-out forwards' }} />
        </svg>
      </div>
      <div style={{ animation: 'fkFade .4s .45s both', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'center', fontSize: 19, fontWeight: 600, color: 'rgba(255,255,255,.93)', letterSpacing: '-.3px' }}>{title}</div>
        {code && (
          <span style={{ color: C.gold, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums', fontSize: 13.5, fontWeight: 800, letterSpacing: '.3px', direction: 'ltr' }}>{code}</span>
        )}
        {action || null}
      </div>
    </div>
  )
}

// شاشة نجاح مستقلّة (overlay كامل) — تغلّف SuccessView. تُعرض بدل النافذة عند الحاجة.
export function SuccessScreen({ open, ...rest }) {
  if (!open) return null
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,10,.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: C.modal, borderRadius: 18, width: 420, maxWidth: '95vw', padding: '40px 32px', boxShadow: '0 24px 60px rgba(0,0,0,.5)', border: '1px solid rgba(212,160,23,.08)' }}>
        <SuccessView {...rest} />
      </div>
    </div>,
    document.body
  )
}

/* ═══════════════════════════ نافذة التأكيد ════════════════════════════ */
// تأكيد إجراء (حذف افتراضياً). danger=false يجعلها ذهبية بدل الحمراء.
export function ConfirmDialog({ open, onConfirm, onCancel, title = 'تأكيد الحذف', message = 'هل أنت متأكد؟ لا يمكن التراجع عن هذا الإجراء.', itemName, confirmText = 'حذف', cancelText = 'إلغاء', danger = true }) {
  if (!open) return null
  const clr = danger ? C.red : C.gold
  return ReactDOM.createPortal(
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,14,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: C.modal, borderRadius: 16, width: 440, maxWidth: '95vw', overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,.5)', border: `1px solid ${clr}26`, fontFamily: F }}>
        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${clr}14`, border: `2px solid ${clr}26`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertTriangle size={24} color={clr} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: clr, marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 13, color: C.tx3, lineHeight: 1.8, marginBottom: itemName ? 4 : 20 }}>{message}</div>
          {itemName && <div style={{ fontSize: 14, fontWeight: 600, color: C.tx2, marginBottom: 20 }}>"{itemName}"</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={onCancel} style={{ height: 42, padding: '0 24px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.1)', background: 'transparent', color: C.tx3, fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>{cancelText}</button>
            <button onClick={onConfirm} style={{ height: 42, padding: '0 24px', borderRadius: 10, border: 'none', background: clr, color: '#fff', fontFamily: F, fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>{confirmText}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/* ═══════════════════════════ إشعار عائم (Toast) ═══════════════════════ */
// إشعار موحّد يظهر أسفل الشاشة ويختفي تلقائياً. type: success | error | info | delete
const TOAST_KIND = {
  success: { c: C.ok, Icon: Check },
  error: { c: C.red, Icon: AlertTriangle },
  info: { c: C.blue, Icon: Info },
  delete: { c: C.red, Icon: Trash2 },
}
export function Toast({ open, type = 'success', message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!open || !duration) return
    const t = setTimeout(() => onClose?.(), duration)
    return () => clearTimeout(t)
  }, [open, duration, message])
  if (!open) return null
  const k = TOAST_KIND[type] || TOAST_KIND.success
  const Ico = k.Icon
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 4000, direction: 'rtl', fontFamily: F, pointerEvents: 'none' }}>
      <style>{`@keyframes fkToastIn{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 12, background: C.modal, boxShadow: `0 12px 40px rgba(0,0,0,.5)`, border: `1px solid ${k.c}40`, maxWidth: 'min(440px, 92vw)', animation: 'fkToastIn .25s ease', pointerEvents: 'auto' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: k.c + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ico size={16} color={k.c} strokeWidth={2.4} />
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.tx, lineHeight: 1.5 }}>{message}</span>
        {onClose && (
          <button type="button" onClick={() => onClose()} style={{ width: 24, height: 24, padding: 0, borderRadius: 6, border: 'none', background: 'transparent', color: C.tx4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginInlineStart: 4 }}>
            <X size={13} />
          </button>
        )}
      </div>
    </div>,
    document.body
  )
}
